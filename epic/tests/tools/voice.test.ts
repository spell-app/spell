/**
 * Tests of `epic pages voice` (`voice.ts`):  reading and writing a page's voice stamp, counting its words, and which
 * pages count as guides.
 */
import { describe, expect, test } from "vite-plus/test"

import { PageVoice } from "spell/epic/tools/voice"

/** A guide's head, as the durable template writes it. */
const PAGE = [
  "<!doctype html>",
  '<html lang="en">',
  "  <head>",
  '    <meta charset="utf-8" />',
  '    <meta name="description" content="How the page server works" />',
  "    <title>Page server</title>",
  "  </head>",
  "  <body><p>The page server serves <code>guides/</code>.</p></body>",
  "</html>"
].join("\n")

describe("PageVoice", () => {
  test("an unstamped page has no stamp;  stamping puts it after the description", () => {
    expect(PageVoice.stampOf(PAGE)).toBeUndefined()
    const stamped = PageVoice.withStamp(PAGE, { voice: "readme", date: "2026-10-22" })
    expect(stamped).toContain(
      '<meta name="description" content="How the page server works" />\n    <meta name="spell-voice" content="readme 2026-10-22" />'
    )
    expect(PageVoice.stampOf(stamped)).toEqual({ voice: "readme", date: "2026-10-22" })
  })

  test("a description holding a tag (`<epic-*>`) gets the stamp after it, not inside it", () => {
    const tagged = PAGE.replace("How the page server works", "The epic command on <epic-*>\n      markup")
    const stamped = PageVoice.withStamp(tagged, { voice: "readme", date: "2026-10-22" })
    expect(stamped).toContain('markup" />\n    <meta name="spell-voice" content="readme 2026-10-22" />')
  })

  test("a new stamp replaces the old one, never a second", () => {
    const once = PageVoice.withStamp(PAGE, { voice: "novice", date: "2026-10-01" })
    const twice = PageVoice.withStamp(once, { voice: "readme", date: "2026-10-22" })
    expect(twice.match(/spell-voice/g)).toHaveLength(1)
    expect(PageVoice.stampOf(twice)).toEqual({ voice: "readme", date: "2026-10-22" })
  })

  test("a page with no description gets it before </head>;  one with no head is refused", () => {
    const bare = PAGE.replace(/ *<meta name="description"[^\n]*\n/, "")
    expect(PageVoice.withStamp(bare, { voice: "readme", date: "2026-10-22" })).toMatch(
      /<meta name="spell-voice" content="readme 2026-10-22" \/>\n {2}<\/head>/
    )
    expect(() => PageVoice.withStamp("<p>no head</p>", { voice: "readme", date: "2026-10-22" })).toThrow(TypeError)
  })

  test("words are the text's:  no head, markup, scripts or styles", () => {
    expect(PageVoice.wordsIn(PAGE)).toBe(5)
    expect(PageVoice.wordsIn("<script>let a = 1</script><style>p { x: y }</style><p>two words</p>")).toBe(2)
  })

  test("the guides' list page and the changelog aren't gone over", () => {
    expect(PageVoice.isGuide("/x/guides/server.html")).toBe(true)
    expect(PageVoice.isGuide("/x/guides/changelog.html")).toBe(false)
  })
})
