import { userEvent } from "vite-plus/test/browser"
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vite-plus/test"

import { UI } from "spell-ui/runtime"
import { foundationCSS } from "spell-ui/styles"
import { Sheets } from "spell-ui/test-helpers/Sheets"
import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { SavedTheme, type DOMThemeEditorElement, type UIThemeEditor } from "spell-ui/components/ui-theme-editor"
import type { PreviewPage } from "spell-ui/components/ui-theme-editor/UIThemeEditor.types"

/** What the editor keeps in the browser:  the theme being made, the tree's folds, ⇄. */
const KEPT_KEYS = [
  "spell-ui:theme-draft",
  "spell-ui:theme-editor-folds",
  "spell-ui:theme-editor-swapped",
  "spell-ui:theme-editor-schemes",
  "spell-ui:theme-editor-head"
]

/** The editor in the fixture, drawn, and its component. */
async function editor(
  html = "<ui-theme-editor></ui-theme-editor>"
): Promise<DOMThemeEditorElement & { component: UIThemeEditor }> {
  const host = (await ElementFixture.render(html)) as DOMThemeEditorElement
  await ElementFixture.settle()
  return host as DOMThemeEditorElement & { component: UIThemeEditor }
}

/** An element in `host`'s shadow root. */
function inner<T extends Element = HTMLElement>(host: Element, selector: string): T {
  return host.shadowRoot!.querySelector<T>(selector)!
}

/** A computed token on `<html>`. */
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** Every `ui-changed` `host` sends. */
function changes(host: Element): CustomEvent[] {
  const events: CustomEvent[] = []
  host.addEventListener("ui-changed", (event) => events.push(event as CustomEvent))
  return events
}

/** Wait for the theme files and the page's sheets to follow (`SavedTheme.wear()` is async). */
async function applied(host: DOMThemeEditorElement): Promise<void> {
  await vi.waitFor(() => expect(host.component?.files).toBeDefined(), { timeout: 5000 })
  await ElementFixture.settle()
  await new Promise((resolve) => setTimeout(resolve, 50))
  await ElementFixture.settle()
}

/** A page to preview:  one of the tests' own, beside them (same origin). */
const PAGE: PreviewPage = {
  id: "page",
  label: "A page",
  url: "/src/test-helpers/fixtures/sources/page.html",
  width: 800,
  reach: "same origin",
  themeKey: "spell-ui-test:theme",
  icon: "file"
}

/** Another, and one of another origin that isn't running. */
const PAGES: PreviewPage[] = [
  PAGE,
  { ...PAGE, id: "other", label: "Another" },
  { ...PAGE, id: "app", label: "The app", url: "", note: "Not running", reach: "messages", ownPrefix: "--spell-" }
]

/** The editor with `PAGES` to preview, once its theme files are in and its groups drawn. */
async function withPages() {
  const host = await editor()
  ;(host as unknown as { pages: PreviewPage[] }).pages = PAGES
  await vi.waitFor(() => expect(host.shadowRoot!.querySelectorAll(".tokens .group").length).toBeGreaterThan(3), {
    timeout: 5000
  })
  return { host, component: host.component }
}

function forget() {
  SavedTheme.forget()
  for (const key of KEPT_KEYS) localStorage.removeItem(key)
}
beforeEach(forget)
afterEach(async () => {
  forget()
  const { themes } = await UI.load()
  await themes.apply(undefined)
})

////////////////
// ## Starting
////////////////

describe("<ui-theme-editor> starting", () => {
  it("starts from fruity when the page has no theme, and applies it;  a sample app, light and dark", async () => {
    // the page's own token sheets, as a real page has:  else each shadow root keeps its default colours
    Sheets.adopt(foundationCSS)
    const host = await editor()
    await applied(host)
    // NOTE:  axe over the light sample only:
    // in a test page, the dark sample's label reads its own shadow root's default colours (white on #3faff3),
    // where a served page shows fruity's (checked by eye on screenshots)
    inner(host, ".sample.ui-dark").hidden = true
    await vi.waitFor(() => expect(token("--glass-surface")).not.toBe(""))
    expect(host.theme).toEqual({ name: "My theme", base: "fruity" })
    expect(UI.themes.current).toBe("fruity")
    expect(host.changes).not.toContain("brand")
    expect(inner(host, ".changes").textContent).toContain("No changes yet")
    await expectAccessible(host)
  })

  it("Dark shows the dark sample alone;  Both, the two;  kept", async () => {
    const host = await editor()
    host.component.showSchemes("dark")
    await ElementFixture.settle()
    expect(inner(host, ".sample.ui-dark").hidden).toBe(false)
    expect(inner(host, ".sample.ui-light").hidden).toBe(true)
    expect(localStorage.getItem("spell-ui:theme-editor-schemes")).toBe("dark")
    host.component.showSchemes("both")
    await ElementFixture.settle()
    expect(inner(host, ".sample.ui-light").hidden).toBe(false)
  })

  it("starts from `value`, else the theme being made, else the kept theme", async () => {
    const given = await editor(`<ui-theme-editor value='{"primary": "pink", "corners": "soft"}'></ui-theme-editor>`)
    expect(given.theme).toMatchObject({ primary: "pink", corners: "soft", base: "fruity" })
    given.remove()
    SavedTheme.save({ name: "Kept", base: "fruity", primary: "teal" }, "/* kept */")
    const kept = await editor()
    expect(kept.theme).toMatchObject({ name: "Kept", primary: "teal" })
    kept.component.choose({ primary: "red" })
    kept.remove()
    const draft = await editor()
    expect(draft.theme).toMatchObject({ name: "Kept", primary: "red" })
  })
})

