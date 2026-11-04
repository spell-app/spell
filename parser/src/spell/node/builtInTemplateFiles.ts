/**
 * The files spell's built-in templates written in spell compile to (epic `elemental-spell` Q71) -- see
 * `SP.BUILT_IN_TEMPLATES` for what they are.
 * - Each template's source is in the core's `src/core/templates/`:  `TwoSidedView.spell`, and each other language's
 *   twin, `TwoSidedView.es.spell`, line for line the same template in that language's words.
 * - Compiled ONCE, here, in a root without them (`SP.Language.bareRootScope()`):
 *   - its CLASS, from the English, into the core:  `src/core/classes/TwoSidedView.ts`;  and its twin into Python's,
 *     `src/py/core/spell_core/two_sided_view.py`
 *   - its DECLARATIONS, in every language it's written in, into `src/spell/builtInTemplates.generated.ts`:
 *     what each language's root loads (`SP.loadBuiltInTemplates()`)
 * - Another language's declarations name the ENGLISH class's members:  a template has one class, whatever language
 *   says it.  Its twin's statements are paired with the English ones in order, and each takes the English
 *   one's compiled names -- its property's, its values', its slots', its rules' -- see `speakingEnglish()`.
 * - Pure but for reading the sources:  `writeBuiltInTemplates.ts` writes the files, a test checks they're current.
 * - NODE ONLY, and NOT in the barrel.
 */
import { existsSync, readFileSync } from "fs"
import { resolve } from "path"

import { snakeCase } from "spell/util"
import { P } from "spell/parser/parser"
import { PY } from "spell/parser/py"
import { SP } from "spell/parser/spell"
import { DrawIt } from "spell/parser/spell/rules/classes"
import { compiledSpellProject, parseSpellProject } from "spell/parser/spell/test/parseSpellProject"

/** One generated file:  its path from spell-parser's root, and its text. */
export type BuiltInTemplateFile = { path: string; text: string }

/** spell-parser's root, from this file's folder. */
const PACKAGE_ROOT = resolve(import.meta.dirname, "..", "..", "..")

/** Where the templates' sources are, from spell-parser's root. */
export const TEMPLATES_FOLDER = "src/core/templates"

/** Where their declarations go, from spell-parser's root. */
export const DECLARATIONS_FILE = "src/spell/builtInTemplates.generated.ts"

/**
 * Every file the built-in templates compile to, as they should be now:  each one's class, then the declarations.
 * - Throws if a template doesn't compile cleanly, or a twin doesn't pair with its English (see `speakingEnglish()`).
 */
export function builtInTemplateFiles(): BuiltInTemplateFile[] {
  const { classes, declarations } = compiledTemplates()
  return [...classes, { path: DECLARATIONS_FILE, text: declarationsFile(declarations) }]
}

/**
 * Every built-in template, compiled:  each one's class file, and the declarations of all of them, by datatype then
 * language -- what `builtInTemplateFiles()` writes.
 */
export function compiledTemplates(): {
  classes: BuiltInTemplateFile[]
  declarations: Record<string, Record<string, SP.SpellDeclarationsData>>
} {
  const classes: BuiltInTemplateFile[] = []
  const declarations: Record<string, Record<string, SP.SpellDeclarationsData>> = {}
  for (const [datatype, className] of Object.entries(SP.BUILT_IN_TEMPLATES)) {
    const english = compileTemplate(className, "en")
    classes.push({ path: `src/core/classes/${className}.ts`, text: classFile(className, english.typescript) })
    classes.push({ path: pythonPathOf(className), text: pythonClassFile(className, english.python) })
    const byLanguage: Record<string, SP.SpellDeclarationsData> = { en: english.declarations }
    for (const language of SP.Language.all.values()) {
      if (language.lang === "en" || !existsSync(sourcePath(className, language.lang))) continue
      const twin = compileTemplate(className, language.lang)
      byLanguage[language.lang] = speakingEnglish(twin.declarations, english.declarations, className)
    }
    declarations[datatype] = byLanguage
  }
  return { classes, declarations }
}

/** The source of template `className` in language `lang`, from spell-parser's root:  `TwoSidedView.es.spell` ... */
function sourcePath(className: string, lang: string): string {
  return resolve(PACKAGE_ROOT, TEMPLATES_FOLDER, `${className}${lang === "en" ? "" : `.${lang}`}.spell`)
}

/**
 * Template `className` in language `lang`, compiled in a root without the built-in templates:
 * its TypeScript and its declarations.
 * - Throws if it has a parse error:  a built-in template must compile cleanly.
 */
