/**
 * Learning-space host service: workspace discovery, catalog listing, file
 * reads, and per-chapter notes IO, exposed to the browser as the Typert
 * Remote namespace 'learning'.
 *
 * Composition is host-plane (the package's own cordis.patch.yml bundle row,
 * name 'dsh-learning'): the Typert gateway's source-mode discovery scans live
 * services for @Remote methods and routes /api/learning.<method> calls to
 * this instance. Method PARAMETER NAMES are the wire keys - keep them
 * stable and do not minify the built bundle.
 *
 * Safety: every file-touching method takes an explicit workspace root and
 * enforces containment inside it; chapter keys are validated before touching
 * the filesystem. Notes are resolved without requiring the note file to
 * exist yet (first read returns '', first save creates it): the relative
 * note path is built from whitelisted tokens only, and symlink escapes are
 * rejected by realpath-ing the notes directory before every write.
 */

import { Context, Service } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type {} from '@deepseek-ai/dsh-agent'
import { SessionId } from '@deepseek-ai/dsh-session'
import { readdir, readFile, rename, writeFile, mkdir, realpath } from 'node:fs/promises'
import { basename, join, resolve, relative, sep, isAbsolute } from 'node:path'
import {
  META_FILE,
  deriveLocale,
  isLearningWorkspaceDir,
  isSafeChapterKey,
  noteFileOf,
  workspaceDirs,
  type WorkspaceDirs,
} from './workspace.js'

declare module '@deepseek-ai/cordis' {
  interface Context {
    learning: LearningService
  }
}

/** One catalog row for the learning-space left tree. */
export interface LearningEntry {
  readonly name: string
  readonly path: string
  readonly kind: 'dir' | 'file'
}

/** One discovered learning workspace view. */
export interface LearningWorkspaceView {
  readonly root: string
  readonly title: string
  readonly locale: string
  readonly dirs: WorkspaceDirs
}

/** Cap for in-app file reads. */
const MAX_FILE_BYTES = 2 * 1024 * 1024

/** ctx.learning: the learning-space Remote service (namespace 'learning'). */
export default class LearningService extends TypertRemoteService {
  static inject = ['agents']

  constructor(ctx: Context) {
    super(ctx, 'learning', { namespace: 'learning' })
  }

  /**
   * Discover every learning workspace under the requesting session cwd.
   * A workspace is a directory whose name ends with a naming.md suffix
   * ('-learning' / '-学习') and that contains meta.json. Roots are returned
   * realpath'd so clients can prefix-match against listDir/readFile paths.
   */
  @Remote
  async describe(sessionId: string): Promise<{ workspaces: LearningWorkspaceView[] }> {
    const cwd = this.sessionCwd(sessionId)
    let children
    try {
      children = await readdir(cwd, { withFileTypes: true })
    } catch {
      return { workspaces: [] }
    }
    const workspaces: LearningWorkspaceView[] = []
    for (const child of children) {
      if (!child.isDirectory() || !isLearningWorkspaceDir(child.name)) continue
      const meta = await this.readMeta(join(cwd, child.name))
      if (meta === undefined) continue
      let root: string
      try {
        root = await realpath(join(cwd, child.name))
      } catch {
        continue
      }
      const locale = deriveLocale(meta)
      workspaces.push({ root, title: child.name, locale, dirs: workspaceDirs(locale) })
    }
    return { workspaces }
  }

