// Import directly:  in `core`'s util barrel it cost every page 1.9 kB
import { PrefStore } from "spell/util/persist/PrefStore"
import { beforeNextPaint, nextFrame } from "spell-ui/util"
import { SiteData } from "spell-ui/docs-components/SiteData"
// Leaves, not the barrel:  the barrel defines `<ui-toc>`, which `<ui-root>` does on first use
import { HashLanding, type HashLandingRules, type LandingScroll } from "spell-ui/components/ui-toc/HashLanding"
import { TocIndex } from "spell-ui/components/ui-toc/TocIndex"
import { FOLDS_KEY, OLD_FOLDS_KEY } from "./site.types"

/****************
 * ### `SiteSections`
 * The page side of the site's nested `<ui-section>`s (written into the pages by `yarn site:sections`):
 * where their titles stick, which sections the viewer closed, and LANDING on a `#hash`.
 * - ONE per page (`SiteSections.instance`), following whichever `main` the router shows (`show()`).
 * - Sticky:  the page header's title line sticks under the top bar, and the tabs' bar under it
 *   (`site.css`, "The page header" and "Sections and tabs").
 *   - Every top-level section's title sticks just below them:  its `offset` (px) is set here,
 *     from their measured heights and `--site-top` (resolved through a hidden probe).
 *     Again whenever the bar, the title line or the window resizes.
 *   - Nested titles stack below their parents' (the element does that).
 *   - The same line goes on `main` as `--site-sections-top`,
 *     for the browser's own anchor scrolling (`scroll-margin-top`).
 *   - A page's own sticky bar (`PAGE_BAR`) stacks between.
 * - Closed sections:  remembered per page, in `localStorage` through `PrefStore`
 *   (`FOLDS_KEY` + the path:  `{ [section id]: closed }`).
 *   - The viewer's (`ui-opening` / `ui-closing` that can be cancelled) are saved, and restored on every visit.
 *   - Everything else starts as its markup says:  open, or closed by `open="false"` (Epic UI's pages start folded).
 *   - The same key and shape as the docs runtime's (`spell-folds:<path>`), so every page remembers its folds alike;
 *     what the site kept under its old key (`spell-ui-site:folds:<path>`) moves over on first read.
 *   - An opening made by a landing, or by find-in-page, is never saved.
 * - Landing (`land()`), through Spell UI's `HashLanding`, by the site's rules (`landingRules()`):
 *   - the target's pane selected (the first word of a section id IS its tab:  `#usage-keyboard`)
 *   - every section around it (and itself) opened without animation
 *   - then scrolled so its title sits just below the stuck ones
 *   - once more as the page settles, unless the viewer scrolled, clicked or typed meanwhile
 *   - The site lands every hash itself:  `<ui-toc>` and `<ui-docs-api>` leave them to it, so a page opened at
 *     a `#hash` scrolls once, not once per element.
 *   - Old hashes still land (`resolve()`).
 * - SIDE EFFECTS:
 *   - document `ui-opening` / `ui-closing` and window `hashchange` / `resize` listeners, a `ResizeObserver`
 *   - the page's `HashLanding` set to the site's rules
 *   - the probe `<div>` in `<body>`
 *   - `offset` attributes on the sections, an inline `--site-sections-top` on `main`
 *   - `history.replaceState()` of an old hash to the id it found
 ****************/
export class SiteSections {
  /** The one instance, made on first use:  static, as the page has one set of sections and one scroll. */
  static get instance(): SiteSections {
    return (SiteSections.only ??= new SiteSections())
  }
  private static only?: SiteSections

  /** The page's `main`, from the last `show()`. */
  private main?: HTMLElement

  /** Where top-level titles stick, px from the viewport's top (last `measure()`). */
  private top = 0

  /** Resolves `--site-top` to pixels (`site.css` `.site-sections-probe`). */
  private readonly probe: HTMLElement

