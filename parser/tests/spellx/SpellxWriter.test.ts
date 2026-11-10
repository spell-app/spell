import { readFileSync } from "fs"
import { beforeAll, describe, expect, test } from "vite-plus/test"

import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"
import { SX } from "spell/parser/spellx"

/**
 * A `.spell` file written as spellx (epic `elemental-spell` P12):  `SX.SpellxWriter`.
 * - Every pair's `.spell` (spell's `tests/spell/spellx/`) converts to a `.spellml` that compiles to the same code.
 * - Then what it writes for each kind of line, English and Spanish.
 * - spell-app's `spellxExamples.test.ts` converts every built-in example the same way.
 */
describe("SpellxWriter:  a .spell file as spellx", () => {
  beforeAll(registerTestComponentPack)

  test.each(["Card", "FlipTile", "Deck", "Scores", "Carta.es", "Ficha.es", "DoubleSidedView", "Solitaire"])(
    "%s.spell converts to spellx that compiles to the same code",
    (name) => {
      const text = readFileSync(new URL(`../spell/spellx/${name}.spell`, import.meta.url), "utf8")
      const spell = compiled(`/${name}.spell`, text)
      const back = compiled(`/${name}.spellml`, converted(`/${name}.spell`, text))
      expect(spell.errors).toEqual([])
      expect(back.errors).toEqual([])
      expect(back.code).toBe(spell.code)
    }
  )

  test("an undoable action:  bare, it goes by its title;  or named otherwise, as spellx and back", () => {
    const text = [
      'a "tile" is a view where:',
      "\t- to flip it:",
      '\t\t- titled "Flip"',
      "\t\t- undoable",
      "\t\tnotify 1",
      "\t- to turn it:",
      '\t\t- undoable as "Turn Tile"',
      "\t\tnotify 2"
    ].join("\n")
    const spell = compiled("/Tile.spell", text)
    expect(spell.errors).toEqual([])
    expect(spell.code).toContain('undoneAs: "Flip"')
    expect(spell.code).toContain('undoneAs: "Turn Tile"')
    const spellx = converted("/Tile.spell", text)
    expect(spellx).toMatch(/\bundoable(?!=)/)
    expect(spellx).toContain('undoable="Turn Tile"')
    const back = compiled("/Tile.spellml", spellx)
    expect(back.errors).toEqual([])
    expect(back.code).toBe(spell.code)
  })

  test("a paragraph's blank line stays:  its line break, compiled the same (Owen, 2026-10-27)", () => {
    const lines = [
      'a "note" is a view where:',
      "\t- to draw:",
      "\t\t<ui-text paragraph>",
      "\t\t\tFirst line",
      "",
      "\t\t\tSecond line",
      "\t\t</ui-text>"
    ]
    const spellx = converted("/Note.spell", lines)
    expect(spellx).toContain("First line\n\n\t\t\tSecond line")
    const spell = compiled("/Note.spell", lines.join("\n"))
    const back = compiled("/Note.spellml", spellx)
    expect([back.errors, back.code]).toEqual([[], spell.code])
    expect(spell.code).toContain("First line\\n\\nSecond line")
  })

  test("a stored property with a type:  its type=, its body where it starts (J117)", () => {
    const lines = [
      'a "counter" is a view where:',
      '\t- its "count" is a number starting at 0',
      '\t- its "label" is a text'
    ]
    const spellx = converted("/Counter.spell", lines)
    expect(spellx).toContain('<property "count" type="number">0</>')
    expect(spellx).toContain('<property "label" type="text" />')
    const spell = compiled("/Counter.spell", lines.join("\n"))
    expect(spell.errors).toEqual([])
    expect(spell.code).toContain("init: () => 0")
    expect(compiled("/Counter.spellml", spellx)).toEqual(spell)
    const owen = '<spell-view "counter">\n\t<property "count" type="number">0</property>\n</spell-view>'
    expect(compiled("/Counter.spellml", owen).code).toContain("init: () => 0")
  })

  test("a measure keeps its unit:  its line stays, as `type=` would say only what it measures (epic `data` P33)", () => {
    const lines = ['a "person" is a view where:', '\t- its "height" is a length in cm']
    const spellx = converted("/Person.spell", lines)
    expect(spellx).toContain('- its "height" is a length in cm')
    expect(spellx).not.toContain('type="length"')
    expect(compiled("/Person.spellml", spellx)).toEqual(compiled("/Person.spell", lines.join("\n")))
  })

  test("a typed property with only a comment after it has no start value", () => {
    const lines = ['a "person" is a view where:', '\t- its "age" is a number   // in years']
    const spell = compiled("/Person.spell", lines.join("\n"))
    expect(compiled("/Person.spellml", converted("/Person.spell", lines))).toEqual(spell)
    expect(spell.errors).toEqual([])
  })

  test("a stored property in Spanish reads the same", () => {
    const spellx = '<encanto-vista "contador">\n\t<propiedad "cuenta" tipo="número">0</>\n</encanto-vista>'
    const spell = 'un "contador" es una vista donde:\n\t- su "cuenta" es un número empezando en 0'
    const read = compiled("/Contador.es.spellml", spellx)
    expect(read.errors).toEqual([])
    expect(read.code).toContain("init: () => 0")
    expect(read.code).toBe(compiled("/Contador.es.spell", spell).code)
  })

  test("a typed property's body is one value:  worked-out lines say so", () => {
    const { errors } = compiled(
      "/Counter.spellml",
      '<spell-view "counter">\n\t<property "count" type="number">\n\t\t1 + 1\n\t</property>\n</spell-view>'
    )
    expect(JSON.stringify(errors.map((error) => `${error}`))).toContain("type=")
  })

  test("a template and its members, each as its tag", () => {
    const spellx = converted("/Card.spell", [
      'a "card" is a view where:',
      '\t- its "suit" is one of clubs, hearts',
      '\t\t- it "is a (suit)"',
      '\t- its "rank" is 1',
      "\t// turns it",
      "\t- to turn it over:",
      "\t\tprint 1"
    ])
    expect(spellx).toBe(
      [
        '<spell-view "card">',
        '\t<property "suit" one-of="clubs, hearts" alias="is a (suit)" />',
        '\t<property "rank">1</>',
        '\t<action "turn it over" description="turns it">',
        "\t\tprint 1",
        "\t</>",
        "</>",
        ""
      ].join("\n")
    )
  })

  test("what has no tag goes in a <spell> chunk, as written", () => {
    const spellx = converted("/Game.spell", [
      'a "card" is a thing',
      "",
      "to play a card",
      "\tprint 1",
      "play a new card"
    ])
    expect(spellx).toBe(
      ['<spell-thing "card" />', "", "<spell>", "\tto play a card", "\t\tprint 1", "\tplay a new card", "</>", ""].join(
        "\n"
      )
    )
  })

  // J83:  spellx would read `<div>` as a component's bare name, so the member stays code spell
  test("a member drawing the web's own elements goes in a <spell> chunk, as written;  the others are tags", () => {
    const lines = [
      'a "box" is a view where:',
      '\t- its "label" is "hi"',
      "\t- to draw it:",
      '\t\treturn <div class="Box"><ui-text>{its label}</ui-text></div>'
    ]
    const spellx = converted("/Box.spell", lines)
    expect(spellx).toBe(
      [
        '<spell-view "box">',
        '\t<property "label">"hi"</>',
        "\t<spell>",
        "\t\t- to draw it:",
        '\t\t\treturn <div class="Box"><ui-text>{its label}</ui-text></div>',
        "\t</>",
        "</>",
        ""
      ].join("\n")
    )
    const spell = compiled("/Box.spell", lines.join("\n"))
    const back = compiled("/Box.spellml", spellx)
    expect(back.errors).toEqual([])
    expect(back.code).toBe(spell.code)
  })

  test("a drawing with spell's own tags and components by their tags converts to its tag", () => {
    const spellx = converted("/Box.spell", [
      'a "box" is a view where:',
      "\t- to draw it:",
      "\t\treturn <ui-segment><children/></ui-segment>"
    ])
    expect(spellx).toContain("\t<draw>")
  })

  test("a member's trailing comment goes after its closer", () => {
    const spellx = converted("/Card.spell", ['a "card" is a thing where:', '\t- its "value" is 1\t\t// ace = 1'])
    expect(spellx).toContain('\t<property "value">1</>\t// ace = 1')
  })

  test("a Spanish file is written in Spanish spellx", () => {
    const spellx = converted("/Carta.es.spell", [
      'una "carta" es una vista donde:',
      '\t- su "palo" es uno de tréboles, corazones',
      "\t- para voltearla:",
      "\t\timprimir 1"
    ])
    expect(spellx).toContain('<encanto-vista "carta">')
    expect(spellx).toContain('\t<propiedad "palo" uno-de="tréboles, corazones" />')
    expect(spellx).toContain('\t<acción "voltearla">')
  })

  // epic `debut` I97, epic `language` P13
  test.each([
    {
      path: "/Game.spell",
      lines: ["game is an app where:", "\t// deals, slowly", "\t- to deal the cards:", "\t\tpause for 50 msec"],
      tag: '\t<action "deal the cards" description="deals, slowly">'
    },
    {
      path: "/Juego.es.spell",
      lines: ["juego es una aplicación donde:", "\t- para repartir las cartas:", "\t\tpausar 50 milisegundos"],
      tag: '\t<acción "repartir las cartas">'
    }
  ])("an action that waits needs no word of its own:  $path, and back", ({ path, lines, tag }) => {
    const spellx = converted(path, lines)
    expect(spellx).toContain(tag)
    const spell = compiled(path, lines.join("\n"))
    const back = compiled(path.replace(/\.spell$/, ".spellml"), spellx)
    expect(spell.errors).toEqual([])
    expect([back.errors, back.code]).toEqual([[], spell.code])
  })

  // epic `notebook` P6:  the way back from the Spell view of an example on a page
  describe("writeMarkup():  code spell markup as spellx, the way back from `CodeSpellWriter.writeMarkup()`", () => {
    const words: Record<string, string> = { "ui-button": "button", "counter-counter": "counter", "ui-text": "text" }
    const back = (markup: string) =>
      SX.SpellxWriter.writeMarkup(markup, { path: "/Counter.spellml", componentWord: (tag) => words[tag] })

    test("each tag a bare name gives, that name again;  holes, attributes and other tags as written", () => {
      expect(back('<counter-counter/>\n<ui-button color="primary" onClick={count up}>Go {its count}</ui-button>')).toBe(
        '<counter/>\n<button color="primary" onClick={count up}>Go {its count}</button>'
      )
      expect(back("<ui-label>a < b</ui-label>")).toBe("<ui-label>a < b</ui-label>")
    })

    test("nested, on several lines, at their own indent", () => {
      expect(back("<ui-text>\n\t<ui-button>Go</ui-button>\n</ui-text>")).toBe("<text>\n\t<button>Go</button>\n</text>")
    })

    test("an <html> block's markup and a <markdown> block's text as written", () => {
      expect(back("<ui-button>Go</ui-button>\n<html><ui-button>Raw</ui-button></html>")).toBe(
        "<button>Go</button>\n<html><ui-button>Raw</ui-button></html>"
      )
      expect(back("<markdown>\n\t<ui-button> in a sentence\n</markdown>")).toBe(
        "<markdown>\n\t<ui-button> in a sentence\n</markdown>"
      )
    })

    // epic `notebook` T4
    test.each([
      ["a block on its lines, with other markup", "<html>\n\t<div>x</div>\n</html>\n<button>Go</button>"],
      ["a block on one line, with other markup", "<html><div>x</div></html>\n<button>Go</button>"],
      ["markup first", "<button>Go</button>\n<html><b>y</b></html>"]
    ])("there and back, %s:  the <html> block as written", (_case, spellx) => {
      const spell = SX.CodeSpellWriter.writeMarkup(spellx, { path: "/Counter.spellml" })
      expect(spell).toContain("<html>")
      expect(spell).toContain("<ui-button>Go</ui-button>")
      expect(SX.SpellxWriter.writeMarkup(spell, { path: "/Counter.spellml" })).toBe(spellx)
    })

    test("there and back:  an example's spellx, its code spell, and its spellx again", () => {
      const spellx = "<text>\n\t<button>Go</>\n</text>"
      const spell = SX.CodeSpellWriter.writeMarkup(spellx, { path: "/Counter.spellml" })
      expect(spell).toBe("<ui-text>\n\t<ui-button>Go</ui-button>\n</ui-text>")
      // by default a pack's own, by the name after its prefix
      expect(SX.SpellxWriter.writeMarkup(spell, { path: "/Counter.spellml" })).toBe(
        "<text>\n\t<button>Go</button>\n</text>"
      )
    })
  })
})

/** `text` (a `.spell` file at `path`) written as spellx. */
function converted(path: string, text: string | string[]): string {
  const contents = Array.isArray(text) ? text.join("\n") : text
  const [file] = parseSpellProject([{ path, contents }]).files
  return SX.SpellxWriter.write({ text: contents, match: file!.match!, scope: file!.scope })
}

/**
 * The file at `path` compiled:  its CODE alone, and its parse errors.
 * - without its `SPELL: DECLARES` comments and line comments:  they say where each declaration is
 */
function compiled(path: string, contents: string) {
  const [file] = parseSpellProject([{ path, contents }]).files
  const code = file!.compiled
    .replace(/\/\*! SPELL: DECLARES[^]*?\*\//g, "")
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("//"))
    .join("\n")
  return { code, errors: file!.errors }
}
