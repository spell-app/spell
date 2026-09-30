import { describe, expect, it } from "vitest"

import { Icons } from "$/icons"

/**
 * Own file so this module instance starts cold:  no alias maps, no names index, no glyphs.
 * - Resource Timing sees every `import()` the loader makes, 404s included.
 * - Order matters:  each test builds on what the earlier ones cached.
 */
describe("Icons.get() -- glyph first, no names index", () => {
  it("costs ONE glyph request for a solid icon, and nothing else", async () => {
    performance.setResourceTimingBufferSize(10_000)
    expect(await Icons.get("user")).toBeDefined()
    expect(requested("/glyphs/solid/user.js")).toBe(1)
    expect(requested("data/names.json")).toBe(0)
    expect(requested("data/aliases.json")).toBe(0)
    expect(requested("data/fomantic-aliases.json")).toBe(0)
  })

  it("costs a second request only for a brand:  the solid miss, then the brand", async () => {
    expect(await Icons.get("github")).toBeDefined()
    expect(requested("/glyphs/solid/github.js")).toBe(1)
    expect(requested("/glyphs/brands/github.js")).toBe(1)
    expect(requested("/glyphs/regular/")).toBe(0)
    expect(requested("data/names.json")).toBe(0)
    expect(requested("data/aliases.json")).toBe(0)
  })

  it("never requests a known miss again", async () => {
    expect(await Icons.get("github")).toBeDefined()
    expect(Icons.peek("github")).toBeDefined()
    expect(requested("/glyphs/solid/github.js")).toBe(1)
    expect(requested("/glyphs/brands/github.js")).toBe(1)
  })

  it("costs one request for an explicit style", async () => {
    expect(await Icons.get("envelope", "regular")).toBeDefined()
    expect(requested("/glyphs/regular/envelope.js")).toBe(1)
    expect(requested("/glyphs/solid/envelope.js")).toBe(0)
  })

  // NOTE: the first test to need the alias maps -- a miss with an explicit style would load them too
  it("loads the alias maps once a name needs them, still without the names index", async () => {
    expect(await Icons.get("setting")).toEqual(await Icons.get("gear"))
    expect(requested("data/fomantic-aliases.json")).toBe(1)
    // the exact-name attempts before the maps loaded
    expect(requested("/glyphs/solid/setting.js")).toBe(1)
    expect(requested("/glyphs/brands/setting.js")).toBe(1)
    expect(requested("data/names.json")).toBe(0)
  })

  it("routes an alias straight to its target once the maps are cached", async () => {
    expect(await Icons.get("cog")).toEqual(await Icons.get("gear"))
    expect(requested("/glyphs/solid/cog.js")).toBe(0)
    expect(requested("/glyphs/brands/cog.js")).toBe(0)
  })

  it("never tries `outline` as part of a name", async () => {
    expect(await Icons.get("mail outline")).toEqual(await Icons.get("envelope", "regular"))
    expect(requested("mail-outline")).toBe(0)
    expect(requested("/glyphs/regular/mail.js")).toBe(0)
  })

  it("costs an unknown one-word name two misses, once, and an explicit style no more", async () => {
    expect(await Icons.get("nosuchicon")).toBeUndefined()
    expect(requested("/nosuchicon.js")).toBe(2)
    expect(await Icons.get("nosuchicon")).toBeUndefined()
    expect(await Icons.get("nosuchicon", "solid")).toBeUndefined()
    expect(requested("/nosuchicon.js")).toBe(2)
    // no dash, so no word order to try
    expect(requested("data/names.json")).toBe(0)
  })

  it("never requests a name that isn't a slug", async () => {
    expect(await Icons.get("../../data/aliases", "solid")).toBeUndefined()
    expect(await Icons.get("../../data/aliases")).toBeUndefined()
    expect(requested("/glyphs/solid/..")).toBe(0)
    // where `glyphs/solid/../../data/aliases.js` would land
    const escaped = performance
      .getEntriesByType("resource")
      .filter((entry) => new URL(entry.name).pathname.endsWith("/data/aliases.js"))
    expect(escaped).toEqual([])
  })

  it("loads the names index only for word order, after the direct attempts missed", async () => {
    expect(await Icons.get("button tablet")).toEqual(await Icons.get("tablet-button"))
    expect(requested("/glyphs/solid/button-tablet.js")).toBe(1)
    expect(requested("/glyphs/brands/button-tablet.js")).toBe(1)
    expect(requested("data/names.json")).toBe(1)
    expect(Icons.peek("button tablet")).toEqual(Icons.peek("tablet-button"))
  })

  it("answers from the names index, not the network, once it's loaded", async () => {
    expect(await Icons.get("another-missing-icon")).toBeUndefined()
    expect(await Icons.get("apple", "brands")).toBeDefined()
    expect(requested("another-missing-icon")).toBe(0)
    expect(requested("/glyphs/brands/apple.js")).toBe(1)
  })
})

/** Resource Timing entries whose URL contains `fragment` -- one per request the page made. */
function requested(fragment: string): number {
  return performance.getEntriesByType("resource").filter((entry) => entry.name.includes(fragment)).length
}
