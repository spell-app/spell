import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"

/**
 * Members declared where they're drawn (epic `language` P55, Q52 B):  in a thing's own drawing, a view's tag with a
 * quoted word that names no member declares one, `<column "C1"/>` ~== `"C1" is a new column`;  a value's type as a
 * tag declares the value and draws it, `<number "score"/>` ~== `"score" is a number` and `{the score}`.
 */
describe("members declared in a drawing", () => {
  /** `lines`, a project's one file, compiled:  its errors and its code. */
  function compiled(lines: string[], path = "/Test.spell") {
    const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
    return { errors: file!.errors, code: `${file!.compiled}` }
  }

  const piles = [
    'a "pile" is a viewable list of things',
    '\tits "suit" is one of clubs or hearts',
    'a "column" is a pile'
  ]

  test("a view's tag declares it, its attributes its starting values;  the actions above read it", () => {
    const { errors, code } = compiled([
      ...piles,
      "solitaire is an app",
      "\tto deal",
      "\t\tshuffle the stock",
      "\tto draw it",
      "\t\t<container>",
      '\t\t\t<column "stock"/>',
      '\t\t\t<column "C1" suit=clubs/>',
      "\t\t</container>"
    ])
    expect(errors).toEqual([])
    expect(code).toContain(
      'static { this.declareProp("stock", { init: () => new Column({ id: "stock" }), early: true }) }'
    )
    expect(code).toContain('init: () => new Column({ id: "C1", suit: "clubs" })')
    expect(code).toContain("this.stock.randomize()")
  })

  test("a value's type as a tag declares it and draws it;  a `set` above it doesn't declare it again", () => {
    const { errors, code } = compiled([
      "solitaire is an app",
      "\tto add points",
      "\t\tset the score to the score + 3",
      "\tto draw it",
      '\t\t<text>Score: <number "score"/> <text "hint"/></text>'
    ])
    expect(errors).toEqual([])
    expect(code).toContain('static { this.declareProp("score", { type: "number" }) }')
    expect(code).toContain('static { this.declareProp("hint", { type: "text" }) }')
    expect(code.match(/declareProp\("score"/g)).toHaveLength(1)
    expect(code).toContain('"Score: ", () => this.score')
  })

  test("a member said on a line of its own is only drawn", () => {
    const { errors, code } = compiled([
      ...piles,
      "solitaire is an app",
      '\t"stock" is a new column',
      '\t"score" is a number',
      "\tto draw it",
      '\t\t<column "stock"/> <number "score"/>'
    ])
    expect(errors).toEqual([])
    expect(code.match(/declareProp\("stock"/g)).toHaveLength(1)
    expect(code.match(/declareProp\("score"/g)).toHaveLength(1)
  })

  test("a view's tag that says `hidden` declares it and draws nothing (epic `language` T123)", () => {
    const { errors, code } = compiled([
      ...piles,
      "solitaire is an app",
      "\tto draw it",
      "\t\t<container>",
      '\t\t\t<column "deck" hidden/>',
      '\t\t\t<column "C1"/>',
      "\t\t</container>",
      '\t\t<column "spare" suit=clubs hidden/>'
    ])
    expect(errors).toEqual([])
    expect(code).toContain(
      'static { this.declareProp("deck", { init: () => new Column({ id: "deck" }), early: true }) }'
    )
    expect(code).toContain('init: () => new Column({ id: "spare", suit: "clubs" })')
    expect(code).toContain('return h("container", h("test-project-column", { id: "C1" }))')
    expect(code).not.toContain('h("test-project-column", { id: "deck" })')
    expect(code).not.toContain("hidden: true")
  })

  test("a tag that declares nothing keeps its `hidden`", () => {
    const { errors, code } = compiled([
      ...piles,
      "solitaire is an app",
      '\t"stock" is a new column',
      "\tto draw it",
      '\t\t<column "stock" hidden/>'
    ])
    expect(errors).toEqual([])
    expect(code).toContain('h("test-project-column", { hidden: true, id: "stock" })')
  })

  test('Spanish:  `<columna "C1"/>`, `<número "puntuación"/>`', () => {
    const { errors, code } = compiled(
      [
        'una "pila" es una lista visible de cosas',
        'una "columna" es una pila',
        "solitario es una aplicación",
        "\tpara dibujarlo",
        '\t\t<contenedor><columna "C1"/> <número "puntuación"/></contenedor>'
      ],
      "/Prueba.es.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain('init: () => new Columna({ id: "C1" })')
    expect(code).toContain('static { this.declareProp("puntuación", { type: "number" }) }')
  })

  test('Spanish:  `<columna "mazo" oculto/>` declares it and draws nothing', () => {
    const { errors, code } = compiled(
      [
        'una "pila" es una lista visible de cosas',
        'una "columna" es una pila',
        "solitario es una aplicación",
        "\tpara dibujarlo",
        '\t\t<contenedor><columna "mazo" oculto/> <columna "C1"/></contenedor>'
      ],
      "/Prueba.es.spell"
    )
    expect(errors).toEqual([])
    expect(code).toContain('init: () => new Columna({ id: "mazo" })')
    expect(code).toContain('return h("contenedor", h("test-project-columna", { id: "C1" }))')
    expect(code).not.toContain("hidden: true")
  })
})
