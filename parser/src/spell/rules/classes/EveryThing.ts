import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
// Import directly to avoid circular import
import { SpellExpression } from "spell-lang/spell/rules/expressions"

/**
 * `every_thing` rule:  every thing of a type the program has made, in the order made (epic page `outline-spell`, P16).
 * - e.g. `every pile`:  the stock, the discards, the foundations and the tableaus, sub-types included
 * - e.g. `the first pile in every pile where it can take the card`
 * - Compiles to core's `core.everyThing(Pile)`, a scratch list:  it takes none of them from the lists that hold them.
 * - Only the program's things:  a thing a test made isn't in it.
 * - Every value of a KIND is its list (epic `spanish` P22):  `every card suit` => `Card.Suits`,
 *   after a card's `its "suit" is one of clubs, diamonds, hearts or spades` -- see `kindListAST()`.
 */
export class EveryThing extends SpellExpression<"type"> {
  /** A list of the type, e.g. `list of piles`, `list of card-suits`. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return P.listOfType(SP.typeName(`${match.groups.type.value}`))
  }

  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const kindList = EveryThing.kindListAST(match, match.groups.type)
    if (kindList) return kindList
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "everyThing",
      args: [P.matchAST<P.ASTTypeExpression>(match.groups.type)]
    })
  }

  /**
   * The list of the value kind `type` names, e.g. `Card.Suits` for `card suit` -- `undefined` if it isn't one.
   * - Read from the kind's RECORD, found while parsing (`data.scopeType`):
   *   a kind used above its declaration is a stub until then, as a call reads `data.method.returns`.
   */
  static kindListAST(match: P.Match, type: P.Match): P.ASTPropertyExpression | undefined {
    const valueKind = EveryThing.kindOf(type)?.valueKind
    if (!valueKind) return undefined
    return new P.ASTPropertyExpression(match, {
      object: new P.ASTTypeExpression(match, { name: valueKind.listOn }),
      property: valueKind.listName
    })
  }

  /** The type record a type match found while parsing, if any -- see `SP.SpellType`'s `data.scopeType`. */
  static kindOf(type: P.Match): P.TypeScope | undefined {
    const { scopeType } = type.data as { scopeType?: unknown }
    return scopeType instanceof P.TypeScope ? scopeType : undefined
  }
}
