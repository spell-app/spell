import { describe, expect, it } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"
import type { TokenRow } from "spell-ui/components/ui-theme-editor/UIThemeEditor.types"

import "spell-ui/components/ui-theme-editor"

/** A row of `--ui-highlight`:  a mix, set here. */
const ROW: TokenRow = {
  token: "--ui-highlight",
  label: "highlight",
  nameTip: "--ui-highlight  ·  surfaces.highlight",
  schemes: ["light", "dark"],
  values: {
    light: {
      text: "#e8ddff",
      kind: "color",
      hex: "#e8ddff",
      opacity: 100,
      mix: {
        mixin: "brand.primary.color",
        mixinColor: "#7c55e6",
        base: "transparent",
        baseColor: "transparent",
        amount: 20
      }
    },
    dark: { text: "#3a2d66", kind: "color", hex: "#3a2d66", opacity: 100 }
  },
  isHere: true,
  isTuned: false,
  isSplit: false,
  isOpen: false,
  markTip: "Set here",
  readers: [],
  options: [{ place: "brand.primary.color", label: "brand.primary.color" }]
}

/** The row, drawn;  every event it sends. */
async function render(row: TokenRow) {
  const element = await ElementFixture.render<HTMLElement & { row: TokenRow }>(`<ui-theme-token></ui-theme-token>`)
  element.row = row
  await ElementFixture.settle()
  const events: CustomEvent[] = []
  for (const type of ["ui-changed", "ui-command"])
    element.addEventListener(type, (event) => events.push(event as CustomEvent))
  return { element, root: element.shadowRoot!, events }
}

describe("<ui-theme-token>", () => {
  it("draws its mark, its name, and each scheme's chips:  a mix as `= base + mixed in 20%`, the chips read-only", async () => {
    const { element, root } = await render(ROW)
    expect(root.querySelector(".mark")?.textContent).toBe("●")
    expect(element.matches(":state(here)")).toBe(true)
    expect(root.querySelectorAll(".value")).toHaveLength(2)
    expect(root.querySelector(".value.light .mix")?.textContent).toContain("20%")
    expect(root.querySelectorAll(".value.light ui-color-chip")).toHaveLength(3)
    expect(root.querySelector(".value.dark .mix")).toBeNull()
    await expectAccessible(element)
  })

  it("its name asks to open its drawer;  the drawer's amount sends the mix again", async () => {
    const { element, root, events } = await render(ROW)
    root.querySelector<HTMLButtonElement>(".name")!.click()
    expect(events.at(-1)?.detail).toEqual({ token: "--ui-highlight", command: "open" })
    element.row = { ...ROW, isOpen: true }
    await ElementFixture.settle()
    expect(element.matches(":state(open)")).toBe(true)
    root
      .querySelector(".amount-field ui-slider")!
      .dispatchEvent(new CustomEvent("ui-moved", { detail: { value: 35 }, bubbles: true, composed: true }))
    expect(events.at(-1)?.type).toBe("ui-changed")
    expect(events.at(-1)?.detail).toEqual({
      token: "--ui-highlight",
      value: "color-mix(in oklab, {brand.primary.color} 35%, transparent)"
    })
  })

  it("○ from what the theme builds on:  Set here, as a command", async () => {
    const { element, root, events } = await render({ ...ROW, isHere: false, markTip: "From Glass" })
    expect(root.querySelector(".mark")?.textContent).toBe("○")
    expect(element.matches(":state(here)")).toBe(false)
    root.querySelector<HTMLElement>(".head ui-button")!.click()
    expect(events.at(-1)?.detail).toEqual({ token: "--ui-highlight", command: "set here" })
  })
})
