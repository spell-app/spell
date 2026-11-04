import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"

/**
 * `thing_with_id` rule:  one thing of a saved type, by its id, when the program knows the id (epic `data` P19).
 * - e.g. `the wiki page whose id is its name`
 * - `its` is still what's reading, not the thing being found:  it's no `where`.
 * - Asks the place for that one row (`core.savedThingWithId()`), and waits for it:  nothing, if there's none.
 * - For a field that already holds another thing's address, say what it is instead:  `its "homeworld" is a planet`.
 */
export class ThingWithId extends SpellExpression<"type|id"> {
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return SP.typeName(`${match.groups.type.value}`)
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { type, id } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "savedThingWithId",
      args: [P.matchAST<P.ASTTypeExpression>(type), P.matchAST(id)]
    })
  }
}
