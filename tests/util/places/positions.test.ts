import { describe, expect, test } from "vite-plus/test"

import {
  isListPosition,
  listEditsTo,
  positionBetween,
  rowsInPlace,
  withListEdits,
  type PlaceRow
} from "spell/util/places"

/** Always the same, so a test can say what it gets. */
const steady = () => 0.5

describe("positionBetween()", () => {
  test("is always between, however many times it's squeezed", () => {
    let low = positionBetween()
    let high = positionBetween(low)
    expect(low < high).toBe(true)
    for (let count = 0; count < 200; count++) {
      const middle = positionBetween(low, high)
      expect(low < middle && middle < high).toBe(true)
      if (count % 2) low = middle
      else high = middle
    }
    expect(high.length).toBeLessThan(120)
  })

  test("adding at the end, or at the start, keeps finding room", () => {
    let last: string | undefined
    let first: string | undefined
    for (let count = 0; count < 100; count++) {
      const next = positionBetween(last)
      if (last !== undefined) expect(next > last).toBe(true)
      last = next
      const before = positionBetween(undefined, first)
      if (first !== undefined) expect(before < first).toBe(true)
      first = before
    }
  })

  test("two people adding at one spot rarely pick the same place, and the same random picks the same", () => {
    expect(positionBetween("a", "b", steady)).toBe(positionBetween("a", "b", steady))
    const picks = new Set(Array.from({ length: 200 }, () => positionBetween("a", "b")))
    expect(picks.size).toBeGreaterThan(100)
  })

  test("refuses what has no room, or isn't a position", () => {
    expect(() => positionBetween("b", "a")).toThrow(TypeError)
    expect(() => positionBetween("a", "a")).toThrow(TypeError)
    expect(() => positionBetween(undefined, "0")).toThrow(/no room/)
    expect(() => positionBetween("A!")).toThrow(/can't be in a position/)
  })
})

describe("rowsInPlace()", () => {
  const row = (id: string, parent: string | null, at?: string): PlaceRow => ({
    id,
    ...(at && { place: { parent, at } })
  })

  test("sorts by position, then id;  no position last;  only the parent asked for", () => {
    const rows = [row("c", "x", "b"), row("a", "x", "b"), row("b", "x", "a"), row("d", "y", "a"), row("e", null)]
    expect(rowsInPlace(rows, "place", "x").map(({ id }) => id)).toEqual(["b", "a", "c"])
    expect(rowsInPlace(rows, "place").map(({ id }) => id)).toEqual(["b", "d", "a", "c", "e"])
  })

  test("isListPosition() is exactly a parent and a fraction", () => {
    expect(isListPosition({ parent: null, at: "a" })).toBe(true)
    expect(isListPosition({ parent: "p", at: "a", also: 1 })).toBe(false)
    expect(isListPosition({ at: "a" })).toBe(false)
    expect(isListPosition(["a"])).toBe(false)
  })
})

describe("a list field, one item at a time", () => {
  test("an item added says only that", () => {
    const row = { id: "r", tags: ["a", "b"] }
    const edits = listEditsTo(row, "tags", ["a", "b", "c"])
    expect(edits).toHaveLength(1)
    expect(edits[0]).toMatchObject({ key: '"c"', item: "c" })
    expect(withListEdits(row, "tags", edits).tags).toEqual(["a", "b", "c"])
  })

  test("two people adding at once both stay", () => {
    const row = { id: "r", tags: ["a"] }
    const mine = listEditsTo(row, "tags", ["a", "mine"])
    const theirs = listEditsTo(row, "tags", ["a", "theirs"])
    const oneWay = withListEdits(withListEdits(row, "tags", mine), "tags", theirs)
    const otherWay = withListEdits(withListEdits(row, "tags", theirs), "tags", mine)
    expect([...(oneWay.tags as string[])].sort()).toEqual(["a", "mine", "theirs"])
    expect(oneWay.tags).toEqual(otherWay.tags)
  })

  test("a move touches the fewest items, and can't double or lose one", () => {
    const row = { id: "r", tags: ["a", "b", "c", "d"] }
    const edits = listEditsTo(row, "tags", ["d", "a", "b", "c"])
    expect(edits).toHaveLength(1)
    expect(edits[0]!.key).toBe('"d"')
    expect(withListEdits(row, "tags", edits).tags).toEqual(["d", "a", "b", "c"])
  })

  test("two moving at once:  an order nobody chose, with nothing doubled or lost", () => {
    const row = { id: "r", tags: ["a", "b", "c"] }
    const mine = listEditsTo(row, "tags", ["c", "a", "b"])
    const theirs = listEditsTo(row, "tags", ["a", "c", "b"])
    const moved = withListEdits(withListEdits(row, "tags", mine), "tags", theirs)
    expect([...(moved.tags as string[])].sort()).toEqual(["a", "b", "c"])
  })

  test("gone is gone, whoever said so;  two the same stay two", () => {
    const row = { id: "r", tags: ["a", "a", "b"] }
    const edits = listEditsTo(row, "tags", ["a", "b"])
    expect(edits).toEqual([{ key: '"a"#2' }])
    const after = withListEdits(withListEdits(row, "tags", edits), "tags", edits)
    expect(after.tags).toEqual(["a", "b"])
  })

  test("the same list:  nothing", () => {
    expect(listEditsTo({ id: "r", tags: [1, 2] }, "tags", [1, 2])).toEqual([])
  })
})
