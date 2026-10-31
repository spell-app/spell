/**
 * What compiled spell calls for a type that's saved in a place (epic `data` P11):  the words reach `places.ts` here.
 *
 * ```js
 * export const familyCookbook = core.place(new FamilyCookbook(), { name: "family cookbook", kind: "web service", at: "..." })
 * Recipe.savedIn = { place: "family cookbook", collection: "recipes" }
 * get matches() { return core.waitedValue(this, "matches", async () => core.filter(await core.savedThings(Recipe), ...)) }
 * ```
 *
 * - Each run of a program has ONE `ProgramPlaces`, made when it first names a place:  no place named, nothing here runs.
 * - `spell/util/places` is loaded the first time a program names one, by a dynamic `import()`:
 *   that folder knows nothing of `core`, so the chunk is one for every runtime copy on a page, and a program with no
 *   place never loads it.  `places.ts`, which does know `core`, is in the runtime itself.
 * - What drives the things is the read's own `changes` cell:  a memo reading `core.savedThings()` follows it, so a new
 *   answer, a write or a heal runs the memo again.  `PlaceThings.thingsFrom()` runs inside that, never by itself (J).
 * - What the compiler gathered (epic `data` P12), and what it couldn't see:
 *   - `firstReads`, on the place's line:  everything a first draw reads from it, asked for together when it's first read.
 *   - `select`, on a type's `savedIn`:  the fields anything reads, for a place that can leave the rest out.
 *   - A field it left out and something read anyway (`PropInfo.whenUnset`):  the place is asked once more, for all of them.
 *     Whoever read it follows the field, so it appears.
 * - `leave()`:  each computation reading one holds it until it's disposed (`onCleanup()`):  a draw leaving lets it go,
 *   and the last one letting go aborts its request.  A read from an action holds it only until its answer.
 * - Who's here (epic `data` P13):  `core.currentPerson()` and `core.peopleHere()`, from the program's first place that has people:
 *   plain data, one object per page, so `the person is me` means what it says.
 *   With no such place there's only you, and the compiler says so (`PLACE_KIND_ABILITIES`).
 * - Loads Solid, as `waiting.ts` does:  NEVER imported by `core/model`.
 * - Part of `core`:  imported by `spell/parser/core`'s barrel for its side effect.
 */
import h from "@solidjs/h"
import { createComponent } from "@solidjs/web"
import { Errored, For, Loading, createDeferred, createMemo, getOwner, onCleanup } from "solid-js"

import { pollWhileVisible } from "spell/util/polling"

import { Cell, isOnlyShowing, schemaOf, untrackCells } from "spell/util/reactive"
import type * as PlacesFolder from "spell/util/places"
import type { Places } from "spell/util/places/Places"
import type { PlaceResult } from "spell/util/places/PlaceResult"
import { personOnThisPage } from "spell/util/places/people"
import type { ListQuery, PersonHere, Place as PlaceBehind, PlaceRow } from "spell/util/places/places.types"
import type { PlaceRowsChange } from "spell/util/places/PendingChanges"

import { compareSortKeys } from "./collection-other"
import { core, isWhileReading, whileReading } from "./core"
import { defineCoreModule } from "./core.types"
import type { Drawing } from "./drawing"
import { knowCollection, placeBehind, type PlaceDetails } from "./placeKinds"
import { PlaceThings, heldBy } from "./places"
import { standInFor } from "./waiting"
// Import directly to avoid circular import
import { List } from "./classes/List"
import { Place } from "./classes/Place"
import type { Thing } from "./classes/Thing"

/** A class that says where it's saved, as compiled spell writes it. */
type SavedClass = (new () => Thing) & {
  /** Which place, and under what name there. */
  savedIn?: SavedIn
  /** It's saved inside its owner's row:  `an ingredient belongs to one recipe`. */
  savedWith?: { Owner: SavedClass; field: string }
}

/** What `- it is saved in the family cookbook` compiles to. */
export type SavedIn = {
  /** The place's name, as its line writes it. */
  place: string
  /** The collection its things are in. */
  collection: string
  /** The fields anything reads, as the compiler found them:  a place that can leave the rest out does.  Left out:  every field. */
  select?: readonly string[]
}

/** What a rider says to draw:  see `core.drawRead()`. */
export type ReadRiders = {
  /** `while waiting:`:  what shows until the first answer. */
  waiting?: () => Drawing
  /** `if there are none:`:  what shows when there's an answer, and nothing in it. */
  none?: () => Drawing
  /** `if that fails:`:  what shows when it can't be read. */
  failed?: () => Drawing
}

/** A row's id, always asked for:  it's what makes it one row. */
const ID_FIELD = "id"

/** The kinds whose mapping says where a collection is, while it keeps its own name for the engine. */
const KEEP_THEIR_OWN_NAME = new Set(["web service", "graph service"])

/** The kind of place that knows who's here, among those spell knows by itself. */
const LIVE_ROOM = "live room"

