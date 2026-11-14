import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"
import {
  enabledWhenInSource,
  eventsDeclared,
  propertyEditorInSource,
  startingValues,
  withClassNames
} from "spell/app/app/solid/InspectorSource"

import card from "../../../spaces/@spell/examples/Solitaire/Card.spell?raw"
import cardEditor from "../../../spaces/@spell/examples/Solitaire/Card.editor.spell?raw"
import cartaEditor from "../../../spaces/@spell/examples/Solitario/Carta.editor.es.spell?raw"
import pile from "../../../spaces/@spell/examples/Solitaire/Pile.spell?raw"
import solitaire from "../../../spaces/@spell/examples/Solitaire/Solitaire.spell?raw"

/**
 * `eventsDeclared()`:  a type's abilities and events in the author's words, with their code (epic `debut` P28),
 * where the compiler says they're declared (epic `editor` P23);  read from Solitaire as it's written.
 */
describe("eventsDeclared()", () => {
  const SOLITAIRE = [card, pile, solitaire]

  /** The rows of the types named `classNames`, its own first, as `sources` declare them. */
  function eventsInSource(classNames: string[], sources: string[]) {
    const files = sources.map((contents, index) => ({ path: `File${index}.spell`, contents }))
    const { files: parsed } = parseSpellProject(files)
    const places = SP.SpellDeclarationPlaces.of(
      parsed.map((file, index) => ({ match: file.match, parseText: files[index]!.contents }))
    )
    return eventsDeclared(
      classNames,
      places,
      files.map((file) => ({ path: file.path, text: file.contents }))
    )
  }

  test("a card:  its abilities, then its events, as written, each with its code", () => {
    expect(eventsInSource(["Card"], SOLITAIRE)).toEqual([
      { kind: "ability", words: "draggable", code: "" },
      { kind: "event", words: "on click", code: "if it is face up or its pile is solitaire's stock\n\tplay the card" }
    ])
  })

  test("a type's own `when creating ...`:  an event's row, as written, with its code;  never an action (I109)", () => {
    const source = [
      "counter is an app",
      '\tits "count" is a number',
      "\twhen creating it",
      "\t\tset its count to 1"
    ].join("\n")
    expect(eventsInSource(["Counter"], [source])).toEqual([
      { kind: "event", words: "when creating it", code: "set its count to 1" }
    ])
  })

  test("a column:  its bare abilities first (Owen), then its own conditions, then what it inherits from a pile;  each event's lines under it", () => {
    const rows = eventsInSource(["Column", "Pile"], SOLITAIRE)
    expect(rows.map((row) => [row.kind, row.words])).toEqual([
      ["ability", "droppable"],
      ["ability", "its cards are draggable when"],
      ["ability", "it is droppable when"],
      ["event", "on card dropped"]
    ])
    expect(rows[0]!.code).toBe("")
    expect(rows[1]!.code).toBe("the card is face up")
    expect(rows[2]!.code.split("\n")[0]).toBe("it is empty and the card is a king")
    expect(rows[3]!.code).toBe("put the card on the pile")
  })

  test("an event:  `on click:`, its code under it", () => {
    expect(eventsInSource(["StockPile"], SOLITAIRE).filter((row) => row.kind === "event")).toEqual([
      { kind: "event", words: "on click", code: "turn over the next card" }
    ])
  })

  test("the short forms:  an ability's condition in its own words, `when` for an event", () => {
    const source = `
a "card" is a view:
	- clickable when it is face down
	- draggable when it is face up
	- when clicked: play it`
    expect(eventsInSource(["Card"], [source])).toEqual([
      { kind: "ability", words: "clickable when", code: "it is face down" },
      { kind: "ability", words: "draggable when", code: "it is face up" },
      { kind: "event", words: "when clicked", code: "play it" }
    ])
  })

  test("the game:  its own `when creating solitaire` (I109), then its properties' changes, as written", () => {
    expect(eventsInSource(["Solitaire"], SOLITAIRE).map((row) => [row.words, row.code.split("\n")[0]])).toEqual([
      ["when creating solitaire", "add each card in the deck to the stock"],
      ["when the score changes", "set home to the number of cards in the clubs + the number of cards in the diamonds"]
    ])
  })

  test("a property's change (epic `debut` P30):  every form, its code on its line or under it", () => {
    const source = `
game is an app:
	- when its score changes:
		if its score is 520
			show "You won!"
	- on hint change: print its hint
	- when the level changes: print its level
	- on round change print its round`
    expect(eventsInSource(["Game"], [source])).toEqual([
      { kind: "event", words: "when its score changes", code: 'if its score is 520\n\tshow "You won!"' },
      { kind: "event", words: "on hint change", code: "print its hint" },
      { kind: "event", words: "when the level changes", code: "print its level" },
      { kind: "event", words: "on round change", code: "print its round" }
    ])
  })

  test("a type's own property editor, in its own file (epic `editor` P25):  Solitaire's card", () => {
    const markup = propertyEditorInSource(["card", "two sided view"], [cardEditor])
    expect(markup).toMatch(/^<ui-property-group label="Card" columns="2">/)
    expect(markup).toContain('<ui-property name="suit" label="Suit" as="buttons" width="16" />')
    expect(markup).not.toContain("property editor")
    // none of its own:  empty
    expect(propertyEditorInSource(["card"])).toBe("")
  })

  test("Solitario's card editor:  a built-in template's property, by its Spanish name, named as its class names it (epic `language` T73)", () => {
    const markup = propertyEditorInSource(["carta", "two sided view"], [cartaEditor])
    expect(markup).toContain('<ui-property name="dirección" label="Cara" as="buttons" />')
    const bound = withClassNames(markup, new Map([["dirección", "direction"]]))
    expect(bound).toContain('<ui-property name="direction" label="Cara" as="buttons" />')
    // its own properties, as written
    expect(bound).toContain('<ui-property name="rango" label="Rango" />')
    expect(withClassNames('<ui-property label="x" name="dirección.y">', new Map([["dirección", "direction"]]))).toBe(
      '<ui-property label="x" name="direction.y">'
    )
  })

  test('a project\'s editors file:  `"card" is a property editor`, its markup the lines under it (epic `language` P45)', () => {
    const editors = [
      '"pile" is a property editor',
      '\t<ui-property name="cards" />',
      "",
      '"card" is a property editor',
      '\t<ui-property-group label="Card">',
      '\t\t<ui-property name="rank" />',
      "\t</ui-property-group>",
      ""
    ].join("\n")
    expect(propertyEditorInSource(["pile"], [editors])).toBe('<ui-property name="cards" />')
    expect(propertyEditorInSource(["card"], [editors])).toBe(
      '<ui-property-group label="Card">\n\t<ui-property name="rank" />\n</ui-property-group>'
    )
    expect(propertyEditorInSource(["deck"], [editors])).toBe("")
    // a type's own editor wins over the one it inherits
    expect(propertyEditorInSource(["deck", "pile"], [editors])).toBe('<ui-property name="cards" />')
    const carta = '"carta" es un editor de propiedades\n\t<ui-property name="palo" />\n'
    expect(propertyEditorInSource(["carta"], [carta])).toBe('<ui-property name="palo" />')
  })

  test('a property editor\'s tag, `<property-editor "card">`, its markup its children:  what its plain head gives (epic `language` T125)', () => {
    const markup = ['\t<ui-property-group label="Card">', '\t\t<ui-property name="rank" />', "\t</ui-property-group>"]
    const plain = ["# A card's", "", '"card" is a property editor', ...markup, ""].join("\n")
    const expected = propertyEditorInSource(["card"], [plain])
    expect(expected).toBe('<ui-property-group label="Card">\n\t<ui-property name="rank" />\n</ui-property-group>')
    for (const close of ["</property-editor>", "</>"]) {
      const tagged = ["# A card's", "", '<property-editor "card">', ...markup, close, ""].join("\n")
      expect(propertyEditorInSource(["card"], [tagged])).toBe(expected)
    }
    // one after another, each closed:  the next one's its own
    const two = [
      '<property-editor "pile">',
      '\t<ui-property name="cards" />',
      "</>",
      ...plain.split("\n").slice(2)
    ].join("\n")
    expect(propertyEditorInSource(["pile"], [two])).toBe('<ui-property name="cards" />')
    expect(propertyEditorInSource(["card"], [two])).toBe(expected)
    // none of its own markup
    expect(propertyEditorInSource(["card"], ['<property-editor "card"/>'])).toBe("")
    // Spanish:  `<editor-de-propiedades "carta">`, and Spell UI's own name for the tag
    for (const tag of ["editor-de-propiedades", "editor-propiedades"]) {
      const carta = `<${tag} "carta">\n\t<ui-property name="palo" />\n</>\n`
      expect(propertyEditorInSource(["carta"], [carta])).toBe('<ui-property name="palo" />')
    }
    // only at the file's left edge:  a tag inside another's markup is markup
    expect(propertyEditorInSource(["card"], ['<x "y">\n\t<property-editor "card">\n\t</>\n</>'])).toBe("")
  })

  test("Solitaire's and Solitario's card editors, as their tags write them:  what their plain heads said (T125)", () => {
    const plainOf = (source: string, head: string) =>
      source.replace(/^<[\w-]+ "(\w+)">$/m, `"$1" ${head}`).replace(/^<\/[\w-]*>\n?/m, "")
    expect(cardEditor).toMatch(/^<property-editor "card">$/m)
    expect(propertyEditorInSource(["card"], [cardEditor])).toBe(
      propertyEditorInSource(["card"], [plainOf(cardEditor, "is a property editor")])
    )
    expect(cartaEditor).toMatch(/^<editor-de-propiedades "carta">$/m)
    expect(propertyEditorInSource(["carta"], [cartaEditor])).toBe(
      propertyEditorInSource(["carta"], [plainOf(cartaEditor, "es un editor de propiedades")])
    )
  })

  test("an action's `enabled when`, in its own words;  none:  empty", () => {
    const source = `
a card is a thing where:
	- to turn it over:
		- enabled when it is face down
		set its direction to up`
    expect(enabledWhenInSource("turn it over", [source])).toBe("it is face down")
    expect(enabledWhenInSource("play it", [source])).toBe("")
  })
})

