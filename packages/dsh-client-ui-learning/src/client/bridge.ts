/**
 * Learning-space iframe bridges:
 *
 *  - theme bridge: snapshot the host page's --dsw-alias-* tokens and dark
 *    flag, then inject them into a srcDoc document (CSS custom properties
 *    and body attributes do not cross document boundaries, so generated
 *    HTML would otherwise render with its OS-level fallbacks only).
 *  - viz inlining: chapter docs reference their interactive demos with
 *    relative iframe src, which cannot resolve under about:srcdoc; the
 *    viewer pre-reads each target and swaps in a blob: URL.
 *  - message bridge: the postMessage protocol spoken by the quiz-form
 *    template inside the iframe (read sibling files / submit answers).
 *    Pure helpers here, DOM wiring lives in the Viewer component.
 */

// - theme bridge ---------------------------------------------------------------

/** Tokens the generated templates consume (with fallbacks of their own).
 * Theme plugins override these on the host page through the dsh token
 * override stack; the snapshot carries the OVERRIDDEN values, so a plugin
 * palette (e.g. ui-aqua's deep-sea blues) reaches the iframe for free. */
export const THEME_TOKENS = [
  // canvas / surfaces
  '--dsw-alias-bg-base',
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-layer-2',
  '--dsw-alias-bg-skeleton',
  // ink
  '--dsw-alias-label-primary',
  '--dsw-alias-label-secondary',
  '--dsw-alias-label-tertiary',
  '--dsw-alias-label-primary-foreground',
  // strokes
  '--dsw-alias-border-l1',
  '--dsw-alias-border-l2',
  '--dsw-alias-border-l3',
  '--dsw-alias-border-l2-darkmode-thin',
  // brand & interactive
  '--dsw-alias-brand-primary',
  '--dsw-alias-button-primary-fill',
  '--dsw-alias-button-primary-hover',
  '--dsw-alias-interactive-bg-hover',
  '--dsw-alias-interactive-bg-active',
  // business / success / error / warn (the templates' accent system)
  '--dsw-alias-state-business-primary',
  '--dsw-alias-state-business-tertiary',
  '--dsw-alias-state-success-primary',
  '--dsw-alias-state-success-tertiary',
  '--dsw-alias-state-error-primary',
  '--dsw-alias-state-warn-primary',
  '--dsw-alias-state-warn-tertiary',
  '--dsw-alias-state-warn-label',
  // markdown surfaces
  '--dsw-alias-markdown-code-block',
  '--dsw-alias-markdown-inline-code',
  // scrollbars (iframe scroller)
  '--dsw-alias-scrollbar-bg-l1',
  '--dsw-alias-scrollbar-hover-l1',
  // elevation
  '--dsw-shadow-lv1',
  '--dsw-shadow-lv2',
  // glass-skin knobs (ui-aqua writes them onto <html>; they inherit down to
  // body so the snapshot carries them into the iframe, letting the template
  // overlays scale their frost with the user's slider)
  '--dsh-aqua-blur',
  '--dsh-aqua-frost',
] as const

export interface ThemeSnapshot {
  readonly css: string
  readonly dark: boolean
  /** A glass skin (e.g. ui-aqua) is active on the host — templates flip to
   *  a translucent canvas so the host card's glass and ambient stay visible. */
  readonly glass: boolean
}

/** Snapshot the tokens + dark/glass flags from the host page (DOM read only). */
export function snapshotTheme(body: HTMLElement = document.body, root: HTMLElement = document.documentElement): ThemeSnapshot {
  const computed = getComputedStyle(body)
  const declarations: string[] = []
  for (const token of THEME_TOKENS) {
    const value = computed.getPropertyValue(token).trim()
    if (value !== '') declarations.push(`${token}:${value};`)
  }
  return {
    css: declarations.join(''),
    dark: isHostDark(body, root, computed),
    glass: root.hasAttribute('data-dsh-aqua'),
  }
}

/**
 * Dark-flag resolution: body[data-ds-dark-theme] is the presenter's canonical
 * marker, with the root color-scheme as a second opinion — the presenter
 * writes `color-scheme` onto <html>'s inline style on every apply, so a
 * snapshot racing a marker flip still resolves the right scheme instead of
 * silently marking the document ll-light (which blocks the templates'
 * OS-preference dark fallback and paints a white canvas).
 */
function isHostDark(body: HTMLElement, root: HTMLElement, bodyComputed: CSSStyleDeclaration): boolean {
  return resolveDarkFlag(body.hasAttribute('data-ds-dark-theme'), root.style.colorScheme, bodyComputed.colorScheme)
}

