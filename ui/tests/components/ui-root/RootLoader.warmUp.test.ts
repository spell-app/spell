import { describe, expect, it } from "vite-plus/test"

import { E } from "spell/ui/core"
import { Modals } from "spell/ui/runtime/Modals"
import { Fixture } from "spell/test-helpers/Fixture"
import type { DOMElement } from "spell/element"

import "spell/ui/components/ui-root"

/** Resolves once the page has painted:  two frames. */
function painted(): Promise<void> {
  return new Promise((resolve) => E.beforeNextPaint(() => E.beforeNextPaint(() => resolve())))
}

// A fresh page (each test file is one), with no dialog imported
describe("RootLoader.warmUp()", () => {
  it("imports the dialog family once the root is ready and the page has painted, never before", async () => {
    expect(Modals.provider).toBeUndefined()
    const host = Fixture.render<DOMElement>(`<ui-root><ui-divider></ui-divider></ui-root>`)
    const ready = new Promise<boolean>((resolve) =>
      host.addEventListener("ui-ready", () => resolve(E.DOMElement.isAttached("ui-modal")), { once: true })
    )
    // the root's first draw didn't wait for it:  not loaded as the root got ready, nor by the paint after
    expect(await ready).toBe(false)
    expect(host.matches(":state(ready)")).toBe(true)
    await painted()
    expect(E.DOMElement.isAttached("ui-modal")).toBe(false)
    // then, at idle:  in, and its provider registered, so the first dialog opens at once
    await expect.poll(() => Modals.provider, { timeout: 10_000 }).toBeDefined()
    expect(E.DOMElement.isAttached("ui-modal")).toBe(true)
  })
})
