/**
 * `AtProtoPlace` against `FakeAtmosphere`:  real HTTP, real sockets, two hosts, nothing real to harm (epic `data` P16).
 * - The real network is the last test, and only with `ATMOSPHERE_REAL=1`:  it reads one public account, and signs in as nobody.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  AtProtoPlace,
  atProtoClientMetadata,
  DEFAULT_CORNER,
  MOST_ACCOUNTS,
  PlaceError,
  Places,
  writeAnswerFor,
  type AtProtoKind,
  type PlaceEvent,
  type PersonHere
} from "spell/util/places"
import { AtProtoSignIn } from "spell/util/places/AtProtoSignIn"
import { FakeAtmosphere } from "spell/server/test/fakeAtmosphere"
import { FakeSignIn } from "spell/server/test/FakeSignIn"

const NSID = "com.example.recipe"
const ALICE = "did:plc:alice"
const BOB = "did:plc:bob"
const COLLECTIONS = { recipes: NSID }

/** How long something may take to come round. */
const SOON = { timeout: 3000 }

/** The refusal `promise` ends in. */
async function refusalOf(promise: Promise<unknown>): Promise<PlaceError> {
  const error = await promise.then(
    () => undefined,
    (thrown: unknown) => thrown
  )
  expect(error).toBeInstanceOf(PlaceError)
  return error as PlaceError
}

