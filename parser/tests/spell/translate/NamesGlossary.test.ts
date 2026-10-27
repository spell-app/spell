import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import JSON5 from "json5"
import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { NamesGlossary } from "spell/parser/spell/translate/NamesGlossary"
import { TranslationNames } from "spell/parser/spell/translate/TranslationNames"
import type { GlossaryData, NamesData } from "spell/parser/spell/translate/translate.types"

/**
 * The shared names glossary (epic `spanish` P26):  names other projects chose, looked up before asking `claude`,
 * a project's own choices checked against it, and `--learn` growing it.
 */

const ENGLISH = SP.Language.for("en")!
const SPANISH = SP.Language.for("es")!

const GLOSSARY: GlossaryData = {
  names: {
    card: { name: "carta", gender: "feminine", from: "seed:Solitario" },
    rank: { name: "rango", gender: "masculine", from: "seed:Solitario" },
    queen: { name: "dama", gender: "feminine", from: "seed:Solitario" },
    up: { name: "arriba", from: "seed:Solitario" },
    widget: { name: "artilugio", from: "drafted" },
    gadget: { name: "aparato", gender: "masculine", from: "drafted" }
  },
  phrases: { "turn it over": { name: "voltear eso", from: "seed:Solitario" } },
  genders: { mano: "feminine" }
}

