import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, test, vi } from "vite-plus/test"

import { CLI } from "spell/cli"
import { DESIGN_TOOLS, designBuildArgs, designCommand } from "spell/ui/cli/designCommand"

describe("DESIGN_TOOLS", () => {
  test("build:  Spell UI's own script, under tsx, from the kit's root", () => {
    expect(CLI.toolArgs(DESIGN_TOOLS.build, "/kit")).toEqual([
      "--import",
      CLI.tsxLoader(),
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
  test("the brand book when the epic folder has one, never a --brand;  none:  nothing", () => {
    const kit = mkdtempSync(join(tmpdir(), "design-kit-"))
    vi.stubEnv("SPELL_SHARED_DIR", kit)
    writeFileSync(join(kit, "repos.json5"), "{ repos: [] }")
    expect(designBuildArgs(kit)).toEqual([])
    const book = join(kit, "brand/spell-design-system/readme.md")
    mkdirSync(join(kit, "brand/spell-design-system"), { recursive: true })
    writeFileSync(book, "# Brand\n")
    expect(designBuildArgs(kit)).toEqual(["--brand-book", book])
    vi.unstubAllEnvs()
    expect(designBuildArgs("/no-such-kit")).toEqual([])
    rmSync(kit, { recursive: true, force: true })
  })
})

describe("designCommand()", () => {
  test("another verb is a usage error, naming the verbs", () => {
    expect(() => designCommand("make", [])).toThrow(
      new CLI.CliError("unknown verb 'make':  build, pull, changed, pushed, state")
    )
  })
})
