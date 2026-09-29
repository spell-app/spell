/**
 * `core` lib entry:  the Lit spike's element core PLUS the foundation it builds on, as ONE module.
 * - Every component family imports from here (`../../core`), never from the pieces, so Rolldown puts
 *   all of it in `dist/core.js` and each family entry holds only its own classes, sheet, vocabulary and fallback.
 * - Pulls in:
 *   - `./elements` -- `UIElement`, `ContentPart`, owner context, icon renderer, the vocabulary => Lit bridge
 *   - `$/util`, `$/vocabulary`, `$/components/components.types` -- foundation JS
 *   - from `$/elements`:  `ClassBuilder`, `Shorthand`, `OwnerContext`, `NativeFallback` (the fallbacks' base)
 *   - `$/runtime` -- ONLY the eager loader (`UI`, `loadUI`);  `UIRuntime` stays a lazy chunk
 *   - `$/icons` -- `Icons`;  icon data and alias maps stay lazy chunks
 * - NOT here:  the `forms` entry (`forms.ts`:  `FormElement`, `Validator`, `MenuOptions`), loaded only by families
 *   that import it.
 * - NOTE: `$/elements` leaves are imported directly, against `AGENTS.md`:  its barrel also exports `Validator` /
 *   `MenuOptions`, and an `export *` here would make them `core` exports, i.e. core bytes.
 * - NOTE: `lit` is NOT re-exported:  it's a peer dependency, external in the build (`vite.config.ts`).
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

export * from "./elements"
