/**
 * Tests of `PlanParts`:  reading a part file, and rebasing a part's URLs.  Splitting and writing:
 * `PlanDocFiles.test.ts` (`EpicParts`);  an old-markup doc's parts:  `spell-epic/convert` `OldParts.test.ts`.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, test } from "vite-plus/test"

import { PlanParts } from "spell/epic/tool/PlanParts"

describe("PlanParts", () => {
  test("reader():  `parts/<id>.html`;  `undefined` for none, or an old `.htm` (read no more since P15)", () => {
    const dir = mkdtempSync(join(tmpdir(), "plan-parts-"))
    try {
      mkdirSync(join(dir, "parts"))
      writeFileSync(join(dir, "parts", "p1.html"), "new")
      writeFileSync(join(dir, "parts", "c1.htm"), "old")
      const read = PlanParts.reader(join(dir, "x.plan.html"))
      expect(["p1", "c1", "log"].map(read)).toEqual(["new", undefined, undefined])
      expect(PlanParts.partFile(join(dir, "x.plan.html"), "p1")).toBe(join(dir, "parts", "p1.html"))
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  test("a part holds the page's own folder's URLs as root paths (epic `epic-engine` P46), its siblings by name", () => {
    const toPart = PlanParts.toPartFrom("/epics/seo/")
    expect(["x.png", "./requests/r3/a.png#h", "parts/q1.html", "parts/"].map(toPart)).toEqual([
      "/epics/seo/x.png",
      "/epics/seo/requests/r3/a.png#h",
      "q1.html",
      "./"
    ])
    // read back:  a sibling is the page's `parts/`;  a part written before P46 climbs from `parts/`
    expect(["q1.html", "../../../guides/x.html"].map(PlanParts.toPage)).toEqual([
      "parts/q1.html",
      "../../guides/x.html"
    ])
    // no folder (a test's doc):  as before P46, and exact back
    for (const url of ["a/b.html", "parts/q1.html", "./y"])
      expect(PlanParts.toPage(PlanParts.toPartFrom()(url))).toBe(url)
  })
})
