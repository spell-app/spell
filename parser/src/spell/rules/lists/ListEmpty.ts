import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

/**
 * `list_empty` rule:  empty a list in place, or clear a value back to its empty one.
 * - A list:  `empty my-list` => `core.clear(myList)`.
 * - Text, a number or a yes / no (epic `outline-spell` P28):  `clear its hint` => `this.hint = ""`;
 *   a number to `0`, a yes / no to `no`.
 * - Anything else is cleared as a list is:  `core.clear()` says if it can't.
 */
export class ListEmpty extends SpellStatement<"list"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation | P.ASTAssignmentStatement {
    const { list } = match.groups
    const empty = ListEmpty.emptyValueOf(match, list.datatype)
    if (empty) return new P.ASTAssignmentStatement(match, { thing: P.matchAST(list), value: empty })
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "clear",
      args: [P.matchAST(list)]
    })
  }

  /** The empty value of a `datatype` that isn't a list:  `""`, `0`, `no` -- `undefined` for any other. */
  private static emptyValueOf(match: P.AnyMatch, datatype: P.Datatype | undefined): P.ASTLiteral | undefined {
    if (datatype === "text") return new P.ASTStringLiteral(match, { value: "", quote: '"' })
    if (datatype === "number") return new P.ASTNumericLiteral(match, 0)
    if (datatype === "choice") return new P.ASTBooleanLiteral(match, false)
    return undefined
  }
}
