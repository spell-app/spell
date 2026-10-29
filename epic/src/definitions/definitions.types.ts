/**
 * Types of `spell/epic/definitions`:  the ONE description of every `<epic-*>` element, shared by the browser elements
 * and the node tools (the converter, the epic tool).
 * - An element's description IS its vocabulary, `components/<family>/<Name>.en.ts`:  every set's
 *   `ComponentVocabulary` (`spell/element`), plus what it lacks for a DOCUMENT format -- the children each element
 *   allows (its content model), required attributes and value formats.
 * - Bottom of the folder's import graph:  `import type` only, so it loads anywhere (node, browser, a vocabulary).
 *   `definitions.types` <- `Definitions` <- `spell/epic/markup`.
 */

// NOTE:  spell-element's vocabulary TYPES file, not its barrel or `spell/ui/core`:  those load the element layer (JSX,
// Vite-only imports), which a node tool's type check -- the docs tools, through the epic-page forwarders -- can't compile.
import type { AttributeSpec, ComponentVocabulary } from "spell/element/vocabulary.types"

import type { Definitions } from "./Definitions"

/** `allow-additions` => `allowAdditions`, at the type level:  spell-element's `CamelCase`
 * (`spell/element/elements.types`, beside the element layer), restated here so the definitions stay node-safe. */
export type CamelCase<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<CamelCase<Tail>>}`
  : S

////////////////
// ## Vocabulary
////////////////

/**
 * An `<epic-*>` element's vocabulary:  Spell UI's `ComponentVocabulary`, plus its content model.
 * - Write it as `export const epicItemVocabulary = { ... } as const satisfies EpicVocabulary`:  the element class
 *   reads it as any Spell UI family does (`E.UIComponent<typeof epicItemVocabulary>`), and `Definitions.all` lists it
 *   for the node tools.
 * - Pure data:  `import type` only (node imports it:  `spell pack build`, the tests, the tool).
 */
export type EpicVocabulary = Omit<ComponentVocabulary, "attributes"> & {
  attributes: readonly EpicAttributeSpec[]
  /**
   * The children it allows, as `ChildSpec`s:  epic-* tags, prose (`FLOW`), named slots.
   * - Empty:  no children at all.
   */
  children: readonly ChildSpec[]
  /**
   * `"listed"`:  children come in the order `children` lists them (a phase's Symptom before its Goal);  default
   * `"any"`.
   * - NOTE: children with a `slot` are never ordered:  a slot is a place in the drawing, not in the text.
   */
  childOrder?: ChildOrder
  /**
   * May sit INSIDE prose (a `<p>`, a `<li>` ...) wherever prose is allowed, and counts as prose where a content
   * model lists `FLOW`:  `<epic-update>`, the UPDATE marker;  `<epic-net-effect>`, a Net effect list (so no parent
   * lists it:  it goes wherever prose does);  `<epic-choices>` and `<epic-field label>`, option cards and labelled
   * blocks in any item's prose (P14).
   * - A parent may still list a flow tag with a `where` (a phase's `<epic-field name>`s, in their order):  where
   *   it lists no `FLOW`, only those match.
   */
  flow?: boolean
}

/**
 * One attribute, as Spell UI declares it, plus what a document format checks.
 * - The kinds used here are the property-only ones:  `string`, `enum` (with inline `values`), `boolean`, `number`.
 */
export type EpicAttributeSpec = AttributeSpec & {
  /**
   * MUST be present.  `"or slot"`:  present, or a child carries a slot of the same name -- `title`, when a title
   * holds markup (`<span slot="title">The <code>x</code> API</span>`).
   */
  required?: true | "or slot"
  /** The value's shape, beyond its kind:  a `Formats` name, e.g. `"date"`. */
  format?: FormatName
}

/** `EpicVocabulary.childOrder`. */
export const ChildOrders = ["any", "listed"] as const
/** One of `ChildOrders`. */
export type ChildOrder = (typeof ChildOrders)[number]

////////////////
// ## Content model
////////////////

/**
 * A child kind meaning PROSE:  text, and any element that isn't an `<epic-*>` (`<p>`, `<ul>`, `<ui-table>` ...),
 * plus the epic-* elements marked `flow` (`<epic-update>`).  As HTML calls it, "flow content".
 */
export const FLOW = "flow"

/**
 * One kind of child an element allows (`EpicVocabulary.children`).
 * - A child matches when its tag is `tag` (or it's prose, for `FLOW`), its slot is `slot` (none when `slot` is
 *   absent), and its attribute passes `where`.
 * - `when` limits the spec to parents whose attribute passes:  `<epic-section kind="phases">` holds phases, the
 *   other kinds items.
 */
export type ChildSpec = {
  /** An `<epic-*>` tag, or `FLOW` (prose). */
  readonly tag: string
  /** The slot the child carries (`slot="title"`);  absent:  the default slot, so the child carries none. */
  readonly slot?: string
  /** Only children whose attribute passes:  `<epic-field name="goal">`. */
  readonly where?: AttributeTest
  /** Only when the PARENT's attribute passes:  `<epic-section kind="phases">`. */
  readonly when?: AttributeTest
  /** At least this many;  default 0. */
  readonly min?: number
  /** At most this many;  default no limit. */
  readonly max?: number
  /** What it is, for docs. */
  readonly description: string
}

/** An attribute that must have one of `values`. */
export type AttributeTest = {
  readonly attribute: string
  readonly values: readonly string[]
}

////////////////
// ## Formats
////////////////

/**
 * The value formats an attribute may require (`EpicAttributeSpec.format`), by name.
 * - `date` -- `2026-10-07`
 * - `time` -- a date, or a date and time:  `2026-10-07 14:30`, or ISO with seconds and offset
 *   (`2026-10-06T09:28:23-04:00`), as the script stamps them
 * - `item id` -- `q7`, `j3`, `t1`, `i2`, `m4`:  its letter is its kind (`ItemLetters`)
 * - `phase id` -- `p-epic-migrate`:  stable, made from its name (`PhaseIds`, epic `epic-workflow` P15);
 *   an older page's `p3`, until the migration `stable-phase-ids`
 * - `phase number` -- a phase as people number it:  `3`, or a decimal phase's `11.1` (epic `epic-engine` P39)
 * - `decimal phase number` -- `11.1`:  a phase added on the fly, after P11 (`<epic-phase number>`)
 * - `anchor` -- any id a link may land on (`d7`, an old decision's, kept on its answer)
 * - `ids` -- anchors, space-separated (`data-part-ids` today)
 * - `sha` -- a git commit, 7 to 40 hex digits
 * - `url` -- a web address, `https://github.com/spell-app/spell-parser`
 * - `letter` -- an option's letter, `A` to `Z`
 * - `letters` -- option letters, space-separated:  a pick-any set's `chosen="A C"` (epic `epic-engine` P50)
 * - `epic name` -- the epic's folder name, `epic-components`
 * - `saga id` -- a saga's id, one or two words:  `drawable-spell`, `epics` (`sagas/sagas.json5`;  epic `epic-workflow` P15)
 * - `place` -- a place in an order, `1` first:  a prepared test's (`<epic-item prepared="2">`, epic `epic-engine` P51)
 */
