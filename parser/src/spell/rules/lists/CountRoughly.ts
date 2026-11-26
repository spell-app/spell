import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { PostfixOperatorSuffix, Precedence, SuffixLeft, type OperatorOperands } from "spell/parser/spell/rules/expressions"
import { isItemScope } from "./lists.shared"

/** What `, roughly` notes on the count it follows (`CountRoughly`):  the place's estimate will do. */
export type RoughlyData = { roughly?: boolean }

/** The counts `, roughly` may follow. */
const COUNTS = new Set(["list_count", "number_of_things_where"])

/**
 * `count_roughly` rule:  an ending on `the number of`, saying the place's estimate will do.
 * - e.g. `the number of jobs, roughly`;  Spanish `el número de trabajos, más o menos`
 * - A web server that counts only its pages (pages × page size) is taken at its word, rather than its last page
 *   read for an exact count (`core.savedCount()`'s `roughly`).  An exact count it gives is still exact.
 * - Only after `the number of`, of a read its place counts (`EveryThing.countAST()`);  anywhere else it reads as nothing.
 * - Compiles to the count itself:  the count, told, makes its own call.
 */
export class CountRoughly extends PostfixOperatorSuffix {
  @proto static precedence = Precedence.ternary
  @proto static datatype: P.Datatype | undefined = "number"

  /** Only after a count;  SIDE EFFECT:  the count notes it. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    if (isItemScope(scope)) return undefined
    const left = SuffixLeft.current
    if (!left || !COUNTS.has(left.rule.name ?? "")) return undefined
    const match = super.parse(scope, tokens)
    if (!match) return undefined
    ;(left.data as RoughlyData).roughly = true
    return match
  }

  /** A number, as the count is. */
  getResultDatatype(_match: P.MatchFor<this>, lhs: P.Datatype | undefined): P.Datatype | undefined {
    return lhs
  }

  compileASTExpression(_match: P.MatchFor<this>, { lhs }: OperatorOperands): P.ASTExpression {
    return lhs!
  }
}
