import { readFileSync } from "fs"
import { resolve } from "path"
import { describe, test, expect } from "vite-plus/test"

import { PACKAGE_VERSION } from "$/util"

describe("`PACKAGE_VERSION`", () => {
  // the version of the package under test, the kit's (util has no package.json of its own), which vite hands over
  // (`packageVersion()`)
  test("is our package.json's version -- handed over by vite", () => {
    const { version } = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../../../package.json"), "utf8"))
    expect(PACKAGE_VERSION).toBe(version)
  })
})
