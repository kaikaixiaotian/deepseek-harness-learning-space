import { describe, expect, it } from 'vitest'
import { chapterKeyOf, classifyPath, isSafeNoteBranch, noteBranchesOf, noteKeyOf, selectProducedLearning } from '../src/client/classify.ts'

describe('classifyPath', () => {
  it('recognizes chapter files in both locales', () => {
    expect(classifyPath('C:/w/react-learning/chapters/stage1-ch01-intro.html')).toBe('chapter')
    expect(classifyPath('C:/w/react-学习/章节/阶段1-章01-入门.html')).toBe('chapter')
    expect(classifyPath('C:/w/react-learning/chapters/stage1-ch01-intro_v2.html')).toBe('chapter')
  })
  it('ignores viz files inside the chapters dir', () => {
    expect(classifyPath('C:/w/react-learning/chapters/viz/stage1-ch01-cb.html')).toBeNull()
  })
  it('recognizes quiz files and ignores their answers/grading', () => {
    expect(classifyPath('C:/w/react-learning/quizzes/stage1-ch01-quiz.html')).toBe('quiz')
    expect(classifyPath('C:/w/react-学习/测验/阶段1-章01-测验.html')).toBe('quiz')
    expect(classifyPath('C:/w/react-learning/quizzes/stage1-total-quiz.html')).toBe('quiz')
    expect(classifyPath('C:/w/react-learning/quizzes/stage1-ch01-quiz-answers.json')).toBeNull()
    expect(classifyPath('C:/w/react-learning/quizzes/stage1-ch01-quiz-grading.json')).toBeNull()
  })
  it('recognizes the baseline assessment and master plan in both locales', () => {
    expect(classifyPath('C:/w/react-learning/00-baseline/baseline.html')).toBe('baseline')
    expect(classifyPath('C:/w/react-学习/00-基线测评/基线测评.html')).toBe('baseline')
    expect(classifyPath('C:/w/react-learning/00-baseline/baseline-answers.json')).toBeNull()
    expect(classifyPath('C:/w/react-learning/quizzes/baseline.html')).toBe('baseline')
    // Unified storage: the baseline html lives in the quizzes dir, and its
    // answers/grading files in the same dir stay out of the cards.
    expect(classifyPath('C:/w/react-学习/测验/基线测评.html')).toBe('baseline')
    expect(classifyPath('C:/w/react-学习/测验/基线测评-答案.json')).toBeNull()
    expect(classifyPath('C:/w/react-学习/测验/基线测评-批改.json')).toBeNull()
    expect(classifyPath('C:/w/react-learning/plan/master-plan.html')).toBe('plan')
    expect(classifyPath('C:/w/react-学习/计划/总目录.html')).toBe('plan')
    expect(classifyPath('C:/w/react-learning/plan/sources/stage1-ch01.md')).toBeNull()
    expect(classifyPath('C:/w/react-learning/plan/master-plan-grading.json')).toBeNull()
  })
  it('ignores unrelated files', () => {
    expect(classifyPath('C:/w/other/app.ts')).toBeNull()
  })
})

describe('chapterKeyOf', () => {
  it('derives stable keys for chapters and quizzes', () => {
    expect(chapterKeyOf('chapters/stage1-ch01-intro.html')).toBe('stage1-ch01-intro')
    expect(chapterKeyOf('quizzes/stage1-ch01-quiz.html')).toBe('stage1-ch01')
    expect(chapterKeyOf('测验/阶段1-章01-测验.html')).toBe('stage1-ch01')
    expect(chapterKeyOf('quizzes/stage1-total-quiz.html')).toBeNull()
  })
  it('returns null for non-chapter files', () => {
    expect(chapterKeyOf('README.md')).toBeNull()
  })
})

