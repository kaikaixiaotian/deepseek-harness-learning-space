import { describe, expect, it } from 'vitest'
import {
  chapterKeyOf,
  classifyArtifact,
  contain,
  deriveLocale,
  isLearningWorkspaceDir,
  isSafeChapterKey,
  noteFileOf,
  workspaceDirs,
} from '../src/workspace.ts'

const en = workspaceDirs('en')
const zh = workspaceDirs('zh')

describe('workspaceDirs', () => {
  it('maps en and zh tokens', () => {
    expect(en.chapters).toBe('chapters')
    expect(zh.chapters).toBe('章节')
    expect(en.notes).toBe('notes')
    expect(zh.notes).toBe('笔记')
    expect(en.quizzes).toBe('quizzes')
    expect(zh.quizzes).toBe('测验')
  })
})

describe('isLearningWorkspaceDir / deriveLocale', () => {
  it('recognizes both suffixes', () => {
    expect(isLearningWorkspaceDir('react-learning')).toBe(true)
    expect(isLearningWorkspaceDir('react-学习')).toBe(true)
    expect(isLearningWorkspaceDir('react-study')).toBe(false)
  })
  it('derives locale with en fallback', () => {
    expect(deriveLocale({})).toBe('en')
    expect(deriveLocale({ locale: 'zh' })).toBe('zh')
    expect(deriveLocale({ locale: 'ZH' })).toBe('zh')
  })
})

describe('classifyArtifact', () => {
  it('classifies chapter / quiz / viz / answers / other', () => {
    expect(classifyArtifact('/w/react-learning/chapters/stage1-ch01-intro.html', en)).toBe('chapter')
    expect(classifyArtifact('/w/react-learning/chapters/stage1-ch01-intro_v2.html', en)).toBe('chapter')
    expect(classifyArtifact('/w/react-learning/chapters/viz/stage1-ch01-cb.html', en)).toBe('viz')
    expect(classifyArtifact('/w/react-learning/quizzes/stage1-ch01-quiz.html', en)).toBe('quiz')
    expect(classifyArtifact('/w/react-learning/quizzes/stage1-total-quiz.html', en)).toBe('quiz')
    expect(classifyArtifact('/w/react-learning/quizzes/stage1-ch01-quiz-answers.json', en)).toBe('other')
    expect(classifyArtifact('/w/react-learning/quizzes/stage1-ch01-quiz-grading.json', en)).toBe('other')
    expect(classifyArtifact('/w/other/app.ts', en)).toBe('other')
  })
  it('classifies zh paths', () => {
    expect(classifyArtifact('/w/react-学习/章节/阶段1-章01-入门.html', zh)).toBe('chapter')
    expect(classifyArtifact('/w/react-学习/测验/阶段1-章01-测验.html', zh)).toBe('quiz')
  })
})

describe('chapterKeyOf', () => {
  it('derives stable chapter keys', () => {
    expect(chapterKeyOf('chapters/stage1-ch01-intro.html')).toBe('stage1-ch01-intro')
    expect(chapterKeyOf('quizzes/stage1-ch01-quiz.html')).toBe('stage1-ch01')
    expect(chapterKeyOf('测验/阶段1-章01-测验.html')).toBe('stage1-ch01')
    expect(chapterKeyOf('quizzes/stage1-total-quiz.html')).toBeNull()
    expect(chapterKeyOf('README.md')).toBeNull()
  })
  it('sheds version suffixes for chapter files', () => {
    expect(chapterKeyOf('chapters/stage2-ch03-hooks_v2.html')).toBe('stage2-ch03-hooks')
  })
})

describe('contain / joinPath', () => {
  it('accepts files inside the root', () => {
    expect(contain('/w/react-learning', '/w/react-learning/chapters/a.html')).toBe(true)
    expect(contain('/w/react-learning', 'chapters/a.html')).toBe(true)
  })
  it('rejects escapes and prefix siblings', () => {
    expect(contain('/w/react-learning', '/w/react-learning/../secret')).toBe(false)
    expect(contain('/w/react-learning', '../secret')).toBe(false)
    expect(contain('/w/react-learning', '/w/react-learning-evil/a.html')).toBe(false)
    expect(contain('/w/react-learning', '/w/react-learning')).toBe(false)
  })
})

describe('notes helpers', () => {
  it('names per-chapter notes', () => {
    expect(noteFileOf(en, 'stage1-ch01-intro')).toBe('notes/stage1-ch01-intro-note.html')
    expect(noteFileOf(zh, 'stage1-ch01-intro')).toBe('笔记/stage1-ch01-intro-笔记.html')
  })
  it('validates chapter keys', () => {
    expect(isSafeChapterKey('stage1-ch01-intro')).toBe(true)
    expect(isSafeChapterKey('../../etc')).toBe(false)
    expect(isSafeChapterKey('a b')).toBe(false)
  })
})
