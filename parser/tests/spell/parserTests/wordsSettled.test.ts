/**
 * Owen's word picks, each read by the real parser (epic `data` P15):  what's written, what it compiles to, and that the old
 * words are gone, with no alias.
 * - Both languages.  What each kind of place does at run time:  `tests/core/places.test.ts`.
 */
import { describe, expect, it } from "vite-plus/test"

import { parseSpellProject, runSpell } from "spell/parser/spell/test"

/**
 * A program's lines, compiled:  what a test asks of it.
 * - `projectPath`:  its project's address, if it has one.
 */
function compiled(lines: string[], path = "/Test.spell", projectPath?: string) {
  const { files } = parseSpellProject(
    [{ path, contents: `${lines.join("\n")}\n` }],
    projectPath === undefined ? {} : { projectPath }
  )
  const { compiled: js, errors, warnings } = files[0]!
  return { js, errors: errors as unknown as string[], warnings: warnings as unknown as string[] }
}

/** The same, in Spanish. */
const compiledEs = (lines: string[]) => compiled(lines, "/Test.es.spell")

const RECIPE_AIRTABLE = `a recipe is a thing:
	- it lives in the family cookbook
	- its "title" is text`

const PLACE = "family cookbook is an in memory database"
const RECIPE = `a recipe is a thing:
	- it lives in the family cookbook
	- its "title" is text
	- its "cook" is text
	- its "price" is a number
	- its "prices" is a list of numbers`

/** `lines` as an action's, in a program with saved recipes. */
function inAction(...lines: string[]) {
  return compiled([
    PLACE,
    RECIPE,
    "box is an app:",
    '\t- its "search" is text',
    "\t- to go:",
    ...lines.map((l) => `\t\t${l}`)
  ])
}

const PLACE_ES = "recetario familiar es una base de datos en memoria"
const RECIPE_ES = `una receta es una cosa:
	- vive en el recetario familiar
	- su "título" es texto
	- su "cocinero" es texto`

/** `lines` as an action's, in Spanish. */
function inActionEs(...lines: string[]) {
  return compiledEs([
    PLACE_ES,
    RECIPE_ES,
    "caja es una aplicación:",
    '\t- su "búsqueda" es texto',
    "\t- para ir:",
    ...lines.map((l) => `\t\t${l}`)
  ])
}

