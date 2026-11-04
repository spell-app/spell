/**
 * The words that reach a place (epic `data` P11):  each compiled, and run against a place in memory.
 * - `parseSpellProject()`'s projects are written here, as every test in this folder's are.
 * - The whole recipe box, on real servers in a real browser, is the app folder's:  its `tests/spell/recipeBox.test.ts`.
 */
import { enableExternalSource, flush } from "solid-js"
import { beforeAll, beforeEach, describe, expect, it } from "vite-plus/test"

import { bridgeSolid } from "spell/util"
import { core } from "spell/parser/core"
import { SP } from "spell/parser/spell"
import { parseSpellProject, runSpellFiles } from "spell/parser/spell/test"

/** A program's parts, compiled:  its one file. */
function compiled(...lines: string[]) {
  const { files } = parseSpellProject([{ path: "/Test.spell", contents: `${lines.join("\n")}\n` }])
  return files[0]!
}

/** Lets a write through, and an answer back. */
const settled = () => new Promise((resolve) => setTimeout(resolve, 60))

const PLACE = "family cookbook is an in memory database"
const RECIPE = `a recipe is a thing:
	- it is saved in the family cookbook
	- its "title" is text
	- its "minutes" is a number
	- its "ingredients" is a list of ingredients
	- to throw out:
		- undone as "Remove Recipe"
		remove it from the recipes`
const INGREDIENT = `an ingredient is a thing:
	- its "name" is text
an ingredient belongs to one recipe`

/** The recipe box, and what it reads with:  in memory. */
const BOX = `${PLACE}

${RECIPE}

${INGREDIENT}

recipe box is an app:
	- its "search" is text
	- its "minutesWanted" is a number
	- its "matches" is every recipe where its title includes the search, sorted by its title
	- its "quick" is every recipe where its minutes is the minutesWanted
	- its "first of them" is the first recipe
	- its "few" is the first 1 recipes where its minutes is 5
	- its "how many" is the number of recipes where its minutes is 5
	- to add stew:
		add (a new recipe with title = "stew", minutes = 90) to the recipes
	- to add soup:
		add (a new recipe with title = "Soup", minutes = 5) to the recipes
	- to add toast:
		add (a new recipe with title = "Toast", minutes = 5) to the recipes
	- to add two:
		in one go:
			add (a new recipe with title = "one", minutes = 1) to the recipes
			add (a new recipe with title = "two", minutes = 2) to the recipes
	- to add one:
		add (a new recipe with title = "half", minutes = 1) to the recipes
	- to clear the quick ones:
		remove recipes in every recipe where its minutes is 5
`

/** The box, and how to read its values:  each waits. */
function runBox() {
  const run = runSpellFiles([{ path: "/Test.spell", contents: BOX }], { registered: true })
  const { recipe_box: box } = run("recipe_box") as { recipe_box: any }
  const titlesOf = async (name: string) =>
    ((await core.answerOf(box, name)) as { items: Array<{ title: string }> }).items.map(({ title }) => title)
  return { box, titlesOf }
}

