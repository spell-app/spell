import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { parseHTML } from "linkedom"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { Git } from "spell/server/Git"
import { ContentUpdate } from "spell/app/cli/ContentUpdate"
import type { ContentUpdateReport } from "spell/app/cli/cli.types"

/** A throwaway repo and content folder:  a few commits under parser/ and ui/, two epic folders, a changelog. */
let scratch: string
let root: string
let content: string
let update: ContentUpdate
let start: string

/** Write `text` to `path` under `folder`, making its folders. */
function write(folder: string, path: string, text: string): void {
  mkdirSync(dirname(join(folder, path)), { recursive: true })
  writeFileSync(join(folder, path), text)
}

/** Commit everything in the repo as `subject`, its time `seconds` after the first. */
function commit(subject: string, seconds: number): void {
  const date = new Date(Date.UTC(2026, 9, 1, 12, 0, seconds)).toISOString()
  const env = { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date }
  Git.mustRun(["add", "-A"], root)
  Git.mustRun(["commit", "-q", "-m", subject], root, { env })
}

beforeAll(() => {
  scratch = mkdtempSync(join(tmpdir(), "content-update-"))
  root = join(scratch, "kit")
  content = join(scratch, "content")
  mkdirSync(root)
  Git.mustRun(["init", "-q", "-b", "main"], root)
  Git.mustRun(["config", "user.email", "t@example.com"], root)
  Git.mustRun(["config", "user.name", "T"], root)
  write(root, "parser/a.ts", "1")
  commit("start", 0)
  start = Git.mustRun(["rev-parse", "HEAD"], root)
  write(root, "parser/a.ts", "2")
  commit("debut P3:  Big -- the parser learned a thing", 10)
  write(root, "ui/b.ts", "1")
  commit("debut I4:  a fix", 20)
  write(root, "ui/b.ts", "2")
  commit("ui-gaps:  a bare lead names its epic", 30)
  write(root, "ui/b.ts", "3")
  commit("tidy:  no epic folder, no epic", 40)
  write(root, "app/c.ts", "1")
  commit("debut P5:  only the app changed", 50)
  for (const epic of ["debut", "ui-gaps"]) mkdirSync(join(content, "epics", epic), { recursive: true })
  write(
    content,
    "guides/changelog.html",
    '<ui-section\n  id="debut"\n  label="2026-10-23 · Debut"\n  sticky\n></ui-section>'
  )
  update = new ContentUpdate({ root, content })
})

afterAll(() => rmSync(scratch, { recursive: true, force: true }))

