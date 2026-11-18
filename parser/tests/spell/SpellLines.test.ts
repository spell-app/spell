import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"

/** A line of Spell read on its own:  `spell repl`'s and the editor's Spell Console's (epic `editor` P32). */
describe("SP.parseLine()", () => {
  test("an expression:  its javascript", () => {
    const line = SP.parseLine("3 + 4", SP.lineScope())
    expect(line).toMatchObject({ rule: "expression", compiled: "(3 + 4)" })
    expect(line.error).toBeUndefined()
  })

  test("with commit, what a line declares later lines know", () => {
    const scope = SP.lineScope()
    expect(SP.parseLine("x is 3", scope, { commit: true }).compiled).toBe("export const x = 3")
    expect(SP.parseLine("x + 4", scope, { commit: true }).compiled).toBe("(x + 4)")
  })

  test("words it can't read are an error, never dropped", () => {
    const line = SP.parseLine("foo bar baz", SP.lineScope())
    expect(line.error).toBeTruthy()
    expect(line.compiled).toBeUndefined()
  })
})
