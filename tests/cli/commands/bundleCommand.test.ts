import { describe, expect, test, vi } from "vite-plus/test"

import { SRV } from "spell/server"
import { CLI } from "spell/cli"
import { CliError } from "spell/cli/cli.types"
import { buildBundles, checkBundles } from "spell/cli/commands/bundleCommand"

describe("checkBundles()", () => {
  test("an unknown bundle is a CliError naming the bundles there are", async () => {
    await expect(checkBundles(["nope"])).rejects.toThrow(CliError)
    await expect(checkBundles(["nope"])).rejects.toThrow(/^no bundle 'nope';  bundles:  /)
  })
})

// epic `epic-engine` P54 (Owen, Q61:  "Only in a worktree")
describe("buildBundles()", () => {
  /** a bundle of the main checkout:  committed and stale (never built by `--stale`), or a plain one, current */
  function bundle(name: string, { committed }: { committed: boolean }) {
    const check = committed
      ? { name, output: "x", sources: "s", stale: "its check failed", fix: "run yarn gen:root in ui/" }
      : { name, output: "x", sources: "s" }
    return { name, buildsWhenStale: !committed, check: () => check, build: vi.fn() } as unknown as SRV.Bundle
  }

  test("--stale in the main checkout:  a committed one is never built, only said, with what to run", async () => {
    const root = bundle("ui-root", { committed: true })
    vi.spyOn(SRV.Bundle, "all").mockReturnValue([root, bundle("ui-site", { committed: false })])
    const out = vi.spyOn(CLI, "out").mockImplementation(() => {})
    expect(await buildBundles([], { stale: true })).toBe(CLI.EXIT.OK)
    expect(root.build).not.toHaveBeenCalled()
    expect(out.mock.calls.map(([line]) => line)).toEqual([
      "ui-site:  current",
      "ui-root is stale (its check failed):  run yarn gen:root in ui/"
    ])
    vi.restoreAllMocks()
  })
})
