import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { CLI } from "spell-kit/cli"
import { parseSpellProject } from "spell-lang/spell/test"
import { translateProject, type TranslateSource } from "spell-lang/cli/translateProject"
import type { ClaudeRunner, LineProblem, NamesData } from "spell-lang/spell/translate/translate.types"

/**
 * `spell lang translate`'s three passes end to end (epic `spanish` P25):  names, lines, fix-ups --
 * on a small project written to a temp folder, with a fake `claude` and a fake checker.
 * - The fake checker fails the test line while the joker's name is in English word order, as a real test run would.
 * - spell-app's `cli.test.ts` runs the real command;  this one pins the loop:  what's asked, what's fixed, what's kept.
 */

const CARD = `a "card" is a thing where:
	- its "color" is one of red or black
	- its "label" is its color + " joker"

to test card labels
	get a new card whose color is red
	its label should be "red joker"
`

/** What the fake `claude` answers the names pass. */
const NAMES: NamesData = {
  types: { card: { name: "carta", gender: "feminine" } },
  names: { color: "color", red: "rojo", black: "negro", label: "etiqueta" },
  phrases: { "card labels": "etiquetas de cartas" },
  texts: { " joker": " comodín", "red joker": "comodín rojo" },
  genders: { color: "masculine", etiqueta: "feminine" }
}

/** The line the fix-up writes for the joker's label:  Spanish puts the word first. */
const FIXED = '- su etiqueta es "comodín " + su color'

let folder: string
beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), "spell-translate-"))
  mkdirSync(join(folder, "Cards"))
  writeFileSync(join(folder, "Cards", "Card.spell"), CARD)
  writeFileSync(join(folder, "Cards", "__project.json5"), JSON.stringify({ imports: [{ path: "/Card.spell" }] }))
  writeFileSync(join(folder, "Cards", "styles.css"), "ui-text[color] { margin: 0 }\n")
  vi.spyOn(CLI, "out").mockImplementation(() => {})
  vi.spyOn(CLI, "err").mockImplementation(() => {})
})
afterEach(() => {
  rmSync(folder, { recursive: true, force: true })
  vi.restoreAllMocks()
})

