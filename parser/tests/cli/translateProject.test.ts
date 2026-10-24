import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import JSON5 from "json5"
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { CLI } from "spell/cli"
import type { SRV } from "spell/server"
import { parseSpellProject } from "spell-parser/spell/test"
import { translateProject, translationOf, type TranslateSource } from "spell-parser/cli/translateProject"
import type { TranslateOptions } from "spell-parser/cli"
import type { ReviewRunOpener } from "spell-parser/cli/NamesReview"
import type {
  ClaudeRunner,
  GlossaryData,
  LineProblem,
  NamesData,
  NamesFile,
  SourceFile
} from "spell-parser/spell/translate/translate.types"

/**
 * `spell translate`'s three passes end to end (epic `spanish` P25):  names, lines, fix-ups --
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

/** `CARD` as a person translated it:  `translationOf()`'s reference. */
const CARD_ES = `una "carta" es una cosa donde:
	- su "color" es uno de rojo o negro
	- su "etiqueta" es "comodín " + su color

para probar etiquetas de cartas
	obtener una carta nueva cuyo color es rojo
	su etiqueta debería ser "comodín rojo"
`

/** What the fake `claude` answers the names pass. */
const NAMES: NamesData = {
  types: { card: { name: "carta", gender: "feminine" } },
  names: { color: "color", red: "rojo", black: "negro", label: "etiqueta" },
  phrases: { "card labels": "etiquetas de cartas" },
  texts: { " joker": " comodín", "red joker": "comodín rojo" },
  genders: { color: "masculine", etiqueta: "feminine" }
}

/** The other choices the fake `claude` gives, with `--review`:  the type's, and the label's. */
const ALTERNATIVES = {
  types: { card: [{ name: "naipe", gender: "masculine" }] },
  names: { label: ["rótulo", "leyenda"] }
}

