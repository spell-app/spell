import { describe, expect, test } from "vite-plus/test"

import { SpellSolid, UIComponent } from "spell-kit/element"

import "spell-ui/core"

/** `SpellUISettings`:  what Spell UI hands `spell-kit/element` as its core loads. */
describe("SpellUISettings", () => {
  test("Spell UI's settings are installed as its core loads", () => {
    expect(SpellSolid.isInstalled).toBe(true)
    expect(SpellSolid.settings.motion.defaultAnimation).toBe("fade")
    expect(UIComponent.prototype.elementSetup.animation).toBe("fade")
  })
})
