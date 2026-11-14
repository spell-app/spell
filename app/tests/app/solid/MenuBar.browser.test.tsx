import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { flush } from "solid-js"
import { render } from "@solidjs/web"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { editor, type EditorStore } from "spell/app/app/editor"
import { AppBarMenus, BarMenu, ProjectBarMenu, uiReady } from "spell/app/app/solid"
import { EDITOR_HOTKEYS } from "spell/app/app/pages/editorHotkeys"

/**
 * The top bar's menus (`MenuBar.tsx`, epic `debut` P32), in the browser:
 * each item a `<ui-action>` with its key, the same as `EDITOR_HOTKEYS`' own;  choosing one runs it and closes its menu.
 * - The project menu and File · Edit · View · Run are drawn in Spell, `SpellEditor.spell` (epic `editor` P29):
 *   each row an `<action>` of the editor's app, in a Spell UI menu.
 */

/** Undo for each test:  unmount, restore `editor` fields. */
const cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
})

describe("<AppBarMenus>", () => {
  test("File · Edit · View · Run · Help, each a button;  File's items, their keys from EDITOR_HOTKEYS", async () => {
    const host = await mount(() => <AppBarMenus mode="edit" />)
    // the bar's menus are Spell's, SpellEditor.spell's:  loaded a moment after the page, Help after it
    const names = () =>
      [...host.querySelectorAll(".AppBarMenus ui-item.BarMenu")].map((item) => item.textContent?.trim())
    await waitForCondition(() => names().length === 5)
    expect(names()).toEqual(["File", "Edit", "View", "Run", "Help"])
    // on a tablet's width they fold into one ☰ menu, each a sub-menu, from the same Spell (epic `editor` I46)
    // each a `<ui-submenu>` row, its rows written inside it:  no menu named by id
    const folded = [...host.querySelectorAll("ui-popup[for=FoldedBarMenu] ui-menu.BarMenuItems > ui-submenu")]
    expect(folded.map((row) => [row.getAttribute("label"), row.hasAttribute("menu")])).toEqual([
      ["File", false],
      ["Edit", false],
      ["View", false],
      ["Run", false],
      ["Help", false]
    ])
    await waitForCondition(() => folded.every((row) => row.children.length > 0))
    // File and View tick what's on, as the bar's own do:  the Spell's menu written inside the row has `ticks`
    const ticks = (row: Element) =>
      !!row.shadowRoot?.querySelector("[part~=flyout] > ui-menu[ticks]") || !!row.querySelector(":scope > ui-menu[ticks]")
    await ElementFixture.settle(host)
    expect(folded.map((row) => [row.getAttribute("label"), ticks(row)])).toEqual([
      ["File", true],
      ["Edit", false],
      ["View", true],
      ["Run", false],
      ["Help", false]
    ])

    const file = () => host.querySelector("ui-popup[for=FileBarMenu] ui-menu.BarMenuItems")
    await waitForCondition(() => !!file()?.children.length)
    await rowsReady(file()!)
    const items = [...file()!.children].map((item) =>
      item.getAttribute("kind") === "divider" ? "─" : `${rowText(item)} ${item.getAttribute("shortcut") ?? ""}`
    )
    // Owen, epic `mockup`:  exactly these;  Revert Changes names the file open, when there is one
    expect(items.map((item) => item.trim())).toEqual([
      `New Spell File ${EDITOR_HOTKEYS.createFile.shortcut}`,
      "New CSS File",
      "─",
      `Save ${EDITOR_HOTKEYS.saveAll.shortcut}`,
      "AutoSave",
      "─",
      "Duplicate File",
      `Revert Changes ${EDITOR_HOTKEYS.revertChanges.shortcut}`
    ])
    expect(EDITOR_HOTKEYS.createFile.shortcut).toBe("alt+mod+N")

    // every key the Spell names is the one the page's keys run:  Edit's and Run's too
    const keysOf = async (id: string) => {
      const menu = () => host.querySelector(`ui-popup[for=${id}] ui-menu.BarMenuItems`)
      await waitForCondition(() => !!menu()?.children.length)
      return [...menu()!.querySelectorAll(":scope > ui-action[shortcut]")].map((row) => row.getAttribute("shortcut"))
    }
    expect(await keysOf("EditBarMenu")).toEqual(
      expect.arrayContaining([EDITOR_HOTKEYS.undo.shortcut, EDITOR_HOTKEYS.find.shortcut])
    )
    expect(await keysOf("RunBarMenu")).toEqual([
      EDITOR_HOTKEYS.compileApp.shortcut,
      EDITOR_HOTKEYS.stopInspecting.shortcut
    ])
  })

  test("choosing an item runs it, and closes its menu", async () => {
    const saveAll = spyOnEditor("saveAll", () => Promise.resolve())
    const host = await mount(() => <AppBarMenus mode="edit" />)
    const popup = host.querySelector<HTMLElement & { visible: boolean }>("ui-popup[for=FileBarMenu]")!
    popup.visible = true
    flush()
    await waitForCondition(() => !!popup.querySelector("ui-action:not([kind])"))
    await rowsReady(popup)
    const save = [...popup.querySelectorAll<HTMLElement>("ui-action")].find((item) => rowText(item) === "Save")!
    // the row's own button, as a person presses it:  its action runs through the core
    save.shadowRoot!.querySelector<HTMLElement>("[part~=item]")!.click()
    flush()
    await waitForCondition(() => saveAll.mock.calls.length > 0)
    expect(saveAll).toHaveBeenCalledTimes(1)
    expect(popup.visible).toBe(false)
  })
})

