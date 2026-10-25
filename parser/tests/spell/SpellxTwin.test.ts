import { readFileSync } from "fs"
import { describe, test, expect } from "vite-plus/test"

import {
  incrementalSpellProject,
  parseSpellProject,
  summarize,
  summarizeIncremental,
  type SpellSourceFile
} from "spell-parser/spell/test"

/**
 * SPELLX read by spell's own rules, as a third style of spell (epic `elemental-spell` P6, Q69 A):
 * each tag line reads as its code-spell twin (`SP.SpellxTwin`), so a `.spellx` file compiles to EXACTLY what its
 * twin `.spell` file does.
 * - The pairs are in `spellx/`:  each `X.spellx` beside the `X.spell` it means.
 *   - `Card`:  o1's playing card, its drawings in `ui-*` markup until P7, and no `pass event` (P9).
 *   - `FlipTile`:  an event, an action's details, a drawing's if-chain placing parts.
 *   - `Deck`:  a template with nothing inside, a list template, bodies on a tag's own line.
 *   - `Scores`:  a page template, an app, a test.
 *   - `DoubleSidedView`:  o1's two sided view, renamed:  two sided view is spell's own template now (J35).
 *   - `Solitaire`:  o1's app, page template and page, without what later phases build (its menus, P10;
 *     the original target, P9;  bare component names and `<for each>` in a drawing, P7).
 *   - `Carta.es`, `Ficha.es`:  Spanish, the card and a tile with an app.
 */
