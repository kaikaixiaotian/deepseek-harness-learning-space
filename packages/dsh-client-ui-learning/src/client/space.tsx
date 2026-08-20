/**
 * The full-screen learning space: a root-scoped shell.overlay entry that
 * covers the whole dsh UI with four detached dsh-style cards — the workspace
 * tree, the chapter/quiz viewer (with the iframe theme/file bridges), and the
 * per-chapter rich-text notes with switchable note branches.
 *
 * Visuals live in space.module.css (design/learning-space-redesign.html):
 * token-only colors, one .lsCard recipe, and data-dsh-surface seams so theme
 * plugins (ui-aqua) reskin the space with zero coordination.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import type { GlobalStandardProps, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import css from './space.module.css'
import { fileBaseName, isSafeNoteBranch, noteBranchesOf, noteKeyOf, stemOf, workspaceRelativePath } from './classify.ts'
import { anchorCounts, buildAnchorMetaHtml, collectAnchorsFromDoc, stripAnchorMeta, type NoteAnchor, type SectionInfo } from './anchors.ts'
import { appendExcerpt, ExcerptBlock } from './excerpt-node.tsx'
import { closeLearningSpace, learningSpaceState, subscribeLearningSpace } from './store.ts'
import { getLearningFace, subscribeLearningFace, unwrap, type LearningEntry, type LearningNamespaceFace, type LearningWorkspaceView } from './remote.ts'
import { bridgeReply, clearQuizDraft, compatChapter, compatViz, dirOf, floorThemeSnapshot, inlineRelativeIframes, injectAnchorLayer, injectLinkGuard, injectQuizDraft, injectTheme, LIVE_THEME_ACK_TYPE, parseBridgeMessage, parseBridgeNotice, postBlockWatch, postSectionBadges, postSectionJump, postThemeUpdate, quizDraftKey, readQuizDraft, resolveRelative, snapshotTheme, stripBaseTags, vizDirAlternates, vizPlaceholder, writeQuizDraft, type AnchorReport, type QuizDraftStore, type ThemeSnapshot } from './bridge.ts'
import { ConnectionLayer } from './connections.tsx'
import { NotesMap } from './notes-map.tsx'
import type { NS } from './locales.ts'

export interface LearningSpaceProps extends PropsLocale<typeof NS>, GlobalStandardProps {}

/** Draft cache seat: localStorage in the dsh web app, absent in tests/SSR. */
const DRAFT_STORE: QuizDraftStore | null = (() => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
})()

/** Typography for the notes content element and the TipTap ProseMirror body. */
const NOTES_CONTENT_CSS = `
.ll-notes-content { outline: none; }
.ll-notes-content p { margin: 0.35em 0; }
.ll-notes-content h2 { font-size: 1.25em; margin: 0.6em 0 0.3em; }
.ll-notes-content h3 { font-size: 1.1em; margin: 0.5em 0 0.25em; }
.ll-notes-content ul, .ll-notes-content ol { padding-left: 1.4em; margin: 0.35em 0; }
.ll-notes-content blockquote {
  border-left: 3px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.2));
  padding-left: 0.8em; margin: 0.5em 0; opacity: 0.85;
}
.ll-notes-content pre {
  background: var(--dsw-alias-markdown-code-block, rgba(127,127,127,0.12));
  border-radius: 8px; padding: 0.6em 0.8em; font-size: 12px;
  font-family: var(--ds-font-family-code, ui-monospace, Consolas, monospace); overflow-x: auto;
}
.ll-notes-content code { font-family: var(--ds-font-family-code, ui-monospace, Consolas, monospace); }
.ll-notes-content a { color: var(--dsw-alias-state-business-primary, #416ede); }
.ll-notes-content hr { border: none; border-top: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.2)); margin: 0.8em 0; }
.ll-notes-content img { max-width: 100%; }
`

// - overlay -----------------------------------------------------------------

