/**
 * What compiled spell calls for a type that's saved in a place (epic `data` P11):  the words reach `places.ts` here.
 *
 * ```js
 * export const familyCookbook = core.place(new FamilyCookbook(), { name: "family cookbook", kind: "web server", at: "..." })
 * Recipe.savedIn = { place: "family cookbook", collection: "recipes" }
 * get matches() { return core.waitedValue(this, "matches", async () => core.filter(await core.savedThings(Recipe), ...)) }
 * ```
 *
 * - Each run of a program has ONE `ProgramPlaces`, made when it first names a place:  no place named, nothing here runs.
 * - `spell/places` is loaded the first time a program names one, by a dynamic `import()`:
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
 * - A field holding another thing's address (epic `data` I33, `core.linked()`):  `the name of its homeworld`.
 *   - One quiet read per address, shared by whoever follows it, and none when a read has already brought that thing.
 *   - Whoever's drawing it holds the read:  the last to leave aborts it, as with any other.
 * - Who's here (epic `data` P13):  `core.currentPerson()` and `core.peopleHere()`, from the program's first place that has people:
 *   plain data, one object per page, so `the name of the person is their name` means what it says.
 *   With no such place there's only you, and the compiler says so (`PLACE_KIND_ABILITIES`).
 * - A place where each person is someone (`Place.signIn`, epic `data` P16) is made as the program starts:
 *   who's signed in there is who's at this page;  once the program first reads or writes it, `showSignIn()` shows who,
 *   and offers to sign in and out (epic `language` T67).
 * - Loads Solid, as `waiting.ts` does:  NEVER imported by `core/model`.
 * - Part of `core`:  imported by `spell/parser/core`'s barrel for its side effect.
 */
import h from "@solidjs/h"
import { createComponent, insert, type JSX } from "@solidjs/web"
import { Errored, For, Loading, createDeferred, createEffect, createMemo, getOwner, onCleanup } from "solid-js"

import { msUntil, pollWhileVisible } from "spell/util/polling"
import { rateLimitLeft, rateLimitResetAt, retryAfter } from "spell/util/retrying"
import { after } from "spell/util/timing"

import { Cell, isOnlyShowing, schemaOf, untrackCells } from "spell/util/reactive"
import type * as PlacesFolder from "spell/places"
import type { Places } from "spell/places/Places"
import type { PlaceResult } from "spell/places/PlaceResult"
import { personOnThisPage } from "spell/places/people"
import type { ListQuery, PersonHere, Place as PlaceBehind, PlaceRow } from "spell/places/places.types"
import type { PlaceRowsChange } from "spell/places/PendingChanges"

import { compareSortKeys } from "./collection-other"
import { MOST_AT_ONCE, drawnInWindow, type MorePages } from "./drawnWindow"
import { CLASSES_DECLARED, core, isWhileReading, whileReading } from "./core"
import { defineCoreModule } from "./core.types"
import { nameTableColumns } from "./ui"
import type { Drawing } from "./drawing"
import { knowCollection, placeBehind, type PlaceDetails } from "./placeKinds"
import { PlaceThings, heldBy } from "./places"
import { readNumbersAs } from "./saving"
import { showSignIn, signInMenu } from "./signInBar"
import { forgetWaitedValue, standInFor } from "./waiting"
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
  /** `if that fails say "..."`:  the message that shows, Try again kept. */
  failedSay?: () => unknown
  /** `show them in:`:  the element the items go in, the loader and messages staying outside it. */
  items?: () => unknown
  /** `show it all in:`:  the element everything goes in, a titled section. */
  whole?: () => unknown
  /** `show them in pages`, `show them all`:  how a long list draws;  none:  more as you scroll. */
  paging?: () => "pages" | "all"
  /** `show them 12 at a time`:  how many a page holds, or each lot of more as you scroll;  none:  `MOST_AT_ONCE`. */
  pageSize?: () => number
}

/** A row's id, always asked for:  it's what makes it one row. */
const ID_FIELD = "id"

/** The kinds whose mapping says where a collection is, while it keeps its own name for the engine. */
const KEEP_THEIR_OWN_NAME = new Set([
  "web server",
  "graphql server",
  "atmosphere account",
  "personal atmosphere account",
  "airtable"
])

/** A field's name as its words alone, for matching however it's spelled:  `hair_color`, `hairColor` => `haircolor`. */
function wordsOfName(name: string): string {
  return name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "")
}

/** What a link's read asks for:  the one row at this address. */
function linkQuery(address: string): ListQuery {
  return { ids: [address] }
}

/** What a field holding a link says it's a link to, or `undefined`:  an address, or a server's `{ name, url }`. */
function addressIn(value: unknown): string | undefined {
  if (typeof value === "string") return value || undefined
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) return undefined
  const { url } = value as { url?: unknown }
  return typeof url === "string" ? url : undefined
}

/** A read given up on because nobody's waiting for it any more. */
function isAbandoned(error: unknown): boolean {
  return (error as Error | undefined)?.name === "AbortError"
}

/** A project data folder's kind:  its lists are whoever's signed in's, so its copy on this device is too. */
const DATA_FOLDER_KIND = "data folder"

/** Each read's list, for what draws it to ask for its next page. */
const MORE_PAGES = new WeakMap<object, SavedRead>()

/** The kinds of place that know who's here, among those spell knows by itself. */
const KINDS_WITH_PEOPLE = new Set(["room", "atmosphere account", "personal atmosphere account"])

/** The kinds of place where each person is someone, so they sign in:  made as the program starts, to know who's at the page. */
const KINDS_WITH_SIGN_IN = new Set(["atmosphere account", "personal atmosphere account", "the cloud"])

/** How long a read asked for ahead waits for the draw that wants it, once it has its answer, in msec. */
const FIRST_READ_WAITS = 5_000

/** What a function written `async` says it is. */
const ASYNC_FUNCTION = "AsyncFunction"

/** Each run's places:  a new run has its own. */
const PROGRAMS = new WeakMap<object, ProgramPlaces>()

