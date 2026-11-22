import type { JSX } from "@solidjs/web"
import { For, Show } from "solid-js"

import {
  AtProtoPlace,
  DevicePlace,
  GraphPlace,
  LiveRoomPlace,
  Places,
  PlaceError,
  isListPosition,
  positionBetween,
  RemotePlace,
  RestPlace,
  rowsInPlace,
  SheetPlace,
  writeAnswerFor,
  type ListPosition,
  type ListQuery,
  type PendingChanges,
  type Place,
  type PlaceConflict,
  type PlaceLostText,
  type PlaceResult,
  type PlaceRow,
  type PlaceRowsChange,
  type PlaceThingDeleted,
  type PlaceWriteFailure
} from "spell/places"
import { useRealPlace, useSample } from "spell/places/SamplePlace"
import { pollWhileVisible } from "spell/util/polling"
import { FakeSignIn } from "spell/server/test/FakeSignIn"
import { E } from "spell/ui/core"

import { recipeBoxVocabulary } from "./RecipeBox.en"

import recipeBoxCSS from "./RecipeBox.css?inline"

/** Where `scripts/recipe-servers.ts` listens:  `?servers=` when it's on another port. */
const SERVERS = new URLSearchParams(location.search).get("servers") ?? "http://127.0.0.1:4791"

/** Where its fake of AT Protocol's network listens:  the next port. */
const FAKE_ATMOSPHERE = SERVERS.replace(/\d+$/, (port) => `${Number(port) + 1}`)

/**
 * The token the demo's place server wants:  a real page has its own server's (`window.SPELL_SERVER.token`), but this
 * page is served by another one, and that server holds no keys.
 */
const DEMO_TOKEN = "recipe-box-demo"

/** How often it asks whether anyone else changed anything, in seconds. */
const POLL_SECONDS = 5

/**
 * Each back-end, by its name:  this much is all that differs, so `back-end="graphql"` is the one line that changes.
 * - REST says versions, so a clash merges per field, with a notice.
 * - GraphQL says none:  the last save wins that field.
 *   - Both are one CSV file on the servers, so `graphql` has the same recipes as `rest`.
 * - A folder is only reachable through a server side, `RemotePlace`:  it has versions, so a clash merges per field.
 *   - A room's referee keeps its recipes in that same folder.
 * - A sheet is a CSV file at an address (`sheet`), read only, with no server of ours:  this page's own, or a Google Sheet
 *   shared with "anyone with the link".
 *   - `sheet-no-id`:  the same file, with nothing saying which row is which.
 * - `sheet-server`:  the servers' own CSV file with a place server in front (`CsvPlace`), so it takes writes:  each save changes only
 *   the lines that changed, and it reads as a position, so a recipe can move.
 * - A Google Sheet to write to goes through a server side, which holds its key:  the last save wins each cell.
 * - `airtable`:  an Airtable base through a server side, which holds its key:  a stub of Airtable, or your own (`AIRTABLE_BASE`):  the last save wins each field.
 * - This device needs no server, and only this browser ever sees them.
 * - A room has a referee putting everyone's changes in one order, over a websocket:  so nothing polls, and it heals itself.
 * - `atmosphere`:  each person's own records, on their own host, put together, on `FakeAtmosphere`:  no real account.  Sign in as `alice.test` or `bob.test`.
 * - `atmosphere-real`:  the real network, and a real sign-in:  your own account's records, which are public.  Manual test M3.
 */
