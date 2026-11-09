import type { AttributeGroup, AttributeKind, AttributeSpec } from "spell/element/vocabulary.types"
import { ValueSets } from "./ValueSets"

/****************
 * ### `DefaultValues`
 * Which attributes may have a default, and whether a value is one an attribute takes (epic `language` P28, P29):
 * the ONE check, which a root makes as the page draws (`RootSettings.defaultsFor()`) and the spell compiler makes as
 * it reads an app's `<ui-defaults>` (the app's Spell UI pack).
 * - Pure:  a spec and a value, no element, no DOM, so node loads it too.
 * - STATIC and instance-free on purpose.
 ****************/
export class DefaultValues {
  /** Is `spec` what an element shows (its text, its value, its rich data), rather than how it looks or acts? */
  static isContent(spec: Pick<AttributeSpec, "name" | "group" | "kind">): boolean {
    return (
      CONTENT_NAMES.includes(spec.name) ||
      (spec.group !== undefined && CONTENT_GROUPS.includes(spec.group)) ||
      spec.kind === "json"
    )
  }

  /**
   * What's wrong with `value` as `spec`'s default, as its vocabulary checks it;  `undefined` when nothing is.
   * - `value`:  canonical (English) text, a number, or `true` / `false`.
   */
  static problemWith(spec: AttributeSpec, value: unknown): DefaultValueProblem | undefined {
    if (typeof value === "boolean") return DefaultValues.isOnOrOff(spec) ? undefined : { takes: "no-boolean" }
    if (typeof value === "number") return undefined
    if (typeof value !== "string") return { takes: "text" }
    const text = value.trim().toLowerCase().replace(WHITESPACE, " ")
    if (DefaultValues.isOnOrOff(spec)) {
      return ValueSets.has("booleans", text) || text === "" ? undefined : { takes: "boolean" }
    }
    if (spec.kind === "number") return Number.isNaN(Number(text)) ? { takes: "number" } : undefined
    const set = DefaultValues.setOf(spec)
    if (!set || text === "" || ValueSets.has(set, text)) return undefined
    if (spec.kind === "keyOrValueAndKey" && ValueSets.has("booleans", text)) return undefined
    // several words at once (`appearance="basic pill"`):  each on its own
    if (spec.kind === "multiple" && text.split(" ").every((word) => ValueSets.has(set, word))) return undefined
    return { takes: "values", values: ValueSets.get(set), guess: ValueSets.suggest(set, text) }
  }

  /** Is `spec` on or off, `fluid`? */
  static isOnOrOff(spec: Pick<AttributeSpec, "kind">): boolean {
    return BOOLEAN_KINDS.includes(spec.kind)
  }

  /** The values `spec`'s default is checked against, by its kind;  `undefined` for free text. */
  static setOf(spec: AttributeSpec): ReturnType<typeof ValueSets.setFor> {
    return CHECKED_KINDS.includes(spec.kind) ? ValueSets.setFor(spec) : undefined
  }

  /** `problem` in English, for a page's warning:  `isn't one of its values;  did you mean "pill"?`. */
  static textOf(problem: DefaultValueProblem): string {
    switch (problem.takes) {
      case "no-boolean":
        return "takes no true / false"
      case "boolean":
        return "takes true or false"
      case "number":
        return "takes a number"
      case "text":
        return "isn't text, a number or true / false"
      case "values":
        return `isn't one of its values${problem.guess ? `;  did you mean ${JSON.stringify(problem.guess)}?` : ""}`
    }
  }
}

/** What's wrong with a default's value (`DefaultValues.problemWith()`):  what the attribute takes instead. */
export type DefaultValueProblem = {
  /** what it takes:  one of `values`, true or false, none of those, a number, or text */
  takes: "values" | "boolean" | "no-boolean" | "number" | "text"
  /** its values, canonical, when `takes` is `values` */
  values?: readonly string[]
  /** the closest of them, when one is close */
  guess?: string
}

/** Attributes that are what an element shows, by name, whatever their group:  never a default. */
const CONTENT_NAMES: readonly string[] = ["label", "value", "text"]

/** The groups of attributes that are what an element shows, or what it's called:  never a default. */
const CONTENT_GROUPS: readonly AttributeGroup[] = ["name", "content"]

/** Attribute kinds that are on or off. */
const BOOLEAN_KINDS: readonly AttributeKind[] = ["keyOnly", "boolean"]

/** Attribute kinds whose values come from a set (`ValueSets.setFor()`), which a default is checked against. */
const CHECKED_KINDS: readonly AttributeKind[] = [
  "size",
  "color",
  "valueOnly",
  "enum",
  "valueAndKey",
  "keyOrValueAndKey",
  "textAlign",
  "verticalAlign",
  "multiple"
]

/** Runs of whitespace, collapsed before a value is checked, as `Converters.enumValue()` does. */
const WHITESPACE = /\s+/g
