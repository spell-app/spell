/**
 * Shared types for the Lit spike's element core (`spike/lit/src/elements`).
 * - Type-level mirror of `VocabularyProperties`:  a component's vocabulary (`as const`) becomes its typed
 *   property bag, so `UIButton` gets `primary: boolean`, `size: string | undefined` ... with no hand-written
 *   field list.
 * - Runtime-light:  types only.
 */

import type { AttributeSpec, ComponentVocabulary } from "$/vocabulary"

////////////////
// ## Names
////////////////

/** `kebab-case` => `camelCase` at the type level, as `$/util`'s `camelCase()`. */
export type CamelCase<T extends string> = T extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<CamelCase<Tail>>}`
  : T

/** JS property name of an attribute:  its `property`, else `camelCase(name)`. */
export type PropertyName<S extends AttributeSpec> = S extends { property: infer P extends string }
  ? P
  : CamelCase<S["name"]>

/** Canonical attribute names of `V`. */
export type AttributeName<V extends ComponentVocabulary> = V["attributes"][number]["name"]
/** Canonical event names of `V`. */
export type EventName<V extends ComponentVocabulary> = V["events"][number]["name"]
/** Canonical slot names of `V`. */
export type SlotName<V extends ComponentVocabulary> = V["slots"][number]["name"]
/** Canonical part names of `V`. */
export type PartName<V extends ComponentVocabulary> = V["parts"][number]["name"]
/** Custom state names of `V`. */
export type StateName<V extends ComponentVocabulary> = V["states"][number]["name"]
/** Text keys of `V`. */
export type TextKey<V extends ComponentVocabulary> = V["texts"][number]["key"]

////////////////
// ## Property types
////////////////

/** Inline enum values of `S`, else `string` (shared value sets are open:  `ValueSets.add()`). */
type InlineValues<S> = S extends { values: readonly (infer T extends string)[] } ? T : string

/**
 * Property type of one attribute, by kind.
 * - keyOnly / boolean => `boolean`;  keyOrValueAndKey => `boolean` (bare) or a value
 * - enums with a `default` never read as `undefined`
 * - `json` => `unknown`;  components narrow it with `for()`'s overrides
 */
export type AttributeValue<S extends AttributeSpec> = S["kind"] extends "keyOnly" | "boolean"
  ? boolean
  : S["kind"] extends "keyOrValueAndKey"
    ? boolean | InlineValues<S>
    : S["kind"] extends "number"
      ? number | undefined
      : S["kind"] extends "width"
        ? string | number | undefined
        : S["kind"] extends "json"
          ? unknown
          : S extends { default: string }
            ? InlineValues<S>
            : (S["kind"] extends "string" ? string : InlineValues<S>) | undefined

/** Every attribute of `V` as a typed property. */
export type VocabularyProps<V extends ComponentVocabulary> = {
  -readonly [S in V["attributes"][number] as PropertyName<S>]: AttributeValue<S>
}

/**
 * Instance side of `UIElement.for(vocabulary)`:  the vocabulary's properties, with `Overrides` replacing
 * the ones a component types more precisely (`value: string | string[]`, `options: DropdownOptions`).
 */
export type DeclaredProps<V extends ComponentVocabulary, Overrides extends object> = Omit<
  VocabularyProps<V>,
  keyof Overrides
> &
  Overrides & {
    /** the component's canonical vocabulary, typed exactly */
    readonly vocabulary: V
  }

////////////////
// ## Styles
////////////////

/** A sheet a component adopts:  registry name + CSS text (`?inline` import), e.g. `["button", buttonCSS]`. */
export type SheetEntry = readonly [name: string, css: string]

////////////////
// ## Events
////////////////

/** Options for `UIElement.emit()`. */
export type EmitOptions = {
  /** `preventDefault()` vetoes the transition, e.g. `ui-close` */
  cancelable?: boolean
}
