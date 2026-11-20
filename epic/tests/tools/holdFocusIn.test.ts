import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { holdFocusIn } from "spell/epic/tools/_assets/spell-doc-comments.js"

/** A comment pane holding its field, wired;  `press(target)`:  whether a mousedown there kept its default. */
function pane() {
  const { document } = parseHTML(
    `<html><body><epic-comment-pane><ui-button icon="trash can"></ui-button><textarea></textarea></epic-comment-pane></body></html>`
  )
  const box = document.querySelector("epic-comment-pane")!
  const field = box.querySelector("textarea")!
  holdFocusIn(box, field)
  const press = (target: Element) => {
    const event = new document.defaultView!.Event("mousedown", { bubbles: true, cancelable: true })
    target.dispatchEvent(event)
    return event.defaultPrevented
  }
  return { box, field, trash: box.querySelector("ui-button")!, press }
}

// epic `epic-engine` I354 (owenoak, 2026-11-19):  "can't delete comment" -- in Safari, the pane's trash did nothing
describe("holdFocusIn():  a press on the comment pane's header leaves the focus in its field", () => {
  test("a press on the trash (or the ×, the grip) doesn't move the focus:  the pane stays open for its click", () => {
    const { trash, box, press } = pane()
    expect(press(trash)).toBe(true)
    expect(press(box)).toBe(true)
  })

  test("a press in the field itself is left alone:  the caret goes where it's clicked", () => {
    const { field, press } = pane()
    expect(press(field)).toBe(false)
  })
})
