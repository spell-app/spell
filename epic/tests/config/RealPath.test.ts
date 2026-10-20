import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { RealPath } from "$/epics/config/RealPath"

/** A folder moved behind a compat link:  `old/repo -> ../new/repo`, as repo-split's move to `~/www/spell/` leaves it. */
const TOP = realpathSync(mkdtempSync(join(tmpdir(), "real-path-")))
const REAL = join(TOP, "new", "repo")
const OLD = join(TOP, "old", "repo")
mkdirSync(join(REAL, "src"), { recursive: true })
mkdirSync(join(TOP, "old"))
symlinkSync("../new/repo", OLD)
afterAll(() => rmSync(TOP, { recursive: true, force: true }))

describe("RealPath", () => {
  test("of():  links followed;  a missing path's nearest folder that's there, real, then the rest as given", () => {
    expect(RealPath.of(OLD)).toBe(REAL)
    expect(RealPath.of(join(OLD, "src"))).toBe(join(REAL, "src"))
    // gone (a removed worktree, a session's old cwd):  still under the real folder
    expect(RealPath.of(join(OLD, "gone", "deeper"))).toBe(join(REAL, "gone", "deeper"))
    // nothing of it there:  as given
    expect(RealPath.of("/no/such/place")).toBe("/no/such/place")
  })

  test("same():  either spelling;  empty is never the same", () => {
    expect(RealPath.same(OLD, REAL)).toBe(true)
    expect(RealPath.same(`${OLD}/`, REAL)).toBe(true)
    expect(RealPath.same(join(OLD, "src"), REAL)).toBe(false)
    expect(RealPath.same("", REAL)).toBe(false)
    expect(RealPath.same(undefined, undefined)).toBe(false)
  })

  test("isIn() / from():  the folder itself or inside it, by either spelling on either side", () => {
    expect(RealPath.isIn(join(OLD, "src"), REAL)).toBe(true)
    expect(RealPath.isIn(join(REAL, "src"), OLD)).toBe(true)
    expect(RealPath.isIn(OLD, REAL)).toBe(true)
    expect(RealPath.isIn(`${REAL}-other`, REAL)).toBe(false)
    expect(RealPath.isIn(TOP, REAL)).toBe(false)
    expect(RealPath.isIn("", REAL)).toBe(false)
    expect(RealPath.from(REAL, join(OLD, "src", "x.ts"))).toBe("src/x.ts")
    expect(RealPath.from(OLD, REAL)).toBe("")
    expect(RealPath.from(REAL, TOP)).toBeUndefined()
  })
})
