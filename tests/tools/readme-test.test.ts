/**
 * Tests of `tools/readme-test.ts`:  finding a page's examples, matching what they printed, and running one.
 */
import { mkdtempSync, realpathSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { ReadmeTest } from "../../tools/readme-test.ts"

const SCRATCH = realpathSync(mkdtempSync(join(tmpdir(), "readme-test-")))
afterAll(() => rmSync(SCRATCH, { recursive: true, force: true }))

/** A page with one tested example, one command with no fold, and one fold that isn't Output. */
const PAGE = [
  "# A page",
  "",
  "```sh",
  "echo one",
  "echo two",
  "```",
  "",
  "<details>",
  "<summary>Output</summary>",
  "",
  "```text",
  "one",
  "two",
  "```",
  "",
  "</details>",
  "",
  "```sh",
  "yarn install",
  "```",
  "",
  "```sh",
  "echo three",
  "```",
  "",
  "<details>",
  "<summary>Why</summary>",
  "",
  "```text",
  "three",
  "```",
  "",
  "</details>"
].join("\n")

describe("ReadmeTest.examples()", () => {
  test("an sh block followed by an Output fold is an example;  others aren't", () => {
    const examples = new ReadmeTest(SCRATCH).examples(join(SCRATCH, "README.md"), PAGE)
    expect(examples).toEqual([
      { page: "README.md", line: 3, folder: SCRATCH, commands: "echo one\necho two", expected: "one\ntwo" }
    ])
  })
})

describe("ReadmeTest.examples():  a page in the kit's README/ folder", () => {
  test("runs from the kit's root, not from README/", () => {
    const [example] = new ReadmeTest(SCRATCH).examples(join(SCRATCH, "README", "cli.md"), PAGE)
    expect(example).toMatchObject({ page: "README/cli.md", folder: SCRATCH })
  })
})

describe("ReadmeTest.examples() under a bullet", () => {
  test("an indented example counts, its commands and output without the indent", () => {
    const page = [
      "- Close one:",
      "",
      "  ```sh",
      "  echo J3",
      "  ```",
      "",
      "  <details>",
      "  <summary>Output</summary>",
      "",
      "  ```text",
      "  J3",
      "    indented in the output",
      "  ```",
      "",
      "  </details>"
    ].join("\n")
    const [example] = new ReadmeTest(SCRATCH).examples(join(SCRATCH, "README.md"), page)
    expect(example).toMatchObject({ line: 3, commands: "echo J3", expected: "J3\n  indented in the output" })
  })
})

describe("ReadmeTest.examples() inside another block", () => {
  test("an example shown inside a ````markdown block is a sample, not run", () => {
    const sample = ["````markdown", ...PAGE.split("\n").slice(2, 16), "````"].join("\n")
    expect(new ReadmeTest(SCRATCH).examples(join(SCRATCH, "README.md"), sample)).toEqual([])
  })
})

describe("ReadmeTest.matches()", () => {
  test("line by line, trailing spaces and blank lines ignored", () => {
    expect(ReadmeTest.matches("one\ntwo", "one  \ntwo\n\n")).toBe(true)
    expect(ReadmeTest.matches("one\ntwo", "one\nthree")).toBe(false)
    expect(ReadmeTest.matches("one", "one\ntwo")).toBe(false)
  })

  test("`...` alone skips any lines, or none", () => {
    expect(ReadmeTest.matches("1\n...\n15 fizzbuzz", "1\n2\n3 fizz\n15 fizzbuzz")).toBe(true)
    expect(ReadmeTest.matches("1\n...\n2", "1\n2")).toBe(true)
    expect(ReadmeTest.matches("1\n...", "1\n2\n3")).toBe(true)
    expect(ReadmeTest.matches("1\n...\n9", "1\n2\n3")).toBe(false)
  })

  test("`...` inside a line is any text there;  the rest is literal", () => {
    expect(ReadmeTest.matches("took ... s (3 files)", "took 0.8 s (3 files)")).toBe(true)
    expect(ReadmeTest.matches("a.b", "aXb")).toBe(false)
  })
})

describe("ReadmeTest.run()", () => {
  test("runs the commands in the page's folder, stdout and stderr as a terminal shows them, colours stripped", () => {
    const run = new ReadmeTest(SCRATCH).run({
      page: "README.md",
      line: 1,
      folder: SCRATCH,
      commands: "echo first >&2; printf '\\033[32mgreen\\033[0m\\n'; pwd",
      expected: ""
    })
    expect(run.printed).toBe(`first\ngreen\n${SCRATCH}\n`)
    expect(run.status).toBe(0)
  })
})