/**
 * `startingValues()`:  what a new thing of a type must be told to draw, from the program as it's written (epic `editor`
 * T51):  Solitaire's card is told its rank and suit, the first of each `one-of`;  its worked-out color isn't.
 */
describe("startingValues()", () => {
  /** The starting values of the type `classNames` names, as `sources` declare it. */
  function startingIn(classNames: string[], sources: string[]) {
    const files = sources.map((contents, index) => ({ path: `File${index}.spell`, contents }))
    const { files: parsed } = parseSpellProject(files)
    const places = SP.SpellDeclarationPlaces.of(
      parsed.map((file, index) => ({ match: file.match, parseText: files[index]!.contents }))
    )
    return startingValues(
      classNames,
      places,
      files.map((file) => ({ path: file.path, text: file.contents }))
    )
  }

  test("a card:  its rank and suit, the first of each one-of;  not its color, which works itself out", () => {
    expect(startingIn(["Card", "TwoSidedView"], [card, pile, solitaire])).toEqual([
      { words: "rank", value: "ace" },
      { words: "suit", value: "clubs" }
    ])
  })

  // its layout is a one-of with no Spell, on one line in plain Spell (epic `language` P46):  the tag spanned two
  test("a pile:  its layout, the first of its one-of", () => {
    expect(startingIn(["Pile"], [card, pile, solitaire])).toEqual([{ words: "layout", value: "stacked" }])
  })
})
