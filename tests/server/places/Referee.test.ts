import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { LiveRoomPlace, MemoryPlace, PlaceError, positionBetween, type PlaceRow } from "spell/util/places"
import { SRV } from "spell/server"
import { Referee } from "spell/server/places"

import { TestPage, newRoom, seededRandom, withoutMarks, type Trouble } from "./Referee.helpers"
import { TroubledPlace } from "../../util/places/fakePlaces"

/** Everyone on the screen, and the referee, the same? */
function sameEverywhere(referee: Referee, pages: TestPage[]): void {
  const truth = Object.fromEntries(referee.rows.rowsOf("recipes").map((row) => [`${row.id as string}`, row]))
  for (const page of pages) {
    expect(page.pending.hasPending).toBe(false)
    expect(page.place.isConnected).toBe(true)
    expect(page.screen).toEqual(withoutMarks(truth))
  }
}

const pagesToClose: TestPage[] = []
const roomsToClose: Referee[] = []

/** A room, with `count` pages in it, each having read it. */
async function roomWith(count: number, trouble: Trouble = {}, referee?: Referee) {
  const room = referee ?? (await newRoom())
  roomsToClose.push(room)
  const pages = Array.from({ length: count }, (_, index) => new TestPage(room, trouble, 7 + index * 13))
  pagesToClose.push(...pages)
  await Promise.all(pages.map((page) => page.read()))
  return { room, pages }
}

/** Until everyone's the same, no more than a few seconds. */
const settled = (room: Referee, pages: TestPage[]) =>
  vi.waitFor(() => sameEverywhere(room, pages), { timeout: 8000, interval: 20 })

afterEach(() => {
  pagesToClose.splice(0).forEach((page) => page.close())
  roomsToClose.splice(0).forEach((room) => room.close())
  vi.restoreAllMocks()
})

