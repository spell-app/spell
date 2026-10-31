import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { getWhereMethod, getWhereScope } from "spell/parser/spell/rules/lists/lists.shared"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import { EveryThing } from "spell/parser/spell/rules/classes/EveryThing"

/**
 * `number_of_things_where` rule:  how many of a type fit (epic `data` P11).
 * - e.g. `the number of recipes where it is quick`
 * - Compiles to `core.itemCountOf(...)` over what `every recipe where ...` reads.
 */
export class NumberOfThingsWhere extends SpellExpression<"type|body?"> {
  @proto static datatype: P.Datatype | undefined = "number"

  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const { type } = match.groups
    return getWhereScope(match, type, match, P.instanceCase(SP.typeName(`${type.value}`)))
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { type } = match.groups
    const predicate = getWhereMethod(match, type, this.getBody(match))
    const list =
      EveryThing.savedAST(match, type, { predicate }) ??
      new P.ASTCoreMethodInvocation(match, {
        methodName: "filter",
        args: [EveryThing.listAST(match, type), predicate]
      })
    return new P.ASTCoreMethodInvocation(match, { methodName: "itemCountOf", args: [list] })
  }
}
