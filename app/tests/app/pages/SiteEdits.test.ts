import { describe, expect, test } from "vite-plus/test"

import { SiteEdits } from "spell/app/app/pages/SiteEdits"

/**
 * A new page, made where a running site's address had none (epic `mockup` P2):  declared beside the site, and listed
 * in it, in either of Spell's forms.
 */
describe("SiteEdits", () => {
  test("a part's thumbnail is read, and kept when its line is rewritten;  a line without one gets none (P16)", () => {
    const spellx =
      '<spell-site "s">\n\t<page "a page" address="/a" thumbnail="x.jpg"/>\n\t<page "b page" address="/b"/>\n</>\n'
    expect(SiteEdits.partsIn(spellx)![0]).toMatchObject({ thumbnail: "x.jpg" })
    const moved = SiteEdits.withPartPlaced(spellx, "a page", { row: 1, column: 2 })
    expect(moved).toContain('thumbnail="x.jpg"')
    expect(SiteEdits.withPartPlaced(spellx, "b page", { row: 1, column: 2 })).toContain(
      '<page "b page" address="/b" row="1" column="2"/>'
    )
    const code = 'a "s" is a site:\n\t- it has a "a page" at "/a", thumbnail "x.jpg"\n'
    expect(SiteEdits.partsIn(code)![0]).toMatchObject({ thumbnail: "x.jpg" })
    expect(SiteEdits.withPartPlaced(code, "a page", { row: 1, column: 2 })).toContain(', thumbnail "x.jpg"')
  })

  test("a page's or view's own thumbnail is found in the file declaring it (P16)", () => {
    expect(SiteEdits.thumbnailOf('<spell-page "a page" thumbnail="x.jpg"/>\n', "a page")).toBe("x.jpg")
    expect(SiteEdits.thumbnailOf('<spell-view "b dialog" thumbnail="y.jpg">\n</>\n', "b dialog")).toBe("y.jpg")
    expect(
      SiteEdits.thumbnailOf('<spell-page "button usage" notebook thumbnail="z.jpg">\n</>\n', "button usage page")
    ).toBe("z.jpg")
    expect(SiteEdits.thumbnailOf('a "c page" is a page where:\n\t- its thumbnail is "w.jpg"\n', "c page")).toBe("w.jpg")
    expect(
      SiteEdits.thumbnailOf('<spell-page "a page"/>\n<spell-page "other" thumbnail="x.jpg"/>\n', "a page")
    ).toBeUndefined()
  })

  test("a part's tags and tab are read, and kept when its line is rewritten (P15)", () => {
    const spellx = '<spell-site "s">\n\t<page "a page" address="/a" tab="Usage" tags="Forms, Inputs"/>\n</>\n'
    expect(SiteEdits.partsIn(spellx)![0]).toMatchObject({ tab: "Usage", tags: "Forms, Inputs" })
    expect(SiteEdits.withPartPlaced(spellx, "a page", { row: 1, column: 2 })).toContain('tags="Forms, Inputs"')
    const code = 's is a site:\n\t- it has a page at "/a", tab "Usage", tagged "Forms, Inputs", old\n'
    expect(SiteEdits.partsIn(code)![0]).toMatchObject({ tab: "Usage", tags: "Forms, Inputs", state: "old" })
    expect(SiteEdits.withPartPlaced(code, "page", { row: 1, column: 2 })).toContain(
      '- it has a page at "/a", tab "Usage", tagged "Forms, Inputs", old, in row 1 column 2'
    )
  })

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
  ])("%s:  a page taken out with its declaration;  one with pages under it, with them", (_form, text) => {
    const removed = SiteEdits.withPartRemoved(text, "film page")
    expect(removed).not.toContain("film page")
    expect(removed).not.toContain('film"')
    expect(SiteEdits.partsIn(removed)!.map((part) => part.name)).toEqual(["films page", "settings dialog"])
    const all = SiteEdits.withPartRemoved(text, "films page")
    expect(SiteEdits.partsIn(all)!.map((part) => part.name)).toEqual(["settings dialog"])
    expect(all).not.toMatch(/films? page/)
  })

  test.each([
    ["spellx", SPELLX],
    ["code spell", CODE]
  ])("%s:  a part moved before or after another, at its depth", (_form, text) => {
    const moved = SiteEdits.withPartMoved(text, "settings dialog", { where: "before", part: "films page" })
    expect(SiteEdits.partsIn(moved)!.map((part) => part.name)).toEqual(["settings dialog", "films page"])
    const out = SiteEdits.withPartMoved(text, "film page", { where: "after", part: "settings dialog" })
    const parts = SiteEdits.partsIn(out)!
    expect(parts.map((part) => part.name)).toEqual(["films page", "settings dialog", "film page"])
    expect(parts[0]!.parts).toEqual([])
    expect(() => SiteEdits.withPartMoved(text, "films page", { where: "before", part: "film page" })).toThrow(
      /one of its own pages/
    )
  })

  test.each([
    ["spellx", SPELLX],
    ["code spell", CODE]
  ])("%s:  after a page goes below its own pages too", (_form, text) => {
    const moved = SiteEdits.withPartMoved(text, "settings dialog", { where: "before", part: "films page" })
    const back = SiteEdits.withPartMoved(moved, "settings dialog", { where: "after", part: "films page" })
    expect(SiteEdits.partsIn(back)!.map((part) => part.name)).toEqual(["films page", "settings dialog"])
    expect(SiteEdits.partNamed(back, "films page").parts.map((part) => part.name)).toEqual(["film page"])
    expect(SiteEdits.partNamed(back, "film page").span.end).toBeLessThanOrEqual(
      SiteEdits.partNamed(back, "settings dialog").line.start
    )
  })

  test.each([
    ["spellx", SPELLX],
    ["code spell", CODE]
  ])("%s:  a page moved into another, as its first page, keeping its address, and back out", (_form, text) => {
    const added = SiteEdits.withPageAdded(text, "about page", "/about")
    const inside = SiteEdits.withPartMoved(added, "about page", { where: "into", part: "films page" })
    const films = SiteEdits.partNamed(inside, "films page")
    expect(films.parts.map((part) => part.name)).toEqual(["about page", "film page"])
    expect(films.parts[0]!.address).toBe("/about")
    expect(films.parts[0]!.indent).toBe("\t\t")
    const out = SiteEdits.withPartMoved(inside, "about page", { where: "after", part: "settings dialog" })
    expect(out).toBe(added)
  })

  test.each([
    ["spellx", SPELLX],
    ["code spell", CODE]
  ])("%s:  a page moved into one with no pages yet, and the one it left", (_form, text) => {
    const added = SiteEdits.withPageAdded(text, "about page", "/about")
    const moved = SiteEdits.withPartMoved(added, "films page", { where: "into", part: "about page" })
    const about = SiteEdits.partNamed(moved, "about page")
    expect(about.parts.map((part) => part.name)).toEqual(["films page"])
    expect(about.parts[0]!.parts.map((part) => part.name)).toEqual(["film page"])
    expect(about.parts[0]!.parts[0]!.indent).toBe("\t\t\t")
    const left = SiteEdits.withPartMoved(added, "film page", { where: "into", part: "about page" })
    expect(SiteEdits.partNamed(left, "films page").parts).toEqual([])
    expect(SiteEdits.partNamed(left, "about page").parts.map((part) => part.name)).toEqual(["film page"])
  })

  test("spellx:  a page that closes itself opens to hold one;  one left with none closes itself again", () => {
    const added = SiteEdits.withPageAdded(SPELLX, "about page", "/about")
    const left = SiteEdits.withPartMoved(added, "film page", { where: "into", part: "about page" })
    expect(left).toContain(
      [
        '\t<page "about page" address="/about">',
        '\t\t<page "film page" address="/films/:film" title="Film"/>',
        "\t</>"
      ].join("\n")
    )
    expect(left).toContain('\t<page "films page" address="/films" title="Films"/>\n')
  })

  test.each([
    ["spellx", SPELLX],
    ["code spell", CODE]
  ])("%s:  what can't go inside what", (_form, text) => {
    const into = (name: string, part: string) => SiteEdits.withPartMoved(text, name, { where: "into", part })
    expect(() => into("films page", "films page")).toThrow(/inside itself/)
    expect(() => into("films page", "film page")).toThrow(/one of its own pages/)
    expect(() => into("film page", "settings dialog")).toThrow(/only a page with an address/)
  })

  test("code spell:  a file ending without a line break", () => {
    const text = CODE.trimEnd()
    const moved = SiteEdits.withPartMoved(text, "settings dialog", { where: "before", part: "films page" })
    expect(SiteEdits.partsIn(moved)!.map((part) => part.name)).toEqual(["settings dialog", "films page"])
    const after = SiteEdits.withPartMoved(moved, "settings dialog", { where: "after", part: "films page" })
    expect(SiteEdits.partsIn(after)!.map((part) => part.name)).toEqual(["films page", "settings dialog"])
  })
})