describe("ContentUpdate", () => {
  test("epicChanges():  the commits under parser/ and ui/ since the stop commit, by epic, most first", () => {
    const groups = update.epicChanges(update.commitAt(start))
    expect(groups.map((group) => [group.id, group.commits.map((each) => each.subject)])).toEqual([
      ["epic:debut", ["debut I4:  a fix", "debut P3:  Big -- the parser learned a thing"]],
      ["epic:ui-gaps", ["ui-gaps:  a bare lead names its epic"]],
      ["epic:other", ["tidy:  no epic folder, no epic"]]
    ])
    expect(groups[0]!.commits[1]).toMatchObject({ phases: ["3"], items: [] })
    expect(groups[0]!.changelog).toEqual({
      path: "guides/changelog.html",
      anchor: "debut",
      found: true,
      title: "2026-10-23 · Debut"
    })
    expect(groups[1]!.changelog?.found).toBe(false)
  })

  test("done():  the stop commit moves to HEAD, always rules added once;  memory reads it back", () => {
    expect(update.memory).toEqual({ always: [] })
    const today = new Date("2026-10-29T12:00:00Z")
    update.done({ always: ["component", "epic:debut"], today })
    const memory = update.done({ always: ["component"], today })
    expect(memory.last?.commit).toBe(Git.mustRun(["rev-parse", "HEAD"], root))
    expect(update.memory.always).toEqual([
      { id: "component", added: "2026-10-29" },
      { id: "epic:debut", added: "2026-10-29" }
    ])
  })

  test("newComponents():  components that weren't there, and new attributes of the ones that were", () => {
    const before = { components: [{ tag: "ui-text", attributes: [{ name: "size" }] }] }
    const after = {
      components: [
        { tag: "ui-text", attributes: [{ name: "size" }, { name: "bold", description: "Bold letters." }] },
        { tag: "ui-space", name: "Space", description: "A gap.", attributes: [{ name: "inline" }] }
      ]
    }
    expect(ContentUpdate.newComponents(before, after)).toEqual({
      components: [{ id: "component:ui-space", tag: "ui-space", name: "Space", description: "A gap.", marks: [] }],
      attributes: [
        { id: "attribute:ui-text:bold", tag: "ui-text", name: "bold", description: "Bold letters.", marks: [] }
      ]
    })
    expect(ContentUpdate.newComponents(undefined, after).components).toHaveLength(2)
  })

  test("newGrammar():  rule classes that weren't there, internal ones left out", () => {
    const rule = (className: string, internal = false) => ({ className, internal, ruleNames: [], purpose: "p" })
    const before = { modules: [{ module: "core", rules: [rule("Newline")] }] }
    const after = {
      modules: [
        { module: "core", rules: [rule("Newline"), rule("Base", true)] },
        { module: "classes", rules: [rule("DrawSlot")] }
      ]
    }
    expect(ContentUpdate.newGrammar(before, after)).toEqual([
      { id: "grammar:DrawSlot", className: "DrawSlot", module: "classes", ruleNames: [], purpose: "p", marks: [] }
    ])
  })

  test("optionsIn():  a standing set's options, picked and removed by their slot, earlier text left out", () => {
    const { document } = parseHTML(`<epic-choices id="s-upgrades-on-offer" standing multiple>
      <epic-option letter="A" title="Spaces"><p>Covers component:ui-space</p></epic-option>
      <epic-option letter="B" title="Bold" slot="picked" picked-on="2026-10-29"><p>attribute:ui-text:bold</p></epic-option>
      <epic-option letter="C" title="Slots" slot="removed" removed="2026-10-29"><p>grammar:DrawSlot</p>
        <div slot="was" data-title="Old"><p>epic:debut</p></div></epic-option>
    </epic-choices>`)
    const options = ContentUpdate.optionsIn(document.querySelector("epic-choices")!)
    expect(options.map(({ letter, state }) => [letter, state])).toEqual([
      ["A", "offered"],
      ["B", "picked"],
      ["C", "removed"]
    ])
    expect(options[2]!.text).not.toContain("epic:debut")
  })

  test("mark():  always rules by id or its start;  options by the ids their text names, whole", () => {
    const report = {
      epics: [{ id: "epic:debut", epic: "debut", commits: [], marks: [] }],
      components: [
        { id: "component:ui-space", tag: "ui-space", name: "", description: "", marks: [] },
        { id: "component:ui-spacer", tag: "ui-spacer", name: "", description: "", marks: [] }
      ],
      attributes: [{ id: "attribute:ui-text:bold", tag: "ui-text", name: "bold", description: "", marks: [] }],
      grammar: [{ id: "grammar:DrawSlot", className: "DrawSlot", module: "", ruleNames: [], purpose: "", marks: [] }],
      options: [
        { letter: "A", title: "Spaces", text: "Spaces  covers component:ui-space.", state: "offered" },
        { letter: "B", title: "Bold", text: "Bold (attribute:ui-text:bold)", state: "picked" },
        { letter: "C", title: "Slots", text: "Slots grammar:DrawSlot", state: "removed" }
      ]
    } as unknown as ContentUpdateReport
    ContentUpdate.mark(report, [
      { id: "component", added: "2026-10-29" },
      { id: "epic:deb", added: "2026-10-29" }
    ])
    expect(report.epics[0]!.marks).toEqual([])
    expect(report.components.map((each) => each.marks)).toEqual([
      [
        { kind: "always", rule: "component" },
        { kind: "offered", letter: "A", title: "Spaces" }
      ],
      [{ kind: "always", rule: "component" }]
    ])
    expect(report.attributes[0]!.marks).toEqual([{ kind: "picked", letter: "B", title: "Bold" }])
    expect(report.grammar[0]!.marks).toEqual([{ kind: "removed", letter: "C", title: "Slots" }])
  })
})
