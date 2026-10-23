import { describe, expect, test } from "vite-plus/test"

import { P } from "spell-parser/parser"

describe("Naming.wordsOf()", () => {
  test("splits at `_`, `$` and a capital, in any script", () => {
    expect(P.Naming.wordsOf("BankAccount")).toEqual(["Bank", "Account"])
    expect(P.Naming.wordsOf("is_a_$suit")).toEqual(["is", "a", "suit"])
    expect(P.Naming.wordsOf("it2")).toEqual(["it2"])
    expect(P.Naming.wordsOf("corazónRojo")).toEqual(["corazón", "Rojo"])
    expect(P.Naming.wordsOf("ÁrbolViejo")).toEqual(["Árbol", "Viejo"])
  })
})

describe("jsText.isLegalIdentifier()", () => {
  test("takes a name in any script, bare", () => {
    expect(P.jsText.isLegalIdentifier("corazón")).toBe(true)
    expect(P.jsText.isLegalIdentifier("Árbol")).toBe(true)
    expect(P.jsText.isLegalIdentifier("esUnTrébol")).toBe(true)
    expect(P.jsText.isLegalIdentifier("it2")).toBe(true)
  })
  test("still refuses what javascript refuses", () => {
    expect(P.jsText.isLegalIdentifier("año nuevo")).toBe(false)
    expect(P.jsText.isLegalIdentifier("2cards")).toBe(false)
    expect(P.jsText.isLegalIdentifier("foo-bar")).toBe(false)
  })
})

describe("constantCaseOf()", () => {
  test("splits before a capital, in any script", () => {
    expect(P.constantCaseOf("ShortNames")).toBe("SHORT_NAMES")
    expect(P.constantCaseOf("Short_Names")).toBe("SHORT_NAMES")
    expect(P.constantCaseOf("CorazónRojo")).toBe("CORAZÓN_ROJO")
  })
})
