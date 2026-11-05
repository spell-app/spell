/**
 * `with`, in a read and in a new thing (epic `data` P32, Q29, Q30, I68):
 * - a read:  `every favourite with the same address and name "blah"`, the test a `where` would be;
 *   `remove saved favourites with the same address` takes them from the place
 * - a new thing:  `a new card with suit hearts, rank queen, short name "foo"`, `a new card with the suit`
 */
import { enableExternalSource, flush } from "solid-js"
import { beforeAll, beforeEach, describe, expect, it } from "vite-plus/test"

import { bridgeSolid } from "spell/util"

import { core } from "spell/parser/core"
import { parseSpellProject, runSpellFiles } from "spell/parser/spell/test"

/** A program's one file, compiled. */
function compiled(path: string, ...lines: string[]) {
  return parseSpellProject([{ path, contents: `${lines.join("\n")}\n` }]).files[0]!
}

/** Lets a write through, and an answer back. */
const settled = () => new Promise((resolve) => setTimeout(resolve, 60))

const FAVOURITES = `pokedex is an in memory database
a favourite is a thing:
	- it is saved in the pokedex
	- its "name" is text
	- its "address" is text
	- its "short name" is text`

/** An action of a thing, `address` set first. */
const ACTION = (...lines: string[]) => [
  "a pokemon is a thing:",
  '\t- its "number" is text',
  "\t- to go:",
  "\t\tset address to its number",
  ...lines.map((line) => `\t\t${line}`)
]

/** What removing each favourite the test passes from the place compiles to. */
const REMOVES = (filter: string, test: string) =>
  `core.inOneGo(async () => core.map(core.filter(await core.savedThings(Favourite, { filter: ${filter} }), (favourite) => ${test}), (favourite) => core.removeSaved(favourite)))`

describe("a read with `with`", () => {
  it("`every favourite with the same address` is `every favourite where its address is address`", () => {
    const made = compiled("/Test.spell", FAVOURITES, ...ACTION("set x to every favourite with the same address"))
    expect(made.errors).toEqual([])
    expect(made.compiled).toContain("core.savedThings(Favourite, { filter: { address: address } })")
    const where = compiled(
      "/Test.spell",
      FAVOURITES,
      ...ACTION("set x to every favourite where its address is address")
    )
    const lineOf = (code: string) => code.split("\n").find((line) => line.includes("const x ="))
    expect(lineOf(made.compiled)).toBe(lineOf(where.compiled))
  })

  it('several, joined by `and`, any field\'s words:  `with the same address and short name "x"`', () => {
    const made = compiled(
      "/Test.spell",
      FAVOURITES,
      ...ACTION('set x to the saved favourites with the same address and short name "x"')
    )
    expect(made.errors).toEqual([])
    expect(made.compiled).toContain('core.savedThings(Favourite, { filter: { address: address, shortName: "x" } })')
  })

  it("a `where` after them, for anything else", () => {
    const made = compiled(
      "/Test.spell",
      FAVOURITES,
      ...ACTION('set x to every favourite with the same address where its name starts with "P"')
    )
    expect(made.errors).toEqual([])
    expect(made.compiled).toContain(
      'core.filter(await core.savedThings(Favourite, {}, "looks through"), (favourite) => favourite.address === address && core.startsWith(favourite.name, "P"))'
    )
  })

  it("`remove saved favourites with the same address and name ...` removes each from the place, in one go", () => {
    for (const [line, filter, test] of [
      ["remove saved favourites with the same address", "{ address: address }", "favourite.address === address"],
      [
        'remove saved favourites with the same address and name "blah"',
        '{ address: address, name: "blah" }',
        'favourite.address === address && favourite.name === "blah"'
      ],
      ["remove every favourite with the same address", "{ address: address }", "favourite.address === address"]
    ]) {
      const made = compiled("/Test.spell", FAVOURITES, ...ACTION(line!))
      expect(made.errors).toEqual([])
      expect(made.compiled).toContain(REMOVES(filter!, test!))
    }
  })

  it("won't compile:  a read-only place, `the same X` with nothing called X;  `with the address` isn't a form", () => {
    const sheet = FAVOURITES.replace("an in memory database", 'a sheet at "favourites.csv"')
    expect(
      compiled("/Test.spell", sheet, ...ACTION("remove saved favourites with the same address")).errors.join()
    ).toContain("read only")
    const nothing = compiled("/Test.spell", FAVOURITES, "set x to every favourite with the same short name")
    expect(nothing.errors.join()).toContain('Nothing here is called "short name"')
    expect(
      compiled("/Test.spell", FAVOURITES, ...ACTION("set x to every favourite with the address")).errors
    ).toHaveLength(1)
    // not one of a favourite's fields
    expect(compiled("/Test.spell", FAVOURITES, "set x to every favourite with colour red").errors).toHaveLength(1)
  })

  describe("run against a place in memory", () => {
    beforeAll(() => bridgeSolid({ enableExternalSource, flush }))
    beforeEach(() => core.resetRuntime())

    const BOX = `${FAVOURITES}

my box is an app:
	- its "all of them" is every favourite, sorted by its name
	- to add three:
		add (a new favourite with name "Pikachu", address "25") to the favourites
		add (a new favourite with name "Raichu", address "26") to the favourites
		add (a new favourite with name "blah", address "25") to the favourites
	- to drop named:
		set address to "25"
		remove saved favourites with the same address and name "blah"
	- to drop all:
		set address to "25"
		remove saved favourites with the same address
`

    it("removes the ones that match, and only them", async () => {
      const run = runSpellFiles([{ path: "/Test.spell", contents: BOX }], { registered: true })
      const { my_box: box } = run("my_box") as { my_box: any }
      const namesOf = async () =>
        ((await core.answerOf(box, "allOfThem")) as { items: Array<{ name: string }> }).items.map(({ name }) => name)
      await box.addThree()
      await settled()
      expect(await namesOf()).toEqual(["Pikachu", "Raichu", "blah"])
      await box.dropNamed()
      await settled()
      await core.reloadSaved()
      expect(await namesOf()).toEqual(["Pikachu", "Raichu"])
      await box.dropAll()
      await settled()
      await core.reloadSaved()
      expect(await namesOf()).toEqual(["Raichu"])
    })
  })
})

