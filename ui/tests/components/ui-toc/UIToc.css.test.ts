import { describe, expect, it } from "vite-plus/test"

import { Sheets } from "spell/ui/test-helpers/Sheets"

import tocRaw from "spell/ui/components/ui-toc/UIToc.css?raw"

/**
 * `UIToc.css`:  the sheet's source rules.
 * - The look is the widgets' own (`<ui-menu>`, `<ui-item>`, `<ui-header>`), tested in their families;
 *   the element tests (`UIToc.test.tsx`) check what this sheet lays out.
 */
describe("UIToc.css source", () => {
  it("never uses rem or !important", () => {
    const text = Sheets.withoutComments(tocRaw)
    expect(text).not.toMatch(/\d(\.\d+)?rem\b/)
    expect(text).not.toContain("!important")
  })

  it("declares its sublayer order before any rule", () => {
    const text = Sheets.withoutComments(tocRaw).trim()
    expect(text.replace(/\s+/g, " ").startsWith(Sheets.layers("toc"))).toBe(true)
  })

  it("declares no public token of its own:  private aliases only", () => {
    const declared = [...Sheets.withoutComments(tocRaw).matchAll(/(--ui-toc-[\w-]+)\s*:/g)]
    expect(declared.map((match) => match[1])).toEqual([])
  })
})
