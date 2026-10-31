/**
 * A place's rows as things:  ONE thing per type and id, however many reads bring it (epic `data` P2, J11).
 *
 * ```ts
 * const things = new PlaceThings({ cache: places.cache })
 * const result = places.read({ placeName: "cookbook", collection: "recipes", type: "Recipe" })
 * await result.load()
 * const recipes = things.thingsFrom(result)   // made the first time
 * await result.reload()
 * things.thingsFrom(result)                   // the SAME things, changed in place, so what draws them redraws
 * ```
 *
 * - A new id is made by the `Loader`'s entry reading, which stays synchronous:
 *   by the time a row gets here, it has already been waited for.
 * - A known id is changed in place, the way `StateMirror.read()` does it.
 *   - NEVER through `Loader.load()`:  it forgets the undo history, and hands a known thing back unchanged.
 *   - Only the fields the row has:  a read that selected some takes nothing from the others.
 * - All of it runs `whileReading()`:  what it changes joins no undo step and goes to no program running elsewhere,
 *   so a refresh or a heal never comes back as a write.
 * - A reference in a row, `{ "$ref": "Person#matt" }`, finds that thing, or its row in the cache.
 * - By file, `spell/parser/core/places`, NOT in the core's barrel or `model`:  a program with no places pays nothing.
 * - Its only part of `spell/util/places` at run time is `idOfRow()` and `BrowserCopy`:
 *   the rest of that folder is the caller's.
 *
 * Handed `places`, what's done to those things goes back to their place (epic `data` P3):
 *
 * ```ts
 * const things = new PlaceThings({ places })
 * const [recipe] = things.thingsFrom(result)
 * recipe.title = "Stew"                      // shown at once;  pending, kept on this device, sent soon
 * ```
 *
 * - Every write is heard where undo hears it (`onPlaceWrite()`, `core.ts`):  a thing with no place costs one lookup,
 *   a program with no places one check.
 * - An action's changes are a group, held until it ends, and dropped if it's cancelled:
 *   one person's action through `core.runAction()`, or one declared with `declareAction()`.
 * - Undo needs nothing here:  its put-back is a write like any other (`PendingChanges`).
 * - A place's answers, heals and put-backs come back through `Places.onRows()`, and change each thing in place.
 * - A refused write raises a notice, anywhere in the app:  Retry, or Show me.
 * - A write merged over what someone else saved raises one too, holding what was lost:  Use theirs, or Show me.
 * - `draftOf()`:  a copy of a thing that takes changes and sends nothing, until it's saved.
 * - A list's change is a write of that field, the whole list, on a place that can take no more;
 *   on one that takes `edits`, a live room, it's only the items that changed, so two at once both stay (T17).
 * - A live room is followed as its first read's things are made (`PlaceHeal.follow()`):  what others do shows here too.
 *   Someone deleting what you're editing raises a notice with Restore;  your long text replaced, one with Use mine.
 * - `saveNew()`:  a thing made here goes to a place, under its own id (`Thing.id`, made in the browser).
 * - Telling the program what changed (epic `data` P13), each thing once, soon after, with the fields:
 *   - `a-recipe-change`, to the thing, up its chain (`core.send()`):  `when a recipe changes:`, whoever changed it.
 *   - `someone-else-change` too, when it wasn't this page:  `- when someone else changes it:`.
 *   - Only what really differs:  a row read again, or an answer to my own write, is no change;
 *     nor is what a read asking for fields it first left out brings (`quietly`).
 *   - Nobody takes `someone-else-change`, and a draft of that thing is open:  a plain notice, as what's on the draft's form
 *     doesn't show it.  A form on the thing itself shows it by itself, so it needs none.
 *
 * For the editor's side bar (epic `data` P9, request r1 of epic `editor`):
 *
 * ```ts
 * places.originOf(recipe, "title")             // which place, can it be written, why not, is it a sample
 * const edit = things.startEdit(recipe, "title", { title: "Change Title" })
 * edit.set("Stew")                             // a plain set, shown at once, held:  once per keystroke if you like
 * edit.commit()                                // one undo step, and the change goes out (J4)
 * ```
 *
 * - `originOf()` is `Places`'s;  it asks here about a thing:  `describeValue()`.
 * - A sample (`spell/util/places/SamplePlace`) isn't known here, so a program doesn't carry it.
 *   This only makes sure nothing done for one reaches the real place:  `swapped()`.
 */
import {
  CanceledError,
  cellsOf,
  ITEMS_KEY,
  keysOf,
  schemaOf,
  sourcesReadBy,
  TYPE_KEY,
  untrackCells,
  type Schema
} from "spell/util"
import type { UndoRecord } from "spell/util/persist/persist.types"
import type { UndoStack } from "spell/util/persist/UndoStack"
import type {
  PendingChanges,
  PendingGroup,
  PlaceConflict,
  PlaceLostText,
  PlaceRowsChange,
  PlaceThingDeleted,
  PlaceWriteFailure
} from "spell/util/places/PendingChanges"
import type { PlaceCache } from "spell/util/places/PlaceCache"
import type { PlaceResult } from "spell/util/places/PlaceResult"
import type { PlaceThingMaker, Places, SavedValue, WorkedOutValue } from "spell/util/places/Places"
import { idOfRow, type PlaceRow } from "spell/util/places/places.types"
import { POSITIONS_KEY } from "spell/util/places/positions"
import { parseRef } from "spell/util/places/refs"
import { BrowserCopy } from "spell/util/places/SaveQueue"

import { core, onPlaceWrite, whileReading, type PlaceWriteListener } from "./core"
import { dateIfDeclared, Loader, REF_KEY, Saver, type LoaderOptions } from "./saving"
import { fieldsOf, hasSetter, setField } from "./state"
// Import directly to avoid circular import
import { List } from "./classes/List"
import { Thing } from "./classes/Thing"

/** A thing or a list:  what a row becomes. */
type SpellObject = Thing | List

/** Options for `PlaceThings`. */
export type PlaceThingsOptions = Pick<LoaderOptions, "classNamed"> & {
  /** The cache of rows, where a reference in a row finds what it names.  Left out:  `places`'s. */
  cache?: PlaceCache
  /** The places its things are kept in:  given, what's done to them goes back there.  Left out:  they only read. */
  places?: Places
  /**
   * What the notice's Show me does.
   * - Default:  sends the thing the event `show-me`, up its chain to the app (`core.send()`), whose handler goes there.
   */
  showMe?: (thing: SpellObject) => void
}

