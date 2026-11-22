import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vite-plus/test"

import { keepingCommentsIn as asWritten, readJSON5File } from "spell/util/node/json5"
import { writeOrCheck } from "spell/element-tools/generatedFiles"
import type { SitePagesFile } from "spell/ui/docs-components/docs-components.types"
import { SiteDataBuilder } from "spell/ui/tools/SiteDataBuilder"
import { SPELL_UI_SITE_FOLDER } from "spell/ui/tools/tools.types"
import { SpellUIGuide } from "spell/ui/util/SpellUIGuide"

/**
 * The site's committed data is what `yarn site:data` would write now.
 * - The data:  `docs/__data/`'s `components.json5`, `pages.json5`
 *   - not `search.json5`:  `yarn site:check --all` writes it from the Spell pages as drawn, which a unit test can't
 * - Run it after changing a vocabulary, a family sheet's tokens or `pages.json5`.
 * - A comment written into one of them is kept by the writer (`keepingCommentsIn()`):  compared as it would write it.
 */
describe("SiteDataBuilder.build()", () => {
  it("is current (else run `yarn site:data`)", async () => {
    const builder = new SiteDataBuilder()
    const { data, pages } = await builder.build()
    expect(readFileSync(builder.pagesFile, "utf8"), "pages.json5").toBe(
      asWritten(builder.pagesFile, SiteDataBuilder.stringify(pages))
    )
    expect(
      readFileSync(builder.dataFile, "utf8") === asWritten(builder.dataFile, SiteDataBuilder.stringify(data)),
      "components.json5"
    ).toBe(true)
  }, 60_000)

  it("lists components and doc-only tags apart, each linked to its page", async () => {
    const { data } = await new SiteDataBuilder().build()
    const button = data.components.find((entry) => entry.tag === "ui-button")!
    expect(button).toMatchObject({
      folder: "ui-button",
      mainTag: "ui-button",
      main: true,
      href: "ui-button.html"
    })
    expect(data.components.find((entry) => entry.tag === "ui-or")!.href).toBe("ui-button.html#ui-or")
    expect(data.components.some((entry) => entry.tag.startsWith("ui-docs-"))).toBe(false)
    expect(data.docs.map((entry) => entry.tag)).toContain("ui-docs-api")
    expect(data.docs.every((entry) => entry.href === undefined)).toBe(true)
    expect(data.families["ui-parts"]!.mainTag).toBe("ui-header")
    expect(data.topics[0]).toEqual({ id: "basic", title: "Basic" })
  }, 60_000)

  it("links a sub-tag with a page of its own (pages.json5 `pages`) to that page", async () => {
    const { data } = await new SiteDataBuilder().build()
    const radio = data.components.find((entry) => entry.tag === "ui-radio")!
    expect(radio).toMatchObject({ folder: "ui-checkbox", main: false, page: true, href: "ui-radio.html" })
    expect(data.families["ui-checkbox"]!.pages!["ui-radio"]!.title).toBe("Radio")
    expect(data.components.find((entry) => entry.tag === "ui-or")!.page).toBe(false)
    expect(data.components.find((entry) => entry.tag === "ui-button")!.page).toBe(true)
    // every page the data names is a page of the Spell UI site (its site file's `it has a ... page at "/x"`)
    const site = readFileSync(join(SPELL_UI_SITE_FOLDER, "SpellUI.spell"), "utf8")
    const addresses = new Set(
      [...site.matchAll(/^\t+(?:- )?it has an? .+? page at "([^"]+)"/gm)].map((match) => match[1])
    )
    for (const entry of data.components.filter((tag) => tag.page))
      expect(addresses.has(SpellUIGuide.siteAddressOf(entry.href!)), entry.href).toBe(true)
  }, 60_000)

  it("resolves shared value sets, and reads a family's tokens with types", async () => {
    const { data } = await new SiteDataBuilder().build()
    const color = data.components
      .find((entry) => entry.tag === "ui-button")!
      .attributes.find((a) => a.name === "color")!
    expect(color.valueSet).toBe("hues")
    expect(color.values).toContain("red")
    const radius = data.families["ui-button"]!.tokens.find((token) => token.name === "--ui-button-radius")!
    expect(radius.type).toBe("length")
  }, 60_000)
})

describe("`yarn site:data`'s save (`writeOrCheck()`)", () => {
  it("keeps a comment written by hand into a data file, and writes the new value", () => {
    const folder = mkdtempSync(join(tmpdir(), "site-data-"))
    try {
      const file = join(folder, "pages.json5")
      const kept = readFileSync(new SiteDataBuilder().pagesFile, "utf8")
      writeFileSync(file, kept.replace("{\n", "{\n  // a note written by hand\n"))
      const pages = readJSON5File<SitePagesFile>(file)
      const button = { ...pages.families["ui-button"]!, summary: "Changed." }
      const text = SiteDataBuilder.stringify({ ...pages, families: { ...pages.families, "ui-button": button } })
      writeOrCheck([[file, text]], { command: "site:data", isCheck: false })
      expect(readFileSync(file, "utf8")).toContain("// a note written by hand")
      expect(readJSON5File<SitePagesFile>(file).families["ui-button"]!.summary).toBe("Changed.")
      // written once, current from then on
      expect(writeOrCheck([[file, text]], { command: "site:data", isCheck: true })).toEqual([])
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })
})
