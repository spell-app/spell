/**
 * Thing references:  one thing of the running program, named in text by its type and its name or place
 * (epic `drawable-thing` P18, Owen's J23).
 *
 * ```ts
 * core.thingForReference("Tableau#T1")   // the tableau named T1
 * core.thingForReference("Pile#T1")      // the same tableau:  a tableau is a pile
 * core.thingForReference("Tableau#1")    // the first tableau the program made
 * core.referenceFor(tableau)             // "Tableau#T1"
 * ```
 *
 * - A reference reads like CSS's `tag#id`:  the type's name, `#`, then the thing's name or its place.
 * - What it's for:
 *   - a view element's attribute can hold a thing:  `<solitaire-card pile="Tableau#T1">`
 *   - a tag's `id` is the part after the `#`, its tag saying the type (J43):
 *     `<solitaire-tableau id="T1">` draws `Tableau#T1` -- see `thingCalled()`
 *   - spell's words for one thing, `tableau T1` and `the first tableau`, compile to `thingNamed()` and `thingAtPlace()`
 * - And the other way:  an element the program draws takes its thing's name as its `id`,
 *   `<solitaire-card id="queen-of-spades">` -- see `elementIdFor()`.
 * - WHERE they look:  the running program's things, or what the caller hands `searchThings()` instead
 *   (epic `people-and-orgs` P9, Q44).
 *   - So a library's code finds things by name too, under `spell/parser/core/model`, which has no running program:
 *     the people store searches its people and orgs, `Person#owen`.
 * - Part of `core`:  imported by `spell/parser/core`'s barrel, and by `spell/parser/core/model`, for its side effect.
 *   - The model has no drawing, so no `elementIdFor()`:  it says so if it's called there.
 * - A thing with no name goes by the id the program chose for it (`hasChosenId()`):  `"T1" is a new tableau` is
 *   `new Tableau({ id: "T1" })`, found as `Tableau#T1`, drawn by `<tableau "T1"/>` (Owen, 2026-11-12).
 */

import { peekProp, untrackCells } from "spell/util"

import { programThings, core } from "./core"
import { defineCoreModule } from "./core.types"
import { nameTableColumns } from "./ui"
// Import directly to avoid circular import
import { List } from "./classes/List"
import { hasChosenId } from "./classes/ids"