/** How long a read asked for ahead waits for the draw that wants it, once it has its answer, in msec. */
const FIRST_READ_WAITS = 5_000

/** What a function written `async` says it is. */
const ASYNC_FUNCTION = "AsyncFunction"

/** Each run's places:  a new run has its own. */
const PROGRAMS = new WeakMap<object, ProgramPlaces>()

/** The places of the program running now. */
function programPlaces(): ProgramPlaces {
  const runtime = core.RUNTIME as object
  let program = PROGRAMS.get(runtime)
  if (!program) PROGRAMS.set(runtime, (program = new ProgramPlaces()))
  return program
}

/****************
 * ### `ProgramPlaces`
 * One run's places, its `PlaceThings`, and its reads.
 * - A place is made when it's first used, not when it's declared:  a sheet's numbers come from the class read from it.
 * - Every read of one type and query is ONE `SavedRead`.
 ****************/
class ProgramPlaces {
  /** What each place's lines say, by its name. */
  private readonly declared = new Map<string, { thing: Place; details: PlaceDetails }>()
  /** The folder, once it's loaded. */
  private folder: typeof PlacesFolder | undefined
  /** The list of places, once the folder's loaded. */
  private places: Places | undefined
  /** Makes rows into things. */
  private things: PlaceThings | undefined
  /** Every read going, by what it reads. */
  private readonly reads = new Map<string, SavedRead>()
  /** Loads the folder:  once. */
  private loading: Promise<void> | undefined

  /** The place called `details.name` is declared, as `thing`. */
  declare(thing: Place, details: PlaceDetails): void {
    this.declared.set(details.name, { thing, details })
    this.load().catch((ignored) => console.error("core.place():  couldn't load the places folder", ignored))
  }

  /** The folder and the list of places are here. */
  load(): Promise<void> {
    return (this.loading ??= this.loadFolder())
  }

  /** Load the folder, and make what stands on it. */
  private async loadFolder(): Promise<void> {
    const folder = await import("spell/util/places")
    this.folder = folder
    const keepPendingAs = (core.RUNTIME as { remembered?: { store: { name: string } } }).remembered?.store.name
    this.places = new folder.Places({ ...(keepPendingAs !== undefined && { keepPendingAs }) })
    this.things = new PlaceThings({ places: this.places, classNamed: (name) => this.classNamed(name) })
    this.places.onRows((change) => this.rowsChanged(change))
  }

  /** The class called `name`:  the program's own, by what's been read or saved, else what the program knows. */
  private classNamed(name: string): ReturnType<typeof core.things.classNamed> {
    return (this.classes.get(name) as never) ?? core.things.classNamed(name)
  }

  /** Every class read or saved, by its name. */
  private readonly classes = new Map<string, SavedClass>()

  /** Note `Class`, and the class saved inside it. */
  noteClass(Class: SavedClass): void {
    this.classes.set(Class.name, Class)
  }

