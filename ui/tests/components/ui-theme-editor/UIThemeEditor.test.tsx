import { userEvent } from "vite-plus/test/browser"
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vite-plus/test"

import { UI } from "spell/ui/runtime"
import { foundationCSS } from "spell/ui/styles"
import { Sheets } from "spell/ui/test-helpers/Sheets"
import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { SavedTheme, type DOMThemeEditorElement, type UIThemeEditor } from "spell/ui/components/ui-theme-editor"
import type { PreviewPage } from "spell/ui/components/ui-theme-editor/UIThemeEditor.types"

/** What the editor keeps in the browser:  the theme being made, the tree's folds, ⇄, the pages turned off and their order. */
const KEPT_KEYS = [
  "spell-ui:theme-draft",
  "spell-ui:theme-editor-folds",
  "spell-ui:theme-editor-swapped",
  "spell-ui:theme-editor-schemes",
  "spell-ui:theme-editor-head",
  "spell-ui:theme-editor-hidden-pages",
  "spell-ui:theme-editor-page-order"
]

/** The test page's own address:  the editor writes its view into it (`BenchAddress`), and each test starts clean. */
const TEST_ADDRESS = location.href

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

/** The swatch `selector` names in colour choice `name`'s row (`<ui-hue-swatches>`, its own shadow root). */
function swatch(host: Element, name: string, selector: string): HTMLElement {
  const row = inner(host, `ui-property[name="${name}"] ui-hue-swatches`)
  return row.shadowRoot!.querySelector<HTMLElement>(`[part~=swatch]${selector}`)!
}

