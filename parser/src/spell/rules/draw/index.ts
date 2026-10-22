/**
 * The `draw` rule module:  draw utilities, tightly tied into `App`, `Drawable` and `List`.
 * - One rule class per file;  `draw.en.ts` registers them on `draw` (`draw.parser.ts`),
 *   and each other language's `draw.<lang>.ts` registers the same rules in its own words.
 * - NOTE: those files register them in TIE-BREAK order:
 *   when two rules match the same words with the same `priority` and length, the one registered first wins.
 *   Moving a line there can change what parses.
 */
export * from "./draw.parser"
export * from "./DrawThing"
export * from "./DrawItems"
export * from "./StartApp"
