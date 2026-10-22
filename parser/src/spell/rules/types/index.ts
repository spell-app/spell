/**
 * The `types` rule module:  type names -- e.g. `thing`, `bank-account`, singular or plural, possibly unknown, resolved
 * against `scope.types` when known.
 * - A name may be several words once declared, e.g. `bank account`;  a declaration's name is `type_words`.
 * - One rule class per file;  `types.en.ts` registers them on `types` (`types.parser.ts`),
 *   and each other language's `types.<lang>.ts` registers the same rules in its own words.
 * - NOTE: those files register them in TIE-BREAK order:
 *   when two rules match the same words with the same `priority` and length, the one registered first wins.
 *   Moving a line there can change what parses.
 */
export * from "./types.parser"
export * from "./SpellType"
export * from "./Type"
export * from "./SingularType"
export * from "./PluralType"
export * from "./QuotedType"
export * from "./SubjectRule"
export * from "./SubjectIt"
export * from "./SubjectIts"
export * from "./SubjectImplied"
export * from "./KnownType"
export * from "./TypeWords"
