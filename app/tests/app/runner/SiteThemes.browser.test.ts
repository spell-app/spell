import { describe, expect, test } from "vite-plus/test"

import { UI } from "spell/ui"
import { SiteThemes } from "spell/app/app/runner/SiteThemes"
import { ViewerSiteHost } from "spell/app/app/runner/ViewerSiteHost"

/**
 * A running site's theme, as its host gives it:  the project's own, `<name>.theme.json5` beside its Spell, else
 * one of Spell UI's.
 * - The projects:  `themedProject/` and `shadowingProject/`, beside this file, as the test server serves them.
 */

/** The fixture project's folder, as the test server serves it. */
const PROJECT = "/tests/app/runner/themedProject"

/** A fixture project with its own `matrix.theme.json5`, named like Spell UI's Matrix. */
const SHADOWING = "/tests/app/runner/shadowingProject"

describe("SiteThemes.tokens()", () => {
  test("a project with no theme of that name:  Spell UI's", async () => {
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

  test("the project's own theme named like one of Spell UI's:  the project's wins, for its site alone", async () => {
    const tokens = await SiteThemes.tokens("matrix", SHADOWING)
    // Spell UI's Matrix under it, the project's own values after, so they win
    const ours = tokens.lastIndexOf("--matrix-accent: #c0392b")
    expect(ours).toBeGreaterThan(tokens.lastIndexOf("--matrix-accent: light-dark(#0b7552"))
    // defined under a name of its own:  the registry's `matrix`, which the editor wears, is still Spell UI's
    expect(UI.themes.has("matrix@project")).toBe(true)
    expect(await UI.themes.load("matrix")).not.toContain("#c0392b")
  })

  test("a project theme extending a name the project has:  the project's, not Spell UI's", async () => {
    const tokens = await SiteThemes.tokens("lighthouse", SHADOWING)
    expect(tokens).toContain("--lighthouse-rail: #123456")
    expect(tokens).toContain("--matrix-accent: #c0392b")
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

  test("one named like Spell UI's:  its name in `UI.themes`, and its file's", async () => {
    await SiteThemes.tokens("lighthouse", SHADOWING)
    const read = SiteThemes.readIn(SHADOWING)
    expect(read).toContainEqual({ name: "matrix@project", file: "matrix", base: "matrix" })
    expect(read).toContainEqual({ name: "lighthouse", base: "matrix" })
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
