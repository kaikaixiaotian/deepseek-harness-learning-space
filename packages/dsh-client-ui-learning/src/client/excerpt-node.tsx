/**
 * The `excerpt` TipTap node — an anchored quote block, the atom of the P1
 * note↔chapter linking:
 *
 *  - serialized as <blockquote data-ll-anchor="…" data-ll-chapter="…"
 *    data-ll-section="…" data-ll-kp="…" data-ll-title="…" class="ll-excerpt">
 *    with block content, so the user keeps writing notes UNDER the quote;
 *  - the node view adds a non-editable breadcrumb chip (↩ doc · section) that
 *    jumps back into the chapter (host wiring via extension options — the
 *    editor instance is created once per panel, so the options read through
 *    refs that the panel keeps fresh);
 *  - parseHTML matches blockquote[data-ll-anchor] and MUST be registered
 *    AFTER StarterKit so the specific rule wins over the generic blockquote
 *    rule (later extensions take precedence in tiptap).
 *
 * getHTML() serializes through renderHTML (never the node view), so the
 * breadcrumb chip — a view-layer decoration — never leaks into saved files.
 */

import { Node, mergeAttributes, type Editor, type NodeViewProps } from '@tiptap/core'
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import css from './space.module.css'
import { newAnchorId } from './anchors.ts'

export interface ExcerptAttrs {
  readonly anchorId: string | null
  readonly chapterKey: string | null
  readonly sectionId: string | null
  readonly kp: string | null
  readonly docTitle: string | null
  /** Document path relative to the workspace root (portable across moves);
   * lets the breadcrumb reopen the source doc without a key→path search. */
  readonly docPath: string | null
  /** Source-document index of the excerpted text block (paragraph-level
   * connection target; null = fall back to the section heading endpoint). */
  readonly blockIndex: number | null
}

export interface ExcerptCrumbTarget {
  readonly chapterKey: string | null
  readonly sectionId: string | null
  readonly docPath: string | null
}

export interface ExcerptOptions {
  /** Section-title lookup fed from the live iframe reports; null = unknown. */
  readonly sectionTitleOf: (sectionId: string) => string | null
  /** Breadcrumb click: same-chapter sections jump in place, others open the doc. */
  readonly onCrumbClick: (target: ExcerptCrumbTarget) => void
}

/** Attribute plumbing between the tiptap attr (`key`, e.g. 'anchorId') and
 * its DOM form (`name`, e.g. 'data-ll-anchor'). renderHTML receives the attrs
 * keyed by the ATTRIBUTE NAME — reading by the DOM name silently drops the
 * attribute from every saved file. */
function dataAttr(key: string, name: string): { parseHTML: (element: HTMLElement) => string | null; renderHTML: (attrs: Record<string, unknown>) => Record<string, string> } {
  return {
    parseHTML: element => element.getAttribute(name),
    renderHTML: attrs => {
      const value = attrs[key]
      return typeof value === 'string' && value !== '' ? { [name]: value } : {}
    },
  }
}

function ExcerptView(props: NodeViewProps) {
  const attrs = props.node.attrs as unknown as ExcerptAttrs
  const options = props.extension.options as unknown as ExcerptOptions
  const sectionTitle = attrs.sectionId === null ? null : options.sectionTitleOf(attrs.sectionId)
  const crumb = [attrs.docTitle, sectionTitle ?? attrs.sectionId].filter(part => typeof part === 'string' && part !== '').join(' · ')
  return (
    <NodeViewWrapper
      className={'ll-excerpt-wrap ' + css.excerptWrap}
      data-ll-anchor={attrs.anchorId ?? undefined}
      data-ll-chapter={attrs.chapterKey ?? undefined}
      data-ll-section={attrs.sectionId ?? undefined}
      data-ll-block={attrs.blockIndex === null ? undefined : String(attrs.blockIndex)}
    >
      {crumb !== '' && (
        <div className={css.excerptCrumbRow} contentEditable={false}>
          <button
            type='button'
            className={css.excerptCrumb}
            title={attrs.sectionId ?? undefined}
            onClick={() => { options.onCrumbClick({ chapterKey: attrs.chapterKey, sectionId: attrs.sectionId, docPath: attrs.docPath }) }}
          >
            ↩ {crumb}
          </button>
        </div>
      )}
      <NodeViewContent className='ll-excerpt-body' />
    </NodeViewWrapper>
  )
}

export const ExcerptBlock = Node.create<ExcerptOptions>({
  name: 'excerpt',
  group: 'block',
  content: 'block+',
  defining: true,

  addOptions() {
    return {
      sectionTitleOf: () => null,
      onCrumbClick: () => {},
    }
  },

  addAttributes() {
    return {
      anchorId: { default: null, ...dataAttr('anchorId', 'data-ll-anchor') },
      chapterKey: { default: null, ...dataAttr('chapterKey', 'data-ll-chapter') },
      sectionId: { default: null, ...dataAttr('sectionId', 'data-ll-section') },
      kp: { default: null, ...dataAttr('kp', 'data-ll-kp') },
      docTitle: { default: null, ...dataAttr('docTitle', 'data-ll-title') },
      docPath: { default: null, ...dataAttr('docPath', 'data-ll-path') },
      blockIndex: {
        default: null,
        parseHTML: element => {
          const raw = element.getAttribute('data-ll-block')
          return raw !== null && /^\d+$/.test(raw) ? Number(raw) : null
        },
        renderHTML: attrs => {
          const value = attrs.blockIndex
          return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? { 'data-ll-block': String(value) } : {}
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'blockquote[data-ll-anchor]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['blockquote', mergeAttributes(HTMLAttributes, { class: 'll-excerpt' }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ExcerptView)
  },
})

/** Append one excerpt block (quote paragraph + empty jot paragraph) to the
 * end of the note. Returns whether the insert transaction applied. */
export function appendExcerpt(
  editor: Editor,
  anchor: { chapterKey: string; sectionId: string | null; kp: string | null; docTitle: string; docPath: string | null; blockIndex: number | null },
  quote: string,
): boolean {
  const text = quote.replace(/\s+/g, ' ').trim().slice(0, 2000)
  return editor
    .chain()
    .focus('end')
    .insertContentAt(editor.state.doc.content.size, {
      type: 'excerpt',
      attrs: {
        anchorId: newAnchorId(),
        chapterKey: anchor.chapterKey,
        sectionId: anchor.sectionId,
        kp: anchor.kp,
        docTitle: anchor.docTitle,
        docPath: anchor.docPath,
        blockIndex: anchor.blockIndex,
      },
      content: [
        { type: 'paragraph', content: text === '' ? [] : [{ type: 'text', text }] },
        { type: 'paragraph' },
      ],
    })
    .run()
}
