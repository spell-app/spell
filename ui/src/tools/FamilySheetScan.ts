import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

import { readTypeScript, walk, type SourceNode } from "spell/util/node/typescript.ts"
import { VocabularyFiles } from "spell/element-tools/VocabularyFiles"

import { OPTIONAL_SHEETS, type OptionalSheetName } from "spell/ui/runtime/runtime.types"
import { SHEET_WORDS } from "spell/ui/styles/sheetWords"

/****************
 * ### `FamilySheetScan`
 * Which of the optional foundation sheets each family's own shadow markup uses, read from its code
 * (epic `solid-2-final` P4):  what `yarn gen:root` writes beside the root catalog, `UIRoot.sheets.ts`.
 * - The optional sheets (`OPTIONAL_SHEETS`):  the colour and size remaps and utilities, the utilities, the animations.
 *   Every shadow root takes the rest of the foundation (layers, reset);  a family takes one of these only when it
 *   uses it, so most roots adopt a fraction of the CSS they did.
 * - What counts as a use, in the family folder's code and what it imports of Spell UI's other files:
 *   - a utility class (`ui-text-truncate`, `ui-gap-m`) in any string, or the start of one before a `${}`
 *     (`` `ui-gap-${gap}` `` takes every `ui-gap-*`)
 *   - a remap word (`red`, `small`) or `transition` in a string that also says `ui`:  Fomantic's class grammar
 *     (`"ui small red label"`)
 *   - a `data-variation` attribute (colours and sizes), or `data-ui-animation` (animations)
 *   - its own CSS naming one of `animations.css`'s keyframes (none does today)
 *   - markup it doesn't write itself (`innerHTML`, `setHTMLUnsafe()` ...):  every optional sheet,
 *     since what it draws is anyone's
 * - What the VOCABULARY can put on a box (`<ui-icon color="red">`) isn't read here:  the runtime works that out from
 *   the vocabulary itself as the tag is defined (`RootSheets`), so a translated tag and a pack's families get it too.
 * - Reads code with the kit's one TypeScript reader (`readTypeScript()`), every string literal and template part:
 *   never a regex over source.
 * - Static:  a read of files, no state.  Node only.
 ****************/
export class FamilySheetScan {
  /**
   * Folder name => the optional sheets its families use, for every family folder in `roots`.
   * - `styles`:  `src/styles/`, where the optional sheets' CSS is.
   */
  static read({ roots, styles }: FamilySheetScanParams): Record<string, OptionalSheetName[]> {
    const source = resolve(styles, "..")
    const sheets = FamilySheetScan.sheetsIn(styles)
    const constants = FamilySheetScan.constantsIn(join(source, SHARED_TYPES))
    const found: Record<string, OptionalSheetName[]> = {}
    for (const root of roots) {
      if (!existsSync(root)) continue
      for (const family of readdirSync(root, { withFileTypes: true })) {
        if (!family.isDirectory()) continue
        const folder = join(root, family.name)
        const uses = new Set<OptionalSheetName>()
        for (const file of FamilySheetScan.codeOf(folder, source)) {
          FamilySheetScan.scanCode(file, { sheets, constants }, uses)
        }
        for (const file of FamilySheetScan.filesIn(folder, CSS_FILE)) FamilySheetScan.scanCSS(file, sheets, uses)
        found[family.name] = ORDER.filter((name) => uses.has(name))
      }
    }
    return found
  }

  /**
   * `UIRoot.sheets.ts`'s text:  every tag of `catalog` => the optional sheets its family's folder uses (`read()`).
   * - Every tag is listed, an empty list too:  a tag missing from it is a component pack's, which the runtime treats
   *   as using the utilities and the animations (`RootSheets`).
   */
  static module(catalog: Readonly<Record<string, { folder: string }>>, byFolder: Record<string, OptionalSheetName[]>) {
    const lines = Object.keys(catalog)
      .sort()
      .map((tag) => `  ${JSON.stringify(tag)}: ${JSON.stringify(byFolder[catalog[tag]!.folder] ?? [])}`)
    return `/* GENERATED -- do not edit, run \`yarn gen:root\` (source:  every family's code, \`FamilySheetScan\`) */

import type { OptionalSheetName } from "spell/ui/runtime/runtime.types"

/**
 * Every tag => the optional foundation sheets its family's own shadow markup uses:  a utility class, Fomantic's class
 * grammar with a colour or size word, the animations.
 * - What its vocabulary can put on a box is added as the tag is defined (\`RootSheets\`).
 */
export const ROOT_SHEETS: Readonly<Record<string, readonly OptionalSheetName[]>> = {
${lines.join(",\n")}
}
`
  }

