import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, test } from "vite-plus/test"

import { ReadmeCheck, anchorsOf, slugFor, type Rule } from "../../tools/readme-check.ts"

/** the fixture pages:  `fixtures/README.md` breaks every rule once, `README-other.md` is what it links */
const FIXTURES = join(import.meta.dirname, "fixtures")

/**
 * The `line rule` of each finding of `rules` on `lines`, checked as if they were the fixtures' `README.md`.
 * - Only those rules:  a line that links to a page the fixtures haven't got would add a `link` finding.
 */
function findingsOf(lines: string[], ...rules: Rule[]): string[] {
  const findings = new ReadmeCheck(FIXTURES).checkPage(join(FIXTURES, "README.md"), lines.join("\n"))
  return findings.filter(({ rule }) => rules.includes(rule)).map(({ line, rule }) => `${line} ${rule}`)
}

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
      "31 word",
      "38 until",
      "38 word",
      "42 word",
      "42 word",
      "42 owner",
      "43 example",
      "43 deleted-readme",
      "52 siblings",
      "54 brand",
      "55 capital"
    ])
  })

  test("words each finding of the Spell-name rules for whoever fixes the page", () => {
    const lines = ["The brand.", "Written in spell.", "- Also beside it:  [the other page](README-other.md)"]
    const findings = new ReadmeCheck(FIXTURES).checkPage(join(FIXTURES, "README.md"), lines.join("\n"))
    expect(findings.map(({ line, rule, message }) => `${line} ${rule}  ${message}`)).toEqual([
      "1 brand  spell-brand is internal:  leave it out of the docs",
      '2 capital  write "Spell" in prose;  lowercase only in code',
      "3 siblings  a See also lists curated links, not every sibling"
    ])
  })

  test("flags an sh block whose output is written as # lines, not commented commands or trailing comments", () => {
    const lines = [
      "```sh",
      'spell parse "print 1"',
      "# statement › print  print 1",
      "```",
      "",
      "```sh",
      "# build, then test",
      "yarn build",
      "yarn clone spell-ui   # spell-ui alone",
      "```"
    ]
    expect(findingsOf(lines, "output")).toEqual(["1 output"])
  })

  test("lists a folder's README.md and README-*.md as its pages", () => {
    const check = new ReadmeCheck(FIXTURES)
    expect(check.pages().map((page) => page.slice(FIXTURES.length + 1))).toEqual(["README-other.md", "README.md"])
  })
})

describe("ReadmeCheck.checkPage():  brand", () => {
  test("flags the word in every form and every place:  prose, code, tables, links and Mermaid", () => {
    const lines = [
      "The brand pages;  many brands;  a branded theme.",
      "Run `yarn brand:build`, or see `spell-brand`.",
      "| spell-brand | its theme |",
      "[the Brand](../spell-brand/README.md)",
      "Served from `/_brand/assets/`.",
      "```mermaid",
      '  app --> brand["spell-brand"]',
      "```",
      "The BRAND's colours."
    ]
    expect(findingsOf(lines, "brand")).toEqual([
      "1 brand",
      "2 brand",
      "3 brand",
      "4 brand",
      "5 brand",
      "7 brand",
      "9 brand"
    ])
  })

  test("lets 'brand new' through, even over a line break, and words that only hold its letters", () => {
    const lines = [
      "A brand new page, a Brand-New one, and a brand",
      "new start;  a rebrand, brandy and brandless are other words.",
      "But brand news is the word, and so is a brand-newer one."
    ]
    expect(findingsOf(lines, "brand")).toEqual(["3 brand"])
  })

  test("says nothing about a page without the word", () => {
    expect(findingsOf(["# Spell", "", "The kit and the repos above it."], "brand")).toEqual([])
  })

  test("lets Font Awesome's icon pack fa7-brands through:  it is the company logos, not the repo", () => {
    expect(findingsOf(["Packs:  `fa7-solid`, `fa7-brands`.", "But `spell-brand` is not."], "brand")).toEqual([
      "2 brand"
    ])
  })
})

