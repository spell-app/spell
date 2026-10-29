import { copyFileSync, existsSync, mkdirSync } from "node:fs"
import { dirname, extname, join, resolve } from "node:path"

import { stringFlag } from "spell/epic/command/command.types"

import { kindNamed, PlanDocError } from "./planDoc.types"

import { EpicTests, type EpicTestCount, type OpenTest, type TestFieldValues } from "./EpicTests"
import type { PlanDoc } from "./PlanDoc"
import type { Flags, PlanDocCommands } from "./PlanDocCommands"
import { TEST_SHOTS } from "./TestShots"
import { PlanMarkup } from "./PlanMarkup"

/****************
 * ### `TestCommands`
 * `epic test`, and the test flags of `epic add <epic>#M` / `epic details <epic>#M3` (epic `epic-engine` P4):
 * Owen's TEST RUN, from the command line.
 * - `test <name>`:  the epic page in the Review tab in test mode (`?test=1`), one test at a time;
 *   `--at <id>`, landing on that test (`seo#M3`)
 * - `test <name> --list [--json]`:  its open tests, in the run's order (`EpicTests.openIn()`)
 * - `test --all [--list] [--json]`:  every epic with open tests, in Owen's saga order (`EpicTests.waiting()`),
 *   and the first one's page opened in test mode, `?test=1&all=1`:  its summary card leads to the next
 * - `--step`, `--should`, `--example`, `--if-not`:  a test's fields (`fieldsOf()`, `EpicTests.fieldsHTML()`)
 * - Prints and opens through its owner (`PlanDocCommands`):  NOT a command line of its own.
 ****************/
export class TestCommands {
  /** the command line this belongs to:  its files, edits and output */
  readonly owner: PlanDocCommands

  constructor(owner: PlanDocCommands) {
    this.owner = owner
  }

  ////////////////
  // ## epic test
  ////////////////

  /**
   * `test <name> [--at <id>] [--list [--json]]`:  epic `name`'s test run, its page at `file`.
   * - `--list` (or `--json`):  print its open tests, open nothing
   * - else:  the page in the Review tab in test mode, at test `--at` when given;  none open:  says so, opens nothing
   * - throws a `PlanDocError` for an `--at` that isn't one of its open tests
   */
  run(name: string, file: string, { at, list, json }: Flags): void {
    const tests = EpicTests.openIn(this.owner.read(file))
    if (list || json) return this.printTests(name, tests, Boolean(json))
    if (!tests.length) return this.owner.print(`${name}:  no open tests`)
    const landing = typeof at === "string" ? at.toUpperCase() : undefined
    if (landing && !tests.some((test) => test.id === landing))
      throw new PlanDocError(`${landing} isn't an open test of ${name}:  \`epic test ${name} --list\``)
    this.owner.print(`${name}:  ${plural(tests.length, "open test")}, in the Review tab`)
    this.owner.openInVSCode(file, "review", { query: RUN_QUERY, hash: landing?.toLowerCase() })
  }

  /**
   * `test --all [--list] [--json]`:  every epic with open tests, in Owen's saga order;
   * then the first one's page in test mode, `?test=1&all=1`, unless `--list` (or `--json`).
   */
  all({ list, json }: Flags): void {
    const waiting = new EpicTests(this.owner.files.content).waiting()
    if (json) return this.owner.print(JSON.stringify(waiting, null, 2))
    if (!waiting.length) return this.owner.print("no epic has open tests")
    const total = waiting.reduce((sum, each) => sum + each.open, 0)
    const lines = [`${plural(total, "open test")} in ${plural(waiting.length, "epic")}:`]
    for (const each of waiting) lines.push(`  ${countLine(each)}`)
    this.owner.print(lines.join("\n"))
    if (list) return
    const first = waiting[0]!
    this.owner.print(`first:  ${first.epic}, in the Review tab;  its last card leads to the next`)
    this.owner.openInVSCode(this.owner.files.findDoc(first.epic), "review", { query: ALL_QUERY })
  }

  /** Print `tests`, epic `name`'s open tests, for a reply or (`json`) a script. */
  private printTests(name: string, tests: OpenTest[], json: boolean): void {
    if (json) return this.owner.print(JSON.stringify(tests, null, 2))
    if (!tests.length) return this.owner.print(`${name}:  no open tests`)
    const lines = [`${name}:  ${plural(tests.length, "open test")}, in the run's order:`]
    for (const test of tests) {
      const notes = [
        test.deferred && `not now ${test.deferred}`,
        test.failed && `failed:  ${test.failed}`,
        !test.step && "prose only"
      ].filter(Boolean)
      lines.push(`  ${test.id}  ${test.title}${notes.length ? `  · ${notes.join(" · ")}` : ""}`)
    }
    this.owner.print(lines.join("\n"))
  }

  ////////////////
  // ## A test's fields
  ////////////////

  /**
   * A test's fields from `flags` (`--step`, `--should`, `--example`, `--if-not`) for test `id` of epic page `file`:
   * `{ html, example }`, `html` `""` when none is given.
   * - `--example <file.png>`:  a screenshot Claude took, copied to `tests/<id>.png` beside the page by `saveExample()`;
   *   any other value is a line of text
   * - throws a `PlanDocError` for test flags on an item that isn't a test, a Step without a Should (or the
   *   reverse), or an example image that isn't there
   */
  fieldsOf(id: string, { step, should, example, ifNot }: Flags): TestFields {
    const given = [step, should, example, ifNot].some((flag) => flag !== undefined)
    if (!given) return { html: "" }
    if (!/^m\d+$/i.test(id))
      throw new PlanDocError(
        `--step / --should / --example / --if-not are a manual test's (M), not ${id.toUpperCase()}'s`
      )
    const image = typeof example === "string" && IMAGE_FILE.test(example) ? resolve(example) : undefined
    if (image && !existsSync(image)) throw new PlanDocError(`no example image ${example}`)
    const values: TestFieldValues = {
      step: text(step),
      should: text(should),
      ifNot: text(ifNot),
      example: image ? { image: exampleOf(id, image) } : typeof example === "string" ? { text: example } : undefined
    }
    try {
      const html = EpicTests.fieldsHTML(values)
      return { html, example: image ? { from: image, to: exampleOf(id, image) } : undefined }
    } catch (error) {
      if (error instanceof TypeError) throw new PlanDocError(error.message)
      throw error
    }
  }

