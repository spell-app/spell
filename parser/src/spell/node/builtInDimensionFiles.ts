/**
 * The files spell's built-in DIMENSIONS compile to (epic `language` P23) -- see `SP.loadBuiltInDimensions()`.
 * - Their source is the core's `src/core/dimensions/dimensions.spell`, and each other language's twin,
 *   `dimensions.es.spell`:  line for line the same dimensions and units, in that language's words.
 * - Compiled ONCE, here, in a root without them (`SP.Language.bareRootScope()`), into:
 *   - the JavaScript core's table, `src/core/dimensions.generated.ts`, and Python's, `spell_core/dimensions_generated.py`:
 *     each dimension's units by the English names
 *   - the compiler's, `src/spell/builtInDimensions.generated.ts`:  each language's words for each dimension and unit,
 *     paired with the English in order, so a Spanish `pulgada` is the inch
 * - Pure but for reading the sources:  `writeBuiltInTemplates.ts` writes the files, a test checks they're current.
 * - NODE ONLY, and NOT in the barrel.
 */
import { existsSync, readFileSync } from "fs"
import { resolve } from "path"

import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test/parseSpellProject"

/** One generated file:  its path from the parser folder's root, and its text. */
export type BuiltInDimensionFile = { path: string; text: string }

/** The parser folder's root, from this file's folder. */
const PACKAGE_ROOT = resolve(import.meta.dirname, "..", "..", "..")

/** Where the sources are, from the parser folder's root. */
const SOURCE_FOLDER = "src/core/dimensions"

/** Every file the built-in dimensions compile to, as they should be now. */
export function builtInDimensionFiles(): BuiltInDimensionFile[] {
  const byLanguage = compiledDimensions()
  const english = byLanguage.en!
  return [
    { path: "src/core/dimensions.generated.ts", text: coreFile(english) },
    { path: "src/py/core/spell_core/dimensions_generated.py", text: pythonFile(english) },
    { path: "src/spell/builtInDimensions.generated.ts", text: compilerFile(byLanguage) }
  ]
}

/**
 * The built-in dimensions in each language they're written in, the English first:  each paired with the English
 * dimension and unit in the same place, so it has the English type name and unit ids.
 * - Throws if a source doesn't compile cleanly, or a twin doesn't pair with the English.
 */
export function compiledDimensions(): Record<string, SP.BuiltInDimension[]> {
  const english = compileDimensions("en")
  const byLanguage: Record<string, SP.BuiltInDimension[]> = { en: english }
  for (const language of SP.Language.all.values()) {
    if (language.lang === "en" || !existsSync(sourcePath(language.lang))) continue
    const twin = compileDimensions(language.lang)
    if (twin.length !== english.length)
      throw new Error(`Built-in dimensions:  the ${language.lang} twin has ${twin.length}, not ${english.length}`)
    byLanguage[language.lang] = twin.map((dimension, index) => {
      const partner = english[index]!
      if (dimension.units.length !== partner.units.length) {
        throw new Error(
          `Built-in dimensions:  ${language.lang}'s ${dimension.name} has a different number of units than ${partner.name}`
        )
      }
      const units = dimension.units.map((unit, at) => {
        const englishUnit = partner.units[at]!
        if (Math.abs(unit.factor - englishUnit.factor) > 1e-9) {
          throw new Error(`Built-in dimensions:  ${language.lang}'s ${unit.id} isn't the size of ${englishUnit.id}`)
        }
        return { ...englishUnit, names: unit.names }
      })
      return { name: partner.name, word: dimension.name === partner.name ? undefined : wordOf(dimension.name), units }
    })
  }
  return byLanguage
}

/** The source in language `lang`, from the parser folder's root. */
function sourcePath(lang: string): string {
  return resolve(PACKAGE_ROOT, SOURCE_FOLDER, `dimensions${lang === "en" ? "" : `.${lang}`}.spell`)
}

/** The dimensions the source in `lang` declares, in order. */
function compileDimensions(lang: string): SP.BuiltInDimension[] {
  const path = `/dimensions${lang === "en" ? "" : `.${lang}`}.spell`
  const contents = readFileSync(sourcePath(lang), "utf8")
  const { files } = parseSpellProject([{ path, contents }], { parentScope: SP.Language.for(lang).bareRootScope() })
  const [file] = files
  if (!file?.match || file.errors.length) {
    throw new Error(`Built-in dimensions ${path} don't compile:  ${file?.errors.join(";  ") ?? "nothing parsed"}`)
  }
  const dimensions = SP.dimensionsIn(file.scope).filter((type) => type.declaredBy)
  return dimensions.map((type) => ({ name: type.name, units: [...type.units!] }))
}

/** A dimension's type name as its word:  `Longitud` => `longitud`. */
function wordOf(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()
}

////////////////
// ## The files
////////////////

/** The JavaScript core's table. */
function coreFile(english: SP.BuiltInDimension[]): string {
  const data = english.map(({ name, units }) => ({ name, units }))
  return [
    "// GENERATED by `yarn core:gen:templates` from `dimensions/dimensions.spell`:  NEVER edit by hand -- edit that, then",
    "// run this (epic `language` P23).",
    'import type { DimensionData } from "./dimensions"',
    "",
    "/** Spell's built-in dimensions, compiled from `dimensions/dimensions.spell`:  each one's units, the base first. */",
    `export const BUILT_IN_DIMENSIONS: DimensionData[] = ${JSON.stringify(data, undefined, 2)}`,
    ""
  ].join("\n")
}

/** Python's core's table:  the same data. */
function pythonFile(english: SP.BuiltInDimension[]): string {
  const lines = english.map(({ name, units }) => {
    const unitLines = units.flatMap((unit) => [
      "            {",
      `                "id": ${JSON.stringify(unit.id)},`,
      `                "names": [${unit.names.map((name) => pythonString(name)).join(", ")}],`,
      `                "factor": ${unit.factor},`,
      ...(unit.offset ? [`                "offset": ${unit.offset},`] : []),
      "            },"
    ])
    return [
      `    {`,
      `        "name": ${JSON.stringify(name)},`,
      `        "units": [`,
      ...unitLines,
      `        ],`,
      `    },`
    ].join("\n")
  })
  return [
    "# GENERATED by `yarn core:gen:templates` from `dimensions/dimensions.spell`:  NEVER edit by hand (epic `language` P23).",
    '"""Spell\'s built-in dimensions, compiled from the JavaScript core\'s `dimensions/dimensions.spell`:  each one\'s units."""',
    "",
    "from typing import Any",
    "",
    "BUILT_IN_DIMENSIONS: list[dict[str, Any]] = [",
    ...lines,
    "]",
    ""
  ].join("\n")
}

/** `text` as Python writes it, as ruff formats it:  `"in"`, `'"'`. */
function pythonString(text: string): string {
  return text.includes('"') && !text.includes("'") ? `'${text}'` : JSON.stringify(text)
}

/** The compiler's table, every language's words. */
function compilerFile(byLanguage: Record<string, SP.BuiltInDimension[]>): string {
  return [
    "// GENERATED by `yarn core:gen:templates` from the core's `dimensions/dimensions.spell`:  NEVER edit by hand.",
    'import type { BuiltInDimension } from "./builtInDimensions"',
    "",
    "/** Spell's built-in dimensions, in each language's words -- see `loadBuiltInDimensions()`. */",
    `export const BUILT_IN_DIMENSIONS_BY_LANGUAGE: Record<string, BuiltInDimension[]> = ${JSON.stringify(byLanguage, undefined, 2)}`,
    ""
  ].join("\n")
}