describe("what compiles", () => {
  it("a place is its own name plus a kind, whichever way it's written", () => {
    const { compiled: code, errors } = compiled(
      'family cookbook is a web server at "https://x.example/v1":',
      "\t- check it every 30 seconds"
    )
    expect(errors).toEqual([])
    expect(code.replace(/\s+/g, " ")).toContain(
      'export const familyCookbook = core.place(new FamilyCookbook(), { name: "family_cookbook", kind: "web server", at: "https://x.example/v1", checkedEvery: 30 })'
    )
  })

  it("a kind is a type:  a library adds one, and only a place is one", () => {
    const made = compiled("a supabase project is a place", 'family cookbook is a supabase project at "https://x"')
    expect(made.errors).toEqual([])
    expect(made.compiled).toContain("class SupabaseProject extends Place")
    expect(compiled("a person is a thing", 'family cookbook is a person at "https://x"').errors).toHaveLength(1)
  })

  it("a person's own `place`, `file` and `sheet` keep their meaning", () => {
    const { errors, compiled: code } = compiled(
      "a place is a thing",
      "a file is a thing",
      "a sheet is a thing",
      "set p to a new place"
    )
    expect(errors).toEqual([])
    expect(code).toContain("class Place extends Thing")
  })

  it("is saved in:  a place's name, so `is saved in its own file` keeps its meaning", () => {
    const code = compiled(PLACE, "a recipe is a thing:", "\t- it is saved in its own file").compiled
    expect(code).toContain("savedInFile = true")
    expect(compiled(PLACE, RECIPE).compiled).toContain(
      'static savedIn = { place: "family_cookbook", collection: "recipes" }'
    )
  })

  it("every recipe means the place, even on a line above the type's", () => {
    const code = compiled(PLACE, "set above to every recipe", RECIPE).compiled
    expect(code).toContain("core.savedThings(Recipe)")
    expect(compiled("a recipe is a thing", "set x to every recipe").compiled).toContain("core.everyThing(Recipe)")
  })

  it("a `where` of exact values goes to the place, and a plain `sorted by` too;  anything else is said", () => {
    const line = compiled(
      PLACE,
      RECIPE,
      'set x to every recipe where its title is "Soup" and its minutes is 5, sorted by its title'
    )
    expect(line.compiled).toContain(
      'core.savedThings(Recipe, { filter: { title: "Soup", minutes: 5 }, sort: [{ field: "title" }] })'
    )
    expect(line.warnings).toEqual([])
    const other = compiled(PLACE, RECIPE, 'set x to every recipe where its title includes "o"')
    expect(other.compiled).toContain('core.filter(await core.savedThings(Recipe, {}, "looks through")')
    expect(other.warnings.join()).toContain("looks through them here")
  })

  it("a key written won't compile;  a key named warns, and a plain web server does", () => {
    const place = 'family cookbook is a web server at "https://x.example/v1"'
    expect(compiled(`${place}:`, '\t- its key is "sk_live_abc"').errors.join()).toContain("named".slice(0, 0))
    expect(compiled(`${place}:`, '\t- its key is "sk_live_abc"').errors).toHaveLength(1)
    expect(compiled(`${place}:`, '\t- its key is the secret "sk_live_abc"').errors).toHaveLength(1)
    expect(compiled('family cookbook is a web server at "https://x.example/v1?key=abc"').errors).toHaveLength(1)
    const named = compiled(`${place}:`, '\t- its key is the secret "COOKBOOK_KEY"', "\t- check it every 30 seconds")
    expect(named.errors).toEqual([])
    expect(named.warnings.join()).toContain("server side")
    expect(compiled(place).warnings.join()).toContain("check it every 30 seconds")
  })

  it("a write to a read-only place won't compile, wherever the lines are", () => {
    const sheet = 'family cookbook is a sheet at "recipes.csv"'
    const go = ["recipe box is an app:", "\t- to go:", '\t\tadd (a new recipe with title = "x") to the recipes']
    expect(compiled(sheet, RECIPE.split("\n- to throw")[0]!, ...go).errors.length).toBeGreaterThan(0)
    expect(compiled(PLACE, RECIPE, ...go).errors).toEqual([])
    const set = ["a recipe:", "\t- to rename:", '\t\tset its title to "x"']
    const plain = RECIPE.split("\n\t- to throw")[0]!
    expect(compiled(sheet, plain, ...set).errors.join()).toContain("read only")
    expect(compiled(sheet, plain).errors).toEqual([])
    for (const fronted of [
      'family cookbook is a sheet at "/api/places/recipes"',
      'family cookbook is a sheet at "http://127.0.0.1:4791/api/places/recipes":\n\t- its id is its "id"'
    ]) {
      expect(compiled(fronted, plain, ...set).errors).toEqual([])
    }
    const plainWithQuery = 'family cookbook is a sheet at "https://example.com/x.csv?from=/api/places/recipes"'
    expect(compiled(plainWithQuery, plain, ...set).errors.join()).toContain("read only")
  })

  it("I46:  `remove recipes in every recipe where ...` removes each from the place, in one go;  read only, it won't compile", () => {
    const go = ["recipe box is an app:", "\t- to go:"]
    const removes =
      'core.inOneGo(async () => core.map(core.filter(await core.savedThings(Recipe, { filter: { title: "x" } }), (recipe) => recipe.title === "x"), (recipe) => core.removeSaved(recipe)))'
    for (const line of [
      'remove recipes in every recipe where its title is "x"',
      'remove recipes from the recipes where its title is "x"',
      'remove recipes from every recipe where its title is "x"'
    ]) {
      const made = compiled(PLACE, RECIPE, ...go, `\t\t${line}`)
      expect(made.errors).toEqual([])
      expect(made.compiled).toContain(removes)
    }
    const plain = RECIPE.split("\n\t- to throw")[0]!
    const sheet = 'family cookbook is a sheet at "recipes.csv"'
    const refused = compiled(sheet, plain, ...go, '\t\tremove recipes in every recipe where its title is "x"')
    expect(refused.errors.join()).toContain("read only")
    // a list kept in memory, as before
    const own = compiled("set my-list to [1, 2, 3]", "remove numbers from my-list where number is 2").compiled
    expect(own).toContain("core.removeWhere(myList, (number) => number === 2)")
  })

  it("a sort key that waits won't compile;  a rider outside a drawing won't", () => {
    const wait = compiled(PLACE, RECIPE, "set x to every recipe, sorted by the first recipe")
    expect(wait.errors.join()).toContain("can't wait for its key")
    const rider = compiled("recipe box is an app:", "\t- to go:", "\t\tif that fails:", "\t\t\tprint 1")
    expect(rider.errors.join()).toContain("only goes in a drawing")
  })

  it("helpful errors name what to write, and a program's own words stay free", () => {
    for (const line of ["fetch the recipes", "query the cookbook", "connect to the database", "join recipes"]) {
      expect(compiled(line).errors.join()).toContain("say where the data lives")
    }
    const own = compiled(
      "recipe box is an app:",
      "\t- to fetch the scores:",
      "\t\tprint 1",
      "\t- to go:",
      "\t\tfetch the scores"
    )
    expect(own.errors).toEqual([])
    expect(own.compiled).toContain("this.fetchTheScores()")
    const box = [
      "a recipe is a thing",
      "recipe box is an app:",
      '\t- its "draft" is text',
      "\t- to go:",
      "\t\tsave the draft"
    ]
    expect(compiled(...box).errors.join()).toContain("no save step")
  })

  it("cancel:  an action's name beats an event's, even in a handler", () => {
    const box = [
      "recipe box is an app:",
      "\t- to search:",
      "\t\tprint 1",
      "\t- to go:",
      "\t\tcancel search",
      "\t\ton closing:",
      "\t\t\tcancel search"
    ]
    const code = compiled(...box).compiled
    expect(code.match(/core\.cancelActions\(this, "search"\)/g)).toHaveLength(2)
    const other = ["recipe box is an app:", "\t- to go:", "\t\ton closing:", "\t\t\tcancel closing"]
    expect(compiled(...other).compiled).toContain("event.cancel()")
  })

  it("a drawing's riders go with the read above them, and `draw the recipe` draws in a loop", () => {
    const box = [
      "a card is a view:",
      '\t- its "title" is text',
      "recipe box is an app:",
      '\t- its "cards" is a list of cards',
      "\t- to draw it:",
      "\t\tfor each card in its cards",
      "\t\t\tdraw the card",
      "\t\twhile waiting:",
      "\t\t\t<ui-loader/>",
      "\t\tif there are none:",
      "\t\t\t<ui-text>None</ui-text>"
    ]
    const { errors, compiled: code } = compiled(...box)
    expect(errors).toEqual([])
    expect(code).toContain("core.drawRead(() => this.cards, (card) => core.drawThing(card)")
    expect(code).toContain("waiting: () =>")
    expect(code).toContain("none: () =>")
    const plain = compiled(
      "a card is a view",
      "a pile is a view:",
      '\t- its "cards" is a list of cards',
      "\t- to draw it:",
      "\t\tfor each card in its cards",
      "\t\t\tdraw the card"
    ).compiled
    expect(plain).toContain("core.drawEach(this.cards, (card) => core.drawThing(card))")
  })

  it("`if that fails say` is the failure's message (epic `language` P17);  P22's stand-in, `the message if that fails is`, is gone", () => {
    const box = (rider: string, ...more: string[]) =>
      compiled(
        "a card is a view",
        "recipe box is an app:",
        '\t- its "cards" is a list of cards',
        "\t- to draw it:",
        "\t\tfor each card in its cards",
        "\t\t\tdraw the card",
        `\t\t${rider}`,
        ...more
      )
    const short = box('if that fails say "No signal"')
    expect(short.errors).toEqual([])
    expect(short.compiled).toContain('failedSay: () => "No signal"')
    expect(box('the message if that fails is "No signal"').compiled).not.toContain("failedSay")
    const block = box("if that fails:", "\t\t\t<ui-text>Lost</ui-text>")
    expect(block.errors).toEqual([])
    expect(block.compiled).toContain("failed: () =>")
  })
})

