import { describe, expect, it, vi } from "vitest"
import { commands, userEvent } from "vitest/browser"

import { UI } from "$/runtime"
import type { OverlayEntry } from "$/runtime"
import { expectAccessible } from "$test/a11y"
import { Fixture } from "$test/fixture"
import type { UIDropdown } from "./index"

import { PerfRun } from "$shared/PerfRun.ts"
import type { PerfAdapter } from "$shared/shared.types.ts"

import "./index"

/** Element-markup examples, by path. */
const EXAMPLES = import.meta.glob<string>("./examples/*.html", { query: "?raw", import: "default", eager: true })

/** Render `html`, wait for its first update. */
async function render(html: string): Promise<UIDropdown> {
  const element = Fixture.render<UIDropdown>(html)
  await element.updateComplete
  return element
}

/** A colour dropdown with slotted items. */
function colors(attributes = "") {
  return render(`<ui-dropdown selection placeholder="Colour" ${attributes}>
    <ui-item>Red</ui-item><ui-item>Green</ui-item><ui-item value="b">Blue</ui-item><ui-item>Grey</ui-item>
  </ui-dropdown>`)
}

/** Shadow-root query. */
function $(element: UIDropdown, selector: string) {
  return element.shadowRoot!.querySelector<HTMLElement>(selector)
}

/** Rendered option texts. */
function items(element: UIDropdown): string[] {
  return [...element.shadowRoot!.querySelectorAll(".menu > .item")].map((item) => item.textContent!.trim())
}

/** The highlighted option's text. */
function highlighted(element: UIDropdown) {
  return $(element, ".menu > .selected.item")?.textContent?.trim()
}

/** Events of `type` fired on `element`, by detail. */
function record(element: UIDropdown, type: string) {
  const details: unknown[] = []
  element.addEventListener(type, (event) => details.push((event as CustomEvent).detail))
  return details
}

/** Type into the search input as a user would. */
async function type(element: UIDropdown, text: string) {
  await userEvent.type($(element, "input.search")!, text)
  await element.updateComplete
}

describe("<ui-dropdown> opening", () => {
  it("opens and closes with clicks on the trigger", async () => {
    const element = await colors()
    const opened = record(element, "ui-open")
    await userEvent.click($(element, "button.trigger")!)
    await element.updateComplete
    expect(element.open).toBe(true)
    expect($(element, ".menu")!.matches(":popover-open")).toBe(true)
    expect($(element, "button.trigger")!.getAttribute("aria-expanded")).toBe("true")
    expect(items(element)).toEqual(["Red", "Green", "Blue", "Grey"])
    expect(opened).toMatchObject([{ open: true }])
    await userEvent.click($(element, "button.trigger")!)
    await element.updateComplete
    expect(element.open).toBe(false)
    expect($(element, ".menu")!.matches(":popover-open")).toBe(false)
  })

  it("stays closed when ui-open is cancelled", async () => {
    const element = await colors()
    element.addEventListener("ui-open", (event) => event.preventDefault())
    await userEvent.click($(element, "button.trigger")!)
    await element.updateComplete
    expect(element.open).toBe(false)
  })

  it("opens from the open attribute (controlled)", async () => {
    const element = await colors("open")
    expect($(element, ".menu")!.matches(":popover-open")).toBe(true)
    element.open = false
    await element.updateComplete
    expect($(element, ".menu")!.matches(":popover-open")).toBe(false)
  })

  it("closes on an outside click", async () => {
    const element = await colors()
    const outside = Fixture.render(`<button style="position: fixed; right: 0; bottom: 0">outside</button>`)
    await userEvent.click($(element, "button.trigger")!)
    await element.updateComplete
    await userEvent.click(outside)
    await element.updateComplete
    expect(element.open).toBe(false)
  })

  it("closes on Escape only when it is the topmost overlay", async () => {
    const element = await colors()
    await userEvent.click($(element, "button.trigger")!)
    await userEvent.keyboard("{ArrowDown}") // a fresh user activation, so the next CloseWatcher isn't grouped
    const other = Fixture.render(`<div>other overlay</div>`)
    const dismissed = vi.fn()
    const entry: OverlayEntry = { element: other, kind: "popover", onDismiss: dismissed }
    UI.overlays.open(entry)
    await userEvent.keyboard("{Escape}")
    await element.updateComplete
    expect(dismissed).toHaveBeenCalledOnce()
    expect(element.open).toBe(true)
    UI.overlays.close(entry)
    await userEvent.keyboard("{Escape}")
    await element.updateComplete
    expect(element.open).toBe(false)
  })

  it("anchors the menu to its own root", async () => {
    const element = await colors("open")
    const root = element.shadowRoot!.firstElementChild as HTMLElement
    const anchor = root.style.getPropertyValue("--ui-dropdown-anchor")
    expect(anchor).toMatch(/^--ui-dropdown-\d+$/)
    const menu = $(element, ".menu")!
    expect(getComputedStyle(root).anchorName).toBe(anchor)
    expect(getComputedStyle(menu).positionAnchor).toBe(anchor)
  })
})

