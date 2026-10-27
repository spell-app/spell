/**
 * English, spell's first language pack (epic `spanish` P3):  its parser, its inflector, its words for the built-in types.
 * - Its rules' syntax and tests are each rule module's `<module>.en.ts`, assembled into `spellParser` (`rules/index.ts`).
 * - The default:  a project that names no language is English.
 */
import { SP } from "spell/parser/spell"

import { englishAgreement } from "./agreement"
import { englishInflector } from "./inflector"
import { englishMessages } from "./messages"
import { PARSER_MESSAGES } from "./parserMessages"
import { englishWords } from "./words"

/** English's language pack. */
export const english = SP.Language.register(
  new SP.Language({
    lang: "en",
    name: "English",
    parser: SP.spellParser,
    inflector: englishInflector,
    typeWords: SP.TYPE_WORDS,
    words: englishWords,
    messages: englishMessages,
    parserMessages: PARSER_MESSAGES,
    articles: englishAgreement
  })
)
