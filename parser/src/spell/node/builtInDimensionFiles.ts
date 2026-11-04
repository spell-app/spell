/**
 * The files spell's built-in DIMENSIONS compile to (epic `language` P23) -- see `SP.loadBuiltInDimensions()`.
 * - Their source is the core's `src/core/dimensions/dimensions.spell`, and each other language's twin,
 *   `dimensions.es.spell`:  line for line the same dimensions and units, in that language's words.
 * - Compiled ONCE, here, in a root without them (`SP.Language.bareRootScope()`), into two tables:
 *   - the kit's `spell/util/measures/dimensions.generated.ts`:  each language's words for each dimension and unit,
 *     paired with the English in order, so a Spanish `pulgada` is the inch;  the JavaScript core, Spell UI's
 *     `<ui-dimension>` and the compiler all read it
 *   - Python's core's, `spell_core/dimensions_generated.py`
 * - Pure but for reading the sources:  `writeBuiltInTemplates.ts` writes the files, a test checks they're current.
 * - NODE ONLY, and NOT in the barrel.
 */
import { existsSync, readFileSync } from "fs"
import { resolve } from "path"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import type { BuiltInDimensionData } from "spell/util/measures/dimensions.generated"
import { parseSpellProject } from "spell/parser/spell/test/parseSpellProject"

/** One generated file:  its path from the parser folder's root, and its text. */
export type BuiltInDimensionFile = { path: string; text: string }

/** The parser folder's root, from this file's folder. */
const PACKAGE_ROOT = resolve(import.meta.dirname, "..", "..", "..")

/** Where the sources are, from the parser folder's root. */
const SOURCE_FOLDER = "src/core/dimensions"

/** Every file the built-in dimensions compile to, as they should be now. */
export function builtInDimensionFiles(): BuiltInDimensionFile[] {
  const table = builtInDimensionTable()
  return [
    { path: "../src/util/measures/dimensions.generated.ts", text: tableFile(table) },
    { path: "src/py/core/spell_core/dimensions_generated.py", text: pythonFile(table) }
  ]
}

/**
 * The built-in dimensions, every language's words for each:  what `spell/util/measures` holds.
 * - Each twin's dimensions and units are paired with the English ones in the same place, so a Spanish `pulgada`
 *   is the inch's id.
 * - Throws if a source doesn't compile cleanly, or a twin doesn't pair with the English.
 */
export function builtInDimensionTable(): BuiltInDimensionData[] {
  const english = compileDimensions("en")
  const table: BuiltInDimensionData[] = english.map(({ name, units }) => ({
    name,
    words: { en: wordOf(name) },
    units: units.map(({ id, names, factor, offset }) => ({
      id,
      names: { en: names },
      factor,
      ...(offset ? { offset } : {})
    }))
  }))
  for (const language of SP.Language.all.values()) {
    if (language.lang === "en" || !existsSync(sourcePath(language.lang))) continue
    const twin = compileDimensions(language.lang)
    if (twin.length !== english.length) {
      throw new Error(`Built-in dimensions:  the ${language.lang} twin has ${twin.length}, not ${english.length}`)
    }
    twin.forEach((dimension, index) => {
      const entry = table[index]!
      if (dimension.units.length !== entry.units.length) {
        throw new Error(`Built-in dimensions:  ${language.lang}'s ${dimension.name} has other units than ${entry.name}`)
      }
      entry.words[language.lang] = wordOf(dimension.name)
      dimension.units.forEach((unit, at) => {
        const englishUnit = entry.units[at]!
        if (Math.abs(unit.factor - englishUnit.factor) > 1e-9) {
          throw new Error(`Built-in dimensions:  ${language.lang}'s ${unit.id} isn't the size of ${englishUnit.id}`)
        }
        englishUnit.names[language.lang] = unit.names
      })
    })
  }
  return table
}

/** The source in language `lang`, from the parser folder's root. */
function sourcePath(lang: string): string {
  return resolve(PACKAGE_ROOT, SOURCE_FOLDER, `dimensions${lang === "en" ? "" : `.${lang}`}.spell`)
}

/** The dimensions the source in `lang` declares, in order:  each one's type name, and its units. */
function compileDimensions(lang: string): Array<{ name: string; units: P.DimensionUnit[] }> {
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

/** `spell/util/measures`' table:  the one every runtime and page reads, the compiler too. */
function tableFile(table: BuiltInDimensionData[]): string {
  return [
    "// GENERATED by the parser's `yarn core:gen:templates` from its `core/dimensions/dimensions.spell` and each twin:",
    "// NEVER edit by hand -- edit those, then run that (epic `language` P23).",
    "",
    "/** A built-in dimension, as compiled:  its type name, its word in each language, its units. */",
    "export type BuiltInDimensionData = {",
    "  /** its type name, the English's:  `Length` */",
    "  name: string",
    '  /** its word in each language:  `{ en: "length", es: "longitud" }` */',
    "  words: Record<string, string>",
    "  /** its units, the base first, each with its names in each language */",
    "  units: Array<{ id: string; names: Record<string, string[]>; factor: number; offset?: number }>",
    "}",
    "",
    "/** Spell's built-in dimensions, compiled from the parser's `core/dimensions/dimensions.spell` and each twin. */",
    `export const BUILT_IN_DIMENSIONS: BuiltInDimensionData[] = ${JSON.stringify(table, undefined, 2)}`,
    ""
  ].join("\n")
}

/** Python's core's table:  each unit's names, English first. */
function pythonFile(table: BuiltInDimensionData[]): string {
  const lines = table.map(({ name, units }) => {
    const unitLines = units.flatMap((unit) => [
      "            {",
      `                "id": ${JSON.stringify(unit.id)},`,
      // one name a line, its trailing comma keeping ruff from joining them
      `                "names": [`,
      ...[...new Set(Object.values(unit.names).flat())].map((name) => `                    ${pythonString(name)},`),
      "                ],",
      `                "factor": ${unit.factor},`,
      ...(unit.offset ? [`                "offset": ${unit.offset},`] : []),
      `                "symbol": ${pythonString(unit.names.en?.[1] ?? unit.names.en?.[0] ?? unit.id)},`,
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
