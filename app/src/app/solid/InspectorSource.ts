import { SourceMarks } from "spell/parser/parser/writers/SourceMarks"
import type { SP } from "spell/parser/spell"
// By path, not the barrel:  the template words alone, no parser
// By file:  the folder's barrel loads the language service
import { SourceEdits } from "spell/app/lsp/SourceEdits"

/**
 * What a program's source says of what the Inspector shows:  its text read, with no parser and no DOM.
 * - A drawn element's tag:  at the place the compiler marked on it (`SourceMarks.placeOfDrawn()`), never a guess.
 *   A list's rows are one tag in the source, so each row finds the same one, as it should.
 * - A type's events, abilities and actions:  where the compiler says each is declared (`SP.SpellDeclarationPlace`,
 *   epic `editor` P23), so every one is found, in every language.
 * - A type's property editor, and where a new event goes:  by its words, in the type's tag or its outline header;
 *   a property editor may be in a file of its own, `Card.editor.spell` (epic `data` P31).
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
 * Where each handler `element` was written with is:  the code between its `onClick={` and `}`, by event.
 * - Only its code, never the tag around it (epic `editor` I141):
 *   `column` and `endColumn` hide the rest of its lines, so `<text slot="title" onClick={}>` shows an empty field.
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
    const start = SourceEdits.positionAt(source, valueSpan.start)
    const end = SourceEdits.positionAt(source, valueSpan.end)
    places[name.slice(2).toLowerCase()] = {
      path: place.path,
      from: start.line + 1,
      to: end.line + 1,
      column: start.character + 1,
      endColumn: end.character + 1
    }
  }
  return places
}

/**
 * What to take out of its file to remove `element`'s handler for DOM event `event` (`click`;  epic `editor` T73):
 * its attribute, ` onClick={...}`, with the space before it;  `undefined` if it wasn't written with one.
 */
export function handlerSpanInSource(
  element: Element,
  sources: ReadonlyMap<string, string>,
  event: string
): { path: string; start: number; end: number } | undefined {
  const place = SourceMarks.placeOfDrawn(element)
  const source = place && sources.get(place.path)
  if (!place || source === undefined) return undefined
  const opening = SourceEdits.offsetAt(source, { line: place.line, character: place.column })
  const attribute = SourceEdits.tagAt(source, opening)?.attributes.find(
    ({ name, quote }) => quote === "{" && HANDLER.test(name) && name.slice(2).toLowerCase() === event
  )
  if (!attribute) return undefined
  const { start, end } = attribute.span
  const spaced = /\s*$/.exec(source.slice(0, start))![0].length
  return { path: place.path, start: start - spaced, end }
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
  const bare = new Set<WrittenEvent>()
  for (const name of classNames) {
    for (const place of places) {
      if (place.of !== name || !isEventLike(place)) continue
      const lines = files.find((file) => file.path === place.path)?.text.split("\n")
      if (!lines) continue
      const isBare = isOnTypeTag(place, lines)
      // the create hook a bolt, as an event
      const kind: WrittenEvent["kind"] = place.kind === "ability" ? "ability" : "event"
      const row = isBare
        ? { kind, words: bareAbility(place.name), code: "" }
        : { kind, words: wordsAt(place, lines), code: hasCode(place, lines) ? codeAt(place, lines) : "" }
      if (rows.some((other) => sameWords(other.words, row.words))) continue
      rows.push(row)
      if (isBare) bare.add(row)
    }
  }
  // a type tag's bare abilities first (`draggable`, `droppable`), then its rules, then its events (Owen)
  return [
    ...rows.filter((row) => bare.has(row)),
    ...rows.filter((row) => row.kind === "ability" && !bare.has(row)),
    ...rows.filter((row) => row.kind === "event")
  ]
}

/**
 * Is `place` an event, an ability, or its type's own `when creating ...`?
 * - The create hook is no action a person runs (I109):  it runs as a thing is made, so it reads as an event.
 */
