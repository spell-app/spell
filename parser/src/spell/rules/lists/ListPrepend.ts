import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

/** `list_prepend` rule:  prepend to list, e.g. `prepend thing to my-list` => `core.prepend(myList, thing)`. */
export class ListPrepend extends SpellStatement<"thing|list"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { thing, list } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "prepend",
      args: [P.matchAST(list), P.matchAST(thing)]
    })
  }
}