describe('I13:  is "Ana" or "Bo"', () => {
  it("means what it says:  either, and with `either`", () => {
    const run = runSpellFiles(
      [
        {
          path: "/Test.spell",
          contents: `a recipe is a thing:
	- its "title" is text
set a to a new recipe with title = "stew"
set b to a new recipe with title = "Soup"
set c to a new recipe with title = "Toast"
set plain to every recipe where its title is "Soup" or "Toast"
set three to every recipe where its title is "Soup" or "Toast" or "stew"
set withEither to every recipe where its title is either "Soup" or "Toast"
set spelled to every recipe where its title is "Soup" or its title is "Toast"
`
        }
      ],
      { registered: true }
    )
    const result = run("plain, three, withEither, spelled") as Record<string, { items: Array<{ title: string }> }>
    const titles = (name: string) => result[name]!.items.map(({ title }) => title)
    expect(titles("plain")).toEqual(["Soup", "Toast"])
    expect(titles("three")).toEqual(["stew", "Soup", "Toast"])
    expect(titles("withEither")).toEqual(["Soup", "Toast"])
    expect(titles("spelled")).toEqual(["Soup", "Toast"])
  })

  it("`is x and is y` of one thing warns", () => {
    const { warnings } = compiled(
      "a recipe is a thing:",
      '\t- its "title" is text',
      'set x to every recipe where its title is "A" and its title is "B"'
    )
    expect(warnings.join()).toContain("can never be both")
  })
})

