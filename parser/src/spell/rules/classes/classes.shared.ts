/**
 * Types and helpers several of the `classes` module's rule files share:
 * - the `ScopeVariable` fields an enumerated property sets
 * - `MethodBody`:  a getter's or method's body
 * - `placeholderData()` and `QuotedPropertyFormulaBits`:
 *   what `quoted_property_formula` and the `QuotedPropertyRule` it makes both work with
 */
import { P } from "spell-lang/parser"

/**
 * Ad-hoc fields this module sets and reads on `P.ScopeVariable`,
 * for a property defined `as one of a, b, c` (see `define_property_has`).
 * - Augmented here:  `P.ScopeVariableProps` doesn't cover them, and only this module uses them.
 */
declare module "spell-lang/parser/scope/ScopeVariable" {
  // NOTE: MUST stay an `interface`:  module augmentation merges into the declared `ScopeVariable`,
  // and a `type` can't merge.  A documented exception to the "always use `type`" rule.
  interface ScopeVariable {
    /** Raw enumerated values (as parsed), e.g. `["'clubs'", "'diamonds'", ...]` or `[1, 2, 3]`. */
    enumeration?: Array<string | number>
    /** Pre-resolved output values for `enumeration`, if ever set elsewhere (nothing currently writes this). */
    enumerationValues?: Array<string | number>
  }
}

/** What `P.ASTMethodDefinition`'s `body` prop accepts. */
export type MethodBody = P.ASTStatementBlock | P.ASTStatement | P.ASTExpression

/**
 * `ruleData` entry for placeholder `(instanceVar)` over enumerated `values`, e.g. `(suit)` over `["'clubs'", ...]`.
 * - `enumeration` is `values` unquoted, inflected to match the placeholder, e.g. `club` for `(suit)`
 *   but `clubs` for `(suits)`.
 * - What the blank MATCHES is wider, either inflection:  see `placeholderForms()`.
 */
export function placeholderData(
  instanceVar: string,
  values: Array<string | number>,
  kind?: string
): QuotedPropertyFormulaBits["ruleData"][number] {
  const isSingular = P.singularize(instanceVar) === instanceVar
  const inflector = isSingular ? P.singularize : P.pluralize
  const enumeration = values.map((value) =>
    typeof value === "string" ? inflector(value.replace(/^'(.*)'$/, "$1")) : value
  )
  return kind
    ? { isSingular, instanceVar, enumeration, values, kind }
    : { isSingular, instanceVar, enumeration, values }
}

/**
 * Every word a blank takes for `values`:  each value's singular AND plural, and each number as is.
 * - So `(suit)` takes `club` and `clubs`, and `(rank)` takes `2`:
 *   `is the (rank) of (suit)` reads `the 2 of clubs` as well as `the queen of spade`.
 * - Each value as listed first, then its other forms;  no word twice.
 */
export function placeholderForms(values: Array<string | number>): Array<string | number> {
  const forms = values.flatMap((value): Array<string | number> => {
    if (typeof value === "number") return [value]
    const word = value.replace(/^'(.*)'$/, "$1")
    return [word, P.singularize(word), P.pluralize(word)]
  })
  return [...new Set(forms)]
}

/**
 * Where `word` is in `values`, by its singular or plural:  `clubs` and `club` are both `'clubs'`.
 * - A number is only itself.
 * - `-1` if it's none of them.
 */
export function placeholderValueIndex(values: Array<string | number>, word: string | number): number {
  if (typeof word === "number") return values.indexOf(word)
  const singular = P.singularize(word)
  return values.findIndex(
    (value) => typeof value === "string" && P.singularize(value.replace(/^'(.*)'$/, "$1")) === singular
  )
}

/**
 * Extra `bits` `quoted_property_formula` derives (and caches in `match.data.bits` via `getBits()`) to hand
 * off from there to `mutateScope()`/`getAST()`.
 */
export type QuotedPropertyFormulaBits = {
  /** Owning type name, e.g. `"card"`. */
  type: string
  /** Rulex syntax generated for the dynamically-added `expression_suffix` rule (see `mutateScope()`). */
  syntax: string
  /** One entry per `(var)` placeholder found in the quoted alias, in source order. */
  ruleData: Array<{
    /** `true` if the placeholder's inflection matched its singular form, e.g. `(rank)` not `(ranks)`. */
    isSingular: boolean
    /** Raw placeholder text as written, e.g. `"ranks"`. */
    instanceVar: string
    /** Enumeration values inflected to match `isSingular`, used to match the spoken word at parse time. */
    enumeration: Array<string | number>
    /** Enumeration values as they should appear in compiled output, e.g. quoted strings. */
    values: Array<string | number>
    /** A value kind whose values aren't known yet, e.g. `Suit`:  `values` is `[]` -- see `QuotedPropertyRule`. */
    kind?: string
  }>
  /** Singularized variable names, in source order -- used as the generated method's argument names. */
  vars: string[]
  /** Generated method/property name, e.g. `"is_the_$rank_of_$suits"`. */
  property: string
  /**
   * A phrase on a SUB-type of another type of the project, e.g. a joker's `it "is the (color) joker"`:
   * its super-type's instance name, e.g. `card`, the static method's first argument.
   * - Then it's a STATIC method of its type, which checks the type first, so it's safe on any card:
   *   `Joker.isTheColorJoker(card, color)` => `card instanceof Joker && card.color === color`.
   * - `undefined` for any other phrase:  an instance method, `card.isTheRankOfSuits(rank, suit)`.
   */
  staticArg?: string
}

/**
 * Is `type` drawn as its own element:  made from `drawable` or `drawable list`, e.g. `a card is a drawable thing`?
 * - Such a type defines its element, has its own styles, and is never saved inline.
 */
export function isDrawableType(type: P.TypeScope): boolean {
  return DRAWABLE_TYPES.some((base) => type.isA(base))
}

/** The built-in types whose sub-types draw as their own elements -- see `isDrawableType()`. */
const DRAWABLE_TYPES = ["drawable", "drawable list"]
