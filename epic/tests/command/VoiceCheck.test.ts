/**
 * `VoiceCheck`:  `epic voice check`, a fresh reader checking a text against a voice.
 * - The reader is a stub, never `claude -p`;  the voices are the ones spell-epic ships.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, expect, test } from "vite-plus/test"

import { VoiceCheck, type VoiceRequest, type VoiceVerdict } from "spell/epic/command/VoiceCheck"
import { EXIT } from "spell/epic/command/command.types"

const folder = mkdtempSync(join(tmpdir(), "voice-check-"))

afterAll(() => rmSync(folder, { recursive: true, force: true }))

const PASSED: VoiceVerdict = {
  comprehensible: true,
  concise: true,
  clear: true,
  agentSpeak: false,
  summary: "Short and plain.",
  problems: [],
  pass: true
}

const FAILED: VoiceVerdict = {
  comprehensible: false,
  concise: true,
  clear: false,
  agentSpeak: true,
  summary: "Insider words.",
  problems: [
    { quote: "your draft is synced", why: "Nobody new knows what synced means.", rewrite: "your changes are saved" }
  ],
  pass: false
}

/** A check whose reader answers `verdict`, keeping what it was asked;  what it printed, in `printed`. */
function checker(verdict: VoiceVerdict, stdin = "") {
  const asked: VoiceRequest[] = []
  const printed: string[] = []
  const check = new VoiceCheck({
    ask: (request) => {
      asked.push(request)
      return verdict
    },
    readStdin: () => stdin,
    write: (text) => void printed.push(text)
  })
  return { check, asked, printed }
}

test("a pass:  exit 0, the reader given the novice voice, the text and what it is", () => {
  const { check, asked, printed } = checker(PASSED)
  expect(check.run(["--text", "Keep your changes?", "--about", "a dialog's heading"])).toBe(EXIT.OK)
  const [request] = asked
  expect(request!.text).toBe("Keep your changes?")
  expect(request!.model).toBe("sonnet")
  expect(request!.system).toContain("## The voice:  novice")
  expect(request!.system).toContain("# The novice voice")
  expect(request!.system).toContain("The text is a dialog's heading.")
  // the prompt file's note to people isn't sent
  expect(request!.system).not.toContain("Tune it here")
  expect(printed.join("")).toMatch(/^novice voice:  PASS\n/)
})

test("a fail:  exit 1, each problem quoted with its rewrite;  --json the verdict itself", () => {
  const { check, printed } = checker(FAILED)
  expect(check.run(["--text", "Your draft is synced."])).toBe(EXIT.ERRORS)
  expect(printed[0]).toContain("novice voice:  FAIL")
  expect(printed[0]).toContain(
    '1. "your draft is synced"\n   Nobody new knows what synced means.\n   Try:  "your changes are saved"'
  )

  const json = checker(FAILED)
  expect(json.check.run(["--text", "Your draft is synced.", "--json", "--voice", "readme"])).toBe(EXIT.ERRORS)
  expect(JSON.parse(json.printed[0]!)).toEqual({ voice: "readme", model: "sonnet", ...FAILED })
})

test("the text from a file, or stdin with -", () => {
  const file = join(folder, "dialog.txt")
  writeFileSync(file, "From a file.")
  const fromFile = checker(PASSED)
  fromFile.check.run([file])
  expect(fromFile.asked[0]!.text).toBe("From a file.")

  const fromStdin = checker(PASSED, "From stdin.")
  fromStdin.check.run(["-", "--model", "haiku"])
  expect(fromStdin.asked[0]).toMatchObject({ text: "From stdin.", model: "haiku" })
})

test("usage errors:  no text, two texts, an empty one, a voice the repo hasn't got, a flag with no value", () => {
  const { check, asked } = checker(PASSED)
  expect(() => check.run([])).toThrow(/which text\?/)
  expect(() => check.run(["a.txt", "--text", "hi"])).toThrow(/ONE text/)
  expect(() => check.run(["--text", "  "])).toThrow(/empty/)
  expect(() => check.run(["--text", "hi", "--voice", "pirate"])).toThrow(/no such voice here/)
  expect(() => check.run(["--text"])).toThrow(/--text\?  it needs a value/)
  expect(() => check.run([join(folder, "missing.txt")])).toThrow(/can't read/)
  expect(asked).toEqual([])
})

test("instructions:  a {voice} written inside the voice file stays as written", () => {
  const system = VoiceCheck.instructions({ voice: "novice", voiceText: "Say {voice} and {about} literally." })
  expect(system).toContain("Say {voice} and {about} literally.")
  expect(system).toContain("## The voice:  novice")
})

test("verdictFrom:  claude -p's structured_output;  an error or no verdict throws", () => {
  expect(VoiceCheck.verdictFrom(JSON.stringify({ is_error: false, structured_output: PASSED }))).toEqual(PASSED)
  expect(() => VoiceCheck.verdictFrom(JSON.stringify({ is_error: true, result: "rate limited" }))).toThrow(
    /no answer:  rate limited/
  )
  expect(() => VoiceCheck.verdictFrom("not json")).toThrow(/isn't JSON/)
})
