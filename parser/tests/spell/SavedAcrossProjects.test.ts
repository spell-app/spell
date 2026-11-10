/**
 * A type saved in a place, imported by another project (epic `data` I19):
 * its project's declarations say where it's saved, so reading and writing it reach the place there too.
 */
import { describe, expect, it } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { PY } from "spell/parser/py"
import { SP } from "spell/parser/spell"
import { compiledSpellProject, parseSpellProject } from "spell/parser/spell/test"

const FROM = "@spell/library/cookbook"

/** A library holding a place and a type saved in it:  its declarations. */
function libraryDeclarations(contents: string, path = "/Library.spell") {
  return compiledSpellProject([{ path, contents }]).declarations
}

/** `contents`, compiled as a project importing `declarations`, picking `picks`. */
function importerOf(
  declarations: SP.SpellDeclarationsData,
  contents: string,
  { picks = ["*"], path = "/Program.spell" }: { picks?: string[]; path?: string } = {}
) {
  const root = SP.Language.rootScopeFor([SP.Language.forFile(path)])
  const imports = SP.SpellDeclarations.importScope(root, [{ from: FROM, declarations, import: picks }])
  const { files } = parseSpellProject([{ path, contents }], { parentScope: imports })
  const file = files[0]!
  const written = (writer: P.ProgramWriter) => file.scope.parser!.inPlay(() => writer.writeMatch(file.match) ?? "")
  return { ...file, imports, written }
}

const LIBRARY = [
  'family cookbook is a web server at "https://example.com"',
  "\t- check it every 30 seconds",
  '\t- it searches names with "q"',
  "a recipe is a thing:",
  "\t- it is saved in the family cookbook",
  '\t- its "title" is text'
].join("\n")

const LIBRARY_ES = [
  "recetario familiar es una base de datos en memoria",
  "una receta es una cosa:",
  "\t- vive en el recetario familiar",
  '\t- su "título" es texto'
].join("\n")

describe("a project's declarations say where a type is saved", () => {
  const declarations = libraryDeclarations(LIBRARY)

  it("the place:  its name, kind, and what its lines say that the compiler asks", () => {
    expect(declarations.statements.find(({ type }) => type === "FamilyCookbook")?.place).toEqual({
      name: "family_cookbook",
      kind: "web server",
      details: { checkedEvery: 30, searches: { param: "q", fields: ["names"] } }
    })
  })

  it("the saved type:  the place and the collection, on the type's own declaration", () => {
    expect(declarations.statements.find(({ savedIn }) => savedIn)).toMatchObject({
      type: "Recipe",
      savedIn: { place: "family_cookbook", placeType: "FamilyCookbook", collection: "recipes" }
    })
  })

  it("a program that saves nothing says none of it", () => {
    const plain = libraryDeclarations('a recipe is a thing:\n\t- its "title" is text')
    expect(plain.statements.some(({ place, savedIn }) => place || savedIn)).toBe(false)
  })
})

describe("an imported saved type reads and writes the place", () => {
  const declarations = libraryDeclarations(LIBRARY)
  const PROGRAM = ["to look:", "\tset all to every recipe", "\tadd a new recipe", "\tprint all"].join("\n")

  it("every recipe reads the place, not what's in memory", () => {
    const { compiled, errors } = importerOf(declarations, PROGRAM)
    expect(errors).toEqual([])
    expect(compiled).toContain("await core.savedThings(Recipe)")
    expect(compiled).toContain("core.saveThing(")
    expect(compiled).not.toContain("everyThing")
  })

  it("in TypeScript and Python too", () => {
    const { written } = importerOf(declarations, PROGRAM)
    expect(written(P.TSWriter.instance)).toContain("core.savedThings(Recipe)")
    expect(written(PY.PyWriter.instance)).toContain("core.saved_things(Recipe)")
  })

  it("picking only the type brings its place along", () => {
    const { compiled, imports, errors } = importerOf(declarations, PROGRAM, { picks: ["Recipe"] })
    expect(errors).toEqual([])
    expect(compiled).toContain("core.savedThings(Recipe)")
    const saved = imports.types.get("Recipe", "LOCAL_ONLY")?.savedPlace()
    expect(saved).toMatchObject({ place: "family_cookbook", collection: "recipes" })
    expect(saved?.placeType.placeKind).toBe("web server")
  })

  it("under another name, the place is still found", () => {
    const { imports } = importerOf(declarations, PROGRAM.replaceAll("recipe", "plato"), {
      picks: ["Recipe:Plato", "FamilyCookbook:Cookbook"]
    })
    const saved = imports.types.get("Plato", "LOCAL_ONLY")?.savedPlace()
    expect(saved?.place).toBe("family_cookbook")
    expect(saved?.placeType.name).toBe("Cookbook")
    expect(imports.types.get("Cookbook", "LOCAL_ONLY")?.placeName).toBe("family_cookbook")
  })

  it("a kind of it declared by the importer is saved there too", () => {
    const { compiled } = importerOf(
      declarations,
      ["a dessert is a recipe", "to look:", "\tset all to every dessert", "\tprint all"].join("\n")
    )
    expect(compiled).toContain("core.savedThings(Dessert)")
  })
})

