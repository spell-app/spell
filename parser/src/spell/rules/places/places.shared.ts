import { CLOUD_KIND, SPACE_FOLDER_CHECKS_AT_MOST_EVERY, isPlaceServerAddress } from "spell/util/places/places.types"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

// Import directly to avoid circular import
import { DrawIt } from "spell/parser/spell/rules/classes/DrawIt"
import { fieldNamed, textIn } from "./PlaceDetail"

/**
 * What the compiler can say about each kind of place, with no place in hand (epic `data` P11).
 * - The same words as `core.place()`'s kinds, and as `PlaceCapabilities.kind` (J55).
 * - A hint for what to refuse or warn about, at a program's line:  a place still answers for itself when it runs.
 *   - `isReadOnly`:  a write won't compile, unless its address is a place server, which takes writes (`isReadOnlyPlace()`).
 *   - `isAtomic`:  `in one go:` is really that.
 *   - `saysWhatChanged`:  it tells us;  a kind that doesn't warns unless its line says how often to ask.
 *   - `hasOtherPeople`:  `false`, only you ever change what's in it:  `when someone else changes it` warns.
 *   - `knowsWhoIsHere`:  `everyone here` can list more than you.
 *   - `takesOperations`:  `to publish a recipe is at "..."` can reach it, by its address.
 *   - `hasNoReferee`:  each person has their own, and can change only that:  what the line warns of.
 *   - `checkedEveryByDefault`:  how often it's asked what changed, in seconds, when its line doesn't say:  so it never
 *     warns that it can't announce (the cloud, epic `atmosphere` P8).
 * - `airtable` has no version check and no people, and takes changes in batches of 10:  so it has none of these, and its line says more (`warnOfAirtable()`).
 * - A kind a library adds isn't here:  nothing's known of it, so nothing's said.
 */
export const PLACE_KIND_ABILITIES: Readonly<
  Record<
    string,
    {
      isReadOnly?: boolean
      isAtomic?: boolean
      saysWhatChanged?: boolean
      hasOtherPeople?: boolean
      knowsWhoIsHere?: boolean
      takesOperations?: boolean
      hasNoReferee?: boolean
      checkedEveryByDefault?: number
    }
  >
> = {
  "web server": { takesOperations: true },
  "graphql server": {},
  "data folder": {},
  [CLOUD_KIND]: { checkedEveryByDefault: SPACE_FOLDER_CHECKS_AT_MOST_EVERY },
  file: { hasOtherPeople: false },
  room: { isAtomic: true, saysWhatChanged: true, knowsWhoIsHere: true },
  sheet: { isReadOnly: true },
  "google sheet": { isReadOnly: true, isAtomic: true },
  airtable: {},
  "atmosphere account": { isAtomic: true, saysWhatChanged: true, knowsWhoIsHere: true, hasNoReferee: true },
  "personal atmosphere account": { isAtomic: true, saysWhatChanged: true, knowsWhoIsHere: true, hasNoReferee: true },
  "database on this device": { isAtomic: true, saysWhatChanged: true, hasOtherPeople: false },
  "in memory database": { isAtomic: true, saysWhatChanged: true, hasOtherPeople: false }
}

/** What a kind's word, as `place_kind` names its meaning (`web_server`), is in `core.place()`'s words. */
export function placeKindWords(meaning: string): string {
  return meaning.replace(/_/g, " ")
}

/** Where the type `type` (a match that found one while parsing) is saved:  `undefined` for one kept in memory. */
export function savedPlaceOfMatch(type: P.Match | undefined): P.SavedPlace | undefined {
  const { scopeType } = (type?.data ?? {}) as { scopeType?: unknown }
  return scopeType instanceof P.TypeScope ? scopeType.savedPlace() : undefined
}

/** The type match of `list`, when it's every thing of a type (`every recipe`, `the recipes`):  `undefined` otherwise. */
export function savedTypeMatchOf(list: P.Match): P.Match | undefined {
  const { type } = list.groups as { type?: P.Match }
  return type && !Array.isArray(type) && /^(?:every_thing|the_things)$/.test(list.rule.name ?? "") ? type : undefined
}

