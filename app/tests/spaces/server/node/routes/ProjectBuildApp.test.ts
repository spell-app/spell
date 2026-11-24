import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, beforeAll, describe, expect, test, vi } from "vite-plus/test"

/**
 * `ProjectBuild` for a page server started for a project OUTSIDE the kit, with an org of its own (`@acme`):
 * a request for one of its projects' built files compiles it with the REAL `spell` CLI, as the page server does.
 * - Its own file:  spell.spaces and the build folder are read once, when spaces' code loads, so this one points
 *   them at a temp folder (`SPELL_SPACES_DIR`, `SPELL_BUILD_DIR`) before it loads any;  never the real space.
 * - The project's app folder, its `package.json` naming the org, is apart from the spaces, as in a real project.
 */

/** Write `text` at `path`, making folders. */
function put(path: string, text = ""): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

/** One real `spell compile`:  node, spell's source through `tsx`, the compile;  slower under every test at once. */
const COMPILE_MS = 90_000

describe("ProjectBuild, for a project outside the kit with its own org", () => {
  // its REAL path:  on macOS `tmpdir()` is a symlink
  const temp = realpathSync(mkdtempSync(join(tmpdir(), "app-project-build-org-")))
  const app = join(temp, "acme-app")
  const spaces = join(app, "spaces")

  beforeAll(() => {
    put(join(app, "package.json"), JSON.stringify({ name: "acme-app", private: true, spell: { org: "acme" } }))
    put(join(spaces, "@acme/tools/demo/__project.json5"), '{ imports: [{ path: "/Demo.spell", active: true }] }\n')
    put(join(spaces, "@acme/tools/demo/Demo.spell"), 'print "hello"\n')
    vi.stubEnv("SPELL_SPACES_DIR", spaces)
    vi.stubEnv("SPELL_BUILD_DIR", join(temp, "build"))
    // the compile must be TOLD the app:  not one this test's process happens to pass on
    vi.stubEnv("SPELL_APP_DIR", undefined)
  })
  afterAll(() => {
    vi.unstubAllEnvs()
    rmSync(temp, { recursive: true, force: true })
  })

  test(
    "a request for a built file of `@acme/tools/demo`:  compiles it, told the app (`SPELL_APP_DIR`), then it's there",
    async () => {
      // loaded now, so spell.spaces and the build folder are the temp ones
      const { SP } = await import("spell/parser/spell")
      const { addOrgGroups } = await import("spell/app/spaces/models/projectGroups")
      const { orgGroupsIn } = await import("spell/app/spaces/server/node/people/localPerson")
      const { ProjectBuild } = await import("spell/app/spaces/server/node/routes/ProjectBuild")
      // the page server's own start (`thisMachinesPerson()`):  the org's groups, from its spaces
      addOrgGroups(orgGroupsIn(spaces, "acme"))
      const built = SP.SpellLocation.getFileLocation("@acme/tools/demo", `demo${SP.COMPILED_JS_SUFFIX}`)
      expect(built.serverPath.startsWith(join(temp, "build"))).toBe(true)

      const build = new ProjectBuild({ app, timeout: COMPILE_MS })
      expect(build.app).toBe(app)
      vi.spyOn(console, "log").mockImplementation(() => {})
      vi.spyOn(console, "info").mockImplementation(() => {})
      expect(await build.untilBuilt(built)).toBe(true)
    },
    COMPILE_MS + 10_000
  )
})
