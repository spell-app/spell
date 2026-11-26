import { describe, expect, onTestFinished, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { SolidDiagnostics } from "spell/test-helpers/SolidDiagnostics"
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

/** The span showing `text`, a key or a value:  one that navigates (`.link`), or opens what it names (`.opens`). */
function span(element: Element, text: string): HTMLElement {
  const found = [...element.shadowRoot!.querySelectorAll<HTMLElement>(".link, .opens")].find(
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

  test("Copy, pressed, makes no reactive write inside a computation", async () => {
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
    onTestFinished(() => writeText.mockRestore())
    const element = await json(`<ui-json>{ "name": "a" }</ui-json>`)
    const copied = vi.fn()
    element.addEventListener("ui-copied", copied)
    // Solid's dev build reports a write inside a computation as `REACTIVE_WRITE_IN_OWNED_SCOPE`
    await SolidDiagnostics.expectNone(
      async () => {
        element.shadowRoot!.querySelector<HTMLElement>("ui-button.copy")!.click()
        await vi.waitFor(() => expect(copied).toHaveBeenCalled())
        await ElementFixture.settle()
      },
      { only: ["REACTIVE_WRITE_IN_OWNED_SCOPE"] }
    )
    // the inner button's name follows the change, the write told a moment later
    const copy = element.shadowRoot!.querySelector("ui-button.copy")!
    expect(copy.shadowRoot!.querySelector("button")!.getAttribute("aria-label")).toBe("Copied")
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
    span(element, '"id"').click()
    span(element, "20").click()
    expect(navigated).toEqual([
      { path: ["inner", "id"], key: "id", value: "x1", part: "value" },
      { path: ["inner", "id"], key: "id", value: "x1", part: "key" },
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

describe("<ui-json> a key or closed line opens it", () => {
  test("a click on a closed object's key opens it, and a second closes it;  it sends no `ui-navigating`", async () => {
    const element = await json(`<ui-json>${NESTED}</ui-json>`)
    const navigated = vi.fn()
    element.addEventListener("ui-navigating", navigated)
    const key = span(element, '"inner"')
    expect(key.getAttribute("aria-expanded")).toBe("false")
    key.click()
    await ElementFixture.settle()
    expect(lines(element)).toContain('"deep": { "deeper": 1 }')
    expect(toggles(element)[1]!.getAttribute("aria-expanded")).toBe("true")
    expect(key.getAttribute("aria-expanded")).toBe("true")
    span(element, '"inner"').click()
    await ElementFixture.settle()
    expect(lines(element)).toContain('"inner": { "deep": { "deeper": 1 } },')
    expect(navigated).not.toHaveBeenCalled()
  })

  test("a click on a closed line, `{ ... }`, opens it", async () => {
    const element = await json(`<ui-json>${NESTED}</ui-json>`)
    const previews = [...element.shadowRoot!.querySelectorAll<HTMLElement>("[part~=preview]")]
    expect(previews.map((preview) => preview.textContent)).toEqual(['{ "deep": { "deeper": 1 } }', "[ 1, 2, 3 ]"])
    previews[1]!.click()
    await ElementFixture.settle()
    expect(lines(element)).toEqual(expect.arrayContaining(['"list": [', "1,", "3", "]"]))
  })

  test("Enter or Space on a key opens and closes it", async () => {
    const element = await json(`<ui-json>${NESTED}</ui-json>`)
    const key = span(element, '"inner"')
    expect(key.tabIndex).toBe(0)
    expect(key.getAttribute("role")).toBe("button")
    key.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect(lines(element)).toContain('"deep": { "deeper": 1 }')
    span(element, '"inner"').dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect(lines(element)).not.toContain('"deep": { "deeper": 1 }')
  })

  test("a click on a leaf opens nothing, and still sends `ui-navigating`", async () => {
    const element = await json(`<ui-json>${NESTED}</ui-json>`)
    const navigated = vi.fn()
    element.addEventListener("ui-navigating", navigated)
    const before = lines(element)
    span(element, '"a"').click()
    span(element, '"name"').click()
    await ElementFixture.settle()
    expect(lines(element)).toEqual(before)
    expect(navigated).toHaveBeenCalledTimes(2)
  })
})

const PORTS = JSON.stringify({
  name: "source",
  ports: { g: { type: "electrical", attrs: { width: 2, unit: "um" }, direction: "in" }, h: { type: "optical" } }
})

/** Wide enough for each closed line to show all it holds. */
const WIDE = "display: block; width: 1200px;"

/** The member shown in a closed line's preview whose text starts `text`. */
function member(element: Element, text: string): HTMLElement {
  const found = [...element.shadowRoot!.querySelectorAll<HTMLElement>("[part~=preview] .member")].find((each) =>
    each.textContent!.startsWith(text)
  )
  if (!found) throw new Error(`no member "${text}" in ${JSON.stringify(lines(element))}`)
  return found
}

/** Is the line whose text starts `text` open? */
function isOpen(element: Element, text: string): boolean {
  const row = [...element.shadowRoot!.querySelectorAll<HTMLElement>("[part~=row]")].find((each) =>
    each.textContent!.startsWith(text)
  )
  return row?.querySelector("[part~=toggle]")?.getAttribute("aria-expanded") === "true"
}

/** Settled, and a frame drawn:  `openTo()` shows what it opened just before the next paint. */
async function shown() {
  await ElementFixture.settle()
  await new Promise((resolve) => requestAnimationFrame(resolve))
}

describe("<ui-json> a click in a closed line opens the way down to it", () => {
  test("a nested `{ ... }` opens every level down to it, and it ends up open", async () => {
    const element = await json(`<ui-json style="${WIDE}">${PORTS}</ui-json>`)
    expect(isOpen(element, '"ports"')).toBe(false)
    const attrs = member(element, '"attrs"')
    expect(attrs.textContent).toBe('"attrs": { ... }')
    const braces = [...attrs.querySelectorAll<HTMLElement>(".punct")].find((each) => each.textContent === "{ ... }")!
    braces.click()
    await shown()
    expect(isOpen(element, '"ports"')).toBe(true)
    expect(isOpen(element, '"g"')).toBe(true)
    expect(isOpen(element, '"attrs"')).toBe(true)
    expect(isOpen(element, '"h"')).toBe(false)
    expect(lines(element)).toEqual(expect.arrayContaining(['"width": 2,', '"unit": "um"']))
  })

  test("a nested key opens down to it", async () => {
    const element = await json(`<ui-json style="${WIDE}">${PORTS}</ui-json>`)
    const key = [...member(element, '"g"').querySelectorAll<HTMLElement>(".key")].find(
      (each) => each.textContent === '"g"'
    )!
    key.click()
    await shown()
    expect(isOpen(element, '"ports"')).toBe(true)
    expect(isOpen(element, '"g"')).toBe(true)
    expect(isOpen(element, '"attrs"')).toBe(false)
  })

  test("it lands on the target:  its key focused, its line scrolled into view", async () => {
    const tall = JSON.stringify({ filler: Array.from({ length: 80 }, (_, index) => index), ...JSON.parse(PORTS) })
    const element = await json(`<ui-json depth="2" style="${WIDE} height: 200px; overflow: auto">${tall}</ui-json>`)
    const navigated = vi.fn()
    element.addEventListener("ui-navigating", navigated)
    // `depth="2"`:  the filler is open, so `g`'s closed line sits far below the fold
    member(element, '"attrs"').click()
    await shown()
    const focused = element.shadowRoot!.activeElement as HTMLElement
    expect(focused.textContent).toBe('"attrs"')
    const row = focused.closest<HTMLElement>("[part~=row]")!
    // its light, `.found`, is motion:  over at once here, with animations off
    expect(row.textContent).toBe('"attrs": {')
    const box = element.getBoundingClientRect()
    const line = row.getBoundingClientRect()
    expect(line.top).toBeGreaterThanOrEqual(box.top - 1)
    expect(line.bottom).toBeLessThanOrEqual(box.bottom + 1)
    expect(navigated).not.toHaveBeenCalled()
  })

  test("a leaf opens down to its parent and sends no `ui-navigating`;  its own line then navigates", async () => {
    const element = await json(`<ui-json style="${WIDE}">${PORTS}</ui-json>`)
    const navigated = vi.fn()
    element.addEventListener("ui-navigating", navigated)
    member(element, '"h"').querySelector<HTMLElement>(".string")!.click()
    await shown()
    expect(isOpen(element, '"h"')).toBe(true)
    expect(navigated).not.toHaveBeenCalled()
    expect((element.shadowRoot!.activeElement as HTMLElement).textContent).toBe('"h"')
    span(element, '"optical"').click()
    expect(navigated).toHaveBeenCalledTimes(1)
  })

  test("a click on the line outside any member still opens just the line", async () => {
    const element = await json(`<ui-json style="${WIDE}">${PORTS}</ui-json>`)
    const preview = element.shadowRoot!.querySelector<HTMLElement>("[part~=preview]")!
    ;(preview.firstElementChild as HTMLElement).click()
    await shown()
    expect(isOpen(element, '"ports"')).toBe(true)
    expect(isOpen(element, '"g"')).toBe(false)
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
