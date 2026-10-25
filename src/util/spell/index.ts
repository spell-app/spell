/**
 * Barrel for `spell/util/spell` -- Spell's own utilities, flattened into `spell/util` by `../index.ts`.
 * - Grouped below by rough concern:  constants, app plumbing, language helpers, fetch / observable, DOM, tasks.
 * - A sub-folder, not beside the generic helpers:
 *   `ui` is published and bundles the generic files, and these pull in lodash, `chalk` and `pluralize`.
 *   - `string.ts` and `DOM.ts` also share a name with the generic `../string.ts` / `../dom.ts`,
 *     and macOS is case-insensitive.
 * - NOTE: files here import the generic helpers by deep path (`spell/util/class`), never the `spell/util` barrel:
 *   it re-exports this folder, which would be a cycle.
 * - NOTE: `ResponseErrors.ts` is deliberately NOT re-exported here,
 *   so its error classes (`ResponseError`, `MissingResourceError` ...) stay off this barrel's public surface.
 *   - `$fetch.ts` and `LoadableFile.ts` import them as peers.
 *   TODO: confirm that's intentional rather than a gap --
 *   only spell-app's `disk-fetch.ts` imports one from outside, by file (`spell/util/spell/ResponseErrors`).
 */

export * from "./constants"

export * from "./Logger"

export * from "./assert"
export * from "./Derivative"
export * from "./spellDecorators"
export * from "./Assertable"
export * from "./string"
export * from "./view"
export * from "./json"
export * from "./array"
export * from "./paths"
export * from "./die"
export * from "./safely"
export * from "./CustomError"

export * from "./abortableFetch"
export * from "./$fetch"
export * from "./Observable"
export * from "./Loadable"
export * from "./LoadableFile"

export * from "./Task"
export * from "./TaskList"
