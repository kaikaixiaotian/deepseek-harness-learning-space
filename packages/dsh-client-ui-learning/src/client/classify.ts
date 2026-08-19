/**
 * Pure path classification for produced learning files, used by the
 * turn-tail cards. Standalone (no workspace context): classifies by the
 * directory tokens and file-name markers of BOTH naming locales.
 */

const CHAPTER_DIRS = ['chapters', '章节']
const QUIZ_DIRS = ['quizzes', '测验']
const BASELINE_DIRS = ['00-baseline', '00-基线测评']
const BASELINE_MARKERS = ['baseline', '基线测评']
const PLAN_DIRS = ['plan', '计划']
const PLAN_MARKERS = ['master-plan', '总目录']
const QUIZ_MARKERS = ['-quiz', '-测验']
const ANSWERS_MARKERS = ['-answers', '-答案', '-grading', '-批改']

export type LearningCardKind = 'chapter' | 'quiz' | 'baseline' | 'plan'

export interface LearningCardItem {
  readonly kind: LearningCardKind
  readonly path: string
  readonly title: string
}

/** The optional cards for one turn: chapter / quiz / baseline / plan. */
export interface LearningCardsSelection {
  readonly chapter: LearningCardItem | null
  readonly quiz: LearningCardItem | null
  readonly baseline: LearningCardItem | null
  readonly plan: LearningCardItem | null
}

function normalize(path: string): string {
  return path.replace(/\\/g, '/')
}

/** File name without its final extension. */
export function stemOf(path: string): string {
  const parts = normalize(path).split('/')
  const name = parts[parts.length - 1] ?? path
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

function baseName(path: string): string {
  const parts = normalize(path).split('/')
  return parts[parts.length - 1] ?? path
}

/** Classify one produced path as chapter / quiz / baseline / plan, else null. */
export function classifyPath(path: string): LearningCardKind | null {
  const segments = normalize(path).split('/')
  const name = stemOf(path)
  const isQuizDir = QUIZ_DIRS.some(dir => segments.includes(dir))
  const isChapterDir = CHAPTER_DIRS.some(dir => segments.includes(dir))
  const isBaselineDir = BASELINE_DIRS.some(dir => segments.includes(dir))
  const isPlanDir = PLAN_DIRS.some(dir => segments.includes(dir))
  if (isChapterDir && segments.includes('viz')) return null
  if (isQuizDir) {
    if (ANSWERS_MARKERS.some(marker => name.includes(marker))) return null
    if (BASELINE_MARKERS.some(marker => name.toLowerCase().includes(marker))) return 'baseline'
    if (QUIZ_MARKERS.some(marker => name.includes(marker))) return 'quiz'
    if (name.includes('-total')) return 'quiz'
    return 'quiz'
  }
  if (isChapterDir) return 'chapter'
  if (isBaselineDir) {
    if (ANSWERS_MARKERS.some(marker => name.includes(marker))) return null
    return 'baseline'
  }
  if (isPlanDir) {
    if (ANSWERS_MARKERS.some(marker => name.includes(marker))) return null
    if (PLAN_MARKERS.some(marker => name.includes(marker))) return 'plan'
    return null
  }
  return null
}

/** Human title for a card: the slug part with spaces, or the full stem. */
function titleOf(path: string): string {
  const name = stemOf(path)
  const bare = name.replace(/^stage\d+-ch\d+-/, '')
  const clean = bare.replace(/[-_]/g, ' ')
  return clean.trim() === '' ? name : clean.trim()
}

/**
 * Fold produced paths into the card selection. Later paths win per kind,
 * so the newest chapter/quiz file in the turn is the one offered.
 */
export function selectProducedLearning(paths: readonly string[]): LearningCardsSelection | null {
  let chapter: LearningCardItem | null = null
  let quiz: LearningCardItem | null = null
  let baseline: LearningCardItem | null = null
  let plan: LearningCardItem | null = null
  for (const path of paths) {
    const kind = classifyPath(path)
    if (kind === 'chapter') chapter = { kind, path, title: titleOf(path) }
    if (kind === 'quiz') quiz = { kind, path, title: titleOf(path) }
    if (kind === 'baseline') baseline = { kind, path, title: titleOf(path) }
    if (kind === 'plan') plan = { kind, path, title: titleOf(path) }
  }
  if (chapter === null && quiz === null && baseline === null && plan === null) return null
  return { chapter, quiz, baseline, plan }
}

/**
 * Chapter key for a chapter/quiz file, e.g. 'stage1-ch01-intro'. Quiz
 * names shed their '-quiz'/'-测验' suffix so a quiz opens its chapter's
 * note. Mirrors the host-side derivation (kept local to stay dependency-free).
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

export function fileBaseName(path: string): string {
  return baseName(path)
}

/** Note branch names for one chapter key, parsed from a notes-dir listing. */
export function noteBranchesOf(chapterKey: string, fileNames: readonly string[]): string[] {
  const branches = new Set<string>()
  const prefix = chapterKey + '-'
  for (const name of fileNames) {
    if (!name.startsWith(prefix)) continue
    const rest = name.slice(prefix.length)
    const cut = Math.max(rest.lastIndexOf('-note.html'), rest.lastIndexOf('-笔记.html'))
    if (cut <= 0) continue
    branches.add(rest.slice(0, cut))
  }
  return ['', ...[...branches].filter(branch => branch !== '').sort()]
}

/** ASCII or zh word chars; '' = the default branch. */
export function isSafeNoteBranch(branch: string): boolean {
  return branch === '' || /^[A-Za-z0-9\u4e00-\u9fff][A-Za-z0-9\u4e00-\u9fff_-]*$/.test(branch)
}