/** A glossary that knows the card's words, as another project chose them. */
const GLOSSARY: GlossaryData = {
  names: {
    card: { name: "carta", gender: "feminine", from: "reviewed" },
    color: { name: "color", gender: "masculine", from: "reviewed" },
    red: { name: "rojo", from: "reviewed" },
    black: { name: "negro", from: "reviewed" },
    label: { name: "etiqueta", gender: "feminine", from: "reviewed" }
  }
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
  test("cold:  the types, the names, then one fix-up round for the line in the wrong order;  checked clean", async () => {
    const claude = fakeClaude()
    const exitCode = await translate(source(), { to: "es", out: join(folder, "Cartas") }, claude.run)
    expect(exitCode).toBe(CLI.EXIT.OK)
    expect(claude.prompts.map(kindOf)).toEqual(["types", "names", "fix-ups"])
    // the fix-up was shown the line, its English, and why
    expect(claude.prompts[2]).toContain('its color + " joker"')
    expect(claude.prompts[2]).toContain("may read in the wrong order")
    expect(written()[2]).toBe(`\t${FIXED}`)
    expect(written()[6]).toBe('\tsu etiqueta debería ser "comodín rojo"')
    // the record keeps the fix, for --update:  in --out, with the translation (J186)
    const record = JSON.parse(readFileSync(join(folder, "Cartas", "Cards.es.translated.json5"), "utf8"))
    expect(record.fixes).toEqual([
      {
        path: "/Card.spell",
        source: expect.any(String),
        mechanical: '\t- su "etiqueta" es su color + " comodín"',
        fixed: `\t${FIXED}`
      }
    ])
  })

  test("--model:  every call asks that model, whatever model a pass names;  the report says how it asked (P27)", async () => {
    const models: Array<string | undefined> = []
    const claude = fakeClaude()
    const run: ClaudeRunner = (prompt, options) => {
      models.push(options?.model)
      return claude.run(prompt, options)
    }
    await translate(source(), { to: "es", out: join(folder, "Cartas"), model: "claude-sonnet-5-5" }, run)
    expect(models).toEqual(["claude-sonnet-5-5", "claude-sonnet-5-5", "claude-sonnet-5-5"])
    expect(printed().find((line) => line.startsWith("  claude:"))).toMatch(/^  claude:  3 calls:  types 1/)
  })

  test("--effort for every pass, --names-effort and --fix-ups-effort for one:  the runner gets the pass and its tier", async () => {
    const asked: string[] = []
    const claude = fakeClaude()
    const run: ClaudeRunner = (prompt, options) => {
      asked.push(`${kindOf(prompt)} ${options?.pass}:${options?.tier} ${options?.model}:${options?.effort}`)
      return claude.run(prompt, options)
    }
    const out = join(folder, "Cartas")
    await translate(source(), { to: "es", out, effort: "fast", fixUpsEffort: "best" }, run)
    // the tier replaces the model and effort the names pass names:  the runner picks them
    expect(asked).toEqual([
      "types names:fast undefined:undefined",
      "names names:fast undefined:undefined",
      "fix-ups fixUps:best undefined:undefined"
    ])
    asked.length = 0
    // cold again:  another --out has no dictionary from the run before (J186);  no flags:  balanced
    await translate(source(), { to: "es", out: join(folder, "Cartas2"), model: "sonnet:medium" }, run)
    expect(asked).toEqual([
      "types names:balanced sonnet:medium",
      "names names:balanced sonnet:medium",
      "fix-ups fixUps:balanced sonnet:medium"
    ])
    await expect(translate(source(), { to: "es", out, effort: "low" }, run)).rejects.toThrow(/No effort 'low'/)
  })

  test("a line a check says is wrong goes back too, round after round, until it passes or 3 rounds are up", async () => {
    // a claude that never fixes it:  three rounds asked, then left for a person
    const claude = fakeClaude({ fixes: [] as unknown[] })
    const exitCode = await translate(source(), { to: "es", out: join(folder, "Cartas") }, claude.run)
    expect(exitCode).toBe(CLI.EXIT.ERRORS)
    expect(claude.prompts.map(kindOf)).toEqual(["types", "names", "fix-ups"])
    let tries = 0
    const stubborn = fakeClaude(() => ({
      fixes: [{ file: "Carta.es.spell", line: 7, text: `su etiqueta debería ser "otra ${++tries}"` }]
    }))
    // the same --out:  its dictionary has every name now
    await translate(source(), { to: "es", out: join(folder, "Cartas") }, stubborn.run)
    expect(stubborn.prompts.map(kindOf)).toEqual(["fix-ups", "fix-ups", "fix-ups"])
  })

  test("--update:  a fix made before is used again, never asked for;  a person's edit to an unchanged line stays", async () => {
    const out = join(folder, "Cartas")
    await translate(source(), { to: "es", out }, fakeClaude().run)
    // a person edits the test's first line;  the English test's last line changes
    const lines = written()
    lines[5] = "\tobtener una carta nueva cuyo color es rojo"
    writeFileSync(join(out, "Carta.es.spell"), lines.join("\n"))
    const changed = CARD.replace('"red joker"', '"red joker" ')
    writeFileSync(join(folder, "Cards", "Card.spell"), changed)
    const claude = fakeClaude()
    await translate(source(changed), { to: "es", out, update: true }, claude.run)
    // every name is in the dictionary, and the fix in the record:  nothing to ask
    expect(claude.prompts).toEqual([])
    expect(written()[2]).toBe(`\t${FIXED}`)
    expect(written()[5]).toBe("\tobtener una carta nueva cuyo color es rojo")
  })

  test("--update with its file gone:  every line written again, the fix from the record, not from claude", async () => {
    const out = join(folder, "Cartas")
    await translate(source(), { to: "es", out }, fakeClaude().run)
    rmSync(join(out, "Carta.es.spell"))
    const claude = fakeClaude()
    await translate(source(), { to: "es", out, update: true }, claude.run)
    expect(claude.prompts).toEqual([])
    expect(written()[2]).toBe(`\t${FIXED}`)
  })

  test("the shape check:  a line that reads but compiles to a different program goes back, named, saying why", async () => {
    // claude's first fix-up also adds a color nobody asked for:  lint and the test can't tell
    let round = 0
    const claude = fakeClaude(() =>
      ++round === 1
        ? {
            fixes: [
              { file: "Carta.es.spell", line: 3, text: FIXED },
              { file: "Carta.es.spell", line: 2, text: '- su "color" es uno de rojo, negro o azul' }
            ]
          }
        : { fixes: [{ file: "Carta.es.spell", line: 2, text: '- su "color" es uno de rojo o negro' }] }
    )
    const exitCode = await translate(source(), { to: "es", out: join(folder, "Cartas") }, claude.run, true)
    expect(claude.prompts.map(kindOf)).toEqual(["types", "names", "fix-ups", "fix-ups"])
    expect(claude.prompts[3]).toContain(
      "Carta.es.spell, line 2:  shape:  means something else (compiles to a different program):  the English compiles to `"
    )
    expect(written()[1]).toBe('\t- su "color" es uno de rojo o negro')
    expect(exitCode).toBe(CLI.EXIT.OK)
    expect(printed()).toContain("  shape:  6 of 6 statements compile to the same program as the English")
  })

  test("the glossary first:  a name another project chose costs no call;  a choice that differs is said", async () => {
    writeFileSync(join(folder, "glossary.json5"), JSON.stringify(GLOSSARY))
    const claude = fakeClaude()
    await translate(source(), { to: "es", out: join(folder, "Cartas") }, claude.run)
    // every type is in the glossary:  no types call
    expect(claude.prompts.map(kindOf)).toEqual(["names", "fix-ups"])
    expect(claude.prompts[0]).not.toContain('"color": ""')
    expect(printed().find((line) => line.startsWith("  names:"))).toContain("5 from the glossary")
    // a person picks another word for `label`:  the next run says so
    const namesFile = join(folder, "Cartas", "Cards.es.names.json5")
    writeFileSync(namesFile, readFileSync(namesFile, "utf8").replace('"label": "etiqueta"', '"label": "rótulo"'))
    await translate(source(), { to: "es", out: join(folder, "Cartas") }, fakeClaude().run)
    expect(printed()).toContain("    `label` is `rótulo` here, `etiqueta` in the glossary (reviewed)")
  })

  test("--learn:  the project's names into the glossary, nothing translated", async () => {
    const out = join(folder, "Cartas")
    await translate(source(), { to: "es", out }, fakeClaude().run)
    const claude = fakeClaude()
    // its dictionary is in --out (J186):  --learn finds it there
    expect(await translate(source(), { to: "es", out, learn: true }, claude.run)).toBe(CLI.EXIT.OK)
    expect(claude.prompts).toEqual([])
    const glossary = JSON5.parse(readFileSync(join(folder, "glossary.json5"), "utf8")) as GlossaryData
    expect(glossary.names?.card).toEqual({ name: "carta", gender: "feminine", from: "learned:Cards" })
    expect(glossary.names?.label).toEqual({ name: "etiqueta", gender: "feminine", from: "learned:Cards" })
    // a project with no dictionary has nothing to learn
    rmSync(join(out, "Cards.es.names.json5"))
    await expect(translate(source(), { to: "es", out, learn: true }, claude.run)).rejects.toThrow(/translate it first/)
  })

  test("the report says what it started from:  the glossary, the project's dictionary", async () => {
    writeFileSync(join(folder, "glossary.json5"), JSON.stringify(GLOSSARY))
    await translate(source(), { to: "es", out: join(folder, "Cartas") }, fakeClaude().run)
    expect(printed()).toContain("  pre-calculated:  the Spanish glossary (5 names)")
    await translate(source(), { to: "es", out: join(folder, "Cartas") }, fakeClaude().run)
    expect(
      printed()
        .filter((line) => line.startsWith("  pre-calculated:"))
        .at(-1)
    ).toMatch(/^  pre-calculated:  the Spanish glossary \(5 names\), the project's dictionary \(\d+ names\)$/)
  })

  test("its style sheet comes along, its selectors translated as far as it knows the names", async () => {
    await translate(source(), { to: "es", out: join(folder, "Cartas") }, fakeClaude().run)
    expect(readFileSync(join(folder, "Cartas", "styles.css"), "utf8")).toBe("ui-text[color] { margin: 0 }\n")
  })
})

