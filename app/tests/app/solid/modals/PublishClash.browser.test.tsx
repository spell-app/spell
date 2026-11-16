import { afterEach, describe, expect, test } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { openPublishClash, type PublishClashFile } from "spell/app/app/solid/modals"

/**
 * Publish's clash dialog, `<PublishClash>`, in the browser (epic `editor` T101, I218):
 * yours left and theirs right, a tab per file, an arrow that takes their change and turns into an undo icon,
 * ⌘Z and ⇧⌘Z wherever the focus is, and "Use Their Changes" asked first.
 * - Its texts are plain lines, so the bubbly look draws nothing of Spell's own.
 */

/** A `<ui-modal>` host, as the tests poke it. */
type Modal = HTMLElement & { visible: boolean }

/** Two files, each changed on both sides:  two changes in the first, one in the second. */
const CLASHES: PublishClashFile[] = [
  {
    filePath: "/One.spell",
    theirs: "first theirs\nsame\nsame\nsame\nsame\nsame\nsame\nsame\nlast theirs\n",
    mine: "first mine\nsame\nsame\nsame\nsame\nsame\nsame\nsame\nlast mine\n"
  },
  { filePath: "/folder/Two.spell", theirs: "two theirs\n", mine: "two mine\n" }
]

afterEach(() => {
  // a failed test may leave its dialogs open:  don't let them block the next one
  for (const modal of document.querySelectorAll("ui-modal")) modal.remove()
  for (const root of document.querySelectorAll(".PublishClashRoot")) root.remove()
})

describe("<PublishClash>", () => {
  test("yours left, theirs right;  a tab per file, each showing its own diff", async () => {
    void openPublishClash(CLASHES)
    const modal = await clashDialog()
    expect(modal.getAttribute("heading")).toBe(
      "Some files have been changed since your draft began.  Keep the changes?"
    )
    expect(modal.hasAttribute("closable")).toBe(true)
    expect([...modal.querySelectorAll(".PublishClashSides h5")].map((h5) => h5.textContent)).toEqual([
      "Your Changes",
      "Current Published Version"
    ])
    const tabs = [...modal.querySelectorAll<HTMLElement & { selected: boolean }>(".PublishClashFiles ui-item")]
    expect(tabs.map((tab) => tab.textContent!.trim())).toEqual(["One.spell", "Two.spell"])
    expect(tabs.map((tab) => tab.selected)).toEqual([true, false])
    expect(shownFile(modal)).toContain("first mine")

    tabs[1]!.click()
    await expect.poll(() => tabs.map((tab) => tab.selected)).toEqual([false, true])
    await expect.poll(() => shownFile(modal)).toContain("two mine")
    expect(modal.querySelector(".PublishClashFiles")!.querySelector("ui-toolbar")!.hasAttribute("scroll-first")).toBe(
      true
    )
  })

  test("an arrow takes their change, and turns into an undo icon that puts yours back", async () => {
    void openPublishClash(CLASHES)
    const modal = await clashDialog()
    await expect.poll(() => arrows(modal).length).toBe(2)
    expect(arrows(modal)[0]!.querySelector("ui-icon")!.getAttribute("name")).toBe("arrow left")

    press(arrows(modal)[0]!)
    await expect.poll(() => shownFile(modal)).toContain("first theirs")
    await expect.poll(() => undoIcons(modal).length).toBe(1)
    expect(arrows(modal)).toHaveLength(1)
    expect(undoIcons(modal)[0]!.querySelector("ui-icon")!.getAttribute("name")).toBe("undo")

    press(undoIcons(modal)[0]!)
    await expect.poll(() => shownFile(modal)).toContain("first mine")
    await expect.poll(() => undoIcons(modal).length).toBe(0)
    expect(arrows(modal)).toHaveLength(2)
  })

  test("⌘Z and ⇧⌘Z undo and redo the arrows' changes, the focus anywhere (I218)", async () => {
    void openPublishClash(CLASHES)
    const modal = await clashDialog()
    await expect.poll(() => arrows(modal).length).toBe(2)
    press(lowest(arrows(modal)))
    await expect.poll(() => shownFile(modal)).toContain("last theirs")
    ;(document.activeElement as HTMLElement | null)?.blur()

    await userEvent.keyboard("{Control>}z{/Control}")
    await expect.poll(() => shownFile(modal)).toContain("last mine")
    await expect.poll(() => undoIcons(modal).length).toBe(0)

    await userEvent.keyboard("{Control>}{Shift>}z{/Shift}{/Control}")
    await expect.poll(() => shownFile(modal)).toContain("last theirs")
    await expect.poll(() => undoIcons(modal).length).toBe(1)
  })

  test("Publish My Changes publishes your side, with what you took", async () => {
    const answer = openPublishClash(CLASHES)
    const modal = await clashDialog()
    await expect.poll(() => arrows(modal).length).toBe(2)
    press(arrows(modal)[0]!)
    await expect.poll(() => shownFile(modal)).toContain("first theirs")
    const publish = modal.querySelector<HTMLElement>("ui-actions ui-button.approve")!
    expect(publish.textContent!.trim()).toBe("Publish My Changes")
    publish.click()
    const answered = await answer
    expect(answered?.choice).toBe("mine")
    if (answered?.choice !== "mine") return
    expect(answered.merged.get("/One.spell")).toBe(CLASHES[0]!.mine.replace("first mine", "first theirs"))
    expect(answered.merged.get("/folder/Two.spell")).toBe(CLASHES[1]!.mine)
  })

  test("Use Their Changes, red at the left, asks first:  Cancel keeps the dialog, OK takes theirs", async () => {
    const answer = openPublishClash(CLASHES)
    const modal = await clashDialog()
    const buttons = [...modal.querySelectorAll("ui-actions ui-button")].map((button) => button.textContent!.trim())
    expect(buttons).toEqual(["Use Their Changes", "Cancel", "Publish My Changes"])
    const useTheirs = modal.querySelector<HTMLElement>("ui-button.UseTheirs")!
    expect(useTheirs.getAttribute("color")).toBe("red")

    useTheirs.click()
    let asking = await newestModal(modal)
    expect(asking.textContent).toMatch(/Are you sure\?/)
    asking.querySelector<HTMLElement>(".cancel")!.click()
    await expect.poll(() => asking.isConnected).toBe(false)
    expect(modal.visible).toBe(true)

    useTheirs.click()
    asking = await newestModal(modal)
    asking.querySelector<HTMLElement>(".approve")!.click()
    expect(await answer).toEqual({ choice: "theirs" })
  })

  test("the ✕ is Cancel:  nothing", async () => {
    const answer = openPublishClash(CLASHES)
    const modal = await clashDialog()
    modal.shadowRoot!.querySelector<HTMLElement>("[part~='close']")!.click()
    expect(await answer).toBeUndefined()
  })
})

