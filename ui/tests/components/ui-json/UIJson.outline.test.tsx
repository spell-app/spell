import { describe, expect, onTestFinished, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMJsonElement, JsonNavigateDetail } from "spell/ui/components/ui-json"

import "spell/ui/components/ui-json"
import "spell/ui/components/ui-input"
import "spell/ui/components/ui-select"
import "spell/ui/components/ui-checkbox"

/** Render `<ui-json>` markup, settled. */
async function json(html: string) {
  const element = await ElementFixture.render<DOMJsonElement>(html)
  await ElementFixture.settle()
  return element
}

/** Its outline's lines, as text. */
function lines(element: Element): string[] {
  return [...element.shadowRoot!.querySelectorAll<HTMLElement>("[part~=row]")].map((row) => row.textContent ?? "")
}

/** Its open / close buttons. */
function toggles(element: Element): HTMLButtonElement[] {
  return [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>("button[part~=toggle]")]
}

/** The span showing `text`, a key or a value. */
function span(element: Element, text: string): HTMLElement {
  const found = [...element.shadowRoot!.querySelectorAll<HTMLElement>(".link")].find(
    (each) => each.textContent === text
  )
  if (!found) throw new Error(`no span "${text}" in ${JSON.stringify(lines(element))}`)
  return found
}

/** Double-click `target`, then wait for its editor. */
async function startEditing(element: Element, target: HTMLElement) {
  target.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, composed: true }))
  await ElementFixture.settle()
  const editor = element.shadowRoot!.querySelector<HTMLElement & { value: unknown; ready: Promise<void> }>(
    "[part~=editor]"
  )!
  await editor.ready
  await ElementFixture.settle()
  return editor
}

/** Press `key` in `editor`. */
async function press(editor: HTMLElement, key: string) {
  editor.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true }))
  await ElementFixture.settle()
}

const NESTED = `{ "name": "a", "inner": { "deep": { "deeper": 1 } }, "list": [1, 2, 3] }`

