import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { SpellConstant } from "spell-lang/spell/rules/constants"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

/**
 * `expect_test` rule:  `expect {expression}`, `expect {expression} to be {value}` or
 * `{expression} should be {value}` -- an assertion.
 * - e.g. `expect the rank of it to be "queen"` => `core.expect(it.rank, ..., "queen", ...)`.
 * - e.g. `its rank should be queen` => `core.expect(it.rank, \`its rank\`, "queen", \`queen\`)`.
 * - The value is an expression, else a bare word, e.g. `queen`, as `"queen"` (as `value_if`'s is).
 * - What it says when it fails names both as written:  `its rank`, `queen`.
 */
export class ExpectTest extends SpellStatement<"expression|value?"> {
  @proto static alias = ["statement"]

  /** SIDE EFFECT:  a bare word, e.g. `queen`, becomes a known value -- see `SpellConstant.declareValue()`. */
  mutateScope(match: P.MatchFor<this>) {
    SpellConstant.declareValue(match, match.groups.value)
  }

  getAST(match: P.MatchFor<this>) {
    const { expression, value } = match.groups
    // `Match.raw` is a `declare`d field, always statically present, so `"raw" in value` can't narrow it here
    // (TS treats the "absent" branch as `never`); use nullish coalescing for the same runtime fallback.
    const valueString: string | undefined = value ? (value.raw ?? value.value) : undefined
    return new P.ASTExpectMethodInvocation(match, {
      expression: P.asAST<P.ASTExpression>(expression.AST),
      expressionString: expression.value,
      value: value && P.asAST<P.ASTExpression>(value.AST),
      valueString
    })
  }
}
