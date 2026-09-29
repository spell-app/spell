/**
 * Barrel for `$/icons` -- the Font Awesome 7 Free icon data pipeline and its runtime loader.
 * - NOTE: no self-namespace (unlike `UI` / `E`):  `Icons` is the only exported class, so
 *   `import { Icons } from "$/icons"` already reads as a namespace.
 * - NOTE: the generated data files under `./data/*.json` are NOT re-exported here -- they're loaded
 *   internally by `Icons` (statically for the small alias maps, dynamically for everything else).
 *   A consumer never imports them directly.
 */

export * from "./icons.types"

export * from "./Icons"