/** Where this run finds a place's key, when it runs on a server side:  `SpellRuntime.keyFrom`. */
function keyFinder(): { keyFrom?: (name: string) => string | undefined } {
  const keyFrom = core.RUNTIME?.keyFrom
  return keyFrom ? { keyFrom } : {}
}

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
    const folder = await import("spell/places")
    this.folder = folder
    const keepPendingAs = (core.RUNTIME as { remembered?: { store: { name: string } } }).remembered?.store.name
    this.programName = keepPendingAs ?? globalThis.location?.pathname ?? ""
    this.places = new folder.Places({ ...(keepPendingAs !== undefined && { keepPendingAs }) })
    this.things = new PlaceThings({ places: this.places, classNamed: (name) => this.classNamed(name) })
    this.places.onRows((change) => this.rowsChanged(change))
    for (const [name, { details }] of this.declared) {
      if (!KINDS_WITH_SIGN_IN.has(details.kind ?? "")) continue
      const behind = this.places.placeFor(name) ?? this.placeNeedingNoClass(details)
      if (!this.places.placeFor(name)) this.places.add(name, behind)
      this.followSignIn(behind)
    }
  }

  /** The places whose sign-in's followed:  whoever signs in there is who's at this page. */
  private readonly signingIn = new Set<PlaceBehind>()
  /** The places whose sign-in's bar shows. */
  private readonly signInShown = new Set<PlaceBehind>()

  /**
   * SIDE EFFECT:  `behind`'s sign-in shows, once something reads or writes it, and whoever signs in is who's at this page.
   * - Its bar shows only now, as the place is first used:  a program that picks among places shows none for one it
   *   hasn't picked (epic `language` T67:  Task List's atmosphere account said "You aren't signed in" as it started,
   *   kept in this browser).
   */
  private startSignIn(name: string, behind: PlaceBehind): void {
    this.followSignIn(behind)
    if (!behind.signIn || this.signInShown.has(behind)) return
    this.signInShown.add(behind)
    showSignIn(name, behind)
  }

  /**
   * SIDE EFFECT:  whoever signs in at `behind` is who's at this page, from now on:  as the program starts, so `them`
   * reads the person before anything reads the place.
   * - A sign-in that knows by itself who's signed in (a Spell account's, epic `atmosphere` P3)
   *   says so each time that changes.
   *   - e.g. a project data folder's:  until someone signs in, its bar says it takes them to be this machine's person.
   * - Signed out of a Spell account:  who's at this page goes back to the guest a page has with no sign-in.
   */
  private followSignIn(behind: PlaceBehind): void {
    if (this.signingIn.has(behind)) return
    if (!behind.signIn) return
    this.signingIn.add(behind)
    const { signIn } = behind
    const adopt = () => {
      const person = signIn.person ?? behind.currentPerson?.()
      if (person) return this.adoptPerson(person)
      // signed out of a Spell account:  back to who's at this page with none (epic `atmosphere` P3)
      if (signIn.account === "Spell account") {
        this.adoptPerson({
          ...personOnThisPage((number) => core.message("guest-person", { number })),
          page: this.person.page
        })
      }
    }
    behind.onPeopleHere?.(adopt)
    signIn.onChange(adopt)
    adopt()
  }

  /** The place says this is who's at this page:  the same object, so what read it reads again. */
  private adoptPerson({ id, name, page }: PersonHere): void {
    if (id === this.personNow.id && name === this.personNow.name && page === this.person.page) return
    const wasSomeoneElse = id !== this.personNow.id
    // what was kept on this device for them stays theirs:  signing out forgets it
    if (wasSomeoneElse) for (const copy of this.copies.values()) void copy.forgetPerson(this.personNow.id)
    this.personNow = { id, name }
    this.person.page = page
    this.personChanged.changed()
    // `recipes where its cook is them` means someone else's now
    if (wasSomeoneElse) void this.refresh()
  }

  /** The class called `name`:  the program's own, by what's been read or saved, else what the program knows. */
  private classNamed(name: string): ReturnType<typeof core.things.classNamed> {
    return (this.classes.get(name) as never) ?? core.things.classNamed(name) ?? (CLASSES_DECLARED.get(name) as never)
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
    // what a line under it calls the collection there:  a web server's and a graphql server's is an address, read by their own mapping
    const mapped = details.collections?.[savedIn.collection]?.at
    const collection =
      mapped && !KEEP_THEIR_OWN_NAME.has(details.kind ?? "") ? mapped.replace(/^\//, "") : savedIn.collection
    const deviceCopy = this.deviceCopyFor(details)
    const making = {
      details,
      folder: this.folder!,
      collection,
      Class,
      person: this.person,
      ...keyFinder(),
      ...(deviceCopy && { deviceCopy })
    }
    // how its numbers read:  the mark the place's line says, else the program's language's for one the text can't settle
    readNumbersAs(Class, {
      ...(details.numbersLike !== undefined && { mark: this.folder!.decimalMarkIn([details.numbersLike]) }),
      ...(details.unclearNumbers !== undefined && { unclear: details.unclearNumbers })
    })
    let behind = this.places!.placeFor(name)
    if (!behind) {
      const { thing } = declared
      behind = details.kind ? placeBehind(making) : (thing.makePlace(details, this.folder) as PlaceBehind)
      this.places!.add(name, behind)
    } else if (details.kind) knowCollection(behind, making)
    this.startSignIn(name, behind)
    return { name, collection, behind }
  }

  /** What the program is called, for what it keeps on this device:  its project's id, else the page's path. */
  private programName = ""
  /** Each place's copy kept on this device, by its name:  only a place whose line says so. */
  private readonly copies = new Map<string, PlacesFolder.DeviceCopy>()

  /**
   * The copy kept on this device of what the place `details` names reads, made the first time:
   * `undefined` without `- keep a copy on this device`, and with no page (`spell run`).
   * - Fresh until its next check time:  `check it once a day at 5am`, `check it every 5 minutes`;
   *   with neither, stale at once.
   * - A place with a key keeps each person's apart.
   * - SIDE EFFECT:  a copy read again behind it that changed reads that place's reads again, from the copy now fresh.
   */
  private deviceCopyFor(details: PlaceDetails): PlacesFolder.DeviceCopy | undefined {
    const { name, keptOnDevice, checkedEvery, checkedAt, keyNamed } = details
    if (!keptOnDevice || typeof document === "undefined") return undefined
    let copy = this.copies.get(name)
    if (copy) return copy
    copy = new this.folder!.DeviceCopy({
      scope: `${this.programName}:${name}`,
      ...(typeof keptOnDevice === "number" && { mostBytes: keptOnDevice }),
      freshFor: () => (checkedAt ? msUntil(checkedAt) : (checkedEvery ?? 0) * 1000),
      // a key's, or a data folder's (whose lists are whoever's signed in's):  each person's apart
      ...((keyNamed !== undefined || details.kind === DATA_FOLDER_KIND) && { person: () => this.personNow.id })
    })
    copy.onChanged(() => void this.refresh(undefined, name))
    this.copies.set(name, copy)
    return copy
  }

  /** Who's at this page's name and id, which change when they sign in. */
  private personNow = personOnThisPage((number) => core.message("guest-person", { number }))
  /** What reads `person` follows. */
  private readonly personChanged = new Cell()

  /** Who's at this page:  the same object as long as the program runs, so what read their name reads it again when they sign in. */
  readonly person: PersonHere = this.followedPerson()

  /** See `person`. */
  private followedPerson(): PersonHere {
    const followed = (read: () => string) => ({
      enumerable: true,
      get: () => {
        this.personChanged.read()
        return read()
      }
    })
    const name = followed(() => this.personNow.name)
    const words = Object.fromEntries(WORDS_FOR_NAME.map((word) => [word, name]))
    const person = { page: "" } as PersonHere
    return Object.defineProperties(person, { id: followed(() => this.personNow.id), name, ...words })
  }

  /** Everyone here, this page included:  ONE list, for as long as the program runs. */
  get peopleHere(): List {
    if (!this.peopleList) {
      this.peopleList = core.newScratch(List) as List
      this.showPeople([this.person])
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
      const makes = KINDS_WITH_PEOPLE.has(details.kind ?? "") || !details.kind
      const made = this.places!.placeFor(name)
      if (!made && !makes) continue
      const behind =
        made ??
        (details.kind ? this.placeNeedingNoClass(details) : (thing.makePlace(details, this.folder) as PlaceBehind))
      if (!made) this.places!.add(name, behind)
      if (!behind.onPeopleHere || !behind.currentPerson) continue
      const { page } = behind.currentPerson()
      this.person.page = page
      this.knownPeople.set(page, this.person)
      behind.onPeopleHere((people) => this.showPeople(people))
      this.showPeople(behind.peopleHere?.() ?? [this.person])
      return
    }
  }

  /** The place `details` says, with no class read from it yet:  a room or an atmosphere account needs none. */
  private placeNeedingNoClass(details: PlaceDetails): PlaceBehind {
    return placeBehind({
      details,
      folder: this.folder!,
      collection: "",
      Class: Object,
      person: this.person,
      ...keyFinder()
    })
  }

  /** The list says `people` now, as a read does:  nobody's write. */
  private showPeople(people: readonly PersonHere[]): void {
    const items = people.map((person) => {
      const kept = this.knownPeople.get(person.page)
      // one that's still here stays the same object, until what it says changes:  a handle found, say
      const known =
        person.page === this.person.page ? this.person : kept?.name === person.name ? kept : inProgramWords(person)
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

  /** What each link was found to be, by type and address:  `null` when the place holds nothing there. */
  private readonly linksFound = new Map<string, Thing | null>()
  /** Each thing's list of what its links name, so it stays one list while they're the same. */
  private readonly linkedLists = new WeakMap<object, Map<string, { addresses: string; list: List }>>()

  /** The thing at `address`, if it's known already:  `null` if the place holds nothing there, `undefined` if nobody knows yet. */
  linkKnown(Class: SavedClass, address: string): Thing | null | undefined {
    const found = this.linksFound.get(`${Class.name}\n${address}`)
    return found !== undefined ? found : (this.things?.thingKnownAs(Class.name, address) as Thing | undefined)
  }

  /** The id `thing` is kept under in its place:  `undefined` for one in no place. */
  idOf(thing: object): string | undefined {
    return this.things?.placeOf(thing as Thing)?.id
  }

  /** The computation running now is drawing what's at `address`:  the read stays until it's disposed. */
  holdLink(Class: SavedClass, address: string): void {
    this.readOf(Class, linkQuery(address)).hold()
  }

  /**
   * The thing at `address`:  `undefined` if the place holds nothing there.
   * - A read of all of them going already:  its answer, and no request of its own.
   * - Its read given up on while it waited, as everyone holding it left:
   *   - something holds it again by then, e.g. the same page drawn again:  it asks again, for them
   *   - nothing does:  rejects with an `AbortError`, as nothing's learned from that
   * - `byId`:  a row another read brought isn't enough, `readById()`:  `the user whose id is ...`
   * - throws what the read threw
   */
  async follow(Class: SavedClass, address: string, { byId = false } = {}): Promise<Thing | undefined> {
    await this.load()
    this.noteClass(Class)
    const whole = this.reads.get(`${Class.name}\n${JSON.stringify({})}`)
    const asked = () => (byId ? this.readById(Class, address, whole) : this.linkKnown(Class, address))
    if (asked() === undefined && whole?.isGoing) await whole.firstPage().catch(() => undefined)
    while (asked() === undefined) {
      const read = this.readOf(Class, linkQuery(address))
      try {
        const [thing] = (await read.answerNotGivenUp()).items as Thing[]
        this.linksFound.set(`${Class.name}\n${address}`, thing ?? null)
      } catch (error) {
        // a drawing that came back holds it, and is waiting on this very answer:  give it up now, and it waits forever
        if (!isAbandoned(error) || !read.isHeld) throw error
      }
    }
    return asked() ?? undefined
  }

  /**
   * The thing with id `address`, if a read of it alone found it, or a read of every one of its type:
   * `null` if the place holds nothing there, `undefined` if neither has said.
   * - NOT a row another read brought, a search's:  that may hold only some of its fields (epic `data` I90),
   *   so `the user whose id is ...` reads it whole, and a failure says so rather than showing the row.
   */
  private readById(Class: SavedClass, address: string, whole: SavedRead | undefined): Thing | null | undefined {
    const found = this.linksFound.get(`${Class.name}\n${address}`)
    if (found !== undefined) return found
    const known = this.things?.thingKnownAs(Class.name, address) as Thing | undefined
    return known && whole?.list.items.some((item) => item === known) ? known : undefined
  }

  /** One list for `owner`'s `field`, holding `things`, the same one while `addresses` are. */
  linkedList(owner: object, field: string, addresses: readonly string[], things: readonly unknown[]): List {
    let lists = this.linkedLists.get(owner)
    if (!lists) this.linkedLists.set(owner, (lists = new Map()))
    const said = addresses.join("\n")
    const kept = lists.get(field)
    if (kept?.addresses === said) return kept.list
    const list = core.newScratch(List) as List
    untrackCells(() => {
      whileReading(() => {
        list.items = [...things]
      })
    })
    lists.set(field, { addresses: said, list })
    return list
  }

  /** Make what `start()` needs of a read:  a result, read by nobody yet. */
  newResult(Class: SavedClass, query: ListQuery): PlaceResult {
    const { name, collection, behind } = this.placeFor(Class)
    const select = this.selectionFor(Class, behind)
    const { listsGive } = this.detailsOf(Class)
    if (listsGive) this.heedListsGiveOnly(Class, listsGive)
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

  /** The classes whose fields a list leaves out are being listened for. */
  private readonly heededLists = new Set<SavedClass>()
  /** Each thing whose whole has been asked for, by type and id:  once each. */
  private readonly wholesAsked = new Set<string>()

  /** Each thing whose whole has been asked for:  the quick check, before its key's. */
  private readonly wholeThingsAsked = new WeakSet<object>()

  /**
   * SIDE EFFECT:  a read of a field `Class`'s place's lists don't give (`listsGive`), on a thing from that place,
   * reads that thing whole from its own address, once:  PokéAPI's lists give each pokemon's name, its page the rest.
   * - The field fills in as the answer comes, as any field a place changes does.
   * - Each such field's getter is wrapped:
   *   a list is made empty as its thing is (an early prop), so being unset says nothing.
   * - Not what's being read in, or what only shows it (`whileOnlyShowing()`).
   */
  private heedListsGiveOnly(Class: SavedClass, listsGive: readonly string[]): void {
    if (this.heededLists.has(Class)) return
    this.heededLists.add(Class)
    const given = new Set([...listsGive.map(wordsOfName), wordsOfName(ID_FIELD)])
    const schema = schemaOf(Class)
    const seen = new Set<string>()
    for (let each: typeof schema | undefined = schema; each; each = each.parent) {
      for (const [name, info] of each.declared) {
        if (seen.has(name)) continue
        seen.add(name)
        // a field it holds, with a type:  not a value worked out from others (`readsFrom`)
        const isHeld = info.type !== undefined || info.itemType !== undefined
        if (!isHeld || given.has(wordsOfName(name))) continue
        this.readWholeOnGet(Class, name)
      }
    }
  }

  /** SIDE EFFECT:  `Class`'s getter for `name` reads its thing whole first, once:  see `heedListsGiveOnly()`. */
  private readWholeOnGet(Class: SavedClass, name: string): void {
    let owner: object | null = Class.prototype as object
    while (owner && !Object.getOwnPropertyDescriptor(owner, name)?.get) owner = Object.getPrototypeOf(owner) as object
    const descriptor = owner && Object.getOwnPropertyDescriptor(owner, name)
    if (!descriptor?.get) return
    const get = descriptor.get
    const askWhole = (thing: Thing) => {
      if (this.wholeThingsAsked.has(thing) || isOnlyShowing() || isWhileReading()) return
      if (this.things?.placeOf(thing)) this.readWhole(Class, thing)
    }
    Object.defineProperty(Class.prototype, name, {
      ...descriptor,
      get(this: Thing) {
        askWhole(this)
        return get.call(this) as unknown
      }
    })
  }

  /** Read `thing` whole from its own address, once:  see `heedListsGiveOnly()`.  NEVER throws. */
  private readWhole(Class: SavedClass, thing: Thing): void {
    const id = (thing as unknown as { id?: unknown }).id
    if (id === undefined || id === null || id === "") return
    this.wholeThingsAsked.add(thing)
    const key = `${Class.name}\n${id as string}`
    if (this.wholesAsked.has(key)) return
    this.wholesAsked.add(key)
    void this.readOf(Class, linkQuery(`${id as string}`))
      .answer()
      .catch((error: unknown) => {
        // asked again by the next read of it
        this.wholesAsked.delete(key)
        this.wholeThingsAsked.delete(thing)
        if (!isAbandoned(error)) console.error(`core:  couldn't read ${key.replace("\n", " ")} whole`, error)
      })
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

  /**
   * Where the list the place keeps under `owner`, in its field `field`, is:  `/posts/1/comments`, its id in the braces.
   * - `undefined` for a field no line says lives under it (`- a post's comments live at "..."`),
   *   or a thing read from no place.
   */
  addressUnder(owner: Thing, field: string): string | undefined {
    const Owner = owner.constructor as SavedClass
    const id = Owner.savedIn && this.things?.placeOf(owner)?.id
    if (id === undefined) return undefined
    const path = this.detailsOf(Owner).listsUnder?.[Owner.savedIn!.collection]?.[field]
    return path?.replace("{id}", encodeURIComponent(id))
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

  /**
   * Ask again:  every read, or every read of `Class`, or of the place `placeName`.
   * - Resolves when they've answered;  NEVER throws.
   */
  async refresh(Class?: SavedClass, placeName?: string): Promise<void> {
    const reads = [...this.reads.values()].filter(
      (read) => (!Class || read.Class === Class) && (!placeName || read.Class.savedIn?.place === placeName)
    )
    await Promise.all(reads.map((read) => read.refresh()))
  }

  /**
   * Ask the server again, whatever was kept on this device:  `reload the films`, `try again`.
   * - Every read, or every read of `Class`.  Resolves when they've answered;  NEVER throws.
   */
  async reload(Class?: SavedClass): Promise<void> {
    const placeName = Class?.savedIn?.place
    for (const [name, copy] of this.copies) if (!placeName || name === placeName) copy.readFromServerNext()
    await this.refresh(Class)
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

/**
 * `details`, each collection by the name a type's `savedIn` knows it by:  a compiled object's keys are camelCase,
 * so `life forms live at "/forms"` arrives as `lifeForms`, and a type looks for `life_forms` (epic `data` P18).
 */
function withCollectionNames(details: PlaceDetails): PlaceDetails {
  const { collections, listsUnder } = details
  return {
    ...details,
    ...(collections && { collections: byCollectionNames(collections) }),
    ...(listsUnder && { listsUnder: byCollectionNames(listsUnder) })
  }
}

/** `byName`, each key a collection's name as a place calls it:  `wikiPages` => `wiki_pages`. */
function byCollectionNames<Value>(byName: Record<string, Value>): Record<string, Value> {
  const named = Object.entries(byName).map(
    ([name, value]) => [name.replace(/\p{Lu}/gu, (letter) => `_${letter.toLowerCase()}`), value] as const
  )
  return Object.fromEntries(named)
}

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
  /** Where its next page is:  only ever left for later by what only needs to draw it. */
  private nextPage: string | undefined
  /** How many pages it's read. */
  private pagesRead = 0
  /** Reads a page when something's drawn near the end of what it has, rather than every page first. */
  private readsPagesWhenDrawn = false
  /** The page it's reading now. */
  private readingPage: Promise<void> | undefined
  /** What's holding it. */
  private holders = 0
  /** Stops asking what changed. */
  private stopPolling: (() => void) | undefined
  /** Nothing's holding it:  no request runs, and the next reader asks again.  It still hears rows, so its list stays true. */
  private isIdle = false
  /**
   * How many times it's left:  a read begun before the last time was given up on, whatever holds it now.
   * - NOT `isIdle`, which the next reader clears:  a read given up on, then asked again, isn't the first one's answer.
   */
  private timesLeft = 0
  /** It's asking again for what it left out:  what that brings is nobody's change. */
  private isAskingWhole = false

  constructor(
    private readonly program: ProgramPlaces,
    readonly Class: SavedClass,
    private readonly query: ListQuery
  ) {
    MORE_PAGES.set(this.list, this)
    // so a table of it has its columns before it has a row
    nameTableColumns(this.list, Class)
  }

  /** Is there another page it hasn't read? */
  get hasMorePages(): boolean {
    return this.nextPage !== undefined
  }

  /** Read the next page, for what's drawing it:  its things join the list.  NEVER rejects:  the next time it's near the view asks again. */
  readNextPage(): Promise<void> {
    return (this.readingPage ??= this.readPage()
      .catch((ignored) => console.error(`core.drawRead():  couldn't read the next page of ${this.Class.name}`, ignored))
      .finally(() => {
        this.readingPage = undefined
      }))
  }

  /** The next page's things join the list.  - throws what the read threw */
  private async readPage(): Promise<void> {
    const things = await this.pagesAfter(this.pagesRead + 1)
    this.fill(this.inOrder([...(this.list.items as Thing[]), ...things]))
  }

  /** Is a read of it under way, or has it its answer, with someone holding it? */
  get isGoing(): boolean {
    return !this.isIdle && !!this.answered
  }

  /** Is anything holding it now:  a computation drawing it, or an action waiting for it? */
  get isHeld(): boolean {
    return this.holders > 0
  }

  /**
   * Its list, once it has an answer that wasn't given up on.
   * - Rejects with an `AbortError` when it left while this waited:  nothing's learned from that.
   * - throws what the read threw
   */
  async answerNotGivenUp(): Promise<List> {
    const timesLeft = this.timesLeft
    try {
      const list = await this.answer()
      if (this.timesLeft === timesLeft) return list
    } catch (error) {
      if (this.timesLeft === timesLeft) throw error
    }
    throw new DOMException(`Nobody was waiting for ${this.Class.name} any more`, "AbortError")
  }

  /** Hold it until the computation running now is disposed;  with none running, until `answering`, its answer unless it says. */
  hold(answering?: Promise<unknown>): void {
    if (!getOwner()) {
      this.holders++
      const letGo = () => this.letGo()
      void (answering ?? this.answer()).then(letGo, letGo)
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
    const letGo = () => void after(FIRST_READ_WAITS / 1000, () => this.letGo()).catch(console.error)
    void this.firstPage().then(letGo, letGo)
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
    this.timesLeft++
    this.stopPolling?.()
    this.result?.leave()
    this.answered = undefined
  }

  /** Its list, once it has an answer:  every page of it.  - throws what the read threw */
  async answer(): Promise<List> {
    this.isIdle = false
    await (this.answered ??= this.start())
    if (this.nextPage !== undefined) await this.readTheRest()
    return this.list
  }

  /**
   * Its list, once it has its first page:  what only needs to draw it.
   * - The rest is read as it's drawn (`readNextPage()`), unless it has to be in order, here, first.
   * - throws what the read threw
   */
  async firstPage(): Promise<List> {
    this.isIdle = false
    if (!this.answered && !this.query.sort?.length) this.readsPagesWhenDrawn = true
    await (this.answered ??= this.start())
    return this.list
  }

  /** Every page it hasn't read yet. */
  private async readTheRest(): Promise<void> {
    this.readsPagesWhenDrawn = false
    await this.readingPage
    while (this.nextPage !== undefined) await this.readPage()
  }

  /** Read it for the first time. */
  private async start(): Promise<void> {
    const timesLeft = this.timesLeft
    await this.program.load()
    const { query, Class } = this
    const result = (this.result ??= this.program.newResult(Class, query))
    await (result.contents ? result.reload() : result.load())
    // given up on while it waited:  what came is a read cut short, even if a newer reader holds it now
    if (this.timesLeft !== timesLeft) return
    this.fill(this.inOrder(await this.withOtherPages(result, this.readsPagesWhenDrawn ? 1 : Infinity)))
    this.startPolling()
  }

  /**
   * `result`'s rows, and its later pages' up to `pages`:  `every recipe` means every one of them, unless the query says how many,
   * or what's reading it only draws it, and asks for the next when it's needed.
   */
  private async withOtherPages(result: PlaceResult, pages: number): Promise<Thing[]> {
    const things = this.program.thingsOf(result, { quietly: this.isAskingWhole })
    this.nextPage = this.query.page?.size === undefined ? result.nextPage : undefined
    this.pagesRead = 1
    things.push(...(await this.pagesAfter(pages)))
    return things
  }

  /** The things on the pages after what it's read, up to `pages` in all. */
  private async pagesAfter(pages: number): Promise<Thing[]> {
    const things: Thing[] = []
    while (this.nextPage !== undefined && this.pagesRead < pages) {
      const more = this.program.newResult(this.Class, { ...this.query, page: { at: this.nextPage } })
      await more.load()
      things.push(...this.program.thingsOf(more, { quietly: this.isAskingWhole }))
      this.nextPage = more.nextPage
      this.pagesRead++
      more.leave()
    }
    return things
  }

  /**
   * Ask the place what changed, as often as its line says:  every so many seconds, or once a day at a time.
   * - Never more often than the place takes (`checkedAtMostEvery`, epic `atmosphere` P1):  its line says so too.
   */
  private startPolling(): void {
    const { checkedEvery, checkedAt } = this.program.detailsOf(this.Class)
    // under node, asking again would keep the program running;  what's followed by a link shows what its list says
    if (!checkedEvery || typeof document === "undefined" || this.query.ids) return
    const { checkedAtMostEvery = 0 } = this.program.placeFor(this.Class).behind.describe()
    this.stopPolling?.()
    this.stopPolling = pollWhileVisible(Math.max(checkedEvery, checkedAtMostEvery), () => this.refresh(), {
      ...(checkedAt && { at: checkedAt })
    })
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

  /**
   * Ask again.
   * - What failed tries again;  what's showing stays until the answer.
   * - NEVER throws.
   */
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
      const pages = this.readsPagesWhenDrawn ? this.pagesRead : Infinity
      const things = this.inOrder(await this.withOtherPages(result, pages))
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
   * - A list under one thing (`ListQuery.under`, a post's comments) takes only what it was answered with:
   *   nothing says which thing a new one is under, so it joins none of them (epic `data` P30).
   */
  private takes(fields: PlaceRow, { isKnown = false }: { isKnown?: boolean } = {}): boolean {
    if (this.query.under !== undefined && !isKnown) return false
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
   * `thing` is a place of the running program, and `details` what its lines say:  what `x is a web server at "..."` compiles to.
   * - Nothing reaches the place until something's read or written.
   * - Returns `thing`.
   */
  place<T extends Place>(thing: T, details: PlaceDetails): T {
    programPlaces().declare(thing, withCollectionNames(details))
    return thing
  },

  /**
   * Every thing of `Class`, as a list, from the place it's saved in:  what `every recipe` compiles to, for a saved type.
   * - Waits for the answer, as any read does:  a getter over it is a value that waits.
   * - The same list each time:  it follows the place.
   * - `query`:  what's handed to the place, which does what it says it can;  the engine the rest, up to its ceiling.
   * - `how`:  `"looks through"`, when a `where` goes through all of it here:  so it stops at the place's ceiling.
   *   `"as drawn"`, when all that's done with it is draw it:  so its later pages wait until they're near the view.
   * - throws what the read threw:  a `PlaceError`, for a read a place refused or couldn't answer
   */
  async savedThings<Class extends new () => unknown>(
    Class: Class,
    query: ListQuery = {},
    how?: "looks through" | "as drawn"
  ): Promise<List<InstanceType<Class>>> {
    const program = programPlaces()
    program.askFirstReads(Class as unknown as SavedClass)
    const read = program.readOf(Class as unknown as SavedClass, query)
    read.changes.read()
    const answering = how === "as drawn" ? read.firstPage() : read.answer()
    read.hold(answering)
    const list = await answering
    if (how === "looks through") read.checkCeiling()
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

  /**
   * The thing of `Class` with this id, from the place it's saved in:  what `the wiki page whose id is its name` compiles to.
   * - One read per id, shared, and none for a thing already read by its id, or in a read of every one of its type.
   *   - A row a search brought is read again by its id:  it may hold only some of its fields (epic `data` I90).
   * - Waits for the answer, as any read does.
   * - `undefined` if the place holds nothing by that id, or no id's given:  nothing was asked.
   * - throws what the read threw
   */
  async savedThingWithId<Class extends new () => unknown>(
    Class: Class,
    id: unknown
  ): Promise<InstanceType<Class> | undefined> {
    if (id === undefined || id === null || id === "") return undefined
    const program = programPlaces()
    const saved = Class as unknown as SavedClass
    program.holdLink(saved, `${id as string}`)
    return (await program.follow(saved, `${id as string}`, { byId: true })) as InstanceType<Class> | undefined
  },

  /**
   * The id `thing` is kept under in the place it's saved in:  what a site's address names it by (epic `mockup` P2).
   * - `undefined` for a thing in no place.
   */
  savedIdOf(thing: unknown): string | undefined {
    return thing && typeof thing === "object" ? programPlaces().idOf(thing) : undefined
  },

  /**
   * `thing`'s field `name`, of a type saved in a place:  the thing or things its address names (epic `data` I33).
   * - What `its "homeworld" is a planet` compiles to, on a type on a web server, whose rows hold `"homeworld": "https://..."`.
   * - A list of addresses is a list of things, the same list while the addresses are the same.  One the place doesn't hold is left out.
   * - A list the place keeps under the thing, at an address of its own,
   *   `- a post's comments live at "/posts/{id}/comments"`:
   *   read from there, the first time something reads it (epic `data` P30).
   * - An address or `{ name, url }`.  A thing is the thing, so a field set to one reads at once.
   * - Waits as a value does:  in a drawing, the nearest "…" or `while waiting:`.  Once it's known, it answers at once.
   * - Each read of it holds what it follows, so a drawing leaving stops its requests.
   * - throws what the read threw, which an `if that fails:` catches
   */
  linked(thing: unknown, name: string, Class: Function): unknown {
    const owner = thing as Thing
    const program = programPlaces()
    const saved = Class as SavedClass
    const read = () => (owner as unknown as { getProp(field: string): unknown }).getProp(name)
    const held = read()
    // what's only being shown or read in isn't asking for it:  an element mirroring its thing, a row changing it
    if (isOnlyShowing() || isWhileReading()) return held
    const addresses = (): string[] | undefined => {
      const now = read()
      if (!(now instanceof List)) return undefined
      return now.items.flatMap((item) => addressIn(item) ?? [])
    }
    // a list the place keeps under this thing, at an address of its own:  a post's comments
    const under = program.addressUnder(owner, name)
    if (under !== undefined) {
      return core.waitedValue(owner, name, () => savedMethods.savedThings(saved, { under }))
    }
    if (held instanceof List) {
      const said = addresses()!
      if (!said.length) return held
      const known = said.map((address) => program.linkKnown(saved, address))
      if (known.every((one) => one !== undefined)) {
        const things = known.filter(Boolean)
        return untrackCells(() => program.linkedList(owner, name, said, things))
      }
      for (const address of said) program.holdLink(saved, address)
      return core.waitedValue(owner, name, async () => {
        const now = addresses() ?? []
        try {
          const things = await Promise.all(now.map((address) => program.follow(saved, address)))
          return program.linkedList(owner, name, now, things.filter(Boolean))
        } catch (error) {
          if (isAbandoned(error)) forgetWaitedValue(owner, name)
          throw error
        }
      })
    }
    const address = addressIn(held)
    if (address === undefined) return held
    const known = program.linkKnown(saved, address)
    if (known !== undefined) return known ?? undefined
    program.holdLink(saved, address)
    return core.waitedValue(owner, name, async () => {
      const now = addressIn(read())
      try {
        return now === undefined ? undefined : await program.follow(saved, now)
      } catch (error) {
        if (isAbandoned(error)) forgetWaitedValue(owner, name)
        throw error
      }
    })
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
   * - Nothing is nothing:  a view's `its draft`, before it has its thing (epic `data` T135).
   * - throws `TypeError` for a thing kept in no place, or read from none yet
   */
  draftOf<T>(thing: T): T {
    if (thing == null) return thing
    const things = programPlaces().thingMakerNow
    if (!things)
      throw new TypeError("core.draftOf():  nothing's been read from a place yet, so this thing isn't kept in one")
    return things.draftOf(thing as unknown as Thing).thing as unknown as T
  },

  /** Send what's changed in `copy`, a draft:  one group, shown at once.  What `save the draft` compiles to.  - throws for anything else */
  saveDraft(copy: unknown): void {
    draftOfCopy(copy, "saveDraft").save()
  },

  /** Forget what's changed in `copy`, a draft:  nothing had left.  What `discard the draft` compiles to.  - throws for anything else */
  discardDraft(copy: unknown): void {
    draftOfCopy(copy, "discardDraft").cancel()
  },

  /**
   * Run `run`, its changes to each place one group:  what `in one go:` compiles to.
   * - Held until it ends, then sent together;  it throws, and they're dropped, and put back.
   * - As true as the place can make it:  a place that isn't `atomic` sends them one by one (the compiler says so).
   * - One undo step, too (epic `data` I46):
   *   `remove favourites in every favourite where ...` removing five is one Undo.
   *   Inside an undoable action, it joins the action's step.
   * - throws what `run` threw
   */
  async inOneGo(run: () => unknown): Promise<void> {
    const program = programPlaces()
    const things = await program.thingMaker()
    const history = core.RUNTIME?.history
    await (history ? history.transaction("", () => things.inOneGroup(run)) : things.inOneGroup(run))
  },

  /** The person using the program:  what `them` compiles to.  With no sign-in, the name its server knows them by, else a guest. */
  currentPerson(): PersonHere {
    return programPlaces().person
  },

  /**
   * The person menu, for a program's own toolbar:  what `the sign in menu` compiles to.
   * - Who's signed in and the way in and out, where the bar above the app would show them.
   * - With no page, as under `spell run`:  nothing.
   */
  signInMenu(): HTMLElement | undefined {
    return signInMenu()
  },

  /**
   * Is `value` the person using the program:  what `its cook is them` compiles to.
   * - By their `id`:  what's saved of a person comes back a new object each time it's read.
   * - Or a text, their name or their id:  `its "cook" is text`, with `cook = their name`.
   */
  isCurrentPerson(value: unknown): boolean {
    const { person } = programPlaces()
    if (typeof value === "string") return value === person.name || value === person.id
    return (value as { id?: unknown } | undefined | null)?.id === person.id
  },

  /**
   * Everyone here, this page included:  what `everyone here` compiles to.
   * - The same list each time, its items changing as people come and go:  what draws it follows them.
   * - Asking starts following the program's first place that has people, connecting to it.  With none:  only you.
   */
  peopleHere(): List<PersonHere> {
    return programPlaces().peopleHere as List<PersonHere>
  },

  /**
   * Ask the place again:  every read of `Class`, or of them all.  What `reload the recipes` and `try again` compile to.
   * - Past any copy kept on this device:  the server, whatever the copy says.
   * - NEVER throws
   */
  reloadSaved(Class?: Function): Promise<void> {
    return programPlaces().reload(Class as SavedClass | undefined)
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
   * The program's places, and the things made from their rows:  for the editor's side bar (epic `editor` P26).
   * - `undefined` until the program names a place and its folder has loaded, and while no program runs.
   * - The core's own helper (`_`):  compiled code never calls it.
   */
  _placesNow(): { places: Places; things: PlaceThings } | undefined {
    // nothing running:  no program, so no places
    if (!core.RUNTIME) return undefined
    const program = programPlaces()
    const { placesNow: places, thingMakerNow: things } = program
    return places && things ? { places, things } : undefined
  },

  /**
   * What makes a sample's records from what a type declares, by the type's name:  for `useSample()`'s `rowsFromType`.
   * - Loads `placeSamples.ts` the first time:  a program that never swaps in a sample never loads it.
   * - throws `TypeError` before the program has named a place
   */
  async _sampleRowsMaker(): Promise<(type: string) => PlaceRow[] | undefined> {
    const things = programPlaces().thingMakerNow
    if (!things) throw new TypeError("core._sampleRowsMaker():  the program names no place yet")
    const { rowsMadeFrom } = await import("./placeSamples")
    return (type) => rowsMadeFrom(things.classNamed(type) as Function | undefined)
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
    const items = () => {
      const list = current() as { items?: readonly Item[] } | readonly Item[] | undefined
      return (
        Array.isArray(list) ? list : ((list as { items?: readonly Item[] } | undefined)?.items ?? [])
      ) as readonly Item[]
    }
    const drawn = () => {
      if (!drawEach) return current() as Drawing
      // made once, so a change to the list keeps what's drawn:  typing in a recipe keeps its input
      const more = () => MORE_PAGES.get(current() as object)
      const paging = riders.paging?.()
      const atOnce = riders.pageSize?.() ?? MOST_AT_ONCE
      const around = elementOf(riders.items?.())
      const row = around?.firstElementChild ?? undefined
      const drawItem = (item: Item, position: () => number) => {
        const drawing = drawEach(item, position() + 1)
        return row ? rowOf(row, drawing) : drawing
      }
      const paged = paging === "pages" ? drawnInPages({ items, drawItem, more, atOnce }) : undefined
      const list = paged
        ? paged.list
        : paging === "all"
          ? (createComponent(
              For as never,
              {
                get each() {
                  return items()
                },
                children: drawItem
              } as never
            ) as JSX.Element)
          : drawnInWindow({
              items,
              drawItem,
              // the same read draws the same list, so coming back finds it as it was
              key: () => {
                const list = current()
                return list instanceof List ? list : undefined
              },
              more,
              atOnce
            })
      if (row) {
        row.remove()
        keepHeaderRow(row, around!, items)
      }
      const inside = around ? drawnIn(around, list) : list
      // the pager comes AFTER what's around the items:  never one more card, or a row of the table
      const shown = paged ? ([inside, paged.pager] as unknown as JSX.Element) : inside
      const isEmpty = createMemo(() => !items().length)
      return (() => (isEmpty() ? (riders.none?.() ?? null) : shown)) as unknown as Drawing
    }
    const whileLoading = riders.waiting ?? (drawEach ? drawnLoader : undefined)
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
    const whole = createComponent(Errored, {
      // Solid hands the error as an accessor:  read as it was, it said "function () { [native code] }"
      fallback: (error: () => unknown) =>
        riders.failed
          ? riders.failed()
          : failedDrawing(error(), riders.failedSay ? `${riders.failedSay()}` : undefined),
      get children() {
        return body()
      }
    }) as Drawing
    const section = elementOf(riders.whole?.())
    return section ? (drawnIn(section, whole as JSX.Element) as Drawing) : whole
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

/** What a list shows while it waits, when nothing said what to. */
function drawnLoader(): Drawing {
  return h("ui-loader", { visible: true, inline: true }) as unknown as Drawing
}

/**
 * What a drawing of one element made:  `h()` hands back a function that makes it, called here.
 * - Only for markup a rider names, `<ui-cards>`:  never a value that changes, which a function would follow.
 */
function made(drawing: unknown): unknown {
  let value = drawing
  while (typeof value === "function") value = (value as () => unknown)()
  return value
}

/** The element a rider's markup made, or `undefined`. */
function elementOf(drawing: unknown): Element | undefined {
  const value = made(drawing)
  return value instanceof Element ? value : undefined
}

/** `drawing`, inside `element`:  what's around a list's items, or its section. */
function drawnIn(element: Element, drawing: JSX.Element): JSX.Element {
  insert(element, () => drawing)
  return element as unknown as JSX.Element
}

/** One item of a table:  its cells, in a copy of the row in `table`. */
function rowOf(row: Element, cells: Drawing): JSX.Element {
  const drawn = row.cloneNode(false) as Element
  insert(drawn, made(cells) as JSX.Element)
  return drawn as unknown as JSX.Element
}

/**
 * A table of items keeps a header row, made from what the cells of its first row are named.
 * - `<cell "Name" align="right">` is `<ui-cell data-column="Name" align="right">`:
 *   its heading is `Name`, lined up as its column is.
 * - Made AFTER the rows are on the page, each time the list changes, and only when it's missing (I88):
 *   a row's cells are `h()`s, which make their elements when the row is inserted,
 *   and that waits while anything on the page does.
 *   So looking for them as the row was made found none on a read that waited:  no header, or one only once more rows came.
 */
function keepHeaderRow(row: Element, table: Element, items: () => readonly unknown[]): void {
  createEffect(
    () => items().length,
    () => {
      if (table.querySelector(`:scope > [${HEADER_ROW}]`)) return
      const first = [...table.children].find((child) => child.localName === row.localName)
      const named = first ? [...first.children].filter((cell) => cell.hasAttribute(COLUMN_NAME)) : []
      if (!named.length) return
      const header = row.cloneNode(false) as Element
      header.setAttribute("header", "")
      header.setAttribute(HEADER_ROW, "")
      for (const cell of named) {
        const title = document.createElement(cell.localName)
        title.textContent = cell.getAttribute(COLUMN_NAME)
        const align = cell.getAttribute("align")
        if (align) title.setAttribute("align", align)
        header.append(title)
      }
      table.prepend(header)
    }
  )
}

/**
 * A list drawn a page at a time, with Previous and Next:  `paging="pages"`.
 * - A page holds `atOnce`:  `MOST_AT_ONCE`, unless the program says (`show them 12 at a time`).
 * - Next at the end of what's read asks a place for its next page.
 * - Hands back the page's items and the pager apart:  the caller draws the pager AFTER what's around the items
 *   (`<ui-cards>`, `<ui-table>`), so it's never one of them.
 */
function drawnInPages<Item>({
  items,
  drawItem,
  more,
  atOnce
}: {
  items: () => readonly Item[]
  drawItem: (item: Item, position: () => number) => JSX.Element
  more: () => MorePages | undefined
  atOnce: number
}): { list: JSX.Element; pager: JSX.Element } {
  const pageChanged = new Cell()
  let page = 0
  const pageNow = () => {
    pageChanged.read()
    return page
  }
  const goTo = (to: number) => {
    page = to
    pageChanged.changed()
  }
  const lastDrawn = () => (pageNow() + 1) * atOnce
  const hasNext = () => items().length > lastDrawn() || !!more()?.hasMorePages
  const next = async () => {
    if (items().length <= lastDrawn()) await more()?.readNextPage()
    if (items().length > lastDrawn()) goTo(page + 1)
  }
  const list = createComponent(
    For as never,
    {
      get each() {
        return items().slice(pageNow() * atOnce, lastDrawn())
      },
      children: (item: Item, position: () => number) => drawItem(item, () => pageNow() * atOnce + position())
    } as never
  ) as JSX.Element
  const pager = h(
    "ui-stack",
    { direction: "horizontal", justify: "center", align: "center" },
    h("ui-button", { disabled: () => !pageNow(), onClick: () => goTo(page - 1) }, core.message("page-previous")),
    h("ui-text", () => core.message("page-number", { page: pageNow() + 1 })),
    h("ui-button", { disabled: () => !hasNext(), onClick: () => void next() }, core.message("page-next"))
  )
  return { list, pager: (() => (hasNext() || pageNow() ? pager : null)) as unknown as JSX.Element }
}

/** What a cell's column is called, on the cell:  `<cell "Name">`. */
const COLUMN_NAME = "data-column"

/** The mark on the header row a table of items makes. */
const HEADER_ROW = "data-header-row"

/**
 * What shows when a read failed, and nothing drew its own:  a message, and Try again.
 * - `said`:  the program's own words for it, `failed="..."`;  else the core's, with why.
 * - A read that was only too soon -- a rate limit, a server busy (`waitAfter()`) -- is no mistake of the reader's
 *   (epic `data` I92):  a quiet warning, saying when to try again where the server says;  any other, red.
 */
function failedDrawing(error: unknown, said?: string): Drawing {
  const wait = waitAfter(error)
  const message = said ?? (wait === undefined ? core.message("read-failed", { why: whyOf(error) }) : tooSoon(wait))
  const button = h(
    "ui-button",
    {
      onClick: () => void savedMethods.reloadSaved(),
      ...(wait !== undefined && { size: "small", appearance: "basic" })
    },
    core.message("write-retry")
  )
  const look = wait === undefined ? { color: "red" } : { state: "warning", size: "small" }
  return h("ui-message", look, message, button) as unknown as Drawing
}

/** What a failure says of itself. */
function whyOf(error: unknown): string {
  return typeof error === "string" ? error : `${(error as Error)?.message ?? error}`
}

/** "Try again in a minute", for a read that was too soon:  `wait`, in ms, `0` when the server didn't say. */
function tooSoon(wait: number): string {
  const seconds = Math.ceil(wait / 1000)
  if (!seconds) return core.message("read-too-soon")
  if (seconds < 60) return core.message("read-too-soon-seconds", { seconds: `${seconds}` })
  if (seconds < 120) return core.message("read-too-soon-minute")
  return core.message("read-too-soon-minutes", { minutes: `${Math.ceil(seconds / 60)}` })
}

/** The answers that mean "too soon:  ask again later":  a rate limit, a server busy or slow to answer. */
const TOO_SOON_STATUSES = new Set([408, 425, 429, 503])

/**
 * How long until a read that failed may be asked again, if it failed only for being too soon:
 * - a 429 (and a 408, 425, 503), or a 403 whose rate limit says no requests are left, GitHub's way
 * - its wait in ms:  the answer's `retry-after`, else when its rate limit resets;  `0` when it says neither
 * - `undefined` for any other failure, or one with no answer at all
 * - Reads the answer the error holds (`spell/util`'s `ApiError`), by its shape:  places are a chunk of their own.
 */
export function waitAfter(error: unknown, now = Date.now()): number | undefined {
  const response = responseOf(error)
  if (!response) return undefined
  const { status, headers } = response
  if (!TOO_SOON_STATUSES.has(status) && !(status === 403 && rateLimitLeft(headers) === 0)) return undefined
  const resetAt = rateLimitResetAt(headers, now)
  return retryAfter(response) ?? (resetAt === undefined ? 0 : Math.max(0, resetAt - now))
}

/** The server's answer a failure holds, if it holds one:  its own `response`, or its cause's. */
function responseOf(error: unknown): Response | undefined {
  const holders = [error, (error as { cause?: unknown } | undefined)?.cause]
  for (const holder of holders) {
    const response = (holder as { response?: unknown } | undefined)?.response
    if (response && typeof (response as Response).status === "number" && (response as Response).headers)
      return response as Response
  }
  return undefined
}