/** Where a thing made from a row is kept, for what's done to it to go back there. */
type ThingHome = {
  /** Which `PlaceThings` made it. */
  things: PlaceThings
  /** The place's name. */
  placeName: string
  /** Its collection. */
  collection: string
  /** Its class's name. */
  type: string
  /** Its id:  it changes when a place that makes its ids names it. */
  id: string
}

/** Each thing kept in a place, and where. */
const HOMES = new WeakMap<object, ThingHome>()

/** Each plain list held by a thing in a place or a draft, and which field of what. */
const LIST_FIELDS = new WeakMap<object, { owner: SpellObject; field: string }>()

/** How a thing changed, as an event says it. */
export type SavedChangeKind = "changed" | "added" | "removed"

/** Each draft's copy, and its draft. */
const DRAFT_COPIES = new WeakMap<object, PlaceDraft>()

/** The store a draft is kept in on this device. */
const DRAFT_STORE = "spell-place-drafts"

/** The event Show me sends, unless `PlaceThingsOptions.showMe` says otherwise. */
const SHOW_ME_EVENT = "show-me"

/** Every write, sent to whichever `PlaceThings` or draft the thing belongs to:  ONE for all of them. */
const PLACE_WRITES: PlaceWriteListener = {
  setting(target, property, was, value) {
    if (property === "id" || property.startsWith("$")) return
    if (value instanceof List) rememberListField(value, target as SpellObject, property)
    const draft = DRAFT_COPIES.get(target)
    if (draft) return draft.noteField(property, value)
    const home = HOMES.get(target)
    if (home) return home.things.noteWrite(home, property, was, value)
    const holder = HELD_BY.get(target)
    if (holder) noteWriteToHeld(target as SpellObject, holder, property, value)
  },
  items(list, before, after) {
    const held = LIST_FIELDS.get(list)
    if (held) {
      noteHeldItems(after, held.owner, held.field)
      const draft = DRAFT_COPIES.get(held.owner)
      if (draft) return draft.noteField(held.field, after)
      const home = HOMES.get(held.owner)
      return home?.things.noteWrite(home, held.field, before, after)
    }
    const home = HOMES.get(list)
    home?.things.noteWrite(home, ITEMS_KEY, before, after)
  }
}

/** Note that `list`, a plain one, is `owner`'s `field`, so a change to it is a write to that field. */
function rememberListField(list: List, owner: SpellObject, field: string): void {
  if (list.constructor !== List) return
  LIST_FIELDS.set(list, { owner, field })
  noteHeldItems(list.items, owner, field)
}

/** Who holds each thing saved inside its owner's row, and in which of its fields:  `the recipe of an ingredient`. */
const HELD_BY = new WeakMap<object, { owner: SpellObject; field: string }>()

/** A thing saved inside its owner's row, as its class says:  `an ingredient belongs to one recipe`. */
function isSavedWithOwner(thing: object | undefined): boolean {
  return !!(thing?.constructor as { savedWith?: unknown } | undefined)?.savedWith
}

/** Note that each of `items` saved inside its owner's row is now `owner`'s. */
function noteHeldItems(items: readonly unknown[], owner: SpellObject, field: string): void {
  for (const item of items) if (isSavedWithOwner(item as object)) HELD_BY.set(item as object, { owner, field })
}

/** Who holds `thing`, saved inside its owner's row:  `core.ownerOfSaved()`. */
export function heldBy(thing: object): SpellObject | undefined {
  return HELD_BY.get(thing)?.owner
}

/**
 * A field of `thing`, saved inside its owner's row, is about to be `value`:  the owner's list is what's written.
 * - About to:  `noteSetting()` says so before the value lands, so the row written says the new value itself.
 */
function noteWriteToHeld(
  thing: SpellObject,
  { owner, field }: { owner: SpellObject; field: string },
  property: string,
  value: unknown
): void {
  const home = HOMES.get(owner)
  if (!home) return
  const list = (owner as unknown as Record<string, unknown>)[field] as List
  home.things.noteHeldChange(home, field, list.items, thing, property, value)
}

/**
 * A value as a row holds it:  a date as text, a list as an array, a thing as a reference to it.
 * - On `Saver`'s writing, which is the same but for a thing it would write whole.
 */
class RowWriter extends Saver {
  /** `value` as a row holds it. */
  jsonFor(value: unknown): unknown {
    return this.write(value, (thing) =>
      isSavedWithOwner(thing)
        ? { [TYPE_KEY]: thing.constructor.name, id: thing.id, ...this.rowFor(thing) }
        : { [REF_KEY]: `${thing.constructor.name}#${thing.id}` }
    )
  }

  /** Every field `thing` holds, but its id. */
  rowFor(thing: SpellObject): PlaceRow {
    return this.writeProps(thing, {}, (held) => this.jsonFor(held), "id")
  }
}

/****************
 * ### `PlaceThings`
 * Makes rows into things, one thing per type and id:  see the file's docs.
 * - One per program:  it's what remembers which things it made.
 * - A `Loader`, for its entry reading:  its `load()` is left to saved things.
 ****************/
export class PlaceThings extends Loader implements PlaceThingMaker {
  /** The places its things are kept in. */
  private readonly places: Places | undefined
  /** What Show me does. */
  private readonly showMe: (thing: SpellObject) => void
  /** Writes values as rows hold them. */
  private readonly writer = new RowWriter()
  /** The group open now for each place's changes, and which action it's for. */
  private readonly openGroups = new Map<PendingChanges, { action: unknown; group: PendingGroup & { number: number } }>()
  /** Its own writes are going out:  they mustn't come back through `Places.onRows()` mid-write. */
  private isWriting = false
  /** The group a draft's save is writing into. */
  private savingInGroup: number | undefined

  /**
   * Things made from rows.
   * - throws `TypeError` with neither `cache` nor `places`
   * - throws with no `classNamed`, and no running program to find classes in:  see `Loader`
   */
  constructor({ cache, places, classNamed, showMe }: PlaceThingsOptions) {
    const rows = cache ?? places?.cache
    if (!rows) throw new TypeError("new PlaceThings():  it needs `places`, or a `cache` of rows to find references in")
    super({ entryFor: (ref) => entryOfCachedRow(rows, ref), ...(classNamed && { classNamed }) })
    this.places = places
    this.showMe = showMe ?? ((thing) => void (core as Partial<Pick<typeof core, "send">>).send?.(thing, SHOW_ME_EVENT))
    if (places) {
      onPlaceWrite(PLACE_WRITES)
      places.onRows((change) => this.rowsChanged(change))
      places.onWriteFailed((failure) => this.writeFailed(failure))
      places.onConflict((conflict) => this.merged(conflict))
      places.onLost((lost) => this.lostText(lost))
      places.onThingDeleted((deleted) => this.thingDeleted(deleted))
      places.onSwapped((placeName) => this.swapped(placeName))
      places.addThingMaker(this)
    }
  }

