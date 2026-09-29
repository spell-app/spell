/**
 * The shared dropdown benchmark (`spike/shared/PerfRun.ts`) on the dev server:  1000 options, `"united sta"` typed
 * one character per keystroke, update / + layout / + frame per step.
 * - Dev build of Lit (Vite serves the `development` export condition);  `yarn smoke` runs the same benchmark
 *   against `dist/` + the vendored production `lit`.
 * - Result goes to `#result`, and `window.perfResult` for scripted runs.  Reload to run again.
 */

import { PerfRun } from "$shared/PerfRun.ts"
import type { UIDropdown } from "../src/index"

import "../src/index"

const element = document.querySelector<UIDropdown>("#perf")!
await element.updateComplete
const result = await PerfRun.run(element, { settle: (host) => (host as UIDropdown).updateComplete })
;(window as unknown as { perfResult: unknown }).perfResult = result
document.querySelector("#result")!.textContent = JSON.stringify(result, null, 2)
