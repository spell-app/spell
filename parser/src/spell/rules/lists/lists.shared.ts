/**
 * The `lists` rule module's shared types and helpers:  what several of its rule files use.
 */
import { NONE } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

////////////////
// ## Shared types
////////////////

/** What `P.ASTMethodDefinition`'s `body` prop accepts. */
export type MethodBody = P.ASTStatementBlock | P.ASTStatement | P.ASTExpression

/** The two sides `can_take` / `can_give_up` compile, e.g. the tableau and the card. */
export type GuardOperands = { lhs?: P.ASTExpression; rhs?: P.ASTExpression }

////////////////
// ## The items of lists of lists
////////////////

/**
 * `the cards in the foundations`:  every card of every foundation, together (epic `language` T130).
 * - When `list` holds lists (`the foundations`, `list of foundations`), and `arg` names THEIR items (`cards`),
 *   not the lists (`the piles in the foundations` is the foundations themselves).
 * - Then `itemsAcrossAST()` merges them:  `core.mergeLists(core.everyThing(Foundation))`.
 * - What it found while parsing:  the type the list holds, its RECORD, and the item's word --
 *   read again when compiling (`isAcross()`), as a type used above its declaration is a stub till then
 *   (Solitaire's `when the score changes`, above `a "foundation" is a pile`).
 * - A lookup:  call it WHILE PARSING.
 */
export function itemsAcrossOf(scope: P.Scope, arg: P.Match, list: P.Match): ItemsAcross | undefined {
  const inner = scope.getItemType(list.datatype)
  const innerType = typeof inner === "string" ? scope.getType(inner) : undefined
  return innerType ? { innerType, named: SP.singularIn(scope, `${arg.value}`) } : undefined
}

/**
 * Do `across`'s lists hold what its word names, so their items are read together?
 * - Read off the records:  call it when compiling, or while parsing for what's known by then.
 */
export function isAcross(across: ItemsAcross | undefined): boolean {
  if (!across) return false
  const { innerType, named } = across
  if (!innerType.isA("list") || innerType.isA(named)) return false
  const items = innerType.chain().find((type) => type.itemType)?.itemType
  const itemType = typeof items === "string" ? innerType.getType(items) : undefined
  return !!itemType?.isA(named)
}

/** The datatype of `across`'s items together, `list of cards` -- `undefined` unless it's `isAcross()` now. */
export function itemsAcrossDatatype(across: ItemsAcross | undefined): P.Datatype | undefined {
  if (!across || !isAcross(across)) return undefined
  const items = across.innerType.chain().find((type) => type.itemType)?.itemType
  return typeof items === "string" ? P.listOf(items) : undefined
}

/** `list`'s AST, its lists merged into one when `isAcross()`:  `core.mergeLists(list)`. */
export function itemsAcrossAST(match: P.Match, list: P.Match, across: ItemsAcross | undefined): P.ASTExpression {
  const ast = P.matchAST<P.ASTExpression>(list)
  return isAcross(across) ? new P.ASTCoreMethodInvocation(match, { methodName: "mergeLists", args: [ast] }) : ast
}

/** What `itemsAcrossOf()` found:  the type a list holds, and the word a rule names its items by. */
export type ItemsAcross = {
  /** The type the list holds, `Foundation`:  its record, a stub if it's declared below */
  innerType: P.TypeScope
  /** The item's word, singular:  `card` */
  named: string
}

////////////////
// ## `where` clause helpers
//    shared by `list_filter`, `list_membership_test` and `list_remove_where`
////////////////

/** Every sort key's scope:  where a field needs no `its` -- see `SortKeyField`. */
const SORT_KEY_SCOPES = new WeakSet<P.Scope>()

/** Is `scope` a sort key's? */
export function isSortKeyScope(scope: P.Scope): boolean {
  return SORT_KEY_SCOPES.has(scope)
}

/** SIDE EFFECT:  `scope` is a sort key's. */
export function noteSortKeyScope(scope: P.Scope): P.Scope {
  SORT_KEY_SCOPES.add(scope)
  return scope
}

/** Every scope of a predicate or sort key, where `it` is the item -- see `isItemScope()`. */
const ITEM_SCOPES = new WeakSet<P.Scope>()

/**
 * Is `scope` a predicate's or sort key's?
 * - So `list_sorted_by` can tell it's inside one, and leave the comma to the list:
 *   `every card where its rank is the rank, sorted by its suit` sorts the cards, not the rank.
 */
export function isItemScope(scope: P.Scope): boolean {
  return ITEM_SCOPES.has(scope)
}

/** `props` as a scope where `it` is the item:  a predicate's or sort key's. */
export function itemScope(props: ConstructorParameters<typeof P.MethodScope>[0]): P.MethodScope {
  const scope = new P.MethodScope(props)
  ITEM_SCOPES.add(scope)
  return scope
}

/**
 * Nested scope for `match`'s `where` clause's predicate:  singularized `arg` is the current item,
 * also aliased from `it`, e.g. `word` for `words in my-list where word starts with "a"`.
 * - Both are what `list` holds, if we can tell, e.g. `Card` for `the cards in the deck where ...`
 * - Looked up now, while parsing:  the predicate parses in this scope.
 * - `name`:  what to call the item, if `arg` doesn't say, as a type's name doesn't:  `every recipe where ...`.
 */