  /**
   * Copy a test's example screenshot (`fieldsOf()`'s `example`) beside epic page `file`, over one there.
   * - SIDE EFFECT:  writes `tests/<id>.png` in the page's folder
   */
  saveExample(file: string, example: TestFields["example"]): void {
    if (!example) return
    const to = join(dirname(file), example.to)
    mkdirSync(dirname(to), { recursive: true })
    copyFileSync(example.from, to)
  }

  /**
   * `add <name> <kind> "title" [--details html]`, under the doc's lock:  the new item's id, and a test's example
   * screenshot to copy once the doc is written (`saveExample()`).
   * - a test may be given its fields (`fieldsOf()`), before `--details`'s HTML;  any other kind may not
   * - its id is worked out first (`PlanDoc.nextId()`), so the Example's image is named for it
   */
  addItem(plan: PlanDoc, kind: string, title: string, flags: Flags): { id: string; example: TestFields["example"] } {
    // `#T` is work still to do;  `--limit`, a limit to know about (epic `epic-engine` P44)
    kind = kindNamed(kind)
    if (flags.limit && kind === "todo") kind = "limit"
    else if (flags.limit && kind !== "limit") throw new PlanDocError(`--limit is a todo's (T), not a ${kind}'s`)
    const { html, example } = this.fieldsOf(plan.nextId(kind), flags)
    const details = `${html}${stringFlag(flags.details) ?? ""}${itemOptions(kind, flags)}`
    const id = plan.addItem(kind, title, { ...flags, details })
    return { id, example }
  }
}

/**
 * `--options "*Do it | Don't"` on a judgement call or a question (epic `epic-engine` P50, request r44;  Owen, on a
 * call that needed his yes / no:  "In future, this could be a question block!"):  an option set after its details,
 * so he picks on the page;  `""` without the flag.
 * - each option split by ` | `, lettered A, B ... in order;  a leading `*` marks the recommended one;  a leading
 *   `A:` is its letter, given (`"A:Do it | B:Don't"`), else the first letter nobody has
 * - its pros and cons, or a picture:  `epic option edit` / `epic option add` afterwards
 * - throws on another kind, or with fewer than two options
 */
function itemOptions(kind: string, flags: Flags): string {
  const given = stringFlag(flags.options)
  if (given === undefined) return ""
  if (kind !== "judgement" && kind !== "question")
    throw new PlanDocError(`--options is a judgement call's (J) or a question's (Q), not a ${kind}'s`)
  const entries = given
    .split(/\s+\|\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
  if (entries.length < 2) throw new PlanDocError(`--options:  two or more, split by " | ":  "*Do it | Don't"`)
  const parsed = entries.map((entry) => {
    const recommended = entry.startsWith("*")
    const text = recommended ? entry.slice(1).trim() : entry
    const lettered = /^([A-Z]):\s*(.+)$/.exec(text)
    return { recommended, text: lettered?.[2] ?? text, given: lettered?.[1] }
  })
  // an option without a letter takes the first one nobody has
  const used = new Set(parsed.map((each) => each.given).filter(Boolean))
  const options = parsed.map(({ recommended, text, given }) => {
    let letter = given
    for (let code = 65; !letter; code++) if (!used.has(String.fromCharCode(code))) letter = String.fromCharCode(code)
    used.add(letter)
    const title = PlanMarkup.attribute(text)
    return `<epic-option letter="${letter}" title="${title}"${recommended ? " recommended" : ""}></epic-option>`
  })
  return `<epic-choices>${options.join("")}</epic-choices>`
}

/** A test's fields as `TestCommands.fieldsOf()` makes them:  the HTML, and an example screenshot to copy. */
export type TestFields = {
  /** the fields' `<epic-field label>`s, `""` for none */
  html: string
  /** the screenshot `--example` named:  `from` its file, `to` its path from the page's folder (`tests/m3.png`) */
  example?: { from: string; to: string }
}

/** The page's query for a test run (`<epic-page>` reads it):  one epic's. */
const RUN_QUERY = "test=1"

/** ... and for `test --all`'s:  its summary card leads on to the next epic with open tests. */
const ALL_QUERY = "test=1&all=1"

/** An `--example` that names an image, not a line of text. */
const IMAGE_FILE = /\.(png|jpe?g|gif|webp)$/i

/** A flag's value as text:  `undefined` for none (or a bare flag). */
function text(flag: string | true | undefined): string | undefined {
  return typeof flag === "string" && flag.trim() ? flag : undefined
}

/** Test `id`'s example screenshot's path from the page's folder:  `tests/m3.png` (its file's own extension). */
function exampleOf(id: string, image: string): string {
  return `${TEST_SHOTS}/${id.toLowerCase()}${extname(image).toLowerCase()}`
}

/** `seo  3 open tests  · Search Engines` */
function countLine(count: EpicTestCount): string {
  return `${count.epic}  ${plural(count.open, "open test")}  · ${count.title}${count.saga ? `  (saga ${count.saga})` : ""}`
}

/** `count` `noun`s:  `1 test`, `2 tests`. */
function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`
}
