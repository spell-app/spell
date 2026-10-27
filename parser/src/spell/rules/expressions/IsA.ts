import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `is_a` rule:  `{lhs} is [not] a`/`an {type}`, e.g. `thing is a Bee`.
 * - The type MUST be known (`known_type`), so a typo is a parse error, e.g. `is a crad`.  Known:
 *   - built in, e.g. `is a number`
 *   - imported
 *   - declared earlier in the project
 *   - or mentioned earlier -- a `stub`, e.g. by `a joker has a color ...` above `a joker is a card`.
 *     See `P.TypeScope.getOrStub()`.
 * - Negated by its word rule's `negated` forms, e.g. `isn't` -- see `Negatable`.
 * - Compiles to `core.isOfType(lhs, 'TypeName')`, the type's name as text (`P.ASTTypeNameLiteral`):
 *   its RUNTIME name, which differs for a type imported renamed -- see `P.ASTTypeExpression.runtimeName`.
 *   - A writer may test it its own way, e.g. javascript's `lhs instanceof TypeName`.
 */
export class IsA extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.comparison

  compileASTExpression(match: P.MatchFor<this>, { lhs, rhs }: OperatorOperands): P.ASTCoreMethodInvocation {
    // a type's class, by the name it has when the code runs -- see `P.ASTTypeExpression.runtimeName`
    const type =
      rhs instanceof P.ASTTypeExpression
        ? new P.ASTTypeNameLiteral(match, { value: rhs.runtimeName, quote: "'" })
        : new P.ASTQuotedExpression(match, { expression: rhs! })
    return new P.ASTCoreMethodInvocation(match, { methodName: "isOfType", args: [lhs!, type] })
  }
}
