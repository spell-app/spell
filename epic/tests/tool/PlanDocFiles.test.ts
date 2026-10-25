/**
 * Tests of `PlanDocFiles`:  reading a doc whole (either markup), editing it under its lock, writing it as a skeleton
 * and parts (`EpicParts`) or one file, and refusing what an edit mustn't touch.
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, afterEach, beforeAll, describe, expect, test } from "vite-plus/test"

import { Markup } from "spell-epic/markup"

import { PlanDocError } from "spell-epic/tool/planDoc.types"

import { PlanDoc } from "spell-epic/tool/PlanDoc"
import { PlanDocFiles } from "spell-epic/tool/PlanDocFiles"

/** The tracked fixtures:  a new doc in `<epic-*>` markup, and one in the old markup. */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

/** This checkout's epic pages:  the edits below are on temp files, linked and formatted as a real doc's. */
const FILES = new PlanDocFiles()

/** When the tests' edits happen:  local 2026-10-01 09:05. */
const NOW = new Date(2026, 9, 1, 9, 5)

/**
 * An epic page with a body in every kind of host:  an Overview sub-section (with an `h4` id and a link), a phase,
 * an item with details (and a commit), an item without, the log.
 */
function richPlan() {
  const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"), NOW)
  plan.document.getElementById("o1")!.innerHTML =
    '<p>See <a href="../../guides/x.html" target="src-x">x</a> and <a href="#t1">T1</a>.</p><h4 id="o1-deep">Deep</h4>'
  plan.addPhase("One", { goal: "<ul><li>a goal</li></ul>" })
  plan.addItem("limit", "with details", { details: '<p>why, <a href="https://example.com">out</a></p>' })
  plan.addItem("todo", "bare line")
  plan.addCommit({ item: "t1" }, "a".repeat(40), "fixed it")
  plan.log("a line")
  return plan
}

