/**
 * Tests of `Runbook`:  a runbook's settings, its steps and their kinds, and every mistake it names;
 * and NetBox's runbook, the first real one, reading clean.
 */
import { homedir } from "node:os"
import { join } from "node:path"
import { describe, expect, test } from "vite-plus/test"

import { lapsesAt, Runbook, Runbooks } from "spell/cli/runbook"

/** A runbook with one step of each kind. */
const TEXT = [
  "---",
  "title: A try",
  "folder: ~/runbook-try",
  "fresh until: 04:00 UTC",
  "---",
  "",
  "About a minute.",
  "",
  "## Make an account",
  "",
  "Open [the demo](https://demo.example.com/login/).",
  "Click **Create**.",
  "",
  "Should:  your name, top right.",
  "",
  "## Make a token",
  "",
  "Copy it.",
  "",
  "```ask TOKEN secret",
  "Paste the token",
  "```",
  "",
  "```ask CITY",
  "Which city?",
  "```",
  "",
  "## Check it",
  "",
  "```sh",
  "curl -f https://demo.example.com/",
  "```",
  "",
  "<details><summary>Output</summary>",
  "",
  "```text",
  "...",
  "```",
  "",
  "</details>",
  "",
  "If not:  start again."
].join("\n")

describe("Runbook", () => {
  test("its settings, its intro, and each step's kind, words, link, Should and If not", () => {
    const runbook = new Runbook("/somewhere/a-try.runbook.md", TEXT)
    expect(runbook.name).toBe("a-try")
    expect(runbook.title).toBe("A try")
    expect(runbook.folder).toBe(join(homedir(), "runbook-try"))
    expect(runbook.freshUntil).toEqual({ hour: 4, minute: 0, utc: true, text: "04:00 UTC" })
    expect(runbook.intro).toBe("About a minute.")
    const [account, token, check] = runbook.steps
    expect(runbook.steps.map(Runbook.kindOf)).toEqual(["by hand", "ask", "run"])
    expect(account).toMatchObject({
      number: 1,
      title: "Make an account",
      line: 9,
      words: "Open [the demo](https://demo.example.com/login/).\nClick **Create**.",
      link: "https://demo.example.com/login/",
      should: "your name, top right."
    })
    expect(token!.words).toBe("Copy it.")
    expect(token!.actions).toEqual([
      { kind: "ask", name: "TOKEN", secret: true, question: "Paste the token", line: 20 },
      { kind: "ask", name: "CITY", secret: false, question: "Which city?", line: 24 }
    ])
    expect(check!.actions).toEqual([
      { kind: "run", commands: "curl -f https://demo.example.com/", output: "...", line: 30 }
    ])
    expect(check).toMatchObject({ words: "", ifNot: "start again." })
  })

  test("no settings:  its # heading is its title, else its name;  a folder from the file's", () => {
    expect(new Runbook("/a/b.runbook.md", "# Hello\n\n## One\n\nDo it.").title).toBe("Hello")
    const plain = new Runbook("/a/b.runbook.md", "---\nfolder: out\n---\n## One\n\nDo it.")
    expect(plain.title).toBe("b")
    expect(plain.folder).toBe("/a/out")
    expect(plain.freshUntil).toBeUndefined()
  })

  test("a ## inside a fenced block is no step", () => {
    const runbook = new Runbook("/a/b.runbook.md", "## One\n\n````markdown\n## Not a step\n````")
    expect(runbook.steps.map((step) => step.title)).toEqual(["One"])
  })

  test("every mistake at once, each with its line and step", () => {
    const text = [
      "---",
      "colour: blue",
      "fresh until: 4 in the morning",
      "---",
      "## Empty",
      "",
      "## Twice",
      "",
      "```ask lower-case! loud",
      "```",
      "",
      "## Twice",
      "",
      "Do it."
    ].join("\n")
    let error: unknown
    try {
      new Runbook("/a/broken.runbook.md", text)
    } catch (thrown) {
      error = thrown
    }
    expect(error).toBeInstanceOf(SyntaxError)
    expect((error as SyntaxError & { cause: { mistakes: string[] } }).cause.mistakes).toEqual([
      'broken.runbook.md:2:  "colour: blue" isn\'t a setting:  title, folder or fresh until, each as `name: value`',
      'broken.runbook.md:3:  fresh until "4 in the morning" isn\'t a time of day:  write it as 04:00 UTC, or 18:30 for your own time',
      'broken.runbook.md:5:  step 1, "Empty":  it says nothing to do:  write what to do, or add an sh block',
      'broken.runbook.md:9:  step 2, "Twice":  its ask block needs a name for the value, as ```ask NETBOX_TOKEN secret',
      'broken.runbook.md:9:  step 2, "Twice":  "loud" after the name:  only secret goes there',
      'broken.runbook.md:9:  step 2, "Twice":  its ask block for lower-case! has no question:  write it inside',
      'broken.runbook.md:12:  two steps called "Twice":  give each its own heading'
    ])
  })

  test("no steps:  a mistake", () => {
    expect(() => new Runbook("/a/b.runbook.md", "Just words.")).toThrow(/no steps/)
  })
})

describe("lapsesAt()", () => {
  test("the first time of day after the start:  later that day, or the next", () => {
    const fresh = { hour: 4, minute: 0, utc: true, text: "04:00 UTC" }
    expect(lapsesAt(fresh, new Date("2026-11-20T10:00:00Z")).toISOString()).toBe("2026-11-21T04:00:00.000Z")
    expect(lapsesAt(fresh, new Date("2026-11-20T03:00:00Z")).toISOString()).toBe("2026-11-20T04:00:00.000Z")
    expect(lapsesAt(fresh, new Date("2026-11-20T04:00:00Z")).toISOString()).toBe("2026-11-21T04:00:00.000Z")
  })
})

describe("NetBox's runbook", () => {
  test("reads clean:  two steps by hand, then three it runs", () => {
    const runbook = Runbook.read(new Runbooks().find("netbox-demo"))
    expect(runbook.steps.map(Runbook.kindOf)).toEqual(["by hand", "ask", "run", "run", "run"])
    expect(runbook.freshUntil?.text).toBe("04:00 UTC")
  })
})
