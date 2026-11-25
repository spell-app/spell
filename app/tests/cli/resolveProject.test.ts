import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { dirname, resolve } from "path"
import { afterAll, describe, test, expect } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { CLI } from "spell/app/cli"
import {
  fixturePath,
  fixtureProjectId,
  fixtureProjectNames,
  FIXTURES_DIR,
  EXAMPLE_PROJECTS,
  GUIDE_PROJECTS,
  fixtureFolder
} from "spell/app/spaces/test"
import { moreSpaces, spacesDirForOrg } from "spell/app/spaces/server/node/spellSpacesDir"

/** What `arg` names, reduced to `kind` + id for comparing. */
async function named(arg: string, cwd?: string) {
  const resolved = await CLI.resolveProject(arg, cwd)
  if (resolved.kind === "project") return { kind: resolved.kind, id: resolved.project.projectId }
  if (resolved.kind === "file") return { kind: resolved.kind, id: resolved.file.path }
  return { kind: resolved.kind, ids: resolved.projectIds }
}

const FIZZBUZZ = fixtureProjectId("fizzbuzz")
const SOLITAIRE = fixtureProjectId("@spell/examples/Solitaire")
const GAME = `${SOLITAIRE}/Solitaire.spell`
// the frozen ones, `@spell/test`'s, in the order a group lists its projects:  by name
const ALL_FIXTURES = fixtureProjectNames()
  .filter((name) => !EXAMPLE_PROJECTS.has(name) && !GUIDE_PROJECTS.has(name))
  .map(fixtureProjectId)
  .sort((a, b) => a.localeCompare(b))

describe("resolveProject()", () => {
  describe("spell paths", () => {
    test("a project, by its address", async () => {
      expect(await named("@spell/test/fizzbuzz")).toEqual({ kind: "project", id: FIZZBUZZ })
    })
    test("a project, by its id (its address)", async () => {
      expect(await named(SOLITAIRE)).toEqual({ kind: "project", id: SOLITAIRE })
    })
    test("a spell file", async () => {
      expect(await named("@spell/examples/Solitaire/Solitaire.spell")).toEqual({ kind: "file", id: GAME })
    })
    test("a group, by its address, holds only folders with a project.json", async () => {
      expect(await named("@spell/test")).toEqual({ kind: "root", ids: ALL_FIXTURES })
    })
  })

  describe("disk paths", () => {
    test("a project folder", async () => {
      expect(await named(fixtureFolder("@spell/examples/Solitaire"))).toEqual({ kind: "project", id: SOLITAIRE })
    })
    test("a project's project.json", async () => {
      expect(await named(fixtureFolder("@spell/examples/Solitaire", SP.PROJECT_FILE))).toEqual({
        kind: "project",
        id: SOLITAIRE
      })
    })
    test("a spell file, relative to cwd", async () => {
      expect(await named("Solitaire.spell", fixtureFolder("@spell/examples/Solitaire"))).toEqual({
        kind: "file",
        id: GAME
      })
    })
    test("a known root's folder", async () => {
      expect(await named(FIXTURES_DIR)).toEqual({ kind: "root", ids: ALL_FIXTURES })
    })
    test("`@here` is the current folder", async () => {
      expect(await named("@here", fixtureFolder("@spell/examples/Solitaire"))).toEqual({
        kind: "project",
        id: SOLITAIRE
      })
      expect(await named("@here/Solitaire.spell", fixtureFolder("@spell/examples/Solitaire"))).toEqual({
        kind: "file",
        id: GAME
      })
    })
  })

  describe("a project in an org's group of a spaces folder:  that folder serves its org for the command", () => {
    // a made-up org's spaces, as an app keeps them:  `<app>/spaces/@acme/tools/{dashboard,jobs}`
    const temp = realpathSync(mkdtempSync(resolve(tmpdir(), "spell-cli-org-")))
    const spaces = resolve(temp, "acme-app", "spaces")
    const put = (path: string, text = "{}") => {
      mkdirSync(dirname(resolve(spaces, path)), { recursive: true })
      writeFileSync(resolve(spaces, path), text)
    }
    put(`@acme/tools/dashboard/${SP.PROJECT_FILE}`)
    put("@acme/tools/dashboard/Board.spell", "print 1")
    put(`@acme/tools/jobs/${SP.PROJECT_FILE}`)
    afterAll(() => {
      for (const each of moreSpaces) each.orgs = each.orgs.filter((org) => org !== "acme")
      rmSync(temp, { recursive: true, force: true })
    })

    test("its folder is a project of the org's group, not a `@local` one", async () => {
      expect(await named(resolve(spaces, "@acme/tools/dashboard"))).toEqual({
        kind: "project",
        id: "@acme/tools/dashboard"
      })
      expect(await named("Board.spell", resolve(spaces, "@acme/tools/dashboard"))).toEqual({
        kind: "file",
        id: "@acme/tools/dashboard/Board.spell"
      })
    })

    test("so a project beside it is read by its address, as an import names it, from the same folder", async () => {
      await named(resolve(spaces, "@acme/tools/dashboard"))
      expect(spacesDirForOrg("acme")).toBe(spaces)
      const jobs = new SP.SpellLocation("@acme/tools/jobs")
      expect(jobs.isProjectPath).toBe(true)
      expect(jobs.serverPath).toBe(resolve(spaces, "@acme/tools/jobs"))
    })

    test("Spell's own org is never served from a project's folder", async () => {
      put(`@spell/tools/mine/${SP.PROJECT_FILE}`)
      expect(await named(resolve(spaces, "@spell/tools/mine"))).toMatchObject({ id: "@local/tools/mine" })
      expect(spacesDirForOrg("spell")).not.toBe(spaces)
    })
  })

  describe("errors", () => {
    test.each([
      "@nope",
      "@spell/test/nope",
      "@spell/examples/Solitaire/Nope.spell",
      "@spell/examples/Solitaire/project.json",
      "./no/such/thing"
    ])("%s", async (arg) => {
      await expect(CLI.resolveProject(arg, fixturePath())).rejects.toBeInstanceOf(CLI.CliError)
    })

    test("a folder outside any project -- and writes NO project.json into it", async () => {
      const folder = mkdtempSync(resolve(tmpdir(), "spell-cli-"))
      try {
        writeFileSync(resolve(folder, "Loose.spell"), "print 1")
        await expect(CLI.resolveProject(folder)).rejects.toThrow(/isn't in a spell project/)
        await expect(CLI.resolveProject(resolve(folder, "Loose.spell"))).rejects.toThrow(/isn't in a spell project/)
        expect(existsSync(resolve(folder, SP.PROJECT_FILE))).toBe(false)
      } finally {
        rmSync(folder, { recursive: true })
      }
    })
  })
})

describe("rootsNamed()", () => {
  const paths = (name: string) => CLI.rootsNamed(name).map((spec) => spec.path)

  test("a group's address, or a space:  every group in it", () => {
    expect(paths("@spell/guides")).toEqual(["@spell/guides"])
    expect(paths("@spell/library")).toEqual(["@spell/library"])
    expect(paths("owen@spell")).toEqual(["owen@spell"])
    expect(paths("@spell")).toEqual([
      "@spell/examples",
      "@spell/guides",
      "@spell/sites",
      "@spell/library",
      "@spell/editor",
      "@spell/test"
    ])
  })

  test("none for anything else", () => {
    expect(paths("@nope")).toEqual([])
    // the short names before the addresses (`@examples`) name nothing
    expect(paths("@examples")).toEqual([])
  })
})
