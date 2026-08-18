import { describe, expect, it } from 'vitest'
import { chapterKeyOf, classifyPath, selectProducedLearning } from '../src/client/classify.ts'

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
  it('ignores unrelated files', () => {
    expect(classifyPath('C:/w/other/app.ts')).toBeNull()
    expect(classifyPath('C:/w/react-learning/plan/master-plan.html')).toBeNull()
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
