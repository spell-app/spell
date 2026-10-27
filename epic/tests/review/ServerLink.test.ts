import { describe, expect, test, vi } from "vite-plus/test"

import { ServerLink } from "spell-epic/review/ServerLink"

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
