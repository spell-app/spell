import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { setDiagnostics } from "@codemirror/lint"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { CODE_POPUP_DEFAULTS, showCodeChoices } from "spell/app/app/ui/codePopups"
import { CodeMirrorHovers } from "spell/app/app/ui/codemirror/CodeMirrorHovers"
import { CodeMirrorPopups } from "spell/app/app/ui/codemirror/CodeMirrorPopups"

/**
 * The problem popup's "Fix it" button (Owen's C3, epic `language` P68), on a real view in the browser:
 * a problem with an action shows it as a Spell UI button on its row;  pressed, the action runs on the problem's stretch,
 * and the edit it makes closes the popup.
 * - The problem is set by hand, as `FileStates` sets a file's:  no parse, no language service.
 */
describe("CodeMirrorHovers:  a problem's Fix it button", () => {
  let view: EditorView | undefined

  afterEach(() => {
    view?.destroy()
    view = undefined
    showCodeChoices(CODE_POPUP_DEFAULTS)
  })

  test("its row shows the button;  pressed, the fix is made and the popup goes", async () => {
    showCodeChoices({ ...CODE_POPUP_DEFAULTS, popupDelay: "short" })
    const host = document.createElement("div")
    host.style.cssText = "width: 600px; height: 200px"
    document.body.append(host)
    const doc = 'a card is a view where\n\tit has parts "front"\n'
    const state = EditorState.create({ doc, extensions: [CodeMirrorPopups.extension(), CodeMirrorHovers.extension()] })
    view = new EditorView({ parent: host, state })
    const from = doc.indexOf("parts")
    const apply = vi.fn((code: EditorView, start: number, end: number) =>
      code.dispatch({ changes: { from: start, to: end, insert: "slots" } })
    )
    view.dispatch(
      setDiagnostics(view.state, [
        { from, to: from + 5, severity: "warning", message: "Old word", actions: [{ name: "Fix it", apply }] }
      ])
    )

    const at = view.coordsAtPos(from + 2)!
    view.contentDOM.dispatchEvent(
      new MouseEvent("mousemove", { bubbles: true, clientX: at.left + 1, clientY: (at.top + at.bottom) / 2 })
    )
    const button = await shown(() => document.querySelector<HTMLElement>(".cmb-error-row ui-button"))
    expect(button.textContent).toBe("Fix it")
    expect(button.closest(".cmb-error-row")!.textContent).toContain("Old word")

    button.click()
    expect(apply).toHaveBeenCalledWith(view, from, from + 5)
    expect(view.state.doc.toString()).toBe(doc.replace("parts", "slots"))
    await shown(() => (document.querySelector(".cmb-errors") ? null : document.body))
  })
})

/** What `find()` finds, once it does:  fails after 3 seconds. */
async function shown<T>(find: () => T | null): Promise<T> {
  for (let tries = 0; tries < 60; tries++) {
    const found = find()
    if (found) return found
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error("never showed")
}
