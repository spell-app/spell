import { afterEach, describe, expect, test } from "vite-plus/test"

import { E } from "spell/ui/core"
import { SiteData } from "spell/ui/docs-components/SiteData"
import { SiteDataLoad } from "spell/ui/docs-components/SiteDataLoad"
import type { SiteDataFile } from "spell/ui/docs-components/docs-components.types"

/** `<x-button>` and its sub-tag `<x-or>`, a docs tag, and the `x-button` family. */
const DATA = {
  components: [
    { tag: "x-button", folder: "x-button" },
    { tag: "x-or", folder: "x-button" }
  ],
  docs: [{ tag: "x-docs", folder: "x-docs" }],
  families: { "x-button": { folder: "x-button", mainTag: "x-button", tags: ["x-button", "x-or"] } }
} as unknown as SiteDataFile

/** A data file the test server doesn't have:  it answers 404. */
const MISSING = "/missing/__data/components.json5"

afterEach(() => (SiteData.url = undefined))

describe("SiteData.root()", () => {
  test("defaults `base` to the site root above the data file", () => {
    SiteData.url = "/somewhere/docs/__data/components.json5"
    expect(SiteData.root()).toBe(`${location.origin}/somewhere/docs/`)
  })
})

describe("SiteData.tag()", () => {
  test("finds a component or a docs tag;  undefined for anything else", () => {
    expect(SiteData.tag(DATA, "x-or")).toBe(DATA.components[1])
    expect(SiteData.tag(DATA, "x-docs")).toBe(DATA.docs[0])
    expect(SiteData.tag(DATA, "x-nope")).toBeUndefined()
  })
})

describe("SiteData.family()", () => {
  test("finds a sub-tag's family by its folder;  NEVER an inherited key", () => {
    expect(SiteData.family(DATA, "x-or")).toBe(DATA.families["x-button"])
    expect(SiteData.family(DATA, "x-button")).toBe(DATA.families["x-button"])
    expect(SiteData.family(DATA, "toString")).toBeUndefined()
  })
})

describe("SiteData.json()", () => {
  test("reads a data file as plain JSON, as its writer writes it", async () => {
    expect(await SiteData.json(new Response('{"version": 1}'))).toEqual({ version: 1 })
  })

  test("reads it as JSON5 once somebody has written a comment into it", async () => {
    expect(await SiteData.json(new Response('{\n  // why it is 1\n  "version": 1\n}\n'))).toEqual({ version: 1 })
  })

  test("rejects a file that won't read even as JSON5", async () => {
    await expect(SiteData.json(new Response("{ nope"))).rejects.toThrow(SyntaxError)
  })
})

describe("SiteData.load()", () => {
  test("rejects with a `load` `SourceError` naming the method, the URL, its answer and the fix", async () => {
    SiteData.url = MISSING
    const failure = await SiteData.load().catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(E.SourceError)
    expect(failure).toMatchObject({ cause: { kind: "load", status: 404 } })
    expect((failure as Error).message).toMatch(
      /^SiteData\.load\(\):  .*\/missing\/__data\/components\.json5 answered 404/
    )
    expect((failure as Error).message).toContain("run `yarn site:data`")
  })
})

describe("SiteDataLoad", () => {
  test("holds the data once it's in;  loading until then", async () => {
    SiteData.url = `data:application/json,${encodeURIComponent(JSON.stringify(DATA))}`
    const load = new SiteDataLoad()
    expect(load.isLoading).toBe(true)
    await load.loaded
    expect(load.value).toEqual(DATA)
    expect(load.error).toBeUndefined()
    expect(load.isLoading).toBe(false)
  })

  test("holds why the data didn't come, and is no longer loading", async () => {
    SiteData.url = MISSING
    const load = new SiteDataLoad()
    await load.loaded
    expect(load.value).toBeUndefined()
    expect(load.error).toBeInstanceOf(E.SourceError)
    expect(load.isLoading).toBe(false)
  })
})
