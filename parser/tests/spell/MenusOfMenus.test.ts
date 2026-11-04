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

  test("HAS (epic `language` C1):  the same menu as `is a menu of`", () => {
    const program = (menu: string) =>
      compiled(
        "/Editor.spell",
        ["an editor is an app where:", "\t- to save:", "\t\tprint 2", "\t- to open:", "\t\tprint 1", menu].join("\n")
      )
    const has = program('\t- its "file" menu has actions "save" and "open", titled "File"')
    const isAMenuOf = program('\t- its "file menu" is a menu of "save" and "open", titled "File"')
    expect(has.errors).toEqual([])
    expect(isAMenuOf.errors).toEqual([])
    const menuLine = (code: string) => code.split("\n").find((line) => line.startsWith("core.describeMenu"))
    expect(menuLine(has.code)).toBe(menuLine(isAMenuOf.code))
    expect(menuLine(has.code)).toBe('core.describeMenu(Editor, "fileMenu", { items: ["save", "open"], title: "File" })')
  })

  test("HAS:  a menu bar of menus, by their words;  no items isn't a menu", () => {
    const { code, errors } = compiled(
      "/Editor.spell",
      [
        "an editor is an app where:",
        "\t- to save:",
        "\t\tprint 2",
        '\t- its "file" menu has actions "save" and menus "recent"',
        '\t- its "examples" is a list of text',
        "\t- to open (a text):",
        "\t\tprint 1",
        '\t- its "recent" menu has its examples, each running "open (a text)"',
        '\t- its "bar" menu has menus "file" and "recent"',
        '\t- its menu bar is "bar menu"'
      ].join("\n")
    )
    expect(errors).toEqual([])
    expect(code).toContain('core.describeMenu(Editor, "fileMenu", { items: ["save", "recentMenu"], title: "file" })')
    expect(code).toContain('{ items: [], title: "recent", each: "recentMenuItems", action: "openText" }')
    expect(code).toContain('core.describeMenu(Editor, "barMenu", { items: ["fileMenu", "recentMenu"], title: "bar" })')
    expect(compiled("/Bad.spell", 'an editor is an app where:\n\t- its "file" menu has').errors).not.toEqual([])
  })

  test("a list of two words, `its recent files`, in both wordings (epic `language` T30)", () => {
    const program = (menu: string) =>
      compiled(
        "/Editor.spell",
        [
          "an editor is an app where:",
          '\t- its "recent files" is a list of text',
          "\t- to open (a text):",
          "\t\tprint 1",
          menu
        ].join("\n")
      )
    for (const menu of [
      '\t- its "recent" menu has its recent files, each running "open (a text)"',
      '\t- its "recent menu" is a menu of its recent files, each running "open (a text)"'
    ]) {
      const { code, errors } = program(menu)
      expect(errors).toEqual([])
      expect(code).toContain("return this.recentFiles")
    }
  })

  test("Spanish:  `tiene acciones`, `y menús`", () => {
    const { code, errors } = compiled(
      "/Editor.es.spell",
      [
        "un editor es una aplicación donde:",
        '\t- su menú "archivo" tiene acciones "deshacer" y menús "recientes"'
      ].join("\n")
    )
    expect(errors).toEqual([])
    expect(code).toContain(
      'core.describeMenu(Editor, "menúArchivo", { items: ["undo", "menúRecientes"], title: "archivo" })'
    )
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
