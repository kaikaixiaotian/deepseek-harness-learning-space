/**
 * DOM-level end-to-end tests for the injected anchor layer: the layer script
 * (extracted verbatim from injectAnchorLayer) executes inside a jsdom
 * document shaped like the read-mode skeleton, with a stub parent window.
 * Covers the report channel, the selection→ll-excerpt pipeline (incl. the
 * h2-sibling section-ownership fallback), badge rendering and the jump
 * command — the flows pure string assertions cannot prove.
 *
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import { injectAnchorLayer } from '../src/client/bridge.ts'

/** The read-mode skeleton, minimally shaped: wrapped callout sections +
 * h2/h3 SIBLING markers (the structure the ownership fallback exists for). */
const CHAPTER_HTML = `<!DOCTYPE html><html><head><title>ch</title></head><body>
<aside class="toc"><p class="toc-title">本章目录</p><nav>
  <a href="#sec-obj">学习目标</a><a href="#sec-core">核心概念</a>
</nav></aside>
<article class="content">
  <h1>title</h1>
  <section id="sec-obj" class="callout objectives"><h2>学习目标</h2><p>obj line</p></section>
  <h2 id="sec-intro"><span class="nh">01</span> 引入</h2>
  <p id="para-intro">intro paragraph text</p>
  <section id="sec-kp" class="callout kp"><h2>知识点清单</h2><p>kp line</p></section>
  <h2 id="sec-core"><span class="nh">02</span> 核心概念</h2>
  <h3>1. 概念（KP-2）</h3>
  <ol class="elements"><li><div class="el-body"><p id="para-core">core paragraph words</p></div></li></ol>
  <h2 id="sec-backfill"><span class="nh">★</span> 补讲</h2>
  <h3 id="backfill-format">格式串</h3>
  <p id="para-backfill">backfill paragraph words</p>
  <h2 id="sec-practice"><span class="nh">04</span> 实战演示</h2>
  <p id="para-practice">practice paragraph words</p>
  <h2 id="sec-pit"><span class="nh">05</span> 常见陷阱</h2>
  <p id="para-pit">pit paragraph words</p>
  <section id="sec-summary" class="callout summary"><h2>小结自查</h2><p>summary line</p></section>
</article>
</body></html>`

interface Posted {
  readonly type: string
  readonly sections?: ReadonlyArray<{ id: string; title: string | null }>
  readonly sectionId?: string
  readonly id?: number
  readonly text?: string
  readonly blockIndex?: number
  readonly index?: number
}

/** Stub seat + the layer script, executed by jsdom's own script runner. */
const HARNESS_HEAD = `<script>
(function () {
  window.__posted = [];
  window.__frames = [];
  window.__flush = function () { var f; while ((f = window.__frames.shift())) f(); };
  window.__scrolled = [];
  Object.defineProperty(window, 'parent', { value: { postMessage: function (d) { window.__posted.push(d); } } });
  window.requestAnimationFrame = function (cb) { window.__frames.push(cb); return window.__frames.length; };
  var rect = { top: 100, bottom: 130, left: 50, right: 400, width: 350, height: 30, x: 50, y: 100 };
  window.Range.prototype.getBoundingClientRect = function () { return rect; };
  window.Element.prototype.getBoundingClientRect = function () { return rect; };
  window.Element.prototype.scrollIntoView = function () { window.__scrolled.push(this.id || this.className || 'el'); };
})();
</script>`

function mountLayer(): { dom: JSDOM; posted: Posted[] } {
  const script = injectAnchorLayer('<body></body>', { excerpt: '摘录到笔记', done: '已加入笔记 ✓', fail: '不支持' })
    .match(/<script id="ll-anchor-layer">([\s\S]*?)<\/script>/)?.[1] ?? ''
  expect(script).not.toBe('')
  const html = CHAPTER_HTML.replace('</body>', HARNESS_HEAD + '<script>' + script + '</script></body>')
  const dom = new JSDOM(html, { runScripts: 'dangerously' })
  const w = dom.window as unknown as { __posted: Posted[]; __flush: () => void; __scrolled: string[] }
  w.__flush()
  return { dom, posted: w.__posted }
}

