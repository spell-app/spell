import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { Transcript } from "spell/epic/config/Transcript"

/** A throwaway folder of transcripts. */
const DIR = mkdtempSync(join(tmpdir(), "transcript-"))
afterAll(() => rmSync(DIR, { recursive: true, force: true }))

/** A transcript file holding `entries`, a line each;  its path. */
function transcript(name: string, ...entries: (object | string)[]): string {
  const file = join(DIR, `${name}.jsonl`)
  writeFileSync(file, entries.map((it) => (typeof it === "string" ? it : JSON.stringify(it)) + "\n").join(""))
  return file
}

const CUSTOM = { type: "custom-title", customTitle: "🚧 editor" }
const AI = { type: "ai-title", aiTitle: "Claude in Chrome browser automation" }

describe("Transcript", () => {
  // epic `epic-engine` r2:  after a handoff, ba126030's tab showed Claude Code's own title, written after its custom one
  test("titles():  the last of each kind, and the last line of either", () => {
    expect(new Transcript(transcript("custom-ai", CUSTOM, AI)).titles()).toEqual({
      custom: "🚧 editor",
      ai: "Claude in Chrome browser automation",
      last: { title: "Claude in Chrome browser automation", custom: false }
    })
    expect(new Transcript(transcript("ai-custom", AI, CUSTOM)).titles().last).toEqual({
      title: "🚧 editor",
      custom: true
    })
    expect(
      new Transcript(transcript("cleared", CUSTOM, { type: "custom-title", customTitle: "" })).titles().custom
    ).toBe("")
    expect(new Transcript(transcript("none", { type: "user" })).titles()).toEqual({})
  })

  test("titles():  a kind the end lacks, from the whole file", () => {
    const far = transcript("far", CUSTOM, `{"pad":"${"x".repeat(5 * 1024 * 1024)}"}`, AI)
    expect(new Transcript(far).titles()).toMatchObject({
      custom: "🚧 editor",
      ai: "Claude in Chrome browser automation"
    })
  })

  test("tail():  the last bytes;  the whole file when it's shorter", () => {
    const file = transcript("tail", { a: 1 }, { b: 2 })
    expect(new Transcript(file).tail(8)).toBe('{"b":2}\n')
    expect(new Transcript(file).tail(1000)).toBe('{"a":1}\n{"b":2}\n')
  })

  test("parseLine(), blocksOf():  an entry, or {};  a message's content as blocks", () => {
    expect(Transcript.parseLine('{"type":"user"}')).toEqual({ type: "user" })
    expect([Transcript.parseLine('{"cut'), Transcript.parseLine("[1]"), Transcript.parseLine("7")]).toEqual([
      {},
      {},
      {}
    ])
    expect(Transcript.blocksOf({ content: "hi" })).toEqual([{ type: "text", text: "hi" }])
    expect(Transcript.blocksOf({ content: [{ type: "image" }, "stray", null] })).toEqual([{ type: "image" }])
    expect(Transcript.blocksOf(undefined)).toEqual([])
  })

  test("pendingQuestion():  the AskUserQuestion no answer came after;  an agent's never counts", () => {
    const ask = (at: string, question: string) => ({
      type: "assistant",
      timestamp: at,
      message: { content: [{ type: "tool_use", name: "AskUserQuestion", input: { questions: [{ question }] } }] }
    })
    const answer = { type: "user", message: { content: [{ type: "tool_result", content: "B" }] } }
    const text = (...entries: object[]) => entries.map((it) => JSON.stringify(it)).join("\n")
    expect(Transcript.pendingQuestion(text(ask("t1", "Which?")))).toEqual({
      questions: [{ question: "Which?" }],
      at: "t1"
    })
    expect(Transcript.pendingQuestion(text(ask("t1", "Which?"), answer))).toBeUndefined()
    expect(Transcript.pendingQuestion(text({ ...ask("t2", "Agent's?"), isSidechain: true }))).toBeUndefined()
  })
})