describe("<ui-json> outline", () => {
  test("opens to `depth`:  the top level by default, nested values closed on one line", async () => {
    const element = await json(`<ui-json>${NESTED}</ui-json>`)
    expect(lines(element)).toEqual([
      "{",
      '"name": "a",',
      '"inner": { "deep": { "deeper": 1 } },',
      '"list": [ 1, 2, 3 ]',
      "}"
    ])
    expect(toggles(element).map((button) => button.getAttribute("aria-expanded"))).toEqual(["true", "false", "false"])
  })

  test('`depth="0"`:  everything closed;  a toggle opens one level', async () => {
    const element = await json(`<ui-json depth="0">${NESTED}</ui-json>`)
    expect(lines(element)).toHaveLength(1)
    toggles(element)[0]!.click()
    await ElementFixture.settle()
    expect(lines(element)).toHaveLength(5)
  })

  test("Alt-click opens a whole branch", async () => {
    const element = await json(`<ui-json depth="0">${NESTED}</ui-json>`)
    toggles(element)[0]!.dispatchEvent(new MouseEvent("click", { altKey: true, bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect(toggles(element).every((button) => button.getAttribute("aria-expanded") === "true")).toBe(true)
    expect(lines(element)).toContain('"deeper": 1')
  })

  test("a closed line's preview is cut, `...` in place of what doesn't fit", async () => {
    const many = JSON.stringify({ list: Array.from({ length: 200 }, (_, index) => index) })
    const element = await json(`<ui-json style="width: 300px">${many}</ui-json>`)
    const preview = element.shadowRoot!.querySelector("[part~=preview]")!.textContent!
    expect(preview).toMatch(/^\[ 0, 1, 2, .*, \.\.\. \]$/)
    expect(preview.length).toBeLessThan(60)
  })

  test('`quotes="no"`:  keys JSON5-style;  Copy is still real JSON', async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
    onTestFinished(() => writeText.mockRestore())
    const element = await json(`<ui-json quotes="no">{ "name": "a", "two words": 2 }</ui-json>`)
    expect(lines(element)).toEqual(["{", 'name: "a",', '"two words": 2', "}"])
    const copied = vi.fn()
    element.addEventListener("ui-copied", (event) => copied((event as CustomEvent).detail.content))
    expect(await element.copy()).toBe(true)
    expect(JSON.parse(copied.mock.calls[0]![0])).toEqual({ name: "a", "two words": 2 })
  })

  test("the quotes button turns quotes off and on", async () => {
    const element = await json(`<ui-json>{ "name": "a" }</ui-json>`)
    const quotes = element.shadowRoot!.querySelector<HTMLElement>("ui-button.quotes")!
    // its inner button says whether it's pressed:  a `toggle`
    const pressed = () => quotes.shadowRoot!.querySelector("button")!.getAttribute("aria-pressed")
    expect(pressed()).toBe("true")
    quotes.click()
    await ElementFixture.settle()
    expect(element.getAttribute("quotes")).toBe("no")
    expect(pressed()).toBe("false")
    expect(lines(element)[1]).toBe('name: "a"')
    quotes.click()
    await ElementFixture.settle()
    expect(element.hasAttribute("quotes")).toBe(false)
    expect(pressed()).toBe("true")
  })

  test("the header's buttons:  each inner button is part `header-button`;  the quotes button shows an icon", async () => {
    const element = await json(`<ui-json>{ "name": "a" }</ui-json>`)
    const buttons = [...element.shadowRoot!.querySelectorAll<HTMLElement>("ui-button.tool")]
    expect(buttons.map((button) => button.getAttribute("exportparts"))).toEqual([
      "button: header-button",
      "button: header-button"
    ])
    const quotes = element.shadowRoot!.querySelector<HTMLElement>("ui-button.quotes")!
    expect(quotes.getAttribute("icon")).toBe("quote-left")
    expect(quotes.querySelector(".glyph")).toBeNull()
  })

  test("nothing to show:  says so", async () => {
    const element = await json(`<ui-json></ui-json>`)
    expect(element.shadowRoot!.querySelector(".empty")?.textContent).toBe("No data")
  })

  test("text that isn't JSON shows why", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())
    const element = await json(`<ui-json>{ not json }</ui-json>`)
    await ElementFixture.settle()
    expect(element.shadowRoot!.querySelector("[part~=error]")?.textContent).toMatch(/^This isn't JSON:  /)
  })
})

describe("<ui-json> ui-navigating", () => {
  test("a click on a key or value says which, by its path", async () => {
    const element = await json(`<ui-json depth="2">{ "inner": { "id": "x1" }, "list": [10, 20] }</ui-json>`)
    const navigated: JsonNavigateDetail[] = []
    element.addEventListener("ui-navigating", (event) => navigated.push((event as CustomEvent).detail))
    span(element, '"x1"').click()
    span(element, '"inner"').click()
    span(element, "20").click()
    expect(navigated).toEqual([
      { path: ["inner", "id"], key: "id", value: "x1", part: "value" },
      { path: ["inner"], key: "inner", value: { id: "x1" }, part: "key" },
      { path: ["list", 1], key: 1, value: 20, part: "value" }
    ])
  })

  test("`editable`:  a double-click sends none", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
    onTestFinished(() => {
      vi.useRealTimers()
    })
    const element = await json(`<ui-json editable>{ "id": "x1" }</ui-json>`)
    const navigated = vi.fn()
    element.addEventListener("ui-navigating", navigated)
    span(element, '"id"').dispatchEvent(new MouseEvent("click", { detail: 1, bubbles: true, composed: true }))
    vi.advanceTimersByTime(1000)
    expect(navigated).toHaveBeenCalledTimes(1)
    const value = span(element, '"x1"')
    value.dispatchEvent(new MouseEvent("click", { detail: 1, bubbles: true, composed: true }))
    value.dispatchEvent(new MouseEvent("click", { detail: 2, bubbles: true, composed: true }))
    value.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, composed: true }))
    vi.advanceTimersByTime(1000)
    expect(navigated).toHaveBeenCalledTimes(1)
  })
})

