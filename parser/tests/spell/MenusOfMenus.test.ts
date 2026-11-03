import { beforeAll, describe, expect, test } from "vite-plus/test"

import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/**
 * Menus of menus (epic `language` P19, the editor's r4):  a menu naming another is a sub-menu, so a menu bar is a
 * menu of menus;  a menu's own title;  a menu filled from a list (Q21).
 */
describe("menus of menus", () => {
  beforeAll(registerTestComponentPack)

  const compiled = (path: string, contents: string) => {
    const [file] = parseSpellProject([{ path, contents }]).files
    return { code: file!.compiled, errors: file!.errors }
  }

  test("code spell:  a sub-menu, a title, a list", () => {
    const { code, errors } = compiled(
      "/Editor.spell",
      [
        "an editor is an app where:",
        '\t- its "examples" is a list of text',
        "\t- to open (a text):",
        "\t\tprint 1",
        "\t- to save:",
        "\t\tprint 2",
        '\t- its "file menu" is a menu of "save", "-" and "more examples", titled "File"',
        '\t- its "more examples" is a menu of its examples, each running "open (a text)"',
        '\t- its "menu bar" is a menu of "file menu" and "undo"',
        '\t- its menu bar is "menu bar"'
      ].join("\n")
    )
    expect(errors).toEqual([])
    expect(code).toContain(
      'core.describeMenu(Editor, "fileMenu", { items: ["save", "-", "moreExamples"], title: "File" })'
    )
    expect(code).toContain("get moreExamplesItems() {")
    expect(code).toContain('{ items: [], each: "moreExamplesItems", action: "openText" }')
    expect(code).toContain('core.describeMenu(Editor, "menuBar", { items: ["fileMenu", "undo"] })')
  })

  test("Spanish:  `titulado`, `cada uno ejecutando`", () => {
    const { code, errors } = compiled(
      "/Editor.es.spell",
      [
        "un editor es una aplicación donde:",
        '\t- sus "ejemplos" es una lista de texto',
        "\t- para abrir (un texto):",
        "\t\timprimir 1",
        '\t- su "menú archivo" es un menú de "deshacer" y "más ejemplos" titulado "Archivo"',
        '\t- su "más ejemplos" es un menú de sus ejemplos, cada uno ejecutando "abrir (un texto)"'
      ].join("\n")
    )
    expect(errors).toEqual([])
    expect(code).toContain('title: "Archivo"')
    expect(code).toContain("each: ")
  })

  test("spellx:  a <menu> inside a <menu>, title=, for-each= and action=", () => {
    const { code, errors } = compiled(
      "/Editor.spellml",
      [
        '<spell-app "editor">',
        "\t<spell>",
        '\t\t- its "examples" is a list of text',
        "\t</spell>",
        '\t<action "open (a text)">print 1</action>',
        '\t<action "save">print 2</action>',
        '\t<menu "file menu" title="File">',
        '\t\t<action "save" />',
        '\t\t<menu "more examples" />',
        "\t</menu>",
        '\t<menu "more examples" for-each={its examples} action="open (a text)" />',
        '\t<menu "menu bar">',
        '\t\t<menu "file menu" />',
        "\t</menu>",
        "</spell-app>"
      ].join("\n")
    )
    expect(errors).toEqual([])
    expect(code).toContain('core.describeMenu(Editor, "fileMenu", { items: ["save", "moreExamples"], title: "File" })')
    expect(code).toContain('each: "moreExamplesItems", action: "openText"')
    expect(code).toContain('core.describeMenu(Editor, "menuBar", { items: ["fileMenu"] })')
  })
})
