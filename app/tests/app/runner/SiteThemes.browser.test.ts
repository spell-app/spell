import { describe, expect, test } from "vite-plus/test"

import { UI } from "spell/ui"
import { SiteThemes } from "spell/app/app/runner/SiteThemes"
import { ViewerSiteHost } from "spell/app/app/runner/ViewerSiteHost"

/**
 * A running site's theme, as its host gives it:  one of Spell UI's, else the project's
 * own, `<name>.theme.json5` beside its Spell.
 * - The project:  `themedProject/`, beside this file, as the test server serves it.
 */

/** The fixture project's folder, as the test server serves it. */
const PROJECT = "/tests/app/runner/themedProject"

describe("SiteThemes.tokens()", () => {
  test("one of Spell UI's themes:  its tokens, never a look in the project", async () => {
    const tokens = await SiteThemes.tokens("matrix", "/nowhere")
    expect(tokens).toContain("--matrix-accent")
  })

  test("the project's own theme:  what it extends (Matrix), then its own values, which win", async () => {
    const tokens = await SiteThemes.tokens("harbor", PROJECT)
    expect(UI.themes.has("harbor")).toBe(true)
    expect(UI.themes.isBuiltIn("harbor")).toBe(false)
    // Matrix's, kept
    expect(tokens).toContain("--matrix-page")
    // its own:  a token of its own, and Matrix's accent changed
    expect(tokens).toContain("--harbor-rail: #0a6f8f")
    // Matrix's accent is still declared, first:  the project's comes after it, so it wins
    const ours = tokens.lastIndexOf("--matrix-accent: light-dark(#0a6f8f, #7fd6f0)")
    expect(ours).toBeGreaterThan(tokens.lastIndexOf("--matrix-accent: light-dark(#0b7552"))
  })

  test("a project theme extending another of the project's:  both read, the later winning", async () => {
    const tokens = await SiteThemes.tokens("harbor-night", PROJECT)
    expect(tokens).toContain("--harbor-rail: #7fd6f0")
    expect(tokens).toMatch(/--matrix-accent: light-dark\(#0a6f8f, #7fd6f0\)/)
  })

  test("a name the theme tree doesn't have is refused, naming the file", async () => {
    await expect(SiteThemes.tokens("mistyped", PROJECT)).rejects.toThrow(/mistyped\.theme\.json5.*radii\.medium/)
  })

  test("a theme in neither place says where it looked", async () => {
    const missing = SiteThemes.tokens("no-such-theme", PROJECT)
    await expect(missing).rejects.toThrow(/Spell UI has none of that name/)
    await expect(missing).rejects.toThrow(`no \`${PROJECT}/no-such-theme.theme.json5\``)
    await expect(SiteThemes.tokens("no-such-theme", undefined)).rejects.toThrow(/no project folder to look in/)
  })
})

describe("SiteThemes.readIn()", () => {
  test("the project themes read from a folder, each with the theme of Spell UI's it builds on, through the project's", async () => {
    await SiteThemes.tokens("harbor-night", PROJECT)
    const read = SiteThemes.readIn(PROJECT)
    expect(read).toContainEqual({ name: "harbor", base: "matrix" })
    expect(read).toContainEqual({ name: "harbor-night", base: "matrix" })
    expect(SiteThemes.readIn("/nowhere")).toEqual([])
  })
})

describe("ViewerSiteHost", () => {
  test("the site keeps its address:  `/` to start, then where it last went;  its theme as Run gives it", async () => {
    const host = new ViewerSiteHost()
    expect(host.address()).toBe("/")
    host.go("/films/4")
    expect(host.address()).toBe("/films/4")
    expect(await host.themeTokens("harbor", PROJECT)).toContain("--harbor-rail")
  })
})
