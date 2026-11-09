/**
 * A person's threads in an org (epic `atmosphere` P37, T53):  `@rs/__threads`, every chat thread of RS they may read,
 * for the built-in Chat's list down its side.
 * - A small RS:  Ana is the Board, Bo manages the Events Team;  Cy is in RS;  Zed isn't.
 */
import { mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { THREADS_COLLECTION, pickedThreadFor, roomForPage, withPickedThread, type PlaceRow } from "spell/places"
import { SP } from "spell/parser/spell"
import { PeopleStore, orgFile, personFile } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** RS's people, each with a file and a membership:  Zed has a file, and no place in RS. */
const RS = ["ana", "bo", "cy"]

const root = mkdtempSync(join(tmpdir(), "spell-person-threads-"))
const storage = new DiskStorage(root)
const folders = new SpaceFolders({
  folderFor: (address) => join(root, ...SP.SpellUrls.folderFor(address)!.path.split("/")),
  people: new PeopleStore(storage),
  personFor: () => "owen@spell"
})

/** The threads `who` (`bo`) sees, each `<thread> <side>`, sorted. */
async function threadsOf(who: string): Promise<string[]> {
  const place = await folders.placeFor("@rs/__threads", `${who}@rs`)
  const { rows } = await place!.list(THREADS_COLLECTION, {}, { identity: `${who}@rs` })
  const text = (value: unknown) => (typeof value === "string" ? value : "")
  return rows.map((row) => `${text(row.thread)}${row.topic ? `~${text(row.topic)}` : ""} ${text(row.side)}`).sort()
}

beforeAll(async () => {
  for (const id of [...RS, "zed"]) {
    await storage.write(personFile(id, "rs"), JSON.stringify({ $type: "Person", id, names: id }))
  }
  await storage.write(personFile("owen", "spell"), JSON.stringify({ $type: "Person", id: "owen", names: "Owen" }))
  const members = [...RS.map((id) => `${id}@rs`), "owen@spell"].map((address) => ({
    $type: "Membership",
    person: { $ref: `Person#${address}` },
    role: "editor"
  }))
  await storage.write(orgFile("rs"), JSON.stringify({ $type: "Org", id: "rs", name: "RS", members }))
  const roles = folders.orgRoles
  await roles.setUp("rs", { board: "ana@rs" })
  await roles.addTeam("rs", { id: "events_team", name: "Events Team" }, { by: "ana@rs" })
  await roles.give("rs", { role: "team-manager", person: "bo@rs", of: "events_team" }, { by: "ana@rs" })
  const org = await folders.placeFor("@rs", "ana@rs")
  await org!.apply!(
    [{ kind: "insert", collection: THREADS_COLLECTION, id: "picnic-planning", fields: { name: "Picnic planning" } }],
    { identity: "ana@rs" }
  )
})

afterAll(() => {
  folders.close()
  storage.close()
  rmSync(root, { recursive: true, force: true })
})

describe("whose threads", () => {
  test("Bo sees every open thread, his team's organizers' thread, and the Board's ad-hoc one", async () => {
    expect(await threadsOf("bo")).toEqual([
      "@rs/messages shared",
      "@rs/messages~picnic-planning ad hoc",
      "admins@rs/messages shared",
      "events_team@rs/__private/messages private",
      "events_team@rs/messages shared"
    ])
  })

  test("Cy, managing nothing, sees the open ones alone;  Ana, the Board, every one", async () => {
    expect(await threadsOf("cy")).toEqual([
      "@rs/messages shared",
      "@rs/messages~picnic-planning ad hoc",
      "admins@rs/messages shared",
      "events_team@rs/messages shared"
    ])
    expect(await threadsOf("ana")).toContain("@rs/__private/messages private")
    expect(await threadsOf("ana")).toContain("events_team@rs/__private/messages private")
  })

  test("Zed, outside RS, sees none", async () => {
    expect(await threadsOf("zed")).toEqual([])
  })

  test("someone in RS by their Spell account sees its open threads, not an empty list (I16)", async () => {
    const place = await folders.placeFor("@rs/__threads", "owen@spell")
    const { rows } = await place!.list(THREADS_COLLECTION, {}, { identity: "owen@spell" })
    expect(rows.map((row) => row.thread)).toContain("events_team@rs/messages")
    expect(rows.map((row) => row.thread)).not.toContain("events_team@rs/__private/messages")
  })

  test("each row names whose it is, and links to the page showing it", async () => {
    const place = await folders.placeFor("@rs/__threads", "bo@rs")
    const { rows } = await place!.list(THREADS_COLLECTION, {}, { identity: "bo@rs" })
    const team = rows.find((row) => row.thread === "events_team@rs/messages")
    expect(team).toMatchObject({ name: "Events Team", link: "?thread=events_team%40rs%2Fmessages" })
  })
})

describe("the thread a page shows", () => {
  /** A room at the picked thread in RS, as the compiler writes it. */
  const PICKED = "/api/rooms/spaces/@rs/__thread"

  test("the one the page's address names;  else the one shown last;  else the org's own", () => {
    const remembered = new Map<string, string>()
    expect(roomForPage(PICKED, "/apps/chat", remembered)).toBe("/api/rooms/spaces/@rs/messages")
    const page = "/apps/chat?thread=events_team%40rs%2Fmessages"
    expect(roomForPage(PICKED, page, remembered)).toBe("/api/rooms/spaces/events_team@rs/messages")
    expect(roomForPage(PICKED, "/apps/chat", remembered)).toBe("/api/rooms/spaces/events_team@rs/messages")
    // another org's thread, or no thread at all, is ignored
    expect(roomForPage(PICKED, "/apps/chat?thread=ana%40spell%2Fmessages", new Map())).toBe(
      "/api/rooms/spaces/@rs/messages"
    )
    expect(roomForPage("/api/rooms/spaces/events_team@rs/messages", page, new Map())).toBe(
      "/api/rooms/spaces/events_team@rs/messages"
    )
  })

  test("an ad-hoc thread is its org's room, and its own id;  the list marks the one shown", () => {
    const picked = pickedThreadFor("rs", "/apps/chat?thread=%40rs%2Fmessages&topic=picnic-planning", new Map())
    expect(picked).toEqual({ thread: "@rs/messages", topic: "picnic-planning" })
    const rows: PlaceRow[] = [
      { id: "@rs/messages", thread: "@rs/messages", topic: "" },
      { id: "@rs/messages~picnic-planning", thread: "@rs/messages", topic: "picnic-planning" }
    ]
    expect(withPickedThread(rows, picked).map((row) => row.current)).toEqual([false, true])
  })
})
