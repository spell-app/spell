import { describe, expect, it } from "vite-plus/test"

import { foundationCSS } from "spell/ui/styles"

import { Fixture } from "spell/test-helpers/Fixture"
import { Sheets } from "spell/ui/test-helpers/Sheets"

import { includeVocabulary } from "spell/ui/components/ui-include/UIInclude.en"

import includeCSS from "spell/ui/components/ui-include/UIInclude.css?inline"
import includeRaw from "spell/ui/components/ui-include/UIInclude.css?raw"

/** Every example fragment, by path. */
const EXAMPLES = import.meta.glob<string>("./examples/*.html", {
  base: "/src/components/ui-include",
  query: "?raw",
  import: "default",
  eager: true
})

describe("UIInclude.css source", () => {
  it("never uses rem, nor !important", () => {
    expect(Sheets.withoutComments(includeRaw)).not.toMatch(/\d(\.\d+)?rem\b/)
    expect(Sheets.withoutComments(includeRaw)).not.toMatch(/!important/)
  })

  it("declares its sublayer order before any rule", () => {
    const text = Sheets.withoutComments(includeRaw).trim()
    expect(text.replace(/\s+/g, " ").startsWith(Sheets.layers("include"))).toBe(true)
  })

  it("covers every class word the vocabulary can emit", () => {
    for (const phrase of Sheets.classPhrases(includeVocabulary))
      expect(Sheets.covers(includeRaw, phrase), `${includeVocabulary.tag}: ${phrase}`).toBe(true)
  })
})

describe("UIInclude.css examples", () => {
  it("makes the box a block that adds nothing of its own", () => {
    Sheets.adopt([...foundationCSS, includeCSS])
    const root = Fixture.render(EXAMPLES["./examples/types.html"]!)
    const box = root.querySelector<HTMLElement>(".ui.include")!
    expect(getComputedStyle(box)).toMatchObject({ display: "block", paddingTop: "0px", borderTopStyle: "none" })
  })
})
