/**
 * Spanish, spell's second language pack (epic `spanish`):  its parser, its inflector, its words.
 * - Its rules' syntax and tests are each rule module's `<module>.es.ts`, assembled into `spanishParser`.
 * - A file written in Spanish says so in its name:  `Carta.es.spell` (epic `spanish` P19).
 */
import { SP } from "spell-parser/spell"

import { spanishAgreement } from "./agreement"
import { spanishInflector } from "./inflector"
import { spanishMessages } from "./messages"
import { spanishParser } from "./parser"
import { spanishParserMessages } from "./parserMessages"
import { spanishTypeWords, spanishWords } from "./words"

/** Spanish's language pack. */
export const spanish = SP.Language.register(
  new SP.Language({
    lang: "es",
    name: "Spanish",
    parser: spanishParser,
    inflector: spanishInflector,
    typeWords: spanishTypeWords,
    words: spanishWords,
    messages: spanishMessages,
    parserMessages: spanishParserMessages,
    articles: spanishAgreement
  })
)
