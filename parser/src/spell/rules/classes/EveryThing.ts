import { snakeCase } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import {
  askedByOf,
  filtersOf as filtersOfPlace,
  isFoundByName,
  isSearchedOnly,
  isSearchedField,
  savedPlaceOfMatch,
  searchesOf
} from "spell/parser/spell/rules/places/places.shared"

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
  /** `every wiki page`, refused for a type found only by name:  see `refusedIfFoundByName()`. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    // `the things` refuses for itself, once it's sure it's a read
    if (!match || this.constructor !== EveryThing) return match
    return EveryThing.refusedIfFoundByName(match, match.groups.type)
  }

  /**
   * `match`, or a parse error when `type` has no list of them all:
   * - found only by name (epic `data` P27):  `wiki pages are found at "/page/summary/{name}"`,
   *   so `every wiki page` can't be read
   * - given only to a search (epic `data` P29):  `books are searched at "/search.json"`,
   *   so `every book` can't either, and the message says how to search:  `every book where its title includes ...`
   * - asked for by a query (epic `data` P33):  `forecasts are asked for by their latitude and longitude`,
   *   so `every forecast` can't, and the message says what to give:
   *   `every forecast where its latitude is ... and its longitude is ...`
   */
  static refusedIfFoundByName(match: P.Match, type: P.Match): P.Match {
    const saved = savedPlaceOfMatch(type)
    if (!saved) return match
    const language = SP.Language.of(match.scope)
    const words = `${type.raw}`.trim()
    const params = { things: P.pluralize(words), thing: P.singularize(words) }
    // the line that says so may be anywhere in the project:  asked when the errors are gathered
    // ONE refusal a line:  which it is, asked then too
    const searched = EveryThing.refusalWithoutQuery(match, type, undefined)
    const message = () =>
      isFoundByName(saved) ? language.parserMessage("found-only-by-name", params) : searched.message()
    SP.SpellWarnings.refuseIf(match, message, () => isFoundByName(saved) || searched.holds())
    return match
  }

  /**
   * SIDE EFFECT:  a parse error when `type` is given only to a search, and `where` hands the place none
   * (epic `data` P29):  `books are searched at "/search.json"`, `- it searches titles with "q"`.
   * - `where`:  the `where`'s function, made when the errors are gathered.
   * - `every book where its title includes the search` searches;
   *   `every book`, or `every book where it is long`, can't be read.
   * - The same for a type asked for by a query, and a `where` that doesn't say each (epic `data` P33):
   *   `every forecast where its latitude is 52.52 and its longitude is 13.41` asks;
   *   `every forecast where it is cold` can't.
   */
  static refusedUnlessSearched(match: P.Match, type: P.Match, where: (() => P.ASTMethodDefinition) | undefined): void {
    if (!savedPlaceOfMatch(type)) return
    const { message, holds } = EveryThing.refusalWithoutQuery(match, type, where)
    SP.SpellWarnings.refuseIf(match, message, holds)
  }

  /**
   * What `refusedUnlessSearched()` says, and whether it still holds:  both asked when the errors are gathered.
   * - Asked for by a query (`askedByOf()`):  each field it's asked for by, said in a filter, `its latitude is ...`.
   * - Else given only to a search:  a search.
   */
  private static refusalWithoutQuery(
    match: P.Match,
    type: P.Match,
    where: (() => P.ASTMethodDefinition) | undefined
  ): { message: () => string; holds: () => boolean } {
    const saved = savedPlaceOfMatch(type)
    const language = SP.Language.of(match.scope)
    const words = `${type.raw}`.trim()
    const message = () => {
      const asked = askedByOf(saved)
      if (asked.length) {
        return language.parserMessage("asked-by-only", {
          things: P.pluralize(words),
          fields: asked.map(wordsOfField).join(", "),
          saying: asked.map((field) => `its ${wordsOfField(field)} is ...`).join(" and "),
          thing: P.singularize(words)
        })
      }
      const [field = "name"] = searchesOf(saved)?.fields ?? []
      return language.parserMessage("searched-only", {
        things: P.pluralize(words),
        thing: P.singularize(words),
        field: P.singularize(field)
      })
    }
    const holds = () => {
      const asked = askedByOf(saved)
      if (asked.length) {
        const said = where ? (handedPartsOf(where(), [])?.filter ?? []).map((part) => `${part.property.value}`) : []
        return !asked.every((field) => said.includes(field))
      }
      return isSearchedOnly(saved) && !(where && handedPartsOf(where(), searchesOf(saved)?.fields ?? [])?.search.length)
    }
    return { message, holds }
  }

  /** A list of the type, e.g. `list of piles`, `list of card-suits`. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return P.listOf(SP.typeName(`${match.groups.type.value}`))
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
   * - `predicate`, a `where`'s function, goes in parts (`handedPartsOf()`):
   *   - each `its X is <a value>` goes to the place, as its filter:  the place sends the fields its list takes, and
   *     checks the rest itself (`PlaceQuery`)
   *   - each `its X includes <a value>` goes too, as a search, when a line says the list searches X
   *     (`it searches names with "search"`, epic `data` P26):  the server narrows the read, and the page still checks
   *   - `its id is not nothing` is dropped:  every row a place holds has its id
   *   - the rest stays here, `core.filter()`, over what came back
   * - All of it handed over:  `first` goes too, as a page of that many.
   * - Some of it staying here, with `first`:  the read goes page by page, and stops once that many pass
   *   (`core.savedThings()`'s `until`);  without, it reads every page, up to the engine's ceiling.
   * - `checkedHere`:  nothing goes to the place, and every page is read (`ListCheckedHere`, `, checked here`).
   */
  static savedAST(
    match: P.Match,
    type: P.Match,
    { predicate, first, checkedHere }: { predicate?: P.ASTMethodDefinition; first?: number; checkedHere?: boolean } = {}
  ): P.ASTExpression | undefined {
    const saved = savedPlaceOfMatch(type)
    if (!saved) return undefined
    const parts = predicate && !checkedHere ? handedPartsOf(predicate, searchesOf(saved)?.fields ?? []) : undefined
    const isWhole = !predicate || !!parts?.isWhole
    const properties: P.ASTObjectLiteralProperty[] = []
    const { filter = [], search = [] } = parts ?? {}
    if (filter.length) {
      properties.push(queryProperty(match, "filter", new P.ASTObjectLiteral(match, { properties: filter })))
    }
    if (search.length) {
      properties.push(queryProperty(match, "search", new P.ASTObjectLiteral(match, { properties: search })))
    }
    if (isWhole && first !== undefined) {
      const size = new P.ASTObjectLiteralProperty(match, {
        property: "size" as never,
        value: new P.ASTNumericLiteral(match, { value: first })
      })
      properties.push(queryProperty(match, "page", new P.ASTObjectLiteral(match, { properties: [size] })))
    }
    const query = new P.ASTObjectLiteral(match, { properties })
    let read: P.ASTExpression
    if (isWhole) {
      read = new P.ASTCoreMethodInvocation(match, {
        methodName: "savedThings",
        args: [P.matchAST<P.ASTTypeExpression>(type), ...(properties.length ? [query] : [])]
      })
    } else {
      const looks = new P.ASTStringLiteral(match, { value: JSON.stringify("looks through") })
      const until =
        first === undefined
          ? []
          : [
              new P.ASTObjectLiteral(match, {
                properties: [
                  queryProperty(match, "first", new P.ASTNumericLiteral(match, { value: first })),
                  queryProperty(match, "where", predicate!)
                ]
              })
            ]
      const reading = new P.ASTCoreMethodInvocation(match, {
        methodName: "savedThings",
        args: [P.matchAST<P.ASTTypeExpression>(type), query, looks, ...until]
      })
      // what it read up to `first` of is what passed:  the read checked each page as it came
      read =
        first === undefined
          ? new P.ASTCoreMethodInvocation(match, { methodName: "filter", args: [reading, predicate!] })
          : reading
    }
    HANDED_READS.set(read, { type, ...(predicate && { predicate }), ...(first !== undefined && { first }) })
    return read
  }

  /**
   * The read `savedAST()` made, made again with nothing handed to the place:  `, checked here` after it
   * (`ListCheckedHere`).  `undefined` for anything else.
   */
  static checkedHereAST(match: P.Match, read: P.ASTExpression): P.ASTExpression | undefined {
    const made = HANDED_READS.get(read)
    if (!made?.predicate) return undefined
    return EveryThing.savedAST(match, made.type, { ...made, checkedHere: true })
  }

  /**
   * The clauses of a `where` on a saved `type` its place's list can't be asked, and so are checked here, over every
   * page:  `undefined` when none, or when it isn't a list of a paged place (a web server), or reads only the first few.
   * - What the warning names (`where-stays-here`):  the clause as written, `its duration is over 5`.
   * - An `its X is ...` its list doesn't filter by, by the lines the compiler can see, stays too.
   * - A search it takes narrows the read:  none, then, as the server does the looking.
   */
  static clausesStayingIn(type: P.Match, predicate: P.ASTMethodDefinition): string[] | undefined {
    const saved = savedPlaceOfMatch(type)
    if (!saved || saved.placeType.placeKind !== "web server") return undefined
    const parts = handedPartsOf(predicate, searchesOf(saved)?.fields ?? [])
    if (!parts) return undefined
    if (parts.search.length) return undefined
    const filters = filtersOf(saved)
    const staying = [
      ...parts.filter
        .filter((part) => !(filters === "every field" || filters.includes(`${part.property.value}`)))
        .flatMap((part) => (part.value ? [part.value] : [])),
      ...parts.staying
    ]
    const said = staying.flatMap((each) => {
      const text = clauseText(each, predicate)
      return text ? [text] : []
    })
    return said.length ? said : undefined
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

  /**
   * Does a known type's name start within `reach` words of `start`, for a rule's quick test?  One word (`books`) or
   * several (`suite records`, `maintenance event`), up to `TYPE_WORDS`.
   */
  static typeNear(scope: P.Scope, tokens: P.Token[], start: number, reach: number): boolean {
    for (let index = start; index < start + reach && tokens[index] instanceof P.WordToken; index++) {
      if (scope.getType(`${tokens[index]!.value}`)) return true
      // several words are named as a type is everywhere:  dashed, then class-cased, `suite-records` => `SuiteRecord`
      let dashed = `${tokens[index]!.value}`
      for (let end = index + 1; end < index + TYPE_WORDS && tokens[end] instanceof P.WordToken; end++) {
        dashed += `-${tokens[end]!.value}`
        if (scope.getType(P.classCase(SP.typeName(dashed)))) return true
      }
    }
    return false
  }

  /** The type record a type match found while parsing, if any -- see `SP.SpellType`'s `data.scopeType`. */
  static kindOf(type: P.Match): P.TypeScope | undefined {
    const { scopeType } = type.data as { scopeType?: unknown }
    return scopeType instanceof P.TypeScope ? scopeType : undefined
  }
}

