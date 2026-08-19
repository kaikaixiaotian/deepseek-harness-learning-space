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
const viz = skeleton('<!-- learning-loop skeleton: viz -->')

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
    if (ch === '/' && code[i + 1] === '*') {
      i += 2
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++
      i++
      continue
    }
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
    expect(readMode).toContain('--text:var(--dsw-alias-label-primary,rgb(15,17,21))')
    // the accent is the business blue family, NOT brand-primary (monochrome
    // black in dsh light mode — it must not drive selection/accent UI)
    expect(readMode).toContain('--accent:var(--dsw-alias-state-business-primary,rgb(65,118,230))')
    expect(readMode).not.toContain('--accent:var(--dsw-alias-brand-primary')
    expect(readMode).not.toMatch(/:root\{[^}]*--dsw-[a-z-]+\s*:/)
    expect(readMode).not.toMatch(/--dsh-[a-z-]+\s*:/)
  })
  it('carries the glass-theme canvas layer the bridge flags', () => {
    expect(readMode).toContain('html.ll-glass')
  })
  it('has no comment bombs — a star-slash inside a CSS comment closes it early and the parser then drops the next rule (the :root token layer)', () => {
    // Any `--xxx*/`-style sequence inside the <style> comments detonates the
    // comment; the leftover text turns the following :root rule into a bad
    // selector and the whole token layer vanishes (symptoms: unstyled page
    // in the learning space). Guard both skeletons.
    for (const [name, doc] of [['read-mode', readMode], ['quiz-form', quizForm], ['viz', viz]] as const) {
      const styles = [...doc.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1] ?? '')
      for (const css of styles) {
        expect(css, name).not.toMatch(/--d[swh][a-z-]*\*\//)
        // every comment closes exactly where it should: strip comments and
        // require the :root block to survive the strip untouched.
        const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')
        expect(stripped, name).toContain(':root{')
      }
    }
  })
  it('gates dark on the host classes the bridge injects', () => {
    expect(readMode).toContain('html:not(.ll-light)')
    expect(readMode).toContain('html.ll-dark')
  })
  it('carries the FULL dark static fallback under ll-dark — a token-snapshot gap must land on dark, never the light :root fallbacks (white canvas)', () => {
    for (const [name, doc] of [['read-mode', readMode], ['quiz-form', quizForm], ['viz', viz]] as const) {
      expect(doc, name).toContain('--bg:var(--dsw-alias-bg-base,rgb(21,21,23))')
      expect(doc, name).toContain('--text:var(--dsw-alias-label-primary,rgb(249,250,251))')
      expect(doc, name).toMatch(/html\.ll-dark\{[^}]*color-scheme:dark/)
      // glass stays layered AFTER ll-dark so the transparent canvas still wins
      expect(doc.indexOf('html.ll-dark{'), name).toBeLessThan(doc.indexOf('html.ll-glass{'))
    }
  })
  it('scales glass overlay frost with the injected aqua knob, not fixed alphas', () => {
    // The user's frost slider (--dsh-aqua-frost, injected by the theme
    // bridge) must drive the in-page overlay alphas; fixed percentages
    // would ignore the setting.
    for (const [name, doc] of [['read-mode', readMode], ['quiz-form', quizForm], ['viz', viz]] as const) {
      expect(doc, name).toContain('--ll-frost:var(--dsh-aqua-frost, 1)')
      expect(doc, name).toMatch(/calc\(\d+% \* var\(--ll-frost\)\)/)
    }
  })
  it('hides the standalone-only viz-open link inside the space', () => {
    expect(readMode).toMatch(/html\.ll-dark \.viz-open, html\.ll-light \.viz-open\{display:none;\}/)
  })
  it('documents the per-locale lang attribute', () => {
    expect(readMode).toContain('per the workspace locale')
  })
  it('ships the live theme listener the host pushes into (apply in place, ack, forward to embedded demos)', () => {
    for (const [name, doc] of [['read-mode', readMode], ['quiz-form', quizForm]] as const) {
      expect(doc, name).toContain('llApplyTheme')
      expect(doc, name).toContain("d.type !== 'll-theme'")
      expect(doc, name).toContain("type: 'll-theme-ack'")
      expect(doc, name).toContain("cl.toggle('ll-glass', !!t.glass)")
    }
    // the read-mode chapter also forwards the theme into its viz iframes
    expect(readMode).toMatch(/frames\[i\]\.contentWindow\.postMessage\(d, '\*'\)/)
  })
})

describe('viz skeleton', () => {
  it('consumes dsw tokens with fallbacks so embedded demos follow the host theme', () => {
    expect(viz).toContain('--bg:var(--dsw-alias-bg-base,#ffffff)')
    expect(viz).toContain('html:not(.ll-light)')
    expect(viz).toContain('html.ll-glass')
    expect(viz).not.toMatch(/:root\{[^}]*--dsw-[a-z-]+\s*:/)
    expect(viz).not.toMatch(/--dsh-[a-z-]+\s*:/)
  })
  it('leaves no hardcoded light canvas (a white box inside a dark chapter doc was the failure mode)', () => {
    expect(viz).not.toContain('background: #fafafa')
    expect(viz).not.toContain('color: #1a1a1a')
    expect(viz).not.toContain('color: #666')
  })
  it('ships the auto-height reporter and the live theme listener', () => {
    expect(viz).toContain('__vizHeight')
    expect(viz).toContain('llApplyTheme')
    expect(viz).toContain("d.type !== 'll-theme'")
    expect(viz).toContain("type: 'll-theme-ack'")
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
    const scripts = [...quizForm.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1] ?? '')
    const restore = scripts.find(code => code.includes('function restore()'))
    expect(restore).toBeDefined()
    // every inline script block — the restore JS and the live theme listener
    for (const code of scripts) expect(bracketsBalanced(code)).toBe(true)
  })
})
