import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { compiledSpellProject, parseSpellProject } from "spell/parser/spell/test"

/** A pack with a tree and a graph, in English and Spanish:  as Spell UI's says them (the app's `spellUIPack`). */
const PACK: SP.ComponentPack = {
  name: "spell-ui",
  tagFor: (word) => ({ tree: "ui-tree", graph: "ui-graph" })[word],
  viewBaseFor(noun, language) {
    if (language === "es") {
      if (noun !== "árbol" && noun !== "arbol") return undefined
      return {
        tag: "ui-tree",
        attributes: [
          {
            name: "apariencia",
            output: "appearance",
            values: ["navegacion", "columnas"],
            valueOutputs: { navegacion: "nav", columnas: "columns" }
          }
        ],
        hooks: [{ name: "rowClass", words: "dar la clase de fila de (un elemento)" }]
      }
    }
    if (noun === "tree") {
      return {
        tag: "ui-tree",
        attributes: [{ name: "appearance", values: ["nav", "columns"] }, { name: "column-titles" }],
        hooks: [{ name: "rowClass", words: "give the row class of (an item)" }]
      }
    }
    if (noun === "graph") {
      return {
        tag: "ui-graph",
        attributes: [],
        hooks: [
          { name: "nodeLabel", words: "give the label of (a node)" },
          { name: "edgeLabel", words: "give the label of (an edge)" }
        ]
      }
    }
    return undefined
  }
}

describe("SP.UIViews", () => {
  beforeAll(() => SP.ComponentPacks.register(PACK))
  afterAll(() => SP.ComponentPacks.register({ name: "spell-ui", tagFor: () => undefined }))

  /** `lines`, compiled as a project's one English file. */
  function compiled(lines: string[], path = "/Harbor.spell") {
    const contents = lines.join("\n")
    const [file] = parseSpellProject([{ path, contents }]).files
    expect(file!.errors).toEqual([])
    expect(file!.warnings).toEqual([])
    return compiledSpellProject([{ path, contents }]).code
  }

  test("a type built on a Spell UI element is a view naming it;  its body sets the element's attributes", () => {
    const code = compiled([
      'a "netlist column" is a ui tree view',
      "\tits appearance is columns",
      '\tits column titles is "Blocks, Ports"'
    ])
    expect(code).toContain(
      [
        "export class NetlistColumn extends View {",
        '  static uiElement = "ui-tree"',
        '  static elementTag = core.defineElement(this, "test-project")',
        "",
        "  get appearance() {",
        '    return "columns"',
        "  }",
        "",
        "  get columnTitles() {",
        '    return "Blocks, Ports"',
        "  }",
        "}"
      ].join("\n")
    )
  })

  test("a `to` line in a hook's words overrides it, under the element's name, its argument untyped;  no action", () => {
    const code = compiled([
      'a "netlist column" is a ui tree view',
      "\tto give the row class of (an item)",
      '\t\treturn "node"'
    ])
    expect(code).toContain('  rowClass(item) {\n    return "node"\n  }')
    expect(code).not.toContain("describeAction")
  })

  test("its hooks tell their arguments apart by type:  the label of a node, of an edge", () => {
    const code = compiled([
      'a "wiring graph" is a ui graph view',
      "\tto give the label of (a node)",
      '\t\treturn "N"',
      "\tto give the label of (an edge)",
      '\t\treturn "E"'
    ])
    expect(code).toContain("nodeLabel(node) {")
    expect(code).toContain("edgeLabel(edge) {")
  })

  test("a type built on one keeps its own super-type, inheriting the element", () => {
    const code = compiled(['a "netlist column" is a ui tree view', 'a "port column" is a netlist column'])
    expect(code).toContain("export class PortColumn extends NetlistColumn {")
    expect(code).not.toMatch(/class PortColumn[^}]*uiElement/)
  })

  test("Spanish:  `una vista ui de árbol`, its words and values the dictionary's, compiled as Spell UI's", () => {
    const code = compiled(
      [
        'una "columna de netlist" es una vista ui de árbol',
        "\tsu apariencia es columnas",
        "\tpara dar la clase de fila de (un elemento)",
        '\t\tdevolver "node"'
      ],
      "/Harbor.es.spell"
    )
    expect(code).toContain('export class ColumnaDeNetlist extends View {\n  static uiElement = "ui-tree"')
    expect(code).toContain('  get appearance() {\n    return "columns"')
    expect(code).toContain("  rowClass(elemento) {")
  })

  test("TypeScript writes no element class for it, nor for a type below it:  the page builds its tag on the element", () => {
    const contents = ['a "netlist column" is a ui tree view', 'a "port column" is a netlist column'].join("\n")
    const { code } = compiledSpellProject([{ path: "/Harbor.spell", contents }], { writer: P.TSWriter.instance })
    expect(code).toContain('export class NetlistColumn extends View {\n  static uiElement = "ui-tree"')
    expect(code).not.toContain("SpellElement")
    expect(code).not.toContain("core.useElement")
    // its tag is still declared for the JSX
    expect(code).toContain('"test-project-netlist-column": HTMLAttributes<HTMLElement>')
  })

  test("an element no pack has names no type", () => {
    const [file] = parseSpellProject([{ path: "/Harbor.spell", contents: 'a "gizmo" is a ui frobnicator view' }]).files
    expect(file!.errors).not.toEqual([])
  })
})
