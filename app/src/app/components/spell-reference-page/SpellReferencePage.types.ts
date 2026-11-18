/**
 * What `<spell-reference-page>` draws, whatever it's a reference of (epic `data` P53, Q98):
 * a place's today (`PlaceReferenceSource`), the language's and an app's later, each handing it the same shapes.
 * - What a source FOUND (lists, fields, states) is `Reference`:  made from the source each time, never edited.
 * - What a PERSON wrote (`ReferenceWords`) is apart, by key:  so an edit redraws only the words, every fold staying
 *   as it was.
 * - Types only:  it erases completely.
 */

import type { JSX } from "@solidjs/web"

/** A whole reference page:  its line at the top, then its folded sections. */
export type Reference = {
  /** Its title:  the place's name, `netbox`. */
  title: string
  /** The facts on its line, under the title:  what it is, where, its version, when it was looked at. */
  facts: ReferenceLine[]
  /** How many things it has, and how many are in each state:  labels on its line. */
  counts: ReferenceCount[]
  /** The key of its own words, the prose at its top:  `undefined`, it has none to show. */
  wordsKey?: string
  /** Its sections, each folded to start. */
  sections: ReferenceSection[]
}

/** A line of a reference, its tooltip what it rests on. */
export type ReferenceLine = {
  /** What it says. */
  text: string
  /** Its tooltip. */
  title?: string
  /** In the code face:  an address. */
  isCode?: boolean
}

/** A count on a reference's line:  `Lists 143`, `Verified 12`. */
export type ReferenceCount = {
  /** What's counted. */
  label: string
  /** How many. */
  count: number
  /** Its label's colour:  a state's. */
  color?: ReferenceColor
  /** Its tooltip:  what the state means. */
  title?: string
}

/** The colours a state's label takes:  Spell UI's. */
export type ReferenceColor = "green" | "red" | "yellow" | "grey" | "blue" | "orange"

/**
 * One folded section, `<spell-reference-section>`:  a tag's lists, one list, its fields.
 * - What's in it is drawn only once it's first opened:  NetBox's 143 lists stay quick.
 */
export type ReferenceSection = {
  /** Its id, the same each time it's made:  `list:jobs`. */
  id: string
  /** Its title. */
  label: string
  /** A line under its title:  a list's address. */
  hint?: string
  /** A count after its title. */
  badge?: string
  /** A state after its title, in its badge's place. */
  state?: ReferenceState
  /** The key of a person's words about it. */
  wordsKey?: string
  /** Quiet lines at its top:  how trying it went, why it's left out. */
  lines?: ReferenceLine[]
  /** A small table:  where a place runs. */
  table?: ReferenceTable
  /** Its items:  a list's fields, its changes. */
  items?: ReferenceItem[]
  /** Its own sections, set in. */
  sections?: ReferenceSection[]
  /** Notes, a bullet each. */
  notes?: string[]
  /** Said when it has nothing else:  `Your project names no other server ...`. */
  empty?: string
}

/** One thing in a section, `<spell-reference-item>`:  a field, a change. */
export type ReferenceItem = {
  /** Its id, the same each time it's made:  `field:jobs:status`. */
  id: string
  /** Its name, in the code face:  `status`. */
  name: string
  /** What it is, a phrase each:  `text`, `one of pending or done`, `required`. */
  says: string[]
  /** How trying it went:  a change's. */
  state?: ReferenceState
  /** The key of a person's words about it. */
  wordsKey?: string
}

/** How trying something went, `<spell-reference-state>`:  a label, its words and colour, why in its tooltip. */
export type ReferenceState = {
  /** Its words:  `Verified`. */
  label: string
  /** Its colour. */
  color?: ReferenceColor
  /** Its tooltip:  the whole story, in short lines. */
  title?: string
}

/** A small table of a section:  its columns' headers, a row of cells each. */
export type ReferenceTable = {
  /** Each column's header. */
  columns: string[]
  /** Each row's cells, as text;  a column in `codeColumns` in the code face. */
  rows: string[][]
  /** The columns drawn in the code face, by index. */
  codeColumns?: number[]
}

/** A person's words about something, as its source's file has them now. */
export type ReferenceWords = {
  /** The words, a line each;  `""`, none yet. */
  text: string
  /** The dated marks its source's tool wrote:  found new, or gone. */
  marks: { is: "new" | "gone"; date: string }[]
}

/** An edit of a file's text:  `start` to `end` (offsets from 0) made `newText`. */
export type ReferenceTextEdit = { start: number; end: number; newText: string }

/**
 * Where a reference comes from:  what `<spell-reference-page>` is handed, by its `src` or its `source` property.
 * - A place's:  `PlaceReferenceSource`.
 * - Read once;  only its words change after, as they're edited.
 */
export interface ReferenceSource {
  /** What it found, to draw. */
  readonly reference: Reference
  /** The file a person's words are kept in:  `@spell/examples/StarWars/StarWars.api.spell`;  none, they can't be edited. */
  readonly wordsFile: string | undefined
  /** Every person's words, by key, as the file has them now. */
  words(): Record<string, ReferenceWords>
  /**
   * The edit that makes `words` the words of `key` in `text`, the words file's text:
   * the page saving it works it out again on the file as it is then.
   * - throws `TypeError` when `key` isn't in `text`
   */
  editIn(text: string, key: string, words: string): ReferenceTextEdit
  /** SIDE EFFECT:  the words file is now `text`, as it was saved. */
  take(text: string): void
}

/**
 * `<spell-reference-page>`'s `spell-reference-edit` event's `detail`:  a person changed some words, for the page to
 * save.
 * - The page saves them through `waitUntil()`;  none called, nothing's saved, and the element says so.
 */
export type ReferenceEditDetail = {
  /** The file to change:  the source's `wordsFile`. */
  file: string
  /** Whose words:  a key of the source's `words()`. */
  key: string
  /** The words now. */
  words: string
  /** The edit making them so in `text`, the file as the saver has it. */
  editIn(text: string): ReferenceTextEdit
  /**
   * Saving it:  `saving` resolves with the file's text once it's saved, which the element shows the words from;
   * or it rejects, and the element says why.
   */
  waitUntil(saving: Promise<string>): void
}

////////////////
// ## Its tags in JSX
////////////////

/** `<spell-reference-page>`'s attributes in JSX. */
export type ReferencePageAttributes = JSX.HTMLAttributes<HTMLElement> & {
  /** A place's description:  `@spell/examples/StarWars/StarWars.api.json5`. */
  src?: string
  /** An option-click makes words clearer:  `""` for on. */
  editable?: "" | boolean
}

declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      "spell-reference-page": ReferencePageAttributes
      // its parts, in its shadow root:  tags of their own, so a page can style them
      "spell-reference-section": JSX.HTMLAttributes<HTMLElement>
      "spell-reference-item": JSX.HTMLAttributes<HTMLElement>
      "spell-reference-state": JSX.HTMLAttributes<HTMLElement>
    }
  }
}
