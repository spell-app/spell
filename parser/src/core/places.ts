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
 */
import { ITEMS_KEY, keysOf, TYPE_KEY, untrackCells } from "spell/util"
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
import type { Places } from "spell/util/places/Places"
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
    home?.things.noteWrite(home, property, was, value)
  },
  items(list, before, after) {
    const held = LIST_FIELDS.get(list)
    if (held) {
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
  if (list.constructor === List) LIST_FIELDS.set(list, { owner, field })
}

/**
 * A value as a row holds it:  a date as text, a list as an array, a thing as a reference to it.
 * - On `Saver`'s writing, which is the same but for a thing it would write whole.
 */
class RowWriter extends Saver {
  /** `value` as a row holds it. */
  jsonFor(value: unknown): unknown {
    return this.write(value, (thing) => ({ [REF_KEY]: `${thing.constructor.name}#${thing.id}` }))
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
export class PlaceThings extends Loader {
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
    }
  }

  /**
   * The thing for each row of `result`, in order:  each made, or changed in place -- see the file's docs.
   * - Follows `result`'s rows and nothing else, so a computation re-runs when they change.
   * - throws `TypeError` if `result` has no `type`, or nothing is known by its type's name
   */
  thingsFrom(result: PlaceResult): SpellObject[] {
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
          const thing = this.thingFrom(type, row, idOf)
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

  /** A value as a row holds it:  what's kept of a draft. */
  rowValue(value: unknown): unknown {
    return this.writer.jsonFor(value)
  }

  /** `json`, as `Loader` reads it:  what's kept of a draft, brought back. */
  fieldValue(thing: SpellObject, key: string, json: unknown): unknown {
    return dateIfDeclared(thing.constructor as never, key, this.read(json))
  }

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
  }

  /**
   * `home`'s thing's `field` is being set from `was` to `value`:  a pending change -- see the file's docs.
   * - `PLACE_WRITES` calls it, for every write to a thing it made.
   */
  noteWrite(home: ThingHome, field: string, was: unknown, value: unknown): void {
    const { placeName, collection, type, id } = home
    const pending = this.placesOrDie("noteWrite").pendingFor(placeName)
    const group = this.groupNumberFor(pending)
    const asJson = this.writer.jsonFor(value)
    const wasJson = this.writer.jsonFor(was)
    const thing = { collection, type, id, field, ...(group !== undefined && { group }) }
    this.writing(() => {
      if (Array.isArray(asJson) && Array.isArray(wasJson)) pending.changeList({ ...thing, items: asJson, was: wasJson })
      else pending.setField({ ...thing, value: asJson, was: wasJson })
    })
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

  /** Rows changed under what's showing:  each thing we made from one is changed in place. */
  private rowsChanged({ type, idField, rows, renamed = [] }: PlaceRowsChange): void {
    if (this.isWriting || type === undefined) return
    whileReading(() => {
      for (const { from, to } of renamed) this.renameThing(type, from, to)
      for (const row of rows) {
        const id = idOfRow(row, idField)
        const known = id === undefined ? undefined : this.loaded.get(`${type}#${id}`)
        if (known) this.changeInPlace(known, row)
      }
    })
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
  thingFrom(type: string, row: PlaceRow, idField: string | undefined): SpellObject {
    if (!this.classNamed(type)) {
      throw new TypeError(`PlaceThings.thingFrom():  no class is named "${type}";  check the read's \`type\``)
    }
    const id = idOfRow(row, idField)
    // Never `refText()`:  a place's own ids may hold what a saved reference can't, e.g. an email address's `@`
    const ref = `${type}#${id ?? `row ${++this.rowsWithNoId}`}`
    const known = this.loaded.get(ref)
    if (known) {
      this.changeInPlace(known, row)
      return known
    }
    const { [POSITIONS_KEY]: _positions, ...fields } = row
    const made = this.make({ ...fields, [TYPE_KEY]: type, ...(id !== undefined && { id }) }, ref) as SpellObject
    if (id === undefined) this.loaded.delete(ref)
    return made
  }

  /** How many rows with no id it's seen:  a name for each, while it's made. */
  private rowsWithNoId = 0

  /** Set each field `row` has on `thing`, read back as an entry's are;  what's the same changes nothing. */
  private changeInPlace(thing: SpellObject, row: PlaceRow): void {
    const fields = thing as unknown as Record<string, unknown>
    for (const [key, json] of Object.entries(row)) {
      if (key === "id" || key.startsWith("$")) continue
      const value = dateIfDeclared(thing.constructor as never, key, this.read(json))
      const current = fields[key]
      if (current instanceof List && Array.isArray(value)) {
        if (!isSameItems(current.items, value)) current.items = value
      } else if (!isSameDate(current, value)) {
        setField(thing, key, value, true)
      }
    }
    const items = row[ITEMS_KEY]
    if (thing instanceof List && Array.isArray(items)) {
      const value = this.read(items) as unknown[]
      if (!isSameItems(thing.items, value)) thing.items = value
    }
  }
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
    this.copy = new BrowserCopy({ ...(key !== undefined && { key }), ...(storage && { storage }) })
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

  /** Write each field changed to the real thing:  one group, shown at once.  Nothing changed:  nothing is sent. */
  save(): void {
    const { things } = this.home
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
