import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { OpenedFile, RunSiteHost } from "spell/app/app/run/RunSiteHost"

/**
 * The run page's site host opened at a page's FILE, `/run/<project>/home.spell`:  the address the editor's Run gives a
 * page alone in its file, which a reload sends to the run page.
 */

/** A site's pages, as its lines compile:  Home at `/`, a rack list, and one rack by its address. */
const SITE = {
  allPages: () => [
    { name: "home", page: "HomeScreen", address: "/" },
    { name: "racks", page: "RackListScreen", address: "/racks" },
    { name: "rack", page: "RackScreen", address: "/racks/:picked", params: ["picked"] }
  ]
}

/** A project's declarations:  the pages each file declares, and a view. */
const DECLARATIONS = {
  statements: [
    { type: "HomeScreen", superType: "Page", defined: "/home.spell:10-90" },
    { type: "Greeting", superType: "View", defined: "/home.spell:100-200" },
    { type: "RackListScreen", superType: "Page", defined: "/racks.spell:10-90" },
    { type: "RackScreen", superType: "Page", defined: "/racks.spell:100-200" }
  ]
}

const BASE = "/run/@acme/tools/console"

/** Where the site draws:  nothing here looks in it. */
const ROOT = {} as ParentNode

/** Open the page at `path`. */
function openAt(path: string): void {
  vi.stubGlobal("location", { pathname: path, hash: "", search: "" })
}

afterEach(() => vi.unstubAllGlobals())

describe("OpenedFile", () => {
  test("the pages a file declares, in its order;  none for a file declaring none", () => {
    expect(OpenedFile.pagesIn(DECLARATIONS, "/home.spell")).toEqual(["HomeScreen"])
    expect(OpenedFile.pagesIn(DECLARATIONS, "/racks.spell")).toEqual(["RackListScreen", "RackScreen"])
    expect(OpenedFile.pagesIn(DECLARATIONS, "/console.site.spell")).toEqual([])
    expect(OpenedFile.pagesIn(undefined, "/home.spell")).toEqual([])
  })

  test("names no file for a site's own address", async () => {
    expect(await OpenedFile.of("/racks/d16", "/nowhere.json5")).toBeUndefined()
  })
})

describe("RunSiteHost opened at a file", () => {
  test("shows the page the file declares, at its address", () => {
    openAt(`${BASE}/home.spell`)
    const host = new RunSiteHost(BASE, ROOT, { path: "/home.spell", pages: ["HomeScreen"] })
    expect(host.address(SITE)).toBe("/")
  })

  test("a file of two pages:  the first with no value to fill", () => {
    openAt(`${BASE}/racks.spell`)
    const host = new RunSiteHost(BASE, ROOT, { path: "/racks.spell", pages: ["RackListScreen", "RackScreen"] })
    expect(host.address(SITE)).toBe("/racks")
  })

  test("a file declaring no page shows the site's `/`", () => {
    openAt(`${BASE}/console.site.spell`)
    const host = new RunSiteHost(BASE, ROOT, { path: "/console.site.spell", pages: [] })
    expect(host.address(SITE)).toBe("/")
  })

  test("an address is the site's as before", () => {
    openAt(`${BASE}/racks/d16`)
    expect(new RunSiteHost(BASE, ROOT).address(SITE)).toBe("/racks/d16")
  })
})
