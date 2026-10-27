import { For, Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import type { UIMenuAttributes } from "spell/ui/jsx"
import { tocVocabulary } from "./UIToc.en"
import { HashLanding } from "./HashLanding"
import { TocIndex } from "./TocIndex"
import { TocPreferences } from "./TocPreferences"
import {
  DEFAULT_SIZE,
  type TocVocabulary,
  type FollowedContent,
  type TocAllFolds,
  type TocEntry,
  type TocFolds,
  type TocSection
} from "./UIToc.types"

import tocCSS from "./UIToc.css?inline"

/****************
 * ### `UIToc`
 * The component behind `<ui-toc>`, a page's table of contents:  Fomantic's docs "On this page" menu
 * (`ui vertical following fluid accordion text menu`, in the right rail).
 * - The docs site's `<ui-toc>` until epic `ui-gaps` P14 made it a component:  any page may have one.
 *
 * - Its shadow DOM:
 *   `<div class="ui [size] toc" part="toc">` holding a `<div part="head">` row (an optional `<ui-header part="header">`,
 *   the expand all / collapse all `<button part="toggle-all">`, then the `tools` slot:  a page's own buttons)
 *   and ONE `<ui-menu direction="vertical" appearance="text" fluid part="menu">` (the landmark) of section links.
 *   - Each section is a `<div part="section-row">`:  its fold `<button part="fold">` (when it has entries), its link.
 *   - Under an open section, an item holds a `<ui-menu part="entries">` of its entries' links.
 * - Folds (Owen, 2026-10-25, r31:  "Make these TOCs expandable with a expandall/collapseall icon in the header"):
 *   - a section the viewer folded or opened by hand stays so (`handFolds`, kept per page)
 *   - else what the header's toggle last did, on ANY page (`allFolds`, one for this browser)
 *   - else `expanded`, else open while it's in view (P38's J128)
 *   - kept through `TocPreferences`, read again on every connect:  a page move makes a new toc
 * - It lists the FOLLOWED content (`for`;  of a `<ui-tabs>`, its shown pane) by `TocIndex.scan()`:
 *   - level 2 headings and top-level `<ui-section>`s are sections;
 *     examples with a `heading`, and level 3 headings, are their entries
 *   - what a `<ui-section>` nests (sections, examples, headings) are ITS entries, as deep as it goes,
 *     each level opening on the way to the entry in view
 *   - light DOM only, but for the shadow roots another family names (`TocIndex.addShadowHost()`):
 *     the docs site's `<ui-docs-api only>` marks its rows and tag headers (`TocIndex.shadowEntries()`),
 *     so every attribute, event ... is listed under its section
 * - It follows the scroll:  the entry whose top passed the reading line (`TocIndex.current()`) is `selected`,
 *   and its section opens;  `ui-scrolled-to { value }` when that changes.
 *   - The window's scroll, or, with `scroller`, the scroll of the box that id names:  content scrolling in a pane
 *     of its own (spell-app's notebook page), its reading line from that box's top.
 * - Links are plain `#id` links:  the browser scrolls (below the document's `scroll-padding-top`).
 *   - As the page opens and on `hashchange`, it lands on the hash through `HashLanding`:  a target in a HIDDEN pane
 *     of the tabs shows that pane first (`<ui-tabs history>` ignores hashes that aren't pane values), its folds open,
 *     then it scrolls there, and once more as the page settles.
 *   - Not on a page that lands its hashes itself (the site's sections, the epic pages):  one landing, not two.
 * - It scans again when the tabs show another pane (`ui-opened`),
 *   when the followed content changes (a `MutationObserver`:  children, `heading` / `label` / `level` / `id`),
 *   and when a shadow host in it has drawn (`ui-drawn`):  the observer can't see into its shadow root.
 * - It re-follows when that content resizes
 *   (a `ResizeObserver`:  components drawing late move the headings without any scroll).
 * - SIDE EFFECTS:
 *   - gives each listed heading / example without an `id` one (a slug of its text), so its link works
 *   - the viewer's folds, in `localStorage` (`TocPreferences`)
 *   - while connected:  `window` `scroll` / `resize` / `hashchange` listeners (`scroll` on `scroller` too, once it
 *     exists), and the two observers.
 ****************/
export class UIToc extends E.UIComponent<TocVocabulary> {
  @E.proto static vocabulary = tocVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { toc: tocCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The sections
  ////////////////

  /** The listed sections, from the last scan. */
  @E.state accessor sections: readonly TocSection[] = []

  /** Nothing listed:  `:state(empty)`. */
  @E.cssState("empty")
  get isEmpty(): boolean {
    return !this.sections.length
  }

  ////////////////
  // ## The entry in view
  ////////////////

  /** Id of the entry in view. */
  @E.state accessor idInView: string | undefined = undefined

  /** Ids from the top-level section down to the entry in view:  the entries open on the way. */
  @E.derived
  get pathInView(): string[] {
    return TocIndex.pathTo(this.sections, this.idInView)
  }

  /** Id of the top-level section holding the entry in view. */
  get sectionIdInView(): string | undefined {
    return this.pathInView[0]
  }

  ////////////////
  // ## Folds
  ////////////////

  /** The viewer's own folds on this page, by section id (`TocPreferences.foldsFor()`). */
  @E.state accessor handFolds: TocFolds = {}

  /** What the header's toggle last did, on any page;  `undefined` until it's pressed. */
  @E.state accessor allFolds: TocAllFolds | undefined = undefined

  /** Is `section`'s list open?  The viewer's own fold, else the toggle's, else `expanded`, else while it's in view. */
  isSectionOpen(section: TocSection): boolean {
    const own = this.handFolds[section.id]
    if (own !== undefined) return own
    if (this.allFolds) return this.allFolds === "expanded"
    return !!this.expanded || this.pathInView.includes(section.id)
  }

  /** Does anything fold?  A section with entries:  then the header shows the toggle. */
  get hasFolds(): boolean {
    return this.sections.some((section) => section.entries.length)
  }

  /** Is every section with entries open?  The toggle then folds them all. */
  get isAllOpen(): boolean {
    return this.sections.every((section) => !section.entries.length || this.isSectionOpen(section))
  }

  /** Nested entries open all the way down:  the toggle's expand all, else `expanded`. */
  private get isOpenAllTheWay(): boolean {
    return this.allFolds ? this.allFolds === "expanded" : !!this.expanded
  }

  /** A section's chevron:  fold it if open, open it if folded;  kept for this page. */
  @E.untracked
  toggleSection(section: TocSection): void {
    this.handFolds = { ...this.handFolds, [section.id]: !this.isSectionOpen(section) }
    TocPreferences.setFoldsFor(this.path, this.handFolds)
  }

  /**
   * The header's toggle:  every section open, or, once they all are, every one folded.
   * - Kept for EVERY page, until pressed the other way;  this page's own folds are forgotten.
   */
  @E.untracked
  toggleAll(): void {
    this.allFolds = this.isAllOpen ? "collapsed" : "expanded"
    this.handFolds = {}
    TocPreferences.setAll(this.allFolds)
    TocPreferences.setFoldsFor(this.path, {})
  }

  /** The page's path:  its folds are kept under it. */
  private get path(): string {
    return this.domElement.ownerDocument.defaultView?.location.pathname ?? ""
  }

  /** Read the kept folds:  this page's, and the toggle's. */
  private loadFolds(): void {
    this.handFolds = TocPreferences.foldsFor(this.path)
    this.allFolds = TocPreferences.all()
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("toc")}>
        <Show when={this.heading || this.hasFolds}>
          <div class={HEAD} part={this.partForName("head")}>
            <Show when={this.heading}>
              <ui-header part={this.partForName("header")}>{this.heading}</ui-header>
            </Show>
            <Show when={this.hasFolds}>{this.toggleAllButton()}</Show>
            <slot name="tools" />
          </div>
        </Show>
        <ui-menu
          part={this.partForName("menu")}
          direction="vertical"
          appearance="text"
          fluid=""
          size={this.menuSize}
          aria-label={this.translationForKey("label")}
        >
          <For each={this.sections}>{(section) => this.section(section)}</For>
        </ui-menu>
      </div>
    )
  }

  /** One section's row (its chevron, its link), and its entries while it's open. */
  private section(section: TocSection): JSX.Element {
    const isOpen = () => !!section.entries.length && this.isSectionOpen(section)
    return (
      <>
        <div class={SECTION_ROW} part={this.partForName("section-row")}>
          <Show when={section.entries.length}>{this.foldButton(section)}</Show>
          <ui-item
            part={this.partForName("section")}
            class={SECTION}
            link={`#${section.id}`}
            selected={this.sectionIdInView === section.id ? "" : undefined}
          >
            {section.text}
          </ui-item>
        </div>
        {this.entries(section, isOpen)}
      </>
    )
  }

  /**
   * A section's fold chevron, left of its link:  a click folds or opens its entries (`toggleSection()`).
   * - Named by the section's words;  its `aria-expanded` and tooltip as the fold stands.
   * - Drawn here, not from an icon pack:  on screen in the first frame, the epic pages' chevron.
   */
  private foldButton(section: TocSection): JSX.Element {
    const isOpen = () => this.isSectionOpen(section)
    const tip = () => this.translationForKey(isOpen() ? "foldSection" : "openSection", { section: section.text })
    return (
      <button
        type="button"
        class={FOLD}
        part={this.partForName("fold")}
        aria-label={section.text}
        aria-expanded={isOpen() ? "true" : "false"}
        title={tip()}
        onClick={() => this.toggleSection(section)}
      >
        <svg class={CHEVRON} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M6 3.5 10.5 8 6 12.5" />
        </svg>
      </button>
    )
  }

  /**
   * The header's ONE expand all / collapse all button (`toggleAll()`):  the epic pages' double chevron,
   * pointing down while it would open everything, up once everything is open.
   */
  private toggleAllButton(): JSX.Element {
    const label = () => this.translationForKey(this.isAllOpen ? "collapseAll" : "expandAll")
    return (
      <button
        type="button"
        class={TOGGLE_ALL}
        part={this.partForName("toggle-all")}
        aria-label={label()}
        title={label()}
        aria-pressed={this.isAllOpen ? "true" : "false"}
        onClick={() => this.toggleAll()}
      >
        <svg class={CHEVRONS} viewBox="0 0 16 16" aria-hidden="true">
          <path d={this.isAllOpen ? COLLAPSE_ALL_PATH : EXPAND_ALL_PATH} />
        </svg>
      </button>
    )
  }

  /**
   * `parent`'s entries, while it's open (`isOpen`:  a section's own fold;  an entry's, `isOpenAllTheWay`, or on the
   * way to the entry in view):  a menu of their links, each followed by its own entries the same way
   * (nested `<ui-section>`s).
   */
  private entries(parent: TocEntry, isFoldOpen?: () => boolean): JSX.Element {
    const isOpen = () =>
      !!parent.entries.length &&
      (isFoldOpen ? isFoldOpen() : this.isOpenAllTheWay || this.pathInView.includes(parent.id))
    return (
      <Show when={isOpen()}>
        <ui-item class={ENTRIES} padding="none-y">
          <ui-menu
            part={this.partForName("entries")}
            direction="vertical"
            appearance="text"
            fluid=""
            size={this.menuSize}
          >
            <For each={parent.entries}>
              {(entry) => (
                <>
                  <ui-item
                    part={this.partForName("entry")}
                    link={`#${entry.id}`}
                    selected={this.idInView === entry.id ? "" : undefined}
                  >
                    {entry.text}
                  </ui-item>
                  {this.entries(entry)}
                </>
              )}
            </For>
          </ui-menu>
        </ui-item>
      </Show>
    )
  }

  /** `size`, else the default (an empty or unknown `size` too). */
  private get menuSize(): UIMenuAttributes["size"] {
    return this.size || DEFAULT_SIZE
  }

  ////////////////
  // ## Following the page
  ////////////////

  /** The next frame's scan or follow (`onFrame()`), once however often asked. */
  private readonly frame = new E.Queued({ when: E.beforeNextPaint, run: () => this.onFrame() })

  /** What the queued frame does:  a rescan wins over a follow. */
  private queuedUpdate: TocUpdate | undefined

  /**
   * While connected, follow the page:  the first scan, the hash, listeners and the observers;  returns their cleanup.
   * - SIDE EFFECT:  page listeners and the observers.
   */
  @E.whileConnected
  protected watch(): () => void {
    const document = this.domElement.ownerDocument
    const view = document.defaultView!
    // oxlint-disable-next-line spell-ui/no-mutation-observer -- watches the FOLLOWED content, another element
    const observer = new MutationObserver(() => this.schedule("rescan"))
    // components drawing (or a pane switching) move the headings without a scroll
    const resized = new ResizeObserver(() => this.schedule("follow"))
    const onScroll = () => this.schedule("follow")
    const onShow = () => this.schedule("rescan")
    const onDrawn = (event: Event) => {
      const hosts = TocIndex.shadowHosts
      if (hosts && (event.target as Element).matches?.(hosts)) this.schedule("rescan")
    }
    const onHash = () => this.reveal()
    this.loadFolds()
    let followed: FollowedContent | undefined
    let scrolling: Element | undefined
    const start = () => {
      followed = this.observe({ observer, resized, onShow, onDrawn })
      scrolling = this.scrollerElement()
      scrolling?.addEventListener("scroll", onScroll, { passive: true })
    }
    view.addEventListener("scroll", onScroll, { passive: true })
    view.addEventListener("resize", onScroll, { passive: true })
    view.addEventListener("hashchange", onHash)
    // the toc may come before what it follows:  look again once the page is parsed
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true })
    else E.afterSolidUpdate(start)
    return () => {
      observer.disconnect()
      resized.disconnect()
      followed?.tabs?.removeEventListener(UI_SHOW, onShow)
      followed?.root.removeEventListener(UI_DRAWN, onDrawn)
      scrolling?.removeEventListener("scroll", onScroll)
      document.removeEventListener("DOMContentLoaded", start)
      view.removeEventListener("scroll", onScroll)
      view.removeEventListener("resize", onScroll)
      view.removeEventListener("hashchange", onHash)
      this.frame.cancel()
      this.queuedUpdate = undefined
    }
  }

  /**
   * Follow what `for` names, once it exists:  observe it, hear its tabs show a pane, scan it, land on the hash.
   * - Returns what it follows (`watch()` undoes the tabs' listener), or `undefined` while it doesn't exist.
   */
  private observe({ observer, resized, onShow, onDrawn }: Observers): FollowedContent | undefined {
    const followed = this.followedContent()
    if (!followed) return undefined
    observer.observe(followed.root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: OBSERVED_ATTRIBUTES
    })
    resized.observe(followed.root)
    followed.tabs?.addEventListener(UI_SHOW, onShow)
    followed.root.addEventListener(UI_DRAWN, onDrawn)
    this.rescan()
    this.reveal()
    return followed
  }

  /** Do `update` on the next frame, once:  a rescan queued meanwhile wins over a follow. */
  private schedule(update: TocUpdate): void {
    if (update === "rescan") this.queuedUpdate = update
    else this.queuedUpdate ??= update
    this.frame.ask()
  }

  /** The queued frame:  do what's queued. */
  private onFrame(): void {
    const update = this.queuedUpdate
    this.queuedUpdate = undefined
    if (update === "rescan") this.rescan()
    else this.followScroll()
  }

  /** Scan the followed content again, then follow the scroll. */
  private rescan(): void {
    const followed = this.followedContent()
    const root = followed?.tabs ? TocIndex.shownPane(followed.tabs) : followed?.root
    const sections = root ? TocIndex.scan(root, UIToc.reservedIdsFor(followed?.tabs)) : []
    this.sections = sections
    this.send("ui-drawn", { ids: TocIndex.flatten(sections).map((entry) => entry.id) })
    this.followScroll(sections)
  }

  /** Mark the entry in view;  `ui-scrolled-to` when it moved. */
  @E.untracked
  private followScroll(sections = this.sections): void {
    const id = TocIndex.current(sections, this.domElement.ownerDocument, this.scrollerElement())
    if (id === this.idInView) return
    this.idInView = id
    if (id) this.send("ui-scrolled-to", { value: id })
  }

  /**
   * Land on what `location.hash` names (`HashLanding`):  its pane shown, its folds opened, below the stuck titles;
   * once the page is ready, and once more as it settles.
   * - Not on a page that lands its hashes itself (the site, the epic pages):  `landOnHash()` leaves it to the page.
   */
  private reveal(): void {
    const document = this.domElement.ownerDocument
    const hash = document.defaultView!.location.hash
    if (hash) void HashLanding.forDocument(document).landOnHash(hash)
  }

  /** What `for` names (else the page's `main`), and its tabs;  `undefined` while it doesn't exist. */
  private followedContent(): FollowedContent | undefined {
    return TocIndex.followed(this.domElement.ownerDocument, this.for || undefined)
  }

  /** The box `scroller` names, whose scroll it follows;  `undefined` for the window (or while it doesn't exist). */
  private scrollerElement(): Element | undefined {
    return (this.scroller && this.domElement.ownerDocument.getElementById(this.scroller)) || undefined
  }

  /** Ids a new heading id must not take:  the followed tabs' pane values (the URL hash names those too). */
  private static reservedIdsFor(tabs: Element | undefined): ReadonlySet<string> {
    if (!tabs) return new Set()
    return new Set([...tabs.children].map((pane, index) => pane.getAttribute("value") ?? String(index)))
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UIToc extends E.AttributeValues<TocVocabulary> {}

/** What a scheduled frame does:  scan the followed content again, or just re-follow the scroll. */
type TocUpdate = "rescan" | "follow"

/** What `observe()` hooks the followed content up to:  `watch()`'s observers and tabs listener. */
type Observers = {
  /** rescans on changes to the content */
  observer: MutationObserver
  /** re-follows when the content resizes */
  resized: ResizeObserver
  /** rescans when the tabs show another pane */
  onShow: () => void
  /** rescans when a shadow host (`TocIndex.addShadowHost()`) has drawn its entries */
  onDrawn: (event: Event) => void
}

/** The attributes whose changes rescan:  an example's or a section's title, a heading's level, an id. */
const OBSERVED_ATTRIBUTES = ["heading", "label", "level", "id"]

/** `<ui-tabs>`' event as it shows another pane. */
const UI_SHOW = "ui-opened"

/** An element's event once it has drawn:  a shadow host's entries are in. */
const UI_DRAWN = "ui-drawn"

/** Class word of a section's link item. */
const SECTION = "section"

/** Class word of the item holding a section's entries. */
const ENTRIES = "entries"

/** Class of the row above the links:  the title and the toggle. */
const HEAD = "head"

/** Class of a section's row:  its fold button and its link. */
const SECTION_ROW = "section-row"

/** Class of a section's fold button. */
const FOLD = "fold"

/** Class of the fold chevron. */
const CHEVRON = "chevron"

/** Class of the header's expand all / collapse all button. */
const TOGGLE_ALL = "toggle-all"

/** Class of its double chevron. */
const CHEVRONS = "chevrons"

/** The toggle's double chevron, pointing down:  expand all. */
const EXPAND_ALL_PATH = "M4 3.5 8 7.5 12 3.5M4 7.5 8 11.5 12 7.5"

/** ... pointing up:  collapse all. */
const COLLAPSE_ALL_PATH = "M4 8.5 8 4.5 12 8.5M4 12.5 8 8.5 12 12.5"
