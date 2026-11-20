import { P } from "spell/parser/parser"
import { PY } from "spell/parser/py"
import { SP } from "spell/parser/spell"

/****************
 * ### `NativeCode`
 * One of a project's CODE FILES:  plain TypeScript, javascript or Python whose functions Spell can call.
 *
 * ```spell
 * use copyText from clipboard.ts
 *
 * to copy (text as text) to the clipboard
 * 	call native copyText with text
 * ```
 *
 * - The project file lists it, beside its Spell files:  `{ path: "/clipboard.ts", active: true }`.
 *   - `only: "browser"` marks one only a browser can run:  Python refuses its functions while compiling.
 * - One code file per target, side by side, the same name before the dot:
 *   - `clipboard.ts` (or `.js`) for javascript and TypeScript
 *   - `clipboard.py` for Python, its names in Python's case (`copy_text`)
 *   - So ONE `NativeCode` holds every version of `clipboard`, by language (`versions`).
 * - What each file exports is READ, not guessed:
 *   - Python:  its top-level `def` and `async def` lines (`PY.pyFunctionsOf()`)
 *   - TypeScript and javascript:  in node, the kit's TypeScript reader (`spell/parser/spell/node/nativeExports`,
 *     which a node program loads);  in a browser, its `export function` and `export const` lines
 *     (`readers.js`, the default)
 * - Where Spell finds a name `call native` says:
 *   - a `use` line at the top of its Spell file:  `use copyText from clipboard.ts`, `use all from clipboard.ts`
 *     - the file it names must be listed in the project file
 *     - a name a `use` line names comes from that file, even if another code file has one too
 *   - else every code file the project lists, in its order
 * - Kept per scope, not on the parser's records:  `listIn()` for the project's, `useIn()` for a Spell file's.
 * - Position in the import graph:  `spell` only, and `py` for Python's reader and names.
 ****************/
export class NativeCode {
  /** Its path without its ending, as the project file lists it:  `/clipboard`. */
  readonly base: string
  /** The project it's in, for its javascript module:  `@spell/native/<project>/clipboard.ts`. */
  readonly projectId: string
  /** Each language's file of it, and what that file exports. */
  readonly versions: Partial<Record<P.NativeLanguage, NativeVersion>> = {}
  /** `browser`:  only a browser can run it, so Python refuses every call of it. */
  only?: "browser"

  constructor(base: string, projectId: string) {
    this.base = base
    this.projectId = projectId
  }

  /** Its name without a folder or an ending, `clipboard`:  what errors call it, and Python's module. */
  get codeFile(): string {
    return this.base.slice(this.base.lastIndexOf("/") + 1)
  }

  /** The file `language`'s version is, or would be:  `clipboard.ts` (whichever ending it has), `clipboard.py`. */
  fileNameIn(language: P.NativeLanguage): string {
    const path = this.versions[language]?.path
    return path ? path.slice(path.lastIndexOf("/") + 1) : `${this.codeFile}${language === "py" ? ".py" : ".ts"}`
  }

  /** Every name it exports, as Spell says them:  javascript's, else Python's. */
  get functionNames(): string[] {
    return (this.versions.js ?? this.versions.py)?.functions.map(({ name }) => name) ?? []
  }

  /**
   * Its function `name` in `language`, as `call native` says it (`copyText`), if that version exports it.
   * - Python's by its name in Python's case, `copy_text`.
   */
  functionIn(language: P.NativeLanguage, name: string): NativeFunction | undefined {
    const wanted = language === "py" ? PY.PyBaseWriter.nativeName(name) : name
    return this.versions[language]?.functions.find((it) => it.name === wanted)
  }

  /** Does any version export `name`? */
  exports(name: string): boolean {
    return !!(this.functionIn("js", name) ?? this.functionIn("py", name))
  }

  /** Is `fileName` (`clipboard.ts`) one of its files? */
  isNamed(fileName: string): boolean {
    return Object.values(this.versions).some((version) => version.path.endsWith(`/${fileName}`))
  }

  /**
   * The module `language` imports it from:  none without a file in that language.
   * - javascript:  `@spell/native/<project>/clipboard.ts`, which a runner points at the file
   * - Python:  `clipboard`, its file beside the program
   */
  moduleIn(language: P.NativeLanguage): string | undefined {
    const version = this.versions[language]
    if (!version) return undefined
    if (language === "py") return new P.Naming({ all: "snake_case" }).nameOf(this.codeFile, "variable")
    return NativeCode.moduleFor(this.projectId, version.path)
  }

