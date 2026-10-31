import { generateKeyPairSync } from "node:crypto"
import { createServer } from "node:http"
import { afterEach, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"
import { GoogleSheetPlace, PlaceKeys, PlaceServer } from "spell/server/places"
import { DemoGuard } from "spell/server/test/recipeServers"
import { SheetsStub } from "spell/server/test/sheetsStub"
import { PlaceError, RemotePlace, type PlaceChange } from "spell/util/places"

/** What every test closes. */
const closing: (() => Promise<void>)[] = []

afterEach(async () => {
  await Promise.all(closing.splice(0).map((close) => close()))
})

/** A new key name each time:  a `RateQueue` is shared by name, and one test's waits are nobody else's. */
let keysMade = 0

/** The stub, one tab of recipes on it, and a place. */
async function sheet({ hasIds = true, key = true } = {}) {
  const stub = await new SheetsStub().start()
  closing.push(() => stub.stop())
  stub.tabs.set("recipes", {
    sheetId: 0,
    cells: [
      ["id", "title", "servings", "notes"],
      ["r-1", "Soup", 4, "Roast"],
      ["r-2", "Dal", 6],
      [],
      ["r-3", "Tacos", 4, ""]
    ]
  })
  stub.tabs.set("It's other", {
    sheetId: 7,
    cells: [
      ["id", "title"],
      ["o-1", "Other"]
    ]
  })
  const keyNamed = `KEY_${++keysMade}`
  const keys = new PlaceKeys({ names: [keyNamed], from: key ? { [keyNamed]: stub.keyFile } : {} })
  const place = new GoogleSheetPlace({
    spreadsheet: "the-sheet",
    keyNamed,
    keys,
    url: stub.url,
    tabs: { other: "It's other" },
    ...(hasIds && { idColumn: "id" })
  })
  return { stub, place, keys, keyNamed, cells: () => stub.tabs.get("recipes")!.cells }
}

/** A change to `recipes`. */
const change = (kind: PlaceChange["kind"], id: string, fields?: PlaceChange["fields"]): PlaceChange => ({
  kind,
  collection: "recipes",
  id,
  ...(fields && { fields })
})

describe("GoogleSheetPlace.list()", () => {
  test("a tab's rows, numbers as numbers, trailing blanks and blank rows as they should be", async () => {
    const { place, stub } = await sheet()
    const { rows, notes, handled } = await place.list("recipes", {}, {})
    expect(rows).toEqual([
      { id: "r-1", title: "Soup", servings: 4, notes: "Roast" },
      { id: "r-2", title: "Dal", servings: 6, notes: "" },
      { id: "r-3", title: "Tacos", servings: 4, notes: "" }
    ])
    expect(notes).toBeUndefined()
    expect(handled).toEqual({})
    expect(stub.tokensGiven).toBe(1)
  })

  test("one token, for many requests", async () => {
    const { place, stub } = await sheet()
    await place.list("recipes", {}, {})
    await place.list("recipes", {}, {})
    expect(stub.tokensGiven).toBe(1)
  })

  test("many requests at once ask for one token", async () => {
    const { place, stub } = await sheet()
    await Promise.all([place.list("recipes", {}, {}), place.list("recipes", {}, {})])
    expect(stub.tokensGiven).toBe(1)
  })

  test("a tab with a quote in its name, under another collection name", async () => {
    const { place } = await sheet()
    expect((await place.list("other", {}, {})).rows).toEqual([{ id: "o-1", title: "Other" }])
  })

  test("a tab that isn't there:  refused, since Google can't parse the range", async () => {
    const { place } = await sheet()
    await expect(place.list("nope", {}, {})).rejects.toMatchObject({ kind: "refused" })
  })

  test("a duplicate id:  a note, and it still reads", async () => {
    const { place, stub } = await sheet()
    stub.tabs.get("recipes")!.cells.push(["r-1", "Again"])
    const { rows, notes } = await place.list("recipes", {}, {})
    expect(rows).toHaveLength(3)
    expect(notes).toEqual([expect.stringContaining("row 6 has an id a row above already has")])
  })

  test("with no id column:  it reads, and it can't be written", async () => {
    const { place } = await sheet({ hasIds: false })
    expect(place.describe().idOf).toBeUndefined()
    expect(place.describe().write).toBe("none")
    expect((await place.list("recipes", {}, {})).rows).toHaveLength(3)
    await expect(place.apply([change("update", "r-1", { title: "x" })], {})).rejects.toMatchObject({ kind: "refused" })
  })
})

describe("GoogleSheetPlace's key", () => {
  test("no key set:  refused, naming it, and nothing asked", async () => {
    const { place, stub, keyNamed } = await sheet({ key: false })
    await expect(place.list("recipes", {}, {})).rejects.toMatchObject({ kind: "refused" })
    await expect(place.list("recipes", {}, {})).rejects.toThrow(`no key named "${keyNamed}"`)
    expect(stub.asks).toEqual([])
  })

  test("a key that isn't JSON:  refused, and the message doesn't repeat it", async () => {
    const keys = new PlaceKeys({ names: ["K"], from: { K: "secret-words" } })
    const place = new GoogleSheetPlace({ spreadsheet: "s", keyNamed: "K", keys, url: "http://127.0.0.1:9" })
    const error = (await place.list("recipes", {}, {}).catch((failure: unknown) => failure)) as PlaceError
    expect(error.kind).toBe("refused")
    expect(error.message).not.toContain("secret-words")
  })

  test("a key signed wrong is turned down:  refused, not resent forever", async () => {
    const { stub } = await sheet()
    const file = JSON.parse(stub.keyFile) as Record<string, string>
    file.private_key = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" }
    }).privateKey
    const keys = new PlaceKeys({ names: ["BAD"], from: { BAD: JSON.stringify(file) } })
    const place = new GoogleSheetPlace({ spreadsheet: "s", keyNamed: "BAD", keys, url: stub.url })
    await expect(place.list("recipes", {}, {})).rejects.toMatchObject({ kind: "refused" })
  })

  test("a sheet not shared with the account:  refused, saying who to share it with", async () => {
    const { place, stub } = await sheet()
    stub.answerAll = 403
    await expect(place.list("recipes", {}, {})).rejects.toThrow(
      "share it with demo@example.iam.gserviceaccount.com, as an editor"
    )
  })

  test("the key, its private key and the token are all scrubbed, from JSON too", async () => {
    const { place, keys, stub } = await sheet()
    await place.list("recipes", {}, {})
    const secrets = JSON.parse(stub.keyFile) as { private_key: string }
    const answer = JSON.stringify({ a: secrets.private_key, b: "stub-access-token" })
    const scrubbed = keys.scrubbed(answer)
    expect(scrubbed).not.toContain("BEGIN PRIVATE KEY")
    expect(scrubbed).not.toContain("stub-access-token")
  })

  test("PlaceKeys prints only names, even of what it holds for a key", () => {
    const keys = new PlaceKeys({ names: ["K"], from: { K: "v" } })
    keys.hold("K's token", "t")
    expect(`${keys}`).toBe("PlaceKeys(K, K's token)")
  })
})