describe("<ui-dropdown> keyboard", () => {
  it("opens, moves and selects with arrows and Enter", async () => {
    const element = await colors()
    const changes = record(element, "ui-change")
    element.focus()
    await userEvent.keyboard("{ArrowDown}")
    await element.updateComplete
    expect(element.open).toBe(true)
    expect(highlighted(element)).toBe("Red")
    await userEvent.keyboard("{ArrowDown}{ArrowDown}")
    await element.updateComplete
    expect(highlighted(element)).toBe("Blue")
    const trigger = $(element, "button.trigger")!
    expect(trigger.getAttribute("aria-activedescendant")).toBe($(element, ".selected.item")!.id)
    await userEvent.keyboard("{End}")
    await element.updateComplete
    expect(highlighted(element)).toBe("Grey")
    await userEvent.keyboard("{Home}{ArrowDown}{Enter}")
    await element.updateComplete
    expect(element.value).toBe("Green")
    expect(element.open).toBe(false)
    expect(changes).toMatchObject([{ value: "Green" }])
    expect($(element, ".text")!.textContent!.trim()).toBe("Green")
  })

  it("type-ahead highlights by first letters", async () => {
    const element = await colors()
    element.focus()
    await userEvent.keyboard("g")
    await element.updateComplete
    expect(element.open).toBe(true)
    expect(highlighted(element)).toBe("Green")
    await userEvent.keyboard("g")
    await element.updateComplete
    expect(highlighted(element)).toBe("Grey")
  })

  it("PageDown / PageUp jump by ten", async () => {
    const element = await render(`<ui-dropdown selection placeholder="N"></ui-dropdown>`)
    element.options = Array.from({ length: 30 }, (_, index) => ({ value: `${index}`, text: `Item ${index}` }))
    element.focus()
    await userEvent.keyboard("{ArrowDown}{PageDown}")
    await element.updateComplete
    expect(highlighted(element)).toBe("Item 10")
    await userEvent.keyboard("{PageUp}")
    await element.updateComplete
    expect(highlighted(element)).toBe("Item 0")
  })
})

describe("<ui-dropdown> search", () => {
  it("filters as the user types, and fires ui-search", async () => {
    const element = await colors("search")
    const searches = record(element, "ui-search")
    await type(element, "gr")
    expect(element.open).toBe(true)
    expect(items(element)).toEqual(["Green", "Grey"])
    expect($(element, ".menu mark")!.textContent).toBe("Gr")
    expect(searches.at(-1)).toMatchObject({ query: "gr" })
    expect($(element, ".text")!.classList.contains("filtered")).toBe(true)
    await userEvent.keyboard("{ArrowDown}{Enter}")
    await element.updateComplete
    expect(element.value).toBe("Grey")
  })

  it("shows the no-results message", async () => {
    const element = await colors("search")
    await type(element, "xyz")
    expect($(element, ".menu > .message")!.textContent!.trim()).toBe("No results found.")
  })

  it("offers additions and fires ui-add", async () => {
    const element = await colors("search allow-additions")
    const added = record(element, "ui-add")
    await type(element, "Teal")
    expect($(element, ".menu > .addition.item")!.textContent!.replace(/\s+/g, " ").trim()).toBe("Add Teal")
    await userEvent.keyboard("{Enter}")
    await element.updateComplete
    expect(element.value).toBe("Teal")
    expect(added).toMatchObject([{ value: "Teal" }])
    expect(element.optionFor("Teal")?.text).toBe("Teal")
  })
})

