/**
 * Service-level regression tests for the learning Remote methods, against a
 * real temp filesystem: the notes lifecycle (missing → first save → read
 * back), containment rejections, and describe()'s realpath consistency.
 * The Cordis context is a bare Context with a minimal fake agents service;
 * TypertRemoteService needs no gateway at construction time.
 */

import { mkdtemp, mkdir, rm, symlink, writeFile, readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
// The BUILT lib, not src: Node's V8 cannot parse the standard @Remote
// decorators and vitest's esbuild transform cannot lower them (only
// tsdown's oxc pipeline can) — "test" runs tsdown first.
import LearningService from '../lib/index.js'

// The base class keeps a protected constructor (cordis instantiates plugins
// through its loader); tests bypass the visibility with a structural cast.
const Ctor = LearningService as unknown as new (ctx: Context) => LearningService

function makeService(cwd: string): LearningService {
  const ctx = new Context()
  ;(ctx as unknown as { agents: unknown }).agents = {
    get: () => ({ session: { header: { cwd, origin: 'main' } } }),
  }
  return new Ctor(ctx)
}

/** Directory link that needs no elevation: junction on Windows, symlink elsewhere. */
async function linkDir(target: string, path: string): Promise<void> {
  await symlink(target, path, process.platform === 'win32' ? 'junction' : 'dir')
}

let area: string
let workspace: string
let service: LearningService

beforeAll(async () => {
  area = await mkdtemp(join(tmpdir(), 'dsh-learning-'))
  workspace = join(area, 'react-learning')
  await mkdir(workspace)
  await writeFile(join(workspace, 'meta.json'), JSON.stringify({ locale: 'en', topic: 'react' }), 'utf8')
  service = makeService(area)
})

afterAll(async () => {
  await rm(area, { recursive: true, force: true })
})

describe('readNote / writeNote lifecycle', () => {
  it('returns empty content for a note that does not exist yet (no throw)', async () => {
    await expect(service.readNote('s1', workspace, 'stage1-ch01-intro')).resolves.toEqual({ content: '' })
  })

  it('first writeNote succeeds, lazily creates the notes dir, and round-trips', async () => {
    await expect(service.writeNote('s1', workspace, 'stage1-ch01-intro', '<p>hook 规则</p>')).resolves.toEqual({ saved: true })
    const note = join(workspace, 'notes', 'stage1-ch01-intro-note.html')
    await expect(readFile(note, 'utf8')).resolves.toBe('<p>hook 规则</p>')
    await expect(service.readNote('s1', workspace, 'stage1-ch01-intro')).resolves.toEqual({ content: '<p>hook 规则</p>' })
  })

  it('overwrites an existing note atomically (no .tmp leftovers)', async () => {
    await service.writeNote('s1', workspace, 'stage1-ch01-intro', 'v2')
    await expect(service.readNote('s1', workspace, 'stage1-ch01-intro')).resolves.toEqual({ content: 'v2' })
    const leftovers = (await readdir(join(workspace, 'notes'))).filter(name => name.includes('.tmp-'))
    expect(leftovers).toEqual([])
  })

  it('honors the zh notes dir and file naming from meta.json', async () => {
    const zhWorkspace = join(area, 'react-学习')
    await mkdir(zhWorkspace)
    await writeFile(join(zhWorkspace, 'meta.json'), JSON.stringify({ locale: 'zh' }), 'utf8')
    await expect(service.writeNote('s1', zhWorkspace, 'stage1-ch01', '中文笔记')).resolves.toEqual({ saved: true })
    await expect(readFile(join(zhWorkspace, '笔记', 'stage1-ch01-笔记.html'), 'utf8')).resolves.toBe('中文笔记')
  })

  it('keeps the default branch file name unchanged and isolates named branches', async () => {
    await expect(service.writeNote('s1', workspace, 'stage1-ch02', 'default body')).resolves.toEqual({ saved: true })
    await expect(service.writeNote('s1', workspace, 'stage1-ch02', 'ideas body', 'ideas')).resolves.toEqual({ saved: true })
    await expect(service.writeNote('s1', workspace, 'stage1-ch02', '错题 body', '错题本')).resolves.toEqual({ saved: true })
    await expect(service.readNote('s1', workspace, 'stage1-ch02')).resolves.toEqual({ content: 'default body' })
    await expect(service.readNote('s1', workspace, 'stage1-ch02', 'ideas')).resolves.toEqual({ content: 'ideas body' })
    await expect(service.readNote('s1', workspace, 'stage1-ch02', '错题本')).resolves.toEqual({ content: '错题 body' })
    await expect(service.readNote('s1', workspace, 'stage1-ch02', 'missing')).resolves.toEqual({ content: '' })
    const names = await readdir(join(workspace, 'notes'))
    expect(names).toContain('stage1-ch02-note.html')
    expect(names).toContain('stage1-ch02-ideas-note.html')
    expect(names).toContain('stage1-ch02-错题本-note.html')
  })

  it('rejects unsafe note branches', async () => {
    await expect(service.writeNote('s1', workspace, 'stage1-ch02', 'x', '../escape')).rejects.toThrow('invalid note branch')
    await expect(service.writeNote('s1', workspace, 'stage1-ch02', 'x', 'a b')).rejects.toThrow('invalid note branch')
  })
})

describe('notes safety', () => {
  it('rejects invalid chapter keys before touching the filesystem', async () => {
    await expect(service.readNote('s1', workspace, '../escape')).rejects.toThrow('invalid chapter key')
    await expect(service.writeNote('s1', workspace, 'a b', 'x')).rejects.toThrow('invalid chapter key')
  })

  it('round-trips zh-slugged chapter keys (章节/阶段1-章01-注意力机制.html)', async () => {
    const zhWorkspace = join(area, 'react-学习')
    await mkdir(zhWorkspace, { recursive: true })
    await writeFile(join(zhWorkspace, 'meta.json'), JSON.stringify({ locale: 'zh' }), 'utf8')
    await expect(service.writeNote('s1', zhWorkspace, 'stage1-ch01-注意力机制', '<p>摘录</p>')).resolves.toEqual({ saved: true })
    await expect(service.readNote('s1', zhWorkspace, 'stage1-ch01-注意力机制')).resolves.toEqual({ content: '<p>摘录</p>' })
  })

  it('returns empty content when the workspace root does not exist', async () => {
    await expect(service.readNote('s1', join(area, 'missing-learning'), 'stage1-ch01')).resolves.toEqual({ content: '' })
  })

  it('refuses to write into a workspace root that does not exist', async () => {
    await expect(service.writeNote('s1', join(area, 'missing-learning'), 'stage1-ch01', 'x'))
      .rejects.toThrow('workspace does not exist')
  })

  it('rejects a notes dir replaced by a link pointing outside the workspace', async () => {
    const outside = join(area, 'outside')
    await mkdir(outside)
    const trapped = join(area, 'trapped-learning')
    await mkdir(trapped)
    await writeFile(join(trapped, 'meta.json'), JSON.stringify({ locale: 'en' }), 'utf8')
    await linkDir(outside, join(trapped, 'notes'))
    await expect(service.writeNote('s1', trapped, 'stage1-ch01', 'x')).rejects.toThrow('outside the learning workspace')
    // nothing leaked into the linked target
    await expect(readdir(outside)).resolves.toEqual([])
  })

  it('rejects readFile escapes via ..', async () => {
    await expect(service.readFile('s1', workspace, '../outside')).rejects.toThrow('outside the learning workspace')
  })
})

describe('saveQuizAnswers', () => {
  it('saves quiz answers next to the quiz html with the localized marker', async () => {
    const quizzes = join(workspace, 'quizzes')
    await mkdir(quizzes, { recursive: true })
    await writeFile(join(quizzes, 'stage1-ch01-quiz.html'), '<p>quiz</p>', 'utf8')
    const result = await service.saveQuizAnswers('s1', workspace, 'quizzes/stage1-ch01-quiz.html', '{"answers":{}}')
    expect(result.saved).toBe(true)
    await expect(readFile(result.answersPath, 'utf8')).resolves.toBe('{"answers":{}}')
    expect(result.answersPath.endsWith('stage1-ch01-quiz-answers.json')).toBe(true)
  })
  it('saves baseline answers into the baseline dir (zh naming)', async () => {
    const zhWorkspace = join(area, 'react2-学习')
    await mkdir(zhWorkspace)
    await writeFile(join(zhWorkspace, 'meta.json'), JSON.stringify({ locale: 'zh' }), 'utf8')
    const baseline = join(zhWorkspace, '00-基线测评')
    await mkdir(baseline, { recursive: true })
    await writeFile(join(baseline, '基线测评.html'), '<p>baseline</p>', 'utf8')
    const result = await service.saveQuizAnswers('s1', zhWorkspace, '00-基线测评/基线测评.html', '{}')
    expect(result.answersPath.endsWith('基线测评-答案.json')).toBe(true)
  })
  it('rejects paths outside the allowed dirs and unsafe stems', async () => {
    await expect(service.saveQuizAnswers('s1', workspace, 'chapters/stage1-ch01.html', '{}'))
      .rejects.toThrow('not a quiz or baseline file')
    await expect(service.saveQuizAnswers('s1', workspace, 'quizzes/../../escape.html', '{}'))
      .rejects.toThrow()
    await expect(service.saveQuizAnswers('s1', workspace, 'quizzes/bad..name.html', '{}'))
      .rejects.toThrow('not a quiz or baseline file')
  })
})

describe('describe', () => {
  it('lists only meta-bearing workspace dirs and returns realpath roots', async () => {
    const result = await service.describe('s1')
    const roots = result.workspaces.filter(view => view.title === 'react-learning')
    expect(roots).toHaveLength(1)
    const { realpath } = await import('node:fs/promises')
    expect(roots[0]?.root).toBe(await realpath(workspace))
    expect(roots[0]?.locale).toBe('en')
  })

  it('returns an empty list for a session cwd that cannot be read', async () => {
    const elsewhere = makeService(join(area, 'no-such-cwd'))
    await expect(elsewhere.describe('s1')).resolves.toEqual({ workspaces: [] })
  })
})