  /** The javascript module project `projectId`'s code file `path` is imported as:  `@spell/native/<project>/clipboard.ts`. */
  static moduleFor(projectId: string, path: string): string {
    return `${SP.SPELL_NATIVE_MODULE}${encodeURI(projectId)}${path}`
  }

  /**
   * A call of its function `name`, with `args`, for the line `match`:  `copyText(text)`.
   * - Awaited in each language whose function waits.
   * - `words`:  the action whose steps it's in, for an error naming it.
   */
  callOf(match: P.AnyMatch, name: string, args: P.ASTExpression[], words?: string): P.ASTNativeCall {
    const modules: Partial<Record<P.NativeLanguage, string>> = {}
    const waitsIn: Partial<Record<P.NativeLanguage, boolean>> = {}
    for (const language of LANGUAGES) {
      const module = this.moduleIn(language)
      if (module) modules[language] = module
      const found = this.functionIn(language, name)
      if (found) waitsIn[language] = found.waits
    }
    return new P.ASTNativeCall(match, {
      methodName: name,
      args,
      modules,
      waitsIn,
      browserOnly: this.only === "browser",
      words,
      codeFile: this.codeFile
    })
  }

  ////////////////
  // ## Reading code files
  ////////////////

  /** The language of a code file, by its ending:  `js` for `.ts`, `.js` ...;  `py` for `.py`;  else none. */
  static languageOf(path: string): P.NativeLanguage | undefined {
    const ending = path.slice(path.lastIndexOf("."))
    return CODE_FILE_ENDINGS[ending]
  }

  /**
   * How each language's file is read for what it exports -- see the class docs.
   * - `js`:  a browser's reader by default;  node's, the kit's TypeScript reader, replaces it
   *   (`spell/parser/spell/node/nativeExports`).
   * - Each NEVER throws.
   */
  static readers: Record<P.NativeLanguage, (path: string, text: string) => NativeFunction[]> = {
    js: (_path, text) => exportedFunctionsOf(text),
    py: (_path, text) => PY.pyFunctionsOf(text)
  }

  /**
   * `sources`, a project's code files, read:  one `NativeCode` per name before the dot, in their order.
   * - Anything that isn't a code file is left out.
   * - `projectId`:  the project they're in, e.g. `owen@spell/clipboard`.
   */
  static of(sources: NativeSource[], projectId: string): NativeCode[] {
    const byBase = new Map<string, NativeCode>()
    for (const { path, contents, only } of sources) {
      const language = NativeCode.languageOf(path)
      if (!language) continue
      const base = path.slice(0, path.lastIndexOf("."))
      let code = byBase.get(base)
      if (!code) byBase.set(base, (code = new NativeCode(base, projectId)))
      code.versions[language] = { path, functions: NativeCode.readers[language](path, contents) }
      if (only) code.only = only
    }
    return [...byBase.values()]
  }

  ////////////////
  // ## In a scope
  ////////////////

  /** SIDE EFFECT:  `code` are the code files of the project parsed in `projectScope`. */
  static listIn(projectScope: P.Scope, code: NativeCode[]): void {
    LISTED.set(projectScope, code)
  }

  /** The code files of the project `scope` is in, in its project file's order;  `[]` with none. */
  static listedIn(scope: P.Scope | undefined): NativeCode[] {
    for (let current = scope; current; current = current.parentScope) {
      const listed = LISTED.get(current)
      if (listed) return listed
    }
    return []
  }

  /**
   * SIDE EFFECT:  the Spell file `scope` is in takes `names` from `code`, as its `use` line says --
   * `all` for every name `code` exports.
   * - Journaled (`P.ParseJournal`), as every change a line makes to what later lines see:
   *   an edit that takes the line out takes this away too, and the lines after it look their names up again.
   * - Each change makes a new record, never changing the one there:  undone, the old one's back as it was.
   */
  static useIn(scope: P.Scope, names: string[] | "all", code: NativeCode): void {
    const fileScope = NativeCode.fileScopeOf(scope)
    if (!fileScope) return
    let previous = USES.get(fileScope)
    // redone, onto the file's uses as they are then (epic `language` P59):  see `P.JournalChange.redo`
    const redo = () => {
      previous = USES.get(fileScope)
      const named = new Map(previous?.named)
      if (names !== "all") for (const name of names) named.set(name, code)
      USES.set(fileScope, { named, all: names === "all" ? [...(previous?.all ?? []), code] : (previous?.all ?? []) })
    }
    redo()
    scope.parser?.journal?.record({
      undo: () => (previous ? USES.set(fileScope, previous) : USES.delete(fileScope)),
      redo,
      change: { kind: "note", target: fileScope, value: `use ${names === "all" ? "all" : names.join(", ")}` }
    })
  }