////////////////
// ## The Basics
////////////////

describe("<ui-theme-editor> Basics", () => {
  it("a colour swatch changes the page's primary, and sends `ui-changed` with the sheet", async () => {
    const host = await editor()
    await applied(host)
    const events = changes(host)
    inner(host, 'ui-property[name="primary"] button[value="pink"]').click()
    await applied(host)
    expect(events).toHaveLength(1)
    expect(events[0]!.detail.value.primary).toBe("pink")
    expect(events[0]!.detail.css).toContain("--ui-primary: var(--ui-pink);")
    expect(token("--ui-primary")).toBe(token("--ui-pink"))
    expect(inner(host, 'ui-property[name="primary"] button[value="pink"]').getAttribute("aria-checked")).toBe("true")
    expect(host.matches(":state(changed)")).toBe(true)
  })

  it("a segmented choice changes the page's radii;  its Reset puts the theme's own back", async () => {
    const host = await editor()
    await applied(host)
    const pill = inner(host, 'ui-property[name="corners"] ui-item[value="pill"]')
    await userEvent.click(pill.shadowRoot!.querySelector<HTMLElement>("[part~=item]")!)
    await applied(host)
    expect(host.theme?.corners).toBe("pill")
    expect(token("--ui-radius-s")).toBe("9999px")
    inner(host, 'ui-property[name="corners"] ui-button[slot="actions"]').click()
    await applied(host)
    expect(host.theme?.corners).toBeUndefined()
    expect(token("--ui-radius-s")).not.toBe("9999px")
  })

  it("arrow keys in a swatch row move and choose", async () => {
    const host = await editor()
    // from the chosen swatch, the row's tab stop, as a person presses it
    const chosen = inner(host, 'ui-property[name="secondary"] .swatches [aria-checked="true"]')
    chosen.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect(host.theme?.secondary).toBe("red")
  })

  it("its inner elements' events stop at its shadow root", async () => {
    const host = await editor()
    const events = changes(host)
    inner(host, ".sample ui-checkbox").dispatchEvent(
      new CustomEvent("ui-changed", { detail: { value: true }, bubbles: true, composed: true })
    )
    expect(events).toHaveLength(0)
  })

  it("Start over drops every change but the name and the base", async () => {
    const host = await editor(`<ui-theme-editor value='{"name": "Sunrise", "primary": "pink"}'></ui-theme-editor>`)
    host.component.tune("--ui-radius-l", "20px")
    inner(host, ".actions ui-button:last-child").click()
    await ElementFixture.settle()
    expect(host.theme).toEqual({ name: "Sunrise", base: "fruity" })
  })
})

////////////////
// ## Kept and copied
////////////////

