import { describe, expect, test } from "vite-plus/test"

import { SiteEdits } from "spell/app/app/pages/SiteEdits"

/**
 * A new page, made where a running site's address had none (epic `mockup` P2):  declared beside the site, and listed
 * in it, in either of Spell's forms.
 */
describe("SiteEdits", () => {
  test("names a new page from its address's last part", () => {
    expect(SiteEdits.pageNameFor("/planets/tatooine")).toBe("tatooine page")
    expect(SiteEdits.pageNameFor("/about-us")).toBe("about us page")
    expect(SiteEdits.pageNameFor("/")).toBe("home page")
    expect(SiteEdits.pageNameFor("/new-page")).toBe("new page")
    expect(SiteEdits.pageNameFor("/about", ["about page", "about page 2"])).toBe("about page 3")
  })

  test("spellx:  declared before `<spell-site>`, listed last in it", () => {
    const text = [
      '<spell-page "films page"/>',
      "",
      '<spell-site "galaxy guide">',
      '\t<page "films page" address="/films"/>',
      "</>",
      ""
    ].join("\n")
    expect(SiteEdits.withPageAdded(text, "tatooine page", "/planets/tatooine")).toBe(
      [
        '<spell-page "films page"/>',
        "",
        '<spell-page "tatooine page"/>',
        "",
        '<spell-site "galaxy guide">',
        '\t<page "films page" address="/films"/>',
        '\t<page "tatooine page" address="/planets/tatooine"/>',
        "</>",
        ""
      ].join("\n")
    )
  })

  test("code spell:  `a ... is a page` before the site, `- it has a ...` last in it", () => {
    const text = [
      'a "films page" is a page',
      "galaxy guide is a site:",
      '\t- it has a films page at "/films"',
      "",
      "to wander:",
      "\tprint 1",
      ""
    ].join("\n")
    expect(SiteEdits.withPageAdded(text, "about page", "/about")).toBe(
      [
        'a "films page" is a page',
        'a "about page" is a page',
        "galaxy guide is a site:",
        '\t- it has a films page at "/films"',
        '\t- it has an about page at "/about"',
        "",
        "to wander:",
        "\tprint 1",
        ""
      ].join("\n")
    )
  })

  test("a file with no site says so", () => {
    expect(SiteEdits.hasSite("a card is a thing")).toBe(false)
    expect(() => SiteEdits.withPageAdded("a card is a thing", "x page", "/x")).toThrow(/declares no site/)
  })

  ////////////////
  // ## The site editor's changes (epic `mockup` P4)
  ////////////////

  /** A spellx site:  two pages declared here, one under the other, and a dialog. */
  const SPELLX = [
    '<spell-page "films page"/>',
    "",
    '<spell-page "film page">',
    '\t<property "film" type="film"/>',
    "</>",
    "",
    '<spell-site "galaxy guide">',
    '\t<page "films page" address="/films" title="Films">',
    '\t\t<page "film page" address="/films/:film" title="Film"/>',
    "\t</>",
    "\t<!-- what opens over any page -->",
    '\t<dialog "settings dialog"/>',
    "</>",
    ""
  ].join("\n")

  /** The same site, in code spell. */
  const CODE = [
    'a "films page" is a page',
    'a "film page" is a page:',
    "\t- it has a film",
    "galaxy guide is a site:",
    '\t- it has a films page at "/films", named "Films"',
    '\t\t- it has a film page at "/films/:film", named "Film"',
    "\t- it has a settings dialog",
    ""
  ].join("\n")

  test.each([
    ["spellx", SPELLX],
    ["code spell", CODE]
  ])("%s:  reads the parts, nested, with their addresses and titles", (_form, text) => {
    const parts = SiteEdits.partsIn(text)!
    expect(parts.map((part) => [part.kind, part.name, part.address, part.title])).toEqual([
      ["page", "films page", "/films", "Films"],
      ["dialog", "settings dialog", undefined, undefined]
    ])
    expect(parts[0]!.parts.map((part) => [part.name, part.address, part.depth])).toEqual([
      ["film page", "/films/:film", 1]
    ])
    expect(SiteEdits.partsIn("a card is a thing")).toBeUndefined()
  })

  test("spellx:  a page's address and title changed, a title taken out", () => {
    const changed = SiteEdits.withPartChanged(SPELLX, "film page", { address: "/movies/:film", title: "" })
    expect(changed).toContain('\t\t<page "film page" address="/movies/:film"/>')
    expect(() => SiteEdits.withPartChanged(SPELLX, "film page", { address: "/films" })).toThrow(/is at \/films/)
    expect(() => SiteEdits.withPartChanged(SPELLX, "film page", { address: "films" })).toThrow(/starts with "\/"/)
  })

  test("code spell:  a page's address and title changed", () => {
    const changed = SiteEdits.withPartChanged(CODE, "films page", { title: "Movies" })
    expect(changed).toContain('\t- it has a films page at "/films", named "Movies"\n')
  })

  test.each([
    ["spellx", SPELLX, '<spell-page "movie page">', '<page "movie page" address="/films/:film"'],
    ["code spell", CODE, 'a "movie page" is a page:', '- it has a movie page at "/films/:film"']
  ])("%s:  a page renamed, in the site and its declaration", (_form, text, declared, listed) => {
    const renamed = SiteEdits.withPartRenamed(text, "film page", "movie page")
    expect(renamed).toContain(declared)
    expect(renamed).toContain(listed)
    expect(() => SiteEdits.withPartRenamed(text, "film page", "films page")).toThrow(/has a "films page" already/)
    expect(() => SiteEdits.withPartRenamed(text, "film page", "movie")).toThrow(/ends in "page"/)
  })

  test.each([
    ["spellx", SPELLX],
    ["code spell", CODE]
  ])("%s:  a page taken out with its declaration;  one with pages under it refused", (_form, text) => {
    const removed = SiteEdits.withPartRemoved(text, "film page")
    expect(removed).not.toContain("film page")
    expect(removed).not.toContain('film"')
    expect(SiteEdits.partsIn(removed)!.map((part) => part.name)).toEqual(["films page", "settings dialog"])
    expect(() => SiteEdits.withPartRemoved(text, "films page")).toThrow(/has pages under it/)
  })

  test.each([
    ["spellx", SPELLX],
    ["code spell", CODE]
  ])("%s:  a part moved before another, at its depth;  and last", (_form, text) => {
    const moved = SiteEdits.withPartMoved(text, "settings dialog", "films page")
    expect(SiteEdits.partsIn(moved)!.map((part) => part.name)).toEqual(["settings dialog", "films page"])
    const out = SiteEdits.withPartMoved(text, "film page")
    const parts = SiteEdits.partsIn(out)!
    expect(parts.map((part) => part.name)).toEqual(["films page", "settings dialog", "film page"])
    expect(parts[0]!.parts).toEqual([])
    expect(() => SiteEdits.withPartMoved(text, "films page", "film page")).toThrow(/one of its own pages/)
  })
})
