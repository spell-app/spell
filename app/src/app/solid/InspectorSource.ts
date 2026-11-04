import { SourceMarks } from "spell/parser/parser/writers/SourceMarks"
import type { SP } from "spell/parser/spell"
// By file:  the folder's barrel loads the language service
import { endOfTag, SourceEdits } from "spell/app/lsp/SourceEdits"

/**
 * What a program's source says of what the Inspector shows:  its text read, with no parser and no DOM.
 * - A drawn element's tag:  at the place the compiler marked on it (`SourceMarks.placeOfDrawn()`), never a guess.
 *   A list's rows are one tag in the source, so each row finds the same one, as it should.
 * - A type's events, abilities and actions:  where the compiler says each is declared (`SP.SpellDeclarationPlace`,
 *   epic `editor` P23), so every one is found, in every language.
 * - A type's property editor, and where a new event goes:  by its words, in the type's tag or its outline header.
 */

/**
 * The handlers `element` was written with, by event:  `{ click: "add someone" }` for
 * `<ui-button icon="plus" onClick={add someone}>Add someone</ui-button>`.
 * - `sources`:  the program's spell files' text, each by its name in the project, as the marks name them.
 * - Nothing found, or an element with no mark:  `{}`.
 */
export function handlersInSource(element: Element, sources: ReadonlyMap<string, string>): Record<string, string> {
  const place = SourceMarks.placeOfDrawn(element)
  const source = place && sources.get(place.path)
  if (!place || source === undefined) return {}
  const opening = SourceEdits.offsetAt(source, { line: place.line, character: place.column })
  const handlers: Record<string, string> = {}
  for (const { name, quote, valueSpan } of SourceEdits.tagAt(source, opening)?.attributes ?? []) {
    if (quote !== "{" || !HANDLER.test(name) || !valueSpan) continue
    handlers[name.slice(2).toLowerCase()] = source.slice(valueSpan.start, valueSpan.end).trim()
  }
  return handlers
}

/**
 * Where each handler `element` was written with is:  the line holding its `onClick={...}`, by event.
 * - As `handlersInSource()` finds them;  `{}` for none.
 */
export function handlerPlacesInSource(
  element: Element,
  sources: ReadonlyMap<string, string>
): Record<string, CodePlace> {
  const place = SourceMarks.placeOfDrawn(element)
  const source = place && sources.get(place.path)
  if (!place || source === undefined) return {}
  const opening = SourceEdits.offsetAt(source, { line: place.line, character: place.column })
  const places: Record<string, CodePlace> = {}
  for (const { name, quote, valueSpan } of SourceEdits.tagAt(source, opening)?.attributes ?? []) {
    if (quote !== "{" || !HANDLER.test(name) || !valueSpan) continue
    const line = SourceEdits.positionAt(source, valueSpan.start).line + 1
    places[name.slice(2).toLowerCase()] = { path: place.path, from: line, to: line }
  }
  return places
}

/** An event handler's attribute:  `onClick`. */
const HANDLER = /^on[A-Z]/

////////////////
// ## A type's events and abilities, as written
////////////////

/**
 * A running thing's abilities and events, in its program's own words, each with its code:
 * from where the compiler says they're declared (`places`), on its type or one it inherits.
 * - `classNames`:  its type's class name, then those it inherits, its own first (`["Tableau", "Pile"]`):
 *   a sub-type's row hides its super-type's with the same words.
 * - `files`:  the program's spell files, each by the name the places give it.
 * - Abilities first, then events.
 */
