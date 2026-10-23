import { describe, expect, test } from "vite-plus/test"

import { pluralOf, singularOf, spanishInflector } from "spell-parser/spell/languages/es/inflector"

/** Singular => plural pairs every Spanish program of cards and lists says. */
const PAIRS: Array<[singular: string, plural: string]> = [
  ["carta", "cartas"],
  ["palo", "palos"],
  ["rango", "rangos"],
  ["mazo", "mazos"],
  ["pila", "pilas"],
  ["diamante", "diamantes"],
  ["espada", "espadas"],
  ["corazón", "corazones"],
  ["trébol", "tréboles"],
  ["rey", "reyes"],
  ["reina", "reinas"],
  ["jota", "jotas"],
  ["as", "ases"],
  ["luz", "luces"],
  ["color", "colores"],
  ["lápiz", "lápices"],
  ["canción", "canciones"],
  ["jardín", "jardines"],
  ["alemán", "alemanes"],
  ["inglés", "ingleses"],
  ["joven", "jóvenes"],
  ["examen", "exámenes"],
  ["país", "países"],
  ["carácter", "caracteres"],
  ["rubí", "rubíes"],
  ["café", "cafés"],
  ["mano", "manos"],
  ["juego", "juegos"],
  ["número", "números"],
  ["texto", "textos"],
  ["lista", "listas"],
  ["cosa", "cosas"],
  ["fecha", "fechas"],
  ["pan", "panes"],
  ["mes", "meses"],
  // a singular ending in -se, not -s (epic `spanish` I9:  `las bases` read as `bas`)
  ["base", "bases"],
  ["clase", "clases"],
  ["frase", "frases"],
  ["autobús", "autobuses"],
  ["compás", "compases"]
]

describe("Spanish's inflector", () => {
  test.each(PAIRS)("%s <=> %s", (singular, plural) => {
    expect(pluralOf(singular)).toBe(plural)
    expect(singularOf(plural)).toBe(singular)
    expect(singularOf(singular)).toBe(singular)
  })

  test("words the same in both, by list and by ending", () => {
    for (const word of ["lunes", "viernes", "crisis", "análisis", "virus"]) {
      expect(pluralOf(word)).toBe(word)
      expect(singularOf(word)).toBe(word)
      expect(spanishInflector.plurality(word)).toBe("either")
    }
  })

  test("a plural stays as it is", () => {
    expect(pluralOf("cartas")).toBe("cartas")
    expect(pluralOf("corazones")).toBe("corazones")
    expect(spanishInflector.plurality("cartas")).toBe("plural")
    expect(spanishInflector.plurality("carta")).toBe("singular")
  })

  test("a name of several words agrees in each, up to a linking word", () => {
    expect(spanishInflector.pluralize("cuenta-bancaria")).toBe("cuentas-bancarias")
    expect(spanishInflector.singularize("cuentas bancarias")).toBe("cuenta bancaria")
    expect(spanishInflector.pluralize("carta de juego")).toBe("cartas de juego")
    expect(spanishInflector.typeCase("cuentas-bancarias")).toBe("CuentaBancaria")
  })

  test("a name of several words keeps its number after a linking word, in PascalCase too (J96)", () => {
    expect(spanishInflector.typeCase("pila-de-descartes")).toBe("PilaDeDescartes")
    expect(spanishInflector.typeCase("pilas-de-descartes")).toBe("PilaDeDescartes")
    expect(spanishInflector.singularize("PilaDeDescartes")).toBe("PilaDeDescartes")
    expect(spanishInflector.singularize("MazoDeCartas")).toBe("MazoDeCartas")
    expect(spanishInflector.singularize("CuentasBancarias")).toBe("CuentaBancaria")
  })

  test("case is kept", () => {
    expect(pluralOf("Carta")).toBe("Cartas")
    expect(singularOf("Corazones")).toBe("Corazón")
    expect(spanishInflector.typeCase("cartas")).toBe("Carta")
    expect(spanishInflector.typeCase("corazones")).toBe("Corazón")
  })
})