/** `core`'s methods for thing references. */
export const referencesMethods = defineCoreModule({
  /**
   * Look things up in `things` from now on, not in the running program's.
   * - Returns what was searched before, to put back.
   * - `undefined`:  the running program's things again.
   * - What a library's code needs under `spell/parser/core/model`, which has no running program, e.g. the people store's:
   *
   *   ```ts
   *   const before = core.searchThings({ all: () => people, classNamed: (name) => classes[name] })
   *   try { core.thingForReference("Person#owen") } finally { core.searchThings(before) }
   *   ```
   */
  searchThings(things: ThingsToSearch | undefined): ThingsToSearch | undefined {
    const before = searched
    searched = things
    return before
  },

  /**
   * The program's thing `reference` names, e.g. the tableau named T1 for `Tableau#T1` -- `undefined` if none.
   * - `Type#name`:  its thing of `Type` or a sub-type with that name, as `thingNamed()` finds it.
   *   So `Pile#T1` finds the tableau named T1.
   * - `Type#1`:  its first thing of `Type` exactly, counting from 1, as `thingAtPlace()` finds it.
   *   - Digits are always a place:  a thing named "3" can't be found by its name.
   *   - A place across sub-types, `Pile#2` for the second pile of any kind, is a todo (T10).
   * - `Type` is a class's name, exactly as the program declares it:  `Tableau`, never `tableau`.
   *   Found by `core.things.classNamed()`, which knows a class once one of its things is made;
   *   or by the `classNamed()` of what `searchThings()` says.
   * - Tracked:  a reader re-runs as things are made, so it finds the thing as soon as the program makes it.
   */
  thingForReference(reference: string): object | undefined {
    const parts = REFERENCE.exec(reference.trim())
    if (!parts) return undefined
    const [, type, name] = parts as unknown as [string, string, string]
    const Class = thingsSearched().classNamed(type)
    return Class ? core.thingCalled(Class, name) : undefined
  },

  /**
   * The program's thing of class `Class` that `text` names -- `undefined` if none.
   * - `text` is the part of a reference after its `#`:
   * - digits:  its place, as `thingAtPlace()` finds it, e.g. `thingCalled(Tableau, "1")` for the first tableau
   * - else its name, as `thingNamed()` finds it, so a sub-class's thing too:  `thingCalled(Pile, "T1")`
   * - What a tag's `id` names (J43):  `<solitaire-tableau id="T1">` is `Tableau#T1`.
   * - Tracked, as `thingForReference()`.
   */
  thingCalled(Class: abstract new (...args: never[]) => unknown, text: string): object | undefined {
    const thing = PLACE.test(text) ? core.thingAtPlace(Class, Number(text)) : core.thingNamed(Class, text)
    return thing as object | undefined
  },

  /**
   * The program's thing of class `Class`, or of a sub-class, named `name` -- `undefined` if none.
   * - e.g. `thingNamed(Pile, "T1")` is the tableau named T1;  `tableau T1` in spell compiles to it.
   * - Its `name` property, as text:  a card's worked-out name counts too, e.g. `queen-of-spades`.
   * - Two with the same name:  the first made wins.
   *   The compiler warns where spell names one that two things share (P19).
   * - No thing with that name:  one whose CHOSEN id it is (`hasChosenId()`), e.g. `"T1" is a new tableau`,
   *   made as `new Tableau({ id: "T1" })` (Owen, 2026-11-12).  A name still wins over an id.
   *   - A made-up id never counts:  it's new each run, so nothing names it.
   *   - Its words joined by `-` match too:  `discard pile` finds the discard pile, whose id is `discard-pile`.
   * - No thing with that name:  a top-level thing of `Class` that the program keeps under that name,
   *   e.g. `thingNamed(Game, "game")` for `set the game to a new game`.
   * - Tracked, as `thingForReference()`.
   */
  thingNamed<T>(Class: abstract new (...args: never[]) => T, name: string): T | undefined {
    const things = thingsSearched()
    const ofClass = thingsOf(things, Class)
    for (const thing of ofClass) {
      if (nameOf(thing) === name) return thing
    }
    // a member's thing takes its words joined by `-`:  `discard pile` finds `discard-pile` too (language T147)
    const oneWord = name.trim().split(/\s+/).join("-")
    for (const thing of ofClass) {
      const id = chosenIdOf(thing)
      if (id === name || id === oneWord) return thing
    }
    const kept = things.exported?.[name]
    return kept instanceof Class ? kept : undefined
  },

  /**
   * The program's thing of class `Class` at place `place`, in the order it made them, counting from 1 --
   * `undefined` if there's none there.
   * - e.g. `thingAtPlace(Tableau, 1)` is the first tableau made;  `the first tableau` in spell compiles to it.
   * - A place from the end is negative:  `-1` is the last one made, `the last tableau`.
   * - Of `Class` EXACTLY:  a sub-class's things aren't counted (T10).
   * - Only things the program made and still holds:  the Thing Explorer's (`core.things.all()`).
   * - Tracked, as `thingForReference()`.
   */
  thingAtPlace<T>(Class: abstract new (...args: never[]) => T, place: number): T | undefined {
    const things = thingsOf(thingsSearched(), Class).filter((thing) => thing.constructor === Class)
    if (!Number.isInteger(place) || place === 0) return undefined
    return things.at(place > 0 ? place - 1 : place) as T | undefined
  },

  /**
   * Every thing of class `Class`, or of a sub-class, the program has made, in the order made:  a scratch list.
   * - `every pile` in spell compiles to it, `everyThing(Pile)`:  e.g. the stock, the discards, the foundations ...
   * - Only the program's things:  NOT a thing a test made (see `core.things`).
   * - Scratch, so it takes none of them from the lists that hold them (see `List.asScratch()`).
   * - Tracked, as `thingForReference()` is:  whatever reads it re-runs as things are made.
   */
  everyThing<T>(Class: abstract new (...args: never[]) => T): List<T> {
    const things = thingsOf(thingsSearched(), Class)
    const list = new List<T>({ instanceType: Class.name }).asScratch().append(...things)
    nameTableColumns(list, Class)
    return list
  },

  /**
   * Is `item` in any list of class `Class`, or of a sub-class, the program has made?
   * - `the card is in a column` in spell compiles to it, `isInA(card, Column)` (epic `language` P55).
   * - Only the program's lists, as `everyThing()`:  NOT a list a test made.
   * - Tracked, as `everyThing()` is.
   * - A class of an exclusive family (`a card belongs to one pile`, `a column is a pile`):  the one list holding a
   *   thing says, no search -- `Column.ownerOf(card) instanceof Column` (epic `language` J148).
   *   - Any list of the family holding it counts then, a test's too.
   *   - The compiler writes `card.pile instanceof Column` itself, when it knows the family where the line is read.
   */
  isInA(item: unknown, Class: abstract new (...args: never[]) => unknown): boolean {
    if (Class.prototype instanceof List && (Class as typeof List).exclusive && item && typeof item === "object") {
      return (Class as typeof List).ownerOf(item) instanceof Class
    }
    return thingsOf(thingsSearched(), Class).some((thing) => thing instanceof List && thing.includes(item))
  },

  /**
   * The reference that finds `thing` again, e.g. `Tableau#T1` -- `undefined` if no reference does.
   * - Its class's name, then its name:  `Tableau#T1`, `Card#queen-of-spades`.
   *   A thing with no name goes by the id the program chose for it, `Tableau#T1` for `new Tableau({ id: "T1" })`.
   *   A thing with no name of its own goes by the top-level name the program keeps it under:  `Game#game`.
   * - A name it shares with an earlier thing, or no name at all:  its place instead, e.g. `Tableau#3`.
   * - None for what isn't the program's thing:  a scratch list, a thing a test made, a number.
   * - Tracked, as `thingForReference()`:  it follows the thing's name.
   */
  referenceFor(thing: unknown): string | undefined {
    if (!thing || typeof thing !== "object") return undefined
    const things = thingsSearched()
    const Class = thing.constructor as abstract new (...args: never[]) => unknown
    const name = nameOf(thing) ?? chosenIdOf(thing) ?? topLevelNameOf(things, thing)
    if (name && !PLACE.test(name) && core.thingNamed(Class, name) === thing) return `${Class.name}#${name}`
    const place = thingsOf(things, Class)
      .filter((each) => each.constructor === Class)
      .indexOf(thing)
    return place < 0 ? undefined : `${Class.name}#${place + 1}`
  },

  /**
   * The `id` an element the program draws for `thing` takes:  its name, e.g. `queen-of-spades` (J43) --
   * `undefined` for a thing with no name.
   * - A thing with no name:  the id the program chose for it, `T1` for `new Tableau({ id: "T1" })`.
   * - So the browser's inspector says which thing an element draws:  `<solitaire-card id="queen-of-spades">`.
   * - Two of the program's views with one name, e.g. a game with two decks:
   *   the first made is `queen-of-spades`, the second `queen-of-spades-2`, the third `-3`.
   *   - Counted among every view the program made, of any type:  ids are the page's.
   *   - A thing keeps the id it got while it keeps its name,
   *     so each element drawing it says the same, even after an earlier thing is gone.
   * - A space in its name is a dash, as an `id` has none:  `discard pile` => `discard-pile`.
   * - Tracked:  follows the thing's name, so a card's id changes with its rank.
   *   Nothing else is followed:  a thing made later never changes an id given.
   */
  elementIdFor(thing: unknown): string | undefined {
    if (!thing || typeof thing !== "object") return undefined
    if (!programThings())
      throw new Error("elementIdFor() needs drawing:  import spell/parser/core, not spell/parser/core/model")
    const name = idNameOf(thing)
    if (!name) return undefined
    const kept = ELEMENT_IDS.get(thing)
    if (kept?.name === name) return kept.id
    const earlier = untrackCells(() => earlierNamed(thing, name))
    const id = earlier ? `${name}-${earlier + 1}` : name
    ELEMENT_IDS.set(thing, { name, id })
    return id
  }
})
Object.assign(core, referencesMethods)