describe("<ui-dropdown> multiple", () => {
  it("adds labels, removes them by click and by Backspace", async () => {
    const element = await colors("multiple search")
    const removed = record(element, "ui-remove")
    await type(element, "re")
    await userEvent.keyboard("{Enter}")
    await element.updateComplete
    await type(element, "bl")
    await userEvent.keyboard("{Enter}")
    await element.updateComplete
    expect(element.value).toEqual(["Red", "b"])
    const labels = () =>
      [...element.shadowRoot!.querySelectorAll(".ui.label")].map((label) => label.textContent!.trim())
    expect(labels()).toEqual(["Red", "Blue"])
    expect(items(element)).not.toContain("Red")
    await userEvent.keyboard("{Backspace}")
    await element.updateComplete
    expect(element.value).toEqual(["Red"])
    $(element, ".ui.label > .delete.icon")!.click()
    await element.updateComplete
    expect(element.value).toEqual([])
    expect(removed).toMatchObject([{ value: "b" }, { value: "Red" }])
  })

  it("respects max-selections", async () => {
    const element = await colors("multiple max-selections=1")
    element.focus()
    await userEvent.keyboard("{ArrowDown}{Enter}{ArrowDown}{Enter}")
    await element.updateComplete
    expect(element.value).toEqual(["Red"])
  })
})

describe("<ui-dropdown> value", () => {
  it("clears with the clear button", async () => {
    const element = await colors(`clearable value="Red"`)
    const changes = record(element, "ui-change")
    $(element, ".remove.icon")!.click()
    await element.updateComplete
    expect(element.value).toBe("")
    expect(changes).toMatchObject([{ value: "" }])
    expect($(element, ".remove.icon")).toBeNull()
  })

  it("follows a host-set value, and lets the host revert a user choice", async () => {
    const element = await colors()
    element.value = "b"
    await element.updateComplete
    expect($(element, ".text")!.textContent!.trim()).toBe("Blue")
    element.addEventListener("ui-change", () => (element.value = "b"))
    element.focus()
    await userEvent.keyboard("{ArrowDown}{Home}{Enter}")
    await element.updateComplete
    expect(element.value).toBe("b")
    expect($(element, ".text")!.textContent!.trim()).toBe("Blue")
  })

  it("merges slotted items and the options property", async () => {
    const element = await colors("open")
    element.options = [{ value: "o", text: "Orange" }]
    await element.updateComplete
    expect(items(element)).toEqual(["Red", "Green", "Blue", "Grey", "Orange"])
    element.querySelector("ui-item")!.remove()
    await new Promise((resolve) => setTimeout(resolve))
    await element.updateComplete
    expect(items(element)).toEqual(["Green", "Blue", "Grey", "Orange"])
  })

  it("takes its value from selected items", async () => {
    const element = await render(`<ui-dropdown><ui-item>A</ui-item><ui-item selected>B</ui-item></ui-dropdown>`)
    expect(element.value).toBe("B")
  })
})

