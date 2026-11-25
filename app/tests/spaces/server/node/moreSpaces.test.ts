import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { homedir, tmpdir } from "node:os"
import { delimiter, dirname, join } from "node:path"
import { afterAll, describe, expect, test, vi } from "vite-plus/test"

import { SRV } from "spell/server"
import { moreSpacesFrom, spacesDirForOrg } from "spell/app/spaces/server/node/spellSpacesDir"
import { moreOrgGroups } from "spell/app/spaces/server/node/people/localPerson"
import * as projectUtils from "spell/app/spaces/server/node/projects/project-utils"

/**
 * MORE SPACES FOLDERS (`~/.spell/more-spaces.json5`, `SPELL_MORE_SPACES`):  a project's `spaces/` served by the kit's
 * page server beside spell.spaces, its orgs read from there.  A made-up org, `@acme`, in temp folders.
 */

// its REAL path:  on macOS `tmpdir()` is a symlink
const temp = realpathSync(mkdtempSync(join(tmpdir(), "spell-more-spaces-")))
afterAll(() => rmSync(temp, { recursive: true, force: true }))

/** Write `text` at `path` under `temp`, making folders;  returns the path. */
function put(path: string, text = "{}"): string {
  const full = join(temp, path)
  mkdirSync(dirname(full), { recursive: true })
  writeFileSync(full, text)
  return full
}

const acme = join(temp, "acme-app", "spaces")
put("acme-app/spaces/@acme/tools/dashboard/__project.json5")
put("acme-app/spaces/@acme/alice@/__me.json5")
put("acme-app/spaces/@spell/owen@/mine/__project.json5")
const beta = join(temp, "beta-app", "spaces")
put("beta-app/spaces/@acme/other/x/__project.json5")
put("beta-app/spaces/@beta/apps/one/__project.json5")

describe("moreSpacesFrom()", () => {
  test("`SPELL_MORE_SPACES`:  each folder with the orgs it holds;  never `@spell`;  an org two hold, the first's", () => {
    const more = moreSpacesFrom({ env: { SPELL_MORE_SPACES: [acme, beta].join(delimiter) } })
    expect(more).toEqual([
      { dir: acme, orgs: ["acme"] },
      { dir: beta, orgs: ["beta"] }
    ])
  })

  test("the file, `{ spaces: [...] }`, its comments allowed and `~` read as home;  a folder not there left out", () => {
    const file = put("more-spaces.json5", `// mine\n{ spaces: [${JSON.stringify(acme)}, "~/no-such-spaces-folder"] }\n`)
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    try {
      expect(moreSpacesFrom({ env: {}, file })).toEqual([{ dir: acme, orgs: ["acme"] }])
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(join(homedir(), "no-such-spaces-folder")))
    } finally {
      warn.mockRestore()
    }
  })

  test("the file isn't read under a test, nor by a server given its own spaces (`--spaces`);  none there, none", () => {
    const file = put("more-spaces.json5", `{ spaces: [${JSON.stringify(acme)}] }`)
    expect(moreSpacesFrom({ env: { VITEST: "true" }, file })).toEqual([])
    expect(moreSpacesFrom({ env: {}, file, kitOwn: false })).toEqual([])
    expect(moreSpacesFrom({ env: {}, file: join(temp, "none.json5") })).toEqual([])
    // the variable still counts, and empty is none
    expect(moreSpacesFrom({ env: { SPELL_MORE_SPACES: acme }, kitOwn: false })).toHaveLength(1)
    expect(moreSpacesFrom({ env: { SPELL_MORE_SPACES: "" }, file })).toEqual([])
  })

  test("a file that won't read:  none, said", () => {
    const file = put("broken.json5", "{ spaces: ")
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      expect(moreSpacesFrom({ env: {}, file })).toEqual([])
      expect(error).toHaveBeenCalled()
    } finally {
      error.mockRestore()
    }
  })
})

describe("an org's spaces folder, groups and build folder", () => {
  const more = moreSpacesFrom({ env: { SPELL_MORE_SPACES: [acme, beta].join(delimiter) } })

  test("spacesDirForOrg():  the folder holding it, else spell.spaces", () => {
    expect(spacesDirForOrg("acme", more, "/spell.spaces")).toBe(acme)
    expect(spacesDirForOrg("beta", more, "/spell.spaces")).toBe(beta)
    expect(spacesDirForOrg("spell", more, "/spell.spaces")).toBe("/spell.spaces")
    expect(spacesDirForOrg("nobody", more, "/spell.spaces")).toBe("/spell.spaces")
  })

  test("moreOrgGroups():  every org's groups in them, never a person's space, never another folder's org", () => {
    expect(moreOrgGroups(more)).toEqual(["@acme/tools", "@beta/apps"])
  })

  test("buildFolderFor():  each its own build folder, named as `--spaces` names it", () => {
    const folders = { packagesDir: "/repo", buildDir: "/repo/build", spellSpacesDir: "/spell.spaces", moreSpaces: more }
    expect(projectUtils.buildFolderFor(join(acme, "@acme/tools/dashboard"), folders)).toBe(
      `/repo/build/spell-spaces.${SRV.spacesTag(acme)}/@acme/tools/dashboard`
    )
    expect(SRV.spacesTag(acme)).toMatch(/^acme-app-[0-9a-f]{8}$/)
    // spell.spaces' own, as before
    expect(projectUtils.buildFolderFor("/spell.spaces/@spell/owen@/errors", folders)).toBe(
      "/repo/build/spell-spaces/@spell/owen@/errors"
    )
  })
})
