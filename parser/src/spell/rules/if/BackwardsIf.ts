import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { InfixOperatorSuffix, Precedence } from "spell-lang/spell/rules/expressions"

/**
 * `backwards_if` rule:  postfix ternary, `{expr} if {condition} (else|otherwise) {expr}`.
 * - English word order ("do X if Y else Z"), rather than `condition ? then : else`.
 * - e.g. `1 if bar else 2`
 * - `otherwise it is 2` says the same (epic `spanish` I8):  `it is` there is never a comparison with `2`.
 *   Spanish's `de lo contrario es "↓"` is that form, as the glossary words it.
 * - An `expression_suffix`:  `lhs` (the value before `if`) is supplied by `CompoundExpression`'s shunting-yard.
 *   This rule's own `syntax` only spells out `operator` (actually the *condition* expression here)
 *   and the trailing `rhs` expression.
 * - Compiles to `P.ASTTernaryExpression`.
 */
export class BackwardsIf extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.ternary

  /** What both sides are, if they agree -- else unknown. */
  getResultDatatype(
    match: P.MatchFor<this>,
    lhs: P.Datatype | undefined,
    rhs: P.Datatype | undefined
  ): P.Datatype | undefined {
    return lhs === rhs ? lhs : undefined
  }

  compileASTExpression(
    match: P.Match,
    { lhs, operator, rhs }: { lhs: P.ASTExpression; operator: P.Match; rhs: P.ASTExpression }
  ): P.ASTTernaryExpression {
    return new P.ASTTernaryExpression(match, {
      condition: operator.AST as P.ASTExpression,
      trueValue: lhs,
      falseValue: rhs
    })
  }
}