describe("--cold:  nothing pre-calculated, for timing (P29)", () => {
  test("no glossary:  claude is asked for every name the glossary has", async () => {
    writeFileSync(join(folder, "glossary.json5"), JSON.stringify(GLOSSARY))
    const claude = fakeClaude()
    await translate(source(), { to: "es", out: join(folder, "Cartas"), cold: true }, claude.run)
    // warm, the glossary's five names cost no call, nor did the types (see above);  cold, all asked for
    expect(claude.prompts.map(kindOf)).toEqual(["types", "names", "fix-ups"])
    expect(claude.prompts[1]).toContain('"color"')
    expect(printed()).toContain("  pre-calculated:  none (--cold)")
    expect(printed().find((line) => line.startsWith("  names:"))).not.toContain("from the glossary")
  })

  test("no dictionary of the project's:  every name asked for again", async () => {
    await translate(source(), { to: "es", out: join(folder, "Cartas") }, fakeClaude().run)
    // the dictionary has every name now:  warm, the next run asks for none
    const warm = fakeClaude()
    await translate(source(), { to: "es", out: join(folder, "Cartas") }, warm.run)
    expect(warm.prompts.map(kindOf)).toEqual(["fix-ups"])
    const cold = fakeClaude()
    await translate(source(), { to: "es", out: join(folder, "Cold"), cold: true }, cold.run)
    expect(cold.prompts.map(kindOf)).toEqual(["types", "names", "fix-ups"])
  })

  test("no record:  a fix made before is asked for again;  --update, --seed and --learn are refused", async () => {
    const out = join(folder, "Cartas")
    await translate(source(), { to: "es", out }, fakeClaude().run)
    const claude = fakeClaude()
    await translate(source(), { to: "es", out: join(folder, "Cold"), cold: true }, claude.run)
    expect(claude.prompts.map(kindOf)).toContain("fix-ups")
    for (const flag of ["update", "seed", "learn"] as const) {
      const options = { to: "es", out, cold: true, [flag]: flag === "seed" ? "Cartas" : true }
      await expect(translate(source(), options, claude.run)).rejects.toThrow(`drop --${flag}`)
    }
    await expect(translate(source(), { to: "es", cold: true }, claude.run)).rejects.toThrow(/pass --out/)
  })

  test("no seed:  a person's translation handed over anyway fills nothing", async () => {
    const seeded = { ...source(), seed: personsCard() }
    // warm, the seed has every type:  no types call
    const warm = fakeClaude()
    await translate(seeded, { to: "es", out: join(folder, "Cartas") }, warm.run)
    expect(warm.prompts.map(kindOf)).not.toContain("types")
    rmSync(join(folder, "Cartas", "Cards.es.names.json5"))
    const cold = fakeClaude()
    await translate(seeded, { to: "es", out: join(folder, "Cold"), cold: true }, cold.run)
    expect(cold.prompts.map(kindOf)).toEqual(["types", "names", "fix-ups"])
  })

  test("writes only into --out:  never the glossary, never beside the project", async () => {
    writeFileSync(join(folder, "glossary.json5"), JSON.stringify(GLOSSARY))
    const glossary = readFileSync(join(folder, "glossary.json5"), "utf8")
    const out = join(folder, "Cold")
    await translate(source(), { to: "es", out, cold: true }, fakeClaude().run)
    expect(readdirSync(join(folder, "Cards")).sort()).toEqual(["Card.spell", "__project.json5", "styles.css"])
    expect(readdirSync(out)).toEqual(expect.arrayContaining(["Cards.es.names.json5", "Cards.es.translated.json5"]))
    expect(readFileSync(join(folder, "glossary.json5"), "utf8")).toBe(glossary)
  })

  test("translationOf():  what it did, in numbers;  and how many drafted names a person's translation agrees with", async () => {
    // the person's translation calls a label a "rótulo"
    const reference = personsCard(CARD_ES.replaceAll("etiqueta", "rótulo"))
    const result = await translationOf(
      { ...source(), reference },
      { to: "es", out: join(folder, "Cold"), cold: true },
      fakeClaude().run,
      { glossaryFile: join(folder, "glossary.json5"), print: false }
    )
    expect(printed()).toEqual([])
    expect(result).toMatchObject({
      exitCode: CLI.EXIT.OK,
      projectName: "Cards",
      to: "es",
      lists: { cold: true, glossary: 0, dictionary: 0, fixes: 0, seeded: false },
      calls: { names: 2, fixUps: 1 },
      lines: { total: 8, written: 8, fixed: 1 },
      names: { seeded: 0, fromGlossary: 0 },
      todo: 0,
      problems: { lint: 0, test: 0, shape: 0 }
    })
    expect(Object.keys(result.timings).sort()).toEqual(["fixUps", "lines", "names", "total"])
    // the six names claude drafted are all the person's too:  all but the label and the test's phrase the same
    expect(result.agreement).toEqual({ same: 4, compared: 6 })
  })
})

