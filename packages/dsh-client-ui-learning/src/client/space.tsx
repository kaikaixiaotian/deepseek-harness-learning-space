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
import { chapterKeyOf, fileBaseName, isSafeNoteBranch, noteBranchesOf } from './classify.ts'
import { closeLearningSpace, learningSpaceState, subscribeLearningSpace } from './store.ts'
import { getLearningFace, subscribeLearningFace, unwrap, type LearningEntry, type LearningNamespaceFace, type LearningWorkspaceView } from './remote.ts'
import { bridgeReply, dirOf, floorThemeSnapshot, inlineRelativeIframes, injectTheme, LIVE_THEME_ACK_TYPE, parseBridgeMessage, postThemeUpdate, resolveRelative, snapshotTheme, type ThemeSnapshot } from './bridge.ts'
import type { NS } from './locales.ts'

export interface LearningSpaceProps extends PropsLocale<typeof NS>, GlobalStandardProps {}

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
          <div className={css.body_row}>
            <TreePanel key={workspace.root} workspace={workspace} learning={learning} sid={sid} selected={selected} onSelect={setSelected} t={t} />
            <Viewer workspace={workspace} learning={learning} sid={sid} selected={selected} t={t} />
            {notesOpen && <NotesPanel workspace={workspace} learning={learning} sid={sid} selected={selected} t={t} />}
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
      {expanded && error && <div className={css.hint}>{t('viewerFailed')}</div>}
      {expanded && entries === null && !error && <div className={css.hint}>{t('loading')}</div>}
      {expanded && entries !== null && entries.length === 0 && <div className={css.hint}>{t('treeEmpty')}</div>}
      {expanded && entries !== null && entries.map(entry => entry.kind === 'dir'
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
  )
}

// - middle: chapter/quiz viewer card ----------------------------------------

interface ViewerProps {
  readonly workspace: LearningWorkspaceView
  readonly learning: LearningNamespaceFace
  readonly sid: string
  readonly selected: string | null
  readonly t: LearningSpaceProps['t']
}

