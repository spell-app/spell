import { SourceMarks } from "spell/parser/parser/writers/SourceMarks"
// By file:  the folder's barrel loads the language service
import { endOfTag, SourceEdits } from "spell/app/lsp/SourceEdits"

/**
 * What a program's source says of what the Inspector shows:  its text read, with no parser and no DOM.
 * - A drawn element's tag:  at the place the compiler marked on it (`SourceMarks.placeOfDrawn()`), never a guess.
 *   A list's rows are one tag in the source, so each row finds the same one, as it should.
 * - A type's events, abilities and property editor:  by its words, in the type's tag or its outline header.
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
 * What a type of the program was written to do when people touch it, in the author's own words
 * (epic `debut` P28):  its abilities' conditions first, then its events, each with its code.
 * - `typeNames`:  the type's name and those it inherits, in spell's words, its own first:  `["tableau", "pile"]`.
 *   A sub-type's row hides its super-type's with the same words.
 * - `sources`:  the program's spell files' text.
 * - Read where the type is written:
 *   - inside its tag, `<spell-view "card"> ... </spell-view>`:  its event tags (`<on click>play it</on>`,
 *     `<draggable when it is face up />`), and the `- ` lines of its `<spell>` blocks
 *   - under an outline header for it, `a card:` or `a card is a thing where:`, its `- ` lines
 * - An event starts `on`, `when` or `while` (`- on click: play it`);
 *   an ability says what it can do or is able to (`- it can give up a card if: the card is face up`,
 *   `- draggable when it is face up`, `- it can be dragged`).
 * - Its code:  after the colon, and the lines indented under it;  `""` for an ability with no condition.
 * - TODO:  P27's one-line event with no colon (`- on click play it`) reads as all words, no code:
 *   only the parser knows where the event's name ends.
 */
export function eventsInSource(typeNames: readonly string[], sources: readonly string[]): WrittenEvent[] {
  const rows: WrittenEvent[] = []
  for (const name of typeNames) {
    for (const source of sources) {
      for (const row of [...rowsInTypeTags(source, name), ...rowsUnderHeaders(source, name)]) {
        if (!rows.some((other) => sameWords(other.words, row.words))) rows.push(row)
      }
    }
  }
  return [...rows.filter((row) => row.kind === "ability"), ...rows.filter((row) => row.kind === "event")]
}

/**
 * The property editor a type was written with, its markup as written (epic `debut` I86):
 * `<property-editor>`'s lines inside `<spell-view "card"> ... </spell-view>`;  `""` if it has none.
 * - `typeNames`:  the thing's type's words, then those it inherits (`InspectorActions.typeWordsOf()`):
 *   its own type's first, so a type's own editor wins over the one it inherits.
 * - `words`:  the tag's words, every language's (`<property-editor>`, `<editor-de-propiedades>`).
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
}

/** A program's spell file, as the places read it:  its path and text. */
export type SourceFile = { path: string; text: string }

/**
 * Where `row` (an event or ability of a type named in `typeNames`, its own first) is written, in `files`.
 * - Looked for inside each type's tag and under its outline headers, as `eventsInSource()` reads them;
 *   the first type that has it wins, as there.
 * - `undefined`:  not found by its words, e.g. a bare ability attribute (`<spell-view "card" draggable>`).
 */
export function placeOfWritten(
  row: Pick<WrittenEvent, "words">,
  typeNames: readonly string[],
  files: readonly SourceFile[]
): CodePlace | undefined {
  const words = wordsPattern(row.words)
  for (const name of typeNames) {
    for (const file of files) {
      const lines = file.text.split("\n")
      for (const [first, last] of typeLineRanges(file.text, name)) {
        for (let at = first; at <= last; at++) {
          const said = lines[at]!.trim().replace(/^(?:-\s+|<)/, "")
          if (words.test(said)) return { path: file.path, ...bodyLines(lines, at, last) }
        }
      }
    }
  }
  return undefined
}

/**
 * Where action `words` (`deal the cards`) is written in `files`:  `<action "deal the cards">`, or a `to deal the cards`
 * line;  in a type named in `typeNames` first, else anywhere.
 * - `name`:  its method's name (`dealTheCards`), matched too, as its words may say the thing as `it`.
 */
export function placeOfAction(
  action: { words: string; name: string },
  typeNames: readonly string[],
  files: readonly SourceFile[]
): CodePlace | undefined {
  const keys = new Set([letters(action.words), letters(action.name)])
  const isIt = (written: string) =>
    keys.has(letters(written)) || keys.has(letters(written.replace(/\b(?:an?|the)\s+\w+/i, "it")))
  const find = (file: SourceFile, first: number, last: number) => {
    const lines = file.text.split("\n")
    for (let at = first; at <= last; at++) {
      const said = ACTION_LINE.exec(lines[at]!)
      if (said && isIt(said[1] ?? said[2]!)) return { path: file.path, ...bodyLines(lines, at, last) }
    }
    return undefined
  }
  for (const name of typeNames) {
    for (const file of files) {
      for (const [first, last] of typeLineRanges(file.text, name)) {
        const found = find(file, first, last)
        if (found) return found
      }
    }
  }
  for (const file of files) {
    const found = find(file, 0, file.text.split("\n").length - 1)
    if (found) return found
  }
  return undefined
}

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

