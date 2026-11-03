import { describe, expect, test } from "vite-plus/test"

import { MarkdownEngine } from "spell/ui/components/ui-markdown/MarkdownEngine"

/** Render options:  no line breaks, no offset, unsanitized. */
const PLAIN = { breaks: false, headingOffset: 0, sanitized: false }

describe("MarkdownEngine.render()", () => {
  test.each([
    ["Getting started!", "getting-started"],
    ["API:  `load()` & more", "api--load--more"],
    ["Ünïcode wörds", "ünïcode-wörds"]
  ])("gives heading %s GitHub's id, %s", (text, id) => {
    expect(MarkdownEngine.instance.render(`# ${text}`, PLAIN).headings[0]!.id).toBe(id)
  })

  test("numbers a repeated heading's id, as GitHub does", () => {
    const { headings } = MarkdownEngine.instance.render("# Setup\n\n## Setup\n\n### Setup", PLAIN)
    expect(headings.map(({ id }) => id)).toEqual(["setup", "setup-1", "setup-2"])
  })

  test("shifts heading levels by `headingOffset`, NEVER past <h6>", () => {
    const { html, headings } = MarkdownEngine.instance.render("# One\n\n###### Six", { ...PLAIN, headingOffset: 2 })
    expect(headings.map(({ level }) => level)).toEqual([3, 6])
    expect(html).toContain('<h6 id="six">Six</h6>')
  })

  test("`places`:  marks each editable piece with its place's number, and returns the places", () => {
    const text = "# Title\n\nwords\n\n- [ ] item\n\n| a |\n| - |\n| 1 |"
    const { html, places } = MarkdownEngine.instance.render(text, { ...PLAIN, places: true })
    expect(places!.map((place) => text.slice(place.start, place.end))).toEqual(["Title", "words", "item", "a", "1"])
    expect(html).toContain('<h1 data-ui-place="0" id="title">Title</h1>')
    expect(html).toContain('<p data-ui-place="1">words</p>')
    expect(html).toMatch(/<li data-ui-place="2">/)
    expect(html).toContain('<th data-ui-place="3">a</th>')
    expect(html).toContain('<td data-ui-place="4">1</td>')
    expect(MarkdownEngine.instance.render(text, PLAIN).html).not.toContain("data-ui-place")
  })
})
