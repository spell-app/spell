/**
 * The `if` rule module:  `if`/`else if`/`else` statements, plus the backwards `if...else` ternary suffix.
 * - One rule class per file;  `if.en.ts` registers them on `_if_` (`if.parser.ts`),
 *   and each other language's `if.<lang>.ts` registers the same rules in its own words.
 * - NOTE: those files register them in TIE-BREAK order:
 *   when two rules match the same words with the same `priority` and length, the one registered first wins.
 *   Moving a line there can change what parses.
 */
export * from "./if.parser"
export * from "./if.shared"
export * from "./If"
export * from "./ElseIf"
export * from "./Else"
export * from "./BackwardsIf"
export * from "./ValueIf"
export * from "./ValueOtherwise"