describe("AtProtoPlace", () => {
  let network: FakeAtmosphere
  let signIn: FakeSignIn
  /** What stops when each test ends. */
  const stops: (() => void)[] = []

  /** A place, asking this network. */
  function place(kind: AtProtoKind = "personal atmosphere account", props: object = {}) {
    return new AtProtoPlace({
      kind,
      collections: COLLECTIONS,
      signIn,
      network: network.network,
      person: { id: "guest-1", name: "Guest 1" },
      ...props
    })
  }

  /** Every row, walking its pages. */
  async function allRows(from: AtProtoPlace) {
    const rows = []
    let at: string | undefined
    do {
      const answer = await from.list("recipes", at === undefined ? {} : { page: { at } }, {})
      rows.push(...answer.rows)
      at = answer.nextPage
    } while (at !== undefined)
    return rows
  }

  /** What `from` tells a watcher of the recipes. */
  function watched(from: AtProtoPlace): PlaceEvent[] {
    const events: PlaceEvent[] = []
    stops.push(from.watch({ collection: "recipes" }, (event) => events.push(event)))
    return events
  }

  beforeEach(async () => {
    network = await new FakeAtmosphere().start(["one", "two"])
    network.addAccount(ALICE, { handle: "alice.test", host: "one" })
    network.addAccount(BOB, { handle: "bob.test", host: "two" })
    signIn = new FakeSignIn(network.network.directory)
  })

  afterEach(async () => {
    stops.splice(0).forEach((stop) => stop())
    await network.close()
  })

  ////////////////
  // ## Reading
  ////////////////

  it("reads one account, in pages of 100, by asking its own host", async () => {
    for (let index = 0; index < 230; index++) {
      network.putRecord(ALICE, NSID, `r-${`${index}`.padStart(3, "0")}`, { title: `Recipe ${index}` })
    }
    const account = place("atmosphere account", { accounts: [ALICE] })

    const first = await account.list("recipes", {}, {})
    expect(first.rows).toHaveLength(100)
    expect(first.rows[0]).toEqual({ title: "Recipe 0", id: "r-000", owner: ALICE })
    expect(await allRows(account)).toHaveLength(230)
    const asks = network.asksOf("com.atproto.repo.listRecords")
    expect(new Set(asks.map(({ host }) => host))).toEqual(new Set(["one"]))
    expect(asks.every(({ params }) => Number(params.limit) <= 100)).toBe(true)
  })

  it("says it can't filter or sort, so the engine does, up to its ceiling", async () => {
    network.putRecord(ALICE, NSID, "r-1", { title: "Soup", minutes: 40 })
    network.putRecord(ALICE, NSID, "r-2", { title: "Dal", minutes: 20 })
    network.putRecord(BOB, NSID, "r-3", { title: "Tacos", minutes: 30 })
    const places = new Places().add("cookbook", place())

    const read = places.read({
      placeName: "cookbook",
      collection: "recipes",
      query: { filter: { minutes: 30 }, sort: [{ field: "title" }] }
    })
    await read.load()
    expect(read.contents?.map(({ title }) => title)).toEqual(["Tacos"])

    const capabilities = place().describe()
    expect(capabilities).toMatchObject({ filter: "none", sort: "none", select: "none", page: "cursor" })
    expect(capabilities).toMatchObject({ whoWrites: "only the owner", versionCheck: true, live: "push" })
    expect(capabilities.rateLimit?.changesPerRequest).toBe(200)
  })

  it("puts everyone's together, across hosts, with whoever the relay says holds it", async () => {
    network.putRecord(ALICE, NSID, "r-1", { title: "Alice's" })
    network.putRecord(BOB, NSID, "r-2", { title: "Bob's" })

    const rows = await allRows(place())
    expect(rows.map(({ title }) => `${title as string}`).sort((one, other) => one.localeCompare(other))).toEqual([
      "Alice's",
      "Bob's"
    ])
    expect(rows.find(({ title }) => title === "Bob's")?.owner).toBe(BOB)
    expect(new Set(network.asksOf("com.atproto.repo.listRecords").map(({ host }) => host))).toEqual(
      new Set(["one", "two"])
    )
  })

  it("fills a page from one account after another", async () => {
    for (const key of ["a", "b"]) network.putRecord(ALICE, NSID, `r-${key}`, { title: key })
    for (const key of ["c", "d", "e"]) network.putRecord(BOB, NSID, `r-${key}`, { title: key })
    const shared = place()

    const first = await shared.list("recipes", { page: { size: 3 } }, {})
    expect(first.rows).toHaveLength(3)
    const second = await shared.list("recipes", { page: { size: 3, at: first.nextPage! } }, {})
    expect(second.rows).toHaveLength(2)
    expect(second.nextPage).toBeUndefined()
  })

  it("reads only the accounts it's told, and whoever's signed in, when any are named", async () => {
    network.addAccount("did:plc:stranger", { handle: "stranger.test", host: "two" })
    network.putRecord(ALICE, NSID, "r-1", { title: "Alice's" })
    network.putRecord(BOB, NSID, "r-2", { title: "Bob's" })
    network.putRecord("did:plc:stranger", NSID, "r-3", { title: "A stranger's" })

    const family = place("personal atmosphere account", { accounts: [ALICE] })
    expect((await allRows(family)).map(({ title }) => title)).toEqual(["Alice's"])

    await signIn.signIn(BOB)
    expect((await allRows(family)).map(({ title }) => title)).toEqual(["Bob's", "Alice's"])
  })

  it("stops at the most accounts it will look through, and says so", async () => {
    for (let index = 0; index < MOST_ACCOUNTS + 5; index++) {
      const did = `did:plc:many${index}`
      network.addAccount(did, { handle: `many${index}.test`, host: "one" })
      network.putRecord(did, NSID, "r-1", { title: `${index}` })
    }
    const answer = await place().list("recipes", {}, {})
    expect(answer.notes?.join()).toContain(`first ${MOST_ACCOUNTS}`)
  })

  it("leaves out a person whose host is down, and says so;  with one account named, the read fails", async () => {
    network.putRecord(ALICE, NSID, "r-1", { title: "Alice's" })
    network.putRecord(BOB, NSID, "r-2", { title: "Bob's" })
    network.hostsDown.add("two")

    const shared = place()
    const notes: string[] = []
    let at: string | undefined
    const titles = []
    do {
      const answer = await shared.list("recipes", at === undefined ? {} : { page: { at } }, {})
      titles.push(...answer.rows.map(({ title }) => title))
      notes.push(...(answer.notes ?? []))
      at = answer.nextPage
    } while (at !== undefined)
    expect(titles).toEqual(["Alice's"])
    expect(notes.join()).toContain(BOB)

    const one = place("atmosphere account", { accounts: [BOB] })
    await expect(one.list("recipes", {}, {})).rejects.toThrow(/down/)
  })

  it("puts a collection under the corner when its line doesn't say", async () => {
    network.putRecord(ALICE, "com.example.cookbook.recipeNotes", "n-1", { text: "Salt" })
    const cornered = place("atmosphere account", {
      accounts: [ALICE],
      corner: "com.example.cookbook",
      collections: {}
    })
    expect((await cornered.list("recipe_notes", {}, {})).rows[0]?.text).toBe("Salt")

    network.putRecord(ALICE, `${DEFAULT_CORNER}.recipes`, "n-2", { text: "Pepper" })
    const bare = place("atmosphere account", { accounts: [ALICE], collections: {} })
    expect((await bare.list("recipes", {}, {})).rows[0]?.text).toBe("Pepper")

    const named = place("atmosphere account", {
      accounts: [ALICE],
      corner: "com.example.cookbook",
      collections: { recipes: "dish" }
    })
    network.putRecord(ALICE, "com.example.cookbook.dish", "n-3", { text: "Oil" })
    expect((await named.list("recipes", {}, {})).rows[0]?.text).toBe("Oil")
  })

  it("keeps two accounts' same key apart:  yours is plain, and theirs names them", async () => {
    network.putRecord(ALICE, NSID, "r-1", { title: "Mine" })
    network.putRecord(BOB, NSID, "r-1", { title: "Theirs, the same key" })
    await signIn.signIn(ALICE)

    const rows = await allRows(place())
    expect(rows.map(({ id }) => id)).toEqual(["r-1", `${BOB}/r-1`])
  })

  it("says a row's owner by where it came from:  a record can't claim another", async () => {
    network.putRecord(BOB, NSID, "r-1", { title: "Bob's", owner: ALICE, id: "not-its-id" })
    const [row] = await allRows(place())
    expect(row).toEqual({ title: "Bob's", owner: BOB, id: "r-1" })
  })

  ////////////////
  // ## Writing
  ////////////////

  it("makes a new record under the id the browser made, in the person's own account", async () => {
    await signIn.signIn(BOB)
    const answer = await place().apply(
      [{ kind: "insert", collection: "recipes", id: "r-made-here", fields: { id: "r-made-here", title: "New" } }],
      {}
    )
    expect(answer.rows[0]).toEqual({ title: "New", id: "r-made-here", owner: BOB })
    expect(network.recordsOf(BOB, NSID).get("r-made-here")?.value).toEqual({ title: "New", $type: NSID })
    expect(network.asksOf("com.atproto.repo.putRecord")[0]?.host).toBe("two")
  })

  it("makes a new record again, the same, when its answer was lost", async () => {
    await signIn.signIn(BOB)
    const shared = place()
    const change = { kind: "insert" as const, collection: "recipes", id: "r-1", fields: { title: "New" } }
    await shared.apply([change], {})
    await shared.apply([change], {})
    expect(network.recordsOf(BOB, NSID).size).toBe(1)
  })

  it("writes a record whole:  what's kept, with the changed fields on top", async () => {
    network.putRecord(ALICE, NSID, "r-1", { title: "Soup", minutes: 40 })
    await signIn.signIn(ALICE)
    const shared = place()
    await allRows(shared)

    await shared.apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { minutes: 45 } }], {})
    expect(network.recordsOf(ALICE, NSID).get("r-1")?.value).toEqual({ title: "Soup", minutes: 45, $type: NSID })
  })

  it("reads first what a change kept through a reload is about, so nothing's lost", async () => {
    network.putRecord(ALICE, NSID, "r-1", { title: "Soup", minutes: 40 })
    await signIn.signIn(ALICE)
    await place().apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { minutes: 45 } }], {})
    expect(network.recordsOf(ALICE, NSID).get("r-1")?.value).toMatchObject({ title: "Soup", minutes: 45 })
  })

  it("refuses to change someone else's, with no request", async () => {
    network.putRecord(BOB, NSID, "r-1", { title: "Bob's" })
    await signIn.signIn(ALICE)
    const shared = place()
    const [row] = await allRows(shared)

    expect(writeAnswerFor(shared, { collection: "recipes", row: row! })).toEqual({ canWrite: false, whyNot: "owner" })
    const update = { kind: "update" as const, collection: "recipes", id: "r-1", fields: { title: "Mine now" } }
    const refusal = await refusalOf(shared.apply([update], {}))
    expect(refusal.kind).toBe("refused")
    expect(refusal.cause?.whyNot).toBe("owner")
    const removal = { kind: "delete" as const, collection: "recipes", id: "r-1" }
    expect((await refusalOf(shared.apply([removal], {}))).cause?.whyNot).toBe("owner")
    expect(network.asksOf("com.atproto.repo.putRecord")).toEqual([])
    expect(network.asksOf("com.atproto.repo.deleteRecord")).toEqual([])
  })

  it("on one account, only that person writes", async () => {
    await signIn.signIn(BOB)
    const account = place("atmosphere account", { accounts: [ALICE] })
    expect(writeAnswerFor(account, { collection: "recipes" })).toEqual({ canWrite: false, whyNot: "owner" })
    const insert = { kind: "insert" as const, collection: "recipes", id: "r-1", fields: {} }
    expect((await refusalOf(account.apply([insert], {}))).cause?.whyNot).toBe("owner")
  })

  it("refuses a decimal number, saying so, as the protocol has none", async () => {
    await signIn.signIn(ALICE)
    const insert = { kind: "insert" as const, collection: "recipes", id: "r-1", fields: { cups: 1.5 } }
    const refusal = await refusalOf(place().apply([insert], {}))
    expect(refusal.message).toContain("whole numbers")
    expect(refusal.cause?.whyNot).toBe("field")
  })

  it("refuses an id that can't be a record's key", async () => {
    await signIn.signIn(ALICE)
    const insert = { kind: "insert" as const, collection: "recipes", id: "two words", fields: {} }
    expect((await refusalOf(place().apply([insert], {}))).message).toContain("can't be a record's key")
  })

  it("says out of date when another device got there first", async () => {
    network.putRecord(ALICE, NSID, "r-1", { title: "Soup" })
    await signIn.signIn(ALICE)
    const shared = place()
    await allRows(shared)
    const version = shared.versionOf("recipes", "r-1")!
    network.putRecord(ALICE, NSID, "r-1", { title: "Changed elsewhere" })

    const change = { kind: "update" as const, collection: "recipes", id: "r-1", fields: { title: "Mine" }, version }
    expect((await refusalOf(shared.apply([change], {}))).kind).toBe("out of date")
    expect(network.recordsOf(ALICE, NSID).get("r-1")?.value.title).toBe("Changed elsewhere")
  })

  it("a refused change heals as any does:  merged with the latest, and sent again", async () => {
    network.putRecord(ALICE, NSID, "r-1", { title: "Soup", minutes: 40 })
    await signIn.signIn(ALICE)
    const shared = place()
    const places = new Places().add("cookbook", shared)
    const read = places.read({ placeName: "cookbook", collection: "recipes" })
    await read.load()
    const pending = places.pendingFor("cookbook")

    network.putRecord(ALICE, NSID, "r-1", { title: "Soup", minutes: 90 })
    pending.setField({ collection: "recipes", id: "r-1", field: "title", value: "Better soup", was: "Soup" })
    await vi.waitFor(() => expect(network.recordsOf(ALICE, NSID).get("r-1")?.value.title).toBe("Better soup"), SOON)
    expect(network.recordsOf(ALICE, NSID).get("r-1")?.value.minutes).toBe(90)
    expect(network.asksOf("com.atproto.repo.getRecord").length).toBeGreaterThan(0)
  })

  it("takes several things all or nothing, in one applyWrites, checked first", async () => {
    network.putRecord(ALICE, NSID, "r-1", { title: "One" })
    network.putRecord(ALICE, NSID, "r-2", { title: "Two" })
    await signIn.signIn(ALICE)
    const shared = place()
    await allRows(shared)

    const answer = await shared.apply(
      [
        { kind: "insert", collection: "recipes", id: "r-3", fields: { title: "Three" } },
        {
          kind: "update",
          collection: "recipes",
          id: "r-1",
          fields: { title: "Uno" },
          version: shared.versionOf("recipes", "r-1")!
        },
        { kind: "delete", collection: "recipes", id: "r-2" }
      ],
      {}
    )
    expect(answer.rows.map(({ id }) => id)).toEqual(["r-3", "r-1"])
    const writes = network.asksOf("com.atproto.repo.applyWrites")
    expect(writes).toHaveLength(1)
    expect(writes[0]?.params.swapCommit).toBeDefined()
    expect([...network.recordsOf(ALICE, NSID).keys()].sort()).toEqual(["r-1", "r-3"])
    expect(shared.versionOf("recipes", "r-3")).toBe(network.recordsOf(ALICE, NSID).get("r-3")?.cid)
  })

  it("several things, one moved on:  none of it's made", async () => {
    network.putRecord(ALICE, NSID, "r-1", { title: "One" })
    network.putRecord(ALICE, NSID, "r-2", { title: "Two" })
    await signIn.signIn(ALICE)
    const shared = place()
    await allRows(shared)
    const [versionOne, versionTwo] = ["r-1", "r-2"].map((id) => shared.versionOf("recipes", id)!)
    network.putRecord(ALICE, NSID, "r-2", { title: "Moved on" })

    const refusal = await refusalOf(
      shared.apply(
        [
          { kind: "update", collection: "recipes", id: "r-1", fields: { title: "Uno" }, version: versionOne! },
          { kind: "update", collection: "recipes", id: "r-2", fields: { title: "Dos" }, version: versionTwo! }
        ],
        {}
      )
    )
    expect(refusal.kind).toBe("out of date")
    expect(network.recordsOf(ALICE, NSID).get("r-1")?.value.title).toBe("One")
    expect(network.asksOf("com.atproto.repo.applyWrites")).toEqual([])
  })

  it("several things sent again, the first answer lost:  no record's refused for being there", async () => {
    await signIn.signIn(ALICE)
    const shared = place()
    const changes = [
      { kind: "insert" as const, collection: "recipes", id: "r-1", fields: { title: "One" } },
      { kind: "insert" as const, collection: "recipes", id: "r-2", fields: { title: "Two" } }
    ]
    await shared.apply(changes, {})
    await shared.apply(changes, {})
    expect(network.recordsOf(ALICE, NSID).size).toBe(2)
  })

  ////////////////
  // ## Signing in
  ////////////////

  it("keeps a change pending with nobody signed in, and sends it once someone is", async () => {
    const shared = place()
    const places = new Places().add("cookbook", shared)
    const failures: unknown[] = []
    places.onWriteFailed((failure) => failures.push(failure))
    places.heal.follow({ placeName: "cookbook", collection: "recipes" })
    const insert = { kind: "insert" as const, collection: "recipes", id: "r-1", fields: { title: "Waiting" } }

    await expect(shared.apply([insert], {})).rejects.toThrow(/signed in/)
    places.pendingFor("cookbook").insert({ collection: "recipes", id: "r-1", fields: { id: "r-1", title: "Waiting" } })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(network.recordsOf(ALICE, NSID).size).toBe(0)

    await signIn.signIn(ALICE)
    await vi.waitFor(() => expect(network.recordsOf(ALICE, NSID).get("r-1")?.value.title).toBe("Waiting"), SOON)
    expect(failures).toEqual([])
  })

  it("says a sign-in has ended when a host says so, and what's being sent stays pending", async () => {
    await signIn.signIn(ALICE)
    const shared = place()
    network.sessionsOver.add(ALICE)
    const insert = { kind: "insert" as const, collection: "recipes", id: "r-1", fields: { title: "Late" } }

    await expect(shared.apply([insert], {})).rejects.not.toBeInstanceOf(PlaceError)
    expect(signIn.status).toBe("ended")
    expect(shared.currentPerson().id).toBe("guest-1")

    network.sessionsOver.delete(ALICE)
    await signIn.signIn(ALICE)
    await shared.apply([insert], {})
    expect(network.recordsOf(ALICE, NSID).size).toBe(1)
  })

  it("says who's at the page:  who's signed in, by their handle, else a guest", async () => {
    const shared = place()
    expect(shared.currentPerson()).toEqual({ id: "guest-1", name: "Guest 1", page: "guest-1" })
    await signIn.signIn(ALICE)
    await vi.waitFor(() => expect(shared.currentPerson().name).toBe("alice.test"), SOON)
    expect(shared.currentPerson()).toEqual({ id: ALICE, name: "alice.test", page: ALICE })
    await signIn.signOut()
    expect(shared.currentPerson().id).toBe("guest-1")
  })

  it("names someone by a handle only if the handle says the same:  anyone's document can claim one", async () => {
    await signIn.signIn(ALICE)
    network.accounts.get(BOB)!.handle = "alice.test"
    const shared = place()
    network.putRecord(BOB, NSID, "r-1", { title: "Bob's, claiming Alice's handle" })
    await allRows(shared)
    const seen: (readonly PersonHere[])[] = []
    stops.push(shared.onPeopleHere((people) => seen.push(people)))
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(shared.peopleHere().find(({ id }) => id === BOB)?.name).toBe(BOB)
  })

  it("says everyone here is everyone it's seen records from, and you first", async () => {
    network.putRecord(ALICE, NSID, "r-1", { title: "Alice's" })
    network.putRecord(BOB, NSID, "r-2", { title: "Bob's" })
    await signIn.signIn(BOB)
    const shared = place()
    const seen: (readonly PersonHere[])[] = []
    stops.push(shared.onPeopleHere((people) => seen.push(people)))
    await allRows(shared)
    await vi.waitFor(
      () => expect(shared.peopleHere().map(({ name }) => name)).toEqual(["bob.test", "alice.test"]),
      SOON
    )
    expect(seen.length).toBeGreaterThan(0)
  })

  it("makes the file a program's address has to serve", () => {
    const metadata = atProtoClientMetadata({
      origin: "https://cookbook.example",
      redirect: "https://cookbook.example/",
      name: "Cookbook"
    })
    expect(metadata.client_id).toBe("https://cookbook.example/oauth-client-metadata.json")
    expect(metadata.dpop_bound_access_tokens).toBe(true)
    expect(metadata.scope).toContain("atproto")
    expect(metadata.grant_types).toContain("authorization_code")
  })

  it("never loads the sign-in library for a page with nobody signed in", async () => {
    const signIn = new AtProtoSignIn()
    await signIn.ready
    expect(signIn.status).toBe("signed out")
    expect(signIn.did).toBeUndefined()
    expect(() => signIn.fetch("/xrpc/x")).toThrow(/nobody's signed in/)
  })

  ////////////////
  // ## Live
  ////////////////

  it("hears other people's changes from the stream:  new, changed and removed", async () => {
    network.putRecord(BOB, NSID, "r-1", { title: "Bob's" })
    const shared = place()
    await allRows(shared)
    const events = watched(shared)
    await new Promise((resolve) => setTimeout(resolve, 50))

    network.putRecord(BOB, NSID, "r-2", { title: "New" })
    await vi.waitFor(() => expect(events.at(-1)?.id).toBe("r-2"), SOON)
    expect(events.at(-1)?.row).toEqual({ title: "New", id: "r-2", owner: BOB })
    expect(events.at(-1)?.isMine).toBeUndefined()

    network.deleteRecord(BOB, NSID, "r-1")
    await vi.waitFor(() => expect(events.at(-1)?.id).toBe("r-1"), SOON)
    expect(events.at(-1)?.row).toBeUndefined()
    expect(events.at(-1)?.was?.title).toBe("Bob's")
  })

  it("knows its own change coming back", async () => {
    await signIn.signIn(ALICE)
    const shared = place()
    const events = watched(shared)
    await new Promise((resolve) => setTimeout(resolve, 50))

    await shared.apply([{ kind: "insert", collection: "recipes", id: "r-1", fields: { title: "Mine" } }], {})
    await vi.waitFor(() => expect(events.at(-1)?.isMine).toBe(true), SOON)
    await shared.apply([{ kind: "delete", collection: "recipes", id: "r-1" }], {})
    await vi.waitFor(() => expect(events.at(-1)?.row).toBeUndefined(), SOON)
    expect(events.at(-1)?.isMine).toBe(true)

    network.putRecord(ALICE, NSID, "r-2", { title: "My other device" })
    await vi.waitFor(() => expect(events.at(-1)?.id).toBe("r-2"), SOON)
    expect(events.at(-1)?.isMine).toBeUndefined()
  })

  it("asks the stream only for its collections, and for accounts when they're named", async () => {
    network.putRecord(ALICE, NSID, "r-0", { title: "Named" })
    network.putRecord(BOB, NSID, "r-9", { title: "Not named" })
    const family = place("personal atmosphere account", { accounts: [ALICE] })
    const events = watched(family)
    await new Promise((resolve) => setTimeout(resolve, 50))

    network.putRecord(BOB, NSID, "r-1", { title: "Not named" })
    network.putRecord(ALICE, "com.example.other", "x-1", { title: "Another collection" })
    network.putRecord(ALICE, NSID, "r-2", { title: "Named" })
    await vi.waitFor(() => expect(events.map(({ id }) => id)).toEqual(["r-2"]), SOON)
  })

  it("picks up where it stopped, when the stream drops", async () => {
    const shared = place()
    const events = watched(shared)
    let backs = 0
    stops.push(shared.onBack(() => backs++))
    await new Promise((resolve) => setTimeout(resolve, 50))
    network.putRecord(BOB, NSID, "r-1", { title: "Before" })
    await vi.waitFor(() => expect(events).toHaveLength(1), SOON)

    network.dropSockets()
    network.putRecord(BOB, NSID, "r-2", { title: "While it was gone" })
    await vi.waitFor(() => expect(events.map(({ id }) => id)).toContain("r-2"), { timeout: 5000 })
    expect(backs).toBe(1)
  })

  it("an event that comes twice is told once;  an older one can't undo a newer", async () => {
    const shared = place()
    const events = watched(shared)
    await new Promise((resolve) => setTimeout(resolve, 50))
    network.putRecord(BOB, NSID, "r-1", { title: "First" })
    await vi.waitFor(() => expect(events).toHaveLength(1), SOON)
    network.putRecord(BOB, NSID, "r-1", { title: "Second" })
    await vi.waitFor(() => expect(events).toHaveLength(2), SOON)

    network.dropSockets()
    await new Promise((resolve) => setTimeout(resolve, 1500))
    expect(events).toHaveLength(2)
    expect(events.at(-1)?.row?.title).toBe("Second")
  })

  it("with no stream says so:  a program asks again", () => {
    const quiet = new AtProtoPlace({
      kind: "personal atmosphere account",
      signIn,
      network: { ...network.network, stream: "" }
    })
    expect(quiet.describe().live).toBe("none")
    stops.push(quiet.watch({ collection: "recipes" }, () => undefined))
  })
})

