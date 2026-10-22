import { P } from "spell-lang/parser"

/**
 * A WORD RULE whose forms all mean the same to spell, e.g. `is_or_are`, `(is|are)` (epic `spanish` P3).
 * - The articles are these too:  `indefinite_article`, `(a|an)`;  `definite_article`, `the`.
 * - A plain keyword:  no meanings to read, just "is it one of these words?".
 * - For code that looks ahead at a person's own words:  `Wording.reads(scope, "is_or_are", word)`, never
 *   `/^(is|are)$/`.  Spanish registers `(es|son)` under the same name.
 * - Registered once per word list, `Synonyms.specialize({ ruleName: "is_or_are" })`.
 */
export class Synonyms extends P.Keyword {}
