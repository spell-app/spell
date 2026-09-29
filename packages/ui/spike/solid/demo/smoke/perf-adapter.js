/**
 * The Solid spike's `PerfAdapter` for the shared perf page (`spike/shared/frameworks/perf.html`):  Solid 2 applies
 * writes on a microtask, and `flush()` applies them now.  Mapped as `@spell/ui-spike/perf-adapter` by `SmokeRunner`.
 * - `solid-js` resolves through the import map, i.e. the SAME copy the components use.
 */
import { flush } from "solid-js"

export const adapter = { settle: () => flush() }
