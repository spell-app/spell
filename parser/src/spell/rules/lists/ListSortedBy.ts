import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly to avoid circular import
import { PostfixOperatorSuffix, Precedence, SuffixLeft } from "spell/parser/spell/rules/expressions"
import { EveryThing } from "spell/parser/spell/rules/classes/EveryThing"
import { getWhereMethod, isItemScope, itemScope, type ItemVariableData } from "./lists.shared"

/** What a sort key's code calls the item:  in spell, only `it` and `its` name it. */
const ITEM_VARIABLE = "item"

/**
 * `list_sorted_by` rule:  a list in order of something about each item (epic `data` P10).
 * - e.g. `every recipe, sorted by its title`
 * - e.g. `the cards in the deck where it is red, sorted by its rank`
 * - A postfix suffix, the list before it, binding last:  `every recipe where ...` is sorted whole.
 * - Its key is an `{inline_expression}?`, so it eats the rest of the line, as a `where` does.
 * - Not inside a `where` or another key:  the comma after a predicate belongs to the list.
 * - Compiles to `core.sortedBy(list, (item) => ...)`;  a read of a place with a plain field's name for a key goes to the place.
 */
export class ListSortedBy extends PostfixOperatorSuffix<"body?"> {
  @proto static precedence = Precedence.ternary
  @proto static datatype: P.Datatype | undefined = undefined

  /**
   * Not inside a predicate or a key -- see the class docs.
   * - SIDE EFFECT:  a key that waits won't compile:  it would sort by promises, in no order (epic `data` I15).
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    if (isItemScope(scope)) return undefined
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    ListSortedBy.warnIfItDoesntAgree(match, tokens)
    const message = SP.Language.of(scope).parserMessage("sort-key-waits")
    SP.SpellWarnings.refuseIf(match, message, () => getWhereMethod(match, match, this.getBody(match)).waitsItself)
    return match
  }

  /**
   * SIDE EFFECT:  a warning when Spanish's `ordenada` doesn't agree with its list:  `cada receta, ordenada`, `las recetas, ordenadas`.
   * - `every recipe` is one, `the recipes` many.
   */
  private static warnIfItDoesntAgree(match: P.Match, tokens: P.Token[]): void {
    const left = SuffixLeft.current
    const type = left && match.scope.getType(match.scope.getItemType(left.datatype))
    const language = SP.Language.of(match.scope)
    const word = tokens.map((token) => `${token.value}`).find((each) => /^ordenad/.test(each))
    if (!word || !type) return
    const wanted = language.agreedForm(word, type, !left.is(EveryThing) && left.rule.name !== "every_thing_where")
    if (wanted) SP.SpellWarnings.note(match, language.parserMessage("did-you-mean", { phrase: wanted }))
  }

  /** Nested scope for the key:  `it` is the item, what the list before us holds, if that's known. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const datatype = match.scope.getItemType(SuffixLeft.current?.datatype)
    const variable = new P.ScopeVariable({ name: ITEM_VARIABLE, datatype, declaredBy: match })
    ;(match.data as ItemVariableData).itemVariable = variable
    return itemScope({
      parentScope: match.scope,
      args: [variable],
      mapItTo: ITEM_VARIABLE,
      itDatatype: datatype,
      declaredBy: match
    })
  }

  /** The same list, in another order. */
  getResultDatatype(_match: P.MatchFor<this>, lhs: P.Datatype | undefined): P.Datatype | undefined {
    return lhs
  }

  compileASTExpression(match: P.MatchFor<this>, { lhs }: { lhs?: P.ASTExpression }): P.ASTCoreMethodInvocation {
    const handed = ListSortedBy.handedToPlace(match, lhs!, getWhereMethod(match, match, this.getBody(match)))
    if (handed) return handed
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "sortedBy",
      args: [lhs!, getWhereMethod(match, match, this.getBody(match))]
    })
  }

  /**
   * `lhs` sorted by its place, when it's a read of a place and the key is only a field's name (epic `data` I15):
   * `core.savedThings(Recipe, { sort: [{ field: "title" }] })`.
   * - The place sorts if it says it can;  the engine does the rest, up to its ceiling.
   */
  private static handedToPlace(
    match: P.Match,
    lhs: P.ASTExpression,
    key: P.ASTMethodDefinition
  ): P.ASTCoreMethodInvocation | undefined {
    if (!(lhs instanceof P.ASTCoreMethodInvocation) || lhs.methodName !== "savedThings") return undefined
    const [type, query, ...rest] = lhs.args?.args ?? []
    if (rest.length) return undefined
    const field = fieldOfKey(key)
    if (!field) return undefined
    const one = new P.ASTObjectLiteralProperty(match, {
      property: "field" as never,
      value: new P.ASTStringLiteral(match, { value: JSON.stringify(field) })
    })
    const sort = new P.ASTObjectLiteralProperty(match, {
      property: "sort" as never,
      value: new P.ASTArrayLiteral(match, { items: [new P.ASTObjectLiteral(match, { properties: [one] })] })
    })
    const held = query instanceof P.ASTObjectLiteral ? query.properties : []
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "savedThings",
      args: [type as P.ASTExpression, new P.ASTObjectLiteral(match, { properties: [...held, sort] as never })]
    })
  }
}

/** The field `key`, a sort's function, reads, when that's all it does:  `(item) => item.title`. */
function fieldOfKey(key: P.ASTMethodDefinition): string | undefined {
  const item = (key.args?.[0] as P.ASTVariableExpression | undefined)?.name
  let body: unknown = key.body
  while ((body instanceof P.ASTStatementGroup || body instanceof P.ASTStatementBlock) && body.statements?.length === 1)
    body = body.statements[0]
  if (body instanceof P.ASTReturnStatement) body = body.value
  if (!(body instanceof P.ASTPropertyExpression) || !(body.object instanceof P.ASTVariableExpression)) return undefined
  return body.object.name === item ? body.property.value : undefined
}
