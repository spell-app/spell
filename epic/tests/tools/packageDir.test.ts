/**
 * Tests of `packageDir()` (`spell/epic/tools/packageDir`):  a package's folder, found the toolchain's one way
 * (`packageFolderFor()`, epic `coherence` P29, I22).
 */
import { existsSync, realpathSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, expect, test } from "vite-plus/test"

import { packageDir } from "spell/epic/tools/packageDir"

/** The kit this checkout is:  `epic/tests/tools/` is three folders under it. */
const KIT = realpathSync(resolve(import.meta.dirname, "..", "..", ".."))

describe("packageDir()", () => {
  test("a package alone:  its root", () => {
    expect(packageDir("spell")).toBe(KIT)
  })

  test("a sub-path of the kit's own code:  under its src/", () => {
    expect(packageDir("spell/server")).toBe(join(KIT, "src", "server"))
  })

  test("a sub-path in a folder of the kit:  that folder's src/ (I22)", () => {
    const py = packageDir("spell/parser/py")
    expect(py).toBe(join(KIT, "parser", "src", "py"))
    expect(existsSync(py!)).toBe(true)
    expect(packageDir("spell/ui/core")).toBe(join(KIT, "ui", "src", "core"))
  })

  test("not installed:  undefined", () => {
    expect(packageDir("no-such-package-p29")).toBeUndefined()
  })
})
