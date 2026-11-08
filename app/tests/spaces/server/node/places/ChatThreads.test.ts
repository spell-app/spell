/**
 * Chat threads (epic `atmosphere` P36):  a team's open thread in its shared space and its organizers' in its private
 * one, each a live room of the space's `messages`, written as the person who sent it, so the space's rules hold.
 * - A small RS:  Ana is the Board, Bo manages the Events Team;  Cy and Vic are in RS;  Zed isn't.
 * - Real HTTP and real sockets:  `SpaceFolders`' rooms, as the page server serves them, each page saying who it is
 *   in its address (`?as=`), as a signed-in page's cookie would.
 */
import { mkdtempSync, rmSync } from "fs"
import { createServer } from "http"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, beforeAll, describe, expect, test, vi } from "vite-plus/test"

import { LiveRoomPlace, SPACE_ROOMS_PREFIX, THREADS_COLLECTION, type PlaceEvent } from "spell/places"
import { SRV } from "spell/server"
import { SP } from "spell/parser/spell"
import { PeopleStore, orgFile, personFile } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** The token the server wants. */
const TOKEN = "chat-threads-token"

/** RS's people, each with a file and a membership:  Zed has a file, and no place in RS. */
const RS = ["ana", "bo", "cy", "vic"]

/** The Events Team's open thread, in its shared space. */
const OPEN = "events_team@rs"

/** Its organizers' thread, in its private space:  only its Managers reach it. */
const ORGANIZERS = "events_team@rs/__private"

/** How many messages the busy thread takes, one after another, from one page. */
const BUSY_MESSAGES = 200

const root = mkdtempSync(join(tmpdir(), "spell-chat-threads-"))
const storage = new DiskStorage(root)
const folders = new SpaceFolders({
  folderFor: (address) => join(root, ...SP.SpellUrls.folderFor(address)!.path.split("/")),
  people: new PeopleStore(storage),
  personFor: (request) => (request.query.as as string | undefined) ?? "owen@spell"
})
let port: number
let server: ReturnType<typeof createServer>
const rooms: LiveRoomPlace[] = []

/** `who`'s page on the room of `collection` in the space at `address`. */
function roomOf(who: string, address: string, collection = "messages"): LiveRoomPlace {
  const url = `http://127.0.0.1:${port}${SPACE_ROOMS_PREFIX}/${address}/${collection}?as=${who}@rs`
  const room = new LiveRoomPlace({ url, token: TOKEN, answerSeconds: 2 })
  rooms.push(room)
  return room
}

/** Can `who` join the room of the space at `address`? */
const joins = (who: string, address: string) =>
  new Promise<string>((resolve) => {
    const url = `ws://127.0.0.1:${port}${SPACE_ROOMS_PREFIX}/${address}/messages?as=${who}@rs`
    const socket = new WebSocket(url, [`spell-token.${TOKEN}`])
    socket.addEventListener("open", () => (socket.close(), resolve("open")))
    socket.addEventListener("error", () => resolve("refused"))
  })

/** As `who`, send `text` in the thread at `address`, as `id`. */
async function send(who: string, address: string, id: string, text: string) {
  const room = roomOf(who, address)
  await room.list("messages", {}, {})
  await room.apply([{ kind: "insert", collection: "messages", id, fields: { text, sent: "2026-11-07" } }], {})
  return room
}

beforeAll(async () => {
  for (const id of [...RS, "zed"]) {
    await storage.write(personFile(id, "rs"), JSON.stringify({ $type: "Person", id, names: id }))
  }
  const members = RS.map((id) => ({ $type: "Membership", person: { $ref: `Person#${id}@rs` }, role: "editor" }))
  await storage.write(orgFile("rs"), JSON.stringify({ $type: "Org", id: "rs", name: "RS", members }))
  const roles = folders.orgRoles
  await roles.setUp("rs", { board: "ana@rs" })
  await roles.addTeam("rs", { id: "events_team", name: "Events Team" }, { by: "ana@rs" })
  await roles.give("rs", { role: "team-manager", person: "bo@rs", of: "events_team" }, { by: "ana@rs" })

  const router = new SRV.Router()
  const guard = new SRV.Guard({ token: TOKEN })
  const upgrades: { prefix: string; handle: SRV.UpgradeHandler }[] = []
  folders.route({ router, guard, upgrade: (prefix, handle) => upgrades.push({ prefix, handle }) })
  server = createServer(SRV.toListener(router.handle))
  server.on("upgrade", (raw, socket, head) => {
    const claim = upgrades.find(({ prefix }) => raw.url?.startsWith(`${prefix}/`))
    if (claim) void claim.handle(raw, socket, head)
    else socket.destroy()
  })
  port = await SRV.listenPreferred(server)
  guard.allowPort(port)
})