  /**
   * The place `Class` is saved in, made if this is its first use.
   * - Call after `load()`.
   * - throws `TypeError` if the program declares no such place
   */
  placeFor(Class: SavedClass): { name: string; collection: string; behind: PlaceBehind } {
    this.noteClass(Class)
    const savedIn = savedInOf(Class)
    const declared = this.declared.get(savedIn.place)
    if (!declared) {
      throw new TypeError(
        `core.savedThings():  ${Class.name} is saved in "${savedIn.place}", and nothing goes by that name`
      )
    }
    const { place: name } = savedIn
    const details = declared.details
    // what a line under it calls the collection there:  a web service's and a graph service's is an address, read by their own mapping
    const mapped = details.collections?.[savedIn.collection]?.at
    const collection =
      mapped && !KEEP_THEIR_OWN_NAME.has(details.kind ?? "") ? mapped.replace(/^\//, "") : savedIn.collection
    const making = { details, folder: this.folder!, collection, Class, person: this.me }
    let behind = this.places!.placeFor(name)
    if (!behind) {
      const { thing } = declared
      behind = details.kind ? placeBehind(making) : (thing.makePlace(details, this.folder) as PlaceBehind)
      this.places!.add(name, behind)
    } else if (details.kind) knowCollection(behind, making)
    return { name, collection, behind }
  }

  /** Who's at this page:  the same object as long as the program runs. */
  readonly me: PersonHere = inProgramWords({
    ...personOnThisPage((number) => core.message("guest-person", { number })),
    page: ""
  })

  /** Everyone here, this page included:  ONE list, for as long as the program runs. */
  get peopleHere(): List {
    if (!this.peopleList) {
      this.peopleList = core.newScratch(List) as List
      this.showPeople([this.me])
      this.load()
        .then(() => this.followPeople())
        .catch((ignored) => console.error("core.peopleHere():  couldn't load the places folder", ignored))
    }
    return this.peopleList
  }

  /** See `peopleHere`. */
  private peopleList: List | undefined
  /** Each person here, by page:  so one that's still here stays the same object. */
  private readonly knownPeople = new Map<string, PersonHere>()

  /** Follow who's here in the first place that says, made if it's yet to be read. */
  private followPeople(): void {
    for (const [name, { thing, details }] of this.declared) {
      const makes = details.kind === LIVE_ROOM || !details.kind
      const made = this.places!.placeFor(name)
      if (!made && !makes) continue
      const behind =
        made ?? (details.kind ? this.roomFor(details) : (thing.makePlace(details, this.folder) as PlaceBehind))
      if (!made) this.places!.add(name, behind)
      if (!behind.onPeopleHere || !behind.currentPerson) continue
      const { page } = behind.currentPerson()
      this.me.page = page
      this.knownPeople.set(page, this.me)
      behind.onPeopleHere((people) => this.showPeople(people))
      this.showPeople(behind.peopleHere?.() ?? [this.me])
      return
    }
  }

  /** The room `details` says, with no class read from it yet:  it needs none. */
  private roomFor(details: PlaceDetails): PlaceBehind {
    return placeBehind({ details, folder: this.folder!, collection: "", Class: Object, person: this.me })
  }

  /** The list says `people` now, as a read does:  nobody's write. */
  private showPeople(people: readonly PersonHere[]): void {
    const items = people.map((person) => {
      const known =
        this.knownPeople.get(person.page) ?? (person.page === this.me.page ? this.me : inProgramWords(person))
      if (person.page) this.knownPeople.set(person.page, known)
      return known
    })
    untrackCells(() => {
      whileReading(() => {
        this.peopleList!.items = items
      })
    })
  }

  /** The read of `Class` for `query`:  one per type and query. */
  readOf(Class: SavedClass, query: ListQuery): SavedRead {
    const key = `${Class.name}\n${JSON.stringify(query)}`
    let read = this.reads.get(key)
    if (!read) this.reads.set(key, (read = new SavedRead(this, Class, query)))
    return read
  }

  /** What a first draw reads from the place `Class` is saved in, asked for now:  once per place. */
  askFirstReads(Class: SavedClass): void {
    const { place } = savedInOf(Class)
    if (this.askedFirst.has(place)) return
    this.askedFirst.add(place)
    try {
      for (const [ReadClass, query = {}] of this.declared.get(place)?.details.firstReads?.() ?? []) {
        this.readOf(ReadClass as SavedClass, query).askAhead()
      }
    } catch (ignored) {
      // only a head start:  each read still asks for itself
      console.error("core.savedThings():  couldn't ask for what a first draw reads", ignored)
    }
  }

  /** Each place whose first reads have gone. */
  private readonly askedFirst = new Set<string>()

  /** Make what `start()` needs of a read:  a result, read by nobody yet. */
  newResult(Class: SavedClass, query: ListQuery): PlaceResult {
    const { name, collection, behind } = this.placeFor(Class)
    const select = this.selectionFor(Class, behind)
    return this.places!.read({
      placeName: name,
      collection,
      type: Class.name,
      query: select ? { ...query, select } : query
    })
  }

  /** The fields to ask `behind` for, of `Class`:  only when it can leave the rest out, and nothing's been missed. */
  private selectionFor(Class: SavedClass, behind: PlaceBehind): readonly string[] | undefined {
    const { select } = savedInOf(Class)
    if (!select || this.askedWhole.has(Class)) return undefined
    const { select: canSelect, idOf = ID_FIELD } = behind.describe()
    if (!this.folder!.canDoAll(canSelect, select)) return undefined
    this.heedFieldsLeftOut(Class, select)
    // its id too:  it's what makes it one thing
    return select.includes(idOf) ? select : [...select, idOf]
  }

  /** The classes something read a left-out field of:  read whole from now on. */
  private readonly askedWhole = new Set<SavedClass>()
  /** The classes whose left-out fields are being listened for. */
  private readonly heeded = new Set<SavedClass>()

  /**
   * SIDE EFFECT:  a read of a field `select` leaves out, on a thing from a place, asks the place again:  see the header.
   * - Costs only a read that finds nothing set.
   * - Not what's being read in, or what only shows it (`whileOnlyShowing()`).
   */
  private heedFieldsLeftOut(Class: SavedClass, select: readonly string[]): void {
    if (this.heeded.has(Class)) return
    this.heeded.add(Class)
    const selected = new Set([...select, ID_FIELD])
    const schema = schemaOf(Class)
    const seen = new Set<string>()
    for (let each: typeof schema | undefined = schema; each; each = each.parent) {
      for (const [name, info] of each.declared) {
        if (seen.has(name)) continue
        seen.add(name)
        if (selected.has(name)) continue
        const whenUnset = (target: object) => {
          if (isOnlyShowing() || isWhileReading()) return
          if (this.things?.placeOf(target as Thing)) this.askWhole(Class)
        }
        schema.declared.set(name, { ...info, whenUnset })
      }
    }
  }

  /** Something read a field `Class`'s reads left out:  every one of them asks again, once, for the whole thing. */
  private askWhole(Class: SavedClass): void {
    if (this.askedWhole.has(Class)) return
    this.askedWhole.add(Class)
    for (const read of this.reads.values()) if (read.Class === Class) void read.askWhole()
  }

  /** Each thing `result` holds, made or changed in place:  `quietly`, see `PlaceThings.thingsFrom()`. */
  thingsOf(result: PlaceResult, options?: { quietly?: boolean }): Thing[] {
    return this.things!.thingsFrom(result, options) as Thing[]
  }

  /** Someone else added or removed `thing`, as a read found out by asking again. */
  noteChangedElsewhere(thing: Thing, kind: "added" | "removed"): void {
    this.things!.noteChanged(thing, { kind, isElsewhere: true })
  }

  /** The thing for `row` of `Class`, kept in its place:  for a row told after the read. */
  thingForRow(Class: SavedClass, row: PlaceRow, idField: string): Thing {
    const { name, collection } = this.placeFor(Class)
    return this.things!.thingForRow({ placeName: name, collection, type: Class.name, row, idField }) as Thing
  }

  /** What the lines of the place `Class` is saved in say. */
  detailsOf(Class: SavedClass): PlaceDetails {
    return this.declared.get(savedInOf(Class).place)!.details
  }

  /** The things, once they're loaded. */
  async thingMaker(): Promise<PlaceThings> {
    await this.load()
    return this.things!
  }

  /** The things, if they're loaded. */
  get thingMakerNow(): PlaceThings | undefined {
    return this.things
  }

  /** The list of places. */
  get placesNow(): Places | undefined {
    return this.places
  }

  /** The folder. */
  get folderNow(): typeof PlacesFolder | undefined {
    return this.folder
  }

  /** Rows changed under what's showing:  every read of that type looks again. */
  private rowsChanged(change: PlaceRowsChange): void {
    for (const read of this.reads.values()) read.rowsChanged(change)
  }

  /** `thing` left its place:  every read of its type lets it go. */
  thingRemoved(thing: Thing): void {
    for (const read of this.reads.values()) read.thingRemoved(thing)
  }

  /** `thing` is back in its place, or new there:  every read of its type that takes it shows it. */
  thingAdded(thing: Thing): void {
    for (const read of this.reads.values()) read.thingAdded(thing)
  }

  /** Ask again:  every read, or every read of `Class`.  Resolves when they've answered;  NEVER throws. */
  async refresh(Class?: SavedClass): Promise<void> {
    const reads = [...this.reads.values()].filter((read) => !Class || read.Class === Class)
    await Promise.all(reads.map((read) => read.refresh()))
  }
}

/**
 * `person`, read by each language's word for its name:  Spanish's `el nombre de la persona` compiles to `persona.nombre`.
 * - A person is plain data with no type a compiler knows, so nothing turns the word back into `name`:  a new language adds its word
 *   (its pack's `builtInMembers.name`) to `WORDS_FOR_NAME`.
 */
function inProgramWords<Person extends PersonHere>(person: Person): Person {
  return { ...person, ...Object.fromEntries(WORDS_FOR_NAME.map((word) => [word, person.name])) }
}

/** Each language's word for a person's name, other than English's. */
const WORDS_FOR_NAME = ["nombre"]

/** Where `Class` says it's saved:  its own line, or a parent's. */
function savedInOf(Class: SavedClass): SavedIn {
  const { savedIn } = Class
  if (!savedIn) {
    throw new TypeError(
      `core.savedThings():  ${Class.name} doesn't say where it's saved;  add "- it is saved in ..." to it`
    )
  }
  return savedIn
}

/****************
 * ### `SavedRead`
 * One type and query read from its place, for however many computations read it.
 * - Its things are ONE scratch list, the same object for its whole life:  so what draws it keeps what it drew.
 * - `changes` is the cell a computation follows.
 * - Goes through `PlaceResult`, so `PlaceReads` shares its requests, and `PlaceQuery` does what the place can't.
 ****************/
class SavedRead {
  /** What its computations follow. */
  readonly changes = new Cell()
  /** Its things. */
  readonly list = core.newScratch(List) as List
  /** The read itself. */
  private result: PlaceResult | undefined
  /** Under way, or done:  what a reader waits for. */
  private answered: Promise<void> | undefined
  /** What's holding it. */
  private holders = 0
  /** Stops asking what changed. */
  private stopPolling: (() => void) | undefined
  /** Nothing's holding it:  no request runs, and the next reader asks again.  It still hears rows, so its list stays true. */
  private isIdle = false
  /** It's asking again for what it left out:  what that brings is nobody's change. */
  private isAskingWhole = false

