import { ColorScheme, PrefStore, type ColorSchemeName } from "spell/util/persist"
import { escapeHTML } from "spell/util/string"
import type { ServerConfig, ServerInfo } from "spell/server"
import { EDIT_PREF, FAVICON_SVG, litTab, LOGO_MARK, SITE_HOME, SITE_PREFS, type SiteTab } from "spell/server/site"
// a leaf, not the node barrel:  the rule the live client lays a worktree page's root links under too
import { worktreeHref } from "spell/server/liveClient"

/****************
 * ### `<spell-site-header>`
 * The fixed bar on top of every page of the site, with a tab to switch to each of its parts:
 * e.g. docs, epic pages, sagas, component sets, an app.
 * - The tabs are DATA (`SiteTab`):  this element names no site's parts (epic `repo-split` I4).
 *   - the page server's settings' (`"siteTabs"`), on the page as `SPELL_SERVER.siteTabs`;  none:  no tabs
 *   - the lit one:  `litTab()`
 * - In each page and template, right after `<body>`:  `<spell-site-header></spell-site-header>`.
 *   - pages are SERVED, never opened from disk (epic `epic-engine` P46, Q5):  its links are root paths
 *     (`/guides/index.html`), laid under a worktree's address on a worktree's page (`worktreeHref()`)
 *   - its `root` (the path to the repo root, for a page opened from disk) and the bundles' fallback tabs went in P46
 * - Brand:  the hat mark (`LOGO_MARK`), a link to the home page (`SITE_HOME`), which lights no tab.
 * - Also shows:
 *   - no breadcrumb (Owen, 2026-10-10:  "We don't need the breadcrumb in the spell doc toolbar"):
 *     the lit tab says where the page is, the page's own title what it is
 *   - narrow (720px or less:  VS Code's side bar, a phone):  the tabs scroll sideways;
 *     the pages' own eyebrow crumbs hide at that width
 *     - a `‹` / `›` at each end while there's more that way, over the row (as Spell UI's `<ui-toolbar>`):
 *       a click scrolls most of a row;  out of the Tab order, the tabs themselves are what a keyboard reaches
 *       (epic `epic-engine` I138:  the row stopped at Epic/UI, nothing saying more was past it)
 *   - the checkout serving it:  `⎇ <worktree or branch>` (served pages only)
 *   - "open in VS Code":  a `vscode://file/...` link to the page's source
 *   - edit mode (pages the page server serves):  hover a section, edit its source in place -- `<spell-section-editor>`
 *   - neither in a FRAME (VS Code's side bar):  they do nothing there
 *   - light / dark:  ONE button showing the scheme the page shows (sun / moon);  a click flips it
 *     - until the first click, it follows the OS
 *     - flipping BACK to the OS's own scheme follows the OS again, so two clicks always undo one (`flipTheme()`)
 *     - kept, shown and followed by `ColorScheme` (`spell/util/persist`):
 *       the one choice every Spell site shares, Spell UI's `ThemePreference` too
 *       - shown as `ui-light` / `ui-dark` on `<html>` (UI's tokens, `--ui-scheme`)
 *         AND as inline `color-scheme` (pages without UI's sheets, and this bar's own `light-dark()`)
 *       - follows the OS while it changes, and other tabs' switches
 *   - the icon shows what `<html>` shows:  a page that switches its own scheme
 *     (toggles `ui-light` / `ui-dark`, as Spell App's pill does) re-draws it too,
 *     through a `MutationObserver` on `<html>`'s class;  a click then flips from what the page shows
 * - Self-contained:  its own shadow DOM and CSS, no UI elements, so it looks the same on every property.
 * - Tooltips:  the browser's own, a `title` on each link and button (the logo, the pencil, `<>`, the theme)
 *   - its icon takes no pointer (`pointer-events: none`):  the pointer lands on the titled element ITSELF
 *   - why:  VS Code's side bar (Electron 38 and up, on macOS) shows a `title` only on the element under the pointer,
 *     not on its parent (electron/electron#49843;  epic `epic-engine` I43)
 * - `docked`:  a compact row in place, not a fixed bar, inside the page's own chrome
 *   (the Spell UI site's side column and top bar)
 *   - no light / dark button (the page has its own)
 *   - no room kept on the page (`--spell-site-header-height` is 0)
 * - `no-tools`:  no edit button and no "open in VS Code" link,
 *   for a page whose own chrome has no use for them (the Spell UI site's)
 *   - edit mode stays off there too (`readEdit()`)
 * - Parts, for a page that docks it:
 *   - `bar`:  the row
 *   - `nav`:  its links;  the Spell UI site's top bar keeps them on one line, scrolling sideways
 *   - `brand`:  the hat;  that bar hides it where its own brand already shows the hat
 * - Re-draws on `spell-site:navigated` (a router swapped the page in place:  new title, new source file).
 * - SIDE EFFECT:  adds a `<style>` to the page:  `--spell-site-header-height`, body padding, scroll padding.
 * - SIDE EFFECT:  adds Spell's favicon (`FAVICON_SVG`, as a `data:` URI) to a page that links no icon:
 *   `file://` pages, and servers that don't inject one (the page server's `WebServer` does).
 ****************/
