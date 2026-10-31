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
        "\t</action>",
        "</spell-view>",
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
      [
        '<spell-thing "card" />',
        "",
        "<spell>",
        "\tto play a card",
        "\t\tprint 1",
        "\tplay a new card",
        "</spell>",
        ""
      ].join("\n")
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
        "\t</spell>",
        "</spell-view>",
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