describe("<ui-json editable>", () => {
  test("not editable:  a double-click does nothing", async () => {
    const element = await json(`<ui-json>{ "id": "x1" }</ui-json>`)
    span(element, '"x1"').dispatchEvent(new MouseEvent("dblclick", { bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect(element.shadowRoot!.querySelector("[part~=editor]")).toBeNull()
  })

  test("a string:  a text field;  Enter keeps it, as a string, and `ui-changed` says so", async () => {
    const element = await json(`<ui-json editable>{ "id": "x1", "n": 1 }</ui-json>`)
    const changed = vi.fn()
    element.addEventListener("ui-changed", (event) => changed((event as CustomEvent).detail.value))
    const editor = await startEditing(element, span(element, '"x1"'))
    expect(editor.localName).toBe("ui-input")
    expect(editor.getAttribute("type")).toBe("text")
    editor.value = "12"
    await press(editor, "Enter")
    expect(element.value).toEqual({ id: "12", n: 1 })
    expect(changed).toHaveBeenCalledWith({ id: "12", n: 1 })
    expect(element.dirty).toBe(true)
  })

  test("an edit of a `value` set is an edit:  `ui-changed`, `dirty`, its text written;  the object given untouched", async () => {
    const element = await json(`<ui-json editable></ui-json>`)
    const data = { id: "x1", n: 1 }
    element.value = data
    await ElementFixture.settle()
    expect(element.dirty).toBe(false)
    const changed = vi.fn()
    element.addEventListener("ui-changed", (event) => changed((event as CustomEvent).detail.value))
    const editor = await startEditing(element, span(element, '"x1"'))
    editor.value = "y2"
    await press(editor, "Enter")
    expect(element.value).toEqual({ id: "y2", n: 1 })
    expect(JSON.parse(element.content)).toEqual({ id: "y2", n: 1 })
    expect(changed).toHaveBeenCalledWith({ id: "y2", n: 1 })
    expect(element.dirty).toBe(true)
    expect(data).toEqual({ id: "x1", n: 1 })
  })

  test("Escape drops the edit", async () => {
    const element = await json(`<ui-json editable>{ "id": "x1" }</ui-json>`)
    const editor = await startEditing(element, span(element, '"x1"'))
    editor.value = "changed"
    await press(editor, "Escape")
    expect(element.value).toEqual({ id: "x1" })
    expect(element.shadowRoot!.querySelector("[part~=editor]")).toBeNull()
  })

  test("a number:  a number field, kept as a number", async () => {
    const element = await json(`<ui-json editable>{ "n": 1 }</ui-json>`)
    const editor = await startEditing(element, span(element, "1"))
    expect(editor.getAttribute("type")).toBe("number")
    editor.value = "2.5"
    await press(editor, "Enter")
    expect(element.value).toEqual({ n: 2.5 })
  })

  test("a text field grows as it's typed", async () => {
    const element = await json(`<ui-json editable>{ "id": "x1" }</ui-json>`)
    const editor = await startEditing(element, span(element, '"x1"'))
    expect(editor.style.getPropertyValue("--edit-chars")).toBe("4")
    const input = editor.shadowRoot!.querySelector("input")!
    input.value = "a much longer id"
    input.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
    expect(editor.style.getPropertyValue("--edit-chars")).toBe("17")
  })

  test("`null`:  a JSON field;  what reads as JSON is kept as JSON, the rest as a string", async () => {
    const element = await json(`<ui-json editable>{ "a": null, "b": null }</ui-json>`)
    const a = await startEditing(element, span(element, "null"))
    expect(a.getAttribute("type")).toBe("text")
    expect(a.value).toBe("null")
    a.value = "[1, 2]"
    await press(a, "Enter")
    const b = await startEditing(element, span(element, "null"))
    b.value = "not json"
    await press(b, "Enter")
    expect(element.value).toEqual({ a: [1, 2], b: "not json" })
  })

  test("a key typed with quotes is read as JSON:  the quotes aren't kept", async () => {
    const element = await json(`<ui-json editable>{ "old": 1 }</ui-json>`)
    const editor = await startEditing(element, span(element, '"old"'))
    editor.value = '"new"'
    await press(editor, "Enter")
    expect(element.value).toEqual({ new: 1 })
  })

  test("a date, and a date and time:  date pickers, written back in the same form", async () => {
    const element = await json(`<ui-json editable>{ "day": "2026-11-18", "at": "2026-11-18T10:00:00Z" }</ui-json>`)
    const day = await startEditing(element, span(element, '"2026-11-18"'))
    expect(day.getAttribute("type")).toBe("date")
    day.value = "2026-12-01"
    await press(day, "Enter")
    const at = await startEditing(element, span(element, '"2026-11-18T10:00:00Z"'))
    expect(at.getAttribute("type")).toBe("datetime-local")
    expect(at.value).toBe("2026-11-18T10:00:00")
    at.value = "2026-11-18T11:30"
    await press(at, "Enter")
    expect(element.value).toEqual({ day: "2026-12-01", at: "2026-11-18T11:30:00Z" })
  })

  test("true or false:  a checkbox, kept at once", async () => {
    const element = await json(`<ui-json editable>{ "on": false }</ui-json>`)
    const editor = await startEditing(element, span(element, "false"))
    expect(editor.localName).toBe("ui-checkbox")
    editor.click()
    await ElementFixture.settle()
    expect(element.value).toEqual({ on: true })
  })

  test("a key `editors` gives choices:  a pick list", async () => {
    const element = await json(`<ui-json editable>{ "direction": "in" }</ui-json>`)
    ;(element as unknown as { editors: unknown }).editors = { direction: ["in", "out", "inout"] }
    await ElementFixture.settle()
    const editor = await startEditing(element, span(element, '"in"'))
    expect(editor.localName).toBe("ui-select")
    const select = editor.shadowRoot!.querySelector("select")!
    expect([...select.options].map((option) => option.value).filter(Boolean)).toEqual(["in", "out", "inout"])
    select.value = "out"
    select.dispatchEvent(new Event("change", { bubbles: true }))
    await ElementFixture.settle()
    expect(element.value).toEqual({ direction: "out" })
  })

  test("a key:  renamed in its place, and what was open under it stays open", async () => {
    const element = await json(`<ui-json editable depth="0">{ "a": 1, "old": { "b": 2 }, "z": 3 }</ui-json>`)
    toggles(element)[0]!.click()
    await ElementFixture.settle()
    toggles(element)[1]!.click()
    await ElementFixture.settle()
    const editor = await startEditing(element, span(element, '"old"'))
    editor.value = "new"
    await press(editor, "Enter")
    expect(Object.keys(element.value as object)).toEqual(["a", "new", "z"])
    expect(lines(element)).toContain('"b": 2')
  })
})
