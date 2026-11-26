import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { delimiter, dirname, join } from "node:path"
import { afterAll, beforeAll, describe, expect, test, vi } from "vite-plus/test"

/**
 * Every org group the server serves, worked out ONCE (`servedOrgGroups()`, epic `editor` P47, Q97 A), over scratch
 * folders:  an org's repo with `@acme/` at its top, another org's `spaces/`, and a spell.spaces with a person's space.
 * - Its own file:  the folders are read once, as spaces' code loads, so this one points them at temp folders first
 *   (`SPELL_SPACES_DIR`, `SPELL_MORE_SPACES`, `SPELL_BUILD_DIR`);  never the real space.
 */

/** Write `text` at `path`, making folders. */
function put(path: string, text = "{}"): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

describe("the org groups served", () => {
  // its REAL path:  on macOS `tmpdir()` is a symlink
  const temp = realpathSync(mkdtempSync(join(tmpdir(), "spell-served-org-groups-")))
  const acme = join(temp, "acme-spell")
  const beta = join(temp, "beta-spell", "spaces")
  const spaces = join(temp, "spell.spaces")

  beforeAll(() => {
    put(join(acme, "@acme/org-spell/dashboard/__project.json5"))
    put(join(acme, "@acme/org-spell/README.md"), "# Org Spell\n\nThe org's own apps.\n")
    put(join(acme, "@acme/ops/jobs/__project.json5"))
    put(join(acme, "@acme/portal/home/__project.json5"))
    put(join(acme, "@acme/portal/docs/__project.json5"))
    // a project of the org's own, not a group;  a person's space;  a folder with no projects
    put(join(acme, "@acme/OrgAdmin/__project.json5"))
    put(join(acme, "@acme/alice@/mine/__project.json5"))
    put(join(acme, "@acme/notes/readme.txt"), "not a project")
    put(join(beta, "@beta/tools/board/__project.json5"))
    put(join(spaces, "@spell/owen@/mine/__project.json5"))
    vi.stubEnv("SPELL_SPACES_DIR", spaces)
    vi.stubEnv("SPELL_MORE_SPACES", [acme, beta].join(delimiter))
    vi.stubEnv("SPELL_BUILD_DIR", join(temp, "build"))
  })
  afterAll(() => {
    vi.unstubAllEnvs()
    rmSync(temp, { recursive: true, force: true })
  })

  test("servedOrgGroups():  every org's groups in every spaces folder, whatever this machine's org;  once", async () => {
    const { servedOrgGroups, localPersonAnswer, groupPagesOf } =
      await import("spell/app/spaces/server/node/people/localPerson")
    const { SPACES } = await import("spell/app/spaces")
    expect(servedOrgGroups()).toEqual(["@acme/ops", "@acme/org-spell", "@acme/portal", "@beta/tools"])
    expect(servedOrgGroups()).toBe(servedOrgGroups())
    expect(SPACES.orgGroups).toEqual(expect.arrayContaining(servedOrgGroups()))
    // only the group with a project named `home` has its own page
    expect(groupPagesOf()).toEqual(["@acme/portal"])
    const answer = localPersonAnswer()
    expect(answer.org).toBe("spell")
    expect(answer.orgGroups).toEqual(expect.arrayContaining(servedOrgGroups()))
    expect(answer.groupPages).toEqual(["@acme/portal"])
  })

  test("the editor's models:  the orgs in order, each one's groups, an address's page", async () => {
    const { SPACES } = await import("spell/app/spaces")
    expect(SPACES.orgsWithGroups()).toEqual(["acme", "beta"])
    expect(SPACES.groupsOfOrg("acme")).toEqual(["@acme/ops", "@acme/org-spell", "@acme/portal"])
    expect(SPACES.orgPageFor("@acme")).toEqual({ org: "acme" })
    expect(SPACES.orgPageFor("@acme/org-spell/")).toEqual({ org: "acme", group: "@acme/org-spell" })
    for (const address of ["@acme/org-spell/dashboard", "@acme/OrgAdmin", "@rs", "@spell/examples"]) {
      expect(SPACES.orgPageFor(address), address).toBeUndefined()
    }
    // your own org first, then by name
    const was = { id: SPACES.localPerson.id, org: SPACES.localPerson.org }
    SPACES.setLocalPerson({ id: "bo", org: "beta" })
    try {
      expect(SPACES.orgsWithGroups()).toEqual(["beta", "acme"])
    } finally {
      SPACES.setLocalPerson(was)
    }
  })

  test("on disk, as the editor's servers ask (`orgGroupFolders()`):  a group, and a group with its own page", async () => {
    const { orgGroupFolders } = await import("spell/app/spaces/server/node/spellSpacesDir")
    const folders = orgGroupFolders()
    expect(["@acme/org-spell", "@acme/portal", "@beta/tools"].map(folders.isGroup)).toEqual([true, true, true])
    expect(["@acme/OrgAdmin", "@acme/notes", "@acme/nothing", "@acme"].map(folders.isGroup)).toEqual([
      false,
      false,
      false,
      false
    ])
    expect(["@acme/portal", "@acme/org-spell"].map(folders.hasOwnPage)).toEqual([true, false])
  })

  test("the org's own list never lists its groups as projects (the `/edit/@acme` failure);  a group's README", async () => {
    const projectUtils = await import("spell/app/spaces/server/node/projects/project-utils")
    const paths = (await projectUtils.getProjectList("@acme")).map((project) => project.path)
    expect(paths).toContain("@acme/OrgAdmin")
    for (const group of ["@acme/ops", "@acme/org-spell", "@acme/portal"]) expect(paths).not.toContain(group)
    expect((await projectUtils.getProjectList("@acme/portal")).map((project) => project.path)).toEqual([
      "@acme/portal/docs",
      "@acme/portal/home"
    ])
  })
})