export const Formats = {
  date: /^\d{4}-\d{2}-\d{2}$/,
  time: /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)?)?$/,
  "item id": /^[qjitm]\d+$/,
  "phase id": /^p(?:\d+|-[a-z0-9]+(?:-[a-z0-9]+)*)$/,
  "phase number": /^\d+(?:\.[1-9]\d*)?$/,
  "decimal phase number": /^\d+\.[1-9]\d*$/,
  anchor: /^[A-Za-z][\w-]*$/,
  ids: /^[A-Za-z][\w-]*( [A-Za-z][\w-]*)*$/,
  sha: /^[0-9a-f]{7,40}$/,
  url: /^https?:\/\/\S+$/,
  letter: /^[A-Z]$/,
  letters: /^[A-Z]( [A-Z])*$/,
  "epic name": /^[a-z0-9]+(-[a-z0-9]+)*$/,
  "saga id": /^[a-z][a-z0-9]*(-[a-z0-9]+)?$/,
  place: /^[1-9]\d*$/
} as const

/** A `Formats` name. */
export type FormatName = keyof typeof Formats

////////////////
// ## Sections and items
////////////////

/**
 * Every `<epic-section kind>` that sits in `<epic-page>`, in page order => its FIXED id, which every link to it
 * uses (`#decisions`:  "Questions" kept its old id).
 * - `overview-part`, the Overview's sub-sections, isn't here:  its ids are `o1`, `o2` ... (`OVERVIEW_PART_ID`);  nor
 *   `report` (`REPORT`), whose ids are its own.
 * - `choices`:  the standing option sets (`<epic-choices standing>`, epic `epic-engine` P50), only on a page that
 *   has one
 * - `epics`:  a SAGA page's Epics (`<epic-page kind="saga">`, epic `epic-workflow` P15), the cards of the epics
 *   serving it (`<epic-cards>`);  never on an epic page.
 */
