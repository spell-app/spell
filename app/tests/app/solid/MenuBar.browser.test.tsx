import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { flush } from "solid-js"
import { render } from "@solidjs/web"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { editor, type EditorStore } from "spell/app/app/editor"
import { editorPrefs } from "spell/app/app/editorPrefs"
import { AppBarMenus, BarMenu, CodeSettings, ProjectBarMenu, SpellBarMenu, uiReady } from "spell/app/app/solid"
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
      !!row.shadowRoot?.querySelector("[part~=flyout] > ui-menu[ticks]") ||
      !!row.querySelector(":scope > ui-menu[ticks]")
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
    // Owen, epic `mockup`:  exactly these;  Discard Changes under Save (Owen, epic `editor` I96)
    expect(items.map((item) => item.trim())).toEqual([
      `New Spell File ${EDITOR_HOTKEYS.createFile.shortcut}`,
      "New CSS File",
      "─",
      `Save ${EDITOR_HOTKEYS.saveAll.shortcut}`,
      `Discard Changes ${EDITOR_HOTKEYS.revertChanges.shortcut}`,
      "AutoSave",
      "─",
      "Duplicate File"
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

  test("Help:  the tours (P40), then Keyboard Shortcuts, its key ?, opening the shortcuts dialog, and All Icons (T158), each group under a tight divider (epic `editor` P36, I375)", async () => {
    const showShortcuts = spyOnEditor("showShortcuts")
    const host = await mount(() => <AppBarMenus mode="edit" />)
    const popup = host.querySelector<HTMLElement & { visible: boolean }>("ui-popup[for=HelpBarMenu]")!
    popup.visible = true
    flush()
    const menu = () => popup.querySelector("ui-menu.BarMenuItems")
    await waitForCondition(() => !!menu()?.children.length)
    await rowsReady(menu()!)
    // the editor's own rows, not the Spell's:  their words are their text
    const rows = [...menu()!.children].map((row) =>
      row.getAttribute("kind") === "divider"
        ? "─"
        : `${row.textContent?.trim()} ${row.getAttribute("shortcut") ?? ""}`.trim()
    )
    // Owen's order (I375):  the tours first;  Spell Servers… after the last divider only where a keeper runs, none here
    expect(rows).toEqual([
      "Design Tour",
      "Anatomy Tour",
      "Inspect App Tour",
      "Tours…",
      "─",
      `Keyboard Shortcuts ${EDITOR_HOTKEYS.showShortcuts.shortcut}`,
      `All Icons… ${EDITOR_HOTKEYS.showIcons.shortcut}`,
      "─"
    ])
    expect(EDITOR_HOTKEYS.showShortcuts.shortcut).toBe("?")
    const shortcuts = menu()!.children[5] as HTMLElement
    shortcuts.shadowRoot!.querySelector<HTMLElement>("[part~=item]")!.click()
    flush()
    await waitForCondition(() => showShortcuts.mock.calls.length > 0)
    expect(popup.visible).toBe(false)
  })

  test("View:  Run, Edit, Site, Preview ─ Add a View… ─ Code, Compiled Code, Inspector, Anatomy, Program Panel ─ Line Numbers, Soft Wrap;  Soft Wrap turns long lines' wrapping on and off, ticked while on, remembered", async () => {
    const wrappedBefore = CodeSettings.choices.wrapLines
    cleanups.push(() => CodeSettings.choose("wrapLines", wrappedBefore))
    CodeSettings.choose("wrapLines", false)
    const host = await mount(() => <AppBarMenus mode="edit" />)
    const popup = host.querySelector<HTMLElement & { visible: boolean }>("ui-popup[for=ViewBarMenu]")!
    popup.visible = true
    flush()
    const menu = () => popup.querySelector("ui-menu.BarMenuItems")
    await waitForCondition(() => !!menu()?.children.length)
    await rowsReady(menu()!)
    const rows = [...menu()!.children].map((row) => (row.getAttribute("kind") === "divider" ? "─" : rowText(row)))
    // Owen, epic `editor` T100:  Inspector after Compiled Code, in one group with Program Panel;  Soft Wrap under Line Numbers
    // Anatomy after the Inspector (P34);  Add a View…, the add panel, on its own (T167)
    expect(rows).toEqual([
      "Run",
      "Edit",
      "Site",
      "Preview",
      "─",
      "Add a View…",
      "─",
      "Code",
      "Compiled Code",
      "Inspector",
      "Anatomy",
      "Program Panel",
      "─",
      "Line Numbers",
      "Soft Wrap"
    ])

    // its row's button, pressed (ticked) while wrapping's on
    const softWrap = () => menu()!.lastElementChild!.shadowRoot!.querySelector<HTMLElement>("[part~=item]")!
    const ticked = () => softWrap().getAttribute("aria-pressed") === "true"
    expect(ticked()).toBe(false)
    // chosen:  wrapping on, the same choice Code Editor Settings… shows, and remembered
    softWrap().click()
    flush()
    await waitForCondition(() => CodeSettings.choices.wrapLines)
    expect(editorPrefs.get("codeWrapLines")).toBe(true)
    await waitForCondition(ticked)
    // chosen again:  off
    popup.visible = true
    flush()
    softWrap().click()
    flush()
    await waitForCondition(() => !CodeSettings.choices.wrapLines)
    expect(editorPrefs.get("codeWrapLines")).toBe(false)
    await waitForCondition(() => !ticked())
  })
})

