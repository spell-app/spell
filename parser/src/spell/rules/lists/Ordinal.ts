import { proto } from "spell/util"
import { P } from "spell/parser/parser"

/**
 * `ordinal` rule:  ordinal numbers (`first`, `second`, `last`, etc.), mapped to numeric literals via `VALUE_MAP`.
 * TODO: sixty-fifth, two hundred forty ninth... with custom parser?
 */
export class Ordinal extends P.Pattern {
  // Its words and what each means (`pattern`, `VALUE_MAP`) are the language's:  see its `.en.ts` registration
  @proto static matchGroup = "ordinal"

  /** An ordinal literal, not a plain number:  "the first card" is the first, whatever the project counts from. */
  getAST(match: P.MatchFor<this>): P.ASTOrdinalLiteral {
    const { value, raw } = match
    return new P.ASTOrdinalLiteral(match, { value, raw })
  }
}
