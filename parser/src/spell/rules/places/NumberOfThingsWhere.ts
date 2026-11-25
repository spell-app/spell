import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { getWhereMethod, getWhereScope } from "spell/parser/spell/rules/lists/lists.shared"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import { EveryThing } from "spell/parser/spell/rules/classes/EveryThing"
import { loopItemsInDrawing, readableInDrawing } from "./places.shared"

/**
 * `number_of_things_where` rule:  how many of a type fit (epic `data` P11).
 * - e.g. `the number of recipes where it is quick`
 * - `Priority.mostSpecific`:  it has to beat `the number of` of the read `recipes where it is quick`, which isn't a drawing's.
 * - Compiles to `core.itemCountOf(...)` over what `every recipe where ...` reads;  on a web server whose list does all
 *   of the `where` itself, `core.savedCount(...)`:  one row read, and the server's own count (`EveryThing.countAST()`).
 */
export class NumberOfThingsWhere extends SpellExpression<"type|where|body?", { loopItems?: string[] }> {
  @proto static datatype: P.Datatype | undefined = "number"
  @proto static priority = Priority.mostSpecific

  /** Note whether it's in a drawing, which can't wait for it:  `readableInDrawing()`. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (match) match.data.loopItems = loopItemsInDrawing(scope)
    return match
  }

  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const { type } = match.groups
    return getWhereScope(match, type, match, P.instanceCase(SP.typeName(`${type.value}`)))
  }

  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { type } = match.groups
    const predicate = getWhereMethod(match, type, this.getBody(match))
    // a web server that does all of the `where` counts them itself:  one row asked for, its count read
    const counted = EveryThing.countAST(match, type, predicate)
    if (counted) return readableInDrawing(match, counted, match.data.loopItems)
    const list =
      EveryThing.savedAST(match, type, { predicate }) ??
      new P.ASTCoreMethodInvocation(match, {
        methodName: "filter",
        args: [EveryThing.listAST(match, type), predicate]
      })
    const count = new P.ASTCoreMethodInvocation(match, { methodName: "itemCountOf", args: [list] })
    return readableInDrawing(match, count, match.data.loopItems)
  }
}
