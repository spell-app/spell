import JSON5 from "json5"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

/**
 * A project's words:  spell's wording of each member of its types, by the name its compiled code uses --
 * `moveToPile` => `move (a card) to (a pile)`.  See `SP.SpellWordsData`.
 * - Why:  compiled code names a member in camelCase, which loses spell's wording, e.g. where a value goes.
 *   The Thing Explorer shows a thing's actions and properties in spell's words again by reading them here.
 * - Lives in `<Project>.en.js`, committed beside its source -- see `SP.SpellProject.wordsFileFor()`.
 *   - As a Spell UI element keeps its words in its own vocabulary file, e.g. `UIForm.en.ts`.
 *   - Another language is another file of the same shape, e.g. `cartas.es.js`.
 *     It also holds what the core says to the person running the program in that language, `messages`.
 *   - A project has one per language its files are written in (epic `spanish` P19):
 *     each holds the members its files in that language declare.
 *     A runner reads them all, as one (spell-app's `mergedWords()`).
 *   - A target with words of its own writes them as JSON, by its own names:
 *     Python's `<Project>.py.en.json5` -- see `json()`.
 * - Written from the declarations the compiler already gathers (`of()`),
 *   keyed by the names the writer ACTUALLY writes (`P.JSWriter.nameOf()`):
 *   a reader never works out how a name was camelCased.
 * - The compiled code doesn't import it:  a runner loads it beside the scope pack.
 * - `script()` writes it;  `read()` reads its text back, without running it.
 */
export class SpellWords {
  ////////////////
  // ## Writing
  ////////////////

  /**
   * The words of a project with `declarations`, in language `lang`:  each member of each of its types, by its compiled name.
   * - `lang`:  the one its program speaks by default (`SP.SpellDeclarations.languagesOf()`).
   *   - A project in several languages:  only the members its files in `lang` declare, by where each is `defined`.
   *     One with no `defined` is the default language's.
   * - Methods by their wording, e.g. `move (a card) to (a pile)`.
   *   One read as a property loses its quotes, e.g. `is face up` for `"is face up"`.
   * - Properties by their words as written (`asWritten`), e.g. `is-set-up`, else their name, e.g. `rank`.
   * - Left out:  top-level functions, and class variables, e.g. `Ranks` -- the Thing Explorer shows neither.
   * - Types in the order they're declared;  one with no members is left out.
   * - `messages`:  what the core says to the person running it, from the language's pack (`SP.Language.messages`)
   *   -- only for a language other than English, the core's own (epic `spanish` P12).
   * - `writer`:  whose names the compiled code uses -- javascript's by default, as that's what runs.
   */
  static of(
    declarations: SP.SpellDeclarationsData,
    writer: SpellWordsWriter = P.JSWriter.instance,
    lang = SP.SpellDeclarations.languagesOf(declarations)[0]!
  ): SP.SpellWordsData {
    const languages = SP.SpellDeclarations.languagesOf(declarations)
    // a project in several languages:  each file's members in its own language's words
    const isIn = (statement: SP.SpellDeclaration) =>
      languages.length < 2 ||
      (statement.defined ? (SP.Language.langOfFile(statement.defined) ?? SpellWords.LANG) : languages[0]) === lang
    const types: Record<string, Record<string, string>> = {}
    for (const statement of declarations.statements.filter(isIn)) {
      if (statement.type) types[statement.type] ??= {}
      const member = SpellWords.memberOf(statement, writer)
      if (!member || !statement.of) continue
      const members = (types[statement.of] ??= {})
      members[member.name] ??= member.words
    }
    for (const [type, members] of Object.entries(types)) {
      if (!Object.keys(members).length) delete types[type]
    }
    const messages = SpellWords.messagesFor(lang)
    return messages ? { lang, types, messages } : { lang, types }
  }

  /**
   * What the core says to the person running a program in language `lang`, for its words file:
   * its pack's `messages` (`SP.Language.messages`), a copy -- `undefined` for English, the core's own.
   * - `undefined` too for a language with no pack.
   */
  static messagesFor(lang: string): Record<string, string> | undefined {
    const messages = lang === SpellWords.LANG ? undefined : SP.Language.all.get(lang)?.messages
    return messages && { ...messages }
  }

  /**
   * The member `statement` declares on its type, by its compiled name, with its words -- `undefined` if none.
   * - Every member by the name the writer gives it, stored properties too (Q56).
   * - A name that isn't an identifier is as spell has it:  the writer quotes it.
   */
  static memberOf(
    statement: SP.SpellDeclaration,
    writer: SpellWordsWriter = P.JSWriter.instance
  ): { name: string; words: string } | undefined {
    const { property, output, kind, name, syntax } = statement
    if (property) {
      return { name: compiledName(writer, property), words: statement.asWritten ?? property }
    }
    if (kind === "method" && output) {
      return { name: compiledName(writer, output), words: unquoted(name ?? syntax ?? output) }
    }
    return undefined
  }

