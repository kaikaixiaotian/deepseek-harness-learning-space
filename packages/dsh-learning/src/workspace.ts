/**
 * Learning-workspace pure logic: naming tokens, workspace discovery helpers,
 * path classification, chapter-key derivation, and containment. Zero imports —
 * unit-testable without the dsh runtime.
 *
 * The naming tokens mirror the preset's authoritative table
 * (skills/learning-loop/references/naming.md); meta.json stays meta.json,
 * topic slugs and version suffixes stay ASCII.
 */

/** Workspace subdirectory names per locale (en canonical first). */
export const DIR_TOKENS = {
  baseline: ['00-baseline', '00-基线测评'],
  plan: ['plan', '计划'],
  chapters: ['chapters', '章节'],
  quizzes: ['quizzes', '测验'],
  wiki: ['wiki', '知识库'],
  notes: ['notes', '笔记'],
} as const

export type WorkspaceDirKey = keyof typeof DIR_TOKENS

/** Workspace directory-name suffixes per naming.md. */
export const WORKSPACE_SUFFIXES = ['-learning', '-学习'] as const

/** The state-machine anchor file; its name never localizes. */
export const META_FILE = 'meta.json'

export interface WorkspaceDirs {
  readonly baseline: string
  readonly plan: string
  readonly chapters: string
  readonly quizzes: string
  readonly wiki: string
  readonly notes: string
}

/** Locale-aware directory names for one workspace. */
export function workspaceDirs(locale: string): WorkspaceDirs {
  const zh = locale.trim().toLowerCase() === 'zh'
  const pick = (key: WorkspaceDirKey): string => (zh ? DIR_TOKENS[key][1] : DIR_TOKENS[key][0])
  return {
    baseline: pick('baseline'),
    plan: pick('plan'),
    chapters: pick('chapters'),
    quizzes: pick('quizzes'),
    wiki: pick('wiki'),
    notes: pick('notes'),
  }
}

/** Whether a directory name is a learning workspace dir (any locale suffix). */
export function isLearningWorkspaceDir(name: string): boolean {
  return WORKSPACE_SUFFIXES.some(suffix => name.endsWith(suffix))
}

/** Normalize an arbitrary meta.json parse to a locale ('zh' | 'en'). */
export function deriveLocale(meta: { locale?: unknown }): string {
  return String(meta.locale ?? 'en').trim().toLowerCase() === 'zh' ? 'zh' : 'en'
}

/** Normalize separators and strip a trailing slash (Windows-safe). */
export function normalize(path: string): string {
  let out = path.replace(/\\/g, '/')
  while (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1)
  return out
}

/** Join from + target and collapse '.'/'..' segments (pure, OS-independent). */
export function joinPath(from: string, target: string): string {
  const isAbsolute = target.startsWith('/') || /^[A-Za-z]:/.test(target)
  const joined = isAbsolute ? target : from + '/' + target
  const stack: string[] = []
  for (const segment of joined.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      stack.pop()
      continue
    }
    stack.push(segment)
  }
  const out = stack.join('/')
  return out.startsWith('/') || /^[A-Za-z]:/.test(out) ? out : '/' + out
}

/**
 * Containment: target must resolve strictly inside root. Absolute and
 * relative targets both resolve, then compare with a separator boundary so a
 * sibling sharing a prefix is rejected.
 */
export function contain(root: string, target: string): boolean {
  const base = normalize(root)
  const candidate = normalize(joinPath(base, target))
  if (candidate === base) return false
  return candidate.startsWith(base + '/')
}

/** File name without its final extension. */
export function stemOf(path: string): string {
  const parts = normalize(path).split('/')
  const name = parts[parts.length - 1] ?? path
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

/** Trailing path segment. */
export function baseName(path: string): string {
  const parts = normalize(path).split('/')
  return parts[parts.length - 1] ?? path
}

/** What kind of learning artifact a produced path is (path-based). */
export type ArtifactKind = 'chapter' | 'quiz' | 'viz' | 'baseline' | 'plan' | 'other'

const QUIZ_MARKERS = ['-quiz', '-测验']
const NOTE_MARKERS = ['-note', '-笔记']
const ANSWERS_MARKERS = ['-answers', '-答案', '-grading', '-批改']

/** Classify one produced path against the workspace dirs. */
export function classifyArtifact(path: string, dirs: WorkspaceDirs): ArtifactKind {
  const norm = normalize(path)
  const segments = norm.split('/')
  const name = stemOf(norm)
  const inDir = (key: WorkspaceDirKey): boolean => segments.includes(dirs[key])
  if (inDir('chapters') && segments.includes('viz')) return 'viz'
  if (inDir('quizzes')) {
    if (ANSWERS_MARKERS.some(marker => name.includes(marker))) return 'other'
    if (QUIZ_MARKERS.some(marker => name.includes(marker))) return 'quiz'
    if (name.includes('-total')) return 'quiz'
  }
  if (inDir('chapters')) {
    if (NOTE_MARKERS.some(marker => name.includes(marker))) return 'other'
    return 'chapter'
  }
  if (inDir('baseline')) return 'baseline'
  if (inDir('plan')) return 'plan'
  return 'other'
}

/**
 * Chapter key for a chapter/quiz file, e.g. 'stage1-ch01-intro'. Quiz names
 * shed their '-quiz'/'-测验' suffix so a quiz resolves to its chapter's note.
 * Returns null when the name has no stage-chapter prefix.
 */
export function chapterKeyOf(path: string): string | null {
  let key = stemOf(path)
  key = key.replace(/[_-]v\d+$/, '')
  for (const marker of QUIZ_MARKERS) {
    const at = key.lastIndexOf(marker)
    if (at > 0) {
      key = key.slice(0, at)
      break
    }
  }
  key = key.replace(/^阶段(\d+)-章(\d+)/, 'stage$1-ch$2')
  const match = /^(stage\d+-ch\d+)(?:[-_].*)?$/.exec(key)
  if (match === null) return null
  const stem = match[1] as string
  const slug = key.slice(stem.length).replace(/^[-_]/, '')
  return slug === '' ? stem : stem + '-' + slug
}

/** Note file name for one chapter key inside the notes dir. */
export function noteFileOf(dirs: WorkspaceDirs, chapterKey: string): string {
  const suffix = dirs.notes === '笔记' ? '-笔记.html' : '-note.html'
  return dirs.notes + '/' + chapterKey + suffix
}

/** Validate a chapter key before it ever touches the filesystem. */
export function isSafeChapterKey(chapterKey: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(chapterKey)
}
