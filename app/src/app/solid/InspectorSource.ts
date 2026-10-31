import { SourceMarks } from "spell/parser/parser/writers/SourceMarks"

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
  const opening = offsetOf(source, place.line, place.column)
  if (source[opening] !== "<") return {}
  const end = endOfTag(source, opening + 1)
  if (end < 0) return {}
  // past its name:  `<ui-button`
  const inside = source.slice(opening + 1, end).replace(/^[^\s/>]+/, "")
  const handlers: Record<string, string> = {}
  for (const [name, code] of readAttributes(inside).handlers) handlers[name.slice(2).toLowerCase()] = code
  return handlers
}

/** The offset in `source` of `line`, `column`, both from 0. */
function offsetOf(source: string, line: number, column: number): number {
  let offset = 0
  for (let at = 0; at < line; at++) offset = source.indexOf("\n", offset) + 1
  return offset + column
}

/** A tag as written in spell:  its plain attributes, and its handlers (`onClick={...}`). */
type WrittenTag = {
  attributes: [name: string, value: string][]
  handlers: [name: string, code: string][]
}

/** The index of the `>` closing a tag opened before `from`, past any `{...}` and quoted values;  -1 if none. */
function endOfTag(source: string, from: number): number {
  let depth = 0
  for (let i = from; i < source.length; i++) {
    const c = source[i]
    if (c === '"' || c === "'") {
      i = source.indexOf(c, i + 1)
      if (i < 0) return -1
    } else if (c === "{") depth++
    else if (c === "}") depth--
    else if (c === ">" && depth === 0) return i
  }
  return -1
}

/** A tag's attributes as written:  `name="value"` and bare `name` plain, `onX={code}` handlers. */
function readAttributes(inside: string): Pick<WrittenTag, "attributes" | "handlers"> {
  const attributes: WrittenTag["attributes"] = []
  const handlers: WrittenTag["handlers"] = []
  const re = /([a-zA-Z][\w-]*)(?:=("[^"]*"|'[^']*'|\{))?/g
  let match: RegExpExecArray | null
  while ((match = re.exec(inside))) {
    const [, name, value] = match
    if (value === "{") {
      // its code:  to the brace that closes it
      let depth = 1
      let i = re.lastIndex
      for (; i < inside.length && depth; i++) {
        if (inside[i] === "{") depth++
        else if (inside[i] === "}") depth--
      }
      const code = inside.slice(re.lastIndex, i - 1).trim()
      if (/^on[A-Z]/.test(name)) handlers.push([name, code])
      re.lastIndex = i
    } else attributes.push([name, value ? value.slice(1, -1) : ""])
  }
  return { attributes, handlers }
}

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