describe("spellx:  a third style of spell", () => {
  test.each(["Card", "FlipTile", "Deck", "Scores", "Carta.es", "Ficha.es", "DoubleSidedView", "Solitaire"])(
    "%s.spellx compiles as its twin, %s.spell, does",
    (name) => {
      const spellx = compiled(`${name}.spellx`)
      const spell = compiled(`${name}.spell`)
      expect(spellx.errors).toEqual([])
      expect(spell.errors).toEqual([])
      expect(spellx.code).toBe(spell.code)
    }
  )

  test("a description becomes the docstring, as the comments above its twin are", () => {
    const { code } = compiledText(
      ['<spell-thing "card">', '\t<property "suit" one-of="clubs, hearts" description="Its suit" />', "</spell-thing>"],
      { keepDocs: true }
    )
    expect(code).toContain("/** Its suit */")
  })

  test("a spellx file and a code-spell file in one project each use what the other declares further down", () => {
    const files: SpellSourceFile[] = [
      { path: "/Game.spell", contents: ["set the card to a new card", "turn the card over"].join("\n") },
      {
        path: "/Card.spellx",
        contents: [
          '<spell-view "card">',
          '\t<property "side" one-of="up, down" />',
          '\t<action "turn it over">set its side to down</>',
          "</spell-view>"
        ].join("\n")
      }
    ]
    const [game, card] = parseSpellProject(files).files
    expect(game!.errors).toEqual([])
    expect(card!.errors).toEqual([])
    expect(game!.compiled).toContain("card.turnOver()")
  })

  test("an edit in a spellx file re-parses as a fresh parse would", () => {
    const text = (body: string) =>
      [
        '<spell-view "card">',
        '\t<property "side" one-of="up, down" />',
        '\t<action "turn it over">',
        `\t\t${body}`,
        "\t</action>",
        "</spell-view>"
      ].join("\n")
    const files: SpellSourceFile[] = [{ path: "/Card.spellx", contents: text("set its side to down") }]
    const project = incrementalSpellProject(files)
    for (const body of ["set its side to up", "print 1", "set its side to down"]) {
      const contents = text(body)
      project.update("/Card.spellx", contents)
      expect(summarizeIncremental(project), body).toEqual(
        summarize(parseSpellProject([{ path: "/Card.spellx", contents }]))
      )
    }
  })

  describe("a mistake is an error on its own line", () => {
    test("a word spellx doesn't know, naming the closest", () => {
      const { errors } = compiledText(['<spell-view "card">', '\t<propety "suit" one-of="a, b" />', "</spell-view>"])
      expect(errors).toEqual(['2:1 "<propety>" isn\'t a spellx word:  did you mean "<property>"?'])
    })

    test("a closer for another tag than the one open", () => {
      const { errors } = compiledText([
        '<spell-view "card">',
        '\t<action "go">',
        "\t\tprint 1",
        "\t</property>",
        "</spell-view>"
      ])
      expect(errors).toEqual(['4:1 "</property>" can\'t close <action>:  write "</>"'])
    })

    test("an <otherwise> after a </> that closed its <if>", () => {
      const { errors } = compiledText([
        '<spell-view "card">',
        '\t<property "side" one-of="up, down" />',
        "\t<draw>",
        "\t\t<if it is up>",
        "\t\t\t<ui-text>up</ui-text>",
        "\t\t</>",
        "\t\t<otherwise>",
        "\t\t\t<ui-text>down</ui-text>",
        "\t\t</>",
        "\t</draw>",
        "</spell-view>"
      ])
      expect(errors[0]).toMatch(/^7:2 <otherwise> goes on with the "if" above it, but a "<\/>" closed that/)
    })

    test("a body's line indented less than the rest of its tag's body", () => {
      const { errors } = compiledText([
        '<spell-view "card">',
        '\t<action "go">',
        "\tprint 1",
        "\t</action>",
        "</spell-view>"
      ])
      expect(errors[0]).toBe(
        "3:1 This line is indented less than the rest of <action>:  indent it one step more than <action>"
      )
    })

    test("a tag never closed", () => {
      const { errors } = compiledText(['<spell-view "card">', '\t<action "go">', "\t\tprint 1", "</spell-view>"])
      expect(errors).toEqual(['2:1 <action> is never closed:  end it with "</>"'])
    })

    test("in Spanish:  in Spanish, on its own line", () => {
      const path = "/prueba.es.spellx"
      const unknown = compiledText(
        ['<encanto-vista "carta">', '\t<propiedd "palo" uno-de="a, b" />', "</encanto-vista>"],
        {
          path
        }
      )
      expect(unknown.errors).toEqual(['2:1 "<propiedd>" no es una palabra de spellx:  ¿querías decir "<propiedad>"?'])
      const unclosed = compiledText(
        ['<encanto-vista "carta">', '\t<acción "ir">', "\t\timprimir 1", "</encanto-vista>"],
        {
          path
        }
      )
      expect(unclosed.errors).toEqual(['2:1 <acción> nunca se cierra:  termínalo con "</>"'])
    })

    test("a tag spellx can't read yet:  a menu (P10)", () => {
      const { errors } = compiledText([
        '<spell-app "game">',
        '\t<menu "GameMenu">',
        '\t\t<action "go" />',
        "\t</menu>",
        "</spell-app>"
      ])
      expect(errors[0]).toBe("2:1 <menu> can't be read yet:  it comes with a later version of spellx")
    })
  })
})

/** Fixture `name`'s compiled code alone, and its errors -- see `compiledText()`. */
function compiled(name: string) {
  return compiledText(readFileSync(new URL(`./spellx/${name}`, import.meta.url), "utf8").split("\n"), {
    path: `/${name}`
  })
}

/**
 * `lines`, one file of its own project, compiled:  the CODE alone, and its parse errors.
 * - without its `SPELL: DECLARES` comments, which say where each declaration is, and its line comments:
 *   the two forms say where and how in their own ways
 * - `keepDocs`:  keep its line comments, to see a docstring
 */
function compiledText(lines: string[], { path = "/test.spellx", keepDocs = false } = {}) {
  const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
  const code = file!.compiled
    .replace(/\/\*! SPELL: DECLARES[^]*?\*\//g, "")
    .split("\n")
    .filter((line) => line.trim() && (keepDocs || !line.trim().startsWith("//")))
    .join("\n")
  return { code, errors: file!.errors }
}