const BACK_ENDS: Record<string, (sheet: string) => Place> = {
  sheet: (url) => new SheetPlace({ url, collection: COLLECTION, idColumn: "id", numbers: ["servings"] }),
  "sheet-no-id": (url) => new SheetPlace({ url, collection: COLLECTION, numbers: ["servings"] }),
  "sheet-server": () =>
    new RemotePlace({ url: `${SERVERS}/api/places/recipes-csv`, token: DEMO_TOKEN, can: { kind: "sheet", atomic: true } }),
  "google-sheet": () =>
    new RemotePlace({
      url: `${SERVERS}/api/places/google-sheet`,
      token: DEMO_TOKEN,
      can: { atomic: true, versionCheck: false }
    }),
  airtable: () =>
    new RemotePlace({
      url: `${SERVERS}/api/places/airtable`,
      token: DEMO_TOKEN,
      can: { kind: "airtable", versionCheck: false }
    }),
  rest: () =>
    new RestPlace({
      url: SERVERS,
      collections: { recipes: { fields: { title: "name" } } },
      versions: { field: "version" }
    }),
  folder: () => new RemotePlace({ url: `${SERVERS}/api/places/recipes`, token: DEMO_TOKEN }),
  room: () => new LiveRoomPlace({ url: `${SERVERS}/api/rooms/recipes`, token: DEMO_TOKEN }),
  graphql: () =>
    new GraphPlace({
      url: `${SERVERS}/graphql`,
      collections: {
        recipes: {
          list: "recipes",
          one: "recipe",
          paging: "connection",
          fields: ["id", "title: name", "cuisine", "servings", "notes"],
          insert: { mutation: "addRecipe", input: "RecipeInput!" },
          update: { mutation: "changeRecipe", id: "ID!", input: "RecipePatch!" },
          delete: { mutation: "removeRecipe", id: "ID!" }
        }
      }
    }),
  device: () => new DevicePlace({ wholeRows: true }),
  atmosphere: () =>
    new AtProtoPlace({
      kind: "personal atmosphere account",
      collections: { recipes: "com.example.recipe" },
      signIn: new FakeSignIn(FAKE_ATMOSPHERE),
      network: {
        directory: FAKE_ATMOSPHERE,
        relay: FAKE_ATMOSPHERE,
        handles: FAKE_ATMOSPHERE,
        stream: FAKE_ATMOSPHERE.replace(/^http/, "ws")
      }
    }),
  "atmosphere-real": () =>
    new AtProtoPlace({ kind: "personal atmosphere account", corner: "app.spell.demo", findsAccounts: false })
}

/** The one collection it shows. */
const COLLECTION = "recipes"

/** The field a recipe's place in the list is kept in, in a room or a CSV file:  its parent and its position, as one. */
const PLACE_FIELD = "place"

/** What every recipe in a room is in. */
const THE_BOX = "box"

/** What the page says it's kept in. */
const BACK_END_NAMES: Record<string, string> = {
  rest: "a CSV file, through REST",
  graphql: "a CSV file, through GraphQL",
  device: "this browser",
  atmosphere: "each person's own account (a fake network)",
  "atmosphere-real": "your own atmosphere account, where it's public",
  folder: "a folder of files",
  room: "a folder of files, through a room",
  sheet: "a CSV file",
  "sheet-no-id": "a CSV file, with no id column",
  "sheet-server": "a CSV file, through its place server",
  "google-sheet": "a Google Sheet",
  airtable: "an Airtable base"
}

/** The file it reads for a sheet, unless it's told another:  the one beside this page. */
const SHEET_FILE = "recipes.csv"

/** What needs `scripts/recipe-servers.ts` running:  a CSV file doesn't. */
const NEEDS_THE_SERVERS = new Set(["rest", "graphql", "folder", "google-sheet", "airtable", "room", "sheet-server", "atmosphere"])

/** What each back-end's read asks for:  a folder's list holds no notes, so it has to say, and that's when its bodies are read. */
const READ_QUERIES: Record<string, ListQuery> = { folder: { select: ["title", "cuisine", "servings", "notes"] } }

/** Something to tell the person, with what they can do about it. */
type Notice = {
  /** Tells it apart. */
  key: number
  /** What it's about:  a new one about the same thing replaces it. */
  about?: string
  /** The words. */
  text: string
  /** What's on its button, if it has one. */
  action?: string
  /** What its button does. */
  click?: () => void
}

/****************
 * ### `RecipeBox`
 * The component behind `<recipe-box>`, the data epic's demo:  recipes in a place, and nothing about the server but `BACK_ENDS`.
 * - One read (`PlaceResult`), asked again every few seconds while the page shows (`pollWhileVisible()`).
 * - A place that takes no writes shows as text, with nothing to press:  it asks the place (`writeAnswerFor()`), never which back-end it is.
 * - What a read says about its rows (`PlaceResult.notes`) is shown as it is.
 * - Every write goes through `PendingChanges`:  shown at once, sent soon, in order.
 * - In a room nothing polls:  what others do arrives (`PlaceHeal.follow()`), and it can add to a number, move a recipe,
 *   and say when someone deleted what you're changing.
 * - Use a sample:  editable records in place of the place, with nothing above it changed, and nothing reaching the place
 *   (`useSample()`).  It's what the editor's side bar will offer, for a read-only or slow place.
 * - A GUIDE-ONLY element:  built into `recipe-box.bundle.js` by `epic/src/tools/bundle-experiment.ts`, on the page's Spell UI.
 ****************/
