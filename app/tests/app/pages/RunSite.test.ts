import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import "spell/app/spaces/models/projectGroups"
import { editor } from "spell/app/app/editor"
import { RunSite } from "spell/app/app/pages/RunSite"
import { SiteWrites } from "spell/app/app/pages/SiteWrites"

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

/**
 * A page in a file of its own is named by that file (epic `mockup` I15):  `/run/<project>/home.spell`.
 */
describe("RunSite, a page in its own file", () => {
  const files = {
    home: { path: "owen@spell/harbor-new/home.spell" },
    systems: { path: "owen@spell/harbor-new/systems.spell" },
    site: { path: "owen@spell/harbor-new/HarborNew.site.spell" }
  }
  /** harbor-new's site:  Home alone in `home.spell`;  Systems, class `System`, declared in `systems.spell`. */
  const pages = [
    { name: "Home", page: "Home", address: "/" },
    { name: "Systems", page: "System", address: "/hardware/systems" },
    { name: "Settings", page: "Settings", address: "/settings" },
    { name: "Film", page: "Film", address: "/films/:film", params: ["film"] }
  ]
  const project = {
    path: "owen@spell/harbor-new",
    getFile: (path: string) => Object.values(files).find((file) => file.path === path),
    fileForPage: (className: string) => (className === "Home" ? files.home : undefined)
  }

  /** A Run of harbor-new's site, as the editor and the site file tell it. */
  function runningHarbor(isRunning = true) {
    vi.spyOn(editor, "project", "get").mockReturnValue(project as never)
    const running = vi.spyOn(editor, "isRunningSite", "get").mockReturnValue(isRunning)
    vi.spyOn(editor, "sitePages").mockReturnValue(pages)
    vi.spyOn(editor, "sitePageAt").mockImplementation((address) =>
      address.startsWith("/films/") ? pages[3] : pages.find((page) => page.address === address)
    )
    vi.spyOn(SiteWrites, "siteFile").mockReturnValue(files.site as never)
    vi.spyOn(SiteWrites, "declaringFile").mockImplementation(
      (name) => (name === "Systems" ? files.systems : files.site) as never
    )
    return running
  }

  afterEach(() => void vi.restoreAllMocks())

  test("its Run URL is its file's;  a page declared in the site file, or with a value to fill, keeps its address", () => {
    runningHarbor()
    const run = new RunSite()
    expect(run.urlFor("/")).toBe("/run/owen@spell/harbor-new/home.spell")
    expect(run.urlFor("/hardware/systems")).toBe("/run/owen@spell/harbor-new/systems.spell")
    expect(run.urlFor("/settings")).toBe("/run/owen@spell/harbor-new/settings")
    expect(run.urlFor("/films/4")).toBe("/run/owen@spell/harbor-new/films/4")
  })

  test("a URL naming the file shows its page;  one naming the site file leaves the page shown", () => {
    runningHarbor()
    const run = new RunSite()
    const shown: string[] = []
    run.listen((address) => shown.push(address))
    run.heard("/", files.systems.path)
    run.heard("/", files.home.path)
    run.heard("/hardware/systems")
    run.heard("/", files.site.path)
    expect(shown).toEqual(["/hardware/systems", "/", "/hardware/systems"])
    expect(run.address()).toBe("/hardware/systems")
  })

  test("a file named before the site runs is looked up when the site asks", () => {
    const running = runningHarbor(false)
    const run = new RunSite()
    run.heard("/", files.systems.path)
    running.mockReturnValue(true)
    expect(run.address()).toBe("/hardware/systems")
  })
})
