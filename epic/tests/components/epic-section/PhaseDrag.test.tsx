import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"

import { PhaseDrag } from "spell/epic/components/epic-section/PhaseDrag"

import "spell/ui/components/ui-section"
import "spell/epic/components/epic-section"
import "spell/epic/components/epic-phase"

/** The Phases section:  P1 done, P2-P4 to do. */
const SECTION =
  `<epic-section id="phases" kind="phases">` +
  `<epic-phase id="p-one" title="One" status="done"></epic-phase>` +
  `<epic-phase id="p-two" title="Two" status="todo"></epic-phase>` +
  `<epic-phase id="p-three" title="Three" status="todo"></epic-phase>` +
  `<epic-phase id="p-four" title="Four" status="todo"></epic-phase>` +
  `</epic-section>`

/** The fold button of phase `id`'s title row:  where a drag starts. */
function titleOf(host: Element, id: string): HTMLElement {
  const section = host.querySelector(`#${id}`)!.shadowRoot!.querySelector("ui-section")!
  return section.shadowRoot!.querySelector<HTMLElement>('[part~="toggle"]')!
}

/** The ids of `host`'s phases, in page order. */
function order(host: Element): string[] {
  return Array.from(host.querySelectorAll("epic-phase"), (phase) => phase.id)
}

/** Press on `from`'s title, move to `y` in steps, let go. */
function dragTo(from: HTMLElement, y: number) {
  const box = from.getBoundingClientRect()
  const start = { clientX: box.left + 20, clientY: box.top + box.height / 2 }
  from.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true, button: 0, ...start }))
  for (const step of [start.clientY + 10, y])
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: start.clientX, clientY: step }))
  window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: start.clientX, clientY: y }))
}

/** The top of phase `id`, a few pixels in:  a drop there lands BEFORE it. */
function topOf(host: Element, id: string): number {
  return host.querySelector(`#${id}`)!.getBoundingClientRect().top + 4
}

let undo: (() => void) | undefined
afterEach(() => undo?.())

describe("PhaseDrag (epic `epic-engine` P34)", () => {
  test("a to-do phase dragged by its title above another:  moved at once, its new place handed on", async () => {
    const host = await ElementFixture.render(SECTION)
    await ElementFixture.settle()
    const move = vi.fn()
    undo = PhaseDrag.wire(host, { enabled: () => true, move })
    dragTo(titleOf(host, "p-four"), topOf(host, "p-two"))
    expect(order(host)).toEqual(["p-one", "p-four", "p-two", "p-three"])
    expect(move).toHaveBeenCalledWith("p-four", 2)
    expect(host.querySelector("[data-drop], [data-dragged]")).toBeNull()
  })

  test("a done phase never drags;  nothing goes above one;  not while the page isn't reviewed", async () => {
    const host = await ElementFixture.render(SECTION)
    await ElementFixture.settle()
    const move = vi.fn()
    let reviewed = true
    undo = PhaseDrag.wire(host, { enabled: () => reviewed, move })
    dragTo(titleOf(host, "p-one"), topOf(host, "p-four"))
    dragTo(titleOf(host, "p-three"), topOf(host, "p-one"))
    reviewed = false
    dragTo(titleOf(host, "p-three"), topOf(host, "p-two"))
    expect(order(host)).toEqual(["p-one", "p-two", "p-three", "p-four"])
    expect(move).not.toHaveBeenCalled()
  })

  test("the moves still waiting go back on top of the file's order (a live patch, the marks read again)", async () => {
    const host = await ElementFixture.render(SECTION)
    await ElementFixture.settle()
    const pending = [{ id: "p-four", to: 2 }]
    undo = PhaseDrag.wire(host, { enabled: () => true, move: () => undefined, pending: () => pending })
    expect(order(host)).toEqual(["p-one", "p-four", "p-two", "p-three"])
    // the file's order, patched back in:  the move not applied yet is put back
    host.querySelector("#p-three")!.after(host.querySelector("#p-four")!)
    window.dispatchEvent(new Event("spell-doc:updated"))
    expect(order(host)).toEqual(["p-one", "p-four", "p-two", "p-three"])
  })

  test("the click after a drag doesn't fold the phase;  a plain click still does", async () => {
    const host = await ElementFixture.render(SECTION)
    await ElementFixture.settle()
    undo = PhaseDrag.wire(host, { enabled: () => true, move: () => undefined })
    const phase = host.querySelector("#p-four") as HTMLElement & { open: boolean }
    const was = phase.open
    dragTo(titleOf(host, "p-four"), topOf(host, "p-two"))
    titleOf(host, "p-four").click()
    await ElementFixture.settle()
    expect(phase.open).toBe(was)
    await new Promise((resolve) => setTimeout(resolve, 350))
    titleOf(host, "p-four").click()
    await ElementFixture.settle()
    expect(phase.open).toBe(!was)
  })
})
