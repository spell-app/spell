/**
 * The `ui-property-editor` family's shared pieces:  what its three vocabularies and components share.
 * - Pure data, at the bottom of the folder's imports (`import type` only):  node loads it (`yarn site:data`).
 */

import type { E } from "spell/ui/core"

/**
 * What an element PASSES THROUGH from the element it's built on:
 * a vocabulary's names, minus `skip`'s and those `own` names already.
 * - The editor passes through `<ui-section>`'s and `<ui-form>`'s;  the group, `<ui-section>`'s.
 * - Its own come first, in their order;  then each base's, in theirs.
 */
export function passThrough<T extends { name?: string; key?: string }>(
  own: readonly T[],
  bases: readonly (readonly T[])[],
  skip: readonly string[] = []
): T[] {
  const taken = new Set([...own.map(nameOf), ...skip])
  const names: T[] = [...own]
  for (const base of bases) {
    for (const item of base) {
      if (taken.has(nameOf(item))) continue
      taken.add(nameOf(item))
      names.push(item)
    }
  }
  return names
}

/** An attribute's, event's, slot's, part's or state's `name`, or a text's `key`. */
function nameOf(item: { name?: string; key?: string }): string {
  return item.name ?? item.key ?? ""
}

/** A vocabulary item list, as the vocabularies here build them. */
export type Names<K extends keyof E.ComponentVocabulary> = E.ComponentVocabulary[K]

/**
 * Where a property's value comes from, as whoever holds the thing knows it:  `<ui-property-editor origins>`.
 * - `kind`:
 *   - `"here"`:  set on this thing:  a dot by its label, its value bold under `show-defaults`
 *   - `"inherited"`:  it comes from somewhere else, e.g. its type:  a quieter label
 *   - `"worked out"`:  read only
 *   - `"data"`:  it's kept in a place outside the program, a back-end:  a mark by its label (`mark`)
 * - `from`:  the label's tooltip, saying where in words:  "From Card"
 * - `action`:  a small button at the row's end, which only says it was pressed (`ui-reset`, `ui-show-code`)
 * - `mark`:  a few words shown at the row's end, saying where in short:  "Real data · family cookbook"
 * - `readonly`:  it can't be changed here, whatever its kind:  `from` says why
 */
export type PropertyOrigin = {
  /** Where it comes from. */
  kind: "here" | "inherited" | "worked out" | "data"
  /** Where, in words. */
  from?: string
  /** The button it offers. */
  action?: "reset" | "show code"
  /** Where, in a few words, shown at the row's end:  its button, when it offers one. */
  mark?: string
  /** Read only, whatever its kind. */
  readonly?: boolean
}

/**
 * Writes a property's value to its thing in place of the plain set:  `<ui-property-editor writer>`.
 * - Answers whether it took the write:  `false`, the editor sets the property itself.
 */
export type PropertyWriter = (write: { thing: object; name: string; value: unknown }) => boolean

/** The tags of the family, for making one:  `document.createElement(PROPERTY_TAG)`. */
export const EDITOR_TAG = "ui-property-editor"
export const GROUP_TAG = "ui-property-group"
export const PROPERTY_TAG = "ui-property"

/**
 * Selectors for the family's elements, for `closest()` and `querySelectorAll()`:
 * the custom state each always carries, as `<ui-field>` carries `:state(field)`.
 * - So they find the elements whatever a translation calls their tags, e.g. `<es-editor-propiedades>`.
 * - Only once an element is drawn:  before that, a property finds its editor by what it is (`UIProperty`).
 */
export const EDITOR_SELECTOR = ":state(property-editor)"
export const GROUP_SELECTOR = ":state(property-group)"
export const PROPERTY_SELECTOR = ":state(property)"

/** Marks what an editor or a property added to its own light DOM, so it can take it away again. */
export const MADE_ATTRIBUTE = "data-ui-made"

/** `MADE_ATTRIBUTE`'s values on what an editor added:  from its schema (empty, `""`), or from its source page. */
export const MADE_FROM = { schema: "", source: "source" } as const

/**
 * On a nested editor a property made (`as="editor"`):  the property, whose value (a thing) it edits.
 * - Read from the editor or row around it, as the outer form's binding would.
 */
export const VALUE_FROM_ATTRIBUTE = "data-value-from"
