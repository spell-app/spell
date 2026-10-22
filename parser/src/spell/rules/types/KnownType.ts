import { NONE } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { SpellType } from "./SpellType"

/**
 * `known_type` rule:  known type identifier, NOT including built-in types like `Object`.
 * - e.g. `thing`, if `Thing` is a known type
 * - e.g. `bank account` or its short name `account`, after `a bank account aka account is a thing`
 * - `match.data.scopeType` will be the existing `TypeScope`.
 */
export class KnownType extends SpellType {
  // alias: "expression",
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens)
    // Succeed only if `SpellType.parse()` found the scope type.
    // NOTE: also covers no match at all -- `undefined !== NONE`, and we return the `undefined` match.
    if (match?.data.scopeType !== NONE) return match
    return undefined
  }
}