  /** Re-measures when the tabs' bar resizes (its labels wrap, the font loads). */
  private readonly resized = new ResizeObserver(() => this.measure())

  /** The page's landing, by the site's rules. */
  private readonly landing: HashLanding

  private constructor() {
    this.probe = document.createElement("div")
    this.probe.className = "site-sections-probe"
    this.probe.setAttribute("aria-hidden", "true")
    document.body.append(this.probe)
    document.addEventListener("ui-opening", (event) => this.onToggle(event as CustomEvent<{ open: boolean }>))
    document.addEventListener("ui-closing", (event) => this.onToggle(event as CustomEvent<{ open: boolean }>))
    window.addEventListener("hashchange", () => this.onHash())
    this.landing = HashLanding.forDocument(document).use(this.landingRules())
    window.addEventListener("resize", () => this.measure(), { passive: true })
    window.addEventListener("scroll", () => this.markTabsStuck(), { passive: true })
  }

  /**
   * Keep the stuck tabs and their section toolbar ONE panel as the page scrolls,
   * so no content shows under the tabs (Owen, 2026-10-23:  "Don't show content underneath tabs when scrolling up").
   * - `main` gets `site-tabs-stuck` while the tabs' bar is stuck at its line:
   *   the strip round the panel shows then (`site.css` for tabs alone, spell-toolbar.css under a toolbar)
   * - `main` gets `site-head-stuck` once the page has scrolled at all:  the page header's title line tightens
   * - At a pane's end, its toolbar stops sticking first (its pane ends before the tabs' box does).
   *   The tabs follow it up by `--site-tabs-leave` (px), so the two leave together, never the track alone over the page.
   * - Once a frame at most, while the page scrolls.
   */
  private markTabsStuck(): void {
    if (this.isMarkingStuck) return
    this.isMarkingStuck = true
    beforeNextPaint(() => {
      this.isMarkingStuck = false
      const main = this.main
      if (!main?.isConnected) return
      // the page header's title line is stuck once the page has scrolled at all:  it sits at its line from the start
      main.classList.toggle(HEAD_STUCK, scrollY > 0)
      const bar = SiteSections.barOf(main)
      if (!bar) return
      // tabs that scroll away with the page (phones):  never stuck, never leaving
      if (!SiteSections.sticks(bar)) {
        if (main.style.getPropertyValue(TABS_LEAVE)) main.style.removeProperty(TABS_LEAVE)
        main.classList.remove(TABS_STUCK)
        return
      }
      // how far the joined toolbar has moved up from where it sticks:  0 until its pane ends
      const pageBar = main.querySelector<HTMLElement>(PAGE_BAR)
      const part = pageBar?.matches(JOINED_BAR)
        ? pageBar.shadowRoot?.querySelector<HTMLElement>('[part~="sticky"]')
        : null
      const offset = parseFloat(pageBar?.getAttribute("offset") ?? "")
      // a toolbar in a hidden pane draws no box:  it isn't leaving, it isn't there
      const box = part?.getBoundingClientRect()
      const leave = box?.height && Number.isFinite(offset) ? Math.max(0, Math.round(offset - box.top)) : 0
      const value = `${leave}px`
      if (main.style.getPropertyValue(TABS_LEAVE) !== value) main.style.setProperty(TABS_LEAVE, value)
      const line = parseFloat(getComputedStyle(bar).top) || 0
      const isStuck = Math.abs(bar.getBoundingClientRect().top + leave - line) < 1.5
      main.classList.toggle(TABS_STUCK, isStuck && scrollY > 0)
    })
  }

  /** A frame is already asked for (`markTabsStuck()`). */
  private isMarkingStuck = false

  ////////////////
  // ## Showing a page
  ////////////////

  /**
   * Where top-level titles stick, px from the viewport's top (the last measure):  nothing above it is being read
   * (`SitePatch` keeps the line below it where it is).
   */
  get stuckBottom(): number {
    return this.top
  }

