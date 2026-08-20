/**
 * Pure-logic tests for the learning-space iframe bridges: theme injection,
 * relative-path resolution, viz inlining, and the postMessage protocol
 * validation. No DOM required (snapshotTheme itself is DOM-bound and only
 * covered by the UI smoke).
 */

import { describe, expect, it } from 'vitest'
import {
  ANCHOR_REPORT_TYPE,
  bridgeReply,
  clearQuizDraft,
  dirOf,
  DRAFT_CLEAR_TYPE,
  DRAFT_READ_TYPE,
  DRAFT_SAVE_TYPE,
  floorThemeSnapshot,
  injectAnchorLayer,
  injectLinkGuard,
  injectQuizDraft,
  injectTheme,
  inlineRelativeIframes,
  isThemeAck,
  LOCATE_NOTICE_TYPE,
  parseBridgeMessage,
  parseBridgeNotice,
  postSectionBadges,
  postSectionHighlight,
  postSectionJump,
  postThemeUpdate,
  quizDraftKey,
  readQuizDraft,
  resolveDarkFlag,
  resolveRelative,
  compatChapter,
  compatViz,
  safeOpenTarget,
  stripBaseTags,
  vizDirAlternates,
  vizPlaceholder,
  writeQuizDraft,
  type QuizDraftStore,
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
  it('guard scrolls fragments manually and routes everything else (static source check)', () => {
    const script = injectLinkGuard('<body></body>')
    // fragment links are taken over by the guard: preventDefault + in-doc
    // scrollIntoView, so a <base> or inherited-base quirk can never turn a
    // TOC click into a full navigation to the app origin
    expect(script).toContain("href.charAt(0) === '#'")
    expect(script).toMatch(/charAt\(0\) === '#'.*preventDefault.*scrollIntoView/s)
    expect(script).toContain('decodeURIComponent')
    // scheme skips, preventDefault, and the postMessage route
    expect(script).toContain('ev.preventDefault()')
    expect(script).toContain("type: 'll-open'")
    // external http links open in a browser tab from inside the iframe
    expect(script).toMatch(/https\?:.*window\.open/s)
    // form submits are neutralized (Enter-in-input must not reload the srcDoc)
    expect(script).toMatch(/addEventListener\('submit'.*preventDefault/s)
    // EMPTY href must be prevented too: under srcDoc it resolves against the
    // inherited app base, loading the dsh SPA over the document (the
    // "TOC click opens the main UI in the reading pane" bug)
    expect(script).toContain('if (!href) { ev.preventDefault(); return; }')
  })
  it('stripBaseTags removes base tags so fragment links stay document-relative', () => {
    const doc = '<html><head><base href="https://app/x/"><base target="_blank"></head><body><p>ok</p></body></html>'
    const out = stripBaseTags(doc)
    expect(out).not.toMatch(/<base/i)
    expect(out).toContain('<p>ok</p>')
    expect(stripBaseTags('<p>clean</p>')).toBe('<p>clean</p>')
  })
  it('vizDirAlternates swaps the locale-mapped demo dir both ways', () => {
    expect(vizDirAlternates('./viz/阶段1-章01-arrow.html')).toEqual(['./viz/阶段1-章01-arrow.html', './演示/阶段1-章01-arrow.html'])
    expect(vizDirAlternates('./演示/arrow.html')).toEqual(['./演示/arrow.html', './viz/arrow.html'])
    // no viz segment → single candidate; the word inside a filename is untouched
    expect(vizDirAlternates('./demos/vizor.html')).toEqual(['./demos/vizor.html'])
  })

  it('compatViz themes legacy demos and fixes the ratcheting height report; new-skeleton demos pass through', () => {
    const legacy = '<html><head><style>.stage{background:#fafafa}</style></head><body><div class="stage"></div>' +
      '<script>parent.postMessage({ __vizHeight: Math.ceil(document.documentElement.scrollHeight) }, "*")</script></body></html>'
    const out = compatViz(legacy)
    expect(out).toContain('ll-viz-compat')
    expect(out).toContain('html.ll-dark body')
    // the contrast self-healer rescues custom light chips (light bg + light ink)
    expect(out).toContain('ll-viz-contrast')
    expect(out).toContain("classList.contains('ll-dark')")
    expect(out).toContain("el.style.color='rgb(24,26,30)'")
    // the viewport-floored report is rewritten to the content-driven one
    expect(out).toContain('document.body.scrollHeight+48')
    expect(out).not.toContain('document.documentElement.scrollHeight')
    // current-skeleton demos theme themselves — untouched
    const modern = '<html><head><!-- learning-loop skeleton: viz --></head><body>x</body></html>'
    expect(compatViz(modern)).toBe(modern)
  })

  it('compatChapter neutralizes the label-covering viz breakout; clean chapters pass through', () => {
    const broken = '<html><head><style>ol.elements .el-body figure.viz{margin:10px 0 4px -166px;width:calc(100% + 166px);}</style></head><body></body></html>'
    const out = compatChapter(broken)
    expect(out).toContain('ll-chapter-compat')
    expect(out).toContain('width:100% !important')
    expect(compatChapter('<html><body>clean</body></html>')).toBe('<html><body>clean</body></html>')
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
  it('accepts ll-excerpt with a safe section id, and demotes unsafe ids to document level', () => {
    const iframe = { contentWindow: {} } as unknown as HTMLIFrameElement
    expect(parseBridgeMessage(makeEvent({ type: 'll-excerpt', id: 5, text: 'quoted', sectionId: 'sec-core', kp: 'KP-2' }, iframe.contentWindow), iframe))
      .toEqual({ kind: 'll-excerpt', id: 5, text: 'quoted', sectionId: 'sec-core', kp: 'KP-2' })
    // quiz/baseline docs carry no sec-* skeleton → document-level anchor
    expect(parseBridgeMessage(makeEvent({ type: 'll-excerpt', id: 6, text: 'q' }, iframe.contentWindow), iframe))
      .toEqual({ kind: 'll-excerpt', id: 6, text: 'q', sectionId: null, kp: null })
    const hostile = parseBridgeMessage(makeEvent({ type: 'll-excerpt', id: 7, text: 'x', sectionId: '"><script>', kp: 42 }, iframe.contentWindow), iframe)
    expect(hostile).toEqual({ kind: 'll-excerpt', id: 7, text: 'x', sectionId: null, kp: null })
    expect(parseBridgeMessage(makeEvent({ type: 'll-excerpt', id: 8 }, iframe.contentWindow), iframe)).toBeNull()
  })
  it('accepts ll-draft-read with a sane docKey, rejecting empty/oversized keys', () => {
    const iframe = { contentWindow: {} } as unknown as HTMLIFrameElement
    expect(parseBridgeMessage(makeEvent({ type: DRAFT_READ_TYPE, id: 9, docKey: 'C:/w/chapters/q.html' }, iframe.contentWindow), iframe))
      .toEqual({ kind: 'll-draft-read', id: 9, docKey: 'C:/w/chapters/q.html' })
    expect(parseBridgeMessage(makeEvent({ type: DRAFT_READ_TYPE, id: 10, docKey: '' }, iframe.contentWindow), iframe)).toBeNull()
    expect(parseBridgeMessage(makeEvent({ type: DRAFT_READ_TYPE, id: 11, docKey: 'x'.repeat(513) }, iframe.contentWindow), iframe)).toBeNull()
    expect(parseBridgeMessage(makeEvent({ type: DRAFT_READ_TYPE, id: 12 }, iframe.contentWindow), iframe)).toBeNull()
  })
})

describe('parseBridgeNotice (anchor layer)', () => {
  const makeEvent = (data: unknown, source: unknown): MessageEvent =>
    ({ data, source }) as unknown as MessageEvent
  const iframe = { contentWindow: {} } as unknown as HTMLIFrameElement

  it('accepts section reports from the owning iframe only, with shape-checked entries', () => {
    const sections = [{ id: 'sec-core', top: 12, height: 300, right: 640, title: '核心概念' }, { id: 'sec-pit', top: 400, height: 80, right: 640, title: null }]
    expect(parseBridgeNotice(makeEvent({ type: ANCHOR_REPORT_TYPE, sections }, iframe.contentWindow), iframe))
      .toEqual({ kind: ANCHOR_REPORT_TYPE, sections })
    expect(parseBridgeNotice(makeEvent({ type: ANCHOR_REPORT_TYPE, sections }, { other: 1 }), iframe)).toBeNull()
  })
  it('rejects malformed reports and unsafe ids', () => {
    for (const bad of [
      { type: ANCHOR_REPORT_TYPE, sections: 'nope' },
      { type: ANCHOR_REPORT_TYPE, sections: [{ id: 'sec-core', top: 'x', height: 1, right: 1 }] },
      { type: ANCHOR_REPORT_TYPE, sections: [{ id: '"><script>', top: 1, height: 1, right: 1 }] },
      { type: ANCHOR_REPORT_TYPE, sections: [{ id: 'sec-core', top: Number.NaN, height: 1, right: 1 }] },
      { type: 'other' },
    ]) {
      expect(parseBridgeNotice(makeEvent(bad, iframe.contentWindow), iframe)).toBeNull()
    }
  })
  it('accepts ll-locate clicks with safe ids only', () => {
    expect(parseBridgeNotice(makeEvent({ type: LOCATE_NOTICE_TYPE, sectionId: 'sec-intro' }, iframe.contentWindow), iframe))
      .toEqual({ kind: LOCATE_NOTICE_TYPE, sectionId: 'sec-intro' })
    expect(parseBridgeNotice(makeEvent({ type: LOCATE_NOTICE_TYPE, sectionId: 'a b' }, iframe.contentWindow), iframe)).toBeNull()
    expect(parseBridgeNotice(makeEvent({ type: LOCATE_NOTICE_TYPE }, iframe.contentWindow), iframe)).toBeNull()
  })
})

describe('anchor layer injection + host commands', () => {
  const LABELS = { excerpt: '摘录到笔记', done: '已加入笔记 ✓', fail: '该文档暂不支持笔记' }

  it('injects the style + script before </body>, embedding the labels safely', () => {
    const html = '<html><head></head><body><p>doc</p></body></html>'
    const out = injectAnchorLayer(html, LABELS)
    expect(out.indexOf('ll-anchor-style')).toBeGreaterThan(out.indexOf('<body>'))
    expect(out.indexOf('ll-anchor-layer')).toBeGreaterThan(out.indexOf('ll-anchor-style'))
    expect(out.indexOf('ll-anchor-layer')).toBeLessThan(out.indexOf('</body>'))
    expect(out).toContain('摘录到笔记')
    // label embedding is escaped against </script> breakout
    expect(injectAnchorLayer('<body></body>', { ...LABELS, excerpt: '</script>x' })).not.toContain('</script>x')
    // fragment documents get the layer appended
    expect(injectAnchorLayer('<p>frag</p>', LABELS)).toContain('ll-anchor-layer')
  })
  it('layer script carries the report channel, the bubble protocol, badges and commands', () => {
    const out = injectAnchorLayer('<body></body>', LABELS)
    // section reports: viz-height pattern (rAF-coalesced child→parent posts)
    expect(out).toContain("type: 'll-anchor-report'")
    expect(out).toMatch(/addEventListener\('scroll'.*true/s)
    expect(out).toContain('requestAnimationFrame')
    // excerpt bubble: request + typed reply handling + selection capture
    expect(out).toContain("type: 'll-excerpt'")
    expect(out).toContain("'ll-excerpt-result'")
    expect(out).toContain('getSelection')
    // section ownership resolves BOTH wrapped callouts (ancestor walk) and
    // h2-sibling sections (nearest preceding marker) — without the fallback,
    // excerpts from main-body text land as document-level anchors and the
    // connection canvas stays empty
    expect(out).toContain('compareDocumentPosition')
    expect(out).toMatch(/m\.contains\(el\)/)
    // badges / jump / highlight command listeners
    expect(out).toContain("d.type === 'll-badges'")
    expect(out).toContain("d.type === 'll-jump'")
    expect(out).toContain("d.type === 'll-highlight'")
    expect(out).toContain('scrollIntoView')
    // styles ride the dsw tokens exclusively (never a raw hex)
    const style = out.slice(out.indexOf('ll-anchor-style'), out.indexOf('</style>'))
    expect(style).toContain('var(--dsw-alias-state-business-primary')
    expect(style).not.toMatch(/#[0-9a-f]{3,6}\b/i)
  })
  it('host command senders post with targetOrigin star', () => {
    const posted: { data: unknown; origin: string }[] = []
    const target = { postMessage: (data: unknown, origin: string) => { posted.push({ data, origin }) } } as unknown as Window
    postSectionJump(target, 'sec-core')
    postSectionBadges(target, { 'sec-core': 2 })
    postSectionHighlight(target, 'sec-intro', true)
    expect(posted).toEqual([
      { data: { type: 'll-jump', sectionId: 'sec-core' }, origin: '*' },
      { data: { type: 'll-badges', counts: { 'sec-core': 2 } }, origin: '*' },
      { data: { type: 'll-highlight', sectionId: 'sec-intro', on: true }, origin: '*' },
    ])
  })
})

describe('parseBridgeNotice (quiz draft traffic)', () => {
  const makeEvent = (data: unknown, source: unknown): MessageEvent =>
    ({ data, source }) as unknown as MessageEvent
  const iframe = { contentWindow: {} } as unknown as HTMLIFrameElement

  it('accepts draft saves with object payloads and sane docKeys', () => {
    const answers = { q1: 'a', q2: ['x', 'y'], q3: 'hello' }
    expect(parseBridgeNotice(makeEvent({ type: DRAFT_SAVE_TYPE, docKey: 'd', answers }, iframe.contentWindow), iframe))
      .toEqual({ kind: DRAFT_SAVE_TYPE, docKey: 'd', answers })
  })
  it('rejects malformed draft traffic: non-object answers, arrays, oversize payloads, bad keys', () => {
    const big: Record<string, string> = {}
    for (let i = 0; i < 20000; i++) big['k' + i] = 'v'
    for (const bad of [
      { type: DRAFT_SAVE_TYPE, docKey: 'd', answers: 'str' },
      { type: DRAFT_SAVE_TYPE, docKey: 'd', answers: [1, 2] },
      { type: DRAFT_SAVE_TYPE, docKey: 'd' },
      { type: DRAFT_SAVE_TYPE, docKey: '', answers: {} },
      { type: DRAFT_SAVE_TYPE, docKey: 'd', answers: big },
      { type: DRAFT_CLEAR_TYPE, docKey: '' },
    ]) {
      expect(parseBridgeNotice(makeEvent(bad, iframe.contentWindow), iframe)).toBeNull()
    }
    expect(parseBridgeNotice(makeEvent({ type: DRAFT_CLEAR_TYPE, docKey: 'd' }, iframe.contentWindow), iframe))
      .toEqual({ kind: DRAFT_CLEAR_TYPE, docKey: 'd' })
  })
})

describe('quiz draft cache (key + store helpers)', () => {
  const memoryStore = (): QuizDraftStore => {
    const map = new Map<string, string>()
    return {
      getItem: key => map.get(key) ?? null,
      setItem: (key, value) => { map.set(key, value) },
      removeItem: key => { map.delete(key) },
    }
  }
  it('quizDraftKey normalizes separators and trailing slashes', () => {
    expect(quizDraftKey('C:\\w\\空间\\', 'C:\\w\\空间\\测验\\q.html'))
      .toBe(quizDraftKey('C:/w/空间', 'C:/w/空间/测验/q.html'))
    expect(quizDraftKey('C:/w', 'C:/w/q.html')).toBe('learning-space:quiz-draft:C:/w:C:/w/q.html')
  })
  it('store helpers round-trip a draft and drop corrupt entries', () => {
    const store = memoryStore()
    const key = quizDraftKey('C:/w', 'C:/w/q.html')
    expect(readQuizDraft(store, key)).toBeNull()
    writeQuizDraft(store, key, { q1: 'a' })
    expect(readQuizDraft(store, key)).toEqual({ q1: 'a' })
    clearQuizDraft(store, key)
    expect(readQuizDraft(store, key)).toBeNull()
    // corrupt JSON: removed on sight, reads as absent
    store.setItem(key, '{nope')
    expect(readQuizDraft(store, key)).toBeNull()
    expect(store.getItem(key)).toBeNull()
    // null store (SSR/tests): all no-ops
    expect(readQuizDraft(null, key)).toBeNull()
    expect(() => { writeQuizDraft(null, key, {}); clearQuizDraft(null, key) }).not.toThrow()
  })
  it('injectQuizDraft embeds the docKey, gates on forms, and wires save/restore/clear', () => {
    const html = '<html><body><form><input name="q1"></form></body></html>'
    const out = injectQuizDraft(html, 'C:/w/测验/q.html')
    expect(out.indexOf('ll-quiz-draft')).toBeGreaterThan(out.indexOf('<body>'))
    expect(out).toContain('"C:/w/测验/q.html"')
    // debounced save on input/change (capture), restore request on load,
    // apply on the typed reply, clear after a successful submit
    expect(out).toContain("type: '" + DRAFT_SAVE_TYPE + "'")
    expect(out).toMatch(/addEventListener\('input'.*true/s)
    expect(out).toContain("type: '" + DRAFT_READ_TYPE + "'")
    expect(out).toContain("'" + DRAFT_READ_TYPE + "-result'")
    expect(out).toContain("type: '" + DRAFT_CLEAR_TYPE + "'")
    expect(out).toContain("'ll-submit-result'")
    // collect() keeps raw control state shapes (radio value, checkbox array)
    expect(out).toMatch(/radio.*checked/s)
    expect(out).toContain('Array.isArray(out[k])')
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
