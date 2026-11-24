import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { KIT_ROOT } from "spell/cli/findCheckout"
import { guidesMissing } from "spell/cli/publish"

/** `guidesMissing()`:  what the scratch install checks of the packed plugin's own guides (epic `epic-engine` P79). */
describe("guidesMissing()", () => {
  const top = mkdtempSync(join(tmpdir(), "guides-missing-"))
  afterAll(() => rmSync(top, { recursive: true, force: true }))
  const put = (file: string) => {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, "<p>guide</p>\n")
  }

  test("lists each page of the guides folder the install doesn't hold, by its path in it;  pictures aren't pages", () => {
    const source = join(top, "source")
    const installed = join(top, "installed")
    for (const page of ["tour/tour.html", "airplane.html", "agents.html"]) put(join(source, page))
    put(join(source, "tour", "images", "a.png"))
    put(join(installed, "airplane.html"))
    expect(guidesMissing(source, installed)).toEqual(["agents.html", "tour/tour.html"])
    put(join(installed, "agents.html"))
    put(join(installed, "tour", "tour.html"))
    expect(guidesMissing(source, installed)).toEqual([])
    expect(guidesMissing(join(top, "none"), installed)).toEqual([])
  })

  test("finds the epic plugin's real guides:  an install holding none misses every one", () => {
    expect(guidesMissing(join(KIT_ROOT, "epic", "guides"), join(top, "empty"))).toEqual([
      "airplane.html",
      "background-agents.html",
      "plan-docs/plan-docs.html"
    ])
  })
})
