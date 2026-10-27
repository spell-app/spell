import { describe, expect, it, onTestFinished } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import type { UIDocsThemeBench } from "spell-ui/docs-components/ui-docs-theme-bench"

import "spell-ui/docs-components/ui-docs-theme-bench"

/** The bench's kept tunings, in the browser's storage. */
const EDITS_KEY = "spell-ui-site:theme-bench"

/** Render a bench;  returns its DOM element and component, once its theme files are in and its groups drawn. */
async function render() {
  localStorage.removeItem(EDITS_KEY)
  onTestFinished(() => localStorage.removeItem(EDITS_KEY))
  const bench = await ElementFixture.render<DOMElement>(`<ui-docs-theme-bench></ui-docs-theme-bench>`)
  const component = bench.component as unknown as UIDocsThemeBench
  await expect.poll(() => bench.shadowRoot?.querySelectorAll(".group").length, { timeout: 5000 }).toBeGreaterThan(3)
  return { bench, component }
}

describe("<ui-docs-theme-bench>", () => {
  it("draws the four pages, and every group of tokens for the theme shown", async () => {
    const { bench, component } = await render()
    const root = bench.shadowRoot!
    expect(root.querySelectorAll("figure.page")).toHaveLength(4)
    expect(root.querySelectorAll(".token").length).toBeGreaterThan(20)
    // a theme's own tokens;  the themes named once, the shown one marked, and every token's values under them
    expect(component.groups.map((group) => group.place)).toContain("own")
    const heads = root.querySelectorAll(".theme-head")
    expect(heads.length).toBe(component.themeNames.length)
    expect(root.querySelector(".theme-head.current")?.textContent).toContain(component.theme.slice(1))
    const cells = root.querySelector(".token .themes")!.querySelectorAll(".cell")
    expect(cells).toHaveLength(heads.length)
    expect(cells[component.themeNames.indexOf(component.theme)]!.matches(".current")).toBe(true)
  })

  it("a tuning:  the sheet over every page, the theme file's lines, kept;  Reset all takes it back", async () => {
    const { bench, component } = await render()
    component.tune("--ui-radius-l", "20px")
    await ElementFixture.settle()
    expect(component.css).toContain("--ui-radius-l: 20px !important;")
    expect(component.changes).toContain(`"l": "20px"`)
    expect(bench.matches(":state(tuned)")).toBe(true)
    expect(JSON.parse(localStorage.getItem(EDITS_KEY)!)).toEqual({
      [component.theme]: { "--ui-radius-l": { both: "20px" } }
    })
    component.reset()
    await ElementFixture.settle()
    expect(component.css).toBe("")
    expect(bench.matches(":state(tuned)")).toBe(false)
    expect(localStorage.getItem(EDITS_KEY)).toBeNull()
  })

  it("the filter keeps only tokens whose name has the text", async () => {
    const { component } = await render()
    component.filter = "segmented"
    await ElementFixture.settle()
    const tokens = component.groups.flatMap((group) => group.tokens)
    expect(tokens.length).toBeGreaterThan(0)
    expect(tokens.every((token) => token.includes("segmented"))).toBe(true)
  })
})
