import { describe, expect, it, onTestFinished } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import type { UIDocsThemeBench } from "spell-ui/docs-components/ui-docs-theme-bench"

import "spell-ui/docs-components/ui-docs-theme-bench"

/** The bench's kept tunings, in the browser's storage. */
const EDITS_KEY = "spell-ui-site:theme-bench"

/** The bench's kept folds of its tree. */
const FOLDS_KEY = "spell-ui-site:theme-bench-folds"

/** Render a bench;  returns its DOM element and component, once its theme files are in and its groups drawn. */
async function render() {
  localStorage.removeItem(EDITS_KEY)
  localStorage.removeItem(FOLDS_KEY)
  onTestFinished(() => {
    localStorage.removeItem(EDITS_KEY)
    localStorage.removeItem(FOLDS_KEY)
  })
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
    // a theme's own tokens;  no row of every theme's values (Owen:  "I think drop them")
    expect(component.groups.map((group) => group.place)).toContain("own")
    expect(root.querySelector(".themes, .theme-heads")).toBeNull()
  })

  it("each page in light and dark, side by side;  One scheme shows each once", async () => {
    const { bench, component } = await render()
    const root = bench.shadowRoot!
    expect(component.schemes).toBe("both")
    expect(component.frameKeys).toContain("ui:dark")
    for (const page of root.querySelectorAll("figure.page")) expect(page.querySelectorAll(".frame")).toHaveLength(2)
    component.schemes = "one"
    await ElementFixture.settle()
    expect(component.frameKeys).toEqual(["epic:shown", "ui:shown", "notebook:shown", "editor:shown"])
    for (const page of root.querySelectorAll("figure.page")) expect(page.querySelectorAll(".frame")).toHaveLength(1)
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

  it("a read-by icon keeps its element, and its tooltip, while the pages report again", async () => {
    const { bench, component } = await render()
    const look = (declares: string[]) => ({ reads: ["--ui-surface"], declares, overrides: [], values: {} })
    component.looks = { ui: look([]), editor: look(["--spell-pane-radius"]) }
    await ElementFixture.settle()
    const icon = () => bench.shadowRoot!.querySelector<HTMLElement>(".reader[title='Spell UI reads it']")
    const first = icon()
    expect(first).not.toBeNull()
    // the same reports again, as new objects:  every page sends one each time it's dressed
    component.looks = { ui: look([]), editor: look(["--spell-pane-radius"]) }
    await ElementFixture.settle()
    expect(icon()).toBe(first)
  })

  it("light and dark side by side:  each half tunes its own scheme;  Split gives a one-value token two", async () => {
    const { bench, component } = await render()
    // a token whose value differs by scheme shows a light and a dark control
    const look = { reads: [], declares: [], overrides: [], values: { "--ui-surface": "light-dark(#ffffff, #222222)" } }
    component.looks = { ui: look }
    await ElementFixture.settle()
    expect(component.isSplit("--ui-surface")).toBe(true)
    component.tune("--ui-surface", "#eeeeee", "dark")
    await ElementFixture.settle()
    expect(component.css).toContain(":root.ui-dark {\n  --ui-surface: #eeeeee !important;")
    expect(component.changes).toMatch(/"panel": \{\s*"light": [^,]+,\s*"dark": "#eeeeee"/)
    // a one-value token:  one control, until it's split
    expect(component.isSplit("--ui-radius-l")).toBe(false)
    component.split("--ui-radius-l")
    await ElementFixture.settle()
    expect(component.isSplit("--ui-radius-l")).toBe(true)
    expect(bench.shadowRoot!.querySelectorAll(".token.split .half").length).toBeGreaterThanOrEqual(4)
  })

  it("a tree:  a branch folds and stays folded;  the filter opens every branch it matches in", async () => {
    const { bench, component } = await render()
    const root = bench.shadowRoot!
    // a branch starts folded, its tokens not drawn;  opening it is kept, by its id
    const branch = root.querySelector<HTMLElement & { open: boolean }>("ui-section.branch")!
    expect(branch.getAttribute("open")).toBe("false")
    expect(component.folds).toEqual({})
    branch.open = true
    await ElementFixture.settle()
    const [opened] = Object.keys(component.folds)
    expect(component.tree.nodes.get(opened!)?.name).toBe(branch.getAttribute("label"))
    expect(JSON.parse(localStorage.getItem(FOLDS_KEY)!)).toEqual({ [opened!]: true })
    // the filter matches the tree's path too:  "segmented" finds the menu's segmented tokens, every branch open
    component.filter = "segmented"
    await ElementFixture.settle()
    expect(component.groups.flatMap((group) => group.tokens).every((token) => token.includes("segmented"))).toBe(true)
    expect(root.querySelectorAll("ui-section.branch[open='false']")).toHaveLength(0)
  })

  it("lists names with their numbers as numbers", async () => {
    const { component } = await render()
    component.looks = {
      editor: {
        reads: [],
        overrides: [],
        values: {},
        declares: ["--spell-brand-100", "--spell-brand-25", "--spell-brand-50"]
      }
    }
    await ElementFixture.settle()
    const editor = component.groups.find((group) => group.place === "editor")!
    expect(editor.tokens).toEqual(["--spell-brand-25", "--spell-brand-50", "--spell-brand-100"])
  })
})