describe("<ProjectBarMenu>", () => {
  test("everything about the whole project:  its name's actions, Publish, Versions and Delete Draft, its settings, Export and Import, its theme, Home", async () => {
    const host = await mount(() => <ProjectBarMenu />)
    const found = () => host.querySelector("ui-popup[for=ProjectBarMenu] ui-menu.BarMenuItems")
    await waitForCondition(() => !!found()?.children.length)
    const menu = found()!
    await rowsReady(menu)
    // a `<ui-submenu>`'s words are its `label`
    const items = [...menu.children].map((item) =>
      item.getAttribute("kind") === "divider" ? "─" : (item.getAttribute("label") ?? rowText(item))
    )
    expect(items).toEqual([
      expect.stringMatching(/^Rename/),
      expect.stringMatching(/^Delete/),
      expect.stringMatching(/^Duplicate/),
      "Reset to Saved",
      "─",
      "Publish",
      "Versions",
      "Delete Draft",
      "─",
      "Project Settings",
      "─",
      expect.stringMatching(/^Export/),
      expect.stringMatching(/^Import/),
      "─",
      expect.stringMatching(/^Theme/),
      "─",
      "Home"
    ])
    // Theme ›:  Spell UI's theme menu in its menu mode, then Edit Theme…, written inside its row
    const theme = menu.querySelector("ui-submenu")!
    expect(theme.hasAttribute("menu")).toBe(false)
    expect(theme.querySelector("ui-theme-menu")?.getAttribute("show")).toBe("menu")
    expect(theme.lastElementChild?.textContent?.trim()).toMatch(/^Edit theme/)
  })
})

describe("<BarMenu>", () => {
  test("a <ui-submenu> row opens its fly-out, and stays;  choosing an action in it closes the menu", async () => {
    const chosen = vi.fn()
    const host = await mount(() => (
      <BarMenu id="TestBarMenu" label="Test" name="Test">
        <ui-action kind="divider" />
        <ui-action>One</ui-action>
        <ui-submenu label="More">
          <ui-action onClick={chosen}>Deeper</ui-action>
        </ui-submenu>
      </BarMenu>
    ))
    // a divider left first hides itself
    expect(getComputedStyle(host.querySelector("ui-menu.BarMenuItems > ui-action[kind=divider]")!).display).toBe("none")

    const popup = host.querySelector<HTMLElement & { visible: boolean }>("ui-popup[for=TestBarMenu]")!
    popup.visible = true
    flush()
    await ElementFixture.settle(host)
    const submenu = host.querySelector("ui-submenu")!
    const flyout = submenu.shadowRoot!.querySelector<HTMLElement>("[part~=flyout]")!
    expect(flyout.matches(":popover-open")).toBe(false)

    // its row clicked:  the fly-out opens beside it, and the menu stays open
    submenu.shadowRoot!.querySelector<HTMLElement>("[part~=item]")!.click()
    flush()
    await ElementFixture.settle(host)
    expect(flyout.matches(":popover-open")).toBe(true)
    expect(popup.visible).toBe(true)

    // an action in the fly-out:  it runs, and the whole menu closes
    submenu.querySelector<HTMLElement>("ui-action")!.click()
    flush()
    await ElementFixture.settle(host)
    expect(chosen).toHaveBeenCalledTimes(1)
    expect(popup.visible).toBe(false)
  })
})

////////////////
// ## Helpers
////////////////

/** Render `component` into a fresh `<div>` in the page, wait for its `<ui-*>` elements;  unmounted after the test. */
async function mount(component: () => unknown): Promise<HTMLElement> {
  await uiReady
  const host = document.createElement("div")
  document.body.append(host)
  const dispose = render(component as () => never, host)
  cleanups.push(() => {
    dispose()
    host.remove()
  })
  flush()
  await ElementFixture.settle(host)
  return host
}

/** Replace `editor[key]` with a spy (calling `implementation`), restored after the test. */
function spyOnEditor<K extends keyof EditorStore>(key: K, implementation?: (...args: never[]) => unknown) {
  const spy = vi.fn(implementation)
  const before = editor[key]
  editor[key] = spy as unknown as EditorStore[K]
  cleanups.push(() => (editor[key] = before))
  return spy
}

/** A menu's row's words:  a Spell row's title is its `<ui-action>`'s own, drawn from its action. */
function rowText(row: Element): string {
  return (row.shadowRoot?.querySelector("[part~=title]")?.textContent ?? row.textContent ?? "").trim()
}

/** Wait for each of `menu`'s rows to have drawn. */
async function rowsReady(menu: Element): Promise<void> {
  await Promise.all([...menu.children].map((row) => Promise.resolve((row as { ready?: Promise<void> }).ready)))
  flush()
}

/** Wait for `condition`, as the editor's Spell loads:  throws after 10s. */
async function waitForCondition(condition: () => boolean): Promise<void> {
  const started = Date.now()
  while (!condition()) {
    if (Date.now() - started > 10_000) throw new Error("waitForCondition():  timed out")
    await new Promise((resolve) => setTimeout(resolve, 50))
    flush()
  }
}