export class RecipeBox extends E.UIComponent<typeof recipeBoxVocabulary> {
  @E.proto static vocabulary = recipeBoxVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { recipeBox: recipeBoxCSS }
  } satisfies Partial<E.ElementSetup>

  /** Every recipe showing. */
  @E.state accessor recipes: PlaceRow[] = []
  /** Where saving stands, in words. */
  @E.state accessor saving = ""
  /** What's being said to the person. */
  @E.state accessor notices: Notice[] = []
  /** The new recipe's title, as it's typed. */
  @E.state accessor newTitle = ""
  /** Will the place take a change?  Asked once, of what it says it can do. */
  @E.state accessor canWrite = true
  /** What the last read said about its rows. */
  @E.state accessor notes: readonly string[] = []
  /** Is it a room? */
  @E.state accessor isLive = false
  /** In a room:  is it connected? */
  @E.state accessor isInTheRoom = false
  /** In a room:  how the last heal went, in words. */
  @E.state accessor lastHeal = ""
  /** Is a sample in use? */
  @E.state accessor isSample = false
  /** Has a read answered yet?  Before that, no recipes means nothing yet, not none. */
  @E.state accessor hasRead = false
  /** Where a person's sign-in stands, in words:  `""` for a place with none. */
  @E.state accessor signInWords = ""
  /** Is someone signed in? */
  @E.state accessor isSignedIn = false
  /** Who's signing in, as it's typed. */
  @E.state accessor signInName = ""

  /** The list of places:  one here, under the name `recipes`. */
  private places: Places | undefined
  /** The one read. */
  private result: PlaceResult | undefined
  /** How many notices there have been. */
  private noticesMade = 0
  /** What's being said about the last read that failed:  taken back when one works. */
  private readFailure: string | undefined

  ////////////////
  // ## Which back-end
  ////////////////

  /** Which back-end:  the page's address says, else `back-end`. */
  private get backEndName(): string {
    const named = new URLSearchParams(location.search).get("back-end") ?? this.backEnd ?? "rest"
    return named in BACK_ENDS ? named : "rest"
  }

  /** How often it asks again, in seconds:  the page's address can say, as frames side by side want it sooner. */
  private get pollSeconds(): number {
    return Number(new URLSearchParams(location.search).get("poll")) || POLL_SECONDS
  }

  /** The CSV file a sheet reads:  the page's address says, else `sheet`, else the one beside this page. */
  private get sheetAddress(): string {
    const named = new URLSearchParams(location.search).get("sheet") ?? this.sheet ?? SHEET_FILE
    return new URL(named, location.href).href
  }

  ////////////////
  // ## Reading
  ////////////////

  /** Start on connecting, and stop reading on leaving. */
  @E.whileConnected
  protected startReading() {
    const name = this.backEndName
    const place = BACK_ENDS[name]!(this.sheetAddress)
    this.canWrite = writeAnswerFor(place, { collection: COLLECTION }).canWrite
    const places = new Places({ keepPendingAs: `recipe-box-${name}` }).add(COLLECTION, place)
    const query = READ_QUERIES[name]
    const result = places.read({ placeName: COLLECTION, collection: COLLECTION, ...(query && { query }) })
    this.places = places
    this.result = result
    this.isLive = isRoom(place)
    const stops = [
      places.onRows((change) => this.rowsChanged(change)),
      places.onConflict((conflict) => this.merged(conflict)),
      places.onWriteFailed((failure) => this.refused(failure)),
      places.onLost((lost) => this.lost(lost)),
      places.onThingDeleted((deleted) => this.deleted(deleted)),
      () => this.stopHearingSaves?.(),
      ...(place instanceof LiveRoomPlace
        ? [
            places.heal.follow({ placeName: COLLECTION, collection: COLLECTION }),
            place.onConnection((isConnected) => this.connectionChanged(place, isConnected)),
            () => place.close()
          ]
        : place.describe().live === "push"
          ? [places.heal.follow({ placeName: COLLECTION, collection: COLLECTION })]
          : [pollWhileVisible(this.pollSeconds, () => this.readAgain())]),
      ...(place.signIn ? [place.signIn.onChange(() => this.signInChanged(place))] : [])
    ]
    if (place.signIn) {
      void (place as AtProtoPlace).signIn.ready.then(() => this.signInChanged(place))
      place.onPeopleHere?.(() => this.signInChanged(place))
    }
    this.hearSaves()
    void this.read(result.load())
    return () => {
      stops.forEach((stop) => stop())
      result.leave()
    }
  }

  /** Who's signed in changed:  what shows, whether it can be changed, and whose records show. */
  private signInChanged(place: Place): void {
    const { status, problem } = place.signIn!
    const name = place.currentPerson?.().name ?? ""
    this.isSignedIn = status === "signed in"
    this.signInWords = problem ? this.translationForKey("sign-in-failed", { why: problem }) : this.translationForKey(`sign-in-${status.replace(" ", "-")}` as "sign-in-signed-in", { name })
    this.canWrite = writeAnswerFor(place, { collection: COLLECTION }).canWrite
    void this.readAgain()
  }

  /** Sign in as whoever's named.  A failure shows as the sign-in says it. */
  private signIn(): void {
    const place = this.places!.placeForOrDie(COLLECTION)
    if (this.signInName.trim()) place.signIn?.signIn(this.signInName).catch(() => undefined)
  }

  /** Sign out. */
  private signOut(): void {
    void this.places!.placeForOrDie(COLLECTION).signIn?.signOut()
  }

  /** The changes on their way, for whichever place is behind the name:  a sample's are its own. */
  private get pending(): PendingChanges {
    return this.places!.pendingFor(COLLECTION)
  }

  /** Say where saving stands, for whichever place is behind the name. */
  private hearSaves(): void {
    this.stopHearingSaves?.()
    const { pending } = this
    this.stopHearingSaves = pending.onStateChange(() => (this.saving = pending.queue.text))
    this.saving = pending.queue.text
  }
  /** Stops `hearSaves()`. */
  private stopHearingSaves: (() => void) | undefined

  /** A sample in place of the real place, or the real place back:  nothing above this line knows. */
  private async toggleSample(): Promise<void> {
    const places = this.places!
    if (this.isSample) await useRealPlace(places, COLLECTION)
    else await useSample(places, COLLECTION)
    const place = places.placeForOrDie(COLLECTION)
    this.isSample = !!place.describe().isSample
    this.canWrite = writeAnswerFor(place, { collection: COLLECTION }).canWrite
    this.isLive = isRoom(place)
    this.hearSaves()
    const { contents, notes, loadError } = this.result!
    this.recipes = contents ?? []
    this.notes = notes
    if (loadError) this.readFailed(loadError)
  }

  /** Ask the place again:  a poll. */
  private readAgain(): Promise<void> {
    return this.read(this.result!.reload())
  }

  /** Show what a read brought:  a read that couldn't says so once, and what's showing stays. */
  private async read(reading: Promise<unknown>): Promise<void> {
    try {
      await reading
    } catch (error) {
      return this.readFailed(error)
    }
    const { contents, notes } = this.result!
    if (contents) this.recipes = contents
    this.notes = notes
    this.hasRead = true
    this.notices = this.notices.filter(({ text }) => text !== this.readFailure)
    this.readFailure = undefined
  }

  /** Say why a read failed, in place of why the last one did:  a place's own words, or "start the servers". */
  private readFailed(error: unknown): void {
    const onTheServers = NEEDS_THE_SERVERS.has(this.backEndName) || this.sheetAddress.startsWith(SERVERS)
    const needsServers = onTheServers && !(error instanceof PlaceError)
    const why = `${(error as Error).message}`
    const failure = needsServers ? this.translationForKey("no-server") : this.translationForKey("cant-read", { why })
    this.notices = this.notices.filter(({ text }) => text !== this.readFailure)
    this.readFailure = failure
    this.tellOnce(failure)
  }

  /** The room's connection went, or came back. */
  private connectionChanged(room: LiveRoomPlace, isConnected: boolean): void {
    this.isInTheRoom = isConnected
    this.noteHeal(room)
  }

  /** Say how the room's last heal went. */
  private noteHeal(room: LiveRoomPlace): void {
    const heal = room.heals.at(-1)
    if (heal) this.lastHeal = this.translationForKey("healed", { why: heal.why, ms: `${heal.ms}` })
  }

  /** Rows changed under what's showing:  a write, an answer, a heal. */
  private rowsChanged({ rows, idField, removed = [] }: PlaceRowsChange): void {
    const changed = new Map(rows.map((row) => [row[idField], row]))
    const kept = this.recipes
      .filter((recipe) => !removed.includes(`${recipe[idField] as string}`))
      .map((recipe) => {
        const row = changed.get(recipe[idField])
        changed.delete(recipe[idField])
        return row ? { ...recipe, ...row } : recipe
      })
    this.recipes = [...kept, ...changed.values()]
    const room = this.places?.placeFor(COLLECTION)
    if (room instanceof LiveRoomPlace) this.noteHeal(room)
  }

  /** Can a recipe move?  A room's can, and so can those of any place whose rows say their place in the list. */
  private get canMove(): boolean {
    return this.isLive || this.recipes.some((recipe) => isListPosition(recipe[PLACE_FIELD]))
  }

  /** The recipes, in the order they show:  by their place in the list, if they have one;  else newest first, as every other place adds at its end. */
  private get shownRecipes(): PlaceRow[] {
    return this.canMove ? rowsInPlace(this.recipes, PLACE_FIELD) : [...this.recipes].reverse()
  }

  ////////////////
  // ## Writing
  ////////////////

  /** `field` of `recipe` is now `value`:  shown at once, sent soon. */
  private setField(recipe: PlaceRow, field: string, value: unknown): void {
    const was = recipe[field]
    if (value === was) return
    this.pending.setField({ collection: COLLECTION, id: `${recipe.id as string}`, field, value, was })
  }

  /** Add what's been typed, under an id made here, at the top of the list if it's a room. */
  private addRecipe(): void {
    const title = this.newTitle.trim()
    if (!title) return
    const id = `r-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`
    const place = this.canMove ? { [PLACE_FIELD]: this.placeBetween(undefined, this.shownRecipes[0]) } : {}
    this.pending.insert({
      collection: COLLECTION,
      id,
      fields: { title, cuisine: "", servings: 2, notes: "", ...place }
    })
    this.newTitle = ""
  }

  /** A place in the list after `before`, and before `after`. */
  private placeBetween(before?: PlaceRow, after?: PlaceRow): ListPosition {
    const atOf = (row?: PlaceRow) => (row?.[PLACE_FIELD] as ListPosition | undefined)?.at
    return { parent: THE_BOX, at: positionBetween(atOf(before), atOf(after)) }
  }

  /** Move `recipe` up or down one:  a new place in the list for it, and nothing said about the others. */
  private move(recipe: PlaceRow, by: -1 | 1): void {
    const others = this.shownRecipes.filter((other) => other.id !== recipe.id)
    const at = this.shownRecipes.findIndex((other) => other.id === recipe.id) + by
    if (at < 0 || at > others.length) return
    this.setField(recipe, PLACE_FIELD, this.placeBetween(others[at - 1], others[at]))
  }

  /** One more serving, as an addition:  two people pressing it both count. */
  private addServing(recipe: PlaceRow): void {
    const id = `${recipe.id as string}`
    this.pending.addToField({
      collection: COLLECTION,
      id,
      field: "servings",
      by: 1,
      was: Number(recipe.servings) || 0
    })
  }

  /** Stop talking to the room, or start again:  for trying what being offline does. */
  private toggleConnection(): void {
    const room = this.places!.placeFor(COLLECTION) as LiveRoomPlace
    if (this.isInTheRoom) room.close()
    else room.connect()
  }

  /** It's gone, at once. */
  private removeRecipe(recipe: PlaceRow): void {
    this.recipes = this.recipes.filter((other) => other !== recipe)
    this.pending.delete({ collection: COLLECTION, id: `${recipe.id as string}` })
  }

  ////////////////
  // ## Telling the person
  ////////////////

  /** A merge kept this person's value:  it says what was lost. */
  private merged({ field, theirs, useTheirs }: PlaceConflict): void {
    const text = this.translationForKey("merged", { field, theirs: `${theirs as string}` })
    this.tell(text, this.translationForKey("use-theirs"), useTheirs)
  }

  /** Someone else's change replaced this person's long text:  it says what it was. */
  private lost({ id, field, mine, useMine }: PlaceLostText): void {
    const text = this.translationForKey("lost", { field, mine: `${mine as string}` })
    this.tell(text, this.translationForKey("use-mine"), useMine, `${id}/${field}`)
  }

  /** Someone else deleted what this person was changing. */
  private deleted({ row, restore }: PlaceThingDeleted): void {
    const text = this.translationForKey("deleted", { title: `${row.title as string}` })
    this.tell(text, this.translationForKey("restore"), restore, `${row.id as string}/deleted`)
  }

  /** The server said no. */
  private refused({ error, retry }: PlaceWriteFailure): void {
    this.tell(this.translationForKey("refused", { why: error.message }), this.translationForKey("retry"), retry)
  }

  /** Say `text`, unless it's being said. */
  private tellOnce(text: string): void {
    if (!this.notices.some((notice) => notice.text === text)) this.tell(text)
  }

  /** Say `text`, with a button;  `about`:  in place of what's being said about that. */
  private tell(text: string, action?: string, click?: () => void, about?: string): void {
    const notice: Notice = {
      key: ++this.noticesMade,
      text,
      ...(action && { action }),
      ...(click && { click }),
      ...(about && { about })
    }
    this.notices = [...this.notices.filter((other) => !about || other.about !== about), notice]
  }

  /** Stop saying `notice`. */
  private dismiss(notice: Notice): void {
    this.notices = this.notices.filter((other) => other !== notice)
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <div class="box" part={this.partForName("box")}>
        <div class="bar">
          <span>{this.translationForKey("stored-in", { backEnd: BACK_END_NAMES[this.backEndName]! })}</span>
          <Show when={this.canWrite} fallback={<ui-label size="small">{this.translationForKey("read-only")}</ui-label>}>
            <output>{this.saving}</output>
          </Show>
          <ui-button
            size="small"
            appearance="basic"
            part={this.partForName("sample")}
            onClick={() => void this.toggleSample()}
          >
            {this.translationForKey(this.isSample ? "use-real" : "use-sample")}
          </ui-button>
        </div>
        <Show when={this.signInWords}>
          <div class="bar room" part={this.partForName("sign-in")}>
            <span>{this.signInWords}</span>
            <Show
              when={this.isSignedIn}
              fallback={
                <>
                  <ui-input
                    size="small"
                    aria-label={this.translationForKey("sign-in-who")}
                    placeholder={this.translationForKey("sign-in-who")}
                    value={this.signInName}
                    onInput={(event: Event) => (this.signInName = (event.target as HTMLInputElement).value)}
                  />
                  <ui-button size="small" onClick={() => this.signIn()}>
                    {this.translationForKey("sign-in")}
                  </ui-button>
                </>
              }
            >
              <ui-button size="small" appearance="basic" onClick={() => this.signOut()}>
                {this.translationForKey("sign-out")}
              </ui-button>
            </Show>
          </div>
        </Show>
        <Show when={this.isSample}>
          <ui-message size="small" color="blue" part={this.partForName("using-sample")}>
            {this.translationForKey("using-sample", { backEnd: BACK_END_NAMES[this.backEndName]! })}
          </ui-message>
        </Show>
        <Show when={this.isLive}>
          <div class="bar room">
            <span part={this.partForName("connection")}>
              {this.translationForKey(this.isInTheRoom ? "online" : "offline")} <small>{this.lastHeal}</small>
            </span>
            <ui-button size="small" appearance="basic" onClick={() => this.toggleConnection()}>
              {this.translationForKey(this.isInTheRoom ? "go-offline" : "go-online")}
            </ui-button>
          </div>
        </Show>
        <For each={this.notes} keyed={(note: string) => note}>
          {(note) => (
            <ui-message size="small" part={this.partForName("note")}>
              {note()}
            </ui-message>
          )}
        </For>
        <For each={this.notices} keyed={(notice: Notice) => notice.key}>
          {(notice) => this.notice(notice())}
        </For>
        <Show when={this.canWrite}>
          <form
            class="adding"
            onSubmit={(event) => {
              event.preventDefault()
              this.addRecipe()
            }}
          >
            <ui-input
              placeholder={this.translationForKey("new-title")}
              value={this.newTitle}
              on-ui-typed={(event: CustomEvent<{ value: string }>) => (this.newTitle = event.detail.value)}
            />
            <ui-button color="primary" onClick={() => this.addRecipe()}>
              {this.translationForKey("add")}
            </ui-button>
          </form>
        </Show>
        <div class="recipes">
          <Show when={this.hasRead && !this.shownRecipes.length}>
            <p class="none" part={this.partForName("none")}>
              {this.translationForKey("no-recipes")}
            </p>
          </Show>
          <Show
            when={this.canWrite}
            fallback={
              <For each={this.shownRecipes} keyed={(recipe: PlaceRow) => recipe.id ?? recipe}>
                {(recipe) => this.recipeToRead(recipe)}
              </For>
            }
          >
            <For each={this.shownRecipes} keyed={(recipe: PlaceRow) => recipe.id ?? recipe}>
              {(recipe) => this.recipe(recipe)}
            </For>
          </Show>
        </div>
      </div>
    )
  }

  /**
   * One recipe:  each field a box to change it in.  `recipe` is an accessor:  the same box stays as it changes.
   * - Its title on a line, with what a room can do to it;  its servings and notes on the next:  so more of them fit in a frame.
   * - Remove is an `x` on the card's upper right corner:  never in reach of the line a person is typing on.
   */
  private recipe(recipe: () => PlaceRow): JSX.Element {
    const field = (name: string, key: "title" | "servings" | "notes", type = "text") => (
      <ui-input
        label={this.translationForKey(key)}
        type={type}
        value={`${recipe()[name] as string}`}
        on-ui-typed={(event: CustomEvent<{ value: string }>) => {
          const { value } = event.detail
          this.setField(recipe(), name, type === "number" ? Number(value) : value)
        }}
      />
    )
    return (
      <div class="recipe" part={this.partForName("recipe")} data-id={`${recipe().id as string}`}>
        <ui-button
          class="remove"
          part={this.partForName("remove")}
          size="mini"
          icon="close"
          title={this.translationForKey("remove")}
          aria-label={this.translationForKey("remove")}
          onClick={() => this.removeRecipe(recipe())}
        />
        <div class="title-line">
          {field("title", "title")}
          <Show when={this.canMove}>
            <div class="actions">
              <ui-button size="small" appearance="basic" onClick={() => this.move(recipe(), -1)}>
                {this.translationForKey("up")}
              </ui-button>
              <ui-button size="small" appearance="basic" onClick={() => this.move(recipe(), 1)}>
                {this.translationForKey("down")}
              </ui-button>
              <Show when={this.isLive}>
                <ui-button size="small" appearance="basic" onClick={() => this.addServing(recipe())}>
                  {this.translationForKey("one-more")}
                </ui-button>
              </Show>
            </div>
          </Show>
        </div>
        {field("servings", "servings", "number")}
        {field("notes", "notes")}
      </div>
    )
  }

  /** One recipe in a place that takes no changes:  to read, with nothing that looks as if it could be changed. */
  private recipeToRead(recipe: () => PlaceRow): JSX.Element {
    return (
      <article class="recipe to-read" part={this.partForName("recipe")} data-id={`${(recipe().id as string) ?? ""}`}>
        <h3>{`${recipe().title as string}`}</h3>
        <span class="serves">{this.translationForKey("serves", { servings: `${recipe().servings as string}` })}</span>
        <p>{`${recipe().notes as string}`}</p>
      </article>
    )
  }

  /** One notice. */
  private notice(notice: Notice): JSX.Element {
    return (
      <ui-message color="yellow">
        <p>{notice.text}</p>
        <Show when={notice.action}>
          <ui-button
            size="small"
            onClick={() => {
              notice.click!()
              this.dismiss(notice)
            }}
          >
            {notice.action}
          </ui-button>
        </Show>{" "}
        <ui-button size="small" appearance="basic" onClick={() => this.dismiss(notice)}>
          {this.translationForKey("dismiss")}
        </ui-button>
      </ui-message>
    )
  }
}

/** The vocabulary's attribute getters, typed:  `this.backEnd`. */
export interface RecipeBox extends E.AttributeValues<typeof recipeBoxVocabulary> {}

/** Does `place` keep everyone's changes in one order, so it can add to a number and move a recipe, as only a room can? */
function isRoom(place: Place): boolean {
  const { live, edits } = place.describe()
  return live === "push" && !!edits
}
