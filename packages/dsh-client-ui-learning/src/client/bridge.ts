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

import { isSafeSectionId } from './anchors.ts'

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

/**
 * Locale alternates for a viz reference: the naming spec maps the demo dir
 * per workspace locale (en `viz` / zh `演示`), but generated chapter docs
 * sometimes carry the skeleton's other-locale path. Return the href plus
 * every opposite-locale rewrite of its viz/演示 segments, so the viewer can
 * retry the siblings before showing the missing-file placeholder.
 */
export function vizDirAlternates(rel: string): string[] {
  const out = [rel]
  const pushSwap = (from: string, to: string): void => {
    const re = new RegExp(`(^|/)${from}(/|$)`)
    if (re.test(rel)) out.push(rel.replace(re, `$1${to}$2`))
  }
  pushSwap('viz', '演示')
  pushSwap('演示', 'viz')
  return [...new Set(out)]
}

// - legacy-document compat patches --------------------------------------------

/**
 * Contrast self-healer for legacy demos: generated demos paint highlight
 * chips/tags with arbitrary custom classes and LIGHT hardcoded backgrounds;
 * once the compat layer turns the inherited ink light (dark theme), those
 * chips end up light-bg + light-text — unreadable. Class names are not
 * predictable, so instead of enumerating CSS this script walks the DOM and
 * darkens the ink of any element whose own background is light while its
 * text is light. Re-runs on DOM changes (the demos re-render on interaction)
 * and on ll-dark/ll-light flips.
 */
const LEGACY_VIZ_CONTRAST_JS = `<script id="ll-viz-contrast">
(function () {
  function lum(c){var m=c&&c.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);return m?0.2126*+m[1]+0.7152*+m[2]+0.0722*+m[3]:null;}
  var queued=false;
  function fix(){
    queued=false;
    if(!document.documentElement.classList.contains('ll-dark'))return;
    var els=document.querySelectorAll('body *');
    for(var i=0;i<els.length;i++){
      var el=els[i];
      var cs=getComputedStyle(el);
      if(cs.visibility==='hidden'||cs.display==='none')continue;
      var b=lum(cs.backgroundColor);
      if(b===null||b<=150)continue;
      var t=lum(cs.color);
      if(t===null||t<=150)continue;
      el.style.color='rgb(24,26,30)';
    }
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(fix);}
  if(window.MutationObserver){
    new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
    new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  }
  window.addEventListener('load',schedule);
  schedule();
})();
</script>`

/**
 * Theme + height compat for demos generated by the PRE-token viz skeleton
 * (hardcoded light colors, viewport-floored height reports). Skips demos
 * carrying the current `skeleton: viz` signature (they theme themselves):
 *  - injects a dark/glass-aware override layer for the old skeleton's class
 *    vocabulary (.stage/.legend/.controls/.fresh/.stale) plus a contrast
 *    self-healer for custom light chips;
 *  - rewrites the height report from documentElement.scrollHeight (floored
 *    by the iframe's own viewport — once the frame grows it can never shrink)
 *    to body.scrollHeight + margin compensation (content-driven).
 */