/** The real network:  a read of one public account, with no account of anyone's, only when asked for. */
describe.runIf(process.env.ATMOSPHERE_REAL)("AtProtoPlace, on the real network", () => {
  /** bsky.app's own account:  public, and busy. */
  const REAL_ACCOUNT = "did:plc:z72i7hdynmk6r22z27h6tvur"
  let real: AtProtoPlace

  beforeAll(() => {
    const nobody = new FakeSignIn("")
    real = new AtProtoPlace({
      kind: "atmosphere account",
      accounts: [REAL_ACCOUNT],
      collections: { posts: "app.bsky.feed.post" },
      signIn: nobody
    })
  })

  afterAll(() => undefined)

  it("reads a page of a real public account, and the next", async () => {
    const first = await real.list("posts", { page: { size: 5 } }, {})
    expect(first.rows).toHaveLength(5)
    expect(first.rows[0]?.owner).toBe(REAL_ACCOUNT)
    expect(first.rows[0]?.text).toBeTypeOf("string")
    expect(first.nextPage).toBeDefined()
    const second = await real.list("posts", { page: { size: 5, at: first.nextPage! } }, {})
    expect(second.rows.map(({ id }) => id)).not.toContain(first.rows[0]?.id)
    expect(real.versionOf("posts", `${first.rows[0]?.id as string}`)).toMatch(/^bafy/)
  }, 30_000)

  it("hears the real stream", async () => {
    const events: PlaceEvent[] = []
    const everyone = new AtProtoPlace({
      kind: "personal atmosphere account",
      collections: { likes: "app.bsky.feed.like" },
      signIn: new FakeSignIn("")
    })
    const stop = everyone.watch({ collection: "likes" }, (event) => events.push(event))
    await vi.waitFor(() => expect(events.length).toBeGreaterThan(0), { timeout: 20_000 })
    stop()
    expect(events[0]?.row?.owner).toMatch(/^did:/)
  }, 30_000)
})
