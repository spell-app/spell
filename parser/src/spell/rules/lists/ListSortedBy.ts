import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly to avoid circular import
import { PostfixOperatorSuffix, Precedence, SuffixLeft } from "spell/parser/spell/rules/expressions"
import {
  getWhereMethod,
  isItemScope,
  itemScope,
  noteSortKeyScope,
  readsAPropertyThatWaits,
  type ItemVariableData
} from "./lists.shared"

/** What a sort key's code calls the item:  in spell, only `it` and `its` name it. */
const ITEM_VARIABLE = "item"

/**
 * `list_sorted_by` rule:  a list in order of something about each item (epic `data` P10).
 * - e.g. `every recipe, sorted by its title`, `recipes sorted by title`
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
   *   - So does one reading a property that waits, however many names away (`readsAPropertyThatWaits()`, T38).
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    if (isItemScope(scope)) return undefined
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    ListSortedBy.warnIfItDoesntAgree(match, tokens)
    const message = SP.Language.of(scope).parserMessage("sort-key-waits")
    SP.SpellWarnings.refuseIf(
      match,
      message,
      // the method first:  building it makes sure each member is resolved
      () =>
        getWhereMethod(match, match, this.getBody(match)).waitsItself || readsAPropertyThatWaits(this.getBody(match))
    )
    return match
  }

  /**
   * SIDE EFFECT:  a warning when Spanish's `ordenada` doesn't agree with its list:  `cada receta, ordenada`, `las recetas, ordenadas`.
   * - `every recipe` is one, `the recipes` and `all recipes` many:  it's what the type's name says.
   * - A list named otherwise, `la lista`:  its own noun's gender and number -- see `nounOf()`.
   */
  private static warnIfItDoesntAgree(match: P.Match, tokens: P.Token[]): void {
    const left = SuffixLeft.current
    const type = left && match.scope.getType(match.scope.getItemType(left.datatype))
    const language = SP.Language.of(match.scope)
    const word = tokens.map((token) => `${token.value}`).find((each) => /^ordenad/.test(each))
    if (!word || !type) return
    const written = (left.groups as { type?: P.Match }).type?.raw
    const isOne = !!written && SP.singularIn(match.scope, `${written}`.trim()) === `${written}`.trim()
    // a list with a name of its own, `la lista`:  that noun's, by its article (epic `language` T89)
    const named = written === undefined ? ListSortedBy.nounOf(match.scope, left) : undefined
    const wanted = named ? language.agreedForm(word, named, named.isPlural) : language.agreedForm(word, type, !isOne)
    if (wanted) SP.SpellWarnings.note(match, language.parserMessage("did-you-mean", { phrase: wanted }))
  }

  /**
   * The noun naming list `left`, by the article written before it:  its gender, and whether it's plural --
   * `la lista` is one, feminine;  `los mazos` many, masculine.
   * - `undefined` without an article that says a gender, e.g. `sus tareas`:  then the items' type says.
   */
  private static nounOf(scope: P.Scope, left: P.Match): { gender: string; isPlural: boolean } | undefined {
    const [article, ...rest] = left.tokens
    const gender =
      article instanceof P.WordToken ? SP.Language.of(scope).genderOf(`${article.value}`.toLowerCase()) : undefined
    const noun = rest.map((token) => `${token.value}`).join(" ")
    if (!gender || !noun) return undefined
    return { gender, isPlural: SP.singularIn(scope, noun) !== noun }
  }

  /** Nested scope for the key:  `it` is the item, what the list before us holds, if that's known. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const datatype = match.scope.getItemType(SuffixLeft.current?.datatype)
    const variable = new P.ScopeVariable({ name: ITEM_VARIABLE, datatype, declaredBy: match })
    ;(match.data as ItemVariableData).itemVariable = variable
    const scope = itemScope({
      parentScope: match.scope,
      args: [variable],
      mapItTo: ITEM_VARIABLE,
      itDatatype: datatype,
      declaredBy: match
    })
    noteSortKeyScope(scope)
    return scope
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
    const { field, descending } = fieldOfKey(key) ?? {}
    if (!field) return undefined
    const props = [
      new P.ASTObjectLiteralProperty(match, {
        property: "field" as never,
        // as compiled code and rows name it:  a key's own property is `created_at` until it's written out
        value: new P.ASTStringLiteral(match, { value: JSON.stringify(P.JSWriter.instance.nameOf(field)) })
      })
    ]
    // `newest first` (`sort_key_order`)
    if (descending)
      props.push(
        new P.ASTObjectLiteralProperty(match, {
          property: "descending" as never,
          value: new P.ASTBooleanLiteral(match, { value: true })
        })
      )
    const sort = new P.ASTObjectLiteralProperty(match, {
      property: "sort" as never,
      value: new P.ASTArrayLiteral(match, { items: [new P.ASTObjectLiteral(match, { properties: props })] })
    })
    const held = query instanceof P.ASTObjectLiteral ? query.properties : []
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "savedThings",
      args: [type as P.ASTExpression, new P.ASTObjectLiteral(match, { properties: [...held, sort] as never })]
    })
  }
}

/**
 * The field `key`, a sort's function, reads, when that's all it does:  `(item) => item.title`.
 * - `descending` when it reads it backwards, `newest first`:  `(item) => core.descending(item.sent)`.
 */
function fieldOfKey(key: P.ASTMethodDefinition): { field: string; descending: boolean } | undefined {
  const item = (key.args?.[0] as P.ASTVariableExpression | undefined)?.name
  let body: unknown = key.body
  while ((body instanceof P.ASTStatementGroup || body instanceof P.ASTStatementBlock) && body.statements?.length === 1)
    body = body.statements[0]
  if (body instanceof P.ASTReturnStatement) body = body.value
  const descending = body instanceof P.ASTCoreMethodInvocation && body.methodName === "descending"
  if (descending) body = (body as P.ASTCoreMethodInvocation).args?.args?.[0]
  if (!(body instanceof P.ASTPropertyExpression) || !(body.object instanceof P.ASTVariableExpression)) return undefined
  return body.object.name === item ? { field: body.property.value, descending } : undefined
}
