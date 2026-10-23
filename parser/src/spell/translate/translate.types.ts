/**
 * Types for translating a spell project into another language (epic `spanish` P24):  see `Translator`.
 * - Type-only:  imports no values.
 */
import type { P } from "spell-lang/parser"

/**
 * What a project's names dictionary holds, `<Project>.<lang>.names.json5`:
 * every name the project's people chose, by its words in the language it's written in.
 * - A value of `TODO` (`TranslationNames.TODO`), or an empty one, counts as missing.
 */
export type NamesData = {
  /** Each type's name, singular, e.g. `card` => `{ name: "carta", gender: "feminine" }`. */
  types?: Record<string, TranslatedType>
  /** Each property, variable, value or event name, as written, e.g. `rank` => `rango`. */
  names?: Record<string, string>
  /** Each method's or phrase's words, as declared, e.g. `turn it face up` => `voltearla boca arriba`. */
  phrases?: Record<string, string>
  /** Each quoted text, e.g. `queen of spades` => `dama de espadas`. */
  texts?: Record<string, string>
  /** Each comment's words, after its `//` or `#`. */
  comments?: Record<string, string>
}

/** One section of a names dictionary, e.g. `names`. */
export type NamesKind = keyof NamesData

/** A type's name in the other language, and its gender there, if it has genders. */
export type TranslatedType = {
  /** Its name, singular, as a person writes it, e.g. `pila de reserva`. */
  name: string
  /** Its gender, e.g. `feminine` -- what its declaration's article says, `una carta es ...`. */
  gender?: string
}

/** One file of a project to translate, already parsed. */
export type SourceFile = {
  /** Its path in the project, e.g. `/Card.spell`. */
  path: string
  /** Its text. */
  contents: string
  /** Its parse, `block` rule. */
  match: P.Match | undefined
}

/** One file, translated:  one line for each of its source's lines. */
export type TranslatedFile = {
  /** Its source's path, e.g. `/Card.spell`. */
  path: string
  /** Its lines, in the other language. */
  lines: string[]
  /**
   * The lines that still need a person, by index:  why, e.g. `rule if_else`, `name "face up cards"`.
   * - Each says so in a `// TODO: translate` comment of its own.
   */
  todo: Map<number, string[]>
  /** The names each line asked the dictionary for and didn't find, by index -- see `TranslationNames.missing`. */
  missing: Map<number, MissingName[]>
}

/** A name the dictionary lacks:  its section and its words. */
export type MissingName = { kind: NamesKind; words: string }