export function eventsDeclared(
  classNames: readonly string[],
  places: readonly SP.SpellDeclarationPlace[],
  files: readonly SourceFile[]
): WrittenEvent[] {
  const rows: WrittenEvent[] = []
  for (const name of classNames) {
    for (const place of places) {
      if (place.of !== name || (place.kind !== "event" && place.kind !== "ability")) continue
      const lines = files.find((file) => file.path === place.path)?.text.split("\n")
      if (!lines) continue
      const row = isOnTypeTag(place, lines)
        ? { kind: place.kind, words: bareAbility(place.name), code: "" }
        : { kind: place.kind, words: wordsAt(place, lines), code: codeAt(place, lines) }
      if (!rows.some((other) => sameWords(other.words, row.words))) rows.push(row)
    }
  }
  return [...rows.filter((row) => row.kind === "ability"), ...rows.filter((row) => row.kind === "event")]
}

/**
 * Where a thing's event or ability `row` is written, from where the compiler says it's declared:
 * the first of `classNames` (its own type first) that has it by its words.
 */
export function placeOfDeclaredEvent(
  row: Pick<WrittenEvent, "words">,
  classNames: readonly string[],
  places: readonly SP.SpellDeclarationPlace[],
  files: readonly SourceFile[]
): CodePlace | undefined {
  for (const name of classNames) {
    for (const place of places) {
      if (place.of !== name || (place.kind !== "event" && place.kind !== "ability")) continue
      const lines = files.find((file) => file.path === place.path)?.text.split("\n")
      // an ability that's its type tag's bare attribute (`<spell-view "card" draggable>`) has no code to edit
      if (lines && !isOnTypeTag(place, lines) && sameWords(wordsAt(place, lines), row.words)) {
        return codePlaceOf(place, lines)
      }
    }
  }
  return undefined
}

/**
 * Where a thing's action is written, from where the compiler says it's declared:
 * the method of its type (or one it inherits) whose compiled name is the action's (`putOnPile` for `put_on_$pile`).
 */
export function placeOfDeclaredAction(
  action: { name: string },
  classNames: readonly string[],
  places: readonly SP.SpellDeclarationPlace[],
  files: readonly SourceFile[]
): CodePlace | undefined {
  const key = letters(action.name)
  for (const name of classNames) {
    for (const place of places) {
      if (place.of !== name || place.kind !== "method" || !place.output || letters(place.output) !== key) continue
      const lines = files.find((file) => file.path === place.path)?.text.split("\n")
      if (lines) return codePlaceOf(place, lines)
    }
  }
  return undefined
}

/** Is `place` an ability its type's tag says with a bare attribute, `<spell-view "card" draggable>`? */
function isOnTypeTag(place: SP.SpellDeclarationPlace, lines: readonly string[]): boolean {
  return place.kind === "ability" && /^\s*<spell-/.test(lines[place.line] ?? "")
}

/** A bare ability's word, as its attribute says it:  `it is draggable` => `draggable`. */
function bareAbility(name: string): string {
  return name.replace(/^(?:it|its\s+\w+)\s+(?:is|are)\s+/i, "")
}

/** A declaration's words as written on its first line, up to its code, less a tag's attributes:  `on click`. */
function wordsAt(place: SP.SpellDeclarationPlace, lines: readonly string[]): string {
  const line = lines[place.line] ?? ""
  return line
    .slice(place.column, codeColumnOf(place, lines))
    .trim()
    .replace(/^(?:-\s+|<)/, "")
    .replace(/\s+[\w-]+=[\s\S]*$/, "")
    .replace(/\s*(?::|\/?>)\s*$/, "")
    .trim()
}

/** A declaration's code as written:  after its words on its line, and the lines of its body, dedented. */
function codeAt(place: SP.SpellDeclarationPlace, lines: readonly string[]): string {
  const { from, to, column } = codePlaceOf(place, lines)
  const first = column ? [lines[from - 1]!.slice(column - 1)] : []
  const rest = lines.slice(column ? from : from - 1, to)
  return [withoutTagEnd(first.join("").trim()), dedent(rest).trim()].filter(Boolean).join("\n")
}