describe("a place's line", () => {
  it.each([
    ['family cookbook is a web server at "https://x"', "web server"],
    ['family cookbook is a web server from "https://x"', "web server"],
    ['family cookbook is a graphql server at "https://x"', "graphql server"],
    ['family cookbook is a data folder at "recipes"', "data folder"],
    ['family cookbook is a file at "/api/recipes"', "file"],
    ['family cookbook is a sheet at "r.csv"', "sheet"],
    ['family cookbook is a spreadsheet at "r.csv"', "sheet"],
    ['family cookbook is a spreadsheet at "r.xlsx"', "sheet"],
    ['family cookbook is an excel file at "r.xlsx"', "excel file"],
    ['family cookbook is an Excel file at "r.xlsx"', "excel file"],
    ['family cookbook is a google sheet at "https://docs.google.com/spreadsheets/d/1/edit"', "google sheet"],
    ['family cookbook is a room at "wss://x"', "room"],
    ["family cookbook is a database on this device", "database on this device"],
    ["family cookbook is an in memory database", "in memory database"]
  ])("%s", (line, kind) => {
    const { js, errors } = compiled([line])
    expect(errors).toEqual([])
    expect(js).toContain(`kind: "${kind}"`)
  })

  it.each([
    ['recetario es un servidor web en "https://x"', "web server"],
    ['recetario es un servidor web desde "https://x"', "web server"],
    ['recetario es un servidor graphql en "https://x"', "graphql server"],
    ['recetario es una carpeta de datos en "recetas"', "data folder"],
    ['recetario es una hoja en "r.csv"', "sheet"],
    ['recetario es una hoja de cálculo en "r.csv"', "sheet"],
    ['recetario es una hoja de cálculo en "recetas.xlsx"', "sheet"],
    ['recetario es un archivo de excel en "recetas.xlsx"', "excel file"],
    ['recetario es una hoja de google en "https://docs.google.com/spreadsheets/d/1/edit"', "google sheet"],
    ['recetario es una sala en "wss://x"', "room"],
    ["recetario es una base de datos en este dispositivo", "database on this device"],
    ["recetario es una base de datos en memoria", "in memory database"]
  ])("%s", (line, kind) => {
    const { js, errors } = compiledEs([line])
    expect(errors).toEqual([])
    expect(js).toContain(`kind: "${kind}"`)
  })

  describe("a project data folder (epic `atmosphere` P1)", () => {
    it("a full address is that folder in that space, on the page server", () => {
      const { js, errors } = compiled(['family cookbook is a data folder at "owen@spell/recipes"', RECIPE_AIRTABLE])
      expect(errors).toEqual([])
      expect(js).toContain('kind: "data folder"')
      expect(js).toContain('at: "/api/places/spaces/owen@spell/recipes"')
    })

    it("a name alone is the program's own, in its project's __data;  a project with no address keeps it as written", () => {
      const lines = ['family cookbook is a data folder at "recipes"', RECIPE_AIRTABLE]
      const { js } = compiled(lines, "/Test.spell", "@spell/examples/recipe-box")
      expect(js).toContain('at: "/api/places/spaces/@spell/examples/recipe-box/__data/recipes"')
      expect(compiled(lines).js).toContain('at: "recipes"')
    })

    it("a CSV file's name alone is the program's own file, in its project's __data, and takes writes (epic `language` T65)", () => {
      const write = ["a recipe:", "\t- to rename:", '\t\tset its title to "x"']
      const lines = ['family cookbook is a sheet at "recipes.csv"', RECIPE_AIRTABLE, ...write]
      const { js, errors } = compiled(lines, "/Test.spell", "@spell/examples/recipe-box")
      expect(errors).toEqual([])
      expect(js).toContain('kind: "sheet"')
      expect(js).toContain('at: "/api/places/spaces/@spell/examples/recipe-box/__data/recipes.csv"')
      // anywhere else, a file at that address, read only, as before
      expect(compiled(lines).errors.join()).toContain("read only")
      const beside = ['family cookbook is a sheet at "./recipes.csv"', RECIPE_AIRTABLE, ...write]
      expect(compiled(beside, "/Test.spell", "@spell/examples/recipe-box").errors.join()).toContain("read only")
      const es = compiled(['recetario es una hoja en "recetas.csv"'], "/Test.es.spell", "@spell/examples/recetas")
      expect(es.js).toContain('at: "/api/places/spaces/@spell/examples/recetas/__data/recetas.csv"')
    })

    it("personal is one for each person;  a web folder's address is as it was", () => {
      expect(compiled(['family cookbook is a data folder at personal "recipes"', RECIPE_AIRTABLE]).js).toContain(
        'at: "/api/places/spaces/personal/recipes"'
      )
      expect(compiled(['x is a data folder at "recipes/"']).js).toContain('at: "recipes/"')
      expect(compiled(['x is a data folder at "https://example.com/recipes"']).js).toContain(
        'at: "https://example.com/recipes"'
      )
    })

    it("personal takes a name, not an address, and goes with a data folder alone", () => {
      expect(compiled(['x is a data folder at personal "owen@spell/recipes"']).errors.join()).toContain(
        "write a name alone"
      )
      expect(compiled(['x is a web server at personal "recipes"']).errors).not.toEqual([])
    })

    it("in Spanish:  carpeta de datos personal", () => {
      const { js, errors } = compiledEs(['recetario es una carpeta de datos personal en "recetas"'])
      expect(errors).toEqual([])
      expect(js).toContain('at: "/api/places/spaces/personal/recetas"')
      expect(compiledEs(["recetario es una atmosphere personal"]).errors).toEqual([])
    })

    it("checked more often than its server takes says so at the line;  as often or less, nothing", () => {
      const often = compiled(['x is a data folder at "owen@spell/recipes":', "\t- check it every 1 second"])
      expect(often.warnings.join("\n")).toContain("asked at most every 5 seconds")
      const fine = compiled(['x is a data folder at "owen@spell/recipes":', "\t- check it every 5 seconds"])
      expect(fine.warnings.join("\n")).not.toContain("asked at most every")
      const web = compiled(['x is a data folder at "/api/places/x":', "\t- check it every 1 second"])
      expect(web.warnings.join("\n")).not.toContain("asked at most every")
    })
  })

  describe("an airtable", () => {
    const LINES = [
      'family cookbook is an airtable at "appXXXXXXXXXXXXXX":',
      '\t- recipes live at "Recipes"',
      '\t- a recipe\'s title is its "Title"',
      '\t- its id is its "Spell id"',
      '\t- its key is the secret "AIRTABLE_KEY"',
      "\t- check it every 30 seconds",
      RECIPE_AIRTABLE
    ]

    it("compiles with the settled details, all of them handed to the place", () => {
      const { js, errors } = compiled(LINES)
      expect(errors).toEqual([])
      expect(js).toContain('kind: "airtable"')
      expect(js).toContain('at: "appXXXXXXXXXXXXXX"')
      expect(js).toContain('at: "Recipes"')
      expect(js).toContain('title: "Title"')
      expect(js).toContain('idColumn: "Spell id"')
      expect(js).toContain('keyNamed: "AIRTABLE_KEY"')
      expect(js).toContain("checkedEvery: 30")
    })

    it("in Spanish too", () => {
      const { js, errors } = compiledEs(['x es un airtable en "appX"'])
      expect(errors).toEqual([])
      expect(js).toContain('kind: "airtable"')
    })

    it("an address copied from a browser, and a place server's, are fine;  anything else isn't a base", () => {
      expect(compiled(['x is an airtable at "https://airtable.com/appAbc123/tblX/viwY"']).errors).toEqual([])
      expect(compiled(['x is an airtable at "http://127.0.0.1:4791/api/places/airtable"']).errors).toEqual([])
      expect(compiled(['x is an airtable at "patSomeToken.abc"']).errors.join()).toContain("isn't an Airtable base")
    })

    it("a key written into the program won't compile", () => {
      const { errors } = compiled(['x is an airtable at "appX":', '\t- its key is "patAbc.123"'])
      expect(errors.join()).toContain("can be read by anyone")
    })

    it("says, at its line, what it can't promise", () => {
      const { warnings } = compiled(LINES)
      const said = warnings.join("\n")
      expect(said).toContain("the last save wins it, with no notice")
      expect(said).toContain("edits made in Airtable itself")
      expect(said).toContain("formulas, lookups, rollups")
      expect(said).toContain("1,000 requests a month")
      expect(said).toContain("needs a small server side")
      expect(said).not.toContain("second row")
      expect(said).not.toContain('add "- check it every')
    })

    it("with no id column, no key and no check, it says those too", () => {
      const said = compiled(['x is an airtable at "appX"']).warnings.join("\n")
      expect(said).toContain("would be a second row")
      expect(said).toContain("Airtable answers nobody without a key")
      expect(said).toContain("check it every 30 seconds")
    })

    it("at a place server, the key isn't this program's business", () => {
      const said = compiled(['x is an airtable at "/api/places/x"']).warnings.join("\n")
      expect(said).not.toContain("Airtable answers nobody without a key")
    })

    it("the people here has no answer on it, and says so", () => {
      const { warnings } = compiled(['x is an airtable at "appX"', "print the people here"])
      expect(warnings.join("\n")).toContain("No place here knows who else is here")
    })

    it("in one go isn't all or nothing on it, and says so", () => {
      const { warnings } = compiled([
        ...LINES,
        "to go:",
        "\tin one go:",
        '\t\tadd (a new recipe with title = "x") to the recipes'
      ])
      expect(warnings.join("\n")).toContain("can't apply changes all together")
    })
  })

  it.each([
    ['x is an atmosphere account at "did:plc:abc123"', "atmosphere account", "did:plc:abc123"],
    ['x is an atmosphere at "did:plc:abc123"', "atmosphere account", "did:plc:abc123"],
    ['x is an ATmosphere account from "did:web:example.com"', "atmosphere account", "did:web:example.com"],
    ["x is a personal atmosphere account", "personal atmosphere account", undefined],
    ["x is a personal atmosphere", "personal atmosphere account", undefined],
    ['x is a personal ATmosphere at "com.example.cookbook"', "personal atmosphere account", "com.example.cookbook"]
  ])("%s", (line, kind, at) => {
    const { js, errors, warnings } = compiled([line])
    expect(errors).toEqual([])
    expect(js).toContain(`kind: "${kind}"`)
    if (at) expect(js).toContain(`at: "${at}"`)
    // what no referee can promise, at this line, plainly
    expect(warnings.join()).toContain("is public")
    expect(warnings.join()).toContain("Don't keep anything private here")
    expect(warnings.join()).toContain("only their own records")
    expect(warnings.join()).toContain('"everyone here" means everyone with records here')
    expect(warnings.join()).toContain("a decimal number as text")
    expect(warnings.join()).toContain("load them into the browser")
    // it announces what changed:  no asking for a check
    expect(warnings.join()).not.toContain("check it every")
  })

  it.each([
    ['x es una cuenta de atmosphere en "did:plc:abc123"', "atmosphere account"],
    ['x es una cuenta de ATmosphere desde "did:plc:abc123"', "atmosphere account"],
    ["x es una cuenta personal de ATmosphere", "personal atmosphere account"],
    ['x es una cuenta personal de atmosphere en "com.example.recetario"', "personal atmosphere account"]
  ])("%s", (line, kind) => {
    const { js, errors, warnings } = compiledEs([line])
    expect(errors).toEqual([])
    expect(js).toContain(`kind: "${kind}"`)
    expect(warnings.join()).toContain("es público")
    expect(warnings.join()).toContain("solo sus propios registros")
  })

  it("an atmosphere account's lines:  its accounts and where its collections are", () => {
    const { js, errors } = compiled([
      'family cookbook is a personal atmosphere account at "com.example.cookbook":',
      '\t- recipes live at "com.example.recipe"',
      '\t- it includes the account "did:plc:alice"',
      '\t- it includes the account "did:web:bob.example"',
      "a recipe is a thing:",
      "\t- it lives in the family cookbook"
    ])
    expect(errors).toEqual([])
    expect(js).toContain('accounts: ["did:plc:alice", "did:web:bob.example"]')
    expect(js).toContain('at: "com.example.recipe"')

    const es = compiledEs(["recetario es una cuenta personal de atmosphere:", '\t- incluye la cuenta "did:plc:ana"'])
    expect(es.errors).toEqual([])
    expect(es.js).toContain('accounts: ["did:plc:ana"]')
  })

  it("an atmosphere account says what the protocol can't read, at the line", () => {
    expect(compiled(['x is an atmosphere account at "alice.bsky.social"']).errors.join()).toContain("isn't an account")
    expect(compiled(['x is a personal atmosphere account at "cookbook"']).errors.join()).toContain(
      "isn't a corner of an account"
    )
    expect(
      compiled(["x is a personal atmosphere account:", '\t- it includes the account "alice"']).errors.join()
    ).toContain("isn't an account")
    expect(
      compiled([
        "x is a personal atmosphere account:",
        '\t- recipes live at "com.example.my-recipe"',
        "a recipe is a thing"
      ]).errors.join()
    ).toContain("isn't a collection there")
    // his typo, twice on the page:  no such word
    expect(compiled(['x is an atmoshphere at "did:plc:abc123"']).errors.join()).toContain("Don't understand")
  })

  it("a `version 2` line says what it can't do on an atmosphere account:  nothing's really renamed", () => {
    const lines = (place: string) => [
      place,
      "a recipe is a thing:",
      "\t- it lives in the family cookbook",
      '\t- its "title" is text',
      "a recipe version 2 renames name to title"
    ]
    const there = compiled(lines('family cookbook is an atmosphere account at "did:plc:abc"'))
    expect(there.errors).toEqual([])
    expect(there.warnings.join()).toContain("can't rename what's saved")
    expect(compiled(lines(PLACE)).warnings.join()).not.toContain("can't rename what's saved")
    expect(compiled(lines(PLACE)).warnings.join()).not.toContain("is public")
  })

  it("`everyone here` on an atmosphere account can say:  no warning it's only you", () => {
    const { warnings } = compiled([
      "family cookbook is a personal atmosphere account",
      "print the number of everyone here"
    ])
    expect(warnings.join()).not.toContain("only ever you")
  })

  it("`is saved in`'s two jobs:  a new name and the cloud, or a type and a place", () => {
    // the cloud (epic `atmosphere` P8):  each person's own project data folder on Spell's server, plainly said
    const cloud = compiled([
      "family cookbook is saved in the cloud",
      "a recipe is a thing:",
      "\t- it lives in the family cookbook",
      '\t- its "title" is text'
    ])
    expect(cloud.errors).toEqual([])
    expect(cloud.js).toContain('kind: "the cloud"')
    expect(cloud.js).toContain('at: "/api/places/spaces/personal/family-cookbook"')
    expect(cloud.js).toContain("checkedEvery: 5")
    expect(cloud.warnings.join()).toContain(`family cookbook is kept in each person's own space on Spell's server`)
    expect(cloud.warnings.join()).not.toContain("can't say")
    const nube = compiledEs(["recetario familiar se guarda en la nube"])
    expect(nube.errors).toEqual([])
    expect(nube.js).toContain('at: "/api/places/spaces/personal/recetario-familiar"')
    expect(compiled(["a recipe is a thing:", "\t- it is saved in the cloud"]).errors.join()).toContain(
      "Name the place first"
    )

    const saved = compiled([PLACE, "a recipe is a thing", "a recipe is saved in the family cookbook"])
    expect(saved.errors).toEqual([])
    expect(saved.js).toContain('place: "family_cookbook"')

    // a program's own place called `cloud` is the place meant
    const own = compiled(['cloud is a room at "wss://x"', "a recipe is a thing:", "\t- it is saved in the cloud"])
    expect(own.errors).toEqual([])
    expect(own.js).toContain('place: "cloud"')

    // and `is saved in its own file` keeps its meaning
    expect(compiled(["a recipe is a thing:", "\t- it is saved in its own file"]).js).not.toContain("place:")
  })

  it("a program's own `room` and `file` are still its own", () => {
    const { js, errors } = compiled([
      "a room is a thing",
      'family cookbook is a room at "wss://x"',
      "box is an app:",
      '\t- its "room" is a room',
      "\t- to go:",
      "\t\tprint the room"
    ])
    expect(errors).toEqual([])
    expect(js).toContain('kind: "room"')
    expect(js).toContain("core.console.log(this.room)")
  })

  it("the old words are gone", () => {
    for (const line of [
      'x is a web service at "https://x"',
      'x is a graph service at "https://x"',
      'x is a folder at "r"',
      'x is a live room at "wss://x"',
      "x is this device",
      "x is in memory",
      "x is the cloud"
    ]) {
      expect(compiled([line]).js).not.toContain("core.place(")
    }
  })

  it("Spanish names its kinds, and takes a kind of place from a library", () => {
    expect(compiledEs(['r es una carpeta de datos en "r"']).warnings.join()).toContain('"carpeta de datos"')
    const made = compiledEs(["un proyecto supabase es un lugar", 'recetario es un proyecto supabase en "https://x"'])
    expect(made.errors).toEqual([])
    expect(made.js).toContain("extends ProyectoSupabase")
  })
})