function compileTemplate(className: string, lang: string) {
  const path = `/${className}${lang === "en" ? "" : `.${lang}`}.spell`
  const contents = readFileSync(sourcePath(className, lang), "utf8")
  const parentScope = SP.Language.for(lang).bareRootScope()
  const { declarations } = compiledSpellProject([{ path, contents }], { parentScope })
  const { files } = parseSpellProject([{ path, contents }], { parentScope: SP.Language.for(lang).bareRootScope() })
  const [file] = files
  if (!file?.match || file.errors.length) {
    throw new Error(`Built-in template ${path} doesn't compile:  ${file?.errors.join(";  ") ?? "nothing parsed"}`)
  }
  const parser = file.scope.parser!
  const typescript = parser.inPlay(() => (P.TSWriter.instance.writeMatch(file.match!) as string | undefined) ?? "")
  const python = parser.inPlay(() => (PY.PyWriter.instance.writeMatch(file.match!) as string | undefined) ?? "")
  return { declarations, typescript, python }
}

////////////////
// ## The class
////////////////

/**
 * The core's class file for template `className`, from its compiled `typescript`.
 * - Its class alone, and the value types before it (`export type Direction = ...`):  no heading, no markers.
 * - NOT its element:  a template is a base, as `View` is;  a view made from it defines its own.
 * - Each of its slots drawn by default as nothing (`drawFront()`), for a view made from it to draw.
 * - Its drawing without `@drawn`, as compiled javascript has it:  `drawThing()` puts the error boundary round it.
 *   A slot it places as compiled javascript writes it too, `h("slot", { name: "front" }, () => this.drawFront())`:
 *   the core's files aren't `.tsx`.  A thunk, which the boundary makes (`drawThing()`), typed as the drawing.
 */
