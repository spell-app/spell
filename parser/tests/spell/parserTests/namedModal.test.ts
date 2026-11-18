import { beforeAll, describe, expect, test } from "vite-plus/test"

import { PY } from "spell/parser/py"
import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/**
 * `<modal "you won">`:  a modal named by its quoted word, its id and its heading;  `show "you won"` shows it,
 * `hide "you won"` hides it (epic `language` P61;  Owen, 2026-11-17).  A menu and a popup are named the same way.
 */
describe("a named modal, menu or popup, and show / hide by its name", () => {
  beforeAll(registerTestComponentPack)

  /** `lines`, one file:  its match, its errors. */
  const parsed = (lines: string[], path = "/Game.spell") => {
    const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
    return file!
  }

  /** A game drawing `drawing`, which wins by showing the modal and loses by hiding it. */
  const game = (...drawing: string[]) => [
    "game is an app",
    "\tto draw game",
    ...drawing.map((line) => `\t\t${line}`),
    "\tto win",
    '\t\tshow "you won"',
    "\tto lose",
    '\t\thide "you won"'
  ]

  test("javascript:  its name is its id, its words joined by -, and its heading, as written", () => {
    const file = parsed(game('<modal "you won">', "\t<text>Well done</>", "</>"))
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('h("ui-modal", { id: "you-won", heading: "you won" },')
    // what it holds goes in its content part (T155)
    expect(file.compiled).toContain('h("ui-content", h("ui-text", "Well done"))')
    expect(file.compiled).toContain('core.showDrawn("you won")')
    expect(file.compiled).toContain('core.hideDrawn("you won")')
  })

  test("a heading it says itself wins;  its id is still its name", () => {
    const file = parsed(game('<modal "you won" heading="Congratulations!">', "\t<text>Well done</>", "</>"))
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('h("ui-modal", { heading: "Congratulations!", id: "you-won" },')
  })

  test("a menu and a popup are named the same way:  a menu by its id alone, a popup with its heading", () => {
    const file = parsed(
      game('<menu "game menu">', "\t<text>Deal</>", "</>", '<popup "you won">', "\t<text>Yes</>", "</>")
    )
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('h("ui-menu", { id: "game-menu" },')
    expect(file.compiled).toContain('h("ui-popup", { id: "you-won", heading: "you won" },')
  })

  test("an action in a modal closes it, its button in the modal's actions;  a menu's row in it stays a row (T155)", () => {
    const file = parsed([
      "game is an app",
      "\tto draw game",
      '\t\t<modal "you won">',
      "\t\t\t<text>Well done</>",
      '\t\t\t<action "deal" title="New game" />',
      '\t\t\t<menu><action "deal" /></>',
      "\t\t</>",
      "\tto deal",
      "\t\tprint 1"
    ])
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain(
      'h("ui-actions", core.drawAction(this, "deal", { title: "New game", "in-dialog": true }))'
    )
    expect(file.compiled).toContain('h("ui-menu", core.drawAction(this, "deal", { "in-menu": true }))')
    const python = String(PY.PyWriter.instance.writeMatch(file.match!))
    expect(python).toContain('core.draw_action(self, "deal", {"title": "New game", "in-dialog": True})')
  })

  test("a modal that lays out its own parts keeps them:  only an action in its <actions> closes it (T155)", () => {
    const file = parsed([
      "game is an app",
      "\tto draw game",
      '\t\t<modal "you won">',
      "\t\t\t<header>Yes</>",
      '\t\t\t<content><action "deal" title="In content" /></>',
      "\t\t\t<actions>",
      '\t\t\t\t<action "deal" title="Closes" />',
      '\t\t\t\t<action "deal" title="Stays" keep-open />',
      "\t\t\t</>",
      "\t\t</>",
      "\tto deal",
      "\t\tprint 1"
    ])
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('h("ui-content", core.drawAction(this, "deal", { title: "In content" }))')
    expect(file.compiled).toContain('core.drawAction(this, "deal", { title: "Closes", "in-dialog": true })')
    expect(file.compiled).toContain('core.drawAction(this, "deal", { title: "Stays" })')
    expect(file.compiled).not.toContain("keep-open")
  })

  test("Spanish:  <acciones> closes it, mantener-abierto leaves it open (T155)", () => {
    const file = parsed(
      [
        "juego es una aplicación",
        "\tpara dibujar eso",
        '\t\t<modal "ganaste">',
        "\t\t\t<acciones>",
        '\t\t\t\t<acción "repartir" />',
        '\t\t\t\t<acción "repartir" title="Mirar" mantener-abierto />',
        "\t\t\t</>",
        "\t\t</>",
        "\tpara repartir",
        "\t\timprimir 1"
      ],
      "/Juego.es.spell"
    )
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('core.drawAction(this, "repartir", { "in-dialog": true })')
    expect(file.compiled).toContain('core.drawAction(this, "repartir", { title: "Mirar" })')
  })

  test("a quoted word on any other tag still can't be read", () => {
    const file = parsed(game('<text "you won">Well done</>'))
    expect(file.errors.join("\n")).toContain('Can\'t read "you won" in <text>')
  })

  test("Python:  the core shows it by Python's names;  its page draws the modal as javascript does", () => {
    const file = parsed(game('<modal "you won">', "\t<text>Well done</>", "</>"))
    const python = String(PY.PyWriter.instance.writeMatch(file.match!))
    expect(python).toContain('core.show_drawn("you won")')
    expect(python).toContain('core.hide_drawn("you won")')
    expect(python).toContain('{"id": "you-won", "heading": "you won"}')
    const page = String(PY.ElementsWriter.instance.writeMatch(file.match!))
    expect(page).toContain('h("ui-modal", { id: "you-won", heading: "you won" },')
  })

  test("Spanish:  <modal> is <es-modal>, its heading Spell UI's Spanish name;  mostrar / ocultar", () => {
    const file = parsed(
      [
        "juego es una aplicación",
        "\tpara dibujar eso",
        '\t\t<modal "ganaste">',
        "\t\t\t<texto>Bien hecho</>",
        "\t\t</>",
        '\t\t<emergente "pista">',
        "\t\t\t<texto>Mira</>",
        "\t\t</>",
        "\tpara ganar",
        '\t\tmostrar "ganaste"',
        "\tpara perder",
        '\t\tocultar "ganaste"'
      ],
      "/Juego.es.spell"
    )
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('h("es-modal", { id: "ganaste", encabezado: "ganaste" },')
    expect(file.compiled).toContain('h("es-emergente", { id: "pista", encabezado: "pista" },')
    expect(file.compiled).toContain('core.showDrawn("ganaste")')
    expect(file.compiled).toContain('core.hideDrawn("ganaste")')
  })
})
