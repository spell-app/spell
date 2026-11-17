import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join, resolve } from "path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { SPACES } from "spell/app/spaces"
import {
  appOrg,
  ME_FILE,
  mePerson,
  orgGroupsIn,
  peopleIn,
  thisMachinesPerson
} from "spell/app/spaces/server/node/people/localPerson"

/** Who's at this machine (epic `repo-split` P27):  an app's folder and a spell.spaces, both temporary. */
const root = mkdtempSync(resolve(tmpdir(), "spell-local-person-"))
afterAll(() => rmSync(root, { recursive: true, force: true }))

/** A folder under `root`, made, with `files` in it (path => text). */
function folderWith(name: string, files: Record<string, string> = {}): string {
  const dir = join(root, name)
  mkdirSync(dir, { recursive: true })
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true })
    writeFileSync(join(dir, path), text)
  }
  return dir
}

describe("localPerson", () => {
  test("the kit, with no me file:  owen@spell, as before P27", () => {
    expect(thisMachinesPerson().address).toBe("owen@spell")
    expect(SPACES.localPerson.address).toBe("owen@spell")
    expect(SP.SpellSetup.projectRoots["owen@spell"]?.title).toBe("Projects")
  })

  test("appOrg():  the app's `spell.org`;  left out, or no package file, `spell`", () => {
    const work = folderWith("work", { "package.json": JSON.stringify({ spell: { org: "acme" } }) })
    const plain = folderWith("plain", { "package.json": JSON.stringify({ name: "x" }) })
    expect(appOrg(work)).toBe("acme")
    expect(appOrg(plain)).toBe("spell")
    expect(appOrg(folderWith("none"))).toBe("spell")
  })

  test("mePerson():  the app's me file, its comments allowed;  none, or one that won't read:  nobody", () => {
    const named = folderWith("named", { [ME_FILE]: '// who\n{ person: "kim-lee" }\n' })
    const broken = folderWith("broken", { [ME_FILE]: "{ person: " })
    expect(mePerson(named)).toBe("kim-lee")
    expect(mePerson(folderWith("nobody"))).toBeUndefined()
    expect(mePerson(broken)).toBeUndefined()
  })

  test("orgGroupsIn():  an org's folders of projects, never a project, a person's space or one of spaces' own", () => {
    const spaces = folderWith("spaces", {
      "@acme/harbor/harbor-new/__project.json5": "{}",
      "@acme/harbor/harbor-current/__project.json5": "{}",
      "@acme/OrgAdmin/__project.json5": "{}",
      "@acme/notes/readme.txt": "not a project",
      "@acme/kim-lee@/mine/__project.json5": "{}",
      "@acme/__admin/x/__project.json5": "{}"
    })
    expect(orgGroupsIn(spaces, "acme")).toEqual(["@acme/harbor"])
    expect(orgGroupsIn(spaces, "nobody")).toEqual([])
    expect(peopleIn(spaces, "acme")).toEqual(["kim-lee"])
  })

  test("addOrgGroups():  `@acme/harbor/harbor-new` is a project of the group, listed", () => {
    SPACES.addOrgGroups(["@acme/harbor"])
    expect(SPACES.orgGroups).toContain("@acme/harbor")
    const location = new SP.SpellLocation("@acme/harbor/harbor-new")
    expect(location.projectRoot).toBe("@acme/harbor")
    expect(SP.SpellUrls.folderFor("@acme/harbor/harbor-new")).toEqual({
      base: "spaces",
      path: "@acme/harbor/harbor-new"
    })
    expect(() => SPACES.addOrgGroups(["acme"])).toThrow(TypeError)
  })
})
