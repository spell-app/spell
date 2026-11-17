import { afterAll, describe, expect, it } from "vite-plus/test"
import { cdp, page } from "vite-plus/test/browser"

import { PLATFORMS, currentPlatform, isOnPlatform, platformsIn } from "spell/util/platform"

describe("platformsIn()", () => {
  it("reads a comma list, a space after a comma ignored, any case", () => {
    expect([...platformsIn("desktop,tablet")!]).toEqual(["tablet", "desktop"])
    expect([...platformsIn("desktop, tablet")!]).toEqual(["tablet", "desktop"])
    expect([...platformsIn(" Phone ,  TABLET ")!]).toEqual(["phone", "tablet"])
    expect([...platformsIn("phone,tablet,desktop")!]).toEqual([...PLATFORMS])
  })

  it("leaves out words that are no platform, and whole-word matches only", () => {
    expect([...platformsIn("desktop, watch")!]).toEqual(["desktop"])
    expect([...platformsIn("phones,desktops")!]).toEqual([])
  })

  it("is undefined (every platform) for no list", () => {
    expect(platformsIn(undefined)).toBeUndefined()
    expect(platformsIn("")).toBeUndefined()
    expect(platformsIn(" , ")).toBeUndefined()
  })
})

describe("currentPlatform(), emulated", () => {
  /** Turn touch on or off, the main pointer with it, as DevTools' device mode does. */
  async function touch(enabled: boolean) {
    await cdp().send("Emulation.setTouchEmulationEnabled", { enabled, maxTouchPoints: 5 })
    await cdp().send("Emulation.setEmitTouchEventsForMouse", { enabled, configuration: "mobile" })
  }

  afterAll(async () => {
    await touch(false)
    await page.viewport(414, 896)
  })

  it("is desktop with a mouse, at any size", async () => {
    await touch(false)
    await page.viewport(390, 700)
    expect(currentPlatform()).toBe("desktop")
    expect(isOnPlatform("desktop,tablet")).toBe(true)
  })

  it("is a phone with a finger on a small screen, either way up", async () => {
    await touch(true)
    await page.viewport(390, 844)
    expect(currentPlatform()).toBe("phone")
    await page.viewport(844, 390)
    expect(currentPlatform()).toBe("phone")
    expect(isOnPlatform("desktop,tablet")).toBe(false)
    expect(isOnPlatform(undefined)).toBe(true)
  })

  it("is a tablet with a finger on a big screen", async () => {
    await touch(true)
    await page.viewport(820, 1180)
    expect(currentPlatform()).toBe("tablet")
    expect(isOnPlatform("desktop,tablet")).toBe(true)
  })
})
