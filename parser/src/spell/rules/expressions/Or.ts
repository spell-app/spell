import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { InfixOperatorSuffix } from "./InfixOperatorSuffix"
import { Precedence, type OperatorOperands } from "./expressions.shared"

/**
 * `or` rule:  `{lhs} or {rhs}`, e.g. `thing or other`.
 * - `Precedence.or`:  lowest of the boolean / comparison suffixes.
 */
export class Or extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.or
  @proto static parenthesize = true

  getOperator(): P.ASTOperator {
    return "or"
  }

  /**
   * `its title is "Ana" or "Bo"` means `its title is "Ana" or its title is "Bo"`, and `is either "Ana" or "Bo"` too (epic `data` I13).
   * - Written as they read, they'd be `title === "Ana" || "Bo"`:  always true, a silent wrong answer.
   * - Only with a plain text or number after `or`:  anything else is a test of its own.
   */
  compileASTExpression(match: P.MatchFor<this>, operands: OperatorOperands): P.ASTNode {
    const { lhs, rhs } = operands
    if (!isPlainValue(rhs) || !lhs) return super.compileASTExpression(match, operands)
    const included = includedIn(match, lhs, rhs)
    if (included) return included
    const compared = comparedIn(lhs)
    if (!compared) return super.compileASTExpression(match, operands)
    const other = new P.ASTInfixExpression(match, { lhs: compared, operator: "equals", rhs })
    return new P.ASTInfixExpression(match, { lhs, operator: "or", rhs: other })
  }
}

/** Is `node` a plain text or number:  never a test? */
function isPlainValue(node: P.ASTNode | undefined): node is P.ASTExpression {
  return node instanceof P.ASTStringLiteral || node instanceof P.ASTNumericLiteral
}

/** What `lhs` compares with `is`, its own or the last `or`'s:  `undefined` if it's no comparison. */
function comparedIn(lhs: P.ASTNode): P.ASTExpression | undefined {
  const node = P.unparenthesized(lhs)
  if (!(node instanceof P.ASTInfixExpression)) return undefined
  if (node.operator === "equals") return node.lhs
  return node.operator === "or" ? comparedIn(node.lhs) : undefined
}

/** `core.includes("Ana", title)`, from `is either "Ana"`, with `rhs` added to what it looks in:  `undefined` for anything else. */
function includedIn(match: P.Match, lhs: P.ASTNode, rhs: P.ASTExpression): P.ASTNode | undefined {
  const node = P.unparenthesized(lhs)
  if (!(node instanceof P.ASTCoreMethodInvocation) || node.methodName !== "includes") return undefined
  const [list, thing] = node.args?.args ?? []
  if (!thing) return undefined
  const items = list instanceof P.ASTArrayLiteral ? [...(list.items ?? [])] : isPlainValue(list) ? [list] : undefined
  if (!items) return undefined
  return new P.ASTCoreMethodInvocation(match, {
    methodName: "includes",
    args: [new P.ASTArrayLiteral(match, { items: [...items, rhs] }), thing as P.ASTExpression]
  })
}