describe("<SpellBarMenu>", () => {
  test("its top row:  Home, About Spell…, Spell UI (Owen's order, I329);  Spell UI opens Spell UI's site in the editor (T55)", async () => {
    const showSpellUI = spyOnEditor("showSpellUI", () => {})
    const host = await mount(() => <SpellBarMenu />)
    const popup = host.querySelector<HTMLElement & { visible: boolean }>("ui-popup[for=SpellBarMenu]")!
    popup.visible = true
    flush()
    const found = () => popup.querySelector("ui-menu.SpellMenuHome")
    await waitForCondition(() => !!found()?.querySelector("ui-action:not([kind])"))
    const row = found()!
    await rowsReady(row)
    const items = [...row.children].map((item) => (item.getAttribute("kind") === "divider" ? "─" : rowText(item)))
    expect(items).toEqual(["Home", "About Spell…", "Spell UI", "─"])
    const spellUI = [...row.querySelectorAll<HTMLElement>("ui-action")].find((item) => rowText(item) === "Spell UI")!
    spellUI.shadowRoot!.querySelector<HTMLElement>("[part~=item]")!.click()
    flush()
    await waitForCondition(() => showSpellUI.mock.calls.length > 0)
    expect(showSpellUI).toHaveBeenCalledTimes(1)
  })
})

describe("<ProjectBarMenu>", () => {
  test("everything about the whole project:  its name's actions, Publish, Versions and Delete Draft, its settings, Export and Import, its theme (Home is the Spell menu's)", async () => {
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
      expect.stringMatching(/^Theme/)
    ])
    // Theme ›:  Spell UI's theme menu in its menu mode, then Edit Theme, written inside its row
    const theme = menu.querySelector("ui-submenu")!
    expect(theme.hasAttribute("menu")).toBe(false)
    expect(theme.querySelector("ui-theme-menu")?.getAttribute("show")).toBe("menu")
    expect(theme.querySelector("ui-theme-menu")?.getAttribute("bench")).toBe("none")
  })

  test("Theme ›'s end:  a divider, then Edit Theme and Theme Bench, none between, each opening a new window", async () => {
    vi.stubEnv("SPELL_PAGE_SERVER", "http://127.0.0.1:4747")
    cleanups.push(() => vi.unstubAllEnvs())
    const opened = vi.spyOn(window, "open").mockReturnValue(null)
    cleanups.push(() => opened.mockRestore())
    const host = await mount(() => <ProjectBarMenu />)
    const found = () => host.querySelector("ui-popup[for=ProjectBarMenu] ui-menu.BarMenuItems ui-submenu")
    await waitForCondition(() => !!found()?.children.length)
    const theme = found()!
    await rowsReady(theme)
    const rows = [...theme.children].map((row) =>
      row.localName === "ui-theme-menu" ? "theme menu" : row.getAttribute("kind") === "divider" ? "─" : row.textContent
    )
    expect(rows).toEqual(["theme menu", "─", "Edit Theme", "Theme Bench"])
    const [edit, bench] = [...theme.querySelectorAll<HTMLElement>(":scope > ui-action:not([kind])")]
    expect([edit!.getAttribute("icon"), bench!.getAttribute("icon")]).toEqual([
      "external alternate",
      "external alternate"
    ])

    // Edit Theme:  the theme editor's page, in a new window;  this one stays where it is
    const before = location.href
    edit!.shadowRoot!.querySelector<HTMLElement>("[part~=item]")!.click()
    flush()
    await waitForCondition(() => opened.mock.calls.length === 1)
    expect(opened.mock.calls[0]).toEqual([new URL("/theme", location.href).href, "_blank", "noopener"])
    expect(location.href).toBe(before)

    // Theme Bench:  Spell UI's theme bench on the page server, in the theme chosen, its app page alone
    bench!.shadowRoot!.querySelector<HTMLElement>("[part~=item]")!.click()
    flush()
    await waitForCondition(() => opened.mock.calls.length === 2)
    const [address, target, features] = opened.mock.calls[1]!
    const url = new URL(String(address))
    expect([url.origin + url.pathname, url.searchParams.get("pages"), target, features]).toEqual([
      "http://127.0.0.1:4747/components/ui/theme-bench",
      "app",
      "_blank",
      "noopener"
    ])
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