describe("<ui-dropdown> forms", () => {
  it("submits one entry per value, resets, and validates required", async () => {
    const form = Fixture.render<HTMLFormElement>(`<form>
      <ui-dropdown name="colors" multiple required value="Red,b">
        <ui-item>Red</ui-item><ui-item value="b">Blue</ui-item><ui-item>Green</ui-item>
      </ui-dropdown></form>`)
    const element = form.querySelector<UIDropdown>("ui-dropdown")!
    await element.updateComplete
    expect(new FormData(form).getAll("colors")).toEqual(["Red", "b"])
    expect(element.checkValidity()).toBe(true)
    element.value = []
    await element.updateComplete
    expect(new FormData(form).getAll("colors")).toEqual([])
    expect(element.checkValidity()).toBe(false)
    expect(element.validity.valueMissing).toBe(true)
    expect(element.matches(":state(invalid)")).toBe(true)
    form.reset()
    await element.updateComplete
    expect(new FormData(form).getAll("colors")).toEqual(["Red", "b"])
  })

  it("is disabled by a disabled fieldset", async () => {
    const fieldset = Fixture.render(`<fieldset disabled><ui-dropdown name="x" value="a"></ui-dropdown></fieldset>`)
    const element = fieldset.querySelector<UIDropdown>("ui-dropdown")!
    await element.updateComplete
    expect($(element, "button.trigger")!.hasAttribute("disabled")).toBe(true)
    expect(element.matches(":state(disabled)")).toBe(true)
  })
})

describe("<ui-dropdown> accessibility", () => {
  it.each(Object.keys(EXAMPLES))("passes axe on %s", async (path) => {
    const root = Fixture.render(EXAMPLES[path]!)
    const elements = [...root.querySelectorAll<UIDropdown>("ui-dropdown")]
    await Promise.all(elements.map((element) => element.updateComplete))
    await expectAccessible(root, AXE_OPTIONS)
  })
})

describe("<ui-dropdown> performance", () => {
  it("filters 1000 options in under a frame per keystroke (shared PerfRun)", async () => {
    const element = await render(`<ui-dropdown search selection placeholder="Search"></ui-dropdown>`)
    const result = await PerfRun.run(element, LIT_SETTLE)
    await PerfRun.save(
      { spike: "Lit", where: "vitest browser mode", build: "dev (Vite dev server)", result },
      commands.writeFile
    )
    expect(result.open.rows).toBe(PerfRun.count)
    expect(result.keystrokes.at(-1)!.rows).toBeLessThan(PerfRun.count)
    expect(result.update.avg).toBeLessThan(16)
  })
})

/**
 * NOTE: `color-contrast` is off, as in the button tests:  palette tokens, not the element (`REPORT.md`).
 */
const AXE_OPTIONS = { rules: { "color-contrast": { enabled: false } } }

/** Lit's `PerfAdapter`:  the DOM is up to date once `updateComplete` resolves. */
const LIT_SETTLE: PerfAdapter = { settle: (element) => (element as UIDropdown).updateComplete }

describe("<ui-dropdown> markup contract", () => {
  it("keeps the caret :empty and orders the root's children", async () => {
    const element = await colors(`multiple search clearable value="Red"`)
    const caret = $(element, ".dropdown.icon")!
    expect(caret.matches(":empty")).toBe(true)
    const order = [...element.shadowRoot!.firstElementChild!.children].map((child) => child.className)
    expect(order).toEqual(["ui label", "search", "sizer", "default text", "remove icon", "dropdown icon", "menu"])
  })

  it("renders the icon slot inside .dropdown.icon only while it's occupied", async () => {
    const element = await colors()
    const caret = () => $(element, ".dropdown.icon")!
    expect(caret().querySelector("slot")).toBeNull()
    const icon = document.createElement("span")
    icon.slot = "icon"
    icon.textContent = "v"
    element.append(icon)
    await new Promise((resolve) => setTimeout(resolve))
    await element.updateComplete
    expect(caret().querySelector("slot[name=icon]")).not.toBeNull()
    expect(caret().matches(":empty")).toBe(false)
    icon.remove()
    await new Promise((resolve) => setTimeout(resolve))
    await element.updateComplete
    expect(caret().matches(":empty")).toBe(true)
  })

  it("forwards the host's aria-label to the combobox, and follows changes", async () => {
    const element = await colors(`aria-label="Favourite colour"`)
    expect($(element, "[role=combobox]")!.getAttribute("aria-label")).toBe("Favourite colour")
    element.setAttribute("aria-label", "Colour")
    await element.updateComplete
    expect($(element, "[role=combobox]")!.getAttribute("aria-label")).toBe("Colour")
  })
})
