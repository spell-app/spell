import { describe, expect, it } from "vitest"

import { Icons } from "$/icons"

/**
 * Runs against the REAL generated data (`src/icons/data/*.json`), not a fixture -- these tests are the
 * regression check that `scripts/gen-icons.ts`'s output and `Icons`' resolution logic agree with each
 * other, so a name below has to keep meaning the same FA6 icon across a regeneration.
 */

describe("Icons.resolve()", () => {
  it("maps a Fomantic alias to its FA6 canonical name", async () => {
    expect(await Icons.resolve("sign in")).toEqual({ name: "right-to-bracket", style: "solid" })
  })

  it("maps the `outline` word to the regular style", async () => {
    expect(await Icons.resolve("mail outline")).toEqual({ name: "envelope", style: "regular" })
  })

  it("finds a brand-only name in the brands style", async () => {
    expect(await Icons.resolve("github")).toEqual({ name: "github", style: "brands" })
  })

  it("passes an already-correct FA6 name through unchanged", async () => {
    expect(await Icons.resolve("user")).toEqual({ name: "user", style: "solid" })
  })

  it("lets an explicit style override the inferred one", async () => {
    expect(await Icons.resolve("user", "regular")).toEqual({ name: "user", style: "regular" })
  })

  /** ~10 well-known Fomantic names, each round-tripped to the FA6 name `gen-icons.ts` reported for it. */
  const fomanticRoundTrips: [string, string][] = [
    ["setting", "gear"],
    ["settings", "gears"],
    ["remove", "xmark"],
    ["delete", "xmark"],
    ["close", "xmark"],
    ["checkmark", "check"],
    ["dropdown", "caret-down"],
    ["caret down", "caret-down"],
    ["mail", "envelope"],
    ["sign out", "right-from-bracket"]
  ]
  it.each(fomanticRoundTrips)("resolves Fomantic name %j to %j", async (fomanticName, fa6Name) => {
    expect((await Icons.resolve(fomanticName)).name).toBe(fa6Name)
  })
})

describe("Icons.get()", () => {
  it("returns a tuple with a non-empty path for a plain FA6 name", async () => {
    const data = await Icons.get("user")
    expect(data).toBeDefined()
    const [width, height, path] = data!
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
    expect(path.length).toBeGreaterThan(0)
  })

  it("returns undefined for a name Font Awesome doesn't have", async () => {
    expect(await Icons.get("not-a-real-icon-name")).toBeUndefined()
  })

  it("resolves aliases before loading, same as resolve()", async () => {
    const direct = await Icons.get("envelope", "regular")
    const aliased = await Icons.get("mail outline")
    expect(aliased).toEqual(direct)
  })
})

describe("Icons.peek()", () => {
  it("is undefined before get(), populated after", async () => {
    // NOTE: a name not used by any earlier test in this file -- `peek()`'s cache is shared/module-level.
    expect(Icons.peek("wrench")).toBeUndefined()
    const loaded = await Icons.get("wrench")
    expect(Icons.peek("wrench")).toEqual(loaded)
  })

  it("resolves aliases synchronously once the target chunk is cached", async () => {
    await Icons.get("gear") // warms the "solid" chunk containing "gear"
    expect(Icons.peek("setting")).toEqual(Icons.peek("gear"))
  })
})

describe("Icons.svg()", () => {
  it("is aria-hidden by default, with a single currentColor path", async () => {
    const data = await Icons.get("user")
    const svg = Icons.svg(data!)
    expect(svg.getAttribute("aria-hidden")).toBe("true")
    expect(svg.hasAttribute("role")).toBe(false)
    expect(svg.getAttribute("viewBox")).toBe(`0 0 ${data![0]} ${data![1]}`)
    const path = svg.querySelector("path")
    expect(path?.getAttribute("fill")).toBe("currentColor")
    expect(path?.getAttribute("d")).toBe(data![2])
  })

  it("is role=img with aria-label when given a label", async () => {
    const data = await Icons.get("user")
    const svg = Icons.svg(data!, { label: "Account" })
    expect(svg.getAttribute("role")).toBe("img")
    expect(svg.getAttribute("aria-label")).toBe("Account")
    expect(svg.hasAttribute("aria-hidden")).toBe(false)
  })

  it("adds a <title> when given one", async () => {
    const data = await Icons.get("user")
    const svg = Icons.svg(data!, { title: "User account" })
    expect(svg.querySelector("title")?.textContent).toBe("User account")
  })
})

describe("Icons.svgString()", () => {
  it("matches svg()'s markup shape", async () => {
    const data = await Icons.get("user")
    const html = Icons.svgString(data!)
    expect(html).toContain(`viewBox="0 0 ${data![0]} ${data![1]}"`)
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain(`d="${data![2]}"`)
  })
})

describe("Icons.preload()", () => {
  it("warms peek() for every requested name", async () => {
    await Icons.preload(["circle-check", "circle-xmark"])
    expect(Icons.peek("circle-check")).toBeDefined()
    expect(Icons.peek("circle-xmark")).toBeDefined()
  })
})
