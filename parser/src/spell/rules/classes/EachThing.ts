import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { EveryThing } from "./EveryThing"

/**
 * `each_thing` rule:  `each column`, every thing of a type, as a loop's list -- `for each column` (epic `language` T128).
 * - The same as `every column` (`every_thing`):  `core.everyThing(Column)`, Solitaire's seven, in the order made.
 * - ONLY a loop's:  not an expression, so `print each card` stays a statement's own (`each card in ...`), not a list.
 * - Spanish:  `para cada columna`, `cada` only (`toda columna` is `every_thing`'s, but no loop says it).
 */
export class EachThing extends EveryThing {
  @proto static alias = []

  /** `each wiki page`, refused for a type found only by name, as `every wiki page` is. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    return match && EveryThing.refusedIfFoundByName(match, match.groups.type)
  }
}
