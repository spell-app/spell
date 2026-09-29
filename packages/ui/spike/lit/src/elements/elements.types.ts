/**
 * Shared types for the Lit spike's element core (`spike/lit/src/elements`).
 * - Type-level mirror of `VocabularyProperties`:  a component's vocabulary (`as const`) becomes its typed
 *   property bag, so `UIButton` gets `primary: boolean`, `size: string | undefined` ... with no hand-written
 *   field list.
 * - Runtime-light:  types, plus the `RESERVED_PROPERTIES` list they mirror and two failure names
 *   (`ERROR_EVENT`, `ERRORED_STATE`).
 */

import type { NativeFallbackHandle, NativeFallbackRoot } from "$/elements"
import type { AttributeSpec, ComponentVocabulary } from "$/vocabulary"

////////////////
// ## Names
////////////////

/** `kebab-case` => `camelCase` at the type level, as `$/util`'s `camelCase()`. */
export type CamelCase<T extends string> = T extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<CamelCase<Tail>>}`
  : T

/**
 * `HTMLElement` members a vocabulary attribute may be named after, which an element MUST NOT shadow:
 * `VocabularyProperties.propertyName()` prefixes them with the noun (`style` => `iconStyle`).
 * - Short and literal (not `name in HTMLElement.prototype`), so `PropertyName` can mirror it in types.
 */
export const RESERVED_PROPERTIES = ["style", "hidden", "title", "lang", "dir", "slot", "id", "inert"] as const

/** A name in `RESERVED_PROPERTIES`. */
export type ReservedProperty = (typeof RESERVED_PROPERTIES)[number]

/** Name an attribute's property would have, before the reserved-name rename. */
type BaseName<S extends AttributeSpec> = S extends { property: infer P extends string } ? P : CamelCase<S["name"]>

/**
 * JS property name of an attribute of a component with noun `Noun`:  its `property`, else `camelCase(name)`;
 * a reserved name gets the noun in front (`iconStyle`).  Mirrors `VocabularyProperties.propertyName()`.
 */
export type PropertyName<S extends AttributeSpec, Noun extends string = string> =
  BaseName<S> extends ReservedProperty ? `${CamelCase<Noun>}${Capitalize<BaseName<S>>}` : BaseName<S>

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
  -readonly [S in V["attributes"][number] as PropertyName<S, V["noun"]>]: AttributeValue<S>
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

/**
 * `UI.styles` name of `parts.css`, registered by the part elements (`PartElement`).
 * - Adopted BY NAME by other components that act as a part in some owner (a statistic's `<ui-label>`), so they
 *   don't import the sheet:  whoever owns them loads the parts.
 */
export const PARTS_SHEET = "parts"

////////////////
// ## Events
////////////////

/** Options for `UIElement.emit()`. */
export type EmitOptions = {
  /** `preventDefault()` vetoes the transition, e.g. `ui-close` */
  cancelable?: boolean
}

////////////////
// ## Owner context
////////////////

/** What `PartOwners` tracks:  one element that resolves its owner (see `OwnerController`). */
export type OwnerTracker = {
  /** the part (or icon, label) looking for its owner */
  readonly element: Element
  /** look the owner up again and apply it */
  resolveOwner(): void
}

/** Options for `OwnerController`. */
export type OwnerControllerOptions = {
  /**
   * Only an owner that is the element's direct flat-tree parent counts:  its light-DOM parent, or the host
   * of the shadow root it was rendered into.  `<ui-icon>` in `<ui-icons>`.
   */
  direct?: boolean
  /** called after the owner changed, e.g. to re-adopt sheets */
  onChange?: () => void
}

/** Element a `ContentPart` root renders:  `div` by default, `h1` ... `h6` for page headers. */
export type PartBox = "div" | "span" | "time" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6"

////////////////
// ## Failure
////////////////

/**
 * Event an element dispatches when its update fails, before showing its native fallback.
 * - Cancelable, `bubbles`, `composed`, `detail: { error }`;  `preventDefault()` keeps the fallback out (the page
 *   takes over).
 * - NOTE: no vocabulary names it yet, so it's never localized;  same name as the Solid spike's.
 */
export const ERROR_EVENT = "ui-error"

/** Custom state of a failed element (`:state(errored)`). */
export const ERRORED_STATE = "errored"

/** A per-family native fallback class (`ButtonFallback` ...), as `NativeFallback.render()` is called. */
export type FallbackClass = {
  render(
    host: HTMLElement,
    root: NativeFallbackRoot,
    error?: unknown,
    internals?: ElementInternals
  ): NativeFallbackHandle
}
