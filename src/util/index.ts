/**
 * Barrel for `spell/util` -- helpers shared by `ui`, `spell` and `cli`, in four layers.
 * - GENERIC (the files beside this one):  `@proto`, class, name-case string and shadow-aware DOM helpers.
 *   - No runtime dependencies:  safe anywhere, including `*.types.ts` files and SSR / node tooling.
 *   - `spell-ui` is published, and bundles what it imports from here.
 * - REACTIVE (`./reactive`):  the reactive engine every reactive class shares --
 *   spell cells, the records, the schema, `@prop` / `@state` / `@derived`.
 *   Generic too:  no lodash, no Solid.
 * - PERSIST (`./persist`):  what an app keeps for people --
 *   preferences across visits (`PrefStore` and the places it keeps them), and an undo history (`UndoStack`).
 *   Generic too:  Spell UI imports the pref store by file (`spell/util/persist/PrefStore`).
 * - SPELL'S (`./spell`, flattened in LAST):  lodash, `chalk`, `pluralize`, fetch, tasks.
 *   - NEVER import them from `ui`:
 *     `ui`'s `src/util/index.ts` imports the generic files one by one (`spell/util/class` ...), never this barrel,
 *     so none of it lands in `ui`'s bundles or published declarations.
 * - NOTE: no namespace here (unlike `UI` / `E`):
 *   utilities are imported by name, e.g. `import { proto, kebabCase } from "spell/util"`.
 * - NOTE: other packages import `spell/util` ONLY, never `spell/util/<file>`:
 *   except `ui`'s util barrel (above), and Spell UI's files that keep preferences (`PrefStore`).
 */

export * from "./util.types"

export * from "./class"
export * from "./decorators"
export * from "./string"
export * from "./dom"

export * from "./reactive"
export * from "./persist"

export * from "./spell"
