import { describe, expect, it, onTestFinished, vi } from "vite-plus/test"

import { expectAccessible } from "spell/test-helpers/A11y"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import "spell-ui/components/ui-keys"

/** A `<ui-keys>` with `attributes`;  its caps' text and its spoken name. */
async function keys(attributes: string) {
  const host = await ElementFixture.render<DOMElement>(`<ui-keys ${attributes}></ui-keys>`)
  await ElementFixture.settle()
  const root = host.shadowRoot!.querySelector<HTMLElement>("[part~=keys]")!
  const caps = [...root.querySelectorAll(".chord")].map((chord) =>
    [...chord.querySelectorAll("[part~=key]")].map((cap) => cap.textContent)
  )
  return { host, root, caps, spoken: root.getAttribute("aria-label") }
}

describe("<ui-keys>", () => {
  it("draws `mod` as ⌘ on a Mac, and says Command", async () => {
    const { caps, spoken } = await keys(`shortcut="mod+S" platform="apple"`)
    expect(caps).toEqual([["⌘", "S"]])
    expect(spoken).toBe("Command S")
  })

  it("draws `mod` as Ctrl elsewhere, and says Control", async () => {
    const { caps, spoken } = await keys(`shortcut="mod+S" platform="other"`)
    expect(caps).toEqual([["Ctrl", "S"]])
    expect(spoken).toBe("Control S")
  })

  it("keeps `meta` the Meta key itself, and reads `modifier` as `mod`", async () => {
    expect((await keys(`shortcut="meta+K" platform="other"`)).caps).toEqual([["Meta", "K"]])
    expect((await keys(`shortcut="modifier+K" platform="other"`)).caps).toEqual([["Ctrl", "K"]])
  })

  it("draws named keys as their symbols, and two shortcuts side by side", async () => {
    const { caps, spoken } = await keys(`shortcut="shift+alt+up escape" platform="apple"`)
    expect(caps).toEqual([["⇧", "⌥", "↑"], ["esc"]])
    expect(spoken).toBe("Shift Option ↑, or esc")
  })

  it("reads a shortcut as `UI.keyboard` does:  the plus key, its keys in the order written, a key as written", async () => {
    expect((await keys(`shortcut="mod++" platform="other"`)).caps).toEqual([["Ctrl", "+"]])
    expect((await keys(`shortcut="shift+mod+PageUp" platform="other"`)).caps).toEqual([["Shift", "Ctrl", "PageUp"]])
  })

  it("draws nothing for a shortcut it can't read, and warns", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    onTestFinished(() => warn.mockRestore())
    const { caps } = await keys(`shortcut="hyper+K mod+S" platform="other"`)
    expect({ caps, warned: warn.mock.calls.some(([message]) => String(message).includes("hyper+K")) }).toEqual({
      caps: [["Ctrl", "S"]],
      warned: true
    })
  })

  it("is accessible:  the caps hidden, the whole named", async () => {
    const { host, root } = await keys(`shortcut="mod+S"`)
    expect(root.querySelector(".chord")!.getAttribute("aria-hidden")).toBe("true")
    await expectAccessible(host)
  })
})
