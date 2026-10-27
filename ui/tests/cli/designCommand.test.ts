import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import { describe, expect, test } from "vite-plus/test"

import { CLI } from "spell/cli"
import { DESIGN_TOOLS, designBuildArgs, designCommand } from "spell/ui/cli/designCommand"

describe("DESIGN_TOOLS", () => {
  test("build:  Spell UI's own script, under tsx, from the kit's root", () => {
    expect(CLI.toolArgs(DESIGN_TOOLS.build, "/kit")).toEqual([
      "--import",
      CLI.TSX_LOADER,
      "/kit/ui/scripts/design-build.ts"
    ])
  })
  test("the sync verbs:  spell-epic's design tool, plain node", () => {
    expect(CLI.toolArgs(DESIGN_TOOLS.sync, "/kit")).toEqual(["/kit/epic/src/tools/design.js"])
  })
  test("each tool's tsconfig is there:  a missing one stops `spell design build` before it starts", () => {
    const kit = join(import.meta.dirname, "../../..")
    for (const spec of Object.values(DESIGN_TOOLS)) {
      if ("tsx" in spec) expect(existsSync(join(kit, spec.tsx)), spec.tsx).toBe(true)
    }
  })
})

describe("designBuildArgs()", () => {
  test("spell-brand, the kit's peer, before the caller's own arguments;  none beside the kit:  no --brand", () => {
    const kit = mkdtempSync(join(tmpdir(), "design-kit-"))
    const brand = `${kit}-brand`
    mkdirSync(brand)
    writeFileSync(join(brand, "package.json"), JSON.stringify({ name: "spell-brand" }))
    writeFileSync(join(kit, "repos.json5"), `{ repos: [{ name: "spell-brand", path: "../${basename(brand)}", peer: true }] }`)
    expect(designBuildArgs(kit).slice(0, 2)).toEqual(["--brand", brand])
    expect(designBuildArgs("/no-such-kit")).not.toContain("--brand")
    for (const dir of [kit, brand]) rmSync(dir, { recursive: true, force: true })
  })
})

describe("designCommand()", () => {
  test("another verb is a usage error, naming the verbs", () => {
    expect(() => designCommand("make", [])).toThrow(
      new CLI.CliError("unknown verb 'make':  build, bundle, check, pull, changed, pushed, state")
    )
  })
})
