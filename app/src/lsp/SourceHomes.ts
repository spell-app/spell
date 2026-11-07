import { P } from "spell/parser/parser"
import { SourceEdits, type TextSpan } from "./SourceEdits"

/**
 * Where a value in the side bar lives in a program's source:  its HOME (epic `editor`, "Every field has a home").
 * - A drawn element's attribute or text:  on its tag, at the place the compiler marked on it.
 * - A thing's property, asked for one of two places:
 *   - the line that made it, `a new foundation with suit = clubs` (`ofMaking()`)
 *   - its type's default, the `set its count to 0` of its `to create it` (`ofDefault()`)
 * - It reads the parse, not the words, so it works the same in `.spell`, `.spellml` and every language.
 * - It loads no language service and no code editor, and changes nothing:  `SourceEdits` makes the edit.
 * - Literals are numbers, text, `yes` / `no` and one word of an enumeration;  anything else is code.
 * - Static and instance-free on purpose.
 */
export class SourceHomes {
  /**
   * Where attribute `name` of the tag at `opening` lives.
   * - Written as text:  `written`;  as an expression:  `expression`;  not there:  `notWritten`, which adds it.
   * - `undefined` when no tag opens there.
   */
  static ofAttribute(text: string, opening: number, name: string): FieldHome | undefined {
    const tag = SourceEdits.tagAt(text, opening)
    if (!tag) return undefined
    const anchor = { start: tag.start, end: tag.end }
    const attribute = tag.attributes.find((each) => each.name === name)
    if (!attribute) return { kind: "notWritten", place: "attribute", anchor, opening, word: name }
    if (attribute.quote === "{") return { kind: "expression", anchor, span: attribute.span }
    return { kind: "written", place: "attribute", anchor, opening, word: name }
  }