/** An action's line:  `<action "deal the cards" ...>` (its words), or `to deal the cards` (`- ` and `:` allowed). */
const ACTION_LINE = /^\s*(?:<action\s+"([^"]+)"|(?:-\s+)?to\s+([^:(]+?)\s*(?:\(|:|$))/i

/** `text`'s letters alone, lower case:  how an action's words and its method's name are matched. */
function letters(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}]/gu, "")
}

/** A line starting with `words`, whatever the spacing and case. */
function wordsPattern(words: string): RegExp {
  return new RegExp(`^${escapeForRegExp(words.trim()).replace(/\s+/g, "\\s+")}(?![\\p{L}\\p{N}])`, "iu")
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
 * The lines of the code starting on line `at` (0-based), as 1-based `from` and `to`:  no further than `last`.
 * - A tag (`<on click>`, `<action "x">`):  the lines between it and its closing tag;  its own line when it closes there.
 * - A line (`- on card dropped:`, `to count the points`):  the lines indented under it;  its own line when there are none,
 *   or its code follows it on the line.
 */
function bodyLines(lines: readonly string[], at: number, last: number): { from: number; to: number } {
  const line = lines[at]!
  if (line.trim().startsWith("<")) {
    if (/\/>\s*$|<\/[^>]*>\s*$/.test(line)) return { from: at + 1, to: at + 1 }
    for (let end = at + 1; end <= last; end++) {
      if (/^\s*<\//.test(lines[end]!)) return end > at + 1 ? { from: at + 2, to: end } : { from: at + 1, to: at + 1 }
    }
    return { from: at + 1, to: at + 1 }
  }
  let end = at
  for (let next = at + 1; next <= last; next++) {
    if (lines[next]!.trim() && indentOf(lines[next]!) <= indentOf(line)) break
    if (lines[next]!.trim()) end = next
  }
  const hasCodeAfter = colonIn(line) >= 0 && line.slice(colonIn(line) + 1).trim() !== ""
  return end === at || hasCodeAfter ? { from: at + 1, to: end + 1 } : { from: at + 2, to: end + 1 }
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
function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** The rows inside each `<spell-view "name"> ... </spell-view>` (any `<spell-*>` tag) in `source`. */
function rowsInTypeTags(source: string, name: string): WrittenEvent[] {
  const rows: WrittenEvent[] = []
  for (const { head, body } of typeTagsIn(source, name)) {
    // its bare ability attributes, `<spell-view "card" draggable>` (epic `debut` P27):  each an ability, as written
    for (const ability of head.matchAll(BARE_ABILITY)) rows.push({ kind: "ability", words: ability[1]!, code: "" })
    rows.push(...rowsInTags(body))
    for (const block of body.matchAll(/<spell>([\s\S]*?)<\/spell>/g)) rows.push(...rowsInLines(block[1]!.split("\n")))
  }
  return rows
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

/** Event and ability tags in `body`:  `<on click description="...">play it</on>`, `<draggable when it is face up />`. */
function rowsInTags(body: string): WrittenEvent[] {
  const rows: WrittenEvent[] = []
  const opening = /<([a-z][\w-]*)\b/gi
  let match: RegExpExecArray | null
  while ((match = opening.exec(body))) {
    const end = endOfTag(body, match.index + match[0].length)
    if (end < 0) continue
    const inside = body.slice(match.index + 1, end)
    const isEmpty = inside.trimEnd().endsWith("/")
    // its words:  up to its first attribute
    const words = inside
      .replace(/\/$/, "")
      .split(/\s[\w-]+=/)[0]!
      .trim()
    const kind = kindOf(words)
    if (!kind) continue
    const close = isEmpty ? undefined : closingTagOf(body, match[1]!, end)
    const code = close ? dedent(body.slice(end + 1, close.index).split("\n")).trim() : ""
    // a one-line tag with a colon, `<on score change: show "You won!"/>`:  its words, then its code
    const colon = code ? -1 : colonIn(words)
    if (colon >= 0) rows.push({ kind, words: words.slice(0, colon).trim(), code: words.slice(colon + 1).trim() })
    else rows.push(code ? { kind, words, code } : splitShortForm({ kind, words, code }))
    if (close) opening.lastIndex = close.index + close.length
  }
  return rows
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

/** The rows under each outline header for `name` in `source`:  `a card:`, `a card is a thing where:`. */
function rowsUnderHeaders(source: string, name: string): WrittenEvent[] {
  const lines = source.split("\n")
  const header = new RegExp(
    `^(\\s*)(?:an?|una?)\\s+"?${escapeForRegExp(name)}"?(?:\\s.*\\b(?:where|donde))?\\s*:\\s*$`,
    "i"
  )
  const rows: WrittenEvent[] = []
  lines.forEach((line, index) => {
    const found = header.exec(line)
    if (!found) return
    const indent = found[1]!.length
    const block: string[] = []
    for (const next of lines.slice(index + 1)) {
      if (next.trim() && indentOf(next) <= indent) break
      block.push(next)
    }
    rows.push(...rowsInLines(block))
  })
  return rows
}

/** The events and abilities among `lines`' `- ` lines, at their outermost indent, each with the lines under it. */
function rowsInLines(lines: readonly string[]): WrittenEvent[] {
  const dashed = lines.filter((line) => /^\s*- /.test(line))
  if (!dashed.length) return []
  const indent = Math.min(...dashed.map(indentOf))
  const rows: WrittenEvent[] = []
  lines.forEach((line, index) => {
    if (indentOf(line) !== indent || !/^\s*- /.test(line)) return
    const text = line.trim().slice(2).trim()
    const under: string[] = []
    for (const next of lines.slice(index + 1)) {
      if (next.trim() && indentOf(next) <= indent) break
      under.push(next)
    }
    const colon = colonIn(text)
    const words = (colon < 0 ? text : text.slice(0, colon)).trim()
    const kind = kindOf(words)
    if (!kind) return
    const inline = colon < 0 ? "" : text.slice(colon + 1).trim()
    const code = [inline, dedent(under).trim()].filter(Boolean).join("\n")
    rows.push(colon < 0 && !code ? splitShortForm({ kind, words, code }) : { kind, words, code })
  })
  return rows
}

/**
 * A short ability with its condition in the same words, no colon (`draggable when it is face up`):
 * its words up to `when` / `if`, its code after.
 * - A one-line event of the thing's own, no colon (`on click play it`, epic `debut` P27):
 *   its event's words, then its code (`ONE_LINE_EVENT`).
 */
function splitShortForm(row: WrittenEvent): WrittenEvent {
  if (row.kind === "event") {
    const event = ONE_LINE_EVENT.exec(row.words)
    return event ? { kind: row.kind, words: event[1]!.trim(), code: event[2]!.trim() } : row
  }
  if (row.kind !== "ability") return row
  const split = /^(.*?\b(?:when|if|cuando|si))\s+(.+)$/i.exec(row.words)
  return split ? { kind: row.kind, words: split[1]!.trim(), code: split[2]!.trim() } : row
}

/** Is `words` an event's (`on click`), an ability's (`it can be dragged`), or neither? */
function kindOf(words: string): WrittenEvent["kind"] | undefined {
  if (EVENT_START.test(words)) return "event"
  if (ABILITY_START.test(words)) return "ability"
  return undefined
}

/**
 * A one-line event of a thing's own, its code after it with no colon:  `on click play it`, `when dragged ...`.
 * - Only the page's own events, and a property's change, up to its `changes` (`when its score changes show 1`,
 *   epic `debut` P30):  a program's several-word event name can't be told from its code by text alone.
 * - REFACTOR:  ask spell's parser where the name ends (its `event_words`), as the compiler does (J145).
 */
const ONE_LINE_EVENT =
  /^((?:on|when)\s+(?:double\s+click(?:ed)?|right\s+click(?:ed)?|click(?:ed)?|drag\s+cancelled|(?:the\s+)?drag\s+is\s+cancelled|dragged|drag|mouse\s+(?:down|up|enter|leave))|(?:on|when)\s+(?:(?:its|the)\s+)?\S+(?:\s+\S+){0,3}?\s+(?:changes|changed|change)|cuando\s+(?:(?:su|sus|el|la)\s+)?\S+(?:\s+\S+){0,3}?\s+cambia)\s+(\S.*)$/i

/** A template tag's bare ability attribute:  `draggable` in `<spell-view "card" template="..." draggable>`. */
const BARE_ABILITY =
  /\s(draggable|clickable|selectable|droppable|arrastrable|pulsable|seleccionable|soltable)(?=[\s/>]|$)/gi

/** How an event starts, in English and Spanish:  `on click`, `when a card is dropped on it`, `mientras ...`. */
const EVENT_START = /^(?:on|when|while|al|cuando|mientras)\s/i
/**
 * How an ability starts:  what it can do (`it can be dragged`, `its cards can be dragged`),
 * or what it's able to be (`draggable when`, `its cards are draggable when`, a list's tag `<cards draggable when ...>`);
 * Spanish's `se puede arrastrar`.
 */
const ABILITY_START = /^(?:(?:it|(?:its\s+)?\w+)\s+)?(?:(?:is|are)\s+)?(?:can\b|\w+able\b)|^(?:se\s+)?puede\b/i

/** Where the colon ending a line's words is, outside quotes:  -1 if none. */
function colonIn(text: string): number {
  let quote = ""
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (quote) {
      if (c === quote) quote = ""
    } else if (c === '"' || c === "'") quote = c
    else if (c === ":") return i
  }
  return -1
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
