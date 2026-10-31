import { isPlaceServerAddress } from "spell/util/places/places.types"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

import { textIn } from "./PlaceDetail"

/**
 * What the compiler can say about each kind of place, with no place in hand (epic `data` P11).
 * - The same words as `core.place()`'s kinds, and as `PlaceCapabilities.kind` (J55).
 * - A hint for what to refuse or warn about, at a program's line:  a place still answers for itself when it runs.
 *   - `isReadOnly`:  a write won't compile, unless its address is a place server, which takes writes (`isReadOnlyPlace()`).
 *   - `isAtomic`:  `all or nothing:` is really that.
 *   - `saysWhatChanged`:  it tells us;  a kind that doesn't warns unless its line says how often to ask.
 *   - `hasOtherPeople`:  `false`, only you ever change what's in it:  `when someone else changes it` warns.
 *   - `knowsWhoIsHere`:  `the people here` can list more than you.
 *   - `takesOperations`:  `to publish a recipe is at "..."` can reach it, by its address.
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
    }
  >
> = {
  "web service": { takesOperations: true },
  "graph service": {},
  folder: {},
  file: { hasOtherPeople: false },
  "live room": { isAtomic: true, saysWhatChanged: true, knowsWhoIsHere: true },
  sheet: { isReadOnly: true },
  "this device": { isAtomic: true, saysWhatChanged: true, hasOtherPeople: false },
  "in memory": { isAtomic: true, saysWhatChanged: true, hasOtherPeople: false }
}

/** What a kind's word, as `place_kind` names its meaning (`web_service`), is in `core.place()`'s words. */
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
 *   No new word:  the address says it, as a folder's and a file's do.
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
      kind: `${saved?.placeType.placeKind ?? ""}`
    })
  }
  SP.SpellWarnings.refuseIf(match, message, () => isReadOnlyPlace(type.savedPlace()))
}

/** The name a collection goes by, from a type's name as written in its language:  `recipe` => `recipes`. */
export function collectionNameFor(typeWords: string): string {
  return P.pluralize(typeWords.trim().toLowerCase()).replace(/[\s-]+/g, "_")
}
