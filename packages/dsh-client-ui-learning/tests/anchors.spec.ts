/**
 * P1 anchor-protocol tests: index-comment serialization round-trip (incl. the
 * `--` comment escape), doc-json collection, per-section counts, and the
 * safety validators. Pure logic — no editor/DOM.
 */

import { describe, expect, it } from 'vitest'
import {
  anchorCounts,
  buildAnchorMetaHtml,
  collectAnchorsFromDoc,
  isSafeChapterKey,
  isSafeSectionId,
  newAnchorId,
  stripAnchorMeta,
  type AnchorDocNode,
  type NoteAnchor,
} from '../src/client/anchors.ts'

const A1: NoteAnchor = {
  id: 'a1',
  chapterKey: 'stage1-ch01',
  sectionId: 'sec-core',
  kp: 'KP-2',
  docTitle: 'stage1-ch01-intro.html',
  docPath: 'chapters/stage1-ch01-intro.html',
  quote: '向量是有方向的量',
}
const A2: NoteAnchor = {
  id: 'a2',
  chapterKey: 'stage1-ch01-quiz',
  sectionId: null,
  kp: 'KP-1',
  docTitle: 'stage1-ch01-quiz.html',
  docPath: 'quizzes/stage1-ch01-quiz.html',
  quote: 'quiz-level anchor',
}

describe('buildAnchorMetaHtml / stripAnchorMeta', () => {
  it('round-trips anchors through the index comment', () => {
    const meta = buildAnchorMetaHtml([A1, A2])
    expect(meta.startsWith('<!-- ll-anchors:v1 ')).toBe(true)
    const stripped = stripAnchorMeta(meta + '<p>body</p>')
    expect(stripped.body).toBe('<p>body</p>')
    expect(stripped.anchors).toEqual([A1, A2])
  })
  it('escapes `--` inside quoted text so the comment cannot close early', () => {
    const dashy: NoteAnchor = { ...A1, quote: 'a--b <!-- looks like --> a tag' }
    const meta = buildAnchorMetaHtml([dashy])
    // the ONLY `-->` is the comment's own terminator — the quote's dashes
    // traveled as \u002d escapes instead of breaking the comment open
    expect(meta.indexOf('-->')).toBe(meta.lastIndexOf('-->'))
    expect(meta).toContain('\\u002d\\u002d')
    const stripped = stripAnchorMeta(meta)
    expect(stripped.anchors?.[0]?.quote).toBe(dashy.quote)
  })
  it('keeps the body untouched when no leading index comment exists (pre-P1 files)', () => {
    const legacy = '<p>old note</p><blockquote>plain quote</blockquote>'
    expect(stripAnchorMeta(legacy)).toEqual({ body: legacy, anchors: null })
  })
  it('tolerates an unparseable index comment — body still wins', () => {
    const broken = '<!-- ll-anchors:v1 {not json} -->\n<p>x</p>'
    const stripped = stripAnchorMeta(broken)
    expect(stripped.body).toBe('<p>x</p>')
    expect(stripped.anchors).toBeNull()
  })
  it('skips unrelated leading comments instead of matching them', () => {
    const doc = '<!-- some other note --><p>body</p>'
    expect(stripAnchorMeta(doc).body).toBe(doc)
  })
})

describe('collectAnchorsFromDoc', () => {
  const doc: AnchorDocNode = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'intro' }] },
      {
        type: 'excerpt',
        attrs: { anchorId: 'ax1', chapterKey: 'stage1-ch01', sectionId: 'sec-core', kp: 'KP-2', docTitle: 't.html', docPath: 'chapters/t.html' },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'quoted ' }, { type: 'text', text: 'words' }] }],
      },
      {
        type: 'excerpt',
        attrs: { anchorKey: 'ignored-attr-name', sectionId: 'nope' }, // missing chapterKey → dropped
        content: [],
      },
      {
        type: 'excerpt',
        attrs: { anchorId: 'ax2', chapterKey: 'baseline', sectionId: 'bad section id!', docTitle: null },
        content: [{ type: 'paragraph' }],
      },
      { type: 'blockquote', content: [{ type: 'paragraph' }] },
    ],
  }

  it('collects excerpt nodes in document order with attr + text extraction', () => {
    const anchors = collectAnchorsFromDoc(doc)
    expect(anchors.map(anchor => anchor.id)).toEqual(['ax1', 'ax2'])
    expect(anchors[0]).toMatchObject({ chapterKey: 'stage1-ch01', sectionId: 'sec-core', kp: 'KP-2', docPath: 'chapters/t.html', quote: 'quoted words' })
  })
  it('drops unsafe section ids down to document-level anchors and falls docTitle back to the key', () => {
    const second = collectAnchorsFromDoc(doc)[1]
    expect(second).toMatchObject({ chapterKey: 'baseline', sectionId: null, docTitle: 'baseline' })
  })
  it('caps long quotes at 2000 chars', () => {
    const long: AnchorDocNode = { type: 'doc', content: [{ type: 'excerpt', attrs: { chapterKey: 'k' }, content: [{ type: 'text', text: 'x'.repeat(5000) }] }] }
    expect(collectAnchorsFromDoc(long)[0]?.quote.length).toBe(2000)
  })
})

describe('anchorCounts', () => {
  it('counts per section for one chapter only, skipping document-level anchors', () => {
    const counts = anchorCounts([A1, A2, { ...A1, id: 'a3', sectionId: 'sec-core' }, { ...A1, id: 'a4', sectionId: 'sec-pit' }], 'stage1-ch01')
    expect(counts).toEqual({ 'sec-core': 2, 'sec-pit': 1 })
  })
  it('returns an empty map when nothing matches', () => {
    expect(anchorCounts([A2], 'stage1-ch01')).toEqual({})
  })
})

describe('safety validators', () => {
  it('accepts skeleton section ids and rejects everything else', () => {
    for (const id of ['sec-core', 'sec-obj', 'backfill-transformer-2', 'A_b']) expect(isSafeSectionId(id)).toBe(true)
    for (const id of ['', 'bad id', 'x/y', 'a'.repeat(65), 'sec-core"><script>']) expect(isSafeSectionId(id)).toBe(false)
  })
  it('accepts ascii + zh chapter keys, rejects path-ish input', () => {
    expect(isSafeChapterKey('stage1-ch01')).toBe(true)
    expect(isSafeChapterKey('错题复盘')).toBe(true)
    expect(isSafeChapterKey('../escape')).toBe(false)
    expect(isSafeChapterKey('')).toBe(false)
  })
  it('mints distinct, charset-safe anchor ids', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newAnchorId()))
    expect(ids.size).toBe(50)
    for (const id of ids) expect(isSafeSectionId(id)).toBe(true)
  })
})