  /**
   * The code file a `call native <name>` in `scope` calls, or why there's none:
   * - a `use` line's file first, naming it or saying `all`
   * - else the first listed code file that exports it
   * - A miss says why, as a message key and its params (`SP.ParserMessages`).
   */
  static find(scope: P.Scope, name: string): NativeCode | NativeMiss {
    const fileScope = NativeCode.fileScopeOf(scope)
    const uses = fileScope && USES.get(fileScope)
    const named = uses?.named.get(name)
    if (named) {
      return named.exports(name)
        ? named
        : { key: "native-not-in-file", params: { name, file: named.fileNameIn(named.versions.js ? "js" : "py") } }
    }
    const found = [...(uses?.all ?? []), ...NativeCode.listedIn(scope)].find((code) => code.exports(name))
    if (found) return found
    const listed = NativeCode.listedIn(scope)
    if (!listed.length) return { key: "native-no-code-files", params: { name } }
    const files = listed.flatMap((code) => Object.values(code.versions).map(({ path }) => path.slice(1))).join(", ")
    return { key: "native-not-found", params: { name, files } }
  }

  /** The listed code file named `fileName` (`clipboard.ts`), for a `use` line. */
  static named(scope: P.Scope, fileName: string): NativeCode | undefined {
    return NativeCode.listedIn(scope).find((code) => code.isNamed(fileName))
  }

  /** The Spell file's scope `scope` is in, if any. */
  private static fileScopeOf(scope: P.Scope): P.Scope | undefined {
    for (let current: P.Scope | undefined = scope; current; current = current.parentScope) {
      if (current instanceof P.FileScope) return current
    }
    return undefined
  }

  ////////////////
  // ## Writing
  ////////////////

  /**
   * What `files` import from the project's code files, in `language`, one `ModuleImport` per file:
   * - javascript:  `{ module: "@spell/native/<project>/clipboard.ts", names: ["copyText"], kind: "native" }`
   * - Python:  `{ module: "clipboard", names: ["copy_text"], kind: "native" }`
   * - A call with no file in `language` adds none:  `refusalFor()` says so first.
   */
  static importsIn(files: unknown, language: P.NativeLanguage): P.ModuleImport[] {
    const byModule = new Map<string, Set<string>>()
    P.forEachNode(files, (node) => {
      if (!(node instanceof P.ASTNativeCall)) return
      const module = node.modules[language]
      if (!module) return
      const name = language === "py" ? PY.PyBaseWriter.nativeName(node.methodName) : node.methodName
      if (!byModule.has(module)) byModule.set(module, new Set())
      byModule.get(module)!.add(name)
    })
    return [...byModule].map(([module, names]) => ({ module, names: [...names], kind: "native" as const }))
  }

  /**
   * Why `writer`'s target can't write `files`' native calls, if it can't:
   * - Python, for a code file only a browser can run:
   *   `"to copy (text) to the clipboard" needs a browser:  clipboard.ts runs only in one`
   * - no file in its language:  `copyText has no Python version:  add clipboard.py`
   * - a file that doesn't export it:  `clipboard.py has no copy_text:  add it there`
   * - one of the program's own top-level actions written with the same name, which the import would clash with:
   *   `"to copy text" and clipboard.ts's copyText would have the same name in javascript` (from-console I24)
   *   - an action on a type is its class's method, so it can't clash
   * - `undefined` when it can.
   */
  static refusalFor(writer: P.ProgramWriter, files: unknown): string | undefined {
    const language = writer.nativeLanguage
    let refusal: string | undefined
    P.forEachNode(files, (node) => {
      if (refusal || !(node instanceof P.ASTNativeCall)) return
      const { methodName: name, codeFile } = node
      const ending = language === "py" ? ".py" : ".ts"
      if (language === "py" && node.browserOnly) {
        const words = node.words ? `"${node.words}"` : name
        refusal = `${words} needs a browser:  ${codeFile} is marked as code only a browser can run, so Python can't call ${name}.`
      } else if (!node.modules[language]) {
        refusal = `${name} has no ${LANGUAGE_NAMES[language]} version:  add ${codeFile}${ending}, beside ${codeFile}'s other code.`
      } else if (node.waitsIn[language] === undefined) {
        const written = language === "py" ? PY.PyBaseWriter.nativeName(name) : name
        refusal = `${codeFile}'s ${LANGUAGE_NAMES[language]} version has no ${written}:  add it there.`
      }
    })
    return refusal ?? NativeCode.clashIn(writer, files)
  }