  /**
   * `words` as the module `<Project>.en.js` holds, for project `projectName`:
   * ```
   * /*! SPELL: WORDS Solitaire en *\/
   * export const words = {
   *   lang: "en",
   *   types: {
   *     Card: {
   *       moveToPile: "move (a card) to (a pile)",
   * ```
   * - Then `messages`, if it has any:  `"expect-failed": "Inesperado: ..."`.
   * - One member a line, so a diff shows which changed.  Keys bare where they're identifiers, as a person writes.
   * - Plain data, so `read()` reads it back with `JSON5`.
   */
  static script(words: SP.SpellWordsData, projectName: string): string {
    const types = Object.entries(words.types).map(([type, members]) => {
      return `    ${literalKey(type)}: {\n${literalLines(members, "      ").join(",\n")}\n    }`
    })
    return [
      `/*! ${WORDS_MARKER} ${projectName} ${words.lang} */`,
      "export const words = {",
      `  lang: ${JSON.stringify(words.lang)},`,
      (types.length ? `  types: {\n${types.join(",\n")}\n  }` : "  types: {}") + (words.messages ? "," : ""),
      ...(words.messages ? [`  messages: {\n${literalLines(words.messages, "    ").join(",\n")}\n  }`] : []),
      "}",
      ""
    ].join("\n")
  }

  ////////////////
  // ## Reading
  ////////////////

  /**
   * Words in `text`, a project's `<Project>.en.js` as `script()` writes it -- `undefined` if it isn't one.
   * - Reads TEXT:  never runs it.  A runner, which has no `JSON5`, imports it instead.
   */
  static read(text: string): SP.SpellWordsData | undefined {
    const literal = text.match(WORDS_LITERAL)?.[1]
    if (!literal) return undefined
    try {
      const words = JSON5.parse<Partial<SP.SpellWordsData>>(literal)
      if (typeof words.lang !== "string" || !words.types || typeof words.types !== "object") return undefined
      return words as SP.SpellWordsData
    } catch {
      return undefined
    }
  }

  /**
   * Is `file` named as a words file of project `projectName`, in any language -- `Solitaire.en.js`, `Solitaire.pt-BR.js`?
   * - No `projectName`:  of ANY project, e.g. `calculator.en.js` left in a copy of it named `calc2`.
   *   - A name alone can't tell that one from a helper, `socket.io.js`:  `isWordsScript()` reads its text.
   * - NEVER one of a project's own files:  the server leaves it out of the manifest, as its compiled output.
   */
  static isWordsFile(file: string, projectName?: string): boolean {
    if (projectName === undefined) return WORDS_FILE.test(file)
    return file.startsWith(`${projectName}.`) && LANGUAGE_JS.test(file.slice(projectName.length + 1))
  }

  /** Is `text` a words file as `script()` writes it, of any project?  Its first line says so. */
  static isWordsScript(text: string): boolean {
    return text.startsWith(`/*! ${WORDS_MARKER} `)
  }

  /**
   * `words` as a target's own words file holds them, e.g. Python's `<Project>.py.en.json5`.
   * - Plain JSON, for a reader in any language.
   * - Keyed by that target's names:  `of(declarations, writer)`.
   * - Epic `python-target` P14.
   *
   * ```json
   * { "lang": "en", "types": { "Card": { "move_to_pile": "move (a card) to (a pile)" } } }
   * ```
   */
  static json(words: SP.SpellWordsData): string {
    return `${JSON.stringify(words, null, 2)}\n`
  }

  /** Language a project's words are in when its declarations name none:  English, the default. */
  static LANG = "en"
}

/** What `SpellWords` needs of a writer:  how it names a member -- see `P.JSWriter.nameOf()`. */
export type SpellWordsWriter = Pick<P.JSWriter, "nameOf">

/** Marker starting a words file, as `/*! SPELL: SCOPES ... *\/` starts a scope pack. */
const WORDS_MARKER = "SPELL: WORDS"

/** The object literal a words file exports, for `read()`. */
const WORDS_LITERAL = /export const words = (\{[\s\S]*\})\s*$/

/** End of a words file's name after its project's, e.g. `en.js`, `pt-BR.js`. */
const LANGUAGE_JS = /^[a-z]{2}(-[A-Za-z]{2,4})?\.js$/

/** Any project's words file's name, e.g. `calculator.en.js`, `Solitario.pt-BR.js`. */
const WORDS_FILE = /^[^.]+\.[a-z]{2}(-[A-Za-z]{2,4})?\.js$/

/** Spell's `name` as `writer` writes it;  as is if it isn't an identifier, which the writer quotes. */
function compiledName(writer: SpellWordsWriter, name: string): string {
  return IDENTIFIER.test(name) ? writer.nameOf(name) : name
}

/** Is it a javascript identifier, written bare?  Any script:  `corazón` is one. */
const IDENTIFIER = /^[\p{L}_$][\p{L}\p{M}\d_$]*$/u

/** `text` without the double quotes a method read as a property is named with:  `"is face up"` => `is face up`. */
function unquoted(text: string): string {
  return text.replace(/^"(.*)"$/, "$1")
}

/** Each of `entries` as a line of an object literal, after `indent`:  `moveToPile: "move (a card) to (a pile)"`. */
function literalLines(entries: Record<string, string>, indent: string): string[] {
  return Object.entries(entries).map(([key, text]) => `${indent}${literalKey(key)}: ${JSON.stringify(text)}`)
}

/** `key` bare if it's an identifier, else quoted, e.g. `moveToPile` but `"is-a"`. */
function literalKey(key: string): string {
  return IDENTIFIER.test(key) ? key : JSON.stringify(key)
}
