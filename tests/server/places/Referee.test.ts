import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import {
  LiveRoomPlace,
  MemoryPlace,
  PlaceError,
  positionBetween,
  type LiveRoomPlaceProps,
  type PlaceRow,
  type PlaceWriteFailure
} from "spell/places"
import { SRV } from "spell/server"
import { Referee, type RoomAction } from "spell/server/places"

import { TestPage, newRoom, seededRandom, withoutMarks, type Trouble } from "./Referee.helpers"
import { TroubledPlace } from "../../places/fakePlaces"

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
async function roomWith(
  count: number,
  trouble: Trouble = {},
  referee?: Referee,
  props: Partial<LiveRoomPlaceProps> = {}
) {
  const room = referee ?? (await newRoom())
  roomsToClose.push(room)
  const pages = Array.from({ length: count }, (_, index) => new TestPage(room, trouble, 7 + index * 13, props))
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

  test("a page from an older version is asked to reload, sends nothing, and what it had stays pending", async () => {
    const referee = await newRoom()
    const asked: string[] = []
    const oldSend = (text: string) => void asked.push(text)
    const oldPage = referee.join(oldSend)
    const newPage = referee.join(() => {})
    const person = { id: "x", name: "X" }
    oldPage.receive(JSON.stringify({ kind: "here", from: "old", person, version: "v1", loadedAt: 100 }))
    expect(asked.filter((text) => text.includes("reload"))).toEqual([])
    newPage.receive(JSON.stringify({ kind: "here", from: "new", person, version: "v2", loadedAt: 200 }))
    expect(asked.filter((text) => text.includes("reload"))).toEqual([JSON.stringify({ kind: "reload" })])

    asked.length = 0
    const changes = [{ kind: "update", collection: "recipes", id: "r-1", changeId: "c-1", fields: { title: "Old" } }]
    oldPage.receive(JSON.stringify({ kind: "changes", from: "old", changes }))
    expect(asked.map((text) => (JSON.parse(text) as { kind: string }).kind)).toEqual(["reload", "no answer"])
    expect(referee.sequence).toBe(0)
  })

  test("two pages of the same program:  nobody's asked to reload, and a later page's older mark changes nothing", async () => {
    const referee = await newRoom()
    const asked: string[] = []
    const first = referee.join((text) => void asked.push(text))
    const later = referee.join((text) => void asked.push(text))
    const person = { id: "x", name: "X" }
    first.receive(JSON.stringify({ kind: "here", from: "a", person, version: "v2", loadedAt: 200 }))
    later.receive(JSON.stringify({ kind: "here", from: "b", person, version: "v2", loadedAt: 300 }))
    expect(asked.filter((text) => text.includes("reload"))).toEqual([])
    later.receive(JSON.stringify({ kind: "here", from: "b", person, version: "v1", loadedAt: 100 }))
    expect(asked.filter((text) => text.includes("reload"))).toHaveLength(1)
  })

  test("a page told to reload says so once, and what's pending stays for after", async () => {
    const referee = await newRoom()
    const { pages: [old] } = await roomWith(1, {}, referee, { version: "v1" })
    let toldToReload = 0
    old!.place.onOutOfDate(() => toldToReload++)
    await roomWith(1, {}, referee, { version: "v2" })
    await vi.waitFor(() => expect(toldToReload).toBe(1))
    old!.set("r-1", "title", "Kept")
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(referee.rows.rowFor("recipes", "r-1")!.title).toBe("Soup")
    expect(old!.pending.changes).toHaveLength(1)
    expect(toldToReload).toBe(1)
  })

  test("a page that says no version is never asked to reload", async () => {
    const referee = await newRoom()
    const asked: string[] = []
    const plain = referee.join((text) => void asked.push(text))
    const newPage = referee.join(() => {})
    plain.receive(JSON.stringify({ kind: "here", from: "p", person: { id: "x", name: "X" } }))
    newPage.receive(
      JSON.stringify({ kind: "here", from: "n", person: { id: "y", name: "Y" }, version: "v2", loadedAt: 200 })
    )
    expect(asked.filter((text) => text.includes("reload"))).toEqual([])
  })

  describe("a named action the page has the code for", () => {
    /** The last seat:  taken by whoever's first, the same on the page and the referee. */
    const takeSeat: RoomAction = ({ row, input }) => {
      if (row("recipes", "r-1")!.takenBy) throw new PlaceError("That seat's gone", { cause: { kind: "refused" } })
      return { changes: [{ kind: "update", collection: "recipes", id: "r-1", fields: { takenBy: input } }], result: "yours" }
    }

    test("two press at once:  each shows it taken at once;  one keeps it, the other sees it go back, and the notice", async () => {
      const referee = await newRoom({ takeSeat })
      const { room, pages } = await roomWith(2, {}, referee, { actions: { takeSeat } })
      const failures: PlaceWriteFailure[] = []
      pages.forEach((page) => page.places.onWriteFailed((failure) => failures.push(failure)))

      const answers = pages.map((page, index) => page.pending.callShownAtOnce("takeSeat", `p${index}`, {}))
      await Promise.resolve()
      await Promise.resolve()
      expect(pages.map((page) => page.shown.get("r-1")!.takenBy)).toEqual(["p0", "p1"])

      const settled_ = await Promise.allSettled(answers)
      expect(settled_.map(({ status }) => status).sort()).toEqual(["fulfilled", "rejected"])
      await settled(room, pages)
      const winner = settled_.findIndex(({ status }) => status === "fulfilled")
      expect(pages.map((page) => page.shown.get("r-1")!.takenBy)).toEqual([`p${winner}`, `p${winner}`])
      expect(failures).toHaveLength(1)
      expect(failures[0]!.error.message).toBe("That seat's gone")
      expect(pages.map((page) => page.pending.changes.length)).toEqual([0, 0])
    })

    test("its answer settles it:  nothing's sent as a change of mine", async () => {
      const referee = await newRoom({ takeSeat })
      const { room, pages } = await roomWith(1, {}, referee, { actions: { takeSeat } })
      await expect(pages[0]!.pending.callShownAtOnce("takeSeat", "me", {})).resolves.toBe("yours")
      await settled(room, pages)
      expect(referee.sequence).toBe(1)
      expect(pages[0]!.screen["r-1"]).toMatchObject({ takenBy: "me" })
    })

    test("an action the page has no code for waits for the referee", async () => {
      const referee = await newRoom({ takeSeat })
      const { pages } = await roomWith(1, {}, referee)
      const answer = pages[0]!.pending.callShownAtOnce("takeSeat", "me", {})
      await Promise.resolve()
      await Promise.resolve()
      expect(pages[0]!.shown.get("r-1")!.takenBy).toBeUndefined()
      await expect(answer).resolves.toBe("yours")
    })
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

  test("a wrong token, or none, is turned away;  the token rides as the socket's sub-protocol, never in its address", async () => {
    const { port, stop } = await served()
    const statusOf = (path: string, protocols: string[] = []) =>
      new Promise<string>((resolve) => {
        const socket = new WebSocket(`ws://127.0.0.1:${port}${path}`, protocols)
        socket.addEventListener("open", () => (socket.close(), resolve("open")))
        socket.addEventListener("error", () => resolve("refused"))
      })
    expect(await statusOf("/room", ["spell-token.wrong"])).toBe("refused")
    expect(await statusOf("/room")).toBe("refused")
    expect(await statusOf("/room?token=the-token")).toBe("refused")
    expect(await statusOf("/room", ["spell-token.the-token"])).toBe("open")
    stop()
  })

  test("asked from another machine with no sign-in, it says to sign in", async () => {
    const { referee, stop } = await served()
    const written: string[] = []
    const socket = {
      remoteAddress: "93.184.216.34",
      end: (text: string) => written.push(text),
      destroyed: false
    }
    const headers = { "sec-websocket-protocol": "spell-token.the-token" }
    referee.upgrade(
      { headers: { host: "127.0.0.1:1", ...headers }, url: "/room" } as never,
      socket as never,
      Buffer.alloc(0)
    )
    expect(written[0]).toMatch(/403/)
    expect(written[0]).toMatch(/unless you're signed in/)
    written.length = 0
    referee.upgrade(
      { headers: { host: "rooms.example.com", ...headers }, url: "/room" } as never,
      { ...socket, remoteAddress: "127.0.0.1" } as never,
      Buffer.alloc(0)
    )
    expect(written[0]).toMatch(/unless you're signed in/)
    stop()
  })
})

describe("who's here (epic `data` P13)", () => {
  /** A place named `name`, in `room`, and its list of who's here as it hears it. */
  function pageIn(room: Referee, name: string) {
    const heard: string[][] = []
    const place = new LiveRoomPlace({
      url: "/room",
      person: { id: name.toLowerCase(), name },
      socket: (listeners) => {
        const member = room.join((text) => listeners.onMessage(text))
        const socket = {
          isOpen: true,
          send(text: string) {
            if (socket.isOpen) member.receive(text)
            return socket.isOpen
          },
          close() {
            socket.isOpen = false
            member.leave()
            listeners.onClose()
          }
        }
        queueMicrotask(() => listeners.onOpen())
        return socket
      }
    })
    place.onPeopleHere((people) => heard.push(people.map((person) => person.name)))
    return { place, heard }
  }

  test("each page says who it is;  everyone hears who's in, in the order they came, and who's left", async () => {
    const room = await newRoom()
    roomsToClose.push(room)
    const ana = pageIn(room, "Ana")
    expect(ana.place.peopleHere().map(({ name }) => name)).toEqual(["Ana"])
    await vi.waitFor(() => expect(ana.heard.at(-1)).toEqual(["Ana"]))
    const bo = pageIn(room, "Bo")
    await vi.waitFor(() => expect(ana.heard.at(-1)).toEqual(["Ana", "Bo"]))
    await vi.waitFor(() => expect(bo.heard.at(-1)).toEqual(["Ana", "Bo"]))
    expect(room.peopleHere.map(({ id }) => id)).toEqual(["ana", "bo"])
    bo.place.close()
    expect(ana.heard.at(-1)).toEqual(["Ana"])
    expect(room.peopleHere.map(({ id }) => id)).toEqual(["ana"])
    ana.place.close()
  })

  test("two windows of one person are two here;  with no connection a page knows only itself", async () => {
    const room = await newRoom()
    roomsToClose.push(room)
    const one = pageIn(room, "Ana")
    const two = pageIn(room, "Ana")
    await vi.waitFor(() => expect(one.place.peopleHere()).toHaveLength(2))
    expect(new Set(one.place.peopleHere().map(({ page }) => page)).size).toBe(2)
    expect(one.place.currentPerson().page).toBe(one.place.clientId)
    two.place.close()
    one.place.close()
    expect(one.place.peopleHere().map(({ page }) => page)).toEqual([one.place.clientId])
  })
})

describe("a batch sent again, holding more than the one before it", () => {
  test("a step for only part of it answers nothing:  what the referee hasn't made isn't dropped as if it had", async () => {
    const sent: string[] = []
    let listeners!: Parameters<NonNullable<ConstructorParameters<typeof LiveRoomPlace>[0]["socket"]>>[0]
    const place = new LiveRoomPlace({
      url: "/room",
      socket: (given) => {
        listeners = given
        return { isOpen: true, send: (text) => Boolean(sent.push(text)), close() {} }
      }
    })
    const change = (changeId: string) => ({
      kind: "insert" as const,
      collection: "recipes",
      id: changeId,
      fields: {},
      changeId
    })
    let isAnswered = false
    const answer = place.apply([change("c1"), change("c2")], {}).then(() => (isAnswered = true))
    const step = (seq: number, changeId: string) =>
      JSON.stringify({ kind: "entry", run: "r", entry: { seq, from: place.clientId, changes: [change(changeId)] } })
    listeners.onMessage(JSON.stringify({ kind: "snapshot", run: "r", seq: 0, rows: {} }))
    listeners.onMessage(step(1, "c1"))
    await new Promise((done) => setTimeout(done, 5))
    expect(isAnswered).toBe(false)
    listeners.onMessage(step(2, "c2"))
    await answer
    expect(isAnswered).toBe(true)
    place.close()
  })
})
