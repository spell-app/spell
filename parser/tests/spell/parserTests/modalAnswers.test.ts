import { beforeAll, describe, expect, test } from "vite-plus/test"

import { PY } from "spell/parser/py"
import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/**
 * A modal's answers, HyperTalk's way (epic `language` P64;  Owen, 2026-11-17):
 * - `the result` is the button that closed it (ok, cancel, or the button's own word);  `it` is the value
 * - `show "edit card" with the card`:  the modal draws and edits the card itself;  after it, `it` is the card
 * - an action's value is `the result` only when it runs as a statement (Q70)
 */
describe("a modal's answers:  the result, and it", () => {
  beforeAll(registerTestComponentPack)

  /** `lines`, one file:  its match, its errors. */
  const parsed = (lines: string[], path = "/Game.spell") => {
    const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
    return file!
  }

  /** `file` written in Python. */
  const python = (file: ReturnType<typeof parsed>) => String(PY.PyWriter.instance.writeMatch(file.match!))

  test("prompt:  the text typed is `it`, a new one;  `the result` is ok or cancel", () => {
    const file = parsed([
      "a baby has a name",
      "game is an app",
      "\tit has a baby",
      "\tto name the baby",
      '\t\tprompt "Name?"',
      "\t\tif the result is ok then set the name of the baby to it",
      '\t\tprompt "Again?"',
      "\t\tprint it"
    ])
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('const it = await core.prompt("Name?")')
    expect(file.compiled).toContain('if (core.resultIs("ok")) this.baby.name = it')
    expect(file.compiled).toContain('const it2 = await core.prompt("Again?")')
    expect(file.compiled).toContain("core.console.log(it2)")
    expect(python(file)).toContain('it = await core.prompt("Name?")')
  })

  test("confirm leaves `it` as it was:  its answer is `the result`", () => {
    const file = parsed([
      "a card has a name",
      "\tto delete it",
      '\t\tconfirm "Delete it?"',
      "\t\tif the result is ok then print its name"
    ])
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('await core.confirm("Delete it?")')
    expect(file.compiled).toContain('if (core.resultIs("ok")) core.console.log(this.name)')
  })

  test("a button's own answer, first and bare on <action>:  <action discard />, then `if the result is discard`", () => {
    const file = parsed([
      "game is an app",
      "\tto draw game",
      '\t\t<modal "save first">',
      '\t\t\t<action discard title="Discard your changes" />',
      "\t\t\t<action cancel />",
      "\t\t</>",
      "\tto quit",
      '\t\tshow "save first"',
      '\t\tif the result is discard then print "gone"',
      '\t\tif the result is not Discard then print "kept"'
    ])
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain(
      'core.drawAction(this, "discard", { answer: "discard", title: "Discard your changes", "in-dialog": true })'
    )
    expect(file.compiled).toContain('if (core.resultIs("discard")) core.console.log("gone")')
    expect(file.compiled).toContain('if (!core.resultIs("Discard")) core.console.log("kept")')
    expect(python(file)).toContain('if core.result_is("discard"):')
  })

  test("a bare word on <action> that isn't first, or with a quoted word, is no answer;  a variable is compared as one", () => {
    const file = parsed([
      "game is an app",
      "\tto draw game",
      "\t\t<menu>",
      '\t\t\t<action title="Cut" discard />',
      "\t\t</>",
      "\tto quit",
      '\t\tset choice to "keep"',
      "\t\tif the result is choice then print 1"
    ])
    expect(file.errors).toEqual([])
    expect(file.compiled).not.toContain('answer: "discard"')
    expect(file.compiled).toContain("if (core.resultIs(choice)) core.console.log(1)")
  })

  test("show ... with a thing:  inside the modal `it` is that thing, the thing itself;  after it, `it` is the thing", () => {
    const file = parsed([
      "a card has a name",
      "game is an app",
      "\tit has a card",
      "\tto draw game",
      '\t\t<modal "edit card">',
      "\t\t\t<text>{its name}</>",
      "\t\t\t<action ok />",
      "\t\t</>",
      "\tto edit the card",
      '\t\tshow "edit card" with the card',
      "\t\tprint the name of it"
    ])
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('core.drawShown("edit card", this, (it) => [')
    expect(file.compiled).toContain('h("ui-text", () => it.name)')
    expect(file.compiled).toContain('const it = this.card\n    await core.showDrawn("edit card", it)')
    expect(file.compiled).toContain("core.console.log(it.name)")
    const py = python(file)
    expect(py).toMatch(/core\.draw_shown\(\s+"edit card",\s+self,\s+lambda it: \[/)
    expect(py).toContain('it = self.card\n        await core.show_drawn("edit card", it)')
  })

  test("an action's value is `the result` only as a statement:  used as a value, it goes where it's written (Q70)", () => {
    const file = parsed([
      "game is an app",
      "\tto deal the cards",
      "\t\treturn 3",
      "\tto shuffle",
      '\t\tprint "shuffled"',
      "\tto play",
      "\t\tdeal the cards",
      "\t\tshuffle",
      "\t\tset x to deal the cards",
      "\t\tif the result is 3 then print x"
    ])
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain("core.answered(this.dealTheCards())")
    // gives back nothing:  the result stays as it was
    expect(file.compiled).toContain("    this.shuffle()")
    expect(file.compiled).toContain("const x = this.dealTheCards()")
    const py = python(file)
    expect(py).toContain("core.answered(self.deal_the_cards())")
    expect(py).toContain("x = self.deal_the_cards()")
  })

  test("Spanish:  preguntar, mostrar ... con, <acción descartar />, el resultado es descartar", () => {
    const file = parsed(
      [
        "una carta tiene un nombre",
        "juego es una aplicación",
        "\ttiene una carta",
        "\tpara dibujar eso",
        '\t\t<modal "editar carta">',
        "\t\t\t<texto>{su nombre}</>",
        '\t\t\t<acción descartar título="Descartar los cambios" />',
        "\t\t</>",
        "\tpara repartir las cartas",
        "\t\tdevolver 3",
        "\tpara editar la carta",
        '\t\tmostrar "editar carta" con la carta',
        '\t\tsi el resultado es descartar entonces imprimir "fuera"',
        '\t\tpreguntar "¿Nombre?"',
        "\t\tsi el resultado es aceptar entonces imprimir eso",
        "\t\trepartir las cartas",
        "\t\timprimir el resultado"
      ],
      "/Juego.es.spell"
    )
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('core.drawShown("editar carta", this, (it) => [')
    expect(file.compiled).toContain('answer: "descartar"')
    expect(file.compiled).toContain('const it = this.carta\n    await core.showDrawn("editar carta", it)')
    expect(file.compiled).toContain('if (core.resultIs("descartar")) core.console.log("fuera")')
    expect(file.compiled).toContain('const it2 = await core.prompt("¿Nombre?")')
    expect(file.compiled).toContain('if (core.resultIs("ok")) core.console.log(it2)')
    expect(file.compiled).toContain("core.answered(this.repartirLasCartas())")
  })
})
