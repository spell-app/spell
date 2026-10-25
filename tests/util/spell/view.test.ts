import { describe, expect, test } from "vite-plus/test"

import { elementTagFor, viewAttributeFor } from "spell/util/spell/view"

describe("a view's element names", () => {
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
    expect(viewAttributeFor("shortRank", "number")).toEqual({
      name: "short-rank",
      property: "shortRank",
      kind: "number",
      description: "Its shortRank."
    })
    expect(viewAttributeFor("rank")?.kind).toBe("string")
    expect(viewAttributeFor("faceUp", "choice")?.kind).toBe("boolean")
    expect(viewAttributeFor("cards", "list")?.kind).toBe("json")
    // a thing, or the list holding it:  its reference, as text
    expect(viewAttributeFor("home", "Pile")).toMatchObject({ kind: "string", reference: "thing" })
    expect(viewAttributeFor("pile", "Pile", true)).toMatchObject({ kind: "string", reference: "owner" })
  })

  test("none for a name the page or Spell UI already means something by", () => {
    expect(viewAttributeFor("id")).toBeUndefined()
    expect(viewAttributeFor("hidden", "choice")).toBeUndefined()
    expect(viewAttributeFor("thing")).toBeUndefined()
  })
})
