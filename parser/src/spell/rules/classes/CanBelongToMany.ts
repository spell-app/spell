import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { Priority } from "spell-parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

/**
 * `can_belong_to_many` rule:  `a card can belong to many piles` -- the opposite of `a card belongs to one pile`:
 * what a list does anyway, so it compiles to nothing.  It says so for a reader (epic page Q22).
 */
export class CanBelongToMany extends SpellStatement<"type|list"> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    return new P.ASTStatementGroup(match, { statements: [] })
  }
}