  constructor(
    private readonly program: ProgramPlaces,
    readonly Class: SavedClass,
    private readonly query: ListQuery
  ) {}

  /** Hold it until the computation running now is disposed;  with none running, until its answer. */
  hold(): void {
    if (!getOwner()) {
      this.holders++
      const letGo = () => this.letGo()
      void this.answer().then(letGo, letGo)
      return
    }
    this.holders++
    onCleanup(() => this.letGo())
  }

  /**
   * Ask for it now, before anything draws it:  what a first draw reads, together (`PlaceDetails.firstReads`).
   * - Held a while after its answer, so the draw that wants it finds it there, with no second request.
   */
  askAhead(): void {
    this.holders++
    const letGo = () => void setTimeout(() => this.letGo(), FIRST_READ_WAITS)
    void this.answer().then(letGo, letGo)
  }

  /** It was asked with some fields left out, and something read another:  ask again for the whole thing.  NEVER throws. */
  async askWhole(): Promise<void> {
    const old = this.result
    this.stopPolling?.()
    this.result = undefined
    this.answered = undefined
    this.isAskingWhole = true
    try {
      await this.answer()
    } catch (ignored) {
      // what's showing stays, and the next read says what's wrong
    } finally {
      this.isAskingWhole = false
      old?.leave()
    }
  }

