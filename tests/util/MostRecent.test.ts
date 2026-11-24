import { describe, expect, test, vi } from "vite-plus/test"

import { MostRecent } from "spell/util/MostRecent"

describe("MostRecent", () => {
  test("keeps the newest `size`, newest first, and tells of each one pushed out", () => {
    const onDropped = vi.fn()
    const recent = new MostRecent<string>(3, { onDropped })
    for (const it of ["a", "b", "c"]) expect(recent.use(it)).toEqual([])
    expect(recent.items).toEqual(["c", "b", "a"])
    expect(recent.use("d")).toEqual(["a"])
    expect(onDropped).toHaveBeenCalledExactlyOnceWith("a")
    expect(recent.items).toEqual(["d", "c", "b"])
    expect(recent.has("a")).toBe(false)
  })

  test("a thing used again moves to the front, never kept twice", () => {
    const recent = new MostRecent<string>(3)
    for (const it of ["a", "b", "c", "a"]) recent.use(it)
    expect(recent.items).toEqual(["a", "c", "b"])
    expect(recent.use("d")).toEqual(["b"])
  })

  test("`drop()` tells, `forget()` and `clear()` don't", () => {
    const onDropped = vi.fn()
    const recent = new MostRecent<number>(2, { onDropped })
    recent.use(1)
    recent.use(2)
    expect(recent.drop(1)).toBe(true)
    expect(recent.drop(1)).toBe(false)
    expect(recent.forget(2)).toBe(true)
    recent.use(3)
    recent.clear()
    expect(onDropped.mock.calls).toEqual([[1]])
    expect(recent.items).toEqual([])
  })

  test("`onDropped` may use the list again:  it runs once the thing has left", () => {
    const seen: string[][] = []
    const recent: MostRecent<string> = new MostRecent<string>(1, { onDropped: () => seen.push(recent.items) })
    recent.use("a")
    recent.use("b")
    expect(seen).toEqual([["b"]])
  })

  test("throws for a size under 1", () => {
    expect(() => new MostRecent(0)).toThrow(TypeError)
  })
})