export function compatViz(html: string): string {
  if (html.includes('skeleton: viz')) return html
  const patched = html
    .replace(/document\.documentElement\.scrollHeight/g, 'document.body.scrollHeight+48')
    .replace(/<\/body>/i, LEGACY_VIZ_CONTRAST_JS + '</body>')
  const style = `<style id="ll-viz-compat">
html.ll-dark body{background:var(--dsw-alias-bg-base,rgb(21,21,23)) !important;color:var(--dsw-alias-label-primary,rgb(249,250,251)) !important;}
html.ll-dark .stage{background:var(--dsw-alias-bg-layer-1,rgb(35,35,36)) !important;border-color:var(--dsw-alias-border-l2,rgba(255,255,255,0.12)) !important;}
html.ll-dark .legend,html.ll-dark .controls label{color:var(--dsw-alias-label-secondary,rgb(207,211,214)) !important;}
html.ll-dark .controls button{background:var(--dsw-alias-state-business-tertiary,rgb(52,65,91)) !important;color:var(--dsw-alias-state-business-primary,rgb(103,158,254)) !important;border:none !important;border-radius:999px !important;}
html.ll-dark .fresh{background:color-mix(in srgb,var(--dsw-alias-state-success-primary,rgb(34,197,94)) 22%,transparent) !important;}
html.ll-dark .stale{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,rgb(242,90,90)) 22%,transparent) !important;}
html.ll-dark .controls input[type=range]{accent-color:var(--dsw-alias-state-business-primary,rgb(103,158,254));}
</style>`
  if (/<\/body>/i.test(patched)) return patched.replace(/<\/body>/i, style + '</body>')
  return patched + style
}

/**
 * Layout compat for chapters carrying the viz "full-bleed breakout" rule
 * (figure pulled 166px left across the ①-⑥ label column): the demo box
 * geometrically covers the element labels. Scoped back inside the body
 * column in-space; current templates no longer emit the breakout, so the
 * pattern match doubles as the legacy gate.
 */
export function compatChapter(html: string): string {
  if (!html.includes('margin:10px 0 4px -166px')) return html
  const style = `<style id="ll-chapter-compat">ol.elements .el-body figure.viz{margin:10px 0 4px !important;width:100% !important;max-width:100% !important;}</style>`
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, style + '</body>')
  return html + style
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
    // EMPTY href: srcDoc resolves it against the INHERITED base (the app
    // origin), so the default action loads the dsh SPA over the document —
    // the reported "TOC click opens the main UI in the reading pane" bug.
    // An empty href can never do anything useful in here: block it.
    if (!href) { ev.preventDefault(); return; }
    if (href.charAt(0) === '#') {
      // Fragment links (the TOC) are scrolled MANUALLY: under a <base> tag
      // (or any inherited-base quirk) the browser would resolve '#sec-x'
      // against the app origin and navigate the whole document away.
      ev.preventDefault();
      var id = href.slice(1);
      if (id === '') { window.scrollTo(0, 0); return; }
      try {
        var target = document.getElementById(id) || document.getElementById(decodeURIComponent(id));
        if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (e) {}
      return;
    }
    if (/^(blob:|data:|about:|javascript:|mailto:|tel:)/i.test(href)) return;
    ev.preventDefault();
    if (/^https?:/i.test(href)) { try { window.open(href, '_blank', 'noopener'); } catch (e) {} return; }
    try { parent.postMessage({ type: 'll-open', id: Date.now(), href: href }, '*'); } catch (e) {}
  }, true);
  document.addEventListener('submit', function (ev) { ev.preventDefault(); }, true);
})();</script>`
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, script + '</body>')
  return html + script
}

/**
 * Strip <base> tags from a srcDoc document: a base href redirects even
 * fragment-only links (#sec-x) to its origin — the browser then treats the
 * TOC click as a full navigation and loads that page (the dsh SPA) over the
 * document. In-space URL resolution is host-managed (viz blobs, ll-open
 * bridge), so a base tag can only do harm here.
 */
export function stripBaseTags(html: string): string {
  return html.replace(/<base\b[^>]*>/gi, '')
}

// - P1 anchor layer (excerpt bubble / section reports / badges) ---------------

/** Message types of the P1 anchor bridge (see the protocol table in
 * design/notes-roadmap.md; all travel with targetOrigin '*' because srcDoc
 * documents carry an opaque null origin). */
export const EXCERPT_REQUEST_TYPE = 'll-excerpt'
export const ANCHOR_REPORT_TYPE = 'll-anchor-report'
export const JUMP_COMMAND_TYPE = 'll-jump'
export const BLOCK_BADGES_TYPE = 'll-block-badges'
export const BLOCK_LOCATE_TYPE = 'll-block-locate'

/** One section of the open document as reported by the anchor layer
 * (id + display title; the list feeds breadcrumbs and the relation map). */
export interface SectionReportEntry {
  readonly id: string
  readonly title: string | null
}

/** Bubble labels — injected as literals because the iframe cannot reach the
 * host locale dictionary. */
export interface AnchorLayerLabels {
  readonly excerpt: string
  readonly done: string
  readonly fail: string
}

/**
 * Inject the P1 anchor layer into a srcDoc document (same mechanism as
 * {@link injectLinkGuard}: a style + script appended before </body>, so every
 * already-generated workspace document gains the abilities without being
 * re-rendered by the templates):
 *  - selection bubble → ll-excerpt requests (reply-driven status feedback);
 *  - the section LIST (id + title, ll-anchor-report) for breadcrumbs and the
 *    relation map — the document is static, so it fires on load/mutations
 *    only, never per scroll frame;
 *  - LINE-LEVEL note markers (ll-block-badges pushes): one 🗒 tag pinned to
 *    the left of the FIRST LINE of every excerpted paragraph, click reports
 *    ll-block-locate so the host focuses the matching note block;
 *  - ll-jump scrolls the document to a section (breadcrumb / map clicks).
 * Colors ride the injected dsw tokens exclusively, so the live ll-theme
 * channel re-skins the layer with zero coordination.
 */
export function injectAnchorLayer(html: string, labels: AnchorLayerLabels): string {
  const labelsJson = JSON.stringify(labels).replace(/<\//g, '<\\/')
  const style = `<style id="ll-anchor-style">
