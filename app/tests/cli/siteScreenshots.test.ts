import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import type { Page } from "playwright"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { BrowserPage } from "spell/element-tools/BrowserPage"
import { CLI } from "spell/cli"
import { FakeSignedInSite } from "spell/parser/spell/test/FakeSignedInSite"
import { placeSignIn } from "spell/parser/cli/placeSignIn"
import { SiteScreenshots, siteFolderFor, siteScreenshots, sizeIn } from "spell/app/cli/commands/siteScreenshots"

/**
 * `spell site screenshots` (epic `mockup` P12):  walking a made-up signed-in site, the bar scripted and headless here;
 * a person's is a window they use.
 */

const SITE = `<spell-site "old site">
	<page "racks page" address="/racks" title="Racks"/>
	<page "notes page" address="/notes" title="Notes" thumbnail="snapshots/old.jpg"/>
</>
`

let site: FakeSignedInSite
let folder: string
let project: string

beforeAll(async () => {
  site = await new FakeSignedInSite().start()
})
afterAll(() => site.stop())

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "site-screenshots-"))
  project = join(folder, "OldSite")
  mkdirSync(project)
  writeFileSync(join(project, "__project.json5"), "{}\n")
  writeFileSync(join(project, "Old.spellml"), SITE)
  vi.stubEnv("SPELL_PLACE_SESSIONS_DIR", join(folder, "sessions"))
  vi.spyOn(CLI, "out").mockImplementation(() => undefined)
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  rmSync(folder, { recursive: true, force: true })
})

const siteText = () => readFileSync(join(project, "Old.spellml"), "utf8")

describe("what a Save does", () => {
  test("a page picked by its name or its only title", () => {
    const shots = new SiteScreenshots(project)
    expect(shots.planFor({ part: "racks page" }, "https://x.example/anything")).toEqual({
      picture: "snapshots/racks.jpg",
      pageName: "racks page"
    })
    expect(shots.planFor({ part: "NOTES", name: "All Notes" }, "https://x.example/y")).toEqual({
      picture: "snapshots/all-notes.jpg",
      pageName: "notes page"
    })
  })

  test("a page already at this address;  a new one, at it;  a picture alone", () => {
    const shots = new SiteScreenshots(project)
    expect(shots.planFor({ part: "shelves" }, "https://x.example/racks").pageName).toBe("racks page")
    expect(shots.planFor({ part: "Rack Matrix" }, "https://x.example/matrix")).toEqual({
      picture: "snapshots/rack-matrix.jpg",
      pageName: "rack matrix page",
      newAt: "/matrix"
    })
    expect(shots.planFor({ name: "Just This" }, "https://x.example/z")).toEqual({ picture: "snapshots/just-this.jpg" })
    expect(() => shots.planFor({}, "https://x.example/z")).toThrow("Give the picture a name")
  })

  test("points a page at its picture, a new page added first", () => {
    const shots = new SiteScreenshots(project)
    shots.pointPageAt({ picture: "snapshots/racks.jpg", pageName: "racks page" })
    expect(siteText()).toContain(`<page "racks page" address="/racks" title="Racks" thumbnail="snapshots/racks.jpg"/>`)
    shots.pointPageAt({ picture: "snapshots/matrix.jpg", pageName: "matrix page", newAt: "/matrix" })
    expect(siteText()).toContain(`<spell-page "matrix page"/>`)
    expect(siteText()).toContain(`<page "matrix page" address="/matrix" thumbnail="snapshots/matrix.jpg"/>`)
  })
})

describe("its settings", () => {
  test("a size;  a folder or nothing", async () => {
    expect(sizeIn("1440x900")).toEqual({ width: 1440, height: 900 })
    expect(() => sizeIn("big")).toThrow("--size")
    expect(await siteFolderFor(project)).toBe(project)
    await expect(siteFolderFor(join(folder, "nope"))).rejects.toThrow("isn't a project")
    expect(() => new SiteScreenshots(folder)).toThrow("declares a site")
  })
})

describe("walking the site", () => {
  test("signed in, at its size:  Save writes the picture, without the bar, and points the page at it", async () => {
    await placeSignIn("fake", `${site.address}/login`, {
      launch: () => BrowserPage.launch(),
      finished: async (page: Page) => {
        await page.click("#sign-in")
        await page.waitForURL(`${site.address}/`)
      }
    })
    let isBarHiddenAfter = true
    let cornerRed = 0
    let viewport: unknown
    const finished = async (page: Page) => {
      viewport = page.viewportSize()
      await page.goto(`${site.address}/racks`)
      await page.fill("#spell-screenshot-bar input >> nth=1", "racks page")
      await page.click("#spell-screenshot-bar button")
      await page.waitForSelector('#spell-screenshot-bar [role=status]:text("Saved snapshots/racks.jpg, on racks page")')
      isBarHiddenAfter = await page.isHidden("#spell-screenshot-bar")
      // the bar is dark, and across the top:  in the picture, that corner would be too
      const picture = readFileSync(join(project, "snapshots/racks.jpg")).toString("base64")
      cornerRed = await page.evaluate(async (data) => {
        const image = new Image()
        image.src = `data:image/jpeg;base64,${data}`
        await image.decode()
        const canvas = document.createElement("canvas")
        Object.assign(canvas, { width: image.width, height: image.height })
        const drawing = canvas.getContext("2d")!
        drawing.drawImage(image, 0, 0)
        return drawing.getImageData(3, 3, 1, 1).data[0]!
      }, picture)
    }
    await siteScreenshots(
      project,
      { size: "800x600", signedIn: "fake", start: `${site.address}/` },
      { launch: () => BrowserPage.launch(), finished }
    )
    expect(viewport).toEqual({ width: 800, height: 600 })
    expect(existsSync(join(project, "snapshots/racks.jpg"))).toBe(true)
    expect(siteText()).toContain(`thumbnail="snapshots/racks.jpg"`)
    expect(cornerRed).toBeGreaterThan(200)
    expect(isBarHiddenAfter).toBe(false)
  }, 90_000)

  test("never signed in, or nowhere to start:  says so", async () => {
    await expect(siteScreenshots(project, { signedIn: "never" })).rejects.toThrow("hasn't been signed in")
    await expect(siteScreenshots(project, {})).rejects.toThrow("Where should it start?")
  })
})
