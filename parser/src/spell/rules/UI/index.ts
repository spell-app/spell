/**
 * The `UI` rule module:  user-facing I/O statements -- `print`, `notify`, `alert`, `warn`, `confirm`, `prompt` --
 * plus inline `css` string installation.
 * - One rule class per file;  `UI.en.ts` registers them on `UI` (`UI.parser.ts`),
 *   and each other language's `UI.<lang>.ts` registers the same rules in its own words.
 * - NOTE: those files register them in TIE-BREAK order:
 *   when two rules match the same words with the same `priority` and length, the one registered first wins.
 *   Moving a line there can change what parses.
 */
export * from "./UI.parser"
export * from "./Print"
export * from "./EndPrintGroup"
export * from "./Notify"
export * from "./Alert"
export * from "./Warn"
export * from "./Confirm"
export * from "./Prompt"
export * from "./CSSStyles"