  ////////////////
  // ## Sheets
  ////////////////

  /** What each optional sheet's rules match:  its `ui-*` classes, its plain words, its keyframes. */
  private static sheetsIn(styles: string): SheetMatch[] {
    return ORDER.map((name) => {
      const css = withoutComments(readFileSync(join(styles, SHEET_FILES[name]), "utf8"))
      const classes = new Set(
        [...css.matchAll(CSS_CLASS)]
          .map((match) => match[1]!.replaceAll(/\\(.)/g, "$1"))
          .filter((name) => name.startsWith("ui-"))
      )
      const keyframes = [...css.matchAll(KEYFRAMES)].map((match) => match[1]!)
      return { name, classes, words: new Set<string>(SHEET_WORDS_BY_SHEET[name]), keyframes }
    })
  }

  ////////////////
  // ## Code
  ////////////////

  /**
   * Every code file of `folder` (its examples, tests and vocabularies left out),
   * and every file of another family they import by path, followed through:  a render helper of another family.
   * - Not the shared code (`spell/ui/core`, the runtime ...):  it draws no family's markup.
   * - A barrel (`index.ts`) is left out:  it defines elements, which draw in shadow roots of their own.
   */
  private static codeOf(folder: string, source: string): string[] {
    const files = new Set(FamilySheetScan.filesIn(folder, CODE_FILE))
    for (const file of files) {
      const { imports } = readTypeScript(file, readFileSync(file, "utf8"))
      for (const { from } of imports) {
        const imported = FamilySheetScan.resolveImport(from, file, source)
        if (imported && !files.has(imported)) files.add(imported)
      }
    }
    return [...files]
  }

  /** `from`, imported by `file`, as a Spell UI code file to scan;  `undefined` for anything else. */
  private static resolveImport(from: string, file: string, source: string): string | undefined {
    const path = from.startsWith("./")
      ? resolve(dirname(file), from)
      : FAMILY_LEAF.test(from)
        ? join(source, from.slice(SPELL_UI.length))
        : undefined
    if (!path || path.includes("?")) return undefined
    for (const extension of [".tsx", ".ts"]) {
      const candidate = `${path}${extension}`
      if (existsSync(candidate) && FamilySheetScan.isScanned(candidate)) return candidate
    }
    return undefined
  }

  /**
   * The text constants of the shared types file (`UIT`, `components.types.ts`), by name:
   * a family writes `class={UIT.VISUALLY_HIDDEN}`.
   */
  private static constantsIn(file: string): Map<string, string> {
    const constants = new Map<string, string>()
    const { program } = readTypeScript(file, readFileSync(file, "utf8"))
    walk(program, (node) => {
      if (node.type !== "VariableDeclarator") return
      const { id, init } = node as SourceNode & { id: SourceNode & { name?: string }; init?: SourceNode }
      if (id.name && init?.type === "Literal" && typeof init.value === "string") constants.set(id.name, init.value)
    })
    return constants
  }

