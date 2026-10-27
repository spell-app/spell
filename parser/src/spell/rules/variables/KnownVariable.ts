import { NONE, proto } from "spell/util"
import { P } from "spell-parser/parser"
import { Variable } from "./Variable"

/**
 * `known_variable` rule:  single word variable which is already known by our scope, with optional `the` prefix
 * -- unlike `singular_identifier`, this fails if unresolvable.
 * - Matched as an `expression`, unlike plain `variable`, because it only succeeds when resolvable.
 */
export class KnownVariable extends Variable {
  @proto static alias = "expression"

  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens)
    // Succeed only if `Variable.parse()` found the scope variable for the identifier.
    if (match?.data.scopeVar !== NONE) return match
    return undefined
  }
}
