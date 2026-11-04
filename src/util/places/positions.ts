import type { ListEdit, PlaceRow } from "./places.types"

/**
 * A place in a list, written as a fraction (epic `data` P8):  a list has no array to fight over.
 * - A thing in a list says its parent and its fraction as ONE field (`ListPosition`), so moving between lists can't
 *   half happen.  A list is "the things whose parent is X, by position" (`rowsInPlace()`).
 * - The fractions are text, compared as text, so there's always room between two (`positionBetween()`):  `"a"`, `"aV"`.
 * - Each gets a little randomness on its end, so two people adding at one spot rarely pick the same one.
 *   When they do, the referee settles it, and even unsettled they sort the same everywhere, by id.
 * - A list FIELD of a row (`tags`) comes as an array, as it always did, and changes one item at a time (`ListEdit`):
 *   its fractions travel beside it, under `POSITIONS_KEY`.
 *   - NOTE: `$at` is the engine's:  it starts with `$`, so `PlaceThings` never takes it for a field.
 * - Imports only types, and nothing about who holds the rows.
 */

/** The digits of a fraction, in order:  plain text compares them correctly. */
const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz"

/** How many random digits go on the end of a new position. */
const JITTER_DIGITS = 2

/** The key a row's list fields' positions go under:  `{ tags: ["a"], $at: { tags: { '"a"': "h" } } }`. */
export const POSITIONS_KEY = "$at"

/** A thing's place in a list:  its parent and its fraction, as one field. */
export type ListPosition = {
  /** The id of what it's in;  `null`:  the top. */
  parent: string | null
  /** Where in it:  `positionBetween()`. */
  at: string
}

/** Is `value` a `ListPosition`? */
export function isListPosition(value: unknown): value is ListPosition {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const { parent, at } = value as Partial<ListPosition>
  return typeof at === "string" && (parent === null || typeof parent === "string") && Object.keys(value).length === 2
}

/**
 * A position after `before` and before `after`:  either left out means that end of the list.
 * - `random`:  for a test, or a referee settling a tie, that needs the same answer each time.
 * - throws `TypeError` if `before` isn't before `after`:  there's nothing between
 */
export function positionBetween(before?: string, after?: string, random: () => number = Math.random): string {
  if (before !== undefined && after !== undefined && before >= after) {
    throw new TypeError(`positionBetween():  "${before}" isn't before "${after}";  there's nothing between them`)
  }
  return roomBetween(before ?? "", after) + jitter(random)
}

/** The shortest fraction after `low` and before `high`, never ending in the lowest digit:  there's always room below it. */
function roomBetween(low: string, high: string | undefined): string {
  let found = ""
  let isBounded = high !== undefined
  for (let at = 0; ; at++) {
    if (isBounded && at >= high!.length) throw new TypeError(`positionBetween():  there's no room below "${high}"`)
    const lowest = digitOf(low[at])
    const highest = isBounded ? digitOf(high![at]) : DIGITS.length
    if (highest - lowest > 1) return found + DIGITS[Math.ceil((lowest + highest) / 2)]!
    found += DIGITS[lowest]!
    if (lowest < highest) isBounded = false
  }
}

/**
 * Where `digit` is in `DIGITS`:  past a fraction's end, it's the lowest.
 * - throws `TypeError` for anything else:  a position from somewhere else may hold anything
 */
function digitOf(digit: string | undefined): number {
  if (digit === undefined) return 0
  const index = DIGITS.indexOf(digit)
  if (index < 0) throw new TypeError(`positionBetween():  "${digit}" can't be in a position`)
  return index
}

/** A few random digits, the last never the lowest. */
function jitter(random: () => number): string {
  let digits = ""
  for (let count = 1; count < JITTER_DIGITS; count++) digits += DIGITS[Math.floor(random() * DIGITS.length)]!
  return digits + DIGITS[1 + Math.floor(random() * (DIGITS.length - 1))]!
}

/** The position an item at `index` of a list has until one's given it:  the same on every machine. */
export function positionAtIndex(index: number): string {
  return `${index.toString(36).padStart(3, "0")}1`
}

/**
 * `rows`, in their place in the list `parent`, by the position in `field`:  the same order on every screen.
 * - Same position:  by id.  No position:  after those with one, by id.
 * - `parent` left out:  every row, of any parent.
 */