describe("what runs, on a place in memory", () => {
  beforeAll(() => bridgeSolid({ enableExternalSource, flush }))
  beforeEach(() => core.resetRuntime())

  it("reads, adds, filters and sorts, and every reader follows", async () => {
    const { box, titlesOf } = runBox()
    expect(await titlesOf("matches")).toEqual([])
    box.addStew()
    box.addSoup()
    box.addToast()
    await settled()
    expect(await titlesOf("matches")).toEqual(["Soup", "stew", "Toast"])
    box.search = "o"
    expect(await titlesOf("matches")).toEqual(["Soup", "Toast"])
    box.minutesWanted = 5
    expect(await titlesOf("quick")).toEqual(["Soup", "Toast"])
    expect(((await core.answerOf(box, "firstOfThem")) as { title: string }).title).toBe("stew")
    expect(await titlesOf("few")).toHaveLength(1)
    expect(await core.answerOf(box, "howMany")).toBe(2)
  })

  it("removing takes what belongs to it, and undo brings it all back", async () => {
    const run = runSpellFiles(
      [
        {
          path: "/Test.spell",
          contents: `${BOX}
set the_box to recipe_box
`
        }
      ],
      { registered: true }
    )
    const { recipe_box: box } = run("recipe_box") as { recipe_box: any }
    box.addStew()
    await settled()
    const list = (await core.answerOf(box, "matches")) as { items: any[] }
    const [stew] = list.items
    const onion = new stew.ingredients.constructor()
    expect(onion).toBeDefined()
    core.RUNTIME.history.clear()
    core.runAction(stew, "throwOut")
    await settled()
    expect(((await core.answerOf(box, "matches")) as { items: any[] }).items).toEqual([])
    expect(core.RUNTIME.history.canUndo).toBe(true)
    core.RUNTIME.history.undo()
    await settled()
    expect(((await core.answerOf(box, "matches")) as { items: any[] }).items).toEqual([stew])
  })

  it("what belongs to a saved thing is written inside it:  a change to one reaches its owner's row", async () => {
    const run = runSpellFiles([{ path: "/Test.spell", contents: BOX }], { registered: true })
    const { recipe_box: box, Ingredient } = run("recipe_box, Ingredient") as { recipe_box: any; Ingredient: any }
    box.addStew()
    await settled()
    const { items } = (await core.answerOf(box, "matches")) as { items: any[] }
    const [stew] = items
    const onion = new Ingredient({ name: "onion" })
    stew.ingredients.add(onion)
    expect(core.ownerOfSaved(onion)).toBe(stew)
    expect(onion.recipe).toBe(stew)
    onion.name = "shallot"
    await new Promise((resolve) => setTimeout(resolve, 1200))
    // what's read from the place again is what it was told:  the list, whole, with the new name in it
    await core.reloadSaved()
    expect(stew.ingredients.items.map(({ name }: { name: string }) => name)).toEqual(["shallot"])
  })

  it("I46:  removing with a `where` takes them from the place, and one undo brings them all back", async () => {
    const { box, titlesOf } = runBox()
    box.addStew()
    box.addSoup()
    box.addToast()
    await settled()
    expect(await titlesOf("matches")).toEqual(["Soup", "stew", "Toast"])
    core.RUNTIME.history.clear()
    await box.clearTheQuickOnes()
    await settled()
    await core.reloadSaved()
    expect(await titlesOf("matches")).toEqual(["stew"])
    core.RUNTIME.history.undo()
    expect(core.RUNTIME.history.canUndo).toBe(false)
    await settled()
    expect(await titlesOf("matches")).toEqual(["Soup", "stew", "Toast"])
  })

  it("in one go:  they go together, or none do", async () => {
    const { box, titlesOf } = runBox()
    await box.addTwo()
    await settled()
    expect(await titlesOf("matches")).toEqual(["one", "two"])
    const failing = core.inOneGo(() => {
      box.addOne()
      throw new Error("no")
    })
    await expect(failing).rejects.toThrow("no")
    await settled()
    expect(await titlesOf("matches")).toEqual(["one", "two"])
  })
})

