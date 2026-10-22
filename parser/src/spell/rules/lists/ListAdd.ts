import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"
import { Wording } from "spell-lang/spell/rules/expressions"

/**
 * `list_add` rule:  add to list, e.g. `add thing to my-list`, `add thing to the front of my-list`.
 * - Compiles to `core.prepend(list, thing)` when `method` means the `start` (`list_end`, e.g. `front`),
 *   else `core.append(list, thing)`.
 */
export class ListAdd extends SpellStatement<"thing|method?|list"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { thing, list, method } = match.groups
    const spellMethod = Wording.meaningOf(method) === "start" ? "prepend" : "append"
    return new P.ASTCoreMethodInvocation(match, {
      methodName: spellMethod,
      args: [P.matchAST(list), P.matchAST(thing)]
    })
  }
}
