/**
 * `core` lib entry:  the Solid spike's element core PLUS the foundation it builds on, as ONE module.
 * - Every component family imports from here (`$spike/core`), never from the pieces, so Rolldown puts all of
 *   it in `dist/core.js` and each family entry holds only its own classes, sheet, vocabulary and fallback.
 * - Pulls in:
 *   - the element core -- `UIHost`, `UIElement`, `ElementDefinition`, `ContentPart` + `PartContext` (owner
 *     context), `Controlled`, `Cell`, `SlotContent`, `HostAttribute`, `IconGlyph`
 *   - `$/util`, `$/vocabulary`, `$/components/components.types` -- foundation JS
 *   - from `$/elements`:  `ClassBuilder`, `Shorthand`, `OwnerContext`, `NativeFallback` (the fallbacks' base)
 *   - `$/runtime` -- ONLY the eager loader (`UI`, `loadUI`);  `UIRuntime` stays a lazy chunk
 *   - `$/icons` -- `Icons`;  icon data and alias maps stay lazy chunks
 * - NOT here:  the `forms` entry (`forms.ts`:  `FormElement`, `FormHost`, `Validator`, `MenuOptions`), loaded only
 *   by families that import it.
 * - NOTE: `$/elements` leaves are imported directly, against `AGENTS.md`:  its barrel also exports `Validator` /
 *   `MenuOptions`, and an `export *` here would make them `core` exports, i.e. core bytes.
 * - NOTE: `solid-js`, `@solidjs/web` and `@spell/solid-element` are NOT re-exported:  peer dependencies, external
 *   in the build (`vite.config.ts`).
 * - NOTE: the identity hook for the Solid 2 host page is NOT set here but by `identity.ts`, loaded by the `index`
 *   entry:  its `import * as` namespaces would pin ALL of Solid into any bundle that includes `core`.
 */

export * from "$/util"
export * from "$/vocabulary"
export * from "$/elements/elements.types"
export * from "$/elements/ClassBuilder"
export * from "$/elements/Shorthand"
export * from "$/elements/OwnerContext"
export * from "$/elements/NativeFallback"
export * from "$/runtime"
export * from "$/icons"
export * from "$/components/components.types"

export * from "./spike.types"
export * from "./Cell"
export * from "./ElementDefinition"
export * from "./UIHost"
export * from "./PartContext"
export * from "./Controlled"
export * from "./UIElement"
export * from "./ContentPart"
export * from "./SlotContent"
export * from "./HostAttribute"
export * from "./IconGlyph"
