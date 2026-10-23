import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell-lang/spell"
import { NamesPass } from "spell-lang/spell/translate/NamesPass"
import { TranslationNames } from "spell-lang/spell/translate/TranslationNames"
import type {
  ClaudeOptions,
  ClaudeRunner,
  DeclarationStatement,
  MissingName
} from "spell-lang/spell/translate/translate.types"

/**
 * The names pass (epic `spanish` P25-P26):  every name a project declares, and what its lines lack -- the types first,
 * then the rest side by side, a group of files each -- each answer checked readable by Spanish's parser,
 * the unreadable ones asked for again, once.
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

/** The game's files, for the prompts:  each name in the first that holds it. */
const FILES = [
  {
    path: "/Card.spell",
    contents:
      '// a playing card\na "card" is a thing where:\n\t- its "rank" is one of ace, 2 or king\n\t- to turn it over:',
    match: undefined
  },
  {
    path: "/Pile.spell",
    contents: 'a "stock pile" is a list of cards\n\tits picture is "ace of hearts"',
    match: undefined
  }
]

/** A good answer to the first call:  every name, with genders. */
const ANSWER = {
  types: { card: { name: "carta", gender: "feminine" }, "stock pile": { name: "reserva", gender: "feminine" } },
  names: { rank: "rango", picture: "imagen", ace: "as", king: "rey" },
  phrases: { "turn it over": "voltear eso", "is a (rank)": "es un (rango)" },
  texts: { "ace of hearts": "as de corazones" },
  genders: { rango: "masculine", imagen: "feminine", as: "masculine", rey: "masculine" }
}

