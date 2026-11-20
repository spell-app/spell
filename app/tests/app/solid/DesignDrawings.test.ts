import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { DesignDrawings } from "spell/app/app/solid/DesignDrawings"
import type { OwnView } from "spell/app/app/solid/Palette"

import card from "../../../spaces/@spell/examples/Solitaire/Card.spell?raw"
import carta from "../../../spaces/@spell/examples/Solitario/Carta.es.spell?raw"
import tarjeta from "../../../spaces/@spell/examples/TarjetasDeEstudio/Tarjeta.es.spell?raw"

/**
 * `DesignDrawings.in()`:  Design's picker's rows, each drawing of a view read from its file's text
 * (epic `editor` P37, J237), in English and in Spanish, by the language's own words.
 */
describe("DesignDrawings.in()", () => {
  const TWO_SIDED = ["TwoSidedView", "View", "Thing"]

  /** A view, as the palette lists it. */
  const view = (name: string, classNames: string[], file: string): OwnView => ({
    name,
    snippet: "",
    classNames,
    file
  })

  /** Each row's label, side and Spell line. */
  const rows = (text: string, of: OwnView, lang: string) =>
    DesignDrawings.in(text, of, SP.Language.for(lang), "Its drawing").map(({ label, side, written }) => ({
      label,
      side,
      written
    }))

  test("an English two sided view:  its front and its back", () => {
    expect(rows(card, view("Card", ["Card", ...TWO_SIDED], "Card.spell"), "en")).toEqual([
      { label: "Front", side: "front", written: "to draw its front" },
      { label: "Back", side: "back", written: "to draw its back" }
    ])
  })

  test("an English plain view, in the same file:  its one drawing", () => {
    expect(rows(card, view("Card image", ["CardImage", "View", "Thing"], "Card.spell"), "en")).toEqual([
      { label: "Its drawing", side: undefined, written: "to draw it" }
    ])
  })

  test("a Spanish two sided view:  its sides in Spanish, turned by the names they compile by", () => {
    expect(rows(carta, view("Carta", ["Carta", ...TWO_SIDED], "Carta.es.spell"), "es")).toEqual([
      { label: "Frente", side: "front", written: "para dibujar su frente" },
      { label: "Dorso", side: "back", written: "para dibujar su dorso" }
    ])
    expect(rows(tarjeta, view("Tarjeta", ["Tarjeta", ...TWO_SIDED], "Tarjeta.es.spell"), "es")).toEqual([
      { label: "Frente", side: "front", written: "para dibujar su frente" },
      { label: "Dorso", side: "back", written: "para dibujar su dorso" }
    ])
  })

  test("a Spanish plain view of several words:  `para dibujar eso`, and `para dibujarla`, its `it` fused on", () => {
    const image = view("Imagen de carta", ["ImagenDeCarta", "View", "Thing"], "Carta.es.spell")
    expect(rows(carta, image, "es")).toEqual([{ label: "Its drawing", side: undefined, written: "para dibujar eso" }])
    const fused = 'una "ficha" es una vista\n\tpara dibujarla\n\t\t<texto>Hola</texto>\n'
    expect(rows(fused, view("Ficha", ["Ficha", "View", "Thing"], "Ficha.es.spell"), "es")).toEqual([
      { label: "Its drawing", side: undefined, written: "para dibujarla" }
    ])
  })

  test("each row's lines:  its line, to the last line under it", () => {
    const [front] = DesignDrawings.in(
      carta,
      view("Carta", ["Carta", ...TWO_SIDED], "Carta.es.spell"),
      SP.Language.for("es"),
      ""
    )
    const lines = carta.split("\n")
    expect(lines[front!.lines!.start]!.trim()).toBe("para dibujar su frente")
    expect(front!.lines!.end).toBeGreaterThanOrEqual(front!.lines!.start)
  })
})