describe("Referee, with a calm connection", () => {
  test("one person's change shows on the other's screen, and each step has its number", async () => {
    const { room, pages } = await roomWith(2)
    pages[0]!.set("r-1", "title", "Broth")
    await settled(room, pages)
    expect(pages[1]!.shown.get("r-1")!.title).toBe("Broth")
    expect(room.sequence).toBe(1)
  })

  test("the same field at once:  everyone ends the same, one value or the other, never a blend", async () => {
    const { room, pages } = await roomWith(2)
    pages[0]!.set("r-1", "title", "Mine")
    pages[1]!.set("r-1", "title", "Theirs")
    await settled(room, pages)
    expect(["Mine", "Theirs"]).toContain(pages[0]!.shown.get("r-1")!.title)
  })

  test("two adds are both kept", async () => {
    const { room, pages } = await roomWith(2)
    pages[0]!.add("a", { title: "A" })
    pages[1]!.add("b", { title: "B" })
    await settled(room, pages)
    expect([...pages[0]!.shown.keys()].sort()).toEqual(["a", "b", "r-1", "r-2"])
  })

  test("additions both count", async () => {
    const { room, pages } = await roomWith(2)
    for (const page of pages) {
      page.pending.addToField({ collection: "recipes", id: "r-1", field: "servings", by: 1, was: 2 })
      page.pending.addToField({ collection: "recipes", id: "r-1", field: "servings", by: 1, was: 3 })
    }
    await settled(room, pages)
    expect(pages[0]!.shown.get("r-1")!.servings).toBe(6)
  })

  test("a list changed by two at once keeps both items, sent one at a time, and the store gets the whole list", async () => {
    const store = new MemoryPlace({ collections: { recipes: [{ id: "r-1", tags: ["a"] }] } })
    const referee = await newRoom({}, store)
    const { room, pages } = await roomWith(2, {}, referee)
    pages[0]!.pending.changeList({ collection: "recipes", id: "r-1", field: "tags", items: ["a", "mine"], was: ["a"] })
    pages[1]!.pending.changeList({
      collection: "recipes",
      id: "r-1",
      field: "tags",
      items: ["a", "theirs"],
      was: ["a"]
    })
    await settled(room, pages)
    const tags = pages[0]!.shown.get("r-1")!.tags as string[]
    expect([...tags].sort()).toEqual(["a", "mine", "theirs"])
    expect((await store.getMany("recipes", ["r-1"], {}))[0]).toEqual({ id: "r-1", tags })
  })

  test("two windows reorder the same list:  each item once, the same order everywhere", async () => {
    const { room, pages } = await roomWith(2)
    const place = (at: string) => ({ parent: "box", at })
    pages[0]!.set("r-1", "place", place("a1"))
    pages[0]!.set("r-2", "place", place("b1"))
    await settled(room, pages)
    pages[0]!.set("r-2", "place", place(positionBetween(undefined, "a1")))
    pages[1]!.set("r-1", "place", place(positionBetween("b1")))
    pages[1]!.set("r-2", "place", place(positionBetween("b1")))
    await settled(room, pages)
    expect(pages[0]!.shown.size).toBe(2)
  })

  test("two picking the same position:  the second gets one of its own, sent to everyone", async () => {
    const { room, pages } = await roomWith(2)
    pages[0]!.set("r-1", "place", { parent: "box", at: "m1" })
    await settled(room, pages)
    pages[1]!.set("r-2", "place", { parent: "box", at: "m1" })
    await settled(room, pages)
    const at = (id: string) => (pages[0]!.shown.get(id)!.place as { at: string }).at
    expect(at("r-1")).not.toBe(at("r-2"))
  })

  test("a thing can't be put inside itself", async () => {
    const { room, pages } = await roomWith(1)
    const [page] = pages
    const failed = vi.fn()
    page!.places.onWriteFailed(failed)
    page!.set("r-1", "place", { parent: "r-2", at: "a1" })
    await settled(room, pages)
    page!.set("r-2", "place", { parent: "r-1", at: "a1" })
    await vi.waitFor(() => expect(failed).toHaveBeenCalled())
    expect(failed.mock.calls[0]![0].error.message).toMatch(/inside itself/)
    await settled(room, pages)
  })

  test("long text overwritten without being seen:  the loser keeps it, and can put it back", async () => {
    const { room, pages } = await roomWith(2)
    const [mine, theirs] = pages as [TestPage, TestPage]
    const long = "x".repeat(60)
    mine.set("r-1", "notes", long)
    // made before hearing mine:  the same version
    theirs.place.versionOf = () => "0"
    theirs.set("r-1", "notes", "y".repeat(60))
    await settled(room, pages)
    const lastWasTheirs = mine.shown.get("r-1")!.notes !== long
    const loser = lastWasTheirs ? mine : theirs
    await vi.waitFor(() => expect(loser.lost).toHaveLength(1))
    const lost = loser.lost[0] as { mine: string; useMine(): void }
    expect(lost.mine).toBe(lastWasTheirs ? long : "y".repeat(60))
    lost.useMine()
    await settled(room, pages)
    expect(mine.shown.get("r-1")!.notes).toBe(lost.mine)
  })

  test("short text just flips:  no notice", async () => {
    const { room, pages } = await roomWith(2)
    pages[0]!.set("r-1", "title", "A")
    pages[1]!.place.versionOf = () => "0"
    pages[1]!.set("r-1", "title", "B")
    await settled(room, pages)
    expect(pages[0]!.lost).toEqual([])
    expect(pages[1]!.lost).toEqual([])
  })

  test("a delete wins over someone editing, who's told, and can put it all back under the same id", async () => {
    const { room, pages } = await roomWith(2)
    const [deleter, editor] = pages as [TestPage, TestPage]
    editor.set("r-1", "title", "Being typed")
    deleter.remove("r-1")
    await vi.waitFor(() => expect(editor.deleted).toHaveLength(1))
    await settled(room, pages)
    expect(editor.shown.has("r-1")).toBe(false)
    expect(deleter.shown.has("r-1")).toBe(false)
    expect(editor.deleted[0]!.row.title).toBe("Being typed")
    editor.deleted[0]!.restore()
    await settled(room, pages)
    expect(deleter.shown.get("r-1")).toMatchObject({ title: "Being typed", servings: 2 })
  })

  test("a delete nobody was editing:  it just disappears", async () => {
    const { room, pages } = await roomWith(2)
    pages[0]!.remove("r-1")
    await settled(room, pages)
    expect(pages[1]!.deleted).toEqual([])
    expect(pages[1]!.shown.has("r-1")).toBe(false)
  })

  test("a named action re-runs on the referee:  the last seat goes to one, and the other's refused", async () => {
    const referee = await newRoom({
      takeSeat({ row, input }) {
        const seat = row("recipes", "r-1")
        if (seat!.takenBy) throw new PlaceError("That seat's gone", { cause: { kind: "refused" } })
        return {
          changes: [{ kind: "update", collection: "recipes", id: "r-1", fields: { takenBy: input } }],
          result: "yours"
        }
      }
    })
    const { room, pages } = await roomWith(2, {}, referee)
    const answers = await Promise.allSettled(pages.map((page, index) => page.place.call("takeSeat", `p${index}`, {})))
    expect(answers.map(({ status }) => status).sort()).toEqual(["fulfilled", "rejected"])
    const refused = answers.find(({ status }) => status === "rejected") as PromiseRejectedResult
    expect(refused.reason).toBeInstanceOf(PlaceError)
    expect(refused.reason.kind).toBe("refused")
    await settled(room, pages)
    expect(pages[0]!.place.rowKnown("recipes", "r-1")!.takenBy).toMatch(/^p/)
  })

  test("a store that refuses is a refusal;  one that doesn't answer is sent again, and made once", async () => {
    const store = new TroubledPlace({ collections: { recipes: [{ id: "r-1", title: "Soup" }] } })
    vi.spyOn(console, "error").mockImplementation(() => {})
    const referee = await newRoom({}, store)
    const { room, pages } = await roomWith(1, {}, referee)
    const [page] = pages
    const failed = vi.fn()
    page!.places.onWriteFailed(failed)
    store.nextWrites.push("refuses")
    page!.set("r-1", "title", "No")
    await vi.waitFor(() => expect(failed).toHaveBeenCalled())
    await settled(room, pages)
    expect(page!.shown.get("r-1")!.title).toBe("Soup")
    store.nextWrites.push("loses its answer")
    page!.set("r-1", "title", "Yes")
    await settled(room, pages)
    expect((await store.getMany("recipes", ["r-1"], {}))[0]!.title).toBe("Yes")
  })

  test("a change saved to the store by hand becomes a step", async () => {
    const stops: ((event: { collection: string; id: string; row?: PlaceRow }) => void)[] = []
    const inner = new MemoryPlace({ collections: { recipes: [{ id: "r-1", title: "Soup" }] } })
    const store = {
      describe: () => inner.describe(),
      list: inner.list.bind(inner),
      apply: inner.apply.bind(inner),
      watch(_target: unknown, onEvent: (event: { collection: string; id: string; row?: PlaceRow }) => void) {
        stops.push(onEvent)
        return () => {}
      }
    }
    const referee = await newRoom({}, store)
    const { room, pages } = await roomWith(2, {}, referee)
    stops[0]!({ collection: "recipes", id: "r-1", row: { id: "r-1", title: "Typed in a file" } })
    stops[0]!({ collection: "recipes", id: "new", row: { id: "new", title: "New file" } })
    await vi.waitFor(() => expect(pages[0]!.shown.get("new")).toBeDefined())
    await settled(room, pages)
    expect(pages[1]!.shown.get("r-1")!.title).toBe("Typed in a file")
    stops[0]!({ collection: "recipes", id: "new" })
    await vi.waitFor(() => expect(pages[1]!.shown.has("new")).toBe(false))
    const steps = room.sequence
    // our own write coming back is nothing new
    stops[0]!({ collection: "recipes", id: "r-1", row: { id: "r-1", title: "Typed in a file" } })
    await new Promise((done) => setTimeout(done, 20))
    expect(room.sequence).toBe(steps)
  })

  test("a store that makes its own ids:  the room keeps the browser's, and writes under the store's", async () => {
    const store = new MemoryPlace({ collections: { recipes: [] }, capabilities: { makesIds: true } })
    const referee = await newRoom({}, store)
    const { room, pages } = await roomWith(2, {}, referee)
    pages[0]!.add("browser-made", { title: "Mine" })
    await settled(room, pages)
    pages[1]!.set("browser-made", "title", "Changed")
    await settled(room, pages)
    expect(pages[0]!.shown.get("browser-made")!.title).toBe("Changed")
    expect((await store.list("recipes", {}, {})).rows).toMatchObject([{ title: "Changed" }])
  })
})

