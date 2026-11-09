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
    const answer = CLI.ask("What do you want to be called?", { suggestion: "Ana Lima", input, output })
    input.write("  Ana \n")
    expect(await answer).toBe("Ana")
    expect(plain(output.read())).toContain("What do you want to be called? (Ana Lima) ")
  })

  test("a terminal, Enter alone:  the suggestion", async () => {
    const input = stream(true)
    const answer = CLI.ask("Name?", { suggestion: "Ana Lima", input, output: stream(true) })
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
    const answer = CLI.choose("Private or public?", choices, { input, output })
    input.write("\r")
    expect(await answer).toBe("private")
    const drawn = plain(output.read())
    expect(drawn).toContain("Private or public?")
    expect(drawn).toMatch(/❯ 1\. private/)
    expect(drawn).toMatch(/  2\. public/)
  })

  test("the down arrow moves the mark, Enter takes it;  a number key takes its choice at once", async () => {
    const input = stream(true)
    const down = CLI.choose("Private or public?", choices, { input, output: stream(true) })
    input.write("\x1b[B")
    input.write("\r")
    expect(await down).toBe("public")
    const keyed = stream(true)
    const numbered = CLI.choose("Private or public?", choices, { input: keyed, output: stream(true) })
    keyed.write("2")
    expect(await numbered).toBe("public")
  })

  test("Escape:  the suggestion", async () => {
    const input = stream(true)
    const answer = CLI.choose("Private or public?", choices, { suggestion: "public", input, output: stream(true) })
    input.write("\x1b")
    await new Promise((resolve) => setTimeout(resolve, 600))
    expect(await answer).toBe("public")
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
