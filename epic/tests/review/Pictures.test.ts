/**
 * Tests of `Pictures`' words for a picture in a comment (epic `epic-engine` I267):  how it's written, and read back.
 * - `intoWords()` itself, on a real field:  `<epic-thread>`'s browser test draws what it writes
 */
import { describe, expect, test } from "vite-plus/test"

import { Pictures } from "spell/epic/review/Pictures"

describe("Pictures:  a picture in a comment's words", () => {
  test("is written as markdown's picture, its path the page server's answer", () => {
    expect(Pictures.wordsFor("/guides/pictures/x-20261114-0102.png")).toBe(
      "![picture](/guides/pictures/x-20261114-0102.png)"
    )
  })

  test("reads back as pieces:  text, then the picture's path, then text", () => {
    expect(Pictures.piecesOf("Look:\n![picture](/g/p.png)\nsee?")).toEqual([
      "Look:\n",
      { picture: "/g/p.png" },
      "\nsee?"
    ])
  })

  test("words with no picture are one piece;  a link isn't a picture", () => {
    expect(Pictures.piecesOf("just [a link](/x.html)")).toEqual(["just [a link](/x.html)"])
  })

  test("two pictures side by side", () => {
    expect(Pictures.piecesOf("![picture](/a.png)![picture](/b.png)")).toEqual([
      { picture: "/a.png" },
      { picture: "/b.png" }
    ])
  })
})