describe("--out keeps what it writes (J186)", () => {
  test("its dictionary and record go into --out;  a dictionary beside the project is read, never written", async () => {
    // a person's dictionary, beside the project:  every name in it
    const beside = join(folder, "Cards", "Cards.es.names.json5")
    writeFileSync(beside, JSON.stringify(NAMES))
    const out = join(folder, "Cartas")
    const claude = fakeClaude()
    await translate(source(), { to: "es", out }, claude.run)
    expect(claude.prompts.map(kindOf)).toEqual(["fix-ups"])
    expect(readdirSync(join(folder, "Cards")).sort()).toEqual([
      "Card.spell",
      "Cards.es.names.json5",
      "__project.json5",
      "styles.css"
    ])
    expect(readFileSync(beside, "utf8")).toBe(JSON.stringify(NAMES))
    expect(readdirSync(out)).toEqual(expect.arrayContaining(["Cards.es.names.json5", "Cards.es.translated.json5"]))
    // --update with the same --out finds its record there:  nothing asked again
    const again = fakeClaude()
    await translate(source(), { to: "es", out, update: true }, again.run)
    expect(again.prompts).toEqual([])
  })
})

describe("--review:  a person reviews the names drafted, between the names and the lines (P31, P32)", () => {
  test("accepted, typed, picked and ticked:  the dictionary, the glossary and the lines use them", async () => {
    const review = fakeRun([
      answer("types:card", "accepted", "carta", true),
      answer("names:label", "picked", "rótulo"),
      answer("texts:red joker", "typed", "comodín colorado")
    ])
    const claude = fakeClaude()
    await translate(source(), { to: "es", out: join(folder, "Cartas"), review: true }, claude.run, false, review.open)
    // the names pass asked for alternatives, in the same calls
    expect(claude.prompts.map(kindOf)).toEqual(["types", "names", "fix-ups"])
    expect(claude.prompts[1]).toContain("`alternatives`")
    // one run, a row per name drafted, before any line was written
    expect(review.opened).toHaveLength(1)
    expect(review.opened[0]).toMatchObject({
      title: "Names for Cards, in Spanish",
      answerLabel: "Spanish",
      effort: { choices: ["fast", "balanced", "best"], initial: "balanced" }
    })
    const label = review.rows.find((row) => row.id === "names:label")!
    expect(label).toMatchObject({
      value: "etiqueta",
      alternatives: ["rótulo", "leyenda"],
      tick: { label: "for every project" },
      cells: { english: "label", kind: "name", from: "Claude", gender: "feminine" }
    })
    expect(label.cells.lines).toBe('Card.spell:3  - its "label" is its color + " joker"')
    expect(review.rows.find((row) => row.id === "texts:red joker")!.tick).toBeUndefined()
    // each answer taken as it came
    expect(review.taken).toEqual(["types:card", "names:label", "texts:red joker"])
    expect(review.finished).toEqual(["done"])
    // the dictionary:  the answers, marked reviewed;  the rest as drafted
    const names = JSON5.parse(readFileSync(join(folder, "Cartas", "Cards.es.names.json5"), "utf8")) as NamesFile
    expect(names.names?.label).toBe("rótulo")
    expect(names.names?.color).toBe("color")
    expect(names.texts?.["red joker"]).toBe("comodín colorado")
    expect(names.reviewed).toEqual({ names: ["label"], texts: ["red joker"], types: ["card"] })
    // the glossary:  the ticked one, as reviewed
    const glossary = JSON5.parse(readFileSync(join(folder, "glossary.json5"), "utf8")) as GlossaryData
    expect(glossary.names).toEqual({ card: { name: "carta", gender: "feminine", from: "reviewed" } })
    // the lines:  written with the answers
    expect(written()[6]).toBe('\tsu rótulo debería ser "comodín colorado"')
    expect(printed()).toContain(
      "  review:  /runs/test/:  1 accepted, 1 typed, 1 picked, 1 for every project, 5 left as drafted"
    )
  })

  test("an answer spell can't read:  its row says why at once, before Send;  the person's next one goes in", async () => {
    const review = fakeRun([
      answer("names:label", "typed", "carta"),
      // the page shows the row saying why, while the command still listens:  he types another
      (rows) => {
        expect(rows.find((row) => row.id === "names:label")).toMatchObject({
          value: "etiqueta",
          cells: { from: "not readable:  `carta`:  that's `card` already -- one word, one thing" }
        })
        return answer("names:label", "typed", "rótulo")
      }
    ])
    await translate(
      source(),
      { to: "es", out: join(folder, "Cartas"), review: true },
      fakeClaude().run,
      false,
      review.open
    )
    // one row id throughout;  taken only once readable;  shown as asked again
    expect(review.taken).toEqual(["names:label"])
    expect(review.rows.find((row) => row.id === "names:label")!.cells.from).toBe("Claude")
    expect(review.progress).toContain("can't read `carta`:  that's `card` already -- one word, one thing:  try another")
    const names = JSON5.parse(readFileSync(join(folder, "Cartas", "Cards.es.names.json5"), "utf8")) as NamesFile
    expect(names.names?.label).toBe("rótulo")
    expect(names.reviewed).toEqual({ names: ["label"] })
  })

  test("an answer still unreadable at Send:  kept as drafted, and noted", async () => {
    const review = fakeRun([answer("names:label", "typed", "carta")])
    await translate(
      source(),
      { to: "es", out: join(folder, "Cartas"), review: true },
      fakeClaude().run,
      false,
      review.open
    )
    expect(review.taken).toEqual([])
    const names = JSON5.parse(readFileSync(join(folder, "Cartas", "Cards.es.names.json5"), "utf8")) as NamesFile
    expect(names.names?.label).toBe("etiqueta")
    expect(printed()).toContain(
      "  review:  /runs/test/:  0 accepted, 0 typed, 0 picked, 7 left as drafted, 1 still unreadable, kept as drafted"
    )
  })

  test("an answer changed after it was taken:  the new one, checked again;  cleared, the proposal again", async () => {
    const review = fakeRun([
      answer("names:label", "typed", "rótulo"),
      answer("names:color", "typed", "tono"),
      answer("names:label", "picked", "leyenda"),
      answer("names:color", "typed", "")
    ])
    await translate(
      source(),
      { to: "es", out: join(folder, "Cartas"), review: true },
      fakeClaude().run,
      false,
      review.open
    )
    expect(review.taken).toEqual(["names:label", "names:color", "names:label"])
    const names = JSON5.parse(readFileSync(join(folder, "Cartas", "Cards.es.names.json5"), "utf8")) as NamesFile
    expect(names.names?.label).toBe("leyenda")
    expect(names.names?.color).toBe("color")
    expect(names.reviewed).toEqual({ names: ["label"] })
  })

  test("no Send in time (J187):  the answers given by then count, the rest stay as drafted;  the run ends timed-out", async () => {
    const review = fakeRun([answer("names:label", "typed", "rótulo")], { end: "timed-out" })
    await translate(
      source(),
      { to: "es", out: join(folder, "Cartas"), review: true },
      fakeClaude().run,
      false,
      review.open
    )
    const names = JSON5.parse(readFileSync(join(folder, "Cartas", "Cards.es.names.json5"), "utf8")) as NamesFile
    expect(names.names?.label).toBe("rótulo")
    expect(names.names?.color).toBe("color")
    expect(names.reviewed).toEqual({ names: ["label"] })
    expect(written()[6]).toMatch(/^\tsu rótulo /)
    expect(review.finished).toEqual(["timed-out"])
    expect(printed()).toContain(
      "  review:  /runs/test/:  no Send in time:  0 accepted, 1 typed, 0 picked, 7 left as drafted"
    )
  })

  test("the passes on the page, in order;  the effort picked there takes at the next pass", async () => {
    const asked: string[] = []
    const claude = fakeClaude()
    const run: ClaudeRunner = (prompt, options) => {
      asked.push(`${kindOf(prompt)} ${options?.tier}`)
      return claude.run(prompt, options)
    }
    // he switches to best while answering:  the names pass ran already, the fix-ups take it
    const review = fakeRun([{ effort: "best" }, answer("names:label", "typed", "rótulo")])
    await translate(
      source(),
      { to: "es", out: join(folder, "Cartas"), review: true, effort: "fast" },
      run,
      false,
      review.open
    )
    expect(review.opened[0]!.effort).toMatchObject({ initial: "fast" })
    expect(asked).toEqual(["types fast", "names fast", "fix-ups best"])
    expect(review.passes).toEqual([
      "start names at fast, total 8",
      "update names, done 1, calls 1",
      "update names, done 8, calls 2",
      "end names, calls 2",
      "start lines at best, total 8",
      "end lines, done 8",
      "start fix-ups at best",
      "update fix-ups, done 0, total 2, calls 0",
      "update fix-ups, done 1, total 2, calls 1",
      "update fix-ups, done 1, total 2, calls 1",
      "end fix-ups",
      "finish done"
    ])
  })

  test("a pass's own flag wins over the page's effort, and the page says so", async () => {
    const asked: string[] = []
    const claude = fakeClaude()
    const run: ClaudeRunner = (prompt, options) => {
      asked.push(`${kindOf(prompt)} ${options?.tier}`)
      return claude.run(prompt, options)
    }
    const review = fakeRun([{ effort: "fast" }])
    const options = { to: "es", out: join(folder, "Cartas"), review: true, namesEffort: "best", fixUpsEffort: "best" }
    await translate(source(), options, run, false, review.open)
    expect(review.opened[0]!.effort).toMatchObject({ initial: "balanced" })
    expect(asked).toEqual(["types best", "names best", "fix-ups best"])
    expect(review.passes).toContain("start names at best, total 8")
    expect(review.passes).toContain("start fix-ups at best")
    expect(review.progress).toContain("names:  at best, by --names-effort, not the page's balanced")
    expect(review.progress).toContain("fix-ups:  at best, by --fix-ups-effort, not the page's fast")
  })

  test("a run that fails ends stopped, and the error goes on", async () => {
    const review = fakeRun([])
    const failing = { ...source(), checker: () => () => Promise.reject(new Error("the checker broke")) }
    const options = { to: "es", out: join(folder, "Cartas"), review: true }
    await expect(translate(failing, options, fakeClaude().run, false, review.open)).rejects.toThrow("the checker broke")
    expect(review.finished).toEqual(["stopped"])
  })

  test("--no-ai:  the names still missing, to type;  a type's gender after it", async () => {
    const review = fakeRun([answer("types:card", "typed", "naipe (m)")])
    const claude = fakeClaude()
    const options = { to: "es", out: join(folder, "Cartas"), review: true, ai: false }
    // no checker:  the fake one reads the file as `Carta`
    await translate({ ...source(), checker: undefined }, options, claude.run, false, review.open)
    expect(claude.prompts).toEqual([])
    const card = review.rows.find((row) => row.id === "types:card")!
    expect(card).toMatchObject({ value: "", cells: { from: "missing (--no-ai)" } })
    expect(card.alternatives).toBeUndefined()
    const names = JSON5.parse(readFileSync(join(folder, "Cartas", "Cards.es.names.json5"), "utf8")) as NamesFile
    expect(names.types?.card).toEqual({ name: "naipe", gender: "masculine" })
    expect(readFileSync(join(folder, "Cartas", "Naipe.es.spell"), "utf8")).toMatch(/^un "naipe" es una cosa donde:/)
  })

  test("without --review no run opens, and nothing asks for alternatives;  --cold refuses it", async () => {
    const review = fakeRun([])
    const claude = fakeClaude()
    await translate(source(), { to: "es", out: join(folder, "Cartas") }, claude.run, false, review.open)
    expect(review.opened).toEqual([])
    expect(claude.prompts[1]).not.toContain("`alternatives`")
    const cold = { to: "es", out: join(folder, "Cold"), cold: true, review: true }
    await expect(translate(source(), cold, claude.run, false, review.open)).rejects.toThrow("drop --review")
  })
})

