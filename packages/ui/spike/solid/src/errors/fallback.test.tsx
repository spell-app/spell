import { describe, it } from "vitest"

import { expectAccessible } from "$test/a11y"
import { FALLBACK_CASES, type FallbackAdapter } from "$shared/tests/fallback.cases.ts"

import { SpikeFixture } from "$spike/SpikeFixture"
import type { UIHost } from "$spike/UIHost"

import "$spike/index"

/**
 * The shared native-fallback cases (`spike/shared/tests/fallback.cases.ts`) on the Solid spike:  the fork's
 * `onError` + `fallback` options (`UIElement.define()`), a family's `<Name>Fallback` in the shadow root.
 */
const SOLID: FallbackAdapter = {
  mount: (html) => SpikeFixture.render(`<div>${html}</div>`),
  breakRender: (element) => SpikeFixture.breakRender(element as UIHost),
  settle: () => SpikeFixture.tick(),
  axe: async (root) => void (await expectAccessible(root, { rules: { "color-contrast": { enabled: false } } }))
}

describe("native fallback (shared cases)", () => {
  for (const test of FALLBACK_CASES) it(test.name, () => test.run(SOLID))
})
