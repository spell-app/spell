import { describe, expect, test, vi } from "vite-plus/test"

import { ServerLink } from "spell/epic/review/ServerLink"

////////////////
// ## Fakes
////////////////

/** A page server answering `files` (a path to its text);  any other path a 404, `/broken.json` a 500. */
function linkTo(files: Record<string, string>, { protocol = "http:" } = {}) {
  // `$fetch()` asks by the URL's text
  const fetch = vi.fn(async (path: string) => {
    if (path === "/broken.json") return new Response(JSON.stringify({ error: "the disk is full" }), { status: 500 })
    if (path in files) return new Response(files[path], { headers: { "content-type": "application/json" } })
    return new Response("not found", { status: 404 })
  })
  const link = new ServerLink({ page: "/guides/x.html", protocol, fetch: fetch as unknown as typeof globalThis.fetch })
  return { link, fetch }
}

/** The paths `fetch` was asked for, in order. */
function asked(fetch: ReturnType<typeof linkTo>["fetch"]): string[] {
  return fetch.mock.calls.map(([path]) => path)
}

////////////////
// ## Tests
////////////////

describe("ServerLink.dataFileNames()", () => {
  test("a data file's name now first, `.json5`, then its old one, `.json`, whichever it's given;  any other alone", () => {
    expect(ServerLink.dataFileNames("/x/core.declarations.json")).toEqual([
      "/x/core.declarations.json5",
      "/x/core.declarations.json"
    ])
    expect(ServerLink.dataFileNames("/x/a.inbox.json5")).toEqual(["/x/a.inbox.json5", "/x/a.inbox.json"])
    expect(ServerLink.dataFileNames("/x/page.html")).toEqual(["/x/page.html"])
  })
})

describe("ServerLink.getFile()", () => {
  test("the first of its names the checkout has:  the name now, else the old one;  as JSON, or its text", async () => {
    const { link, fetch } = linkTo({ "/x/list.json": `{ "rows": [1] }`, "/x/rows.json5": `{ rows: [2] }` })
    expect(await link.getFile(ServerLink.dataFileNames("/x/list.json"))).toEqual({ rows: [1] })
    expect(asked(fetch)).toEqual(["/x/list.json5", "/x/list.json"])
    expect(await link.getFile("/x/rows.json5", { format: "text" })).toBe(`{ rows: [2] }`)
  })

  test("none of its names:  `undefined`;  from `file://`, without asking", async () => {
    const { link } = linkTo({})
    expect(await link.getFile(ServerLink.dataFileNames("/x/gone.json5"))).toBeUndefined()
    const offline = linkTo({ "/x/list.json5": "{}" }, { protocol: "file:" })
    expect(await offline.link.getFile("/x/list.json5")).toBeUndefined()
    expect(offline.fetch).not.toHaveBeenCalled()
  })

  test("any other failure throws, its message starting with the file's name", async () => {
    const { link } = linkTo({})
    await expect(link.getFile("/broken.json")).rejects.toThrow(/^broken\.json:  the disk is full$/)
  })
})

describe("ServerLink.post() while the page server restarts (epic `epic-engine` I294)", () => {
  /** A server that doesn't answer for its first `down` tries, then answers `{ ok: true }`. */
  function restartingLink(down: number) {
    let tries = 0
    const fetch = vi.fn(async () => {
      if (++tries <= down) throw new TypeError("Failed to fetch")
      return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } })
    })
    const link = new ServerLink({
      page: "/epics/x/x.plan.html",
      protocol: "http:",
      server: { token: "t" } as never,
      fetch: fetch as unknown as typeof globalThis.fetch
    })
    return { link, fetch }
  }

  test("tries again, quietly, until the server answers:  the write lands", async () => {
    vi.useFakeTimers()
    try {
      const { link, fetch } = restartingLink(3)
      const posting = link.post("/api/x", { a: 1 })
      await vi.advanceTimersByTimeAsync(10_000)
      await expect(posting).resolves.toEqual({ ok: true })
      expect(fetch).toHaveBeenCalledTimes(4)
    } finally {
      vi.useRealTimers()
    }
  })

  test("gives up after 30s, saying so", async () => {
    vi.useFakeTimers()
    try {
      const { link } = restartingLink(Number.POSITIVE_INFINITY)
      const posting = link.post("/api/x", { a: 1 })
      const failed = expect(posting).rejects.toThrow(
        "the page server didn't answer for 30s (Failed to fetch):  is it running?"
      )
      await vi.advanceTimersByTimeAsync(40_000)
      await failed
    } finally {
      vi.useRealTimers()
    }
  })

  test("a page going away (`keepalive`) doesn't wait:  it fails at once", async () => {
    const { link, fetch } = restartingLink(1)
    await expect(link.post("/api/x", {}, { keepalive: true })).rejects.toThrow(/couldn't reach the page server/)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

describe("ServerLink.watch() while the page server is down (epic `epic-engine` I294)", () => {
  test("no poll while the live client says it's down;  one look at once when it's back", () => {
    vi.useFakeTimers()
    const window = Object.assign(new EventTarget(), {
      document: Object.assign(new EventTarget(), { visibilityState: "visible" }),
      setInterval: (run: () => void, ms: number) => setInterval(run, ms),
      clearInterval: (timer: ReturnType<typeof setInterval>) => clearInterval(timer)
    }) as unknown as Window
    const refresh = vi.fn()
    const stop = ServerLink.watch(window, undefined, refresh, { every: 1000 })
    try {
      vi.advanceTimersByTime(1000)
      expect(refresh).toHaveBeenCalledTimes(1)
      window.dispatchEvent(new Event("spell-server:down"))
      vi.advanceTimersByTime(5000)
      window.document.dispatchEvent(new Event("visibilitychange"))
      expect(refresh).toHaveBeenCalledTimes(1)
      window.dispatchEvent(new Event("spell-server:up"))
      expect(refresh).toHaveBeenCalledTimes(2)
      vi.advanceTimersByTime(1000)
      expect(refresh).toHaveBeenCalledTimes(3)
    } finally {
      stop()
      vi.useRealTimers()
    }
  })
})
