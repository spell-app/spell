import { describe, expect, test } from "vite-plus/test"
import { parseSpellProject, unitTestModuleRules } from "spell-parser/spell/test"
import { SP } from "spell-parser/spell"
import { core } from "spell-parser/core"

describe("testing spell module methods, in Spanish", () => {
  unitTestModuleRules(SP.spanish.parser, "methods", core.resetRuntime)

  /** `lines` as one file of a Spanish project:  its compiled code. */
  function compiled(lines: string[]) {
    const { files } = parseSpellProject([{ path: "/test.spell", contents: lines.join("\n") }], {
      parentScope: SP.spanish.rootScope
    })
    return files[0]!.compiled
  }

  describe("a method's name keeps its type after a little word, `a` (`danglingWords`)", () => {
    test("the definition and a call read ahead of it agree:  `darLaVueltaACarta`", () => {
      const code = compiled([
        "una carta es una cosa",
        "una pila es una lista de cartas",
        "para jugar una carta en una pila:",
        "\tdar la vuelta a la carta",
        "para dar la vuelta a una carta: imprimir 1"
      ])
      expect(code).not.toContain("PARSE ERROR")
      expect(code).toContain("darLaVueltaACarta() {")
      expect(code).toContain("this.darLaVueltaACarta()")
      expect(code).not.toContain("darLaVueltaA(")
    })

    // `dar vuelta la carta`:  the shorter way, common in Argentina and Chile
    test("the shorter `dar vuelta una carta` works too:  `darVuelta`", () => {
      const code = compiled([
        "una carta es una cosa",
        "una pila es una lista de cartas",
        "para jugar una carta en una pila:",
        "\tdar vuelta la carta",
        "para dar vuelta una carta: imprimir 1"
      ])
      expect(code).not.toContain("PARSE ERROR")
      expect(code).toContain("darVuelta() {")
      expect(code).toContain("this.darVuelta()")
    })
  })

  describe("a type's outline body:  `it` fused into the verb, and the `create()` hook (epic `spanish` J96)", () => {
    const code = compiled([
      'un "mazo" es una lista de cartas donde:',
      "\t- para crearlo:",
      "\t\timprimir 1",
      "\t- para barajarlo:",
      "\t\timprimir 2",
      "\t- para voltearlo boca arriba:",
      "\t\tbarajar",
      "\t\timprimir 3",
      "una carta es una cosa",
      "para crear una carta",
      "\timprimir 4",
      "para probar el mazo",
      "\tel mazo es un nuevo mazo",
      "\tbarajar el mazo",
      "\tvoltear el mazo boca arriba"
    ])

    test("`- para crearlo:` and `para crear una carta` are each type's `create()`, as English's `to create it`", () => {
      expect(code).not.toContain("PARSE ERROR")
      expect(code).toMatch(/class Mazo[\s\S]*create\(\) \{\n {4}core.console.log\(1\)/)
      expect(code).toMatch(/class Carta[\s\S]*create\(\) \{\n {4}core.console.log\(4\)/)
      expect(code).not.toContain("crearlo()")
    })

    test("`- para barajarlo:` is `barajar` the deck;  its calls name it, or leave it out in its own methods", () => {
      expect(code).toContain("barajar() {")
      expect(code).toContain("voltearBocaArriba() {\n    this.barajar()")
      expect(code).toContain("mazo.barajar()")
      expect(code).toContain("mazo.voltearBocaArriba()")
    })
  })

  describe("`al` is `a el`, `del` is `de el`:  a method's words and its calls say either (epic `spanish` J96)", () => {
    const code = compiled([
      "una carta es una cosa",
      "una pila es una lista de cartas",
      "para dar la vuelta al mazo: imprimir 1",
      "para dar la vuelta a el juego: imprimir 2",
      "para mover (una carta) a (una pila): imprimir 3",
      "para sacar (una carta) de (una pila): imprimir 4",
      "para probar las palabras",
      "\tdar la vuelta a el mazo",
      "\tdar la vuelta al juego",
      "\tponer la carta a una nueva carta",
      "\tponer el montón a una nueva pila",
      "\tmover la carta al montón",
      "\tsacar la carta del montón"
    ])

    test("each call finds its method, and either way of writing a name makes one method", () => {
      expect(code).not.toContain("PARSE ERROR")
      expect(code).toContain("darLaVueltaAlMazo()\n")
      expect(code).toContain("darLaVueltaAlJuego()\n")
      expect(code).toContain("carta.moverAPila(montón)")
      expect(code).toContain("carta.sacarDePila(montón)")
    })
  })

  describe("`eso` left out before `es`, as Spanish leaves its subject out (epic `spanish` J96)", () => {
    test("in a value kind's getter, a type's method, a `donde` and after `obtener`", () => {
      const code = compiled([
        'una "carta" es una cosa donde:',
        '\t- "palos" como uno de tréboles, diamantes, corazones o espadas',
        '\t- el "color" de un palo es:',
        "\t\trojo si es diamantes o corazones",
        "\t\tnegro de lo contrario",
        '\t- su "palo" es un palo',
        '\t- "es un (palo)"',
        '\t- "es roja" si no es un trébol y no es una espada',
        "una pila es una lista de cartas",
        "para probar las cartas",
        "\tobtener una nueva carta cuyo palo es tréboles",
        "\tes un trébol debería ser sí",
        "\tponer la pila a una nueva pila",
        "\tponer rojas a las cartas en la pila donde es roja"
      ])
      expect(code).not.toContain("PARSE ERROR")
      expect(code).toContain('if (core.includes(["diamantes", "corazones"], palo)) return "rojo"')
      expect(code).toContain("return !this.esUnPalo(")
      expect(code).toContain("it.esUnPalo(")
      expect(code).toContain("pila.filter((carta) => carta.esRoja)")
    })
  })
})
