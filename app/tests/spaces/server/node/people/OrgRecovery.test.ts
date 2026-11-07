import { mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import { resolve } from "path"
import { afterAll, beforeEach, describe, test, expect } from "vite-plus/test"

import { OrgRecovery, type CodePart } from "spell/app/spaces/server/node/people/OrgRecovery"
import { OrgRoles } from "spell/app/spaces/server/node/people/OrgRoles"
import { PeopleStore, orgFile, personFile } from "spell/app/spaces/server/node/people/PeopleStore"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/**
 * An org's recovery (epic `atmosphere` P21):  RS, its Board Ana, Bo and Cy, its Admin Ada;  Dee in RS, Zed not.
 * - Its codes:  a part each for the three on the Board, any two enough.
 */
const root = mkdtempSync(resolve(tmpdir(), "spell-org-recovery-"))
const storage = new DiskStorage(root)
const people = new PeopleStore(storage)
const roles = new OrgRoles({ people })
const recovery = new OrgRecovery({ people, roles })
afterAll(() => {
  storage.close()
  rmSync(root, { recursive: true, force: true })
})

/** RS's people, each with a file and in its org file. */
const RS = ["ana", "bo", "cy", "ada", "dee"]

/** Who asks, at Spell's command line. */
const OWEN = { by: "owen@spell" }

/** The parts made for RS in `beforeEach()`:  Ana's, Bo's and Cy's. */
let parts: CodePart[]

beforeEach(async () => {
  await storage.remove("@rs")
  for (const id of [...RS, "zed"]) {
    await storage.write(personFile(id, "rs"), JSON.stringify({ $type: "Person", id, names: id }))
  }
  const members = RS.map((id) => ({ $type: "Membership", person: { $ref: `Person#${id}@rs` }, role: "editor" }))
  await storage.write(orgFile("rs"), JSON.stringify({ $type: "Org", id: "rs", name: "RS", members }))
  await roles.setUp("rs", { board: "ana@rs" })
  await roles.give("rs", { role: "board", person: "bo@rs" }, { by: "ana@rs" })
  await roles.give("rs", { role: "board", person: "cy@rs" }, { by: "ana@rs" })
  await roles.give("rs", { role: "admins", person: "ada@rs" }, { by: "ana@rs" })
  parts = await recovery.makeCodes("rs", { holders: ["ana@rs", "bo@rs", "cy@rs"] }, OWEN)
})

/** Who holds `role` in RS today. */
async function holding(role: string): Promise<string[]> {
  return (await roles.terms("rs")).filter((term) => term.role === role).map(({ person }) => person!)
}

describe("OrgRecovery", () => {
  test("the last Admin leaves, and the Board names a new one:  its standing right, no codes needed", async () => {
    await roles.end("rs", { role: "admins", person: "ada@rs" }, { by: "ada@rs", why: "moving away" })
    expect(await holding("admins")).toEqual([])
    await roles.give("rs", { role: "admins", person: "dee@rs" }, { by: "bo@rs" })
    expect(await holding("admins")).toEqual(["dee@rs"])
    expect(await roles.manages("dee@rs", "rs", "__admin")).toBe(true)
  })

  test("codes:  a part each, written to be read out;  Spell keeps who holds which, never a part", async () => {
    expect(parts.map(({ part, person }) => `${part} ${person}`)).toEqual(["1 ana@rs", "2 bo@rs", "3 cy@rs"])
    for (const { part, code } of parts) expect(code).toMatch(new RegExp(`^RS-${part}(-[0-9A-Z]{1,4}){7}$`))
    const kept = (await storage.read("@rs/__admin/recovery.json5"))!
    for (const { code } of parts) expect(kept).not.toContain(code.split("-").slice(2).join(""))
    expect(await recovery.codes("rs")).toMatchObject({ needed: 2, holders: [{ part: 1, person: "ana@rs" }, {}, {}] })
  })

  test("two Board members' parts take the org back from a Board gone wrong:  a new Board and Admins, the codes spent", async () => {
    // Ana turns against RS:  she ends Bo's and Cy's terms, and the Admin's
    await roles.end("rs", { role: "board", person: "bo@rs" }, { by: "ana@rs" })
    await roles.end("rs", { role: "board", person: "cy@rs" }, { by: "ana@rs" })
    await roles.end("rs", { role: "admins", person: "ada@rs" }, { by: "ana@rs" })
    expect(await holding("board")).toEqual(["ana@rs"])

    const asked = {
      parts: [parts[1]!.code, parts[2]!.code.toLowerCase()],
      board: ["bo@rs", "cy@rs"],
      admins: ["dee@rs"]
    }
    const why = { ...OWEN, why: "Ana locked the Board out" }
    expect(await recovery.recover("rs", asked, why)).toEqual(["bo@rs", "cy@rs"])
    expect((await holding("board")).sort()).toEqual(["bo@rs", "cy@rs"])
    expect(await holding("admins")).toEqual(["dee@rs"])
    expect(await roles.manages("ana@rs", "rs")).toBe(false)

    // spent:  the same parts again do nothing
    expect(await recovery.codes("rs")).toBeUndefined()
    await expect(recovery.recover("rs", asked, why)).rejects.toMatchObject({ status: 404 })
    expect((await roles.log("rs")).at(-1)).toMatchObject({
      action: "recover",
      by: "owen@spell",
      holders: ["bo@rs", "cy@rs"],
      board: ["bo@rs", "cy@rs"],
      admins: ["dee@rs"],
      why: "Ana locked the Board out"
    })
  })

  test("someone named again keeps their term:  only the others' end", async () => {
    await recovery.recover("rs", { parts: [parts[0]!.code, parts[1]!.code], board: ["ana@rs", "bo@rs"] }, OWEN)
    expect((await holding("board")).sort()).toEqual(["ana@rs", "bo@rs"])
    expect(await holding("admins")).toEqual([])
  })

  test("one part alone is refused, and so is a part twice, a made-up part or another org's", async () => {
    const board = ["bo@rs"]
    await expect(recovery.recover("rs", { parts: [parts[0]!.code], board }, OWEN)).rejects.toMatchObject({
      status: 400,
      message: "a recovery of @rs takes 2 parts, not 1"
    })
    await expect(
      recovery.recover("rs", { parts: [parts[0]!.code, parts[0]!.code], board }, OWEN)
    ).rejects.toMatchObject({ status: 400 })
    // Bo's part, one letter of its bytes changed
    const groups = parts[1]!.code.split("-")
    groups[2] = (groups[2]![0] === "A" ? "B" : "A") + groups[2]!.slice(1)
    const madeUp = groups.join("-")
    await expect(recovery.recover("rs", { parts: [parts[0]!.code, madeUp], board }, OWEN)).rejects.toMatchObject({
      status: 403,
      message: "those parts don't make @rs's recovery code"
    })
    await expect(
      recovery.recover("rs", { parts: [parts[0]!.code, parts[1]!.code.replace(/^RS/, "FAMILY")], board }, OWEN)
    ).rejects.toMatchObject({ status: 400 })
    // nothing changed
    expect((await holding("board")).sort()).toEqual(["ana@rs", "bo@rs", "cy@rs"])
  })

  test("new codes make the old ones stop working;  holders must be in the org", async () => {
    const old = parts
    await recovery.makeCodes("rs", { holders: ["bo@rs", "cy@rs", "dee@rs"], needed: 3 }, OWEN)
    await expect(
      recovery.recover("rs", { parts: [old[0]!.code, old[1]!.code, old[2]!.code], board: ["bo@rs"] }, OWEN)
    ).rejects.toMatchObject({ status: 403 })
    await expect(recovery.makeCodes("rs", { holders: ["bo@rs", "zed@rs"] }, OWEN)).rejects.toMatchObject({
      status: 403
    })
    await expect(recovery.makeCodes("rs", { holders: ["bo@rs"] }, OWEN)).rejects.toMatchObject({ status: 400 })
    await expect(recovery.makeCodes("rs", { holders: ["bo@rs", "cy@rs"], needed: 3 }, OWEN)).rejects.toMatchObject({
      status: 400
    })
    await expect(recovery.makeCodes("family", { holders: ["bo@rs", "cy@rs"] }, OWEN)).rejects.toMatchObject({
      status: 404
    })
  })

  test("any two of three parts make the same secret:  every pair recovers", async () => {
    for (const [a, b] of [
      [0, 1],
      [0, 2],
      [1, 2]
    ] as const) {
      await expect(
        recovery.recover("rs", { parts: [parts[a]!.code, parts[b]!.code], board: ["ana@rs"] }, OWEN)
      ).resolves.toHaveLength(2)
      parts = await recovery.makeCodes("rs", { holders: ["ana@rs", "bo@rs", "cy@rs"] }, OWEN)
    }
  })
})