export class SiteHeader extends HTMLElement {
  /** the tag */
  static readonly tag = "spell-site-header"

  /** height of the bar, px:  also `--spell-site-header-height` */
  static readonly height = 44

  /** define the element, once */
  static define(): void {
    if (!customElements.get(SiteHeader.tag)) customElements.define(SiteHeader.tag, SiteHeader)
  }

  /** event a router dispatches on `document` after swapping the page in place:  re-draw */
  static readonly PAGE_EVENT = "spell-site:navigated"

  /** server info, once known:  injected `SPELL_SERVER`, else `/api/server` */
  private info?: Partial<ServerInfo & ServerConfig>

  /** re-draw on `PAGE_EVENT` */
  private readonly onPage = () => this.render()

  /**
   * Stops following the OS's scheme and other tabs' choices (`ColorScheme.watch()`), while connected:
   * either one re-draws (the button shows the scheme the page shows).
   */
  private stopWatchingScheme?: () => void

  /** follows the tabs' row while connected:  its size and its tabs', for the `‹` / `›` (`showScrollKeys()`) */
  private readonly tabsResize = new ResizeObserver(() => this.showScrollKeys())

  /** the scheme the icon shows now, so `<html>` class changes that keep it re-draw nothing */
  private drawnTheme?: ColorSchemeName

  /** watches `<html>`'s class while connected:  a page that switches its own scheme */
  private readonly pageScheme = new MutationObserver(() => {
    if (ColorScheme.shown() !== this.drawnTheme) this.render()
  })

  connectedCallback(): void {
    ColorScheme.apply(ColorScheme.chosen())
    installPageStyle(this.docked)
    installFavicon()
    if (!this.shadowRoot) this.attachShadow({ mode: "open" })
    this.info = serverConfig()
    this.render()
    document.addEventListener(SiteHeader.PAGE_EVENT, this.onPage)
    this.stopWatchingScheme ??= ColorScheme.watch(() => this.render())
    this.pageScheme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    if (!this.info && location.protocol.startsWith("http")) void this.ping()
  }

  disconnectedCallback(): void {
    document.removeEventListener(SiteHeader.PAGE_EVENT, this.onPage)
    this.stopWatchingScheme?.()
    this.stopWatchingScheme = undefined
    this.pageScheme.disconnect()
    this.tabsResize.disconnect()
  }

  /** a compact row inside the page's own chrome, not the fixed bar (the `docked` attribute) */
  get docked(): boolean {
    return this.hasAttribute("docked")
  }

  /** The tabs this page shows, in order:  its server's (`SPELL_SERVER.siteTabs`);  none off the server. */
  get tabs(): readonly SiteTab[] {
    return serverConfig()?.siteTabs ?? []
  }

