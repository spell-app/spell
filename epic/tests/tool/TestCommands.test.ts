/**
 * Tests of `TestCommands` (epic `epic-engine` P4) on a scratch checkout, through the command line
 * (`PlanDocCommands`):  `add <epic> test` with a test's fields, `details` with them, `test <epic> --list [--json]`,
 * `test --all`, and what `test` opens.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { DataFile } from "spell/epic/data/DataFile"
import { EpicTests } from "spell/epic/tool/EpicTests"
import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { PlanDocCommands } from "spell/epic/tool/PlanDocCommands"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"

/** The tool's test fixtures:  `epic-plan.html`, a fresh doc in `<epic-*>` markup. */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

const root = mkdtempSync(join(tmpdir(), "test-commands-"))
const FILES = new PlanDocFiles({ root })
const file = join(root, "epics", "x", "x.plan.html")

/** What the commands printed, on stdout and stderr. */
let printed: string[]
let warned: string[]
/** What the commands opened:  `[file, view, { hash, query }]` each. */
let opened: unknown[][]

/** The commands, on the scratch checkout, their output caught, nothing really opened. */
function commands() {
  const owner = new PlanDocCommands({ files: FILES })
  vi.spyOn(owner, "print").mockImplementation((text) => void printed.push(text))
  vi.spyOn(owner, "warn").mockImplementation((text) => void warned.push(text))
  vi.spyOn(owner, "openInVSCode").mockImplementation((...args) => void opened.push(args))
  return owner
}

/** Write epic `name`'s page, titled `title`, of saga `saga`, with tests titled `tests` (`!` first:  closed). */
function epicWith(name: string, title: string, saga: string | null, tests: string[]) {
  mkdirSync(join(root, "epics", name), { recursive: true })
  const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"))
  plan.page.setAttribute("title", title)
  if (saga) plan.page.setAttribute("saga", saga)
  for (const each of tests) {
    const id = plan.addItem("test", each.replace(/^!/, ""))
    if (each.startsWith("!")) plan.setItem(id, "done")
  }
  writeFileSync(join(root, "epics", name, `${name}.plan.html`), plan.toString())
}

beforeEach(() => {
  printed = []
  warned = []
  opened = []
  rmSync(join(root, "epics"), { recursive: true, force: true })
  rmSync(join(root, "sagas"), { recursive: true, force: true })
  epicWith("x", "Epic X", null, [])
})

afterEach(() => {
  vi.restoreAllMocks()
})

afterAll(() => rmSync(root, { recursive: true, force: true }))

describe("add <epic> test with its fields", () => {
  test("Step, Should, Example (a screenshot copied to tests/<id>.png), If not, then --details;  prints the id", async () => {
    const shot = join(root, "shot.png")
    writeFileSync(shot, "png bytes")
    const argv = ["add", "x", "test", "The list shows", "--step", "Open the list", "--should", "Every epic shows"]
    argv.push("--example", shot, "--if-not", "Say which is missing", "--details", "<p>More.</p>")
    expect(await commands().run(argv)).toBe(0)
    expect(printed).toEqual(["M1"])
    const item = FILES.read(file).findItem("m1")!
    const fields = Array.from(item.querySelectorAll(":scope > epic-field"), (field) => field.getAttribute("label"))
    expect(fields).toEqual(["Step", "Should", "Example", "If not"])
    expect(item.querySelector('epic-field[label="Example"] img')?.getAttribute("src")).toBe("tests/m1.png")
    expect(item.querySelector(":scope > p")?.textContent).toBe("More.")
    expect(readFileSync(join(root, "epics", "x", "tests", "m1.png"), "utf8")).toBe("png bytes")
  })

  // epic `epic-engine` I44, P46:  a part's URLs are read against `parts/`, so its images are written as root paths
  test("on a split page, the Example's image is written into the part as its root path, `/epics/x/tests/<id>.png`", async () => {
    await FILES.writeDoc(file, FILES.read(file), true)
    const shot = join(root, "shot.png")
    writeFileSync(shot, "png bytes")
    await commands().run(["add", "x", "test", "T", "--step", "Do", "--should", "Works", "--example", shot])
    const part = readFileSync(join(root, "epics", "x", "parts", "m1.html"), "utf8")
    expect(part).toContain('src="/epics/x/tests/m1.png"')
    expect(existsSync(join(root, "epics", "x", "parts", "..", "tests", "m1.png"))).toBe(true)
    // read whole:  the same root path
    expect(FILES.read(file).findItem("m1")!.querySelector("img")!.getAttribute("src")).toBe("/epics/x/tests/m1.png")
  })

  test("an example that isn't an image file is a line of text;  no example, no field", async () => {
    await commands().run(["add", "x", "test", "T", "--step", "Do", "--should", "Works", "--example", "a green tick"])
    const item = FILES.read(file).findItem("m1")!
    expect(item.querySelector('epic-field[label="Example"]')?.textContent).toBe("a green tick")
    await commands().run(["add", "x", "test", "U", "--step", "Do", "--should", "Works"])
    expect(FILES.read(file).findItem("m2")!.querySelector('epic-field[label="Example"]')).toBeNull()
    expect(existsSync(join(root, "epics", "x", "tests"))).toBe(false)
  })

  test("refused:  a Step without a Should, test flags on another kind, a missing image;  nothing added", async () => {
    expect(await commands().run(["add", "x", "test", "T", "--step", "Do"])).toBe(1)
    expect(await commands().run(["add", "x", "judgement", "J", "--step", "Do", "--should", "Works"])).toBe(1)
    const argv = ["add", "x", "test", "T", "--step", "Do", "--should", "Works", "--example", "/no/such.png"]
    expect(await commands().run(argv)).toBe(1)
    expect(warned).toEqual([
      "epic:  a test says both what to do (--step) and what should happen (--should)",
      "epic:  --step / --should / --example / --if-not are a manual test's (M), not J1's",
      "epic:  no example image /no/such.png"
    ])
    expect(FILES.read(file).itemsOf("test")).toEqual([])
  })
})

