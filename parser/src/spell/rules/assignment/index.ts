/**
 * The `assignment` rule module:  assignment and returning values.
 * - One rule class per file;  `assignment.en.ts` registers them on `assignment` (`assignment.parser.ts`),
 *   and each other language's `assignment.<lang>.ts` registers the same rules in its own words.
 * - NOTE: those files register them in TIE-BREAK order:
 *   when two rules match the same words with the same `priority` and length, the one registered first wins.
 *   Moving a line there can change what parses.
 */
export * from "./assignment.parser"
export * from "./AssignmentStatement"
export * from "./WordsAssignment"
export * from "./Get"
export * from "./ReturnStatement"