/** The most words a type's name is taken to have, by `EveryThing.typeNear()`:  `home maintenance event organizer`. */
const TYPE_WORDS = 5

/** A field's words, from its name:  `windSpeed` => `wind speed`. */
function wordsOfField(field: string): string {
  return snakeCase(field).replace(/_/g, " ")
}

/** One part of a place's query. */
function queryProperty(match: P.Match, name: string, value: P.ASTExpression): P.ASTObjectLiteralProperty {
  return new P.ASTObjectLiteralProperty(match, { property: name as never, value })
}

/** What `savedAST()` made each read from, so `, checked here` can make it again:  see `checkedHereAST()`. */
const HANDED_READS = new WeakMap<P.ASTNode, { type: P.Match; predicate?: P.ASTMethodDefinition; first?: number }>()

/** A `where`'s parts, as a place can be handed them:  see `handedPartsOf()`. */
export type HandedParts = {
  /** Each `its X is <a value>`:  the place's filter, `ListQuery.filter`. */
  filter: P.ASTObjectLiteralProperty[]
  /** Each `its X includes <a value>` on a field it searches:  `ListQuery.search`, checked here too. */
  search: P.ASTObjectLiteralProperty[]
  /** Every other clause:  checked here, over what came back. */
  staying: P.ASTNode[]
  /** Does the filter say it all:  nothing staying, and no search to check here? */
  isWhole: boolean
}