test("details <epic> <T id> --step --should:  the test rewritten in the fields, its prose kept as before", async () => {
  await commands().run(["add", "x", "test", "Old one", "--details", "<p>Click it and see.</p>"])
  expect(await commands().run(["details", "x", "M1", "--step", "Click it", "--should", "It opens"])).toBe(0)
  const item = FILES.read(file).findItem("m1")!
  expect(Array.from(item.querySelectorAll(":scope > epic-field"), (field) => field.textContent)).toEqual([
    "Click it",
    "It opens"
  ])
  expect(item.querySelector("epic-original")?.textContent).toContain("Click it and see.")
  // no fields and no file:  the file is what's missing
  expect(await commands().run(["details", "x", "M1"])).toBe(1)
  expect(warned.at(-1)).toMatch(/^epic:  missing --file <html file>/)
})

// epic `epic-engine` P51:  Start testing's stamp
test("details <epic> <M id> --prepared <n>:  stamped alone, or with its new fields;  refused off a test, or not a place", async () => {
  await commands().run(["add", "x", "test", "One", "--details", "<p>Click it.</p>"])
  await commands().run(["add", "x", "test", "Two", "--details", "<p>Type it.</p>"])
  expect(await commands().run(["details", "x", "M2", "--prepared", "1"])).toBe(0)
  expect(
    await commands().run(["details", "x", "M1", "--step", "Open VS Code", "--should", "It shows", "--prepared", "2"])
  ).toBe(0)
  const plan = FILES.read(file)
  expect([plan.findItem("m2")!.getAttribute("prepared"), plan.findItem("m1")!.getAttribute("prepared")]).toEqual([
    "1",
    "2"
  ])
  expect(plan.findItem("m1")!.querySelector("epic-field")?.textContent).toBe("Open VS Code")
  await commands().run(["add", "x", "todo", "A todo"])
  expect(await commands().run(["details", "x", "T1", "--prepared", "1"])).toBe(1)
  expect(await commands().run(["details", "x", "M1", "--prepared", "0"])).toBe(1)
})

// Owen, 2026-10-22:  "text is not markdown formatted" -- a Step written as plain text, its steps inline
describe("a test's fields given as plain text (EpicTests.proseHTML)", () => {
  test("steps numbered from 1, inline or a line each:  a numbered list;  backticks:  code", () => {
    expect(EpicTests.proseHTML("1. Open `Card.spell`. 2. Pick Spell. 3. Do steps 1-2 again in ~/www/spell.")).toBe(
      "<ol><li>Open <code>Card.spell</code>.</li><li>Pick Spell.</li><li>Do steps 1-2 again in ~/www/spell.</li></ol>"
    )
    expect(EpicTests.proseHTML("1. One\n2. Two")).toBe("<ol><li>One</li><li>Two</li></ol>")
  })

  test("bullets, paragraphs and escaping;  HTML kept as given;  numbers out of order are text", () => {
    expect(EpicTests.proseHTML("- a\n- b")).toBe("<ul><li>a</li><li>b</li></ul>")
    expect(EpicTests.proseHTML("x < y\n\nthen z")).toBe("<p>x &lt; y</p><p>then z</p>")
    expect(EpicTests.proseHTML("<p>kept</p>")).toBe("<p>kept</p>")
    expect(EpicTests.proseHTML("Step 2. comes before 1. here")).toBe("<p>Step 2. comes before 1. here</p>")
  })

  // epic-engine r16, Owen:  "put them in code blocks with exactly what I need to type"
  test("a fenced block is a code block, line for line, inside its step;  its numbers never read as steps", () => {
    expect(EpicTests.proseHTML("1. In the terminal, run:\n```sh\ncd spell-ui\n2. x < y\n```\n2. Then look.")).toBe(
      '<ol><li>In the terminal, run: <pre><code class="language-sh">cd spell-ui\n2. x &lt; y</code></pre></li>' +
        "<li>Then look.</li></ol>"
    )
    expect(EpicTests.proseHTML("Run:\n\n```\nyarn test\n```\n\nThen check it.")).toBe(
      "<p>Run:</p><pre><code>yarn test</code></pre><p>Then check it.</p>"
    )
  })
})

