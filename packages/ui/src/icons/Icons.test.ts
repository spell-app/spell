import { afterEach, describe, expect, it } from "vitest"

import { ICON_NAMES_ATTRIBUTE, Icons } from "$/icons"
import faAliases from "$/icons/data/aliases.json"
import fomanticClashes from "$/icons/data/fomantic-clashes.json"

/**
 * Runs against the REAL generated data (`src/icons/data/*.json`), not a fixture -- these tests are the
 * regression check that `scripts/gen-icons.ts`'s output and `Icons`' resolution logic agree with each
 * other, so a name below has to keep meaning the same FA7 icon across a regeneration.
 */

describe("Icons.resolve()", () => {
  it("maps a Fomantic alias to its FA7 canonical name", async () => {
    expect(await Icons.resolve("add user")).toEqual({ name: "user-plus", style: "solid" })
  })

  it("maps the `outline` word to the regular style", async () => {
    expect(await Icons.resolve("mail outline")).toEqual({ name: "envelope", style: "regular" })
  })

  it("finds a brand-only name in the brands style", async () => {
    expect(await Icons.resolve("github")).toEqual({ name: "github", style: "brands" })
  })

  it("passes an already-correct FA7 name through unchanged", async () => {
    expect(await Icons.resolve("user")).toEqual({ name: "user", style: "solid" })
  })

  it("lets an explicit style override the inferred one", async () => {
    expect(await Icons.resolve("user", "regular")).toEqual({ name: "user", style: "regular" })
  })

  /** ~12 well-known Fomantic names, each round-tripped to the FA7 name `gen-icons.ts` reported for it. */
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
    // FA7 merged `user-large` into `user` -- matched via `aliases.unicodes.primary`
    ["user alternate", "user"],
    // FA7 Free dropped `vector-square` -- `MANUAL_OVERRIDES` stand-in
    ["vector square", "object-group"]
  ]
  it.each(fomanticRoundTrips)("resolves Fomantic name %j to %j", async (fomanticName, fa7Name) => {
    expect((await Icons.resolve(fomanticName)).name).toBe(fa7Name)
  })
})

describe("Icons.resolve() -- spaces and dashes", () => {
  it.each([
    ["tablet button", "tablet-button"],
    ["circle check", "circle-check"],
    ["arrow right to bracket", "arrow-right-to-bracket"],
    ["Circle  Check", "circle-check"]
  ])("resolves %j to %j", async (typed, expected) => {
    expect((await Icons.resolve(typed)).name).toBe(expected)
  })

  it("treats a dashed Fomantic name like the spaced one", async () => {
    expect(await Icons.resolve("add-user")).toEqual(await Icons.resolve("add user"))
  })

  it("treats a dashed `outline` like the spaced one", async () => {
    expect(await Icons.resolve("mail-outline")).toEqual({ name: "envelope", style: "regular" })
  })
})

describe("Icons.resolve() -- word order", () => {
  it.each([
    ["button tablet", "tablet-button"],
    ["bracket arrow right to", "arrow-right-to-bracket"],
    ["square github", "square-github"]
  ])("resolves %j to %j", async (typed, expected) => {
    expect((await Icons.resolve(typed)).name).toBe(expected)
  })

  it("prefers an exact name or alias over a reordering", async () => {
    // `check circle` is Fomantic's own name for `circle-check` -- same answer, but via the alias
    expect((await Icons.resolve("check circle")).name).toBe("circle-check")
    expect((await Icons.resolve("arrow up z a")).name).toBe("arrow-up-z-a")
  })

  it("leaves an ambiguous word set as typed, so it finds nothing", async () => {
    expect((await Icons.resolve("a z up arrow")).name).toBe("a-z-up-arrow")
    expect(await Icons.get("a z up arrow")).toBeUndefined()
  })

  it("never redirects a real brand name", async () => {
    const wrong: string[] = []
    for (const name of await Icons.names("brands")) {
      const resolved = await Icons.resolve(name)
      if (resolved.name !== name) wrong.push(`${name} -> ${resolved.name}`)
    }
    expect(wrong).toEqual([])
  })

  it("works in peek() once the solid index is loaded", async () => {
    const loaded = await Icons.get("button tablet")
    expect(loaded).toBeDefined()
    expect(Icons.peek("button tablet")).toEqual(loaded)
  })
})