/** `<epic-page>`, whitespace squashed:  two docs with the same content compare equal however they're laid out. */
function squashedPage(plan: PlanDoc) {
  return plan.page.outerHTML.replace(/\s+/g, " ").replace(/> </g, "><").replace(/ <\//g, "</")
}

describe("PlanDocFiles", () => {
  const dirs: string[] = []
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  /** A fresh temp folder. */
  function folder() {
    const dir = mkdtempSync(join(tmpdir(), "plan-doc-files-"))
    dirs.push(dir)
    return dir
  }

  /** `richPlan()` as a one-file doc in a temp folder:  its path. */
  async function oneFile() {
    const file = join(folder(), "x.plan.html")
    writeFileSync(file, "")
    await FILES.writeDoc(file, richPlan(), false)
    return file
  }

  // epic `epic-engine` M9:  `guide-changes`, the standing `feedback` epic's old name, finds `feedback`
  test("findDoc():  an epic's old name finds today's;  an epic still called that, itself", () => {
    const root = folder()
    const files = new PlanDocFiles({ root })
    const page = (name: string) => {
      mkdirSync(join(root, "epics", name), { recursive: true })
      writeFileSync(join(root, "epics", name, `${name}.plan.html`), `<epic-page epic="${name}"></epic-page>`)
      return join(root, "epics", name, `${name}.plan.html`)
    }
    const feedback = page("feedback")
    expect(files.findDoc("guide-changes")).toBe(feedback)
    expect(files.findDoc("feedback")).toBe(feedback)
    expect(() => files.findDoc("nothing")).toThrow(PlanDocError)
    const old = page("guide-changes")
    expect(files.findDoc("guide-changes")).toBe(old)
  })

  test("one file stays one file;  split writes a skeleton and parts;  join puts it back;  nothing lost", async () => {
    const file = await oneFile()
    const parts = join(file, "..", "parts")
    await FILES.edit(file, (plan) => plan.log("still one file"))
    expect(existsSync(parts)).toBe(false)
    const whole = squashedPage(FILES.read(file))
    await FILES.edit(file, () => {}, { split: true })
    expect(readdirSync(parts).sort()).toEqual(["log.html", "o1.html", "p-one.html", "t1.html"])
    const skeleton = readFileSync(file, "utf8")
    expect(skeleton).toMatch(/<epic-phase[^>]*source="parts\/p-one.html"/)
    expect(skeleton).toMatch(/<epic-item\s+id="t1"[^>]*source="parts\/t1.html"[^>]*commits/)
    expect(readFileSync(join(parts, "o1.html"), "utf8")).toContain('href="../../../guides/x.html"')
    const plan = FILES.read(file)
    expect(plan.parts).toMatchObject({ split: true, hosts: ["o1", "p-one", "t1", "log"], missing: [] })
    expect(squashedPage(plan)).toBe(whole)
    expect(Markup.validate(plan.document)).toEqual([])
    await FILES.edit(file, () => {}, { split: false })
    expect(existsSync(parts)).toBe(false)
    expect(squashedPage(FILES.read(file))).toBe(whole)
  })

  test("an edit rewrites only the parts it changed, and every command reads the doc whole", async () => {
    const file = await oneFile()
    await FILES.edit(file, () => {}, { split: true })
    const parts = join(file, "..", "parts")
    const stamps = (): Record<string, number> =>
      Object.fromEntries(readdirSync(parts).map((name) => [name, statSync(join(parts, name)).mtimeMs]))
    const before = stamps()
    await new Promise((done) => setTimeout(done, 20))
    await FILES.edit(file, (plan) => plan.log("one more"))
    let after = stamps()
    expect(Object.keys(after).filter((name) => after[name] !== before[name])).toEqual(["log.html"])
    await FILES.edit(file, (plan) => plan.setDetails("t1", "<p>rewritten</p>"))
    const now = stamps()
    expect(Object.keys(now).filter((name) => now[name] !== after[name])).toEqual(["t1.html"])
    after = now
    await FILES.edit(file, (plan) => plan.setItem("t2", "done"))
    const last = stamps()
    expect(Object.keys(last).filter((name) => last[name] !== after[name])).toEqual([])
    expect(readFileSync(file, "utf8")).toMatch(/<epic-item\s+id="t2"\s+title="bare line"\s+status="done"/)
    expect(FILES.read(file).item("t1").textContent).toContain("rewritten")
  })

  test("an item that gets details later gets a part on the next write", async () => {
    const file = await oneFile()
    await FILES.edit(file, () => {}, { split: true })
    await FILES.edit(file, (plan) => plan.setDetails("t2", "<p>now with details</p>"))
    expect(readFileSync(join(file, "..", "parts", "t2.html"), "utf8")).toContain("now with details")
    expect(readFileSync(file, "utf8")).toMatch(/<epic-item\s+id="t2"[^>]*source="parts\/t2.html"/)
  })

  test("an old-markup doc (restored from an old backup):  refused, read or edited, writing nothing", async () => {
    const file = join(folder(), "old.plan.html")
    const html = readFileSync(join(FIXTURES, "plan.html"), "utf8").replaceAll("{{title}}", "Old")
    writeFileSync(file, html)
    expect(() => FILES.read(file)).toThrow(/old\.plan\.html is in the old markup .*which the tool no longer reads/)
    expect(() => FILES.requireNewMarkup(file)).toThrow(PlanDocError)
    await expect(FILES.edit(file, (doc) => doc.log("x"))).rejects.toThrow(/old markup/)
    expect(readFileSync(file, "utf8")).toBe(html)
  })

  test("an edit that would break the markup is refused, writing nothing", async () => {
    const file = await oneFile()
    const before = readFileSync(file, "utf8")
    await expect(
      FILES.edit(file, (plan) => plan.findSection("todos")!.append(plan.make("epic-event", { at: "2026-10-01" })))
    ).rejects.toThrow(/nothing written:  the edit would break the doc/)
    expect(readFileSync(file, "utf8")).toBe(before)
  })

  test("& in an attribute survives a write and a read (I2)", async () => {
    const file = await oneFile()
    await FILES.edit(file, (plan) => plan.addItem("todo", "A &lt; B & C"))
    expect(readFileSync(file, "utf8")).toContain('title="A &amp;lt; B &amp; C"')
    expect(FILES.read(file).items("todo").at(-1)!.title).toBe("A &lt; B & C")
  })
})

// epic `epic-engine` I134:  links handed over as a part file holds them (`../../../spell-ui/...`) landed one folder too
// high (`../../../../`);  from a worktree as from the main checkout
describe("PlanDocFiles links written as from a part", () => {
  // its real path:  git names the checkouts by theirs (macOS's temp folder is behind a link)
  const scratch = realpathSync(mkdtempSync(join(tmpdir(), "plan-doc-part-links-")))
  const main = join(scratch, "kit")
  const worktree = join(scratch, "worktrees", "x")
  const content = join(main, "spell.epics")
  const file = join(content, "epics", "x", "x.plan.html")
  const part = join(content, "epics", "x", "parts", "p-one.html")

  /** The links a phase's plan is written with, as the agents wrote them:  a part's, the page's, and a missing one. */
  const PLAN =
    '<p><a href="../../../spell-ui/src/x.ts">as the part</a>, <a href="../../spell-ui/src/x.ts">as the page</a>, ' +
    '<a href="../../../spell-ui/src/gone.ts">missing</a>, <a href="../../../spell-ui/src/x.ts#L3">a line</a></p>'

  beforeAll(async () => {
    // the kit, with its content folder inside it (git-ignored) and a child repo's file;  an epic's worktree beside it
    write(main, ".epic/config.json5", JSON.stringify({ contentFolder: "spell.epics" }))
    git(main, "init", "-q", "-b", "main")
    commit(main, "kit", { ".gitignore": "spell.epics\n", "yarn.lock": "", "spell-ui/src/x.ts": "x" })
    git(main, "worktree", "add", "-q", "-b", "x", worktree)
    mkdirSync(join(content, "epics", "x"), { recursive: true })
    const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"), NOW)
    plan.addPhase("One", { goal: "<ul><li>a goal</li></ul>" })
    await new PlanDocFiles({ root: main }).writeDoc(file, plan, true)
  })

  afterAll(() => rmSync(scratch, { recursive: true, force: true }))

  /** The hrefs in phase One's part after `update x#P1 --plan PLAN`, run from checkout `root`. */
  async function hrefsFrom(root: string): Promise<string[]> {
    const files = new PlanDocFiles({ root })
    const plan = files.read(file)
    plan.setPhaseFields(1, { plan: PLAN })
    await files.writeDoc(file, plan, true)
    return Array.from(readFileSync(part, "utf8").matchAll(/href="([^"]+)"/g), (m) => m[1]!)
  }

  test("each lands as the part file holds it, from the main checkout and from a worktree alike", async () => {
    const expected = [
      "../../../spell-ui/src/x.ts",
      "../../../spell-ui/src/x.ts",
      // missing either way:  left as it was handed over, so `epic lint` names it
      "../../../../spell-ui/src/gone.ts",
      "../../../spell-ui/src/x.ts#L3"
    ]
    expect(await hrefsFrom(main)).toEqual(expected)
    expect(await hrefsFrom(worktree)).toEqual(expected)
    // a second write changes nothing
    const before = readFileSync(part, "utf8")
    const files = new PlanDocFiles({ root: worktree })
    await files.writeDoc(file, files.read(file), true)
    expect(readFileSync(part, "utf8")).toBe(before)
  })
})

/** `text` at `path` under `root`, its folders made. */
function write(root: string, path: string, text: string): void {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), text)
}

/** `git <args>` in `cwd`, as a test author;  throws when git fails. */
function git(cwd: string, ...args: string[]): void {
  const run = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd, encoding: "utf8" })
  if (run.status !== 0) throw new Error(`git ${args.join(" ")}:  ${run.stderr}`)
}

/** `files` written in `cwd` and committed as `message`. */
function commit(cwd: string, message: string, files: Record<string, string>): void {
  for (const [path, text] of Object.entries(files)) write(cwd, path, text)
  git(cwd, "add", ...Object.keys(files))
  git(cwd, "commit", "-q", "-m", message)
}