/**
 * What the lookups search:  a list of things, and their classes by name.
 * - The running program's things (`core.things`), or what `searchThings()` was given.
 */
export type ThingsToSearch = {
  /** Every thing to search, in the order they were made:  a place counts in it. */
  all(): readonly object[]
  /**
   * Those of class `Class`, or of a sub-class, in the order made:  as `all()`'s, of `Class` -- see `thingsOf()`.
   * - Optional:  the running program's things have one, `ThingRegistry.ofClass()`, which re-runs a reader only as
   *   things of `Class` come and go.
   */
  ofClass?<T>(Class: abstract new (...args: never[]) => T): readonly (T & object)[]
  /** The class named `name`, e.g. `Person` for `Person#owen`;  `undefined` if there's none. */
  classNamed(name: string): (abstract new (...args: never[]) => unknown) | undefined
  /** Things kept under a top-level name, e.g. `{ game }`:  found by that name too.  None if left out. */
  readonly exported?: Readonly<Record<string, unknown>>
}

/** What `searchThings()` was last given:  `undefined` for the running program's things. */
let searched: ThingsToSearch | undefined

/** Nothing to search:  under `spell/parser/core/model`, before `searchThings()`. */
const NOTHING: ThingsToSearch = { all: () => [], classNamed: () => undefined }