/** A one-line tag's code, less its tag's end:  `it is face down />` => `it is face down`, `print 1</on>` => `print 1`. */
function withoutTagEnd(code: string): string {
  return code.replace(/\s*(?:\/>|<\/[^<>]*>)\s*$/, "")
}

/**
 * Where a declaration's code starts on its first line, 0-based:  the compiler's `codeColumn`;
 * else after the colon that ends its words, when code follows it there (`- when clicked: play it`).
 */
function codeColumnOf(place: SP.SpellDeclarationPlace, lines: readonly string[]): number | undefined {
  if (place.codeColumn !== undefined) return place.codeColumn
  const line = lines[place.line] ?? ""
  const colon = colonOutsideQuotes(line, place.column)
  if (colon < 0 || /^\s*<spell-/.test(line)) return undefined
  const after = line.slice(colon + 1)
  return after.trim() && !/^\s*\/?>\s*$/.test(after) ? colon + 1 + (after.length - after.trimStart().length) : undefined
}

/** Where the first colon of `line` after `from` is, outside quotes (an attribute's `"Empty:  ..."`):  -1 if none. */
function colonOutsideQuotes(line: string, from: number): number {
  let quote = ""
  for (let at = from; at < line.length; at++) {
    const char = line[at]!
    if (quote) {
      if (char === quote) quote = ""
    } else if (char === '"' || char === "'") quote = char
    else if (char === ":") return at
  }
  return -1
}

/**
 * Where a declaration's code is, as `CodePlace` says (1-based lines):
 * - its code after its words on its line (`- on click play it`):  from there, with `column`
 * - else its body's lines, under its line, and above a closing tag (`</on>`)
 * - else its own line
 */
