import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell-parser/spell"
import { FixUps, type FixUpFile } from "spell-parser/spell/translate/FixUps"
import { TranslationNames } from "spell-parser/spell/translate/TranslationNames"
import type { ClaudeOptions, ClaudeRunner } from "spell-parser/spell/translate/translate.types"

/**
 * One round of fix-ups (epic `spanish` P25):  the lines asked about, shown in context, and what `claude` answers
 * taken only where it's safe -- a line it was shown, one line for one.
 * - `claude` is a fake;  the rounds around it are `translateProject()`'s (tests/cli/translateProject.test.ts).
 */

const NAMES = new TranslationNames(
  { types: { joker: { name: "comodín", gender: "masculine" } } },
  { from: SP.Language.for("en")!, to: SP.Language.for("es")! }
)

/** A file of 30 lines, the joker's name on line 15. */
const ENGLISH = Array.from({ length: 30 }, (_, at) => `\tline ${at + 1}`)
ENGLISH[14] = '\t- its name is its color + " joker"'
const SPANISH = ENGLISH.map((line) => line.replace("line", "línea"))
SPANISH[14] = '\t- su nombre es su color + " comodín"'
const FILES = new Map<string, FixUpFile>([["/Carta.es.spell", { lines: SPANISH, english: ENGLISH }]])

describe("FixUps:  each wrong line, in context, one call a round", () => {
  test("shows each line with its English, what's wrong, and 10 lines each side, numbered", async () => {
    const { fixUps, prompts } = fixUpsAnswering({ fixes: [] })
    await fixUps.round([{ path: "/Carta.es.spell", line: 14, why: ["may read in the wrong order"] }], FILES)
    const [prompt] = prompts
    expect(prompt).toContain("### 1. Carta.es.spell, line 15:  may read in the wrong order")
    expect(prompt).toContain('English:  `- its name is its color + " joker"`')
    expect(prompt).toContain('  15 > \t- su nombre es su color + " comodín"')
    expect(prompt).toContain("   5   \tlínea 5")
    expect(prompt).not.toContain("línea 4\n")
    expect(prompt).toContain('"joker"')
  })

  test("takes a fix to a line shown, its indent kept;  never one it wasn't shown, nor one that adds a line", async () => {
    const { fixUps } = fixUpsAnswering({
      fixes: [
        { file: "Carta.es.spell", line: 15, text: '- su nombre es "comodín " + su color' },
        { file: "Carta.es.spell", line: 20, text: "línea 20, mejor" },
        { file: "Carta.es.spell", line: 29, text: "fuera de lo mostrado" },
        { file: "Carta.es.spell", line: 21, text: "dos\nlíneas" },
        { file: "Otra.es.spell", line: 15, text: "otro archivo" }
      ]
    })
    const fixes = await fixUps.round([{ path: "/Carta.es.spell", line: 14, why: ["test:  ..."] }], FILES)
    expect(fixes).toEqual([
      {
        path: "/Carta.es.spell",
        line: 14,
        old: SPANISH[14],
        text: '\t- su nombre es "comodín " + su color'
      },
      { path: "/Carta.es.spell", line: 19, old: "\tlínea 20", text: "\tlínea 20, mejor" }
    ])
  })

  test("asks for JSON of one shape, the glossary in the system prompt's context", async () => {
    const options: ClaudeOptions[] = []
    const run: ClaudeRunner = (_prompt, given = {}) => {
      options.push(given)
      return Promise.resolve('{ "fixes": [] }')
    }
    const fixUps = new FixUps({ run, names: NAMES, glossary: "es:  `es` is `is`" })
    await fixUps.round([{ path: "/Carta.es.spell", line: 14, why: [] }], FILES)
    expect(options[0]!.schema).toMatchObject({
      required: ["fixes"],
      additionalProperties: false,
      properties: { fixes: { type: "array", items: { required: ["file", "line", "text"] } } }
    })
    expect(options[0]!.context).toBe("## The Spanish glossary:  spell's own words\nes:  `es` is `is`")
  })

  test("an answer that isn't JSON:  asked again in two halves at once, so the round isn't lost (P27)", async () => {
    const answers = [
      '{ "fixes": [ { "file": "Carta.es.spell", "line": 15, "te',
      fenced({ fixes: [{ file: "Carta.es.spell", line: 15, text: '- su nombre es "comodín " + su color' }] }),
      fenced({ fixes: [{ file: "Carta.es.spell", line: 29, text: "línea 29, mejor" }] })
    ]
    const prompts: string[] = []
    const run: ClaudeRunner = (prompt) => {
      prompts.push(prompt)
      return Promise.resolve(answers.shift()!)
    }
    const fixUps = new FixUps({ run, names: NAMES })
    const lines = [
      { path: "/Carta.es.spell", line: 14, why: ["test"] },
      { path: "/Carta.es.spell", line: 28, why: ["lint"] }
    ]
    const fixed = await fixUps.round(lines, FILES)
    expect(prompts).toHaveLength(3)
    expect(prompts[1]).toContain("### 1. Carta.es.spell, line 15")
    expect(prompts[1]).not.toContain("line 29:")
    expect(prompts[2]).toContain("### 1. Carta.es.spell, line 29")
    expect(fixed.map(({ line }) => line)).toEqual([14, 28])
    expect(fixUps.durations).toHaveLength(3)
    expect(fixUps.notes).toEqual(["claude's fixes weren't JSON:  asked again, in two halves of 1"])
  })

  test("an answer that isn't JSON twice fixes nothing, and says so;  one line is asked again as it was", async () => {
    const { fixUps, prompts } = fixUpsAnswering("Sorry")
    expect(await fixUps.round([{ path: "/Carta.es.spell", line: 14, why: [] }], FILES)).toEqual([])
    expect(prompts).toHaveLength(2)
    expect(prompts[1]).toBe(prompts[0])
    expect(fixUps.notes).toEqual([
      "claude's fixes weren't JSON:  asked again",
      "claude's fixes aren't JSON:  left the lines as they were"
    ])
  })

  test("claude failing isn't asked again:  the runner retried what was worth it", async () => {
    let calls = 0
    const run: ClaudeRunner = () => {
      calls++
      return Promise.reject(new Error("Claude API (claude-opus-5-5):  401 authentication_error:  invalid x-api-key"))
    }
    const fixUps = new FixUps({ run, names: NAMES })
    expect(await fixUps.round([{ path: "/Carta.es.spell", line: 14, why: [] }], FILES)).toEqual([])
    expect(calls).toBe(1)
    expect(fixUps.notes).toEqual([
      "claude couldn't fix the lines:  Claude API (claude-opus-5-5):  401 authentication_error:  invalid x-api-key"
    ])
  })
})

/** `answer` as JSON in a fence, as `claude -p` answered before it took a schema. */
function fenced(answer: unknown): string {
  return `\`\`\`json\n${JSON.stringify(answer)}\n\`\`\``
}

/** A fix-up pass whose fake `claude` answers `answer`, and keeps each prompt. */
function fixUpsAnswering(answer: unknown) {
  const prompts: string[] = []
  const run: ClaudeRunner = (prompt) => {
    prompts.push(prompt)
    return Promise.resolve(typeof answer === "string" ? answer : `\`\`\`json\n${JSON.stringify(answer)}\n\`\`\``)
  }
  return { fixUps: new FixUps({ run, names: NAMES }), prompts }
}
