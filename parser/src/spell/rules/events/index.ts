/**
 * The `events` rule module:  sending events to things (`send`), firing and watching global ones (`trigger`, `on`),
 * a handler's own words (`pass event`, `cancel event`, `sender`, `the original target`), the mouse and keys --
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
export * from "./ChangedProperty"
export * from "./Trigger"
export * from "./Send"
export * from "./EventPart"
export * from "./PassEvent"
export * from "./CancelEvent"
export * from "./InputState"
export * from "./WhileHandler"
export * from "./DeclareEvent"
export * from "./On"
export * from "./WhenChanges"
