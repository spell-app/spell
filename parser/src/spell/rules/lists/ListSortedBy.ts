import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { PostfixOperatorSuffix, Precedence, SuffixLeft } from "spell/parser/spell/rules/expressions"
import { getWhereMethod, isItemScope, itemScope, type ItemVariableData } from "./lists.shared"

/** What a sort key's code calls the item:  in spell, only `it` and `its` name it. */
const ITEM_VARIABLE = "item"

/**
 * `list_sorted_by` rule:  a list in order of something about each item (epic `data` P10).
 * - e.g. `every recipe, sorted by its title`
 * - e.g. `the cards in the deck where it is red, sorted by its rank`
 * - A postfix suffix, the list before it, binding last:  `every recipe where ...` is sorted whole.
 * - Its key is an `{inline_expression}?`, so it eats the rest of the line, as a `where` does.
 * - Not inside a `where` or another key:  the comma after a predicate belongs to the list.
 * - Compiles to `core.sortedBy(list, (item) => ...)`.
 */
export class ListSortedBy extends PostfixOperatorSuffix<"body?"> {
  @proto static precedence = Precedence.ternary
  @proto static datatype: P.Datatype | undefined = undefined

  /** Not inside a predicate or a key -- see the class docs. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    if (isItemScope(scope)) return undefined
    return super.parse(scope, tokens)
  }

  /** Nested scope for the key:  `it` is the item, what the list before us holds, if that's known. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const datatype = match.scope.getItemType(SuffixLeft.current?.datatype)
    const variable = new P.ScopeVariable({ name: ITEM_VARIABLE, datatype, declaredBy: match })
    ;(match.data as ItemVariableData).itemVariable = variable
    return itemScope({
      parentScope: match.scope,
      args: [variable],
      mapItTo: ITEM_VARIABLE,
      itDatatype: datatype,
      declaredBy: match
    })
  }

  /** The same list, in another order. */
  getResultDatatype(_match: P.MatchFor<this>, lhs: P.Datatype | undefined): P.Datatype | undefined {
    return lhs
  }

  compileASTExpression(match: P.MatchFor<this>, { lhs }: { lhs?: P.ASTExpression }): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "sortedBy",
      args: [lhs!, getWhereMethod(match, match, this.getBody(match))]
    })
  }
}
