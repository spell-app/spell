import type { spawn as childSpawn } from "node:child_process"
import { EventEmitter } from "node:events"
import { PassThrough } from "node:stream"
import { describe, expect, it } from "vite-plus/test"

import { ClaudeExplainer } from "spell/app/spaces/server/node/changes/ClaudeExplainer"

/**
 * Explaining Spell in plain words, for the code's Explain This (epic `editor` P32, Q39).
 * - NEVER starts a real Claude:  every start goes to a stand-in `spawn()`.
 */

/** A stand-in `spawn()`:  answers `answer` on its output and ends with `code`, noting what it was asked. */
function standIn(answer: string, code = 0) {
  const seen: { args?: string[]; prompt: string } = { prompt: "" }
  const spawn = ((_command: string, args: string[]) => {
    seen.args = args
    const child = Object.assign(new EventEmitter(), {
      stdin: new PassThrough(),
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      kill: () => true
    })
    child.stdin.on("data", (chunk: Buffer) => (seen.prompt += chunk.toString()))
    child.stdin.on("finish", () => {
      child.stdout.end(answer)
      setTimeout(() => child.emit("close", code), 5)
    })
    return child
  }) as unknown as typeof childSpawn
  return { spawn, seen }
}

describe("ClaudeExplainer", () => {
  it("asks once, with no tools, and answers Claude's words", async () => {
    const { spawn, seen } = standIn("Turns over the next card.\n")
    const explainer = new ClaudeExplainer({ claude: "/bin/claude", spawn })
    const words = await explainer.explain({ code: "to turn over the next card", language: "en", projectId: "@x/Game" })
    expect(words).toBe("Turns over the next card.")
    expect(seen.prompt).toContain("to turn over the next card")
    expect(seen.prompt).toContain("@x/Game")
    const args = seen.args!
    expect(args[args.indexOf("--tools") + 1]).toBe("")
    expect(args).toContain("--print")
    expect(args[args.indexOf("--system-prompt") + 1]).toContain("Answer in English")
  })

  it("answers in Spanish for a Spanish editor", async () => {
    const { spawn, seen } = standIn("Da la vuelta a la carta.")
    await new ClaudeExplainer({ claude: "/bin/claude", spawn }).explain({ code: "x", language: "es" })
    expect(seen.args![seen.args!.indexOf("--system-prompt") + 1]).toContain("Answer in Spanish")
  })

  it("says why when Claude ends without an answer", async () => {
    const { spawn } = standIn("", 1)
    await expect(
      new ClaudeExplainer({ claude: "/bin/claude", spawn }).explain({ code: "x", language: "en" })
    ).rejects.toThrow(/Claude ended/)
  })

  it("refuses with no Claude Code here, or no code", async () => {
    await expect(new ClaudeExplainer({ claude: undefined }).explain({ code: "x", language: "en" })).rejects.toThrow(
      TypeError
    )
    await expect(new ClaudeExplainer({ claude: "/bin/claude" }).explain({ code: " ", language: "en" })).rejects.toThrow(
      TypeError
    )
  })
})
