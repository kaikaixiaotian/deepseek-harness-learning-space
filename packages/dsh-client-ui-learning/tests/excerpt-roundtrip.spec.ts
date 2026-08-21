/**
 * Round-trip regression: the excerpt node must SURVIVE a save→reload cycle.
 * setContent parses the saved HTML through the schema's DOM rules — if
 * StarterKit's generic blockquote rule wins over the excerpt's
 * blockquote[data-ll-anchor] rule (first-match in registration order),
 * reloaded notes degrade to plain quotes and every anchor, marker and
 * breadcrumb is lost (the reported "switch file and back → plain text" bug).
 *
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Blockquote from '@tiptap/extension-blockquote'
import { ExcerptBlock } from '../src/client/excerpt-node.tsx'

const EXCERPT_HTML = '<blockquote data-ll-anchor="a1" data-ll-chapter="stage1-ch01" data-ll-section="sec-core" data-ll-kp="KP-2" data-ll-title="stage1-ch01.html" data-ll-path="chapters/stage1-ch01.html" data-ll-block="5"><p>被摘录的原文</p></blockquote>'

/** The editor the notes panel builds (extension order matters for parsing). */
/** The editor the notes panel builds (extension order matters for parsing). */
const PANEL_EXTENSIONS = [
  StarterKit.configure({ link: false, underline: false, blockquote: false }),
  Link.configure({ openOnClick: false }),
  Underline,
  ExcerptBlock,
  Blockquote,
] as never

describe('excerpt save→reload round-trip', () => {
  it('re-parses the saved excerpt markup back into an excerpt node with attrs', () => {
    const editor = new Editor({
      element: document.createElement('div'),
      extensions: PANEL_EXTENSIONS,
      content: `<p>开头</p>${EXCERPT_HTML}<p>结尾</p>`,
    })
    try {
      const blocks = editor.getJSON().content ?? []
      const excerpt = blocks.find(block => block.type === 'excerpt')
      expect(excerpt).toBeDefined()
      expect(excerpt?.attrs).toMatchObject({
        anchorId: 'a1',
        chapterKey: 'stage1-ch01',
        sectionId: 'sec-core',
        kp: 'KP-2',
        docTitle: 'stage1-ch01.html',
        docPath: 'chapters/stage1-ch01.html',
        blockIndex: 5,
      })
      // and it serializes back with the anchor attributes intact
      expect(editor.getHTML()).toContain('data-ll-anchor="a1"')
      expect(editor.getHTML()).toContain('data-ll-block="5"')
    } finally {
      editor.destroy()
    }
  })

  it('plain quotes still parse as plain blockquotes', () => {
    const editor = new Editor({
      element: document.createElement('div'),
      extensions: PANEL_EXTENSIONS,
      content: '<blockquote><p>普通引用</p></blockquote>',
    })
    try {
      const blocks = editor.getJSON().content ?? []
      expect(blocks[0]?.type).toBe('blockquote')
      expect(blocks.find(block => block.type === 'excerpt')).toBeUndefined()
    } finally {
      editor.destroy()
    }
  })

  it('the toolbar quote command still works (toggleBlockquote is registered)', () => {
    const editor = new Editor({
      element: document.createElement('div'),
      extensions: PANEL_EXTENSIONS,
      content: '<p>文字</p>',
    })
    try {
      expect(editor.commands.toggleBlockquote()).toBe(true)
      expect(editor.getJSON().content?.[0]?.type).toBe('blockquote')
    } finally {
      editor.destroy()
    }
  })
})