/** Press page `id`'s toggle in the bar, and wait for the bench to follow. */
async function pressPage(host: Element, id: string): Promise<void> {
  const item = inner(host, `.page-toggles ui-item[value="${id}"]`)
  await userEvent.click(item.shadowRoot!.querySelector<HTMLElement>("[part~=item]")!)
  await ElementFixture.settle()
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
  history.replaceState(history.state, "", TEST_ADDRESS)
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
    swatch(host, "primary", '[value="pink"]').click()
    await applied(host)
    expect(events).toHaveLength(1)
    expect(events[0]!.detail.value.primary).toBe("pink")
    expect(events[0]!.detail.css).toContain("--ui-primary: var(--ui-pink);")
    expect(token("--ui-primary")).toBe(token("--ui-pink"))
    await ElementFixture.settle()
    expect(swatch(host, "primary", '[value="pink"]').getAttribute("aria-checked")).toBe("true")
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

  it("an untouched choice says what the theme's own is:  its colour, font, size, the Shape it matches", async () => {
    const host = await editor(`<ui-theme-editor base="fruity"></ui-theme-editor>`)
    await applied(host)
    const output = (name: string) => inner(host, `ui-property[name="${name}"]`).getAttribute("output") ?? ""
    expect(output("primary")).toMatch(/^Theme's own · #[0-9a-f]{6}/)
    expect(output("textSize")).toMatch(/^Theme's own · \d+px$/)
    expect(output("corners")).toBe("Theme's own · Round")
    expect(inner(host, `ui-property[name="corners"] ui-item[value="round"]`).hasAttribute("selected")).toBe(true)
    expect(inner(host, `ui-property[name="bodyFont"] ui-item[value="own"]`).textContent).toMatch(/^Theme's own · /)
  })

  it("arrow keys in a swatch row move and choose", async () => {
    const host = await editor()
    // from the chosen swatch, the row's tab stop, as a person presses it
    const chosen = swatch(host, "secondary", '[aria-checked="true"]')
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
    expect(inner(host, ".tokens .tokens-title").textContent).toContain("Theme")
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

  it("the bar:  the themes, Light / Dark / Both with ⇄ in it under Both, then the pages and Phone at the far right;  every control has a tooltip", async () => {
    const { host, component } = await withPages()
    const tools = [...inner(host, ".bar .tools").children]
    expect(tools.map((tool) => tool.classList[0])).toEqual([undefined, "schemes-group", "page-toggles", "bar-toggle"])
    expect(tools[0]!.getAttribute("aria-label")).toBe("Theme")
    expect(inner(host, ".bar ui-theme-menu")).toBeNull()
    const swap = () => host.shadowRoot!.querySelector<HTMLElement>('.schemes-group ui-item[value="swap"]')
    expect(swap()?.getAttribute("aria-pressed")).toBe("false")
    component.showSchemes("light")
    await ElementFixture.settle()
    expect(swap()).toBeNull()
    component.showSchemes("both")
    await ElementFixture.settle()
    const untitled = [
      ...host.shadowRoot!.querySelectorAll(".bar ui-button, .bar ui-item, .side ui-button, .side button, .page-head")
    ]
      .filter((control) => !control.getAttribute("title"))
      .map((control) => control.outerHTML.slice(0, 80))
    expect(untitled).toEqual([])
  })

  it("⇄ is a toggle segment of the schemes group:  pressed in while swapped, Both stays picked", async () => {
    const { host, component } = await withPages()
    const swap = inner(host, '.schemes-group ui-item[value="swap"]')
    swap.shadowRoot!.querySelector<HTMLElement>("[part~=item]")!.click()
    await ElementFixture.settle()
    expect(component.isSwapped).toBe(true)
    expect(component.schemes).toBe("both")
    expect(swap.classList.contains("on")).toBe(true)
    expect(swap.getAttribute("title")).toMatch(/^Dark light/)
  })

  it("each page toggles on and off, pressed in while on, kept;  the last one off turns the next on;  an odd last page takes the row", async () => {
    const { host, component } = await withPages()
    const figure = (index: number) => host.shadowRoot!.querySelectorAll<HTMLElement>("figure.page")[index]!
    expect(figure(2).classList.contains("wide")).toBe(true)
    const other = inner(host, '.page-toggles ui-item[value="other"]')
    expect(other.matches(":state(selected)")).toBe(true)
    await pressPage(host, "other")
    expect(other.matches(":state(selected)")).toBe(false)
    expect(figure(1).hidden).toBe(true)
    expect(component.shownPageIds).toEqual(["page", "app"])
    expect(figure(2).classList.contains("wide")).toBe(false)
    expect(JSON.parse(localStorage.getItem("spell-ui:theme-editor-hidden-pages")!)).toEqual(["other"])
    await pressPage(host, "page")
    expect(component.shownPageIds).toEqual(["app"])
    expect(component.isDarkFirst("app")).toBe(false)
    // the only one on, turned off:  the next one on, round to the first
    await pressPage(host, "app")
    expect(component.shownPageIds).toEqual(["page"])
    await pressPage(host, "other")
    expect(component.shownPageIds).toEqual(["page", "other"])
  })

  it("a page moves by its title row:  Alt+→ / Alt+←, or a drop;  the grid and the toggles follow, kept", async () => {
    const { host, component } = await withPages()
    const head = (id: string) =>
      [...host.shadowRoot!.querySelectorAll<HTMLElement>("figure.page")].find(
        (figure) =>
          figure.querySelector(".page-title")?.textContent === component.pageList.find((page) => page.id === id)?.label
      )!
    head("page")
      .querySelector<HTMLElement>(".page-head")!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", altKey: true, bubbles: true }))
    await ElementFixture.settle()
    expect(component.shownPageIds).toEqual(["other", "page", "app"])
    expect(head("page").style.order).toBe("1")
    expect(
      [...host.shadowRoot!.querySelectorAll(".page-toggles ui-item")].map((item) => item.getAttribute("value"))
    ).toEqual(["other", "page", "app"])
    component.movePage("app", "other", "before")
    expect(component.shownPageIds).toEqual(["app", "other", "page"])
    expect(JSON.parse(localStorage.getItem("spell-ui:theme-editor-page-order")!)).toEqual(["app", "other", "page"])
    // a drag over a page's far half, then a drop:  after it
    const figure = head("page")
    const box = figure.getBoundingClientRect()
    const drag = (type: string, x: number) =>
      new DragEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: box.top + 10,
        dataTransfer: new DataTransfer()
      })
    head("app").querySelector(".page-head")!.dispatchEvent(drag("dragstart", 0))
    figure.dispatchEvent(drag("dragover", box.right - 5))
    await ElementFixture.settle()
    expect(figure.classList.contains("drop-after")).toBe(true)
    figure.dispatchEvent(drag("drop", box.right - 5))
    await ElementFixture.settle()
    expect(component.shownPageIds).toEqual(["other", "page", "app"])
    expect(figure.classList.contains("drop-after")).toBe(false)
  })

  it("its view goes in the page's address, and an address brings that view back", async () => {
    const { host, component } = await withPages()
    component.showSchemes("dark")
    await pressPage(host, "other")
    component.device = "phone"
    await ElementFixture.settle()
    const params = new URL(location.href).searchParams
    expect(params.get("scheme")).toBe("dark")
    expect(params.get("pages")).toBe("page,app")
    expect(params.get("phone")).toBe("1")
    expect(params.get("theme")).toBe(component.baseTheme)
    // a fresh page at an address:  it wins over what's remembered
    host.remove()
    history.replaceState(history.state, "", `${location.pathname}?theme=glass&scheme=both&swap=1&pages=app,page`)
    const again = await withPages()
    expect(again.component.baseTheme).toBe("glass")
    expect(again.component.schemes).toBe("both")
    expect(again.component.isSwapped).toBe(true)
    expect(again.component.shownPageIds).toEqual(["app", "page"])
    expect(again.component.device).toBe("desk")
    expect(localStorage.getItem("spell-ui:theme-editor-schemes")).toBe("dark")
  })

  it("a page's ↻ reloads its own frames, and no other page's", async () => {
    const { host } = await withPages()
    const frames = () => [...host.shadowRoot!.querySelectorAll<HTMLIFrameElement>("iframe")]
    const marked = (frame: HTMLIFrameElement) => (frame.contentWindow as Window & { marked?: boolean }).marked
    // one frame at a time, each dressed in turn:  a page with no runtime takes its 5s
    await vi.waitFor(() => expect(frames()).toHaveLength(4), { timeout: 40000 })
    await vi.waitFor(() =>
      expect(frames().every((frame) => frame.contentDocument?.readyState === "complete")).toBe(true)
    )
    const before = frames()
    for (const frame of before) (frame.contentWindow as Window & { marked?: boolean }).marked = true
    const reload = inner(host, "figure.page .page-tool")
    expect(reload.getAttribute("title")).toBe("Reload this page")
    reload.click()
    await vi.waitFor(() => expect(before.slice(0, 2).every((frame) => !marked(frame))).toBe(true), { timeout: 10000 })
    expect(frames()).toEqual(before)
    expect(before.slice(2).every((frame) => marked(frame))).toBe(true)
  }, 60000)

  it("a page's ↗ opens it in the theme it builds on and the scheme of its first frame on screen", async () => {
    const { host, component } = await withPages()
    component.choose({ base: "glass" })
    await ElementFixture.settle()
    const links = [...host.shadowRoot!.querySelectorAll<HTMLAnchorElement>("figure.page a.page-tool")]
    const query = (link: HTMLAnchorElement) => Object.fromEntries(new URL(link.href).searchParams)
    expect(query(links[0]!)).toEqual({ theme: "glass", scheme: "light" })
    expect(query(links[1]!)).toEqual({ theme: "glass", scheme: "dark" })
  })

  it("⇄ swaps every pair's sides, kept", async () => {
    const { component } = await withPages()
    expect(component.isDarkFirst("other")).toBe(true)
    component.swap()
    expect(component.isDarkFirst("other")).toBe(false)
    expect(localStorage.getItem("spell-ui:theme-editor-swapped")).toBe("true")
  })
})