function Viewer(props: ViewerProps) {
  const { workspace, learning, sid, selected, t } = props
  const [content, setContent] = useState<{ text: string; truncated: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [docHtml, setDocHtml] = useState<string | null>(null)
  const [docTheme, setDocTheme] = useState<ThemeSnapshot | null>(null)
  const [rebuildTick, setRebuildTick] = useState(0)
  const [submitNotice, setSubmitNotice] = useState<string | null>(null)
  const [themeTick, setThemeTick] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
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
          const abs = resolveRelative(baseDir, rel)
          try {
            const result = await unwrap(await learning.readFile(sid, workspace.root, abs), 'readFile')
            return result.content
          } catch {
            return null
          }
        }, undefined, vizHtml => injectTheme(vizHtml, theme))
        html = injectTheme(inlined.html, theme)
        objectUrls = inlined.objectUrls
      } catch {
        // Viz inlining is an enhancement, never a blocker: fall back to the
        // theme-injected raw document (dark canvas, demos keep their fallback
        // link) rather than rendering an unthemed page or an eternal spinner.
        html = injectTheme(content.text, theme)
      }
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

  // The message bridge: quiz forms inside the iframe read sibling answer
  // files and submit answers through here (srcDoc has no fetchable base).
  useEffect(() => {
    const handler = (event: MessageEvent): void => {
      const request = parseBridgeMessage(event, iframeRef.current)
      if (request === null) return
      const window_ = iframeRef.current?.contentWindow
      if (window_ === undefined || window_ === null) return
      void (async () => {
        if (request.kind === 'll-read') {
          const abs = resolveRelative(dirOf(selected ?? ''), request.path)
          try {
            const result = await unwrap(await learning.readFile(sid, workspace.root, abs), 'readFile')
            window_.postMessage(bridgeReply(request, { ok: true, content: result.content }), '*')
          } catch (err) {
            window_.postMessage(bridgeReply(request, { ok: false, error: err instanceof Error ? err.message : String(err) }), '*')
          }
          return
        }
        try {
          const result = await unwrap(
            await learning.saveQuizAnswers(sid, workspace.root, selected ?? '', JSON.stringify(request.answers, null, 2)),
            'saveQuizAnswers',
          )
          setSubmitNotice(result.answersPath)
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

interface NotesPanelProps extends ViewerProps {}

function NotesPanel(props: NotesPanelProps) {
  const { workspace, learning, sid, selected, t } = props
  const chapterKey = selected === null ? null : chapterKeyOf(selected)
  const [branch, setBranch] = useState('')
  const [branches, setBranches] = useState<string[]>([''])
  const [newBranch, setNewBranch] = useState('')
  const [creating, setCreating] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const pendingRef = useRef<{ key: string; value: string } | null>(null)
  const timerRef = useRef<number | null>(null)
  const activeKeyRef = useRef<string | null>(null)

  // One editor instance for the panel's lifetime; content is swapped when
  // the chapter or branch changes. The update callback goes through a ref
  // so the debounced save always sees the current chapter/branch.
  const onUpdateRef = useRef<() => void>(() => {})
  const editor = useEditor({
    extensions: [
      // tiptap 3 StarterKit already bundles link and underline; disable the
      // built-ins so our configured copies don't register duplicate names.
      StarterKit.configure({ link: false, underline: false }),
      Link.configure({ openOnClick: false }),
      Underline,
    ],
    content: '',
    editorProps: { attributes: { class: 'll-notes-content', style: 'min-height:100%;outline:none;' } },
    onUpdate: () => { onUpdateRef.current() },
  }, [])

  const saveRef = useRef<(key: string, value: string) => void>(() => {})
  saveRef.current = (key: string, value: string): void => {
    if (learning === null) { setStatus('error'); return }
    const [keyChapter, keyBranch] = key.split(KEY_SEP)
    void (async () => {
      try {
        await unwrap(await learning.writeNote(sid, workspace.root, keyChapter, value, keyBranch), 'writeNote')
        if (activeKeyRef.current === key) setStatus('saved')
      } catch {
        if (activeKeyRef.current === key) setStatus('error')
      }
    })()
  }

  onUpdateRef.current = (): void => {
    if (editor === null || activeKeyRef.current === null) return
    pendingRef.current = { key: activeKeyRef.current, value: editor.getHTML() }
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
    const key = chapterKey === null ? null : chapterKey + KEY_SEP + branch
    const pending = pendingRef.current
    if (pending !== null && activeKeyRef.current !== null && pending.key !== key) {
      pendingRef.current = null
      saveRef.current(pending.key, pending.value)
    }
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null }
    activeKeyRef.current = key
    setStatus('idle')
    if (key === null) {
      editor?.commands.clearContent()
      return
    }
    let cancelled = false
    void (async () => {
      const keyChapter = key === null ? '' : key.split(KEY_SEP)[0]
      const result = await learning.readNote(sid, workspace.root, keyChapter, branch === '' ? undefined : branch)
      if (cancelled) return
      editor?.commands.setContent(result.ok ? result.value.content : '', { emitUpdate: false })
    })()
    return () => { cancelled = true }
  }, [chapterKey, branch, editor, learning, sid, workspace])

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    const pending = pendingRef.current
    if (pending !== null) { pendingRef.current = null; saveRef.current(pending.key, pending.value) }
  }, [])

  // Enumerate this chapter's note branches from the notes dir listing.
  useEffect(() => {
    if (chapterKey === null || learning === null) {
      setBranches([''])
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const notesDir = workspace.root + '/' + workspace.dirs.notes
        const result = await unwrap(await learning.listDir(sid, workspace.root, notesDir), 'listDir')
        if (cancelled) return
        setBranches(noteBranchesOf(chapterKey, result.entries.filter(entry => entry.kind === 'file').map(entry => entry.name)))
      } catch {
        if (!cancelled) setBranches([''])
      }
    })()
    return () => { cancelled = true }
  }, [chapterKey, workspace, learning, sid])

  // New chapters always start on the default branch.
  useEffect(() => { setBranch('') }, [chapterKey])

  const createBranch = (): void => {
    const name = newBranch.trim()
    if (!isSafeNoteBranch(name) || name === '' || branches.includes(name)) return
    setBranches(current => [...current, name])
    setBranch(name)
    setNewBranch('')
    setCreating(false)
  }

  const statusLabel = status === 'saving' ? t('saving') : status === 'saved' ? t('saved') : status === 'error' ? t('saveFailed') : t('notesHint')

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

  const chain = editor === null ? null : editor.chain().focus()

  return (
    <aside className={css.notes_card + ' ' + css.ls_card_major + ' ' + css.ls_card} data-dsh-surface data-dsh-inputbar>
      <div className={css.notesBody}>
        <div className={css.notesMain}>
          <div className={css.notesHead}>
            <span className={css.notesTitle}>{t('notes')}</span>
            <span className={css.spacer} />
            <span className={css.notesStatus + (status === 'saved' ? ' ' + css.notesStatusSaved : '')}>{statusLabel}</span>
          </div>
          {chapterKey === null ? (
            <div className={css.hint}>{t('notesEmpty')}</div>
          ) : (
            <>
              <style>{NOTES_CONTENT_CSS}</style>
              <div className={css.notesToolbar}>
                {toolbarButton('↶', 'undo', () => { chain?.undo().run() })}
                {toolbarButton('↷', 'redo', () => { chain?.redo().run() })}
                <span className={css.toolSep} />
                {toolbarButton(<b>B</b>, 'bold', () => { chain?.toggleBold().run() }, editor?.isActive('bold') === true)}
                {toolbarButton(<i>I</i>, 'italic', () => { chain?.toggleItalic().run() }, editor?.isActive('italic') === true)}
                {toolbarButton(<u>U</u>, 'underline', () => { chain?.toggleUnderline().run() }, editor?.isActive('underline') === true)}
                {toolbarButton(<s>S</s>, 'strike', () => { chain?.toggleStrike().run() }, editor?.isActive('strike') === true)}
                {toolbarButton('H2', 'heading 2', () => { chain?.toggleHeading({ level: 2 }).run() }, editor?.isActive('heading', { level: 2 }) === true)}
                {toolbarButton('H3', 'heading 3', () => { chain?.toggleHeading({ level: 3 }).run() }, editor?.isActive('heading', { level: 3 }) === true)}
                {toolbarButton(t('noteUl'), 'bullet list', () => { chain?.toggleBulletList().run() }, editor?.isActive('bulletList') === true)}
                {toolbarButton(t('noteOl'), 'ordered list', () => { chain?.toggleOrderedList().run() }, editor?.isActive('orderedList') === true)}
                {toolbarButton(t('noteCode'), 'code block', () => { chain?.toggleCodeBlock().run() }, editor?.isActive('codeBlock') === true)}
                {toolbarButton(t('noteQuote'), 'quote', () => { chain?.toggleBlockquote().run() }, editor?.isActive('blockquote') === true)}
                {toolbarButton('—', 'divider', () => { chain?.setHorizontalRule().run() })}
                <span className={css.toolSep} />
                {toolbarButton('🔗', 'link', () => {
                  if (editor === null) return
                  if (editor.isActive('link')) { editor.chain().focus().unsetLink().run(); return }
                  const href = window.prompt('URL', 'https://')
                  if (href !== null && href !== '') editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
                }, editor?.isActive('link') === true)}
                {toolbarButton(t('noteClear'), 'clear format', () => { chain?.unsetAllMarks().clearNodes().run() })}
              </div>
              <div className={css.notesScroll}>
                {editor === null ? null : <EditorContent editor={editor} />}
              </div>
            </>
          )}
        </div>
        {chapterKey !== null && (
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
                  autoFocus
                  className={css.branchNewInput}
                  value={newBranch}
                  placeholder={t('noteBranchNamePlaceholder')}
                  onChange={event => { setNewBranch(event.target.value) }}
                  onBlur={() => { setCreating(false); setNewBranch('') }}
                  onKeyDown={event => {
                    if (event.key === 'Enter') { createBranch() }
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
