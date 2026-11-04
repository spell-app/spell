/**
 * `PlaceCopy`:  the recipe box moved from a project data folder to an atmosphere account, and back (epic `atmosphere` P1).
 * - The folder is the kit's `FolderPlace` on a real folder;  the account, `AtProtoPlace` on the fake network.
 * - In node:  both need a real server, or a real disk.
 */
import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test"

import { AtProtoPlace, JsonChunks, MemoryPlace, PlaceCopy } from "spell/util/places"
import { ChunkFiles, FolderPlace } from "spell/server/places"
import { FakeAtmosphere } from "spell/server/test/fakeAtmosphere"
import { FakeSignIn } from "spell/server/test/FakeSignIn"

import { newFolder, removeFolders } from "../../server/places/places.helpers"

const NSID = "com.example.recipe"
const ALICE = "did:plc:alice"

/** Every title `place` holds, in order. */
async function titlesIn(place: { list: MemoryPlace["list"] }): Promise<string[]> {
  return (await place.list("recipes", {}, {})).rows.map(({ title }) => `${title as string}`).sort()
}

describe("PlaceCopy.copy()", () => {
  let network: FakeAtmosphere
  let account: AtProtoPlace
  let folder: FolderPlace

  beforeEach(async () => {
    network = await new FakeAtmosphere().start(["one"])
    network.addAccount(ALICE, { handle: "alice.test", host: "one" })
    const signIn = new FakeSignIn(network.network.directory)
    await signIn.signIn(ALICE)
    account = new AtProtoPlace({
      kind: "personal atmosphere account",
      collections: { recipes: NSID },
      signIn,
      network: network.network
    })
    folder = new FolderPlace({
      storage: new ChunkFiles({ root: newFolder() }),
      format: new JsonChunks({ summaries: { recipes: ["title"] } }),
      whoWrites: "only the owner"
    })
    await folder.apply(
      [
        { kind: "insert", collection: "recipes", id: "r-1", fields: { title: "Dal", notes: "Temper last" } },
        { kind: "insert", collection: "recipes", id: "r-2", fields: { title: "Soup", notes: "Roast first" } }
      ],
      { identity: "owen@spell" }
    )
  })

  afterEach(async () => {
    await network.close()
    removeFolders()
  })

  test("a project data folder into an atmosphere account:  each thing whole, its owner the account's", async () => {
    expect(await new PlaceCopy({ from: folder, to: account }).copy("recipes")).toEqual({ inserted: 2, updated: 0 })
    const records = network.recordsOf(ALICE, NSID)
    expect([...records.keys()].sort()).toEqual(["r-1", "r-2"])
    expect(records.get("r-1")?.value).toMatchObject({ title: "Dal", notes: "Temper last" })
    expect(records.get("r-1")?.value).not.toHaveProperty("owner")
  })

  test("and back:  what the folder had is changed, what's new is added, and the folder says who owns it", async () => {
    network.putRecord(ALICE, NSID, "r-1", { title: "Dal, from the account" })
    network.putRecord(ALICE, NSID, "a-9", { title: "Tacos" })
    const back = await new PlaceCopy({ from: account, to: folder }).copy("recipes", {
      context: { identity: "owen@spell" }
    })
    expect(back).toEqual({ inserted: 1, updated: 1 })
    expect(await titlesIn(folder)).toEqual(["Dal, from the account", "Soup", "Tacos"])
    const [tacos] = await folder.getMany("recipes", ["a-9"], {})
    expect(tacos).toMatchObject({ title: "Tacos", owner: "owen@spell" })
  })

  test("both ways, nothing's lost:  the folder's things come back as they went", async () => {
    await new PlaceCopy({ from: folder, to: account }).copy("recipes")
    const empty = new MemoryPlace()
    await new PlaceCopy({ from: account, to: empty }).copy("recipes")
    expect(await titlesIn(empty)).toEqual(["Dal", "Soup"])
    expect((await empty.list("recipes", {}, {})).rows[0]).toMatchObject({ notes: "Temper last" })
  })

  test("into a place that takes no writes:  refused, as that place says", async () => {
    const readOnly = new MemoryPlace({ capabilities: { write: "none" } })
    await expect(new PlaceCopy({ from: folder, to: readOnly }).copy("recipes")).rejects.toMatchObject({
      kind: "refused"
    })
  })
})
