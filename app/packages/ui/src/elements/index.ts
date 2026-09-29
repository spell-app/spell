/**
 * Barrel for `$/elements` -- the library-neutral element core every `UIElement` builds on:
 * class building, validation, option model, owner context, shorthand.
 * - No base library:  the Milestone 0 spike builds `UIElement` on top of these for Lit and for Solid.
 * - NOTE: `export * as E from "."` (the sub-system namespace) is added once `UIElement` lands here.
 * - `NativeFallback` is the base of the per-component `*.fallback.ts` classes (plain DOM when a render throws).
 * - NOTE: only `OwnerContext.find()` touches the DOM, and only when called.
 */

export * from "./elements.types"

export * from "./ClassBuilder"
export * from "./Validator"
export * from "./MenuOptions"
export * from "./OwnerContext"
export * from "./Shorthand"
export * from "./NativeFallback"
