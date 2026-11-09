import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { DatabasePlace } from "spell/util/persist/DatabasePlace"
import { DeviceCopy, RestPlace, type DeviceCopyProps, type DeviceCopyStore } from "spell/places"

/**
 * A store in memory, standing in for the browser's database, that refuses room past `roomFor` bytes as the browser does:
 * a `QuotaExceededError`.
 */
class MemoryCopies implements DeviceCopyStore {
  readonly values = new Map<string, unknown>()
  /** How many times it refused room. */
  refused = 0

  constructor(private readonly roomFor = Infinity) {}

  async load(store: string, key: string): Promise<unknown> {
    return structuredClone(this.values.get(`${store}\n${key}`))
  }

  async saveOrThrow(store: string, key: string, value: unknown): Promise<void> {
    const at = `${store}\n${key}`
    if (value === undefined) {
      this.values.delete(at)
      return
    }
    const others = [...this.values].filter(([each]) => each !== at && !each.endsWith("\nindex"))
    const used = others.reduce((bytes, [, each]) => bytes + (each as { body: string }).body.length, 0)
    if (!key.startsWith("index") && used + (value as { body: string }).body.length > this.roomFor) {
      this.refused++
      throw new DOMException("no room", "QuotaExceededError")
    }
    this.values.set(at, structuredClone(value))
  }

  async removeUnder(store: string, prefix: string): Promise<void> {
    for (const key of this.values.keys()) if (key.startsWith(`${store}\n${prefix}`)) this.values.delete(key)
  }

  /** The addresses it holds a copy of. */
  get addresses(): string[] {
    return [...this.values.keys()].filter((key) => key.includes("\ncopy:")).map((key) => key.split("\ncopy:")[1]!)
  }
}

/** A clock a test moves on by hand. */
function clock(start = Date.UTC(2026, 10, 4, 22)) {
  let now = start
  return { now: () => now, wait: (ms: number) => (now += ms) }
}

/** A copy over a memory store, on a test's clock. */
function deviceCopy(props: Partial<DeviceCopyProps> = {}) {
  const time = clock()
  const store = new MemoryCopies()
  const copy = new DeviceCopy({ scope: "test:films", store, now: time.now, ...props })
  return { copy, store, time }
}

/** An answer of `body`, as text. */
const answer = (body: string, headers: Array<[string, string]> = []) => ({ body, headers })

/** A body of `bytes` bytes. */
const ofSize = (bytes: number) => "x".repeat(bytes)

const HOUR = 3600 * 1000

////////////////
// ## Keeping and reading
////////////////

describe("DeviceCopy", () => {
  test("keeps an answer, and reads it back:  its text and headers", async () => {
    const { copy } = deviceCopy()
    await copy.keep("https://swapi/films/", answer('{"results":[]}', [["link", '<...>; rel="next"']]))
    const kept = await copy.read("https://swapi/films/")
    expect(kept?.body).toBe('{"results":[]}')
    expect(kept?.headers).toEqual([["link", '<...>; rel="next"']])
    expect(await copy.read("https://swapi/people/")).toBeUndefined()
  })

  test("is fresh until the place's next check time, then stale", async () => {
    const { copy, time } = deviceCopy({ freshFor: () => 7 * HOUR })
    await copy.keep("/films/", answer("[]"))
    const kept = (await copy.read("/films/"))!
    expect(copy.isFresh(kept)).toBe(true)
    time.wait(7 * HOUR)
    expect(copy.isFresh(kept)).toBe(false)
  })

  test("a server's longer max-age wins;  its no-store keeps nothing", async () => {
    const { copy, time } = deviceCopy({ freshFor: () => HOUR })
    await copy.keep("/pokemon/1", answer("{}", [["cache-control", "public, max-age=86400"]]))
    time.wait(2 * HOUR)
    expect(copy.isFresh((await copy.read("/pokemon/1"))!)).toBe(true)
    await copy.keep("/secret", answer("{}", [["Cache-Control", "no-store"]]))
    expect(await copy.read("/secret")).toBeUndefined()
  })

  test("survives the page:  a new copy of the same scope reads what the last one kept", async () => {
    const { copy, store, time } = deviceCopy()
    await copy.keep("/films/", answer("[1]"))
    await copy.settled()
    const nextVisit = new DeviceCopy({ scope: "test:films", store, now: time.now })
    expect((await nextVisit.read("/films/"))?.body).toBe("[1]")
    const otherPlace = new DeviceCopy({ scope: "test:planets", store, now: time.now })
    expect(await otherPlace.read("/films/")).toBeUndefined()
  })

  test("a reload passes every copy by:  each is read from the server again", async () => {
    const { copy, time } = deviceCopy({ freshFor: () => HOUR })
    await copy.keep("/films/", answer("[]"))
    time.wait(1)
    copy.readFromServerNext()
    expect(copy.mustAskServer((await copy.read("/films/"))!)).toBe(true)
    time.wait(1)
    await copy.keep("/films/", answer("[]"))
    expect(copy.mustAskServer((await copy.read("/films/"))!)).toBe(false)
  })

  test("a person's copies are theirs:  someone else reads none, and signing out forgets them", async () => {
    let person: string | undefined = "did:owen"
    const { copy } = deviceCopy({ person: () => person })
    await copy.keep("/mine", answer("[1]"))
    person = "did:matt"
    expect(await copy.read("/mine")).toBeUndefined()
    person = "did:owen"
    expect((await copy.read("/mine"))?.body).toBe("[1]")
    await copy.forgetPerson("did:owen")
    expect(await copy.read("/mine")).toBeUndefined()
  })
})

