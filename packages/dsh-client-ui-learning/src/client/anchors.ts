/**
 * P1 anchor protocol — pure data helpers for note anchors.
 *
 * Storage model: the note body IS the source of truth. Each anchor is a
 * TipTap `excerpt` node serialized as
 *   <blockquote data-ll-anchor="ax3" data-ll-chapter="stage1-ch01"
 *               data-ll-section="sec-core" data-ll-kp="KP-2" data-ll-title="…"
 *               class="ll-excerpt">…</blockquote>
 * (attrs live on the block, quote = the block's text). On save the pipeline
 * PREPENDS a derived index comment for human readability and fast tool-side
 * parsing (P2 flash-cards / error-note generation):
 *   <!-- ll-anchors:v1 {"v":1,"anchors":[…]} -->
 * Loading strips the comment and goes with the body — the index is never
 * authoritative, so hand-edited or stale headers self-heal on the next save.
 */

/** One section of a study document (id + display title) — the list-level
 * projection of the iframe's section reports, shared by the notes map and
 * the excerpt breadcrumbs. */
export interface SectionInfo {
  readonly id: string
  readonly title: string | null
}

/** One anchor: where a note block points into a study document. */
export interface NoteAnchor {
  readonly id: string
  /** Note key of the target document, e.g. 'stage1-ch01' or 'stage1-ch01-quiz'. */
  readonly chapterKey: string
  /** Section id inside the document ('sec-core', 'backfill-x'), or null for a
   * document-level anchor (quizzes and other docs without the sec-* skeleton). */
  readonly sectionId: string | null
  /** Knowledge-point tag when the source carries one (quiz fieldsets), else null. */
  readonly kp: string | null
  /** Display title of the target document (file base name at excerpt time). */
  readonly docTitle: string
  /** Document path relative to the workspace root at excerpt time (portable). */
  readonly docPath: string | null
  /** Index of the excerpted text block in the source document (paragraph-
   * level anchor target; documents are static so the index stays valid). */
  readonly blockIndex: number | null
  /** Text snapshot of the excerpt block at collect time. */
  readonly quote: string
}

/** Minimal tiptap-doc shape (kept local so tests need no editor imports). */
export interface AnchorDocNode {
  readonly type?: string
  readonly attrs?: Record<string, unknown> | null
  readonly content?: readonly AnchorDocNode[]
  readonly text?: string
}

/** Section ids must stay injection-safe: they travel through data attributes
 * and postMessage payloads on both sides of the iframe bridge. */
export function isSafeSectionId(id: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(id)
}

/** Chapter/note keys are ASCII-safe by construction (noteKeyOf); the same
 * charset keeps hand-edited files from smuggling odd payloads. */
export function isSafeChapterKey(key: string): boolean {
  return /^[A-Za-z0-9_\u4e00-\u9fff-]{1,128}$/.test(key)
}

/** Fresh anchor id: a uuid (no dashes, charset-safe for attributes/JSON). */
export function newAnchorId(): string {
  return 'a' + crypto.randomUUID().replaceAll('-', '')
}

function attrString(attrs: Record<string, unknown> | null | undefined, name: string): string | null {
  const value = attrs?.[name]
  return typeof value === 'string' && value !== '' ? value : null
}

function nodeText(node: AnchorDocNode): string {
  if (typeof node.text === 'string') return node.text
  let out = ''
  for (const child of node.content ?? []) out += (out === '' ? '' : ' ') + nodeText(child)
  return out
}

/** Quote snapshot: text content with collapsed whitespace (display/search use). */
function quoteOf(node: AnchorDocNode): string {
  return nodeText(node).replace(/\s+/g, ' ').trim().slice(0, 2000)
}

function attrNumber(attrs: Record<string, unknown> | null | undefined, name: string): number | null {
  const value = attrs?.[name]
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100000 ? value : null
}

/** Collect every excerpt node of a tiptap doc JSON, in document order. */
export function collectAnchorsFromDoc(doc: AnchorDocNode): NoteAnchor[] {
  const anchors: NoteAnchor[] = []
  const walk = (node: AnchorDocNode): void => {
    if (node.type === 'excerpt') {
      const id = attrString(node.attrs, 'anchorId') ?? newAnchorId()
      const chapterKey = attrString(node.attrs, 'chapterKey')
      if (chapterKey !== null && isSafeChapterKey(chapterKey)) {
        const sectionId = attrString(node.attrs, 'sectionId')
        anchors.push({
          id,
          chapterKey,
          sectionId: sectionId !== null && isSafeSectionId(sectionId) ? sectionId : null,
          kp: attrString(node.attrs, 'kp'),
          docTitle: attrString(node.attrs, 'docTitle') ?? chapterKey,
          docPath: attrString(node.attrs, 'docPath'),
          blockIndex: attrNumber(node.attrs, 'blockIndex'),
          quote: quoteOf(node),
        })
      }
    }
    for (const child of node.content ?? []) walk(child)
  }
  walk(doc)
  return anchors
}

/** Per-section anchor counts for ONE chapter (what the section badges show).
 * Document-level anchors (sectionId null) are not section badges. */
export function anchorCounts(anchors: readonly NoteAnchor[], chapterKey: string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const anchor of anchors) {
    if (anchor.chapterKey !== chapterKey || anchor.sectionId === null) continue
    counts[anchor.sectionId] = (counts[anchor.sectionId] ?? 0) + 1
  }
  return counts
}

/**
 * HTML comments must not contain `--` (the parser may close early on `-->`),
 * and quoted text can. Escape every `--` as the JSON escape `\u002d\u002d` —
 * JSON.parse restores the dashes with no post-processing on the read side.
 */
export function buildAnchorMetaHtml(anchors: readonly NoteAnchor[]): string {
  const json = JSON.stringify({ v: 1, anchors }).replace(/--/g, '\\u002d\\u002d')
  return `<!-- ll-anchors:v1 ${json} -->\n`
}

/** Read-side pairing of {@link buildAnchorMetaHtml}: drop a leading index
 * comment (if any) and return its anchors. Unparseable or absent headers
 * yield null anchors — the body is authoritative either way. */
export function stripAnchorMeta(html: string): { body: string; anchors: NoteAnchor[] | null } {
  const match = html.match(/^(\s|<!--[\s\S]*?-->)*?<!--\s*ll-anchors:v1\s+([\s\S]*?)\s*-->\s*/)
  if (match === null) return { body: html, anchors: null }
  let anchors: NoteAnchor[] | null = null
  try {
    const parsed = JSON.parse(match[2] ?? '') as { anchors?: unknown }
    if (Array.isArray(parsed.anchors)) anchors = parsed.anchors as NoteAnchor[]
  } catch {
    anchors = null
  }
  return { body: html.slice(match[0].length), anchors }
}
