import { readFileSync } from "fs"
import { resolve } from "path"
import { describe, expect, test } from "vite-plus/test"

import { core } from "spell/parser/core"
import { BUILT_IN_DIMENSIONS } from "spell/parser/core/dimensions.generated"
import { BUILT_IN_DIMENSIONS_BY_LANGUAGE } from "spell/parser/spell/builtInDimensions.generated"
import { builtInDimensionFiles, compiledDimensions } from "spell/parser/spell/node/builtInDimensionFiles"
import { parseSpellProject, runSpell } from "spell/parser/spell/test"

/**
 * Numbers with units (epic `language` P23):  dimensions, a property that measures something, a measure written as
 * people write it, and converting one -- `its "height" is a length in cm`, `its height in feet and inches`.
 */

/** The parser folder's root, where the generated files' paths start. */
const PACKAGE_ROOT = resolve(import.meta.dirname, "../..")

/** `text` without its whitespace:  the formatter lays a generated file out, but changes nothing else in it. */
function squeezed(text: string): string {
  return text.replace(/\s+/g, "")
}

/** `lines` compiled:  its javascript, and its errors. */
function compiled(lines: string[]) {
  const [file] = parseSpellProject([{ path: "/Test.spell", contents: lines.join("\n") }]).files
  return { js: `${file!.compiled}`, errors: file!.errors.map((error) => `${error}`) }
}

/** `expression`, compiled and run:  what it gives. */
function valueOf(expression: string, before: string[] = []): unknown {
  return runSpell([...before, `set answer to ${expression}`])("answer").answer
}

const PERSON = ["a person is a thing:", '\t- its "height" is a length in cm', '\t- its "mass" is a weight in kg']

describe("the built-in dimensions are compiled:  if not, run `yarn core:gen:templates` in the parser folder", () => {
  const byLanguage = compiledDimensions()

  test("the compiler's, every language's words", () => {
    expect(BUILT_IN_DIMENSIONS_BY_LANGUAGE).toEqual(byLanguage)
  })

  test("the JavaScript core's", () => {
    expect(BUILT_IN_DIMENSIONS).toEqual(byLanguage.en!.map(({ name, units }) => ({ name, units })))
  })

  test("Python's core's", () => {
    const python = builtInDimensionFiles().find(({ path }) => path.endsWith(".py"))!
    expect(squeezed(readFileSync(resolve(PACKAGE_ROOT, python.path), "utf8"))).toBe(squeezed(python.text))
  })
})

describe("converting, in the core", () => {
  test.each([
    ["Length", 172, "centimeter", "inch", 67.71653543],
    ["Weight", 77, "kilogram", "pound", 169.75594188],
    ["Temperature", 100, "celsius", "fahrenheit", 212],
    ["Temperature", 32, "fahrenheit", "celsius", 0],
    ["Temperature", 0, "celsius", "kelvin", 273.15],
    ["Length", 27.5, "inch", "centimeter", 69.85]
  ])("%s:  %d %s in %s", (dimension, value, from, to, expected) => {
    expect(core.convertMeasure(value, dimension, from, to)).toBeCloseTo(expected, 6)
  })

  test.each([
    [172, "centimeter", ["foot", "inch"], "5 ft 8 in"],
    [77, "kilogram", "pound", "170 lb"],
    [2.54, "centimeter", undefined, "2.54 cm"],
    [182.88, "centimeter", ["foot", "inch"], "6 ft 0 in"]
  ])("written for people:  %d %s in %s", (value, from, to, expected) => {
    const dimension = from === "kilogram" ? "Weight" : "Length"
    expect(core.measureText(value, dimension, from, to)).toBe(expected)
  })
})

describe("in spell", () => {
  test("a property measures something:  its value is a plain number, and `in` converts it", () => {
    const { js, errors } = compiled([...PERSON, "the person is a new person", "print the person's height in feet"])
    expect(errors).toEqual([])
    expect(js).toContain('static { this.declareProp("height", { type: "number" }) }')
    expect(squeezed(js)).toContain(squeezed('core.convertMeasure(person.height, "Length", "centimeter", "foot")'))
  })

  test("several units write the measure for people", () => {
    const run = runSpell([
      ...PERSON,
      "set the person to a new person",
      "set the height of the person to 172",
      "set shown to the person's height in feet and inches"
    ])
    expect(run("shown").shown).toBe("5 ft 8 in")
  })

  test.each([
    ["172 cm in inches", 67.71653543],
    ["5 ft 8 in in cm", 172.72],
    ["2' 3 1/2\" in cm", 69.85],
    ["100 °C in °F", 212],
    ["1/2 cup in tbsp", 8],
    ["77 kg in lb", 169.75594188]
  ])("a written measure:  %s", (expression, expected) => {
    expect(valueOf(expression)).toBeCloseTo(expected, 6)
  })

  test("a unit of another dimension is an error naming both", () => {
    const { errors } = compiled([...PERSON, "the person is a new person", "print the height of the person in kg"])
    expect(errors.join()).toContain("Can't give a length in kg:  kg is a weight")
  })

  test("a program's own dimension", () => {
    const before = [
      "data size is a dimension:",
      '\t- its base is "byte", aka "B"',
      '\t- one "kilobyte", aka "KB", is 1000 B'
    ]
    expect(valueOf("3 KB in B", before)).toBe(3000)
  })

  test("a unit line under a type that isn't a dimension is an error", () => {
    const { errors } = compiled(["a card is a thing:", '\t- one "inch", aka "in", is 2.54 cm'])
    expect(errors.join()).toContain("isn't a dimension")
  })

  test("`in` after anything that isn't a measure reads as it did", () => {
    const { errors } = compiled([
      "set the list to [1, 2, 3]",
      "for each x in the list:",
      "\tprint x",
      "if 3 is in the list",
      "\tprint 3"
    ])
    expect(errors).toEqual([])
  })

  test("Spanish:  `su altura en pies y pulgadas`", () => {
    const [file] = parseSpellProject([
      {
        path: "/Prueba.es.spell",
        contents: [
          "una persona es una cosa:",
          '\t- su "altura" es una longitud en cm',
          "la persona es una nueva persona",
          "imprimir la altura de la persona en pies y pulgadas"
        ].join("\n")
      }
    ]).files
    expect(file!.errors).toEqual([])
    expect(squeezed(`${file!.compiled}`)).toContain(
      squeezed('core.measureText(persona.altura, "Length", "centimeter", ["foot", "inch"])')
    )
  })
})
