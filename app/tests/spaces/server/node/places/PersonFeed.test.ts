/**
 * A person's feed (epic `atmosphere` P33):  `bo@rs/__feed`, what's new across every space of RS he may read, each read
 * as him;  the second time, only what changed;  a quiet event's left out.
 * - A small RS:  Ana is the Board, Bo manages the Events Team;  Cy and Vic are in RS;  Zed isn't.
 * - Through the page server's places (`SpaceFolders`), `@rs/__feed` for whoever asks, as a program names it.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, beforeAll, describe, expect, test, vi } from "vite-plus/test"

import type { ChangesAnswer, Place, PlaceRow } from "spell/places/places.types"
import { SP } from "spell/parser/spell"
import { PeopleStore, orgFile, personFile } from "spell/app/spaces/server/node/people/PeopleStore"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** RS's people, each with a file and a membership:  Zed has a file, and no place in RS. */
const RS = ["ana", "bo", "cy", "vic"]

/** The org's own shared space's news. */
const NEWS = "@rs/news"

/** Ana's own space in RS:  her art and her politics. */
const ANAS = "ana@rs/posts"

/** The Events Team's private notes:  only its Managers read them. */
const NOTES = "events_team@rs/__private/notes"

/** The picnic's shared space, once it's approved:  quiet once it's over. */
const PICNIC = "events_team@rs/picnic/chat"

const root = mkdtempSync(join(tmpdir(), "spell-person-feed-"))
const folderFor = (address: string) => join(root, ...SP.SpellUrls.folderFor(address)!.path.split("/"))
const storage = new DiskStorage(root)
const people = new PeopleStore(storage)
const folders = new SpaceFolders({ folderFor, people })

/** `who`'s feed, as their page names it. */
async function feedOf(who: string): Promise<Place> {
  return (await folders.placeFor("@rs/__feed", `${who}@rs`))!
}

/** `who`'s feed's posts, and its version. */
async function read(who: string) {
  return (await feedOf(who)).list("posts", {}, { identity: `${who}@rs` })
}

/** What changed in `who`'s feed since `token`. */
async function changes(who: string, token: string): Promise<ChangesAnswer> {
  return (await feedOf(who)).changesSince!("posts", token, { identity: `${who}@rs` })
}

/** As `who`, post `fields` as `id` in the space at `address`. */
async function post(who: string, address: string, id: string, fields: PlaceRow) {
  const place = (await folders.placeFor(address, `${who}@rs`))!
  await place.apply!([{ kind: "insert", collection: "posts", id, fields: { id, ...fields } }], {
    identity: `${who}@rs`
  })
  await listed(address)
}

/**
 * Wait for the people store to list the space at `address` among those holding posts:  it follows the disk through a
 * watcher, a moment behind a space's own writes.
 */
async function listed(address: string) {
  await vi.waitFor(async () => expect(await folders.lists.spacesOf("rs", ["posts.list.json"])).toContain(address))
}

/** As `who`, move the picnic to `stage`. */
async function move(who: string, stage: string) {
  const events = (await folders.placeFor("@rs/__admin/events", `${who}@rs`))!
  await events.apply!([{ kind: "update", collection: "events", id: "picnic", fields: { stage } }], {
    identity: `${who}@rs`
  })
}

/** The texts of `rows`, sorted. */
const textsOf = (rows: readonly PlaceRow[]) => rows.map((row) => `${row.text}`).sort()

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
  // RS's template event:  a project with one page
  const template = folderFor("@spell/examples/SignUpSheet")
  mkdirSync(template, { recursive: true })
  writeFileSync(join(template, "SignUpSheet.spell"), "the sign up sheet is a data folder\n")

  await post("cy", NEWS, "n-1", { text: "Picnic on Saturday", topic: "events", posted: "2026-11-01" })
  await post("ana", ANAS, "a-1", { text: "A new painting", topic: "art", posted: "2026-11-02" })
  await post("ana", ANAS, "a-2", { text: "Vote on Tuesday", topic: "politics", posted: "2026-11-03" })
  await post("bo", NOTES, "x-1", { text: "Budget's tight", topic: "money", posted: "2026-11-04" })
})

afterAll(() => {
  folders.close()
  rmSync(root, { recursive: true, force: true })
})

describe("a person's feed", () => {
  test("Bo sees every space of RS he reads, the team's private notes too;  each post says where it's from", async () => {
    const { rows } = await read("bo")
    expect(textsOf(rows)).toEqual(["A new painting", "Budget's tight", "Picnic on Saturday", "Vote on Tuesday"])
    expect(rows.find((row) => row.text === "A new painting")).toMatchObject({
      id: `${ANAS}~a-1`,
      space: ANAS,
      topic: "art",
      by: "ana@rs"
    })
  })

  test("Cy doesn't see the team's private notes;  Zed, outside RS, sees nothing", async () => {
    expect(textsOf((await read("cy")).rows)).toEqual(["A new painting", "Picnic on Saturday", "Vote on Tuesday"])
    expect((await read("zed")).rows).toEqual([])
  })

  test("a feed is read only, and holds posts alone", async () => {
    const feed = await feedOf("bo")
    expect(feed.describe().write).toEqual([])
    await expect(feed.list("recipes", {}, { identity: "bo@rs" })).rejects.toThrow(/A feed holds posts/)
  })

  test("opening it again fetches only what changed:  a new post, and one removed", async () => {
    const first = await read("cy")
    expect(await changes("cy", first.version!)).toMatchObject({ rows: [], removed: [] })

    await post("vic", NEWS, "n-2", { text: "Who has a grill?", topic: "events", posted: "2026-11-05" })
    const second = await changes("cy", first.version!)
    expect(textsOf(second.rows)).toEqual(["Who has a grill?"])
    expect(second.removed).toEqual([])

    const news = (await folders.placeFor(NEWS, "vic@rs"))!
    await news.apply!([{ kind: "delete", collection: "posts", id: "n-2" }], { identity: "vic@rs" })
    const third = await changes("cy", second.token)
    expect(third.rows).toEqual([])
    expect(third.removed).toEqual([`${NEWS}~n-2`])
  })

  test("a quiet event is left out:  its posts go once it's over", async () => {
    await folders.events.propose("rs", { id: "picnic", name: "Picnic", organizers: ["cy@rs"] }, { by: "cy@rs" })
    await move("bo", "approved")
    await post("cy", PICNIC, "c-1", { text: "Bring a chair", topic: "events", posted: "2026-11-06" })
    const open = await read("cy")
    expect(textsOf(open.rows)).toContain("Bring a chair")

    for (const stage of ["planning", "open", "analysis", "quiet"]) await move("cy", stage)
    expect(textsOf((await read("cy")).rows)).not.toContain("Bring a chair")
    expect((await changes("cy", open.version!)).removed).toEqual([`${PICNIC}~c-1`])
  })

  test("a community of hundreds:  300 people's posts read in well under a second", async () => {
    const town = "@rs/town"
    const place = (await folders.placeFor(town, "ana@rs"))!
    const changes = Array.from({ length: 300 }, (_, index) => ({
      kind: "insert" as const,
      collection: "posts",
      id: `t-${index}`,
      fields: { id: `t-${index}`, text: `Post ${index}`, topic: "town", posted: "2026-11-07" }
    }))
    await place.apply!(changes, { identity: "ana@rs" })
    await listed(town)

    const started = performance.now()
    const { rows } = await read("cy")
    const took = performance.now() - started
    expect(rows.filter((row) => row.space === town)).toHaveLength(300)
    expect(took).toBeLessThan(1000)
  })
})
