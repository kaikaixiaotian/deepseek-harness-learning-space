/**
 * The full-screen learning space: a root-scoped shell.overlay entry that
 * covers the whole dsh UI and renders three columns - the workspace tree,
 * the chapter/quiz viewer, and the per-chapter rich-text notes.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import type { GlobalStandardProps, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { chapterKeyOf, fileBaseName } from './classify.ts'
import { closeLearningSpace, learningSpaceState, subscribeLearningSpace } from './store.ts'
import { getLearningFace, subscribeLearningFace, unwrap, type LearningEntry, type LearningNamespaceFace, type LearningWorkspaceView } from './remote.ts'
import type { NS } from './locales.ts'

export interface LearningSpaceProps extends PropsLocale<typeof NS>, GlobalStandardProps {}

// - styles ------------------------------------------------------------------

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 200,
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--dsw-alias-bg-base, #101418)',
  color: 'var(--dsw-alias-text-primary, #e6e9ef)',
  fontFamily: 'system-ui, sans-serif',
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 14px',
  borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(255,255,255,0.12))',
  flexShrink: 0,
}

const bodyStyle: CSSProperties = { display: 'flex', flex: 1, minHeight: 0 }

const treePanelStyle: CSSProperties = {
  width: 260,
  minWidth: 260,
  overflowY: 'auto',
  borderRight: '1px solid var(--dsw-alias-border-l1, rgba(255,255,255,0.12))',
  padding: '8px 6px',
  boxSizing: 'border-box',
}

const viewerStyle: CSSProperties = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }

const notesPanelStyle: CSSProperties = {
  width: 340,
  minWidth: 340,
  borderLeft: '1px solid var(--dsw-alias-border-l1, rgba(255,255,255,0.12))',
  display: 'flex',
  flexDirection: 'column',
  padding: 10,
  boxSizing: 'border-box',
  overflowY: 'auto',
}

const centerStyle: CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--dsw-alias-text-secondary, #9aa4b2)',
  padding: 40,
  textAlign: 'center',
}

const buttonStyle: CSSProperties = {
  border: '1px solid var(--dsw-alias-border-l1, rgba(255,255,255,0.16))',
  background: 'none',
  color: 'inherit',
  borderRadius: 6,
  padding: '4px 10px',
  cursor: 'pointer',
  fontSize: 12,
}

const branchStyle: CSSProperties = {
  ...buttonStyle,
  border: 'none',
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '3px 6px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const fileStyle: CSSProperties = {
  ...branchStyle,
  paddingLeft: 22,
  fontSize: 12,
}

const hintStyle: CSSProperties = {
  padding: '2px 8px',
  fontSize: 11,
  color: 'var(--dsw-alias-text-secondary, #9aa4b2)',
}

const iframeStyle: CSSProperties = { flex: 1, width: '100%', border: 'none', background: '#fff' }

const preStyle: CSSProperties = {
  flex: 1,
  overflow: 'auto',
  margin: 0,
  padding: 14,
  fontSize: 12,
  fontFamily: 'ui-monospace, Consolas, monospace',
  whiteSpace: 'pre-wrap',
}

const editorStyle: CSSProperties = {
  flex: 1,
  minHeight: 160,
  border: '1px solid var(--dsw-alias-border-l1, rgba(255,255,255,0.16))',
  borderRadius: 8,
  padding: 10,
  overflowY: 'auto',
  outline: 'none',
  fontSize: 13,
  lineHeight: 1.6,
}

const toolbarStyle: CSSProperties = { display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }

const toolButtonStyle: CSSProperties = { ...buttonStyle, padding: '2px 8px', fontSize: 12 }

// - overlay -----------------------------------------------------------------

export function LearningSpaceOverlay(props: LearningSpaceProps) {
  const { t, useSessions } = props
  const learning = useSyncExternalStore(subscribeLearningFace, getLearningFace)
  const space = useSyncExternalStore(subscribeLearningSpace, learningSpaceState)
  const sessionId = useSessions(state => state.current)
  const sid = sessionId === undefined ? undefined : String(sessionId)

  const [workspaces, setWorkspaces] = useState<LearningWorkspaceView[] | null>(null)
  const [connectError, setConnectError] = useState(false)
  const [workspace, setWorkspace] = useState<LearningWorkspaceView | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if (!space.open) return
    setConnectError(false)
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
      } catch {
        if (!cancelled) setConnectError(true)
      }
    })()
    return () => { cancelled = true }
  }, [space.open, space.focus?.path, learning, sid])

  if (!space.open) return null

  return (
    <div style={overlayStyle}>
      <div style={headerStyle}>
        <button type='button' style={buttonStyle} onClick={closeLearningSpace}>{t('back')}</button>
        <span style={{ fontWeight: 600 }}>{t('title')}</span>
        {workspaces !== null && workspaces.length > 1 && (
          <select
            style={buttonStyle}
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
      </div>
      {learning === null || sid === undefined || connectError ? (
        <div style={centerStyle}>{connectError ? t('connectFailed') : t('loading')}</div>
      ) : workspace === null ? (
        <div style={centerStyle}>{t('noWorkspace')}</div>
      ) : (
        <div style={bodyStyle}>
          <TreePanel key={workspace.root} workspace={workspace} learning={learning} sid={sid} selected={selected} onSelect={setSelected} t={t} />
          <Viewer workspace={workspace} learning={learning} sid={sid} selected={selected} t={t} />
          <NotesPanel workspace={workspace} learning={learning} sid={sid} selected={selected} t={t} />
        </div>
      )}
    </div>
  )
}

// - left: workspace tree -----------------------------------------------------

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
  const roots = [
    { label: t('treeBaseline'), path: workspace.root + '/' + workspace.dirs.baseline },
    { label: t('treeChapters'), path: workspace.root + '/' + workspace.dirs.chapters },
    { label: t('treeQuizzes'), path: workspace.root + '/' + workspace.dirs.quizzes },
  ]
  return (
    <div style={treePanelStyle}>
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
      <button type='button' style={branchStyle} onClick={toggle} title={path}>
        {expanded ? '▾ ' : '▸ '}{label}
      </button>
      {expanded && error && <div style={hintStyle}>{t('viewerFailed')}</div>}
      {expanded && entries === null && !error && <div style={hintStyle}>{t('loading')}</div>}
      {expanded && entries !== null && entries.length === 0 && <div style={hintStyle}>{t('treeEmpty')}</div>}
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
            style={{ ...fileStyle, fontWeight: selected === entry.path ? 600 : 400 }}
            title={entry.path}
            onClick={() => { onSelect(entry.path) }}
          >
            {entry.name}
          </button>
        ))}
    </div>
  )
}

// - middle: chapter/quiz viewer ----------------------------------------------

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

  useEffect(() => {
    setContent(null)
    setError(null)
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

  if (selected === null) return <div style={centerStyle}>{t('viewerPick')}</div>
  if (error !== null) return <div style={centerStyle}>{t('viewerFailed')}<br /><span style={{ fontSize: 12 }}>{error}</span></div>
  if (content === null) return <div style={centerStyle}>{t('loading')}</div>
  const isHtml = /\.html?$/i.test(selected)
  return (
    <div style={viewerStyle}>
      <div style={{ ...hintStyle, padding: '4px 14px' }}>
        <span title={selected}>{fileBaseName(selected)}</span>
        {content.truncated && <span> · {t('viewerTruncated')}</span>}
      </div>
      {isHtml
        ? <iframe style={iframeStyle} srcDoc={content.text} title={selected} />
        : <pre style={preStyle}>{content.text}</pre>}
    </div>
  )
}

// - right: per-chapter notes -------------------------------------------------

interface NotesPanelProps extends ViewerProps {}

function NotesPanel(props: NotesPanelProps) {
  const { workspace, learning, sid, selected, t } = props
  const chapterKey = selected === null ? null : chapterKeyOf(selected)
  const editorRef = useRef<HTMLDivElement | null>(null)
  const pendingRef = useRef<{ key: string; value: string } | null>(null)
  const timerRef = useRef<number | null>(null)
  const currentKeyRef = useRef<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const saveRef = useRef<(key: string, value: string) => void>(() => {})
  saveRef.current = (key: string, value: string): void => {
    if (learning === null) { setStatus('error'); return }
    void (async () => {
      try {
        await unwrap(await learning.writeNote(sid, workspace.root, key, value), 'writeNote')
        if (currentKeyRef.current === key) setStatus('saved')
      } catch {
        if (currentKeyRef.current === key) setStatus('error')
      }
    })()
  }

  useEffect(() => {
    const pending = pendingRef.current
    if (pending !== null && currentKeyRef.current !== null && pending.key !== chapterKey) {
      pendingRef.current = null
      saveRef.current(pending.key, pending.value)
    }
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null }
    currentKeyRef.current = chapterKey
    setStatus('idle')
    if (chapterKey === null) {
      if (editorRef.current !== null) editorRef.current.innerHTML = ''
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const result = await learning.readNote(sid, workspace.root, chapterKey)
        if (cancelled) return
        if (editorRef.current !== null) editorRef.current.innerHTML = result.ok ? result.value.content : ''
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => { cancelled = true }
  }, [chapterKey, learning, sid, workspace])

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    const pending = pendingRef.current
    if (pending !== null) { pendingRef.current = null; saveRef.current(pending.key, pending.value) }
  }, [])

  const onInput = (): void => {
    if (editorRef.current === null || currentKeyRef.current === null) return
    const value = editorRef.current.innerHTML
    pendingRef.current = { key: currentKeyRef.current, value }
    setStatus('saving')
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      const pending = pendingRef.current
      pendingRef.current = null
      if (pending !== null) saveRef.current(pending.key, pending.value)
    }, 800)
  }

  const exec = (command: string, arg?: string): void => {
    editorRef.current?.focus()
    document.execCommand(command, false, arg)
    onInput()
  }

  const statusLabel = status === 'saving' ? t('saving') : status === 'saved' ? t('saved') : status === 'error' ? t('saveFailed') : t('notesHint')

  return (
    <div style={notesPanelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontWeight: 600 }}>{t('notes')}</span>
        <span style={{ fontSize: 11, color: 'var(--dsw-alias-text-secondary, #9aa4b2)' }}>{statusLabel}</span>
      </div>
      {chapterKey === null ? (
        <div style={hintStyle}>{t('notesEmpty')}</div>
      ) : (
        <>
          <div style={toolbarStyle}>
            <button type='button' style={toolButtonStyle} onClick={() => { exec('bold') }}><b>B</b></button>
            <button type='button' style={toolButtonStyle} onClick={() => { exec('italic') }}><i>I</i></button>
            <button type='button' style={toolButtonStyle} onClick={() => { exec('underline') }}><u>U</u></button>
            <button type='button' style={toolButtonStyle} onClick={() => { exec('formatBlock', 'h2') }}>H2</button>
            <button type='button' style={toolButtonStyle} onClick={() => { exec('insertUnorderedList') }}>{t('noteUl')}</button>
            <button type='button' style={toolButtonStyle} onClick={() => { exec('insertOrderedList') }}>{t('noteOl')}</button>
            <button type='button' style={toolButtonStyle} onClick={() => { exec('formatBlock', 'pre') }}>{t('noteCode')}</button>
            <button type='button' style={toolButtonStyle} onClick={() => { exec('formatBlock', 'blockquote') }}>{t('noteQuote')}</button>
            <button type='button' style={toolButtonStyle} onClick={() => { exec('removeFormat') }}>{t('noteClear')}</button>
          </div>
          <div ref={editorRef} contentEditable onInput={onInput} style={editorStyle} />
        </>
      )}
    </div>
  )
}
