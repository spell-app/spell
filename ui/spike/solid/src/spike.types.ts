/**
 * Shared types for the Solid spike's element core (`$spike`) -- how a `ComponentVocabulary` becomes typed,
 * converted property values, and what the pieces of the core hand each other.
 * - Runtime-light:  types, plus two name constants (`ERROR_EVENT`, `ERRORED_STATE`).
 */

import type { PropDefinition } from "@spell/solid-element"

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
 * - These ARE the fork's props:  one signal each, converted on the way in (attribute AND property writes), so
 *   reading one inside JSX, a memo or an effect TRACKS it with no memo layer of our own.
 */
export type AttributeValues<V extends ComponentVocabulary> = {
  readonly [S in V["attributes"][number] as CamelCase<S["name"]>]: SpecValue<S>
}

////////////////
// ## Element definition
////////////////

/** One attribute as the definition resolved it:  canonical spec, localized attribute name, property names. */
export type ResolvedAttribute = {
  spec: AttributeSpec
  /** attribute name authors write, e.g. `primario` */
  attribute: string
  /** camelCase CANONICAL name:  the key in `AttributeValues` and in the fork's props (`props.allowAdditions`) */
  key: string
  /** element property, e.g. `allowAdditions`, `permitirAdiciones`, or a vocabulary rename (`dividerHidden`) */
  property: string
  /** reflect property changes to the attribute */
  reflect: boolean
}

/** The fork's prop definitions for one tag, by `ResolvedAttribute.key`. */
export type PropDefinitions = Record<string, PropDefinition>

////////////////
// ## Errors
////////////////

/**
 * Event an element dispatches when its render fails, before showing its native fallback.
 * - Cancelable, `bubbles`, `composed`, `detail: { error }`;  `preventDefault()` keeps the fallback out (the
 *   page takes over).
 * - NOTE: no vocabulary names it yet (every element has it);  the Lit spike uses the same name.
 */
export const ERROR_EVENT = "ui-error"

/** Custom state of a failed element (`:state(errored)`), set by the fork's boundary and by the fallback. */
export const ERRORED_STATE = "errored"

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
