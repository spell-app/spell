/**
 * Shared types for the Solid spike's element core (`$spike`) -- how a `ComponentVocabulary` becomes typed,
 * converted property values, and what the pieces of the core hand each other.
 * - Runtime-light:  types only.
 */

import type { AttributeSpec, ComponentVocabulary } from "$/vocabulary"

////////////////
// ## Names
////////////////

/** `allow-additions` => `allowAdditions`, at the type level (property names follow the vocabulary). */
export type CamelCase<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<CamelCase<Tail>>}`
  : S

/** Canonical attribute names of `V`. */
export type AttributeName<V extends ComponentVocabulary> = V["attributes"][number]["name"]

/** Canonical event names of `V`, e.g. `ui-change`. */
export type EventName<V extends ComponentVocabulary> = V["events"][number]["name"]

/** Canonical slot names of `V`;  `""` is the default slot. */
export type SlotName<V extends ComponentVocabulary> = V["slots"][number]["name"]

/** Canonical part names of `V`. */
export type PartName<V extends ComponentVocabulary> = V["parts"][number]["name"]

/** Custom state names of `V` (`:state(open)`). */
export type StateName<V extends ComponentVocabulary> = V["states"][number]["name"]

/** Text keys of `V`, looked up through `UI.i18n`. */
export type TextKey<V extends ComponentVocabulary> = V["texts"][number]["key"]

////////////////
// ## Converted values
////////////////

/**
 * Property type after conversion, per attribute spec.
 * - keyOnly / boolean => `boolean`  (`"no"` / `"false"` ~== false)
 * - keyOrValueAndKey => `true` (bare), `false`, or the validated value
 * - enumerated kinds => the validated value, `undefined` when absent or unknown;  an INLINE value list
 *   narrows to its literal union, so `attrs.type === "submit"` is checked against the vocabulary
 * - json => `unknown`:  the component casts to its own shape
 */
export type SpecValue<S extends AttributeSpec> = S["kind"] extends "keyOnly" | "boolean"
  ? boolean
  : S["kind"] extends "keyOrValueAndKey"
    ? InlineValues<S> | boolean
    : S["kind"] extends "number"
      ? number | undefined
      : S["kind"] extends "width" | "multiple"
        ? string | number | undefined
        : S["kind"] extends "json"
          ? unknown
          : InlineValues<S> | undefined

/** Literal union of an inline `values` list, else `string`. */
export type InlineValues<S extends AttributeSpec> = S["values"] extends readonly string[] ? S["values"][number] : string

/**
 * Every attribute of `V` as a converted, read-only property, keyed by camelCase canonical name:
 * `attrs.allowAdditions`, `attrs.size`.
 * - Reading one inside JSX, a memo or an effect TRACKS it (each is a memo over the raw prop).
 */
export type AttributeValues<V extends ComponentVocabulary> = {
  readonly [S in V["attributes"][number] as CamelCase<S["name"]>]: SpecValue<S>
}

////////////////
// ## component-register bridge
////////////////

/**
 * One entry of the props definition `component-register` takes (its `PropDefinition`, restated so callers
 * needn't import the library's types).
 * - `parse: false` always:  its JSON parse turns `""` into `undefined`, which would make a bare boolean
 *   attribute false.  `Converters` do all parsing instead.
 * - `reflect: false` always:  its reflection writes `"true"` for `true`;  `ElementDefinition` reflects instead.
 */
export type RegisterPropDefinition = {
  value: unknown
  attribute: string
  notify: boolean
  reflect: boolean
  parse: boolean
}

/** Raw, unconverted props as `withSolid` hands them over:  one reactive getter per property key. */
export type RawProps = Record<string, unknown>

/** One attribute as the definition resolved it:  canonical spec, localized attribute name, property key. */
export type ResolvedAttribute = {
  spec: AttributeSpec
  /** attribute name authors write, e.g. `primario` */
  attribute: string
  /** JS property key, e.g. `allowAdditions` / `permitirAdiciones` */
  key: string
  /** camelCase canonical name, the key in `AttributeValues` */
  canonicalKey: string
  /** reflect property changes to the attribute */
  reflect: boolean
}

////////////////
// ## Dropdown
////////////////

/** A header or divider row of a dropdown menu (from `<ui-item type="header|divider">`). */
export type MenuSeparator = {
  type: "header" | "divider"
  /** header text */
  text: string
}

/** One row of a dropdown menu, in order:  an option or a separator. */
export type MenuEntry = import("$/elements").MenuOption | MenuSeparator
