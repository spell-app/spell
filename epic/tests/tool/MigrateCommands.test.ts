/**
 * Tests of `epic migrate` (`MigrateCommands`, `PlanDocFiles.migrate()`) on a scratch checkout:
 * - the runner:  steps in order, `--step`, `--dry-run` writes nothing, the lock, the per-page report,
 *   a second run up to date
 * - page kinds
 * - `--notify` splitting running epics from idle ones
 * - then `--all` over COPIES of the real epic pages (never the shared ones)
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { SRV } from "spell/server"

import { MigrateCommands } from "spell/epic/tool/MigrateCommands"
import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { PlanDocCommands } from "spell/epic/tool/PlanDocCommands"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"
import { ReviewInbox } from "spell/epic/tool/ReviewInbox"

/** The tool's test fixtures:  `epic-plan.html`, a fresh doc in `<epic-*>` markup. */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

/** This checkout's root:  its `packages/` (the docs tool, the linker's index) and its real `epics/`. */
const CHECKOUT = fileURLToPath(new URL("../..", import.meta.url))

/** A scratch checkout:  its own `epics/`, this checkout's `packages/` linked in. */
const root = mkdtempSync(join(tmpdir(), "plan-doc-migrate-"))
symlinkSync(join(CHECKOUT, "packages"), join(root, "packages"))
const FILES = new PlanDocFiles({ root })

/** What the commands printed, on stdout and stderr. */
let printed: string[]
let warned: string[]

/** The commands, on the scratch checkout, their output caught;  `running`:  epics with a session. */
function commands(running: Record<string, string[]> = {}) {
  const sessionsOf = async (epic: string) =>
    (running[epic] ?? []).map((name, at) => ({ name, sessionId: `${epic}-${at}` }))
  const owner = new PlanDocCommands({ files: FILES, sessionsOf })
  vi.spyOn(owner, "print").mockImplementation((text) => void printed.push(text))
  vi.spyOn(owner, "warn").mockImplementation((text) => void warned.push(text))
  return owner
}

/** Epic `name`'s doc in the scratch checkout. */
const docOf = (name: string) => join(root, "epics", name, `${name}.plan.html`)

/**
 * Write epic `name`:  three phases, split.
 * - `old`:  a todo links phase 2 by an old number (`P5 · Two`), which `links-agree` fixes
 */
async function writeEpic(name: string, { old = false }: { old?: boolean } = {}) {
  mkdirSync(join(root, "epics", name), { recursive: true })
  const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"))
  for (const phase of ["One", "Two", "Three"]) plan.addPhase(phase, { goal: `<ul><li>${phase}'s goal</li></ul>` })
  if (old) plan.addItem("todo", "see two", { details: '<p><a href="#p-two">P5 · Two</a></p>' })
  await FILES.writeDoc(docOf(name), plan, true)
}

/** Every file under `top`'s `epics/` (default:  the scratch checkout's), with its text:  was anything written? */
function snapshot(top = root): Record<string, string> {
  const files: Record<string, string> = {}
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walk(path)
      else files[relative(top, path)] = readFileSync(path, "utf8")
    }
  }
  walk(join(top, "epics"))
  return files
}

beforeEach(async () => {
  printed = []
  warned = []
  rmSync(join(root, "epics"), { recursive: true, force: true })
  await writeEpic("old", { old: true })
  await writeEpic("new")
})

afterEach(() => {
  vi.restoreAllMocks()
})

afterAll(() => rmSync(root, { recursive: true, force: true }))