  /**
   * The URL of `tab`'s home (or the site's, `SITE_HOME`):  a root path.
   * - A worktree's page on the main checkout's server (`/worktrees/<w>/...`) keeps that prefix on repo paths
   *   (`worktreeHref()`, the rule every root link on the page follows):  a tab stays in the worktree, so a tab only
   *   the branch has (Brand, before it merges) is no 404 there.
   * - A tab given as a root path (`/components/ui/`, `/editor/`) is a server route:  never prefixed.
   */
  href(tab: Pick<SiteTab, "path">): string {
    if (tab.path.startsWith("/")) return tab.path
    return worktreeHref(`/${tab.path}`, location.pathname)
  }

  /**
   * Absolute path of the page's source file, for VS Code;  `undefined` when unknown (a proxied page).
   * - served:  the file the server served (`SPELL_SERVER.source`), wherever it lives
   *   - e.g. a guide, from the content folder:  `.../spell-app.epics/guides/x.html`
   *   - epic `epic-engine` I42:  `root` + `file` gave `.../spell-app/guides/x.html`, which doesn't exist
   *     since the guides moved to the content folder (epic `epic-eject` P12;  `file` is the page's path in it)
   * - a server from before `source`:  `root` + `file`, right for the checkout's own pages
   */
  get sourceFile(): string | undefined {
    if (location.protocol === "file:") return decodeURIComponent(location.pathname)
    const config = serverConfig()
    if (config?.source) return config.source
    if (config?.root && config.file) return config.root + decodeURIComponent(config.file)
    return undefined
  }

  /** draw the bar */
  render(): void {
    const shadow = this.shadowRoot!
    const path = location.pathname
    const active = litTab(this.tabs, path)
    const links = this.tabs
      .map((tab) => {
        const href = this.href(tab)
        const current = tab === active ? ` aria-current="page"` : ""
        // its own tab:  `target` in a browser;  `data-spell-open` tells the side bar's frame (`liveClient.ts`)
        const own = tab.ownTab ? ` target="spell-${escapeHTML(tab.name.toLowerCase())}" data-spell-open="browser"` : ""
        return `<a class="tab" href="${escapeHTML(href)}"${current}${own}>${escapeHTML(tab.name)}</a>`
      })
      .join("")
    const checkout = this.info?.worktree ?? this.info?.branch
    const badge = checkout
      ? `<span class="badge${this.info?.worktree ? " worktree" : ""}" title="${escapeHTML(this.info?.root ?? "")}">⎇ ${escapeHTML(checkout)}</span>`
      : ""
    // framed (VS Code's side bar):  no "open in VS Code" (a framed page can't follow a `vscode://` link)
    // and no edit mode -- they did nothing there (Owen, 2026-10-08);  a browser tab keeps both
    const framed = window.self !== window.top
    // `no-tools`:  a page whose chrome has no use for them
    // (the Spell UI site's, Owen 2026-10-23:  "they don't do anything anyway")
    const noTools = this.hasAttribute("no-tools")
    const file = framed || noTools ? undefined : this.sourceFile
    const vscode = file
      ? `<a class="tool" href="vscode://file${escapeHTML(encodeURI(file))}" title="Open the source in VS Code" aria-label="Open the source in VS Code">${ICONS.code}</a>`
      : ""
    const canEdit = !framed && !noTools && Boolean(serverConfig()?.token)
    const editing = canEdit && readEdit()
    const edit = canEdit
      ? `<button class="tool${editing ? " on" : ""}" data-action="edit" aria-pressed="${editing}" title="Edit sections in place" aria-label="Edit sections in place">${ICONS.pencil}</button>`
      : ""
    const shown = ColorScheme.shown()
    this.drawnTheme = shown
    const themeLabel = this.themeLabel()
    shadow.innerHTML = `<style>${STYLE}</style>
<header part="bar">
  <a class="brand" part="brand" href="${escapeHTML(this.href({ path: SITE_HOME }))}" title="Spell docs" aria-label="Spell docs">${LOGO_MARK}</a>
  <div class="tabs">
    <button class="scroll" data-scroll="-1" tabindex="-1" aria-hidden="true" title="${SCROLL_BACK}">‹</button>
    <nav part="nav" aria-label="Site">${links}</nav>
    <button class="scroll" data-scroll="1" tabindex="-1" aria-hidden="true" title="${SCROLL_ON}">›</button>
  </div>
  <span class="spacer"></span>
  ${badge}${edit}${vscode}
  ${this.docked ? "" : `<button class="tool" data-action="theme" title="${themeLabel}" aria-label="${themeLabel}">${ICONS[shown]}</button>`}
</header>`
    const themeButton = shadow.querySelector<HTMLButtonElement>(`[data-action="theme"]`)
    if (themeButton) themeButton.onclick = () => this.flipTheme()
    const editButton = shadow.querySelector<HTMLButtonElement>(`[data-action="edit"]`)
    if (editButton) editButton.onclick = () => this.toggleEdit()
    this.wireScrollKeys()
  }