describe("test <epic>", () => {
  beforeEach(() => epicWith("x", "Epic X", null, ["first", "!closed", "second", "third"]))

  test("--list:  its open tests in the run's order, Not now ones last;  --json:  what the run shows", async () => {
    const plan = FILES.read(file)
    plan.defer("m1")
    await FILES.writeDoc(file, plan, false)
    await commands().run(["test", "x", "--list"])
    expect(printed.join("\n").split("\n")).toEqual([
      "x:  3 open tests, in your order:",
      "  M3  second  · prose only",
      "  M4  third  · prose only",
      `  M1  first  · not now ${plan.findItem("m1")!.getAttribute("deferred")} · prose only`
    ])
    printed = []
    await commands().run(["test", "x", "--json"])
    const tests = JSON.parse(printed.join("\n"))
    expect(tests.map((each: { id: string }) => each.id)).toEqual(["M3", "M4", "M1"])
    expect(tests[0]).toEqual({ id: "M3", title: "second" })
    expect(opened).toEqual([])
  })

  test("opens the page in the Review tab with ?test=1;  --at lands on a test;  none open:  says so", async () => {
    await commands().run(["test", "x"])
    await commands().run(["test", "x", "--at", "M3"])
    expect(opened).toEqual([
      [file, "review", { query: "test=1", hash: undefined }],
      [file, "review", { query: "test=1", hash: "m3" }]
    ])
    expect(await commands().run(["test", "x", "--at", "M2"])).toBe(1)
    expect(warned).toEqual(["epic:  M2 isn't an open test of x:  `epic test x --list`"])
    epicWith("x", "Epic X", null, ["!done"])
    printed = []
    await commands().run(["test", "x"])
    expect([printed, opened.length]).toEqual([["x:  no open tests"], 2])
  })
})

describe("test --all, and GET /api/epics/tests' list", () => {
  beforeEach(() => {
    mkdirSync(join(root, "sagas"), { recursive: true })
    DataFile.write(join(root, "sagas", "sagas.json5"), {
      sagas: [
        { id: "later", title: "Later", purpose: "" },
        { id: "first", title: "First", purpose: "" }
      ]
    })
    epicWith("b-first", "Beta", "first", ["one"])
    epicWith("a-first", "Alpha", "first", ["one", "two"])
    epicWith("later", "Epic: Later One", "later", ["one", "!done"])
    epicWith("none", "No Saga", null, ["one"])
    epicWith("nothing", "Nothing open", "first", ["!done"])
  })

  test("every epic with open tests, in Owen's saga order, each saga's by title, then no saga", () => {
    expect(new EpicTests(root).waiting()).toEqual([
      {
        epic: "later",
        title: "Later One",
        saga: "later",
        open: 1,
        page: "/epics/later/later.plan.html",
        href: "/epics/later/later.plan.html"
      },
      expect.objectContaining({ epic: "a-first", title: "Alpha", open: 2 }),
      expect.objectContaining({ epic: "b-first", title: "Beta", open: 1 }),
      expect.objectContaining({ epic: "none", saga: null, open: 1 })
    ])
  })

  test("--list prints them;  without it the first opens with ?test=1&all=1;  --json prints the list", async () => {
    await commands().run(["test", "--all", "--list"])
    expect(printed.join("\n").split("\n")).toEqual([
      "5 open tests in 4 epics:",
      "  later  1 open test  · Later One  (saga later)",
      "  a-first  2 open tests  · Alpha  (saga first)",
      "  b-first  1 open test  · Beta  (saga first)",
      "  none  1 open test  · No Saga"
    ])
    expect(opened).toEqual([])
    await commands().run(["test", "--all"])
    expect(opened).toEqual([[join(root, "epics", "later", "later.plan.html"), "review", { query: "test=1&all=1" }]])
    printed = []
    await commands().run(["test", "--all", "--json"])
    expect(JSON.parse(printed.join("\n")).map((each: { epic: string }) => each.epic)).toEqual([
      "later",
      "a-first",
      "b-first",
      "none"
    ])
  })
})
