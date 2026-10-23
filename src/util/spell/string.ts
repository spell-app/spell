/**
 * Cover lodash string utilities for manipulating case, memoizing returned values.
 * - Parsers ask for the same few names over and over;  memoizing saves the work.
 * - No inflection (singular and plural) here:  that's each language's, `P.Inflector` in `spell-parser/parser`.
 */
import lowerFirst from "lodash/lowerFirst"
import toLower from "lodash/toLower"
import upperFirst from "lodash/upperFirst"
import words from "lodash/words"

// Export some lodash string methods.
export { toLower, lowerFirst, upperFirst }

/** Memoization cache used by `getExistingOrTransform()` below -- maps input text to transformed text. */
type StringMap = Record<string, string>

////////////////
// ## Case conversion
////////////////

/**
 * `text` in snake_case, with memoization:  `Short Names`, `shortNames` and `short-names` are all `short_names`.
 * - Lodash's `snakeCase` without its `deburr()`:  an accent is part of the word (`corazón` stays `corazón`),
 *   so a Spanish name never collides with its accent-less spelling (epic `spanish` Q2).
 * - Words split as lodash splits them:
 *   at spaces and punctuation, before a capital, around digits (`it2` => `it_2`).
 */
export const snakeCase = (text: string) => getExistingOrTransform(text, SNAKE_CASE, toSnakeCase)
/** Un-memoized version of `snakeCase()` -- call `snakeCase()` instead unless you need to bypass cache. */
export const toSnakeCase = (text: string) =>
  words(`${text}`.replace(APOSTROPHES, ""))
    .map((word) => word.toLowerCase())
    .join("_")
/** Apostrophes lodash drops before splitting words:  `card's` => `cards`. */
const APOSTROPHES = /['\u2019]/g
const SNAKE_CASE: StringMap = {}

////////////////
// ## Whitespace
////////////////

/** `true` if `text` is all whitespace, including empty string. */
const ALL_WHITESPACE = /^\s*$/
export function isWhitespace(text: string): boolean {
  return ALL_WHITESPACE.test(text)
}

/** Show whitespace in a string by converting newlines to `¬` and tabs to `∆`, e.g. for debug display. */
export function showWhitespace(text: string) {
  if (typeof text !== "string") return text
  return text.replace(/\n/g, "¬").replace(/\t/g, "∆")
}

/** Eliminate initial and trailing whitespace on lines of string, and show remaining whitespace via `∆`. */
export function normalizeInitialWhitespace(text: string) {
  if (typeof text !== "string") return text
  return text
    .split("\n")
    .map((line) => line.trim().replace(/\t/g, "∆"))
    .join("\n")
}

/** Certain `number` of tab characters, e.g. for building indentation. */
const TABS = "\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t"
export function getTabs(number: number) {
  if (typeof number !== "number") return ""
  return TABS.substring(0, number)
}

////////////////
// ## Internal
////////////////

/**
 * If `text` is found in `map`, return it.
 * - Otherwise run `transform` then store + return result.
 * - SIDE EFFECT: mutates `map`, caching result for next call with same `text`.
 */
function getExistingOrTransform(text: string, map: StringMap, transform: (text: string) => string) {
  if (map[text] !== undefined) return map[text]
  return (map[text] = transform(text))
}
