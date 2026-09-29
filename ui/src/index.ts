/**
 * Entry point for `@spell/ui`.
 * - Components register here as they land:  a side-effect import per component (which calls
 *   `customElements.define()`), plus a re-export of its class, e.g. `UIButton`.
 * - Each component also gets its own entry in `vite.config.ts`, so it can be imported alone.
 * - For now it only re-exports `$/util`.
 */

export * from "$/util"