describe("ReadmeCheck.checkLink():  links into another repo", () => {
  /** a page of the kit (`README.md`) in a temporary kit holding one child repo, `spell-ui`, with one page */
  function kitWithChild(): string {
    const root = mkdtempSync(join(tmpdir(), "readme-check-"))
    mkdirSync(join(root, "spell-ui"))
    writeFileSync(join(root, "spell-ui", "README-themes.md"), "# Themes\n\n## Dark mode\n")
    return root
  }
  function findings(root: string, line: string): string[] {
    return new ReadmeCheck(root)
      .checkPage(join(root, "README.md"), line)
      .map(({ rule, message }) => `${rule}  ${message}`)
  }

  test("flags a relative link into another repo, naming the GitHub URL to write", () => {
    expect(findings(kitWithChild(), "[themes](spell-ui/README-themes.md)")).toEqual([
      "cross-repo  spell-ui/README-themes.md:  write https://github.com/spell-app/spell-ui/blob/main/README-themes.md"
    ])
  })

  test("checks a GitHub URL into one of our repos against its checkout, anchors included", () => {
    const root = kitWithChild()
    const url = "https://github.com/spell-app/spell-ui/blob/main/README-themes.md"
    expect(findings(root, `[themes](${url}#dark-mode)`)).toEqual([])
    expect(findings(root, `[themes](${url}#light-mode)`).map((each) => each.split("  ")[0])).toEqual(["anchor"])
    expect(
      findings(root, `[gone](https://github.com/spell-app/spell-ui/blob/main/README-gone.md)`).map(
        (each) => each.split("  ")[0]
      )
    ).toEqual(["link"])
  })
})

describe("ReadmeCheck.checkPage():  words for what repo-split deletes", () => {
  test("flags the run-time alias hook, spell-folders, the alias lint rules, packModuleKey and the old epic verbs", () => {
    const lines = [
      "Run `tsx --import spell/toolchain/aliases`.",
      "Then `spell-folders test`.",
      "Lint fails it:  `spell/no-cross-repo-alias`.",
      "The key comes from `packModuleKey()`.",
      "`epic new readme`, `epic check readme` and `epic inbox listen`.",
      "Until repo-split P14 lands, six repos."
    ]
    expect(findingsOf(lines, "word")).toEqual(["1 word", "2 word", "3 word", "4 word", "5 word", "6 word", "6 word"])
  })

  test("lets the new spellings through", () => {
    const lines = ["`epic create readme`, `epic lint readme`, `epic inbox watch`;  five repos, one package each."]
    expect(findingsOf(lines, "word")).toEqual([])
  })
})

describe("ReadmeCheck.checkPage():  capital", () => {
  test("flags a lowercase spell that is a word:  in prose, headings, tables, link text and footnotes", () => {
    const lines = [
      "A language written in spell.",
      "spell reads English;  so does Spell.",
      "## spell basics",
      "| spell | a language |",
      "[spell's docs](README-other.md)",
      "<summary>All about spell</summary>",
      'Use **spell** (or spell, or "spell").',
      "[^1]: A footnote about spell."
    ]
    expect(findingsOf(lines, "capital")).toEqual([
      "1 capital",
      "2 capital",
      "3 capital",
      "4 capital",
      "5 capital",
      "6 capital",
      "7 capital",
      "8 capital"
    ])
  })

  test("leaves identifiers, code, link targets, URLs, HTML and comments alone", () => {
    const lines = [
      "The spell-parser repo, spell_core, @spell/core, spell.epics, a .spell file, owen@spell, #spell, ~/www/spell.",
      "Spell reads English, as do spells and a misspelling.",
      "Run `spell serve`, or <code>spell serve</code>.",
      "```sh",
      "spell serve",
      "```",
      "```mermaid",
      "  a[spell] --> b",
      "```",
      '[the docs](spell/README.md "spell") ![logo](docs/images/spell.svg)',
      "See https://github.com/spell-app/spell, or <https://example.com/spell>.",
      '<img src="spell.svg" alt="spell"> <a href="spell">Spell</a>',
      "<!-- one spell -->",
      "<!-- a spell",
      "still a spell -->",
      "[spell]: https://example.com/spell"
    ]
    expect(findingsOf(lines, "capital")).toEqual([])
  })

  test("counts lines right past a comment that runs over several", () => {
    const lines = ["<!-- a", "comment", "over lines -->", "Written in spell."]
    expect(findingsOf(lines, "capital")).toEqual(["4 capital"])
  })
})

describe("ReadmeCheck.checkPage():  siblings", () => {
  test("flags a line that opens Also beside it, with a list marker or without", () => {
    const lines = [
      "- Also beside it:  [one](README-other.md) · [two](README-other.md)",
      "- Also beside it:",
      "  [one](README-other.md) · [two](README-other.md)",
      "  * also beside it:  [one](README-other.md)",
      "1. Also beside it:  [one](README-other.md)",
      "Also beside it:  [one](README-other.md)"
    ]
    expect(findingsOf(lines, "siblings")).toEqual([
      "1 siblings",
      "2 siblings",
      "4 siblings",
      "5 siblings",
      "6 siblings"
    ])
  })

  test("leaves a curated See also alone, and a fenced example of the dump", () => {
    const lines = [
      "- [README-other.md](README-other.md):  the page that matters",
      "- See the pages also beside it in the tree",
      "```md",
      "- Also beside it:  [one](README-other.md)",
      "```"
    ]
    expect(findingsOf(lines, "siblings")).toEqual([])
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
