import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import { savedPlaceOfMatch } from "spell/parser/spell/rules/places/places.shared"

/**
 * `every_thing` rule:  every thing of a type the program has made, in the order made (epic page `outline-spell`, P16).
 * - e.g. `every pile`:  the stock, the discards, the foundations and the tableaus, sub-types included
 * - e.g. `the first pile in every pile where it can take the card`
 * - Compiles to core's `core.everyThing(Pile)`, a scratch list:  it takes none of them from the lists that hold them.
 * - Only the program's things:  a thing a test made isn't in it.
 * - Every value of a KIND is its list (epic `spanish` P22):  `every card suit` => `Card.Suits`,
 *   after a card's `its "suit" is one of clubs, diamonds, hearts or spades` -- see `kindListAST()`.
 * - A type saved in a place means what's in the place (epic `data` P11), which is read and waited for:
 *   `core.savedThings(Recipe)`.  A `where` and a `sorted by` it can tell are simple go to the place with it:  `savedAST()`.
 */
export class EveryThing extends SpellExpression<"type"> {
  /** A list of the type, e.g. `list of piles`, `list of card-suits`. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return P.listOfType(SP.typeName(`${match.groups.type.value}`))
  }

  getAST(match: P.MatchFor<this>): P.ASTExpression {
    return EveryThing.listAST(match, match.groups.type)
  }

  /** Every thing or value of `type`, for `match`:  `every_thing_where` filters it. */
  static listAST(match: P.Match, type: P.Match): P.ASTExpression {
    const kindList = EveryThing.kindListAST(match, type)
    if (kindList) return kindList
    const saved = EveryThing.savedAST(match, type)
    if (saved) return saved
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "everyThing",
      args: [P.matchAST<P.ASTTypeExpression>(type)]
    })
  }

  /**
   * What's in the place `type` is saved in, for `match`:  `undefined` for a type kept in memory.
   * - Read off the type's record:  so a line above the type that says it's saved means the place too.
   * - `predicate`, a `where`'s function:  each `its X is <a value>` it's made of goes to the place, as a filter, and with
   *   all of it handed over, `first` too.
   *   - Anything else stays here, `core.filter()`, over everything the place holds, up to the engine's ceiling.
   */
  static savedAST(
    match: P.Match,
    type: P.Match,
    { predicate, first }: { predicate?: P.ASTMethodDefinition; first?: number } = {}
  ): P.ASTExpression | undefined {
    if (!savedPlaceOfMatch(type)) return undefined
    const filter = predicate && handedFilterOf(predicate)
    const isWhole = !predicate || !!filter
    const properties: P.ASTObjectLiteralProperty[] = []
    if (filter) properties.push(queryProperty(match, "filter", new P.ASTObjectLiteral(match, { properties: filter })))
    if (isWhole && first !== undefined) {
      const size = new P.ASTObjectLiteralProperty(match, {
        property: "size" as never,
        value: new P.ASTNumericLiteral(match, { value: first })
      })
      properties.push(queryProperty(match, "page", new P.ASTObjectLiteral(match, { properties: [size] })))
    }
    const read = new P.ASTCoreMethodInvocation(match, {
      methodName: "savedThings",
      args: [
        P.matchAST<P.ASTTypeExpression>(type),
        ...(properties.length ? [new P.ASTObjectLiteral(match, { properties })] : []),
        ...(isWhole
          ? []
          : [
              ...(properties.length ? [] : [new P.ASTObjectLiteral(match, { properties: [] })]),
              new P.ASTStringLiteral(match, { value: JSON.stringify("looks through") })
            ])
      ]
    })
    if (isWhole) return read
    const filtered = new P.ASTCoreMethodInvocation(match, { methodName: "filter", args: [read, predicate!] })
    if (first === undefined) return filtered
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "firstFew",
      args: [filtered, new P.ASTNumericLiteral(match, { value: first })]
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

/** One part of a place's query. */
function queryProperty(match: P.Match, name: string, value: P.ASTExpression): P.ASTObjectLiteralProperty {
  return new P.ASTObjectLiteralProperty(match, { property: name as never, value })
}

/**
 * The parts of `predicate`, a `where`'s function, as a filter a place can be handed:  `undefined` if any part can't be.
 * - A place's filter is one thing:  this field holds this value (`ListQuery.filter`).
 * - So `its X is <a value>`, joined by `and`, where the value doesn't depend on the item.
 */
export function handedFilterOf(predicate: P.ASTMethodDefinition): P.ASTObjectLiteralProperty[] | undefined {
  const item = (predicate.args?.[0] as P.ASTVariableExpression | undefined)?.name
  const expression = onlyExpressionOf(predicate.body)
  if (!item || !expression) return undefined
  const parts: P.ASTObjectLiteralProperty[] = []
  const take = (written: P.ASTNode): boolean => {
    const node = P.unparenthesized(written)
    if (!(node instanceof P.ASTInfixExpression)) return false
    if (node.operator === "and") return take(node.lhs) && take(node.rhs)
    if (node.operator !== "equals") return false
    const { lhs, rhs } = node
    if (!(lhs instanceof P.ASTPropertyExpression) || !(lhs.object instanceof P.ASTVariableExpression)) return false
    if (lhs.object.name !== item || mentions(rhs, item)) return false
    parts.push(new P.ASTObjectLiteralProperty(node.match, { property: lhs.property.value as never, value: rhs }))
    return true
  }
  return take(expression) ? parts : undefined
}

/** Does `body`, a `where`'s, say one thing is two values at once:  `its title is "Ana" and its title is "Bo"` (epic `data` I13)? */
export function canNeverBeTrue(body: unknown): boolean {
  const said = new Map<string, unknown>()
  let isNever = false
  const take = (written: P.ASTNode) => {
    const node = P.unparenthesized(written)
    if (!(node instanceof P.ASTInfixExpression)) return
    if (node.operator === "and") {
      take(node.lhs)
      take(node.rhs)
    } else if (
      node.operator === "equals" &&
      (node.rhs instanceof P.ASTStringLiteral || node.rhs instanceof P.ASTNumericLiteral)
    ) {
      const left = `${node.lhs.match?.inputText}`.trim()
      const value = (node.rhs as P.ASTStringLiteral).value
      if (said.has(left) && said.get(left) !== value) isNever = true
      said.set(left, value)
    }
  }
  const expression = onlyExpressionOf(body)
  if (expression) take(expression)
  return isNever
}

/** The one expression `body` is, a `where`'s:  `undefined` if it's anything more. */
function onlyExpressionOf(body: unknown): P.ASTNode | undefined {
  if (body instanceof P.ASTStatementGroup || body instanceof P.ASTStatementBlock) {
    const [only, ...rest] = body.statements ?? []
    return rest.length ? undefined : onlyExpressionOf(only)
  }
  if (body instanceof P.ASTReturnStatement) return onlyExpressionOf(body.value)
  if (body instanceof P.ASTParenthesizedExpression) return onlyExpressionOf(body.expression)
  return body instanceof P.ASTNode ? body : undefined
}

/** Does `node` read the variable `name`? */
function mentions(node: P.ASTNode, name: string): boolean {
  let found = false
  P.forEachNode([node], (each) => {
    if (each instanceof P.ASTVariableExpression && each.name === name) found = true
  })
  return found
}