describe("translateProject():  names, then lines, then fix-ups", () => {
  test("cold:  one names call, then one fix-up round for the line in the wrong order;  checked clean", async () => {
    const claude = fakeClaude()
    const exitCode = await translateProject(source(), { to: "es", out: join(folder, "Cartas") }, claude.run)
    expect(exitCode).toBe(CLI.EXIT.OK)
    expect(claude.prompts.map(kindOf)).toEqual(["names", "fix-ups"])
    // the fix-up was shown the line, its English, and why
    expect(claude.prompts[1]).toContain('its color + " joker"')
    expect(claude.prompts[1]).toContain("may read in the wrong order")
    expect(written()[2]).toBe(`\t${FIXED}`)
    expect(written()[6]).toBe('\tsu etiqueta debería ser "comodín rojo"')
    // the record keeps the fix, for --update
    const record = JSON.parse(readFileSync(join(folder, "Cards", "Cards.es.translated.json5"), "utf8"))
    expect(record.fixes).toEqual([
      {
        path: "/Card.spell",
        source: expect.any(String),
        mechanical: '\t- su "etiqueta" es su color + " comodín"',
        fixed: `\t${FIXED}`
      }
    ])
  })

  test("a line a check says is wrong goes back too, round after round, until it passes or 3 rounds are up", async () => {
    // a claude that never fixes it:  three rounds asked, then left for a person
    const claude = fakeClaude({ fixes: [] as unknown[] })
    const exitCode = await translateProject(source(), { to: "es", out: join(folder, "Cartas") }, claude.run)
    expect(exitCode).toBe(CLI.EXIT.ERRORS)
    expect(claude.prompts.map(kindOf)).toEqual(["names", "fix-ups"])
    let tries = 0
    const stubborn = fakeClaude(() => ({
      fixes: [{ file: "Carta.es.spell", line: 7, text: `su etiqueta debería ser "otra ${++tries}"` }]
    }))
    await translateProject(source(), { to: "es", out: join(folder, "Cartas2") }, stubborn.run)
    expect(stubborn.prompts.map(kindOf)).toEqual(["fix-ups", "fix-ups", "fix-ups"])
  })

  test("--update:  a fix made before is used again, never asked for;  a person's edit to an unchanged line stays", async () => {
    const out = join(folder, "Cartas")
    await translateProject(source(), { to: "es", out }, fakeClaude().run)
    // a person edits the test's first line;  the English test's last line changes
    const lines = written()
    lines[5] = "\tobtener una carta nueva cuyo color es rojo"
    writeFileSync(join(out, "Carta.es.spell"), lines.join("\n"))
    const changed = CARD.replace('"red joker"', '"red joker" ')
    writeFileSync(join(folder, "Cards", "Card.spell"), changed)
    const claude = fakeClaude()
    await translateProject(source(changed), { to: "es", out, update: true }, claude.run)
    // every name is in the dictionary, and the fix in the record:  nothing to ask
    expect(claude.prompts).toEqual([])
    expect(written()[2]).toBe(`\t${FIXED}`)
    expect(written()[5]).toBe("\tobtener una carta nueva cuyo color es rojo")
  })

  test("--update with its file gone:  every line written again, the fix from the record, not from claude", async () => {
    const out = join(folder, "Cartas")
    await translateProject(source(), { to: "es", out }, fakeClaude().run)
    rmSync(join(out, "Carta.es.spell"))
    const claude = fakeClaude()
    await translateProject(source(), { to: "es", out, update: true }, claude.run)
    expect(claude.prompts).toEqual([])
    expect(written()[2]).toBe(`\t${FIXED}`)
  })

  test("its style sheet comes along, its selectors translated as far as it knows the names", async () => {
    await translateProject(source(), { to: "es", out: join(folder, "Cartas") }, fakeClaude().run)
    expect(readFileSync(join(folder, "Cartas", "styles.css"), "utf8")).toBe("ui-text[color] { margin: 0 }\n")
  })
})

////////////////
// ## Helpers
////////////////

/** The project as spell-app hands it over:  parsed, its declarations, and a checker. */
function source(contents = CARD): TranslateSource {
  const { files } = parseSpellProject([{ path: "/Card.spell", contents }])
  return {
    projectName: "Cards",
    folder: join(folder, "Cards"),
    files: [{ path: "/Card.spell", contents, match: files[0]!.match }],
    declarations: [{ type: "Card" }, { property: "color", of: "Card", enumeration: ["red", "black"] }],
    checker: (out) => () => Promise.resolve({ problems: check(out) })
  }
}

/** The fake checker:  the test fails while the label reads in English order -- on the line that checks it. */
function check(out: string): LineProblem[] {
  const text = readFileSync(join(out, "Carta.es.spell"), "utf8")
  if (text.includes(FIXED)) return []
  return [{ path: "/Carta.es.spell", line: 6, message: "Inesperado: `su etiqueta` ... `rojo comodín`", source: "test" }]
}

/**
 * A fake `claude`:  the names pass gets `NAMES`;  each fix-up round, `answer`, or what it makes
 *   (by default the fixed label).
 * - It keeps each prompt it's given.
 */
function fakeClaude(answer: unknown = { fixes: [{ file: "Carta.es.spell", line: 3, text: FIXED }] }) {
  const prompts: string[] = []
  const run: ClaudeRunner = (prompt) => {
    prompts.push(prompt)
    const reply =
      kindOf(prompt) === "names" ? NAMES : typeof answer === "function" ? (answer as () => unknown)() : answer
    return Promise.resolve(`\`\`\`json\n${JSON.stringify(reply)}\n\`\`\``)
  }
  return { run, prompts }
}

/** Which pass `prompt` is from. */
function kindOf(prompt: string): "names" | "fix-ups" {
  return prompt.startsWith("Translate the names") ? "names" : "fix-ups"
}

/** The translation's lines, as on disk. */
function written(): string[] {
  return readFileSync(join(folder, "Cartas", "Carta.es.spell"), "utf8").split("\n")
}
