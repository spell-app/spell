import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vite-plus/test"

import { UI } from "spell/ui/runtime"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { SavedTheme, type DOMThemeEditorElement, type UIThemeEditor } from "spell/ui/components/ui-theme-editor"
import type { PreviewPage, TokenRow } from "spell/ui/components/ui-theme-editor/UIThemeEditor.types"

/****************
 * The theme editor's and its rows' controls are heard by listeners their refs add, not by `on-ui-*` props
 * (`agents/solid/solid-2.md`, "Events"):  each control's event, sent by hand, does what the control is for.
 ****************/

/** What the editor keeps in the browser, cleared before and after each test. */
const KEPT_KEYS = [
  "spell-ui:theme-draft",
  "spell-ui:theme-editing",
  "spell-ui:themes",
  "spell-ui:theme",
  "spell-ui:theme-editor-folds",
  "spell-ui:theme-editor-swapped",
  "spell-ui:theme-editor-schemes",
  "spell-ui:theme-editor-head",
  "spell-ui:theme-editor-hidden-pages",
  "spell-ui:theme-editor-page-order"
]

/** The test page's own address:  the editor writes its view into it. */
const TEST_ADDRESS = location.href

/** A page to preview, beside the tests:  the token tree needs one to draw its rows. */
const PAGE: PreviewPage = {
  id: "page",
  label: "A page",
  url: "/src/test-helpers/fixtures/sources/page.html",
  width: 800,
  reach: "same origin",
  icon: "file"
}

type Editor = DOMThemeEditorElement & { component: UIThemeEditor }

/** The editor, its theme files in. */
async function editor(): Promise<Editor> {
  const host = (await ElementFixture.render("<ui-theme-editor></ui-theme-editor>")) as Editor
  await vi.waitFor(() => expect(host.component?.files).toBeDefined(), { timeout: 5000 })
  await ElementFixture.settle()
  return host
}

/** The editor with a page to preview, its tree's groups drawn. */
async function withPage(): Promise<Editor> {
  const host = await editor()
  ;(host as unknown as { pages: PreviewPage[] }).pages = [PAGE]
  await vi.waitFor(() => expect(host.shadowRoot!.querySelectorAll(".tokens .group").length).toBeGreaterThan(3), {
    timeout: 5000
  })
  return host
}

/** `element`'s event `type`, as its control sends it:  heard on the element itself, so it needn't bubble. */
function send(element: Element, type: string, detail: unknown, { cancelable = false } = {}) {
  element.dispatchEvent(new CustomEvent(type, { detail, cancelable }))
}

/** `selector` in `host`'s shadow root. */
function inner<T extends Element = HTMLElement>(host: Element, selector: string): T {
  const found = host.shadowRoot!.querySelector<T>(selector)
  expect(found, selector).not.toBeNull()
  return found!
}

function forget() {
  history.replaceState(history.state, "", TEST_ADDRESS)
  for (const key of KEPT_KEYS) localStorage.removeItem(key)
}

describe("<ui-theme-editor> hears its controls", () => {
  beforeEach(forget)
  afterEach(async () => {
    forget()
    const { themes } = await UI.load()
    await themes.apply(undefined)
  })

  it("the bar's theme menu picks the base", async () => {
    const host = await editor()
    const menu = [...host.shadowRoot!.querySelectorAll("ui-menu")].find((each) =>
      each.querySelector('ui-item[value="matrix"]')
    )!
    send(menu, "ui-choosing", { value: "matrix" }, { cancelable: true })
    expect(host.theme!.base).toBe("matrix")
  })

  it("the name field names the theme;  the base select picks the base, or starts from one of My themes", async () => {
    const mine = SavedTheme.save({ name: "Ocean", choices: { name: "Ocean", base: "glass", primary: "teal" }, css: "" })
    const host = await editor()
    send(inner(host, 'ui-property[name="name"] ui-input'), "ui-typed", { value: "Named" })
    expect(host.theme!.name).toBe("Named")
    send(inner(host, 'ui-property[name="base"] ui-select'), "ui-changed", { value: "matrix" })
    expect(host.theme!.base).toBe("matrix")
    send(inner(host, 'ui-property[name="base"] ui-select'), "ui-changed", { value: `${SavedTheme.PREFIX}${mine.id}` })
    expect(host.theme).toMatchObject({ name: "Ocean 2", base: "glass" })
  })

  it("My themes' select opens the one picked", async () => {
    const mine = SavedTheme.save({ name: "Ocean", choices: { name: "Ocean", base: "glass" }, css: "" })
    const host = await editor()
    send(inner(host, "ui-select[placeholder]"), "ui-changed", { value: mine.id })
    expect(host.component.editingId).toBe(mine.id)
  })

  it("a font select and the text size slider set the theme's", async () => {
    const host = await editor()
    const fonts = [...inner(host, 'ui-property[name="bodyFont"] ui-select').querySelectorAll("ui-item")]
    const font = fonts
      .map((item) => item.getAttribute("value")!)
      .find((value) => value !== fonts[0]!.getAttribute("value"))!
    send(inner(host, 'ui-property[name="bodyFont"] ui-select'), "ui-changed", { value: font })
    expect(host.theme!.bodyFont).toBe(font)
    send(inner(host, 'ui-property[name="textSize"] ui-slider'), "ui-moved", { value: 18 })
    expect(host.theme!.textSize).toBe(18)
  })

  it("a Basics group's fold is kept", async () => {
    const host = await editor()
    onTestFinished(() => localStorage.removeItem("spell-ui:theme-editor-folds"))
    const section = inner(host, 'ui-property[name="name"]').closest("ui-section")!
    send(section, "ui-closed", { open: false, section })
    expect(Object.values(host.component.folds)).toContain(false)
    send(section, "ui-opened", { open: true, section })
    expect(Object.values(host.component.folds)).not.toContain(false)
  })

  it("the find field filters the tree;  a branch's fold is kept, open and shut", async () => {
    const host = await withPage()
    onTestFinished(() => localStorage.removeItem("spell-ui:theme-editor-folds"))
    const branch = inner(host, "ui-section.branch")
    send(branch, "ui-opened", { open: true, section: branch })
    const [id] = Object.keys(host.component.folds)
    expect(host.component.folds[id!]).toBe(true)
    send(branch, "ui-closed", { open: false, section: branch })
    expect(host.component.folds[id!]).toBe(false)
    host.component.openRow("search", true)
    await ElementFixture.settle()
    send(inner(host, ".find-row ui-input"), "ui-typed", { value: "radius" })
    expect(host.component.filter).toBe("radius")
  })

  it("a row's value sets its token;  its command opens its drawer", async () => {
    const host = await withPage()
    // a branch open, so its rows are drawn
    inner<HTMLElement & { open: boolean }>(host, "ui-section.branch").open = true
    await vi.waitFor(() => expect(host.shadowRoot!.querySelector("ui-theme-token")).not.toBeNull())
    const row = inner<HTMLElement & { row: TokenRow }>(host, "ui-theme-token")
    const { token } = row.row
    send(row, "ui-changed", { token, value: "20px" })
    expect(host.component.tokenEdits[token]).toEqual({ both: "20px" })
    send(row, "ui-command", { token, command: "open" })
    expect(host.component.openToken).toBe(token)
  })
})