function classFile(className: string, typescript: string): string {
  const code = SP.SpellDeclarations.stripComments(typescript)
  const lines = code.split("\n")
  const start = lines.findIndex((line) => line.startsWith(`export class ${className} `))
  if (start < 0) throw new Error(`Built-in template ${className}:  no class ${className} in its compiled TypeScript`)
  // what it extends:  `View` for a two sided view, `Page` for a notebook
  const superClass = /\bextends (\w+)/.exec(lines[start]!)?.[1] ?? "View"
  const end = lines.findIndex((line, index) => index > start && line === "}")
  const types = lines.slice(0, start).filter((line) => line.startsWith("export type "))
  const body = lines
    .slice(start + 1, end)
    .filter((line) => !/^\s*static elementTag = core\.defineElement\(/.test(line))
    .map((line) =>
      line.replace(/^(\s*)@drawn /, "$1").replace(SLOT_JSX, 'h("slot", { name: "$1" }, () => $2) as unknown as Drawing')
    )
  const drawsSlots = body.some((line) => line.includes('h("slot"'))
  const slots = /^\s*static slots = (\[.*\])/m.exec(body.join("\n"))?.[1]
  const slotMethods = slots ? (JSON.parse(slots) as string[]).map((slot) => slotMethod(slot)) : []
  const usesProp = body.some((line) => /@prop\(/.test(line))
  return [
    "// GENERATED by `yarn core:gen:templates` from `templates/" +
      className +
      ".spell`:  NEVER edit by hand -- edit the",
    "// template, then run that (epic `elemental-spell` Q71).",
    ...(drawsSlots ? ['import h from "@solidjs/h"', ""] : []),
    ...(usesProp ? ['import { prop } from "spell/util"'] : []),
    'import type { Drawing } from "spell/parser/core/drawing"',
    "",
    "// Import directly to avoid circular import",
    `import { ${superClass} } from "./${superClass}"`,
    "",
    ...types,
    "",
    "/**",
    ` * \`${className}\`:  spell's built-in template \`${templateWords(className)}\`, compiled from \`templates/${className}.spell\`.`,
    ` * - What a ${superClass.toLowerCase()} made from it extends, e.g. \`${exampleOf(className)}\`:  its members are here, once.`,
    " * - Every language's words for them read these members -- see spell's `loadBuiltInTemplates()`.",
    " */",
    `export class ${className} extends ${superClass} {`,
    ...body,
    ...slotMethods,
    "}",
    ""
  ].join("\n")
}

/** Where Python's core keeps template `className`, from spell-parser's root:  `spell_core/two_sided_view.py`. */
function pythonPathOf(className: string): string {
  return `src/py/core/spell_core/${snakeCase(className)}.py`
}

/**
 * Python's core's module for template `className`, from its compiled `python`:  as `classFile()` makes the TypeScript.
 * - Its class alone:  no heading, no markers, no `element_tag`.
 * - Each of its slots drawn by default as nothing (`draw_front()`).
 */
function pythonClassFile(className: string, python: string): string {
  const lines = SP.SpellDeclarations.stripComments(python).split("\n")
  const start = lines.findIndex((line) => line.startsWith(`class ${className}(`))
  if (start < 0) throw new Error(`Built-in template ${className}:  no class ${className} in its compiled Python`)
  // what it extends:  `View` for a two sided view, `Page` for a notebook
  const superClass = /^class \w+\((\w+)\)/.exec(lines[start]!)?.[1] ?? "View"
  const end = lines.findIndex((line, index) => index > start && /^\S/.test(line))
  const body = lines
    .slice(start + 1, end < 0 ? undefined : end)
    .filter((line) => !/^\s+element_tag = /.test(line))
    // no blank line twice running, where its element's tag was
    .filter((line, index, all) => line.trim() || all[index - 1]?.trim())
  while (body.length && !body.at(-1)!.trim()) body.pop()
  const slots = /^\s+slots = \((.*)\)/m.exec(body.join("\n"))?.[1]
  const slotNames = slots ? [...slots.matchAll(/"([^"]+)"/g)].map(([, slot]) => slot!) : []
  // the names for its lists' values, `Direction = Literal["down", "up"]`, and what its hints need imported
  const aliases = lines.slice(0, start).filter((line) => /^\w+ = Literal\[/.test(line))
  const text = body.join("\n")
  const typing = [
    ...(slotNames.length || /(?:: |-> )Any\b/.test(text) ? ["Any"] : []),
    ...(aliases.length ? ["Literal"] : [])
  ]
  const drawing = [...(/-> Element\b/.test(text) ? ["Element"] : []), ...(text.includes('h("slot"') ? ["h"] : [])]
  return [
    // GENERATED on line 1, where tools look for it (`epic loc` reads only line 1);  the docstring right after
    "# GENERATED by `yarn core:gen:templates`:  NEVER edit by hand -- edit the template, then run that (Q71).",
    `"""\`${className}\`:  spell's built-in template \`${templateWords(className)}\`, compiled from \`templates/${className}.spell\`.`,
    "",
    `- The twin of the JavaScript core's \`${className}\`:  what a view made from it extends.`,
    `"""`,
    "",
    ...(typing.length ? [`from typing import ${typing.join(", ")}`, ""] : []),
    `from spell_core.apps import ${superClass}`,
    ...(drawing.length ? [`from spell_core.drawing import ${drawing.join(", ")}`] : []),
    "from spell_core.things import prop",
    "",
    ...aliases,
    ...(aliases.length ? ["", ""] : [""]),
    `class ${className}(${superClass}):`,
    ...body,
    ...slotNames.flatMap((slot) => [
      "",
      `    def draw_${snakeCase(slot)}(self) -> Any:`,
      `        """Its ${slot}:  nothing, until a view made from it draws it, \`to draw its ${slot}:\`."""`,
      "        return None"
    ]),
    ""
  ].join("\n")
}

/** A slot placed, as compiled TypeScript writes it:  `<slot name="front">{this.drawFront()}</slot>` -- see `classFile()`. */
const SLOT_JSX = /<slot name="([^"]+)">\{(.*?)\}<\/slot>/g

/** A slot's default drawing:  nothing, until a view made from the template draws it. */
function slotMethod(slot: string): string {
  return [
    "",
    `  /** Its ${slot}:  nothing, until a view made from it draws it, \`to draw its ${slot}:\`. */`,
    `  ${DrawIt.slotMethodName(slot)}(): Drawing {`,
    "    return undefined",
    "  }"
  ].join("\n")
}

/** A line making something from template `className`, for its class's docstring:  `a card is a two sided view`. */
function exampleOf(className: string): string {
  return className === "Notebook" ? "counter notebook is a notebook" : `a card is a ${templateWords(className)}`
}

/** The words template `className` is written as, e.g. `two sided view`. */
function templateWords(className: string): string {
  return Object.entries(SP.BUILT_IN_TEMPLATES).find(([, name]) => name === className)?.[0] ?? className
}

////////////////
// ## The declarations
////////////////

/**
 * A twin's `declarations`, naming what the ENGLISH `english` declarations compile to:  so its words read the one class.
 * - Statements are paired by what they declare, in order:  its type with the type, its slots with the slots,
 *   its property with the property, its Nth rule with the Nth rule.
 * - Each paired statement keeps its own words (syntax, names, values as said) and takes the English one's compiled
 *   names:
 *   - a property:  `output`, the English property (`dirección` reads `.direction`)
 *   - slots:  `slotOutputs` (`frente` draws `drawFront()`)
 *   - a rule:  the English `output`, its `values` keyed as the English ones (`$direction`), and what each value
 *     said compiles to, `valueOutputs` (`está boca arriba` is `isFaceDirection("up")`)
 * - NOT its values as constants:  a root's constants are every program's, so `arriba` compiling to `'up'` would
 *   change a Spanish program's own `arriba`.  So a Spanish file sets a two sided view's direction by its words
 *   (`voltearla boca arriba`), not by `poner su dirección a arriba`.
 * - Throws for a twin statement with no English partner:  its words would name a member the class doesn't have.
 */
function speakingEnglish(
  twin: SP.SpellDeclarationsData,
  english: SP.SpellDeclarationsData,
  className: string
): SP.SpellDeclarationsData {
  const englishByRole = new Map(rolesOf(english.statements).map(({ role, statement }) => [role, statement]))
  const statements = rolesOf(twin.statements).map(({ role, statement }) => {
    const partner = englishByRole.get(role)
    if (!partner) throw new Error(`Built-in template ${className}:  its twin's ${role} has no English partner`)
    return paired(statement, partner)
  })
  return { ...twin, statements }
}

/** Each of `statements` with its role for pairing:  `type`, `slots`, `property 1` ..., `rule 1` ... */
function rolesOf(statements: SP.SpellDeclaration[]): Array<{ role: string; statement: SP.SpellDeclaration }> {
  const counts = new Map<string, number>()
  return statements.map((statement) => {
    const kind = statement.type ? "type" : statement.slots ? "slots" : statement.property ? "property" : "rule"
    const count = (counts.get(kind) ?? 0) + 1
    counts.set(kind, count)
    return { role: kind === "type" || kind === "slots" ? kind : `${kind} ${count}`, statement }
  })
}

/** `twin`, taking `english`'s compiled names -- see `speakingEnglish()`. */
function paired(twin: SP.SpellDeclaration, english: SP.SpellDeclaration): SP.SpellDeclaration {
  const result: SP.SpellDeclaration = { ...twin }
  if (twin.property && english.property && twin.property !== english.property) result.output = english.property
  const slotOutputs = zipped(twin.slots, english.slots, (said, slot) => (said !== slot ? [said, slot] : undefined))
  if (slotOutputs) result.slotOutputs = slotOutputs
  if (twin.rule && english.output) result.output = english.output
  const twinValues = (twin as { values?: Record<string, unknown> }).values
  const englishValues = (english as { values?: Record<string, unknown> }).values
  if (twinValues && englishValues) {
    const keys = Object.keys(englishValues)
    const said = Object.values(twinValues) as Array<Array<string | number>>
    const meant = Object.values(englishValues) as Array<Array<string | number>>
    // keyed as the English, `$direction`;  each word said compiles to the English value, `abajo` to `down`
    const rule = result as SP.SpellDeclaration & { values?: unknown; valueOutputs?: unknown }
    rule.values = Object.fromEntries(said.map((values, index) => [keys[index] ?? `${index}`, values]))
    const valueOutputs = Object.fromEntries(
      said.flatMap((values, index) => {
        const outputs = zipped(values.map(String), meant[index]?.map(String), (word, value) =>
          word !== value ? [word, value] : undefined
        )
        return outputs ? [[keys[index] ?? `${index}`, outputs]] : []
      })
    )
    if (Object.keys(valueOutputs).length) rule.valueOutputs = valueOutputs
  }
  return result
}

/** `pick(a, b)` for each pair of `as` and `bs` in order, as a record of what it returns -- `undefined` if none. */
function zipped<T>(
  as: readonly T[] | undefined,
  bs: readonly T[] | undefined,
  pick: (a: T, b: T) => [string, string] | undefined
): Record<string, string> | undefined {
  if (!as || !bs) return undefined
  const entries = as.flatMap((a, index) => {
    const entry = index < bs.length ? pick(a, bs[index]!) : undefined
    return entry ? [entry] : []
  })
  return entries.length ? Object.fromEntries(entries) : undefined
}

/** `builtInTemplates.generated.ts`, holding `declarations`. */
function declarationsFile(declarations: Record<string, Record<string, SP.SpellDeclarationsData>>): string {
  return [
    // GENERATED on line 1, where tools look for it (`epic loc` reads only line 1)
    "/** GENERATED by `yarn core:gen:templates` (`src/spell/node/writeBuiltInTemplates.ts`):  NEVER edit by hand.",
    " * - Each built-in template's compiled declarations, by its datatype, then by language -- see `builtInTemplates.ts`.",
    " */",
    'import type { SP } from "spell/parser/spell"',
    "",
    `export const BUILT_IN_TEMPLATE_DECLARATIONS: Record<string, Record<string, SP.SpellDeclarationsData>> = ${JSON.stringify(declarations, null, 2)}`,
    ""
  ].join("\n")
}
