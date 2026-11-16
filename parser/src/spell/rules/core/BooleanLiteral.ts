import { assert, proto } from "spell/util"
import { P } from "spell/parser/parser"
import type { SP } from "spell/parser/spell"

/**
 * `boolean` rule:  boolean literal -- also accepts common synonyms like `yes`/`no`, `ok`/`cancel`, `always`/`never`.
 * - e.g. `true`, `yes`, `ok`, `always`
 * - Class named `BooleanLiteral`, not `Boolean`, which would hide javascript's `Boolean`.
 * - TODO: better name for this?  "flag"?  "truism"?
 */
export class BooleanLiteral extends P.Pattern {
  // Its words and what each means (`pattern`, `VALUE_MAP`) are the language's:  see its `.en.ts` registration
  static ruleName = "boolean"
  /** what it is to a reader, in the bubbly look:  each language registers its own class of it, so its roles are this one's */
  declare roles: SP.BubblyRuleRoles
  @proto static roles: SP.BubblyRuleRoles = { match: "written value" }
  @proto static alias = "expression"
  @proto static datatype = "choice"

  getAST(match: P.MatchFor<this>): P.ASTBooleanLiteral {
    const { value, raw } = match
    return new P.ASTBooleanLiteral(match, { value: assert.boolean(value), raw })
  }
}