export function getWhereScope(
  match: P.Match,
  arg: P.Match,
  list: { datatype?: P.Datatype } | undefined,
  // `cards` names a `card` too, in a Spanish file naming an English type (epic `spanish` J89)
  name = SP.singularIn(match.scope, arg.value)
): P.MethodScope {
  const datatype = list && match.scope.getItemType(list.datatype)
  const variable = new P.ScopeVariable({ name, datatype, declaredBy: arg })
  // for `getWhereMethod()`, which can't look it up:  `getAST()` must be pure
  ;(match.data as ItemVariableData).itemVariable = variable
  return itemScope({
    parentScope: match.scope,
    args: [variable],
    mapItTo: name,
    itDatatype: datatype,
    declaredBy: arg
  })
}

/**
 * Inline method for a `where` clause's predicate `body`, e.g. `(word) => word.startsWith("a")`.
 * - Its argument carries what `getWhereScope()` found it holds, e.g. a `Card`:  a typed target writes it.
 */
export function getWhereMethod(match: P.Match, arg: P.Match, body: P.Match | undefined): P.ASTMethodDefinition {
  const { itemVariable: variable } = match.data as ItemVariableData
  return new P.ASTMethodDefinition(body || match, {
    inline: true,
    args: [new P.ASTVariableExpression(arg, { name: variable?.name ?? P.singularize(arg.value), variable })],
    body: P.matchAST(body)
  })
}

/**
 * What a loop or a `where` notes while parsing, in its `match.data`:  the variable its body gets, e.g. `card`, a
 * `Card` -- see `getWhereScope()`, `list_iteration`.
 */
export type ItemVariableData = { itemVariable?: P.ScopeVariable }

////////////////
// ## A sort key that waits
////////////////

/**
 * Does `key`, a sort key's words, read a property that waits, or one which reads one that does (epic `data` T38)?
 * - e.g. `sorted by its score`, with `its "score" is:  count it` and `count` waiting
 * - A getter's own words wait, or it reads a getter whose words do.
 * - Read through the program's own names only:  a property of an imported type says nothing here, and is caught when it runs.
 * - Asked when the errors are gathered:  a property read may be declared below the sort.
 */
export function readsAPropertyThatWaits(key: P.Match | undefined): boolean {
  return !!key && readsAWaitingProperty(key, new Set())
}

/** Does a member `match` reads, in its own words or inside them, wait? */
function readsAWaitingProperty(match: P.Match, seen: Set<object>): boolean {
  if (seen.has(match)) return false
  seen.add(match)
  const { member } = match.data as { member?: unknown }
  if (member instanceof P.ScopeVariable && getterWaits(member, seen)) return true
  for (const item of match.matched) if (item instanceof P.Match && readsAWaitingProperty(item, seen)) return true
  return Object.values(match.data ?? {}).some((value) =>
    [value].flat().some((item) => item instanceof P.Match && readsAWaitingProperty(item, seen))
  )
}

/** Does the property `member` wait:  a getter whose own words do, or that reads one which does? */
function getterWaits(member: P.ScopeVariable, seen: Set<object>): boolean {
  const { declaredBy } = member
  if (!declaredBy || seen.has(member)) return false
  seen.add(member)
  let waits = false
  P.forEachNode([declaredBy.AST as P.ASTNode], (node) => {
    waits ||= node instanceof P.ASTPropertyDefinition && !!node.get?.waitsItself
  })
  return waits || readsAWaitingProperty(declaredBy, seen)
}

////////////////
// ## What a list holds
////////////////

/**
 * `match`, a line putting `thing` into `list` (`add`, `move`, `put` ... `to`) -- or a parse error,
 * when `thing` can't be what `list` holds (epic `language` I106, Q67).
 * - e.g. `add it to the discard pile` in solitaire's action, where `it` is the solitaire:
 *   `it is solitaire here, which isn't a card, and the discard pile holds cards:  say which card, or "get" it first`
 *   - it compiled to `this.discardPile.append(this)`, and the page froze
 * - Only when SURE:  both kinds known, and neither is the other or a sub-type of it (`P.Scope.couldBeA()`).
 * - A lookup:  call it WHILE PARSING, from `parse()`.
 */
export function refuseIfNotAnItem(match: P.Match, thing: P.Match, list: P.Match): P.Match {
  const { scope } = match
  const item = scope.getItemType(list.datatype)
  if (scope.couldBeA(thing.datatype, item)) return match
  const itemType = scope.getType(item)
  const thingType = scope.getType(thing.datatype)
  if (!itemType || !thingType) return match
  const language = SP.Language.of(scope)
  const itemWord = SP.SpellWarnings.exampleNoun(scope, itemType, "definite").split(/\s+/).slice(1).join(" ")
  const params = {
    thing: thing.inputText.trim(),
    what: SP.SpellWarnings.exampleNoun(scope, thingType),
    aItem: SP.SpellWarnings.exampleNoun(scope, itemType),
    item: itemWord,
    items: language.inflector.pluralize(itemWord),
    list: list.inputText.trim()
  }
  const read = (thing.data as { scopeVar?: P.ScopeVariable | typeof NONE }).scopeVar
  const readsIt = !!read && read !== NONE && read.name === "it"
  // one of a kind:  by its name, `solitaire` -- the project's, as in its own action `solitaire` is `this`
  const onlyName = thingType.name.replace(P.CAMEL_WORD_BOUNDARY, "_").toLowerCase()
  const only = readsIt ? (match.getScopeOfType(P.ProjectScope) ?? scope).variables?.get(onlyName) : undefined
  if (only?.kind === "only") params.what = only.name
  const message = language.parserMessage(readsIt ? "not-an-item-it" : "not-an-item", params)
  return SpellStatement.refuse(match, message)
}
