/**
 * Tests of `EpicBodies`:  an `<epic-*>` fold's part, read through its epic page's chunked place;
 * and of a fold on it, opening and re-fetching (`LoadableBody`).
 */
import { afterEach, beforeAll, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { E, UI } from "spell/ui/core"

import "spell/epic/components/epic-item"

import { EpicBodies } from "spell/epic/components/epic-item/EpicBodies"

/** Answer `fetch` from `files`, by what the URL ends in;  any other:  a 404.  Keeps each call's URL and options. */
function serve(files: Record<string, string>) {
  const calls: { url: string; init: RequestInit | undefined }[] = []
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    calls.push({ url, init })
    const found = Object.keys(files).find((name) => url.endsWith(name))
    return found === undefined ? new Response("", { status: 404 }) : new Response(files[found], { status: 200 })
  })
  return calls
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("EpicBodies.loadText()", () => {
  test("a part:  read beside this page, past the browser's cache", async () => {
    const calls = serve({ "/parts/q1.html": "<p>q1</p>" })
    expect(await EpicBodies.loadText("parts/q1.html", {})).toBe("<p>q1</p>")
    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toBe(new URL("parts/q1.html", document.baseURI).href)
    expect(calls[0]!.init?.cache).toBe("no-cache")
  })

  test("any other source is none of its business:  `UI.sources` takes it", () => {
    const calls = serve({})
    expect(EpicBodies.loadText("/demo/parts/q1.html", {})).toBeUndefined()
    expect(EpicBodies.loadText("fixtures/q1.html", {})).toBeUndefined()
    expect(calls).toHaveLength(0)
  })

  test("no such part:  a `SourceError`, the fold's note", async () => {
    serve({})
    await expect(EpicBodies.loadText("parts/nope.html", {})).rejects.toMatchObject({ kind: "load", status: 404 })
    await expect(EpicBodies.loadText("parts/nope.html", {})).rejects.toBeInstanceOf(E.SourceError)
  })

  test("a server with no answer is thrown as it is", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("", { status: 500 }))
    await expect(EpicBodies.loadText("parts/q1.html", {})).rejects.toThrow()
  })

  test("an abort stops the read", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          // As the real `fetch()`:  a signal already aborted rejects at once, and no "abort" event will come
          if (init?.signal?.aborted) reject(init.signal.reason)
          init?.signal?.addEventListener("abort", () => reject(init.signal!.reason))
        })
    )
    const aborter = new AbortController()
    const read = EpicBodies.loadText("parts/q1.html", { signal: aborter.signal })!
    aborter.abort()
    await expect(read).rejects.toThrow()
  })
})

describe("<epic-item source=parts/...>", () => {
  beforeAll(async () => {
    await UI.load()
  })

  /** An `<epic-item>` on a part, ready. */
  function item(attributes: string) {
    return ElementFixture.render<E.DOMLoadableBodyElement>(
      `<epic-item id="q1" title="Parts" status="open" source="parts/q1.html" ${attributes}></epic-item>`
    )
  }

  test("opens through the place, never `UI.sources`;  a re-fetch replaces the body in place", async () => {
    const sources = vi.spyOn(UI.sources, "load")
    const files = { "/parts/q1.html": `<p id="first">old</p>` }
    const calls = serve(files)
    const host = await item("open")
    await vi.waitFor(() => expect(host.querySelector("#first")).not.toBeNull())
    expect(calls).toHaveLength(1)
    expect(sources).not.toHaveBeenCalled()

    files["/parts/q1.html"] = `<p id="second">new</p>`
    await host.reload()
    await vi.waitFor(() => expect(host.querySelector("#second")).not.toBeNull())
    expect(host.querySelector("#first")).toBeNull()
    expect(calls).toHaveLength(2)
    expect(sources).not.toHaveBeenCalled()
  })

  test("a missing part shows the fold's note, and the next load tries again", async () => {
    const files: Record<string, string> = {}
    serve(files)
    const host = await item("open")
    await vi.waitFor(() => expect(host.matches(":state(error)")).toBe(true))
    files["/parts/q1.html"] = `<p id="back">here now</p>`
    await host.load()
    await vi.waitFor(() => expect(host.querySelector("#back")).not.toBeNull())
    expect(host.matches(":state(error)")).toBe(false)
  })
})
