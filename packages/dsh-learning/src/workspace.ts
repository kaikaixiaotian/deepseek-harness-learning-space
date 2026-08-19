/**
 * Learning-workspace pure logic: naming tokens, workspace discovery helpers,
 * path classification, chapter-key derivation, and containment. Zero imports —
 * unit-testable without the dsh runtime.
 *
 * The naming tokens mirror the preset's authoritative table
 * (skills/learning-loop/references/naming.md); meta.json stays meta.json,
 * topic slugs and version suffixes stay ASCII.
 */

/** Workspace subdirectory names per locale (en canonical first).
 * No baseline dir: the baseline assessment lives in the quizzes dir (unified
 * storage); LEGACY_BASELINE_DIRS only recognizes pre-unification workspaces. */
export const DIR_TOKENS = {
  plan: ['plan', '计划'],
  chapters: ['chapters', '章节'],
  quizzes: ['quizzes', '测验'],
  wiki: ['wiki', '知识库'],
  notes: ['notes', '笔记'],
} as const

export type WorkspaceDirKey = keyof typeof DIR_TOKENS

/** Workspace directory-name suffixes per naming.md. */
export const WORKSPACE_SUFFIXES = ['-learning', '-学习'] as const

/** Pre-unification baseline dir names — read/answer-write compatibility only. */
export const LEGACY_BASELINE_DIRS = ['00-baseline', '00-基线测评'] as const

/** The state-machine anchor file; its name never localizes. */
export const META_FILE = 'meta.json'

export interface WorkspaceDirs {
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

/** Baseline file-name markers (the baseline html lives in the quizzes dir). */
const BASELINE_MARKERS = ['baseline', '基线测评']

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
  const inLegacyBaseline = segments.some(segment => (LEGACY_BASELINE_DIRS as readonly string[]).includes(segment))
  const isBaselineName = BASELINE_MARKERS.some(marker => name.toLowerCase().includes(marker))
  if (inDir('chapters') && segments.includes('viz')) return 'viz'
  if (inDir('quizzes') || inLegacyBaseline) {
    if (isBaselineName) {
      // The baseline html and its answers/grading files all carry the marker.
      return ANSWERS_MARKERS.some(marker => name.includes(marker)) ? 'other' : 'baseline'
    }
    if (ANSWERS_MARKERS.some(marker => name.includes(marker))) return 'other'
    if (QUIZ_MARKERS.some(marker => name.includes(marker))) return 'quiz'
    if (name.includes('-total')) return 'quiz'
    return 'quiz'
  }
  if (inDir('chapters')) {
    if (NOTE_MARKERS.some(marker => name.includes(marker))) return 'other'
    return 'chapter'
  }
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

/**
 * Note file name for one chapter key inside the notes dir. `branch` is the
 * optional per-chapter note branch: the default branch keeps the historical
 * single-file name (zero migration for existing data), extra branches slot
 * between the key and the localized note suffix.
 */
export function noteFileOf(dirs: WorkspaceDirs, chapterKey: string, branch?: string): string {
  const suffix = dirs.notes === '笔记' ? '-笔记.html' : '-note.html'
  const slot = branch === undefined || branch === '' ? '' : '-' + branch
  return dirs.notes + '/' + chapterKey + slot + suffix
}

/** Note branches parsed from the notes dir listing of one chapter key. */
export function noteBranchesOf(chapterKey: string, fileNames: readonly string[]): string[] {
  const branches = new Set<string>()
  const prefix = chapterKey + '-'
  for (const name of fileNames) {
    if (!name.startsWith(prefix)) continue
    const rest = name.slice(prefix.length)
    // strip the localized suffix tail after the branch slot
    const cut = Math.max(rest.lastIndexOf('-note.html'), rest.lastIndexOf('-笔记.html'))
    if (cut <= 0) continue
    branches.add(rest.slice(0, cut))
  }
  // default branch (exact `<key>-note.html` / `<key>-笔记.html`) first, then named ones
  const list = [...branches].filter(branch => branch !== '').sort()
  return ['', ...list]
}

/** Validate a chapter key before it ever touches the filesystem. */
export function isSafeChapterKey(chapterKey: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(chapterKey)
}

/** Validate a note branch name; '' = default branch (ASCII or zh word chars). */
export function isSafeBranch(branch: string): boolean {
  return branch === '' || /^[A-Za-z0-9\u4e00-\u9fff][A-Za-z0-9\u4e00-\u9fff_-]*$/.test(branch)
}

/**
 * Answers file name for one quiz/baseline html file, per naming.md: it sits
 * next to the quiz with the same stem plus the localized answers marker.
 */
export function answersFileOf(locale: string, quizFileBase: string): string {
  return quizFileBase + (locale === 'zh' ? '-答案.json' : '-answers.json')
}

/** Loose stem guard for quiz/baseline file names (ASCII or zh word chars). */
export function isSafeQuizStem(stem: string): boolean {
  return /^[A-Za-z0-9\u4e00-\u9fff][A-Za-z0-9\u4e00-\u9fff_-]*$/.test(stem)
}
