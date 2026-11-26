/**
 * A yes or no that can be nothing:  `its "passed" is yes, no or nothing` (Spanish `su "aprobado" es sí, no o nada`).
 * - Unset, it reads as nothing (`orNothing`);  `is no` is a real no only;  plain `yes or no` is as it was.
 */
import { describe, expect, test } from "vite-plus/test"

import { PY } from "spell/parser/py"
import { parseSpellProject } from "spell/parser/spell/test"

/** A project of these lines:  its one file's errors and compiled code. */
function compiled(lines: readonly string[], path = "/A.spell") {
  return parseSpellProject([{ path, contents: `${lines.join("\n")}\n` }]).files[0]!
}

const RESULT = [
  `a "result" is a thing:`,
  `\t- its "passed" is yes, no or nothing`,
  `\t- its "done" is yes or no`,
  `\t- its "verdict" is text`,
  `\t- to judge it`,
  `\t\tif its passed is nothing`,
  `\t\t\tset its verdict to "Not scored"`,
  `\t\tif its passed is no`,
  `\t\t\tset its verdict to "Fail"`,
  `\t\tif its passed is yes`,
  `\t\t\tset its verdict to "Pass"`,
  `\t\tif its passed is not no`,
  `\t\t\tset its verdict to "Not a fail"`,
  `\t\tif its done is no`,
  `\t\t\tset its verdict to "Not done"`
]

const RESULTADO = [
  `un "resultado" es una cosa:`,
  `\tsu "aprobado" es sí, no o nada`,
  `\tsu "hecho" es sí o no`,
  `\tsu "veredicto" es texto`,
  `\tpara juzgarlo:`,
  `\t\tsi su aprobado es nada`,
  `\t\t\tponer su veredicto en "Sin puntuar"`,
  `\t\tsi su aprobado es no`,
  `\t\t\tponer su veredicto en "Falla"`,
  `\t\tsi su hecho es no`,
  `\t\t\tponer su veredicto en "Sin hacer"`
]

describe("a yes or no that can be nothing", () => {
  test("declared:  a yes or no, nothing while it's unset", () => {
    const { errors, compiled: code } = compiled(RESULT)
    expect(errors).toEqual([])
    expect(code).toContain(`this.declareProp("passed", { type: "choice", orNothing: true`)
    expect(code).toMatch(/this.declareProp\("done", { type: "choice"(?!, orNothing)/)
  })

  test("`is no` is a real no;  `is nothing` while unset;  `is yes` as any yes or no;  plain `yes or no` as it was", () => {
    const { compiled: code } = compiled(RESULT)
    expect(code).toContain(`if (this.passed === undefined) this.verdict = "Not scored"`)
    expect(code).toContain(`if (this.passed === false) this.verdict = "Fail"`)
    expect(code).toContain(`if (this.passed) this.verdict = "Pass"`)
    expect(code).toContain(`if (this.passed !== false) this.verdict = "Not a fail"`)
    expect(code).toContain(`if (!this.done) this.verdict = "Not done"`)
  })

  test("Python:  `or_nothing=True`, and no is `is False`", () => {
    const python = String(PY.PyWriter.instance.writeMatch(compiled(RESULT).match!))
    expect(python).toContain(`passed = prop(type="choice", or_nothing=True)`)
    expect(python).toContain(`if self.passed is False:`)
    expect(python).toContain(`if self.passed is not False:`)
    expect(python).toContain(`if not self.done:`)
  })

  test("in Spanish:  `sí, no o nada`", () => {
    const { errors, compiled: code } = compiled(RESULTADO, "/A.es.spell")
    expect(errors).toEqual([])
    expect(code).toContain(`this.declareProp("aprobado", { type: "choice", orNothing: true`)
    expect(code).toContain(`if (this.aprobado === undefined)`)
    expect(code).toContain(`if (this.aprobado === false)`)
    expect(code).toContain(`if (!this.hecho)`)
  })
})
