import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"

/** `list_append` rule:  append to list, e.g. `append thing to my-list` => `core.append(myList, thing)`. */
export class ListAppend extends SpellStatement<"thing|list"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { thing, list } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "append",
      args: [P.matchAST(list), P.matchAST(thing)]
    })
  }
}
