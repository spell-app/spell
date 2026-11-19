/**
 * `StagedDemo` (epic `epic-engine` P77):  reading the step files, and `check` / `reset` on a made-up repo whose epic
 * folder is a temp folder.
 * - no test runs a step's commands on a real page:  the rehearsal does (`epic demo run 01 --quiet` ...)
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test"

import { StagedDemo } from "spell/epic/command/StagedDemo"
import { STAGED_DEMO } from "spell/epic/command/command.types"

const STEP = [
  "# 02 · Two questions",
  "",
  "For Owen:  what it does.",
  "",
  "## Commands",
  "",
  "```sh",
  'epic add demo#Q "When?" --options "*Now | Later" --details \'<p>Two "quoted" words</p>\'',
  "epic open demo --review",
  'epic add-phase demo "Gather" \\',
  '  --symptom "<p>$GREETING</p>"',
  "```",
  "",
  "## Say",
  "",
  "Two questions are on the page.",
  "",
  "## Overview",
  "",
  "```html",
  "<epic-summary>Two sentences.</epic-summary>",
  "```"
].join("\n")

describe("reading a step file", () => {
  test("its title, commands, what Claude says and its html blocks", () => {
    const step = StagedDemo.parseStep(STEP)
    expect(step.title).toBe("02 · Two questions")
    expect(step.commands).toHaveLength(1)
    expect(step.say).toBe("Two questions are on the page.")
    expect(step.html).toEqual(["<epic-summary>Two sentences.</epic-summary>"])
  })

  test("its commands as sh reads them:  quotes, line ends and variables", () => {
    const [block] = StagedDemo.parseStep(STEP).commands
    const commands = StagedDemo.commandsOf(block!, { env: { ...process.env, GREETING: "Hello" } })
    expect(commands).toEqual([
      ["add", "demo#Q", "When?", "--options", "*Now | Later", "--details", '<p>Two "quoted" words</p>'],
      ["open", "demo", "--review"],
      ["add-phase", "demo", "Gather", "--symptom", "<p>Hello</p>"]
    ])
    expect(commands.map((argv) => StagedDemo.isShow(argv))).toEqual([false, true, false])
    expect(StagedDemo.isShow(["pages", "link", "x.html", "--show"])).toBe(true)
  })

  test("what Owen pastes:  inside 00-paste.md's text fence, its own code fence kept", () => {
    const paste = ["# 00", "", "## Paste", "", "````text", "Brief me.", "", "```ts", "code()", "```", "````", ""].join(
      "\n"
    )
    expect(StagedDemo.pasteOf(paste)).toBe("Brief me.\n\n```ts\ncode()\n```")
  })
})

describe("check and reset", () => {
  let repo: string
  let demo: StagedDemo
  let folder: string

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), "staged-demo-"))
    mkdirSync(join(repo, ".epic"))
    writeFileSync(join(repo, ".epic", "config.json5"), '{ contentFolder: "content" }\n')
    folder = join(repo, "content", STAGED_DEMO.folder)
    mkdirSync(folder, { recursive: true })
    // the docs index the reset writes again
    mkdirSync(join(repo, "content", "pages"), { recursive: true })
    demo = new StagedDemo({ root: repo })
  })

  afterEach(() => rmSync(repo, { recursive: true, force: true }))

  test("missing steps and too few working lines are problems", () => {
    writeFileSync(join(folder, "00-paste.md"), "# 00\n")
    const report = demo.check()
    expect(report.problems).toContain("step 01 is missing")
    expect(report.problems.some((problem) => /silly-lines.txt has 0 lines/.test(problem))).toBe(true)
  })

  test("every step and 30 lines:  ready;  a demo epic left:  a leftover, which reset removes", () => {
    writeFileSync(join(folder, "00-paste.md"), "# 00\n")
    for (const step of ["01", "02", "03", "04", "05", "06", "07"])
      writeFileSync(join(folder, `${step}-step.md`), "# step\n\n## Commands\n\n```sh\nepic summary demo\n```\n")
    writeFileSync(join(folder, "silly-lines.txt"), Array.from({ length: 30 }, (_, n) => `Line ${n}…`).join("\n"))
    expect(demo.check().problems).toEqual([])
    expect(demo.lines(3)).toHaveLength(3)
    expect(new Set(demo.lines(30)).size).toBe(30)

    mkdirSync(join(demo.epicFolder, "parts"), { recursive: true })
    writeFileSync(demo.page, "<epic-page></epic-page>")
    expect(demo.check().leftovers).toContain("epics/demo/")
    expect(demo.reset({ dryRun: true })).toEqual(["would remove:  epics/demo/"])
    expect(existsSync(demo.epicFolder)).toBe(true)
    expect(demo.reset()).toEqual(["removed:  epics/demo/"])
    expect(existsSync(demo.epicFolder)).toBe(false)
    expect(demo.reset()).toEqual(["nothing to reset:  no demo epic"])
  })

  test("never another epic's folder", () => {
    mkdirSync(join(repo, "content", "epics", "seo"), { recursive: true })
    demo.reset()
    expect(existsSync(join(repo, "content", "epics", "seo"))).toBe(true)
  })
})
