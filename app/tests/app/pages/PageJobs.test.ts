import { describe, expect, test } from "vite-plus/test"

import { PageJobs } from "spell/app/app/pages/PageJobs"

/**
 * A page's jobs (epic `mockup` P6):  what it must let people do, read from its own declaration and written back, in
 * either of Spell's forms.
 */
describe("PageJobs", () => {
  const SPELLX = [
    '<spell-page "film page">',
    "\t<spell-jobs>",
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

  test("reads a page's jobs:  its box, its words, the lines under it", () => {
    expect(PageJobs.of(SPELLX, "film page")).toEqual([
      { text: "see a film's opening crawl", done: false, details: [] },
      {
        text: "As a fan, I want to see who's in a film, so that I can find their other films",
        done: true,
        details: ["- done when:  its people are listed, each a link"]
      }
    ])
    expect(PageJobs.of(SPELLX, "films page")).toEqual([])
    expect(PageJobs.of(SPELLX, "planet page")).toBeUndefined()
  })

  test("writes them back as it read them", () => {
    const jobs = PageJobs.of(SPELLX, "film page")!
    expect(PageJobs.withJobs(SPELLX, "film page", jobs)).toBe(SPELLX)
  })

  test("ticks one off, and takes the block out when none are left", () => {
    const [crawl, fan] = PageJobs.of(SPELLX, "film page")!
    const ticked = PageJobs.withJobs(SPELLX, "film page", [{ ...crawl!, done: true }, fan!])
    expect(ticked).toContain("\t\t- [x] see a film's opening crawl\n")
    const none = PageJobs.withJobs(SPELLX, "film page", [])
    expect(none).not.toContain("spell-jobs")
    expect(none).toContain('<spell-page "film page">\n\t<property "film" type="film"/>\n</>')
  })

  test("opens up a self-closing page to hold its first job", () => {
    const text = PageJobs.withJobs(SPELLX, "films page", [PageJobs.newJob("see every film")])
    expect(text).toContain('<spell-page "films page">\n\t<spell-jobs>\n\t\t- [ ] see every film\n\t</>\n</>\n')
    expect(PageJobs.of(text, "films page")).toEqual([{ text: "see every film", done: false, details: [] }])
  })

  test("code spell:  a `<jobs>` block first in the page's outline, its `:` added", () => {
    const code = ['a "films page" is a page', "", "galaxy guide is a site:", '\t- it has a films page at "/films"', ""]
    const text = PageJobs.withJobs(code.join("\n"), "films page", [PageJobs.newJob("see every film")])
    expect(text.split("\n").slice(0, 4)).toEqual([
      'a "films page" is a page:',
      "\t<jobs>",
      "\t\t- [ ] see every film",
      "\t</jobs>"
    ])
    expect(PageJobs.of(text, "films page")).toEqual([{ text: "see every film", done: false, details: [] }])
  })

  test("code spell:  a blank line keeps the jobs apart from a `<markdown>` under them", () => {
    const code = 'a "films page" is a page:\n\t<markdown>\n\t\tEvery film.\n\t</markdown>\n'
    expect(PageJobs.withJobs(code, "films page", [PageJobs.newJob("see every film")])).toBe(
      'a "films page" is a page:\n\t<jobs>\n\t\t- [ ] see every film\n\t</jobs>\n\n\t<markdown>\n\t\tEvery film.\n\t</markdown>\n'
    )
  })

  test("a page this file doesn't declare:  its jobs are written where it is", () => {
    expect(() => PageJobs.withJobs(SPELLX, "planet page", [])).toThrow(TypeError)
  })
})
