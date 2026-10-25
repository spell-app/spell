import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UIT } from "spell-ui/core"
import type { UILabelAttributes } from "spell-ui/jsx"
import {
  HeadingLevels,
  TOC_ENTRY_ATTRIBUTE,
  TOC_GROUP_ATTRIBUTE,
  type HeadingBounds,
  type SiteDataFile,
  type SiteTag
} from "spell-ui/docs-components/docs-components.types"
import { SiteData } from "spell-ui/docs-components/SiteData"
// A leaf, not the barrel:  its slugs are the page's section ids' words, and the barrel would define `<ui-docs-toc>`
import { TocIndex } from "spell-ui/docs-components/ui-docs-toc/TocIndex"
import { ApiModel } from "./ApiModel"
import { InlineCode } from "./InlineCode"
import {
  type ApiCell,
  type ApiItem,
  type ApiMessage,
  type ApiRow,
  type ApiSection,
  type ApiSectionId,
  type DocsApiTextKey,
  type DocsApiVocabulary
} from "./UIDocsApi.types"
import { docsApiVocabulary } from "./UIDocsApi.en"

import tableCSS from "spell-ui/components/ui-table/UITable.css?inline"
import apiCSS from "./UIDocsApi.css?inline"

/****************
 * ### `UIDocsApi`
 * The component behind `<ui-docs-api>`:  the API reference of a tag (`tag="ui-button"`),
 * or of every tag of a family (`family="ui-button"`), as Fomantic tables.
 *
 * - One `<ui-table celled padding="compact" definition>` per section, each under a `<ui-header>` title:
 *   attributes, properties, events, slots, parts, states, texts;  only the sections the tag has.
 * - Data:  `components.json5`, through `SiteData` (fetched once per page);  NEVER the vocabularies.
 *   What the tables hold comes from `ApiModel`.
 * - `family`:  each tag in its own `<section part="tag">`, under a `dividing` `<ui-header>`
 *   whose id is the tag and whose text links to itself.
 *   - The link is an `<a>` INSIDE the heading, not `<ui-header link>` (its `<a role="heading">` fails axe).
 *   - Fragment links can't reach ids inside a shadow root, so the component scrolls to `location.hash` itself:
 *     once its tables are drawn, and on every `hashchange` while connected.
 * - `only` (`only="attributes"`):  ONE kind of table, as one section of a page (the site's API tab:  a section per
 *   kind, written by `yarn site:sections`).
 *   - No table title:  the page's section has it.
 *   - A family's tags each under a small header, when it has more than one;  a tag without that table is left out.
 *     No summaries under them:  seven sections would say them seven times.
 *   - `only="tags"` says them once instead (epic `epic-engine` J127):  the family's table of its tags,
 *     each with its summary, its name a link to its first table below (`#ui-or`, which the page lands on).
 *     Drawn only for a family of 2+ tags, so it's a family page's first API section.
 *   - Every row's name cell has an id, `<anchor>-<name>` (`anchorFor()`), and marks itself an entry of the page's
 *     "On this page" list (`TOC_ENTRY_ATTRIBUTE`);  so do the tag headers, as groups.
 *   - The page lands on them (the site's `SiteSections`):  the browser can't reach an id in a shadow root.
 *     This element only FLASHES the row the hash names (`landedId`), when its tables are drawn and on `hashchange`.
 * - Descriptions:  `` `code` `` spans become `<code>` (`InlineCode`), as text nodes, never HTML.
 * - Values:  compact `<ui-labels size="mini">`;  hues painted in their own colour, a numeric run as one label.
 * - NEVER stacks (`stack-by="none"`;  Owen, 2026-10-25:  a table never stacks, epic `debut` J64):
 *   too wide for its column (phone width), it scrolls sideways in `<ui-table>`'s own scroller, a focusable region.
 * - Sheets:  `UITable.css` is adopted HERE too:
 *   `<ui-table>` styles its light-DOM `<table>` with a PAGE sheet, which never reaches a table inside this shadow root.
 * - A doc-only element (`src/docs-components/`):  its shadow DOM is built of other families' widgets,
 *   which its barrel imports.
 ****************/
