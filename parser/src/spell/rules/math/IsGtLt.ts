import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { InfixOperatorSuffix, Precedence, Wording } from "spell-parser/spell/rules/expressions"

/**
 * `is_gt_lt` rule:  `is greater than` or `is less than`, optionally `... or equal to`.
 * - e.g. `salary is greater than expenses`
 * - TODO: is *not* greater than???
 * - `getOperator()` maps what `operator` means (`is_greater_or_less_than`) to an operator:
 *   `greater` / `less` / `at_least` / `at_most` => `greater than` / `less than` / `at least` / `at most`.
 */
export class IsGtLt extends InfixOperatorSuffix<"operator|expression"> {
  @proto static precedence = Precedence.comparison
  @proto static parenthesize = true

  /** The operator `operator` means, e.g. `at least` for `is greater than or equal to`. */
  getOperator(operator: P.Match): P.ASTOperator {
    const meaning = Wording.meaningOf(operator) as Comparison | undefined
    if (!meaning) {
      const problem = `\`${operator.value}\` means nothing`
      throw new TypeError(`IsGtLt.getOperator():  ${problem};  put each form of \`is_greater_or_less_than\` in a group`)
    }
    return OPERATOR_FOR_MEANING[meaning]
  }
}

/** The meanings of `is_greater_or_less_than`'s forms. */
type Comparison = "greater" | "less" | "at_least" | "at_most"

/** The operator each meaning compiles to. */
const OPERATOR_FOR_MEANING: Record<Comparison, P.ASTOperator> = {
  greater: "greater than",
  less: "less than",
  at_least: "at least",
  at_most: "at most"
}
