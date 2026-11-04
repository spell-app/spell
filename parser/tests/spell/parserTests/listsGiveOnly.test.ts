/**
 * A web server whose lists give only a little of each row, its whole at the row's own address (epic `data` P27):
 * PokéAPI's `{ "name": "pikachu", "url": "https://..." }`, compiled spell on `core`, against a fake PokéAPI.
 * - `its lists give only each one's "name"`:  any other field is read from the row's address, once, when something reads it.
 */
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { core } from "spell/parser/core"
import { parseSpellProject, runSpell } from "spell/parser/spell/test"

const HOST = "https://poke.test/api/v2"
const PIKACHU_AT = `${HOST}/pokemon/25/`
const RAICHU_AT = `${HOST}/pokemon/26/`
const ELECTRIC_AT = `${HOST}/type/13/`
const PIKACHU = {
  id: 25,
  name: "pikachu",
  height: 4,
  weight: 60,
  types: [{ slot: 1, type: { name: "electric", url: ELECTRIC_AT } }],
  stats: [{ base_stat: 90, effort: 2, stat: { name: "speed", url: `${HOST}/stat/6/` } }],
  abilities: [{ is_hidden: true, slot: 3, ability: { name: "lightning-rod", url: `${HOST}/ability/31/` } }],
  sprites: { front_default: "front.png", other: { "official-artwork": { front_default: "art.png" } } }
}
const ROUTES: Record<string, unknown> = {
  [`${HOST}/pokemon`]: {
    count: 2,
    next: null,
    results: [
      { name: "pikachu", url: PIKACHU_AT },
      { name: "raichu", url: RAICHU_AT }
    ]
  },
  [PIKACHU_AT]: PIKACHU,
  [RAICHU_AT]: { ...PIKACHU, id: 26, name: "raichu", weight: 300 },
  [ELECTRIC_AT]: { id: 13, name: "electric" }
}

const LINES = [
  `poke api is a web server at "${HOST}":`,
  `\t- its id is its "url"`,
  `\t- its rows are its "results"`,
  `\t- its next page is its "next"`,
  `\t- its lists give only each one's "name"`,
  `\t- it gives up to 2000 at a time`,
  `\t- check it once a day`,
  `\t- pokemon live at "/pokemon"`,
  `\t- types live at "/type"`,
  `a "pokemon" is a thing:`,
  `\t- it lives in poke api`,
  `\t- its "number" is a number, stored as "id"`,
  `\t- its "name" is text`,
  `\t- its "height" is a number`,
  `\t- its "weight" is a number`,
  `\t- its "types" is a list of pokemon types`,
  `\t- its "stats" is a list of stats`,
  `\t- its "abilities" is a list of pokemon abilities`,
  `\t- its "sprites" is a sprite`,
  `a "type" is a thing:`,
  `\t- it lives in poke api`,
  `\t- its "name" is text`,
  `a "pokemon type" is a thing:`,
  `\t- its "slot" is a number`,
  `\t- its "kind" is a type, stored as "type"`,
  `a "stat" is a thing:`,
  `\t- its "base stat" is a number`,
  `\t- its "effort" is a number`,
  `a "pokemon ability" is a thing:`,
  `\t- its "hidden" is yes or no, stored as "is_hidden"`,
  `\t- its "slot" is a number`,
  `a "sprite" is a thing:`,
  `\t- its "front default" is text`,
  `\t- its "other" is an other`,
  `an "other" is a thing:`,
  `\t- its "official artwork" is an official artwork`,
  `an "official artwork" is a thing:`,
  `\t- its "front default" is text`
]

/** A fake PokéAPI:  what's been asked, oldest first. */
function serve(): string[] {
  const asked: string[] = []
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = `${input instanceof Request ? input.url : input instanceof URL ? input.href : input}`
    asked.push(url)
    const route = ROUTES[url.replace(/\?.*$/, "")]
    return route === undefined ? new Response("no", { status: 404 }) : Response.json(route)
  })
  return asked
}

type Pokemon = {
  name: string
  number: number | undefined
  weight: number | undefined
  types: { items: Array<{ slot: number; kind: { name: string } | undefined }> }
  stats: { items: Array<{ baseStat: number }> }
  abilities: { items: Array<{ hidden: boolean }> }
  sprites: { frontDefault: string; other: { officialArtwork: { frontDefault: string } } } | undefined
}

/** Every pokemon, read from the fake PokéAPI's list. */
async function everyPokemon(): Promise<Pokemon[]> {
  core.resetRuntime()
  const run = runSpell(LINES)
  const Class = run("Pokemon").Pokemon as { savedIn: { select?: unknown } } & (new () => unknown)
  delete Class.savedIn.select
  return (await core.savedThings(Class)).items as Pokemon[]
}

afterEach(() => void vi.unstubAllGlobals())

describe("a web server whose lists give only names", () => {
  test("compiles, in English and Spanish, and says so to core.place()", () => {
    const { compiled, errors, warnings } = parseSpellProject([{ path: "/P.spell", contents: `${LINES.join("\n")}\n` }])
      .files[0]!
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
    expect(compiled).toContain(`listsGive: ["name"]`)
    expect(compiled).toContain("pageSize: 2000")
    expect(compiled).toContain("export class PokemonType extends Thing")
    const spanish = [
      `poke api es un servidor web en "${HOST}":`,
      `\t- su identificador está en "url"`,
      `\t- sus listas solo dan "name" de cada uno`,
      `\t- da hasta 2000 a la vez`,
      `\t- las criaturas están en "/pokemon"`,
      `una "criatura" es una cosa:`,
      `\t- vive en poke api`,
      `\t- su "name" es texto`
    ]
    const es = parseSpellProject([{ path: "/P.es.spell", contents: `${spanish.join("\n")}\n` }]).files[0]!
    expect(es.errors).toEqual([])
    expect(es.compiled).toContain(`listsGive: ["name"]`)
    expect(es.compiled).toContain("pageSize: 2000")
  })

  test("the list gives names;  reading another field reads that one whole, once", async () => {
    const asked = serve()
    const [pikachu, raichu] = (await everyPokemon()) as [Pokemon, Pokemon]
    expect(pikachu.name).toBe("pikachu")
    expect(raichu.name).toBe("raichu")
    // every name in one request
    expect(asked[0]).toBe(`${HOST}/pokemon?limit=2000`)
    expect(asked.filter((url) => url === PIKACHU_AT)).toHaveLength(0)
    void pikachu.weight
    await vi.waitFor(() => expect(pikachu.weight).toBe(60))
    void pikachu.height
    expect(asked.filter((url) => url === PIKACHU_AT)).toHaveLength(1)
    // nobody read raichu's:  never asked for
    expect(asked).not.toContain(RAICHU_AT)
    expect(pikachu.number).toBe(25)
  })

  test("what's inside it reads in words:  its types, stats, abilities and sprites", async () => {
    serve()
    const [pikachu] = (await everyPokemon()) as [Pokemon]
    // a list is read first:  an empty one, filled when the whole comes
    void pikachu.stats.items
    await vi.waitFor(() => expect(pikachu.stats.items[0]?.baseStat).toBe(90))
    expect(pikachu.abilities.items[0]!.hidden).toBe(true)
    expect(pikachu.sprites!.other.officialArtwork.frontDefault).toBe("art.png")
    expect(pikachu.types.items[0]!.slot).toBe(1)
  })
})