  /** One less is holding it:  with none, soon, it leaves, so a computation running again keeps it. */
  private letGo(): void {
    this.holders--
    queueMicrotask(() => {
      if (this.holders <= 0) this.leave()
    })
  }

  /** Nothing shows it any more:  it stops reading.  The last reader of a request aborts it. */
  private leave(): void {
    if (this.isIdle) return
    this.isIdle = true
    this.stopPolling?.()
    this.result?.leave()
    this.answered = undefined
  }

  /** Its list, once it has an answer.  - throws what the read threw */
  async answer(): Promise<List> {
    this.isIdle = false
    await (this.answered ??= this.start())
    return this.list
  }

  /** Read it for the first time. */
  private async start(): Promise<void> {
    await this.program.load()
    const { query, Class } = this
    const result = (this.result ??= this.program.newResult(Class, query))
    await (result.contents ? result.reload() : result.load())
    if (this.isIdle) return
    this.fill(this.inOrder(await this.withOtherPages(result)))
    this.startPolling()
  }

  /** `result`'s rows, and its later pages':  `every recipe` means every one of them, unless the query says how many. */
  private async withOtherPages(result: PlaceResult): Promise<Thing[]> {
    const quietly = { quietly: this.isAskingWhole }
    const things = this.program.thingsOf(result, quietly)
    if (this.query.page?.size !== undefined) return things
    for (let at = result.nextPage; at !== undefined;) {
      const more = this.program.newResult(this.Class, { ...this.query, page: { at } })
      await more.load()
      things.push(...this.program.thingsOf(more, quietly))
      at = more.nextPage
      more.leave()
    }
    return things
  }

  /** Ask the place what changed, as often as its line says. */
  private startPolling(): void {
    const { checkedEvery } = this.program.detailsOf(this.Class)
    // under node, asking again would keep the program running
    if (!checkedEvery || typeof document === "undefined") return
    this.stopPolling?.()
    this.stopPolling = pollWhileVisible(checkedEvery, () => this.refresh())
  }

  /** The list is now `things`, and whoever follows it looks again. */
  private fill(things: Thing[]): void {
    untrackCells(() => {
      whileReading(() => {
        this.list.items = things
      })
    })
    this.changes.changed()
  }

  /** Ask again.  What failed tries again;  what's showing stays until the answer.  NEVER throws. */
  async refresh(): Promise<void> {
    const { result } = this
    if (!result) {
      // the first read failed:  a new one
      this.answered = undefined
      this.changes.changed()
      return
    }
    try {
      await (this.answered = result.reload().then(() => undefined))
      const before = new Set(this.list.items as Thing[])
      const things = this.inOrder(await this.withOtherPages(result))
      this.noteJoinedAndLeft(before, things)
      this.fill(things)
    } catch (ignored) {
      // what's showing stays, on a read that had an answer;  with none, the next read says what's wrong
      if (!this.list.items.length) this.changes.changed()
      else this.answered = Promise.resolve()
    }
  }

  /**
   * Asking again found these came or went, so someone else added or removed them.
   * - Only a read of all of them:  a filtered one's things come and go as their fields do.
   */
  private noteJoinedAndLeft(before: ReadonlySet<Thing>, things: readonly Thing[]): void {
    const { filter, page } = this.query
    if (filter || page) return
    const after = new Set(things)
    for (const thing of things) if (!before.has(thing)) this.program.noteChangedElsewhere(thing, "added")
    for (const thing of before) if (!after.has(thing)) this.program.noteChangedElsewhere(thing, "removed")
  }

