import { describe, expect, test } from "vite-plus/test"

import { LSP } from "spell/app/lsp"

const { AppAddresses } = LSP

describe("AppAddresses (epic `codemirror` P1)", () => {
  test("a file's address is `spell:/` and its path, readable", () => {
    expect(AppAddresses.uriOf("@spell/examples/Solitaire/Solitaire.spell")).toBe(
      "spell:/@spell/examples/Solitaire/Solitaire.spell"
    )
    expect(AppAddresses.uriOf("owen@spell/my cards/Carta.es.spell")).toBe("spell:/owen@spell/my%20cards/Carta.es.spell")
  })

  test("reads back every path it writes, `#` and `?` in it too", () => {
    for (const path of ["@spell/examples/Solitaire/Card.spell", "a/ñandú #1?.spell", "x/100%.spell"]) {
      expect(AppAddresses.pathOf(AppAddresses.uriOf(path)), path).toBe(path)
    }
  })

  test("reads an encoded spelling of an address too, and leaves a line after it out", () => {
    expect(AppAddresses.pathOf("spell:/%40spell/examples/Solitaire/Card.spell")).toBe(
      "@spell/examples/Solitaire/Card.spell"
    )
    expect(AppAddresses.pathOf("spell:///@spell/x/Card.spell")).toBe("@spell/x/Card.spell")
    expect(AppAddresses.pathOf("spell:/@spell/x/Card.spell#L12")).toBe("@spell/x/Card.spell")
    expect(AppAddresses.pathOf({ scheme: "spell", path: "/@spell/x/Card.spell" })).toBe("@spell/x/Card.spell")
  })

  test("not ours:  another scheme", () => {
    expect(AppAddresses.pathOf("file:///Users/x/Card.spell")).toBeUndefined()
    expect(AppAddresses.pathOf({ scheme: "spell-help", path: "/x" })).toBeUndefined()
  })
})
