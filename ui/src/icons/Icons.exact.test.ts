import { describe, expect, it } from "vitest"

import { Icons } from "$/icons"

/**
 * Own file so this module instance starts cold:  no earlier test has loaded the alias maps.
 * - Resource Timing sees every `import()` the loader makes.
 */
describe("Icons.get() -- exact names", () => {
  const requested = (fragment: string) =>
    performance.getEntriesByType("resource").filter((entry) => entry.name.includes(fragment)).length

  it("skips the alias maps for an exact Font Awesome name", async () => {
    performance.setResourceTimingBufferSize(10_000)
    expect(await Icons.get("user")).toBeDefined()
    expect(await Icons.get("github")).toBeDefined()
    expect(requested("data/names.json")).toBe(1)
    expect(requested("data/aliases.json")).toBe(0)
    expect(requested("data/fomantic-aliases.json")).toBe(0)
  })

  it("loads the alias maps once a name needs them", async () => {
    expect(await Icons.get("setting")).toEqual(await Icons.get("gear"))
    expect(requested("data/fomantic-aliases.json")).toBe(1)
  })
})