describe("<ui-theme-editor> kept and copied", () => {
  it("Use this theme keeps it;  `SavedTheme.restore()` puts it back on a page", async () => {
    const host = await editor(`<ui-theme-editor value='{"primary": "green"}'></ui-theme-editor>`)
    await applied(host)
    inner(host, ".actions ui-button[color=primary]").click()
    await ElementFixture.settle()
    expect(SavedTheme.choices?.primary).toBe("green")
    expect(host.matches(":state(saved)")).toBe(true)
    host.remove()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(token("--ui-primary")).not.toBe(token("--ui-green"))
    expect(await SavedTheme.restore()).toBe(true)
    expect(token("--ui-primary")).toBe(token("--ui-green"))
  })

  it("a theme kept on a base under its old name opens on its new one:  Studio as Merlot", async () => {
    SavedTheme.save({ name: "Kept", base: "studio", primary: "teal" }, "/* kept */")
    expect(await SavedTheme.restore()).toBe(true)
    expect(UI.themes.current).toBe("merlot")
    expect(SavedTheme.choices?.base).toBe("merlot")
  })

  it("Copy changes copies the theme file's JSON5, and sends `ui-copied`", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined)
    const host = await editor(`<ui-theme-editor value='{"depth": "flat"}'></ui-theme-editor>`)
    await applied(host)
    const copies: CustomEvent[] = []
    host.addEventListener("ui-copied", (event) => copies.push(event as CustomEvent))
    inner(host, '[part~="changes"] ui-button').click()
    await applied(host)
    expect(writeText).toHaveBeenCalledWith(host.changes)
    expect(host.changes).toContain('"extends": "fruity"')
    expect(copies[0]?.detail.text).toBe(host.changes)
    writeText.mockRestore()
  })

  it("taken off the page, it puts the page's theme back", async () => {
    const { themes } = await UI.load()
    await themes.apply("spell")
    const host = await editor(`<ui-theme-editor base="fruity" value='{"primary": "pink"}'></ui-theme-editor>`)
    await applied(host)
    expect(themes.current).toBe("fruity")
    host.remove()
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(themes.current).toBe("spell")
  })
})

////////////////
// ## With pages
////////////////

