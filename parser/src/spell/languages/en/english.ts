/**
 * English, spell's first language pack (epic `spanish` P3):  its inflector, its words for the built-in types, its
 * messages -- and, once the grammar loads, its parser (epic `solid-2-final` P20).
 * - The default:  a project that names no language is English.
 * - In the barrel, with no grammar:  a page reads a file's language, its words and messages, without parsing.
 * - Its parser is `spellParser`, every rule module's `<module>.en.ts` assembled (`rules/index.ts`):
 *   `languages/en`, the grammar's own entry, gives it to this pack as it loads (`SP.Language.useParser()`).
 */
import { SP } from "spell/parser/spell"

import { englishAgreement } from "./agreement"
import { englishInflector } from "./inflector"
import { englishMessages } from "./messages"
import { PARSER_MESSAGES } from "./parserMessages"
import { englishWords } from "./words"

/** English's language pack:  its parser there once the grammar has loaded (`SP.loadGrammar()`). */
export const english = SP.Language.register(
  new SP.Language({
    lang: "en",
    name: "English",
    inflector: englishInflector,
    typeWords: SP.TYPE_WORDS,
    words: englishWords,
    messages: englishMessages,
    parserMessages: PARSER_MESSAGES,
    articles: englishAgreement
  })
)
