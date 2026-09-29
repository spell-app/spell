import { describe, it } from "vitest"

import { expectAccessible } from "$test/a11y"
import { Fixture } from "$test/fixture"
import { FALLBACK_CASES, type FallbackAdapter } from "$shared/tests/fallback.cases.ts"

import "./index"

/**
 * The shared native-fallback cases (`spike/shared/tests/fallback.cases.ts`) on the Lit spike:  `UIElement`'s
 * guarded update (`failed()`), a family's `@proto static Fallback` in the shadow root.
 */
const LIT: FallbackAdapter = {
  mount: async (html) => {
    const container = Fixture.render(`<div>${html}</div>`)
    await settle()
    return container
  },
  breakRender: async (element) => {
    const host = element as unknown as LitHost
    host.render = () => {
      throw new Error(`test:  forced render failure in <${element.localName}>`)
    }
    host.requestUpdate()
    await host.updateComplete
  },
  settle,
  axe: async (root) => void (await expectAccessible(root, { rules: { "color-contrast": { enabled: false } } }))
}

describe("native fallback (shared cases)", () => {
  for (const test of FALLBACK_CASES) it(test.name, () => test.run(LIT))
})

////////////////
// ## Helpers
////////////////

/** What `breakRender` touches on a Lit element:  `render()` is protected, so it's reached through this type. */
type LitHost = HTMLElement & {
  render(): unknown
  requestUpdate(): void
  updateComplete: Promise<boolean>
}

/**
 * Resolve once every Lit element in the document has finished updating.
 * - Two rounds:  an update can queue another (an owner re-rendering its parts, `slotchange`).
 */
async function settle() {
  for (let round = 0; round < 2; round++) {
    const hosts = [...document.querySelectorAll("*")].filter((element) => "updateComplete" in element)
    await Promise.all(hosts.map((element) => (element as LitHost).updateComplete))
    await new Promise((resolve) => setTimeout(resolve))
  }
}
