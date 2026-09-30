import type { EnumOptions, ValueSetName } from "./vocabulary.types"
import { ValueSets } from "./ValueSets"

/**
 * Pure attribute => property converters, shared by `ElementDefinition` (the fork's props) and the native fallbacks.
 * - Why here, library-neutral:  the elements and their native fallbacks need the SAME booleans / enums / widths
 *   semantics, and frameworks send attributes in odd shapes -- Vue sends `open="false"` when it can't find a
 *   property, so `"false"` MUST mean false (plan, "Framework consumption contract").
 * - Static and stateless:  converters run on every `attributeChangedCallback`.
 * - Attribute values arrive as `string | null` (`null` ~== absent);  properties may arrive as anything.
 */
export class Converters {
  ////////////////
  // ## Booleans
  ////////////////

  /**
   * Attribute value => boolean.
   * - absent (`null` / `undefined`) => false
   * - `""`, `"true"`, `"yes"`, or the attribute's own name (`disabled="disabled"`) => true
   * - `"false"`, `"no"`, `"0"` => false (case-insensitive)
   * - any other present value => true, as HTML presence semantics say
   * - real booleans pass through, so the same converter serves properties
   */
  static boolean(value: string | boolean | null | undefined, attribute?: string): boolean {
    if (value == null) return false
    if (typeof value === "boolean") return value
    const text = value.trim().toLowerCase()
    if (text === "" || text === "true" || text === "yes" || text === attribute) return true
    return !FALSE_WORDS.has(text)
  }

  /**
   * Boolean property => attribute value for reflection:  true => `""`, false => `null` (remove).
   * - NEVER `"false"`:  a present attribute is true to CSS (`[open]`) and to other libraries.
   */
  static booleanToAttribute(value: boolean | null | undefined): "" | null {
    return value ? "" : null
  }

  /**
   * `keyOrValueAndKey` attribute => `true` (bare), `false` (absent / `"false"`), or its value.
   * - `pointing` => true;  `pointing="left"` => `"left"`;  `pointing="false"` => false.
   * - A value is checked against `set` with the same warning as `enumValue()`;  unknown values => `true`,
   *   so a typo still gets the bare variation rather than nothing.
   */
  static keyOrValue(
    value: string | boolean | null | undefined,
    set: ValueSetName | readonly string[] | undefined,
    options: EnumOptions = {}
  ): string | boolean {
    if (value == null || typeof value === "boolean") return value ?? false
    const text = value.trim().toLowerCase()
    if (text === "" || text === "true" || text === "yes" || text === options.attribute) return true
    if (FALSE_WORDS.has(text)) return false
    if (!set) return text
    return Converters.enumValue(text, set, options) ?? true
  }

  ////////////////
  // ## Enums
  ////////////////

  /**
   * Attribute value => canonical member of `set`, or `undefined` if it isn't one.
   * - Trims and lower-cases, and collapses inner whitespace (`"top   left"` => `"top left"`).
   * - SIDE EFFECT (dev only): warns `did you mean "red"?` via `ValueSets.suggest()` for unknown values.
   */
  static enumValue(
    value: string | null | undefined,
    set: ValueSetName | readonly string[],
    options: EnumOptions = {}
  ): string | undefined {
    if (value == null) return undefined
    const text = value.trim().toLowerCase().replace(WHITESPACE, " ")
    if (ValueSets.has(set, text)) return text
    if (text === "") return undefined
    const guess = ValueSets.suggest(set, text)
    const where = options.tag ? `<${options.tag} ${options.attribute ?? ""}>` : (options.attribute ?? "value")
    Converters.warn(
      `${where}: unknown value ${JSON.stringify(value)}${guess ? `, did you mean ${JSON.stringify(guess)}?` : ""}`
    )
    return undefined
  }

  ////////////////
  // ## Numbers, JSON, lists
  ////////////////

  /**
   * Attribute value => number;  `undefined` when absent, blank or not a number.
   * - Numbers pass through (property path).
   */
  static number(value: string | number | null | undefined): number | undefined {
    if (value == null) return undefined
    if (typeof value === "number") return Number.isNaN(value) ? undefined : value
    if (value.trim() === "") return undefined
    const number = Number(value)
    return Number.isNaN(number) ? undefined : number
  }

  /**
   * Rich property value:  a string is parsed as JSON, anything else passes through.
   * - Why:  `json` attributes are property-only (`AGENTS.md`), but plain HTML can still write
   *   `options='[...]'` and frameworks without property binding set strings.
   * - SIDE EFFECT (dev only): warns and returns `undefined` for invalid JSON.
   */
  static json<T = unknown>(value: unknown): T | undefined {
    if (typeof value !== "string") return value as T
    if (value.trim() === "") return undefined
    try {
      return JSON.parse(value) as T
    } catch (error) {
      Converters.warn(`invalid JSON ${JSON.stringify(value)}: ${(error as Error).message}`)
      return undefined
    }
  }

  /**
   * Space- or comma-separated attribute value => `string[]`, e.g. `"a, b c"` => `["a", "b", "c"]`.
   * - Arrays pass through;  absent => `[]`.
   * - NOTE: splits multi-word values like `large screen` -- `multiple` attributes use `ClassBuilder`'s tokenizer.
   */
  static list(value: string | readonly string[] | null | undefined): string[] {
    if (value == null) return []
    if (typeof value !== "string") return [...value]
    return value.split(LIST_SEPARATOR).filter(Boolean)
  }

  ////////////////
  // ## Dev warnings
  ////////////////

  /**
   * `console.warn` in development only, prefixed so it's greppable.
   * - `import.meta.env?.DEV` is statically replaced by Vite, so production builds drop the call.
   * - REFACTOR: move to `$/util` as `devWarn()` once more than `$/vocabulary` and `$/elements` need it.
   */
  static warn(message: string) {
    if (import.meta.env?.DEV) console.warn(`[@spell/ui] ${message}`)
  }
}

/** Spellings of false;  everything else present is true. */
const FALSE_WORDS = new Set(["false", "no", "0"])

/** Separator for `Converters.list()`. */
const LIST_SEPARATOR = /[\s,]+/

/** Runs of whitespace, collapsed by `enumValue()`. */
const WHITESPACE = /\s+/g
