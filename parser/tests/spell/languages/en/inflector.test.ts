import { describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { englishInflector } from "spell/parser/spell/languages/en/inflector"

describe("English's inflector", () => {
  test("makes words singular and plural", () => {
    expect(englishInflector.singularize("cards")).toBe("card")
    expect(englishInflector.pluralize("card")).toBe("cards")
    expect(englishInflector.singularize("people")).toBe("person")
    expect(englishInflector.plurality("sheep")).toBe("either")
    expect(englishInflector.plurality("cards")).toBe("plural")
  })

  test("names a type and a thing of it, accents kept", () => {
    expect(englishInflector.typeCase("bank-accounts")).toBe("BankAccount")
    expect(englishInflector.typeCase("árbol")).toBe("Árbol")
    expect(englishInflector.typeCase("niño-pequeño")).toBe("NiñoPequeño")
    expect(englishInflector.instanceCase("Piles")).toBe("pile")
  })

  test("is the fallback out of a parse", () => {
    expect(P.Inflector.fallback).toBe(englishInflector)
    expect(P.singularize("cards")).toBe("card")
  })

  test("another language's is in play while it's used", () => {
    const shouting = new P.Inflector({
      lang: "xx",
      singular: (word) => word.toUpperCase(),
      plural: (word) => `${word}!`
    })
    expect(P.Inflector.using(shouting, () => P.singularize("card"))).toBe("CARD")
    expect(P.singularize("cards")).toBe("card")
  })
})