function codePlaceOf(place: SP.SpellDeclarationPlace, lines: readonly string[]): CodePlace {
  const codeColumn = codeColumnOf(place, lines)
  if (codeColumn !== undefined) {
    return { path: place.path, from: place.line + 1, to: place.endLine + 1, column: codeColumn + 1 }
  }
  let last = place.endLine
  if (last > place.line && /^\s*<\//.test(lines[last] ?? "")) last--
  return last > place.line
    ? { path: place.path, from: place.line + 2, to: last + 1 }
    : { path: place.path, from: place.line + 1, to: place.line + 1 }
}

/**
 * The property editor a type was written with, its markup as written (epic `debut` I86):
 * `<spell-property-editor>`'s lines inside `<spell-view "card"> ... </spell-view>`;  `""` if it has none.
 * - `typeNames`:  the thing's type's words, then those it inherits (`InspectorActions.typeWordsOf()`):
 *   its own type's first, so a type's own editor wins over the one it inherits.
 * - `words`:  the tag's words, every language's (`<spell-property-editor>`, `<encanto-editor-de-propiedades>`),
 *   and the old short ones (`<property-editor>`;  epic `data` P31).
 * - Closed by its own words or `</>`.
 */
export function propertyEditorInSource(
  typeNames: readonly string[],
  sources: readonly string[],
  words: readonly string[]
): string {
  for (const name of typeNames) {
    for (const source of sources) {
      for (const body of typeBodies(source, name)) {
        for (const word of words) {
          const opening = new RegExp(`<${escapeForRegExp(word)}\\s*>`, "i").exec(body)
          if (!opening) continue
          const from = opening.index + opening[0].length
          const close = closingTagOf(body, word, from)
          return dedent(body.slice(from, close?.index).split("\n")).trim()
        }
      }
    }
  }
  return ""
}

/** One of a type's events or abilities, as written:  `on click`, its code `play it`. */
export type WrittenEvent = {
  /** An event (`on click`), or an ability (`it can give up a card if`). */
  kind: "event" | "ability"
  /** Its words, as written, up to its code:  `when a card is dropped on it`, `draggable when`. */
  words: string
  /** Its code, its lines as written under it:  `""` for none. */
  code: string
}

////////////////
// ## Where each one's code is
////////////////

/**
 * Where an event's, ability's or action's code is written:  its file, and its lines (epic `editor`, Events In Code).
 * - `from` and `to`:  1-based, both in.
 * - Its body's lines when it has some (`<on click>` ... `</on>`, a `- on card dropped:` line's lines under it);
 *   else its own line, words and code together (`- on click play it`).
 */
export type CodePlace = {
  /** The file's path, as `files` named it. */
  path: string
  /** Its first line. */
  from: number
  /** Its last line. */
  to: number
  /**
   * Where its code starts on its first line, 1-based, when its words come first there:
   * `- clickable when it is face up` starts at `it`.
   */
  column?: number
}

/** A program's spell file, as the places read it:  its path and text. */
export type SourceFile = { path: string; text: string }

/**
 * Where a new event `words` (`on double click`) goes in the first type of `typeNames` written in `files`, and its code:
 * - under an outline header for it (`a card:`):  `- on double click:` after its last line, at its rows' indent
 * - else inside its tag:  `<on double click>`, an empty line, `</on>`, just before the tag's end
 * - `at`:  its offset in the file's text, where `code` is inserted;  `undefined` when the type isn't written in `files`.
 */
export function newEventIn(
  typeNames: readonly string[],
  files: readonly SourceFile[],
  words: string
): { path: string; at: number; code: string } | undefined {
  const name = typeNames[0]
  if (!name) return undefined
  const read = files.map((file) => {
    const lines = file.text.split("\n")
    const offsetOfLine = (line: number) => lines.slice(0, line).reduce((sum, each) => sum + each.length + 1, 0)
    return { file, lines, offsetOfLine, ranges: typeLineRanges(file.text, name) }
  })
  // an outline header first, in any file:  its rows are where a type's events are listed
  for (const { file, lines, offsetOfLine, ranges } of read) {
    const header = ranges.find(([first]) => !lines[first]!.trim().startsWith("<"))
    if (!header) continue
    const [first, last] = header
    const row = lines.slice(first + 1, last + 1).find((line) => /^\s*- /.test(line))
    const indent = row ? /^\s*/.exec(row)![0] : `${/^\s*/.exec(lines[first]!)![0]}\t`
    let end = last
    while (end > first && !lines[end]!.trim()) end--
    return { path: file.path, at: offsetOfLine(end) + lines[end]!.length, code: `\n${indent}- ${words}:` }
  }
  for (const { file, lines, offsetOfLine, ranges } of read) {
    const tag = ranges[0]
    if (!tag) continue
    const indent = `${/^\s*/.exec(lines[tag[0]]!)![0]}\t`
    return { path: file.path, at: offsetOfLine(tag[1]), code: `${indent}<${words}>\n${indent}\t\n${indent}</on>\n` }
  }
  return undefined
}

/** `text`'s letters alone, lower case:  how an action's words and its method's name are matched. */
function letters(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}]/gu, "")
}

/**
 * The 0-based line ranges, both ends in, where type `name` is written in `text`:
 * each `<spell-* "name"> ... </spell-*>`, and each outline header for it (`a card:`) with the lines under it.
 */
function typeLineRanges(text: string, name: string): [number, number][] {
  const ranges: [number, number][] = []
  const lineOf = (offset: number) => text.slice(0, offset).split("\n").length - 1
  const opening = new RegExp(`<spell-([\\w-]+)\\s+"${escapeForRegExp(name)}"`, "gi")
  let match: RegExpExecArray | null
  while ((match = opening.exec(text))) {
    const close = text.indexOf(`</spell-${match[1]}>`, match.index)
    ranges.push([lineOf(match.index), lineOf(close < 0 ? text.length : close)])
  }
  const lines = text.split("\n")
  const header = new RegExp(
    `^(\\s*)(?:an?|una?)\\s+"?${escapeForRegExp(name)}"?(?:\\s.*\\b(?:where|donde))?\\s*:\\s*$`,
    "i"
  )
  lines.forEach((line, index) => {
    const found = header.exec(line)
    if (!found) return
    let last = index
    for (let at = index + 1; at < lines.length; at++) {
      if (lines[at]!.trim() && indentOf(lines[at]!) <= found[1]!.length) break
      last = at
    }
    ranges.push([index, last])
  })
  return ranges
}

