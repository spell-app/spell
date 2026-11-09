import { beforeAll, describe, test, expect } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"
import { SX } from "spell/parser/spellx"

/**
 * Spanish that rewriting the examples in epic `language` P30 found wrong, each worked around there (P31).
 */
describe("Spanish, from the examples (epic `language` P31)", () => {
  beforeAll(registerTestComponentPack)

  // T52
  test("`<soltable cuando>` reads as `- soltable cuando:`, as English's `<droppable when>` does", () => {
    const { code, errors } = compiledText([
      '<encanto-vista "carta">',
      '\t<propiedad "valor">1</>',
      "</encanto-vista>",
      '<encanto-vista "pila" plantilla="lista visible de cartas">',
      "\t<soltable cuando>",
      "\t\tdevolver el valor de la carta es 1",
      "\t</>",
      "</encanto-vista>"
    ])
    expect(errors).toEqual([])
    expect(code).toContain("static droppable = true")
    expect(code).toContain("canTake")
  })

  // T53
  test("a built-in template's property, said in Spanish as a thing is made, sets the class's own", () => {
    const { code, errors } = compiledText(
      ["una carta es una vista reversible", "poner c a una nueva carta cuyo dirección es arriba y otra es arriba"],
      { path: "/prueba.es.spell" }
    )
    expect(errors).toEqual([])
    // `arriba` is `up` only as its direction:  a root's constants are every program's
    expect(code).toContain('new Carta({ direction: "up", otra: "arriba" })')
  })

  // T54
  test("an item of a list of texts is text in Spanish too:  its TypeScript type is `string`", () => {
    const { ts, errors } = compiledText([
      '<encanto-vista "carta">',
      '\t<propiedad "imagen">',
      '\t\tdevolver el elemento 1 de ["🂡", "🂢"]',
      "\t</>",
      "</encanto-vista>",
      '<encanto-vista "comodín" plantilla="carta">',
      '\t<propiedad "imagen">',
      '\t\tdevolver "🃟"',
      "\t</>",
      "</encanto-vista>"
    ])
    expect(errors).toEqual([])
    expect(ts).not.toContain("Texte")
    expect(ts).toContain("get imagen(): string")
  })

  // T62
  describe("a call on another thing", () => {
    const keeper = [
      "una tarea es una cosa:",
      '\t- su "título" es texto',
      'un "guardián" es una cosa:',
      "\t- para guardar una tarea nueva titulada (título como texto):",
      "\t\tdevolver una nueva tarea con título = título",
      "\t- para apuntar (título como texto):",
      "\t\tdevolver una nueva tarea con título = título",
      "poner g a un nuevo guardián",
      'poner borrador a "b"'
    ]

    test("`una tarea nueva` in a method's name is words, as English's `a new task`:  the method is the keeper's", () => {
      const { code, errors } = compiledText([...keeper, 'poner t a guardar una tarea nueva titulada "x" de g'], {
        path: "/prueba.es.spell"
      })
      expect(errors).toEqual([])
      expect(code).toContain('t = g.guardarUnaTareaNuevaTituladaTítulo("x")')
    })

    test("a bare variable is the argument, not a position nor a property of the receiver", () => {
      const { code, errors } = compiledText(
        [...keeper, "poner t a apuntar borrador de g", "poner u a guardar una tarea nueva titulada borrador de g"],
        { path: "/prueba.es.spell" }
      )
      expect(errors).toEqual([])
      expect(code).toContain("t = g.apuntarTítulo(borrador)")
      expect(code).toContain("u = g.guardarUnaTareaNuevaTituladaTítulo(borrador)")
    })

    test("`X de Y` with no article still reads a property Y's type declares, or one a loose word names", () => {
      const { code, errors } = compiledText([...keeper, "poner t a una nueva tarea", "poner n a título de t"], {
        path: "/prueba.es.spell"
      })
      expect(errors).toEqual([])
      expect(code).toContain("n = t.título")
    })
  })

  // T63
  test.each(["before", "after"])(
    "`una lista de tareas` is a list of tasks, with an app of that name %s it",
    (where) => {
      const keeper = [
        '<encanto-cosa "guardián">',
        '\t<propiedad "tareas guardadas">una lista de tareas</>',
        "</encanto-cosa>"
      ]
      const rest = [
        '<encanto-cosa "tarea">',
        '\t<propiedad "título">texto</>',
        "</encanto-cosa>",
        '<encanto-aplicación "lista de tareas">',
        '\t<propiedad "nombre">texto</>',
        "</encanto-aplicación>"
      ]
      const { code, errors } = compiledText(where === "before" ? [...rest, ...keeper] : [...keeper, ...rest])
      expect(errors).toEqual([])
      expect(code).toContain('declareProp("tareasGuardadas", { itemType: "Tarea"')
      expect(code).toContain("export const listaDeTareas = new ListaDeTareas()")
    }
  )

  // T64
  test("a drawing Show as Code Spell writes, `- para dibujar eso:`, compiles as its spellml does:  `eso` is the thing", () => {
    const spellml = [
      '<encanto-vista "tarea">',
      '\t<propiedad "título">texto</>',
      "\t<dibujar>",
      "\t\t<formulario value={eso}>",
      "\t\t\t<texto>{su título}</texto>",
      "\t\t</formulario>",
      "\t</dibujar>",
      "</encanto-vista>"
    ]
    const codeSpell = SX.CodeSpellWriter.write(spellml.join("\n"), { path: "/prueba.es.spellml" })
    expect(codeSpell).toContain("- para dibujar eso:")
    const written = compiledText(codeSpell.split("\n"), { path: "/prueba.es.spell" })
    expect(written.errors).toEqual([])
    expect(written.code).toContain('h("formulario", { value: this }')
  })

  // T74
  describe("a built-in template's property, set or compared by its value in Spanish, holds the class's own", () => {
    const card = ["una carta es una vista reversible", "poner c a una nueva carta"]

    test('setting it:  `poner la dirección de c a abajo` is `direction = "down"`', () => {
      const { code, errors } = compiledText([...card, "poner la dirección de c a abajo"], { path: "/prueba.es.spell" })
      expect(errors).toEqual([])
      expect(code).toContain('c.direction = "down"')
    })

    test('comparing it, either way round:  `"up"`', () => {
      const { code, errors } = compiledText(
        [
          ...card,
          "poner n a 0",
          "si la dirección de c es arriba",
          "\tponer n a 1",
          "si abajo no es la dirección de c",
          "\tponer n a 2"
        ],
        { path: "/prueba.es.spell" }
      )
      expect(errors).toEqual([])
      expect(code).toContain('c.direction === "up"')
      expect(code).toContain('"down" !== c.direction')
      expect(code).not.toMatch(/"arriba"|"abajo"/)
    })

    test("the TypeScript target keeps the class's own type:  no `declare direction: string`", () => {
      const { ts, errors } = compiledText(
        ["una carta es una vista reversible", "poner c a una nueva carta cuyo dirección es arriba"],
        { path: "/prueba.es.spell" }
      )
      expect(errors).toEqual([])
      expect(ts).not.toMatch(/declare (direction|dirección): string/)
    })
  })
})

/** `lines`, one file of its own project, compiled:  its code, its TypeScript and its parse errors. */
function compiledText(lines: string[], { path = "/prueba.es.spellml" } = {}) {
  const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
  const ts = file!.scope.parser!.inPlay(() => (P.TSWriter.instance.writeMatch(file!.match) as string | undefined) ?? "")
  return { code: file!.compiled, ts, errors: file!.errors }
}
