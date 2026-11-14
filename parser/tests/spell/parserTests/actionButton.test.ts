import { describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { PY } from "spell/parser/py"
import { parseSpellProject } from "spell/parser/spell/test"

/**
 * `<action "auto play"/>`:  a button for one of the program's actions, in a drawing (`action_button`, epic `language`;
 * Owen, 2026-11-13), compiled by every target.
 */
describe("an action's button, <action>", () => {
  /** `lines`, one file:  its match, its errors. */
  const parsed = (lines: string[], path = "/Game.spell") => {
    const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
    return file!
  }

  /** A game with three actions, one with a title and a key, drawing `drawing`. */
  const game = (...drawing: string[]) => [
    "a game is an app",
    "\tto auto play",
    "\t\tshortcut A",
    "\t\tundoable",
    "\t\tprint 1",
    '\tto "restart the game" with title "Restart"',
    "\t\tprint 2",
    "\tto draw it",
    "\t\t<toolbar>",
    ...drawing.map((line) => `\t\t\t${line}`),
    "\t\t</toolbar>",
    "\tto cheat",
    "\t\tprint 3"
  ]

  test("javascript:  the core draws it, from the action;  the tag's attributes after", () => {
    const file = parsed(
      game(
        '<action "auto play"/>',
        '<action "restart the game" icon="refresh"/>',
        '<action "undo" icon-only class="Undo"/>',
        // declared below the drawing
        '<action "cheat">Peek</action>'
      )
    )
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('core.drawAction(this, "autoPlay")')
    expect(file.compiled).toContain('core.drawAction(this, "restartTheGame", { icon: "refresh" })')
    expect(file.compiled).toContain('core.drawAction(this, "undo", { class: "Undo", "icon-only": true })')
    expect(file.compiled).toContain('core.drawAction(this, "cheat", {}, "Peek")')
  })

  test("TypeScript:  the same call, in braces inside its parent's JSX", () => {
    const file = parsed(game('<action "auto play" size="small"/>'))
    const ts = String(P.TSWriter.instance.writeMatch(file.match!))
    expect(ts).toContain('{core.drawAction(this, "autoPlay", { size: "small" })}')
  })

  test("Python:  the core draws it, by Python's names;  its page's half draws it as javascript does", () => {
    const file = parsed(game('<action "auto play" size="small"/>', '<action "undo" icon-only/>'))
    const python = String(PY.PyWriter.instance.writeMatch(file.match!))
    expect(python).toContain('core.draw_action(self, "auto_play", {"size": "small"})')
    expect(python).toContain('core.draw_action(self, "undo", {"icon-only": True})')
    const page = String(PY.ElementsWriter.instance.writeMatch(file.match!))
    expect(page).toContain('core.drawAction(this, "autoPlay", { size: "small" })')
  })

  test("an action named nowhere in the program:  refused, naming it", () => {
    const file = parsed(game('<action "fly away"/>'))
    expect(file.errors.join("\n")).toContain('<action "fly away"> names no action here')
  })

  test("Spanish:  <acción>, its own app actions' words", () => {
    const file = parsed(
      [
        "un juego es una app",
        "\tpara jugar solo",
        "\t\timprimir 1",
        "\tpara dibujarlo",
        '\t\t<barra-herramientas><acción "jugar solo"/><acción "deshacer" icon-only/></barra-herramientas>'
      ],
      "/Juego.es.spell"
    )
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('core.drawAction(this, "jugarSolo")')
    expect(file.compiled).toContain('core.drawAction(this, "undo", { "icon-only": true })')
  })

  test("with no quoted word, <action> is a tag as before:  Spell UI's menu item", () => {
    const file = parsed(game("<action>Open</action>"))
    expect(file.compiled).not.toContain("core.drawAction")
  })

  test("<context-menu> inside an element:  its right-click menu, its actions and dividers, in every target", () => {
    const file = parsed(
      game(
        "<context-menu>",
        '\t<action "auto play"/>',
        "\t<divider/>",
        '\t<action "undo"/>',
        "</context-menu>",
        // a divider anywhere else is a tag as before:  Spell UI's, where its pack is loaded
        "<divider/>"
      )
    )
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('core.drawContextMenu(this, ["autoPlay", "-", "undo"])')
    expect(file.compiled).toContain('h("divider")')
    const ts = String(P.TSWriter.instance.writeMatch(file.match!))
    expect(ts).toContain('{core.drawContextMenu(this, ["autoPlay", "-", "undo"])}')
    const python = String(PY.PyWriter.instance.writeMatch(file.match!))
    expect(python).toContain('core.draw_context_menu(self, ["auto_play", "-", "undo"])')
  })

  test("<context-menu> holds only its items:  anything else, or an action named nowhere, is an error", () => {
    const other = parsed(game("<context-menu>", "\t<text>Hi</text>", "</context-menu>"))
    expect(other.errors.join("\n")).toContain("<context-menu> holds only its items")
    const unknown = parsed(game("<context-menu>", '\t<action "fly away"/>', "</context-menu>"))
    expect(unknown.errors.join("\n")).toContain('<action "fly away"> names no action here')
  })

  test("Spanish:  <menú-contextual>, its <divisor/>", () => {
    const file = parsed(
      [
        "un juego es una app",
        "\tpara jugar solo",
        "\t\timprimir 1",
        "\tpara dibujarlo",
        '\t\t<cuadricula><menú-contextual><acción "jugar solo"/><divisor/><acción "deshacer"/></></cuadricula>'
      ],
      "/Juego.es.spell"
    )
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('core.drawContextMenu(this, ["jugarSolo", "-", "undo"])')
  })

  test("a drawing that is only an action's button, or only a menu:  each its own, not a plain tag (I78)", () => {
    /** A game with one action, drawing `drawing`:  the lines of its drawing, no element around them. */
    const drawn = (...drawing: string[]) =>
      parsed(["a game is an app", "\tto deal", "\t\tprint 1", "\tto draw it", ...drawing.map((line) => `\t\t${line}`)])
    for (const button of ['<action "deal"/>', '<action "deal"></action>']) {
      const file = drawn(button)
      expect(file.errors, button).toEqual([])
      expect(file.compiled, button).toContain('return core.drawAction(this, "deal")')
    }
    const menu = drawn("<context-menu>", '\t<action "deal"/>', "</>")
    expect(menu.errors).toEqual([])
    expect(menu.compiled).toContain('return core.drawContextMenu(this, ["deal"])')
    const spanish = parsed(
      ["un juego es una app", "\tpara repartir", "\t\timprimir 1", "\tpara dibujarlo", '\t\t<acción "repartir"/>'],
      "/Juego.es.spell"
    )
    expect(spanish.errors).toEqual([])
    expect(spanish.compiled).toContain('return core.drawAction(this, "repartir")')
  })
})
