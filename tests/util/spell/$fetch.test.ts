import { describe, test, expect } from "vite-plus/test"
import { $fetch, merge$fetchParms } from "spell/util/spell/$fetch"
import { MissingResourceError } from "spell/util/spell/ResponseErrors"

describe("merge$fetchParms()", () => {
  test("merges headers across params, field-by-field", () => {
    const result = merge$fetchParms({ headers: { Accept: "text/plain" } }, { headers: { "X-Foo": "bar" } })
    expect(result.headers).toEqual({ Accept: "text/plain", "X-Foo": "bar" })
  })

  test("later value wins per key when headers collide", () => {
    const result = merge$fetchParms(
      { headers: { "Content-Type": "text/plain" } },
      { headers: { "Content-Type": "application/json" } }
    )
    expect(result.headers).toEqual({ "Content-Type": "application/json" })
  })

  test("does not mutate or alias caller's original header objects", () => {
    const first = { Accept: "text/plain" }
    const second = { "X-Foo": "bar" }
    const result = merge$fetchParms({ headers: first }, { headers: second })
    expect(result.headers).not.toBe(first)
    expect(result.headers).not.toBe(second)
    expect(first).toEqual({ Accept: "text/plain" })
    expect(second).toEqual({ "X-Foo": "bar" })
  })

  test("replaces non-object values with the later entry, rather than merging", () => {
    const result = merge$fetchParms({ method: "GET", url: "/a" }, { method: "POST" })
    expect(result.method).toBe("POST")
    expect(result.url).toBe("/a")
  })

  test("tolerates undefined and missing params entries", () => {
    const result = merge$fetchParms({ url: "/a", headers: undefined }, undefined as any, {
      headers: { "X-Foo": "bar" }
    })
    expect(result.url).toBe("/a")
    expect(result.headers).toEqual({ "X-Foo": "bar" })
  })

  test("later falsy/undefined value does not clobber an earlier object value", () => {
    const result = merge$fetchParms({ headers: { Accept: "text/plain" } }, { headers: undefined })
    expect(result.headers).toEqual({ Accept: "text/plain" })
  })
})

describe("$fetch()", () => {
  test("calls the `fetch` it's given, with its `cache` and the query after a `?`", async () => {
    const calls: Array<[string, RequestInit]> = []
    const fetcher = (async (url: string, init: RequestInit) => {
      calls.push([url, init])
      return new Response('{"answer":1}', { status: 200 })
    }) as unknown as typeof fetch
    const reply = await $fetch({
      url: "/api",
      query: { page: "/a b.html" },
      format: "json",
      cache: "no-store",
      fetch: fetcher
    })
    expect([reply, calls[0]![0], calls[0]![1].cache]).toEqual([{ answer: 1 }, "/api?page=%2Fa%20b.html", "no-store"])
  })

  test("answers `defaultContents` for a 404, and throws `MissingResourceError` without it", async () => {
    const fetcher = (async () => new Response("gone", { status: 404 })) as unknown as typeof fetch
    expect(await $fetch({ url: "/x", format: "json", defaultContents: null, fetch: fetcher })).toBe(null)
    await expect($fetch({ url: "/x", fetch: fetcher })).rejects.toBeInstanceOf(MissingResourceError)
  })
})
