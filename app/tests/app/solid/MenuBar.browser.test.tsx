import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { flush } from "solid-js"
import { render } from "@solidjs/web"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { editor, type EditorStore } from "spell/app/app/editor"
import { AppBarMenus, BarMenu, ProjectBarMenu, uiReady } from "spell/app/app/solid"
import { EDITOR_HOTKEYS } from "spell/app/app/pages/editorHotkeys"

/**
 * The top bar's menus (`MenuBar.tsx`, epic `debut` P32), in the browser:
 * each item a `<ui-action>` with its key from `EDITOR_HOTKEYS`;  choosing one runs it and closes its menu.
 */

/** Undo for each test:  unmount, restore `editor` fields. */
const cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
})

describe("<AppBarMenus>", () => {
  test("File · Edit · View · Run · Help, each a button;  File's items, their keys from EDITOR_HOTKEYS", async () => {
    const host = await mount(() => <AppBarMenus mode="edit" />)
    // the bar is Spell's, AppMenus.spell's bar menu:  loaded a moment after the page, Help after it
    const names = () =>
      [...host.querySelectorAll(".AppBarMenus ui-item.BarMenu")].map((item) => item.textContent?.trim())
    await waitForCondition(() => names().length === 5)
    expect(names()).toEqual(["File", "Edit", "View", "Run", "Help"])
    // on a tablet's width they fold into one ☰ menu, each a sub-menu, from the same Spell (epic `editor` I46)
    // each a `<ui-submenu>` row, its fly-out a menu of the panel's own, by id
    const folded = [...host.querySelectorAll("ui-popup[for=FoldedBarMenu] ui-menu.BarMenuItems > ui-submenu")]
    expect(folded.map((row) => [row.getAttribute("label"), row.getAttribute("menu")])).toEqual([
      ["File", "FoldedFileBarMenu"],
      ["Edit", "FoldedEditBarMenu"],
      ["View", "FoldedViewBarMenu"],
      ["Run", "FoldedRunBarMenu"],
      ["Help", "FoldedHelpBarMenu"]
    ])
    // File and View tick what's on, as the bar's own do
    const ticked = [...host.querySelectorAll("ui-popup[for=FoldedBarMenu] ui-menu.BarFlyout")].map((menu) => [
      menu.id,
      menu.hasAttribute("ticks")
    ])
    expect(ticked).toEqual([
      ["FoldedFileBarMenu", true],
      ["FoldedEditBarMenu", false],
      ["FoldedViewBarMenu", true],
      ["FoldedRunBarMenu", false],
      ["FoldedHelpBarMenu", false]
    ])

    const file = host.querySelector("ui-popup[for=FileBarMenu] ui-menu.BarMenuItems")!
    await waitForCondition(() => file.children.length > 0)
    const items = [...file.children].map((item) =>
      item.getAttribute("kind") === "divider"
        ? "─"
        : `${item.textContent?.trim()} ${item.getAttribute("shortcut") ?? ""}`
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
  })

  test("choosing an item runs it, and closes its menu", async () => {
    const saveAll = spyOnEditor("saveAll", () => Promise.resolve())
    const host = await mount(() => <AppBarMenus mode="edit" />)
    const popup = host.querySelector<HTMLElement & { visible: boolean }>("ui-popup[for=FileBarMenu]")!
    popup.visible = true
    flush()
    await waitForCondition(() => !!popup.querySelector("ui-action"))
    const save = [...popup.querySelectorAll<HTMLElement>("ui-action")].find(
      (item) => item.textContent?.trim() === "Save"
    )!
    save.click()
    flush()
    expect(saveAll).toHaveBeenCalledTimes(1)
    expect(popup.visible).toBe(false)
  })
})

describe("<ProjectBarMenu>", () => {
  test("everything about the whole project:  its name's actions, Publish, Versions and Delete Draft, its settings, Export and Import, its theme, Home", async () => {
    const host = await mount(() => <ProjectBarMenu />)
    const menu = host.querySelector("ui-popup[for=ProjectBarMenu] ui-menu.BarMenuItems")!
    await waitForCondition(() => menu.children.length > 0)
    // a `<ui-submenu>`'s words are its `label`
    const items = [...menu.children].map((item) =>
      item.getAttribute("kind") === "divider" ? "─" : (item.getAttribute("label") ?? item.textContent?.trim() ?? "")
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
    // Theme ›:  Spell UI's theme menu in its menu mode, then Edit Theme…, in the fly-out its row names
    const theme = menu.querySelector("ui-submenu")!
    const flyout = host.querySelector(`ui-popup[for=ProjectBarMenu] ui-menu#${theme.getAttribute("menu")}`)!
    expect(flyout.querySelector("ui-theme-menu")?.getAttribute("show")).toBe("menu")
    expect(flyout.lastElementChild?.textContent?.trim()).toMatch(/^Edit theme/)
  })
})

describe("<BarMenu>", () => {
  test("a <ui-submenu> row opens its fly-out, and stays;  choosing an action in it closes the menu", async () => {
    const chosen = vi.fn()
    const host = await mount(() => (
      <BarMenu
        id="TestBarMenu"
        label="Test"
        name="Test"
        flyouts={() => (
          <ui-menu id="TestFlyout" popover="manual" direction="vertical" class="BarFlyout" aria-label="More">
            <ui-action onClick={chosen}>Deeper</ui-action>
          </ui-menu>
        )}
      >
        <ui-action kind="divider" />
        <ui-action>One</ui-action>
        <ui-submenu label="More" menu="TestFlyout" />
      </BarMenu>
    ))
    // a divider left first hides itself
    expect(getComputedStyle(host.querySelector("ui-menu.BarMenuItems > ui-action[kind=divider]")!).display).toBe("none")

    const popup = host.querySelector<HTMLElement & { visible: boolean }>("ui-popup[for=TestBarMenu]")!
    popup.visible = true
    flush()
    await ElementFixture.settle(host)
    const flyout = host.querySelector<HTMLElement>("#TestFlyout")!
    expect(flyout.matches(":popover-open")).toBe(false)

    // its row clicked:  the fly-out opens beside it, and the menu stays open
    host.querySelector("ui-submenu")!.shadowRoot!.querySelector<HTMLElement>("[part~=item]")!.click()
    flush()
    await ElementFixture.settle(host)
    expect(flyout.matches(":popover-open")).toBe(true)
    expect(popup.visible).toBe(true)

    // an action in the fly-out:  it runs, and the whole menu closes
    flyout.querySelector<HTMLElement>("ui-action")!.click()
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

/** Wait for `condition`, as a layout piece in Spell loads:  throws after 10s. */
async function waitForCondition(condition: () => boolean): Promise<void> {
  const started = Date.now()
  while (!condition()) {
    if (Date.now() - started > 10_000) throw new Error("waitForCondition():  timed out")
    await new Promise((resolve) => setTimeout(resolve, 50))
    flush()
  }
}
