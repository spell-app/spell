import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, beforeAll, describe, expect, test, vi } from "vite-plus/test"

/**
 * A more spaces folder (`SPELL_MORE_SPACES`) as the page server's code sees it:  an `@acme` project's address reads
 * from that folder, builds into its own build folder, and its group is listed.
 * - Its own file:  the folders are read once, when spaces' code loads, so this one points them at temp folders
 *   (`SPELL_SPACES_DIR`, `SPELL_MORE_SPACES`, `SPELL_BUILD_DIR`) before it loads any;  never the real space.
 */

/** Write `text` at `path`, making folders. */
function put(path: string, text = "{}"): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

describe("a more spaces folder, served", () => {
  // its REAL path:  on macOS `tmpdir()` is a symlink
  const temp = realpathSync(mkdtempSync(join(tmpdir(), "spell-more-spaces-served-")))
  const acme = join(temp, "acme-app", "spaces")
  const build = join(temp, "build")

  beforeAll(() => {
    put(join(acme, "@acme/tools/dashboard/__project.json5"), '{ imports: [{ path: "/Dash.spell", active: true }] }\n')
    put(join(acme, "@acme/tools/dashboard/Dash.spell"), 'print "hello"\n')
    put(join(temp, "spell.spaces/@spell/owen@/mine/__project.json5"))
    vi.stubEnv("SPELL_SPACES_DIR", join(temp, "spell.spaces"))
    vi.stubEnv("SPELL_MORE_SPACES", acme)
    vi.stubEnv("SPELL_BUILD_DIR", build)
  })
  afterAll(() => {
    vi.unstubAllEnvs()
    rmSync(temp, { recursive: true, force: true })
  })

  test("`@acme/tools/dashboard`:  a project of the listed group `@acme/tools`, its files and build in their own folders", async () => {
    // loaded now, so the folders are the temp ones
    const { SP } = await import("spell/parser/spell")
    const { SRV } = await import("spell/server")
    const { SPACES } = await import("spell/app/spaces")
    const projectUtils = await import("spell/app/spaces/server/node/projects/project-utils")
    const { localPersonAnswer } = await import("spell/app/spaces/server/node/people/localPerson")

    expect(localPersonAnswer().orgGroups).toContain("@acme/tools")
    expect(SPACES.orgGroups).toContain("@acme/tools")

    const source = SP.SpellLocation.getFileLocation("@acme/tools/dashboard", "Dash.spell")
    expect(source.serverPath).toBe(join(acme, "@acme/tools/dashboard/Dash.spell"))
    const built = SP.SpellLocation.getFileLocation("@acme/tools/dashboard", `dashboard${SP.COMPILED_JS_SUFFIX}`)
    expect(built.serverPath).toBe(
      join(build, `spell-spaces.${SRV.spacesTag(acme)}`, "@acme/tools/dashboard", `dashboard${SP.COMPILED_JS_SUFFIX}`)
    )
    expect(await projectUtils.getProjectList("@acme/tools")).toEqual([expect.objectContaining({ path: "@acme/tools/dashboard" })])

    // spell.spaces' own stay where they were
    expect(SP.SpellLocation.getProjectLocation("owen@spell/mine").serverPath).toBe(join(temp, "spell.spaces/@spell/owen@/mine"))
  })
})
