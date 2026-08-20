/**
 * Pure-logic tests for the learning-space iframe bridges: theme injection,
 * relative-path resolution, viz inlining, and the postMessage protocol
 * validation. No DOM required (snapshotTheme itself is DOM-bound and only
 * covered by the UI smoke).
 */

import { describe, expect, it } from 'vitest'
import {
  bridgeReply,
  dirOf,
  floorThemeSnapshot,
  injectLinkGuard,
  injectTheme,
  inlineRelativeIframes,
  isThemeAck,
  parseBridgeMessage,
  postThemeUpdate,
  resolveDarkFlag,
  resolveRelative,
  safeOpenTarget,
  vizPlaceholder,
  type ThemeSnapshot,
} from '../src/client/bridge.ts'

const LIGHT: ThemeSnapshot = { css: '--dsw-alias-bg-base:#ffffff;--dsw-alias-label-primary:#16181d;', dark: false, glass: false }
const DARK: ThemeSnapshot = { css: '--dsw-alias-bg-base:#0c121b;--dsw-alias-label-primary:#e6e9ef;', dark: true, glass: false }
const GLASS: ThemeSnapshot = { css: '--dsw-alias-bg-base:#0c121b;--dsw-alias-state-business-primary:#679efe;', dark: true, glass: true }

describe('injectTheme', () => {
  it('injects the token style into <head> and the ll-dark class when dark', () => {
    const html = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>t</title></head><body><p>hi</p></body></html>'
    const out = injectTheme(html, DARK)
    expect(out).toContain('<style id="ll-theme">:root{--dsw-alias-bg-base:#0c121b;')
    expect(out).toMatch(/<html[^>]*class="[^"]*ll-dark/)
    expect(out.indexOf('<style id="ll-theme">')).toBeGreaterThan(out.indexOf('<head>'))
  })
  it('carries the color-scheme rules so the UA canvas base and native chrome follow the host scheme', () => {
    const dark = injectTheme('<html><head></head><body></body></html>', DARK)
    expect(dark).toContain('html.ll-dark{color-scheme:dark}')
    const light = injectTheme('<html><head></head><body></body></html>', LIGHT)
    expect(light).toContain('html.ll-light{color-scheme:light}')
  })
  it('appends to an existing html class instead of replacing it', () => {
    const html = '<html class="custom"><head></head><body></body></html>'
    expect(injectTheme(html, DARK)).toMatch(/class="custom ll-dark"/)
    expect(injectTheme(html, LIGHT)).toMatch(/class="custom ll-light"/)
  })
  it('marks light mode with ll-light and still injects the style', () => {
    const out = injectTheme('<html><head></head><body></body></html>', LIGHT)
    expect(out).toContain('id="ll-theme"')
    expect(out).toMatch(/<html[^>]*class="ll-light"/)
  })
  it('adds the ll-glass class alongside the scheme class for glass themes', () => {
    const out = injectTheme('<html><head></head><body></body></html>', GLASS)
    expect(out).toMatch(/<html[^>]*class="[^"]*ll-dark ll-glass"/)
    const outFragment = injectTheme('<p>fragment</p>', GLASS)
    expect(outFragment.startsWith('<style id="ll-theme">')).toBe(true)
  })
  it('never adds ll-glass when the glass flag is off', () => {
    expect(injectTheme('<html><head></head><body></body></html>', DARK)).not.toContain('ll-glass')
  })
  it('prepends the style for fragment documents without html/head', () => {
    const out = injectTheme('<p>fragment</p>', LIGHT)
    expect(out.startsWith('<style id="ll-theme">')).toBe(true)
    expect(out).toContain('<p>fragment</p>')
  })
})

