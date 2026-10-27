import { describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { RunRow } from "spell/server/runs/runs.types"

import type { EpicRunRow } from "spell-epic/components/epic-run-row"

import "spell-epic/components/epic-run-row"
// the box is a `<ui-textarea grow>`:  `<ui-root>` loads it on a page
import "spell-ui/components/ui-input"

/** A row with alternatives. */
const ROW: RunRow = { id: "task", cells: { english: "Task" }, value: "Tarea", alternatives: ["Faena"] }

/** Draw one row, given `row` and `answer` as `<epic-run>` gives them. */
async function drawRow(answer?: object) {
  const host = await ElementFixture.render(`<div></div>`)
  const row = document.createElement("epic-run-row") as HTMLElement & { component?: EpicRunRow }
  Object.assign(row, { row: ROW, columns: [{ key: "english", label: "English" }], answer })
  host.append(row)
  await ElementFixture.settle()
  return row
}

describe("<epic-run-row>", () => {
  test("its outcome comes from its value:  the proposal `accepted`, an alternative `picked`, else `typed`", async () => {
    const row = await drawRow()
    expect(["Tarea", "Faena", "Trabajo"].map((value) => row.component!.outcomeOf(value))).toEqual([
      "accepted",
      "picked",
      "typed"
    ])
  })

  test("shows Owen's answer over the proposal;  typing an alternative picks its pill, and says so", async () => {
    const row = await drawRow({ outcome: "typed", value: "Quehacer", at: "2026-10-23T19:12:00.000Z" })
    const box = row.shadowRoot!.querySelector<HTMLTextAreaElement>('[part~="box"]')!
    expect(box.value).toBe("Quehacer")
    expect(row.matches(":state(changed)")).toBe(true)
    const heard = vi.fn()
    row.addEventListener("epic-run-answered", (event) => heard((event as CustomEvent).detail))
    box.value = "Faena"
    box.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect(heard).toHaveBeenCalledWith({ rowId: "task", outcome: "picked", value: "Faena", now: false })
    const checked = row.shadowRoot!.querySelector<HTMLInputElement>('[part~="picks"] input:checked')!
    expect(checked.value).toBe("Faena")
  })

  test("its box grows with one line of text, as the choice row's:  a pasted line break goes;  Enter adds none", async () => {
    const row = await drawRow()
    const box = row.shadowRoot!.querySelector<HTMLTextAreaElement>('[part~="box"]')!
    expect([box.localName, box.hasAttribute("grow")]).toEqual(["ui-textarea", true])
    const heard = vi.fn()
    row.addEventListener("epic-run-answered", (event) => heard((event as CustomEvent).detail))
    box.value = "two\nlines"
    box.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect(box.value).toBe("two lines")
    expect(heard).toHaveBeenCalledWith({ rowId: "task", outcome: "typed", value: "two lines", now: false })
    const enter = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
    box.dispatchEvent(enter)
    expect(enter.defaultPrevented).toBe(true)
  })
})
