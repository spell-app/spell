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
    expect(compiled(SAVED, "print the current person").js).toContain("core.currentPerson()")
  })

  it("a program's own words win", () => {
    const { js } = compiled('set current person to "me"', "print the current person")
    expect(js).not.toContain("core.currentPerson()")
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
        "imprimir la persona actual",
        "imprimir las personas presentes"
      )
    expect(es("la").errors).toEqual([])
    expect(es("la").warnings).toEqual([])
    expect(es("la").js).toContain("onSomeoneElseChange(event)")
    expect(es("la").js).toContain('on("a-receta-change"')
    expect(es("la").js).toContain("core.currentPerson()")
    expect(es("la").js).toContain("core.peopleHere()")
    expect(es("lo").warnings.join()).toMatch(/"la"/)
  })
})