////////////////
// ## Helpers
////////////////

/**
 * `translateProject()`, with the glossary in the temp folder:  none, unless a test writes one.
 * - `shapes`:  its checker hands back the translation's files, parsed, for the shape check.
 */
function translate(
  source: TranslateSource,
  options: TranslateOptions,
  run: ClaudeRunner,
  shapes = false,
  openRun?: ReviewRunOpener
) {
  if (shapes) source.checker = (out) => () => Promise.resolve({ problems: check(out), files: parsedIn(out) })
  return translateProject(source, options, run, { glossaryFile: join(folder, "glossary.json5"), openRun })
}

/** One step of a fake run:  a row's answer, given;  or the effort picked on the page. */
type RunStep = SRV.RunRowAnswer | { effort: string }

/** `rowId`'s answer, given now. */
function answer(rowId: string, outcome: SRV.RunOutcome, value: string, ticked?: boolean): SRV.RunRowAnswer {
  return { rowId, answer: { outcome, value, ...(ticked ? { ticked } : {}), at: new Date().toISOString() } }
}

/**
 * A fake steered run (`--review`), for `translate()`'s `openRun`:  its answers come one at a time
 * (`answersAsTheyCome()`), each of `steps` in turn -- a step, or a function of the rows the page shows NOW giving one,
 * so a test can answer what it sees;  then they end as `end` says (Send, by default).
 * - Its effort:  the one it was opened with, until a step picks another.
 * - It keeps what it was opened with, its rows as shown now, rows taken, progress lines, passes and how it finished.
 */
