import * as UIT from "spell-ui/components/components.types"
import type { OutlineSection } from "./UIToc.types"

/****************
 * ### `PageOutline`
 * A page's sections, read the same way everywhere:
 * - LIVE from the page shown:  what the docs site's search (`<ui-docs-search>`) finds "On this page"
 * - by `yarn site:data`, into the search file for every page
 *   (`SiteSearchBuilder`, through `sections()`, on linkedom)
 * - the table of contents reads a page on top of it (`TocIndex.scan()`):  the same titles, the same demo markup left
 *   out (`titleOf()`, `demoAround()`)
 * - The docs search's until epic `ui-gaps` P14:  it moved with `<ui-toc>`, so a component never imports the docs
 *   widgets;  the search imports it from here.
 *
 * What it reads:
 * - a section:  a `<ui-section id>`, or a level 2-4 header with an id (`<ui-header level id>`, `<h2 id>` ...)
 *   - so a page not nested into sections yet (the overview) still lists its headings
 *   - never one inside an example, a token playground's preview, a `<template>` or a `<script>`
 * - its title:  the section's `label`, else its `slot="label"` child's text
 *   - a header's own text, without its sub header or icon
 * - its `parent`:  the section around it
 *   - a top-level one in a `<ui-tabs id="site-tabs">` pane names its `tab`
 * - every tab's sections, the hidden panes' too:  landing on one selects its tab (the site's router)
 * - Its links are `#id`:  the page shown, whatever its URL.
 * - Plain DOM, no Solid, no globals (node's linkedom runs it too).
 *   - NEVER imports a value from `spell-ui/core`, which node can't load.
 *   - Cheap enough to read on every search.
 * - Static only:  pure reads of the DOM it's given.
 * - It imports nothing of the search:  the site's sticky sections and table of contents load it with the page, the
 *   search only once it's used.
 ****************/
export class PageOutline {
  /**
   * `root`'s sections (titled ones only), in document order, and its tabs' labels by value.
   * - A section left out (no title) never breaks a `parent`:  indexes are of the list returned.
   */
  static sections(root: Element): { sections: OutlineSection[]; tabs: Record<string, string> } {
    const found = [...root.querySelectorAll(SECTIONS)].filter(
      (element) => !PageOutline.demoAround(element) && PageOutline.titleOf(element)
    )
    const index = new Map(found.map((element, at) => [element, at]))
    const tabs: Record<string, string> = {}
    for (const pane of root.querySelectorAll(PANES)) {
      const value = pane.getAttribute(VALUE)!
      tabs[value] = pane.getAttribute(LABEL) ?? value
    }
    const sections = found.map((element): OutlineSection => {
      const parent = PageOutline.parentOf(element, index)
      const pane = parent === undefined ? element.closest(PANES) : undefined
      return {
        id: element.id,
        title: PageOutline.titleOf(element),
        ...(parent !== undefined && { parent }),
        ...(pane && { tab: pane.getAttribute(VALUE)! })
      }
    })
    return { sections, tabs }
  }

  /** A section's or header's title (see the class). */
  static titleOf(element: Element): string {
    if (element.localName === SECTION_TAG) {
      return PageOutline.clean(UIT.SectionTitle.textOf(element) ?? "")
    }
    const copy = element.cloneNode(true) as Element
    for (const inner of copy.querySelectorAll(NOT_TITLE)) inner.remove()
    return PageOutline.clean(copy.textContent ?? "")
  }

  /**
   * The demo markup `element` is part of, if any:  an example's live markup, a token playground's preview, a
   * `<template>` or `<script>` around it (`NOT_PAGE`).
   */
  static demoAround(element: Element): Element | undefined {
    return element.parentElement?.closest(NOT_PAGE) ?? undefined
  }

  /**
   * Where a section sits:  its tab's label, then the titles of the sections around it, outermost first (not its own).
   * - `sections` are a page's (`OutlineSection`s, the search file's or the live outline's), `at` the section's index.
   */
  static trail(
    sections: readonly { title: string; parent?: number; tab?: string }[],
    at: number,
    tabs?: Readonly<Record<string, string>>
  ): string[] {
    const titles: string[] = []
    let tab: string | undefined
    for (let index = sections[at]!.parent; index !== undefined; index = sections[index]!.parent) {
      titles.unshift(sections[index]!.title)
      tab = sections[index]!.tab ?? tab
    }
    tab = sections[at]!.parent === undefined ? sections[at]!.tab : tab
    const label = tab && tabs && Object.hasOwn(tabs, tab) ? tabs[tab] : undefined
    return label ? [label, ...titles] : titles
  }

  /** Index of the nearest listed section around `element`, if any. */
  private static parentOf(element: Element, index: ReadonlyMap<Element, number>): number | undefined {
    for (let around = element.parentElement?.closest(SECTION_WITH_ID); around;) {
      const at = index.get(around)
      if (at !== undefined) return at
      around = around.parentElement?.closest(SECTION_WITH_ID)
    }
    return undefined
  }

  /** `text` with its whitespace collapsed. */
  private static clean(text: string): string {
    return text.replace(/\s+/g, " ").trim()
  }
}

/** What counts as a section. */
const SECTIONS =
  "ui-section[id], ui-header[id][level='2'], ui-header[id][level='3'], ui-header[id][level='4'], h2[id], h3[id], h4[id]"

/**
 * Never a page section:  demo markup (an example, a Theming playground's live example).
 * - The docs site's token playground (`<ui-docs-tokens>`) named as a tag only:  nothing of it is imported.
 */
const NOT_PAGE = "ui-example, ui-docs-tokens, template, script"

/** A tab pane of the page. */
const PANES = "ui-tabs#site-tabs > ui-tab[value]"

/** The section tag. */
const SECTION_TAG = "ui-section"

/** A section that can be a parent:  one with an id. */
const SECTION_WITH_ID = "ui-section[id]"

/** What a header's title leaves out:  its sub header, its icon, anything slotted. */
const NOT_TITLE = "ui-header, ui-icon, [slot]"

/** A pane's value attribute:  its tab's id. */
const VALUE = "value"

/** A pane's label attribute:  its tab's text. */
const LABEL = "label"
