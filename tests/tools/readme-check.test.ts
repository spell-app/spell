import { join } from "node:path"

import { describe, expect, test } from "vite-plus/test"

import { ReadmeCheck, anchorsOf, slugFor } from "../../tools/readme-check.ts"

/** the fixture pages:  `fixtures/README.md` breaks every rule once, `README-other.md` is what it links */
const FIXTURES = join(import.meta.dirname, "fixtures")

describe("ReadmeCheck", () => {
  test("finds every rule's finding on the fixture page, and nothing else", () => {
    const check = new ReadmeCheck(FIXTURES)
    const findings = check.checkPage(join(FIXTURES, "README.md"))
    expect(findings.map(({ line, rule }) => `${line} ${rule}`)).toEqual([
      "6 link",
      "6 anchor",
      "7 content-folder",
      "18 unstyled",
      "18 caption",
      "26 summary",
      "38 until",
      "42 word",
      "42 word",
      "42 owner",
      "43 example",
      "43 deleted-readme"
    ])
  })

  test("lists a folder's README.md and README-*.md as its pages", () => {
    const check = new ReadmeCheck(FIXTURES)
    expect(check.pages().map((page) => page.slice(FIXTURES.length + 1))).toEqual(["README-other.md", "README.md"])
  })
})

describe("slugFor()", () => {
  test("makes GitHub's heading slugs", () => {
    expect(slugFor("🌱 Coming:  npm")).toBe("-coming--npm")
    expect(slugFor("`<ui-root>` and packs")).toBe("ui-root-and-packs")
    expect(slugFor("Setup from zero")).toBe("setup-from-zero")
    expect(slugFor("[The kit](README.md)'s folders")).toBe("the-kits-folders")
  })

  test("numbers a repeated heading", () => {
    expect([...anchorsOf("## See also\n\n## See also\n")]).toEqual(["see-also", "see-also-1"])
  })
})
