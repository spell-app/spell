import { describe, expect, it } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import "spell/ui/components/ui-segment"
import "spell/ui/components/ui-card"
import "spell/ui/components/ui-button"

/**
 * A pane's state panes (`E.StatePanes`):  its `loading` and `error` slots, in place of its content while the state
 * is on;  empty, the defaults (its veil;  its error message and Try again).  And the shared `error`'s look elsewhere.
 */

/** Render `html`:  its host, the box round a state pane by its part, and its content slot. */
async function render(html: string) {
  const host = await ElementFixture.render<DOMElement>(html)
  const pane = (part: string) => host.shadowRoot!.querySelector(`[part~="${part}"]`) as HTMLElement | null
  const contentSlot = () => host.shadowRoot!.querySelector("slot:not([name])") as HTMLSlotElement
  return { host, pane, contentSlot }
}

/** Lets the element take in a change. */
async function settled(): Promise<void> {
  for (let turn = 0; turn < 3; turn++) await new Promise((resolve) => requestAnimationFrame(resolve))
}

describe("a pane's error", () => {
  it("`error` with words:  its message and Try again in place of its content, `role=alert`;  gone without it", async () => {
    const { host, pane, contentSlot } = await render(`<ui-segment error="The server didn't answer">Content</ui-segment>`)
    const error = pane("error-pane")!
    expect(error.getAttribute("role")).toBe("alert")
    expect(error.textContent).toContain("The server didn't answer")
    expect(error.querySelector("button")?.textContent).toBe("Try again")
    expect(contentSlot().hidden).toBe(true)
    host.removeAttribute("error")
    await settled()
    expect(pane("error-pane")).toBeNull()
    expect(contentSlot().hidden).toBe(false)
  })

  it("bare `error`:  \"Couldn't load this.\"", async () => {
    const { pane } = await render(`<ui-card error>Content</ui-card>`)
    expect(pane("error-pane")!.textContent).toContain("Couldn't load this.")
  })

  it('`slot="error"`:  that, in place of the default message', async () => {
    const { pane } = await render(
      `<ui-segment error="x">Content<span slot="error">It's down:  <b>call ops</b></span></ui-segment>`
    )
    const slot = pane("error-pane")!.querySelector("slot") as HTMLSlotElement
    expect(slot.assignedElements()[0]?.textContent).toBe("It's down:  call ops")
  })

  it("Try again dispatches `ui-retry`, bubbling out of the pane", async () => {
    const { host, pane } = await render(`<ui-segment error>Content</ui-segment>`)
    let retried = 0
    document.addEventListener("ui-retry", () => retried++, { once: true })
    pane("error-pane")!.querySelector("button")!.click()
    expect(retried).toBe(1)
    expect(host.matches(":state(failed)")).toBe(true)
  })
})

describe("a pane's loading slot", () => {
  it('`loading` with `slot="loading"`:  that in place of its content, its veil gone;  hidden again once loaded', async () => {
    const { host, pane, contentSlot } = await render(
      `<ui-segment loading>Content<div slot="loading">Loading Jobs...</div></ui-segment>`
    )
    expect(pane("loading-pane")).not.toBeNull()
    expect(contentSlot().hidden).toBe(true)
    expect(host.matches(":state(state-pane)")).toBe(true)
    host.removeAttribute("loading")
    await settled()
    expect(pane("loading-pane")).toBeNull()
    expect(contentSlot().hidden).toBe(false)
  })

  it("`loading` with an empty slot:  its own veil over its content, as ever", async () => {
    const { host, pane, contentSlot } = await render(`<ui-segment loading>Content</ui-segment>`)
    expect(pane("loading-pane")).toBeNull()
    expect(contentSlot().hidden).toBe(false)
    expect(host.matches(":state(state-pane)")).toBe(false)
  })
})

describe("the shared `error` elsewhere", () => {
  it("a control:  the error look (`:state(failed-look)`), its words its tooltip", async () => {
    const { host } = await render(`<ui-button error="Can't reach the server">Save</ui-button>`)
    expect(host.matches(":state(failed-look)")).toBe(true)
    expect(host.getAttribute("title")).toBe("Can't reach the server")
  })
})