export function LearningSpaceOverlay(props: LearningSpaceProps) {
  const { t, useSessions } = props
  const learning = useSyncExternalStore(subscribeLearningFace, getLearningFace)
  const space = useSyncExternalStore(subscribeLearningSpace, learningSpaceState)
  const sessionId = useSessions(state => state.current)
  const sid = sessionId === undefined ? undefined : String(sessionId)

  const [workspaces, setWorkspaces] = useState<LearningWorkspaceView[] | null>(null)
  const [connectError, setConnectError] = useState(false)
  const [connectDetail, setConnectDetail] = useState<string | null>(null)
  const [workspace, setWorkspace] = useState<LearningWorkspaceView | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  // Notes card visibility: users who don't take notes collapse it and the
  // viewer takes the freed width.
  const [notesOpen, setNotesOpen] = useState(true)

  useEffect(() => {
    if (!space.open) return
    setConnectError(false)
    setConnectDetail(null)
    setWorkspaces(null)
    setWorkspace(null)
    setSelected(null)
    let cancelled = false
    void (async () => {
      if (learning === null || sid === undefined) {
        if (!cancelled) setConnectError(true)
        return
      }
      try {
        const result = await unwrap(await learning.describe(sid), 'describe')
        if (cancelled) return
        setWorkspaces(result.workspaces)
        const focus = space.focus?.path
        const picked = result.workspaces.length === 0
          ? undefined
          : focus === undefined
            ? result.workspaces[0]
            : result.workspaces.find(w => focus.startsWith(w.root)) ?? result.workspaces[0]
        setWorkspace(picked ?? null)
        if (focus !== undefined && picked !== undefined && focus.startsWith(picked.root)) {
          setSelected(focus)
        }
      } catch (err) {
        // Surface the host-side reason (offline namespace, dead session,
        // unreadable cwd): a bare 'not connected' hides all of them.
        if (!cancelled) {
          setConnectError(true)
          setConnectDetail(err instanceof Error ? err.message : String(err))
        }
      }
    })()
    return () => { cancelled = true }
  }, [space.open, space.focus?.path, learning, sid])

  // While the space is open, mark <html> so the glass-theme adaptation can
  // hide the dsh shell columns and reveal the real plugin environment
  // (ambient / wallpaper / video) behind the now-transparent canvas.
  useEffect(() => {
    if (!space.open) return
    document.documentElement.setAttribute('data-ls-open', '')
    return () => { document.documentElement.removeAttribute('data-ls-open') }
  }, [space.open])

  // - P1 anchor plumbing ------------------------------------------------------
  // The iframe seat + notes scroller are overlay-owned so the connection
  // layer can read both geometries; the panels register their handlers
  // through refs (fresh per render, no re-subscription churn).
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const notesScrollRef = useRef<HTMLDivElement | null>(null)
  const locateRef = useRef<((sectionId: string) => void) | null>(null)
  const excerptHandleRef = useRef<((payload: ExcerptPayload) => boolean) | null>(null)
  const reportRef = useRef<AnchorReport>({ sections: [], blocks: [] })
  const sectionsSigRef = useRef('')
  const [sectionInfos, setSectionInfos] = useState<readonly SectionInfo[]>([])
  const [pendingExcerpt, setPendingExcerpt] = useState<PendingExcerpt | null>(null)
  const openNoteKey = selected === null ? null : noteKeyOf(selected)

  const jumpToSection = (sectionId: string): void => {
    const target = iframeRef.current?.contentWindow
    if (target !== undefined && target !== null) postSectionJump(target, sectionId)
  }

  const handleSections = (report: AnchorReport): void => {
    // Live geometry (sections + watched blocks) feeds the connection layer
    // through the ref (per scroll frame, zero re-renders); React state keeps
    // only id/title and updates when the section LIST changes (document
    // switch), not on every scroll.
    reportRef.current = report
    const sig = JSON.stringify(report.sections.map(section => [section.id, section.title]))
    if (sig !== sectionsSigRef.current) {
      sectionsSigRef.current = sig
      setSectionInfos(report.sections.map(section => ({ id: section.id, title: section.title })))
    }
  }

  const handleLocate = (sectionId: string): void => {
    locateRef.current?.(sectionId)
  }

  const handleExcerpt = (payload: ExcerptPayload): boolean => {
    if (workspace === null || openNoteKey === null) return false
    if (!notesOpen) setNotesOpen(true)
    const anchor = {
      chapterKey: openNoteKey,
      docTitle: fileBaseName(selected ?? openNoteKey),
      docPath: workspaceRelativePath(workspace.root, selected ?? ''),
    }
    if (excerptHandleRef.current?.(payload) === true) return true
    // Editor not ready yet (card just opened / note still loading): queue and
    // ack optimistically — the panel applies it once the content is in place.
    setPendingExcerpt({ ...payload, ...anchor })
    return true  }

  if (!space.open) return null

  return (
    <div className={css.overlay}>
      {learning === null || sid === undefined || connectError ? (
        <div className={css.frame} data-dsh-frame>
          <div className={css.state_card + ' ' + css.ls_card} data-dsh-surface>
            <div className={css.centerState}>
              {connectError ? t('connectFailed') : t('loading')}
              {connectError && connectDetail !== null && <span className={css.centerStateDetail}>{connectDetail}</span>}
            </div>
          </div>
        </div>
      ) : workspace === null ? (
        <div className={css.frame} data-dsh-frame>
          <div className={css.state_card + ' ' + css.ls_card} data-dsh-surface>
            <div className={css.centerState}>{t('noWorkspace')}</div>
          </div>
        </div>
      ) : (
        <div className={css.frame} data-dsh-frame>
          <div className={css.header_card + ' ' + css.ls_card} data-dsh-surface>
            <button type='button' className={css.button + ' ' + css.buttonGhost} onClick={closeLearningSpace}>‹ {t('back')}</button>
            <span className={css.divider} />
            <span className={css.title}>{t('title')}</span>
            {workspaces !== null && workspaces.length > 1 && (
              <select
                className={css.workspaceSelect}
                value={workspace?.root ?? ''}
                onChange={event => {
                  const picked = workspaces.find(w => w.root === event.target.value) ?? null
                  setWorkspace(picked)
                  setSelected(null)
                }}
              >
                {workspaces.map(w => <option key={w.root} value={w.root}>{w.title}</option>)}
              </select>
            )}
            <span className={css.spacer} />
            <button
              type='button'
              title={t('notes')}
              className={css.pill + ' ' + css.pillInteractive + (notesOpen ? ' ' + css.pillActive : '')}
              onClick={() => { setNotesOpen(open => !open) }}
            >
              📖 {t('notes')}
            </button>
          </div>
          {/* relative so the connection layer's SVG can span viewer + notes */}
          <div className={css.body_row}>
            <TreePanel key={workspace.root} workspace={workspace} learning={learning} sid={sid} selected={selected} onSelect={setSelected} t={t} />
            <Viewer
              workspace={workspace}
              learning={learning}
              sid={sid}
              selected={selected}
              onSelect={setSelected}
              iframeRef={iframeRef}
              onExcerpt={handleExcerpt}
              onSections={handleSections}
              onLocate={handleLocate}
              t={t}
            />
            {notesOpen && (
              <NotesPanel
                workspace={workspace}
                learning={learning}
                sid={sid}
                selected={selected}
                onSelect={setSelected}
                sections={sectionInfos}
                jumpToSection={jumpToSection}
                iframeRef={iframeRef}
                notesScrollRef={notesScrollRef}
                locateRef={locateRef}
                excerptHandleRef={excerptHandleRef}
                pendingExcerpt={pendingExcerpt}
                onConsumePendingExcerpt={() => { setPendingExcerpt(null) }}
                t={t}
              />
            )}
            <ConnectionLayer
              iframeRef={iframeRef}
              reportRef={reportRef}
              notesScrollRef={notesScrollRef}
              chapterKey={openNoteKey}
              active={notesOpen}
              onJump={jumpToSection}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// - left: workspace tree card ----------------------------------------------

interface TreePanelProps {
  readonly workspace: LearningWorkspaceView
  readonly learning: LearningNamespaceFace
  readonly sid: string
  readonly selected: string | null
  readonly onSelect: (path: string) => void
  readonly t: LearningSpaceProps['t']
}

function TreePanel(props: TreePanelProps) {
  const { workspace, learning, sid, selected, onSelect, t } = props
  // Unified storage: the baseline assessment lives in the quizzes dir, so
  // the tree shows plan / chapters / quizzes (plus the workspace title).
  const roots = [
    { label: t('treePlan'), path: workspace.root + '/' + workspace.dirs.plan },
    { label: t('treeChapters'), path: workspace.root + '/' + workspace.dirs.chapters },
    { label: t('treeQuizzes'), path: workspace.root + '/' + workspace.dirs.quizzes },
  ]
  return (
    <div className={css.tree_card + ' ' + css.ls_card} data-dsh-surface>
      <div className={css.treeCaption}>{workspace.title}</div>
      {roots.map(root => (
        <TreeBranch
          key={root.path}
          label={root.label}
          path={root.path}
          workspace={workspace}
          learning={learning}
          sid={sid}
          selected={selected}
          onSelect={onSelect}
          t={t}
        />
      ))}
    </div>
  )
}

interface TreeBranchProps extends TreePanelProps {
  readonly label: string
  readonly path: string
}

function TreeBranch(props: TreeBranchProps) {
  const { label, path, workspace, learning, sid, selected, onSelect, t } = props
  const [expanded, setExpanded] = useState(false)
  const [entries, setEntries] = useState<LearningEntry[] | null>(null)
  const [error, setError] = useState(false)

  const toggle = (): void => {
    const next = !expanded
    setExpanded(next)
    if (next && entries === null && !error) {
      void (async () => {
        try {
          const result = await unwrap(await learning.listDir(sid, workspace.root, path), 'listDir')
          setEntries(result.entries)
        } catch {
          setError(true)
        }
      })()
    }
  }

  return (
    <div>
      <button type='button' className={css.treeNode} data-open={expanded ? '' : undefined} title={path} onClick={toggle}>
        <svg className={css.chev} viewBox='0 0 12 12' fill='none' stroke='currentColor' strokeWidth='1.6' strokeLinecap='round' strokeLinejoin='round'><path d='M4 2l5 4-5 4' /></svg>
        <span className={css.treeName}>{label}</span>
        <span className={css.treeCount}>{entries === null ? '' : String(entries.length)}</span>
      </button>
      {/* the wrapper carries the per-level indent: nested dirs compound it,
          so sub-directories (e.g. 章节/演示) read as deeper levels instead of
          sitting flat beside their siblings */}
      {expanded && (
        <div className={css.treeChildren}>
          {error && <div className={css.hint}>{t('viewerFailed')}</div>}
          {entries === null && !error && <div className={css.hint}>{t('loading')}</div>}
          {entries !== null && entries.length === 0 && <div className={css.hint}>{t('treeEmpty')}</div>}
          {entries !== null && entries.map(entry => entry.kind === 'dir'
            ? (
              <TreeBranch
                key={entry.path}
                label={entry.name}
                path={entry.path}
                workspace={workspace}
                learning={learning}
                sid={sid}
                selected={selected}
                onSelect={onSelect}
                t={t}
              />
            )
            : (
              <button
                key={entry.path}
                type='button'
                className={css.treeNode + ' ' + css.treeFile + (selected === entry.path ? ' ' + css.treeFileSelected : '')}
                title={entry.path}
                onClick={() => { onSelect(entry.path) }}
              >
                <span className={css.treeName}>{entry.name}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

// - middle: chapter/quiz viewer card ----------------------------------------

/** Excerpt request routed from the iframe bubble to the notes panel. */
export interface ExcerptPayload {
  readonly text: string
  readonly sectionId: string | null
  readonly kp: string | null
  /** Source-document index of the excerpted text block (line-level link). */
  readonly blockIndex: number | null
}

/** A queued excerpt (notes card was closed / note still loading): applied
 * once the editor holds the target note's content. */
export interface PendingExcerpt extends ExcerptPayload {
  readonly chapterKey: string
  readonly docTitle: string
  readonly docPath: string | null
}

interface ViewerProps {
  readonly workspace: LearningWorkspaceView
  readonly learning: LearningNamespaceFace
  readonly sid: string
  readonly selected: string | null
  readonly onSelect: (path: string) => void
  /** The iframe seat, owned by the overlay (the connection layer needs it). */
  readonly iframeRef: React.MutableRefObject<HTMLIFrameElement | null>
  /** Apply an excerpt request; false = no note target for the open document. */
  readonly onExcerpt: (payload: ExcerptPayload) => boolean
  /** Section reports from the anchor layer (id/title state + live geometry). */
  readonly onSections: (report: AnchorReport) => void
  /** Badge click inside the iframe: focus the matching note block. */
  readonly onLocate: (sectionId: string) => void
  readonly t: LearningSpaceProps['t']
}

function Viewer(props: ViewerProps) {
  const { workspace, learning, sid, selected, onSelect, t } = props
  const [content, setContent] = useState<{ text: string; truncated: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [docHtml, setDocHtml] = useState<string | null>(null)
  const [docTheme, setDocTheme] = useState<ThemeSnapshot | null>(null)
  const [rebuildTick, setRebuildTick] = useState(0)
  const [submitNotice, setSubmitNotice] = useState<string | null>(null)
  const [themeTick, setThemeTick] = useState(0)
  const iframeRef = props.iframeRef
  const objectUrlsRef = useRef<string[]>([])
  const themeNonceRef = useRef(0)
  const themeAckRef = useRef<((nonce: number) => void) | null>(null)
  const lastDocHtmlRef = useRef<string | null>(null)
  const lastPushRef = useRef<ThemeSnapshot | null>(null)

  // Re-enrich the srcDoc whenever the host theme changes. Two signals:
  //  - the marker attributes (data-ds-dark-theme on body, data-dsh-aqua on
  //    <html>) flip first, but the theme services re-resolve their tokens
  //    asynchronously AFTER that — a snapshot taken on the attribute flip
  //    still reads the previous palette;
  //  - the resolved tokens are then written onto body's INLINE STYLE (the
  //    theme runtime's token carrier), so watching that attribute is the
  //    exact "tokens are new" signal: by the time it mutates, a snapshot
  //    reads the fresh palette. The bump rides one animation frame to
  //    coalesce bursts of mutations.
  useEffect(() => {
    let frame = 0
    const bump = (): void => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setThemeTick(value => value + 1))
    }
    const markers = new MutationObserver(bump)
    const tokens = new MutationObserver(bump)
    markers.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
    markers.observe(document.documentElement, { attributes: true, attributeFilter: ['data-dsh-aqua'] })
    tokens.observe(document.body, { attributes: true, attributeFilter: ['style'] })
    // Glass-skin knobs (e.g. --dsh-aqua-blur / --dsh-aqua-frost) are written
    // onto <html>'s inline style, not body's — watch that carrier too so
    // slider drags re-snapshot the iframe palette.
    tokens.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
    return () => { cancelAnimationFrame(frame); markers.disconnect(); tokens.disconnect() }
  }, [])

  useEffect(() => {
    setContent(null)
    setError(null)
    setSubmitNotice(null)
    if (selected === null) return
    let cancelled = false
    void (async () => {
      try {
        const result = await unwrap(await learning.readFile(sid, workspace.root, selected), 'readFile')
        if (!cancelled) setContent({ text: result.content, truncated: result.truncated })
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'load failed')
      }
    })()
    return () => { cancelled = true }
  }, [selected, workspace, learning, sid])

  // Enrich html documents before rendering: inline relative child iframes
  // (viz demos cannot resolve about:srcdoc-relative paths) and inject a
  // snapshot of the host page's theme tokens. Re-runs when the file changes
  // or when the legacy fallback bumps rebuildTick (documents generated
  // before the live theme listener existed re-theme via a rebuild).
  useEffect(() => {
    let cancelled = false
    const isHtml = selected !== null && /\.html?$/i.test(selected)
    if (content === null || !isHtml) {
      setDocHtml(null)
      setDocTheme(null)
      return
    }
    void (async () => {
      const baseDir = dirOf(selected ?? '')
      // Snapshot BEFORE the (async) viz reads: the theme rides into the
      // inlined demo blobs too, so chapter docs open with pre-themed demos
      // instead of white standalone-fallback boxes. A snapshot racing a theme
      // flip can come back EMPTY (tokens mid-rewrite) — retry briefly, then
      // floor unresolved tokens from the dsh static palette so the baked
      // document is never unthemed (white canvas on a dark host).
      let raw = snapshotTheme()
      for (let attempt = 0; attempt < 2 && raw.css === ''; attempt++) {
        await new Promise(resolve => { setTimeout(resolve, 120) })
        if (cancelled) return
        raw = snapshotTheme()
      }
      const theme = floorThemeSnapshot(raw)
      // One-line theme trace: paste back from the browser console when a
      // document renders with the wrong palette (filter: "[learning-space]").
      console.info(
        '[learning-space] doc theme:', theme.dark ? 'dark' : 'light', theme.glass ? 'glass' : 'solid',
        'captured=' + (raw.css === '' ? '0' : String(raw.css.split(';').length - 1)),
        'bg=' + (/--dsw-alias-bg-base:([^;]+)/.exec(theme.css)?.[1] ?? 'none'),
      )
      let html = content.text
      let objectUrls: string[] = []
      try {
        const inlined = await inlineRelativeIframes(content.text, async rel => {
          // Viz dir names are locale-mapped (en viz / zh 演示) and generated
          // chapters sometimes reference the other locale's path — try every
          // alternate before giving up on a demo.
          for (const candidate of vizDirAlternates(rel)) {
            const abs = resolveRelative(baseDir, candidate)
            try {
              const result = await unwrap(await learning.readFile(sid, workspace.root, abs), 'readFile')
              return result.content
            } catch {
              // try the next alternate
            }
          }
          // Unreadable demo: a themed placeholder blob, NEVER the original
          // relative src — under srcDoc it resolves against the app origin
          // and paints the dsh SPA inside the chapter.
          return vizPlaceholder(rel)
        }, undefined, vizHtml => injectTheme(compatViz(vizHtml), theme))
        html = injectTheme(inlined.html, theme)
        objectUrls = inlined.objectUrls
      } catch {
        // Viz inlining is an enhancement, never a blocker: fall back to the
        // theme-injected raw document (dark canvas, demos keep their fallback
        // link) rather than rendering an unthemed page or an eternal spinner.
        html = injectTheme(content.text, theme)
      }
      // A <base> tag would redirect even #sec-x TOC links to its origin —
      // strip it before anything else touches the document.
      html = stripBaseTags(html)
      html = injectLinkGuard(compatChapter(html))
      // P1 anchor layer: selection bubble, section reports, badges. Injected
      // last so it rides on top of the link guard's navigation rules.
      html = injectAnchorLayer(html, { excerpt: t('excerptToNotes'), done: t('excerptDone'), fail: t('excerptFail') })
      // Quiz draft layer: raw form state streams into the host cache, so a
      // return to dsh (or any srcDoc rebuild) never wipes in-progress answers.
      html = injectQuizDraft(html, selected)
      if (cancelled) {
        for (const url of objectUrls) URL.revokeObjectURL(url)
        return
      }
      for (const url of objectUrlsRef.current) URL.revokeObjectURL(url)
      objectUrlsRef.current = objectUrls
      setDocHtml(html)
      setDocTheme(theme)
    })()
    return () => { cancelled = true }
  }, [content, selected, rebuildTick, learning, sid, workspace])

  // Live theme channel, receive side: templates ack every push by echoing
  // the nonce, which clears the legacy-fallback timer for that push.
  useEffect(() => {
    const handler = (event: MessageEvent): void => {
      const iframe = iframeRef.current
      if (iframe === null || event.source !== iframe.contentWindow) return
      const data = event.data as { type?: unknown; nonce?: unknown } | null
      if (data !== null && data.type === LIVE_THEME_ACK_TYPE && typeof data.nonce === 'number') {
        themeAckRef.current?.(data.nonce)
      }
    }
    window.addEventListener('message', handler)
    return () => { window.removeEventListener('message', handler) }
  }, [])

  // Live theme channel, send side: push the fresh palette into the open
  // document so it re-skins in place — a srcDoc rebuild would reload it and
  // wipe in-progress quiz answers. Every document gets ONE unconditional
  // push when it appears (the iframe's onLoad bumps themeTick, so the push
  // lands after the template listener registered): even if the baked
  // snapshot raced a theme flip, the load-time push re-syncs the palette.
  // Later pushes fire only when the host theme actually changes (the
  // lastPush guard also stops the legacy fallback from looping). Documents
  // without the listener never ack; after a short timeout fall back to one
  // rebuild, which is the pre-listener behavior.
  useEffect(() => {
    if (docHtml === null || docTheme === null) return
    if (docHtml !== lastDocHtmlRef.current) {
      lastDocHtmlRef.current = docHtml
      lastPushRef.current = null
    }
    const theme = floorThemeSnapshot(snapshotTheme())
    if (lastPushRef.current !== null
      && lastPushRef.current.css === theme.css
      && lastPushRef.current.dark === theme.dark
      && lastPushRef.current.glass === theme.glass) return
    const window_ = iframeRef.current?.contentWindow
    if (window_ === undefined || window_ === null) return
    const nonce = ++themeNonceRef.current
    postThemeUpdate(window_, theme, nonce)
    lastPushRef.current = theme
    const timer = window.setTimeout(() => {
      if (themeNonceRef.current === nonce) setRebuildTick(value => value + 1)
    }, 400)
    themeAckRef.current = received => {
      if (received === nonce) window.clearTimeout(timer)
    }
    return () => { window.clearTimeout(timer) }
  }, [themeTick, docHtml, docTheme])

  useEffect(() => () => {
    for (const url of objectUrlsRef.current) URL.revokeObjectURL(url)
  }, [])

  // Latest-callback refs: the message handler effect below must not
  // re-subscribe on every render, but its closures still need to reach the
  // overlay's freshest excerpt/section/locate wiring.
  const onExcerptRef = useRef(props.onExcerpt)
  onExcerptRef.current = props.onExcerpt
  const onSectionsRef = useRef(props.onSections)
  onSectionsRef.current = props.onSections
  const onLocateRef = useRef(props.onLocate)
  onLocateRef.current = props.onLocate

  // The message bridge: quiz forms inside the iframe read sibling answer
  // files and submit answers through here (srcDoc has no fetchable base);
  // the anchor layer streams section reports and excerpt requests through
  // the same channel (notices are fire-and-forget, requests get a reply).
  useEffect(() => {
    const handler = (event: MessageEvent): void => {
      const notice = parseBridgeNotice(event, iframeRef.current)
      if (notice !== null) {
        if (notice.kind === 'll-anchor-report') {
          onSectionsRef.current(notice.report)
        } else if (notice.kind === 'll-locate') {
          onLocateRef.current(notice.sectionId)
        } else if (notice.kind === 'll-draft-save') {
          // Cache the raw quiz form state; docKey guards against a stale
          // layer racing a chapter switch (save landing on the new doc).
          if (notice.docKey === selected) writeQuizDraft(DRAFT_STORE, quizDraftKey(workspace.root, selected), notice.answers)
        } else if (notice.docKey === selected) {
          clearQuizDraft(DRAFT_STORE, quizDraftKey(workspace.root, selected))
        }
        return
      }
      const request = parseBridgeMessage(event, iframeRef.current)
      if (request === null) return
      const window_ = iframeRef.current?.contentWindow
      if (window_ === undefined || window_ === null) return
      void (async () => {
        if (request.kind === 'll-read') {
          // Workspace gate for the iframe-supplied path, inline so every rule
          // is visible at the use site: no scheme prefix, no parent-directory
          // segments, and the resolved target must stay inside the workspace
          // root (the host's contain() check backs this up server-side).
          if (/^[a-z][a-z0-9+.-]*:/i.test(request.path) || request.path.split(/[/\\]/).includes('..')) {
            window_.postMessage(bridgeReply(request, { ok: false, error: 'rejected path' }), '*')
            return
          }
          const root = workspace.root.replace(/\\/g, '/').replace(/\/+$/, '')
          const abs = resolveRelative(dirOf(selected ?? ''), request.path)
          if (!abs.startsWith(root + '/')) {
            window_.postMessage(bridgeReply(request, { ok: false, error: 'outside the learning workspace' }), '*')
            return
          }
          try {
            const result = await unwrap(await learning.readFile(sid, workspace.root, abs), 'readFile')
            window_.postMessage(bridgeReply(request, { ok: true, content: result.content }), '*')
          } catch (err) {
            window_.postMessage(bridgeReply(request, { ok: false, error: err instanceof Error ? err.message : String(err) }), '*')
          }
          return
        }
        if (request.kind === 'll-open') {
          // In-document link navigation, routed by the injected link guard
          // (external http links never reach here — the guard opens them in
          // a browser tab itself). Same inline workspace gate as ll-read.
          const clean = (request.href.split('#')[0] ?? '').split('?')[0] ?? ''
          if (clean === '' || /^[a-z][a-z0-9+.-]*:/i.test(clean) || clean.split(/[/\\]/).includes('..')) {
            window_.postMessage(bridgeReply(request, { ok: false, error: 'rejected path' }), '*')
            return
          }
          const openRoot = workspace.root.replace(/\\/g, '/').replace(/\/+$/, '')
          const target = resolveRelative(dirOf(selected ?? ''), clean)
          if (!target.startsWith(openRoot + '/')) {
            window_.postMessage(bridgeReply(request, { ok: false, error: 'outside the learning workspace' }), '*')
            return
          }
          try {
            await unwrap(await learning.readFile(sid, workspace.root, target), 'readFile')
            onSelect(target)
            window_.postMessage(bridgeReply(request, { ok: true, path: target }), '*')
          } catch (err) {
            window_.postMessage(bridgeReply(request, { ok: false, error: err instanceof Error ? err.message : String(err) }), '*')
          }
          return
        }
        if (request.kind === 'll-excerpt') {
          // Selection→note request from the anchor layer's bubble. The
          // overlay decides targetability (no note for this doc → false) and
          // may queue the insert until the note finishes loading; the reply
          // drives the bubble's ok/fail feedback.
          const ok = onExcerptRef.current({ text: request.text, sectionId: request.sectionId, kp: request.kp, blockIndex: request.blockIndex })
          window_.postMessage(bridgeReply(request, ok ? { ok: true } : { ok: false, error: 'no note target' }), '*')
          return
        }
        if (request.kind === 'll-draft-read') {
          // Draft restore on quiz load. Submitted answers are the commit
          // point: when the answers json exists the draft is void (and
          // dropped); otherwise the cached raw form state goes back in.
          if (request.docKey !== selected) {
            window_.postMessage(bridgeReply(request, { ok: false, error: 'stale document' }), '*')
            return
          }
          const draftKey = quizDraftKey(workspace.root, selected)
          const stem = stemOf(selected)
          const baseDir = dirOf(selected)
          let submitted = false
          for (const suffix of ['-answers.json', '-答案.json']) {
            try {
              await unwrap(await learning.readFile(sid, workspace.root, resolveRelative(baseDir, stem + suffix)), 'readFile')
              submitted = true
              break
            } catch {
              // try the other locale suffix
            }
          }
          if (submitted) {
            clearQuizDraft(DRAFT_STORE, draftKey)
            window_.postMessage(bridgeReply(request, { ok: false, error: 'already submitted' }), '*')
            return
          }
          const draft = readQuizDraft(DRAFT_STORE, draftKey)
          window_.postMessage(bridgeReply(request, draft === null ? { ok: false, error: 'no draft' } : { ok: true, content: JSON.stringify(draft) }), '*')
          return
        }
        try {
          const result = await unwrap(
            await learning.saveQuizAnswers(sid, workspace.root, selected ?? '', JSON.stringify(request.answers, null, 2)),
            'saveQuizAnswers',
          )
          setSubmitNotice(result.answersPath)
          // The real answers json now exists — the draft cache is obsolete.
          if (selected !== null) clearQuizDraft(DRAFT_STORE, quizDraftKey(workspace.root, selected))
          window_.postMessage(bridgeReply(request, { ok: true, path: result.answersPath }), '*')
        } catch (err) {
          window_.postMessage(bridgeReply(request, { ok: false, error: err instanceof Error ? err.message : String(err) }), '*')
        }
      })()
    }
    window.addEventListener('message', handler)
    return () => { window.removeEventListener('message', handler) }
  }, [selected, workspace, learning, sid])

  const isHtml = selected !== null && /\.html?$/i.test(selected)
  return (
    <main className={css.viewer_card + ' ' + css.ls_card} data-dsh-surface data-phase={isHtml ? 'quiz' : 'reading'}>
      {selected === null ? (
        <div className={css.centerState}>{t('viewerPick')}</div>
      ) : (
        <>
          <div className={css.fileHead}>
            <span className={css.fileHeadName} title={selected}>{fileBaseName(selected)}</span>
            {content?.truncated === true && <span className={css.pill + ' ' + css.pillWarn}>{t('viewerTruncated')}</span>}
          </div>
          {error !== null
            ? <div className={css.centerState}>{t('viewerFailed')}<span className={css.centerStateDetail}>{error}</span></div>
            : content === null
              ? <div className={css.centerState}>{t('loading')}</div>
              : isHtml
                ? (
                  docHtml === null
                    // Enrichment (viz inlining + theme injection) is in
                    // flight: render a placeholder, never the RAW file — the
                    // raw document has no ll-* classes, so on a light-OS host
                    // its fallback palette paints a white canvas over the
                    // dark space until the themed srcDoc swaps in.
                    ? <div className={css.centerState}>{t('loading')}</div>
                    : (
                      <iframe
                        ref={iframeRef}
                        className={css.viewerIframe}
                        srcDoc={docHtml}
                        title={selected}
                        // load = the template's ll-theme listener is live:
                        // bump so the send side pushes the current palette
                        // once (heals any snapshot that raced a theme flip)
                        onLoad={() => { setThemeTick(value => value + 1) }}
                      />
                    )
                )
                : <pre className={css.viewerPre}>{content.text}</pre>}
          {submitNotice !== null && <div className={css.submitOk}>{t('quizSubmitted')}: {fileBaseName(submitNotice)}</div>}
        </>
      )}
    </main>
  )
}

// - right: notes card with branch rail ---------------------------------------

const KEY_SEP = '\u0000'

interface NotesPanelProps {
  readonly workspace: LearningWorkspaceView
  readonly learning: LearningNamespaceFace
  readonly sid: string
  readonly selected: string | null
  readonly onSelect: (path: string) => void
  /** Live section list of the OPEN document (empty before the first report). */
  readonly sections: readonly SectionInfo[]
  /** Jump into the open document's section (scrolls the middle iframe). */
  readonly jumpToSection: (sectionId: string) => void
  /** The iframe seat (badge pushes) and the notes scroller (locate scrolls). */
  readonly iframeRef: React.MutableRefObject<HTMLIFrameElement | null>
  readonly notesScrollRef: React.MutableRefObject<HTMLDivElement | null>
  /** Host→panel handler seats, assigned by this panel on every render. */
  readonly locateRef: React.MutableRefObject<((sectionId: string) => void) | null>
  readonly excerptHandleRef: React.MutableRefObject<((payload: ExcerptPayload) => boolean) | null>
  /** A queued excerpt, applied once the target note content is in place. */
  readonly pendingExcerpt: PendingExcerpt | null
  readonly onConsumePendingExcerpt: () => void
  readonly t: LearningSpaceProps['t']
}

function NotesPanel(props: NotesPanelProps) {
  const { workspace, learning, sid, selected, t } = props
  const noteKey = selected === null ? null : noteKeyOf(selected)
  const [branch, setBranch] = useState('')
  const [branches, setBranches] = useState<string[]>([''])
  const [newBranch, setNewBranch] = useState('')
  const [creating, setCreating] = useState(false)
  const [branchError, setBranchError] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  // The note whose content is actually IN the editor (inserts wait for this);
  // anchors of that content (map view + badge pushes); edit/map view mode.
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [anchors, setAnchors] = useState<readonly NoteAnchor[]>([])
  const [viewMode, setViewMode] = useState<'edit' | 'map'>('edit')
  /** Host-side reason behind the last 保存失败 (tooltip on the status). */
  const [saveError, setSaveError] = useState<string | null>(null)

  const pendingRef = useRef<{ key: string; value: string } | null>(null)
  const timerRef = useRef<number | null>(null)
  const activeKeyRef = useRef<string | null>(null)

  // One editor instance for the panel's lifetime; content is swapped when
  // the chapter or branch changes. The update callback goes through a ref
  // so the debounced save always sees the current chapter/branch.
  const onUpdateRef = useRef<() => void>(() => {})
  // Live wiring for the excerpt node view: the editor (and its configured
  // extension options) is created once, so they read through refs the panel
  // keeps fresh on every render (section titles from the iframe reports;
  // breadcrumb jumps resolved against the CURRENT chapter).
  const sectionsRef = useRef<readonly SectionInfo[]>(props.sections)
  sectionsRef.current = props.sections
  const noteKeyRef = useRef<string | null>(noteKey)
  noteKeyRef.current = noteKey
  const onSelectRef = useRef(props.onSelect)
  onSelectRef.current = props.onSelect
  const jumpToSectionRef = useRef(props.jumpToSection)
  jumpToSectionRef.current = props.jumpToSection
  const editor = useEditor({
    extensions: [
      // tiptap 3 StarterKit already bundles link and underline; disable the
      // built-ins so our configured copies don't register duplicate names.
      StarterKit.configure({ link: false, underline: false }),
      Link.configure({ openOnClick: false }),
      Underline,
      // Anchored excerpt blocks — registered LAST so their specific
      // parse rule (blockquote[data-ll-anchor]) wins over StarterKit's
      // generic blockquote rule (later extensions take precedence).
      ExcerptBlock.configure({
        sectionTitleOf: sectionId => sectionsRef.current.find(section => section.id === sectionId)?.title ?? null,
        onCrumbClick: target => {
          // Same document: scroll its section into view. Otherwise reopen the
          // source document from its stored workspace-relative path.
          if (target.chapterKey !== null && target.chapterKey === noteKeyRef.current && target.sectionId !== null) {
            jumpToSectionRef.current(target.sectionId)
            return
          }
          if (typeof target.docPath === 'string' && target.docPath !== '') {
            onSelectRef.current(workspace.root + '/' + target.docPath)
          }
        },
      }),
    ],
    content: '',
    editorProps: { attributes: { class: 'll-notes-content', style: 'min-height:100%;outline:none;' } },
    onUpdate: () => { onUpdateRef.current() },
  }, [])

  const saveRef = useRef<(key: string, value: string, retry?: boolean) => void>(() => {})
  // Line-level anchors need the iframe to report the exact blocks they point
  // at; the watch set is pushed whenever the current chapter's anchor set
  // changes (sig-guarded: typing without anchor churn sends nothing).
  const lastWatchSigRef = useRef('')
  const pushBlockWatch = (collected: readonly NoteAnchor[]): void => {
    const target = props.iframeRef.current?.contentWindow
    if (target === undefined || target === null) return
    const indexes = [...new Set(collected
      .filter(anchor => anchor.chapterKey === noteKey && anchor.blockIndex !== null)
      .map(anchor => anchor.blockIndex as number))].sort((a, b) => a - b)
    const sig = (noteKey ?? '') + ':' + JSON.stringify(indexes)
    if (sig === lastWatchSigRef.current) return
    lastWatchSigRef.current = sig
    postBlockWatch(target, indexes)
  }
  saveRef.current = (key: string, value: string, retry = false): void => {
    if (learning === null) { setStatus('error'); return }
    const [keyNote, keyBranch] = key.split(KEY_SEP)
    void (async () => {
      try {
        await unwrap(await learning.writeNote(sid, workspace.root, keyNote, value, keyBranch), 'writeNote')
        setSaveError(null)
        if (activeKeyRef.current === key) setStatus('saved')
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setSaveError(message)
        console.error('[learning-space] writeNote failed:', message)
        if (activeKeyRef.current === key) setStatus('error')
        // Note writes are tmp+rename; on Windows the rename fails WHILE
        // another process holds the target (editor / sync / AV scanning the
        // .tmp). One automatic retry shortly, and if it still fails keep the
        // edit queued in pendingRef — the next edit, chapter-switch or
        // unmount flush retries it, so nothing is dropped silently.
        if (!retry) {
          window.setTimeout(() => {
            if (activeKeyRef.current === key) saveRef.current(key, value, true)
          }, 1200)
        } else if (activeKeyRef.current === key) {
          pendingRef.current = { key, value }
        }
      }
    })()
  }

  onUpdateRef.current = (): void => {
    if (editor === null || activeKeyRef.current === null) return
    // The saved file = derived anchor index comment + body. Files without
    // anchors stay byte-identical to the pre-P1 format (no comment added).
    const collected = collectAnchorsFromDoc(editor.getJSON())
    const body = editor.getHTML()
    pendingRef.current = { key: activeKeyRef.current, value: collected.length > 0 ? buildAnchorMetaHtml(collected) + body : body }
    setAnchors(collected)
    // Section badges reflect the note live: push the fresh per-section counts
    // into the open document (cheap message; the layer re-renders badges).
    const badgeTarget = props.iframeRef.current?.contentWindow
    if (badgeTarget !== undefined && badgeTarget !== null) {
      postSectionBadges(badgeTarget, anchorCounts(collected, noteKey ?? ''))
    }
    pushBlockWatch(collected)
    setStatus('saving')
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      const pending = pendingRef.current
      pendingRef.current = null
      if (pending !== null) saveRef.current(pending.key, pending.value)
    }, 800)
  }

  // Flush pending edits of the previous chapter/branch, then load the new one.
  useEffect(() => {
    const key = noteKey === null ? null : noteKey + KEY_SEP + branch
    const pending = pendingRef.current
    if (pending !== null && activeKeyRef.current !== null && pending.key !== key) {
      pendingRef.current = null
      saveRef.current(pending.key, pending.value)
    }
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null }
    activeKeyRef.current = key
    setStatus('idle')
    setSaveError(null)
    setLoadedKey(null)
    setAnchors([])
    if (key === null) {
      editor?.commands.clearContent()
      return
    }
    let cancelled = false
    void (async () => {
      const keyNote = key === null ? '' : key.split(KEY_SEP)[0]
      const result = await learning.readNote(sid, workspace.root, keyNote, branch === '' ? undefined : branch)
      if (cancelled) return
      // Drop a leading anchor-index comment before handing the body to the
      // editor (the body is the source of truth; the index rebuilds on save).
      editor?.commands.setContent(result.ok ? stripAnchorMeta(result.value.content).body : '', { emitUpdate: false })
      const collected = editor === null ? [] : collectAnchorsFromDoc(editor.getJSON())
      setAnchors(collected)
      setLoadedKey(key)
      // The freshly loaded branch owns the badges now (chapter/branch switch
      // rebuilt the srcDoc, so no stale counts can linger in the iframe).
      const badgeTarget = props.iframeRef.current?.contentWindow
      if (badgeTarget !== undefined && badgeTarget !== null) {
        postSectionBadges(badgeTarget, anchorCounts(collected, noteKey ?? ''))
      }
      pushBlockWatch(collected)
    })()
    return () => { cancelled = true }
  }, [noteKey, branch, editor, learning, sid, workspace])

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    const pending = pendingRef.current
    if (pending !== null) { pendingRef.current = null; saveRef.current(pending.key, pending.value) }
  }, [])

  // - P1 handler seats (fresh per render; the overlay calls through refs) ----
  props.excerptHandleRef.current = (payload: ExcerptPayload): boolean => {
    // Direct excerpt application — only safe once the editor holds the
    // TARGET note's content (otherwise the insert would be wiped by the
    // setContent that follows the async readNote).
    if (editor === null || noteKey === null || loadedKey !== activeKeyRef.current) return false
    return appendExcerpt(editor, {
      chapterKey: noteKey,
      sectionId: payload.sectionId,
      kp: payload.kp,
      docTitle: fileBaseName(props.selected ?? noteKey),
      docPath: workspaceRelativePath(workspace.root, props.selected ?? ''),
      blockIndex: payload.blockIndex,
    }, payload.text)
  }

  props.locateRef.current = (sectionId: string): void => {
    // Badge click in the chapter: bring the editor back if the map view hid
    // it, then scroll the first matching excerpt into view and flash it.
    setViewMode('edit')
    const container = props.notesScrollRef.current
    const target = container === null ? null : container.querySelector('[data-ll-section="' + sectionId + '"]')
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target.classList.add(css.excerptHot)
      window.setTimeout(() => { target.classList.remove(css.excerptHot) }, 2000)
    }
  }

  // A queued excerpt (bubble fired while the note was still loading / the
  // card was closed): apply it as soon as the editor is ready — or drop it
  // if the chapter moved on in the meantime.
  useEffect(() => {
    const pending = props.pendingExcerpt
    if (pending === null || editor === null) return
    if (loadedKey !== activeKeyRef.current) return
    if (pending.chapterKey !== noteKey) {
      props.onConsumePendingExcerpt()
      return
    }
    if (appendExcerpt(editor, {
      chapterKey: pending.chapterKey,
      sectionId: pending.sectionId,
      kp: pending.kp,
      docTitle: pending.docTitle,
      docPath: pending.docPath,
      blockIndex: pending.blockIndex,
    }, pending.text)) {
      props.onConsumePendingExcerpt()
    }
  }, [props.pendingExcerpt, props.onConsumePendingExcerpt, editor, loadedKey, noteKey])

  // Enumerate this chapter's note branches from the notes dir listing.
  useEffect(() => {
    if (noteKey === null || learning === null) {
      setBranches([''])
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const notesDir = workspace.root + '/' + workspace.dirs.notes
        const result = await unwrap(await learning.listDir(sid, workspace.root, notesDir), 'listDir')
        if (cancelled) return
        setBranches(noteBranchesOf(noteKey, result.entries.filter(entry => entry.kind === 'file').map(entry => entry.name)))
      } catch {
        if (!cancelled) setBranches([''])
      }
    })()
    return () => { cancelled = true }
  }, [noteKey, workspace, learning, sid])

  // New chapters always start on the default branch.
  useEffect(() => { setBranch('') }, [noteKey])

  const branchInputRef = useRef<HTMLInputElement | null>(null)

  // Focus retry: autoFocus can be eaten when the iframe or another panel
  // steals focus in the same frame — refocus once on the next tick so the
  // branch input is actually editable.
  useEffect(() => {
    if (!creating) return
    const timer = window.setTimeout(() => { branchInputRef.current?.focus() }, 0)
    return () => { window.clearTimeout(timer) }
  }, [creating])

  /**
   * Confirm the pending branch: Enter and blur (clicking blank space) both
   * land here. Empty closes silently; an invalid/duplicate name keeps the
   * input open with a red outline (silent no-ops read as "broken button").
   */
  const confirmBranch = (): void => {
    const name = newBranch.trim()
    if (name === '') {
      setCreating(false)
      setNewBranch('')
      return
    }
    if (!isSafeNoteBranch(name) || branches.includes(name)) {
      setBranchError(true)
      window.setTimeout(() => { setBranchError(false) }, 1600)
      return
    }
    setBranchError(false)
    setBranches(current => [...current, name])
    setBranch(name)
    setNewBranch('')
    setCreating(false)
  }

  // idle shows nothing (no save-hint chatter); failures carry the host's
  // reason inline so the cause is visible without hovering
  const statusLabel = status === 'saving' ? t('saving')
    : status === 'saved' ? t('saved')
      : status === 'error' ? t('saveFailed') + (saveError !== null ? '：' + saveError.slice(0, 80) : '')
        : ''

  const toolbarButton = (label: ReactNode, title: string, run: () => void, active = false): React.JSX.Element => (
    <button
      type='button'
      title={title}
      className={css.tool + (active ? ' ' + css.toolOn : '')}
      onClick={run}
    >
      {label}
    </button>
  )

  return (
    <aside className={css.notes_card + ' ' + css.ls_card_major + ' ' + css.ls_card} data-dsh-surface data-dsh-inputbar>
      <div className={css.notesBody}>
        <div className={css.notesMain}>
          <div className={css.notesHead}>
            <span className={css.notesTitle}>{t('notes')}</span>
            <span className={css.spacer} />
            {/* P1 relation-map view toggle (edit ↔ map). */}
            {noteKey !== null && (
              <button
                type='button'
                className={css.pill + ' ' + css.pillInteractive + (viewMode === 'map' ? ' ' + css.pillActive : '')}
                onClick={() => { setViewMode(viewMode === 'map' ? 'edit' : 'map') }}
              >
                {viewMode === 'map' ? '✎ ' + t('notesEditView') : '🗺 ' + t('notesMapView')}
              </button>
            )}
            {statusLabel !== '' && (
              <span
                className={css.notesStatus + (status === 'saved' ? ' ' + css.notesStatusSaved : '')}
                title={saveError ?? undefined}
              >
                {statusLabel}
              </span>
            )}
          </div>
          {noteKey === null ? (
            <div className={css.hint}>{t('notesEmpty')}</div>
          ) : (
            <>
              <style>{NOTES_CONTENT_CSS}</style>
              {viewMode === 'edit' && (
              <div className={css.notesToolbar}>
                {/* every handler builds a FRESH chain at click time — a chain
                    captured at render binds the editor state of that render,
                    and applying it later throws "mismatched transaction"
                    (stale after content swaps / debounced saves) */}
                {toolbarButton('↶', 'undo', () => { editor?.chain().focus().undo().run() })}
                {toolbarButton('↷', 'redo', () => { editor?.chain().focus().redo().run() })}
                <span className={css.toolSep} />
                {toolbarButton(<b>B</b>, 'bold', () => { editor?.chain().focus().toggleBold().run() }, editor?.isActive('bold') === true)}
                {toolbarButton(<i>I</i>, 'italic', () => { editor?.chain().focus().toggleItalic().run() }, editor?.isActive('italic') === true)}
                {toolbarButton(<u>U</u>, 'underline', () => { editor?.chain().focus().toggleUnderline().run() }, editor?.isActive('underline') === true)}
                {toolbarButton(<s>S</s>, 'strike', () => { editor?.chain().focus().toggleStrike().run() }, editor?.isActive('strike') === true)}
                {toolbarButton('H2', 'heading 2', () => { editor?.chain().focus().toggleHeading({ level: 2 }).run() }, editor?.isActive('heading', { level: 2 }) === true)}
                {toolbarButton('H3', 'heading 3', () => { editor?.chain().focus().toggleHeading({ level: 3 }).run() }, editor?.isActive('heading', { level: 3 }) === true)}
                {toolbarButton(t('noteUl'), 'bullet list', () => { editor?.chain().focus().toggleBulletList().run() }, editor?.isActive('bulletList') === true)}
                {toolbarButton(t('noteOl'), 'ordered list', () => { editor?.chain().focus().toggleOrderedList().run() }, editor?.isActive('orderedList') === true)}
                {toolbarButton(t('noteCode'), 'code block', () => { editor?.chain().focus().toggleCodeBlock().run() }, editor?.isActive('codeBlock') === true)}
                {toolbarButton(t('noteQuote'), 'quote', () => { editor?.chain().focus().toggleBlockquote().run() }, editor?.isActive('blockquote') === true)}
                {toolbarButton('—', 'divider', () => { editor?.chain().focus().setHorizontalRule().run() })}
                <span className={css.toolSep} />
                {toolbarButton('🔗', 'link', () => {
                  if (editor === null) return
                  if (editor.isActive('link')) { editor.chain().focus().unsetLink().run(); return }
                  const href = window.prompt('URL', 'https://')
                  if (href !== null && href !== '') editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
                }, editor?.isActive('link') === true)}
                {toolbarButton(t('noteClear'), 'clear format', () => { editor?.chain().focus().unsetAllMarks().clearNodes().run() })}
              </div>
              )}
              {viewMode === 'map'
                ? (
                  <NotesMap
                    sections={props.sections}
                    anchors={anchors}
                    chapterKey={noteKey}
                    t={t}
                    onJump={props.jumpToSection}
                  />
                )
                : (
                  <div ref={props.notesScrollRef} className={css.notesScroll}>
                    {editor === null ? null : <EditorContent editor={editor} />}
                  </div>
                )}
            </>
          )}
        </div>
        {noteKey !== null && (
          <div className={css.branchRail}>
            {branches.map(name => (
              <button
                key={name}
                type='button'
                className={css.branchChip + (name === branch ? ' ' + css.branchChipActive : '')}
                title={name === '' ? t('noteBranchMain') : name}
                onClick={() => { setBranch(name) }}
              >
                {name === '' ? t('noteBranchMain') : name}
              </button>
            ))}
            {creating
              ? (
                <input
                  ref={branchInputRef}
                  autoFocus
                  className={css.branchNewInput + (branchError ? ' ' + css.branchNewInputError : '')}
                  value={newBranch}
                  title={t('noteBranchInvalid')}
                  placeholder='…'
                  onChange={event => { setNewBranch(event.target.value) }}
                  // blur = clicking blank space: CONFIRMS (the old code
                  // discarded the input here, which read as a dead button)
                  onBlur={() => { confirmBranch() }}
                  onKeyDown={event => {
                    if (event.key === 'Enter') { confirmBranch() }
                    if (event.key === 'Escape') { setCreating(false); setNewBranch('') }
                  }}
                />
              )
              : (
                <button
                  type='button'
                  className={css.branchChip}
                  title={t('noteBranchNew')}
                  onClick={() => { setCreating(true) }}
                >
                  ＋
                </button>
              )}
          </div>
        )}
      </div>
    </aside>
  )
}
