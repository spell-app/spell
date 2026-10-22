/**
 * The `statements` rule module:  random statements that didn't earn a module of their own.
 * - One rule class per file;  `statements.en.ts` registers them on `statements` (`statements.parser.ts`),
 *   and each other language's `statements.<lang>.ts` registers the same rules in its own words.
 * - NOTE: those files register them in TIE-BREAK order:
 *   when two rules match the same words with the same `priority` and length, the one registered first wins.
 *   Moving a line there can change what parses.
 */
export * from "./statements.parser"
export * from "./DoNothing"