export const SectionIds = {
  epics: "epics",
  choices: "choices",
  phases: "phases",
  questions: "decisions",
  judgements: "judgements",
  todos: "todos",
  issues: "issues",
  tests: "tests",
  log: "log"
} as const

/** A section kind in `<epic-page>`:  a key of `SectionIds`. */
export type PageSectionKind = keyof typeof SectionIds

/** The Overview's sub-sections' kind (Q14:  they get review notes too, so they're `<epic-section>`s). */
export const OVERVIEW_PART = "overview-part"

/**
 * A REPORT section's kind:  what a run wrote for Owen to read (an overnight `/bedtime` report), its own title,
 * its id free;  in `<epic-page>` right after the Overview, unnumbered (epic `epic-components` P14).
 */
export const REPORT = "report"

/** Every `<epic-section kind>`. */
export type SectionKind = PageSectionKind | typeof OVERVIEW_PART | typeof REPORT

/** An Overview sub-section's id:  `o1`, `o2` ... */
export const OVERVIEW_PART_ID = /^o\d+$/

/** `<epic-overview>`'s fixed id. */
export const OVERVIEW_ID = "overview"

/**
 * The sections that hold `<epic-item>`s => their items' id letter:  ONE element for every kind of item, its kind
 * its id's letter (Q11).
 * - Todo holds the work still to do, and (`<epic-item limit>`) the limits to know about;  Manual tests are `m`
 *   (epic `epic-engine` P44;  Owen, 2026-10-25:  "`Todo`, key T, `Manual tests` -- can we use `M`")
 *   - before P44:  Caveats (`c`) and Tests (`t`);  before P32:  Todos (`t`), Caveats (`c`) and Tests (`v`)
 *   - a comment's id took the `C` (`CommentList`):  it was `M`, for "mark"
 */
export const ItemLetters = {
  questions: "q",
  judgements: "j",
  todos: "t",
  issues: "i",
  tests: "m"
} as const satisfies Partial<Record<PageSectionKind, string>>

/** A section kind that holds items:  a key of `ItemLetters`. */
export type ItemSectionKind = keyof typeof ItemLetters

/**
 * An epic page's id that's a letter or two and a number, in any case:  an item's (`q7`, `J3`:  its letter is its kind,
 * `ItemLetters`), a comment's (`c3`, an old `cm3`), an Overview sub-section's (`o2`), an old decision's (`d7`).
 * - the ONE pattern every reader of one uses (`isItemId()`):  the epic tool, its inbox and migrations, `epic`'s
 *   command line
 * - NOT a phase's stable id (`p-epic-migrate`:  `PhaseIds.isStable()`);  an old phase id (`p3`) has the same shape, so a
 *   reader that takes both tells it apart first (`PlanDoc.renameEntry()`)
 */
export const ITEM_ID = /^[a-z]{1,2}\d+$/i

/** Is `text` an id of `ITEM_ID`'s shape:  `j3`, `C3`, `o2`? */
export function isItemId(text: string): boolean {
  return ITEM_ID.test(text)
}

////////////////
// ## Data
////////////////

/** Every `<epic-*>` tag `Definitions` knows. */
export type EpicTag = keyof typeof Definitions.all

/** `tag`'s vocabulary, as written. */
export type VocabularyOf<T extends EpicTag> = (typeof Definitions.all)[T]

/**
 * An element's DATA:  its attributes, typed, keyed by camelCase name (`reviewAs` for `review-as`, as its
 * component's attribute getters), as `Markup.read()` returns and `Markup.element()` / `set()` take.
 * - `boolean` => `boolean`, `number` => `number`, `enum` => its values' union, else `string`
 * - optional unless `required: true`;  absent attributes are left OUT, never `undefined` / `false`
 */
export type EpicData<T extends EpicTag> = Prettify<
  {
    -readonly [
      S in VocabularyOf<T>["attributes"][number] as S extends { required: true } ? CamelCase<S["name"]> : never
    ]: DataValue<S>
  } & {
    -readonly [
      S in VocabularyOf<T>["attributes"][number] as S extends { required: true } ? never : CamelCase<S["name"]>
    ]?: DataValue<S>
  }
>

/** One attribute's value in `EpicData`, by its kind. */
export type DataValue<S extends AttributeSpec> = S["kind"] extends "boolean"
  ? boolean
  : S["kind"] extends "number"
    ? number
    : S["values"] extends readonly string[]
      ? S["values"][number]
      : string

/** Any element's data, untyped:  what `Markup` works on inside. */
export type AnyEpicData = Record<string, string | number | boolean | undefined>
