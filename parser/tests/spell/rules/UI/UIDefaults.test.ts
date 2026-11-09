import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { compiledSpellProject, parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"

/** A pack that can't read defaults:  what spell-parser's own rule tests have. */
const NO_PACK: SP.ComponentPack = { name: "spell-ui", tagFor: () => undefined }

describe("ui_defaults", () => {
  beforeAll(registerTestComponentPack)
  afterAll(() => SP.ComponentPacks.register(NO_PACK))

  /** `contents`, compiled as `path`'s one file:  its code and its errors. */
  function compiled(path: string, contents: string) {
    const [file] = parseSpellProject([{ path, contents }]).files
    return { code: file!.compiled, errors: file!.errors }
  }

  test("an English block compiles to Spell UI's names, by file", () => {
    const { code, errors } = compiled(
      "/Theme.spell",
      ["<ui-defaults>", '\t<ui-button appearance="pill" fluid/>', "</ui-defaults>"].join("\n")
    )
    expect(errors).toEqual([])
    expect(code).toContain('core.useDefaults("/Theme.spell", {\n  "ui-button": { appearance: "pill", fluid: true }\n})')
  })

  test("a Spanish block, in Spell UI's Spanish words, compiles to its English ones", () => {
    // a spellml file reads a tag of any letters, `<botón>`;  code spell's markup, ASCII ones
    for (const [path, tag] of [
      ["/Tema.es.spell", "es-boton"],
      ["/Tema.es.spellml", "botón"],
      ["/Tema.es.spellml", "ui-botón"]
    ]) {
      const { code, errors } = compiled(
        path!,
        ["<ui-defaults>", `\t<${tag} apariencia="píldora"/>`, "</ui-defaults>"].join("\n")
      )
      expect(errors, tag).toEqual([])
      expect(code, tag).toContain('"ui-button": { appearance: "pill" }')
    }
  })

  test("a block at a spellml file's top level is markup, as in code spell", () => {
    const { code, errors } = compiled(
      "/Theme.spellml",
      ["<ui-defaults>", '\t<ui-button appearance="pill"/>', "</ui-defaults>"].join("\n")
    )
    expect(errors).toEqual([])
    expect(code).toContain('core.useDefaults("/Theme.spellml"')
  })

  test("an unknown widget, attribute or value, or a content attribute, is an error naming what it takes", () => {
    const errorOf = (path: string, sample: string) =>
      compiled(path, ["<ui-defaults>", `\t${sample}`, "</ui-defaults>"].join("\n")).errors.join("\n")
    expect(errorOf("/a.spell", "<ui-frobber size=2/>")).toContain("<ui-frobber> isn't a widget Spell UI has")
    expect(errorOf("/a.spell", '<ui-button colour="red"/>')).toContain(
      '<ui-button> has no "colour":  it takes appearance, fluid, label'
    )
    expect(errorOf("/a.spell", '<ui-button appearance="round"/>')).toContain(
      `<ui-button>'s "appearance" takes "basic", "pill", not "round"`
    )
    expect(errorOf("/a.spell", '<ui-button label="Go"/>')).toContain('"label" is what each <ui-button> shows')
    expect(errorOf("/a.es.spell", '<es-boton apariencia="redonda"/>')).toContain(
      '"apariencia" de <es-boton> lleva "basico", "pildora", no "redonda"'
    )
    expect(errorOf("/a.spell", "some words")).toContain("<ui-defaults> holds sample tags")
  })

  test("source= takes another project's defaults file, from its declarations", () => {
    const theme = compiledSpellProject([
      {
        path: "/ui-defaults.spell",
        contents: ["<ui-defaults>", '\t<ui-button appearance="pill"/>', "</ui-defaults>"].join("\n")
      }
    ])
    expect(theme.declarations.statements[0]?.uiDefaults).toEqual({ "ui-button": { appearance: "pill" } })
    const imports = SP.SpellDeclarations.importScope(SP.Language.rootScopeFor([SP.Language.default]), [
      { from: "@spell/test/theme", projectId: "@spell/test/theme", declarations: theme.declarations }
    ])
    const [file] = parseSpellProject(
      [{ path: "/app.spell", contents: '<ui-defaults source="@spell/test/theme/ui-defaults.spell"/>' }],
      { parentScope: imports }
    ).files
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toContain(
      'core.useDefaults("@spell/test/theme/ui-defaults.spell", {\n  "ui-button": { appearance: "pill" }\n})'
    )
    const [missing] = parseSpellProject(
      [{ path: "/app.spell", contents: '<ui-defaults source="@spell/test/other/ui-defaults.spell"/>' }],
      { parentScope: imports }
    ).files
    expect(missing!.errors.join("\n")).toContain("import @spell/test/other in the project file")
  })
})