function isEventLike(place: SP.SpellDeclarationPlace): boolean {
  return place.kind === "event" || place.kind === "ability" || (place.kind === "method" && place.output === CREATE_HOOK)
}

/** A type's create hook's compiled name:  `when creating a task`, `to create it`, `al crearlo` (`MethodDefinition.hookOf()`). */
const CREATE_HOOK = "create"

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
  const found = declaredEventOf(row, classNames, places, files)
  return found && codePlaceOf(found.place, found.lines)
}

/**
 * What to take out of its file to remove a thing's event `row` (epic `editor` T73):
 * its whole lines, its head and its body, as `placeOfDeclaredEvent()` finds it;  `undefined` if not found.
 * - A new handler's empty body line goes with it (`newEventIn()`).
 * - Its last line's line break too, or the one before it when it's the file's last line.
 */
export function declaredEventSpan(
  row: Pick<WrittenEvent, "words">,
  classNames: readonly string[],
  places: readonly SP.SpellDeclarationPlace[],
  files: readonly SourceFile[]
): { path: string; start: number; end: number } | undefined {
  const found = declaredEventOf(row, classNames, places, files)
  if (!found) return undefined
  const { place, lines } = found
  const last = place.endLine === place.line && hasEmptyBody(place, lines) ? place.line + 1 : place.endLine
  const offsetOfLine = (line: number) => lines.slice(0, line).reduce((sum, each) => sum + each.length + 1, 0)
  const length = offsetOfLine(lines.length) - 1
  if (last + 1 < lines.length) return { path: place.path, start: offsetOfLine(place.line), end: offsetOfLine(last + 1) }
  return { path: place.path, start: Math.max(0, offsetOfLine(place.line) - 1), end: length }
}

/** Where a thing's event `row` is declared, and its file's lines:  the first of `classNames` with it, by its words. */
function declaredEventOf(
  row: Pick<WrittenEvent, "words">,
  classNames: readonly string[],
  places: readonly SP.SpellDeclarationPlace[],
  files: readonly SourceFile[]
): { place: SP.SpellDeclarationPlace; lines: string[] } | undefined {
  for (const name of classNames) {
    for (const place of places) {
      if (place.of !== name || !isEventLike(place)) continue
      const lines = files.find((file) => file.path === place.path)?.text.split("\n")
      // an ability that's its type tag's bare attribute (`<view "card" draggable>`) has no code to edit
      if (lines && hasCode(place, lines) && sameWords(wordsAt(place, lines), row.words)) return { place, lines }
    }
  }
  return undefined
}

/**
 * Where a thing's action is written, from where the compiler says it's declared:
 * the method of its type (or one it inherits) whose compiled name is the action's (`moveToPile` for `move_to_$pile`).
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

/**
 * Where the compiler says a thing's action is declared, as `placeOfDeclaredAction()` finds it:
 * its head is `line`, e.g. `to "cheat" with shortcut "C"`, what a rename starts from (epic `editor` I111).
 */
export function declaredActionPlace(
  action: { name: string },
  classNames: readonly string[],
  places: readonly SP.SpellDeclarationPlace[]
): SP.SpellDeclarationPlace | undefined {
  const key = letters(action.name)
  for (const name of classNames) {
    const place = places.find(
      (each) => each.of === name && each.kind === "method" && !!each.output && letters(each.output) === key
    )
    if (place) return place
  }
  return undefined
}

/**
 * A type's `to test ...` methods (`<test "card setup">`), from where the compiler says they're declared:
 * each written inside `typeName`'s own lines, its words and its code's place (epic `editor` P23).
 * - A test is a top-level function, so it's on no type:  it's the type's when it's written beside it, in its tag.
 * - `output`:  its compiled name, `testCardSetup`, by which the program exports it.
 */