describe("a new thing `with`", () => {
  const CARD = `a card is a thing:
	- its "suit" is one of clubs, diamonds, hearts or spades
	- its "rank" is one of ace, king, queen
	- its "short name" is text
	- its "face up" is yes or no`

  it('I68:  `a new card with suit hearts, rank queen, short name "foo"` sets each', () => {
    const made = compiled(
      "/Test.spell",
      CARD,
      'set x to a new card with suit hearts, rank queen, short name "foo"',
      "set y to a new card with face up",
      'set z to a new card with suit = hearts and short name "x"'
    )
    expect(made.errors).toEqual([])
    expect(made.compiled.replace(/\s+/g, " ")).toContain(
      'const x = new Card({ suit: "hearts", rank: "queen", shortName: "foo" })'
    )
    expect(made.compiled).toContain("const y = new Card({ faceUp: true })")
    expect(made.compiled).toContain('const z = new Card({ suit: "hearts", shortName: "x" })')
  })

  it("Q30:  `a new card with the suit` sets it to what `the suit` means there;  `with jokers` alone still means yes", () => {
    const made = compiled(
      "/Test.spell",
      CARD,
      "a deck is a thing:",
      '\t- its "jokers" is yes or no',
      "\t- to deal:",
      "\t\tset the suit to hearts",
      "\t\tset x to a new card with the suit and rank queen",
      "\t\tset y to a new deck with jokers"
    )
    expect(made.errors).toEqual([])
    expect(made.compiled).toContain('new Card({ suit: suit, rank: "queen" })')
    expect(made.compiled).toContain("new Deck({ jokers: true })")
  })

  it("what can't be read is an error naming it, never dropped", () => {
    const made = compiled(
      "/Test.spell",
      CARD,
      "set x to a new card with colour red",
      "set y to a new card with the same suit"
    )
    expect(made.errors).toEqual([
      '6:20 Don\'t understand "with colour red"',
      '7:20 Don\'t understand "with the same suit"'
    ])
  })

  it("in Spanish:  `una nueva carta con palo corazones`, `con el palo`", () => {
    const made = compiled(
      "/Test.es.spell",
      "una carta es una cosa:",
      "\t- su palo es uno de tréboles, diamantes, corazones o picas",
      '\t- su "nombre corto" es texto',
      "\t- para repartir:",
      "\t\tponer palo a corazones",
      '\t\tponer x a una nueva carta con palo corazones, nombre corto "foo"',
      "\t\tponer y a una nueva carta con el palo"
    )
    expect(made.errors).toEqual([])
    expect(made.compiled).toContain('new Carta({ palo: "corazones", nombreCorto: "foo" })')
    expect(made.compiled).toContain("new Carta({ palo: palo })")
  })
})

describe("in Spanish", () => {
  const CASA = `pokedex es una base de datos en memoria
un favorito es una cosa:
	- se guarda en la pokedex
	- su "nombre" es texto
	- su "dirección" es texto
un pokemon es una cosa:
	- su "número" es texto
	- para quitarlo:
		poner dirección a su número`

  it("`cada favorito con la misma dirección`, and `quitar los favoritos guardados con ...`", () => {
    const read = compiled(
      "/Test.es.spell",
      CASA,
      '\t\tponer x a cada favorito con la misma dirección y nombre "Pikachu"'
    )
    expect(read.errors).toEqual([])
    expect(read.compiled).toContain(
      'core.savedThings(Favorito, { filter: { dirección: dirección, nombre: "Pikachu" } })'
    )
    const removed = compiled("/Test.es.spell", CASA, "\t\tquitar los favoritos guardados con la misma dirección")
    expect(removed.errors).toEqual([])
    expect(removed.compiled).toContain(
      "core.inOneGo(async () => core.map(core.filter(await core.savedThings(Favorito, { filter: { dirección: dirección } }), (favorito) => favorito.dirección === dirección), (favorito) => core.removeSaved(favorito)))"
    )
  })
})
