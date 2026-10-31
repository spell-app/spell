import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import { savedPlaceOfMatch } from "spell/parser/spell/rules/places/places.shared"

/**
 * `thing_at_place` rule:  one thing, by its type and its place (epic `drawable-thing` P19, Owen's J23).
 * - `the first tableau` is the first tableau the program made.
 * - e.g. `the first tableau`, `the second tableau`, `the last tableau`, `the name of the third foundation`
 * - Its place:  the order the program made the things of that type, counting from 1.
 *   - `last` counts from the end.
 *   - Only that type's own things count, not a sub-type's (T10).
 * - Compiles to core's `core.thingAtPlace(Tableau, 1)`:  the reference `Tableau#1`.
 *   Nothing (`undefined`) when the program hasn't made that many.
 * - A type saved in a place:  by the place's order, `core.savedThingAt(Recipe, 1)`, which waits (epic `data` P11).
 * - NOT `the first card of the deck`:  that's an item of a list, `ordinal_position_expression`.
 */
export class ThingAtPlace extends SpellExpression<"ordinal|type"> {
  /** The type we find a thing of, e.g. `Tableau`. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return SP.typeName(`${match.groups.type.value}`)
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const { ordinal, type } = match.groups
    return new P.ASTCoreMethodInvocation(match, {
      methodName: savedPlaceOfMatch(type) ? "savedThingAt" : "thingAtPlace",
      args: [P.matchAST<P.ASTTypeExpression>(type), P.matchAST(ordinal)]
    })
  }
}
