/**
 * Entry point for `@spell/ui` -- everything.
 * - Components register here as they land:  a side-effect import per component (which calls
 *   `customElements.define()`), plus a re-export of its class, e.g. `UIButton`.
 * - Each component also gets its own entry in `vite.config.ts`, so it can be imported alone.
 * - Namespaces:  `UI` is the runtime instance (see `$/runtime`), `E` the element core, `V` the vocabulary.
 *   `$/styles` and `$/icons` are flattened:  their names carry their own suffixes (`tokensCSS`, `Icons`).
 */

export * from "$/util"
export * as E from "$/elements"
export * as V from "$/vocabulary"
export * from "$/runtime"
export * from "$/styles"
export * from "$/icons"
