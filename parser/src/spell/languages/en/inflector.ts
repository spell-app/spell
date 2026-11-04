/**
 * How English makes a word singular or plural, for spell's English pack (epic `spanish` P3):
 * `cards` => `card`, `people` => `person`, `sheep` is both.
 * - The rules are the npm `pluralize` package's:  its list of irregulars and uncountables, applied in order.
 * - A name of several words changes only its LAST word, the one English counts by:
 *   `pokemon species` and `PokemonSpecies` stay themselves, `bank accounts` => `bank account`.
 *   - Why:  `pluralize` matches its uncountables against the whole text,
 *     so it read `pokemon-species` as a plural of `pokemon-specy` (epic `data` P27).
 * - Only parsing and compiling load it:  a compiled program never inflects, so it never loads this.
 * - The first language pack loaded, so it's the fallback out of a parse (`P.Inflector.fallback`).
 */
import pluralize from "pluralize"

import { P } from "spell/parser/parser"

/**
 * A name's words before its last, with what joins them, and its last word.
 * - Words are joined by a space, `-` or `_`, or a capital starts one:  `PokemonSpecies`, a type's name already.
 */
const LAST_WORD = /^(.*(?:[-_ ]|[\p{Ll}\d](?=\p{Lu})))?([^-_ ]+)$/u

/** English's inflector:  see the file's docstring. */
export const englishInflector = new P.Inflector({
  lang: "en",
  singular: (word) => lastWordOf(word, pluralize.singular),
  plural: (word) => lastWordOf(word, pluralize)
})

/** `word` with `change` made to its last word only:  `pokemon-species` keeps `species` whole. */
function lastWordOf(word: string, change: (word: string) => string): string {
  const match = LAST_WORD.exec(word)
  if (!match) return change(word)
  return `${match[1] ?? ""}${change(match[2]!)}`
}

P.Inflector.fallback ??= englishInflector