/** What the lookups search now:  `searchThings()`'s, else the running program's things, else nothing. */
function thingsSearched(): ThingsToSearch {
  return searched ?? programThings() ?? NOTHING
}

/**
 * Those of `things` of class `Class`, or of a sub-class, in the order made:  its own `ofClass()`, if it has one,
 * else `all()`'s, looked through.
 */
function thingsOf<T>(things: ThingsToSearch, Class: abstract new (...args: never[]) => T): readonly (T & object)[] {
  return things.ofClass
    ? things.ofClass(Class)
    : things.all().filter((thing): thing is T & object => thing instanceof Class)
}

/** The top-level name `things` keep `thing` under, e.g. `game` -- `undefined` if none. */
function topLevelNameOf(things: ThingsToSearch, thing: object): string | undefined {
  const { exported = {} } = things
  return Object.keys(exported).find((name) => exported[name] === thing)
}

/** A reference, its type and its name or place captured:  `Tableau#T1`, `Card#queen-of-spades`, `Tableau#1`. */
const REFERENCE = /^([A-Za-z_$][\w$]*)#(.+)$/

/** A place in a reference:  digits, counting from 1. */
const PLACE = /^[1-9]\d*$/

/**
 * The id each thing drawn as an element was given, and the name it was given for -- see `elementIdFor()`.
 * - Held weakly:  a thing thrown away takes its entry with it.
 * - One per runtime copy, as `core` is:  each `<spell-viewer>`'s program numbers its own things.
 */
const ELEMENT_IDS = new WeakMap<object, { name: string; id: string }>()

/**
 * How many views the program made before `thing` whose name, as an id, is `name` --
 * `0` if `thing` isn't the program's.
 */
function earlierNamed(thing: object, name: string): number {
  const { things } = core
  const number = things.numberOf(thing as Parameters<typeof things.numberOf>[0])
  if (number === undefined) return 0
  let count = 0
  for (const each of things.all()) {
    if ((things.numberOf(each) ?? 0) >= number) break
    if (core.elementTagOf(each) && idNameOf(each) === name) count++
  }
  return count
}

/**
 * `thing`'s name as an id's text, a dash for each run of spaces:  `discard-pile` -- `undefined` if it has none.
 * - No name:  the id the program chose for it, `T1` (`chosenIdOf()`).
 */
function idNameOf(thing: object): string | undefined {
  return (nameOf(thing) ?? chosenIdOf(thing))?.trim().replace(/\s+/g, "-") || undefined
}

/**
 * The id the program chose for `thing`, `T1` for `new Tableau({ id: "T1" })` -- `undefined` for a made-up one, or none.
 * - Reads no id:  a thing whose id was never read isn't given one (`hasChosenId()`).
 * - Not tracked:  a chosen id is set as the thing is made, and kept.
 */
function chosenIdOf(thing: object): string | undefined {
  if (!hasChosenId(thing)) return undefined
  const id = peekProp<unknown>(thing, "id")
  return id === undefined || id === null || id === "" ? undefined : `${id as string | number}`
}

/** `thing`'s name, as text -- `undefined` if it has none, or reading it throws. */
function nameOf(thing: object): string | undefined {
  const read = readName(thing)
  if (!("value" in read)) return undefined
  const { value } = read
  return value === undefined || value === null || value === "" ? undefined : `${value as string | number}`
}

/**
 * `thing`'s `name`, or the error reading it threw.
 * - Through the running program's things when there are any:  quietly, so a computed name makes nothing of theirs.
 */
function readName(thing: object): { value: unknown } | { error: string } {
  const things = programThings()
  if (things) return things.read(thing as Parameters<typeof things.read>[0], "name")
  try {
    return { value: (thing as { name?: unknown }).name }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}
