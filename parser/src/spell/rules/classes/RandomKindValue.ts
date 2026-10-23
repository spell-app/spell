import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
import { KindValues } from "./KindValues"

/**
 * `random_kind_value` rule:  one value of a kind, picked at random (epic `spanish` P22).
 * - e.g. `a random card suit` => `core.randomItemOf(Card.Suits)`,
 *   after a card's `its "suit" is one of clubs, diamonds, hearts or spades`
 * - e.g. Spanish's `un palo de carta al azar`
 * - Only a value kind's name, as `kind_values`:  any other type's things are `a random card of the deck`.
 */
export class RandomKindValue extends KindValues {
  /** One of the kind, e.g. `CardSuit`. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return SP.typeName(`${match.groups.type.value}`)
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    return new P.ASTCoreMethodInvocation(match, { methodName: "randomItemOf", args: [super.getAST(match)] })
  }
}
