// `spell-ui/util` by name, never the `spell-ui/core` entry:  node scripts load this file (see the class docs)
import { beforeNextPaint, slug } from "spell-ui/util"
import * as UIT from "spell-ui/components/components.types"
import { PageOutline } from "./PageOutline"
import {
  EXAMPLE_TAG,
  HEADING_SELECTOR,
  READING_LINE,
  SECTION_SELECTOR,
  SECTION_TAG,
  TABS_TAG,
  type FollowedContent,
  type TocEntry,
  type TocSection
} from "./UIToc.types"

/****************
 * ### `TocIndex`
 * The page side of `<ui-toc>`:  which content it follows, the sections and entries in it, the one in view.
 * - Plain DOM, no Solid:  node scripts load it by path (`scripts/site-sections.ts`, `src/tools/SiteCheck.ts`),
 *   so it NEVER imports a value from `spell-ui/core`.
 * - Static only:  pure reads (and id writes) of the DOM it's given.
 * - Entries form a tree:  level 2 headings and top-level `<ui-section>`s,
 *   then what's under each (examples, level 3 headings, nested sections), as deep as the sections nest.
 * - Read on top of `PageOutline`:  its titles, and the demo markup it leaves out.
 * - Light DOM only, but for the shadow roots of the SHADOW HOSTS, the tags another family names
 *   (`addShadowHost()`:  the docs site's `<ui-docs-api>`):
 *   their marked elements (`UIT.TocMarks.entry`) are entries of the section around the host,
 *   a group's (`UIT.TocMarks.group`) nesting the ones after it.
 *   - A list, not a tag of its own:  a component never names the docs widgets (epic `ui-gaps` P14).
 * - SIDE EFFECT:  `scan()` gives every listed heading / section / example without an `id` one
 *   (a slug of its text, made unique in the document), so the links have targets and other pages can link to them.
 ****************/
export class TocIndex {
  /**
   * The element named by `forId` (else the page's `<main>`, else `<body>`), and the tab set when it is one.
   * - `undefined` while a named element doesn't exist yet (the toc may come first in the page).
   */
  static followed(document: Document, forId: string | undefined): FollowedContent | undefined {
    const root = forId ? document.getElementById(forId) : (document.querySelector("main") ?? document.body)
    if (!root) return undefined
    return root.localName === TABS_TAG ? { root, tabs: root } : { root }
  }

  /** The pane of `tabs` on show:  `:state(selected)`, else the first child with a box. */
  static shownPane(tabs: Element): Element | undefined {
    const panes = TocIndex.panes(tabs)
    return (
      panes.find((pane) => TocIndex.hasState(pane, "selected")) ?? panes.find((pane) => pane.getClientRects().length)
    )
  }

  /** The pane of `tabs` holding `target`, if any. */
  static paneOf(tabs: Element, target: Element): Element | undefined {
    return TocIndex.panes(tabs).find((pane) => pane.contains(target))
  }

  /** A pane's value, as `<ui-tabs value>` takes it:  its `value`, else its index. */
  static paneValue(tabs: Element, pane: Element): string {
    return pane.getAttribute("value") ?? String(TocIndex.panes(tabs).indexOf(pane))
  }

  /**
   * The sections of `root`, in page order:
   * - each level 2 heading with the examples / level 3 headings after it
   * - each `<ui-section>` with what's nested in it (sections, examples, headings), at any depth
   * - A level 2 heading inside a `<ui-section>` is an entry of that section, like the rest.
   * - Headings before the first section become sections with no entries.
   * - A shadow host (`addShadowHost()`):  its shadow root's marked elements, as entries of the section around it
   *   (`shadowEntries()`).
   * - Skipped:  sections without a title, and headings and sections
   *   inside an example's live markup (a header page's demos) or inside templates.
   * - `reserved`:  ids a new id must not take (the tab values, which the URL hash also names).
   */
  static scan(root: Element, reserved: ReadonlySet<string> = new Set()): TocSection[] {
    const sections: TocEntry[] = []
    const ofSection = new Map<Element, TocEntry>()
    const hosts = TocIndex.shadowHosts
    for (const heading of root.querySelectorAll(hosts ? `${HEADING_SELECTOR}, ${hosts}` : HEADING_SELECTOR)) {
      if (TocIndex.insideExample(heading, root)) continue
      if (hosts && heading.matches(hosts)) {
        const parent = TocIndex.enclosing(heading, root, ofSection) ?? sections.at(-1)
        if (parent) (parent.entries as TocEntry[]).push(...TocIndex.shadowEntries(heading))
        continue
      }
      const text = TocIndex.text(heading)
      if (!text) continue
      const entry: TocEntry = { id: TocIndex.idOf(heading, text, reserved), text, target: heading, entries: [] }
      if (heading.localName === SECTION_TAG) ofSection.set(heading, entry)
      const parent = TocIndex.enclosing(heading, root, ofSection)
      const last = sections.at(-1)
      if (parent) (parent.entries as TocEntry[]).push(entry)
      else if (heading.matches(SECTION_SELECTOR) || !last) sections.push(entry)
      else (last.entries as TocEntry[]).push(entry)
    }
    return sections
  }