export class UIDocsApi extends E.UIComponent<DocsApiVocabulary> {
  @E.proto static vocabulary = docsApiVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { table: tableCSS, "docs-api": apiCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The data
  ////////////////

  /** The site's data, once fetched. */
  @E.state accessor siteData: SiteDataFile | undefined = undefined

  /** Why the data couldn't be fetched, if it couldn't. */
  @E.state accessor loadError: Error | undefined = undefined

  /** The fetch, started on first connect;  settles once `siteData` or `loadError` is set. */
  readonly fetched: Promise<void> = isServer ? Promise.resolve() : this.fetch()

  /** Waiting for the data (never in a server render:  nothing loads). */
  @E.cssState("loading")
  get isLoading(): boolean {
    return !isServer && !this.siteData && !this.loadError
  }

  /** Fetch the site's data into `siteData`, or the reason it failed into `loadError`. */
  private fetch(): Promise<void> {
    return SiteData.load().then(
      (data) => void (this.siteData = data),
      (error: unknown) => void (this.loadError = error instanceof Error ? error : new Error(String(error)))
    )
  }

  ////////////////
  // ## What to draw
  ////////////////

  /** What to draw:  one entry per tag, with its tables;  `undefined` until the data is in. */
  @E.derived
  get items(): ApiItem[] | undefined {
    const data = this.siteData
    return data && UIDocsApi.itemsFor(data, { tag: this.tag, family: this.family })
  }

  /** The message to show instead of tables, if any:  a failed fetch, no `tag` / `family`, an unknown tag. */
  get message(): ApiMessage | undefined {
    const failure = this.loadError
    if (failure) return { state: NEGATIVE, key: "loadError", params: { error: failure.message } }
    const items = this.items
    if (!items || items.length) return undefined
    const name = this.family || this.tag
    return name ? { state: WARNING, key: "notFound", params: { tag: name } } : { state: WARNING, key: "noTag" }
  }

  /** Shows a message:  any (an unknown tag too), not only a failed fetch. */
  @E.cssState("error")
  get hasMessage(): boolean {
    return !!this.message
  }

  /** The one table `only` names;  `undefined` draws them all. */
  get onlyId(): ApiSectionId | undefined {
    return ApiModel.sectionIdFor(this.only)
  }

  /** What's drawn:  `items`, or with `only` each tag with just that table (the tags without it left out). */
  @E.derived
  get shownItems(): ApiItem[] {
    const only = this.onlyId
    const items = this.items ?? []
    if (!only) return items
    if (only === TAGS) return []
    return items
      .map((item) => ({ ...item, sections: item.sections.filter((section) => section.id === only) }))
      .filter((item) => item.sections.length)
  }

  /** With `only="tags"`:  the family's table of its tags (2+ tags only). */
  @E.derived
  get tagsSection(): ApiSection | undefined {
    if (this.onlyId !== TAGS || !this.family) return undefined
    return ApiModel.tagsSectionFor((this.items ?? []).map((item) => item.tag))
  }

  /**
   * A tag gets its own header:  with `family`;  with `only` too, only when the family has more than one tag
   * (one tag's section needs no header saying which).
   */
  private hasHeader(item: ApiItem): boolean {
    return item.isGrouped && (!this.onlyId || (this.items?.length ?? 0) > 1)
  }

  /** Heading level of the topmost headers, clamped. */
  get headingLevel(): number {
    return HeadingLevels.levelFor(this.level, LEVELS)
  }

  /** Drawn (`isReady`) with tables:  announce them, and scroll to `location.hash` if it names one of them. */
  @E.onChange("isReady", "items")
  protected onItemsChanged(isReady: boolean, items: ApiItem[] | undefined) {
    if (isReady && items?.length) this.onTablesDrawn(items)
  }

  /** The tables are in the DOM:  announce them, then scroll to `location.hash` if it names one of them. */
  private onTablesDrawn(items: readonly ApiItem[]) {
    this.send("ui-drawn", { tags: items.map((item) => item.tag.tag) })
    void this.reveal(location.hash)
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <section class={this.rootClass} part={this.partForName("api")}>
        <Show when={this.message}>
          {(message) => (
            <ui-message part={this.partForName("message")} state={message().state} size={SMALL}>
              {this.inline(this.translationForKey(message().key, message().params))}
            </ui-message>
          )}
        </Show>
        <For each={this.shownItems}>{(item) => this.item(item)}</For>
        <Show when={this.tagsSection}>{(section) => this.table(section(), this.tagsOwner)}</Show>
      </section>
    )
  }

