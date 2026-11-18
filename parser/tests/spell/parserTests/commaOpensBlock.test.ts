import { describe, expect, test } from "vite-plus/test"

import { PY } from "spell/parser/py"
import { parseSpellProject } from "spell/parser/spell/test"

/**
 * A comma works as `:` does after a BLOCK OPENER (epic `language` J269;  Owen, 2026-11-18):
 * `if the result is ok, set the name of the baby to it`.
 * - Only before a body of statements:  `if`, `otherwise`, `for each`, `every`, `when`, `meanwhile` ...
 * - A comma inside the opener's own words still reads as it did:  `one of 1, 2, 3`, `for each card, position in ...`
 * - NOT after a definition (`... is:`) or a list's header (`where:`):  a comma there still means a list.
 */
describe("a comma after a block opener", () => {
  /** `lines`, one file:  its match, its errors. */
  const parsed = (lines: string[], path = "/Game.spell") => {
    const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
    return file!
  }

  /** `file` written in Python. */
  const python = (file: ReturnType<typeof parsed>) => String(PY.PyWriter.instance.writeMatch(file.match!))

  test("Owen's:  `if the result is ok, set the name of the baby to it`", () => {
    const file = parsed([
      "a baby has a name",
      "game is an app",
      "\tit has a baby",
      "\tto name the baby",
      '\t\tprompt "Name?"',
      "\t\tif the result is ok, set the name of the baby to it"
    ])
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('if (core.resultIs("ok")) this.baby.name = it')
    expect(python(file)).toMatch(/if core\.result_is\("ok"\):\s+self\.baby\.name = it/)
  })

  test("`if`, `otherwise if` and `otherwise`, each with a comma;  in Python too", () => {
    const file = parsed([
      "a card has a rank as number",
      "\tto check it",
      "\t\tif its rank is 1, print 1",
      "\t\totherwise if its rank is 2, print 2",
      "\t\totherwise, print 3"
    ])
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain("if (this.rank === 1) core.console.log(1)")
    expect(file.compiled).toContain("else if (this.rank === 2) core.console.log(2)")
    expect(file.compiled).toContain("else core.console.log(3)")
    expect(python(file)).toMatch(
      /if self\.rank == 1:\s+print\(1\)\s+elif self\.rank == 2:\s+print\(2\)\s+else:\s+print\(3\)/
    )
  })

  test("a condition holding commas keeps them:  `one of 1, 2, 3`, then the comma ending it", () => {
    const file = parsed([
      "a card has a rank as number",
      "\tto check it",
      "\t\tif its rank is one of 1, 2, 3, print 4",
      "\t\tif its rank is one of 1, 2, 3, print its rank",
      "\t\tif its rank is one of 4, 5, 6",
      "\t\t\tprint 0"
    ])
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain("if (core.includes([1, 2, 3], this.rank)) core.console.log(4)")
    expect(file.compiled).toContain("if (core.includes([1, 2, 3], this.rank)) core.console.log(this.rank)")
    expect(file.compiled).toContain("if (core.includes([4, 5, 6], this.rank)) core.console.log(0)")
  })

  test("`for each`, with a comma after its list;  `for each card, position` keeps its own comma", () => {
    const file = parsed([
      "a card has a rank as number",
      "a pile has cards",
      "\tto show it",
      "\t\tfor each card in its cards, print card",
      "\t\tfor each card, position in its cards, print position",
      "\t\tfor each card, position in its cards",
      "\t\t\tprint card"
    ])
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain("core.map(this.cards, (card) => core.console.log(card))")
    expect(file.compiled).toContain("withSpellPositions((card, position_) => core.console.log(position_))")
  })

  test("`every`, `when` a change, `at the same time`, `meanwhile`, `repeat`, each with a comma", () => {
    const file = parsed([
      "a counter has a count as number",
      "\tevery second, add 1 to its count",
      "\twhen its count changes, print its count",
      "\tto start it",
      "\t\tat the same time, print 1",
      "\t\tmeanwhile, print 2",
      "\t\trepeat 3 times, print 3"
    ])
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('core.addTimer(Counter, "everySecond", { seconds: 1 })')
    expect(file.compiled).toContain("this.count = this.count + 1")
    expect(file.compiled).toContain("return core.console.log(this.count)")
    expect(file.compiled).toContain("core.together(() => core.console.log(1))")
    expect(file.compiled).toContain("core.meanwhile(() => core.console.log(2))")
    expect(file.compiled).toContain("core.map(core.countTo(3), () => core.console.log(3))")
  })

  test("in Spanish:  `si ..., ...`, `de lo contrario, ...`, `para cada ..., ...`, `mientras tanto, ...`, `cada ..., ...`", () => {
    const file = parsed(
      [
        "una carta tiene un rango como número",
        "una pila tiene cartas",
        "\tcada segundo, imprimir 5",
        "\tpara comprobarla",
        "\t\tsi su rango es uno de 1, 2, 3, imprimir 1",
        "\t\tde lo contrario, imprimir 2",
        "\t\tpara cada carta en sus cartas, imprimir carta",
        "\t\tmientras tanto, imprimir 3"
      ],
      "/Juego.es.spell"
    )
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain('core.addTimer(Pila, "everySecond", { seconds: 1 })')
    expect(file.compiled).toContain("if (core.includes([1, 2, 3], this.rango)) core.console.log(1)")
    expect(file.compiled).toContain("else core.console.log(2)")
    expect(file.compiled).toContain("core.map(this.cartas, (carta) => core.console.log(carta))")
    expect(file.compiled).toContain("core.meanwhile(() => core.console.log(3))")
  })
})