export function testsDeclared(
  typeName: string,
  places: readonly SP.SpellDeclarationPlace[],
  files: readonly SourceFile[]
): { words: string; output?: string; place: CodePlace }[] {
  const types = places.filter((place) => place.kind === "type" && place.name === typeName)
  const tests: { words: string; output?: string; place: CodePlace }[] = []
  for (const place of places) {
    if (!place.test) continue
    const isInType = types.some(
      (type) => type.path === place.path && place.line > type.line && place.line <= type.endLine
    )
    const lines = files.find((file) => file.path === place.path)?.text.split("\n")
    if (!isInType || !lines) continue
    tests.push({ words: testWordsAt(place, lines), output: place.output, place: codePlaceOf(place, lines) })
  }
  return tests
}

/** A test's words as written:  `card setup` for `<test "card setup">` or `to test card setup:`. */
function testWordsAt(place: SP.SpellDeclarationPlace, lines: readonly string[]): string {
  const line = (lines[place.line] ?? "").slice(place.column)
  const quoted = /^\s*<[^\s>]+\s+"([^"]*)"/.exec(line)
  return quoted ? quoted[1]! : line.trim().replace(/^-\s+/, "").replace(/:\s*$/, "")
}

/**
 * Where a property's Spell is written, the code that works it out (epic `editor` P23, Q29):
 * - `<property "name">its rank + " of " + its suit</>`:  between its tag's ends, on its line
 * - else its body's lines, as an event's are
 * - `undefined`:  it has none, e.g. `<property "rank" one-of="..."/>`
 */
export function propertyCodePlace(place: SP.SpellDeclarationPlace, lines: readonly string[]): CodePlace | undefined {
  const line = lines[place.line] ?? ""
  const opened = tagEndAfter(line, place.column)
  if (opened >= 0) {
    const close = line.indexOf("</", opened)
    if (close > opened + 1 && line.slice(opened + 1, close).trim()) {
      return { path: place.path, from: place.line + 1, to: place.line + 1, column: opened + 2, endColumn: close + 1 }
    }
    if (/\/>\s*$/.test(line) && place.endLine === place.line) return undefined
  }
  // plain Spell (epic `language` P46):  its body only when its line opens one, `its "color" is one of red, black:`,
  // or code is under it with no colon (P48);  else the Spell after its `is` on its line,
  // `its "name" is its rank && "of" && its suit`;  a `one of` has none
  if (opened < 0 && !/^\s*</.test(line.slice(place.column)) && !opensBody(place, lines)) {
    if (PLAIN_ONE_OF.test(line.slice(place.column))) return undefined
    const value = /"\s+(?:is|es)\s+/u.exec(line.slice(place.column))
    if (!value) return undefined
    const column = place.column + value.index + value[0].length
    return {
      path: place.path,
      from: place.line + 1,
      to: place.line + 1,
      column: column + 1,
      endColumn: line.trimEnd().length + 1
    }
  }
  if (place.endLine <= place.line) return undefined
  return codePlaceOf(place, lines)
}

/**
 * Does the property at `place` open a body, its code:  a colon ending its line (`its "state" is:`), or code under it
 * with none (epic `language` P48, `its "state" is`, then its lines)?
 * - A comment under it is its description, not code;  under a `one of`, its members' lines (`it "is a (rank)"`) aren't
 *   either:  only its value lines (`red if it is a heart`) make it worked out.
 */
function opensBody(place: SP.SpellDeclarationPlace, lines: readonly string[]): boolean {
  const line = lines[place.line] ?? ""
  if (line.trimEnd().endsWith(":")) return true
  const under = lines.slice(place.line + 1, place.endLine + 1).map((it) => it.trim())
  const code = under.filter((it) => it && !it.startsWith("//") && !it.startsWith("#"))
  if (!PLAIN_ONE_OF.test(line.slice(place.column))) return code.length > 0
  return code.some((it) => !MEMBER_LINE.test(it))
}