describe("Referee, healing", () => {
  test("a dropped connection:  what was made offline goes through, what was missed arrives", async () => {
    const { room, pages } = await roomWith(2)
    const [offline, online] = pages as [TestPage, TestPage]
    offline.socket.drop()
    offline.set("r-1", "title", "Made offline")
    online.set("r-2", "title", "Made meanwhile")
    await vi.waitFor(() => expect(online.pending.hasPending).toBe(false))
    expect(offline.shown.get("r-2")!.title).toBe("Dal")
    offline.socket.open()
    await settled(room, pages)
    expect(online.shown.get("r-1")!.title).toBe("Made offline")
    expect(offline.shown.get("r-2")!.title).toBe("Made meanwhile")
    expect(offline.place.heals.at(-1)!.why).toBe("reconnecting")
  })

  test("an hour-old offline edit that overwrites newer work is noticed, and the sender told", async () => {
    const { room, pages } = await roomWith(2)
    const [offline, online] = pages as [TestPage, TestPage]
    offline.socket.drop()
    offline.set("r-1", "title", "Old idea")
    online.set("r-1", "title", "Newer work")
    await vi.waitFor(() => expect(online.pending.hasPending).toBe(false))
    offline.socket.open()
    await settled(room, pages)
    expect(online.shown.get("r-1")!.title).toBe("Old idea")
    expect(offline.conflicts).toMatchObject([{ field: "title", mine: "Old idea", theirs: "Newer work" }])
    ;(offline.conflicts[0] as { useTheirs(): void }).useTheirs()
    await settled(room, pages)
    expect(online.shown.get("r-1")!.title).toBe("Newer work")
  })

  test("a missed change:  the gap in the numbers heals it", async () => {
    const { room, pages } = await roomWith(2)
    const [page, other] = pages as [TestPage, TestPage]
    page.socket.drop()
    other.set("r-1", "title", "Missed")
    await vi.waitFor(() => expect(room.sequence).toBe(1))
    // back, with the numbers ahead:  as if the message was lost, not the connection
    page.socket.isOpen = true
    page.socket["member"] = room.join((text) => page["place"]["heard"](text))
    other.set("r-1", "title", "Next")
    await vi.waitFor(() => expect(page.shown.get("r-1")!.title).toBe("Next"))
    expect(page.place.heals.at(-1)!.why).toBe("a gap in the numbers")
  })

  test("a bug:  what's on this copy is wrong, and the periodic checksum finds it", async () => {
    const { room, pages } = await roomWith(2)
    const [page] = pages
    // nobody told it this:  its copy is simply wrong
    page!.place["copy"].commit(
      page!.place["copy"].plan([{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Corrupt" } }])
    )
    page!.shown.get("r-1")!.title = "Corrupt"
    await vi.waitFor(() => expect(page!.shown.get("r-1")!.title).toBe("Soup"), { timeout: 3000 })
    expect(page!.place.heals.at(-1)!.why).toBe("a failed check")
    await settled(room, pages)
  })

  test("the referee restarted:  the numbers mean nothing, so everything's fetched", async () => {
    const store = new MemoryPlace({ collections: { recipes: [{ id: "r-1", title: "Soup" }] } })
    const first = await newRoom({}, store)
    const { pages } = await roomWith(1, {}, first)
    const [page] = pages
    page!.set("r-1", "title", "Saved")
    await settled(first, pages)
    const second = await newRoom({}, store)
    roomsToClose.push(second)
    page!.socket.drop()
    page!.socket["referee" as never] = second as never
    page!.socket.open()
    await settled(second, pages)
    expect(page!.place.rowKnown("recipes", "r-1")!.title).toBe("Saved")
    expect(page!.place.heals.at(-1)!.how).toBe("snapshot")
  })

  test("a log trimmed past where someone stands:  they get the whole copy, deletes and all", async () => {
    const { room, pages } = await roomWith(1)
    const [page] = pages
    page!.socket.drop()
    room["log"].length = 0
    room["seq"] = 5
    room.rows.commit(room.rows.plan([{ kind: "delete", collection: "recipes", id: "r-2" }]))
    page!.socket.open()
    await settled(room, pages)
    expect(page!.shown.has("r-2")).toBe(false)
  })

  // the plan's test:  shuffle and drop messages, and everyone must end the same
  for (const [name, trouble] of Object.entries({
    "a tenth lost": { drop: 0.1 },
    "a quarter reordered": { shuffle: 0.25 },
    "a quarter lost, and a quarter reordered": { drop: 0.25, shuffle: 0.25 }
  } as Record<string, Trouble>)) {
    for (const seed of [1, 2, 3]) {
      test(`with ${name} (run ${seed}), three people ending the same`, async () => {
        const { room, pages } = await roomWith(3, trouble)
        const random = seededRandom(seed * 101)
        for (let turn = 0; turn < 60; turn++) {
          const page = pages[Math.floor(random() * pages.length)]!
          const id = `r-${1 + Math.floor(random() * 2)}`
          const what = random()
          if (what < 0.5) page.set(id, "title", `t${turn}`)
          else if (what < 0.7) page.add(`n${turn}`, { title: `new ${turn}` })
          else if (what < 0.85 && page.shown.has(id))
            page.pending.addToField({ collection: "recipes", id, field: "servings", by: 1, was: 0 })
          else if (page.shown.has(`n${turn - 1}`)) page.remove(`n${turn - 1}`)
          if (random() < 0.1) {
            page.socket.drop()
            setTimeout(() => page.socket.open(), 15)
          }
          if (turn % 5 === 0) await new Promise((done) => setTimeout(done, 3))
        }
        await settled(room, pages)
      }, 20_000)
    }
  }
})

describe("Referee, over a real socket", () => {
  /** A real server, the referee behind its upgrade. */
  async function served(guard = new SRV.Guard({ token: "the-token" })) {
    const store = new MemoryPlace({ collections: { recipes: [{ id: "r-1", title: "Soup" }] } })
    const referee = await new Referee({ path: "/room", place: store, collections: { recipes: {} }, guard }).open()
    const server = createServer((_request, reply) => reply.end())
    server.on("upgrade", (raw, socket, head) => referee.upgrade(raw, socket, head))
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done))
    const { port } = server.address() as AddressInfo
    guard.allowPort(port)
    const stop = () => {
      server.closeAllConnections()
      server.close()
      referee.close()
    }
    return { referee, port, stop }
  }

  test("two places on real sockets stay the same;  and a socket killed comes back, and heals", async () => {
    const { referee, port, stop } = await served()
    const open = () => new LiveRoomPlace({ url: `http://127.0.0.1:${port}/room`, token: "the-token", answerSeconds: 1 })
    const [one, other] = [open(), open()]
    const heard: unknown[] = []
    other.watch({ collection: "recipes" }, (event) => heard.push(event))
    await one.list("recipes", {}, {})
    await other.list("recipes", {}, {})
    await one.apply(
      [{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Broth" }, changeId: "c1" }],
      {}
    )
    await vi.waitFor(() => expect(other.rowKnown("recipes", "r-1")!.title).toBe("Broth"))
    expect(heard).toMatchObject([{ id: "r-1", row: { title: "Broth" } }])
    // and again:  made once
    const again = await one.apply(
      [{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Broth" }, changeId: "c1" }],
      {}
    )
    expect(again.rows).toMatchObject([{ title: "Broth" }])
    expect(referee.sequence).toBe(1)

    other["socket"]!.close()
    other["socket"] = undefined
    await one.apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Missed" } }], {})
    other.connect()
    await vi.waitFor(() => expect(other.rowKnown("recipes", "r-1")!.title).toBe("Missed"))
    expect(other.heals.at(-1)).toMatchObject({ why: "reconnecting", how: "entries" })
    // told to stop, a write doesn't start it again:  it waits, as no answer
    other.close()
    await expect(
      other.apply([{ kind: "update", collection: "recipes", id: "r-1", fields: { title: "Offline" } }], {})
    ).rejects.toThrow(/not connected/)
    expect(other.isConnected).toBe(false)
    one.close()
    stop()
  })

  test("a wrong token, or none, is turned away, and says why", async () => {
    const { port, stop } = await served()
    const statusOf = (path: string) =>
      new Promise<string>((resolve) => {
        const socket = new WebSocket(`ws://127.0.0.1:${port}${path}`)
        socket.addEventListener("open", () => resolve("open"))
        socket.addEventListener("error", () => resolve("refused"))
      })
    expect(await statusOf("/room?token=wrong")).toBe("refused")
    expect(await statusOf("/room")).toBe("refused")
    expect(await statusOf("/room?token=the-token")).toBe("open")
    stop()
  })

  test("asked from another machine, it says a hosted room needs a sign-in", async () => {
    const { referee, stop } = await served()
    const written: string[] = []
    const socket = {
      remoteAddress: "93.184.216.34",
      end: (text: string) => written.push(text),
      destroyed: false
    }
    referee.upgrade(
      { headers: { host: "127.0.0.1:1" }, url: "/room?token=the-token" } as never,
      socket as never,
      Buffer.alloc(0)
    )
    expect(written[0]).toMatch(/403/)
    expect(written[0]).toMatch(/hosted room needs its own sign-in/)
    written.length = 0
    referee.upgrade(
      { headers: { host: "rooms.example.com" }, url: "/room?token=the-token" } as never,
      { ...socket, remoteAddress: "127.0.0.1" } as never,
      Buffer.alloc(0)
    )
    expect(written[0]).toMatch(/hosted room needs its own sign-in/)
    stop()
  })
})
