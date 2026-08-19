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

/** Tokens the generated templates consume (with fallbacks of their own). */
export const THEME_TOKENS = [
  '--dsw-alias-bg-base',
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-layer-2',
  '--dsw-alias-label-primary',
  '--dsw-alias-label-secondary',
  '--dsw-alias-label-tertiary',
  '--dsw-alias-border-l1',
  '--dsw-alias-border-l2',
  '--dsw-alias-brand-primary',
  '--dsw-alias-state-success',
  '--dsw-alias-state-error',
  '--dsw-alias-state-warn-primary',
  '--dsw-shadow-lv1',
] as const

export interface ThemeSnapshot {
  readonly css: string
  readonly dark: boolean
}

/** Snapshot the tokens + dark flag from the host page (DOM read only). */
export function snapshotTheme(body: HTMLElement = document.body): ThemeSnapshot {
  const computed = getComputedStyle(body)
  const declarations: string[] = []
  for (const token of THEME_TOKENS) {
    const value = computed.getPropertyValue(token).trim()
    if (value !== '') declarations.push(`${token}:${value};`)
  }
  return {
    css: declarations.join(''),
    dark: body.hasAttribute('data-ds-dark-theme'),
  }
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
  const modeClass = theme.dark ? 'll-dark' : 'll-light'
  if (/<html\b[^>]*>/i.test(html)) {
    let out = html.replace(/<html\b[^>]*>/i, match => {
      const withClass = /\bclass\s*=\s*(["'])(.*?)\1/i.test(match)
        ? match.replace(/\bclass\s*=\s*(["'])(.*?)\1/i, (_m, quote: string, value: string) => `class=${quote}${value} ${modeClass}${quote}`)
        : match.replace(/<html\b/i, `<html class="${modeClass}"`)
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
 */
export async function inlineRelativeIframes(
  html: string,
  readFile: (absolutePath: string) => Promise<string | null>,
  createObjectUrl: (content: string) => string = content => URL.createObjectURL(new Blob([content], { type: 'text/html' })),
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
    const url = createObjectUrl(content)
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
