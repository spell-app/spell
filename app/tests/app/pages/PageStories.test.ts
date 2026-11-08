import { describe, expect, test } from "vite-plus/test"

import { PageStories } from "spell/app/app/pages/PageStories"

/**
 * A page's stories (epic `mockup` P6):  what it must let people do, read from its own declaration and written back, in
 * either of Spell's forms.
 */
describe("PageStories", () => {
  const SPELLX = [
    '<spell-page "film page">',
    "\t<spell-stories>",
    "\t\t- [ ] see a film's opening crawl",
    "\t\t- [x] As a fan, I want to see who's in a film, so that I can find their other films",
    "\t\t\t- done when:  its people are listed, each a link",
    "\t</>",
    '\t<property "film" type="film"/>',
    "</>",
    "",
    '<spell-page "films page"/>',
    ""
  ].join("\n")

  test("reads a page's stories:  its box, its words, the lines under it", () => {
    expect(PageStories.of(SPELLX, "film page")).toEqual([
      { text: "see a film's opening crawl", done: false, details: [] },
      {
        text: "As a fan, I want to see who's in a film, so that I can find their other films",
        done: true,
        details: ["- done when:  its people are listed, each a link"]
      }
    ])
    expect(PageStories.of(SPELLX, "films page")).toEqual([])
    expect(PageStories.of(SPELLX, "planet page")).toBeUndefined()
  })

  test("writes them back as it read them", () => {
    const stories = PageStories.of(SPELLX, "film page")!
    expect(PageStories.withStories(SPELLX, "film page", stories)).toBe(SPELLX)
  })

  test("ticks one off, and takes the block out when none are left", () => {
    const [crawl, fan] = PageStories.of(SPELLX, "film page")!
    const ticked = PageStories.withStories(SPELLX, "film page", [{ ...crawl!, done: true }, fan!])
    expect(ticked).toContain("\t\t- [x] see a film's opening crawl\n")
    const none = PageStories.withStories(SPELLX, "film page", [])
    expect(none).not.toContain("spell-stories")
    expect(none).toContain('<spell-page "film page">\n\t<property "film" type="film"/>\n</>')
  })

  test("an empty story, just added:  written with no words, and read back the same", () => {
    const text = PageStories.withStories(SPELLX, "films page", [PageStories.newStory("")])
    expect(PageStories.of(text, "films page")).toEqual([{ text: "", done: false, details: [] }])
  })

  test("opens up a self-closing page to hold its first story", () => {
    const text = PageStories.withStories(SPELLX, "films page", [PageStories.newStory("see every film")])
    expect(text).toContain('<spell-page "films page">\n\t<spell-stories>\n\t\t- [ ] see every film\n\t</>\n</>\n')
    expect(PageStories.of(text, "films page")).toEqual([{ text: "see every film", done: false, details: [] }])
  })

  test("code spell:  a `<stories>` block first in the page's outline, its `:` added", () => {
    const code = ['a "films page" is a page', "", "galaxy guide is a site:", '\t- it has a films page at "/films"', ""]
    const text = PageStories.withStories(code.join("\n"), "films page", [PageStories.newStory("see every film")])
    expect(text.split("\n").slice(0, 4)).toEqual([
      'a "films page" is a page:',
      "\t<stories>",
      "\t\t- [ ] see every film",
      "\t</stories>"
    ])
    expect(PageStories.of(text, "films page")).toEqual([{ text: "see every film", done: false, details: [] }])
  })

  test("code spell:  a blank line keeps the stories apart from a `<markdown>` under them", () => {
    const code = 'a "films page" is a page:\n\t<markdown>\n\t\tEvery film.\n\t</markdown>\n'
    expect(PageStories.withStories(code, "films page", [PageStories.newStory("see every film")])).toBe(
      'a "films page" is a page:\n\t<stories>\n\t\t- [ ] see every film\n\t</stories>\n\n\t<markdown>\n\t\tEvery film.\n\t</markdown>\n'
    )
  })

  test("a page this file doesn't declare:  its stories are written where it is", () => {
    expect(() => PageStories.withStories(SPELLX, "planet page", [])).toThrow(TypeError)
  })
})