describe('selectProducedLearning', () => {
  it('yields both cards when both kinds are produced', () => {
    const selection = selectProducedLearning([
      'C:/w/react-learning/chapters/stage1-ch01-intro.html',
      'C:/w/react-learning/quizzes/stage1-ch01-quiz.html',
    ])
    expect(selection?.chapter?.kind).toBe('chapter')
    expect(selection?.quiz?.kind).toBe('quiz')
  })
  it('yields baseline and plan cards for the early phases', () => {
    const selection = selectProducedLearning([
      'C:/w/react-学习/00-基线测评/基线测评.html',
      'C:/w/react-学习/计划/总目录.html',
    ])
    expect(selection?.baseline?.kind).toBe('baseline')
    expect(selection?.plan?.kind).toBe('plan')
    expect(selection?.chapter).toBeNull()
  })
  it('yields nothing without learning files', () => {
    expect(selectProducedLearning(['C:/w/app.ts'])).toBeNull()
    expect(selectProducedLearning([])).toBeNull()
  })
  it('the newest file wins per kind', () => {
    const selection = selectProducedLearning([
      'C:/w/react-learning/chapters/stage1-ch01-intro.html',
      'C:/w/react-learning/chapters/stage1-ch01-intro_v2.html',
    ])
    expect(selection?.chapter?.path).toContain('_v2')
  })
})

describe('noteBranchesOf / isSafeNoteBranch', () => {
  it('lists the default branch first plus named branches, both locales', () => {
    expect(noteBranchesOf('stage1-ch01', [
      'stage1-ch01-note.html',
      'stage1-ch01-ideas-note.html',
      'stage1-ch01-review-note.html',
      'stage1-ch02-note.html',
      'unrelated.html',
    ])).toEqual(['', 'ideas', 'review'])
    expect(noteBranchesOf('stage1-ch01', [
      'stage1-ch01-笔记.html',
      'stage1-ch01-错题-笔记.html',
    ])).toEqual(['', '错题'])
  })
  it('accepts only safe branch names (ascii or zh, no separators)', () => {
    expect(isSafeNoteBranch('')).toBe(true)
    expect(isSafeNoteBranch('ideas-2')).toBe(true)
    expect(isSafeNoteBranch('错题本')).toBe(true)
    expect(isSafeNoteBranch('../escape')).toBe(false)
    expect(isSafeNoteBranch('a b')).toBe(false)
  })
})

describe('noteKeyOf', () => {
  it('keeps chapters on the chapter note key (back-compat with existing note files)', () => {
    expect(noteKeyOf('C:/w/react-学习/章节/阶段1-章01-入门.html')).toBe('stage1-ch01-入门')
    expect(noteKeyOf('C:/w/react-learning/chapters/stage1-ch01-intro.html')).toBe('stage1-ch01-intro')
    expect(noteKeyOf('C:/w/react-learning/chapters/stage1-ch01-intro_v2.html')).toBe('stage1-ch01-intro')
  })
  it('gives quizzes and stage totals their OWN note keys in both locales', () => {
    expect(noteKeyOf('C:/w/react-learning/quizzes/stage1-ch01-quiz.html')).toBe('stage1-ch01-quiz')
    expect(noteKeyOf('C:/w/react-学习/测验/阶段1-章01-测验.html')).toBe('stage1-ch01-quiz')
    expect(noteKeyOf('C:/w/react-learning/quizzes/stage1-total-quiz.html')).toBe('stage1-total-quiz')
    expect(noteKeyOf('C:/w/react-学习/测验/阶段1-总测验.html')).toBe('stage1-total-quiz')
  })
  it('maps the baseline to a fixed ascii key in both locales', () => {
    expect(noteKeyOf('C:/w/react-学习/测验/基线测评.html')).toBe('baseline')
    expect(noteKeyOf('C:/w/react-learning/quizzes/baseline.html')).toBe('baseline')
  })
  it('covers ascii-stem plan docs and rejects non-note files', () => {
    expect(noteKeyOf('C:/w/react-learning/plan/master-plan.html')).toBe('master-plan')
    expect(noteKeyOf('C:/w/react-学习/计划/总目录.html')).toBeNull()
    expect(noteKeyOf('C:/w/react-学习/知识库/阶段1-章01.md')).toBeNull()
  })
})
