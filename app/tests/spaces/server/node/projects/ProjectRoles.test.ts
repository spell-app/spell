/**
 * Who may change a project's own files, by their role in its space (`ProjectRoles`, epic `atmosphere` P25, T8):
 * a small org, `@club`, with Mo its manager, Ed an editor and Vi a viewer;  Zed isn't in it.
 */
import { mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"
import { PeopleStore, orgFile, personFile } from "spell/app/spaces/server/node/people/PeopleStore"
import { ProjectRoles } from "spell/app/spaces/server/node/projects/ProjectRoles"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

const root = mkdtempSync(join(tmpdir(), "spell-project-roles-"))
const storage = new DiskStorage(root)
const people = new PeopleStore(storage)

/** `who`'s rights over the club's project `@club/minutes/Agenda`. */
const rolesOf = (who: string) =>
  new ProjectRoles({ projectId: "@club/minutes/Agenda", person: who, folder: join(root, "agenda"), people })

beforeAll(async () => {
  const club: Record<string, string> = { mo: "manager", ed: "editor", vi: "viewer" }
  for (const id of [...Object.keys(club), "zed"]) {
    await storage.write(personFile(id, "club"), JSON.stringify({ $type: "Person", id, names: id }))
  }
  const members = Object.entries(club).map(([id, role]) => ({
    $type: "Membership",
    person: { $ref: `Person#${id}@club` },
    role
  }))
  await storage.write(orgFile("club"), JSON.stringify({ $type: "Org", id: "club", name: "Club", members }))
})

afterAll(() => rmSync(root, { recursive: true, force: true }))

describe("ProjectRoles", () => {
  test("a manager makes, renames and deletes pages;  an editor only saves;  a viewer, nothing", async () => {
    const rights = async (who: string) =>
      Promise.all((["save", "create", "rename", "delete"] as const).map((change) => rolesOf(who).may(change)))
    expect(await rights("mo@club")).toEqual([true, true, true, true])
    expect(await rights("ed@club")).toEqual([true, false, false, false])
    expect(await rights("vi@club")).toEqual([false, false, false, false])
    expect(await rights("zed@club")).toEqual([false, false, false, false])
  })

  test("this machine's person changes anything this machine serves", async () => {
    expect(await rolesOf("owen@spell").may("create")).toBe(true)
  })

  test("a refusal is a 403 naming the role it takes", async () => {
    const refused = rolesOf("ed@club").mayOrDie("create")
    await expect(refused).rejects.toBeInstanceOf(SRV.HttpError)
    await expect(refused).rejects.toMatchObject({
      status: 403,
      message: expect.stringMatching(/an editor there, and it takes a manager/)
    })
    await expect(rolesOf("vi@club").mayOrDie("save")).rejects.toThrow(/a viewer there, and it takes an editor/)
  })
})