  /** One tag:  its tables, under its own header and summary with `family`. */
  private item(item: ApiItem): JSX.Element {
    if (!this.hasHeader(item))
      return <For each={item.sections}>{(section) => this.table(section, this.ownerFor(item))}</For>
    const only = !!this.onlyId
    const tag = `<${item.tag.tag}>`
    return (
      <section class={TAG_CLASS} part={this.partForName("tag")}>
        <ui-header
          part={this.partForName("header")}
          id={only ? this.anchorFor(item) : item.tag.tag}
          level={HeadingLevels.attributeFor(this.headingLevel)}
          dividing=""
          {...(only ? { [TOC_ENTRY_ATTRIBUTE]: tag, [TOC_GROUP_ATTRIBUTE]: "" } : {})}
        >
          <a href={`#${item.tag.tag}`}>
            <code>{tag}</code>
          </a>
        </ui-header>
        <Show when={!only && item.tag.description}>
          <p class={UIT.DESCRIPTION} part={this.partForName("description")}>
            {this.inline(item.tag.description ?? "")}
          </p>
        </Show>
        <For each={item.sections}>{(section) => this.table(section, this.ownerFor(item))}</For>
      </section>
    )
  }

  /** Whose tables these are:  `item`'s. */
  private ownerFor(item: ApiItem): TableOwner {
    return {
      label: (section) => this.translationForKey("tableLabel", { section, tag: `<${item.tag.tag}>` }),
      level: item.isGrouped ? this.headingLevel + 1 : this.headingLevel,
      anchor: () => this.anchorFor(item)
    }
  }

  /** The tags table's owner:  the family;  its rows' ids start with the section's (`api-tags-ui-or`). */
  private get tagsOwner(): TableOwner {
    return {
      label: () => this.translationForKey("tagsTableLabel", { family: this.family ?? "" }),
      level: this.headingLevel,
      anchor: () => this.anchorBase
    }
  }

  /** One table:  its title (none with `only`) and note, then the `<ui-table>`;  `owner` says whose. */
  private table(section: ApiSection, owner: TableOwner): JSX.Element {
    return (
      <>
        <Show when={!this.onlyId}>
          <ui-header part={this.partForName("title")} level={HeadingLevels.attributeFor(owner.level)} size={SMALL}>
            {this.translationForKey(section.id)}
          </ui-header>
        </Show>
        <Show when={section.note}>
          <p class={NOTE_CLASS} part={this.partForName("note")}>
            {this.inline(section.note ? this.translationForKey(section.note) : "")}
          </p>
        </Show>
        <ui-table part={this.partForName("table")} celled="" padding="compact" definition="" stack-by="none">
          <table aria-label={owner.label(this.translationForKey(section.id))}>
            {/* `full-width`:  the first column's header is a header like the rest, not the definition table's blank corner */}
            <thead class={FULL_WIDTH_CLASS}>
              <tr>
                <For each={section.columns}>{(column) => <th scope="col">{this.translationForKey(column)}</th>}</For>
              </tr>
            </thead>
            <tbody>
              <For each={section.rows}>{(row) => this.row(owner, row, section.columns)}</For>
            </tbody>
          </table>
        </ui-table>
      </>
    )
  }

  /**
   * One row;  with `only`, its name cell an anchor and an "On this page" entry, and the row flashing when landed on.
   * - `columns`:  its table's, so each cell knows which column it's in (`cell()`).
   */
  private row(owner: TableOwner, row: ApiRow, columns: readonly DocsApiTextKey[]): JSX.Element {
    const id = this.onlyId ? `${owner.anchor()}-${TocIndex.slug(row.name)}` : undefined
    return (
      <tr class={{ [LANDED_CLASS]: !!id && this.landedId === id }}>
        <For each={row.cells}>{(cell, at) => this.cell(cell, columns[at()], id && { id, name: row.name })}</For>
      </tr>
    )
  }

