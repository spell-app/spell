/**
 * The `async` rule module:  async control flow and conceptual "processes" -- `await`, `pause for`, and
 * start/stop/check process.
 * - One rule class per file;  `async.en.ts` registers them on `_async` (`async.parser.ts`),
 *   and each other language's `async.<lang>.ts` registers the same rules in its own words.
 * - NOTE: those files register them in TIE-BREAK order:
 *   when two rules match the same words with the same `priority` and length, the one registered first wins.
 *   Moving a line there can change what parses.
 */
export * from "./async.parser"
export * from "./Await"
export * from "./Pause"
export * from "./StartProcess"
export * from "./StopProcess"
export * from "./CheckProcess"
