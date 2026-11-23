import { describe, expect, test } from "vite-plus/test"

import { PoliteReader, READER_ORIGIN, readerOriginFor } from "spell/parser/spell/ingest/PoliteReader"

/** The `Origin` it asks as:  a page's, except on this machine, where a local server refuses a foreign page. */

/** The `Origin` header `url` was read with, or `null`. */
async function originSentTo(url: string): Promise<string | null> {
  let origin: string | null = "never asked"
  const fetch = (async (_: string, init: RequestInit) => {
    origin = new Headers(init.headers).get("origin")
    return new Response("[]")
  }) as typeof globalThis.fetch
  await new PoliteReader({ fetch, sleep: async () => {} }).read(url)
  return origin
}

describe("PoliteReader's Origin", () => {
  test.each([
    "http://127.0.0.1:4800/api/racks",
    "http://127.1.2.3/x",
    "http://localhost:8080/v1/items",
    "http://LOCALHOST/x",
    "http://books.localhost:5000/x",
    "http://[::1]:9000/x"
  ])("none on this machine:  %s", async (url) => {
    expect(readerOriginFor(url)).toBeUndefined()
    expect(await originSentTo(url)).toBeNull()
  })

  test.each([
    "https://openlibrary.org/search.json",
    "https://api.example.com/v1",
    "http://10.0.0.5/x",
    "http://localhost.example.com/x"
  ])("a page's elsewhere:  %s", async (url) => {
    expect(readerOriginFor(url)).toBe(READER_ORIGIN)
    expect(await originSentTo(url)).toBe(READER_ORIGIN)
  })

  test("an address it can't read is asked as a page", () => {
    expect(readerOriginFor("not an address")).toBe(READER_ORIGIN)
  })
})
