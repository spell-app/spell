import { describe, expect, test } from "vite-plus/test"

import { drawableAttributeFor, elementTagFor } from "spell/util/spell/drawable"

describe("a drawable type's element names", () => {
  test("its tag:  the project's name as written, without the word drawable, then the class's", () => {
    expect(elementTagFor("Solitaire", "Card")).toBe("solitaire-card")
    expect(elementTagFor("Drawable Solitaire", "StockPile")).toBe("solitaire-stock-pile")
    expect(elementTagFor("test_classes", "Card")).toBe("test-classes-card")
  })

  test("a Spanish program's:  its own names, without the word dibujable, accents dropped", () => {
    expect(elementTagFor("cartas", "Carta")).toBe("cartas-carta")
    expect(elementTagFor("Solitario Dibujable", "PilaDeDescarte")).toBe("solitario-pila-de-descarte")
    expect(elementTagFor("Canciones", "Canción")).toBe("canciones-cancion")
    expect(elementTagFor("Diseño", "Año")).toBe("diseno-ano")
  })

  test("a property's attribute, by its declared type", () => {
    expect(drawableAttributeFor("shortRank", "number")).toEqual({
      name: "short-rank",
      property: "shortRank",
      kind: "number",
      description: "Its shortRank."
    })
    expect(drawableAttributeFor("rank")?.kind).toBe("string")
    expect(drawableAttributeFor("faceUp", "choice")?.kind).toBe("boolean")
    expect(drawableAttributeFor("cards", "list")?.kind).toBe("json")
    // a thing, or the list holding it:  its reference, as text
    expect(drawableAttributeFor("home", "Pile")).toMatchObject({ kind: "string", reference: "thing" })
    expect(drawableAttributeFor("pile", "Pile", true)).toMatchObject({ kind: "string", reference: "owner" })
  })

  test("none for a name the page or Spell UI already means something by", () => {
    expect(drawableAttributeFor("id")).toBeUndefined()
    expect(drawableAttributeFor("hidden", "choice")).toBeUndefined()
    expect(drawableAttributeFor("thing")).toBeUndefined()
  })
})
