/**
 * Entry point for `@spell/ui` -- everything:  every component family, registered, plus the foundation.
 * - SIDE EFFECT:  each family's barrel (`$/components/<name>`) calls `define()` for its tags.
 * - Each family also has its own lib entry (`@spell/ui/button` ...), and the shared code two more
 *   (`@spell/ui/core`, `@spell/ui/forms`), so a page can load one family alone.  See `vite.config.ts`.
 * - Namespaces:  `UI` is the runtime instance (see `$/runtime`), `E` the element core (`UIElement`,
 *   `ElementDefinition` ...), `V` the vocabulary.  `$/styles`, `$/icons` and the component classes are flattened:
 *   their names carry their own suffixes or prefixes (`tokensCSS`, `Icons`, `UIButton`).
 */

export * from "$/util"
export * as E from "$/elements"
export * as V from "$/vocabulary"
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