/** Pure scheme resolution (exported for tests): attribute first, then the
 *  root's inline color-scheme, then the computed value. */
export function resolveDarkFlag(bodyAttribute: boolean, inlineColorScheme: string, computedColorScheme: string): boolean {
  if (bodyAttribute) return true
  if (inlineColorScheme.trim() !== '') return inlineColorScheme.split(/\s+/).includes('dark')
  return computedColorScheme.split(/\s+/).includes('dark')
}

/**
 * Inject the snapshot into a srcDoc html: an early `<style id="ll-theme">`
 * rule in :root plus the ll-dark/ll-light mode class on <html>. Inline
 * :root rules win over the document's own fallback sheet, and the mode
 * class lets the template gate its dark palette on the HOST theme instead
 * of the OS preference (html:not(.ll-light) keeps the file:// behavior).
 */
export function injectTheme(html: string, theme: ThemeSnapshot): string {
  const style = `<style id="ll-theme">:root{${theme.css}}</style>`
  const modeClasses = [theme.dark ? 'll-dark' : 'll-light', ...(theme.glass ? ['ll-glass'] : [])].join(' ')
  if (/<html\b[^>]*>/i.test(html)) {
    let out = html.replace(/<html\b[^>]*>/i, match => {
      const withClass = /\bclass\s*=\s*(["'])(.*?)\1/i.test(match)
        ? match.replace(/\bclass\s*=\s*(["'])(.*?)\1/i, (_m, quote: string, value: string) => `class=${quote}${value} ${modeClasses}${quote}`)
        : match.replace(/<html\b/i, `<html class="${modeClasses}"`)
      return withClass
    })
    if (/<head\b[^>]*>/i.test(out)) {
      out = out.replace(/<head\b[^>]*>/i, match => match + style)
    } else if (/<html\b[^>]*>/i.test(out)) {
      out = out.replace(/<\/html>/i, `${style}</html>`)
    } else {
      out = style + out
    }
    return out
  }
  return style + html
}

// - live theme channel -----------------------------------------------------------

/** Live theme push: while a document is open, the host re-announces the
 *  palette into the iframe on every host theme change (mode switch, theme
 *  plugin, glass-knob drag). Rebuilding srcDoc would reload the document and
 *  wipe in-progress quiz answers, so templates ship a small listener that
 *  applies the payload in place (swap #ll-theme rules + ll-* classes) and
 *  acks. Files generated before the listener existed never ack — the viewer
 *  then falls back to one srcDoc rebuild, which is what older code did
 *  anyway. Standalone (file://) documents never receive a message. */
export const LIVE_THEME_TYPE = 'll-theme'
export const LIVE_THEME_ACK_TYPE = 'll-theme-ack'

export interface LiveThemePayload {
  readonly type: typeof LIVE_THEME_TYPE
  readonly nonce: number
  readonly css: string
  readonly dark: boolean
  readonly glass: boolean
}

/** Push a theme snapshot into an open iframe window. srcDoc documents have an
 *  opaque (null) origin, so targetOrigin must be '*'. */
export function postThemeUpdate(target: Window, theme: ThemeSnapshot, nonce: number): void {
  const payload: LiveThemePayload = { type: LIVE_THEME_TYPE, nonce, css: theme.css, dark: theme.dark, glass: theme.glass }
  target.postMessage(payload, '*')
}

/** True when `event` is a listener's ack echoing the given push nonce. */
export function isThemeAck(event: MessageEvent, nonce: number): boolean {
  const data = event.data as { type?: unknown; nonce?: unknown } | null
  return data !== null && data.type === LIVE_THEME_ACK_TYPE && data.nonce === nonce
}

// - relative path helper ---------------------------------------------------------

/** Pure POSIX-ish resolution of `rel` against a directory `base` (no fs). */
export function resolveRelative(baseDir: string, rel: string): string {
  const isAbsolute = rel.startsWith('/') || /^[A-Za-z]:/.test(rel)
  const raw = (isAbsolute ? rel : baseDir + '/' + rel).replace(/\\/g, '/')
  // Preserve a Windows drive prefix through the stack walk so host paths
  // like C:/Users/... stay resolvable (a leading '/' would corrupt them
  // into a doubled drive segment on path.resolve).
  const hasDrive = raw.length >= 2 && isAsciiLetter(raw.charCodeAt(0)) && raw.charCodeAt(1) === 58 /* : */
  const walkable = hasDrive ? raw.slice(2) : raw
  const stack = walkable.split('/')
  const out: string[] = []
  for (const segment of stack) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      out.pop()
      continue
    }
    out.push(segment)
  }
  const path = '/' + out.join('/')
  return hasDrive ? raw.slice(0, 2) + path : path
}

function isAsciiLetter(code: number): boolean {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
}

/** Directory part of a path (pure). */
export function dirOf(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const at = normalized.lastIndexOf('/')
  return at <= 0 ? '' : normalized.slice(0, at)
}

// - viz inlining ----------------------------------------------------------------

const IFRAME_SRC_RE = /(<iframe\b[^>]*?\bsrc\s*=\s*)(["'])([^"']+)\2/gi
const SKIP_SRC_RE = /^(?:blob:|data:|https?:)/i

export interface InlinedViz {
  readonly html: string
  readonly objectUrls: string[]
}

/**
 * Rewrite relative iframe srcs into blob: URLs by reading each target
 * through `readFile`. http(s)/data/blob sources are left untouched; failed
 * reads keep the original src (the file:// fallback path stays meaningful).
 * `transform` (e.g. injectTheme) re-skins each successfully read viz page so
 * embedded demos open pre-themed — the parent page only forwards ll-theme
 * pushes on host theme CHANGES, so without this a freshly opened demo sits
 * on its standalone light fallback until the next flip.
 */
export async function inlineRelativeIframes(
  html: string,
  readFile: (absolutePath: string) => Promise<string | null>,
  createObjectUrl: (content: string) => string = content => URL.createObjectURL(new Blob([content], { type: 'text/html' })),
  transform: (content: string) => string = content => content,
): Promise<InlinedViz> {
  const objectUrls: string[] = []
  const rewrites = new Map<string, string>()
  for (const match of html.matchAll(IFRAME_SRC_RE)) {
    const src = match[3] ?? ''
    if (SKIP_SRC_RE.test(src) || !/\.html?$/i.test(src)) continue
    rewrites.set(src, '')
  }
  // resolve + read sequentially (chapters have at most a handful of iframes)
  for (const src of [...rewrites.keys()]) {
    const content = await readFile(src)
    if (content === null) {
      rewrites.delete(src)
      continue
    }
    const url = createObjectUrl(transform(content))
    objectUrls.push(url)
    rewrites.set(src, url)
  }
  const out = html.replace(IFRAME_SRC_RE, (full, prefix: string, quote: string, src: string) => {
    const url = rewrites.get(src)
    return url !== undefined && url !== '' ? prefix + quote + url + quote : full
  })
  return { html: out, objectUrls }
}

// - message bridge ----------------------------------------------------------------

export type BridgeRequest =
  | { readonly kind: 'll-read'; readonly id: number; readonly path: string }
  | { readonly kind: 'll-submit'; readonly id: number; readonly quiz: string; readonly answers: unknown }

export interface BridgeReply {
  readonly type: string
  readonly id: number
  readonly ok: boolean
  readonly content?: string
  readonly path?: string
  readonly error?: string
}

/**
 * Validate an incoming MessageEvent as a bridge request from our iframe
 * (source check), or return null. Pure besides the source comparison.
 */
export function parseBridgeMessage(event: MessageEvent, iframe: HTMLIFrameElement | null): BridgeRequest | null {
  if (iframe === null || event.source !== iframe.contentWindow) return null
  const data = event.data
  if (typeof data !== 'object' || data === null) return null
  const kind = (data as { type?: unknown }).type
  const id = (data as { id?: unknown }).id
  if (typeof id !== 'number') return null
  if (kind === 'll-read' && typeof (data as { path?: unknown }).path === 'string') {
    return { kind, id, path: (data as { path: string }).path }
  }
  if (kind === 'll-submit' && typeof (data as { quiz?: unknown }).quiz === 'string' && 'answers' in (data as object)) {
    return { kind, id, quiz: (data as { quiz: string }).quiz, answers: (data as { answers: unknown }).answers }
  }
  return null
}

/** Serialize a reply for one request id (child validates by `id`). */
export function bridgeReply(request: BridgeRequest, payload: { ok: boolean; content?: string; path?: string; error?: string }): BridgeReply {
  return {
    type: request.kind + '-result',
    id: request.id,
    ok: payload.ok,
    ...(payload.content !== undefined ? { content: payload.content } : {}),
    ...(payload.path !== undefined ? { path: payload.path } : {}),
    ...(payload.error !== undefined ? { error: payload.error } : {}),
  }
}
