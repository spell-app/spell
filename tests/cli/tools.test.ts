import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { CLI } from "spell/cli"

describe("toolArgs()", () => {
  test("plain node:  just the script, in the tool's checkout", () => {
    expect(CLI.toolArgs({ tool: "epic/src/tools/design.js" }, "/kit")).toEqual(["/kit/epic/src/tools/design.js"])
  })
  test("tsx:  the kit's loader first, then the run-time alias hook", () => {
    expect(CLI.toolArgs({ tool: "src/server/page/cli.ts", tsx: "tsconfig.node.json" }, "/kit")).toEqual([
      "--import",
      CLI.tsxLoader(),
      "/kit/src/server/page/cli.ts"
    ])
  })
})

describe("builtTool() (repo-split P26)", () => {
  // the published spell:  its code built into dist/, no src/
  const temp = realpathSync(mkdtempSync(join(tmpdir(), "built-tool-")))
  afterAll(() => rmSync(temp, { recursive: true, force: true }))
  for (const file of ["dist/server/page/cli.js", "dist/app/cli/main.js"]) {
    mkdirSync(join(temp, "installed", file, ".."), { recursive: true })
    writeFileSync(join(temp, "installed", file), "")
  }
  mkdirSync(join(temp, "checkout", "src"), { recursive: true })
  const pageServer = { tool: "src/server/page/cli.ts", tsx: "tsconfig.node.json" }

  test("an install:  the built .js, under plain node", () => {
    expect(CLI.builtTool(pageServer, join(temp, "installed"))).toEqual({ tool: "dist/server/page/cli.js" })
  })
  test("a big folder's:  under dist/<folder>/", () => {
    expect(CLI.builtTool({ tool: "app/src/cli/main.ts", tsx: "x" }, join(temp, "installed"))).toEqual({
      tool: "dist/app/cli/main.js"
    })
  })
  test("a checkout, or a tool the install doesn't ship:  as written", () => {
    expect(CLI.builtTool(pageServer, join(temp, "checkout"))).toBe(pageServer)
    const missing = { tool: "src/cli/readme/check.ts", tsx: "x" }
    expect(CLI.builtTool(missing, join(temp, "installed"))).toBe(missing)
  })
})

describe("epicBin()", () => {
  // a kit with its engine folder, epic/, in it, and a folder inside it
  const temp = realpathSync(mkdtempSync(join(tmpdir(), "epic-bin-")))
  afterAll(() => rmSync(temp, { recursive: true, force: true }))
  mkdirSync(join(temp, "kit", "epic", "bin"), { recursive: true })
  mkdirSync(join(temp, "kit", "spell-app", "x"), { recursive: true })
  writeFileSync(join(temp, "kit", "epic", "bin", "epic"), "")

  test("the nearest checkout's engine:  its epic/bin/epic", () => {
    expect(CLI.epicBin(join(temp, "kit", "spell-app", "x"))).toBe(join(temp, "kit", "epic", "bin", "epic"))
  })
  test("none there:  the kit spell runs from's, else plain epic, from the PATH", () => {
    expect(CLI.epicBin(temp)).toMatch(/(^epic|\/epic\/bin\/epic)$/)
  })
})

describe("publishedEpicBin() (epic-friend P13)", () => {
  // the published spell, spell-epic installed beside it:  npm install spell spell-epic
  const temp = realpathSync(mkdtempSync(join(tmpdir(), "published-epic-")))
  afterAll(() => rmSync(temp, { recursive: true, force: true }))
  const kit = join(temp, "node_modules", "spell")
  const epic = join(temp, "node_modules", "spell-epic")
  mkdirSync(kit, { recursive: true })
  mkdirSync(join(epic, "bin"), { recursive: true })
  writeFileSync(join(kit, "package.json"), '{ "name": "spell", "version": "0.8.6" }')
  writeFileSync(join(epic, "package.json"), '{ "name": "spell-epic", "version": "0.8.6" }')

  test("spell-epic beside the kit:  its bin/epic", () => {
    writeFileSync(join(epic, "bin", "epic"), "")
    expect(CLI.publishedEpicBin(kit)).toBe(join(epic, "bin", "epic"))
  })
  test("none:  undefined;  spell's own version, for npx to fetch spell-epic at", () => {
    rmSync(epic, { recursive: true, force: true })
    expect(CLI.publishedEpicBin(kit)).toBeUndefined()
    expect(CLI.spellVersion(kit)).toBe("0.8.6")
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
