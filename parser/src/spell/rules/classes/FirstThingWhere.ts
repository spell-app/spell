import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { EveryThing } from "./EveryThing"
import { EveryThingWhere } from "./EveryThingWhere"

/**
 * `first_thing_where` rule:  the first thing of a type that fits, or nothing:  `every_thing_where`'s first.
 * - e.g. `the first recipe where its title is "Soup"`, `the first suite record where its name is the picked`
 * - The same as `the first item of (every recipe where ...)`, which said it before.
 * - A saved type's place is asked for one, when the whole `where` goes to it (`EveryThing.savedAST()`, `first`), as
 *   `the first 20 recipes where ...` asks for 20;  else it's read page by page, until one passes.
 * - Compiles to `core.getItemAt(core.filter(core.everyThing(Recipe), (recipe) => ...), 0)`.
 */
export class FirstThingWhere extends EveryThingWhere {
  /** It reads until one passes:  so nothing to warn of, reading every page. */
  @proto static stopsEarly = true

  /** One of the type, e.g. `Recipe`. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return SP.typeName(`${match.groups.type.value}`)
  }

  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const { type } = match.groups
    const predicate = this.predicateOf(match)
    const items =
      EveryThing.savedAST(match, type, { predicate, first: 1 }) ??
      new P.ASTCoreMethodInvocation(match, {
        methodName: "filter",
        args: [EveryThing.listAST(match, type), predicate]
      })
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "getItemAt",
      args: [items, new P.ASTOrdinalLiteral(match, { value: 1, raw: "first" })]
    })
  }
}
