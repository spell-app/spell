/**
 * The words for keeping up and for other people (epic `data` P13):  each compiled, and run against a place in memory.
 * - The whole thing, on a real room in two real pages, is the app folder's:  its `tests/spell/liveRoom.test.ts`.
 */
import { describe, expect, it } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"

/** What a program's file compiles to, its parse errors and its warnings. */
function compiled(...lines: string[]) {
  return compiledAs("/Test.spell", lines)
}

/** Spanish's. */
function compiledEs(...lines: string[]) {
  return compiledAs("/Test.es.spell", lines)
}

/** `lines`, as a file at `path`. */
function compiledAs(path: string, lines: string[]) {
  const { compiled: js, errors, warnings } = parseSpellProject([{ path, contents: `${lines.join("\n")}\n` }]).files[0]!
  return { js, errors, warnings }
}

const SAVED = `family cookbook is in memory
a recipe is a thing:
	- it is saved in the family cookbook
	- its "title" is text`

describe("the words compile", () => {
  it("`when a recipe changes:` is an event the core sends, not one nobody does", () => {
    const { js, errors } = compiled(
      SAVED,
      "when a recipe changes:",
      "\tprint the title of the recipe",
      "\tprint its title"
    )
    expect(errors).toEqual([])
    expect(js).toContain('on("a-recipe-change"')
    expect(js).toContain("const { recipe } = event")
    expect(js).toMatch(/console\.log\(recipe\.title\)[\s\S]*console\.log\(recipe\.title\)/)
  })

  it("in an outline it's that type's handler", () => {
    const { js, errors } = compiled(
      SAVED,
      "box is an app:",
      "\t- when a recipe changes:",
      "\t\tprint the title of the recipe"
    )
    expect(errors).toEqual([])
    expect(js).toContain("onARecipeChange(event)")
  })

  it("a type in no place won't compile, saying so:  it would never run", () => {
    const { errors } = compiled("a card is a thing", "when a card changes:", "\tprint 1")
    expect(errors.join()).toMatch(/isn't saved in a place/)
    expect(compiled("a card is a thing:", "\t- when someone else changes it:", "\t\tprint 1").errors.join()).toMatch(
      /isn't saved in a place/
    )
  })

  it("a line above the type that says it's saved still counts", () => {
    const { errors } = compiled("when a recipe changes:", "\tprint 1", SAVED)
    expect(errors).toEqual([])
  })

  it("`when someone else changes it:` is its handler, and at a file's top it needs a type", () => {
    const { js, errors, warnings } = compiled(
      'family cookbook is a live room at "/api/rooms/x"',
      "a recipe is a thing:",
      "\t- it is saved in the family cookbook",
      '\t- its "title" is text',
      "\t- when someone else changes it:",
      "\t\tprint its title"
    )
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
    expect(js).toContain("onSomeoneElseChange(event)")
    expect(compiled("when someone else changes it:", "\tprint 1").errors.join()).toMatch(/goes under a saved type/)
  })

  it("the table says what can't happen:  a file has no other people;  a plain web service says nothing", () => {
    const under = (place: string) =>
      compiled(
        place,
        "a recipe is a thing:",
        "\t- it is saved in the book",
        "\t- when someone else changes it:",
        "\t\tprint 1"
      )
    expect(under('book is a file at "/api/places/x"').warnings.join()).toMatch(/Nobody else can change/)
    expect(under("book is this device").warnings.join()).toMatch(/Nobody else can change/)
    expect(under('book is a web service at "https://x.test"').warnings.join()).toMatch(/this would never run:  add/)
    expect(
      under('book is a web service at "https://x.test":\n\t- it is checked every 30 seconds').warnings.join()
    ).not.toMatch(/never run/)
  })

  it("`the people here` warns with no place that knows, and not with a room", () => {
    expect(compiled(SAVED, "print the people here").warnings.join()).toMatch(/only ever you/)
    expect(compiled('book is a live room at "/x"', "print the people here").warnings.join()).not.toMatch(
      /only ever you/
    )
    expect(compiled(SAVED, "print me").js).toContain("core.currentPerson()")
  })

  it("`me` and `my name` are who's at this page", () => {
    const { js, errors } = compiled(SAVED, "print me", "print my name", "print my id", "print the name of me")
    expect(errors).toEqual([])
    expect(js).toContain("core.console.log(core.currentPerson())")
    expect(js).toContain("core.console.log(core.currentPerson().name)")
    expect(js).toContain("core.console.log(core.currentPerson().id)")
  })

  it("`its cook is me` asks by who they are:  what's saved of a person comes back a new object", () => {
    const { js, errors } = compiled(
      SAVED,
      "print every recipe where its cook is me",
      "print every recipe where its cook isn't me",
      "add (a new recipe with cook = me) to the recipes"
    )
    expect(errors).toEqual([])
    expect(js).toContain("core.isMe(recipe.cook)")
    expect(js).toContain("!core.isMe(recipe.cook)")
    expect(js).toContain("new Recipe({ cook: core.currentPerson() })")
  })

  it("Spanish says `soy yo`", () => {
    const { js, errors } = compiledEs(
      'recetario es una sala en vivo en "/x"',
      "una receta es una cosa:",
      "\t- se guarda en el recetario",
      '\t- su "título" es texto',
      "imprimir cada receta donde su título soy yo",
      "imprimir cada receta donde su título no soy yo"
    )
    expect(errors).toEqual([])
    expect(js).toContain("core.isMe(receta.título)")
    expect(js).toContain("!core.isMe(receta.título)")
  })

  it("`my` only reads what a person has", () => {
    expect(compiled("print my recipes").errors.join()).toMatch(/print my recipes/)
    expect(compiledEs("imprimir mis recetas").errors.join()).toMatch(/mis recetas/)
  })

  it("a program's own words win", () => {
    const variable = compiled("set me to 3", "print me").js
    expect(variable).not.toContain("core.currentPerson()")

    const own = compiled(
      "a card is a thing:",
      '\t- its "me" is text',
      '\t- its "my name" is text',
      "\t- to go:",
      "\t\tprint me",
      "\t\tprint my name"
    ).js
    expect(own).not.toContain("core.currentPerson()")
    expect(own).toContain("core.console.log(this.me)")
    expect(own).toContain("core.console.log(this.myName)")

    const actions = compiled("to show me:", "\tprint 1", "show me", "to draw my hand:", "\tprint 2", "draw my hand").js
    expect(actions).toContain("showMe()")
    expect(actions).toContain("drawMyHand()")

    const argument = compiled("to greet (me as text):", "\tprint me").js
    expect(argument).not.toContain("core.currentPerson()")
  })

  it("Spanish:  `lo` or `la`, with its type's gender", () => {
    const es = (word: string) =>
      compiledEs(
        'recetario es una sala en vivo en "/x"',
        "una receta es una cosa:",
        "\t- se guarda en el recetario",
        '\t- su "título" es texto',
        `\t- cuando otra persona ${word} cambia:`,
        "\t\timprimir su título",
        "cuando cambia una receta:",
        "\timprimir 1",
        "imprimir yo",
        "imprimir mi nombre",
        "imprimir las personas presentes"
      )
    expect(es("la").errors).toEqual([])
    expect(es("la").warnings).toEqual([])
    expect(es("la").js).toContain("onSomeoneElseChange(event)")
    expect(es("la").js).toContain('on("a-receta-change"')
    expect(es("la").js).toContain("core.currentPerson()")
    expect(es("la").js).toContain("core.peopleHere()")
    expect(es("la").js).toContain("core.currentPerson().name")
    expect(es("lo").warnings.join()).toMatch(/"la"/)
  })
})

describe("an action at a place's address (Q17's C)", () => {
  const PLACE = [
    'family cookbook is a web service at "https://example.com":',
    "\t- it is checked every 5 seconds",
    '\t- to publish a recipe is at "/recipes/publish"',
    '\t- to refresh is at "/recipes/refresh"'
  ]
  const RECIPE = ["a recipe is a thing:", "\t- it is saved in the family cookbook", '\t- its "title" is text']

  it("a known type's name is what's sent;  with none, nothing is", () => {
    const { js, errors, warnings } = compiled(...PLACE, ...RECIPE, "to go:", "\tpublish (a new recipe)", "\trefresh")
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
    expect(js).toContain('operations: { publish: "/recipes/publish", refresh: "/recipes/refresh" }')
    expect(js).toContain('return await core.callPlace("family_cookbook", "publish", this)')
    expect(js).toContain(
      'export async function refresh() {\n  return await core.callPlace("family_cookbook", "refresh")'
    )
    expect(js).toContain("await (new Recipe()).publish()")
    expect(js).toContain("await refresh()")
  })

  it("is known below its line:  a place's lines come first, as a saved type needs them to", () => {
    const { errors } = compiled("to go:", "\trefresh", ...PLACE)
    expect(errors.join()).toMatch(/refresh/)
  })

  it("Spanish", () => {
    const { js, errors, warnings } = compiledEs(
      'recetario familiar es un servicio web en "https://example.com":',
      "\t- se revisa cada 5 segundos",
      '\t- para publicar una receta está en "/recetas/publicar"',
      '\t- para recargar está en "/recetas/recargar"',
      "una receta es una cosa:",
      "\t- se guarda en el recetario familiar",
      '\t- su "título" es texto',
      "para ir:",
      "\tpublicar (una nueva receta)",
      "\trecargar"
    )
    expect(errors).toEqual([])
    expect(warnings).toEqual([])
    expect(js).toContain('return await core.callPlace("recetario_familiar", "publicar", this)')
    expect(js).toContain('core.callPlace("recetario_familiar", "recargar")')
  })

  it("only there:  anywhere else it warns, and does nothing", () => {
    const { js, errors, warnings } = compiled("a recipe is a thing", 'to publish a recipe is at "/x"')
    expect(errors).toEqual([])
    expect(warnings.join()).toMatch(/under that place/)
    expect(js).not.toContain("callPlace")
    expect(compiledEs("una receta es una cosa", 'para publicar una receta está en "/x"').warnings.join()).toMatch(
      /debajo de ese lugar/
    )
  })

  it("a kind of place that can't take one says so", () => {
    expect(compiled('book is a folder at "/x":', '\t- to refresh is at "/y"').warnings.join()).toMatch(
      /takes no action/
    )
  })

  it("doesn't change an action, and its body still reads", () => {
    const { js, errors } = compiled(
      "a card is a thing",
      "to deal a card:",
      "\tprint 1",
      "to find who is here:",
      "\tprint 2"
    )
    expect(errors).toEqual([])
    expect(js).not.toContain("callPlace")
    expect(js).toContain("deal()")
    expect(js).toContain("findWhoIsHere()")
  })

  it("what a place sends is read whole, whatever the program reads of it", () => {
    const { js } = compiled(...PLACE, ...RECIPE, "print every recipe")
    expect(js).toContain('static savedIn = { place: "family_cookbook", collection: "recipes" }')
  })

  it("the two-line form is gone", () => {
    const { errors } = compiled(...PLACE, "\t- to send a recipe:", '\t\t- it is at "/x"', ...RECIPE)
    expect(errors.join()).toMatch(/Don't understand/)
  })
})

describe("a type made from itself (T50)", () => {
  it("won't compile, and doesn't hang:  each walk up a type's parents ended only at one with none", () => {
    const hung = "app is an app:\n\t- to go:\n\t\tif it is empty:\n\t\t\tprint 1\nstart the app"
    const { errors } = compiled(hung)
    expect(errors.join()).toMatch(/made from itself/)
    expect(compiledEs("aplicación es una aplicación:", "\t- para ir:", "\t\timprimir 1").errors.join()).toMatch(
      /de sí mismo/
    )
  })

  it("two types made from each other don't hang either", () => {
    const { errors } = compiled(
      "a tick is a tock:",
      "\t- to go:",
      "\t\tif it is empty:",
      "\t\t\tprint 1",
      "a tock is a tick"
    )
    expect(errors).toEqual([])
  })
})

describe("drawing the items of something with none", () => {
  it("a thing that isn't a list won't compile, saying so", () => {
    const lines = [
      "a recipe is a thing:",
      '\t- its "title" is text',
      "\t- to draw its fields:",
      "\t\t<ui-text>x</ui-text>"
    ]
    const { errors } = compiled(
      ...lines,
      "a box is a thing:",
      '\t- its "new recipe" is a new recipe',
      "\t- to draw it:",
      "\t\tdraw the fields of its new recipe"
    )
    expect(errors.join()).toMatch(/isn't a list/)
  })

  it("a list still draws its items", () => {
    const { js, errors } = compiled(
      "a card is a thing",
      'a "pile" is a list of cards',
      "a box is a thing:",
      '\t- its "pile" is a new pile',
      "\t- to draw it:",
      "\t\tdraw the cards of its pile"
    )
    expect(errors).toEqual([])
    expect(js).toContain("core.drawItems(this.pile)")
  })
})
