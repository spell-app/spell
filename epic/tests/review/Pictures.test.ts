/**
 * Tests of `Pictures`' words for the pictures in a box (epic `epic-engine` I267, P75):  how they're written, labelled,
 * read back, taken out and renumbered while the box is typed (P75's choice B).
 * - `intoWords()` itself, on a real field:  `<epic-thread>`'s and `<epic-kickoff>`'s browser tests draw what it writes
 */
import { describe, expect, test } from "vite-plus/test"

import { Pictures } from "spell/epic/review/Pictures"

describe("Pictures:  a picture in a box's words", () => {
  test("is written as markdown's picture, its label the text, its path the page server's answer", () => {
    expect(Pictures.wordsFor("/guides/pictures/x-20261114-0102.png", "IMG2")).toBe(
      "![IMG2](/guides/pictures/x-20261114-0102.png)"
    )
    // no label:  the old words, from before P75
    expect(Pictures.wordsFor("/g/p.png")).toBe("![picture](/g/p.png)")
  })

  test("reads back as pieces:  text, then the picture's path and label, then text", () => {
    expect(Pictures.piecesOf("Look:\n![IMG1](/g/p.png)\nsee?")).toEqual([
      "Look:\n",
      { picture: "/g/p.png", label: "IMG1" },
      "\nsee?"
    ])
  })

  test("words with no picture are one piece;  a link isn't a picture", () => {
    expect(Pictures.piecesOf("just [a link](/x.html)")).toEqual(["just [a link](/x.html)"])
  })

  test("two pictures side by side;  an old one is counted in its place", () => {
    expect(Pictures.piecesOf("![picture](/a.png)![IMG2](/b.png)")).toEqual([
      { picture: "/a.png", label: "IMG1" },
      { picture: "/b.png", label: "IMG2" }
    ])
  })
})

describe("Pictures:  labels", () => {
  const words = "Here:\n![IMG1](tests/a.png)\n![IMG2](tests/b.png)\n![IMG3](tests/c.png)\nIMG3 is wrong, IMG1 is right"

  test("the pictures in order, each with its label, number and path", () => {
    expect(Pictures.picturesOf(words)).toEqual([
      { label: "IMG1", number: 1, path: "tests/a.png" },
      { label: "IMG2", number: 2, path: "tests/b.png" },
      { label: "IMG3", number: 3, path: "tests/c.png" }
    ])
  })

  test("the next label is one past the highest:  a gap is never filled", () => {
    expect(Pictures.nextLabel("")).toBe("IMG1")
    expect(Pictures.nextLabel(words)).toBe("IMG4")
    expect(Pictures.nextLabel("![IMG1](a.png) ![IMG5](b.png)")).toBe("IMG6")
    expect(Pictures.nextLabel("![picture](a.png)")).toBe("IMG2")
  })

  test("taken out while typing:  its line goes, and the later labels move down, in the words that name them too", () => {
    expect(Pictures.without(words, "IMG2", { renumber: true })).toBe(
      "Here:\n![IMG1](tests/a.png)\n![IMG2](tests/c.png)\nIMG2 is wrong, IMG1 is right"
    )
  })

  test("taken out once sent:  a gap stays, and what was said about IMG3 stays true", () => {
    expect(Pictures.without(words, "IMG2")).toBe(
      "Here:\n![IMG1](tests/a.png)\n![IMG3](tests/c.png)\nIMG3 is wrong, IMG1 is right"
    )
  })

  test("taken out from inside a line, the line's words stay;  a label the words don't have changes nothing", () => {
    expect(Pictures.without("see ![IMG1](a.png) here", "IMG1")).toBe("see  here")
    expect(Pictures.without("![IMG1](a.png)", "IMG9", { renumber: true })).toBe("![IMG1](a.png)")
    expect(Pictures.without("words\n![IMG1](a.png)", "IMG1")).toBe("words")
  })

  test("a whole link deleted by hand closes its gap;  a link half deleted renumbers nothing", () => {
    const before = "![IMG1](a.png)\n![IMG2](b.png)\n![IMG3](c.png)\nIMG3 again"
    expect(Pictures.closeGap(before, "![IMG1](a.png)\n\n![IMG3](c.png)\nIMG3 again")).toBe(
      "![IMG1](a.png)\n\n![IMG2](c.png)\nIMG2 again"
    )
    const half = "![IMG1](a.png)\n![IMG2](b.pn\n![IMG3](c.png)\nIMG3 again"
    expect(Pictures.closeGap(before, half)).toBe(half)
    // two at once
    expect(Pictures.closeGap(before, "![IMG3](c.png)\nIMG3 again")).toBe("![IMG1](c.png)\nIMG1 again")
  })

  test("old pictures never renumber:  their label is their place", () => {
    expect(Pictures.closeGap("![picture](a.png)\n![picture](b.png)", "![picture](b.png)")).toBe("![picture](b.png)")
  })

  test("IMG10 shifts to IMG9 whole, and IMG1 isn't read inside IMG10", () => {
    expect(Pictures.shiftedAfter("IMG10 and IMG1", 2)).toBe("IMG9 and IMG1")
  })
})
