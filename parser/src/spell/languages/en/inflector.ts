/**
 * How English makes a word singular or plural, for spell's English pack (epic `spanish` P3):
 * `cards` => `card`, `people` => `person`, `sheep` is both.
 * - The rules are the npm `pluralize` package's:  its list of irregulars and uncountables, applied in order.
 * - Only parsing and compiling load it:  a compiled program never inflects, so it never loads this.
 * - The first language pack loaded, so it's the fallback out of a parse (`P.Inflector.fallback`).
 */
import pluralize from "pluralize"

import { P } from "spell/parser/parser"

/** English's inflector:  see the file's docstring. */
export const englishInflector = new P.Inflector({
  lang: "en",
  singular: (word) => pluralize.singular(word),
  plural: (word) => pluralize(word)
})

P.Inflector.fallback ??= englishInflector
