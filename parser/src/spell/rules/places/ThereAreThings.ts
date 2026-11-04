import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SpellExpression, Wording } from "spell/parser/spell/rules/expressions"
import { getWhereMethod, getWhereScope } from "spell/parser/spell/rules/lists/lists.shared"
// Import directly to avoid circular import
import { EveryThing } from "spell/parser/spell/rules/classes/EveryThing"
import { EveryThingWhere } from "spell/parser/spell/rules/classes/EveryThingWhere"
import { isInDrawing, ownListAST, ownListOf, readableInDrawing, type OwnList } from "./places.shared"

/** What each way of saying how many compares a count with, by `there_are_how_many`'s meaning. */
const COMPARED_BY: Record<string, P.ASTOperator> = {
  fewer: "less than",
  more: "greater than",
  at_least: "at least",
  at_most: "at most"
}

/**
 * `there_are_things` rule:  a question about how many of them there are, anywhere a condition reads (epic `data` P15).
 * - e.g. `if there are no recipes`, `if there are less than 2 recipes`, `there are at least 3 recipes where it is quick`
 * - e.g. `there is one recipe`, `there are 2 recipes`, `there are recipes`
 * - e.g. `there is a recipe where its cook is "Ana"`:  any at all, as `there are recipes`;  `one` is exactly one
 * - Of a type:  what `every recipe` reads, so a saved type's is a read of its place, which is waited for.
 * - Of what the program has by that name, first:  a list property or variable called `recipes` is what's counted,
 *   with no type of that name needed.
 * - NOT the rider `if there are none:`:  that's a statement, which only hangs off a read in a drawing, says no noun,
 *   and draws while the read is empty.  This always names what it counts, `none` is no type, and it's only a value.
 * - Spanish's `no hay recetas` starts with `no`, a value of its own:  so it's a `normal` rule, and the longer reading wins.
 * - Compiles to `core.itemCountOf(list) < 2`.
 */
export class ThereAreThings extends SpellExpression<
  "compare?|none?|one?|count?|type?|list?|body?",
  { own?: OwnList; inDrawing?: boolean }
> {
  @proto static datatype: P.Datatype | undefined = "choice"

  /** Words that go together only:  `no` takes no number, and `less than` needs one.  And something by that name. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { how, number } = ThereAreThings.howManyOf(match)
    if (how === "none" && number !== undefined) return undefined
    if (how && how !== "none" && number === undefined) return undefined
    match.data.inDrawing = isInDrawing(scope)
    const named = ThereAreThings.namedBy(match)
    const words = `${named.raw}`.trim()
    match.data.own = ownListOf(scope, words) ?? ownListOf(scope, P.pluralize(words))
    if (!match.data.own && !EveryThing.kindOf(named)) return undefined
    if (!match.data.own && match.groups.type && this.getBody(match)) {
      EveryThingWhere.warnAboutWhere(match, match.groups.type, this.getBody(match))
    }
    return match
  }

  /** The predicate's scope:  `it` is the item, what the list holds. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const named = ThereAreThings.namedBy(match)
    const words = `${named.raw}`.trim()
    const own = ownListOf(match.scope, words) ?? ownListOf(match.scope, P.pluralize(words))
    const datatype = own ? own.datatype : P.listOfType(SP.typeName(`${named.value}`))
    return getWhereScope(match, named, { datatype }, P.instanceCase(SP.singularIn(match.scope, words)))
  }

  /** How many it asks about:  `how`, what its words mean, and `number`, the number they name. */
  private static howManyOf(match: P.MatchFor<ThereAreThings>): { how?: string; number?: number } {
    const { compare, none, one, count } = match.groups
    const how = none ? "none" : Wording.meaningOf(compare)
    const number = count ? Number(count.raw) : one ? 1 : undefined
    return { ...(how && { how }), ...(number !== undefined && { number }) }
  }

  /** The words naming what's counted. */
  private static namedBy(match: P.MatchFor<ThereAreThings>): P.Match {
    return (match.groups.type ?? match.groups.list)!
  }

  /** The comparison;  in a drawing, as a value it can read:  `readableInDrawing()`. */
  getAST(match: P.MatchFor<this>): P.ASTExpression {
    const named = ThereAreThings.namedBy(match)
    const body = this.getBody(match)
    const predicate = body ? getWhereMethod(match, named, body) : undefined
    const { own } = match.data
    let list: P.ASTExpression
    if (own) {
      const held = ownListAST(match, own)
      list = predicate ? new P.ASTCoreMethodInvocation(match, { methodName: "filter", args: [held, predicate] }) : held
    } else {
      const saved = EveryThing.savedAST(match, named, predicate ? { predicate } : {})
      const every = saved ?? EveryThing.listAST(match, named)
      list =
        predicate && !saved
          ? new P.ASTCoreMethodInvocation(match, { methodName: "filter", args: [every, predicate] })
          : every
    }
    const lhs = new P.ASTCoreMethodInvocation(match, { methodName: "itemCountOf", args: [list] })
    const { how, number } = ThereAreThings.howManyOf(match)
    const isAny = number === undefined && how !== "none"
    const compared = new P.ASTInfixExpression(match, {
      lhs,
      operator: isAny ? "greater than" : ((how ? COMPARED_BY[how] : undefined) ?? "equals"),
      rhs: new P.ASTNumericLiteral(match, { value: number ?? 0 })
    })
    return readableInDrawing(match, compared, match.data.inDrawing)
  }
}
