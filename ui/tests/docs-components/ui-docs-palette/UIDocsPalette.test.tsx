import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"
import { PALETTE_GROUPS_API } from "spell/ui/docs-components/docs-components.types"

import "spell/ui/docs-components/ui-docs-palette"

/** The palette's table, as the page server would answer:  one group of our own. */
const TABLE = { groups: [{ title: "Mine", icon: "star", tags: ["ui-button"] }], hidden: [] }

/** A palette whose table came in;  its component, for what it holds. */
async function palette() {
  // the table's request alone:  the icons and the rest go on as they would
  const real = globalThis.fetch.bind(globalThis)
  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) =>
    (input instanceof Request ? input.url : input instanceof URL ? input.href : input).includes(PALETTE_GROUPS_API)
      ? Promise.resolve(Response.json(TABLE))
      : real(input, init)
  )
  const host = await ElementFixture.render<DOMElement>(`<ui-docs-palette></ui-docs-palette>`)
  const component = host.component as unknown as { groups: readonly { title?: string; icon?: string }[] }
  await vi.waitFor(() => expect(host.shadowRoot!.querySelector("ui-input.name")).not.toBeNull())
  return { host, component }
}

/** `element`'s event `type`, as the control sends it, with its value. */
function send(element: Element, type: string, value: string) {
  element.dispatchEvent(new CustomEvent(type, { detail: { value }, bubbles: true, composed: true }))
}

describe("<ui-docs-palette> hears its controls (its own listeners, not `on-ui-*` props)", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("a group's name field renames it", async () => {
    const { host, component } = await palette()
    send(host.shadowRoot!.querySelector("ui-input.name")!, "ui-changed", "Renamed")
    expect(component.groups[0]!.title).toBe("Renamed")
  })

  it("a group's icon picker sets its icon", async () => {
    const { host, component } = await palette()
    send(host.shadowRoot!.querySelector("ui-icon-picker.icon")!, "ui-changed", "heart")
    expect(component.groups[0]!.icon).toBe("heart")
  })
})
