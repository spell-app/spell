import { proto } from "spell/util"
import { P } from "spell-parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

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