  /**
   * One cell:  a name as the row's `<th>`, prose with code spans, or values as labels.
   * - `column`:  its column's header key;  the description column's cells are `td.description`,
   *   kept wide enough to read (`UIDocsApi.css`)
   * - `member`:  the row's anchor id and "On this page" text, with `only`.
   */
  private cell(
    cell: ApiCell,
    column: DocsApiTextKey | undefined,
    member?: { id: string; name: string } | ""
  ): JSX.Element {
    if (cell.type === "name") {
      return (
        <th
          scope="row"
          id={member ? member.id : undefined}
          part={member ? this.partForName("member") : undefined}
          {...(member ? { [TOC_ENTRY_ATTRIBUTE]: member.name } : {})}
        >
          {cell.code === undefined ? (
            <em>{cell.label ? this.translationForKey(cell.label) : ""}</em>
          ) : cell.href ? (
            <a href={cell.href}>
              <code>{cell.code}</code>
            </a>
          ) : (
            <code>{cell.code}</code>
          )}
          <For each={cell.notes}>
            {(note) => (
              <small class={CAPTION_CLASS}>
                {this.translationForKey(note.key)}
                <Show when={note.code !== undefined}>
                  {" "}
                  <code>{note.code}</code>
                </Show>
              </small>
            )}
          </For>
        </th>
      )
    }
    if (cell.type === "text") {
      return <td class={column === DESCRIPTION_COLUMN ? DESCRIPTION_CLASS : undefined}>{this.inline(cell.text)}</td>
    }
    return (
      <td class={VALUES_CLASS}>
        <ui-labels size="mini">
          <For each={ApiModel.labelsFor(cell)}>
            {(value) => (
              // a swatch's value is a hue's name, from the site data:  JSON, so TypeScript can't see which
              <ui-label
                appearance={cell.isSwatch ? undefined : "basic"}
                color={cell.isSwatch ? (value as UIHue) : undefined}
              >
                {value}
              </ui-label>
            )}
          </For>
        </ui-labels>
        <Show when={cell.set}>
          <small class={CAPTION_CLASS}>
            {this.translationForKey("valueSet")} <code>{cell.set}</code>
          </small>
        </Show>
      </td>
    )
  }

  /** `text` with its `` `code` `` spans as `<code>`. */
  private inline(text: string): JSX.Element {
    return <For each={InlineCode.parse(text)}>{(piece) => (piece.isCode ? <code>{piece.text}</code> : piece.text)}</For>
  }

  ////////////////
  // ## Anchors
  ////////////////

  /**
   * The start of `item`'s ids, with `only`:  the id of the page's `<ui-section>` around this element
   * (`api-attributes`), else `only`'s value;  then the tag when it has its own header (`api-attributes-ui-or`).
   * - Read from the page as it's drawn:  the sections are written into the page, and never move.
   */
  private anchorFor(item: ApiItem): string {
    const base = this.anchorBase
    return this.hasHeader(item) ? `${base}-${item.tag.tag}` : base
  }

  /** The id of the page's `<ui-section>` around this element, else `only`'s value (`anchorFor()`). */
  private get anchorBase(): string {
    const section = isServer ? undefined : this.domElement.closest(SECTION_TAG)?.id
    return section || this.only || ""
  }

  ////////////////
  // ## Scrolling to the hash, and flashing a landed row
  ////////////////

  /** Id of the row flashing, just landed on (`only`). */
  @E.state accessor landedId: string | undefined = undefined

  /** Ends the flash. */
  private flashTimer?: E.CancelablePromise<unknown>

  /** Flash the row `id` names:  off first, so landing on it again flashes again;  off after `FLASH_SECONDS`. */
  private flash(id: string): void {
    this.flashTimer?.cancel()
    this.landedId = undefined
    E.beforeNextPaint(() => {
      this.landedId = id
      this.flashTimer = E.after(FLASH_SECONDS, () => (this.landedId = undefined))
    })
  }

  /** While connected:  follow `hashchange`. */
  @E.whileConnected
  protected followHash() {
    window.addEventListener("hashchange", this.onHashChange)
    return () => window.removeEventListener("hashchange", this.onHashChange)
  }

  /** `hashchange`:  scroll to the new hash, if it's one of this element's tag headers. */
  private readonly onHashChange = () => void this.reveal(location.hash)