  /** List one directory level (dirs first, name-sorted), contained in root. */
  @Remote
  async listDir(sessionId: string, root: string, path: string): Promise<{ path: string; entries: LearningEntry[] }> {
    const full = await this.contained(root, path, 'listDir')
    let dirents
    try {
      dirents = await readdir(full, { withFileTypes: true })
    } catch {
      throw new Error('learning.listDir: the directory is unreadable or missing')
    }
    const entries = dirents
      .filter(entry => !entry.name.startsWith('.'))
      .map(entry => ({
        name: entry.name,
        path: join(full, entry.name),
        kind: entry.isDirectory() ? 'dir' : 'file',
      } satisfies LearningEntry))
    entries.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'dir' ? -1 : 1))
    return { path: full, entries }
  }

  /** Read one text file inside root (2 MB cap), for the in-app viewer. */
  @Remote
  async readFile(sessionId: string, root: string, path: string): Promise<{ content: string; truncated: boolean }> {
    const full = await this.contained(root, path, 'readFile')
    let buffer
    try {
      buffer = await readFile(full)
    } catch {
      throw new Error('learning.readFile: the file is missing or unreadable')
    }
    const truncated = buffer.byteLength > MAX_FILE_BYTES
    const content = buffer.subarray(0, MAX_FILE_BYTES).toString('utf8')
    return { content, truncated }
  }

  /** Read one chapter note (empty when it does not exist yet). */
  @Remote
  async readNote(sessionId: string, root: string, chapterKey: string): Promise<{ content: string }> {
    const note = await this.notePath(root, chapterKey)
    if (note.base === undefined) return { content: '' }
    let real: string
    try {
      real = await realpath(note.full)
    } catch {
      return { content: '' }
    }
    this.assertInside(note.base, real, 'note')
    try {
      return { content: await readFile(real, 'utf8') }
    } catch {
      return { content: '' }
    }
  }

  /** Save one chapter note (creates the notes dir on demand; atomic write). */
  @Remote
  async writeNote(sessionId: string, root: string, chapterKey: string, content: string): Promise<{ saved: true }> {
    const note = await this.notePath(root, chapterKey)
    if (note.base === undefined) {
      throw new Error('learning.note: the learning workspace does not exist')
    }
    await mkdir(note.dir, { recursive: true })
    const realDir = await realpath(note.dir)
    this.assertInside(note.base, realDir, 'note')
    const target = join(realDir, basename(note.full))
    const tmp = target + '.tmp-' + Date.now().toString(36)
    await writeFile(tmp, content, 'utf8')
    await rename(tmp, target)
    return { saved: true }
  }

  // - internals ------------------------------------------------

  /**
   * Resolve a chapter-note location WITHOUT requiring the note file (or the
   * notes dir) to exist yet. The relative path is assembled from whitelisted
   * tokens only (dir token from meta.json locale + safe chapter key), so a
   * lexical '..' escape is impossible by construction; `base` is the
   * workspace's realpath for the symlink-escape checks at use sites.
   */
  private async notePath(root: string, chapterKey: string): Promise<{ base: string | undefined; full: string; dir: string }> {
    if (!isSafeChapterKey(chapterKey)) {
      throw new Error('learning: invalid chapter key')
    }
    const meta = await this.readMeta(root)
    const dirs = meta === undefined ? workspaceDirs('en') : workspaceDirs(deriveLocale(meta))
    const dir = resolve(root, dirs.notes)
    const full = resolve(root, noteFileOf(dirs, chapterKey))
    let base: string | undefined
    try {
      base = await realpath(resolve(root))
    } catch {
      base = undefined
    }
    return { base, full, dir }
  }

  private async readMeta(root: string): Promise<Record<string, unknown> | undefined> {
    try {
      return JSON.parse(await readFile(join(root, META_FILE), 'utf8')) as Record<string, unknown>
    } catch {
      return undefined
    }
  }

  /** Resolve path strictly inside root (realpath closes symlink escapes). */
  private async contained(root: string, path: string, what: string): Promise<string> {
    const base = await realpath(resolve(root))
    const full = await realpath(resolve(root, path))
    this.assertInside(base, full, what)
    return full
  }

  /** Throw unless `real` (already realpath'd) sits strictly inside `base`. */
  private assertInside(base: string, real: string, what: string): void {
    const rel = relative(base, real)
    if (rel !== '' && !rel.startsWith('..' + sep) && !isAbsolute(rel)) return
    throw new Error('learning.' + what + ': the path is outside the learning workspace')
  }

  private sessionCwd(sessionId: string): string {
    const agent = this.ctx.agents.get(SessionId(sessionId))
    if (agent === undefined) {
      throw new Error('learning: the session is not live on this host')
    }
    const header = agent.session.header
    if (header.origin === 'subagent') {
      throw new Error('learning: subagent sessions have no learning workspace')
    }
    if (header.cwd === undefined) {
      throw new Error('learning: the session has no working directory')
    }
    return header.cwd
  }
}