describe("the details under a place", () => {
  it("each says what it did", () => {
    const { js, errors } = compiled([
      'family cookbook is a web server at "https://x":',
      '\t- recipes live at "/dishes"',
      `\t- a recipe's title is its "dish_name"`,
      `\t- a recipe's cook is "chef"`,
      '\t- its version is its "version"',
      '\t- its id is "id"',
      "\t- check it every 30 seconds",
      RECIPE.replace("the family cookbook", "the family cookbook")
    ])
    expect(errors).toEqual([])
    expect(js).toContain('recipes: { at: "/dishes", fields: { title: "dish_name", cook: "chef" } }')
    expect(js).toContain('versionsIn: "version"')
    expect(js).toContain('idColumn: "id"')
    expect(js).toContain("checkedEvery: 30")
  })

  it("in Spanish", () => {
    const { js, errors } = compiledEs([
      'recetario familiar es un servidor web en "https://x":',
      '\t- las recetas están en "/platos"',
      '\t- el título de una receta se llama "plato"',
      '\t- su versión está en "version"',
      '\t- su identificador está en "id"',
      "\t- se revisa cada 30 segundos",
      RECIPE_ES
    ])
    expect(errors).toEqual([])
    expect(js).toContain('recetas: { at: "/platos", fields: { título: "plato" } }')
    expect(js).toContain('versionsIn: "version"')
    expect(js).toContain('idColumn: "id"')
    expect(js).toContain("checkedEvery: 30")
  })

  it('off a place, they\'re plain words:  `its id is its "id"` declares nothing', () => {
    expect(compiled(["a recipe is a thing:", '\t- its id is its "id"']).js).not.toContain("idColumn")
  })
})

