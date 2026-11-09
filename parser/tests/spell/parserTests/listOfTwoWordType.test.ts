import { describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { spanishInflector } from "spell/parser/spell/languages/es/inflector"
import { parseSpellProject } from "spell/parser/spell/test"

/** What a list property's datatype says of its items, in a project written as `contents`. */
function itemTypeOfList(path: string, contents: string, owner: string, property: string) {
  const { scope, files } = parseSpellProject([{ path, contents }])
  expect(files[0]!.errors).toEqual([])
  const datatype = (scope.getType(owner)?.getMember(property) as P.ScopeVariable | undefined)?.datatype
  return { datatype, itemType: scope.getItemType(datatype) }
}

/**
 * A list of a type whose name is two words (epic `data` I48):
 * the words stay apart in the list's datatype, so each item has the type's real name.
 * - Before:  `list of pokemontypes`, whose items were a `Pokemontype` nobody declared.
 */
describe("a list of a type of two words", () => {
  test("`P.listOf()` keeps the words apart, and `P.itemTypeOf()` gives the type back", () => {
    expect(P.listOf("PokemonType")).toBe("list of pokemon-types")
    expect(P.itemTypeOf(P.listOf("PokemonType"))).toBe("PokemonType")
    expect(P.listOf("Card")).toBe("list of cards")
    expect(P.listOf("number")).toBe("list of numbers")
  })

  test("in English, a property's list holds the declared type", () => {
    const contents = [
      'a "pokemon type" is a thing',
      'a "monster" is a thing:',
      '\t- its "types" is a list of pokemon types'
    ].join("\n")
    expect(itemTypeOfList("/Monsters.spell", contents, "Monster", "types").itemType).toBe("PokemonType")
  })

  test("in Spanish, a property's list holds the declared type", () => {
    const contents = [
      'una "cuenta bancaria" es una cosa',
      'un "banco" es una cosa:',
      '\t- su "cuentas" es una lista de cuentas bancarias'
    ].join("\n")
    const { datatype } = itemTypeOfList("/Bancos.es.spell", contents, "Banco", "cuentas")
    // a compiled name is worked out while parsing, in the language of the file
    expect(P.Inflector.using(spanishInflector, () => P.itemTypeOf(datatype))).toBe("CuentaBancaria")
  })
})