  /**
   * `main` is the page shown (its first load, or a swap):  restore its closed sections, set the sticky offsets,
   * and again once its `<ui-root>` is ready (the tabs' bar has drawn).
   * - `isFirst`:  before the sections are defined, so a restored close just starts closed.
   *   After a swap they have drawn, so it closes without its animation.
   */
  show(main: HTMLElement, { isFirst = false }: { isFirst?: boolean } = {}): void {
    this.main = main
    this.restoreClosed(main, { isInstant: !isFirst })
    SiteSections.splitSubtitle(main)
    this.measure()
    TocIndex.whenReady(main, () => {
      if (this.main !== main) return
      this.measure()
      this.resized.disconnect()
      const bar = SiteSections.barOf(main)
      if (bar) this.resized.observe(bar)
      // and the page header's title line, which grows as its tools (Send, the bullhorn) arrive
      const head = SiteSections.headOf(main)
      if (head) this.resized.observe(head, { box: "border-box" })
    })
  }

  /**
   * Set every top-level section's `offset`, and `main`'s `--site-sections-top`, to the line below the stuck bars:
   * - `--site-top`
   * - plus the masthead's title line (its height on `main` as `--site-head-height`)
   * - plus, when the page has tabs that stick, the tabs' bar and its band above and below
   *   - on a phone they scroll away with the page (`site.css`), so the titles stick right under the page header
   */
  private measure(): void {
    const main = this.main
    if (!main?.isConnected) return
    const style = getComputedStyle(main)
    const lengthOf = (name: string) => parseFloat(style.getPropertyValue(name)) || 0
    // the masthead's title line sticks under the site top:  everything else sticks under it
    const head = SiteSections.headOf(main)
    const headHeight = Math.round(head?.getBoundingClientRect().height ?? 0)
    const headValue = `${headHeight}px`
    if (main.style.getPropertyValue(HEAD_HEIGHT) !== headValue) main.style.setProperty(HEAD_HEIGHT, headValue)
    const siteTop = (parseFloat(getComputedStyle(this.probe).top) || 0) + headHeight
    const bar = SiteSections.barOf(main)
    const band = lengthOf("--site-tabs-band")
    const gap = lengthOf("--site-tabs-gap")
    // the panel round the tabs:  a gap below the site top, its band, the track;  its band and a gap below it
    const trackHeight = bar?.getBoundingClientRect().height ?? 0
    const trackBottom = siteTop + gap + band + trackHeight
    // the joined panel is drawn by the toolbar's box reaching up behind the track (`--site-tabs-track`)
    const track = `${Math.round(trackHeight)}px`
    if (main.style.getPropertyValue(TABS_TRACK) !== track) main.style.setProperty(TABS_TRACK, track)
    const tabsStick = !!bar && SiteSections.sticks(bar)
    let top = tabsStick ? trackBottom + band + gap : siteTop
    // a page's own sticky bar:
    // the section toolbar under the tabs is the panel's lower half, stuck right under the track;
    // another (the kitchen sink's theme picker) sticks below the panel;  the titles below either
    // - NOT the section toolbar under tabs that don't stick:  it scrolls away with them
    const pageBar = main.querySelector<HTMLElement>(PAGE_BAR)
    const isJoined = !!bar && !!pageBar?.matches(JOINED_BAR)
    if (pageBar && (tabsStick || !isJoined)) {
      const at = isJoined ? trackBottom : top
      SiteSections.setOffset(pageBar, String(Math.round(at)))
      top = at + SiteSections.heightOf(pageBar) + (isJoined ? gap : 0)
    }
    this.top = Math.round(top)
    const value = `${this.top}px`
    if (main.style.getPropertyValue(SECTIONS_TOP) !== value) main.style.setProperty(SECTIONS_TOP, value)
    const offset = String(this.top)
    for (const section of SiteSections.topSections(main)) SiteSections.setOffset(section, offset)
    this.markTabsStuck()
  }