  /** Why one of `files`' top-level actions and a native function they call would clash in `writer`'s code, if one would. */
  private static clashIn(writer: P.ProgramWriter, files: unknown): string | undefined {
    const language = writer.nativeLanguage
    const natives = new Map<string, P.ASTNativeCall>()
    P.forEachNode(files, (node) => {
      if (!(node instanceof P.ASTNativeCall) || !node.modules[language]) return
      natives.set(language === "py" ? PY.PyBaseWriter.nativeName(node.methodName) : node.methodName, node)
    })
    if (!natives.size) return undefined
    let clash: string | undefined
    P.forEachNode(files, (node) => {
      // a top-level function:  `exported` is only ever set on one
      if (clash || !(node instanceof P.ASTMethodDefinition) || !node.exported || !node.methodName) return
      const name = writer.nameOf(node.methodName)
      const native = natives.get(name)
      if (!native) return
      // its head line:  the text before its body, which starts on the next line, after a tab
      const words = `${node.match.inputText}`
        .split(/[\n\t]/)[0]!
        .trim()
        .replace(/:$/, "")
      const file = `${native.codeFile}${language === "py" ? ".py" : ".ts"}`
      clash = `"${words}" and ${file}'s ${name} would have the same name in ${LANGUAGE_NAMES[language]}:  rename the action, or the function in ${file}.`
    })
    return clash
  }
}

/** The languages a code file is written in. */
const LANGUAGES: P.NativeLanguage[] = ["js", "py"]

/** Each language's name, for an error. */
const LANGUAGE_NAMES: Record<P.NativeLanguage, string> = { js: "javascript", py: "Python" }

/** A code file's language, by its ending -- see `NativeCode.languageOf()`. */
const CODE_FILE_ENDINGS: Record<string, P.NativeLanguage> = {
  ".ts": "js",
  ".mts": "js",
  ".js": "js",
  ".mjs": "js",
  ".py": "py"
}

/** Each project's code files, by the scope it's parsed in -- see `NativeCode.listIn()`. */
const LISTED = new WeakMap<P.Scope, NativeCode[]>()

/** What each Spell file's `use` lines take, by its scope -- see `NativeCode.useIn()`. */
const USES = new WeakMap<P.Scope, { named: Map<string, NativeCode>; all: NativeCode[] }>()

/**
 * A browser's reading of a javascript or TypeScript file's exported functions:  its lines that start
 * `export function`, `export async function`, or `export const name = ` a function.
 * - Waits if it's `async`, or says it gives back a `Promise<...>`.
 * - Node's reader reads the syntax tree instead:  `spell/parser/spell/node/nativeExports`.
 */
function exportedFunctionsOf(text: string): NativeFunction[] {
  const functions: NativeFunction[] = []
  for (const [line, isAsync, name] of text.matchAll(EXPORTED_FUNCTION)) {
    functions.push({ name: name!, waits: !!isAsync || /\)\s*:\s*Promise\s*</.test(line) })
  }
  for (const [, name, isAsync] of text.matchAll(EXPORTED_ARROW)) functions.push({ name: name!, waits: !!isAsync })
  return functions
}

/** `export (async) function name(...)`, at the start of a line, to its end. */
const EXPORTED_FUNCTION = /^export\s+(async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)[^\n]*/gm

/** `export const name = (async) (...) =>` or `= (async) function`, at the start of a line. */
const EXPORTED_ARROW =
  /^export\s+const\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]*)?=\s*(async\b)?\s*(?:function\b|\(|[A-Za-z_$][\w$]*\s*=>)/gm

/** One function a code file exports, as its file names it. */
export type NativeFunction = {
  /** Its name in its file:  `copyText`;  Python's `copy_text`. */
  name: string
  /** Does it give back a promise (javascript), or is it `async def` (Python)?  Then every call of it is awaited. */
  waits: boolean
}

/** One language's file of a code file, and what it exports -- see `NativeCode.versions`. */
export type NativeVersion = {
  /** Its path in the project:  `/clipboard.ts`. */
  path: string
  /** What it exports. */
  functions: NativeFunction[]
}

/** A code file as a project lists it, with its text -- see `NativeCode.of()`. */
export type NativeSource = {
  /** Its path in the project:  `/clipboard.ts`. */
  path: string
  /** Its text. */
  contents: string
  /** `browser`:  only a browser can run it -- the project file's `only: "browser"`. */
  only?: "browser"
}

/** Why `call native <name>` finds no function:  a parser message's key and its params -- see `NativeCode.find()`. */
export type NativeMiss = {
  key: "native-not-in-file" | "native-no-code-files" | "native-not-found"
  params: Record<string, string>
}
