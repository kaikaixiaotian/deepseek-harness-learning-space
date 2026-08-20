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

/** dsh static palette per scheme, mirroring the skeletons' fallback values.
 *  The floor {@link floorThemeSnapshot} fills UNRESOLVED tokens from here so
 *  an injection can never leave a document unthemed — a snapshot racing a
 *  theme flip (or a host quirk) then lands on the static palette for the
 *  resolved scheme instead of a white canvas. Knobs (--dsh-aqua-*) are
 *  never floored: only the glass layer consumes them, with own fallbacks. */
const STATIC_TOKENS: Record<'light' | 'dark', Partial<Record<(typeof THEME_TOKENS)[number], string>>> = {
  light: {
    '--dsw-alias-bg-base': '#ffffff',
    '--dsw-alias-bg-layer-1': '#ffffff',
    '--dsw-alias-bg-layer-2': '#ffffff',
    '--dsw-alias-bg-skeleton': 'rgba(0,0,0,0.04)',
    '--dsw-alias-label-primary': 'rgb(15,17,21)',
    '--dsw-alias-label-secondary': 'rgb(97,102,107)',
    '--dsw-alias-label-tertiary': 'rgb(129,133,140)',
    '--dsw-alias-label-primary-foreground': '#ffffff',
    '--dsw-alias-border-l1': 'rgba(0,0,0,0.04)',
    '--dsw-alias-border-l2': 'rgba(0,0,0,0.1)',
    '--dsw-alias-border-l3': 'rgba(0,0,0,0.12)',
    '--dsw-alias-border-l2-darkmode-thin': 'rgba(0,0,0,0.1)',
    '--dsw-alias-button-primary-fill': 'rgb(15,17,21)',
    '--dsw-alias-button-primary-hover': 'rgb(67,69,74)',
    '--dsw-alias-interactive-bg-hover': 'rgba(38,49,72,0.06)',
    '--dsw-alias-interactive-bg-active': 'rgba(38,49,72,0.1)',
    '--dsw-alias-state-business-primary': 'rgb(65,118,230)',
    '--dsw-alias-state-business-tertiary': 'rgb(228,237,253)',
    '--dsw-alias-state-success-primary': 'rgb(34,197,94)',
    '--dsw-alias-state-success-tertiary': 'rgb(230,250,237)',
    '--dsw-alias-state-error-primary': 'rgb(236,19,19)',
    '--dsw-alias-state-warn-primary': 'rgb(245,158,11)',
    '--dsw-alias-state-warn-tertiary': 'rgb(254,245,231)',
    '--dsw-alias-state-warn-label': 'rgb(221,134,41)',
    '--dsw-alias-markdown-code-block': 'rgb(249,250,251)',
    '--dsw-alias-markdown-inline-code': 'rgb(235,238,242)',
    '--dsw-alias-scrollbar-bg-l1': 'rgb(229,229,229)',
    '--dsw-alias-scrollbar-hover-l1': 'rgb(199,199,199)',
    '--dsw-shadow-lv1': '0 2px 4px 0 rgba(0,0,0,0.05)',
    '--dsw-shadow-lv2': '0 2px 8px 0 rgba(0,0,0,0.04)',
  },
  dark: {
    '--dsw-alias-bg-base': 'rgb(21,21,23)',
    '--dsw-alias-bg-layer-1': 'rgb(35,35,36)',
    '--dsw-alias-bg-layer-2': 'rgb(44,44,46)',
    '--dsw-alias-bg-skeleton': 'rgba(255,255,255,0.08)',
    '--dsw-alias-label-primary': 'rgb(249,250,251)',
    '--dsw-alias-label-secondary': 'rgb(207,211,214)',
    '--dsw-alias-label-tertiary': 'rgb(173,178,184)',
    '--dsw-alias-label-primary-foreground': 'rgb(15,17,21)',
    '--dsw-alias-border-l1': 'rgba(255,255,255,0.06)',
    '--dsw-alias-border-l2': 'rgba(255,255,255,0.12)',
    '--dsw-alias-border-l3': 'rgba(255,255,255,0.16)',
    '--dsw-alias-border-l2-darkmode-thin': 'rgba(255,255,255,0.12)',
    '--dsw-alias-button-primary-fill': 'rgb(249,250,251)',
    '--dsw-alias-button-primary-hover': 'rgb(235,238,242)',
    '--dsw-alias-interactive-bg-hover': 'rgba(255,255,255,0.08)',
    '--dsw-alias-interactive-bg-active': 'rgba(255,255,255,0.12)',
    '--dsw-alias-state-business-primary': 'rgb(103,158,254)',
    '--dsw-alias-state-business-tertiary': 'rgb(52,65,91)',
    '--dsw-alias-state-success-primary': 'rgb(34,197,94)',
    '--dsw-alias-state-success-tertiary': 'rgb(35,60,44)',
    '--dsw-alias-state-error-primary': 'rgb(242,90,90)',
    '--dsw-alias-state-warn-primary': 'rgb(245,158,11)',
    '--dsw-alias-state-warn-tertiary': 'rgb(39,36,31)',
    '--dsw-alias-state-warn-label': 'rgb(247,173,49)',
    '--dsw-alias-markdown-code-block': 'rgb(27,27,28)',
    '--dsw-alias-markdown-inline-code': 'rgb(44,44,46)',
    '--dsw-alias-scrollbar-bg-l1': 'rgb(44,44,46)',
    '--dsw-alias-scrollbar-hover-l1': 'rgb(64,64,66)',
    '--dsw-shadow-lv1': '0 2px 4px 0 rgba(0,0,0,0.4)',
    '--dsw-shadow-lv2': '0 2px 8px 0 rgba(0,0,0,0.3)',
  },
}