  /**
   * Move the subhead out of the masthead, so only its TITLE LINE sticks under the top bar
   * (Owen, 2026-10-23:  "leave just the top header line, content goes below it").
   * - What stays stuck:  the title, its icon buttons, Send and the bullhorn.
   *   The subhead scrolls on with the page.
   * - The subhead is written inside the title (`<ui-header level="1">Title <ui-header>Subhead</ui-header>`).
   *   This moves it into a paragraph right after the masthead (`.site-subtitle`),
   *   so the masthead holds the line alone, and sticks for the whole page (`site.css`, "The page header").
   * - Its words as written (links, code ...) move, not a copy.
   *   The paragraph is marked `data-spell-added`, as the runtime's own boxes are.
   * - A family page's note of its other tags' pages (`.site-own-pages`, "`<ui-radio>` has its own page") moves too,
   *   under the subhead:  in the masthead's grid it fell into the narrow cell beside the icons.
   * - SIDE EFFECT:  `main`'s DOM;  once per page (a page shown again is a fresh `main`)
   */
  private static splitSubtitle(main: HTMLElement): void {
    const subhead = main.querySelector<HTMLElement>(MASTHEAD_SUBHEAD)
    const masthead = subhead?.closest<HTMLElement>(MASTHEAD)
    if (!subhead || !masthead) return
    const subtitle = document.createElement("p")
    subtitle.className = SUBTITLE_CLASS
    subtitle.dataset.spellAdded = ""
    subtitle.append(...subhead.childNodes)
    subhead.remove()
    masthead.after(subtitle)
    const ownPages = masthead.querySelector(OWN_PAGES)
    if (ownPages) subtitle.after(ownPages)
  }

  ////////////////
  // ## Open and closed
  ////////////////

  /** Open or close `main`'s sections as the viewer left them on this page;  `isInstant`:  without the animation. */
  private restoreClosed(main: HTMLElement, { isInstant }: { isInstant: boolean }): void {
    const saved = SiteSections.readClosed()
    let hasChanged = false
    for (const section of SiteSections.pageSections(main)) {
      if (!section.hasAttribute("collapsible") || !(section.id in saved)) continue
      const isCollapsed = !!saved[section.id]
      if (SiteSections.isClosed(section) === isCollapsed) continue
      if (isInstant && !hasChanged) SiteSections.instantly(main)
      SiteSections.setClosed(section, isCollapsed)
      hasChanged = true
    }
  }

  /**
   * The viewer opened or closed a section:  remember it.
   * - Not ours:
   *   - another element's, demo sections inside examples, a vetoed toggle
   *   - a `ui-opening` that can't be cancelled (find-in-page's reveal:  never saved, as a landing's opening isn't)
   */
  private onToggle(event: CustomEvent<{ open: boolean }>): void {
    const section = event.target as HTMLElement
    if (section.localName !== SECTION_TAG || !section.id || !this.main?.contains(section)) return
    if (!event.cancelable || event.defaultPrevented || section.parentElement?.closest(NOT_PAGE)) return
    const saved = SiteSections.readClosed()
    saved[section.id] = !event.detail.open
    SiteSections.writeClosed(saved)
  }

  /** Open every section around `target` (and `target`, a section), without the animation;  true if any was. */
  private static openAround(main: HTMLElement, target: Element): boolean {
    let hasOpened = false
    for (
      let section: Element | undefined = target.closest(SECTION_TAG) ?? undefined;
      section && main.contains(section);
    ) {
      if (SiteSections.isClosed(section)) {
        if (!hasOpened) SiteSections.instantly(main)
        // controlled:  writing it announces nothing, so it isn't saved
        SiteSections.setClosed(section, false)
        hasOpened = true
      }
      section = SiteSections.sectionAround(section)
    }
    return hasOpened
  }

  ////////////////
  // ## Landing
  ////////////////