  /**
   * The thing for each row of `result`, in order:  each made, or changed in place -- see the file's docs.
   * - Follows `result`'s rows and nothing else, so a computation re-runs when they change.
   * - What differs from a thing known already is someone else's change, and told, unless it's `quietly`:
   *   a read asking for what it first left out.
   * - throws `TypeError` if `result` has no `type`, or nothing is known by its type's name
   */
  thingsFrom(result: PlaceResult, { quietly = false }: { quietly?: boolean } = {}): SpellObject[] {
    const { type, contents = [] } = result
    if (type === undefined) {
      throw new TypeError(
        "PlaceThings.thingsFrom():  this read has no `type`, so its rows can't be things;  give it one"
      )
    }
    const { placeName, collection } = result
    const { idOf, live } = result.place.describe()
    if (this.places && live === "push") this.followPlace(placeName, collection, type)
    return untrackCells(() =>
      whileReading(() =>
        contents.map((row) => {
          const thing = this.thingFrom(type, row, idOf, { tellsChanges: !quietly })
          const id = idOfRow(row, idOf)
          if (this.places && id !== undefined) this.remember(thing, { things: this, placeName, collection, type, id })
          return thing
        })
      )
    )
  }

  ////////////////
  // ## What's done to a thing goes to its place
  ////////////////

  /** Follow what a place that pushes says, once for each collection it's read from. */
  private followPlace(placeName: string, collection: string, type: string): void {
    const key = `${placeName}\n${collection}\n${type}`
    if (this.following.has(key)) return
    this.following.add(key)
    this.places!.heal.follow({ placeName, collection, type })
  }

  /** What it's following already. */
  private readonly following = new Set<string>()

  /**
   * `thing`, made here, is now kept in a place:  sent there whole, under its own id (`Thing.id`, made in the browser).
   * - A place that makes its own ids renames it when it answers.
   * - throws `TypeError` with no `places`;  `PlaceError` if nothing goes by that name
   */
  saveNew(thing: SpellObject, { placeName, collection }: { placeName: string; collection: string }): void {
    const type = thing.constructor.name
    const { id } = thing
    const pending = this.placesOrDie("saveNew").pendingFor(placeName)
    this.remember(thing, { things: this, placeName, collection, type, id })
    this.loaded.set(`${type}#${id}`, thing)
    this.noteChanged(thing, { kind: "added" })
    const group = this.groupNumberFor(pending)
    this.writing(() =>
      pending.insert({
        collection,
        type,
        id,
        fields: this.writer.rowFor(thing),
        ...(group !== undefined && { group })
      })
    )
  }

  /** `thing`, kept in a place, is gone from it.  What it holds on to stays:  it's still a thing here.  Not kept:  nothing. */
  remove(thing: SpellObject): void {
    const home = HOMES.get(thing)
    if (!home) return
    const pending = this.placesOrDie("remove").pendingFor(home.placeName)
    const group = this.groupNumberFor(pending)
    const { collection, type, id } = home
    pending.delete({ collection, type, id, ...(group !== undefined && { group }) })
    this.noteChanged(thing, { kind: "removed" })
  }

  /**
   * A draft of `thing`:  its `thing` takes changes, and they stay apart until `save()`.
   * - ONE per thing:  asked again before it's saved or cancelled, the same draft.
   * - What it's holding is kept on this device, and comes back on the next visit.
   * - throws `TypeError` for a thing kept in no place
   */
  draftOf(thing: SpellObject): PlaceDraft {
    const home = HOMES.get(thing)
    if (!home) throw new TypeError("PlaceThings.draftOf():  this thing isn't kept in a place;  it needs no draft")
    let draft = this.drafts.get(thing)
    if (draft && !draft.isStillGood) draft = undefined
    if (!draft) this.drafts.set(thing, (draft = new PlaceDraft(thing, home, () => this.drafts.delete(thing))))
    return draft
  }

  /** Each thing's draft, while it has one. */
  private readonly drafts = new WeakMap<SpellObject, PlaceDraft>()

  /** A draft's save:  `write` is one group, so its changes go out together. */
  saveDraftFields(home: ThingHome, write: () => void): void {
    const group = this.placesOrDie("saveDraft").pendingFor(home.placeName).startGroup()
    this.savingInGroup = group.number
    try {
      write()
    } finally {
      this.savingInGroup = undefined
      group.end()
    }
  }

  /**
   * A thing saved inside `home`'s thing is about to change:  the list it's in is written, with that change in it.
   * - `was`:  nothing:  it's a new list, even when it's the same things.
   */
  noteHeldChange(
    home: ThingHome,
    field: string,
    items: readonly unknown[],
    thing: SpellObject,
    property: string,
    value: unknown
  ): void {
    const pending = this.placesOrDie("noteWrite").pendingFor(home.placeName)
    const group = this.groupNumberFor(pending)
    const { collection, type, id } = home
    const json = items.map((item) => {
      const row = this.writer.jsonFor(item) as PlaceRow
      return item === thing ? { ...row, [property]: this.writer.jsonFor(value) } : row
    })
    const write = { collection, type, id, field, ...(group !== undefined && { group }) }
    this.writing(() => pending.setField({ ...write, value: json, was: undefined }))
    this.noteWrote(home, field)
  }

  /** Where `thing` is kept:  `undefined` for one in no place. */
  placeOf(thing: SpellObject): { placeName: string; collection: string } | undefined {
    const home = HOMES.get(thing)
    return home && { placeName: home.placeName, collection: home.collection }
  }

  /** The draft `copy` is the copy of:  `undefined` for anything else. */
  draftWithCopy(copy: SpellObject): PlaceDraft | undefined {
    return DRAFT_COPIES.get(copy)
  }

  /**
   * The thing for `row`, made or changed in place, and kept where the read says:  for a row told after a read.
   * - throws `TypeError` if nothing is known by the name `type`
   */
  thingForRow({ placeName, collection, type, row, idField }: PlaceRowOf): SpellObject {
    const thing = untrackCells(() => whileReading(() => this.thingFrom(type, row, idField)))
    const id = idOfRow(row, idField)
    if (id !== undefined) this.remember(thing, { things: this, placeName, collection, type, id })
    return thing
  }

