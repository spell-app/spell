/**
 * Entry point for `@spell/ui` -- everything:  every component family, registered, plus the foundation.
 * - SIDE EFFECT:  each family's barrel (`$/components/<name>`) calls `define()` for its tags.
 * - Each family also has its own lib entry (`@spell/ui/button` ...), and the shared code two more
 *   (`@spell/ui/core`, `@spell/ui/forms`), so a page can load one family alone.  See `vite.config.ts`.
 * - FLAT:  `UI` is the runtime instance (see `$/runtime`);  `$/styles`, `$/icons` and the component classes carry
 *   their own suffixes or prefixes (`tokensCSS`, `Icons`, `UIButton`).
 * - NOTE: NO namespaces here.  `E` (element core) and `V` (vocabulary) live in the `api` entry (`src/api.ts`,
 *   `@spell/ui/api`):  `export * as` here moved Rolldown's runtime helpers into a chunk every page loaded.
 *   The element core is also flat in `@spell/ui/core`.
 */

export * from "$/util"
export * from "$/runtime"
export * from "$/styles"
export * from "$/icons"
export * from "$/components/components.types"

export * from "$/components/button"
export * from "$/components/dropdown"
export * from "$/components/icon"
export * from "$/components/label"
export * from "$/components/parts"
export * from "$/components/divider"
export * from "$/components/segment"
export * from "$/components/container"
export * from "$/components/grid"
export * from "$/components/image"
export * from "$/components/text"
export * from "$/components/flag"
export * from "$/components/loader"
export * from "$/components/placeholder"
export * from "$/components/message"
export * from "$/components/breadcrumb"
export * from "$/components/input"
export * from "$/components/checkbox"
export * from "$/components/form"
export * from "$/components/item"
export * from "$/components/list"
export * from "$/components/menu"
export * from "$/components/table"