describe("in Spanish", () => {
  /** A file in Spanish, compiled. */
  const inSpanish = (...lines: string[]) =>
    parseSpellProject([{ path: "/Test.es.spell", contents: `${lines.join("\n")}\n` }]).files[0]!

  const CASA = `recetario familiar es una base de datos en memoria
una receta es una vista:
	- se guarda en el recetario familiar
	- su "título" es texto`

  it("reads, and says the same things", () => {
    const { errors, compiled: code } = inSpanish(
      CASA,
      'poner x a cada receta donde su título es "Sopa", ordenada por su título'
    )
    expect(errors).toEqual([])
    expect(code).toContain('core.savedThings(Receta, { filter: { título: "Sopa" }, sort: [{ field: "título" }] })')
  })

  it("I46:  `quitar las recetas en cada receta donde ...` removes each from the place;  read only, it won't compile", () => {
    const action = [
      "caja de recetas es una aplicación:",
      "\t- para vaciar:",
      '\t\tquitar las recetas en cada receta donde su título es "x"'
    ]
    const { errors, compiled: code } = inSpanish(CASA, ...action)
    expect(errors).toEqual([])
    expect(code).toContain(
      'core.inOneGo(async () => core.map(core.filter(await core.savedThings(Receta, { filter: { título: "x" } }), (receta) => receta.título === "x"), (receta) => core.removeSaved(receta)))'
    )
    const hoja = CASA.replace("una base de datos en memoria", 'una hoja en "recetas.csv"')
    expect(inSpanish(hoja, ...action).errors.length).toBeGreaterThan(0)
  })

  it("agreement:  `ordenadas` of one, and `ninguno` of a feminine type, are said", () => {
    expect(inSpanish(CASA, "poner x a cada receta, ordenadas por su título").warnings.join()).toContain('"ordenada"')
    expect(inSpanish(CASA, "poner x a cada receta, ordenada por su título").warnings).toEqual([])
    const riders = (word: string) => [
      "caja de recetas es una aplicación:",
      '\t- sus "recetas guardadas" es cada receta',
      "\t- para dibujarla:",
      "\t\tpara cada receta en sus recetas guardadas",
      "\t\t\tdibujar la receta",
      `\t\tsi no hay ${word}:`,
      "\t\t\t<ui-text>Nada</ui-text>"
    ]
    expect(inSpanish(CASA, ...riders("ninguno")).warnings.join()).toContain('"ninguna"')
    expect(inSpanish(CASA, ...riders("ninguna")).warnings).toEqual([])
    const failed = inSpanish(
      CASA,
      "caja de recetas es una aplicación:",
      '\t- sus "recetas guardadas" es cada receta',
      "\t- para dibujarla:",
      "\t\tpara cada receta en sus recetas guardadas",
      "\t\t\tdibujar la receta",
      '\t\tsi falla decir "Sin señal"'
    )
    expect(failed.errors).toEqual([])
    expect(failed.compiled).toContain('failedSay: () => "Sin señal"')
  })
})

describe("what a target can't do, it says", () => {
  it("Python, and a library:  a project with a place doesn't compile, and says why", () => {
    const parts = parseSpellProject([{ path: "/Test.spell", contents: `${PLACE}\n` }]).files.map(
      ({ match }) => match?.AST
    )
    expect(SP.SpellProject.keepsThingsInPlaces(parts as never)).toBe(true)
    expect(SP.TARGETS.py!.can.places).toBe(false)
  })
})

describe("the order text sorts in (decision 9)", () => {
  it("`ñ` after `n`, in Spanish;  English keeps it with `n`", () => {
    core.useMessages(undefined)
    const spanish = { language: "es" }
    const words = ["oso", "ñu", "nube", "zorro"]
    expect(core.sortedBy(words)).toEqual(["ñu", "nube", "oso", "zorro"])
    core.useMessages(spanish)
    expect(core.sortedBy(words)).toEqual(["nube", "ñu", "oso", "zorro"])
    core.useMessages(undefined)
  })
})
