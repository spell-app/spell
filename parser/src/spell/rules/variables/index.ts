/**
 * The `variables` rule module:  single-word identifiers, known or unknown, singular or plural.
 * - NOTE the split, which the `_identifier` / `variable` suffixes are there to tell you:
 *   - `identifier` / `singular_identifier` / `plural_identifier` match a BARE word, no `the`.
 *   - `variable` / `known_variable` also allow a leading `the`, e.g. `the thing`.
 * - One rule class per file;  `variables.en.ts` registers them on `variables` (`variables.parser.ts`),
 *   and each other language's `variables.<lang>.ts` registers the same rules in its own words.
 *   `SpellIdentifier`, the base class of the `*identifier` rules, registers nothing itself.
 * - NOTE: those files register them in TIE-BREAK order:
 *   when two rules match the same words with the same `priority` and length, the one registered first wins.
 *   Moving a line there can change what parses.
 */
export * from "./variables.parser"
export * from "./variables.shared"
export * from "./SpellIdentifier"
export * from "./Identifier"
export * from "./SingularIdentifier"
export * from "./PluralIdentifier"
export * from "./Variable"
export * from "./KnownVariable"
export * from "./WordsIdentifier"
export * from "./WordsVariable"
export * from "./KnownWordsVariable"