  /**
   * Scroll the tag header `hash` names into view, if it's in this shadow root.
   * - With `only`, the page lands instead (the site's `SiteSections`, below its stuck titles):
   *   this only flashes the row `hash` names, if it's one of its own.
   * - Waits for the widgets in the shadow root to render first (`ready`):
   *   until they do, the tables above it are still growing, and the scroll would land short.
   * - Scrolls the header's `<section>` when the `<ui-header>` draws no box of its own (`display: contents`).
   */
  private async reveal(hash: string): Promise<void> {
    const id = UIDocsApi.idForHash(hash)
    const root = this.domElement.renderRoot
    const header = id ? (root as ShadowRoot).getElementById?.(id) : undefined
    if (!header) return
    if (this.onlyId) {
      if (header.localName === "th") this.flash(id)
      return
    }
    const elements = [...root.querySelectorAll("*")].filter((element) => "ready" in element)
    await Promise.all(elements.map((element) => (element as Element & { ready: Promise<void> }).ready))
    E.beforeNextPaint(() => (header.getClientRects().length ? header : header.parentElement)?.scrollIntoView())
  }

  /**
   * The id a `location.hash` names, decoded;  `""` for none or a malformed one.
   * - Static:  pure.
   */
  private static idForHash(hash: string): string {
    try {
      return decodeURIComponent(hash.replace(/^#/, ""))
    } catch {
      return ""
    }
  }

  /**
   * What `tag` / `family` name in `data`:  a family's tags in its order (grouped, each with a header),
   * else the one tag (no header);  `[]` when neither is set or the data has no such tag.
   * - Static:  pure.
   */
  private static itemsFor(data: SiteDataFile, { tag, family }: ItemsParams): ApiItem[] {
    if (family) {
      const tags = SiteData.family(data, family)?.tags ?? []
      return tags
        .map((name) => SiteData.tag(data, name))
        .filter((entry): entry is SiteTag => !!entry)
        .map((entry) => ({ tag: entry, isGrouped: true, sections: ApiModel.sectionsFor(entry) }))
    }
    const entry = tag ? SiteData.tag(data, tag) : undefined
    return entry ? [{ tag: entry, isGrouped: false, sections: ApiModel.sectionsFor(entry) }] : []
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UIDocsApi extends E.AttributeValues<DocsApiVocabulary> {}

/** What `itemsFor()` draws:  the `tag` and `family` attributes. */
type ItemsParams = {
  /** one tag, with no header */
  tag?: string
  /** every tag of a family, each under its header;  wins over `tag` */
  family?: string
}

/** Whose table one is:  what `table()` and `row()` need of a tag, or of the family (the tags table). */
type TableOwner = {
  /** the table's accessible name, given its title */
  label: (section: string) => string
  /** its title's heading level, when it has one (no `only`) */
  level: number
  /** the start of its rows' ids, with `only` */
  anchor: () => string
}

/** `only`'s family table:  its tags (`ApiModel.tagsSectionFor()`). */
const TAGS = "tags"

/** A page section:  `only`'s anchors start with the id of the one around this element. */
const SECTION_TAG = "ui-section"

/** Class of a row while it flashes, landed on. */
const LANDED_CLASS = "landed"

/** How long a landed row flashes, s (its animation in `UIDocsApi.css`, with a beat for the page's scroll first). */
const FLASH_SECONDS = 2.5

/** Class word of one tag's block, with `family`. */
const TAG_CLASS = "tag"

/** Classes of the line under a table's title:  muted. */
const NOTE_CLASS = "note ui-muted"

/** Class of the API tables' head:  Fomantic's `full-width`, so a definition table's first header isn't a blank corner. */
const FULL_WIDTH_CLASS = "full-width"

/** The description column's header key. */
const DESCRIPTION_COLUMN = "description" satisfies DocsApiTextKey

/** Class of a description cell:  kept wide enough to read, the table scrolling sideways instead. */
const DESCRIPTION_CLASS = "description"

/** Class of a values cell:  wide enough for its labels to flow in rows. */
const VALUES_CLASS = "values"

/** Class of the small notes under a name or values:  the caption utility. */
const CAPTION_CLASS = "ui-caption"

/** `size` of the table titles and the message. */
const SMALL = "small"

/** A hue's name, as `<ui-label color>` takes it. */
type UIHue = UILabelAttributes["color"]

/** `<ui-message>` `state` of a failed fetch. */
const NEGATIVE = "negative"

/** `<ui-message>` `state` of a missing or unknown tag. */
const WARNING = "warning"

/**
 * `level`:  a heading level, leaving room for the table titles one level deeper;
 * unset, `3`, under the page's `h2` "API" section.
 */
const LEVELS: HeadingBounds = { min: 1, max: 5, fallback: 3 }
