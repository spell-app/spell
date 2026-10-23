import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell-lang/spell"
import { FixUps, type FixUpFile } from "spell-lang/spell/translate/FixUps"
import { TranslationNames } from "spell-lang/spell/translate/TranslationNames"
import type { ClaudeRunner } from "spell-lang/spell/translate/translate.types"

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

  test("an answer that isn't JSON fixes nothing, and says so", async () => {
    const { fixUps } = fixUpsAnswering("Sorry")
    expect(await fixUps.round([{ path: "/Carta.es.spell", line: 14, why: [] }], FILES)).toEqual([])
    expect(fixUps.notes).toEqual(["claude's fixes aren't JSON:  left the lines as they were"])
  })
})

/** A fix-up pass whose fake `claude` answers `answer`, and keeps each prompt. */
function fixUpsAnswering(answer: unknown) {
  const prompts: string[] = []
  const run: ClaudeRunner = (prompt) => {
    prompts.push(prompt)
    return Promise.resolve(typeof answer === "string" ? answer : `\`\`\`json\n${JSON.stringify(answer)}\n\`\`\``)
  }
  return { fixUps: new FixUps({ run, names: NAMES }), prompts }
}