  /**
   * The tabs' `‹` / `›`:  each scrolls the row by most of its width;  shown while there's more that way.
   * - SIDE EFFECT:  the lit tab scrolled into the row, once drawn
   * - never `docked`:  its tabs wrap, or the page's own bar scrolls them
   */
  private wireScrollKeys(): void {
    const nav = this.shadowRoot!.querySelector<HTMLElement>("nav")
    if (!nav || this.docked) return
    nav.onscroll = () => this.showScrollKeys()
    for (const key of this.shadowRoot!.querySelectorAll<HTMLButtonElement>("[data-scroll]"))
      key.onclick = () =>
        nav.scrollBy({ left: Number(key.dataset.scroll) * nav.clientWidth * SCROLL_SHARE, behavior: "smooth" })
    this.tabsResize.disconnect()
    this.tabsResize.observe(nav)
    nav.querySelector<HTMLElement>(`[aria-current="page"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" })
    this.showScrollKeys()
  }

  /** Show `‹` while the tabs' row can scroll back, `›` while it can scroll on (`data-more` on `.tabs`). */
  private showScrollKeys(): void {
    const nav = this.shadowRoot?.querySelector<HTMLElement>("nav")
    const tabs = nav?.parentElement
    if (!nav || !tabs) return
    const more = [nav.scrollLeft > 1 && "start", nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1 && "end"]
    tabs.dataset.more = more.filter(Boolean).join(" ")
  }

  /**
   * The theme button's name:  what the page shows, and what a click does.
   * - `Dark, as the OS (click:  light)` while following the OS
   * - `Light (click:  dark, as the OS)` when a click goes back to following it
   */
  private themeLabel(): string {
    const chosen = ColorScheme.chosen()
    const os = ColorScheme.osScheme()
    const shown = ColorScheme.shown()
    const next = shown === "dark" ? "light" : "dark"
    const name = { light: "Light", dark: "Dark" }[shown]
    if (!chosen && shown === os) return `${name}, as the OS (click:  ${next})`
    return `${name} (click:  ${next}${next === os ? ", as the OS" : ""})`
  }

  /**
   * Flip the scheme the page shows (`<html>`'s, which a page may have switched itself):  light <-> dark.
   * - Landing on the OS's own scheme FORGETS the choice:  the page follows the OS again.
   * - Why:  the one way back to the OS without an extra state.
   *   - a bar has no room for Spell UI's "Match system" switch
   *   - a third "auto" state on one button makes every other click look like it did nothing
   */
  private flipTheme(): void {
    const next: ColorSchemeName = ColorScheme.shown() === "dark" ? "light" : "dark"
    ColorScheme.choose(next === ColorScheme.osScheme() ? undefined : next)
    this.render()
  }

  /** edit mode on / off, for this tab;  tells `<spell-section-editor>` */
  private toggleEdit(): void {
    const on = !readEdit()
    tabPrefs.set(EDIT_PREF, on ? EDIT_ON : undefined)
    document.dispatchEvent(
      new CustomEvent(on ? "spell-site:edit-opened" : "spell-site:edit-closed", { detail: { on } })
    )
    this.render()
  }

  /** ask the server who it is, for the badge (pages it proxies have no `SPELL_SERVER`) */
  private async ping(): Promise<void> {
    try {
      const answer = await fetch("/api/server")
      if (!answer.ok) return
      this.info = (await answer.json()) as ServerInfo
      this.render()
    } catch {
      // not the page server
    }
  }
}

/** This tab's preferences:  edit mode, `spell-site:edit`. */
const tabPrefs = new PrefStore(SITE_PREFS, { place: "session" })

/** How much of the tabs' row one `‹` / `›` click scrolls:  most of it, so the tab cut at its end shows whole. */
const SCROLL_SHARE = 0.8

/** The `‹` / `›` buttons' tooltips. */
const SCROLL_BACK = "Scroll the tabs back"
const SCROLL_ON = "More tabs"

/** Edit mode on, as kept:  `1`, as it always was. */
const EDIT_ON = 1

/** The page's `window.SPELL_SERVER`, if the page server injected one. */
export function serverConfig(): ServerConfig | undefined {
  return (window as unknown as { SPELL_SERVER?: ServerConfig }).SPELL_SERVER
}

/**
 * Whether edit mode is on in this tab.
 * - never on a page whose header hides the tools (`no-tools`):
 *   its switch is gone there, so edit mode, once on, could never be turned off
 */
export function readEdit(): boolean {
  if (document.querySelector(`${SiteHeader.tag}[no-tools]`)) return false
  return tabPrefs.get(EDIT_PREF) === EDIT_ON
}

/**
 * Add the page-level rules once:  header height, room for the bar, anchors below it.
 * - `docked`:  no fixed bar, so no room:  the height is 0
 * - a page holding both a fixed and a docked header keeps the first one's rules
 */
function installPageStyle(docked: boolean): void {
  if (document.getElementById("spell-site-header-page")) return
  const style = document.createElement("style")
  style.id = "spell-site-header-page"
  const height = docked ? 0 : SiteHeader.height
  style.textContent = `:root { --spell-site-header-height: ${height}px; scroll-padding-top: var(--spell-site-header-height); }
html body { padding-top: var(--spell-site-header-height); }`
  document.head.append(style)
}

/** Add Spell's favicon, as a `data:` URI, unless the page already links an icon (e.g. the page server's). */
function installFavicon(): void {
  if (document.head.querySelector(`link[rel~="icon" i]`)) return
  const link = document.createElement("link")
  link.rel = "icon"
  link.type = "image/svg+xml"
  link.href = `data:image/svg+xml,${encodeURIComponent(FAVICON_SVG)}`
  document.head.append(link)
}

/** Inline icons:  24-unit stroke SVGs, `currentColor`. */
const ICONS: Record<string, string> = {
  code: svg(`<path d="M8 6 2 12l6 6M16 6l6 6-6 6"/>`),
  pencil: svg(`<path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/>`),
  light: svg(
    `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>`
  ),
  dark: svg(`<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>`)
}

/** An icon from SVG `body`. */
function svg(body: string): string {
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`
}

/**
 * The bar's look:  follows the page's `color-scheme` through `light-dark()`.
 * - a page may set its fill, the rule under it and its shadow
 *   (`--spell-site-header-fill`, `--spell-site-header-rule`, `--spell-site-header-shadow`):
 *   an epic page lays it on its own background, one block with its header (epic `epic-engine` I100)
 */
const STYLE = `
:host { display: block; }
header {
  box-sizing: border-box;
  position: fixed; inset: 0 0 auto 0; z-index: 1000; height: ${SiteHeader.height}px;
  display: flex; align-items: center; gap: 12px; padding: 0 16px;
  font: 500 14px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  color: light-dark(#1d1d22, #ececf1);
  /* the fill under the tabs' ‹ / ›, which hide the tab they sit on:  the page's, else opaque */
  --_fill: var(--spell-site-header-fill, light-dark(#fff, #18181c));
  background: var(--spell-site-header-fill, light-dark(rgb(255 255 255 / 0.86), rgb(24 24 28 / 0.86)));
  backdrop-filter: saturate(1.4) blur(10px); -webkit-backdrop-filter: saturate(1.4) blur(10px);
  border-bottom: 1px solid var(--spell-site-header-rule, light-dark(#e3e0d8, #34343b));
  box-shadow: var(--spell-site-header-shadow, none);
}
a { color: inherit; text-decoration: none; }
.brand { flex: none; display: inline-flex; align-items: center; color: light-dark(#5b3fd0, #b3a2ff); }
.brand svg { display: block; height: 26px; width: auto; }
nav { display: flex; gap: 2px; }
.tabs { position: relative; display: flex; min-width: 0; }
/* the tabs' ‹ / ›:  over the row's ends, the row fading out under them;  only while there's more that way */
.scroll {
  position: absolute; inset-block: 0; z-index: 1; display: none; place-items: center; width: 26px; padding: 0;
  border: 0; color: inherit; font-size: 18px; font-weight: 600; line-height: 1; cursor: pointer;
}
.scroll[data-scroll="-1"] {
  left: 0; background: linear-gradient(to right, var(--_fill) 55%, transparent);
}
.scroll[data-scroll="1"] {
  right: 0; background: linear-gradient(to left, var(--_fill) 55%, transparent);
}
.tabs[data-more~="start"] > .scroll[data-scroll="-1"], .tabs[data-more~="end"] > .scroll[data-scroll="1"] { display: grid; }
.tab { padding: 7px 10px; border-radius: 999px; color: light-dark(#55555f, #a9a9b6); white-space: nowrap; }
.tab:hover { background: light-dark(#f0eef8, #2c2a38); color: inherit; }
.tab[aria-current="page"] { background: light-dark(#e9e4ff, #33295e); color: light-dark(#3d2a9e, #d9d0ff); }
.spacer { flex: 1; }
.badge { flex: none; padding: 4px 9px; border-radius: 999px; font-size: 12px; background: light-dark(#eef0f3, #2a2d33); }
.badge.worktree { background: light-dark(#fff1d6, #4a3610); color: light-dark(#7a4c00, #ffd48a); }
.tool {
  flex: none; display: inline-grid; place-items: center; width: 30px; height: 30px; padding: 0;
  border: 0; border-radius: 999px; background: none; color: light-dark(#55555f, #a9a9b6); cursor: pointer;
}
.tool:hover { background: light-dark(#f0eef8, #2c2a38); color: inherit; }
.tool.on { background: light-dark(#e9e4ff, #33295e); color: light-dark(#3d2a9e, #d9d0ff); }
/* the icons take no pointer:  it lands on the titled link or button, so Electron shows its tooltip (I43) */
.brand svg, .tool svg { pointer-events: none; }
.tool:focus-visible, .tab:focus-visible, .brand:focus-visible { outline: 2px solid light-dark(#5b3fd0, #b3a2ff); outline-offset: 2px; }
/* docked:  a compact row in the page's own chrome */
:host([docked]) header {
  position: static; height: auto; flex-wrap: wrap; gap: 4px 6px; padding: 0;
  font-size: 13px; background: none; border: 0; backdrop-filter: none; -webkit-backdrop-filter: none;
}
:host([docked]) nav { flex-wrap: wrap; }
:host([docked]) .tabs { display: contents; }
:host([docked]) .brand svg { height: 20px; }
:host([docked]) .tab { padding: 5px 8px; }
:host([docked]) .tool { width: 26px; height: 26px; }
:host([docked]) .tool svg { width: 16px; height: 16px; }
/* narrow (VS Code's side bar, a phone):  the tabs scroll sideways;
   the pages' own eyebrow crumbs hide at the same width (spell-doc.css, <epic-page>'s Crumbs.css) */
@media (max-width: 720px) {
  header { gap: 6px; padding: 0 8px; }
  .tabs { flex: 1; }
  nav { overflow-x: auto; flex: 1; scrollbar-width: none; }
  .spacer { display: none; }
  .tab { padding: 7px 8px; }
  .badge { display: none; }
}
`
