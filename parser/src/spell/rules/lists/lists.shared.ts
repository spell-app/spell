/**
 * The `lists` rule module's shared types and helpers:  what several of its rule files use.
 */
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

////////////////
// ## Shared types
////////////////

/** What `P.ASTMethodDefinition`'s `body` prop accepts. */
export type MethodBody = P.ASTStatementBlock | P.ASTStatement | P.ASTExpression

/** The two sides `can_take` / `can_give_up` compile, e.g. the tableau and the card. */
export type GuardOperands = { lhs?: P.ASTExpression; rhs?: P.ASTExpression }

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