describe("migrate:  the runner", () => {
  test("--dry-run:  the report, nothing written", async () => {
    const before = snapshot()
    expect(await commands().run(["migrate", "--all", "--dry-run"])).toBe(0)
    expect(printed).toEqual([
      "old:  would run links-agree",
      '  links-agree:  #p-two "P5 · Two" -> #p-two "P2 · Two"',
      "new:  up to date",
      "epic pages:  1 of 2 would change (links-agree 1)",
      "root links:  none to write in 13 files"
    ])
    expect(snapshot()).toEqual(before)
  })

  test("every step, in order:  the page migrated and logged, NOT stamped updated;  a second run:  up to date", async () => {
    const updated = FILES.read(docOf("old")).page.getAttribute("updated")
    expect(await commands().run(["migrate", "old", "new"])).toBe(0)
    expect(printed).toEqual([
      "old:  links-agree",
      '  links-agree:  #p-two "P5 · Two" -> #p-two "P2 · Two"',
      "new:  up to date",
      "epic pages:  1 of 2 changed (links-agree 1)",
      "root links:  none to write in 13 files"
    ])
    const plan = FILES.read(docOf("old"))
    expect(plan.item("t1").querySelector("a")!.textContent).toBe("P2 · Two")
    expect(plan.document.querySelector("#log > epic-event:last-of-type")!.textContent).toMatch(
      /migrated:\s+links-agree/
    )
    expect(plan.page.getAttribute("updated")).toBe(updated)
    const after = snapshot()
    printed = []
    expect(await commands().run(["migrate", "--all"])).toBe(0)
    expect(printed.slice(-2)).toEqual(["epic pages:  0 of 2 changed", "root links:  none to write in 13 files"])
    expect(snapshot()).toEqual(after)
  })

  test("--step runs just that step;  a step that isn't one is refused", async () => {
    expect(await commands().run(["migrate", "epic", "new", "--step", "links-agree"])).toBe(0)
    expect(printed[0]).toBe("new:  up to date")
    expect(await commands().run(["migrate", "epic", "--step", "nope"])).toBe(1)
    expect(warned.at(-1)).toMatch(/no epic page step "nope"/)
  })

  test("--file:  one epic page, by its path", async () => {
    expect(await commands().run(["migrate", "--file", docOf("old"), "--dry-run"])).toBe(0)
    expect(printed).toEqual([
      "old:  would run links-agree",
      '  links-agree:  #p-two "P5 · Two" -> #p-two "P2 · Two"',
      expect.stringMatching(/1 of 1 would change/)
    ])
  })

  test("the page's lock:  it waits for a writer, and migrates the page as the writer left it", async () => {
    let release!: () => void
    const held = new Promise<void>((resolve) => (release = resolve))
    const writer = SRV.FileLock.runAsync(docOf("old"), async () => {
      await held
      await FILES.writeDoc(docOf("old"), FILES.read(docOf("new")), true)
    })
    const migrating = commands().run(["migrate", "old"])
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(printed).toEqual([])
    release()
    await writer
    expect(await migrating).toBe(0)
    // the writer left the page current:  nothing to migrate
    expect(printed[0]).toBe("old:  up to date")
  })

  test("links-agree moves a comment whose block moved, in the inbox, after the page", async () => {
    const inbox = ReviewInbox.pathFor(docOf("new"))
    ReviewInbox.update(inbox, (each) => {
      each.comments.c1 = {
        anchor: "p-one#field-9",
        kind: "field",
        label: "",
        excerpt: "Three's goal",
        text: "a note",
        at: "2026-10-11T09:00:00Z",
        status: "new"
      }
    })
    expect(await commands().run(["migrate", "new", "--step", "links-agree"])).toBe(0)
    expect(printed[0]).toBe("new:  links-agree")
    expect(ReviewInbox.read(inbox).comments.c1!.anchor).toMatch(/^p-three#field-\d$/)
  })

  test("--list:  the epic page's steps, then the other kinds' (the docs tool)", async () => {
    expect(await commands().run(["migrate", "--list"])).toBe(0)
    expect(printed.map((line) => line.split(/\s+/).slice(0, 3).join(" "))).toEqual([
      "epic 2026-10-11 links-agree",
      "epic 2026-10-24 more-requests-first",
      "epic 2026-10-25 took-as-minutes",
      "epic 2026-10-25 whole-phase-numbers",
      "epic 2026-10-25 taken-in-phase",
      "epic 2026-10-25 to-review-marks",
      "epic 2026-10-25 changes-after-goal",
      "epic 2026-10-25 item-renames",
      "epic 2026-10-25 root-links",
      "epic 2026-10-26 done-cards-close",
      "epic 2026-10-29 picks-in-choices",
      "epic 2026-10-29 updates-said-by-marks",
      "epic 2026-10-29 agents-marked",
      expect.stringMatching(/detail,choice 2026-10-19 components-not-markup$/),
      expect.stringMatching(/goal-set 2026-10-21 engine-asset-paths$/),
      expect.stringMatching(/goal-set 2026-10-25 root-links$/)
    ])
  })
})

describe("migrate:  kinds", () => {
  test("a kind's words:  `epic` and epic ids;  another kind with names is refused;  --notify only for epics", () => {
    expect(MigrateCommands.parse(["seo", "docs"], {})).toEqual({ kind: "epic", names: ["seo", "docs"] })
    expect(MigrateCommands.parse(["epic", "seo"], {})).toEqual({ kind: "epic", names: ["seo"] })
    expect(MigrateCommands.parse(["cheatsheet"], {})).toEqual({ kind: "cheatsheet", names: [] })
    expect(MigrateCommands.parse([], {})).toEqual({ kind: undefined, names: [] })
    expect(MigrateCommands.parse([], { all: true })).toEqual({ kind: "epic", names: [] })
    expect(() => MigrateCommands.parse(["guide", "x"], {})).toThrow(/name a page with --file/)
    expect(() => MigrateCommands.parse(["guide"], { notify: true })).toThrow(/--notify is for epic pages/)
  })

  test("another kind runs the docs tool's steps", async () => {
    expect(await commands().run(["migrate", "brand", "--dry-run"])).toBe(0)
    expect([printed, warned]).toEqual([[], []])
  })
})

describe("migrate --notify", () => {
  test("an epic with a running session is told (TELL), not migrated;  an idle one is migrated now", async () => {
    await writeEpic("busy", { old: true })
    const before = readFileSync(docOf("busy"), "utf8")
    expect(await commands({ busy: ["🚧 busy"] }).run(["migrate", "--all", "--notify"])).toBe(0)
    expect(printed).toEqual([
      "busy:  its session is running:  told to run links-agree itself",
      '  links-agree:  #p-two "P5 · Two" -> #p-two "P2 · Two"',
      "old:  links-agree",
      '  links-agree:  #p-two "P5 · Two" -> #p-two "P2 · Two"',
      "new:  up to date",
      "epic pages:  2 of 3 changed (links-agree 2)",
      expect.stringMatching(/^TELL:/),
      `  to 🚧 busy:  ${MigrateCommands.message("busy", ["links-agree"])}`,
      expect.stringMatching(/^root links:  none to write in \d+ files$/)
    ])
    expect(readFileSync(docOf("busy"), "utf8")).toBe(before)
    expect(FILES.read(docOf("old")).item("t1").querySelector("a")!.textContent).toBe("P2 · Two")
  })

  test("the message:  one line, what to run, when, and that it may commit it", () => {
    const message = MigrateCommands.message("seo", ["links-agree"])
    expect(message).not.toMatch(/\n/)
    expect(message).toMatch(/epic migrate seo/)
    expect(message).toMatch(/end of the phase/)
    expect(message).toMatch(/commit .* without asking/)
  })

  test("refused without the CLI's sessions", async () => {
    const owner = new PlanDocCommands({ files: FILES })
    vi.spyOn(owner, "warn").mockImplementation((text) => void warned.push(text))
    expect(await owner.run(["migrate", "--all", "--notify"])).toBe(1)
    expect(warned.at(-1)).toMatch(/--notify needs the running sessions/)
  })
})

describe("migrate --all over COPIES of the real epic pages", () => {
  /** This checkout's shared epics (a link into the content repo):  read only, never written. */
  const real = join(CHECKOUT, "epics")

  test.skipIf(!existsSync(real))(
    "dry run writes nothing;  for real, then again:  nothing more",
    async () => {
      const copies = mkdtempSync(join(tmpdir(), "plan-doc-migrate-real-"))
      try {
        cpSync(real, join(copies, "epics"), {
          recursive: true,
          dereference: true,
          filter: (path) => !path.endsWith(".lock")
        })
        for (const entry of ["packages", "guides", "templates", "pages", "agents"])
          if (existsSync(join(CHECKOUT, entry))) symlinkSync(join(CHECKOUT, entry), join(copies, entry))
        const files = new PlanDocFiles({ root: copies })
        const run = async (args: string[]) => {
          const owner = new PlanDocCommands({ files })
          const lines: string[] = []
          vi.spyOn(owner, "print").mockImplementation((text) => void lines.push(text))
          vi.spyOn(owner, "warn").mockImplementation(() => {})
          expect(await owner.run(["migrate", "--all", ...args])).toBe(0)
          return lines
        }
        const before = snapshot(copies)
        await run(["--dry-run"])
        expect(snapshot(copies)).toEqual(before)
        await run([])
        const after = snapshot(copies)
        const second = await run([])
        expect(second.at(-1)).toMatch(/^epic pages:  0 of \d+ changed$/)
        expect(snapshot(copies)).toEqual(after)
      } finally {
        rmSync(copies, { recursive: true, force: true })
      }
    },
    180_000
  )
})

// epic `epic-engine` P46:  every local link a root path, by the page's step and the content folder's pass
describe("migrate --step root-links", () => {
  test("the page, its parts, its details pages and Markdown:  root paths;  a second run writes nothing", async () => {
    await writeEpic("links")
    mkdirSync(join(root, "guides"), { recursive: true })
    writeFileSync(join(root, "guides", "g.html"), "")
    // a part and a details page written before P46:  their links climb from their own folders
    const part = readdirSync(join(root, "epics", "links", "parts")).find((name) => name.startsWith("p-"))!
    const partFile = join(root, "epics", "links", "parts", part)
    writeFileSync(
      partFile,
      readFileSync(partFile, "utf8").replace("</ul>", '</ul><p><a href="../../../guides/g.html">g</a></p>')
    )
    mkdirSync(join(root, "epics", "links", "details"), { recursive: true })
    const details = join(root, "epics", "links", "details", "d.html")
    writeFileSync(details, '<p><a href="../../../guides/g.html">g</a> <a href="../links.plan.html#p-one">one</a></p>\n')
    const notes = join(root, "guides", "n.md")
    writeFileSync(notes, "[the epic](../epics/links/links.plan.html) and [g](g.html)\n")
    expect(await commands().run(["migrate", "--step", "root-links"])).toBe(0)
    expect(printed).toContain("links:  root-links")
    expect(printed.find((line) => line.startsWith("root links:"))).toMatch(/^root links:  3 in 2 of \d+ files wrote/)
    expect(readFileSync(partFile, "utf8")).toContain('href="/guides/g.html"')
    expect(readFileSync(details, "utf8")).toBe(
      '<p><a href="/guides/g.html">g</a> <a href="/epics/links/links.plan.html#p-one">one</a></p>\n'
    )
    expect(readFileSync(notes, "utf8")).toBe("[the epic](/epics/links/links.plan.html) and [g](g.html)\n")
    const after = snapshot()
    printed = []
    expect(await commands().run(["migrate", "--step", "root-links"])).toBe(0)
    expect(printed).toContain("links:  up to date")
    expect(printed.at(-1)).toMatch(/^root links:  none to write in \d+ files$/)
    expect(snapshot()).toEqual(after)
  })
})
