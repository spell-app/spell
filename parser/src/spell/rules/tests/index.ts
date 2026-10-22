/**
 * The `tests` rule module:  inline spell tests -- `expect`/`start test`/`end test`/`echo`, used to write assertions and
 * debug output directly in spell source rather than in a separate test language.
 * - One rule class per file;  `tests.en.ts` registers them on `tests` (`tests.parser.ts`),
 *   and each other language's `tests.<lang>.ts` registers the same rules in its own words.
 * - NOTE: those files register them in TIE-BREAK order:
 *   when two rules match the same words with the same `priority` and length, the one registered first wins.
 *   Moving a line there can change what parses.
 */
export * from "./tests.parser"
export * from "./ExpectTest"
export * from "./StartTest"
export * from "./EndTest"
export * from "./Echo"
