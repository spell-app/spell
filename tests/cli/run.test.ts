import { PassThrough } from "node:stream"
import { describe, expect, test } from "vite-plus/test"

import { CLI } from "spell/cli"

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
    expect(String(output.read())).toContain("What do you want to be called? (Ana Lima) ")
  })

  test("a terminal, Enter alone:  the suggestion", async () => {
    const input = stream(true)
    const answer = CLI.ask("Name?", { suggestion: "Ana Lima", input, output: stream(true) })
    input.write("\n")
    expect(await answer).toBe("Ana Lima")
  })
})
