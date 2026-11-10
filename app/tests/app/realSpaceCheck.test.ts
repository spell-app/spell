import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterAll, describe, expect, test } from "vite-plus/test"

/**
 * The check that a test run adds nothing to your real space, on a temporary space:  it never reads your real one.
 */

/** The temporary space:  set BEFORE `spellSpacesDir` is loaded, which reads it once. */
const SPACES = mkdtempSync(path.join(tmpdir(), "realSpaceCheck-"))
process.env.SPELL_SPACES_DIR = SPACES

const { leftBehindMessage, newSpaceFolders, spaceFolders } = await import("../realSpaceCheck")

/** A process number nothing is running as:  a process that has already finished. */
const DEAD_PID = spawnSync(process.execPath, ["-e", ""]).pid

/** Make folder `folder` in the temporary space. */
const makeFolder = (folder: string) => mkdirSync(path.join(SPACES, folder), { recursive: true })

makeFolder("@spell/owen@/recipes")
makeFolder("@spell/owen@/__prefs/theme")
makeFolder("@acme/OrgChat")
makeFolder("@acme/__admin")

describe("realSpaceCheck", () => {
  afterAll(() => rmSync(SPACES, { recursive: true, force: true }))

  test("lists each org, person and project by name, and nothing private", () => {
    expect(spaceFolders().toSorted()).toEqual([
      "@acme",
      "@acme/OrgChat",
      "@spell",
      "@spell/owen@",
      "@spell/owen@/recipes"
    ])
  })

  test("editing a file changes nothing;  a new project is named", () => {
    const before = spaceFolders()
    writeFileSync(path.join(SPACES, "@spell/owen@/recipes/Note.spell"), "edited")
    expect(newSpaceFolders(before)).toEqual([])

    makeFolder("@spell/owen@/left-behind")
    expect(newSpaceFolders(before)).toEqual(["@spell/owen@/left-behind"])
    expect(leftBehindMessage(newSpaceFolders(before))).toContain("  - @spell/owen@/left-behind")
    rmSync(path.join(SPACES, "@spell/owen@/left-behind"), { recursive: true })
  })

  test("skips ANOTHER run's live test project;  names this run's, and a dead run's", () => {
    const before = spaceFolders()
    makeFolder(`@spell/owen@/drafts-test-${process.ppid}`)
    makeFolder(`@spell/owen@/drafts-test-${process.pid}`)
    makeFolder(`@spell/owen@/drafts-test-${DEAD_PID}`)
    expect(newSpaceFolders(before).toSorted()).toEqual(
      [`@spell/owen@/drafts-test-${process.pid}`, `@spell/owen@/drafts-test-${DEAD_PID}`].toSorted()
    )
  })
})