describe("NamesGlossary:  names every project shares", () => {
  test("fills what it knows, with genders;  the rest is left to ask for", () => {
    const names = namesWith({})
    const { filled, rest } = new NamesGlossary(GLOSSARY).fill(names, [
      { kind: "types", words: "card" },
      { kind: "names", words: "rank" },
      // a plural, from its singular, by Spanish's rules
      { kind: "names", words: "queens" },
      { kind: "phrases", words: "turn it over" },
      // a type needs its gender:  `artilugio` has none here
      { kind: "types", words: "widget" },
      { kind: "names", words: "suit" },
      // texts are each project's own
      { kind: "texts", words: "card" }
    ])
    expect(filled).toBe(4)
    expect(rest.map(({ words }) => words)).toEqual(["widget", "suit", "card"])
    expect(names.data.types.card).toEqual({ name: "carta", gender: "feminine" })
    expect(names.data.names).toEqual({ rank: "rango", queens: "damas" })
    expect(names.data.genders.rango).toBe("masculine")
    expect(names.data.phrases["turn it over"]).toBe("voltear eso")
  })

  test("never a word the project already uses for something else:  that one is left to ask for", () => {
    const names = namesWith({ types: { tableau: { name: "carta", gender: "feminine" } } })
    const { rest } = new NamesGlossary(GLOSSARY).fill(names, [
      { kind: "types", words: "card" },
      { kind: "names", words: "rank" }
    ])
    expect(rest).toEqual([{ kind: "types", words: "card" }])
    expect(names.data.types.card).toBeUndefined()
  })

  test("its genders are beneath a project's, so an article agrees without a guess:  `la mano`", () => {
    const names = namesWith({})
    // the pack's guess by its ending says masculine
    expect(names.genderOf("mano")).toBe("masculine")
    names.addImported({ genders: new NamesGlossary(GLOSSARY).data.genders })
    expect(names.genderOf("mano")).toBe("feminine")
  })

  test("the entries a program's words use, as whole words, for a prompt:  `up` isn't in `setup`", () => {
    const relevant = new NamesGlossary(GLOSSARY).relevantTo("to test card setup\n\tturn it over")
    expect(relevant).toEqual({ names: { card: "carta" }, phrases: { "turn it over": "voltear eso" } })
  })

  test("a project's choice that differs from the glossary is said, with where the glossary's came from", () => {
    const names = namesWith({ types: { card: { name: "naipe", gender: "masculine" } }, names: { rank: "rango" } })
    expect(new NamesGlossary(GLOSSARY).differences(names)).toEqual([
      "`card` is `naipe` here, `carta` in the glossary (seed:Solitario)"
    ])
  })

  test("--learn adds a project's names, never over a better source;  over a worse one, yes", () => {
    const glossary = new NamesGlossary(GLOSSARY)
    const names = namesWith({
      types: { card: { name: "naipe", gender: "masculine" }, joker: { name: "comodín", gender: "masculine" } },
      names: { widget: "chisme", suit: "palo", missing: TranslationNames.TODO },
      phrases: { "deal it": "repartir eso" },
      genders: { chisme: "masculine", palo: "masculine" }
    })
    const { added, kept } = glossary.learn(names, "Juego")
    expect(added).toBe(3)
    expect(kept).toEqual(["`card`:  kept `carta` (seed:Solitario), not `naipe`"])
    expect(glossary.data.names.joker).toEqual({ name: "comodín", gender: "masculine", from: "learned:Juego" })
    // a drafted name is worse than a project's:  the project's wins
    expect(glossary.data.names.widget).toEqual({ name: "chisme", gender: "masculine", from: "learned:Juego" })
    expect(glossary.data.names.suit?.name).toBe("palo")
    // a TODO is nobody's choice;  phrases are the project's own
    expect(glossary.data.names.missing).toBeUndefined()
    expect(glossary.data.phrases["deal it"]).toBeUndefined()
    expect(Object.keys(glossary.toJSON().names)).toEqual([...Object.keys(glossary.data.names)].sort())
  })

  test("--review:  a name a person reviewed is learned as reviewed, over a seed's;  a ticked one goes in at once", () => {
    const glossary = new NamesGlossary(GLOSSARY)
    const names = namesWith({
      types: { card: { name: "naipe", gender: "masculine" } },
      names: { rank: "rango", suit: "palo" },
      phrases: { "turn it over": "darle la vuelta a eso" },
      texts: { hello: "hola" },
      genders: { palo: "masculine" }
    })
    names.markReviewed({ kind: "types", words: "card" })
    names.markReviewed({ kind: "names", words: "rank" })
    const { added, kept } = glossary.learn(names, "Juego")
    expect(kept).toEqual([])
    expect(added).toBe(2)
    expect(glossary.data.names.card).toEqual({ name: "naipe", gender: "masculine", from: "reviewed:Juego" })
    // the same word as the seed's:  its source bettered, its gender kept
    expect(glossary.data.names.rank).toEqual({ name: "rango", gender: "masculine", from: "reviewed:Juego" })
    expect(glossary.data.names.suit?.from).toBe("learned:Juego")
    // ticked "for every project":  a phrase too, never a text
    const ticked = new NamesGlossary(GLOSSARY)
    const count = ticked.addReviewed(names, [
      { kind: "names", words: "suit" },
      { kind: "phrases", words: "turn it over" },
      { kind: "texts", words: "hello" }
    ])
    expect(count).toBe(2)
    expect(ticked.data.names.suit).toEqual({ name: "palo", gender: "masculine", from: "reviewed" })
    expect(ticked.data.phrases["turn it over"]).toEqual({ name: "darle la vuelta a eso", from: "reviewed" })
    expect(names.toFile().reviewed).toEqual({ names: ["rank"], types: ["card"] })
  })

  test("Spanish's glossary reads, every entry says where it came from, and Owen's Solitario choices are in it", () => {
    const file = fileURLToPath(import.meta.resolve("spell/parser/spell/languages/es/glossary.json5"))
    const data = JSON5.parse(readFileSync(file, "utf8")) as GlossaryData
    const entries = [...Object.values(data.names ?? {}), ...Object.values(data.phrases ?? {})]
    expect(entries.every((entry) => entry.name && /^(reviewed|seed:|learned:|drafted)/.test(entry.from))).toBe(true)
    expect(data.names?.queen?.name).toBe("dama")
    expect(data.names?.spades?.name).toBe("espadas")
    expect(data.names?.foundation?.name).toBe("fundación")
  })
})

/** A Spanish dictionary holding `data`. */
function namesWith(data: NamesData): TranslationNames {
  return new TranslationNames(data, { from: ENGLISH, to: SPANISH })
}
