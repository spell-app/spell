import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { PassThrough } from "node:stream"
import { describe, expect, test } from "vite-plus/test"

import { CLI } from "spell/cli"

/** What a stream drew, its colours taken out. */
function plain(drawn: unknown): string {
  // oxlint-disable-next-line no-control-regex -- the terminal's colour codes
  return String(drawn).replace(/\x1b\[[0-9;]*m/g, "")
}

/** No keys typed ahead thrown away:  a test writes its keys as soon as it asks. */
const NOW = { typedAheadMs: 0 }

/** A stream that says it's a terminal, or not. */
function stream(isTTY: boolean): PassThrough & { isTTY: boolean } {
  return Object.assign(new PassThrough(), { isTTY })
}

describe("ask()", () => {
  test("no terminal (a pipe, a Claude session):  the suggestion, asking nothing", async () => {
    const output = stream(false)
    expect(
      await CLI.ask("What do you want to be called?", { suggestion: "Ana Lima", input: stream(false), output })
    ).toBe("Ana Lima")
    expect(output.read()).toBeNull()
  })

  test("only one of the two a terminal:  still no question", async () => {
    expect(await CLI.ask("Name?", { suggestion: "Ana", input: stream(true), output: stream(false) })).toBe("Ana")
    expect(await CLI.ask("Name?", { input: stream(false), output: stream(true) })).toBe("")
  })

  test("a terminal:  asks, showing the suggestion;  the answer, trimmed", async () => {
    const input = stream(true)
    const output = stream(true)
    const answer = CLI.ask("What do you want to be called?", { suggestion: "Ana Lima", input, output, ...NOW })
    input.write("  Ana \n")
    expect(await answer).toBe("Ana")
    expect(plain(output.read())).toContain("What do you want to be called? (Ana Lima) ")
  })

  test("a terminal, Enter alone:  the suggestion", async () => {
    const input = stream(true)
    const answer = CLI.ask("Name?", { suggestion: "Ana Lima", input, output: stream(true), ...NOW })
    input.write("\n")
    expect(await answer).toBe("Ana Lima")
  })
})

describe("choose()", () => {
  const choices = [
    { value: "private", label: "private", hint: "only the people you add" },
    { value: "public", label: "public", hint: "anyone can read the plans" }
  ]

  test("no terminal:  the suggestion, else the first, drawing nothing", async () => {
    const output = stream(false)
    expect(await CLI.choose("Private or public?", choices, { input: stream(false), output })).toBe("private")
    expect(
      await CLI.choose("Private or public?", choices, { suggestion: "public", input: stream(false), output })
    ).toBe("public")
    expect(output.read()).toBeNull()
  })

  test("a terminal:  a numbered list, the suggestion marked;  Enter takes it", async () => {
    const input = stream(true)
    const output = stream(true)
    const answer = CLI.choose("Private or public?", choices, { input, output, ...NOW })
    input.write("\r")
    expect(await answer).toBe("private")
    const drawn = plain(output.read())
    expect(drawn).toContain("Private or public?")
    expect(drawn).toMatch(/❯ 1\. private/)
    expect(drawn).toMatch(/  2\. public/)
  })

  test("the down arrow moves the mark, Enter takes it;  a number key takes its choice at once", async () => {
    const input = stream(true)
    const down = CLI.choose("Private or public?", choices, { input, output: stream(true), ...NOW })
    input.write("\x1b[B")
    input.write("\r")
    expect(await down).toBe("public")
    const keyed = stream(true)
    const numbered = CLI.choose("Private or public?", choices, { input: keyed, output: stream(true), ...NOW })
    keyed.write("2")
    expect(await numbered).toBe("public")
  })

  test("once picked, the list folds into one line:  the question and the answer", async () => {
    const input = stream(true)
    const output = stream(true)
    const answer = CLI.choose("Private or public?", choices, { input, output, ...NOW })
    input.write("\x1b[B")
    input.write("\r")
    expect(await answer).toBe("public")
    const drawn = String(output.read())
    // up over the list and the question, cleared to the end, then the one line
    expect(drawn).toContain("\x1b[3A\r\x1b[J")
    expect(plain(drawn).endsWith("? Private or public? public\n")).toBe(true)
  })

  test("keys typed before the list shows are thrown away:  a stray arrow and Enter pick nothing", async () => {
    const input = stream(true)
    input.write("\x1b[B\r")
    const answer = CLI.choose("Private or public?", choices, { input, output: stream(true), typedAheadMs: 50 })
    await new Promise((resolve) => setTimeout(resolve, 100))
    let picked: string | undefined
    void answer.then((value) => (picked = value))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(picked).toBeUndefined()
    input.write("\r")
    expect(await answer).toBe("private")
  })

  test("and before a question:  a stray Enter doesn't answer it", async () => {
    const input = stream(true)
    input.write("\r")
    const answer = CLI.ask("Name?", { suggestion: "Ana", input, output: stream(true), typedAheadMs: 50 })
    await new Promise((resolve) => setTimeout(resolve, 100))
    input.write("Bo\n")
    expect(await answer).toBe("Bo")
  })

  test("more than 9:  digits build the number and move the mark, Enter takes it;  past the end starts again", async () => {
    const many = Array.from({ length: 13 }, (_, index) => ({ value: `c${index + 1}`, label: `c${index + 1}` }))
    const input = stream(true)
    const thirteen = CLI.choose("Which?", many, { input, output: stream(true), ...NOW })
    input.write("1")
    input.write("3")
    input.write("\r")
    expect(await thirteen).toBe("c13")
    // 1 then 4 is past 13:  a new number, 4
    const again = stream(true)
    const four = CLI.choose("Which?", many, { input: again, output: stream(true), ...NOW })
    again.write("1")
    again.write("4")
    again.write("\r")
    expect(await four).toBe("c4")
  })

  test("more than 9:  a pause of a second starts a new number", async () => {
    const many = Array.from({ length: 13 }, (_, index) => ({ value: `c${index + 1}`, label: `c${index + 1}` }))
    const input = stream(true)
    const answer = CLI.choose("Which?", many, { input, output: stream(true), ...NOW })
    input.write("1")
    await new Promise((resolve) => setTimeout(resolve, 1100))
    input.write("2")
    input.write("\r")
    expect(await answer).toBe("c2")
  })

  test("Escape:  the suggestion", async () => {
    const input = stream(true)
    const answer = CLI.choose("Private or public?", choices, {
      suggestion: "public",
      input,
      output: stream(true),
      ...NOW
    })
    input.write("\x1b")
    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(await answer).toBe("public")
  })
})

describe("waiting()", () => {
  test("a gray line in a terminal, the work's result;  nothing said with no terminal", async () => {
    const output = stream(true)
    expect(CLI.waiting("checking GitLab…", () => 42, { input: stream(false), output })).toBe(42)
    expect(plain(output.read())).toBe("checking GitLab…\n")
    const quiet = stream(false)
    expect(await CLI.waiting("pushing…", async () => "done", { input: stream(false), output: quiet })).toBe("done")
    expect(quiet.read()).toBeNull()
  })

  test("throws what the work throws", () => {
    expect(() =>
      CLI.waiting(
        "x",
        () => {
          throw new Error("boom")
        },
        { input: stream(false), output: stream(false) }
      )
    ).toThrow("boom")
  })
})

describe("missingAddOnMessage() (epic-engine P66)", () => {
  const missing = (name: string) =>
    Object.assign(new Error("Cannot find package '" + name + "' imported from /x/dist/y.js"), {
      code: "ERR_MODULE_NOT_FOUND"
    })

  function withKit(work: (kit: string) => void): void {
    const kit = mkdtempSync(join(tmpdir(), "spell-addons-"))
    writeFileSync(
      join(kit, "package.json"),
      JSON.stringify({
        peerDependencies: { heavy: "^1.2", "@scope/thing": "2.0.0", needed: "1" },
        peerDependenciesMeta: { heavy: { optional: true }, "@scope/thing": { optional: true } }
      })
    )
    try {
      work(kit)
    } finally {
      rmSync(kit, { recursive: true, force: true })
    }
  }

  test("a package left out:  every add-on, on one line to paste, quoted where a shell needs it", () => {
    withKit((kit) => {
      const message = CLI.missingAddOnMessage(missing("heavy"), kit)!
      expect(message).toContain("This needs heavy")
      expect(message).toContain('npm install spell@next "heavy@^1.2" @scope/thing@2.0.0')
      expect(message).not.toContain("needed")
    })
  })

  test("a subpath of a scoped package names the package", () => {
    withKit((kit) => expect(CLI.missingAddOnMessage(missing("@scope/thing/deep"), kit)).toContain("@scope/thing"))
  })

  test("anything else stays what it was", () => {
    withKit((kit) => {
      expect(CLI.missingAddOnMessage(missing("needed"), kit)).toBeUndefined()
      expect(CLI.missingAddOnMessage(new Error("boom"), kit)).toBeUndefined()
      expect(CLI.missingAddOnMessage(missing("heavy"), join(kit, "nowhere"))).toBeUndefined()
    })
  })
})
