import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { parseHTML } from "linkedom"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { ChangeOriginals } from "spell/epic/tool/ChangeOriginals"
import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"

/** The epic pages these tests read, tracked beside them (`fixtures/`). */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

/** `html` as a document. */
function doc(html: string): Document {
  return parseHTML(`<!doctype html><html><body>${html}</body></html>`).document as unknown as Document
}

/** The first change mark of `document`. */
function mark(document: Document): Element {
  return document.querySelector("epic-change")!
}

////////////////
// ## Finding the words
////////////////

describe("ChangeOriginals.find()", () => {
  test("the words the mark took the place of, in its block", () => {
    const now = doc(`<p id="a">Now there is <epic-change item="q16">one list, Caveats</epic-change> for all.</p>`)
    const before = doc(`<p id="a">Now there is a Caveats list and a Todo list for all.</p>`)
    expect(ChangeOriginals.find(mark(now), [before])).toBe("a Caveats list and a Todo list")
  })

  test("new words:  none;  words the mark only wrapped:  none", () => {
    const now = doc(`<p id="a">Start <epic-change item="q1">and more</epic-change> end.</p>`)
    expect(ChangeOriginals.find(mark(now), [doc(`<p id="a">Start end.</p>`)])).toBeUndefined()
    expect(ChangeOriginals.find(mark(now), [doc(`<p id="a">Start and more end.</p>`)])).toBeUndefined()
  })

  test("a version that already has the mark tells nothing:  the next one is asked", () => {
    const now = doc(`<p id="a">It <epic-change item="q1">runs fast</epic-change> today.</p>`)
    const onDisk = doc(`<p id="a">It <epic-change item="q1">runs fast</epic-change> today.</p>`)
    const committed = doc(`<p id="a">It crawls today.</p>`)
    expect(ChangeOriginals.find(mark(now), [onDisk, committed])).toBe("crawls")
  })

  test("edits elsewhere in the block, and other marks, don't move it", () => {
    const now = doc(
      `<section id="s"><p>First line, rewritten wholly.</p>` +
        `<p>The <epic-change item="q2">blue</epic-change> one, and the <epic-change item="q3">big</epic-change> one.</p></section>`
    )
    const before = doc(`<section id="s"><p>First line as it was.</p><p>The red one, and the small one.</p></section>`)
    const [blue, big] = Array.from(now.querySelectorAll("epic-change"))
    expect([ChangeOriginals.find(blue!, [before]), ChangeOriginals.find(big!, [before])]).toEqual(["red", "small"])
  })

  test("no block in common:  the bodies;  long words cut with …", () => {
    const now = doc(`<p>Keep <epic-change item="q1">this</epic-change> short.</p>`)
    const long = Array.from({ length: 80 }, (_, i) => `word${i}`).join(" ")
    const found = ChangeOriginals.find(mark(now), [doc(`<p>Keep ${long} short.</p>`)])!
    expect([found.length <= 301, found.endsWith("…"), found.startsWith("word0 word1")]).toEqual([true, true, true])
  })
})

////////////////
// ## Stamping
////////////////

describe("PlanDoc.updateChanges():  `was`", () => {
  test("stamped with the words it replaced, once;  a `was` written by hand is kept", () => {
    const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"), new Date(2026, 9, 29, 8, 4))
    plan.addPhase("One", { symptom: "s", changes: "<p>The page draws a tooltip on hover.</p>" })
    plan.updateStates()
    const earlier = PlanDoc.parse(plan.toString()).document
    const paragraph = Array.from(plan.document.querySelectorAll("p")).find((p) =>
      /tooltip on hover/.test(p.textContent!)
    )!
    paragraph.innerHTML =
      'The page draws <epic-change item="q1">a popup on click</epic-change>.  ' +
      '<epic-change item="q1" was="by hand">More</epic-change>'
    plan.earlierVersions = [earlier]
    plan.updateStates()
    const [first, second] = Array.from(paragraph.querySelectorAll("epic-change"))
    expect([first!.getAttribute("was"), second!.getAttribute("was")]).toEqual(["a tooltip on hover", "by hand"])
    expect(first!.id).toMatch(/^ch\d+$/)
  })
})

////////////////
// ## Earlier versions
////////////////

describe("PlanDocFiles.earlierVersions()", () => {
  const root = mkdtempSync(join(tmpdir(), "change-originals-"))
  afterAll(() => rmSync(root, { recursive: true, force: true }))
  const git = (...args: string[]) => spawnSync("git", args, { cwd: root, encoding: "utf8" })

  test("the disk's first, then the commits':  a mark written by hand into a part finds the committed words", () => {
    const folder = join(root, "epics", "x")
    mkdirSync(join(folder, "parts"), { recursive: true })
    const file = join(folder, "x.plan.html")
    writeFileSync(
      file,
      `<!doctype html><html><body><epic-section id="a" source="parts/a.html"></epic-section></body></html>`
    )
    writeFileSync(join(folder, "parts", "a.html"), `<p>We ship a café menu, fast.</p>\n`)
    git("init", "-q")
    git("add", ".")
    git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "first")
    writeFileSync(
      join(folder, "parts", "a.html"),
      `<p>We ship <epic-change item="q1">a full app</epic-change>, fast.</p>\n`
    )
    const versions = [...PlanDocFiles.earlierVersions(file)]
    expect(versions).toHaveLength(2)
    const now = versions[0]!
    expect(ChangeOriginals.find(mark(now), PlanDocFiles.earlierVersions(file))).toBe("a café menu")
  })
})