  /**
   * Run `run`, what it changes in each place one group, held until it ends:  `all or nothing:`.
   * - It throws, and they're dropped, and put back.
   * - throws what `run` threw
   */
  async inOneGroup(run: () => unknown): Promise<void> {
    const outer = this.groupsTogether
    const groups = (this.groupsTogether = new Map<PendingChanges, PendingGroup & { number: number }>())
    try {
      await run()
    } catch (error) {
      for (const group of groups.values()) group.cancel()
      throw error
    } finally {
      this.groupsTogether = outer
    }
    for (const group of groups.values()) group.end()
  }

  /** The groups an `all or nothing:` holds its changes in, for each place, while one runs. */
  private groupsTogether: Map<PendingChanges, PendingGroup & { number: number }> | undefined

  /** A value as a row holds it:  what's kept of a draft. */
  rowValue(value: unknown): unknown {
    return this.writer.jsonFor(value)
  }

  /**
   * What a named operation sends of `value`:  a thing as its whole row, with its id, as a server can't look up our references.
   * - Anything else as a row holds it.
   */
  rowSent(value: unknown): unknown {
    if (!(value instanceof Thing)) return this.rowValue(value)
    return { id: value.id, ...this.writer.rowFor(value) }
  }

  /** `json`, as `Loader` reads it:  what's kept of a draft, brought back. */
  fieldValue(thing: SpellObject, key: string, json: unknown): unknown {
    return dateIfDeclared(thing.constructor as never, key, this.read(json))
  }

  ////////////////
  // ## The side bar:  where a value came from, and changing it
  ////////////////

  /**
   * What's known of `property` of `thing`, for `Places.originOf()`:  `undefined` if it's nothing of this one's.
   * - A getter with no setter and no stored value is worked out:  it's read, to see what it read.
   *   - Reading it changes nothing (`whileReading()`), and it may make what it needs, as any read does.
   *   - It sees what this one reading read:  so nothing, for a list with nothing in it.
   * - A list held by a thing in a place answers as that thing's field.
   * - NEVER throws:  a worked-out value that throws is logged.
   */
  describeValue(thing: object, property: string): SavedValue | WorkedOutValue | undefined {
    if (!(thing instanceof Thing || thing instanceof List)) return undefined
    const location = schemaOf(thing.constructor).locationOf(property)
    const declaredAt = location?.declaredAt
    const declared = declaredAt && { declaredAt }
    if (isWorkedOut(thing, property)) {
      try {
        const read = () => whileReading(() => (thing as unknown as Record<string, unknown>)[property])
        const workedOutFrom = sourcesReadBy(read)
        // what one run read, and what the compiler found:  a branch not taken, a list with nothing in it, a memo
        const readsFrom = new Set([...this.placesHolding(workedOutFrom), ...(location?.readsFrom ?? [])])
        return { workedOutFrom, readsFrom: [...readsFrom], ...declared }
      } catch (error) {
        console.error(`PlaceThings.describeValue():  reading \`${property}\` threw, so it has no origin`, error)
        return undefined
      }
    }
    const held = LIST_FIELDS.get(thing)
    const home = HOMES.get(held?.owner ?? thing)
    if (home?.things !== this) return undefined
    const { placeName, collection, type, id } = home
    const field = held && property === "items" ? held.field : property === "items" ? ITEMS_KEY : property
    return { placeName, collection, type, id, field, isIdentity: field === "id", ...declared }
  }

  /** The name of the place of each thing whose cells are among `sources`. */
  private placesHolding(sources: ReadonlySet<unknown>): string[] {
    const names = new Set<string>()
    for (const thing of this.loaded.values()) {
      const placeName = HOMES.get(thing)?.placeName
      if (placeName !== undefined && cellsOf(thing).some((cell) => sources.has(cell))) names.add(placeName)
    }
    return [...names]
  }

  /**
   * One person's change to one property:  what a side bar's field does.
   * - `set()`:  a plain set, the program's own path, shown at once and held.  Call it for every keystroke.
   * - `commit()`, on Enter or leaving the field:  one undo step, and the change goes out (J4).
   * - `cancel()`:  put back, and nothing went.
   * - `history`:  where the step goes;  the running program's by default.
   *   A plain set outside an action joins no step by itself, so this records one wherever you say.
   * - Undoing it is the same write back:  unsent, the change is dropped;  sent, a reversing one goes out.
   * - throws `TypeError` for a value that's worked out:  it has nothing to set
   */
  startEdit(thing: SpellObject, property: string, { title, history }: PlaceEditOptions): PlaceEdit {
    if (isWorkedOut(thing, property)) {
      throw new TypeError(`PlaceThings.startEdit():  \`${property}\` is worked out;  change what it reads instead`)
    }
    return new PlaceEdit({ things: this, thing, property, title, history: history ?? core.RUNTIME?.history })
  }

  /** The group a change made inside an edit is held in. */
  editing(group: number, write: () => void): void {
    const outer = this.savingInGroup
    this.savingInGroup = group
    try {
      write()
    } finally {
      this.savingInGroup = outer
    }
  }

  /** The changes `thing` writes to, if it's kept in a place. */
  pendingOf(thing: SpellObject): PendingChanges | undefined {
    const home = HOMES.get(thing)
    return home && this.places?.pendingFor(home.placeName)
  }

  /** The place behind what `thing` is kept in, now. */
  placeBehind(thing: SpellObject): object | undefined {
    const home = HOMES.get(thing)
    return home && this.places?.placeFor(home.placeName)
  }

  /**
   * Another place went behind `placeName`, or left:  nothing done there may reach what's behind it now.
   * - The running program's undo steps go, as when saved state is loaded:  undoing one would write to the other place.
   *   (`PlaceEdit` guards steps in anyone else's history itself.)
   * - A field written while it was in, and that the next place's row won't name, goes back to nothing.
   */
  private swapped(placeName: string): void {
    core.RUNTIME?.history.clear()
    whileReading(() => {
      for (const [ref, fields] of this.writtenInstead) {
        const thing = this.loaded.get(ref)
        if (HOMES.get(thing as object)?.placeName !== placeName) continue
        for (const field of fields) writeInto(thing!, field, valueOf(thing!, field) instanceof List ? [] : undefined)
        this.writtenInstead.delete(ref)
      }
    })
  }

  /** The fields written while another place was in for the real one, by thing. */
  private readonly writtenInstead = new Map<string, Set<string>>()

  /** The list of places, the program's.  - throws `TypeError` with none */
  placesOrDie(method: string): Places {
    if (!this.places) throw new TypeError(`PlaceThings.${method}():  it was made with no \`places\`, so it only reads`)
    return this.places
  }