/** A member's line under a property, not its value:  `it "is a (rank)"`, `- it must ...`, Spanish's `"es un (rango)"`. */
const MEMBER_LINE = /^(?:-\s+|it\b|its\b|su\b|sus\b|"|es\b|está\b)/u

/** A plain property's list of values, after its words:  `is one of ace, 2 ... 10, jack`, `es uno de ...`. */
const PLAIN_ONE_OF = /"\s+(?:is\s+one\s+of|es\s+un[oa]\s+de)\s+([^:\n]+?)\s*:?\s*$/u

/** Where a tag that starts at `from` on `line` ends, its `>`, outside quotes:  -1 if not on that line. */
function tagEndAfter(line: string, from: number): number {
  let quote = ""
  for (let at = from; at < line.length; at++) {
    const char = line[at]!
    if (quote) {
      if (char === quote) quote = ""
    } else if (char === '"') quote = char
    else if (char === ">") return line[at - 1] === "/" ? -1 : at
  }
  return -1
}

/**
 * A property's values, as its `one-of` says them (`<property "rank" one-of="ace, 2 ... 10, jack, queen, king"/>`),
 * or its plain line (`its "rank" is one of ace, 2 ... 10, jack, queen, king`):
 * each as written (`2 ... 10` stays one), with where the list is in its file, to write it back (`oneOfWritten()`).
 * - `undefined`:  it has no `one-of` on its line.
 */
export function oneOfAt(
  place: SP.SpellDeclarationPlace,
  lines: readonly string[]
): { values: string[]; line: number; from: number; to: number; isOr: boolean } | undefined {
  const line = lines[place.line] ?? ""
  // its tag's `one-of="..."`, or plain Spell's `is one of ...` (epic `language` P46)
  const found = /\bone-of="([^"]*)"/.exec(line.slice(place.column)) ?? PLAIN_ONE_OF.exec(line.slice(place.column))
  if (!found) return undefined
  const from = place.column + found.index + found[0].lastIndexOf(found[1]!)
  const values = found[1]!
    .split(/\s*,\s*|\s+or\s+/)
    .map((value) => value.trim())
    .filter(Boolean)
  return { values, line: place.line, from, to: from + found[1]!.length, isOr: /\sor\s/.test(found[1]!) }
}

/**
 * What a new thing of a type must be told to draw:  each property `classNames` declare with a `one-of` and no Spell that
 * works it out, with the first of its values (Solitaire's card:  `rank` `ace`, `suit` `clubs`;  epic `editor` T51).
 * - `classNames`:  its type's, then those it inherits, its own first:  a property named twice, once.
 * - A range's first (`2 ... 10` => `2`).
 * - None:  `[]`, a view that draws with nothing it must be told.
 */
export function startingValues(
  classNames: readonly string[],
  places: readonly SP.SpellDeclarationPlace[],
  files: readonly SourceFile[]
): { words: string; value: string }[] {
  const found: { words: string; value: string }[] = []
  for (const name of classNames) {
    for (const place of places) {
      if (place.of !== name || place.kind !== "property") continue
      const lines = files.find((file) => file.path === place.path)?.text.split("\n")
      const first = lines && !propertyCodePlace(place, lines) && oneOfAt(place, lines)?.values[0]
      if (!lines || !first) continue
      const words = place.name
      if (!found.some((other) => other.words === words)) found.push({ words, value: first.split(/\s*\.\.\.\s*/)[0]! })
    }
  }
  return found
}

/** `values` as a `one-of` writes them:  `a, b, c`, or `a, b or c` when it was written so (`isOr`). */
export function oneOfWritten(values: readonly string[], isOr: boolean): string {
  if (!isOr || values.length < 2) return values.join(", ")
  return `${values.slice(0, -1).join(", ")} or ${values.at(-1)}`
}

/**
 * Has the declaration at `place` code of its own, beyond its words?  `- on click play it` and a body's lines do;
 * a rule that's all words (`- it can never take a card`) and a type tag's bare ability (`draggable`) don't:
 * the row's header says them, and there's no field under it (Owen:  "Duplicated 'it can never let go of a card'").
 */
function hasCode(place: SP.SpellDeclarationPlace, lines: readonly string[]): boolean {
  if (isOnTypeTag(place, lines)) return false
  return codeColumnOf(place, lines) !== undefined || place.endLine > place.line || place.kind !== "ability"
}

