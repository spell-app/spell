import { describe, expect, test, vi } from "vite-plus/test"

import { SPACES } from "spell/app/spaces"
// the registry SPACES registered with, before any test resets the modules
import { SpellSetup as spacesSetup } from "spell/parser/spell/SpellSetup"

/**
 * Spell's project groups are spaces' (`SPACES.PROJECT_GROUPS`), and spell's registry starts empty
 * (epic `people-and-orgs` P15).
 * - So every program that reads a spell path must load them first, or every address is "invalid".
 * - One test per ENTRY POINT:  each, loaded alone in a fresh module graph, registers them.
 * - The browser's entries (the editor, `<spell-viewer>`) load `spell/app/spaces` / `spell/app/spaces/models/projectGroups` the same way.
 */
const ENTRIES: Record<string, () => Promise<unknown>> = {
  "spaces' barrel (app/spaces)": () => import("spell/app/spaces"),
  "spaces' groups alone (<spell-viewer>'s)": () => import("spell/app/spaces/models/projectGroups"),
  "spaces' disk reader (tests, the language server)": () => import("spell/app/spaces/server/node/projects/disk-fetch"),
  "spaces' routes (the page server, `yarn start:server`)": () => import("spell/app/spaces/server/node/routes/api"),
  "the language server's workspace": () => import("spell/app/lsp/SpellDiskWorkspace"),
  "the spell command's project finder": () => import("spell/app/cli/resolveProject")
}

describe("spell's project groups", () => {
  test("are the seven groups, each an address in its space", () => {
    expect(SPACES.PROJECT_GROUPS.map(({ path, space }) => [path, space])).toEqual([
      ["owen@spell", "owen@spell"],
      ["@spell/examples", "@spell"],
      ["@spell/guides", "@spell"],
      ["@spell/sites", "@spell"],
      ["@spell/library", "@spell"],
      ["@spell/editor", "@spell"],
      ["@spell/test", "@spell"]
    ])
  })

  test.each(Object.entries(ENTRIES))("are registered with spell by %s", async (_name, load) => {
    vi.resetModules()
    await load()
    const { SpellSetup } = await import("spell/parser/spell/SpellSetup")
    expect(Object.keys(SpellSetup.projectRoots)).toEqual(
      expect.arrayContaining(SPACES.PROJECT_GROUPS.map((it) => it.path))
    )
  })
})

describe("a person's space in another org (repo-split P26)", () => {
  test("is a group found by its address:  its projects open, unlisted", async () => {
    const { SpellSetup } = await import("spell/parser/spell/SpellSetup")
    expect(SpellSetup.groupFor("owen@acme/harbor-new")?.path).toBe("owen@acme")
    expect(SpellSetup.projectRootPaths).not.toContain("owen@acme")
  })
  test("never its own folders, nor this machine's person's space", async () => {
    const { SpellSetup } = await import("spell/parser/spell/SpellSetup")
    expect(SpellSetup.groupFor("ana@rs/__inbox")).toBeUndefined()
    expect(SpellSetup.groupFor("owen@spell/errors")?.description).toBe("Your own projects")
  })
})

describe("spaces' own names", () => {
  test("are known by spaces' list, never by the `__` alone (J52)", () => {
    for (const name of ["__me.json5", "__org.json5", "__project.json5", "__members", "__pack", "__parts", "__data"])
      expect(SPACES.isSpaceName(name), name).toBe(true)
    for (const name of ["__init__.py", "__snapshots__", "__pycache__", "__Class__.tsx.template", "__mine", "me.json5"])
      expect(SPACES.isSpaceName(name), name).toBe(false)
  })
})

describe("this machine's person (repo-split P27)", () => {
  test("personIdFor():  a name or an email made an id", () => {
    expect(SPACES.personIdFor("kim.lee@acme.com")).toBe("kim-lee")
    expect(SPACES.personIdFor("Kim Lee")).toBe("kim-lee")
    expect(SPACES.personIdFor("  Zoë  ")).toBe("zoe")
    expect(SPACES.personIdFor("42 owls")).toBe("owls")
    expect(SPACES.personIdFor("!!!")).toBe("")
  })

  test("setLocalPerson():  their own projects' group moves to their space", () => {
    const SpellSetup = spacesSetup
    const was = { id: SPACES.localPerson.id, org: SPACES.localPerson.org }
    try {
      SPACES.setLocalPerson({ id: "kim-lee", org: "acme" })
      expect(SPACES.PROJECT_GROUPS[0]!.path).toBe("kim-lee@acme")
      expect(SpellSetup.groupFor("kim-lee@acme/mine")?.description).toBe("Your own projects")
      expect(SpellSetup.projectRootPaths).not.toContain("owen@spell")
    } finally {
      SPACES.setLocalPerson(was)
    }
  })
})