  /** Note where `thing` is kept, and its lists. */
  private remember(thing: SpellObject, home: ThingHome): void {
    HOMES.set(thing, home)
    for (const key of keysOf(thing)) {
      const value = (thing as unknown as Record<string, unknown>)[key]
      if (value instanceof List) rememberListField(value, thing, key)
    }
    // a list property is made the first time it's read, which may be after this:  it's made now, so a change to it is heard
    whileReading(() => {
      for (let schema = schemaOf(thing.constructor) as Schema | undefined; schema; schema = schema.parent) {
        for (const [key, info] of schema.declared) {
          if (!info.itemType) continue
          const value = (thing as unknown as Record<string, unknown>)[key]
          if (value instanceof List) rememberListField(value, thing, key)
        }
      }
    })
  }

  /**
   * `home`'s thing's `field` is being set from `was` to `value`:  a pending change -- see the file's docs.
   * - `PLACE_WRITES` calls it, for every write to a thing it made.
   */
  noteWrite(home: ThingHome, field: string, was: unknown, value: unknown): void {
    const { placeName, collection, type, id } = home
    const places = this.placesOrDie("noteWrite")
    this.noteKnownHeld(value)
    const pending = places.pendingFor(placeName)
    if (places.placeFor(placeName) !== places.declaredPlaceFor(placeName))
      this.noteWrittenInstead(`${type}#${id}`, field)
    const group = this.groupNumberFor(pending)
    const asJson = this.writer.jsonFor(value)
    const wasJson = this.writer.jsonFor(was)
    const thing = { collection, type, id, field, ...(group !== undefined && { group }) }
    this.writing(() => {
      if (Array.isArray(asJson) && Array.isArray(wasJson)) pending.changeList({ ...thing, items: asJson, was: wasJson })
      else pending.setField({ ...thing, value: asJson, was: wasJson })
    })
    this.noteWrote(home, field)
  }

  /** Each thing in `value`, a list's items, that's saved inside its owner is known by its id from now on. */
  private noteKnownHeld(value: unknown): void {
    if (!Array.isArray(value)) return
    for (const item of value) {
      if (isSavedWithOwner(item as object)) this.loaded.set(`${item.constructor.name}#${item.id}`, item as SpellObject)
    }
  }

  /** `field` of the thing `ref` was written while another place is in for its own. */
  private noteWrittenInstead(ref: string, field: string): void {
    let fields = this.writtenInstead.get(ref)
    if (!fields) this.writtenInstead.set(ref, (fields = new Set()))
    fields.add(field)
  }

  /** Run `write`:  what it tells `Places.onRows()` is this thing's own, so it comes back to nobody here. */
  private writing(write: () => void): void {
    const outer = this.isWriting
    this.isWriting = true
    try {
      write()
    } finally {
      this.isWriting = outer
    }
  }

  /**
   * The group a change made now joins:  the running action's, opened the first time it writes.  None:  no action runs.
   * - One a person started (`core.runAction()`) ends when it's finished, and is dropped if it's cancelled.
   * - javascript can't say whose write is whose, so what's written while an action waits joins it, as with undo.
   * - One declared (`declareAction()`) and only called ends with its undo step, on `UndoStack`'s transaction.
   */
  private groupNumberFor(pending: PendingChanges): number | undefined {
    if (this.savingInGroup !== undefined) return this.savingInGroup
    if (this.groupsTogether) {
      let group = this.groupsTogether.get(pending)
      if (!group) this.groupsTogether.set(pending, (group = pending.startGroup()))
      return group.number
    }
    const runtime = core.RUNTIME
    const running = runtime?.actions.current
    if (!running && !runtime?.history.isActing) return undefined
    const action = running?.signal ?? runtime!.history
    const open = this.openGroups.get(pending)
    if (open?.action === action) return open.group.number
    open?.group.end()
    const group = pending.startGroup()
    this.openGroups.set(pending, { action, group })
    const forget = () => {
      if (this.openGroups.get(pending)?.group === group) this.openGroups.delete(pending)
    }
    const end = () => {
      forget()
      group.end()
    }
    if (running) {
      running.signal.addEventListener("abort", () => (forget(), group.cancel()), { once: true })
      void running.finished.then(end)
    } else runtime!.history.afterAction(end)
    return group.number
  }

  /**
   * Rows changed under what's showing:  each thing we made from one is changed in place.
   * - Someone else's:  a thing we hadn't seen is made now, so whoever's listening hears of it, whichever reads it;  each is told.
   */
  private rowsChanged({
    placeName,
    collection,
    type,
    idField,
    rows,
    renamed = [],
    removed = [],
    isElsewhere = false
  }: PlaceRowsChange): void {
    if (this.isWriting || type === undefined) return
    whileReading(() => {
      for (const { from, to } of renamed) this.renameThing(type, from, to)
      for (const row of rows) {
        const id = idOfRow(row, idField)
        const known = id === undefined ? undefined : this.loaded.get(`${type}#${id}`)
        if (known) {
          const fields = this.changeInPlace(known, row)
          if (isElsewhere && fields.length) this.noteChanged(known, { fields, isElsewhere })
        } else if (isElsewhere && id !== undefined && this.classNamed(type)) {
          const thing = this.thingForRow({ placeName, collection, type, row, idField })
          this.noteChanged(thing, { kind: "added", isElsewhere })
        }
      }
    })
    if (!isElsewhere) return
    for (const id of removed) {
      const thing = this.loaded.get(`${type}#${id}`)
      if (thing) this.noteChanged(thing, { kind: "removed", isElsewhere })
    }
  }

  ////////////////
  // ## Telling the program what changed
  ////////////////

  /**
   * SIDE EFFECT:  the program hears of `thing`'s change soon after:  together with any more in this moment, so one person's
   * step is one event.  See the file's docs.
   */
  noteChanged(
    thing: SpellObject,
    {
      kind = "changed",
      fields = [],
      isElsewhere = false
    }: {
      kind?: SavedChangeKind
      fields?: readonly string[]
      isElsewhere?: boolean
    }
  ): void {
    const noted = this.changesToTell.get(thing)
    if (noted) {
      fields.forEach((field) => noted.fields.add(field))
      noted.isElsewhere ||= isElsewhere
      if (kind !== "changed") noted.kind = kind
      return
    }
    if (!this.changesToTell.size) queueMicrotask(() => this.tellChanges())
    this.changesToTell.set(thing, { kind, fields: new Set(fields), isElsewhere })
  }

  /** This page wrote `field` of the thing kept at `home`. */
  private noteWrote({ type, id }: ThingHome, field: string): void {
    const thing = this.loaded.get(`${type}#${id}`)
    if (thing) this.noteChanged(thing, { fields: [field] })
  }

