/**
 * Perf demo:  types `PerfRun.query` into a 1000-option search dropdown and prints per-keystroke times
 * (event => DOM updated via `flush()`, and with a forced layout) to the page and the console.
 * - `window.perfResult` holds the result for scripted runs (`demo/smoke.ts`).
 */

import { PerfRun } from "$spike/perf/PerfRun"
import type { UIHost } from "$spike/UIHost"

import "$spike/components/dropdown"

const host = document.getElementById("perf") as UIHost
await host.ready
// warm-up on a throwaway element, as the test does
const warm = document.createElement("ui-dropdown") as UIHost
warm.setAttribute("search", "")
document.body.append(warm)
await warm.ready
await PerfRun.run(warm)
warm.remove()

const result = await PerfRun.run(host)
const lines = [
  `open (render ${result.open.rows} rows):  ${result.open.script.toFixed(1)} ms script, ${result.open.layout.toFixed(1)} ms with layout`,
  `keystrokes script ms:  min ${result.script.min.toFixed(1)}  avg ${result.script.avg.toFixed(2)}  max ${result.script.max.toFixed(1)}`,
  `keystrokes + layout ms:  min ${result.layout.min.toFixed(1)}  avg ${result.layout.avg.toFixed(2)}  max ${result.layout.max.toFixed(1)}`,
  ...result.keystrokes.map(
    (keystroke) =>
      `  ${JSON.stringify(keystroke.query).padEnd(14)} ${String(keystroke.rows).padStart(4)} rows  ${keystroke.script.toFixed(1)} / ${keystroke.layout.toFixed(1)} ms`
  )
]
document.getElementById("result")!.textContent = lines.join("\n")
console.log(lines.join("\n"))
;(window as unknown as { perfResult: unknown }).perfResult = result
