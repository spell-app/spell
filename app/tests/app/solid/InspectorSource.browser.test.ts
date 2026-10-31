import { describe, expect, test } from "vite-plus/test"

import {
  enabledWhenInSource,
  eventsInSource,
  handlersInSource,
  propertyEditorInSource
} from "spell/app/app/solid/InspectorSource"

import card from "../../../spaces/@spell/examples/Solitaire/Card.spellml?raw"
import pile from "../../../spaces/@spell/examples/Solitaire/Pile.spellml?raw"
import solitaire from "../../../spaces/@spell/examples/Solitaire/Solitaire.spellml?raw"

/**
 * `handlersInSource()`:  the handlers an element was written with, read at the place the compiler marked on it.
 */

const FILE = "Tip.spellml"
const SOURCE = [
  "to draw it:",
  "\treturn <div>",
  "\t\t<ui-button onClick={set its percent to 15}>15%</ui-button>",
  '\t\t<ui-button appearance="basic" icon="plus" onClick={add someone}>Add someone</ui-button>',
  '\t\t<ui-button part="remove" aria-label="Remove" onClick={remove it}/>',
  "\t</div>"
].join("\n")
const SOURCES = new Map([[FILE, SOURCE]])

/** An element the compiler marked as written at `line`, `column`, in `file`. */
function drawnAt(line: number, column: number, file = FILE): Element {
  const element = document.createElement("ui-button")
  element.setAttribute("data-spell-at", `${file}:${line}:${column}`)
  return element
}

describe("handlersInSource()", () => {
  test("its tag's handlers, by event", () => {
    expect(handlersInSource(drawnAt(2, 2), SOURCES)).toEqual({ click: "set its percent to 15" })
    expect(handlersInSource(drawnAt(3, 2), SOURCES)).toEqual({ click: "add someone" })
    expect(handlersInSource(drawnAt(4, 2), SOURCES)).toEqual({ click: "remove it" })
  })

  test("a tag with none:  nothing", () => {
    expect(handlersInSource(drawnAt(1, 8), SOURCES)).toEqual({})
  })

  test("no mark, or no such file, or no tag there:  nothing, never a guess", () => {
    expect(handlersInSource(document.createElement("ui-button"), SOURCES)).toEqual({})
    expect(handlersInSource(drawnAt(2, 2, "Other.spellml"), SOURCES)).toEqual({})
    expect(handlersInSource(drawnAt(0, 0), SOURCES)).toEqual({})
  })
})

/**
 * `eventsInSource()`:  a type's abilities and events in the author's words, with their code (epic `debut` P28);
 * read from Solitaire as it's written.
 */
describe("eventsInSource()", () => {
  const SOLITAIRE = [card, pile, solitaire]

  test("a card:  its abilities, then its events, as written, each with its code", () => {
    expect(eventsInSource(["card"], SOLITAIRE)).toEqual([
      { kind: "ability", words: "draggable", code: "" },
      { kind: "ability", words: "clickable when", code: "it is face up or its pile is the stock of the solitaire" },
      { kind: "event", words: "on click", code: "play it" },
      { kind: "event", words: "when dragged", code: "clear the hint of the solitaire" },
      { kind: "event", words: "on drag cancelled", code: 'set the hint of the solitaire to " -- Not there"' }
    ])
  })

  test("a tableau:  its own conditions first, then what it inherits from a pile;  each event's lines under it", () => {
    const rows = eventsInSource(["tableau", "pile"], SOLITAIRE)
    expect(rows.map((row) => [row.kind, row.words])).toEqual([
      ["ability", "cards draggable when"],
      ["ability", "droppable when"],
      ["ability", "droppable"],
      ["event", "while card dragged over"],
      ["event", "on card dropped"]
    ])
    expect(rows[0]!.code).toBe("the card is face up")
    expect(rows[1]!.code.split("\n")[0]).toBe("if it is empty")
    expect(rows[4]!.code).toBe("put the card on it")
  })

  test("a tag's event:  `<on click>`, its words before its attributes, its code between", () => {
    expect(eventsInSource(["stock pile"], SOLITAIRE).filter((row) => row.kind === "event")).toEqual([
      { kind: "event", words: "on click", code: "play from the stock" }
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
    expect(eventsInSource(["card"], [source])).toEqual([
      { kind: "ability", words: "clickable when", code: "it is face down" },
      { kind: "ability", words: "draggable when", code: "it is face up" },
      { kind: "event", words: "when clicked", code: "play it" }
    ])
  })

  test("the game:  its properties' changes, as written", () => {
    expect(eventsInSource(["solitaire"], SOLITAIRE).map((row) => [row.words, row.code.split("\n")[0]])).toEqual([
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
    expect(eventsInSource(["game"], [source])).toEqual([
      { kind: "event", words: "when its score changes", code: 'if its score is 520\n\tshow "You won!"' },
      { kind: "event", words: "on hint change", code: "print its hint" },
      { kind: "event", words: "on best change", code: "print 1" },
      { kind: "event", words: "when the level changes", code: "print its level" },
      { kind: "event", words: "on round change", code: "print its round" }
    ])
  })

  test("a type's own `<property-editor>`:  its markup as written, its own type's first;  none:  empty", () => {
    const words = ["property-editor", "editor-de-propiedades"]
    const markup = propertyEditorInSource(["card", "two sided view"], [card], words)
    expect(markup).toMatch(/^<ui-property-group label="Card" columns="2">/)
    expect(markup).toContain('<ui-property name="suit" label="Suit" as="buttons" width="16" />')
    expect(markup).not.toContain("property-editor")
    const spanish =
      '<spell-view "carta">\n\t<editor-de-propiedades>\n\t\t<ui-property name="palo" />\n\t</>\n</spell-view>'
    expect(propertyEditorInSource(["carta"], [spanish], words)).toBe('<ui-property name="palo" />')
    expect(propertyEditorInSource(["pile"], [pile], words)).toBe("")
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