describe('postThemeUpdate / isThemeAck', () => {
  it('posts the full theme payload with targetOrigin star for opaque srcDoc origins', () => {
    const posted: unknown[] = []
    const target = { postMessage: (data: unknown, origin: string) => { posted.push({ data, origin }) } } as unknown as Window
    postThemeUpdate(target, GLASS, 42)
    expect(posted).toEqual([{ data: { type: 'll-theme', nonce: 42, css: GLASS.css, dark: true, glass: true }, origin: '*' }])
  })
  it('matches acks only on the echoed nonce', () => {
    const event = { data: { type: 'll-theme-ack', nonce: 7 } } as unknown as MessageEvent
    expect(isThemeAck(event, 7)).toBe(true)
    expect(isThemeAck(event, 8)).toBe(false)
    expect(isThemeAck({ data: { type: 'll-read', nonce: 7 } } as unknown as MessageEvent, 7)).toBe(false)
    expect(isThemeAck({ data: null } as unknown as MessageEvent, 7)).toBe(false)
  })
})

describe('resolveRelative / dirOf', () => {
  it('resolves relative viz paths against the document directory', () => {
    expect(resolveRelative('/w/react-learning/chapters', './viz/stage1-ch01-cb.html'))
      .toBe('/w/react-learning/chapters/viz/stage1-ch01-cb.html')
    expect(resolveRelative('/w/react-learning/quizzes', '../chapters/a.html'))
      .toBe('/w/react-learning/chapters/a.html')
  })
  it('keeps absolute paths and handles windows separators and drive letters', () => {
    expect(resolveRelative('/w/x', 'C:/abs/file.html')).toBe('C:/abs/file.html')
    expect(resolveRelative('/w/x/quizzes', String.raw`D:\w\x\viz\..\chapters`)).toBe('D:/w/x/chapters')
    expect(resolveRelative('C:/w/react/chapters', String.raw`.\viz\a.html`)).toBe('C:/w/react/chapters/viz/a.html')
    expect(resolveRelative('C:/w/chapters', './viz/a.html')).toBe('C:/w/chapters/viz/a.html')
  })
  it('dirOf returns the directory part', () => {
    expect(dirOf('/w/react-learning/chapters/a.html')).toBe('/w/react-learning/chapters')
    expect(dirOf('a.html')).toBe('')
  })
})

describe('inlineRelativeIframes', () => {
  it('rewrites relative html iframe srcs to blob urls and skips remote ones', async () => {
    const html = [
      '<iframe src="./viz/a.html" loading="lazy"></iframe>',
      '<iframe src="https://example.com/b.html"></iframe>',
      '<iframe src="./viz/a.html"></iframe>',
      '<iframe src="./viz/missing.html"></iframe>',
      '<iframe src="./movie.mp4"></iframe>',
    ].join('')
    let created = 0
    const { html: out, objectUrls } = await inlineRelativeIframes(
      html,
      async path => (path.endsWith('a.html') ? '<p>viz a</p>' : null),
      () => `blob:mock-${++created}`,
    )
    expect(created).toBe(1)
    expect(objectUrls).toEqual(['blob:mock-1'])
    expect((out.match(/blob:mock-1/g) ?? []).length).toBe(2)
    expect(out).toContain('https://example.com/b.html')
    expect(out).toContain('./viz/missing.html')
    expect(out).toContain('./movie.mp4')
  })
  it('keeps the document untouched when nothing is relative html', async () => {
    const html = '<iframe src="data:text/html,hi"></iframe>'
    const result = await inlineRelativeIframes(html, async () => '<p>x</p>')
    expect(result.html).toBe(html)
    expect(result.objectUrls).toEqual([])
  })
  it('applies the transform to inlined viz content before the blob url is minted', async () => {
    let blobbed = ''
    const { html } = await inlineRelativeIframes(
      '<iframe src="./viz/a.html"></iframe>',
      async () => '<html><body>viz</body></html>',
      content => { blobbed = content; return 'blob:x' },
      content => content.replace('<body>', '<body data-themed>'),
    )
    // the blob carries the TRANSFORMED document (theme-injected demo)
    expect(blobbed).toContain('data-themed')
    expect(html).toContain('blob:x')
  })
})

