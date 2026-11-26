import { describe, expect, test } from "vite-plus/test"

import { MemoryPlace, PlaceError, type ListAnswer, type ListQuery } from "spell/places"
import { ReadCeiling, pagesOf, pagesOfList, type PageReader } from "spell/places/pagesOf"

/** A page of numbers, `size` a page, up to `pages` of them. */
type NumberPage = { rows: number[]; nextPage?: string }

/** A reader of `pages` pages, noting each `at` it's asked and each signal it's handed. */
function pagesReader(
  pages: number,
  { size = 2, waits }: { size?: number; waits?: (at: number) => Promise<void> } = {}
) {
  const asked: (string | undefined)[] = []
  const signals: AbortSignal[] = []
  const read: PageReader<NumberPage> = async (at, signal) => {
    asked.push(at)
    signals.push(signal)
    const page = Number(at ?? 0)
    await waits?.(page)
    signal.throwIfAborted()
    const rows = Array.from({ length: size }, (_, index) => page * size + index)
    return { rows, ...(page + 1 < pages && { nextPage: String(page + 1) }) }
  }
  return { read, asked, signals }
}

describe("pagesOf()", () => {
  test("a 10-page list:  the second page is asked only at the second step asked", async () => {
    const { read, asked } = pagesReader(10)
    const pages = pagesOf(read)
    expect(asked).toEqual([])
    await pages.next()
    expect(asked).toEqual([undefined])
    await pages.next()
    expect(asked).toEqual([undefined, "1"])
  })

  test("reads every page, then ends", async () => {
    const { read } = pagesReader(3)
    const rows: number[] = []
    for await (const page of pagesOf(read)) rows.push(...page.rows)
    expect(rows).toEqual([0, 1, 2, 3, 4, 5])
  })

  test("starts after a page already read", async () => {
    const { read, asked } = pagesReader(3)
    const rows: number[] = []
    for await (const page of pagesOf(read, { after: "1" })) rows.push(...page.rows)
    expect(asked).toEqual(["1", "2"])
    expect(rows).toEqual([2, 3, 4, 5])
  })

  test("stopping aborts the third, in flight, and asks for no more", async () => {
    let release = () => {}
    const { read, asked, signals } = pagesReader(10, {
      waits: (page) => (page === 2 ? new Promise((resolve) => (release = () => resolve())) : Promise.resolve())
    })
    const pages = pagesOf(read)
    await pages.next()
    await pages.next()
    const third = pages.next()
    await Promise.resolve()
    const stopping = pages.return()
    expect(signals[2]!.aborted).toBe(true)
    release()
    await expect(third).rejects.toThrow()
    await stopping
    expect(await pages.next()).toEqual({ done: true, value: undefined })
    expect(asked).toEqual([undefined, "1", "2"])
  })

  test("a break stops it too", async () => {
    const { read, asked } = pagesReader(10)
    for await (const page of pagesOf(read)) if (page.rows.includes(2)) break
    expect(asked).toEqual([undefined, "1"])
  })

  test("its signal stops it from outside", async () => {
    const { read, asked } = pagesReader(10)
    const controller = new AbortController()
    const pages = pagesOf(read, { signal: controller.signal })
    await pages.next()
    controller.abort()
    await expect(pages.next()).rejects.toThrow()
    expect(asked).toEqual([undefined])
  })

  test("every page counts against its ceiling", async () => {
    const { read } = pagesReader(10)
    const place = new MemoryPlace({ capabilities: { ceiling: { rows: 5 } } })
    const ceiling = new ReadCeiling({ placeName: "numbers", collection: "n", place }, "every page")
    const pages = pagesOf(read, { ceiling })
    await pages.next()
    await pages.next()
    await expect(pages.next()).rejects.toBeInstanceOf(PlaceError)
  })
})

describe("pagesOfList()", () => {
  test("a place's own pages, following its nextPage", async () => {
    const recipes = Array.from({ length: 5 }, (_, index) => ({ id: `r-${index}` }))
    const place = new MemoryPlace({ collections: { recipes } })
    const asks: ListQuery[] = []
    const list = place.list.bind(place)
    place.list = (collection, query, context) => {
      asks.push(query)
      return list(collection, query, context)
    }
    const pages: ListAnswer[] = []
    for await (const page of pagesOfList(place, "recipes", { page: { size: 2 } }, {})) pages.push(page)
    expect(pages.map((page) => page.rows.length)).toEqual([2, 2, 1])
    expect(asks.map((ask) => ask.page)).toEqual([{ size: 2 }, { size: 2, at: "2" }, { size: 2, at: "4" }])
  })
})