/**
 * Is `place` a bare ability, one with no condition:  its type's tag's attribute, `<view "card" draggable>`,
 * its line in plain Spell, `it is draggable` (epic `language` P46), or its word on its type's line,
 * `a "card" is a draggable two sided view` (P48)?
 */
function isOnTypeTag(place: SP.SpellDeclarationPlace, lines: readonly string[]): boolean {
  if (place.kind !== "ability") return false
  // said on its type's own line, a word before its template:  `draggable` (epic `language` P48)
  if (!/\s/.test(place.name)) return true
  const line = lines[place.line] ?? ""
  return BARE_ABILITY_LINE.test(line)
}

/** A bare ability's own line, in plain Spell:  `it is draggable`, `es arrastrable`. */
const BARE_ABILITY_LINE = /^\s*(?:-\s+)?(?:it\s+is|es|está)\s+\p{L}+\s*$/u

/** A bare ability's word, as its attribute says it:  `it is draggable` => `draggable`. */
function bareAbility(name: string): string {
  return name.replace(/^(?:it|its\s+\w+)\s+(?:is|are)\s+/i, "")
}

/**
 * A declaration's words as written on its first line, up to its code, less a tag's attributes:  `on click`.
 * - Less its line's own docstring too:  `when a card is dropped  -- move the card to the pile` => `when a card is dropped`.
 */
function wordsAt(place: SP.SpellDeclarationPlace, lines: readonly string[]): string {
  const line = lines[place.line] ?? ""
  return line
    .slice(place.column, codeColumnOf(place, lines))
    .replace(TRAILING_DOCSTRING, "")
    .trim()
    .replace(/^(?:-\s+|<)/, "")
    .replace(/\s+[\w-]+=[\s\S]*$/, "")
    .replace(/\s*(?::|\/?>)\s*$/, "")
    .trim()
}

/** A line's own docstring, after its words:  `  -- move the card to the pile`. */
const TRAILING_DOCSTRING = /\s+--(?:\s[\s\S]*)?$/

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
  if (colon < 0) return undefined
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
 * - else its empty body's line, a new handler's (`newEventIn()`)
 * - else its own line
 */