  /**
   * Land on `hash` in `main`, if it names something there.
   * - False when it doesn't (or names a pane:  the tabs show it themselves),
   *   so the caller can scroll to the top instead.
   * - The scroll happens once `<ui-root>` is ready, the pane has swapped in and the opened sections have drawn (`HashLanding`).
   * - `scroll`:  `"jump"` (a page arriving at its address) or `"glide"` (a link on the page)
   *   - glide:  a smooth scroll, the stuck bars staying put;  a jump all the same under reduced motion
   */
  land(main: HTMLElement, hash: string, scroll: LandingScroll = "jump"): boolean {
    const id = TocIndex.decode(hash.replace(/^#/, ""))
    if (!id) return false
    const tabs = SiteSections.tabsOf(main)
    if (tabs && SiteSections.paneValues(tabs).includes(id)) return false
    const found = SiteSections.resolve(main, id)
    if (!found) return false
    // an old link:  the URL names what it found
    if ("id" in found && found.id !== id) history.replaceState(history.state, "", `#${encodeURIComponent(found.id)}`)
    void this.landing.land("apis" in found ? SiteSections.drawnTarget(found) : found.target, { scroll })
    return true
  }

  /**
   * What `id` names in `main`:
   * - an element with that id
   * - an OLD link:  a pane's section of that name (`#types` => `#examples-types`),
   *   else the first page section whose id ends with it
   *   (an example's old slug:  `#vertical-divider` => `#examples-types-vertical-divider`)
   * - a row of an API section (`#api-attributes-size`):  drawn later, in the shadow root of the section's
   *   `<ui-docs-api only>`, whose id starts the row's
   * - a tag's own page's `<ui-docs-api tag>` for that tag (`ui-radio.html#ui-radio`):  the tables, headerless
   * - a tag of the family (`#ui-or`):  its first header in the `<ui-docs-api>`s, drawn in their shadow roots later
   *   (with `only`, each section's header for it is `<section id>-<tag>`)
   */
  private static resolve(main: HTMLElement, id: string): Found | undefined {
    const own = document.getElementById(id)
    if (own && main.contains(own)) return { target: own, id }
    const rows = [...main.querySelectorAll<HTMLElement>(API_SECTION)].find((api) => {
      const section = api.closest(SECTION_TAG)?.id
      return !!section && id.startsWith(`${section}-`)
    })
    if (rows) return { apis: [rows], find: (root) => root.getElementById(id) }
    const tabs = SiteSections.tabsOf(main)
    for (const value of tabs ? SiteSections.paneValues(tabs) : []) {
      const section = document.getElementById(`${value}-${id}`)
      if (section && main.contains(section)) return { target: section, id: section.id }
    }
    const suffix = `-${id}`
    const section = SiteSections.pageSections(main).find((element) => element.id.endsWith(suffix))
    if (section) return { target: section, id: section.id }
    const single = [...main.querySelectorAll<HTMLElement>("ui-docs-api[tag]")].find(
      (element) => element.getAttribute("tag") === id
    )
    if (single) return { target: single, id }
    const apis = [...main.querySelectorAll<HTMLElement>("ui-docs-api[family]")]
    if (apis.length && TAG_NAME.test(id)) {
      const find = (root: ShadowRoot) =>
        root.getElementById(id) ?? root.querySelector(`[part~="header"][id$="-${CSS.escape(id)}"]`)
      return { apis, tag: id, find }
    }
    return undefined
  }

  /**
   * How the site lands (`HashLanding`'s rules):
   * - ready:  once the page's `<ui-root>` is
   * - opens:  the target's pane, then every section around it (and itself), without animation
   * - its line:  below the stuck bar and the titles of the sections around it (`lineFor()`)
   * - its top:  a section's where its title would be, even while stuck (`boxOf()`)
   */
  private landingRules(): Partial<HashLandingRules> {
    return {
      whenReady: (target) => new Promise((resolve) => TocIndex.whenReady(this.main ?? target, resolve)),
      reveal: (target) => {
        const main = this.main
        if (!main) return false
        const holder = TocIndex.lightElementOf(target)
        const tabs = SiteSections.tabsOf(main)
        const pane = tabs && TocIndex.paneOf(tabs, holder)
        const hasSwapped = !!tabs && !!pane && TocIndex.shownPane(tabs) !== pane
        if (hasSwapped) (tabs as HTMLElement & { value?: string }).value = TocIndex.paneValue(tabs, pane)
        return SiteSections.openAround(main, holder) || hasSwapped
      },
      lineFor: (target) => this.lineFor(target),
      topOf: (target) => SiteSections.boxOf(target)?.top
    }
  }

  /**
   * Where `target`'s top lands, px from the viewport's top:  below the stuck bar and the titles of the sections
   * around it (or around the element whose shadow root holds it).
   * - A section's own title sits right on the line, where it sticks;  anything else `GAP` below.
   * - Measures first:  the bars may have changed since.
   */
  private lineFor(target: Element): number {
    this.measure()
    let line = this.top
    const holder = TocIndex.lightElementOf(target)
    for (let section = SiteSections.sectionAround(holder); section; section = SiteSections.sectionAround(section)) {
      if (section.hasAttribute("sticky")) line += SiteSections.titleHeight(section)
    }
    return target.localName === SECTION_TAG ? line : line + GAP
  }

  /** The hash changed on this page (a toc or `#id` link, back / forward):  land again, through ours. */
  private onHash(): void {
    const main = this.main
    if (main?.isConnected && location.hash) this.land(main, location.hash, "glide")
  }

  ////////////////
  // ## Helpers
  ////////////////

  /**
   * What `found` names in its `<ui-docs-api>`s' shadow roots, the first that has it, once drawn (their data loads
   * first);  `undefined` when none draws it, or a `tag` isn't the family's.
   */
  private static async drawnTarget(found: DrawnFound): Promise<Element | undefined> {
    if (found.tag) {
      const data = await SiteData.load().catch(() => undefined)
      const family = found.apis[0]!.getAttribute("family") ?? ""
      if (!data || !SiteData.family(data, family)?.tags.includes(found.tag)) return undefined
    }
    const deadline = performance.now() + API_WAIT_MS
    while (performance.now() < deadline) {
      for (const api of found.apis) {
        const target = api.shadowRoot && found.find(api.shadowRoot)
        if (target) return target
      }
      await nextFrame()
    }
    return undefined
  }

  /**
   * Where `target`'s top is now, unstuck:
   * - a section's sentinel (where its title would be, even while stuck), else its box
   * - a box-less element (`display: contents`):  its parent's
   * - `undefined` while it has none (a hidden pane)
   */
  private static boxOf(target: Element): DOMRect | undefined {
    const sentinel = target.localName === SECTION_TAG ? target.shadowRoot?.querySelector(".sentinel") : undefined
    for (const element of [sentinel, target, target.parentElement]) {
      if (element?.getClientRects().length) return element.getBoundingClientRect()
    }
    return undefined
  }

  /**
   * The page header's box, whose title line sticks (`splitSubtitle()`):  its segment's.
   * - The element itself has none, and the tools laid over it (Send) may reach past it.
   */
  private static headOf(main: HTMLElement): HTMLElement | undefined {
    return main.querySelector(MASTHEAD)?.shadowRoot?.querySelector<HTMLElement>('[part~="segment"]') ?? undefined
  }

  /**
   * Height of `element`'s box, px.
   * - A box-less element (`display: contents`, as `<ui-sticky>` and many `ui-*` elements are):
   *   the tallest box in its shadow root, else among its children, looking through box-less ones the same way.
   */
  private static heightOf(element: Element): number {
    const height = element.getBoundingClientRect().height
    if (height) return height
    const inside = [...(element.shadowRoot?.children ?? []), ...element.children]
    return Math.max(0, ...inside.filter((child) => child.localName !== "style").map(SiteSections.heightOf))
  }

  /** Height of `section`'s title bar, px (0 before it draws). */
  private static titleHeight(section: Element): number {
    return section.shadowRoot?.querySelector('[part~="title"]')?.getBoundingClientRect().height ?? 0
  }

  /** Whether the tabs' bar sticks:  not on a phone, where it scrolls away with the page (`site.css`). */
  private static sticks(bar: HTMLElement): boolean {
    return getComputedStyle(bar).position === "sticky"
  }

  /** The page's tabs (`#site-tabs`), if any. */
  private static tabsOf(main: HTMLElement): HTMLElement | undefined {
    return main.querySelector<HTMLElement>("ui-tabs#site-tabs") ?? undefined
  }

  /** The values of `tabs`' panes. */
  private static paneValues(tabs: HTMLElement): string[] {
    return [...tabs.children]
      .filter((pane) => pane.localName !== "template")
      .map((pane) => TocIndex.paneValue(tabs, pane))
  }

  /** The tabs' bar (its `menu` part), once drawn. */
  private static barOf(main: HTMLElement): HTMLElement | undefined {
    return SiteSections.tabsOf(main)?.shadowRoot?.querySelector<HTMLElement>('[part~="menu"]') ?? undefined
  }

  /** `main`'s page sections:  every `<ui-section>` but the demos inside examples. */
  private static pageSections(main: HTMLElement): HTMLElement[] {
    return [...main.querySelectorAll<HTMLElement>(SECTION_TAG)].filter(
      (section) => !section.parentElement?.closest(NOT_PAGE)
    )
  }

  /** `main`'s TOP-LEVEL page sections:  inside no other. */
  private static topSections(main: HTMLElement): HTMLElement[] {
    return SiteSections.pageSections(main).filter((section) => !SiteSections.sectionAround(section))
  }

  /** The `<ui-section>` around `element` (not `element` itself), if any. */
  private static sectionAround(element: Element): Element | undefined {
    return element.parentElement?.closest(SECTION_TAG) ?? undefined
  }

  /** Set `element`'s `offset` to `offset`, unless it has it:  re-setting would restart its sticky watch for nothing. */
  private static setOffset(element: Element, offset: string): void {
    if (element.getAttribute(OFFSET) !== offset) element.setAttribute(OFFSET, offset)
  }

  /** Opening and closing in `main` skip their animation for a few frames:  a landing measures right after. */
  private static instantly(main: HTMLElement): void {
    main.style.setProperty(SECTION_DURATION, "0s")
    void nextFrame(OPEN_FRAMES + 1).then(() => main.style.removeProperty(SECTION_DURATION))
  }

  /**
   * Closed, as its `open` says:  `open="false"` (absent is open).
   * - The attribute, not the property:  on the first load the sections aren't defined yet.
   */
  private static isClosed(section: Element): boolean {
    return section.getAttribute(OPEN) === "false"
  }

  /** Close or open `section` without an event:  `open` is controlled, so writing it announces nothing. */
  private static setClosed(section: Element, isClosed: boolean): void {
    if (isClosed) section.setAttribute(OPEN, "false")
    else section.removeAttribute(OPEN)
  }

  /** This page's saved closed sections, `{}` when none;  the old key's moved over first. */
  private static readClosed(): Record<string, boolean> {
    PrefStore.moveOldKey(OLD_FOLDS_KEY + location.pathname, FOLDS_KEY + location.pathname)
    const saved = PrefStore.getAt(FOLDS_KEY + location.pathname)
    return saved && typeof saved === "object" ? (saved as Record<string, boolean>) : {}
  }

  /** Save this page's closed sections, as JSON;  where storage is blocked, for this page only. */
  private static writeClosed(closed: Record<string, boolean>): void {
    PrefStore.setAt(FOLDS_KEY + location.pathname, closed)
  }
}

/**
 * What a hash names:  an element (with the id the URL should say),
 * or something `<ui-docs-api>` draws in its shadow root later (a row, a tag of the family).
 */
type Found = { target: Element; id: string } | DrawnFound

/** Something drawn in the shadow roots of `apis`, found by `find`;  a `tag` of their family, when it's a tag. */
type DrawnFound = {
  /** where to look, in order */
  apis: HTMLElement[]
  /** the element in one shadow root, once drawn */
  find: (root: ShadowRoot) => Element | null
  /** the tag a family's header is for (`#ui-or`):  checked against the family first */
  tag?: string
}

/** An API section's table (`yarn site:sections` writes one per kind):  its rows' ids start with its section's. */
const API_SECTION = "ui-docs-api[only]"

/** Frames a section takes to draw what an opening revealed:  its animation stays off that long (`instantly()`). */
const OPEN_FRAMES = 3

/** Gap between the stuck titles and a target that isn't a section (an example, a heading), px. */
const GAP = 8

/** Wait at most this long for `<ui-docs-api>` to draw the tag a hash names, ms. */
const API_WAIT_MS = 5000

/**
 * A page's own sticky bar above its sections (a `<ui-sticky>`:  the kitchen sink's theme picker).
 * - Its `offset` is set to stick below the site's top, and the section titles stick below it.
 * - One per page.
 */
const PAGE_BAR = "ui-sticky.site-sticky-bar"

/** A page bar that is the tabs' panel's lower half:  the section toolbar in a tab's pane (spell-epic's). */
const JOINED_BAR = "ui-tabs ui-sticky.spell-site-toolbar"

/** The page header, whose title line sticks under the top bar (`splitSubtitle()`, `measure()`). */
const MASTHEAD = ".site-masthead"

/** The subhead written inside the masthead's title, moved out below it (`splitSubtitle()`). */
const MASTHEAD_SUBHEAD = ".site-masthead .site-title > ui-header"

/** The paragraph the subhead's words move into (`site.css`). */
const SUBTITLE_CLASS = "site-subtitle"

/** A family page's note of its other tags' own pages, in its masthead:  moved under the subhead. */
const OWN_PAGES = ".site-own-pages"

/** `main`'s custom property:  the masthead's stuck height, px;  the sticky lines below start under it (`measure()`). */
const HEAD_HEIGHT = "--site-head-height"

/** `main`'s class once the page has scrolled:  its header's title line stuck and tighter (`markTabsStuck()`, `site.css`). */
const HEAD_STUCK = "site-head-stuck"

/** `main`'s class while the tabs' bar is stuck (`markTabsStuck()`). */
const TABS_STUCK = "site-tabs-stuck"

/** `main`'s custom property:  how far the tabs follow their toolbar up as its pane ends, px (`markTabsStuck()`). */
const TABS_LEAVE = "--site-tabs-leave"

/** `main`'s custom property:  the tabs' track height, px, for the panel the section toolbar draws behind it. */
const TABS_TRACK = "--site-tabs-track"

/** What can't be a page section:  a demo inside an example or a Theming playground, a template. */
const NOT_PAGE = "ui-example, ui-docs-tokens, template"

/** The section tag. */
const SECTION_TAG = "ui-section"

/** A section's open attribute, `"false"` when closed (controlled:  writing it announces nothing). */
const OPEN = "open"

/** The sticky offset attribute of a section or `<ui-sticky>`, px. */
const OFFSET = "offset"

/** `main`'s custom property:  the line below the stuck bar, for anchor scrolling (`site.css`). */
const SECTIONS_TOP = "--site-sections-top"

/** `<ui-section>`'s open / close duration token:  `0s` while they go instantly. */
const SECTION_DURATION = "--ui-section-duration"

/** A tag name, as `<ui-docs-api>` gives each tag's header its id (`ui-or`). */
const TAG_NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/