export function rowsInPlace(
  rows: readonly PlaceRow[],
  field: string,
  parent?: string | null,
  idField = "id"
): PlaceRow[] {
  const inIt =
    parent === undefined ? rows : rows.filter((row) => (row[field] as ListPosition | undefined)?.parent === parent)
  const at = (row: PlaceRow) => (isListPosition(row[field]) ? row[field].at : "~")
  return [...inIt].sort(
    (one, other) =>
      compareText(at(one), at(other)) || compareText(`${one[idField] as string}`, `${other[idField] as string}`)
  )
}

/** `one` before `other`, as text:  NOT by language, which would differ from machine to machine. */
function compareText(one: string, other: string): number {
  return one < other ? -1 : one > other ? 1 : 0
}

////////////////
// ## A list field, one item at a time
////////////////

/** One item of a list field, and where it is. */
type ListEntry = {
  /** Names it in the list. */
  key: string
  /** Where. */
  at: string
  /** The item. */
  item: unknown
}

/** A name for each of `items`:  its JSON, then how many of the same came before:  no ids, so two the same stay two. */
export function listItemKeys(items: readonly unknown[]): string[] {
  const seen = new Map<string, number>()
  return items.map((item) => {
    const text = JSON.stringify(item)
    const count = (seen.get(text) ?? 0) + 1
    seen.set(text, count)
    return count === 1 ? text : `${text}#${count}`
  })
}

/** `row`'s list `field`, with each item's key and position. */
function entriesOf(row: PlaceRow | undefined, field: string): ListEntry[] {
  const items = row?.[field]
  if (!Array.isArray(items)) return []
  const positions = (row?.[POSITIONS_KEY] as Record<string, Record<string, string>> | undefined)?.[field]
  const keys = listItemKeys(items)
  return items.map((item: unknown, index) => ({
    key: keys[index]!,
    at: positions?.[keys[index]!] ?? positionAtIndex(index),
    item
  }))
}

/**
 * `row`, with `edits` made to its list `field`:  a new row, the array in position order, the positions beside it.
 * - An item gone and an item already gone:  the same.  An item already there just moves.
 * - The same on every machine:  same position, by key.
 */
export function withListEdits(row: PlaceRow, field: string, edits: readonly ListEdit[]): PlaceRow {
  const entries = new Map(entriesOf(row, field).map((entry) => [entry.key, entry]))
  for (const { key, at, item } of edits) {
    if (at === undefined) entries.delete(key)
    else entries.set(key, { key, at, item: entries.has(key) && item === undefined ? entries.get(key)!.item : item })
  }
  const sorted = [...entries.values()].sort(
    (one, other) => compareText(one.at, other.at) || compareText(one.key, other.key)
  )
  const positions = row[POSITIONS_KEY] as Record<string, Record<string, string>> | undefined
  return {
    ...row,
    [field]: sorted.map(({ item }) => item),
    [POSITIONS_KEY]: { ...positions, [field]: Object.fromEntries(sorted.map(({ key, at }) => [key, at])) }
  }
}

/**
 * What it takes to turn `row`'s list `field` into `items`:  only the items that changed.
 * - Gone:  an edit with no position.
 * - Added:  a position between its new neighbours.
 * - Moved:  the fewest that have to, the longest run already in order staying where it is.
 * - The same list:  none.
 */
export function listEditsTo(row: PlaceRow | undefined, field: string, items: readonly unknown[]): ListEdit[] {
  const before = new Map(entriesOf(row, field).map((entry) => [entry.key, entry]))
  const keys = listItemKeys(items)
  const newKeys = new Set(keys)
  const edits: ListEdit[] = [...before.keys()].filter((key) => !newKeys.has(key)).map((key) => ({ key }))
  const staying = longestRunInOrder(keys.filter((key) => before.has(key)).map((key) => before.get(key)!.at))
  const stayingKeys = new Set(staying.map((position) => keys.find((key) => before.get(key)?.at === position)!))
  let last: string | undefined
  keys.forEach((key, index) => {
    if (stayingKeys.has(key)) {
      last = before.get(key)!.at
      return
    }
    const next = keys.slice(index + 1).find((later) => stayingKeys.has(later))
    const at = positionBetween(last, next === undefined ? undefined : before.get(next)!.at)
    edits.push({ key, at, ...(!before.has(key) && { item: items[index] }) })
    last = at
  })
  return edits
}

/** The longest run of `positions` already in order:  what needn't move. */
function longestRunInOrder(positions: readonly string[]): string[] {
  const runs: string[][] = []
  for (const position of positions) {
    const best = runs
      .filter((run) => run.at(-1)! < position)
      .reduce<string[]>((longest, run) => (run.length > longest.length ? run : longest), [])
    runs.push([...best, position])
  }
  return runs.reduce<string[]>((longest, run) => (run.length > longest.length ? run : longest), [])
}
