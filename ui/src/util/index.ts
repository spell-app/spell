/**
 * Barrel for `spell-ui/util` -- general-purpose utilities with no dependency on the rest of the package.
 * - Re-exports `packages/util`'s GENERIC files (`@proto`, class / string / DOM helpers, `Prettify` ...),
 *   shared with `spell`:  they live there, not here, so every package shares ONE copy.
 * - NOTE: imports them one by one (`spell/util/class` ...), NEVER `spell/util`'s barrel:
 *   that also flattens in `spell/util/spell` (lodash, `chalk`, `pluralize`, fetch, tasks ...),
 *   which would land in `ui`'s `core` bundle and published declarations.
 *   - An allowed exception to "import another package's barrel only".
 *   - Add a file here when `util` gains a GENERIC one that components use (`number`:  `clamp()`).
 *     NOT `time` or `color`:  the few files that need them import them by file (`spell/util/color`),
 *     so they stay out of `core`.
 *     NOT `persist/` (`PrefStore` ...):  in `core` it cost every page 1.9 kB (`yarn measure`, 2026-10-24),
 *     so the few files that keep preferences import it by file (`spell/util/persist/PrefStore`).
 *   - `yarn measure` and `yarn smoke` catch a leak.
 * - Its place in the import graph:  the BOTTOM of `ui`, importing nothing of it,
 *   so it's safe to import anywhere, including `*.types.ts` files, node tooling and the runtime's lazily-loaded chunk.
 * - NOTE: no namespace of its own.
 *   `core.ts` re-exports it, so component files and the element core use it as `E.proto`, `E.Warnings` ...
 *   (`AGENTS.md`, "Solid authoring").
 *   - Only what sits BELOW `core` imports it by name (`import { proto, suggest } from "spell-ui/util"`):
 *     `spell-ui/vocabulary`, `spell-ui/icons`, the runtime, types files.
 * - Also:
 *   - the kit's timing helpers (`spell/util/timing`), to run a function later:
 *     `afterSolidUpdate()`, `beforeNextPaint()`, `soon()`, `after()`, `every()`;  and to wait:  `waitUntil()`, `within()`
 *   - `Warnings` -- `ui`'s console warnings, its own
 *   - `LoadOnce` -- a load per key, once per page, with a choice of what a failure does
 */

export * from "spell/util/class"
export * from "spell/util/decorators"
export * from "spell/util/dom"
export * from "spell/util/number"
export * from "spell/util/string"
export * from "spell/util/util.types"

export * from "spell/util/timing"
export * from "./Warnings"
export * from "./LoadOnce"
