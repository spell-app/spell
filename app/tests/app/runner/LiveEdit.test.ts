import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterAll, describe, expect, test } from "vite-plus/test"

import { LiveEdit } from "spell/app/app/runner/LiveEdit"

/** Each built-in example's compiled javascript, as its snapshot has it. */
const EXAMPLES = path.resolve(import.meta.dirname, "../../spell/__examples__")
const programs = readdirSync(EXAMPLES).map((project) => ({
  project,
  code: readFileSync(path.join(EXAMPLES, project, `${project}.snapshot.js`), "utf8")
}))

/** `code`, edited to `edited`, both as they compiled:  nothing stamped. */
const editOf = (code: string, edited: string) =>
  LiveEdit.between({ compiled: code, stamped: code }, { compiled: edited, stamped: edited })

const scratch = mkdtempSync(path.join(tmpdir(), "live-edit-"))
afterAll(() => rmSync(scratch, { recursive: true, force: true }))

/** The program every small test edits. */
const PROGRAM = `import { core, App, View, h } from "@spell/core"

core.heading("A counter")
export class Counter extends View {
  static elementTag = core.defineElement(this, "test")

  static { this.declareProp("count", { type: "number" }) }
  get count() { return this.getProp("count") }
  set count(value) { this.setProp("count", value) }

  get twice() {
    return this.count * 2
  }

  countUp() {
    this.count = this.count + 1
  }

  /** its button */
  draw() {
    return h("ui-button", {}, () => this.count)
  }
}
export class Special extends Counter {
}
export class TheApp extends App {
  draw() {
    return h("div", {}, () => core.drawThing(this.counter))
  }
}
export const theApp = new TheApp()
theApp.counter.count = 3
export function helper() {
  return 1
}
core.installStyles(undefined, \`.a { color: red }\`)
if (!core.isCarryingOver) theApp.start()
`

