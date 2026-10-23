import { NONE, proto } from "spell/util"
import { P } from "spell-parser/parser"
import { SpellConstant } from "./SpellConstant"

/**
 * `known_constant` rule:  single-word constant that MUST already be known in `scope.constants` -- fails otherwise.
 * - Defined as an `expression`, unlike plain `constant`, precisely because it only matches when resolvable:
 *   it can't spuriously eat an unrelated identifier.
 * - Compiles to the constant's own `output` if it set one, else a quoted string literal of its name.
 */
export class KnownConstant extends SpellConstant {
  @proto static alias = "expression"

  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens)
    // Succeed only if `SpellConstant.parse()` found the scope constant.
    if (match?.data.scopeConstant !== NONE) return match
    return undefined
  }
}