afterAll(async () => {
  for (const room of rooms) room.close()
  folders.close()
  storage.close()
  await new Promise<void>((done) => {
    server.closeAllConnections()
    server.close(() => done())
  })
  rmSync(root, { recursive: true, force: true })
})

describe("a team's open thread", () => {
  test("live:  Cy's message reaches Vic's open page at once, by Cy", async () => {
    const vic = roomOf("vic", OPEN)
    await vic.list("messages", {}, {})
    const heard: PlaceEvent[] = []
    const stop = vic.watch({ collection: "messages" }, (event) => heard.push(event))
    try {
      await send("cy", OPEN, "m-1", "Who's bringing chairs?")
      await vi.waitFor(() => expect(heard.length).toBeGreaterThan(0))
      const { rows } = await vic.list("messages", {}, {})
      expect(rows.find((row) => row.id === "m-1")).toMatchObject({ text: "Who's bringing chairs?", by: "cy@rs" })
    } finally {
      stop()
    }
  })

  test("everyone deletes their own;  only the team's Managers delete anyone's", async () => {
    const cy = await send("cy", OPEN, "m-2", "Mine to take back")
    await cy.apply([{ kind: "delete", collection: "messages", id: "m-2" }], {})
    await send("vic", OPEN, "m-3", "Vic's")
    await expect(cy.apply([{ kind: "delete", collection: "messages", id: "m-3" }], {})).rejects.toMatchObject({
      kind: "refused"
    })
    const bo = roomOf("bo", OPEN)
    await bo.list("messages", {}, {})
    await bo.apply([{ kind: "delete", collection: "messages", id: "m-3" }], {})
    const { rows } = await bo.list("messages", {}, {})
    expect(rows.map((row) => row.id)).not.toContain("m-3")
  })

  test("nobody changes someone else's words, a Manager neither", async () => {
    await send("vic", OPEN, "m-4", "As I wrote it")
    const bo = roomOf("bo", OPEN)
    await bo.list("messages", {}, {})
    await expect(
      bo.apply([{ kind: "update", collection: "messages", id: "m-4", fields: { text: "As Bo would have it" } }], {})
    ).rejects.toMatchObject({ kind: "refused" })
  })

  test("someone outside RS can't join it", async () => {
    expect(await joins("zed", OPEN)).toBe("refused")
    expect(await joins("vic", OPEN)).toBe("open")
  })
})

describe("its organizers' thread", () => {
  test("only the team's Managers, and the Board, reach it", async () => {
    expect(await joins("cy", ORGANIZERS)).toBe("refused")
    expect(await joins("bo", ORGANIZERS)).toBe("open")
    expect(await joins("ana", ORGANIZERS)).toBe("open")
    const bo = await send("bo", ORGANIZERS, "o-1", "Budget's tight")
    // the referee's copy, with who wrote it, comes back a moment behind the write
    await vi.waitFor(async () => {
      const { rows } = await bo.list("messages", {}, {})
      expect(rows.find((row) => row.id === "o-1")).toMatchObject({ by: "bo@rs" })
    })
  })
})

describe("an ad-hoc thread in the org's shared space", () => {
  test("the Board starts one;  someone else in RS can't", async () => {
    const thread = { kind: "insert", collection: THREADS_COLLECTION, id: "picnic-planning" } as const
    const cy = roomOf("cy", "@rs", THREADS_COLLECTION)
    await cy.list(THREADS_COLLECTION, {}, {})
    await expect(cy.apply([{ ...thread, fields: { name: "Picnic planning" } }], {})).rejects.toMatchObject({
      kind: "refused"
    })
    const ana = roomOf("ana", "@rs", THREADS_COLLECTION)
    await ana.list(THREADS_COLLECTION, {}, {})
    await ana.apply([{ ...thread, fields: { name: "Picnic planning" } }], {})
    // its messages name it, in the org's own thread, and everyone in RS writes there
    await send("cy", "@rs", "p-1", "Saturday works")
  })
})

describe("a busy thread", () => {
  test(`${BUSY_MESSAGES} messages from one page, one after another, each landing by its writer`, async () => {
    const vic = roomOf("vic", OPEN)
    await vic.list("messages", {}, {})
    const started = performance.now()
    for (let index = 0; index < BUSY_MESSAGES; index++) {
      const fields = { text: `Message ${index}`, sent: "2026-11-07" }
      await vic.apply([{ kind: "insert", collection: "messages", id: `busy-${index}`, fields }], {})
    }
    const took = performance.now() - started
    const { rows } = await vic.list("messages", {}, {})
    expect(rows.filter((row) => `${row.id}`.startsWith("busy-"))).toHaveLength(BUSY_MESSAGES)
    // the one writer keeps up with a busy evening:  well under a second a message
    expect(took / BUSY_MESSAGES).toBeLessThan(250)
  })
})