/**
 * Font Awesome's meaning wins a clash unless `<html ui-icon-names="fomantic">` -- see `docs/icons.md`.
 * - Checked over EVERY FA7 name and alias, so a regeneration can't quietly let Fomantic shadow one.
 */
describe("Icons.resolve() -- Font Awesome vs Fomantic names", () => {
  afterEach(() => document.documentElement.removeAttribute(ICON_NAMES_ATTRIBUTE))

  it("resolves every FA7 name to itself by default", async () => {
    const wrong: string[] = []
    for (const style of ["solid", "regular", "brands"] as const) {
      for (const name of await Icons.names(style)) {
        const resolved = await Icons.resolve(name, style)
        if (resolved.name !== name) wrong.push(`${style} ${name} -> ${resolved.name}`)
      }
    }
    expect(wrong).toEqual([])
  })

  it("resolves every FA7 alias to Font Awesome's target by default", async () => {
    const wrong: string[] = []
    for (const [alias, target] of Object.entries(faAliases as Record<string, string>)) {
      const resolved = await Icons.resolve(alias)
      if (resolved.name !== target) wrong.push(`${alias} -> ${resolved.name}, not ${target}`)
    }
    expect(wrong).toEqual([])
  })

  it.each([
    ["x", "x"],
    ["warning", "triangle-exclamation"],
    ["sign in", "arrow-right-to-bracket"],
    ["sign-in", "arrow-right-to-bracket"],
    ["desktop", "desktop"]
  ])("gives Font Awesome's meaning for %j by default", async (typed, expected) => {
    expect((await Icons.resolve(typed)).name).toBe(expected)
  })

  it.each([
    ["x", "xmark"],
    ["warning", "exclamation"],
    ["sign in", "right-to-bracket"],
    ["sign-in", "right-to-bracket"],
    ["desktop", "display"]
  ])("gives Fomantic's meaning for %j when the page opts in", async (typed, expected) => {
    document.documentElement.setAttribute(ICON_NAMES_ATTRIBUTE, "fomantic")
    expect(Icons.preferredNames).toBe("fomantic")
    expect((await Icons.resolve(typed)).name).toBe(expected)
  })

  it("only changes the clashing words when the page opts in", async () => {
    const before = await Icons.resolve("setting")
    document.documentElement.setAttribute(ICON_NAMES_ATTRIBUTE, "fomantic")
    expect(await Icons.resolve("setting")).toEqual(before)
    expect(Object.keys(fomanticClashes).length).toBeGreaterThan(0)
  })

  it("treats any other attribute value as Font Awesome", () => {
    document.documentElement.setAttribute(ICON_NAMES_ATTRIBUTE, "semantic")
    expect(Icons.preferredNames).toBe("fontawesome")
  })
})

describe("Icons.get()", () => {
  it("returns a tuple with a non-empty path for a plain FA7 name", async () => {
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

  /**
   * The alias maps are lazy now (`Icons.ts`'s `#loadAliases()`), so an EMPTY `preload()` used to be a no-op
   * for them.  It still warms `peek()`'s alias resolution on its own -- this only needs the target CHUNK
   * warmed separately (here via `get()`) to prove the alias half came from `preload([])`, not from `get()`.
   */
  it("warms the alias maps even with no names, so peek() can resolve a Fomantic alias once its chunk is cached", async () => {
    await Icons.preload([])
    await Icons.get("envelope", "regular")
    // "mail outline" -> Fomantic alias "mail" -> "envelope", regular style from the "outline" word --
    // needs the (now-warmed) Fomantic alias map to find "envelope" synchronously at all.
    expect(Icons.peek("mail outline")).toEqual(Icons.peek("envelope", "regular"))
  })
})

describe("Icons.get() -- explicit style beats aliasing", () => {
  it("returns the Apple brand logo for (apple, brands), not the solid apple-whole alias", async () => {
    const brand = await Icons.get("apple", "brands")
    expect(brand).toBeDefined()
    expect(brand?.[2].length).toBeGreaterThan(0)
    // bare `apple` keeps Font Awesome's meaning (the brand) unless the page opts into Fomantic names
    expect(await Icons.resolve("apple")).toEqual({ name: "apple", style: "brands" })
  })

  it("peek() follows the same rule once the brands chunk is cached", async () => {
    await Icons.get("apple", "brands")
    expect(Icons.peek("apple", "brands")).toBeDefined()
  })
})
