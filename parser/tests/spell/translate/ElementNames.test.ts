import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell-parser/spell"
import { parseSpellProject } from "spell-parser/spell/test"
import { ElementNames } from "spell-parser/spell/translate/ElementNames"
import { TranslationNames } from "spell-parser/spell/translate/TranslationNames"
import { Translator } from "spell-parser/spell/translate/Translator"
import type { NamesData, UIVocabulary } from "spell-parser/spell/translate/translate.types"

/**
 * The elements a project draws with, in Spanish (epic `spanish` P25):  `<ui-*>` tags through Spell UI's names,
 * the project's own through its dictionary -- in its JSX and in its style sheets.
 * - Spell UI's names are a fake here (`UI_SPANISH`), a few of its real ones:  spell-parser never imports Spell UI.
 *   spell-app hands the real ones in, from `components.es.ts`.
 */

const ENGLISH = SP.Language.for("en")!
const SPANISH = SP.Language.for("es")!

/** A few of Spell UI's Spanish names:  tags, attributes, and the values of the attributes that take a set. */
const UI_TAGS: Record<string, string> = {
  "ui-text": "es-texto",
  "ui-item": "es-elemento",
  "ui-popup": "es-emergente",
  "ui-input": "es-entrada"
}
const UI_ATTRIBUTES: Record<string, string> = {
  type: "tipo",
  content: "contenido",
  inverted: "invertido",
  size: "tamano"
}
const UI_VALUES: Record<string, Record<string, string>> = {
  color: { red: "rojo", black: "negro", blue: "azul" },
  type: { header: "encabezado" },
  size: { small: "pequeño" }
}
const UI_SPANISH: UIVocabulary = {
  tag: (tag) => UI_TAGS[tag],
  attribute: (tag, attribute, value) =>
    UI_TAGS[tag]
      ? {
          attribute: UI_ATTRIBUTES[attribute] ?? attribute,
          value: value === undefined ? undefined : (UI_VALUES[attribute]?.[value] ?? value)
        }
      : undefined,
  hasValues: (tag, attribute) => !!UI_TAGS[tag] && !!UI_VALUES[attribute]
}

/** The game's names in Spanish. */
const NAMES: NamesData = {
  types: { card: { name: "carta", gender: "feminine" }, pile: { name: "pila", gender: "feminine" } },
  names: {
    picture: "imagen",
    color: "color",
    red: "rojo",
    black: "negro",
    layout: "disposición",
    stacked: "apilada",
    placeholder: "marcador"
  },
  phrases: {},
  texts: { "Auto play": "Jugar solo", Klondike: "Klondike" },
  genders: { imagen: "feminine" }
}

/** A card that draws itself with Spell UI's tags. */
const CARD = `a "card" is a view where:
	- its "picture" is a text
	- its "color" is one of red or black
	- to draw it:
		return
			<ui-text
				part="picture"
				color={its color if its picture is "?" otherwise "blue"}>
				{its picture}
			</ui-text>
	- to "draw its header":
		return <ui-item type="header" aria-label="Auto play">Klondike<ui-popup content="Auto play" inverted size="small"/></ui-item>
`

describe("ElementNames:  the elements a project draws with, in the other language", () => {
  test("a `<ui-*>` tag, its attributes and their values through Spell UI's names;  a text people read, the dictionary's", () => {
    const lines = translated(CARD)
    expect(lines.slice(4, 10)).toEqual([
      "\t\tdevolver",
      "\t\t\t<es-texto",
      '\t\t\t\tpart="imagen"',
      '\t\t\t\tcolor={su color si su imagen es "?" de lo contrario "azul"}>',
      "\t\t\t\t{su imagen}",
      "\t\t\t</es-texto>"
    ])
    expect(lines[11]).toBe(
      '\t\tdevolver <es-elemento tipo="encabezado" aria-label="Jugar solo">Klondike<es-emergente contenido="Jugar solo" invertido tamano="pequeño"/></es-elemento>'
    )
  })

  test("a form control's `name` binds a property:  its name in the other language, as code names it", () => {
    const source = `a "card" is a view where:
	- its "picture" is a text
	- its "pictureColor" is a text
	- to draw it:
		return <ui-text><ui-input name="picture"/><ui-input name="pictureColor" placeholder="Auto play"/><ui-input name="zip"/></ui-text>
`
    const names = { ...NAMES, names: { ...NAMES.names, pictureColor: "color de imagen" } }
    expect(translated(source, { names })[4]).toBe(
      '\t\tdevolver <es-texto><es-entrada name="imagen"/><es-entrada name="colorDeImagen" placeholder="Jugar solo"/><es-entrada name="zip"/></es-texto>'
    )
  })

  test("without Spell UI's names, its tags stay as written", () => {
    expect(translated(CARD, { ui: false })[5]).toBe("\t\t\t<ui-text")
  })

  test("a style sheet's selectors:  Spell UI's tags, the project's own things' attributes and parts", () => {
    const elements = elementNames()
    const css = [
      '/* a pile by its layout, e.g. <solitaire-pile layout="stacked"> */',
      ".board {",
      "  --ui-grid-gutter: 2rem;",
      '  ui-item[type="header"] { color: red }',
      "}",
      '[layout="stacked"] > *, [layout]::part(placeholder) { margin: 0 }',
      "solitaire-pile[layout] { display: flex }",
      "@media (min-width: 40rem) { div.Board { gap: 1rem } }"
    ].join("\n")
    expect(elements.translateStyles(css).split("\n")).toEqual([
      '/* a pile by its layout, e.g. <solitaire-pile layout="stacked"> */',
      ".board {",
      "  --ui-grid-gutter: 2rem;",
      '  es-elemento[tipo="encabezado"] { color: red }',
      "}",
      '[disposición="apilada"] > *, [disposición]::part(marcador) { margin: 0 }',
      "solitario-pila[disposición] { display: flex }",
      "@media (min-width: 40rem) { div.Board { gap: 1rem } }"
    ])
  })
})

////////////////
// ## Helpers
////////////////

/** Elements named with `NAMES`, Spell UI's fake names, Solitaire as Solitario. */
function elementNames({ ui = true, names: data = NAMES }: { ui?: boolean; names?: NamesData } = {}) {
  const names = new TranslationNames(data, { from: ENGLISH, to: SPANISH })
  return new ElementNames({
    names,
    ui: ui ? UI_SPANISH : undefined,
    projectName: { ours: "Solitaire", theirs: "Solitario" }
  })
}

/** `source` (one English file), translated with `NAMES` and Spell UI's names:  its lines. */
function translated(source: string, options: { ui?: boolean; names?: NamesData } = {}): string[] {
  const { files } = parseSpellProject([{ path: "/Card.spell", contents: source }])
  const elements = elementNames(options)
  const translator = new Translator({ from: ENGLISH, to: SPANISH, names: elements.names, elements })
  return translator.translateFile({ path: "/Card.spell", contents: source, match: files[0]!.match }).lines
}
