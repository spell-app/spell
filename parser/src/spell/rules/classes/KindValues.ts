import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { EveryThing } from "./EveryThing"

/**
 * `kind_values` rule:  every value of a kind, by the kind's plural name -- its list (epic `spanish` P22).
 * - e.g. `card suits` => `Card.Suits`, after a card's `its "suit" is one of clubs, diamonds, hearts or spades`
 * - e.g. `for each rank in card ranks`:  each is a card rank
 * - e.g. Spanish's `palos de carta`
 * - Only a value kind's name:  any other type's plural alone is no expression.
 * - `Priority.userDeclared`, as `class_member`, which reads the same list as a type and its class variable:
 *   once `card suit` is a kind, its plural is one name, and `class_member` can't split it.
 */
export class KindValues extends EveryThing {
  @proto static priority = Priority.userDeclared

  /** Only a value kind's name -- see the class docstring. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match || !EveryThing.kindOf(match.groups.type)?.valueKind) return undefined
    return match
  }
}
