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
      { kind: "ability", words: "clickable when", code: "it is face up or its pile is the solitaire's stock" },
      { kind: "event", words: "on click", code: "play it" },
      { kind: "event", words: "when dragged", code: "clear the solitaire's hint" },
      { kind: "event", words: "on drag cancelled", code: 'set the solitaire\'s hint to " -- Not there"' }
    ])
  })

  test("a tableau:  a tag's bare abilities first (Owen), then its own conditions, then what it inherits from a pile;  each event's lines under it", () => {
    const rows = eventsInSource(["Tableau", "Pile"], SOLITAIRE)
    expect(rows.map((row) => [row.kind, row.words])).toEqual([
      ["ability", "droppable"],
      ["ability", "cards draggable when"],
      ["ability", "droppable when"],
      ["event", "while card dragged over"],
      ["event", "on card dropped"]
    ])
    expect(rows[0]!.code).toBe("")
    expect(rows[1]!.code).toBe("the card is face up")
    expect(rows[2]!.code.split("\n")[0]).toBe("if it is empty")
    expect(rows[4]!.code).toBe("put the card on it")
  })

  test("a tag's event:  `<on click>`, its words before its attributes, its code between", () => {
    expect(eventsInSource(["StockPile"], SOLITAIRE).filter((row) => row.kind === "event")).toEqual([
      { kind: "event", words: "on click", code: "turn a stock card" }
    ])
  })

  test("the short forms:  an ability's condition in its own words, a tag's too, `when` for an event", () => {
    const source = `
<spell-view "card">
	<clickable when it is face down />
	<spell>
		- draggable when it is face up
		- when clicked: play it
	</spell>
</spell-view>`
    expect(eventsInSource(["Card"], [source])).toEqual([
      { kind: "ability", words: "clickable when", code: "it is face down" },
      { kind: "ability", words: "draggable when", code: "it is face up" },
      { kind: "event", words: "when clicked", code: "play it" }
    ])
  })

  test("the game:  its properties' changes, as written", () => {
    expect(eventsInSource(["Solitaire"], SOLITAIRE).map((row) => [row.words, row.code.split("\n")[0]])).toEqual([
      ["when its score changes", "// every card on a foundation:  the game is won"],
      ["when its moves change", "clear the hint"]
    ])
  })

  test("a property's change (epic `debut` P30):  every form, outline and tag, `</>` and `</on ...>` closing", () => {
    const source = `
<spell-app "game">
	<when its score changes>
		if its score is 520
			show "You won!"
	</>
	<on hint change: print its hint/>
	<on best change>print 1</on best change>
	<spell>
		- when the level changes: print its level
		- on round change print its round
	</spell>
</spell-app>`
    expect(eventsInSource(["Game"], [source])).toEqual([
      { kind: "event", words: "when its score changes", code: 'if its score is 520\n\tshow "You won!"' },
      { kind: "event", words: "on hint change", code: "print its hint" },
      { kind: "event", words: "on best change", code: "print 1" },
      { kind: "event", words: "when the level changes", code: "print its level" },
      { kind: "event", words: "on round change", code: "print its round" }
    ])
  })

  const WORDS = ["spell-property-editor", "encanto-editor-de-propiedades", "property-editor", "editor-de-propiedades"]

  test("a type's own `<spell-property-editor>`, in its own file (epic `editor` P25):  Solitaire's card", () => {
    const markup = propertyEditorInSource(["card", "two sided view"], [card], WORDS, [cardEditor])
    expect(markup).toMatch(/^<ui-property-group label="Card" columns="2">/)
    expect(markup).toContain('<ui-property name="suit" label="Suit" as="buttons" width="16" />')
    expect(markup).not.toContain("property-editor")
    // Card.spell holds none of its own any more
    expect(propertyEditorInSource(["card"], [card], WORDS)).toBe("")
  })

  test("Solitario's card editor:  a built-in template's property, by its Spanish name, named as its class names it (epic `language` T73)", () => {
    const markup = propertyEditorInSource(["carta", "two sided view"], [], WORDS, [cartaEditor])
    expect(markup).toContain('<ui-property name="dirección" label="Cara" as="buttons" />')
    const bound = withClassNames(markup, new Map([["dirección", "direction"]]))
    expect(bound).toContain('<ui-property name="direction" label="Cara" as="buttons" />')
    // its own properties, as written
    expect(bound).toContain('<ui-property name="rango" label="Rango" />')
    expect(withClassNames('<ui-property label="x" name="dirección.y">', new Map([["dirección", "direction"]]))).toBe(
      '<ui-property label="x" name="direction.y">'
    )
  })

  test('a project\'s editors file:  one `<spell-property-editor "name">` per type, before any inline one', () => {
    const editors = [
      '<property-editor "pile">\n\t<ui-property name="cards" />\n</property-editor>',
      '<spell-property-editor "card">\n\t<ui-property name="rank" />\n</>'
    ].join("\n\n")
    expect(propertyEditorInSource(["card"], [card], WORDS, [editors])).toBe('<ui-property name="rank" />')
    expect(propertyEditorInSource(["pile"], [pile], WORDS, [editors])).toBe('<ui-property name="cards" />')
    expect(propertyEditorInSource(["deck"], [], WORDS, [editors])).toBe("")
    // Spanish's, in `Carta.editor.es.spell`
    const carta = '<encanto-editor-de-propiedades "carta">\n\t<ui-property name="palo" />\n</>'
    expect(propertyEditorInSource(["carta"], [], WORDS, [carta])).toBe('<ui-property name="palo" />')
  })

  test("inline in the type's spellml still:  the prefixed tag (epic `data` P31), the old short one, Spanish's;  none:  empty", () => {
    const inline = (word: string, name: string) =>
      `<spell-view "${name}">\n\t<${word}>\n\t\t<ui-property name="palo" />\n\t</>\n</spell-view>`
    for (const word of WORDS) {
      expect(propertyEditorInSource(["carta"], [inline(word, "carta")], WORDS)).toBe('<ui-property name="palo" />')
    }
    expect(propertyEditorInSource(["pile"], [pile], WORDS)).toBe("")
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

  test("a pile:  nothing it must be told", () => {
    expect(startingIn(["Pile"], [card, pile, solitaire])).toEqual([])
  })
})