function codePlaceOf(place: SP.SpellDeclarationPlace, lines: readonly string[]): CodePlace {
  const codeColumn = codeColumnOf(place, lines)
  if (codeColumn !== undefined) {
    return { path: place.path, from: place.line + 1, to: place.endLine + 1, column: codeColumn + 1 }
  }
  let last = place.endLine
  if (last > place.line && /^\s*<\//.test(lines[last] ?? "")) last--
  // its body's first line, a comment, is its description, not its code (epic `language` P48)
  const first = place.line + 1 < last && /^\s*\/\//.test(lines[place.line + 1] ?? "") ? place.line + 1 : place.line
  if (last > place.line) return { path: place.path, from: first + 2, to: last + 1 }
  // no code yet, its empty body under it (`newEventIn()`):  that line, to type it in (epic `editor` I159)
  if (hasEmptyBody(place, lines)) return { path: place.path, from: place.line + 2, to: place.line + 2 }
  return { path: place.path, from: place.line + 1, to: place.line + 1 }
}

/** Is the line under `place`'s head blank, but indented deeper:  the empty body a new handler is written with? */
function hasEmptyBody(place: SP.SpellDeclarationPlace, lines: readonly string[]): boolean {
  const under = lines[place.line + 1]
  return under !== undefined && !under.trim() && under.length > indentOf(lines[place.line] ?? "")
}

/**
 * The property editor a type was written with, its markup as written
 * (epic `debut` I86;  its own file, epic `editor` P25):
 * - in a property editors file (`editors`):  `"card" is a property editor`'s lines, in `Card.editor.spell` or the
 *   project's `Solitaire.editors.spell`
 * - `""` if it has none.
 * - `typeNames`:  the thing's type's words, then those it inherits (`InspectorActions.typeWordsOf()`):
 *   its own type's first, so a type's own editor wins over the one it inherits.
 */
export function propertyEditorInSource(typeNames: readonly string[], editors: readonly string[] = []): string {
  for (const name of typeNames) {
    const own = editors.map((source) => namedEditorIn(source, name)).find((markup) => markup !== undefined)
    if (own !== undefined) return own
  }
  return ""
}

/** A `<ui-property>`'s `name="..."`:  what's before its name, its name, its closing quote. */
const PROPERTY_NAME = /(<ui-property\b[^>]*?\sname\s*=\s*")([^"]*)(")/g

/**
 * Property editor `markup`, each `<ui-property name>` said in its program's language named as its class names it:
 * `<ui-property name="dirección">` => `<ui-property name="direction">`, a built-in template's property in Spanish
 * (epic `language` T73).
 * - `names`:  each property's name in the class, by its name in the language (`ClassSchemas.templateWordsOf()`).
 * - A dotted name's first step only:  the property it reaches into.
 * - Any other name, as written.
 */
export function withClassNames(markup: string, names: ReadonlyMap<string, string>): string {
  if (!names.size) return markup
  return markup.replace(PROPERTY_NAME, (whole, before: string, name: string, after: string) => {
    const [first = "", ...rest] = name.split(".")
    const own = names.get(first)
    return own ? `${before}${[own, ...rest].join(".")}${after}` : whole
  })
}

/**
 * A property editor's PLAIN HEAD after its quoted name, in every language (epic `language` P45):
 * `"card" is a property editor`, `"carta" es un editor de propiedades`;  its markup is indented under it.
 */
const PLAIN_EDITOR_HEADS = ["is a property editor", "es un editor de propiedades"]

/**
 * A property editor's TAG, in every language (epic `language` T125):  `<property-editor "card">`,
 * `<editor-de-propiedades "carta">`;  its markup its children, closed by `</property-editor>` or `</>`.
 * - Spanish also takes Spell UI's own name for `<ui-property-editor>`, `editor-propiedades`.
 */
const EDITOR_TAGS = ["property-editor", "editor-de-propiedades", "editor-propiedades"]

/**
 * The markup of the property editor for type `name` in a property editors file's `source`:
 * - its plain head, `"card" is a property editor`, its markup the lines indented under it (epic `language` P45)
 * - or its tag at the file's left edge, `<property-editor "card">`, its markup its children (T125):
 *   the same markup the plain head's lines give;  `<property-editor "card"/>` has none
 * - `undefined` if it has none.
 */
function namedEditorIn(source: string, name: string): string | undefined {
  const quoted = `"${escapeForRegExp(name)}"`
  const heads = [
    ...PLAIN_EDITOR_HEADS.map((head) => `${quoted}[ \\t]+${head.split(" ").map(escapeForRegExp).join("[ \\t]+")}`),
    `<(?:${EDITOR_TAGS.join("|")})[ \\t]*${quoted}[ \\t]*(?<empty>\\/)?>`
  ]
  for (const head of heads) {
    const opening = new RegExp(`^${head}[ \\t]*$`, "imu").exec(source)
    if (!opening) continue
    if (opening.groups?.empty) return ""
    const lines = source.slice(opening.index + opening[0].length + 1).split("\n")
    // its markup ends at the next line at the file's left edge:  a tag's own end tag, `</>`, or what comes next
    const end = lines.findIndex((line) => line.trim() && !/^[ \t]/.test(line))
    return dedent(lines.slice(0, end < 0 ? undefined : end)).trim()
  }
  return undefined
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
  /** Where its code ends on its last line, 1-based, when a tag's end follows it there:  `its rank</>` ends before `</>`. */
  endColumn?: number
}

/** A program's spell file, as the places read it:  its path and text. */
export type SourceFile = { path: string; text: string }

/**
 * Where a new event `words` (`on double click`) goes in the first type of `typeNames` written in `files`, and its code:
 * - under a plain line for it (`a "card" is a view`, `a card -- play it on click`):  `on double click` after its last
 *   line, at its rows' indent, bare as plain Spell writes a member (epic `language` P46)
 *   - with an empty body under it, a level in (`\t\t`):  where its code is typed (epic `editor` I159)
 *   - written at the start of the line after the type's, so the code editor showing the last handler's lines
 *     doesn't grow over it
 *   - with a colon only under a header in the older form, that has one (`a card:`;  epic `editor` I62)
 * - `at`:  its offset in the file's text, where `code` is inserted;
 *   `undefined` when the type isn't written in `files`.
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
    const [header] = ranges
    if (!header) continue
    const [first, last] = header
    const row = lines.slice(first + 1, last + 1).find((line) => line.trim() && !line.trim().startsWith("//"))
    const indent = row ? /^\s*/.exec(row)![0] : `${/^\s*/.exec(lines[first]!)![0]}\t`
    let end = last
    while (end > first && !lines[end]!.trim()) end--
    // a colon only where the header has one:  the older form (`a card:`), not the one written today (`a card`)
    const colon = /:\s*(?:(?:--|\/\/).*)?$/.test(lines[first]!) ? ":" : ""
    // its empty body, a level in:  the line its row's code editor shows, the cursor in it (I159)
    const handler = `${indent}${words}${colon}\n${indent}\t`
    // at the start of the line after the type's last, never at that line's end:
    // the code editor of the handler written there would take in what's added at its edge
    if (end + 1 < lines.length) return { path: file.path, at: offsetOfLine(end + 1), code: `${handler}\n` }
    return { path: file.path, at: offsetOfLine(end) + lines[end]!.length, code: `\n${handler}` }
  }
  return undefined
}