describe("GoogleSheetPlace.apply()", () => {
  test("a change to one cell changes that cell, and only it", async () => {
    const { place, cells, stub } = await sheet()
    const { rows } = await place.apply([change("update", "r-2", { title: "Better dal" })], {})
    expect(rows).toEqual([{ id: "r-2", title: "Better dal", servings: 6, notes: "" }])
    expect(cells()[2]).toEqual(["r-2", "Better dal", 6])
    expect(cells()[1]).toEqual(["r-1", "Soup", 4, "Roast"])
    expect(stub.asksOf(/:batchUpdate$/)).toBe(1)
  })

  test("a number stays a number;  text starting `=` stays TEXT, never a formula", async () => {
    const { place, stub, cells } = await sheet()
    await place.apply([change("update", "r-1", { servings: 8, notes: "=HYPERLINK(1)" })], {})
    expect(cells()[1]).toEqual(["r-1", "Soup", 8, "=HYPERLINK(1)"])
    expect(JSON.stringify(stub.asks.at(-1)!.body)).not.toContain("formulaValue")
  })

  test("an insert goes at the end, cells by column whatever order its fields are in", async () => {
    const { place, cells } = await sheet()
    const { rows } = await place.apply([change("insert", "r-9", { servings: 2, title: "New" })], {})
    expect(rows).toEqual([{ id: "r-9", servings: 2, title: "New" }])
    expect(cells().at(-1)).toEqual(["r-9", "New", 2, ""])
  })

  test("an insert with an id it holds changes that row:  sent again, it isn't doubled", async () => {
    const { place, cells } = await sheet()
    const before = cells().length
    await place.apply([change("insert", "r-1", { title: "Again" })], {})
    expect(cells()).toHaveLength(before)
    expect(cells()[1]![1]).toBe("Again")
  })

  test("a delete removes that row;  several go bottom up, so positions hold", async () => {
    const { place, cells } = await sheet()
    await place.apply([change("delete", "r-1"), change("delete", "r-3")], {})
    expect(
      cells()
        .filter((row) => row.length)
        .map((row) => row[0])
    ).toEqual(["id", "r-2"])
  })

  test("a mixed batch is ONE write, and comes out right", async () => {
    const { place, cells, stub } = await sheet()
    const writesBefore = stub.asksOf(/:batchUpdate$/)
    await place.apply(
      [
        change("update", "r-3", { title: "Later row" }),
        change("delete", "r-1"),
        change("insert", "r-4", { title: "Added" }),
        change("update", "r-4", { servings: 3 }),
        change("insert", "r-5", { title: "Gone" }),
        change("delete", "r-5")
      ],
      {}
    )
    expect(stub.asksOf(/:batchUpdate$/) - writesBefore).toBe(1)
    const shown = cells().filter((row) => row.length)
    expect(shown.map((row) => row[0])).toEqual(["id", "r-2", "r-3", "r-4"])
    expect(shown[2]![1]).toBe("Later row")
    expect(shown[3]).toEqual(["r-4", "Added", 3, ""])
  })

  test("two tabs in one batch, one read each, one write", async () => {
    const { place, stub } = await sheet()
    await place.apply(
      [change("update", "r-1", { title: "A" }), { ...change("update", "o-1", { title: "B" }), collection: "other" }],
      {}
    )
    expect(stub.tabs.get("It's other")!.cells[1]![1]).toBe("B")
    expect(stub.asksOf(/:batchUpdate$/)).toBe(1)
  })

  test("all or NONE:  one bad change, and nothing's sent", async () => {
    const { place, stub, cells } = await sheet()
    const before = structuredClone(cells())
    await expect(
      place.apply([change("update", "r-1", { title: "x" }), change("update", "nope", { title: "y" })], {})
    ).rejects.toMatchObject({ kind: "not found" })
    expect(cells()).toEqual(before)
    expect(stub.asksOf(/:batchUpdate$/)).toBe(0)
  })

  test("a field with no column is refused, whyNot field:  it adds no columns to someone's sheet", async () => {
    const { place } = await sheet()
    const error = (await place
      .apply([change("update", "r-1", { rating: 5 })], {})
      .catch((failure: unknown) => failure)) as PlaceError
    expect(error.cause).toMatchObject({ kind: "refused", whyNot: "field" })
  })

  test("a change that needs an id and hasn't one:  TypeError, this place makes none", async () => {
    const { place } = await sheet()
    await expect(place.apply([{ kind: "insert", collection: "recipes", fields: {} }], {})).rejects.toBeInstanceOf(
      TypeError
    )
  })

  test("it says it has no versions, and is all or none, and its limit", async () => {
    const { place } = await sheet()
    const said = place.describe()
    expect(said.versionCheck).toBeUndefined()
    expect(said.atomic).toBe(true)
    expect(said.live).toBe("poll")
    expect(said.rateLimit).toEqual({ requests: 60, perSeconds: 60 })
  })
})