.ll-excerpt-bubble{position:fixed;z-index:2147483000;border:none;border-radius:14px;height:28px;padding:0 12px;font:inherit;font-size:12px;cursor:pointer;color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-bg-layer-1);box-shadow:var(--dsw-shadow-lv2,0 2px 8px 0 rgba(0,0,0,0.12));outline:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,0.2));}
.ll-excerpt-bubble:hover{background:var(--dsw-alias-interactive-bg-hover);}
.ll-excerpt-bubble.ll-excerpt-wait{opacity:0.6;cursor:default;}
.ll-excerpt-bubble.ll-excerpt-ok{color:var(--dsw-alias-state-success-primary);}
.ll-excerpt-bubble.ll-excerpt-no{color:var(--dsw-alias-state-warn-primary);}
/* line-level note marker: pinned to the left of the block's FIRST line */
.ll-block-mark{position:relative;}
.ll-block-badge{position:absolute;left:-26px;top:0;height:20px;padding:0 5px;border:none;border-radius:8px;font:inherit;font-size:11px;line-height:20px;cursor:pointer;user-select:none;color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-state-business-tertiary);}
.ll-block-badge:hover{background:var(--dsw-alias-interactive-bg-hover);}
</style>`
  const script = `<script id="ll-anchor-layer">(function () {
  if (window.parent === window) return;
  var LABELS = ${labelsJson};
  var SECTION_SEL = '[id^="sec-"],[id^="backfill-"]';
  // paragraph-level anchor targets: the marker precision unit ("行")
  var BLOCK_SEL = 'p,li,h3,h4,pre,blockquote,td,dd,dt';
  var blockCache = null;
  function allBlocks() {
    if (blockCache) return blockCache;
    var els = document.querySelectorAll(BLOCK_SEL);
    var out = [];
    for (var i = 0; i < els.length; i++) {
      // the TOC aside/nav is navigation, not content — never an anchor target
      if (els[i].closest && els[i].closest('aside,nav')) continue;
      out.push(els[i]);
    }
    blockCache = out;
    return out;
  }
  function blockIndexAt(node) {
    var el = elementOf(node);
    var block = el && el.closest ? el.closest(BLOCK_SEL) : null;
    if (!block) return null;
    var all = allBlocks();
    for (var i = 0; i < all.length; i++) if (all[i] === block) return i;
    return null;
  }
  var msgSeq = 0;
  function post(data) { try { parent.postMessage(data, '*'); } catch (e) {} }

  // section list report (titles only — the doc is static, so this is a
  // load/mutation-time notice, not a per-frame geometry stream)
  var lastReport = '';
  function titleOf(el) {
    if (el.__llTitle !== undefined) return el.__llTitle;
    var clone = el.cloneNode(true);
    var drop = clone.querySelectorAll('.nh,.ll-sec-badge,.ll-block-badge');
    for (var i = 0; i < drop.length; i++) { if (drop[i].parentNode) drop[i].parentNode.removeChild(drop[i]); }
    var t = (clone.textContent || '').replace(/\\s+/g, ' ').trim();
    if (t.length > 48) t = t.slice(0, 48);
    el.__llTitle = t;
    return t;
  }
  function reportSections() {
    var els = document.querySelectorAll(SECTION_SEL);
    var sections = [];
    for (var i = 0; i < els.length; i++) sections.push({ id: els[i].id, title: titleOf(els[i]) || null });
    var json = JSON.stringify(sections);
    if (json === lastReport) return;
    lastReport = json;
    post({ type: '${ANCHOR_REPORT_TYPE}', sections: sections });
  }
  var raf = 0;
  function scheduleReport() {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; reportSections(); });
  }
  window.addEventListener('load', scheduleReport);
  if (window.MutationObserver) new MutationObserver(scheduleReport).observe(document.documentElement, { childList: true, subtree: true });
  scheduleReport();

  // line-level note markers (ll-block-badges pushes from the host)
  var marked = [];
  function renderBlockBadges(list) {
    var wanted = {};
    for (var j = 0; j < list.length; j++) wanted[list[j].i] = list[j].n;
    for (var k = marked.length - 1; k >= 0; k--) {
      var m = marked[k];
      if (wanted[m.i] !== undefined) continue;
      if (m.badge.parentNode) m.badge.parentNode.removeChild(m.badge);
      m.el.classList.remove('ll-block-mark');
      marked.splice(k, 1);
    }
    var all = allBlocks();
    for (var j = 0; j < list.length; j++) {
      var idx = list[j].i;
      if (!(idx >= 0 && idx < all.length)) continue;
      var el = all[idx];
      var entry = null;
      for (var k = 0; k < marked.length; k++) if (marked[k].i === idx) { entry = marked[k]; break; }
      if (!entry) {
        var badge = document.createElement('button');
        badge.type = 'button';
        badge.className = 'll-block-badge';
        badge.setAttribute('aria-hidden', 'true');
        (function (index) {
          badge.addEventListener('click', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            post({ type: '${BLOCK_LOCATE_TYPE}', index: index });
          });
        })(idx);
        el.classList.add('ll-block-mark');
        el.appendChild(badge);
        entry = { i: idx, el: el, badge: badge };
        marked.push(entry);
      }
      entry.badge.textContent = wanted[idx] > 1 ? '\\uD83D\\uDDC2 ' + wanted[idx] : '\\uD83D\\uDDC2';
    }
  }

  // selection bubble -> ll-excerpt
  var bubble = null, pending = null;
  function hideBubble() {
    if (bubble && bubble.parentNode) bubble.parentNode.removeChild(bubble);
    bubble = null; pending = null;
  }
  function ensureBubble() {
    if (bubble) return bubble;
    bubble = document.createElement('button');
    bubble.type = 'button';
    bubble.className = 'll-excerpt-bubble';
    // keep the selection alive while pressing the bubble
    bubble.addEventListener('mousedown', function (ev) { ev.preventDefault(); ev.stopPropagation(); });
    bubble.addEventListener('click', function () { doExcerpt(); });
    document.body.appendChild(bubble);
    return bubble;
  }
  function elementOf(node) { return node && node.nodeType === 1 ? node : (node ? node.parentNode : null); }
  function walkUp(node, visit) {
    var el = elementOf(node);
    while (el && el.nodeType === 1) {
      var out = visit(el);
      if (out !== null) return out;
      el = el.parentNode;
    }
    return null;
  }
  function isSectionId(id) { return !!id && (/^sec-/.test(id) || /^backfill-/.test(id)); }
  // Section ownership of a selection. Callout sections (sec-obj/kp/summary)
  // WRAP their content, but the h2/h3 markers (sec-intro/core/practice/pit,
  // backfill-*) only PRECEDE theirs as siblings — an ancestor walk alone
  // misses all main-body text. Fallback: the nearest marker that precedes
  // the selection in document order (4 = DOCUMENT_POSITION_FOLLOWING).
  function sectionIdOf(node) {
    var el = elementOf(node);
    if (!el || el.nodeType !== 1) return null;
    if (isSectionId(el.id)) return el.id;
    var markers = document.querySelectorAll(SECTION_SEL);
    var last = null;
    for (var i = 0; i < markers.length; i++) {
      var m = markers[i];
      if (m === el || m.contains(el)) return m.id;
      if (el.contains(m)) continue;
      if (m.compareDocumentPosition(el) & 4) last = m;
    }
    return last ? last.id : null;
  }
  function kpOf(node) {
    return walkUp(node, function (el) {
      var kp = el.getAttribute && el.getAttribute('data-kp');
      return kp ? String(kp).slice(0, 32) : null;
    });
  }
  function inFormControl(node) {
    return walkUp(node, function (el) {
      var tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ? true : null;
    }) === true;
  }
  function settleSelection() {
    var sel = window.getSelection && window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    var text = sel.toString();
    if (!text || text.replace(/\\s+/g, '').length < 2 || text.length > 4000) return;
    if (inFormControl(sel.anchorNode)) return;
    var range = sel.getRangeAt(0);
    var rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) return;
    var b = ensureBubble();
    pending = { text: text, sectionId: sectionIdOf(range.startContainer), kp: kpOf(range.startContainer), blockIndex: blockIndexAt(range.startContainer) };
    b.className = 'll-excerpt-bubble';
    b.textContent = LABELS.excerpt;
    var left = Math.max(8, Math.min(rect.left + rect.width / 2 - 56, window.innerWidth - 120));
    b.style.left = left + 'px';
    b.style.top = (rect.top > 40 ? rect.top - 36 : rect.bottom + 8) + 'px';
  }
  document.addEventListener('mousedown', function (ev) {
    if (bubble && ev.target && bubble.contains(ev.target)) return;
    hideBubble();
  }, true);
  document.addEventListener('mouseup', function () { setTimeout(settleSelection, 10); });
  document.addEventListener('keyup', function (ev) { if (ev && ev.shiftKey) setTimeout(settleSelection, 10); });

  function doExcerpt() {
    if (!pending || !bubble) return;
    var payload = { type: '${EXCERPT_REQUEST_TYPE}', id: ++msgSeq, text: pending.text.slice(0, 2000), sectionId: pending.sectionId, kp: pending.kp, blockIndex: pending.blockIndex };
    var b = bubble;
    var replied = false;
    var onReply = function (ev) {
      var d = ev && ev.data;
      if (!d || d.type !== '${EXCERPT_REQUEST_TYPE}-result' || d.id !== payload.id) return;
      replied = true;
      window.removeEventListener('message', onReply);
      b.className = 'll-excerpt-bubble ' + (d.ok ? 'll-excerpt-ok' : 'll-excerpt-no');
      b.textContent = d.ok ? LABELS.done : LABELS.fail;
      setTimeout(hideBubble, 1400);
    };
    window.addEventListener('message', onReply);
    b.className = 'll-excerpt-bubble ll-excerpt-wait';
    post(payload);
    setTimeout(function () {
      if (replied) return;
      window.removeEventListener('message', onReply);
      hideBubble();
    }, 4000);
  }

  // host commands: line markers + section jump
  window.addEventListener('message', function (ev) {
    var d = ev && ev.data;
    if (!d || typeof d !== 'object' || typeof d.type !== 'string') return;
    if (d.type === '${BLOCK_BADGES_TYPE}' && d.blocks && typeof d.blocks === 'object') {
      var list = [];
      for (var q = 0; q < d.blocks.length; q++) {
        var b = d.blocks[q];
        if (b && typeof b.i === 'number' && b.i >= 0 && typeof b.n === 'number' && b.n > 0) list.push({ i: b.i, n: b.n });
      }
      renderBlockBadges(list.slice(0, 200));
      return;
    }
    if (d.type === '${JUMP_COMMAND_TYPE}' && typeof d.sectionId === 'string') {
      var target = document.getElementById(d.sectionId);
      if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
})();</script>`
  const layer = style + script
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, layer + '</body>')
  return html + layer
}

// - quiz draft auto-save ---------------------------------------------------------

/**
 * In-progress quiz answers are volatile: they live in the srcDoc form only,
 * so returning to dsh (or any srcDoc rebuild) wipes them. The injected draft
 * layer streams the RAW form-control state to the host on every edit
 * (debounced); the host caches it in localStorage keyed by workspace+doc.
 * Submitting is the commit point: the existing ll-submit flow writes the
 * answers json (the real data) and the draft is dropped — and a leftover
 * draft is suppressed whenever an answers file already exists, so the
 * submitted answers always win over any stale draft.
 */
export const DRAFT_SAVE_TYPE = 'll-draft-save'
export const DRAFT_READ_TYPE = 'll-draft-read'
export const DRAFT_CLEAR_TYPE = 'll-draft-clear'

/** Drafts must stay small form state; larger payloads are rejected outright. */
export const QUIZ_DRAFT_MAX_BYTES = 65536

/** localStorage key for one quiz's draft (host-side cache). */
export function quizDraftKey(root: string, docKey: string): string {
  const norm = (path: string): string => path.replace(/\\/g, '/').replace(/\/+$/, '')
  return 'learning-space:quiz-draft:' + norm(root) + ':' + norm(docKey)
}

/** Storage seam (localStorage in the app; a Map in tests). */
export interface QuizDraftStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** Read one draft; a corrupt entry is dropped on sight. */
export function readQuizDraft(store: QuizDraftStore | null, key: string): unknown | null {
  if (store === null) return null
  try {
    const raw = store.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw) as unknown
  } catch {
    try { store.removeItem(key) } catch { /* unreachable in practice */ }
    return null
  }
}

/** Persist one draft (best-effort: quota/privacy errors swallow silently). */
export function writeQuizDraft(store: QuizDraftStore | null, key: string, answers: unknown): void {
  if (store === null) return
  try { store.setItem(key, JSON.stringify(answers)) } catch { /* best-effort cache */ }
}

/** Drop one draft (on submit / when submitted answers exist). */
export function clearQuizDraft(store: QuizDraftStore | null, key: string): void {
  if (store === null) return
  try { store.removeItem(key) } catch { /* best-effort cache */ }
}

/**
 * Inject the quiz draft layer into a srcDoc document. Inert in chapter docs
 * (no <form>); activates in quiz/baseline forms:
 *  - input/change (capture, 500ms debounce) → ll-draft-save with the raw
 *    control state (radio→value, checkbox→values[], text/select→value);
 *  - on load → ll-draft-read; the host replies with the draft (or ok:false
 *    when none / already submitted) and the layer re-applies it;
 *  - on a successful ll-submit result → ll-draft-clear (the real answers
 *    json takes over).
 */
export function injectQuizDraft(html: string, docKey: string): string {
  const keyJson = JSON.stringify(docKey).replace(/</g, '\\u003c')
  const script = `<script id="ll-quiz-draft">(function () {
  if (window.parent === window) return;
  var DOC_KEY = ${keyJson};
  var form = document.querySelector('form');
  if (!form) return;
  var timer = 0, seq = 0;
  function post(data) { try { parent.postMessage(data, '*'); } catch (e) {} }
  function keyOf(c) { return c.name || c.id || ''; }
  function typeOf(c) { return c.type || c.tagName.toLowerCase(); }
  function collect() {
    var out = {};
    var els = form.querySelectorAll('input,textarea,select');
    for (var i = 0; i < els.length; i++) {
      var c = els[i], k = keyOf(c), t = typeOf(c);
      if (!k) continue;
      if (t === 'radio') { if (c.checked) out[k] = String(c.value); }
      else if (t === 'checkbox') {
        if (!Array.isArray(out[k])) out[k] = [];
        if (c.checked) out[k].push(String(c.value));
      }
      else { out[k] = String(c.value); }
    }
    return out;
  }
  function save() { post({ type: '${DRAFT_SAVE_TYPE}', docKey: DOC_KEY, answers: collect() }); }
  function scheduleSave() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(save, 500);
  }
  document.addEventListener('input', scheduleSave, true);
  document.addEventListener('change', scheduleSave, true);
  function fire(c) { try { c.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {} }
  function apply(answers) {
    var els = form.querySelectorAll('input,textarea,select');
    for (var i = 0; i < els.length; i++) {
      var c = els[i], k = keyOf(c), t = typeOf(c);
      if (!k || !(k in answers)) continue;
      var v = answers[k];
      if (t === 'radio') { if (typeof v === 'string') c.checked = (String(c.value) === v); }
      else if (t === 'checkbox') {
        if (Array.isArray(v)) { c.checked = v.indexOf(String(c.value)) !== -1; }
        else if (typeof v === 'boolean') { c.checked = v; }
      }
      else if (typeof v === 'string' && v.length <= 10000) {
        if (c.value !== v) { c.value = v; fire(c); }
      }
    }
  }
  window.addEventListener('message', function (ev) {
    var d = ev && ev.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === '${DRAFT_READ_TYPE}-result' && d.id === seq && d.ok && typeof d.content === 'string') {
      try { apply(JSON.parse(d.content)); } catch (e) {}
      return;
    }
    // a successful submit is the commit point: the real answers json exists
    // now, the draft cache must go
    if (d.type === 'll-submit-result' && d.ok) {
      post({ type: '${DRAFT_CLEAR_TYPE}', docKey: DOC_KEY });
    }
  });
  post({ type: '${DRAFT_READ_TYPE}', id: ++seq, docKey: DOC_KEY });
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
  | { readonly kind: 'll-excerpt'; readonly id: number; readonly text: string; readonly sectionId: string | null; readonly kp: string | null; readonly blockIndex: number | null }
  | { readonly kind: 'll-draft-read'; readonly id: number; readonly docKey: string }

/** Fire-and-forget notices from the anchor layer (no reply, no id — the
 * report stream is high-frequency, the locate click needs no ack). */
export type BridgeNotice =
  | { readonly kind: 'll-anchor-report'; readonly sections: readonly SectionReportEntry[] }
  | { readonly kind: 'll-block-locate'; readonly index: number }
  | { readonly kind: 'll-draft-save'; readonly docKey: string; readonly answers: unknown }
  | { readonly kind: 'll-draft-clear'; readonly docKey: string }

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
  // ll-excerpt: selection→note request from the anchor layer. Section ids are
  // validated down to null (document-level anchor) and block indexes to sane
  // integers, so a hostile document cannot smuggle payload junk through.
  if (kind === EXCERPT_REQUEST_TYPE && typeof (data as { text?: unknown }).text === 'string') {
    const sectionId = (data as { sectionId?: unknown }).sectionId
    const kp = (data as { kp?: unknown }).kp
    const blockIndex = (data as { blockIndex?: unknown }).blockIndex
    return {
      kind,
      id,
      text: (data as { text: string }).text,
      sectionId: typeof sectionId === 'string' && isSafeSectionId(sectionId) ? sectionId : null,
      kp: typeof kp === 'string' ? kp.slice(0, 32) : null,
      blockIndex: typeof blockIndex === 'number' && Number.isInteger(blockIndex) && blockIndex >= 0 && blockIndex <= 100000 ? blockIndex : null,
    }
  }
  // ll-draft-read: quiz draft restore request (host replies with the cached
  // raw form state, or ok:false when none / already submitted).
  if (kind === DRAFT_READ_TYPE && typeof (data as { docKey?: unknown }).docKey === 'string') {
    const docKey = (data as { docKey: string }).docKey
    if (docKey.length > 0 && docKey.length <= 512) return { kind, id, docKey }
    return null
  }
  return null
}

/**
 * Validate an incoming MessageEvent as an anchor-layer NOTICE from our
 * iframe: same source check as {@link parseBridgeMessage}, but for the
 * reply-less traffic (section reports, badge locate clicks). Every entry is
 * shape-checked — geometry must be finite numbers, ids charset-safe.
 */
export function parseBridgeNotice(event: MessageEvent, iframe: HTMLIFrameElement | null): BridgeNotice | null {
  if (iframe === null || event.source !== iframe.contentWindow) return null
  const data = event.data
  if (typeof data !== 'object' || data === null) return null
  const kind = (data as { type?: unknown }).type
  if (kind === ANCHOR_REPORT_TYPE) {
    const rawSections = (data as { sections?: unknown }).sections
    if (!Array.isArray(rawSections)) return null
    const sections: SectionReportEntry[] = []
    for (const entry of rawSections) {
      if (typeof entry !== 'object' || entry === null) return null
      const record = entry as Record<string, unknown>
      if (typeof record.id !== 'string' || !isSafeSectionId(record.id)) return null
      if (record.title !== undefined && record.title !== null && typeof record.title !== 'string') return null
      sections.push({ id: record.id, title: typeof record.title === 'string' ? record.title : null })
    }
    return { kind: ANCHOR_REPORT_TYPE, sections }
  }
  // line-marker click: which content block (document-order index) to focus
  if (kind === BLOCK_LOCATE_TYPE) {
    const index = (data as { index?: unknown }).index
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index > 100000) return null
    return { kind: BLOCK_LOCATE_TYPE, index }
  }
  // quiz draft notices: docKey must be a sane string, the draft payload an
  // in-size-limit object (raw form state, never arrays/scalars).
  const docKey = (data as { docKey?: unknown }).docKey
  if (typeof docKey !== 'string' || docKey.length === 0 || docKey.length > 512) return null
  if (kind === DRAFT_SAVE_TYPE) {
    const answers = (data as { answers?: unknown }).answers
    if (typeof answers !== 'object' || answers === null || Array.isArray(answers)) return null
    if (JSON.stringify(answers).length > QUIZ_DRAFT_MAX_BYTES) return null
    return { kind: DRAFT_SAVE_TYPE, docKey, answers }
  }
  if (kind === DRAFT_CLEAR_TYPE) {
    return { kind: DRAFT_CLEAR_TYPE, docKey }
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

// - host → iframe commands (anchor layer) ----------------------------------------

/** Scroll the open document to a section (smooth; the template's
 * scroll-margin-top keeps the heading clear of the viewport top). */
export function postSectionJump(target: Window, sectionId: string): void {
  target.postMessage({ type: JUMP_COMMAND_TYPE, sectionId }, '*')
}

/** Push the line-level note markers: one 🗒 tag per excerpted content block
 * (index + anchor count); empty list clears them all. */
export function postBlockBadges(target: Window, blocks: ReadonlyArray<{ index: number; count: number }>): void {
  target.postMessage({ type: BLOCK_BADGES_TYPE, blocks: blocks.map(entry => ({ i: entry.index, n: entry.count })) }, '*')
}
