/**
 * The types and constants of the docs API reference family:  what the component (`UIDocsApi`),
 * its table model (`ApiModel`) and the inline code splitter (`InlineCode`) share.
 * - Pure data:  `import type` only, so node can load it (`yarn site:data`).
 *   A constant only one class reads sits below that class.
 */

import type { SiteTag } from "spell/ui/docs-components/docs-components.types"
import type { docsApiVocabulary } from "./UIDocsApi.en"

////////////////
// ## Element
////////////////

/** `docsApiVocabulary`'s type. */
export type DocsApiVocabulary = typeof docsApiVocabulary

/** A text key of `<ui-docs-api>` (`docsApiVocabulary.texts`). */
export type DocsApiTextKey = DocsApiVocabulary["texts"][number]["key"]

/** One tag to draw:  its entry, whether it gets its own header (`family`), and its tables. */
export type ApiItem = {
  /** its entry in the site's data */
  readonly tag: SiteTag
  /** drawn under its own header, as one tag of a `family` */
  readonly isGrouped: boolean
  /** its non-empty tables */
  readonly sections: readonly ApiSection[]
}

/** The message shown instead of tables:  `<ui-message state>` and its text. */
export type ApiMessage = {
  /** `<ui-message>`'s `state` */
  readonly state: "negative" | "warning"
  /** its text */
  readonly key: DocsApiTextKey
  /** the text's `{name}`s */
  readonly params?: Record<string, string>
}

////////////////
// ## Table model
////////////////

/**
 * The tables, in the order they show;  a tag's empty ones are left out.
 * - `tags`:  a FAMILY's table, not a tag's:  each of its tags and its one-line summary
 *   (`ApiModel.tagsSectionFor()`;  epic `epic-engine` J127).
 *   Only a family of 2+ tags has one, and `ApiModel.sectionsFor()` never returns it.
 * - `properties`:  the `json` attributes (rich data), split out of `attributes` as the old Astro table did.
 * - `props` and `usedIn`:  a function component's (`SiteTag.props`, `SiteTag.usedIn`:  the spell app's App UI set).
 */
export const ApiSectionIds = [
  "tags",
  "props",
  "attributes",
  "properties",
  "events",
  "slots",
  "parts",
  "states",
  "texts",
  "usedIn"
] as const

/** One of `ApiSectionIds`. */
export type ApiSectionId = (typeof ApiSectionIds)[number]

/**
 * `only`'s values:  each table's id, as an attribute writes it (`usedIn` => `used-in`), in `ApiSectionIds` order.
 * - `ApiModel.onlyFor()` / `sectionIdFor()` turn one into the other.
 */
export const ApiOnlyValues = [
  "tags",
  "props",
  "attributes",
  "properties",
  "events",
  "slots",
  "parts",
  "states",
  "texts",
  "used-in"
] as const

/** One of `ApiOnlyValues`. */
export type ApiOnly = (typeof ApiOnlyValues)[number]

/** One table of a tag's API:  its columns' header texts and its rows. */
export type ApiSection = {
  /** which table, also its title's text key */
  readonly id: ApiSectionId
  /** the title's one-line note under it (inline code allowed), if it has one */
  readonly note?: DocsApiTextKey
  /** column header text keys, left to right */
  readonly columns: readonly DocsApiTextKey[]
  /** its rows, in the data's order */
  readonly rows: readonly ApiRow[]
}

/** One row:  a key unique in its table (the name), its name as the "On this page" list shows it, and its cells. */
export type ApiRow = {
  /** unique in its table:  the name */
  readonly key: string
  /**
   * what the "On this page" list calls it, and its anchor's last word (slugged):
   * the name as written (`size`, `ui-click`, `columnDefs`);  a state's bare name (`open`);  the default slot `default`
   */
  readonly name: string
  /** the first is always a `name` cell (the definition column) */
  readonly cells: readonly ApiCell[]
}

/**
 * One table cell.
 * - `name`:  the definition column:  `code` as code (`label` instead for the default slot), plus small notes under
 *   it (`alias`, `property` ...);  `href` makes the code a link (the tags table's, to the tag's first table)
 * - `text`:  prose with `` `code` `` spans (`InlineCode`);  defaults and detail types are written as code spans
 * - `values`:  allowed values as compact labels (`ApiModel.labelsFor()`);  `isSwatch` paints each in its own hue;
 *   `isRange` is a numeric run shown as one `first … last` label;  `set` the shared value set they come from
 */
export type ApiCell =
  | {
      readonly type: "name"
      readonly code?: string
      readonly label?: DocsApiTextKey
      readonly href?: string
      readonly notes: readonly ApiNote[]
    }
  | { readonly type: "text"; readonly text: string }
  | {
      readonly type: "values"
      readonly values: readonly string[]
      readonly set?: string
      readonly isSwatch: boolean
      readonly isRange: boolean
    }

/** A note under a name:  a text key, then optional code, e.g. `alias` + `checked`. */
export type ApiNote = {
  /** the note's word, e.g. `alias` */
  readonly key: DocsApiTextKey
  /** code after it, e.g. `checked` */
  readonly code?: string
}

////////////////
// ## Inline code
////////////////

/** A piece of a description:  plain text, or a code span's content. */
export type InlinePiece = {
  /** the text, without its fence */
  readonly text: string
  /** a code span's content */
  readonly isCode: boolean
}
