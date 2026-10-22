import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"
import { getWhereScope, getWhereMethod } from "./lists.shared"

/**
 * `list_remove_where` rule:  remove all items from list where condition is true:
 * e.g. `remove items from my-list where item is not "ace"`.
 * - Trailing `where` expects an inline expression as predicate (`{inline_expression}?`) -- see `getWhereScope()`.
 * - Compiles to `core.removeWhere(list, (item) => { ... })`.
 */
export class ListRemoveWhere extends SpellStatement<"arg|list|body?"> {
  @proto static alias = "statement"

  /** Nested scope for predicate body -- singularized `{arg}` variable, also aliased from `it`. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    return getWhereScope(match, match.groups.arg, match.groups.list)
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { arg, list } = match.groups
    const filter = getWhereMethod(match, arg, this.getBody(match))
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "removeWhere",
      args: [P.matchAST(list), filter]
    })
  }
}