  /** Add to `uses` what `file`'s code uses. */
  private static scanCode(file: string, { sheets, constants }: ScanContext, uses: Set<OptionalSheetName>) {
    const { program } = readTypeScript(file, readFileSync(file, "utf8"))
    walk(program, (node) => {
      if (node.type === "Literal" && typeof node.value === "string") FamilySheetScan.scanText(node.value, sheets, uses)
      else if (node.type === "MemberExpression") {
        // `UIT.VISUALLY_HIDDEN`:  a shared constant's text
        const { object, property } = node as SourceNode & { object: { name?: string }; property: { name?: string } }
        const text = object.name === SHARED_NAMESPACE && property.name ? constants.get(property.name) : undefined
        if (text) FamilySheetScan.scanText(text, sheets, uses)
      } else if (node.type === "TemplateLiteral") {
        const quasis = node.quasis as SourceNode[]
        quasis.forEach((quasi, index) => {
          const text = ((quasi.value as { cooked?: string; raw: string }).cooked ?? "") as string
          const isBeforeValue = index < quasis.length - 1
          FamilySheetScan.scanText(text, sheets, uses, isBeforeValue)
        })
      } else if (node.type === "JSXAttribute") {
        const name = (node.name as SourceNode & { name?: string }).name
        if (name === VARIATION_ATTRIBUTE) FamilySheetScan.takeVariations(uses)
        if (name === ANIMATION_ATTRIBUTE) uses.add(OPTIONAL_SHEETS.animations)
      } else if (
        (node.type === "Identifier" || node.type === "JSXIdentifier") &&
        MARKUP_WRITERS.has((node as SourceNode & { name: string }).name)
      ) {
        for (const name of ORDER) uses.add(name)
      }
    })
  }

  /**
   * Add to `uses` what one string uses.
   * - `isBeforeValue`:  a template part a `${}` follows, so its last word may be a class's start.
   */
  private static scanText(text: string, sheets: SheetMatch[], uses: Set<OptionalSheetName>, isBeforeValue = false) {
    if (text === VARIATION_ATTRIBUTE) FamilySheetScan.takeVariations(uses)
    if (text === ANIMATION_ATTRIBUTE) uses.add(OPTIONAL_SHEETS.animations)
    const words = text.split(/\s+/).filter(Boolean)
    if (!words.length) return
    // a bare `ui-` says nothing:  a colour class built from the vocabulary's value, which the runtime adds
    const last = isBeforeValue && !/\s$/.test(text) ? words.at(-1) : undefined
    const prefix = last === UI_PREFIX ? undefined : last
    const isClassGrammar = words.includes(UI_WORD)
    for (const sheet of sheets) {
      if (uses.has(sheet.name)) continue
      const isUsed =
        words.some((word) => sheet.classes.has(word) || (isClassGrammar && sheet.words.has(word))) ||
        (prefix?.startsWith(UI_PREFIX) && [...sheet.classes].some((name) => name.startsWith(prefix)))
      if (isUsed) uses.add(sheet.name)
    }
  }

  /** `data-variation` is read by the colour and the size remaps. */
  private static takeVariations(uses: Set<OptionalSheetName>) {
    uses.add(OPTIONAL_SHEETS.colors)
    uses.add(OPTIONAL_SHEETS.sizes)
  }

  /** Add the animations to `uses` when `file`'s CSS names one of their keyframes. */
  private static scanCSS(file: string, sheets: SheetMatch[], uses: Set<OptionalSheetName>) {
    const css = withoutComments(readFileSync(file, "utf8"))
    for (const sheet of sheets) {
      if (sheet.keyframes.some((name) => new RegExp(`(^|[^\\w-])${name}($|[^\\w-])`).test(css))) uses.add(sheet.name)
    }
  }

  ////////////////
  // ## Files
  ////////////////

  /** Every file under `folder` matching `pattern`, examples left out. */
  private static filesIn(folder: string, pattern: RegExp): string[] {
    const files: string[] = []
    for (const entry of readdirSync(folder).sort()) {
      const path = join(folder, entry)
      if (statSync(path).isDirectory()) {
        if (entry !== EXAMPLES) files.push(...FamilySheetScan.filesIn(path, pattern))
      } else if (pattern.test(entry) && (pattern !== CODE_FILE || FamilySheetScan.isScanned(path))) files.push(path)
    }
    return files
  }

  /** Is code file `path` one to scan?  Not a barrel, a test, a vocabulary or a dictionary. */
  private static isScanned(path: string): boolean {
    const name = path.split(/[\\/]/).at(-1)!
    return name !== "index.ts" && !SKIPPED_CODE.test(name) && VocabularyFiles.languageOf(name) === undefined
  }
}