describe("reading", () => {
  it.each([
    ["every recipe", "core.savedThings(Recipe)"],
    ["all recipes", "core.savedThings(Recipe)"],
    ["recipes", "core.savedThings(Recipe)"],
    ["the recipes", "core.savedThings(Recipe)"],
    ['recipes where its title is "x"', 'core.savedThings(Recipe, { filter: { title: "x" } })'],
    ['all recipes where its title is "x"', 'core.savedThings(Recipe, { filter: { title: "x" } })'],
    ['the recipes where its title is "x"', 'core.savedThings(Recipe, { filter: { title: "x" } })'],
    ['every recipe where its title is "x"', 'core.savedThings(Recipe, { filter: { title: "x" } })'],
    ['recipes where its cook is "Ana" or "Bo"', 'recipe.cook === "Ana" || recipe.cook === "Bo"'],
    ["every recipe, sorted by title", 'core.savedThings(Recipe, { sort: [{ field: "title" }] })'],
    ["every recipe sorted by title", 'core.savedThings(Recipe, { sort: [{ field: "title" }] })'],
    ["all recipes, sorted by title", 'core.savedThings(Recipe, { sort: [{ field: "title" }] })'],
    ["recipes sorted by title", 'core.savedThings(Recipe, { sort: [{ field: "title" }] })'],
    ["recipes, sorted by its title", 'core.savedThings(Recipe, { sort: [{ field: "title" }] })'],
    // `newest first`, `reversed` (epic `atmosphere` T48)
    [
      "recipes, sorted by title, reversed",
      'core.savedThings(Recipe, { sort: [{ field: "title", descending: true }] })'
    ],
    ["every recipe sorted by its title newest first", 'sort: [{ field: "title", descending: true }]'],
    ["every recipe, sorted by title, oldest first", 'core.savedThings(Recipe, { sort: [{ field: "title" }] })']
  ])("%s", (read, wanted) => {
    const { js, errors } = inAction(`print ${read}`)
    expect(errors).toEqual([])
    expect(js).toContain(wanted)
  })

  it.each([
    ["todas las recetas", "core.savedThings(Receta)"],
    ["todas recetas", "core.savedThings(Receta)"],
    ["recetas", "core.savedThings(Receta)"],
    ['recetas donde su título es "x"', 'core.savedThings(Receta, { filter: { título: "x" } })'],
    ['las recetas donde su título es "x"', 'core.savedThings(Receta, { filter: { título: "x" } })'],
    ["cada receta, ordenada por título", 'core.savedThings(Receta, { sort: [{ field: "título" }] })']
  ])("%s", (read, wanted) => {
    const { js, errors } = inActionEs(`imprimir ${read}`)
    expect(errors).toEqual([])
    expect(js).toContain(wanted)
  })

  it("a sort agrees with what it sorts, in Spanish", () => {
    expect(inActionEs("imprimir todas las recetas, ordenadas por título").warnings).toEqual([])
    expect(inActionEs("imprimir las recetas, ordenada por título").warnings.join()).toContain("ordenadas")
    expect(inActionEs("imprimir cada receta, ordenadas por título").warnings.join()).toContain("ordenada")
  })

  it("a sort key is a field first, and its own words after that", () => {
    const { js } = compiled([
      "box is an app:",
      '\t- its "names" is a list of text',
      "\t- to go:",
      "\t\tprint the names sorted by its length"
    ])
    expect(js).toContain("core.sortedBy(this.names, (item) => item.length)")
  })

  it("a program's own `recipes` wins, a bare plural or `all`:  its property, its variable", () => {
    const own = compiled([
      "a recipe is a thing",
      "box is an app:",
      '\t- its "recipes" is a list of recipes',
      "\t- to go:",
      "\t\tprint recipes",
      "\t\tprint all recipes",
      "\t\tprint recipes where it is 1"
    ])
    expect(own.errors).toEqual([])
    expect(own.js).not.toContain("everyThing")
    expect(own.js).toContain("core.console.log(this.recipes)")
    expect(own.js).toContain("core.filter(this.recipes, (recipe) => recipe === 1)")

    const variable = compiled(["a recipe is a thing", "set recipes to 3", "print recipes"])
    expect(variable.js).not.toContain("everyThing")

    const argument = compiled(["a recipe is a thing", "to go (recipes):", "\tprint recipes"])
    expect(argument.js).not.toContain("everyThing")

    const action = compiled(["a recipe is a thing", "to recipes:", "\tprint 1", "recipes"])
    expect(action.js).not.toContain("everyThing")
  })

  it("the (total|sum) of a list is the real thing, and a thing's own stays its own", () => {
    for (const word of ["total", "sum"]) {
      const { js, errors } = compiled([PLACE, RECIPE.concat(`\n\t- to go:\n\t\tprint the ${word} of its prices`)])
      expect(errors).toEqual([])
      expect(js).toContain("core.totalOf(this.prices)")
    }
    const own = compiled([
      "a bill is a thing:",
      '\t- its "total" is a number',
      "\t- to go:",
      "\t\tprint the total of it"
    ])
    expect(own.js).toContain("this.total")
    expect(own.js).not.toContain("totalOf")
    expect(inActionEs("imprimir el total de [1, 2]").js).toContain("core.totalOf([1, 2])")
    expect(inActionEs("imprimir la suma de [1, 2]").js).toContain("core.totalOf([1, 2])")
  })

  it("adds up, when it runs", () => {
    const run = runSpell(["set a to the total of [1, 2]", "set b to the sum of [3, 4]"])
    expect(run("a")).toEqual({ a: 3 })
    expect(run("b")).toEqual({ b: 7 })
  })

  it("(get|load|fetch) the recipes reads, and a program's own action wins", () => {
    for (const verb of ["get", "load", "fetch"]) {
      const { js, errors } = inAction(`${verb} the recipes`)
      expect(errors).toEqual([])
      expect(js).toContain("const it = await core.savedThings(Recipe)")
    }
    expect(inActionEs("cargar las recetas").js).toContain("const it = await core.savedThings(Receta)")
    expect(inActionEs("traer las recetas").js).toContain("const it = await core.savedThings(Receta)")
    expect(inActionEs("obtener las recetas").js).toContain("const it = await core.savedThings(Receta)")

    for (const verb of ["load", "fetch"]) {
      const own = compiled(["a recipe is a thing", `to ${verb} the recipes:`, "\tprint 1", `${verb} the recipes`])
      expect(own.errors).toEqual([])
      expect(own.js).not.toContain("everyThing")
    }
    // with no type of that name, `load` means nothing by itself
    expect(compiled(["load the scores"]).errors.join()).toContain("Don't understand")
  })
})

