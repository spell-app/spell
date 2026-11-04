import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"

/**
 * Where a project's declarations are written (epic `editor` P23):  the parse's own say, never the text's words,
 * so the side bar finds every one, in every language.
 */
describe("SP.SpellDeclarationPlaces", () => {
  const CARD = [
    "a card is a two sided view where:",
    "\t- to play it:",
    "\t\tprint 1",
    "\t- clickable when it is face down",
    "\t- on click play it"
  ].join("\n")
  const PILE = [
    "a pile is a viewable list of cards where:",
    "\t- to count the points for a card on it:",
    "\t\treturn 10",
    "a card:",
    "\t- on drag cancelled print 2"
  ].join("\n")

  function placesOf(files: { path: string; contents: string }[]): SP.SpellDeclarationPlace[] {
    const { files: parsed } = parseSpellProject(files)
    return SP.SpellDeclarationPlaces.of(
      parsed.map((file, index) => ({ match: file.match, parseText: files[index]!.contents }))
    )
  }

  test("a type's actions, abilities and events, each on its type, with its lines", () => {
    const places = placesOf([
      { path: "Card.spell", contents: CARD },
      { path: "Pile.spell", contents: PILE }
    ])
    const brief = places.map(({ kind, name, of, path, line, endLine, codeColumn }) => ({
      kind,
      name,
      of,
      path,
      line,
      endLine,
      codeColumn
    }))
    expect(brief).toContainEqual(expect.objectContaining({ kind: "type", name: "Card", path: "Card.spell", line: 0 }))
    expect(brief).toContainEqual(
      expect.objectContaining({ kind: "method", name: "play it", of: "Card", line: 1, endLine: 2 })
    )
    expect(brief).toContainEqual(
      expect.objectContaining({ kind: "ability", of: "Card", line: 3, endLine: 3, codeColumn: 18 })
    )
    expect(brief).toContainEqual(expect.objectContaining({ kind: "event", name: "click", of: "Card", line: 4 }))
    // a member of a type written in ANOTHER file's `a card:` is still the card's
    expect(brief).toContainEqual(
      expect.objectContaining({ kind: "event", name: "drag cancelled", of: "Card", path: "Pile.spell", line: 4 })
    )
    // a method whose words name another type is found by the name the parse gives it, not a pattern
    expect(brief).toContainEqual(
      expect.objectContaining({ kind: "method", name: "count the points for a card on it", path: "Pile.spell" })
    )
  })

  test("each type lists the project's other types it names", () => {
    const pile = placesOf([
      { path: "Card.spell", contents: CARD },
      { path: "Pile.spell", contents: PILE }
    ]).find((place) => place.kind === "type" && place.name === "Pile")
    expect(pile?.uses).toEqual(["Card"])
  })
})
