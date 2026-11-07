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
})