  /**
   * - throws `PlaceError` "over the ceiling" when what a `where` has to look through here is more than the place says it should be:
   *   filtering a 2 GB file in the browser looks exactly like asking a server.
   */
  checkCeiling(): void {
    const { name, behind } = this.program.placeFor(this.Class)
    const folder = this.program.folderNow!
    const { rows } = { ...folder.DEFAULT_CEILING, ...behind.describe().ceiling }
    if (this.list.items.length <= rows) return
    throw new folder.PlaceError(
      `"${name}" has more than ${rows} of these to look through here;  say what you want in a way it can answer`,
      {
        cause: { kind: "over the ceiling" }
      }
    )
  }

  /**
   * Does `fields` belong in this read?  Only its filter says:  a filter it can't see goes on the list after it.
   * - A field a row doesn't name can't say no:  a thing known already stays, until a row says it no longer fits.
   */
  private takes(fields: PlaceRow, { isKnown = false }: { isKnown?: boolean } = {}): boolean {
    return Object.entries(this.query.filter ?? {}).every(
      ([field, value]) => fields[field] === value || (isKnown && !(field in fields))
    )
  }

  /** Rows changed under it:  new ones join, removed ones go, one that no longer fits its filter goes, and whoever follows looks again. */
  rowsChanged({ type, rows, removed = [], idField }: PlaceRowsChange): void {
    if (type !== this.Class.name) return
    const kept = this.list.items.filter((thing) => !removed.includes((thing as Thing).id)) as Thing[]
    const known = new Set(kept)
    const left = new Set<Thing>()
    for (const row of rows) {
      if (row[idField] === undefined) continue
      const isKnown = kept.some((thing) => thing.id === row[idField])
      if (!this.takes(row, { isKnown })) {
        const thing = kept.find((each) => each.id === row[idField])
        if (thing) left.add(thing)
        continue
      }
      const thing = this.program.thingForRow(this.Class, row, idField)
      if (!known.has(thing)) kept.push(thing)
    }
    this.fill(this.inOrder(kept.filter((thing) => !left.has(thing))))
  }

  /** `thing` left its place. */
  thingRemoved(thing: Thing): void {
    if (!this.list.items.includes(thing)) return
    this.fill(this.list.items.filter((each) => each !== thing) as Thing[])
  }

  /** `thing` is new in its place, or back:  it joins if it's of this type, and its filter takes it. */
  thingAdded(thing: Thing): void {
    if (!(thing instanceof this.Class) || this.list.items.includes(thing)) return
    const fields = thing as unknown as PlaceRow
    if (this.takes(fields)) this.fill(this.inOrder([...(this.list.items as Thing[]), thing]))
  }

