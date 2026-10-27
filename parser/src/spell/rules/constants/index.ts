/**
 * The `constants` rule module:  rules for constants -- e.g. `red`, `green`, either free-standing
 * (possibly-unknown, quoted as a string literal) or resolved against `scope.constants` (`known_constant`).
 * - One rule class per file;  `constants.en.ts` registers them on `constants` (`constants.parser.ts`),
 *   and each other language's `constants.<lang>.ts` registers the same rules in its own words.
 * - `SpellConstant` is their base class, not a rule:  other modules use it, e.g. `SpellConstant.declareValue()`.
 * - NOTE: those files register them in TIE-BREAK order:
 *   when two rules match the same words with the same `priority` and length, the one registered first wins.
 *   Moving a line there can change what parses.
 */
export * from "./constants.parser"
export * from "./SpellConstant"
export * from "./Constant"
export * from "./KnownConstant"
