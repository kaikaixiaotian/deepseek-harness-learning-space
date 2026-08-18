/**
 * Pure path classification for produced learning files, used by the
 * turn-tail cards. Standalone (no workspace context): classifies by the
 * directory tokens and file-name markers of BOTH naming locales.
 */

const CHAPTER_DIRS = ['chapters', '章节']
const QUIZ_DIRS = ['quizzes', '测验']
const QUIZ_MARKERS = ['-quiz', '-测验']
const ANSWERS_MARKERS = ['-answers', '-答案', '-grading', '-批改']

export type LearningCardKind = 'chapter' | 'quiz'

export interface LearningCardItem {
  readonly kind: LearningCardKind
  readonly path: string
  readonly title: string
}

/** The two optional cards for one turn: chapter and/or quiz. */
export interface LearningCardsSelection {
  readonly chapter: LearningCardItem | null
  readonly quiz: LearningCardItem | null
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

/** Classify one produced path as chapter or quiz, else null. */
export function classifyPath(path: string): LearningCardKind | null {
  const segments = normalize(path).split('/')
  const name = stemOf(path)
  const isQuizDir = QUIZ_DIRS.some(dir => segments.includes(dir))
  const isChapterDir = CHAPTER_DIRS.some(dir => segments.includes(dir))
  if (isChapterDir && segments.includes('viz')) return null
  if (isQuizDir) {
    if (ANSWERS_MARKERS.some(marker => name.includes(marker))) return null
    if (QUIZ_MARKERS.some(marker => name.includes(marker))) return 'quiz'
    if (name.includes('-total')) return 'quiz'
    return null
  }
  if (isChapterDir) return 'chapter'
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
  for (const path of paths) {
    const kind = classifyPath(path)
    if (kind === 'chapter') chapter = { kind, path, title: titleOf(path) }
    if (kind === 'quiz') quiz = { kind, path, title: titleOf(path) }
  }
  if (chapter === null && quiz === null) return null
  return { chapter, quiz }
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
