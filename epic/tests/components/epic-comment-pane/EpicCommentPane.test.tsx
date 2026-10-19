import { describe, expect, test } from "vite-plus/test"

import { ElementFixture } from "$/ui/test/ElementFixture"

import "$/ui/components/ui-button"
import "$/ui/components/ui-icon"
import "$/epics/components/epic-comment-pane"

/** `element`'s shadow part `name`. */
function part(element: Element, name: string): HTMLElement {
  return element.shadowRoot!.querySelector<HTMLElement>(`[part~='${name}']`)!
}

/** A pane near `near`, its field slotted. */
async function pane(near: { left: number; top: number; bottom: number } | undefined, attributes = "") {
  const host = document.createElement("epic-comment-pane") as HTMLElement & { near: unknown }
  for (const [name, value] of Object.entries({ headline: "“2. Context”", about: "On a section in “2. Context”" }))
    host.setAttribute(name, value)
  for (const name of attributes.split(" ").filter(Boolean)) host.setAttribute(name, "")
  host.near = near
  host.append(document.createElement("textarea"))
  document.body.append(host)
  await ElementFixture.settle(host)
  await new Promise((resolve) => requestAnimationFrame(resolve))
  await ElementFixture.settle(host)
  return host
}

describe("<epic-comment-pane>", () => {
  test("fixed on the screen, 8px under what it opens near, inside the window;  shown once placed", async () => {
    const host = await pane({ left: 40, top: 100, bottom: 120 })
    const box = host.getBoundingClientRect()
    // never past the window's right edge, 8px in
    const left = Math.min(40, innerWidth - box.width - 8)
    expect({
      position: getComputedStyle(host).position,
      left: box.left - left + 40,
      top: box.top,
      placed: host.matches(":state(placed)"),
      shown: getComputedStyle(host).opacity
    }).toEqual({ position: "fixed", left: 40, top: 128, placed: true, shown: "1" })
    host.remove()
  })

  test("no room below:  above it", async () => {
    const host = await pane({ left: 40, top: innerHeight - 20, bottom: innerHeight - 4 })
    const box = host.getBoundingClientRect()
    expect(Math.round(box.bottom)).toBe(innerHeight - 28)
    host.remove()
  })

  test("its header:  the first words (the block in full its tooltip), the floppy and trash once saved, ×;  a dialog", async () => {
    const fresh = await pane(undefined)
    expect({
      headline: part(fresh, "header").textContent,
      tip: part(fresh, "header").title,
      buttons: fresh.shadowRoot!.querySelectorAll("ui-button").length,
      floppy: !!fresh.shadowRoot!.querySelector(".floppy"),
      role: (fresh as unknown as { internals: ElementInternals }).internals.role,
      label: (fresh as unknown as { internals: ElementInternals }).internals.ariaLabel,
      slotted: !!fresh.querySelector("textarea")!.assignedSlot
    }).toEqual({
      headline: "“2. Context”",
      tip: "On a section in “2. Context”\n(Drag to move)",
      buttons: 1,
      floppy: false,
      role: "dialog",
      label: "Comment on “2. Context”",
      slotted: true
    })
    fresh.remove()
    const saved = await pane(undefined, "deletable failed")
    saved.setAttribute("saved", "Not saved:  offline (kept in this browser)")
    await ElementFixture.settle(saved)
    const floppy = saved.shadowRoot!.querySelector<HTMLElement>(".floppy")!
    expect([
      saved.shadowRoot!.querySelectorAll("ui-button").length,
      floppy.title,
      floppy.hasAttribute("data-failed")
    ]).toEqual([2, "Not saved:  offline (kept in this browser)", true])
    saved.remove()
  })

  test("× and the trash say so:  `epic-comment-close`, `epic-comment-delete`", async () => {
    const host = await pane(undefined, "deletable")
    const heard: string[] = []
    for (const name of ["epic-comment-close", "epic-comment-delete"])
      host.addEventListener(name, () => heard.push(name))
    const [trash, close] = host.shadowRoot!.querySelectorAll<HTMLElement>("ui-button")
    trash.click()
    close.click()
    expect(heard).toEqual(["epic-comment-delete", "epic-comment-close"])
    host.remove()
  })

  test("dragged by its header:  it follows the pointer, inside the window", async () => {
    const host = await pane({ left: 40, top: 100, bottom: 120 })
    const header = part(host, "header")
    const start = host.getBoundingClientRect()
    const at = (type: string, x: number, y: number) =>
      header.dispatchEvent(
        new PointerEvent(type, { bubbles: true, composed: true, clientX: x, clientY: y, button: 0, pointerId: 1 })
      )
    at("pointerdown", start.left + 100, start.top + 15)
    at("pointermove", start.left + 100, start.top + 55)
    at("pointerup", start.left + 100, start.top + 55)
    const box = host.getBoundingClientRect()
    expect([Math.round(box.left), Math.round(box.top)]).toEqual([Math.round(start.left), Math.round(start.top) + 40])
    host.remove()
  })
})