describe("NamesPass:  every name in one go, before any line", () => {
  test("each call's answer has a schema of exactly the names it asks for;  genders a list, made a table (P27)", async () => {
    const options: ClaudeOptions[] = []
    const answers = [
      { types: ANSWER.types, genders: [] },
      {
        names: ANSWER.names,
        phrases: ANSWER.phrases,
        genders: [
          { word: "imagen", gender: "feminine" },
          { word: "rango", gender: "masculine" }
        ]
      },
      { names: { picture: "imagen" }, genders: [] }
    ]
    const run: ClaudeRunner = (_prompt, given = {}) => {
      options.push(given)
      return Promise.resolve(JSON.stringify(answers.shift()))
    }
    const names = new TranslationNames({}, { from: ENGLISH, to: SPANISH })
    const pass = new NamesPass({ names, run, files: FILES, declarations: DECLARATIONS, glossary: "es:  `es`" })
    await pass.draft(pass.wanted([]))
    const gender = { type: "object", required: ["word", "gender"], additionalProperties: false }
    expect(options[0]!.schema).toMatchObject({
      required: ["types", "genders"],
      additionalProperties: false,
      properties: {
        types: {
          required: ["card", "stock pile"],
          additionalProperties: false,
          properties: { card: { required: ["name", "gender"], additionalProperties: false } }
        },
        genders: { type: "array", items: gender }
      }
    })
    expect(options[1]!.schema).toMatchObject({
      required: ["names", "phrases", "genders"],
      properties: { names: { required: expect.arrayContaining(["ace", "king"]) } }
    })
    expect(options.map(({ model, effort }) => `${model} ${effort}`)).toEqual(["opus low", "opus low", "opus low"])
    expect(options[1]!.context).toBe("## The Spanish glossary:  spell's own words\nes:  `es`")
    expect(names.genderOf("imagen")).toBe("feminine")
    expect(names.data.names.ace).toBe("as")
  })

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

  test("two stages:  the types alone, then the rest a group of files each, side by side;  genders too", async () => {
    const answer = { ...ANSWER, comments: { "a playing card": "una carta de la baraja" } }
    const { pass, names, prompts, stages } = namesPass({}, () => fenced(answer))
    const wanted: MissingName[] = [...pass.wanted([]), { kind: "comments", words: "a playing card" }]
    expect(await pass.draft(wanted)).toBe(13)
    // stage 1:  the types alone, shown no file:  just the program's words
    expect(prompts[0]).toContain('"card": {')
    expect(prompts[0]).not.toContain('"rank": ""')
    expect(prompts[0]).not.toContain("## The program")
    // stage 2:  a call per file, each shown its own file and the types stage 1 chose
    expect(prompts).toHaveLength(3)
    expect(prompts[1]).toContain('"turn it over": ""')
    expect(prompts[1]).toContain('"a playing card": ""')
    expect(prompts[1]).toContain("### /Card.spell")
    expect(prompts[1]).not.toContain("### /Pile.spell")
    expect(prompts[1]).toContain('"name": "carta"')
    expect(prompts[2]).toContain('"picture": ""')
    expect(prompts[2]).toContain("### /Pile.spell")
    expect(pass.calls.map(({ stage }) => stage)).toEqual(["types", "names", "names"])
    // the two second-stage calls ran at once:  both started before either ended
    expect(Math.max(...stages.slice(1).map(({ started }) => started))).toBeLessThan(
      Math.min(...stages.slice(1).map(({ ended }) => ended))
    )
    // what it wasn't asked for is left out:  a text no line lacked
    expect(names.data.texts["ace of hearts"]).toBeUndefined()
    expect(names.type("cards")).toEqual({ name: "cartas", gender: "feminine" })
    // J146:  a name that isn't a type, by the gender claude gave it -- not a guess by its ending
    expect(names.genderOf("imagen")).toBe("feminine")
  })

  test("two calls side by side that choose one word for two names:  the later one is asked for again", async () => {
    const clash = { ...ANSWER, names: { ...ANSWER.names, picture: "rango" } }
    const again = { names: { picture: "imagen" } }
    const { pass, names, prompts } = namesPass({}, (prompt) =>
      fenced(prompt.includes("Your answers spell can't read") ? again : clash)
    )
    await pass.draft(pass.wanted([]))
    expect(pass.calls.map(({ stage }) => stage)).toEqual(["types", "names", "names", "again"])
    expect(prompts[3]).toContain("`picture` => `rango`:  that's `rank` already -- one word, one thing")
    expect(names.data.names.rank).toBe("rango")
    expect(names.data.names.picture).toBe("imagen")
  })

  test("`groups()`:  evened out by how much each writes, at most 6 calls;  a few names, one call", () => {
    const { pass } = namesPass({})
    const many = (count: number, words: string): MissingName[] =>
      Array.from({ length: count }, (_, at) => ({ kind: "texts", words: `${words} ${String(at).padStart(3, "0")}` }))
    // names no file holds go with the first group, split while it writes over 400 characters:  60 of 14
    const groups = pass.groups(many(60, "nowhere at"))
    expect(groups.map(({ names }) => names.length)).toEqual([15, 15, 15, 15])
    expect(groups.every(({ files }) => files[0]!.path === "/Card.spell")).toBe(true)
    // more:  6 calls at most
    expect(pass.groups(many(200, "nowhere at"))).toHaveLength(6)
    // a few names:  one call
    expect(pass.groups(many(3, "nowhere"))).toHaveLength(1)
  })

  test("an answer Spanish can't read is asked for again, once, saying why;  still unreadable, left out", async () => {
    const first = {
      ...ANSWER,
      types: { ...ANSWER.types, card: { name: "carta" } },
      names: { ...ANSWER.names, picture: "imagen de carta" },
      phrases: { "turn it over": "voltear de nuevo", "is a (rank)": "es un rango" }
    }
    const again = { types: { card: { name: "carta", gender: "feminine" } }, names: { picture: "imagen de la carta" } }
    // the types, then a call per file, then the one call asking again for all of them
    const { pass, names, prompts } = namesPass({}, [fenced(first), fenced(first), fenced(first), fenced(again)])
    await pass.draft(pass.wanted([]))
    expect(prompts).toHaveLength(4)
    expect(pass.calls.map(({ stage }) => stage)).toEqual(["types", "names", "names", "again"])
    expect(prompts[3]).toContain('`card` => `{"name":"carta"}`:  no gender')
    expect(prompts[3]).toContain("holds `de`, one of spell's own words")
    expect(prompts[3]).toContain("keeps its `it`")
    expect(prompts[3]).toContain("keeps 1 `(slots)`, not 0")
    expect(names.data.types.card).toEqual({ name: "carta", gender: "feminine" })
    expect(names.data.names.picture).toBeUndefined()
    expect(pass.notes.some((note) => note.startsWith("left TODO:  `picture`"))).toBe(true)
  })

  test("a type's name must read as one type, singular (epic `spanish` P28)", () => {
    const { pass } = namesPass({})
    const type = (name: string) =>
      pass.problemWith({ kind: "types", words: "todos app" }, { name, gender: "masculine" })
    expect(type("tareas")).toBe("reads as a plural (of `tarea`):  a type's name is singular, e.g. `agenda`")
    // its form kept:  `todos app` is words, so its name is too
    expect(type("gestorTareas")).toBe("keeps its form:  words, as `todos app` is, not camelCase")
    expect(type("gestor-de-tareas")).toBeUndefined()
    // its first word says how many:  a manager of tasks is one
    expect(type("gestor-tareas")).toBeUndefined()
    expect(type("agenda")).toBeUndefined()
    expect(type("pila de reserva")).toBe("holds `de`, one of spell's own words")
  })

  test("a name keeps its form:  camelCase stays one word, words stay words (epic `spanish` P28)", () => {
    const { pass } = namesPass({})
    const name = (words: string, value: string) => pass.problemWith({ kind: "names", words }, value)
    expect(name("newTaskName", "nombreNuevaTarea")).toBeUndefined()
    expect(name("newTaskName", "nombre")).toBeUndefined()
    expect(name("newTaskName", "nombre-nueva-tarea")).toBe(
      "keeps its form:  one word in camelCase, as `newTaskName` is"
    )
    expect(name("shown tasks", "tareasVisibles")).toBe("keeps its form:  words, as `shown tasks` is, not camelCase")
  })

  test("a type written with a dash and declared with a space is one name, asked for once", () => {
    const { pass } = namesPass({})
    const wanted = pass.wanted([
      { kind: "types", words: "todos-app" },
      { kind: "types", words: "todos app" }
    ])
    expect(wanted.filter(({ words }) => /todos/.test(words)).map(({ words }) => words)).toEqual(["todos-app"])
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

/**
 * A names pass over `DECLARATIONS`, its dictionary `data`, its fake claude answering `answers` in turn
 * (or each prompt by `answers()`), a moment later.
 * - `stages`:  when each call started and ended, in the order asked.
 */
function namesPass(
  data: ConstructorParameters<typeof TranslationNames>[0],
  answers: string[] | ((prompt: string) => string) = [],
  run?: ClaudeRunner
) {
  const names = new TranslationNames(data, { from: ENGLISH, to: SPANISH })
  const prompts: string[] = []
  const stages: Array<{ started: number; ended: number }> = []
  const fake: ClaudeRunner = async (prompt) => {
    prompts.push(prompt)
    const stage = { started: performance.now(), ended: Infinity }
    stages.push(stage)
    const answer = typeof answers === "function" ? answers(prompt) : (answers.shift() ?? "")
    await new Promise((done) => setTimeout(done, 5))
    stage.ended = performance.now()
    return answer
  }
  const pass = new NamesPass({ names, run: run ?? fake, files: FILES, declarations: DECLARATIONS })
  return { pass, names, prompts, stages }
}

/** `answer` as claude writes it:  JSON in a fence. */
function fenced(answer: unknown): string {
  return `Here they are:\n\`\`\`json\n${JSON.stringify(answer)}\n\`\`\``
}