/** What `FamilySheetScan.read()` takes. */
export type FamilySheetScanParams = {
  /** folders of families:  `src/components/`, `src/docs-components/` */
  roots: readonly string[]
  /** `src/styles/`:  the optional sheets' CSS */
  styles: string
}

/** What `scanCode()` matches against. */
type ScanContext = {
  sheets: SheetMatch[]
  /** the shared types' text constants, by name */
  constants: Map<string, string>
}

/** What one optional sheet's rules match. */
type SheetMatch = {
  name: OptionalSheetName
  /** its `ui-*` classes, unescaped (`ui-split:column`) */
  classes: Set<string>
  /** plain class words it matches in Fomantic's grammar (`red` of `.ui.red`) */
  words: Set<string>
  /** its keyframes' names */
  keyframes: string[]
}

/** The optional sheets, in the order they're listed. */
const ORDER: readonly OptionalSheetName[] = [
  OPTIONAL_SHEETS.colors,
  OPTIONAL_SHEETS.sizes,
  OPTIONAL_SHEETS.utilities,
  OPTIONAL_SHEETS.animations
]

/** Each optional sheet's file, in `src/styles/`. */
const SHEET_FILES: Readonly<Record<OptionalSheetName, string>> = {
  [OPTIONAL_SHEETS.colors]: "colors.shared.css",
  [OPTIONAL_SHEETS.sizes]: "sizes.shared.css",
  [OPTIONAL_SHEETS.utilities]: "utilities.css",
  [OPTIONAL_SHEETS.animations]: "animations.css"
}

/** The plain class words each optional sheet matches in Fomantic's grammar. */
const SHEET_WORDS_BY_SHEET: Readonly<Record<OptionalSheetName, readonly string[]>> = {
  [OPTIONAL_SHEETS.colors]: SHEET_WORDS.colors,
  [OPTIONAL_SHEETS.sizes]: SHEET_WORDS.sizes,
  [OPTIONAL_SHEETS.utilities]: [],
  // `.ui.transition.fade.in`:  Fomantic's way to run one from CSS alone
  [OPTIONAL_SHEETS.animations]: ["transition"]
}

/** The shared types file, in Spell UI's `src/`, and the namespace families read it through. */
const SHARED_TYPES = "components/components.types.ts"
const SHARED_NAMESPACE = "UIT"

/** The word that marks a string as Fomantic's class grammar. */
const UI_WORD = "ui"

/** Every utility class starts so. */
const UI_PREFIX = "ui-"

/** Spell UI's import names start so. */
const SPELL_UI = "spell/ui/"

/** A file of a family's folder, by its import name (`spell/ui/components/ui-parts/PartRows`). */
const FAMILY_LEAF = /^spell\/ui\/(components|docs-components)\/ui-[\w-]+\/[\w.-]+$/

/** The attribute the colour and size remaps read for a tooltip's look. */
const VARIATION_ATTRIBUTE = "data-variation"

/** The attribute `animations.css` runs an animation by (`UI.transitions`). */
const ANIMATION_ATTRIBUTE = "data-ui-animation"

/** Names that put markup the family didn't write into its root. */
const MARKUP_WRITERS = new Set([
  "innerHTML",
  "outerHTML",
  "insertAdjacentHTML",
  "setHTMLUnsafe",
  "createContextualFragment",
  "parseHTMLUnsafe"
])

/** A family's examples folder:  pages, not the family's markup. */
const EXAMPLES = "examples"

/** A code file. */
const CODE_FILE = /\.tsx?$/

/** A CSS file. */
const CSS_FILE = /\.css$/

/** Code files that aren't the family's markup:  tests, visual tests, declarations. */
const SKIPPED_CODE = /\.(test|visual|d)\.tsx?$/

/** A class in a selector:  `.ui-flank\:end` => `ui-flank\:end`. */
const CSS_CLASS = /\.(-?[a-zA-Z_](?:\\.|[\w-])*)/g

/** A keyframes rule's name. */
const KEYFRAMES = /@keyframes\s+([\w-]+)/g

/** `css` without its comments. */
function withoutComments(css: string): string {
  return css.replaceAll(/\/\*[\s\S]*?\*\//g, "")
}