/** The type a list's datatype holds, as `list of recipes` names it, in `scope`:  a lookup, for WHILE PARSING. */
export function itemTypeOf(scope: P.Scope, list: P.Match): P.TypeScope | undefined {
  const item = scope.getItemType(list.datatype)
  return typeof item === "string" ? scope.getType(item) : undefined
}

/** The type the last loop in each block goes round:  what a rider under it agrees with. */
const LOOP_ITEMS = new WeakMap<P.Scope, P.TypeScope>()

/** SIDE EFFECT:  the loop just read in `scope` goes round things of `type`. */
export function noteLoopItem(scope: P.Scope, type: P.TypeScope): void {
  LOOP_ITEMS.set(scope, type)
}

/** The type the last loop read in `scope` goes round. */
export function loopItemOf(scope: P.Scope): P.TypeScope | undefined {
  return LOOP_ITEMS.get(scope)
}

/** What a place's kind can do, as far as the compiler can tell:  nothing's known of a library's. */
export function abilitiesOf(saved: P.SavedPlace | undefined) {
  const kind = saved?.placeType.placeKind
  return kind ? PLACE_KIND_ABILITIES[kind] : undefined
}

/**
 * Is what's saved in `saved` read only:  a kind that is, at a plain address?
 * - A sheet at a place server isn't:  `family cookbook is a sheet at "/api/places/recipes"` (epic `data` P14).
 *   No new word:  the address says it, as a data folder's and a file's do.
 */
export function isReadOnlyPlace(saved: P.SavedPlace | undefined): boolean {
  if (!abilitiesOf(saved)?.isReadOnly) return false
  const address = saved?.placeType.declaredBy?.groups.address as P.Match | undefined
  return !address || !isPlaceServerAddress(textIn(address))
}

/** Does a line under the place `saved` names say how often to ask it what changed? */
export function isCheckedOften(saved: P.SavedPlace): boolean {
  const { declaredBy } = saved.placeType
  const rule = declaredBy?.rule.constructor as unknown as { detailsOf?(match: P.Match): { checkedEvery?: number } }
  return !!declaredBy && rule.detailsOf?.(declaredBy)?.checkedEvery !== undefined
}

/**
 * The fields the place `saved` names searches, for text they hold, and its query parameter:  `it searches names with "search"`.
 * - `undefined` when no line under it says so.
 */
export function searchesOf(saved: P.SavedPlace | undefined): { param: string; fields: string[] } | undefined {
  const declaredBy = saved?.placeType.declaredBy
  const rule = declaredBy?.rule.constructor as unknown as {
    detailsOf?(match: P.Match): { searches?: { param: string; fields: string[] } }
  }
  return declaredBy ? rule.detailsOf?.(declaredBy)?.searches : undefined
}

/**
 * Is `field` one of the `words` a server says it searches (`SearchesWith`)?
 * - As written, or that plus `s` or `es`:  `names` is `name`, `nombres` is `nombre`, `ciudades` is `ciudad`.
 * - The runtime matches the same way:  `RestPlace`'s `searchedWord()`.
 */
export function isSearchedField(words: readonly string[], field: string): boolean {
  return words.some((word) => word === field || word === `${field}s` || word === `${field}es`)
}

/**
 * The kind of each place in the project `scope` is in:  `undefined` for one a library added, which nothing's known of.
 * - Empty:  it has no place.
 * - Asked when the project's parsed:  the lines that say so may be anywhere.
 */
export function placeKindsIn(scope: P.Scope): (string | undefined)[] {
  return [...typesIn(scope)].filter((type) => type.placeName !== undefined).map((type) => type.placeKind)
}

/** Every type `scope` can see. */
function typesIn(scope: P.Scope): Set<P.TypeScope> {
  const types = new Set<P.TypeScope>()
  for (let each: P.Scope | undefined = scope; each; each = each.parentScope) {
    for (const type of each.types?.get() ?? []) types.add(type)
  }
  return types
}