/** `text`'s letters alone, lower case:  how an action's words and its method's name are matched. */
function letters(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}]/gu, "")
}

/**
 * The 0-based line ranges, both ends in, where type `name` is written in `text`:
 * each plain line for it with the lines under it:  its declaration (`a "card" is a view:`, `solitaire is an app:`), or an outline header (`a card:`).
 */
function typeLineRanges(text: string, name: string): [number, number][] {
  const ranges: [number, number][] = []
  const lines = text.split("\n")
  const named = `"?${escapeForRegExp(name)}"?`
  const header = new RegExp(
    // its colon only in the older form, and a description after it:  `a card -- play it on click` (I62)
    `^(\\s*)(?:(?:an?|una?)\\s+)?${named}(?:\\s+(?:is|es)\\s+.+|\\s.*\\b(?:where|donde))?\\s*:?\\s*(?:(?:--|//).*)?$`,
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
 * The condition action `actionWords` (`turn it over`) was written to be enabled (or disabled) when, in its own words:
 * its `- enabled when it is face down` (or `enabled-when="..."` on its tag), or its `- disabled when it is face up`
 * (epic `language` T132);  `undefined` if none.
 */
export function enabledWhenInSource(actionWords: string, sources: readonly string[]): ActionCondition | undefined {
  const words = escapeForRegExp(actionWords.trim()).replace(/\s+/g, "\\s+")
  const start = new RegExp(`(?:^[ \\t]*-?[ \\t]*to[ \\t]+${words}[ \\t]*:?[ \\t]*$|<action[ \\t]+"${words}")`, "im")
  for (const source of sources) {
    const found = start.exec(source)
    if (!found) continue
    const after = source.slice(found.index, found.index + ACTION_DETAILS_REACH)
    const end = after.search(/<\/action>/)
    const details = end < 0 ? after : after.slice(0, end)
    const condition = /(en|dis)abled[ -]when(?:="([^"]*)"|[ \t]+(.+))/.exec(details)
    if (!condition) continue
    return { words: (condition[2] ?? condition[3] ?? "").trim(), when: condition[1] === "dis" ? "disabled" : "enabled" }
  }
  return undefined
}

/** What an action's `enabled when` or `disabled when` says:  its condition's `words`, and which it is. */
export type ActionCondition = { words: string; when: "enabled" | "disabled" }

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
