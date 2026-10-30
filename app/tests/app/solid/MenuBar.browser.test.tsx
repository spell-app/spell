import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { flush } from "solid-js"
import { render } from "@solidjs/web"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { editor, type EditorStore } from "spell/app/app/editor"
import { AppBarMenus, BarMenu, uiReady } from "spell/app/app/solid"
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
    const names = [...host.querySelectorAll("ui-item.BarMenu")].map((item) => item.textContent?.trim())
    expect(names).toEqual(["File", "Edit", "View", "Run", "Help"])

    const file = host.querySelector("ui-popup[for=FileBarMenu] ui-menu.BarMenuItems")!
    const items = [...file.children].map((item) =>
      item.getAttribute("kind") === "divider"
        ? "─"
        : `${item.textContent?.trim()} ${item.getAttribute("shortcut") ?? ""}`
    )
    expect(items.map((item) => item.trim())).toEqual([
      `Save ${EDITOR_HOTKEYS.saveFile.shortcut}`,
      `Revert File ${EDITOR_HOTKEYS.revertFile.shortcut}`,
      "─",
      `New File ${EDITOR_HOTKEYS.createFile.shortcut}`,
      "Duplicate File",
      "Rename File",
      "Delete File"
    ])
  })

  test("choosing an item runs it, and closes its menu", async () => {
    const saveFile = spyOnEditor("saveFile", () => Promise.resolve())
    const host = await mount(() => <AppBarMenus mode="edit" />)
    const popup = host.querySelector<HTMLElement & { visible: boolean }>("ui-popup[for=FileBarMenu]")!
    popup.visible = true
    flush()
    const save = [...popup.querySelectorAll<HTMLElement>("ui-action")].find(
      (item) => item.textContent?.trim() === "Save"
    )!
    save.click()
    flush()
    expect(saveFile).toHaveBeenCalledTimes(1)
    expect(popup.visible).toBe(false)
  })
})

describe("<BarMenu>", () => {
  test("a sub-menu's panel shows while its row is chosen;  a divider left first hides itself", async () => {
    const host = await mount(() => (
      <BarMenu id="TestBarMenu" label="Test" name="Test" subMenus={{ more: () => <p class="MorePanel">more</p> }}>
        <ui-action kind="divider" />
        <ui-action>One</ui-action>
      </BarMenu>
    ))
    const panel = host.querySelector<HTMLElement>(".BarSubMenu[data-sub=more]")!
    expect(panel.hidden).toBe(true)
    expect(getComputedStyle(host.querySelector("ui-menu.BarMenuItems > ui-action[kind=divider]")!).display).toBe("none")
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
