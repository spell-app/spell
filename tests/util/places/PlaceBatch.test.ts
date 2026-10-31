import { describe, expect, test, vi } from "vite-plus/test"

import { MemoryPlace, PlaceBatch, type ListAnswer, type ListAsk, type Place } from "spell/util/places"

/** A place holding `rows` in every collection, with `listMany()` if `batches`. */
function placeOf({ batches = true }: { batches?: boolean } = {}) {
  const memory = new MemoryPlace({ rows: { a: [{ id: "1" }], b: [{ id: "2" }] } } as never)
  const answer = (collection: string): ListAnswer => ({ rows: [{ id: collection }], handled: {} })
  const list = vi.fn(async (collection: string) => answer(collection))
  const listMany = vi.fn(async (asks: readonly ListAsk[]) => asks.map(({ collection }) => answer(collection)))
  const place = {
    describe: () => memory.describe(),
    list,
    ...(batches && { listMany })
  } as unknown as Place
  return { place, list, listMany }
}

describe("PlaceBatch.list()", () => {
  test("lists asked in the same moment go in ONE request, each with its own answer", async () => {
    const { place, list, listMany } = placeOf()
    const batch = new PlaceBatch()
    const [a, b] = await Promise.all([batch.list(place, "a", {}, {}), batch.list(place, "b", {}, {})])
    expect(listMany).toHaveBeenCalledTimes(1)
    expect(list).not.toHaveBeenCalled()
    expect(a.rows).toEqual([{ id: "a" }])
    expect(b.rows).toEqual([{ id: "b" }])
  })

  test("one alone goes as it always went", async () => {
    const { place, list, listMany } = placeOf()
    await new PlaceBatch().list(place, "a", {}, {})
    expect(list).toHaveBeenCalledTimes(1)
    expect(listMany).not.toHaveBeenCalled()
  })

  test("a place with no way to ask for several is asked at once, as ever", async () => {
    const { place, list } = placeOf({ batches: false })
    const batch = new PlaceBatch()
    const asked = batch.list(place, "a", {}, {})
    expect(list).toHaveBeenCalledTimes(1)
    await asked
  })

  test("a failure reaches them all", async () => {
    const { place, listMany } = placeOf()
    listMany.mockRejectedValue(new Error("down"))
    const batch = new PlaceBatch()
    const answers = await Promise.allSettled([batch.list(place, "a", {}, {}), batch.list(place, "b", {}, {})])
    expect(answers.map((answer) => answer.status)).toEqual(["rejected", "rejected"])
  })

  test("one leaving ends its own wait;  the request stops only when they've all gone", async () => {
    const { place, listMany } = placeOf()
    let signal: AbortSignal | undefined
    listMany.mockImplementation(async (asks, context?: { signal?: AbortSignal }) => {
      signal = context?.signal
      await new Promise((resolve) => setTimeout(resolve, 20))
      return asks.map(({ collection }) => ({ rows: [{ id: collection }], handled: {} }))
    })
    const batch = new PlaceBatch()
    const one = new AbortController()
    const other = new AbortController()
    const first = batch.list(place, "a", {}, { signal: one.signal })
    const second = batch.list(place, "b", {}, { signal: other.signal })
    await new Promise((resolve) => setTimeout(resolve, 5))
    one.abort(new Error("left"))
    await expect(first).rejects.toThrow("left")
    expect(signal?.aborted).toBe(false)
    other.abort(new Error("left too"))
    await expect(second).rejects.toThrow("left too")
    expect(signal?.aborted).toBe(true)
  })

  test("one that left before it went never goes", async () => {
    const { place, list, listMany } = placeOf()
    const batch = new PlaceBatch()
    const one = new AbortController()
    const leaving = batch.list(place, "a", {}, { signal: one.signal })
    const staying = batch.list(place, "b", {}, {})
    one.abort(new Error("left"))
    await expect(leaving).rejects.toThrow("left")
    await staying
    expect(listMany).not.toHaveBeenCalled()
    expect(list).toHaveBeenCalledTimes(1)
  })
})
