import { describe, expect, it } from "vite-plus/test"

import { E } from "spell/ui/core"
import { UI } from "spell/ui/runtime"
import { Modals } from "spell/ui/runtime/Modals"
import { Toasts } from "spell/ui/runtime/Toasts"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

// the root's loader, as a page with a `<ui-root>` has it:  says how to import `ui-modal` and `ui-toast`, imports neither
import "spell/ui/components/ui-root/RootLoader"

/** A dialog `UI.modals` put in the body. */
type Modal = DOMElement & { visible: boolean }

/** The dialog `UI.modals` put in the body, once it shows. */
async function shownDialog(): Promise<Modal> {
  await expect.poll(() => document.querySelector<Modal>("body > ui-modal")?.visible, { timeout: 10_000 }).toBe(true)
  const host = document.querySelector<Modal>("body > ui-modal")!
  await ElementFixture.settle(host)
  return host
}

// A fresh page (each test file is one):  no dialog or toast family imported, and nobody calls `ready()` first
describe("UI.modals and UI.toasts load their own code", () => {
  it("alert() on a page with no dialog imported yet shows, and resolves once acknowledged", async () => {
    await UI.load()
    expect(Modals.provider).toBeUndefined()
    expect(E.DOMElement.isAttached("ui-modal")).toBe(false)
    const done = UI.modals.alert("Saved")
    const host = await shownDialog()
    expect(host.getAttribute("aria-label")).toBe("Saved")
    host.querySelector<HTMLElement>(".approve")!.click()
    expect(await done).toBeUndefined()
  })

  it("confirm() shows and answers", async () => {
    const answer = UI.modals.confirm("Sure?")
    const host = await shownDialog()
    host.querySelector<HTMLElement>(".approve")!.click()
    expect(await answer).toBe(true)
  })

  it("a toast on a page with no toast imported yet:  its handle at once, the toast once the family is in", async () => {
    expect(Toasts.provider).toBeUndefined()
    const handle = UI.toast({ message: "Copied", displayTime: 0 })
    expect(handle.id).toEqual(expect.any(String))
    await expect.poll(() => document.getElementById(handle.id)?.localName, { timeout: 10_000 }).toBe("ui-toast")
    UI.toasts.dismiss(handle.id)
    await expect(handle.closed).resolves.toBeUndefined()
  })

  it("a toast dismissed before its family is in never shows", async () => {
    const provider = Toasts.provider
    Toasts.provider = undefined
    try {
      const handle = UI.toast({ message: "Never", displayTime: 0 })
      UI.toasts.dismiss(handle.id)
      await expect(handle.closed).resolves.toBeUndefined()
      expect(document.getElementById(handle.id)).toBeNull()
    } finally {
      Toasts.provider = provider
    }
  })
})
