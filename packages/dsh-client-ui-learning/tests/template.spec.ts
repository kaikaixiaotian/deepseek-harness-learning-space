/**
 * Cross-checks the preset's HTML skeletons against the client bridge:
 * the quiz-form skeleton must speak the postMessage protocol this package
 * implements, both skeletons must consume (never define) the dsw tokens,
 * and the dark/light gating must match what injectTheme writes.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const templatesPath = join(import.meta.dirname, '..', '..', '..', 'preset', 'skills', 'learning-loop', 'references', 'templates.md')
const templates = readFileSync(templatesPath, 'utf8')

/** Extract the fenced html block that CONTAINS the skeleton signature. */
function skeleton(signature: string): string {
  let at = 0
  for (;;) {
    const fence = templates.indexOf('```html', at)
    if (fence === -1) throw new Error(`no html fence contains: ${signature}`)
    const end = templates.indexOf('```', fence + '```html'.length)
    if (end === -1) throw new Error(`unterminated fence for: ${signature}`)
    const body = templates.slice(fence + '```html'.length, end)
    if (body.includes(signature)) return body
    at = end
  }
}

const readMode = skeleton('<!-- learning-loop skeleton: read-mode -->')
const quizForm = skeleton('<!-- learning-loop skeleton: quiz-form -->')

/** Static bracket-balance check for the embedded JS (no dynamic evaluation). */
function bracketsBalanced(code: string): boolean {
  const stack: string[] = []
  let quote: '' | "'" | '"' | '`' = ''
  for (let i = 0; i < code.length; i++) {
    const ch = code[i] ?? ''
    if (quote !== '') {
      if (ch === '\\') { i++; continue }
      if (ch === quote) quote = ''
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue }
    if (ch === '/' && (code[i + 1] === '/')) { while (i < code.length && code[i] !== '\n') i++; continue }
    if (ch === '{' || ch === '(' || ch === '[') stack.push(ch)
    else if (ch === '}' || ch === ')' || ch === ']') {
      const open = stack.pop()
      if (open === undefined || (ch === '}' && open !== '{') || (ch === ')' && open !== '(') || (ch === ']' && open !== '[')) return false
    }
  }
  return stack.length === 0 && quote === ''
}

describe('read-mode skeleton', () => {
  it('consumes dsw tokens with fallbacks and never defines them', () => {
    expect(readMode).toContain('--bg:var(--dsw-alias-bg-base,#ffffff)')
    expect(readMode).toContain('--text:var(--dsw-alias-label-primary,#1f2328)')
    expect(readMode).toContain('--accent:var(--dsw-alias-brand-primary,#4f46e5)')
    expect(readMode).not.toMatch(/:root\{[^}]*--dsw-[a-z-]+\s*:/)
    expect(readMode).not.toMatch(/--dsh-[a-z-]+\s*:/)
  })
  it('gates dark on the host classes the bridge injects', () => {
    expect(readMode).toContain('html:not(.ll-light)')
    expect(readMode).toContain('html.ll-dark')
  })
  it('hides the standalone-only viz-open link inside the space', () => {
    expect(readMode).toMatch(/html\.ll-dark \.viz-open, html\.ll-light \.viz-open\{display:none;\}/)
  })
  it('documents the per-locale lang attribute', () => {
    expect(readMode).toContain('per the workspace locale')
  })
})

describe('quiz-form skeleton', () => {
  it('speaks the bridge protocol the Viewer implements', () => {
    expect(quizForm).toContain("type: 'll-submit'")
    expect(quizForm).toContain("type: 'll-read'")
    expect(quizForm).toContain('function bridgeSend(')
    expect(quizForm).toContain('window.parent.postMessage(message')
    expect(quizForm).toContain('ev.source !== window.parent')
    expect(quizForm).toContain('id: ++msgSeq')
  })
  it('keeps the download fallback and localStorage cache', () => {
    expect(quizForm).toContain('function downloadFallback(')
    expect(quizForm).toContain("localStorage.setItem('ll-answers-'")
  })
  it('has the in-space submit notice element and styles', () => {
    expect(quizForm).toContain('<div id="submitNotice"></div>')
    expect(quizForm).toContain('#submitNotice')
  })
  it('restores through inline data first, then bridge/fetch, then cache', () => {
    expect(quizForm).toContain("getElementById('restoreData')")
    expect(quizForm).toContain('restoreFromCache(slug)')
    expect(quizForm).toContain("fetch('./' + slug + '-answers.json')")
  })
  it('embedded JS is structurally balanced (static check)', () => {
    const script = quizForm.slice(quizForm.lastIndexOf('<script>') + '<script>'.length, quizForm.lastIndexOf('</script>'))
    expect(script).toContain('function restore()')
    expect(bracketsBalanced(script)).toBe(true)
  })
})