async function excerptFrom(dom: JSDOM, paragraphId: string): Promise<Posted> {
  const doc = dom.window.document
  const w = dom.window as unknown as { __posted: Posted[]; __flush: () => void }
  const paragraph = doc.getElementById(paragraphId)
  expect(paragraph).not.toBeNull()
  const selection = doc.getSelection()
  const range = doc.createRange()
  range.selectNodeContents(paragraph as HTMLElement)
  selection?.removeAllRanges()
  selection?.addRange(range)
  doc.dispatchEvent(new dom.window.Event('mouseup', { bubbles: true }))
  await new Promise(resolve => { setTimeout(resolve, 30) })
  const bubble = doc.querySelector('.ll-excerpt-bubble') as HTMLButtonElement | null
  expect(bubble).not.toBeNull()
  const before = w.__posted.length
  bubble?.click()
  // ack the request so the layer's one-shot reply listener retires early
  const request = w.__posted.slice(before).find(message => message.type === 'll-excerpt')
  expect(request).toBeDefined()
  dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { type: 'll-excerpt-result', id: request?.id, ok: true } }))
  return request as Posted
}

describe('anchor layer in a real DOM (read-mode skeleton)', () => {
  it('reports the section list (id + title, nh number stripped)', () => {
    const { posted } = mountLayer()
    const report = posted.find(message => message.type === 'll-anchor-report')
    expect(report).toBeDefined()
    expect(report?.sections?.map(section => section.id)).toEqual([
      'sec-obj', 'sec-intro', 'sec-kp', 'sec-core', 'sec-backfill', 'backfill-format', 'sec-practice', 'sec-pit', 'sec-summary',
    ])
    expect(report?.sections?.find(section => section.id === 'sec-core')?.title).toBe('核心概念')
  })

  it('resolves h2-SIBLING content to its section (the connection-canvas fix)', async () => {
    const { dom } = mountLayer()
    // main-body paragraph AFTER the h2#sec-core marker — the case that used
    // to resolve null and left the canvas empty
    expect((await excerptFrom(dom, 'para-core')).sectionId).toBe('sec-core')
    expect((await excerptFrom(dom, 'para-practice')).sectionId).toBe('sec-practice')
    // backfill body belongs to its h3, not the ★ h2
    expect((await excerptFrom(dom, 'para-backfill')).sectionId).toBe('backfill-format')
  })

  it('resolves content between markers to the nearest preceding one', async () => {
    const { dom } = mountLayer()
    expect((await excerptFrom(dom, 'para-intro')).sectionId).toBe('sec-intro')
  })

  it('carries the excerpted block index in the request', async () => {
    const { dom } = mountLayer()
    // content blocks in document order (toc excluded): obj-p, para-intro,
    // kp-p, h3, li, para-core ← index 5, backfill-h3, backfill-p, practice-p…
    const request = await excerptFrom(dom, 'para-core')
    expect(request.blockIndex).toBe(5)
  })

  it('pins line markers to the excerpted blocks and reports locate clicks', () => {
    const { dom, posted } = mountLayer()
    const doc = dom.window.document
    dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
      data: { type: 'll-block-badges', blocks: [{ i: 5, n: 2 }, { i: 8, n: 1 }] },
    }))
    // index 5 = para-core: the marker rides the block itself, first line left
    const marker = doc.getElementById('para-core')?.querySelector('.ll-block-badge')
    expect(marker?.textContent).toContain('2')
    expect(doc.getElementById('para-core')?.classList.contains('ll-block-mark')).toBe(true)
    expect(doc.getElementById('para-practice')?.querySelector('.ll-block-badge')).not.toBeNull()
    // blocks without anchors stay unmarked
    expect(doc.getElementById('para-pit')?.querySelector('.ll-block-badge')).toBeNull()
    // clicking reports the block index for the host to focus the note
    marker?.dispatchEvent(new dom.window.Event('click', { bubbles: true }))
    expect(posted.some(message => message.type === 'll-block-locate' && message.index === 5)).toBe(true)
    // an empty push clears every marker
    dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { type: 'll-block-badges', blocks: [] } }))
    expect(doc.getElementById('para-core')?.querySelector('.ll-block-badge')).toBeNull()
  })

  it('scrolls the target on ll-jump', () => {
    const { dom } = mountLayer()
    dom.window.dispatchEvent(new dom.window.MessageEvent('message', { data: { type: 'll-jump', sectionId: 'sec-pit' } }))
    const w = dom.window as unknown as { __scrolled: string[] }
    expect(w.__scrolled).toContain('sec-pit')
  })
})