describe('resolveDarkFlag', () => {
  it('takes the body attribute first and falls back through the color-scheme chain', () => {
    expect(resolveDarkFlag(true, 'light', 'light')).toBe(true)
    expect(resolveDarkFlag(false, 'dark', 'light')).toBe(true)
    // the root's inline color-scheme beats the computed value
    expect(resolveDarkFlag(false, 'light', 'dark')).toBe(false)
    expect(resolveDarkFlag(false, '', 'dark light')).toBe(true)
    expect(resolveDarkFlag(false, '  ', 'light')).toBe(false)
    expect(resolveDarkFlag(false, '', '')).toBe(false)
  })
})

describe('floorThemeSnapshot', () => {
  it('floors an EMPTY dark snapshot to the dsh dark statics — an unthemed (white) document becomes impossible', () => {
    const empty: ThemeSnapshot = { css: '', dark: true, glass: false }
    const floored = floorThemeSnapshot(empty)
    expect(floored.css).toContain('--dsw-alias-bg-base:rgb(21,21,23);')
    expect(floored.css).toContain('--dsw-alias-label-primary:rgb(249,250,251);')
    expect(floored.css).toContain('--dsw-alias-state-business-primary:rgb(103,158,254);')
    expect(floored.dark).toBe(true)
  })
  it('floors an empty LIGHT snapshot to the light statics', () => {
    const floored = floorThemeSnapshot({ css: '', dark: false, glass: false })
    expect(floored.css).toContain('--dsw-alias-bg-base:#ffffff;')
    expect(floored.css).toContain('--dsw-alias-label-primary:rgb(15,17,21);')
  })
  it('keeps captured values authoritative and only fills gaps', () => {
    const partial: ThemeSnapshot = { css: '--dsw-alias-bg-base:#0C121B;', dark: true, glass: false }
    const floored = floorThemeSnapshot(partial)
    expect(floored.css.startsWith('--dsw-alias-bg-base:#0C121B;')).toBe(true)
    expect(floored.css).not.toContain('--dsw-alias-bg-base:rgb(21,21,23)')
    expect(floored.css).toContain('--dsw-alias-label-primary:rgb(249,250,251);')
    // captured token appears exactly once
    expect((floored.css.match(/--dsw-alias-bg-base:/g) ?? []).length).toBe(1)
  })
  it('never floors the glass knobs', () => {
    const floored = floorThemeSnapshot({ css: '', dark: true, glass: true })
    expect(floored.css).not.toContain('--dsh-aqua-blur')
    expect(floored.css).not.toContain('--dsh-aqua-frost')
  })
})

