import { describe, expect, test } from "vite-plus/test"

import { CliError } from "$/cli/cli.types"
import { checkBundles } from "$/cli/commands/bundleCommand"

describe("checkBundles()", () => {
  test("an unknown bundle is a CliError naming the bundles there are", async () => {
    await expect(checkBundles(["nope"])).rejects.toThrow(CliError)
    await expect(checkBundles(["nope"])).rejects.toThrow(/^no bundle 'nope';  bundles:  /)
  })
})
