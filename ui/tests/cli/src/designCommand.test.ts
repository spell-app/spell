import { describe, expect, test } from "vite-plus/test"

import { CLI } from "spell-kit/cli"
import { DESIGN_TOOLS, designBuildArgs, designCommand } from "$/ui/cli/designCommand"

describe("DESIGN_TOOLS", () => {
  test("build:  Spell UI's own script, under tsx, from the kit's root", () => {
    expect(CLI.toolArgs(DESIGN_TOOLS.build, "/kit")).toEqual([
      "--import",
      CLI.TSX_LOADER,
      "--import",
      CLI.ALIASES,
      "/kit/spell-ui/scripts/design-build.ts"
    ])
  })
  test("the bundle and its check:  spell-brand's, under tsx", () => {
    expect(CLI.toolArgs(DESIGN_TOOLS.bundle, "/kit").at(-1)).toBe("/kit/spell-brand/scripts/design-bundle.ts")
    expect(CLI.toolArgs(DESIGN_TOOLS.check, "/kit").at(-1)).toBe("/kit/spell-brand/scripts/design-check.ts")
  })
  test("the sync verbs:  spell-epic's design tool, plain node", () => {
    expect(CLI.toolArgs(DESIGN_TOOLS.sync, "/kit")).toEqual(["/kit/spell-epic/src/tools/design.js"])
  })
})

describe("designBuildArgs()", () => {
  test("the kit's spell-brand, before the caller's own arguments", () => {
    expect(designBuildArgs("/no-such-kit").slice(0, 2)).toEqual(["--brand", "/no-such-kit/spell-brand"])
  })
})

describe("designCommand()", () => {
  test("another verb is a usage error, naming the verbs", () => {
    expect(() => designCommand("make", [])).toThrow(
      new CLI.CliError("unknown verb 'make':  build, bundle, check, pull, changed, pushed, state")
    )
  })
})
