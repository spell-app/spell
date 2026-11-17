import { beforeAll, describe, expect, test } from "vite-plus/test"

import { PY } from "spell/parser/py"
import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/**
 * A menu reused by its name as a right-click menu (epic `language` T156;  Owen, 2026-11-17):
 * `<context-menu "game menu" />` inside an element, or `context-menu="game menu"` on it.
 */
describe("a right-click menu reusing a menu by its name", () => {
  beforeAll(registerTestComponentPack)

  /** `lines`, one file:  its match, its errors. */
  const parsed = (lines: string[], path = "/Game.spell") => {
    const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
    return file!
  }

  /** A game drawing its menu, then `drawing`. */
  const game = (...drawing: string[]) => [
    "game is an app",
    "\tto draw game",
    '\t\t<menu "game menu">',
    '\t\t\t<action "deal" />',
    "\t\t</>",
    ...drawing.map((line) => `\t\t${line}`),
    "\tto deal",
    "\t\tprint 1"
  ]

  test('<context-menu "game menu" />:  the core reuses the menu, by its name, in every target', () => {
    const file = parsed(game("<segment>", '\t<context-menu "game menu" />', "\t<text>Hi</>", "</>"))
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('core.drawContextMenu(this, [{ menu: "game menu" }])')
    const python = String(PY.PyWriter.instance.writeMatch(file.match!))
    expect(python).toContain('core.draw_context_menu(self, [{"menu": "game menu"}])')
    const page = String(PY.ElementsWriter.instance.writeMatch(file.match!))
    expect(page).toContain('core.drawContextMenu(this, [{ menu: "game menu" }])')
  })

  test('<context-menu "game menu"> holding its own items:  they come first;  a <separator/> between, if written', () => {
    const file = parsed(
      game(
        "<segment>",
        '\t<context-menu "game menu">',
        '\t\t<action "deal" title="Again" />',
        "\t\t<separator />",
        "\t</>",
        "</>"
      )
    )
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain(
      'core.drawContextMenu(this, [["deal", { title: "Again" }], "-", { menu: "game menu" }])'
    )
  })

  test('context-menu="game menu":  written as it is, the page finds the menu by its name', () => {
    const file = parsed(game('<segment context-menu="game menu">', "\t<text>Hi</>", "</>"))
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('h("ui-segment", { "context-menu": "game menu" },')
  })

  test("a template's menu counts too, any case or spacing", () => {
    const file = parsed([
      "game is an app",
      '\tits "game menu" is a menu of "deal"',
      "\tto draw game",
      '\t\t<segment context-menu="GameMenu"><text>Hi</></>',
      "\tto deal",
      "\t\tprint 1"
    ])
    expect(file.errors).toEqual([])
  })

  test("a name no menu has:  refused, naming it, in both shapes", () => {
    const file = parsed(game('<segment context-menu="nope">', '\t<context-menu "nada" />', "</>"))
    const errors = file.errors.join("\n")
    expect(errors).toContain('context-menu="nope" names no menu here')
    expect(errors).toContain('<context-menu "nada"> names no menu here')
  })

  test('Spanish:  <menú-contextual "..." /> and menú-contextual="...", the attribute the web\'s context-menu', () => {
    const file = parsed(
      [
        "juego es una aplicación",
        "\tpara dibujar eso",
        '\t\t<menu "menú del juego">',
        '\t\t\t<acción "repartir" />',
        "\t\t</>",
        '\t\t<texto menú-contextual="menú del juego">',
        '\t\t\t<menú-contextual "menú del juego" />',
        "\t\t</>",
        "\tpara repartir",
        "\t\timprimir 1"
      ],
      "/Juego.es.spell"
    )
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('h("es-texto", { "context-menu": "menú del juego" },')
    expect(file.compiled).toContain('core.drawContextMenu(this, [{ menu: "menú del juego" }])')
  })

  test("<separator/> is <divider/>:  a menu's line, else Spell UI's divider;  Spanish's <separador/>", () => {
    const file = parsed(game("<text>A</>", "<separator />", '<menu><action "deal" /><separator /></>'))
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('h("ui-divider")')
    expect(file.compiled).toContain('h("ui-action", { kind: "divider" })')
    const spanish = parsed(
      ["juego es una aplicación", "\tpara dibujar eso", "\t\t<texto>A</>", "\t\t<separador />"],
      "/Juego.es.spell"
    )
    expect(spanish.errors).toEqual([])
    expect(spanish.compiled).toContain('h("es-divisor")')
  })
})
