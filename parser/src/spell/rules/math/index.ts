/**
 * The `math` rule module:  math-y bits -- comparison operators (`<`, `is greater than`), arithmetic operators
 * (`plus`, `times`, ...), and standalone math functions (`absolute value`, `max`/`min`, `round`).
 * - NOTE: this must come after "operators".
 * - One rule class per file;  `math.en.ts` registers them on `math` (`math.parser.ts`),
 *   and each other language's `math.<lang>.ts` registers the same rules in its own words.
 * - NOTE: those files register them in TIE-BREAK order:
 *   when two rules match the same words with the same `priority` and length, the one registered first wins.
 *   Moving a line there can change what parses.
 */
export * from "./math.parser"
export * from "./GtLt"
export * from "./IsGtLt"
export * from "./Plus"
export * from "./Minus"
export * from "./Times"
export * from "./DividedBy"
export * from "./AbsoluteValue"
export * from "./Max"
export * from "./Min"
export * from "./RoundNumber"