describe("what the compiler knows of an imported place", () => {
  it("a collection given only to a search:  listing it is refused, as in its own project", () => {
    const searched = libraryDeclarations(
      [
        'family cookbook is a web server at "https://example.com"',
        '\t- recipes are searched with "q" at "/search"',
        "a recipe is a thing:",
        "\t- it is saved in the family cookbook"
      ].join("\n")
    )
    const { errors } = importerOf(searched, "to look:\n\tprint every recipe")
    expect(errors.join("\n")).toContain("only found by a search")
  })

  it("a sheet read only at its address:  writing it is refused, as in its own project", () => {
    const sheet = libraryDeclarations(
      [
        'recipes sheet is a sheet at "https://example.com/recipes.csv"',
        "a recipe is a thing:",
        "\t- it lives in the recipes sheet"
      ].join("\n")
    )
    expect(sheet.statements.find(({ place }) => place)?.place?.details?.readOnly).toBe(true)
    const { errors } = importerOf(sheet, ["to look:", "\tadd a new recipe to every recipe"].join("\n"))
    expect(errors.join("\n")).toMatch(/read only|can't be written|only be read/i)
  })

  it("a sheet at a place server stays writable", () => {
    const sheet = libraryDeclarations(
      [
        'recipes sheet is a sheet at "/api/places/recipes"',
        "a recipe is a thing:",
        "\t- it lives in the recipes sheet"
      ].join("\n")
    )
    expect(sheet.statements.find(({ place }) => place)?.place?.details?.readOnly).toBeUndefined()
    const { errors } = importerOf(sheet, ["to look:", "\tadd a new recipe to every recipe"].join("\n"))
    expect(errors).toEqual([])
  })

  it("older declarations, with none of it, still load:  the type stays in memory", () => {
    const declarations = libraryDeclarations(LIBRARY)
    const older = {
      ...declarations,
      statements: declarations.statements.map(({ place: _place, savedIn: _savedIn, ...rest }) => rest)
    }
    const { compiled, errors } = importerOf(older, "to look:\n\tprint every recipe")
    expect(errors).toEqual([])
    expect(compiled).not.toContain("savedThings")
  })

  it("a place from a third project:  the type is still saved, with nothing known of the place", () => {
    const whole = libraryDeclarations(LIBRARY)
    const middle = {
      ...whole,
      provides: whole.provides.filter((name) => name !== "FamilyCookbook"),
      statements: whole.statements.filter(({ type }) => type !== "FamilyCookbook")
    }
    const { imports, compiled } = importerOf(middle, "to look:\n\tprint every recipe")
    expect(compiled).toContain("core.savedThings(Recipe)")
    const saved = imports.types.get("Recipe", "LOCAL_ONLY")?.savedPlace()
    expect(saved?.place).toBe("family_cookbook")
    expect(saved?.placeType.placeKind).toBeUndefined()
  })
})

describe("in Spanish", () => {
  const declarations = libraryDeclarations(LIBRARY_ES, "/Biblioteca.es.spell")

  it("the declarations say where it's saved", () => {
    expect(declarations.statements.find(({ savedIn }) => savedIn)).toMatchObject({
      type: "Receta",
      savedIn: { place: "recetario_familiar", placeType: "RecetarioFamiliar", collection: "recetas" }
    })
  })

  it("cada receta, in a Spanish importer, reads the place", () => {
    const { compiled, errors } = importerOf(declarations, ["para mirar:", "\timprimir cada receta"].join("\n"), {
      path: "/Programa.es.spell"
    })
    expect(errors).toEqual([])
    expect(compiled).toContain("core.savedThings(Receta)")
  })

  it("an English importer of a Spanish library reads it too", () => {
    const { compiled } = importerOf(declarations, "to look:\n\tprint every receta")
    expect(compiled).toContain("core.savedThings(Receta)")
  })
})

describe("a project names an imported place on its own type's line (epic `data` T161)", () => {
  const declarations = libraryDeclarations(LIBRARY)

  it("its own type is saved there", () => {
    const { errors, compiled } = importerOf(
      declarations,
      ["a note is a thing:", "\t- it is saved in the family cookbook", '\t- its "text" is text'].join("\n")
    )
    expect(errors).toEqual([])
    expect(compiled).toMatch(/static savedIn = \{\s+place: "family_cookbook",\s+collection: "notes"/)
  })

  it("its top-level line says so too, and Spanish reads the same", () => {
    const es = importerOf(
      libraryDeclarations(LIBRARY_ES, "/Library.es.spell"),
      ["una nota es una cosa:", "\t- vive en el recetario familiar"].join("\n"),
      { path: "/Program.es.spell" }
    )
    expect(es.errors).toEqual([])
    const en = importerOf(
      declarations,
      ["a note is a thing:", '\t- its "text" is text', "a note is saved in the family cookbook"].join("\n")
    )
    expect(en.errors).toEqual([])
  })
})
