import { describe, expect, test } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"

import "spell-ui/components/ui-icon"
import "spell-epic/components/epic-page-note-head"

/** `element`'s shadow part `name`. */
function part(element: Element, name: string): HTMLElement {
  return element.shadowRoot!.querySelector<HTMLElement>(`[part~='${name}']`)!
}

describe("<epic-page-note-head>", () => {
  test("one button:  who and when (no year), the first line, its status and replies", async () => {
    const head = await ElementFixture.render(
      `<epic-page-note-head at="2026-10-09 22:10" status="answered" replies="1" preview="Show icons as I will click them"></epic-page-note-head>`
    )
    expect({
      text: part(head, "base").textContent,
      status: part(head, "status").textContent,
      look: part(head, "status").dataset.status,
      expanded: part(head, "base").getAttribute("aria-expanded")
    }).toEqual({
      text: "Owen · 10/9 22:10Show icons as I will click themanswered · 1 reply",
      status: "answered · 1 reply",
      look: "answered",
      expanded: "false"
    })
  })

  test("a click flips `open` and says so;  open, the preview hides", async () => {
    const head = await ElementFixture.render(`<epic-page-note-head preview="first line"></epic-page-note-head>`)
    const heard: unknown[] = []
    for (const type of ["epic-note-opened", "epic-note-closed"])
      head.addEventListener(type, (event) => heard.push((event as CustomEvent).detail))
    part(head, "base").click()
    await ElementFixture.settle(head)
    const preview = head.shadowRoot!.querySelector(".preview")!
    expect({ open: head.hasAttribute("open"), heard, hidden: getComputedStyle(preview).visibility }).toEqual({
      open: true,
      heard: [{ open: true }],
      hidden: "hidden"
    })
  })
})