describe('injectLinkGuard / vizPlaceholder / safeOpenTarget', () => {
  it('injects the guard before </body> and appends for fragment documents', () => {
    const out = injectLinkGuard('<html><body><p>x</p></body></html>')
    expect(out.indexOf('ll-open')).toBeLessThan(out.indexOf('</body>'))
    expect(injectLinkGuard('<p>fragment</p>')).toContain('ll-open')
  })
  it('guard lets fragments through and routes everything else (static source check)', () => {
    const script = injectLinkGuard('<body></body>')
    // fragment and scheme skips, preventDefault, and the postMessage route
    expect(script).toContain("href.charAt(0) === '#'")
    expect(script).toContain('ev.preventDefault()')
    expect(script).toContain("type: 'll-open'")
    // external http links open in a browser tab from inside the iframe
    expect(script).toMatch(/https\?:.*window\.open/s)
    // form submits are neutralized (Enter-in-input must not reload the srcDoc)
    expect(script).toMatch(/addEventListener\('submit'.*preventDefault/s)
  })
  it('placeholder is a self-contained themed document with the escaped name', () => {
    const doc = vizPlaceholder('<demo & "x">')
    expect(doc).toContain('<!DOCTYPE html>')
    expect(doc).toContain('&lt;demo &amp; &quot;x&quot;&gt;')
    expect(doc).not.toContain('<demo')
  })
  it('safeOpenTarget strips fragment/query, rejects escapes, stays inside the root', () => {
    const root = 'C:/w/react-学习'
    expect(safeOpenTarget(root, 'C:/w/react-学习/章节', './viz/q.html#sec-1?x=2')).toBe('C:/w/react-学习/章节/viz/q.html')
    expect(safeOpenTarget(root, 'C:/w/react-学习/章节', './a.html')).toBe('C:/w/react-学习/章节/a.html')
    expect(safeOpenTarget(root, 'C:/w/react-学习/章节', '../outside.html')).toBeNull()
    expect(safeOpenTarget(root, 'C:/w/react-学习/章节', 'https://example.com/x')).toBeNull()
    expect(safeOpenTarget(root, 'C:/w/react-学习/章节', '#anchor-only')).toBeNull()
  })
})

describe('parseBridgeMessage', () => {
  const makeEvent = (data: unknown, source: unknown): MessageEvent =>
    ({ data, source }) as unknown as MessageEvent

  it('accepts ll-read, ll-submit and ll-open from the owning iframe only', () => {
    const iframe = { contentWindow: { mark: 1 } } as unknown as HTMLIFrameElement
    expect(parseBridgeMessage(makeEvent({ type: 'll-read', id: 1, path: './x-answers.json' }, iframe.contentWindow), iframe))
      .toEqual({ kind: 'll-read', id: 1, path: './x-answers.json' })
    expect(parseBridgeMessage(makeEvent({ type: 'll-submit', id: 2, quiz: 'q', answers: { q1: 'a' } }, iframe.contentWindow), iframe))
      .toEqual({ kind: 'll-submit', id: 2, quiz: 'q', answers: { q1: 'a' } })
    expect(parseBridgeMessage(makeEvent({ type: 'll-open', id: 3, href: './quiz.html' }, iframe.contentWindow), iframe))
      .toEqual({ kind: 'll-open', id: 3, href: './quiz.html', absolute: false })
    expect(parseBridgeMessage(makeEvent({ type: 'll-open', id: 4, href: 'https://example.com' }, iframe.contentWindow), iframe))
      .toEqual({ kind: 'll-open', id: 4, href: 'https://example.com', absolute: true })
    expect(parseBridgeMessage(makeEvent({ type: 'll-read', id: 3, path: 'x' }, { other: 2 }), iframe)).toBeNull()
    expect(parseBridgeMessage(makeEvent({ type: 'll-read', id: 3, path: 'x' }, iframe.contentWindow), null)).toBeNull()
  })
  it('rejects malformed payloads', () => {
    const iframe = { contentWindow: {} } as unknown as HTMLIFrameElement
    expect(parseBridgeMessage(makeEvent('string', iframe.contentWindow), iframe)).toBeNull()
    expect(parseBridgeMessage(makeEvent({ type: 'other', id: 1 }, iframe.contentWindow), iframe)).toBeNull()
    expect(parseBridgeMessage(makeEvent({ type: 'll-read', path: 'x' }, iframe.contentWindow), iframe)).toBeNull()
    expect(parseBridgeMessage(makeEvent({ type: 'll-submit', id: 1, quiz: 'q' }, iframe.contentWindow), iframe)).toBeNull()
    expect(parseBridgeMessage(makeEvent({ type: 'll-open', id: 1 }, iframe.contentWindow), iframe)).toBeNull()
  })
})

describe('bridgeReply', () => {
  it('echoes the request id with a typed result envelope', () => {
    const request = { kind: 'll-submit' as const, id: 7, quiz: 'q', answers: {} }
    expect(bridgeReply(request, { ok: true, path: '/w/x-answers.json' }))
      .toEqual({ type: 'll-submit-result', id: 7, ok: true, path: '/w/x-answers.json' })
    expect(bridgeReply({ kind: 'll-read' as const, id: 8, path: 'p' }, { ok: false, error: 'boom' }).error)
      .toBe('boom')
  })
})