////////////////
// ## The size limit
////////////////

describe("DeviceCopy's size limit", () => {
  test("never keeps more than its limit, however much is read", async () => {
    const { copy, store, time } = deviceCopy({ mostBytes: 1000 })
    for (let page = 0; page < 40; page++) {
      time.wait(1)
      await copy.keep(`/people/?page=${page}`, answer(ofSize(90 + page)))
      expect(copy.bytesKept).toBeLessThanOrEqual(1000)
    }
    await copy.settled()
    expect(store.addresses.length).toBe(copy.addresses.length)
    expect(store.addresses).toContain("/people/?page=39")
  })

  test("discards what was READ least recently, not what was written least recently", async () => {
    const { copy, time } = deviceCopy({ mostBytes: 300 })
    for (const film of ["a", "b", "c"]) {
      time.wait(1)
      await copy.keep(`/films/${film}`, answer(ofSize(100)))
    }
    time.wait(1)
    await copy.read("/films/a") // the oldest written, read again:  now the last to go
    time.wait(1)
    await copy.keep("/films/d", answer(ofSize(100)))
    expect(copy.addresses).toEqual(["/films/c", "/films/a", "/films/d"])
    time.wait(1)
    await copy.keep("/films/e", answer(ofSize(150)))
    expect(copy.addresses).toEqual(["/films/d", "/films/e"])
  })

  test("an answer bigger than the limit isn't kept, and leaves the rest", async () => {
    const { copy } = deviceCopy({ mostBytes: 100 })
    await copy.keep("/small", answer(ofSize(50)))
    await copy.keep("/huge", answer(ofSize(500)))
    expect(copy.addresses).toEqual(["/small"])
  })

  test("the browser refusing room discards the least read, then tries again", async () => {
    const time = clock()
    const store = new MemoryCopies(250)
    const copy = new DeviceCopy({ scope: "test:films", store, now: time.now })
    for (const film of ["a", "b"]) {
      time.wait(1)
      await copy.keep(`/films/${film}`, answer(ofSize(100)))
    }
    time.wait(1)
    await copy.keep("/films/c", answer(ofSize(100)))
    expect(store.refused).toBe(1)
    expect(copy.addresses).toEqual(["/films/b", "/films/c"])
    expect(store.addresses.sort()).toEqual(["/films/b", "/films/c"])
  })
})

////////////////
// ## The browser's database
////////////////

describe("DeviceCopy in the browser's database", () => {
  test("keeps a copy across visits, in its own database", async () => {
    const database = new DatabasePlace({ name: `device-copy-test-${Math.random()}` })
    const copy = new DeviceCopy({ scope: "test:films", store: database })
    await copy.keep("/films/", answer('{"results":[1]}'))
    await copy.settled()
    const nextVisit = new DeviceCopy({ scope: "test:films", store: database })
    expect((await nextVisit.read("/films/"))?.body).toBe('{"results":[1]}')
  })
})

////////////////
// ## A web server with a copy
////////////////

/** What `fetch` was asked, and how. */
type Asked = { url: string; cache: RequestCache | undefined }

