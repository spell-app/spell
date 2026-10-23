import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell-lang/spell"
import { NamesPass } from "spell-lang/spell/translate/NamesPass"
import { TranslationNames } from "spell-lang/spell/translate/TranslationNames"
import type { ClaudeRunner, DeclarationStatement, MissingName } from "spell-lang/spell/translate/translate.types"

/**
 * The names pass (epic `spanish` P25):  every name a project declares, and what its lines lack, asked for in one go,
 * each answer checked readable by Spanish's parser, the unreadable ones asked for again, once.
 * - `claude` is a fake:  it answers from a table, and keeps each prompt it's given.
 */

const ENGLISH = SP.Language.for("en")!
const SPANISH = SP.Language.for("es")!

/** What a small card game declares:  a type, a property with its values, a method. */
const DECLARATIONS: DeclarationStatement[] = [
  { type: "Card" },
  { type: "StockPile" },
  { property: "rank", of: "Card", enumeration: ["ace", 2, "king"] },
  { property: "picture", of: "Card" },
  { name: "turn it over", kind: "method", of: "Card", output: "turn_over" },
  { name: '"is a (rank)"', kind: "method", of: "Card", output: "is_a_$rank" }
]

/** The game's one file, for the prompt. */
const FILES = [{ path: "/Card.spell", contents: '// a playing card\na "card" is a thing where:', match: undefined }]

/** A good answer to the first call:  every name, with genders. */
const ANSWER = {
  types: { card: { name: "carta", gender: "feminine" }, "stock pile": { name: "reserva", gender: "feminine" } },
  names: { rank: "rango", picture: "imagen", ace: "as", king: "rey" },
  phrases: { "turn it over": "voltear eso", "is a (rank)": "es un (rango)" },
  texts: { "ace of hearts": "as de corazones" },
  genders: { rango: "masculine", imagen: "feminine", as: "masculine", rey: "masculine" }
}

describe("NamesPass:  every name in one go, before any line", () => {
  test("asks for what the project declares and what the lines lack, less what the dictionary has", () => {
    const { pass } = namesPass({ names: { rank: "rango" } })
    const wanted = pass.wanted([
      { kind: "texts", words: "ace of hearts" },
      // a kind's values, `card rank`:  worked out from its type and property, never asked for
      { kind: "types", words: "card rank" }
    ])
    expect(wanted).toEqual([
      { kind: "types", words: "card" },
      { kind: "types", words: "stock pile" },
      { kind: "names", words: "ace" },
      { kind: "names", words: "king" },
      { kind: "names", words: "picture" },
      { kind: "phrases", words: "turn it over" },
      { kind: "phrases", words: "is a (rank)" },
      { kind: "texts", words: "ace of hearts" }
    ])
  })

  test("one call for the names, one per file for the comments:  the answers into the dictionary, genders too", async () => {
    const { pass, names, prompts } = namesPass({}, [
      fenced(ANSWER),
      fenced({ comments: { "a playing card": "una carta de la baraja" } })
    ])
    const wanted: MissingName[] = [...pass.wanted([]), { kind: "comments", words: "a playing card" }]
    expect(await pass.draft(wanted)).toBe(13)
    // what it wasn't asked for is left out:  a text no line lacked
    expect(names.data.texts["ace of hearts"]).toBeUndefined()
    expect(prompts).toHaveLength(2)
    expect(prompts[0]).toContain('"turn it over": ""')
    expect(prompts[1]).toContain('"a playing card": ""')
    expect(names.type("cards")).toEqual({ name: "cartas", gender: "feminine" })
    expect(names.data.comments["a playing card"]).toBe("una carta de la baraja")
    // J146:  a name that isn't a type, by the gender claude gave it -- not a guess by its ending
    expect(names.genderOf("imagen")).toBe("feminine")
  })

  test("an answer Spanish can't read is asked for again, once, saying why;  still unreadable, left out", async () => {
    const first = {
      ...ANSWER,
      types: { ...ANSWER.types, card: { name: "carta" } },
      names: { ...ANSWER.names, picture: "imagen de carta" },
      phrases: { "turn it over": "voltear de nuevo", "is a (rank)": "es un rango" }
    }
    const again = { types: { card: { name: "carta", gender: "feminine" } }, names: { picture: "imagen de la carta" } }
    const { pass, names, prompts } = namesPass({}, [fenced(first), fenced(again)])
    await pass.draft(pass.wanted([]))
    expect(prompts).toHaveLength(2)
    expect(prompts[1]).toContain('`card` => `{"name":"carta"}`:  no gender')
    expect(prompts[1]).toContain("holds `de`, one of spell's own words")
    expect(prompts[1]).toContain("keeps its `it`")
    expect(prompts[1]).toContain("keeps 1 `(slots)`, not 0")
    expect(names.data.types.card).toEqual({ name: "carta", gender: "feminine" })
    expect(names.data.names.picture).toBeUndefined()
    expect(pass.notes.some((note) => note.startsWith("left TODO:  `picture`"))).toBe(true)
  })

  test("a claude that fails, or answers what isn't JSON, adds nothing, and says so", async () => {
    const { pass, names } = namesPass({}, ["I'd rather not."])
    expect(await pass.draft(pass.wanted([]))).toBe(0)
    expect(names.data.types).toEqual({})
    expect(pass.notes[0]).toBe("claude's names aren't JSON:  left them TODO")
    const failing = namesPass({}, [], () => Promise.reject(new Error("not signed in")))
    expect(await failing.pass.draft(failing.pass.wanted([]))).toBe(0)
    expect(failing.pass.notes[0]).toBe("claude couldn't draft the names:  not signed in")
  })

  test("an imported project's names are its own:  never asked for, unless this project declares the same", () => {
    const { pass, names } = namesPass({})
    names.addImported(TranslationNames.asDeclared([{ type: "Counter" }, { name: "turn it over", kind: "method" }]))
    const wanted = pass.wanted([{ kind: "types", words: "counter" }])
    expect(wanted.map(({ words }) => words)).not.toContain("counter")
    expect(wanted.map(({ words }) => words)).toContain("turn it over")
  })
})

////////////////
// ## Helpers
////////////////

/** A names pass over `DECLARATIONS`, its dictionary `data`, its fake claude answering `answers` in turn. */
function namesPass(
  data: ConstructorParameters<typeof TranslationNames>[0],
  answers: string[] = [],
  run?: ClaudeRunner
) {
  const names = new TranslationNames(data, { from: ENGLISH, to: SPANISH })
  const prompts: string[] = []
  const fake: ClaudeRunner = (prompt) => {
    prompts.push(prompt)
    return Promise.resolve(answers.shift() ?? "")
  }
  const pass = new NamesPass({ names, run: run ?? fake, files: FILES, declarations: DECLARATIONS })
  return { pass, names, prompts }
}

/** `answer` as claude writes it:  JSON in a fence. */
function fenced(answer: unknown): string {
  return `Here they are:\n\`\`\`json\n${JSON.stringify(answer)}\n\`\`\``
}