/**
 * SIDE EFFECT:  `match`, which writes to a thing of `type`, won't compile while that's saved in a read-only place.
 * - Asked when the project's parsed:  the lines that say so may be below this one, or in another file.
 * - `what`:  how the message names the write, as written.
 */
export function refuseWriteIfReadOnly(match: P.Match, type: P.TypeScope | undefined): void {
  if (!type || SP.isBuiltInTypeScope(type)) return
  const message = () => {
    const saved = type.savedPlace()
    return SP.Language.of(match.scope).parserMessage("place-read-only", {
      place: `${saved?.place ?? ""}`.replace(/_/g, " "),
      kind: SP.Language.of(match.scope).placeKindWord(`${saved?.placeType.placeKind ?? ""}`)
    })
  }
  SP.SpellWarnings.refuseIf(match, message, () => isReadOnlyPlace(type.savedPlace()))
}

/** What the program already has by a name, as `ownListOf()` finds it. */
export type OwnList = {
  /** The variable or argument it is;  none:  a property or method of what the action runs on. */
  variable?: P.ScopeVariable
  /** Its name, as words. */
  words: string
  /** What it holds, if that's known:  `list of recipes`. */
  datatype?: P.Datatype
  /** It's an action, so a call reads it, and nothing here. */
  isAction?: boolean
}

/**
 * The variable, argument, property or method called `words`, at `scope`:  what a program's own wins over a type's plural with.
 * - A lookup:  call it WHILE PARSING.
 */
export function ownListOf(scope: P.Scope, words: string): OwnList | undefined {
  const variable = scope.variables?.get(words) as P.ScopeVariable | undefined
  if (variable) return { variable, words, datatype: variable.datatype }
  const member = P.MethodScope.thingTypeOf(scope)?.getMember(words)
  if (!member) return undefined
  if (member instanceof P.ScopeVariable) return { words, datatype: member.datatype }
  return { words, isAction: true }
}

/** Reads what `ownListOf()` found. */
export function ownListAST(match: P.Match, { variable, words }: OwnList): P.ASTExpression {
  if (variable) return new P.ASTVariableExpression(match, { name: variable.name, variable })
  return new P.ASTPropertyExpression(match, { object: new P.ASTSelfLiteral(match), property: fieldNamed(words) })
}

/**
 * `read`, an expression that waits for a place, as a drawing can read it:  a drawing never waits, so it's a waited value,
 * which draws "…", or holds the whole thing, until its answer.
 * - `read` itself, anywhere but a drawing.
 * - A lookup of the scope, so ask `inDrawing` WHILE PARSING.
 * - Keyed by its words:  ONE value per thing, and per thing it asks.
 */
export function readableInDrawing(
  match: P.Match,
  read: P.ASTExpression,
  inDrawing: boolean | undefined
): P.ASTExpression {
  if (!inDrawing || !mentionsSavedRead(read)) return read
  const value = new P.ASTMethodDefinition(match, { inline: true, body: read })
  const name = new P.ASTStringLiteral(match, { value: JSON.stringify(`${match.inputText}`.trim()) })
  return new P.ASTCoreMethodInvocation(match, {
    methodName: "waitedValue",
    args: [new P.ASTSelfLiteral(match), name, value]
  })
}

/** Is `scope` in a drawing's lines, a line of markup's value too? */
export function isInDrawing(scope: P.Scope): boolean {
  for (let each: P.Scope | undefined = scope; each; each = each.parentScope) if (DrawIt.drawingIn(each)) return true
  return false
}

/** Does `read` ask a place? */
function mentionsSavedRead(read: P.ASTExpression): boolean {
  let found = false
  P.forEachNode([read], (each) => {
    if (each instanceof P.ASTCoreMethodInvocation && each.methodName === "savedThings") found = true
  })
  return found
}

/** The name a collection goes by, from a type's name as written in its language:  `recipe` => `recipes`. */
export function collectionNameFor(typeWords: string): string {
  return P.pluralize(typeWords.trim().toLowerCase()).replace(/[\s-]+/g, "_")
}
