import { describe, expect, it, vi } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"
import type { ActionToDraw, UIAction } from "spell/ui/components/ui-action"
import { UIItem } from "spell/ui/components/ui-item"
import { UI } from "spell/ui/core"

import "spell/ui/components/ui-action"
import "spell/ui/components/ui-menu"

/** A `<ui-action>`'s DOM element, with its `action` property. */
type ActionElement = DOMElement & { component: UIAction; action?: ActionToDraw }

/** Render `markup` in a vertical menu;  returns its actions and each one's item box. */
async function menuOf(markup: string) {
  const box = await ElementFixture.render(`<ui-menu direction="vertical" aria-label="Game">${markup}</ui-menu>`)
  const actions = [...box.querySelectorAll<ActionElement>("ui-action")]
  const boxOf = (action: ActionElement) => action.shadowRoot!.querySelector<HTMLElement>("[part~=item]")!
  return { actions, boxOf }
}

/** An action whose state a test changes:  `enabled`, `selected`, and how often it ran. */
function testAction(title = "Turn Card") {
  const state = { enabled: true, selected: false, runs: 0, title }
  const action: ActionToDraw = {
    get title() {
      return state.title
    },
    icon: "undo",
    shortcut: "mod+shift+Z",
    get isEnabled() {
      return state.enabled
    },
    get isSelected() {
      return state.selected
    },
    run: () => state.runs++
  }
  return { state, action }
}

describe("<ui-action>", () => {
  it("is an item:  a menu draws it as one, a button with its title and its shortcut's key caps", async () => {
    const { actions, boxOf } = await menuOf('<ui-action icon="play" shortcut="mod+N">New game</ui-action>')
    const [action] = actions
    expect(action!.component).toBeInstanceOf(UIItem)
    const item = boxOf(action!)
    expect(item.localName).toBe("button")
    expect(item.className).toContain("item")
    const caps = [...item.querySelectorAll("[part~=shortcut] kbd")].map((cap) => cap.textContent)
    expect(caps).toEqual([UI.browser.isApple ? "⌘" : "Ctrl", "N"])
    await expectAccessible(action!.closest("ui-menu")!)
  })

  it("draws its `action` property, live:  title, greyed while not enabled, ticked while selected", async () => {
    const { actions, boxOf } = await menuOf("<ui-action></ui-action>")
    const element = actions[0]!
    const { state, action } = testAction("Undo Turn Card")
    element.action = action
    await ElementFixture.settle()
    expect(boxOf(element).textContent).toContain("Undo Turn Card")
    expect(element.matches(":state(disabled)")).toBe(false)
    element.action = { ...action, isEnabled: false, isSelected: true, title: "Undo Deal", run: action.run }
    await ElementFixture.settle()
    expect(boxOf(element).textContent).toContain("Undo Deal")
    expect(element.matches(":state(disabled)")).toBe(true)
    expect(element.matches(":state(selected)")).toBe(true)
    // a plain menu's button is disabled outright;  a menubar's item says so with `aria-disabled`
    expect((boxOf(element) as HTMLButtonElement).disabled).toBe(true)
    expect(state.runs).toBe(0)
  })

  it("a click runs its action, unless it can't be done", async () => {
    const { actions, boxOf } = await menuOf("<ui-action></ui-action>")
    const element = actions[0]!
    const { state, action } = testAction()
    element.action = action
    await ElementFixture.settle()
    boxOf(element).click()
    expect(state.runs).toBe(1)
    element.action = { ...action, isEnabled: false, run: action.run }
    await ElementFixture.settle()
    boxOf(element).click()
    expect(state.runs).toBe(1)
  })

  it("icon-only:  its icon alone, its title and keys its tooltip, its title its name;  side by side in a menu", async () => {
    const { actions, boxOf } = await menuOf(
      '<ui-action icon="undo" icon-only shortcut="mod+Z">Undo</ui-action>' +
        '<ui-action icon="redo" icon-only>Redo</ui-action>' +
        "<ui-action icon-only>Restart</ui-action>"
    )
    const [undo, redo, restart] = actions.map((action) => ({ action, box: boxOf(action) }))
    expect(undo!.action.matches(":state(icon-only)")).toBe(true)
    expect(undo!.box.classList.contains("icon")).toBe(true)
    expect(undo!.box.querySelector<HTMLElement>("[part~=title]")!.offsetWidth).toBe(0)
    expect(undo!.box.querySelector("[part~=shortcut]")).toBeNull()
    expect(undo!.box.title).toBe(`Undo (${UI.browser.isApple ? "⌘Z" : "Ctrl+Z"})`)
    expect(undo!.box.getAttribute("aria-label")).toBe("Undo")
    expect(redo!.box.title).toBe("Redo")
    // in one row:  Redo beside Undo, at its top
    const [undoBox, redoBox] = [undo!.box.getBoundingClientRect(), redo!.box.getBoundingClientRect()]
    expect(redoBox.left).toBeGreaterThanOrEqual(undoBox.right - 1)
    expect(Math.abs(redoBox.top - undoBox.top)).toBeLessThan(2)
    // no icon:  its title shows, as without `icon-only`
    expect(restart!.action.matches(":state(icon-only)")).toBe(false)
    expect(restart!.box.querySelector<HTMLElement>("[part~=title]")!.offsetWidth).toBeGreaterThan(0)
    await expectAccessible(undo!.action.closest("ui-menu")!)
  })

  it("an action's title, under icon-only:  its tooltip and its name", async () => {
    const { actions, boxOf } = await menuOf("<ui-action icon-only></ui-action>")
    const element = actions[0]!
    element.action = { ...testAction("Undo Turn Card").action, shortcut: undefined }
    await ElementFixture.settle()
    expect(boxOf(element).querySelector<HTMLElement>("[part~=title]")!.offsetWidth).toBe(0)
    expect(boxOf(element).getAttribute("aria-label")).toBe("Undo Turn Card")
    expect(boxOf(element).title).toBe("Undo Turn Card")
  })

  it("key caps, as <ui-keys> draws them:  mod is command on a Mac, control elsewhere;  meta the Meta key", async () => {
    const { actions } = await menuOf("<ui-action>Go</ui-action>")
    const component = actions[0]!.component
    const isApple = vi.spyOn(UI.browser, "isApple", "get")
    isApple.mockReturnValue(true)
    expect(component.keyCapsFor("mod+shift+z")).toEqual(["⌘", "⇧", "Z"])
    expect(component.keyCapsFor("meta+K")).toEqual(["⌘", "K"])
    expect(component.keyCapsFor("option+F2")).toEqual(["⌥", "F2"])
    isApple.mockReturnValue(false)
    expect(component.keyCapsFor("mod+shift+z")).toEqual(["Ctrl", "Shift", "Z"])
    expect(component.keyCapsFor("meta+K")).toEqual(["Meta", "K"])
    expect(component.keyCapsFor("space")).toEqual(["Space"])
    isApple.mockRestore()
  })
})