/**
 * The parts of `predicate`, a `where`'s function, a place can be handed:  `undefined` if it isn't one expression.
 * - Its clauses are what's joined by `and`;  each is one of:
 *   - `its X is <a value>`, the value not depending on the item:  a filter (`ListQuery.filter` is one thing:  this
 *     field holds this value)
 *   - `its X includes <a value>`, X one of `fields` (what it searches, `it searches names with "search"`):  a search,
 *     still checked here, as a server may match more loosely
 *   - `its id is not nothing`:  dropped, as every row a place holds has its id
 *   - anything else:  staying here
 */
export function handedPartsOf(predicate: P.ASTMethodDefinition, fields: readonly string[]): HandedParts | undefined {
  const item = (predicate.args?.[0] as P.ASTVariableExpression | undefined)?.name
  const expression = onlyExpressionOf(predicate.body)
  if (!item || !expression) return undefined
  const parts: HandedParts = { filter: [], search: [], staying: [], isWhole: true }
  const ownField = (lhs: unknown): string | undefined =>
    lhs instanceof P.ASTPropertyExpression && lhs.object instanceof P.ASTVariableExpression && lhs.object.name === item
      ? `${lhs.property.value}`
      : undefined
  const take = (written: P.ASTNode): void => {
    const node = P.unparenthesized(written)
    if (node instanceof P.ASTInfixExpression && node.operator === "and") {
      take(node.lhs)
      take(node.rhs)
      return
    }
    if (node instanceof P.ASTInfixExpression && node.operator === "equals") {
      const field = ownField(node.lhs)
      if (field !== undefined && !mentions(node.rhs, item)) {
        parts.filter.push(new P.ASTObjectLiteralProperty(node.match, { property: field as never, value: node.rhs }))
        CLAUSE_OF_VALUE.set(node.rhs, node)
        return
      }
    }
    // every row a place holds has its id
    if (
      node instanceof P.ASTInfixExpression &&
      node.operator === "not equals" &&
      ownField(node.lhs) === ID_FIELD &&
      node.rhs instanceof P.ASTNothingLiteral
    ) {
      return
    }
    if (node instanceof P.ASTCoreMethodInvocation && node.methodName === "includes") {
      const [lhs, rhs] = node.args?.args ?? []
      const field = ownField(lhs)
      if (field !== undefined && rhs && !mentions(rhs, item) && fields.length && isSearchedField(fields, field)) {
        if (!parts.search.some((part) => `${part.property.value}` === field)) {
          const value = rhs as P.ASTExpression
          parts.search.push(new P.ASTObjectLiteralProperty(node.match, { property: field as never, value }))
        }
        parts.isWhole = false
        return
      }
    }
    parts.staying.push(node)
    parts.isWhole = false
  }
  take(expression)
  return parts
}