describe("GoogleSheetPlace, limits", () => {
  test("a limit hit:  it waits as the 429 says, and the read goes through", async () => {
    const { place, stub } = await sheet()
    stub.limitNext(1, "1")
    const started = Date.now()
    const { rows } = await place.list("recipes", {}, {})
    expect(rows).toHaveLength(3)
    expect(Date.now() - started).toBeGreaterThanOrEqual(900)
  })

  test("a limit hit on a write goes through too, once", async () => {
    const { place, stub, cells } = await sheet()
    await place.list("recipes", {}, {})
    stub.limitNext(1, "1")
    await place.apply([change("update", "r-1", { title: "Once" })], {})
    expect(cells()[1]![1]).toBe("Once")
  })

  test("a read waiting on a limit stops when it's aborted", async () => {
    const { place, stub } = await sheet()
    stub.limitNext(5, "30")
    const stop = new AbortController()
    const reading = place.list("recipes", {}, { signal: stop.signal })
    setTimeout(() => stop.abort(new DOMException("gone", "AbortError")), 50)
    await expect(reading).rejects.toThrow("gone")
  })
})

describe("GoogleSheetPlace behind a PlaceServer", () => {
  test("the browser's half reads and writes;  no answer ever holds the token or key", async () => {
    const { stub, place, keys } = await sheet()
    const router = new SRV.Router()
    const http = createServer(SRV.toListener(router.handle))
    const port = await SRV.listenPreferred(http)
    closing.push(
      () =>
        new Promise((done) => {
          http.closeAllConnections()
          http.close(() => done())
        })
    )
    new PlaceServer({ places: { sheet: place }, keys }).route(router, new DemoGuard().allowPort(port))
    const browser = new RemotePlace({
      url: `http://127.0.0.1:${port}/api/places/sheet`,
      token: "recipe-box-demo",
      can: { atomic: true, versionCheck: false }
    })
    const { rows } = await browser.list("recipes", {}, {})
    expect(rows).toHaveLength(3)
    await browser.apply([change("update", "r-1", { title: "From a page" })], {})
    expect(stub.tabs.get("recipes")!.cells[1]![1]).toBe("From a page")
    await expect(browser.apply([change("update", "r-1", { rating: 5 })], {})).rejects.toThrow(/no column "rating"/)
  })
})
