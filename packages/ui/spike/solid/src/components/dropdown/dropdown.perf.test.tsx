import { expect, it } from "vitest"
import { commands } from "vitest/browser"

import { SpikeFixture } from "$spike/SpikeFixture"
import { PerfRun } from "$spike/perf/PerfRun"

import "$spike/components/dropdown"

/**
 * Filtering 1000 options per keystroke must stay under a frame (16 ms), measured event => DOM updated.
 * - SIDE EFFECT:  writes the numbers to `.cache/perf-dropdown.json` (browser-mode `console.log` doesn't reach
 *   the terminal), for `REPORT.md`.
 */
it("filters 1000 options in under 16 ms per keystroke", async () => {
  const host = await SpikeFixture.render(`<ui-dropdown search selection placeholder="Country"></ui-dropdown>`)
  // warm-up run (JIT, icon-free rows), then the measured one on a fresh element
  await PerfRun.run(host)
  host.remove()
  const fresh = await SpikeFixture.render(`<ui-dropdown search selection placeholder="Country"></ui-dropdown>`)
  const result = await PerfRun.run(fresh)
  await commands.writeFile(".cache/perf-dropdown.json", JSON.stringify(result, null, 2))
  expect(result.open.rows).toBe(1000)
  expect(result.keystrokes.at(-1)!.rows).toBeGreaterThan(0)
  expect(result.script.avg).toBeLessThan(16)
})