/** Fill every unresolved token from the dsh static palette for the snapshot's
 *  scheme. Captured values always win (the host palette, incl. theme-plugin
 *  overrides, stays authoritative); only gaps are floored. Pure. */
export function floorThemeSnapshot(theme: ThemeSnapshot): ThemeSnapshot {
  const statics = theme.dark ? STATIC_TOKENS.dark : STATIC_TOKENS.light
  const captured = new Set(
    theme.css.split(';')
      .map(declaration => declaration.slice(0, declaration.indexOf(':')).trim())
      .filter(name => name !== ''),
  )
  const filled: string[] = []
  for (const [token, value] of Object.entries(statics)) {
    if (!captured.has(token)) filled.push(`${token}:${value};`)
  }
  if (filled.length === 0) return theme
  return { ...theme, css: theme.css + filled.join('') }
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
  // The scheme rules make the UA canvas base + native chrome (scrollbars,
  // form controls) follow the host theme even in documents whose own
  // stylesheet predates the color-scheme rules (older generated files).
  const style = `<style id="ll-theme">:root{${theme.css}}html.ll-dark{color-scheme:dark}html.ll-light{color-scheme:light}</style>`
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

// - in-document navigation guard ---------------------------------------------

/**
 * Inject a click guard into a srcDoc document: fragment links (#sec-x) keep
 * their native scroll behavior, but any other navigation (relative chapter
 * links, viz "open" links, form submits with an action) is prevented and
 * posted to the host as an ll-open bridge message instead. Without this, a
 * srcDoc iframe resolves relative URLs against the app origin and loads the
 * dsh SPA over the document (the reported "middle panel becomes the dsh main
 * UI" bug); Enter-in-text-input form submits would also reload the srcDoc
 * and wipe in-progress quiz answers.
 */
export function injectLinkGuard(html: string): string {
  const script = `<script>(function () {
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /^(blob:|data:|about:|javascript:|mailto:|tel:)/i.test(href)) return;
    ev.preventDefault();
    if (/^https?:/i.test(href)) { try { window.open(href, '_blank', 'noopener'); } catch (e) {} return; }
    try { parent.postMessage({ type: 'll-open', id: Date.now(), href: href }, '*'); } catch (e) {}
  }, true);
  document.addEventListener('submit', function (ev) { ev.preventDefault(); }, true);
})();</script>`
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, script + '</body>')
  return html + script
}

/** Minimal placeholder shown in a demo slot whose file could not be read:
 *  keeps the iframe a themed, self-contained document instead of a relative
 *  src that would load the dsh SPA inside the chapter. */
export function vizPlaceholder(name: string): string {
  const safe = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>演示不可用</title></head>` +
    `<body style="margin:0;font-family:-apple-system,'Segoe UI','Microsoft YaHei',sans-serif;display:flex;align-items:center;justify-content:center;min-height:220px;padding:24px;text-align:center;color:var(--dsw-alias-label-secondary,rgb(97,102,107));background:var(--dsw-alias-bg-base,#ffffff);">` +
    `⚠ 演示文件缺失或不可读：<br>${safe}</body></html>`
}

/**
 * Validate an iframe-supplied path against the workspace: rejects empty,
 * scheme-prefixed, and parent-directory-segment inputs outright, resolves
 * against the document's directory, and requires the result to sit strictly
 * inside the workspace root. Returns the absolute workspace path, or null.
 */
export function safeWorkspacePath(root: string, baseDir: string, userPath: string): string | null {
  if (userPath === '' || /^[a-z][a-z0-9+.-]*:/i.test(userPath)) return null
  if (userPath.split(/[/\\]/).includes('..')) return null
  const abs = resolveRelative(baseDir, userPath)
  const normalizedRoot = root.replace(/\\/g, '/').replace(/\/+$/, '')
  return abs.startsWith(normalizedRoot + '/') ? abs : null
}

/**
 * Validate an in-document link target for in-viewer opening: strips
 * fragment/query, then applies the same workspace-path rules as
 * {@link safeWorkspacePath}. Returns the absolute workspace path, or null
 * when the href is not a safe in-workspace target.
 */
export function safeOpenTarget(root: string, baseDir: string, href: string): string | null {
  const clean = (href.split('#')[0] ?? '').split('?')[0] ?? ''
  return safeWorkspacePath(root, baseDir, clean)
}

// - message bridge ----------------------------------------------------------------

export type BridgeRequest =
  | { readonly kind: 'll-read'; readonly id: number; readonly path: string }
  | { readonly kind: 'll-submit'; readonly id: number; readonly quiz: string; readonly answers: unknown }
  | { readonly kind: 'll-open'; readonly id: number; readonly href: string; readonly absolute: boolean }

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
  // ll-open: in-document link navigation. Relative hrefs resolve against the
  // document's directory; absolute http(s) hrefs open externally. srcDoc
  // documents inherit the app origin as their base, so an UN-intercepted
  // relative link loads the dsh SPA inside the iframe — the guard below
  // exists to make that impossible.
  if (kind === 'll-open' && typeof (data as { href?: unknown }).href === 'string') {
    const href = (data as { href: string }).href
    return { kind, id, href, absolute: /^https?:/i.test(href) }
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
