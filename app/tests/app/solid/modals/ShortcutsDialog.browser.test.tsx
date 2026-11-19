import { afterEach, describe, expect, test } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"
import { flush } from "solid-js"
import { render } from "@solidjs/web"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { APP_TEXTS } from "spell/app/app/ui/AppTexts.en"
import { appTextsEs } from "spell/app/app/ui/AppTexts.es"
import { uiReady } from "spell/app/app/solid"
import { openShortcuts, shortcutRows } from "spell/app/app/solid/modals"
import { EDITOR_HOTKEYS, HOTKEY_GROUPS, editorHotkeys, type ListedHotkey } from "spell/app/app/pages/editorHotkeys"

/**
 * The Keyboard Shortcuts dialog (`<ShortcutsDialog>`, epic `editor` P36), in the browser:
 * - it lists the editor's one list of shortcuts, every one, each with a name and a group in English and Spanish
 * - ? opens it (not while typing), search narrows it, Escape and its ✕ close it
 */

/** A `<ui-modal>` host, as the tests poke it. */
type Modal = HTMLElement & { visible: boolean }

/** Undo for each test. */
const cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
  // a failed test may leave its dialog open:  don't let it block the next one
  for (const modal of document.querySelectorAll<Modal>("ui-modal")) modal.remove()
  for (const root of document.querySelectorAll(".ShortcutsDialogRoot")) root.remove()
})

describe("the one list", () => {
  test("every shortcut has a group and a name, in English and Spanish, and the dialog draws a row for it", () => {
    const spanish = appTextsEs.texts as Record<string, string>
    const groups = Object.keys(HOTKEY_GROUPS)
    for (const [key, hotkey] of Object.entries(EDITOR_HOTKEYS) as [string, ListedHotkey][]) {
      expect(groups, key).toContain(hotkey.group)
      for (const text of [hotkey.name, hotkey.where, HOTKEY_GROUPS[hotkey.group]]) {
        if (!text) continue
        expect(APP_TEXTS[text], `${key}:  ${text}`).toBeTruthy()
        expect(spanish[text], `${key}:  ${text} in Spanish`).toBeTruthy()
      }
      // a row with its name, holding its key:  on a Mac and off one
      for (const isApple of [true, false]) {
        const row = shortcutRows(isApple).find((it) => it.group === hotkey.group && it.name === hotkey.name)
        expect(row, key).toBeDefined()
        expect(row!.shortcut.split(" "), key).toEqual(
          expect.arrayContaining(((isApple && hotkey.mac) || hotkey.shortcut).split(" "))
        )
      }
    }
  })
})

describe("<ShortcutsDialog>", () => {
  test("? opens it:  every group, each row its keys;  not while typing in a field", async () => {
    await mountHotkeys()
    const field = document.createElement("input")
    document.body.append(field)
    cleanups.push(() => field.remove())
    field.focus()
    await userEvent.keyboard("?")
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(document.querySelector("ui-modal.ShortcutsDialog")).toBeNull()

    field.blur()
    await userEvent.keyboard("?")
    const modal = await current()
    expect(modal.getAttribute("heading")).toBe("Keyboard Shortcuts")
    expect(modal.hasAttribute("closable")).toBe(true)
    expect(headings(modal)).toEqual(Object.values(HOTKEY_GROUPS).map((key) => APP_TEXTS[key]))
    expect(modal.querySelectorAll(".ShortcutsRow").length).toBe(shortcutRows(false).length)
    const save = modal.querySelector(`.ShortcutsRow[data-name=save] ui-keys`)!
    expect(save.getAttribute("shortcut")).toBe("mod+S")
    // Delete is one row:  Backspace and Delete
    expect(modal.querySelectorAll(".ShortcutsRow[data-name=menuDelete]").length).toBe(1)
    // its search field has the focus
    await expect.poll(() => document.activeElement?.closest?.(".ShortcutsSearch")).toBeTruthy()
  })

  test('search:  "step" leaves the step debugger\'s four rows;  keys as drawn match;  nothing found says so', async () => {
    void openShortcuts({ platform: "other" })
    const modal = await current()
    await expect.poll(() => document.activeElement?.closest?.(".ShortcutsSearch")).toBeTruthy()
    await userEvent.keyboard("step")
    await expect.poll(() => names(modal)).toEqual(["Continue", "Step Over", "Step Into", "Step Out"])
    expect(headings(modal)).toEqual(["The step debugger"])

    await type(modal, "Ctrl S")
    await expect.poll(() => names(modal)).toEqual(["Save"])
    await type(modal, "F5")
    await expect.poll(() => names(modal)).toEqual(["Continue"])
    await type(modal, "zebra")
    await expect
      .poll(() => modal.querySelector(".ShortcutsNone")?.textContent)
      .toBe("No shortcut matches “zebra”.\nTry another word.")
    expect(names(modal)).toEqual([])
  })

  test("a Mac's keys:  ⌘S matches Save;  Expand Selection is ⌃⇧⌘→", async () => {
    void openShortcuts({ platform: "apple" })
    const modal = await current()
    expect(
      modal.querySelector(".ShortcutsRow[data-name=shortcutExpandSelection] ui-keys")!.getAttribute("shortcut")
    ).toBe("ctrl+shift+mod+ArrowRight")
    await type(modal, "⌘S")
    await expect.poll(() => names(modal)).toEqual(["Save"])
  })

  test("Escape closes it, and so does its ✕", async () => {
    const closing = openShortcuts()
    await current()
    await userEvent.keyboard("{Escape}")
    await closing
    expect(document.querySelector("ui-modal.ShortcutsDialog")).toBeNull()

    const again = openShortcuts()
    const modal = await current()
    modal.shadowRoot!.querySelector<HTMLElement>("[part~=close]")!.click()
    await again
    expect(document.querySelector("ui-modal.ShortcutsDialog")).toBeNull()
  })
})

////////////////
// ## Helpers
////////////////

/** Turn the editor page's keys on, as `<SpellEditor>` does;  off after the test. */
async function mountHotkeys(): Promise<void> {
  await uiReady
  const host = document.createElement("div")
  document.body.append(host)
  const dispose = render(() => {
    editorHotkeys(() => false)
    return null
  }, host)
  cleanups.push(() => {
    dispose()
    host.remove()
  })
  flush()
  // its keys are registered once Spell UI has loaded
  await new Promise((resolve) => setTimeout(resolve, 50))
}

/** The dialog, once it shows. */
async function current(): Promise<Modal> {
  await expect
    .poll(() => document.querySelector<Modal>("ui-modal.ShortcutsDialog")?.visible, { timeout: 5000 })
    .toBe(true)
  const modal = document.querySelector<Modal>("ui-modal.ShortcutsDialog")!
  await ElementFixture.settle(modal)
  return modal
}

/** Its headings, in order. */
function headings(modal: Modal): string[] {
  return [...modal.querySelectorAll(".ShortcutsGroup h3")].map((heading) => heading.textContent ?? "")
}

/** Its rows' names, in order. */
function names(modal: Modal): string[] {
  return [...modal.querySelectorAll(".ShortcutsName")].map((name) => name.textContent ?? "")
}

/** Type `text` in its search field, in place of what's there. */
async function type(modal: Modal, text: string): Promise<void> {
  const search = modal.querySelector<HTMLElement>(".ShortcutsSearch")!
  search.focus()
  await userEvent.keyboard("{Control>}a{/Control}{Meta>}a{/Meta}{Backspace}")
  await userEvent.keyboard(text)
}
