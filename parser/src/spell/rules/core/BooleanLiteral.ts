import { assert, proto } from "spell/util"
import { P } from "spell/parser/parser"

/**
 * `boolean` rule:  boolean literal -- also accepts common synonyms like `yes`/`no`, `ok`/`cancel`, `always`/`never`.
 * - e.g. `true`, `yes`, `ok`, `always`
 * - Class named `BooleanLiteral`, not `Boolean`, which would hide javascript's `Boolean`.
 * - TODO: better name for this?  "flag"?  "truism"?
 */
export class BooleanLiteral extends P.Pattern {
  // Its words and what each means (`pattern`, `VALUE_MAP`) are the language's:  see its `.en.ts` registration
  static ruleName = "boolean"
  @proto static alias = "expression"
  @proto static datatype = "choice"

  getAST(match: P.MatchFor<this>): P.ASTBooleanLiteral {
    const { value, raw } = match
    return new P.ASTBooleanLiteral(match, { value: assert.boolean(value), raw })
  }
}