  /** What's changed and not yet told. */
  private readonly changesToTell = new Map<
    SpellObject,
    { kind: SavedChangeKind; fields: Set<string>; isElsewhere: boolean }
  >()

  /** Tell the program:  see the file's docs.  NEVER throws:  a handler that fails is said by `core.send()`. */
  private tellChanges(): void {
    const changes = [...this.changesToTell]
    this.changesToTell.clear()
    const { send } = core as Partial<Pick<typeof core, "send">>
    if (!send) return
    for (const [thing, { kind, fields, isElsewhere }] of changes) {
      const params = { thing, kind, fields: [...fields] }
      for (const Class of savedClassesOf(thing)) {
        const named = { ...params, [lowerFirst(Class.name)]: thing }
        void send(thing, savedChangeEvent(Class.name), named).catch(ignoredCancel)
      }
      if (!isElsewhere) continue
      void send(thing, SOMEONE_ELSE_EVENT, params)
        .then(({ handled }) => {
          if (!handled && this.drafts.get(thing)?.isStillGood) this.changedUnderDraft(thing)
        })
        .catch(ignoredCancel)
    }
  }

  /** Someone else changed what a draft is a copy of, and the program says nothing of it:  the plain notice -- Show me. */
  private changedUnderDraft(thing: SpellObject): void {
    const home = HOMES.get(thing)
    const message = core.message("write-changed-under-draft", {
      thing: `${home?.type ?? thing.constructor.name} ${home?.id ?? thing.id}`
    })
    const actions = [{ text: core.message("write-show-me"), click: () => this.showMe(thing) }]
    void core.notify(message, { class: "warning", actions })
  }

  /** A place named the thing we knew as `from`:  it goes by `to` now. */
  private renameThing(type: string, from: string, to: string): void {
    const thing = this.loaded.get(`${type}#${from}`)
    if (!thing) return
    this.loaded.delete(`${type}#${from}`)
    this.loaded.set(`${type}#${to}`, thing)
    thing.id = to
    const home = HOMES.get(thing)
    if (home) home.id = to
  }

  /** A place refused a write:  the notice, anywhere in the app -- Retry, or Show me. */
  private writeFailed({ changes, retry }: PlaceWriteFailure): void {
    const [{ type, id } = {}] = changes
    const thing = this.loaded.get(`${type}#${id}`)
    const actions = [
      { text: core.message("write-retry"), click: retry },
      ...(thing ? [{ text: core.message("write-show-me"), click: () => this.showMe(thing) }] : [])
    ]
    const message = core.message("write-refused", { thing: `${type ?? ""} ${id ?? ""}`.trim() })
    void core.notify(message, { class: "error", actions })
  }

  /** A merge kept this person's value over someone else's:  the notice, holding what was lost -- Use theirs, or Show me. */
  private merged({ type, id, field, theirs, useTheirs }: PlaceConflict): void {
    const thing = this.loaded.get(`${type}#${id}`)
    const actions = [
      { text: core.message("write-use-theirs"), click: useTheirs },
      ...(thing ? [{ text: core.message("write-show-me"), click: () => this.showMe(thing) }] : [])
    ]
    const lost = typeof theirs === "string" ? theirs : JSON.stringify(theirs)
    const message = core.message("write-merged", { thing: `${type ?? ""} ${id}`.trim(), field, theirs: lost })
    void core.notify(message, { class: "warning", actions })
  }

  /** Someone else's change replaced my long text:  the notice, holding it -- Use mine, or Show me. */
  private lostText({ type, id, field, mine, theirs: _theirs, useMine }: PlaceLostText): void {
    const thing = this.loaded.get(`${type}#${id}`)
    const actions = [
      { text: core.message("write-use-mine"), click: useMine },
      ...(thing ? [{ text: core.message("write-show-me"), click: () => this.showMe(thing) }] : [])
    ]
    const message = core.message("write-lost", {
      thing: `${type ?? ""} ${id}`.trim(),
      field,
      mine: `${mine as string}`
    })
    void core.notify(message, { class: "warning", actions })
  }

  /** Someone else deleted what I was editing:  the notice -- Restore. */
  private thingDeleted({ type, id, restore }: PlaceThingDeleted): void {
    const actions = [{ text: core.message("write-restore"), click: restore }]
    const message = core.message("write-deleted", { thing: `${type ?? ""} ${id}`.trim() })
    void core.notify(message, { class: "warning", actions })
  }

  /**
   * The thing for `row` of `type`:  made, or changed in place.
   * - A row with no id shares no identity:  a new thing each time, belonging to its list alone.
   * - throws `TypeError` if nothing is known by the name `type`
   */
  thingFrom(
    type: string,
    row: PlaceRow,
    idField: string | undefined,
    { tellsChanges = false }: { tellsChanges?: boolean } = {}
  ): SpellObject {
    if (!this.classNamed(type)) {
      throw new TypeError(`PlaceThings.thingFrom():  no class is named "${type}";  check the read's \`type\``)
    }
    const id = idOfRow(row, idField)
    // Never `refText()`:  a place's own ids may hold what a saved reference can't, e.g. an email address's `@`
    const ref = `${type}#${id ?? `row ${++this.rowsWithNoId}`}`
    const known = this.loaded.get(ref)
    if (known) {
      const fields = this.changeInPlace(known, row)
      if (tellsChanges && fields.length) this.noteChanged(known, { fields, isElsewhere: true })
      return known
    }
    const { [POSITIONS_KEY]: _positions, ...fields } = row
    const made = this.make({ ...fields, [TYPE_KEY]: type, ...(id !== undefined && { id }) }, ref) as SpellObject
    if (id === undefined) this.loaded.delete(ref)
    return made
  }

  /** How many rows with no id it's seen:  a name for each, while it's made. */
  private rowsWithNoId = 0

  /**
   * `json`, with each thing saved inside its owner that's already known here changed in place, and said by reference:
   * so a row read again leaves the things it holds the same things.
   */
  private withKnownHeld(json: unknown): unknown {
    if (!Array.isArray(json)) return json
    return json.map((item) => {
      const { [TYPE_KEY]: type, id } = (item ?? {}) as { [TYPE_KEY]?: string; id?: string }
      const ref = `${type}#${id}`
      const known = type && this.loaded.get(ref)
      if (!known) return item as unknown
      this.changeInPlace(known, item as PlaceRow)
      return { [REF_KEY]: ref }
    })
  }