function fakeRun(
  steps: Array<RunStep | ((rows: SRV.RunRow[]) => RunStep)>,
  { end = "sent" }: { end?: SRV.RunAnswersEnd } = {}
) {
  const opened: SRV.RunOpenProps[] = []
  const taken: string[] = []
  const progress: string[] = []
  const passes: string[] = []
  const finished: string[] = []
  const shown = { rows: [] as SRV.RunRow[] }
  let picked: string | undefined
  let pass = ""
  const facts = (said: SRV.RunPassStart = {}) =>
    (["done", "total", "calls"] as const)
      .flatMap((key) => (said[key] === undefined ? [] : [`, ${key} ${said[key]}`]))
      .join("")
  const open: ReviewRunOpener = (props) => {
    opened.push(props)
    return {
      show: () => Promise.resolve("/runs/test/"),
      progress: (text) => progress.push(text),
      setRows: (rows) => (shown.rows = rows),
      async *answersAsTheyCome() {
        for (const each of steps) {
          await Promise.resolve()
          const step = typeof each === "function" ? each(shown.rows) : each
          if ("effort" in step) picked = step.effort
          else yield step
        }
        return end
      },
      take: (...rowIds) => taken.push(...rowIds),
      get effort() {
        return picked ?? props.effort?.initial
      },
      startPass: (name, said = {}) => {
        pass = name
        passes.push(`start ${name} at ${said.effort ?? picked ?? props.effort?.initial}${facts(said)}`)
      },
      updatePass: (said) => passes.push(`update ${pass}${facts(said)}`),
      endPass: (said) => passes.push(`end ${pass}${facts(said)}`),
      finish: (status = "done") => {
        passes.push(`finish ${status}`)
        finished.push(status)
      }
    }
  }
  return {
    open,
    opened,
    taken,
    progress,
    passes,
    finished,
    get rows() {
      return shown.rows
    }
  }
}

