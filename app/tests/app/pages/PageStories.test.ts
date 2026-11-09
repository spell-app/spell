import { describe, expect, test } from "vite-plus/test"

import { PageStories } from "spell/app/app/pages/PageStories"

/**
 * A page's stories (epic `mockup` P6, P17):  what it must let people do, `<story>` tags in its own declaration,
 * read and written back in either of Spell's forms.
 */
describe("PageStories", () => {
  const SPELLX = [
    '<spell-page "film page">',
    "\t<stories>",
    '\t\t<story "S1">see a film\'s opening crawl</story>',
    '\t\t<story "S2" done>',
    "\t\t\tAs a fan, I want to see who's in a film, so that I can find their other films",
    "",
    "",
    "\t\t\tDone when its people are listed, each a link",
    "\t\t</story>",
    "\t</stories>",
    '\t<property "film" type="film"/>',
    "</>",
    "",
    '<spell-page "films page"/>',
    ""
  ].join("\n")

  const FIRST = { id: "S1", text: "see a film's opening crawl", done: false }
  const SECOND = {
    id: "S2",
    text: "As a fan, I want to see who's in a film, so that I can find their other films\n\n\nDone when its people are listed, each a link",
    done: true
  }

  test("reads a page's stories:  its number, whether it's done, its one piece of text", () => {
    expect(PageStories.of(SPELLX, "film page")).toEqual([FIRST, SECOND])
  })

  test("no stories yet;  no such page here", () => {
    expect(PageStories.of(SPELLX, "films page")).toEqual([])
    expect(PageStories.of(SPELLX, "planet page")).toBeUndefined()
  })

  test("writes them back as it read them", () => {
    expect(PageStories.withStories(SPELLX, "film page", [FIRST, SECOND])).toBe(SPELLX)
  })

  test("ticks one off, and takes the block out when none are left", () => {
    const ticked = PageStories.withStories(SPELLX, "film page", [{ ...FIRST, done: true }, SECOND])
    expect(ticked).toContain('<story "S1" done>')
    expect(PageStories.withStories(SPELLX, "film page", [])).not.toContain("<stories>")
  })

  test("a story just added is numbered after the highest, and keeps its number as stories move", () => {
    const text = PageStories.withStories(SPELLX, "film page", [SECOND, PageStories.newStory(""), FIRST])
    expect(PageStories.of(text, "film page")).toEqual([SECOND, { id: "S3", text: "", done: false }, FIRST])
  })

  test("what would close its tag is kept safe, and comes back as typed", () => {
    const story = { id: "S1", text: "a </story> and a </> in it", done: false }
    const text = PageStories.withStories(SPELLX, "films page", [story])
    expect(PageStories.of(text, "films page")).toEqual([story])
  })

  test("opens up a self-closing page to hold its first story", () => {
    const text = PageStories.withStories(SPELLX, "films page", [PageStories.newStory("see every film")])
    expect(text).toContain(
      '<spell-page "films page">\n\t<stories>\n\t\t<story "S1">see every film</story>\n\t</stories>\n</>\n'
    )
    expect(PageStories.of(text, "films page")).toEqual([{ id: "S1", text: "see every film", done: false }])
  })

  test("Spanish:  its own tags, in a block that's new or already there", () => {
    const es = '<encanto-página "películas"/>\n'
    const text = PageStories.withStories(es, "películas", [{ text: "verlas", done: true }], "es")
    expect(text).toContain('\t<encanto-historias>\n\t\t<historia "H1" hecha>verlas</historia>\n\t</>\n')
    expect(PageStories.of(text, "películas")).toEqual([{ id: "H1", text: "verlas", done: true }])
  })

  test("code spell:  a `<stories>` block first in the page's outline, its `:` added", () => {
    const code = ['a "films page" is a page', "", "galaxy guide is a site:", '\t- it has a films page at "/films"', ""]
    const text = PageStories.withStories(code.join("\n"), "films page", [PageStories.newStory("see every film")])
    expect(text.split("\n").slice(0, 4)).toEqual([
      'a "films page" is a page:',
      "\t<stories>",
      '\t\t<story "S1">see every film</story>',
      "\t</stories>"
    ])
    expect(PageStories.of(text, "films page")).toEqual([{ id: "S1", text: "see every film", done: false }])
  })

  test("code spell:  a blank line keeps the stories apart from a `<markdown>` under them", () => {
    const code = 'a "films page" is a page:\n\t<markdown>\n\t\tEvery film.\n\t</markdown>\n'
    expect(PageStories.withStories(code, "films page", [PageStories.newStory("see every film")])).toBe(
      'a "films page" is a page:\n\t<stories>\n\t\t<story "S1">see every film</story>\n\t</stories>\n\n\t<markdown>\n\t\tEvery film.\n\t</markdown>\n'
    )
  })

  test("a page this file doesn't declare:  its stories are written where it is", () => {
    expect(() => PageStories.withStories(SPELLX, "planet page", [])).toThrow(TypeError)
  })
})