  /**
   * Set each field `row` has on `thing`, read back as an entry's are;  what's the same changes nothing.
   * - Returns the fields that really changed.
   */
  private changeInPlace(thing: SpellObject, row: PlaceRow): string[] {
    const fields = thing as unknown as Record<string, unknown>
    const changed: string[] = []
    for (const [key, json] of Object.entries(row)) {
      if (key === "id" || key.startsWith("$")) continue
      const current = fields[key]
      if (!this.holdsTheSame(current, json)) changed.push(key)
      const value = dateIfDeclared(thing.constructor as never, key, this.read(this.withKnownHeld(json)))
      if (current instanceof List && Array.isArray(value)) {
        if (!isSameItems(current.items, value)) current.items = value
      } else if (!isSameDate(current, value)) {
        setField(thing, key, value, true)
      }
    }
    const items = row[ITEMS_KEY]
    if (thing instanceof List && Array.isArray(items)) {
      const value = this.read(items) as unknown[]
      if (!isSameItems(thing.items, value)) {
        changed.push(ITEMS_KEY)
        thing.items = value
      }
    }
    return changed
  }

  /** Does `current`, a field's value, say the same as `json`, what a row holds for it? */
  private holdsTheSame(current: unknown, json: unknown): boolean {
    if (current === json || (current == null && json == null)) return true
    return JSON.stringify(this.writer.jsonFor(current)) === JSON.stringify(json)
  }
}

/****************
 * ### `PlaceEdit`
 * One person's change to one property, from a side bar:  see `PlaceThings.startEdit()`.
 * - Its changes are a group, so nothing leaves and nothing's kept on the device until `commit()`.
 * - The undo step is recorded at `commit()`:  until then there's nothing to undo but `cancel()`.
 * - A thing in no place works the same, with nothing to send.
 * - A step undone after another place went behind the name does nothing:
 *   so a change made to a sample can't be undone into the real place.
 ****************/
export class PlaceEdit {
  /** What the property held before:  what `cancel()` and undo put back. */
  private readonly was: unknown
  /** Holds what's written until it's committed:  none, for a thing in no place. */
  private readonly group: (PendingGroup & { number: number }) | undefined
  /** Has it been set yet? */
  private isChanged = false
  /** Committed or cancelled:  it does nothing more. */
  private isOver = false

  constructor(private readonly props: PlaceEditProps) {
    const { things, thing, property } = props
    this.was = heldValue(valueOf(thing, property))
    this.group = things.pendingOf(thing)?.startGroup()
  }

  /** The property is now `value`:  shown at once, held until `commit()`. */
  set(value: unknown): void {
    if (this.isOver) return
    this.isChanged = true
    this.write(value)
  }

  /** It's done:  one undo step, and the change goes out.  Nothing was set:  no step, and nothing goes. */
  commit(): void {
    if (this.isOver) return
    this.isOver = true
    this.group?.end()
    if (!this.isChanged) return
    const { history, title, thing, property, things } = this.props
    const after = heldValue(valueOf(thing, property))
    if (isSameHeld(after, this.was)) return
    const placeThen = things.placeBehind(thing)
    const putIf = (value: unknown) => {
      if (things.placeBehind(thing) === placeThen) writeInto(thing, property, value, "write")
    }
    const record: UndoRecord = { undo: () => putIf(this.was), redo: () => putIf(after) }
    history?.record(record, { title })
  }

  /** Never mind:  it's put back, and nothing went.  No step. */
  cancel(): void {
    if (this.isOver) return
    this.isOver = true
    this.group?.cancel()
    if (this.isChanged) whileReading(() => writeInto(this.props.thing, this.props.property, this.was))
  }

  /** Write `value`, in this edit's group. */
  private write(value: unknown): void {
    const { things, thing, property } = this.props
    const write = () => writeInto(thing, property, value, "write")
    if (this.group) things.editing(this.group.number, write)
    else write()
  }
}

/** What `PlaceThings.startEdit()` is told. */
export type PlaceEditOptions = {
  /** What the step is called in the Edit menu, in the person's language:  `Change Title`. */
  title: string
  /** Where the step goes, e.g. the editor's own history.  Left out:  the running program's. */
  history?: UndoStack
}

/** What `PlaceThings.thingForRow()` is told. */
type PlaceRowOf = {
  /** The place's name. */
  placeName: string
  /** Its collection. */
  collection: string
  /** Its class's name. */
  type: string
  /** The row. */
  row: PlaceRow
  /** The field holding its id. */
  idField: string
}

/** Constructor props of a `PlaceEdit`. */
type PlaceEditProps = Omit<PlaceEditOptions, "history"> & {
  /** Who made it. */
  things: PlaceThings
  /** The thing. */
  thing: SpellObject
  /** The property. */
  property: string
  /** Where the step goes:  none, with no history and no program running. */
  history: UndoStack | undefined
}

/** The event `- when someone else changes it:` is the handler of. */
const SOMEONE_ELSE_EVENT = "someone-else-change"

/**
 * The event `when a recipe changes:` listens for, by a type's class name:  `a-recipe-change`.
 * - The compiler's `Changes` rule writes the same:  NOT `recipe-change`, a property called `recipe`'s.
 */
function savedChangeEvent(className: string): string {
  return `a-${className.replace(/(\p{Ll}|\d)(\p{Lu})/gu, "$1-$2").toLowerCase()}-change`
}

/** What a class's thing goes by in its `when a recipe changes:` handler:  `recipe`, `recipeNote`. */
function lowerFirst(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1)
}

/** `thing`'s class, and each above it still saved in a place:  `when a recipe changes:` hears a soup too. */
function savedClassesOf(thing: SpellObject): Function[] {
  const classes: Function[] = [thing.constructor]
  for (
    let Class = Object.getPrototypeOf(thing.constructor) as Function & { savedIn?: unknown };
    Class?.savedIn;
    Class = Object.getPrototypeOf(Class) as Function & { savedIn?: unknown }
  ) {
    classes.push(Class)
  }
  return classes
}

/** A handler stopped by canceling its action:  nothing more to say. */
function ignoredCancel(error: unknown): void {
  if (!(error instanceof CanceledError)) console.error("PlaceThings:  couldn't tell the program what changed", error)
}

/** What `value` holds now, that a later change won't change:  a list's items, not the list. */
function heldValue(value: unknown): unknown {
  return value instanceof List ? [...value.items] : value
}

/** Are these two the same, or the same list of the same things? */
function isSameHeld(one: unknown, other: unknown): boolean {
  if (Array.isArray(one) && Array.isArray(other)) return isSameItems(one, other)
  return one === other || isSameDate(one, other)
}