describe("there are", () => {
  it.each([
    ["there are no recipes", "core.itemCountOf(await core.savedThings(Recipe)) === 0"],
    ["there is no recipe", "core.itemCountOf(await core.savedThings(Recipe)) === 0"],
    ["there are less than 2 recipes", "core.itemCountOf(await core.savedThings(Recipe)) < 2"],
    ["there are fewer than 2 recipes", "core.itemCountOf(await core.savedThings(Recipe)) < 2"],
    ["there are more than 2 recipes", "core.itemCountOf(await core.savedThings(Recipe)) > 2"],
    ["there are at least 2 recipes", "core.itemCountOf(await core.savedThings(Recipe)) >= 2"],
    ["there are at most 2 recipes", "core.itemCountOf(await core.savedThings(Recipe)) <= 2"],
    ["there is one recipe", "core.itemCountOf(await core.savedThings(Recipe)) === 1"],
    ["there are 2 recipes", "core.itemCountOf(await core.savedThings(Recipe)) === 2"],
    ["there are recipes", "core.itemCountOf(await core.savedThings(Recipe)) > 0"],
    ["there is a recipe", "core.itemCountOf(await core.savedThings(Recipe)) > 0"],
    [
      'there is a recipe where its cook is "Ana"',
      'core.itemCountOf(await core.savedThings(Recipe, { filter: { cook: "Ana" } })) > 0'
    ],
    [
      'there are no recipes where its cook is "Ana"',
      'core.itemCountOf(await core.savedThings(Recipe, { filter: { cook: "Ana" } })) === 0'
    ]
  ])("%s", (words, wanted) => {
    const { js, errors, warnings } = inAction(`if ${words} then print 1`)
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
    expect(js).toContain(wanted)
  })

  it.each([
    ["no hay recetas", "core.itemCountOf(await core.savedThings(Receta)) === 0"],
    ["hay menos de 2 recetas", "core.itemCountOf(await core.savedThings(Receta)) < 2"],
    ["hay más de 2 recetas", "core.itemCountOf(await core.savedThings(Receta)) > 2"],
    ["hay al menos 2 recetas", "core.itemCountOf(await core.savedThings(Receta)) >= 2"],
    ["hay como mucho 2 recetas", "core.itemCountOf(await core.savedThings(Receta)) <= 2"],
    ["hay una receta", "core.itemCountOf(await core.savedThings(Receta)) === 1"],
    ["hay 2 recetas", "core.itemCountOf(await core.savedThings(Receta)) === 2"],
    ["hay recetas", "core.itemCountOf(await core.savedThings(Receta)) > 0"],
    [
      'no hay recetas donde su cocinero es "Ana"',
      'core.itemCountOf(await core.savedThings(Receta, { filter: { cocinero: "Ana" } })) === 0'
    ]
  ])("%s", (words, wanted) => {
    const { js, errors } = inActionEs(`si ${words} entonces imprimir 1`)
    expect(errors).toEqual([])
    expect(js).toContain(wanted)
  })

  it("reads anywhere an expression does, of a type in memory too", () => {
    const { js, errors } = compiled(["a dog is a thing", "set some to there are dogs"])
    expect(errors).toEqual([])
    expect(js).toContain("core.itemCountOf(core.everyThing(Dog)) > 0")
    const run = runSpell(["set scores to [1, 2]", "set few to there are less than 3 scores"])
    expect(run("few")).toEqual({ few: true })
    const run2 = runSpell(["set scores to [1, 2]", "set none to there are no scores where it is 3"])
    expect(run2("none")).toEqual({ none: true })
  })

  it("a program's own list wins:  a property, even with no type of that name;  its argument", () => {
    const own = compiled([
      "a recipe is a thing",
      "box is an app:",
      '\t- its "recipes" is a list of recipes',
      '\t- its "scores" is a list of numbers',
      "\t- to go:",
      "\t\tif there are no recipes then print 1",
      "\t\tif there are less than 2 scores then print 2",
      "\t\tif there are no scores where it is 1 then print 3"
    ])
    expect(own.errors).toEqual([])
    expect(own.js).toContain("core.itemCountOf(this.recipes) === 0")
    expect(own.js).toContain("core.itemCountOf(this.scores) < 2")
    expect(own.js).toContain("core.itemCountOf(core.filter(this.scores, (score) => score === 1)) === 0")

    const argument = compiled(["to go (scores):", "\tif there are no scores then print 1"])
    expect(argument.errors).toEqual([])
    expect(argument.js).toContain("core.itemCountOf(scores) === 0")
  })

  it("names nothing it can find:  not ours", () => {
    expect(compiled(["if there are no zebras then print 1"]).js).not.toContain("itemCountOf")
    expect(compiled(["a dog is a thing", "if there are no 2 dogs then print 1"]).js).not.toContain("itemCountOf")
    expect(compiled(["a dog is a thing", "if there are less than dogs then print 1"]).js).not.toContain("itemCountOf")
  })

  it("isn't the rider:  `if there are none:` has no noun, and hangs off a read", () => {
    const { js, errors } = compiled([
      PLACE,
      RECIPE.replace("a thing", "a view"),
      "box is an app:",
      "\t- to draw it:",
      "\t\tfor each recipe in the recipes",
      "\t\t\tdraw the recipe",
      "\t\tif there are none:",
      "\t\t\t<ui-text>None yet</ui-text>",
      "\t- to go:",
      "\t\tif there are no recipes then print 1"
    ])
    expect(errors).toEqual([])
    expect(js).toContain("none: () =>")
    expect(js).toContain("core.itemCountOf(await core.savedThings(Recipe)) === 0")
    // nor does a rider read outside a drawing
    expect(inAction("if there are none:", "\tprint 1").errors.join()).toContain("only goes in a drawing")
  })
})