/** A web server's films, answered by a stand-in `fetch`:  what it's asked is noted. */
function swapi(films: { title: string }[]) {
  const asked: Asked[] = []
  const server = {
    films,
    asked,
    fetch: vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      asked.push({ url: `${input as string}`, cache: init?.cache })
      return new Response(JSON.stringify({ results: server.films }), {
        headers: { "Content-Type": "application/json" }
      })
    })
  }
  vi.stubGlobal("fetch", server.fetch)
  return server
}

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A Star Wars place, keeping a copy fresh for `freshFor` ms, on a test's clock. */
function starWars(freshFor: number) {
  const time = clock()
  const store = new MemoryCopies()
  const made = () => new DeviceCopy({ scope: "star_wars", store, now: time.now, freshFor: () => freshFor })
  const placeWith = (copy: DeviceCopy) =>
    new RestPlace({
      url: "https://swapi.test/api",
      collections: { films: { rowsAt: "results" } },
      can: { idOf: "title" },
      deviceCopy: copy
    })
  const copy = made()
  return { time, store, copy, place: placeWith(copy), nextVisit: () => placeWith(made()) }
}

describe("WebPlace with a copy on this device", () => {
  test("no copy:  every read asks the server", async () => {
    const server = swapi([{ title: "A New Hope" }])
    const place = new RestPlace({ url: "https://swapi.test/api", collections: { films: { rowsAt: "results" } } })
    await place.list("films", {}, {})
    await place.list("films", {}, {})
    expect(server.asked).toHaveLength(2)
  })

  test("fresh:  the next visit's read makes no request", async () => {
    const server = swapi([{ title: "A New Hope" }])
    const { place, copy, nextVisit } = starWars(7 * HOUR)
    expect((await place.list("films", {}, {})).rows).toEqual([{ title: "A New Hope" }])
    await copy.settled()
    const { rows } = await nextVisit().list("films", {}, {})
    expect(rows).toEqual([{ title: "A New Hope" }])
    expect(server.asked).toHaveLength(1)
  })

  test("stale:  answered from the copy at once, and read again behind it, past the browser's cache", async () => {
    const server = swapi([{ title: "A New Hope" }])
    const { place, copy, time } = starWars(HOUR)
    await place.list("films", {}, {})
    await copy.settled()
    time.wait(2 * HOUR)
    const changed = vi.fn()
    copy.onChanged(changed)
    server.films = [{ title: "A New Hope" }, { title: "The Empire Strikes Back" }]
    const { rows } = await place.list("films", {}, {})
    expect(rows).toEqual([{ title: "A New Hope" }])
    await vi.waitFor(() => expect(changed).toHaveBeenCalledTimes(1))
    expect(server.asked.map(({ cache }) => cache)).toEqual([undefined, "no-cache"])
    // the new answer is the copy now, and fresh
    expect((await place.list("films", {}, {})).rows).toHaveLength(2)
    expect(server.asked).toHaveLength(2)
  })

  test("stale, and the server has nothing new (the browser's 304):  nobody's told, and it's fresh again", async () => {
    const server = swapi([{ title: "A New Hope" }])
    const { place, copy, time } = starWars(HOUR)
    await place.list("films", {}, {})
    await copy.settled()
    time.wait(2 * HOUR)
    const changed = vi.fn()
    copy.onChanged(changed)
    await place.list("films", {}, {})
    await vi.waitFor(() => expect(server.asked).toHaveLength(2))
    await copy.settled()
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(changed).not.toHaveBeenCalled()
    await place.list("films", {}, {})
    expect(server.asked).toHaveLength(2)
  })

  test("a reload reads the server whatever the copy says", async () => {
    const server = swapi([{ title: "A New Hope" }])
    const { place, copy, time } = starWars(7 * HOUR)
    await place.list("films", {}, {})
    await copy.settled()
    time.wait(1)
    copy.readFromServerNext()
    server.films = []
    expect((await place.list("films", {}, {})).rows).toEqual([])
    expect(server.asked.map(({ cache }) => cache)).toEqual([undefined, "no-cache"])
  })

  test("a write discards every copy:  what it changed may be in any of them", async () => {
    swapi([{ title: "A New Hope" }])
    const { place, copy } = starWars(7 * HOUR)
    await place.list("films", {}, {})
    await copy.settled()
    expect(copy.addresses).toHaveLength(1)
    await place.apply([{ kind: "insert", collection: "films", fields: { title: "Rogue One" }, changeId: "c1" }], {})
    await copy.settled()
    expect(copy.addresses).toHaveLength(0)
  })
})