////////////////
// ## A row's drawer
////////////////

/** A row of `--ui-highlight`, set here, its drawer open. */
const ROW: TokenRow = {
  token: "--ui-highlight",
  label: "highlight",
  nameTip: "--ui-highlight",
  schemes: ["light", "dark"],
  values: {
    light: { text: "#7b52de1f", kind: "color", hex: "#7b52de", opacity: 12 },
    dark: { text: "#3a2d66", kind: "color", hex: "#3a2d66", opacity: 100 }
  },
  isHere: true,
  isTuned: false,
  isSplit: true,
  isOpen: true,
  markTip: "Set here",
  readers: [],
  options: [
    { place: "brand.primary.color", label: "brand.primary.color" },
    { place: "brand.secondary.color", label: "brand.secondary.color" }
  ]
}

/** `row`, drawn;  the last `ui-changed` it sent. */
async function tokenRow(row: TokenRow) {
  const element = await ElementFixture.render<HTMLElement & { row: TokenRow }>(`<ui-theme-token></ui-theme-token>`)
  element.row = row
  await ElementFixture.settle()
  const changed: unknown[] = []
  element.addEventListener("ui-changed", (event) => changed.push((event as CustomEvent).detail))
  return { root: element.shadowRoot!, last: () => changed.at(-1) as { value: string; scheme?: string } | undefined }
}

describe("<ui-theme-token> hears its drawer's controls", () => {
  it("a colour:  its picker and its hex field set it, for their scheme", async () => {
    const { root, last } = await tokenRow(ROW)
    const light = root.querySelector(".value-editor.color")!
    send(light.querySelector("ui-input.picker")!, "ui-typed", { value: "#ff0000" })
    expect(last()).toMatchObject({ token: "--ui-highlight", scheme: "light" })
    expect(last()!.value.startsWith("#ff0000")).toBe(true)
    send(light.querySelector("ui-input.hex")!, "ui-changed", { value: " #00ff00 " })
    expect(last()!.value.startsWith("#00ff00")).toBe(true)
  })

  it("a length:  its text field and its slider set it", async () => {
    const length = { text: "8px", kind: "length" as const }
    const { root, last } = await tokenRow({ ...ROW, isSplit: false, values: { light: length, dark: length } })
    const editor = root.querySelector(".value-editor.length")!
    send(editor.querySelector("ui-input")!, "ui-changed", { value: " 12px " })
    expect(last()).toEqual({ token: "--ui-highlight", value: "12px" })
    send(editor.querySelector("ui-slider")!, "ui-moved", { value: 9 })
    expect(last()).toEqual({ token: "--ui-highlight", value: "9px" })
  })

  it("a pointer:  its select points it at another colour", async () => {
    const { root, last } = await tokenRow({ ...ROW, pointer: { place: "brand.primary.color" } })
    send(root.querySelector(".pointer-editor ui-select")!, "ui-changed", { value: "brand.secondary.color" })
    expect(last()!.value).toContain("brand.secondary.color")
  })
})