/** Is `property` worked out:  read with a getter, with no setter, and declared as nothing to store? */
function isWorkedOut(thing: object, property: string): boolean {
  const info = schemaOf(thing.constructor).info(property)
  if (info) return false
  for (
    let proto = Object.getPrototypeOf(thing) as object | null;
    proto;
    proto = Object.getPrototypeOf(proto) as object
  ) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, property)
    if (descriptor) return !!descriptor.get && !descriptor.set
  }
  return false
}

/****************
 * ### `PlaceDraft`
 * A thing's changes, held apart until they're saved, for an Edit screen with a Cancel button (epic `data`, Q9).
 * - `thing` is a copy:  draw a form on it.  What's written to it goes nowhere, and the real thing doesn't change.
 * - `save()`:  each field changed is written to the real thing, one group, so they go out together.
 * - `cancel()`:  the copy is forgotten, and there's nothing to take back.
 * - What it holds is kept on this device, so a draft form comes back on the next visit.
 * - NOT `PendingChanges`:  what's pending shows at once on the real thing, which is what a draft must not do.
 ****************/
export class PlaceDraft {
  /** The copy to change. */
  readonly thing: SpellObject
  /** Each field changed so far, as a row holds it. */
  private readonly changed: PlaceRow = {}
  /** The place behind its name when it began:  it's for that place, and no other. */
  private readonly placeAtStart: object | undefined
  /** What's kept on this device. */
  private readonly copy: BrowserCopy

  constructor(
    private readonly original: SpellObject,
    private readonly home: ThingHome,
    private readonly onEnd: () => void
  ) {
    const { placeName, type, id, things } = home
    const places = things.placesOrDie("draftOf")
    const key = places.keyOnDevice(DRAFT_STORE, `${placeName}/${type}#${id}`)
    const { storage } = places
    this.placeAtStart = places.placeFor(placeName)
    const isOwnPlace = this.placeAtStart === places.declaredPlaceFor(placeName)
    this.copy = new BrowserCopy({ ...(isOwnPlace && key !== undefined && { key }), ...(storage && { storage }) })
    this.thing = core.newScratch(original.constructor as new () => unknown) as SpellObject
    DRAFT_COPIES.set(this.thing, this)
    whileReading(() => {
      this.copyFrom(original)
      for (const [field, json] of Object.entries(this.copy.kept<PlaceRow>() ?? {})) {
        this.changed[field] = json
        writeInto(this.thing, field, things.fieldValue(this.thing, field, json))
      }
    })
  }

  /** Has anything been changed? */
  get hasChanges(): boolean {
    return Object.keys(this.changed).length > 0
  }

  /** `field` of the copy is being set to `value`:  kept on this device.  `PLACE_WRITES` calls it. */
  noteField(field: string, value: unknown): void {
    this.changed[field] = this.home.things.rowValue(value)
    this.copy.keep(this.changed)
  }

  /** Is the place it began with still behind its name?  A draft of a sample's thing is no draft of the real place's. */
  get isStillGood(): boolean {
    return this.home.things.placesOrDie("draftOf").placeFor(this.home.placeName) === this.placeAtStart
  }

  /**
   * Write each field changed to the real thing:  one group, shown at once.  Nothing changed:  nothing is sent.
   * - throws `TypeError`, and forgets it, if another place went behind its name since it began (`isStillGood`)
   */
  save(): void {
    const { things } = this.home
    if (!this.isStillGood) {
      this.finish()
      throw new TypeError(
        "PlaceDraft.save():  another place went behind this draft's name since it began;  nothing saved"
      )
    }
    things.saveDraftFields(this.home, () => {
      for (const field of Object.keys(this.changed))
        writeInto(this.original, field, valueOf(this.thing, field), "write")
    })
    this.finish()
  }

  /** Forget the changes:  nothing had left. */
  cancel(): void {
    this.finish()
  }

  /** Done with this draft. */
  private finish(): void {
    this.copy.drop()
    this.onEnd()
  }

  /** Every field of `from` into the copy:  each plain list its own, so changing one leaves `from`'s alone. */
  private copyFrom(from: SpellObject): void {
    const fields = new Set([...keysOf(from), ...Object.keys(fieldsOf(from))])
    for (const field of fields) {
      const value = valueOf(from, field)
      if (value instanceof List && value.constructor === List) {
        const held = valueOf(this.thing, field)
        const list = held instanceof List ? held : (core.newScratch(List) as List)
        list.items = [...value.items]
        if (list !== held) setField(this.thing, field, list, true)
        rememberListField(list, this.thing, field)
      } else writeInto(this.thing, field, value)
    }
    if (from instanceof List && this.thing instanceof List) {
      this.thing.items = [...from.items]
      LIST_FIELDS.set(this.thing, { owner: this.thing, field: ITEMS_KEY })
    }
  }
}

/** `thing`'s `field`:  its items, for `ITEMS_KEY`. */
function valueOf(thing: SpellObject, field: string): unknown {
  if (field === ITEMS_KEY) return (thing as List).items
  return (thing as unknown as Record<string, unknown>)[field]
}

/**
 * Set `thing`'s `field` to `value`:  a list's items are set, not the list.
 * - `"write"`:  it's a real write, so it's heard:  through the thing's own `setProp()`, as `state.ts`'s `setField()` isn't.
 */
function writeInto(thing: SpellObject, field: string, value: unknown, kind?: "write"): void {
  const current = valueOf(thing, field)
  const items = value instanceof List ? value.items : value
  if (field === ITEMS_KEY || (current instanceof List && Array.isArray(items))) {
    const list = (field === ITEMS_KEY ? thing : current) as List
    if (list !== value) list.items = [...(items as unknown[])]
  } else if (kind === "write") {
    const fields = thing as unknown as Record<string, unknown>
    if (hasSetter(Object.getPrototypeOf(thing) as object, field)) fields[field] = value
    else (thing as unknown as { setProp(field: string, value: unknown): void }).setProp(field, value)
  } else setField(thing, field, value, true)
}

/** The entry for `ref`, from the row the cache holds for it:  what a reference in a row finds. */
function entryOfCachedRow(cache: PlaceCache, ref: string): Record<string, unknown> | undefined {
  const { type, id } = parseRef(ref)
  const row = cache.rowFor(type, id)
  return row && { ...row, [TYPE_KEY]: type, id }
}

/** Do these two lists hold the same things, in the same order? */
function isSameItems(one: readonly unknown[], other: readonly unknown[]): boolean {
  return one.length === other.length && one.every((item, index) => item === other[index])
}

/** Are these two the same moment?  A row read again makes a new `Date` every time. */
function isSameDate(one: unknown, other: unknown): boolean {
  return one instanceof Date && other instanceof Date && one.getTime() === other.getTime()
}