/** The translation's file in `out`, parsed in a project of its own. */
function parsedIn(out: string): SourceFile[] {
  const contents = readFileSync(join(out, "Carta.es.spell"), "utf8")
  const { files } = parseSpellProject([{ path: "/Carta.es.spell", contents }])
  return [{ path: "/Carta.es.spell", contents, match: files[0]!.match }]
}

/** `CARD` as a person translated it (`CARD_ES`, or `contents`), parsed:  a seed, a reference. */
function personsCard(contents = CARD_ES): SourceFile[] {
  const { files } = parseSpellProject([{ path: "/Carta.es.spell", contents }])
  return [{ path: "/Carta.es.spell", contents, match: files[0]!.match }]
}

/** Everything the command printed, a line each. */
function printed(): string[] {
  return vi.mocked(CLI.out).mock.calls.map(([line]) => String(line))
}

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
      kindOf(prompt) !== "fix-ups"
        ? { ...NAMES, alternatives: ALTERNATIVES }
        : typeof answer === "function"
          ? (answer as () => unknown)()
          : answer
    return Promise.resolve(`\`\`\`json\n${JSON.stringify(reply)}\n\`\`\``)
  }
  return { run, prompts }
}

/** Which pass `prompt` is from:  the names pass's types (shown no program), its names, or a fix-up. */
function kindOf(prompt: string): "types" | "names" | "fix-ups" {
  if (!prompt.startsWith("Translate the names")) return "fix-ups"
  return prompt.includes("## The program") ? "names" : "types"
}

/** The translation's lines, as on disk. */
function written(): string[] {
  return readFileSync(join(folder, "Cartas", "Carta.es.spell"), "utf8").split("\n")
}