  /** `things`, in the order the query asks for. */
  private inOrder(things: Thing[]): Thing[] {
    const { sort = [], page } = this.query
    if (!sort.length || this.result?.handled?.sort) return things.slice(0, page?.size)
    const fieldOf = (thing: Thing, field: string) => (thing as unknown as PlaceRow)[field]
    return [...things]
      .sort((one, other) => {
        for (const { field, descending } of sort) {
          const order = compareSortKeys(fieldOf(one, field), fieldOf(other, field))
          if (order) return descending ? -order : order
        }
        return 0
      })
      .slice(0, page?.size)
  }
}

/** `core`'s methods for what's saved in a place. */
export const savedMethods = defineCoreModule({
  /**
   * `thing` is a place of the running program, and `details` what its lines say:  what `x is a web service at "..."` compiles to.
   * - Nothing reaches the place until something's read or written.
   * - Returns `thing`.
   */
  place<T extends Place>(thing: T, details: PlaceDetails): T {
    programPlaces().declare(thing, details)
    return thing
  },

  /**
   * Every thing of `Class`, as a list, from the place it's saved in:  what `every recipe` compiles to, for a saved type.
   * - Waits for the answer, as any read does:  a getter over it is a value that waits.
   * - The same list each time:  it follows the place.
   * - `query`:  what's handed to the place, which does what it says it can;  the engine the rest, up to its ceiling.
   * - `how`:  `"looks through"`, when a `where` goes through all of it here:  so it stops at the place's ceiling.
   * - throws what the read threw:  a `PlaceError`, for a read a place refused or couldn't answer
   */
  async savedThings<Class extends new () => unknown>(
    Class: Class,
    query: ListQuery = {},
    how?: "looks through"
  ): Promise<List<InstanceType<Class>>> {
    const program = programPlaces()
    program.askFirstReads(Class as unknown as SavedClass)
    const read = program.readOf(Class as unknown as SavedClass, query)
    read.changes.read()
    read.hold()
    const list = await read.answer()
    if (how) read.checkCeiling()
    return list as unknown as List<InstanceType<Class>>
  },

  /** The thing at `place` in `Class`'s place's order, counting from 1, `-1` the last:  what `the first recipe` compiles to, for a saved type. */
  async savedThingAt<Class extends new () => unknown>(
    Class: Class,
    place: number
  ): Promise<InstanceType<Class> | undefined> {
    const { items } = await savedMethods.savedThings(Class)
    return items[place < 0 ? items.length + place : place - 1] as InstanceType<Class> | undefined
  },

  /** A rider with no read above it to go on:  nothing to do, and it says nothing. */
  readRider(_kind: string, _draw: () => unknown): void {},

  /**
   * `thing`, made here, is now kept where its class says:  what `add (a new recipe ...) to the recipes` compiles to.
   * - Shown at once, in every read that takes it;  sent as a write goes, with the action that made it, if one's running.
   * - Undo takes it out again.
   * - Its class's place isn't ready yet, on a program's first moment:  it waits for that, in order.
   */
  saveThing(thing: unknown): Promise<void> {
    const Class = (thing as Thing).constructor as SavedClass
    const program = programPlaces()
    const run = () => {
      const { name, collection } = program.placeFor(Class)
      const things = program.thingMakerNow!
      things.saveNew(thing as Thing, { placeName: name, collection })
      program.thingAdded(thing as Thing)
      noteUndo(
        "saved-added",
        () => removeFromPlace(program, thing as Thing),
        () => putBack(program, thing as Thing, name, collection)
      )
    }
    if (program.thingMakerNow) {
      run()
      return Promise.resolve()
    }
    return program.load().then(run)
  },

  /**
   * `thing` is gone from its place, and so is what belongs to it, which is kept inside it:
   * what `remove it from the recipes` compiles to, for a saved type (epic `data`, Q10).
   * - Undo brings it back, and what belongs to it:  it's the same row.
   * - Not kept in a place:  nothing.
   */
  removeSaved(thing: unknown): void {
    const program = programPlaces()
    const things = program.thingMakerNow
    if (!things) return
    const home = things.placeOf(thing as Thing)
    if (!home) return
    removeFromPlace(program, thing as Thing)
    noteUndo(
      "saved-removed",
      () => putBack(program, thing as Thing, home.placeName, home.collection),
      () => removeFromPlace(program, thing as Thing)
    )
  },

  /**
   * A copy of `thing` to change, sending nothing until `core.saveDraft()`:  what `a draft of the recipe` compiles to.
   * - What's asked again before it's saved is the same copy.
   * - throws `TypeError` for a thing kept in no place, or read from none yet
   */
  draftOf<T>(thing: T): T {
    const things = programPlaces().thingMakerNow
    if (!things)
      throw new TypeError("core.draftOf():  nothing's been read from a place yet, so this thing isn't kept in one")
    return things.draftOf(thing as Thing).thing as unknown as T
  },

  /** Send what's changed in `copy`, a draft:  one group, shown at once.  What `save the draft` compiles to.  - throws for anything else */
  saveDraft(copy: unknown): void {
    draftOfCopy(copy, "saveDraft").save()
  },

  /** Forget what's changed in `copy`, a draft:  nothing had left.  What `cancel the draft` compiles to.  - throws for anything else */
  cancelDraft(copy: unknown): void {
    draftOfCopy(copy, "cancelDraft").cancel()
  },

  /**
   * Run `run`, its changes to each place one group:  what `all or nothing:` compiles to.
   * - Held until it ends, then sent together;  it throws, and they're dropped, and put back.
   * - As true as the place can make it:  a place that isn't `atomic` sends them one by one (the compiler says so).
   * - throws what `run` threw
   */
  async allOrNothing(run: () => unknown): Promise<void> {
    const program = programPlaces()
    const things = await program.thingMaker()
    await things.inOneGroup(run)
  },

  /** Who's at this page:  what `me` compiles to.  With no sign-in, the name its server knows them by, else a guest. */
  currentPerson(): PersonHere {
    return programPlaces().me
  },

  /**
   * Is `value` the person at this page:  what `its cook is me` compiles to.
   * - By their `id`:  what's saved of a person comes back a new object each time it's read.
   * - Or a text, their name or their id:  `its "cook" is text`, with `cook = my name`.
   */
  isMe(value: unknown): boolean {
    const { me } = programPlaces()
    if (typeof value === "string") return value === me.name || value === me.id
    return (value as { id?: unknown } | undefined | null)?.id === me.id
  },

  /**
   * Everyone here, this page included:  what `the people here` compiles to.
   * - The same list each time, its items changing as people come and go:  what draws it follows them.
   * - Asking starts following the program's first place that has people, connecting to it.  With none:  only you.
   */
  peopleHere(): List<PersonHere> {
    return programPlaces().peopleHere as List<PersonHere>
  },

  /** Ask the place again:  every read of `Class`, or of them all.  What `refresh the recipes` and `try again` compile to.  - NEVER throws */
  refreshSaved(Class?: Function): Promise<void> {
    return programPlaces().refresh(Class as SavedClass | undefined)
  },

  /**
   * Who holds `thing`, kept inside its owner's row:  what `the recipe of an ingredient` compiles to, for a saved owner.
   * - `undefined` for one that's in no owner's list yet.
   */
  ownerOfSaved<T = unknown>(thing: unknown): T | undefined {
    return heldBy(thing as Thing) as T | undefined
  },

  /**
   * Things of `Item` are saved inside `Owner`'s row, in its list `field`:  what `an ingredient belongs to one recipe` compiles to, for a saved owner.
   * - So removing a recipe removes its ingredients, and undo brings them back, on every kind of place.
   */
  savedWithOwner(Item: Function, Owner: Function, field: string): void {
    ;(Item as SavedClass).savedWith = { Owner: Owner as SavedClass, field }
  },

  /**
   * Run the operation `name` of the place named `placeName`:  what `to publish a recipe is at "..."` compiles to.
   * - `input`:  what's sent, the recipe, as its row:  left out, nothing is.
   * - Waits for the place's answer, and answers with it.
   * - throws `PlaceError` if the place says no;  `TypeError` if it takes no named operations
   */
  async callPlace(placeName: string, name: string, input?: unknown): Promise<unknown> {
    const program = programPlaces()
    await program.load()
    const behind = program.placesNow!.placeFor(placeName)
    if (!behind?.call) {
      throw new TypeError(`core.callPlace():  "${placeName}" takes no named operations, so "${name}" can't reach it`)
    }
    const things = program.thingMakerNow!
    const sent = input === undefined ? undefined : things.rowSent(input)
    const { savedIn } = (input as { constructor?: SavedClass } | undefined)?.constructor ?? {}
    return behind.call(name, sent, {}, savedIn?.collection)
  },

  /**
   * What a read of a list draws:  each item by `drawEach`, kept by identity, with what its riders say around it.
   * - `read`:  the list, which may not have an answer yet.
   * - Waiting, with no rider:  the "…" every value that waits shows.
   * - Nothing in it, with no rider:  nothing.
   * - Failed, with no rider:  a message, and Try again:  never a blank page.
   * - So a drawing needs no `<Loading>` of its own.
   */
  drawRead<Item>(
    read: () => { readonly items?: readonly Item[] } | Drawing | undefined,
    drawEach: ((item: Item, position: number) => Drawing) | null,
    riders: ReadRiders = {}
  ): Drawing {
    // a read written straight in the drawing is a function that waits:  what it read shows until a new answer lands
    const current = read.constructor.name === ASYNC_FUNCTION ? (createDeferred(read as never) as typeof read) : read
    const items = () => ((current() as { items?: readonly Item[] } | undefined)?.items ?? []) as readonly Item[]
    const drawn = () => {
      if (!drawEach) return current() as Drawing
      // made once, so a change to the list keeps what's drawn:  typing in a recipe keeps its input
      const list = createComponent(
        For as never,
        {
          get each() {
            return items()
          },
          children: (item: Item, position: () => number) => drawEach(item, position() + 1)
        } as never
      ) as Drawing
      const isEmpty = createMemo(() => !items().length)
      return (() => (isEmpty() ? (riders.none?.() ?? null) : list)) as unknown as Drawing
    }
    const whileLoading = riders.waiting
    const body = () =>
      whileLoading
        ? createComponent(Loading, {
            get fallback() {
              return whileLoading()
            },
            get children() {
              return drawn()
            }
          })
        : standInFor(drawn)
    return createComponent(Errored, {
      fallback: (error: unknown) => (riders.failed ? riders.failed() : failedDrawing(error)),
      get children() {
        return body()
      }
    }) as Drawing
  }
})
Object.assign(core, savedMethods)

/** The draft `copy` is a copy for.  - throws `TypeError` for anything else */
function draftOfCopy(copy: unknown, method: string) {
  const things = programPlaces().thingMakerNow
  const draft = things?.draftWithCopy(copy as Thing)
  if (!draft) throw new TypeError(`core.${method}():  that isn't a draft;  make one with "a draft of ..."`)
  return draft
}

/** `thing` leaves its place, and every read. */
function removeFromPlace(program: ProgramPlaces, thing: Thing): void {
  program.thingMakerNow!.remove(thing)
  program.thingRemoved(thing)
}

/** `thing` is back in its place, and every read that takes it. */
function putBack(program: ProgramPlaces, thing: Thing, placeName: string, collection: string): void {
  program.thingMakerNow!.saveNew(thing, { placeName, collection })
  program.thingAdded(thing)
}

/** A step for the program's undo history:  one that's running takes it into its own. */
function noteUndo(title: "saved-added" | "saved-removed", undo: () => void, redo: () => void): void {
  core.RUNTIME?.history.record({ undo, redo }, { title: core.message(title) })
}

/** What shows when a read failed, and nothing said what to:  a message, and Try again. */
function failedDrawing(error: unknown): Drawing {
  const message = core.message("read-failed", { why: `${(error as Error)?.message ?? error}` })
  const button = h("ui-button", { onClick: () => void savedMethods.refreshSaved() }, core.message("write-retry"))
  return h("ui-message", { color: "red" }, message, button) as unknown as Drawing
}