  /**
   * The entries `host`'s shadow root marks (`UIT.TocMarks.entry`, with an id), in order;
   * a group's (`UIT.TocMarks.group`) holding the ones after it, up to the next group.
   * - `[]` before the host has drawn:  the toc scans again when it says it has (`ui-drawn`).
   */
  static shadowEntries(host: Element): TocEntry[] {
    const marked = host.shadowRoot?.querySelectorAll(`[${UIT.TocMarks.entry}]`) ?? []
    const entries: TocEntry[] = []
    let group: TocEntry | undefined
    for (const element of marked) {
      const text = element.getAttribute(UIT.TocMarks.entry)?.trim()
      if (!text || !element.id) continue
      const entry: TocEntry = { id: element.id, text, target: element, entries: [] }
      if (element.hasAttribute(UIT.TocMarks.group)) {
        group = entry
        entries.push(entry)
      } else if (group) (group.entries as TocEntry[]).push(entry)
      else entries.push(entry)
    }
    return entries
  }

  /** The element with `id`:  in the page, else in a shadow host's shadow root (a row's anchor). */
  static elementById(document: Document, id: string): Element | undefined {
    const own = document.getElementById(id)
    if (own) return own
    const hosts = TocIndex.shadowHosts
    if (!hosts) return undefined
    for (const host of document.querySelectorAll(hosts)) {
      const found = host.shadowRoot?.getElementById(id)
      if (found) return found
    }
    return undefined
  }

  /**
   * Have the table of contents read `tag`'s shadow root too:  its marked elements (`UIT.TocMarks`) are entries.
   * - Called by the family that draws them, as it loads (the docs site's `<ui-docs-api>`).
   * - SIDE EFFECT:  page-wide, for every table of contents;  once per tag.
   */
  static addShadowHost(tag: string): void {
    const hosts = TocIndex.hostTags()
    if (!hosts.includes(tag)) hosts.push(tag)
  }

  /** The shadow hosts as one selector (`ui-docs-api`);  `undefined` while none is named. */
  static get shadowHosts(): string | undefined {
    const hosts = TocIndex.hostTags()
    return hosts.length ? hosts.join(", ") : undefined
  }

  /** Forget the shadow hosts:  for tests. */
  static reset(): void {
    TocIndex.hostTags().length = 0
  }

  /**
   * The tags `addShadowHost()` named, on `globalThis`:  ONE list a page, though a bundle may hold a second copy of
   * this file (spell-epic's docs runtime imports it by its file, beside the families' own).
   */
  private static hostTags(): string[] {
    return ((globalThis as { [SHADOW_HOSTS]?: string[] })[SHADOW_HOSTS] ??= [])
  }

  /** The light-DOM element `element` is drawn in:  its shadow root's host (at any depth), else itself. */
  static lightElementOf(element: Element): Element {
    let light = element
    for (let root = light.getRootNode(); "host" in root && root.host; root = light.getRootNode())
      light = root.host as Element
    return light
  }

  /** `entries` and everything under them, depth first:  page order. */
  static flatten(entries: readonly TocEntry[]): TocEntry[] {
    return entries.flatMap((entry) => [entry, ...TocIndex.flatten(entry.entries)])
  }

  /** Ids from the top-level section down to the entry `id` (its own last);  `[]` when it isn't listed. */
  static pathTo(entries: readonly TocEntry[], id: string | undefined): string[] {
    if (!id) return []
    for (const entry of entries) {
      if (entry.id === id) return [id]
      const below = TocIndex.pathTo(entry.entries, id)
      if (below.length) return [entry.id, ...below]
    }
    return []
  }

  /**
   * The id of the entry in view:
   * - the last one whose top has passed the reading line (the document's scroll padding plus a fifth of the viewport)
   * - the last one at the page's end
   * - the first one above everything
   * - Entries without a box (a hidden pane) or inside a folded `<ui-section>` are skipped.
   */
  static current(sections: readonly TocSection[], document: Document): string | undefined {
    const view = document.defaultView
    if (!view) return undefined
    const all = TocIndex.flatten(sections).filter(
      (entry) => entry.target.getClientRects().length && !TocIndex.folded(TocIndex.lightElementOf(entry.target))
    )
    if (!all.length) return undefined
    const scroller = document.scrollingElement ?? document.documentElement
    if (scroller.scrollTop > 0 && scroller.scrollTop + view.innerHeight >= scroller.scrollHeight - 2)
      return all.at(-1)!.id
    const padding = parseFloat(view.getComputedStyle(document.documentElement).scrollPaddingTop) || 0
    const line = padding + view.innerHeight * READING_LINE
    const reached = TocIndex.reached(
      all.map((entry) => entry.target),
      () => line
    )
    return (all.find((entry) => entry.target === reached) ?? all[0]!).id
  }

