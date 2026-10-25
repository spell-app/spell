/**
 * The `events` rule module:  firing and watching global events -- `trigger`/`fire`/`send` and `on` --
 * and the events a template says its things send, `- it sends "flipped" ...` (`declare_event`).
 * - They compile to core's `trigger()` / `on()`, imported from `@spell/core` by name.
 *   Each finds the program's CURRENT runtime when called:  a new one is made each time a program starts.
 * - One rule class per file;  `events.en.ts` registers them on `events` (`events.parser.ts`),
 *   and each other language's `events.<lang>.ts` registers the same rules in its own words.
 * - NOTE: those files register them in TIE-BREAK order:
 *   when two rules match the same words with the same `priority` and length, the one registered first wins.
 *   Moving a line there can change what parses.
 */
export * from "./events.parser"
export * from "./EventWords"
export * from "./Trigger"
export * from "./DeclareEvent"
export * from "./On"