describe("showing and changing", () => {
  it("while (waiting|loading), each a rider", () => {
    for (const word of ["waiting", "loading"]) {
      const { js, errors } = compiled([
        PLACE,
        RECIPE.replace("a thing", "a view"),
        "box is an app:",
        "\t- to draw it:",
        "\t\tfor each recipe in the recipes",
        "\t\t\tdraw the recipe",
        `\t\twhile ${word}:`,
        "\t\t\t<ui-loader/>"
      ])
      expect(errors).toEqual([])
      expect(js).toContain("waiting: () =>")
    }
  })

  it("in one go, discard, reload, stop", () => {
    const { js, errors } = compiled([
      PLACE,
      RECIPE,
      "box is an app:",
      "\t- to search:",
      "\t\tprint 1",
      "\t- to go:",
      "\t\tin one go:",
      "\t\t\tadd (a new recipe) to the recipes",
      "\t\tset d to a draft of (the first recipe)",
      "\t\tdiscard d",
      "\t\treload the recipes",
      "\t\tstop search",
      "\t\tstop the search",
      "\t\tcancel search",
      "\t\tcancel the search"
    ])
    expect(errors).toEqual([])
    expect(js).toContain("await core.inOneGo(")
    expect(js).toContain("core.discardDraft(d)")
    expect(js).toContain("core.reloadSaved(Recipe)")
    expect(js.match(/core\.cancelActions\(this, "search"\)/g)).toHaveLength(4)
  })

  it("in Spanish", () => {
    const { js, errors } = compiledEs([
      PLACE_ES,
      RECIPE_ES,
      "caja es una aplicación:",
      "\t- para buscar:",
      "\t\timprimir 1",
      "\t- para ir:",
      "\t\tde una vez:",
      "\t\t\tagregar (una nueva receta) a las recetas",
      "\t\tponer b a un borrador de (la primera receta)",
      "\t\tdescartar b",
      "\t\trecargar las recetas",
      "\t\tparar buscar",
      "\t\tcancelar buscar"
    ])
    expect(errors).toEqual([])
    expect(js).toContain("await core.inOneGo(")
    expect(js).toContain("core.discardDraft(b)")
    expect(js).toContain("core.reloadSaved(Receta)")
    expect(js.match(/core\.cancelActions\(this, "buscar"\)/g)).toHaveLength(2)
  })

  it("the old words are gone", () => {
    expect(inAction("all or nothing:", "\tprint 1").errors.join()).toContain("Don't understand")
    expect(inAction("refresh the recipes").errors.join()).toContain("Don't understand")
    // a property isn't an action, so there's nothing to cancel
    const box = compiled([PLACE, "box is an app:", '\t- its "draft" is text', "\t- to go:", "\t\tcancel the draft"])
    expect(box.js).not.toContain("cancelActions")
    expect(box.js).not.toContain("discardDraft")
  })
})