/**
 * The condition action `actionWords` (`turn it over`) was written to be enabled when:
 * its `- enabled when it is face down` (or `enabled-when="..."` on its tag), in its own words;  `""` if none.
 */
export function enabledWhenInSource(actionWords: string, sources: readonly string[]): string {
  const words = escapeForRegExp(actionWords.trim()).replace(/\s+/g, "\\s+")
  const start = new RegExp(`(?:^[ \\t]*-?[ \\t]*to[ \\t]+${words}[ \\t]*:?[ \\t]*$|<action[ \\t]+"${words}")`, "im")
  for (const source of sources) {
    const found = start.exec(source)
    if (!found) continue
    const after = source.slice(found.index, found.index + ACTION_DETAILS_REACH)
    const end = after.search(/<\/action>/)
    const details = end < 0 ? after : after.slice(0, end)
    const condition = /enabled[ -]when(?:="([^"]*)"|[ \t]+(.+))/.exec(details)
    if (condition) return (condition[1] ?? condition[2] ?? "").trim()
  }
  return ""
}

/** How far after an action's start its details are looked for, in characters:  they're its first lines. */
const ACTION_DETAILS_REACH = 600

/** Are `a` and `b` the same words, whatever their spacing and case? */
function sameWords(a: string, b: string): boolean {
  return a.replace(/\s+/g, " ").toLowerCase() === b.replace(/\s+/g, " ").toLowerCase()
}

/** `text` with its RegExp specials escaped. */
export function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** The bodies of each `<spell-view "name"> ... </spell-view>` (any `<spell-*>` tag) in `source`. */
function typeBodies(source: string, name: string): string[] {
  return typeTagsIn(source, name).map((tag) => tag.body)
}

/** Each `<spell-view "name"> ... </spell-view>` (any `<spell-*>` tag) in `source`:  its head, then its body. */
function typeTagsIn(source: string, name: string): { head: string; body: string }[] {
  const found: { head: string; body: string }[] = []
  const opening = new RegExp(`<spell-([\\w-]+)\\s+"${escapeForRegExp(name)}"`, "gi")
  let match: RegExpExecArray | null
  while ((match = opening.exec(source))) {
    const end = endOfTag(source, match.index + match[0].length)
    if (end < 0) continue
    const close = source.indexOf(`</spell-${match[1]}>`, end)
    found.push({ head: source.slice(match.index, end), body: source.slice(end + 1, close < 0 ? undefined : close) })
  }
  return found
}

/**
 * Where tag `name`, opened before `from`, closes:  `</on>`, `</>`, or its whole words, `</on score change>`
 * (epic `debut` P27);  `undefined` if it doesn't.
 */
function closingTagOf(body: string, name: string, from: number): { index: number; length: number } | undefined {
  const closing = new RegExp(`</(?:${escapeForRegExp(name)}(?:\\s[^>]*)?)?>`, "g")
  closing.lastIndex = from
  const found = closing.exec(body)
  return found ? { index: found.index, length: found[0].length } : undefined
}

/** How far `line` is indented:  a tab counts as one, as a space does. */
function indentOf(line: string): number {
  return /^\s*/.exec(line)![0].length
}

/** `lines` with the indent they all share taken off, as one text. */
function dedent(lines: readonly string[]): string {
  const filled = lines.filter((line) => line.trim())
  if (!filled.length) return ""
  const indent = Math.min(...filled.map(indentOf))
  return lines.map((line) => line.slice(indent).trimEnd()).join("\n")
}