describe("LiveEdit", () => {
  test("every built-in example:  what it loads is still a module, with its top-level code out, and its things kept", () => {
    for (const { project, code } of programs) {
      const edit = editOf(code, code.replace(/\bdraw\(\) \{/, "draw() { /* edited */"))
      if (edit.kind === "same") continue
      expect(edit.kind, project).toBe("live")
      expect(edit.text.split("\n").length, project).toBe(code.split("\n").length)
      expect(edit.text, project).not.toMatch(/^if \(!core\.isCarryingOver\)/m)
      expect(edit.text, project).not.toMatch(/^export (?:const|let) \S+ = new /m)
      const file = path.join(scratch, `${project}.mjs`)
      writeFileSync(file, edit.text)
      expect(() => execFileSync("node", ["--check", file]), project).not.toThrow()
    }
  })

  test("the same program:  nothing to do", () => {
    expect(editOf(PROGRAM, PROGRAM).kind).toBe("same")
  })

  test("a drawing changed:  its type and the types under it draw again", () => {
    const edit = editOf(PROGRAM, PROGRAM.replace('"ui-button"', '"ui-text"'))
    expect(edit.kind).toBe("live")
    expect(edit.drawAgain).toEqual(["Counter", "Special"])
  })

  test("a method's body changed:  nothing draws", () => {
    const edit = editOf(PROGRAM, PROGRAM.replace("this.count + 1", "this.count + 2"))
    expect(edit.kind).toBe("live")
    expect(edit.drawAgain).toEqual([])
  })

  test("a getter changed:  its type draws again, and whoever's drawing names it", () => {
    const named = PROGRAM.replace("() => this.count)", "() => this.twice)")
    expect(editOf(named, named.replace("this.count * 2", "this.count * 3")).drawAgain).toEqual(["Counter", "Special"])
  })

  test("a method a drawing calls changed:  that drawing's type draws again", () => {
    const named = PROGRAM.replace("() => core.drawThing(this.counter)", "() => this.counter.countUp()")
    expect(editOf(named, named.replace("this.count + 1", "this.count + 2")).drawAgain).toEqual(["TheApp"])
  })

  test("a function at the top changed:  everything draws again", () => {
    expect(editOf(PROGRAM, PROGRAM.replace("return 1", "return 2")).drawAgain).toBe("everything")
  })

  test("the styles changed:  they're run again, and nothing draws", () => {
    const edit = editOf(PROGRAM, PROGRAM.replace("color: red", "color: blue"))
    expect(edit.kind).toBe("live")
    expect(edit.drawAgain).toEqual([])
    expect(edit.text).toContain("color: blue")
  })

  test("a new property:  live", () => {
    const edit = editOf(
      PROGRAM,
      PROGRAM.replace("  countUp() {", '  static { this.declareProp("step", { type: "number" }) }\n  countUp() {')
    )
    expect(edit.kind).toBe("live")
  })

  test("a new type and its thing:  live, made as it loads, and nothing draws (epic `mockup` J15)", () => {
    const added = `${PROGRAM}export class Extra extends View {\n}\nexport const extra = new Extra()\n`
    const edit = editOf(PROGRAM, added)
    expect(edit.restartBecause).toBeUndefined()
    expect(edit.kind).toBe("live")
    expect(edit.text).toContain('export const extra = core.keptTopLevel("extra", () => (new Extra()))')
    expect(edit.drawAgain).toEqual([])
  })

  test("a static that changed:  its type draws again, e.g. a site's list of pages", () => {
    const listed = PROGRAM.replace(
      "export class Special extends Counter {\n",
      "export class Special extends Counter {\n  static pages = [1]\n"
    )
    const edit = editOf(listed, listed.replace("static pages = [1]", "static pages = [1, 2]"))
    expect(edit.kind).toBe("live")
    expect(edit.drawAgain).toEqual(["Special"])
  })

  test("its variables are the running program's", () => {
    const { text } = editOf(PROGRAM, PROGRAM.replace("return 1", "return 2"))
    expect(text).toContain('export const theApp = core.keptTopLevel("theApp", () => (new TheApp()))')
    expect(text).not.toContain("theApp.counter.count = 3")
  })

  test.each([
    ["a renamed type", (code: string) => code.replaceAll("Special", "Rare"), "type Special is gone"],
    [
      "a type taken out",
      (code: string) => code.replace("export class Special extends Counter {\n}\n", ""),
      "type Special is gone"
    ],
    [
      "a type's base",
      (code: string) => code.replace("Special extends Counter", "Special extends View"),
      "type Special is now a kind of View"
    ],
    [
      "a property's type",
      (code: string) => code.replace('{ type: "number" }', '{ type: "text" }'),
      "Counter's count changed its type"
    ],
    [
      "a top-level line",
      (code: string) => code.replace("count = 3", "count = 4"),
      "a line at the program's top level changed"
    ],
    [
      "the program's start",
      (code: string) => code.replace("theApp.start()", "theApp.begin()"),
      "a line at the program's top level changed"
    ],
    [
      "what a variable is made with",
      (code: string) => code.replace("new TheApp()", 'new TheApp({ name: "x" })'),
      "the program's theApp changed"
    ]
  ])("%s:  it takes effect on restart", (_name, change, reason) => {
    const edit = editOf(PROGRAM, change(PROGRAM))
    expect(edit.kind).toBe("restart")
    expect(edit.restartBecause).toBe(reason)
  })

  test("a line's place alone:  what its marks say draws it again, and the code hasn't changed", () => {
    const at = (line: number) => `Object.defineProperty(h("ui-button", {}, "x"), "at", { value: "${line}" })`
    const edit = LiveEdit.between(
      { compiled: PROGRAM, stamped: PROGRAM.replace('h("ui-button", {}, () => this.count)', at(1)) },
      { compiled: PROGRAM, stamped: PROGRAM.replace('h("ui-button", {}, () => this.count)', at(2)) }
    )
    expect(edit.kind).toBe("live")
    expect(edit.drawAgain).toEqual(["Counter", "Special"])
  })
})
