import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { CLI } from "spell/cli"

describe("toolArgs()", () => {
  test("plain node:  just the script, in the tool's checkout", () => {
    expect(CLI.toolArgs({ tool: "spell-epic/src/tools/design.js" }, "/kit")).toEqual([
      "/kit/spell-epic/src/tools/design.js"
    ])
  })
  test("tsx:  the kit's loader first, then the run-time alias hook", () => {
    expect(CLI.toolArgs({ tool: "src/server/page/cli.ts", tsx: "tsconfig.node.json" }, "/kit")).toEqual([
      "--import",
      CLI.TSX_LOADER,
      "/kit/src/server/page/cli.ts"
    ])
  })
})

describe("epicBin()", () => {
  // a kit with spell-epic in it, and a folder inside it
  const temp = realpathSync(mkdtempSync(join(tmpdir(), "epic-bin-")))
  afterAll(() => rmSync(temp, { recursive: true, force: true }))
  mkdirSync(join(temp, "kit", "spell-epic", "bin"), { recursive: true })
  mkdirSync(join(temp, "kit", "spell-app", "x"), { recursive: true })
  writeFileSync(join(temp, "kit", "spell-epic", "bin", "epic"), "")

  test("the nearest checkout's spell-epic:  its bin/epic", () => {
    expect(CLI.epicBin(join(temp, "kit", "spell-app", "x"))).toBe(join(temp, "kit", "spell-epic", "bin", "epic"))
  })
  test("none there:  the kit spell runs from's, else plain epic, from the PATH", () => {
    expect(CLI.epicBin(temp)).toMatch(/(^epic|\/spell-epic\/bin\/epic)$/)
  })
})

describe("rawArgsAfter()", () => {
  test("everything after the command's words, flags included", () => {
    const argv = process.argv
    try {
      process.argv = ["node", "spell.mjs", "--verbose", "design", "build", "--out", "x", "--all"]
      expect(CLI.rawArgsAfter("design", "build")).toEqual(["--out", "x", "--all"])
      process.argv = ["node", "spell.mjs", "server", "status", "--root", "server"]
      expect(CLI.rawArgsAfter("server", "status")).toEqual(["--root", "server"])
    } finally {
      process.argv = argv
    }
  })
})
