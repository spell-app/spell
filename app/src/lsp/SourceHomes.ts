import { P } from "spell/parser/parser"
import { SourceEdits, type TextSpan } from "./SourceEdits"

/**
 * Where a value in the side bar lives in a program's source:  its HOME (epic `editor`, "Every field has a home").
 * - A drawn element's attribute or text:  on its tag, at the place the compiler marked on it.
 * - A thing's property:
 *   - on the line that made it, `a new foundation with suit = clubs`
 *   - else its type's default, the `set its count to 0` of its `to create it`
 *   - else, nowhere:  the program set it while running
 * - It reads the parse, not the words, so it works the same in `.spell`, `.spellml` and every language.
 * - It loads no language service and no code editor, and changes nothing:  `SourceEdits` makes the edit.
 * - A `yes` or `no` reads as code for now:  only numbers, text and one word of an enumeration are literals.
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
   * Where property `name` of a thing lives, among `files`.
   * - `made`:  where it was made, as the compiler marked it.
   * - `typeNames`:  its class's name and those it inherits, its own first.
   * - Never `undefined`:  `running` when the source doesn't say.
   */
  static ofProperty(
    files: readonly HomeFile[],
    { made, typeNames, name }: { made: MadeAt | undefined; typeNames: readonly string[]; name: string }
  ): FileHome | { kind: "running" } {
    const madeFile = made && files.find((file) => file.path === made.path)
    if (made && madeFile?.match) {
      const value = SourceHomes.valueOnMaking(madeFile, made.offset, name)
      if (value) return { ...SourceHomes.homeOfValue(value, madeFile.contents), file: madeFile.path }
    }
    for (const typeName of typeNames) {
      for (const file of files) {
        const value = file.match && SourceHomes.valueInCreate(file.match, typeName, name)
        if (value) {
          const home = SourceHomes.homeOfValue(value, file.contents)
          return { ...home, kind: home.kind === "written" ? "default" : home.kind, file: file.path } as FileHome
        }
      }
    }
    return { kind: "running" }
  }

  /** What a literal in the source says, as a value:  what a thing still holding its default holds. */
  static valueOfLiteral(text: string, style: LiteralStyle): unknown {
    if (style === "number") return Number(text)
    if (style === "text") return text.slice(1, -1)
    return text
  }

  /** `value` as `style` writes it in spell:  `5`, `"five"`, `clubs`. */
  static literalFor(value: unknown, style: LiteralStyle): string {
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
export type LiteralStyle = "number" | "text" | "word"

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
export type FileHome = FieldHome & { file: string }

////////////////
// ## Helpers
////////////////

/** The rules a home is read from, by name:  the same in every language. */
const NEW_THING = "new_thing"
const MADE_WITH = "object_literal_property"
const ASSIGNMENT = "assignment"
const CREATE = "create"

/** A literal's rule, and how it's written. */
const LITERAL_STYLES: Record<string, LiteralStyle> = { number: "number", text: "text" }

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
