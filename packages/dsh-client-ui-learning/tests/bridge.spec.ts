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
  injectTheme,
  inlineRelativeIframes,
  parseBridgeMessage,
  resolveRelative,
  type ThemeSnapshot,
} from '../src/client/bridge.ts'

const LIGHT: ThemeSnapshot = { css: '--dsw-alias-bg-base:#ffffff;--dsw-alias-label-primary:#16181d;', dark: false }
const DARK: ThemeSnapshot = { css: '--dsw-alias-bg-base:#0c121b;--dsw-alias-label-primary:#e6e9ef;', dark: true }

describe('injectTheme', () => {
  it('injects the token style into <head> and the ll-dark class when dark', () => {
    const html = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>t</title></head><body><p>hi</p></body></html>'
    const out = injectTheme(html, DARK)
    expect(out).toContain('<style id="ll-theme">:root{--dsw-alias-bg-base:#0c121b;')
    expect(out).toMatch(/<html[^>]*class="[^"]*ll-dark/)
    expect(out.indexOf('<style id="ll-theme">')).toBeGreaterThan(out.indexOf('<head>'))
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
  it('prepends the style for fragment documents without html/head', () => {
    const out = injectTheme('<p>fragment</p>', LIGHT)
    expect(out.startsWith('<style id="ll-theme">')).toBe(true)
    expect(out).toContain('<p>fragment</p>')
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
})

describe('parseBridgeMessage', () => {
  const makeEvent = (data: unknown, source: unknown): MessageEvent =>
    ({ data, source }) as unknown as MessageEvent

  it('accepts ll-read and ll-submit from the owning iframe only', () => {
    const iframe = { contentWindow: { mark: 1 } } as unknown as HTMLIFrameElement
    expect(parseBridgeMessage(makeEvent({ type: 'll-read', id: 1, path: './x-answers.json' }, iframe.contentWindow), iframe))
      .toEqual({ kind: 'll-read', id: 1, path: './x-answers.json' })
    expect(parseBridgeMessage(makeEvent({ type: 'll-submit', id: 2, quiz: 'q', answers: { q1: 'a' } }, iframe.contentWindow), iframe))
      .toEqual({ kind: 'll-submit', id: 2, quiz: 'q', answers: { q1: 'a' } })
    expect(parseBridgeMessage(makeEvent({ type: 'll-read', id: 3, path: 'x' }, { other: 2 }), iframe)).toBeNull()
    expect(parseBridgeMessage(makeEvent({ type: 'll-read', id: 3, path: 'x' }, iframe.contentWindow), null)).toBeNull()
  })
  it('rejects malformed payloads', () => {
    const iframe = { contentWindow: {} } as unknown as HTMLIFrameElement
    expect(parseBridgeMessage(makeEvent('string', iframe.contentWindow), iframe)).toBeNull()
    expect(parseBridgeMessage(makeEvent({ type: 'other', id: 1 }, iframe.contentWindow), iframe)).toBeNull()
    expect(parseBridgeMessage(makeEvent({ type: 'll-read', path: 'x' }, iframe.contentWindow), iframe)).toBeNull()
    expect(parseBridgeMessage(makeEvent({ type: 'll-submit', id: 1, quiz: 'q' }, iframe.contentWindow), iframe)).toBeNull()
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