  /**
   * Where the text inside the tag at `opening` lives:  `written` when it's plain text,
   * `expression` when it holds `{...}` or other tags.
   * - `undefined` when no tag opens there, or it has no closing tag to find.
   */
  static ofTagText(text: string, opening: number): FieldHome | undefined {
    const tag = SourceEdits.tagAt(text, opening)
    if (!tag || tag.selfClosing) return undefined
    const closer = text.indexOf("</", tag.end)
    if (closer < 0) return undefined
    const span = { start: tag.end, end: closer }
    const closeEnd = text.indexOf(">", closer) + 1
    const anchor = { start: tag.start, end: closeEnd }
    if (/[{<]/.test(text.slice(span.start, span.end))) return { kind: "expression", anchor, span }
    return { kind: "written", place: "text", anchor, span }
  }

  /**
   * Where property `name` lives on the line that made a thing, for "This one".
   * - `written` or `expression`:  that line says it
   * - `notWritten`:  the line doesn't say it yet:  an edit adds it, and `addTo` says where and how
   * - `undefined`:  no making there, e.g. the compiler's mark is behind the text
   */
  static ofMaking(file: HomeFile, offset: number, name: string): OnMaking | undefined {
    if (!file.match) return undefined
    const making = findMatch(file.match, (match) => match.rule?.name === NEW_THING && match.start === offset)
    if (!making) return undefined
    const value = SourceHomes.valueOnMaking(file, offset, name)
    if (value) {
      const property = findMatch(making, (match) => match.rule?.name === MADE_WITH && match.matched.includes(value))
      return {
        ...SourceHomes.homeOfValue(value, file.contents),
        file: file.path,
        removal: removalOf(file.contents, making, property)
      } as OnMaking
    }
    const end = making.start! + making.inputText.trimEnd().length
    const hasWith = !!findMatch(making, (match) => match.rule?.name === MADE_WITH)
    return {
      kind: "notWritten",
      place: "making",
      file: file.path,
      anchor: lineOf(making, file.contents),
      at: end,
      hasWith
    }
  }

  /**
   * What "All of them" edits for property `name`:  its type's default.
   * - `undefined`:  no type here starts it, so there's nothing to change.
   */
  static ofDefault(
    files: readonly HomeFile[],
    typeNames: readonly string[],
    name: string
  ): (FileHome & { typeName: string }) | undefined {
    for (const typeName of typeNames) {
      for (const file of files) {
        const value =
          file.match &&
          (SourceHomes.valueInCreate(file.match, typeName, name) ??
            SourceHomes.valueDeclared(file.match, typeName, name))
        if (!value) continue
        const home = SourceHomes.homeOfValue(value, file.contents)
        return {
          ...home,
          kind: home.kind === "written" ? "default" : home.kind,
          file: file.path,
          typeName
        } as FileHome & { typeName: string }
      }
    }
    return undefined
  }

  /** What a literal in the source says, as a value:  what a thing still holding its default holds. */
  static valueOfLiteral(text: string, style: LiteralStyle): unknown {
    if (style === "boolean") return BOOLEAN_TRUE.test(text)
    if (style === "number") return Number(text)
    if (style === "text") return text.slice(1, -1)
    return text
  }

  /**
   * `value` as `style` writes it in spell:  `5`, `"five"`, `clubs`, `yes`.
   * - `language`:  the file's, for the words of a yes or no.
   */
  static literalFor(value: unknown, style: LiteralStyle, language = "en"): string {
    if (style === "boolean") return value ? (language === "es" ? "sí" : "yes") : "no"
    if (style === "text") return JSON.stringify(String(value))
    return String(value)
  }

  ////////////////
  // ## Reading the parse
  ////////////////

  /** The value given for property `name` on the making (`a new X with name = ...`) at `offset`, if it says. */
  private static valueOnMaking(file: HomeFile, offset: number, name: string): P.Match | undefined {
    const making = findMatch(file.match!, (match) => match.rule?.name === NEW_THING && match.start === offset)
    if (!making) return undefined
    const property = findMatch(
      making,
      (match) =>
        match.rule?.name === MADE_WITH && wordsMean((match.groups as { property?: P.Match }).property?.raw, name)
    )
    return (property?.groups as { value?: P.Match } | undefined)?.value
  }

  /** The value `type`'s `to create it` sets property `name` to, if it does. */
  private static valueInCreate(root: P.Match, type: string, name: string): P.Match | undefined {
    const create = findMatch(root, (match) => isCreateOf(match, type))
    if (!create) return undefined
    const assignment = findMatch(
      create,
      (match) =>
        match.rule?.name === ASSIGNMENT &&
        wordsMean(
          ((match.groups as { thing?: P.Match }).thing?.groups as { property?: P.Match } | undefined)?.property?.raw,
          name
        )
    )
    return (assignment?.groups as { value?: P.Match } | undefined)?.value
  }

  /**
   * The value `type` declares for property `name`, if it does:
   * - as its value, `its "layout" is stacked` (`<property "layout">stacked</>`)
   * - or as a typed property's start, `its "count" is a number starting at 0` (`<property "count" type="number">0</>`)
   */
  private static valueDeclared(root: P.Match, type: string, name: string): P.Match | undefined {
    const declared = findMatch(
      root,
      (match) =>
        match.rule?.name === CREATE_TYPE &&
        wordsMean((match.groups as { type?: P.Match }).type?.raw?.replace(/["\s]/g, ""), type)
    )
    if (!declared) return undefined
    const named = (match: P.Match) =>
      wordsMean((match.groups as { property?: P.Match }).property?.raw?.replace(/"/g, ""), name)
    const property = findMatch(declared, (match) => match.rule?.name === DECLARED_VALUE && named(match))
    if (property) return (property.groups as { body?: P.Match }).body
    // a typed property's start:  its specifier's `start`, never a range's (`one-of="ace, 2 ... 10"`)
    const typed = findMatch(declared, (match) => match.rule?.name === DEFINED_PROPERTY && named(match))
    const start =
      typed &&
      findMatch(
        typed,
        (match) => STARTING_SPECIFIERS.has(match.rule?.name ?? "") && !!(match.groups as { start?: P.Match }).start
      )
    return (start?.groups as { start?: P.Match } | undefined)?.start
  }

  /**
   * The home of a value in the source:  a literal, `written`;  anything else, `expression`.
   * - throws when the parse is behind the text, which a re-parse can be for a moment:  never edit by old offsets.
   */
  private static homeOfValue(value: P.Match, text: string): FieldHome {
    const span = { start: value.start!, end: value.end! }
    if (text.slice(span.start, span.end) !== value.inputText.trimEnd()) {
      throw new Error(`SourceHomes:  the parse is behind the text at ${span.start};  try again once it's parsed`)
    }
    const style = literalStyleOf(value)
    // to the end of its line:  what undo finds it by again
    const anchor = lineOf(value, text)
    if (!style) return { kind: "expression", anchor, span }
    return { kind: "written", place: "literal", anchor, span, style }
  }
}

////////////////
// ## Types
////////////////

/** How a literal is written in spell:  see `SourceHomes.literalFor()`. */
export type LiteralStyle = "number" | "text" | "word" | "boolean"

/** Where a thing was made, as an offset in its file. */
export type MadeAt = { path: string; offset: number }

/** What `SourceHomes` needs of a spell file. */
export type HomeFile = {
  /** its path, as the compiler's marks name it */
  path: string
  /** its text */
  contents: string
  /** its parse, once it has one */
  match?: P.Match
}

/**
 * Where a value lives in one file's text.
 * - `written`:  there, as a literal:  an edit changes it in place
 * - `notWritten`:  an attribute not on its tag yet:  an edit adds it
 * - `default`:  its type's default, in `to create it`:  an edit changes it there, and what still holds the old one
 * - `expression`:  code:  a link to it, never rewritten
 */
export type FieldHome =
  | { kind: "written" | "notWritten"; place: "attribute"; anchor: TextSpan; opening: number; word: string }
  | { kind: "written" | "default"; place: "literal"; anchor: TextSpan; span: TextSpan; style: LiteralStyle }
  | { kind: "written"; place: "text"; anchor: TextSpan; span: TextSpan }
  | { kind: "expression"; anchor: TextSpan; span: TextSpan }

/** A `FieldHome`, and the file it's in. */
export type FileHome = FieldHome & {
  /** the file it's in */
  file: string
  /** On a making's line:  the span to remove to take it off that line. */
  removal?: TextSpan
}

/** Where a property lives on a making's line:  said there, or not yet. */
export type OnMaking = MakingHome | Extract<FileHome, { place: "literal" }> | Extract<FileHome, { kind: "expression" }>

/** A property a thing's making doesn't say yet:  an edit adds it there. */
export type MakingHome = {
  kind: "notWritten"
  place: "making"
  /** the file it's in */
  file: string
  /** what finds it again:  its line */
  anchor: TextSpan
  /** where the words go:  the making's end */
  at: number
  /** it says something already, so this joins with a comma */
  hasWith: boolean
}

////////////////
// ## Helpers
////////////////

/** The rules a home is read from, by name:  the same in every language. */
const NEW_THING = "new_thing"
const MADE_WITH = "object_literal_property"
const ASSIGNMENT = "assignment"
const CREATE = "create"
const CREATE_TYPE = "create_type"
const DECLARED_VALUE = "property_value_getter"
const DEFINED_PROPERTY = "define_property_has"
/** The specifiers that say where a stored value starts:  `a number starting at 0`, `a percent starting at 18%`. */
const STARTING_SPECIFIERS = new Set(["outline_specifier_datatype", "outline_specifier_percent"])

/** A literal's rule, and how it's written. */
const LITERAL_STYLES: Record<string, LiteralStyle> = { number: "number", text: "text", boolean: "boolean" }

/** A `yes` in any language, as a boolean literal's words. */
const BOOLEAN_TRUE = /^(yes|true|ok|always|verdadero|sí|si)$/i

/** The first match under `root`, depth first, that `test` says yes to. */
function findMatch(root: P.Match, test: (match: P.Match) => boolean): P.Match | undefined {
  if (test(root)) return root
  for (const child of root.matched) {
    if (!(child instanceof P.Match)) continue
    const found = findMatch(child, test)
    if (found) return found
  }
  return undefined
}

/** Is `match` the `to create it` of the type named `type`? */
function isCreateOf(match: P.Match, type: string): boolean {
  const method = (match.data as { scopeMethod?: P.ScopeMethod } | undefined)?.scopeMethod
  if (method?.name !== CREATE) return false
  const rule = match.rule as unknown as { getOwnerAndParams(match: P.Match): { type?: P.TypeScope } }
  return rule.getOwnerAndParams(match).type?.name === type
}

/** The literal style of `value`:  `undefined` when it's code. */
function literalStyleOf(value: P.Match): LiteralStyle | undefined {
  const style = LITERAL_STYLES[value.rule?.name ?? ""]
  if (style) return style
  // one word that's no property, variable or call:  an enumeration's value, `clubs`
  return ENUM_VALUE_RULES.has(value.rule?.name ?? "") ? "word" : undefined
}

/** The rules a bare value of an enumeration reads as. */
const ENUM_VALUE_RULES: ReadonlySet<string> = new Set(["constant", "known_constant", "enum_value"])

/**
 * The span taking `property` off `making`:  `, suit = clubs`, or ` with suit = clubs` when it's the only one.
 * - The first of several:  it and the comma after it.
 */
function removalOf(text: string, making: P.Match, property: P.Match | undefined): TextSpan | undefined {
  if (!property) return undefined
  const start = property.start!
  const end = start + property.inputText.trimEnd().length
  const before = text.slice(making.start!, start)
  const comma = /,\s*$/.exec(before)
  if (comma) return { start: start - comma[0].length, end }
  const after = /^\s*,\s*/.exec(text.slice(end))
  if (after) return { start, end: end + after[0].length }
  const joined = /\s+\S+\s+$/.exec(before)
  return { start: start - (joined?.[0].length ?? 0), end }
}

/** The whole line holding `value`, without its indent:  what finds it again. */
function lineOf(value: P.Match, text: string): TextSpan {
  const lineStart = text.lastIndexOf("\n", value.start! - 1) + 1
  const lineEnd = text.indexOf("\n", value.end!)
  const indent = /^[ \t]*/.exec(text.slice(lineStart))![0].length
  return { start: lineStart + indent, end: lineEnd < 0 ? text.length : lineEnd }
}

/** Do `words`, as written (`short name`), name the member `name` (`shortName`)? */
function wordsMean(words: string | undefined, name: string): boolean {
  if (!words) return false
  const [first = "", ...rest] = words.trim().split(/\s+/)
  const joined = first + rest.map((word) => word[0]!.toUpperCase() + word.slice(1)).join("")
  return joined.toLowerCase() === name.toLowerCase()
}
