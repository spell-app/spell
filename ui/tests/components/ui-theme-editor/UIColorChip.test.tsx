import { describe, expect, it } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import "spell-ui/components/ui-theme-editor"

describe("<ui-color-chip>", () => {
  it("shows its colour, in its scheme, named for a screen reader", async () => {
    const chip = await ElementFixture.render(
      `<ui-color-chip color="light-dark(rgb(255, 0, 0), rgb(0, 0, 255))" scheme="dark" label="Primary"></ui-color-chip>`
    )
    const box = chip.shadowRoot!.querySelector<HTMLElement>("[part~=chip]")!
    expect(box.getAttribute("role")).toBe("img")
    expect(box.getAttribute("aria-label")).toBe("Primary")
    expect(getComputedStyle(box).backgroundImage).toContain("rgb(0, 0, 255)")
    await expectAccessible(chip)
  })
})
