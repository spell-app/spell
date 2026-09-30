import { describe, expect, it } from "vitest"

import { UI } from "$/runtime"
import { expectAccessible } from "$test/a11y"

import { ElementFixture } from "$test/ElementFixture"
import type { UIHost } from "$/elements"
import { FlagCountry } from "$/components/flag"

import "$/components/flag"

/** Element-markup rewrites of every example, by path. */
const EXAMPLES = import.meta.glob<string>("/src/components/flag/examples/elements/*.html", {
  query: "?raw",
  import: "default",
  eager: true
})

/** Render one `<ui-flag>`;  returns it with its root. */
async function flag(html: string) {
  const host = await ElementFixture.render<UIHost>(html)
  const root = host.shadowRoot!.querySelector<HTMLElement>("[part~=flag]")!
  return { host, root }
}

describe("FlagCountry", () => {
  it.each([
    ["fr", "fr", "🇫🇷"],
    ["FR", "fr", "🇫🇷"],
    [" France ", "fr", "🇫🇷"],
    ["United_States", "us", "🇺🇸"],
    ["united   states", "us", "🇺🇸"],
    ["america", "us", "🇺🇸"],
    ["uk", "gb", "🇬🇧"],
    ["england", "gb-eng", "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}"],
    ["pride", "rainbow", "\u{1F3F3}\u{FE0F}\u{200D}\u{1F308}"],
    ["atlantis", "", ""],
    ["", "", ""]
  ])("%j => %j %s", (country, code, emoji) => {
    const resolved = new FlagCountry(country)
    expect(resolved.code).toBe(code)
    expect(resolved.emoji).toBe(emoji)
  })

  it("names non-country flags by text key, countries by region", () => {
    expect(new FlagCountry("england").textKey).toBe("gbEng")
    expect(new FlagCountry("england").region).toBeUndefined()
    expect(new FlagCountry("fr").textKey).toBeUndefined()
    expect(new FlagCountry("fr").region).toBe("FR")
    expect(new FlagCountry("nowhere").region).toBeUndefined()
  })
})

describe("<ui-flag> classes", () => {
  it.each([
    ['country="fr"', "ui flag"],
    ['country="fr" size="large"', "ui large flag"],
    ['country="fr" size="medium"', "ui flag"],
    ['country="fr" size="massive"', "ui massive flag"]
  ])("<ui-flag %s>", async (attributes, classes) => {
    const { root } = await flag(`<ui-flag ${attributes}></ui-flag>`)
    expect(root.localName).toBe("span")
    expect(root.className).toBe(classes)
  })
})

describe("<ui-flag> glyph and name", () => {
  it("is role=img, named by its region in the runtime's locale, holding the emoji", async () => {
    const { root } = await flag(`<ui-flag country="fr"></ui-flag>`)
    expect(root.getAttribute("role")).toBe("img")
    expect(root.getAttribute("aria-label")).toBe(UI.i18n.displayName("region", "FR"))
    expect(root.getAttribute("aria-label")).toBe("France")
    expect(root.textContent).toBe("🇫🇷")
  })

  it("names the non-country flags from its texts", async () => {
    const { root } = await flag(`<ui-flag country="pirate"></ui-flag>`)
    expect(root.getAttribute("aria-label")).toBe("Pirate flag")
    const { root: wales } = await flag(`<ui-flag country="wales"></ui-flag>`)
    expect(wales.getAttribute("aria-label")).toBe("Wales")
  })

  it("follows `country`", async () => {
    const { host, root } = await flag(`<ui-flag country="fr"></ui-flag>`)
    host.setAttribute("country", "Germany")
    await ElementFixture.tick()
    expect(root.textContent).toBe("🇩🇪")
    expect(root.getAttribute("aria-label")).toBe("Germany")
  })

  it("renders an empty, unnamed box for an unknown country", async () => {
    const { root } = await flag(`<ui-flag country="atlantis"></ui-flag>`)
    expect(root.textContent).toBe("")
    expect(root.hasAttribute("role")).toBe(false)
    expect(root.hasAttribute("aria-label")).toBe(false)
    expect(root.className).toBe("ui flag")
  })

  it("is sized against the surrounding text", async () => {
    const { host, root } = await flag(`<ui-flag country="fr" size="large"></ui-flag>`)
    const surrounding = Number.parseFloat(getComputedStyle(host.parentElement!).fontSize)
    expect(Number.parseFloat(getComputedStyle(root).fontSize)).toBeCloseTo(surrounding * 6, 0)
  })
})

describe("<ui-flag> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("axe passes on %s", async (path) => {
    const root = await ElementFixture.render(EXAMPLES[path]!)
    await expectAccessible(root)
  })
})