describe("the person using the program", () => {
  it("they, them, their, the person", () => {
    const { js, errors } = inAction(
      "print them",
      "print their name",
      "print the person",
      "print the name of the person",
      "print every recipe where its cook is them",
      "print every recipe where its cook is the person",
      "add a new recipe with cook = them",
      "add (a new recipe with cook = them) to the recipes",
      "add a new recipe with cook = them to the recipes",
      "if they are the cook of it then print 1",
      "if they are not the cook of it then print 2"
    )
    expect(errors.filter((e) => !/never says/.test(e))).toEqual([])
    expect(js).toContain("core.console.log(core.currentPerson())")
    expect(js).toContain("core.console.log(core.currentPerson().name)")
    expect(js).toContain("core.isCurrentPerson(recipe.cook)")
    expect(js.match(/core\.saveThing\(new Recipe\(\{ cook: core\.currentPerson\(\) \}\)\)/g)).toHaveLength(3)
    expect(js).toContain("if (core.isCurrentPerson(this.cook))")
    expect(js).toContain("if (!core.isCurrentPerson(this.cook))")
  })

  describe("`where they are the cook` (T66):  the short form of `where its cook is them`", () => {
    /** What `lines` compile to, less where each thing is in the file:  the short form is shorter, and that's all. */
    const lineOf = (...lines: string[]) => {
      const { js, errors } = compiled(lines)
      expect(errors).toEqual([])
      return js
        .split("\n")
        .filter((line) => !/^\s*(defined:|\/\/ )/.test(line))
        .join("\n")
        .replace(/declaredAt: \{[^}]*\}/g, "")
    }
    /** A program with a `"cook"` of its own, beside the recipe's. */
    const program = (line: string, ...before: string[]) =>
      lineOf(PLACE, RECIPE, "box is an app:", ...before, "\t- to go:", `\t\t${line}`)

    it.each([
      ["recipes where they are the cook", "recipes where its cook is them"],
      ["every recipe where they are the cook", "every recipe where its cook is them"],
      ["recipes where they are not the cook", "recipes where its cook is not them"],
      ["recipes where they aren't the cook", "recipes where its cook is not them"],
      [
        'recipes where they are the cook and its title is "Soup"',
        'recipes where its cook is them and its title is "Soup"'
      ],
      ["recipes where they are the cook, sorted by title", "recipes where its cook is them, sorted by title"]
    ])("`%s` compiles to just what `%s` does", (short, long) => {
      expect(program(`print ${short}`)).toEqual(program(`print ${long}`))
    })

    it("a place is handed the same read, for a list and a test of it", () => {
      const js = program("print recipes where they are the cook")
      expect(js).toContain("core.isCurrentPerson(recipe.cook)")
      expect(js).toContain("core.savedThings(Recipe")
      expect(program("if there are no recipes where they are the cook then print 1")).toEqual(
        program("if there are no recipes where its cook is them then print 1")
      )
      expect(program("remove the recipes where they are the cook from the box")).toEqual(
        program("remove the recipes where its cook is them from the box")
      )
    })

    it("a field of several words", () => {
      const lines = (line: string) =>
        lineOf(PLACE, 'a recipe is a thing:\n\t- it lives in the family cookbook\n\t- its "head cook" is text', line)
      expect(lines("print recipes where they are the head cook")).toEqual(
        lines("print recipes where its head cook is them")
      )
    })

    it("`the cook` is the recipe's, not the program's, which still has its own words", () => {
      const own = ['\t- its "cook" is text']
      const short = program("print recipes where they are the cook", ...own)
      expect(short).toEqual(program("print recipes where its cook is them", ...own))
      expect(short).not.toContain("this.cook")
      expect(program("print recipes where the cook is them", ...own)).toContain("core.isCurrentPerson(this.cook)")
    })

    it("`the cook of it` is the long form, still", () => {
      expect(program("print recipes where they are the cook of it")).toContain("core.isCurrentPerson(recipe.cook)")
    })

    it("a program's own `they` wins", () => {
      const js = program("print recipes where they are the cook", '\t- its "they" is text', '\t- its "cook" is text')
      expect(js).toContain("this.they === this.cook")
      expect(js).not.toContain("isCurrentPerson")
    })

    it("outside a `where`, `the cook` is what it always was", () => {
      expect(program("if they are the cook then print 1", '\t- its "cook" is text')).toContain(
        "if (core.isCurrentPerson(this.cook))"
      )
      expect(inAction("if they are the cook then print 1").errors.join()).toContain("Don't understand")
    })

    it("a field the thing hasn't got says so", () => {
      const { errors } = inAction("print recipes where they are the chef")
      expect(errors.join()).toContain('A recipe has no "chef"')
      // nor does a program's own `chef` stand in for it
      const own = compiled([
        PLACE,
        RECIPE,
        "box is an app:",
        '\t- its "chef" is text',
        "\t- to go:",
        "\t\tprint recipes where they are the chef"
      ])
      expect(own.errors.join()).toContain('A recipe has no "chef"')
    })

    it("in Spanish:  `recetas donde esa persona es el cocinero`", () => {
      const es = (line: string) => {
        const { js, errors } = inActionEs(line)
        expect(errors).toEqual([])
        return js
      }
      expect(es("imprimir recetas donde esa persona es el cocinero")).toEqual(
        es("imprimir recetas donde su cocinero es esa persona")
      )
      expect(es("imprimir recetas donde esa persona no es el cocinero")).toEqual(
        es("imprimir recetas donde su cocinero no es esa persona")
      )
      expect(es("imprimir recetas donde esa persona es el cocinero")).toContain("core.isCurrentPerson(receta.cocinero)")
      expect(inActionEs("imprimir recetas donde esa persona es el chef").errors.join()).toContain(
        'Una receta no tiene "chef"'
      )
    })
  })

  it("the old words are gone", () => {
    expect(inAction("print me").errors.join()).toContain("Don't understand")
    expect(inAction("print my name").errors.join()).toContain("Don't understand")
    expect(inActionEs("imprimir yo").errors.join()).toContain("No entiendo")
    expect(inActionEs("imprimir mi nombre").errors.join()).toContain("No entiendo")
  })

  it("inside `for each person in everyone here`, `the person` is the loop's, and `them` the one using it", () => {
    const { js, errors } = compiled([
      'family cookbook is a room at "wss://x"',
      "box is an app:",
      "\t- to go:",
      "\t\tfor each person in everyone here",
      "\t\t\tprint the person",
      "\t\t\tprint the name of the person",
      "\t\t\tprint them"
    ])
    expect(errors).toEqual([])
    expect(js).toContain("core.map(core.peopleHere(), (person) => {")
    expect(js).toContain("core.console.log(person)")
    expect(js).toContain("core.console.log(person.name)")
    expect(js).toContain("core.console.log(core.currentPerson())")
  })

  it("a `person` property or argument in scope wins too, and so does the person a type's action runs on", () => {
    const property = compiled(["box is an app:", '\t- its "person" is text', "\t- to go:", "\t\tprint the person"])
    expect(property.js).toContain("core.console.log(this.person)")
    expect(compiled(["to hello (person):", "\tprint the person"]).js).toContain("core.console.log(person)")
    const own = compiled(["a person is a thing:", "\t- to go:", "\t\tprint the person"])
    expect(own.js).toContain("core.console.log(this)")
  })

  it("in Spanish, `esa persona` and `la persona`:  `su` already means its", () => {
    const { js, errors } = inActionEs(
      "imprimir esa persona",
      "imprimir la persona",
      "imprimir el nombre de esa persona",
      "imprimir el nombre de la persona",
      "imprimir cada receta donde su cocinero es esa persona",
      "agregar una nueva receta con cocinero = esa persona"
    )
    expect(errors).toEqual([])
    expect(js).toContain("core.console.log(core.currentPerson())")
    expect(js).toContain("core.console.log(core.currentPerson().name)")
    // `la persona` is an ordinary read, as a loop's may be:  `inProgramWords()` lets it answer in Spanish
    expect(js).toContain("core.console.log(core.currentPerson().nombre)")
    expect(js).toContain("core.isCurrentPerson(receta.cocinero)")
    expect(js).toContain("core.saveThing(new Receta({ cocinero: core.currentPerson() }))")

    const loop = compiledEs([
      'recetario es una sala en "wss://x"',
      "caja es una aplicación:",
      "\t- para ir:",
      "\t\tpara cada persona en todos los presentes",
      "\t\t\timprimir la persona",
      "\t\t\timprimir esa persona"
    ])
    expect(loop.errors).toEqual([])
    expect(loop.js).toContain("core.console.log(persona)")
    expect(loop.js).toContain("core.console.log(core.currentPerson())")
  })

  it("everyone here, the people here", () => {
    const { js, errors } = compiled([
      'family cookbook is a room at "wss://x"',
      "set a to everyone here",
      "set b to the people here"
    ])
    expect(errors).toEqual([])
    expect(js.match(/core\.peopleHere\(\)/g)).toHaveLength(2)
  })

  it("add a new thing with no list:  only of a new thing", () => {
    expect(compiled(["add 1"]).errors.join()).toContain("Don't understand")
    const inMemory = compiled(["a dog is a thing", "add a new dog"])
    expect(inMemory.errors).toEqual([])
    expect(inMemory.js).toContain("new Dog()")
    expect(inMemory.js).not.toContain("saveThing")
    const own = compiled(["a dog is a thing", "to add (a dog):", "\tprint 1", "add a new dog"])
    expect(own.js).not.toContain("saveThing")
  })
})