/**
 * A clause of a `where` as written:  `its duration is over 5`.
 * - `node`:  the clause, or a filter's value, whose clause is what holds it.
 * - From the first to the last of what its parts matched, in the text of `predicate`, the whole `where`:
 *   an operator's own match is only part of it, `is over 5`.
 */
function clauseText(node: P.ASTNode, predicate: P.ASTMethodDefinition): string {
  const clause = CLAUSE_OF_VALUE.get(node) ?? node
  let start = Infinity
  let end = -Infinity
  const take = ({ match }: P.ASTNode) => {
    if (match?.start === undefined || match.end === undefined) return
    start = Math.min(start, match.start)
    end = Math.max(end, match.end)
  }
  take(clause)
  P.forEachNode([clause], take)
  const whole = predicate.match
  const from = whole?.start
  if (!whole || from === undefined || start === Infinity) return `${clause.match?.inputText ?? ""}`.trim()
  return whole.inputText.slice(start - from, end - from).trim()
}

/** Each filter's value, by the clause it was said in:  `clauseText()`. */
const CLAUSE_OF_VALUE = new WeakMap<P.ASTNode, P.ASTNode>()

/** The field every row a place holds has, its id. */
const ID_FIELD = "id"

/**
 * The fields what's saved in `saved` is filtered by at its place, by the lines the compiler can see:
 * its list's own `it filters by`, else its place's;  none said, none.
 */
function filtersOf(saved: P.SavedPlace): "every field" | readonly string[] {
  return filtersOfPlace(saved) ?? []
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