/** The clash dialog, once it shows and its first diff is drawn. */
async function clashDialog(): Promise<Modal> {
  await expect.poll(() => document.querySelector<Modal>("ui-modal.PublishClash")?.visible, { timeout: 5000 }).toBe(true)
  const modal = document.querySelector<Modal>("ui-modal.PublishClash")!
  await ElementFixture.settle(modal)
  await expect.poll(() => modal.querySelector(".cm-mergeView"), { timeout: 20_000 }).not.toBeNull()
  return modal
}

/** The newest `<ui-modal>` over `under`, once it shows:  the "Are you sure?" */
async function newestModal(under: Modal): Promise<Modal> {
  const newest = () => [...document.querySelectorAll<Modal>("ui-modal")].at(-1)
  await expect.poll(() => newest() !== under && newest()?.visible).toBe(true)
  const modal = newest()!
  await ElementFixture.settle(modal)
  return modal
}

/** The file showing:  its section. */
function shownSection(modal: Modal): HTMLElement {
  return modal.querySelector<HTMLElement>(".PublishClashFile:not([hidden])")!
}

/** Your side's text, in the file showing. */
function shownFile(modal: Modal): string {
  const view = shownSection(modal).querySelector(".cm-merge-a .cm-content")
  return [...(view?.querySelectorAll(".cm-line") ?? [])].map((line) => line.textContent).join("\n")
}

/** The arrows in the file showing's centre column. */
function arrows(modal: Modal): HTMLElement[] {
  return [...shownSection(modal).querySelectorAll<HTMLElement>(".cm-merge-revert button")]
}

/** The undo icons in the file showing's centre column. */
function undoIcons(modal: Modal): HTMLElement[] {
  return [...shownSection(modal).querySelectorAll<HTMLElement>(".cm-merge-taken button")]
}

/** The lowest of `buttons` on the page. */
function lowest(buttons: HTMLElement[]): HTMLElement {
  return buttons.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0]!
}

/** Press `button`, as the merge view hears it:  on mousedown. */
function press(button: HTMLElement) {
  button.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }))
}