  /**
   * The last of `targets` (in page order) whose top has reached its line, px from the viewport's top (`lineFor()`);
   * `undefined` above the first.
   * - Skipped:  a target without a box (a hidden pane, filtered out), or one `isShown()` says isn't shown
   * - The section being read:  `current()` with the reading line;  the epic pages with each target's landing line.
   */
  static reached<T extends Element>(
    targets: readonly T[],
    lineFor: (target: T) => number,
    isShown: (target: T) => boolean = () => true
  ): T | undefined {
    let reached: T | undefined
    for (const target of targets) {
      if (!target.getClientRects().length || !isShown(target)) continue
      if (target.getBoundingClientRect().top > lineFor(target)) break
      reached = target
    }
    return reached
  }

  /** The top-level section holding the entry `id`, at any depth (or being it). */
  static sectionOf(sections: readonly TocSection[], id: string | undefined): TocSection | undefined {
    const top = TocIndex.pathTo(sections, id)[0]
    return top === undefined ? undefined : sections.find((section) => section.id === top)
  }

  /** A URL hash (without `#`) as the id it names. */
  static decode(hash: string): string {
    try {
      return decodeURIComponent(hash)
    } catch {
      return hash
    }
  }

  /**
   * Run `then` once the `<ui-root>` around `element` is ready (every component drawn),
   * or on the next frame when it already is or there is none.
   * - Its OWN `ui-ready`:  a root inside it (a `<ui-page>` in an example) sends one too, which bubbles up first.
   */
  static whenReady(element: Element, then: () => void): void {
    const root = element.closest("ui-root")
    if (!root || TocIndex.hasState(root, "ready")) {
      beforeNextPaint(then)
      return
    }
    const onReady = (event: Event) => {
      if (event.target !== root) return
      root.removeEventListener("ui-ready", onReady)
      beforeNextPaint(then)
    }
    root.addEventListener("ui-ready", onReady)
  }

  /**
   * `text` as a section's id:  the kit's id slug (`slug()`), `section` when nothing is left.
   * - e.g. `Labeled Icon` => `labeled-icon`, `Émphasis & More!` => `emphasis-more`
   * - EXCEPT an apostrophe, which splits words here (`Spell UI's own` => `spell-ui-s-own`),
   *   where the kit's drops it:  the docs pages' saved section ids were made so, and links point at them.
   */
  static slug(text: string): string {
    return slug(text.replace(/['’]/g, " "), { fallback: "section" })
  }

  /** `element`'s id, giving it one first if it has none (SIDE EFFECT). */
  private static idOf(element: Element, text: string, reserved: ReadonlySet<string>): string {
    if (element.id) return element.id
    const base = TocIndex.slug(text)
    const document = element.ownerDocument
    let id = base
    for (let n = 2; reserved.has(id) || document.getElementById(id); n++) id = `${base}-${n}`
    element.id = id
    return id
  }

  /** A heading's link text:  an example's `heading`, else its title as the search reads it (`PageOutline.titleOf()`). */
  private static text(heading: Element): string {
    const text = heading.localName === EXAMPLE_TAG ? heading.getAttribute(HEADING) : PageOutline.titleOf(heading)
    return (text ?? "").replace(/\s+/g, " ").trim()
  }

  /** `heading` is part of demo markup (an example's, a template), below `root` (`PageOutline.demoAround()`). */
  private static insideExample(heading: Element, root: Element): boolean {
    const demo = PageOutline.demoAround(heading)
    return !!demo && root.contains(demo)
  }

  /** The listed `<ui-section>` (`ofSection`) nearest around `element`, below `root`;  `undefined` at the top. */
  private static enclosing(element: Element, root: Element, ofSection: Map<Element, TocEntry>): TocEntry | undefined {
    for (let section = element.parentElement?.closest(SECTION_TAG); section;) {
      if (!root.contains(section) || section === root) return undefined
      const entry = ofSection.get(section)
      if (entry) return entry
      section = section.parentElement?.closest(SECTION_TAG)
    }
    return undefined
  }

  /** `element` is hidden inside a folded `<ui-section>` (not counting itself). */
  private static folded(element: Element): boolean {
    for (let section = element.parentElement?.closest(SECTION_TAG); section;) {
      if (section.hasAttribute("collapsible") && section.getAttribute("open") === "false") return true
      section = section.parentElement?.closest(SECTION_TAG)
    }
    return false
  }

  /** The `<ui-tab>` children of `tabs` (any child with a `value` or the pane state). */
  private static panes(tabs: Element): Element[] {
    return [...tabs.children].filter((child) => child.localName !== "template")
  }

  /** `element` has custom state `name` (`false` where `:state()` isn't supported). */
  private static hasState(element: Element, name: string): boolean {
    try {
      return element.matches(`:state(${name})`)
    } catch {
      return false
    }
  }
}

/** An example's title attribute. */
const HEADING = "heading"

/** Where the shadow hosts are kept on `globalThis` (`hostTags()`). */
const SHADOW_HOSTS = Symbol.for("spell-ui:toc-shadow-hosts")
