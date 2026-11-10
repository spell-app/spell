import { describe, expect, test } from "vite-plus/test"

import "spell/app/spaces/models/projectGroups"
import { RunSite } from "spell/app/app/pages/RunSite"

/**
 * A running site's address in the editor's Run (epic `mockup` P2):  the part of the URL after the project.
 */
describe("RunSite", () => {
  test("the part after the project is the site's address, still encoded", () => {
    const tail = "@spell/examples/StarWarsSite/films/1"
    expect(RunSite.siteAddressIn(tail, "/run/@spell/examples/StarWarsSite/films/1")).toBe("/films/1")
    expect(RunSite.siteAddressIn("@spell/examples/StarWarsSite/a b", "/run/@spell/examples/StarWarsSite/a%20b")).toBe(
      "/a%20b"
    )
  })

  test("a project's or a file's address is the site's root", () => {
    expect(RunSite.siteAddressIn("@spell/examples/StarWarsSite", "/run/@spell/examples/StarWarsSite")).toBe("/")
    expect(
      RunSite.siteAddressIn(
        "@spell/examples/StarWarsSite/StarWarsSite.spell",
        "/run/@spell/examples/StarWarsSite/StarWarsSite.spell"
      )
    ).toBe("/")
  })

  test("its Run URL:  the project's, then the address", () => {
    expect(RunSite.runUrlFor("@spell/examples/StarWarsSite", "/films/1")).toBe(
      "/run/@spell/examples/StarWarsSite/films/1"
    )
    expect(RunSite.runUrlFor("@spell/examples/StarWarsSite", "/")).toBe("/run/@spell/examples/StarWarsSite")
  })
})
