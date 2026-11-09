import { CLOUD_KIND, SPACE_FOLDER_CHECKS_AT_MOST_EVERY, isPlaceServerAddress } from "spell/places/places.types"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

// Import directly to avoid circular import
import { DrawIt } from "spell/parser/spell/rules/classes/DrawIt"
import { fieldNamed, textIn } from "./PlaceDetail"

/**
 * A collection's whole name, an NSID:  `com.example.recipe`.
 * - Three parts at the least, and only letters and digits in its last.
 * - A published type's schema name too (`published_as`, epic `atmosphere` P10).
 */
export const COLLECTION_NAME = /^[a-z][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+\.[a-z][a-z0-9]*$/i

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
 *   - `checkedEveryByDefault`:  how often it's asked what changed, in seconds, when its line doesn't say;
 *     so it never warns that it can't announce (the cloud, epic `atmosphere` P8).
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
  "excel file": { isReadOnly: true },
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

/**
 * The type match of `list`, when it's every thing of a type (`every recipe`, `the recipes`, `the saved recipes`):
 * `undefined` otherwise.
 */
export function savedTypeMatchOf(list: P.Match): P.Match | undefined {
  const { type } = list.groups as { type?: P.Match }
  return type && !Array.isArray(type) && /^(?:every_thing|the_things|the_saved_things)$/.test(list.rule.name ?? "")
    ? type
    : undefined
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
 * - Nor is the program's own CSV file, `a sheet at "tasks.csv"`:  the page server writes it (epic `language` T65).
 */
export function isReadOnlyPlace(saved: P.SavedPlace | undefined): boolean {
  if (!abilitiesOf(saved)?.isReadOnly) return false
  const declaredBy = saved?.placeType.declaredBy
  if ((declaredBy?.data as { folderAt?: string } | undefined)?.folderAt) return false
  const address = declaredBy?.groups.address as P.Match | undefined
  return !address || !isPlaceServerAddress(textIn(address))
}

/** Does a line under the place `saved` names say how often to ask it what changed? */
export function isCheckedOften(saved: P.SavedPlace): boolean {
  const { declaredBy } = saved.placeType
  const rule = declaredBy?.rule.constructor as unknown as { detailsOf?(match: P.Match): { checkedEvery?: number } }
  return !!declaredBy && rule.detailsOf?.(declaredBy)?.checkedEvery !== undefined
}

/**
 * The fields what's saved in `saved` is searched by, for text they hold, and the query parameter:
 * `it searches names with "search"`.
 * - Its collection's own search first:  `users are searched with "q" at "/search/users"` (epic `data` P41).
 * - `undefined` when no line under its place says so.
 */
export function searchesOf(saved: P.SavedPlace | undefined): { param: string; fields: string[] } | undefined {
  const declaredBy = saved?.placeType.declaredBy
  const rule = declaredBy?.rule.constructor as unknown as {
    detailsOf?(match: P.Match): {
      searches?: { param: string; fields: string[] }
      collections?: Record<string, { searches?: { param: string; fields: string[] } }>
    }
  }
  const details = declaredBy ? rule.detailsOf?.(declaredBy) : undefined
  return details?.collections?.[saved!.collection]?.searches ?? details?.searches
}

/**
 * Is what's saved in `saved` found only by name, with no list of them all?
 * - e.g. `wiki pages are found at "/page/summary/{name}"` (epic `data` P27)
 */
export function isFoundByName(saved: P.SavedPlace | undefined): boolean {
  const declaredBy = saved?.placeType.declaredBy
  const rule = declaredBy?.rule.constructor as unknown as {
    detailsOf?(match: P.Match): { collections?: Record<string, { at?: string }> }
  }
  const at = declaredBy && rule.detailsOf?.(declaredBy)?.collections?.[saved!.collection]?.at
  return !!at && /\{[^{}/]*\}/.test(at)
}

/**
 * Is what's saved in `saved` given only to a search, with no list of them all?
 * - e.g. `books are searched at "/search.json"` (epic `data` P29)
 */
export function isSearchedOnly(saved: P.SavedPlace | undefined): boolean {
  const declaredBy = saved?.placeType.declaredBy
  const rule = declaredBy?.rule.constructor as unknown as {
    detailsOf?(match: P.Match): { collections?: Record<string, { searchedOnly?: boolean }> }
  }
  return !!declaredBy && !!rule.detailsOf?.(declaredBy)?.collections?.[saved!.collection]?.searchedOnly
}

/**
 * The fields what's saved in `saved` is asked for by, each a query parameter:
 * `forecasts are asked for by their latitude and longitude` (epic `data` P33).
 * - Empty when no line says so.
 */
export function askedByOf(saved: P.SavedPlace | undefined): string[] {
  const declaredBy = saved?.placeType.declaredBy
  const rule = declaredBy?.rule.constructor as unknown as {
    detailsOf?(match: P.Match): { collections?: Record<string, { askedBy?: string[] }> }
  }
  return (declaredBy && rule.detailsOf?.(declaredBy)?.collections?.[saved!.collection]?.askedBy) || []
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
 * - `read` itself, anywhere but a drawing, or when it doesn't wait.
 * - `loopItems`:  what `loopItemsInDrawing()` said WHILE PARSING, as that's a lookup of the scope.
 * - Keyed by its words:  ONE value per thing, and per thing it asks.
 *   - And per item of each loop it names:  `rows={every review where its film is film}`, inside `<for film in films>`,
 *     is another read for each film, with the same words (`core.waitedValueKeyFor()`).
 */
export function readableInDrawing(
  match: P.Match,
  read: P.ASTExpression,
  loopItems: string[] | undefined
): P.ASTExpression {
  if (!loopItems) return read
  const value = new P.ASTMethodDefinition(match, { inline: true, body: read })
  if (!value.waitsItself) return read
  const name = new P.ASTStringLiteral(match, { value: JSON.stringify(`${match.inputText}`.trim()) })
  return new P.ASTCoreMethodInvocation(match, {
    methodName: "waitedValue",
    args: [waitedValueOwner(match, read, loopItems), name, value]
  })
}

/** What a waited value in a drawing belongs to:  the thing drawing, and each loop's item `read` names. */
function waitedValueOwner(match: P.Match, read: P.ASTExpression, loopItems: string[]): P.ASTExpression {
  const named = new Map<string, P.ASTVariableExpression>()
  P.forEachNode([read], (each) => {
    if (each instanceof P.ASTVariableExpression && loopItems.includes(each.name)) named.set(each.name, each)
  })
  const self = new P.ASTSelfLiteral(match)
  if (!named.size) return self
  return new P.ASTCoreMethodInvocation(match, { methodName: "waitedValueKeyFor", args: [self, ...named.values()] })
}

/** Is `scope` in a drawing's lines, a line of markup's value too? */
export function isInDrawing(scope: P.Scope): boolean {
  return !!loopItemsInDrawing(scope)
}

/**
 * The names of the items of the loops around `scope`, inside a drawing:  `[]` if there are none;  `undefined` outside a drawing.
 * - A lookup of the scope:  call it WHILE PARSING.
 */
export function loopItemsInDrawing(scope: P.Scope): string[] | undefined {
  const items: string[] = []
  for (let each: P.Scope | undefined = scope; each; each = each.parentScope) {
    if (each instanceof P.MethodScope && DrawIt.isLoop(each)) items.push(...each.args().map(({ name }) => name))
    if (DrawIt.drawingIn(each)) return items
  }
  return undefined
}

/** The name a collection goes by, from a type's name as written in its language:  `recipe` => `recipes`. */
export function collectionNameFor(typeWords: string): string {
  return P.pluralize(typeWords.trim().toLowerCase()).replace(/[\s-]+/g, "_")
}

////////////////
// ## Writes to a read
////////////////

/** The rules that read every thing of a type, a `where` or not:  what a property worked out from a place is made of. */
const SAVED_READS = /^(?:every_thing|every_thing_where|the_things|the_saved_things)$/

/**
 * SIDE EFFECT:  warns when `list`, which `match` adds to (`write` `add`) or removes from,
 * is a property worked out from a place (epic `data` I61):
 * `add its new todo to its todos`, with `its "todos" is every todo where its user is 1`.
 * - It changes only the copy the read made:  the place never hears of it, and the next read puts it back.
 *   The warning names the list that saves, `the saved todos`.
 * - Not for a list of saved things itself (`the todos`, `every todo`):  that's a save.
 * - Its property's value is asked when the warnings are gathered:  it may be declared below this line.
 */
export function warnIfWritesARead(match: P.Match, list: P.Match, write: "add" | "remove"): void {
  if (savedTypeMatchOf(list)) return
  const { member, scopeVar } = list.data as { member?: unknown; scopeVar?: unknown }
  const held = member ?? scopeVar
  if (!(held instanceof P.ScopeVariable)) return
  const read = () => (held.declaredBy ? savedReadIn(held.declaredBy) : undefined)
  const message = () => {
    const type = read()!
    const key = write === "add" ? "adds-to-a-read" : "removes-from-a-read"
    const theSavedThings = phraseForThings(match.scope, "the-saved-things", type)
    return SP.Language.of(match.scope).parserMessage(key, { theSavedThings })
  }
  SP.SpellWarnings.noteIf(match, message, () => !!read())
}

/**
 * The saved type the first read in `declaration` (a property's line, and what's under it) reads:  `undefined` for none.
 * - Its own words only:  a getter it calls, which reads a place, isn't followed.
 */
function savedReadIn(declaration: P.Match): P.TypeScope | undefined {
  const seen = new Set<P.Match>()
  let found: P.TypeScope | undefined
  const walk = (each: P.Match): void => {
    if (found || seen.has(each)) return
    seen.add(each)
    const type = SAVED_READS.test(each.rule?.name ?? "") ? (each.groups as { type?: P.Match }).type : undefined
    if (type && !Array.isArray(type) && savedPlaceOfMatch(type)) {
      found = (type.data as { scopeType?: P.TypeScope }).scopeType
      return
    }
    for (const item of each.matched) if (item instanceof P.Match) walk(item)
    for (const value of Object.values(each.data ?? {})) {
      for (const item of [value].flat()) if (item instanceof P.Match) walk(item)
    }
  }
  walk(declaration)
  return found
}

/** Where a phrase's plural goes, while its other words are agreed:  see `phraseForThings()`. */
const THINGS_MARK = "\u0000"

/**
 * Every thing of `type` as `key`'s phrase says it, in `scope`'s language:
 * `the saved todos`, Spanish's `las recetas guardadas`.
 * - Each word of the phrase but the plural agrees with the type:  Spanish's `los ... guardados` for a `receta`.
 */
export function phraseForThings(scope: P.Scope, key: "the-saved-things" | "the-things", type: P.TypeScope): string {
  const language = SP.Language.of(scope)
  const words = type.name.toLowerCase().replace(/_/g, " ")
  const things = P.Inflector.using(language.inflector, () => P.pluralize(words))
  return language
    .parserMessage(key, { things: THINGS_MARK })
    .split(" ")
    .map((word) => (word === THINGS_MARK ? things : (language.agreedForm(word, type, true) ?? word)))
    .join(" ")
}