describe("<ui-theme-editor> with pages", () => {
  it("draws each page in light and dark;  Light, each once;  a page that can't be reached says so", async () => {
    const { host, component } = await withPages()
    const root = host.shadowRoot!
    expect(root.querySelectorAll("figure.page")).toHaveLength(3)
    expect(root.querySelector(".sample")).toBeNull()
    expect(component.frameKeys).toContain("other:dark")
    for (const page of root.querySelectorAll("figure.page")) expect(page.querySelectorAll(".frame")).toHaveLength(2)
    expect(root.querySelector("figure.page:last-child .note")?.textContent).toBe("Not running")
    component.showSchemes("light")
    await ElementFixture.settle()
    expect(component.frameKeys).toEqual(["page:light", "other:light", "app:light"])
    expect(component.rowOf("--ui-surface", "panel").schemes).toEqual(["light"])
  })

  it("its bar is one line:  a narrow editor scrolls it sideways", async () => {
    const { host } = await withPages()
    host.style.width = "700px"
    await ElementFixture.settle()
    const bar = inner(host, ".bar")
    const tools = inner(host, ".tools")
    expect(bar.getBoundingClientRect().height).toBeLessThan(60)
    expect(tools.scrollWidth).toBeGreaterThan(tools.clientWidth)
  })

  it("a page loads, wears the theme being made, and says what it reads", async () => {
    const { host, component } = await withPages()
    component.choose({ textSize: 19 })
    const frame = () => inner<HTMLIFrameElement>(host, 'iframe[title="A page, Light"]')
    await vi.waitFor(() => expect(component.loaded["page:light"]).toBe(true), { timeout: 15000 })
    const style = () => frame().contentDocument!.getElementById("ui-theme-editor-sheet")?.textContent ?? ""
    await vi.waitFor(() => expect(style()).toContain("--ui-font-size: 19px !important;"))
    expect(component.looks.page).toBeDefined()
  })

  it("a token set by hand:  in the file's lines, kept;  Reset takes it back", async () => {
    const { host, component } = await withPages()
    component.tune("--ui-radius-l", "20px")
    await ElementFixture.settle()
    expect(component.draft.frameCss).toContain("--ui-radius-l: 20px !important;")
    expect(host.changes).toContain(`"l": "20px"`)
    expect(host.matches(":state(changed)")).toBe(true)
    expect(JSON.parse(localStorage.getItem("spell-ui:theme-draft")!).tokens).toEqual({
      "--ui-radius-l": { both: "20px" }
    })
    component.reset("--ui-radius-l")
    await ElementFixture.settle()
    expect(component.draft.frameCss).toBe("")
    expect(host.matches(":state(changed)")).toBe(false)
  })

  it("the filter keeps only tokens whose name or place has the text", async () => {
    const { component } = await withPages()
    component.filter = "segmented"
    await ElementFixture.settle()
    const tokens = component.groups.flatMap((group) => group.tokens)
    expect(tokens.length).toBeGreaterThan(0)
    expect(tokens.every((token) => token.includes("segmented"))).toBe(true)
  })

  it("a row:  who reads it, the pages' own tokens in a group of their own", async () => {
    const { component } = await withPages()
    const look = (declares: string[]) => ({ reads: ["--ui-surface"], declares, overrides: [], values: {} })
    component.looks = { page: look([]), app: look(["--spell-pane-radius"]) }
    await ElementFixture.settle()
    expect(component.rowOf("--ui-surface", "panel").readers.map((reader) => reader.tip)).toEqual([
      "A page reads it",
      "The app reads it"
    ])
    expect(component.groups.at(-1)).toEqual({ place: "page.app", tokens: ["--spell-pane-radius"] })
  })

  it("light and dark:  a drawer sets its own scheme;  Split gives a one-value token two", async () => {
    const { host, component } = await withPages()
    const look = { reads: [], declares: [], overrides: [], values: { "--ui-surface": "light-dark(#ffffff, #222222)" } }
    component.looks = { page: look }
    await ElementFixture.settle()
    expect(component.isSplit("--ui-surface")).toBe(true)
    component.tune("--ui-surface", "#eeeeee", "dark")
    await ElementFixture.settle()
    expect(component.draft.frameCss).toMatch(/--ui-surface: light-dark\([^,]+, #eeeeee\) !important;/)
    expect(host.changes).toMatch(/"panel": \{\s*"light": [^,]+,\s*"dark": "#eeeeee"/)
    expect(component.isSplit("--ui-radius-l")).toBe(false)
    component.split("--ui-radius-l")
    expect(component.rowOf("--ui-radius-l", "l").isSplit).toBe(true)
  })

  it("Owen's marks:  ● set here, ○ from what it builds on;  Set here keeps the value;  the chip, the diff", async () => {
    const { component } = await withPages()
    component.choose({ base: "fruity" })
    await ElementFixture.settle()
    expect(component.parentTheme).toBe("glass")
    // Fruity sets its own wallpaper;  Glass gives it its blur
    expect(component.isSetHere("--glass-wallpaper")).toBe(true)
    expect(component.isSetHere("--glass-blur")).toBe(false)
    expect(component.rowOf("--glass-blur", "blur").markTip).toContain("From Glass")
    component.setHere("--glass-blur")
    expect(component.isSetHere("--glass-blur")).toBe(true)
    component.isSetHereOnly = true
    expect(component.groups.flatMap((group) => group.tokens).every((token) => component.isSetHere(token))).toBe(true)
  })

  it("a pointer and a mix:  the row says what it points at, or its mix's parts and amount", async () => {
    const { component } = await withPages()
    component.choose({ base: "glass" })
    await ElementFixture.settle()
    expect(component.rowOf("--ui-highlight", "highlight").pointer?.place).toBe("own.glass-accent-wash")
    component.tune("--ui-highlight", "color-mix(in oklab, {brand.primary.color} 20%, transparent)")
    const mix = component.rowOf("--ui-highlight", "highlight").values.light.mix
    expect(mix).toMatchObject({ mixin: "brand.primary.color", base: "transparent", amount: 20 })
    expect(component.draft.frameCss).toContain(
      "--ui-highlight: color-mix(in oklab, var(--ui-primary) 20%, transparent)"
    )
  })

  it("its head:  Search opens the find row (closing it clears the filter);  Info the legend;  both kept", async () => {
    const { host, component } = await withPages()
    expect(inner(host, ".find-row")).toBeNull()
    component.openRow("search", true)
    await ElementFixture.settle()
    expect(inner(host, ".find-row")).not.toBeNull()
    component.filter = "radius"
    component.openRow("search", false)
    expect(component.filter).toBe("")
    component.openRow("info", true)
    await ElementFixture.settle()
    expect(inner(host, ".info-pane .marks-legend")).not.toBeNull()
    expect(JSON.parse(localStorage.getItem("spell-ui:theme-editor-head")!)).toEqual({ search: false, info: true })
    expect(inner(host, ".tokens-title").textContent).toContain("Theme")
  })

  it("a tree:  the theme's own open, a branch folds and stays folded;  the filter opens every branch it matches", async () => {
    const { host, component } = await withPages()
    onTestFinished(() => localStorage.removeItem("spell-ui:theme-editor-folds"))
    const root = host.shadowRoot!
    expect(root.querySelector("ui-section.group[label='The theme\\'s own']")?.getAttribute("open")).toBe("")
    const branch = root.querySelector<HTMLElement & { open: boolean }>("ui-section.branch")!
    expect(branch.getAttribute("open")).toBe("false")
    branch.open = true
    await ElementFixture.settle()
    const [opened] = Object.keys(component.folds)
    expect(component.tree.nodes.get(opened!)?.name).toBe(branch.getAttribute("label"))
    component.filter = "segmented"
    await ElementFixture.settle()
    expect(root.querySelectorAll(".tokens ui-section[open='false']")).toHaveLength(0)
  })

  it("⇄ swaps every pair's sides, kept", async () => {
    const { component } = await withPages()
    expect(component.isDarkFirst("other")).toBe(true)
    component.swap()
    expect(component.isDarkFirst("other")).toBe(false)
    expect(localStorage.getItem("spell-ui:theme-editor-swapped")).toBe("true")
  })
})
