/**
 * Running compiled spell javascript -- in every runner:  the app, the VS Code runner's webview, and `<spell-viewer>`.
 * - Compiled spell `import`s `@spell/core`, and any projects it imports as `@spell/project/<projectId>`.
 *   - And the project's code files its Spell calls, `call native copyText`, as `@spell/native/<project>/clipboard.ts`
 *     (epic `from-console` P10):  a `blob:` URL each, of the javascript the runner's `loadNative()` hands back.
 *   - Compiled TypeScript's element classes also import `@spell/elements` (epic `drawable-thing` P10):
 *     the runtime exports that too.
 *   - We rewrite them onto URLs -- the runtime's own, and a `blob:` URL per project -- see `linkModule()`.
 *   - NO import map:  a page has one, but each runner needs its own `@spell/core`.
 * - Part of `spell-runtime.js`, NOT the runners themselves:
 *   it runs on the `core` of the runtime copy it's in -- see `spellRuntime.ts`'s `runApp()`.
 */

import { core, SPELL_CORE_MODULE, SPELL_ELEMENTS_MODULE } from "spell/parser/core"
import type { PartEdit } from "spell/parser/core/core.types"
// Import directly:  the parser's barrel would bring the whole parser into the runner;  this file imports no other
import { SourceMarks } from "spell/parser/parser/writers/SourceMarks"
import { LiveEdit, type ProgramText } from "./LiveEdit"

/**
 * Run `compiled` spell javascript.
 * - `keepThings`, with an app on the page:  the edit is taken as it runs, with nothing new (`takeEdit()`).
 *   Everything below is for the rest.
 * - First:  previous app unmounted, new `core.RUNTIME`, empty console -- unless `keepConsole`.
 * - Afresh, unless `keepThings` (epic `drawable-thing` P16, P17):
 *   then the last run's things carry over into the new one, e.g. the game in progress -- see `core.carryOver()`.
 *   - The program's start is skipped:  its top-level test calls, and starting its app (`core.isCarryingOver`).
 *     Its app starts again as the last run had it.
 *   - Afresh after all, saying why on the console, when:
 *     - the edit changed the program's start:  the file that starts its app -- see `startChanged()`
 *     - one of the last run's things can't come over, e.g. its type changed -- see `core.carryProblems()`
 * - Runs it as a FUNCTION, not a module (`runProgram()`, epic `solid-2-final` P10):
 *   the browser keeps every module a page imports till the page goes, so a module per run, or per live edit,
 *   grew memory with every edit.  A function is let go once nothing holds what it made.
 * - Each project it imports comes from `options.loadImport()`, linked onto its own `blob:` URL:
 *   once per run, however many import it, deepest first.
 *   Without `loadImport`, a project which imports another won't run.
 * - Each code file it calls (`call native`) comes from `options.loadNative()`, linked onto a `blob:` URL of its own:
 *   kept while the program runs, so a live edit links onto the same module.
 *   Without `loadNative`, a program which calls one won't run.
 *   - Asked for afresh on every run, and on every live edit:  a code file that changed runs the program again
 *     (`takeEdit()`), so the new code shows (from-console I37).
 * - `runTests`:  then the tests it didn't run itself, as `spell test` does.
 * - `projectId`:  its remembered props come back from its last run, read before it starts (`core.remember()`).
 * - SIDE EFFECT:  hands its top-level things to `core.things`, for the Thing Explorer --
 *   NOT those of the projects it imports.
 *   Its classes AND theirs too, so `core.fromJSON()` finds them by name.
 * - Answers the error message if it threw, else `undefined`.
 */
export async function runCompiled(compiled: string, options: RunCompiledOptions): Promise<string | undefined> {
  if (options.keepThings) {
    const taken = await takeEdit(compiled, options)
    if (taken) return taken.problem
  }
  options.onRestartNeeded?.(undefined)
  // the last run's things:  read before the reset forgets them
  const last = options.keepThings ? lastRun() : undefined
  const isNewStart = !!last && startChanged(last.compiled, compiled)
  const previous = isNewStart ? undefined : last
  carryAfterFailure = undefined
  unmountApp()
  core.resetRuntime()
  consoleValues = {}
  // what the core says, e.g. a test's lines, in the program's language:  English with none
  core.useMessages(options.messages)
  if (!options.keepConsole) core.console.clear()
  if (isNewStart) core.console.info(`Started afresh:  the program's start changed, in the file that starts its app.`)
  // what's on the console now:  put back if the run starts again afresh, below
  const restoreConsole = consoleRestorer()

  const { loadImport } = options
  if (!loadImport && projectImportsOf(compiled).length) {
    return "This project imports another, which this runner can't load."
  }
  const { loadNative } = options
  const nativeModules = nativeImportsOf(compiled)
  if (!loadNative && nativeModules.length) {
    return `This program calls code from ${nativeModules.map(codeFileOf).join(", ")}, which this runner can't load yet.`
  }
  const { coreUrl } = options
  // blob URL of each project linked this run, by id
  const linked = new Map<string, Promise<string>>()
  // each project's text, and the order they finished linking in:  deepest first
  const importTexts = new Map<string, string>()
  const linkedInOrder: string[] = []
  const urls: string[] = []
  // blob URL of each code file the program calls, by module:  kept for live edits, so never revoked with `urls`
  const natives: Record<string, string> = {}
  // and its javascript:  a live edit asks again, and runs afresh if it changed
  const nativeTexts: Record<string, string> = {}
  try {
    // before it's imported:  importing it starts its app, which may read them
    if (options.projectId) await core.remember(options.projectId)
    // NOTE: the URL first, THEN `import()` it:  vite wraps `import(...)` in an arrow for its preloading,
    // so an `await` in its argument would end up in a function that isn't `async` -- a syntax error in the bundle
    const linkedProgram = await link(compiled, [])
    core.isCarryingOver = !!previous
    let program: Record<string, unknown>
    try {
      // its whole opening can't be undone:  Undo isn't lit the moment it starts (epic `language` J180)
      program = await core.runOpening(() => runProgram(linkedProgram, options.projectId))
    } finally {
      core.isCarryingOver = false
    }
    // the classes of each project it imports, e.g. Solitaire's `Card`, for `core.fromJSON()` and carrying over:
    // the program imported them already, so this runs nothing again
    const imports: RunningImports = new Map()
    for (const projectId of linkedInOrder) {
      const url = await linked.get(projectId)!
      const exports = (await import(/* @vite-ignore */ url)) as Record<string, unknown>
      core.things.addClasses(exports)
      imports.set(projectId, { compiled: importTexts.get(projectId)!, url, exports })
    }
    core.things.setTopLevel(program)
    // the tests it didn't run itself as it loaded:  never on a run that carries things over, which skipped its own
    if (options.runTests && !previous) core.runTests(program)
    const problems = previous ? core.carryProblems(previous.things, program) : []
    if (problems.length) {
      // with its start skipped, a thing that starts afresh by itself would miss what the start does to it
      restoreConsole()
      core.console.info(`Started afresh:  ${problems.join(";  ")}.`)
      const problem = await runCompiled(compiled, { ...options, keepThings: false, keepConsole: true })
      if (problem) carryAfterFailure = previous
      return problem
    }
    if (previous) carryOver(previous, program)
    lastCompiled = compiled
    keepImportUrls(imports, urls)
    for (const url of Object.values(lastProgram?.natives ?? {})) URL.revokeObjectURL(url)
    lastProgram = { compiled, stamped: stampedFrom(compiled, options), exports: program, imports, natives, nativeTexts }
    return undefined
  } catch (error) {
    // the next recompile carries the last good run's things over, not this broken one's
    carryAfterFailure = last
    // Log too, so devtools show the stack.
    console.error(error)
    return error instanceof Error ? error.message : String(error)
  } finally {
    // modules once imported stay imported:  the URLs aren't needed any more
    urls.forEach((url) => URL.revokeObjectURL(url))
  }

  /**
   * `source`, linked:  its `@spell/core` onto `coreUrl`, each project it imports onto its own `blob:` URL.
   * - Each project it imports is linked first;  each code file it calls, once per run.
   * - `chain`:  the projects we're linking this for, to catch projects importing each other.
   * - Answers a project's `blob:` URL, and the program's own text, linked, which runs as a function (`runProgram()`).
   */
  async function link(source: string, chain: string[]): Promise<string> {
    const imports: Record<string, string> = {}
    for (const projectId of projectImportsOf(source)) {
      if (chain.includes(projectId)) throw new Error(`Projects import each other: ${[...chain, projectId].join(" → ")}`)
      let url = linked.get(projectId)
      if (!url) {
        url = loadImport!(projectId).then(async (text) => {
          importTexts.set(projectId, text)
          const linkedUrl = await link(text, [...chain, projectId])
          linkedInOrder.push(projectId)
          return linkedUrl
        })
        linked.set(projectId, url)
      }
      imports[projectId] = await url
    }
    for (const module of nativeImportsOf(source)) {
      if (natives[module]) continue
      const text = await loadNative!(module)
      // another import linked it while this one waited
      if (natives[module]) continue
      nativeTexts[module] = text
      natives[module] = blobUrl(text)
    }
    // the program itself carries its source map inline:  a `blob:` URL can't reach the map file beside it
    const stamped = !chain.length && options.placesFrom ? SourceMarks.stamped(source, options.placesFrom) : source
    const linkedSource = SourceMarks.inline(
      linkModule(stamped, coreUrl, imports, natives),
      chain.length ? undefined : options.sourceMap
    )
    if (!chain.length) return linkedSource
    const url = URL.createObjectURL(new Blob([linkedSource], { type: "text/javascript" }))
    urls.push(url)
    return url
  }
}

/**
 * Run a line of compiled Spell on the running program, as the browser's console runs a line on its page
 * (the editor's Spell Console, epic `editor` P32;  Q38):  its things are the running ones, kept, and what it changes stays.
 * - `javascript`:  ONE line's, as `SP.parseLine()` compiles it:  an expression (`solitaire.stock.count`),
 *   a statement (`solitaire.turnOverTheNextCard()`), or a declaration (`export const x = 3`).
 * - `names`:  what compiled Spell reads by name besides the program's own:  the runtime's exports, `core` among them.
 * - It sees, by name:  `names`, what each project the program imports exports, the program's own top-level things,
 *   then what earlier lines declared (`consoleValues`), the latest first.
 * - A declaration keeps its value for later lines, until the program starts afresh.
 * - Answers its value:  an expression's, a declaration's;  `undefined` for a statement.  Waits for one that waits.
 * - throws what the line throws, or a `SyntaxError` for javascript it can't run
 */
export async function runLine(javascript: string, names: Record<string, unknown>): Promise<unknown> {
  const inScope: Record<string, unknown> = { ...names }
  for (const it of lastProgram?.imports.values() ?? []) Object.assign(inScope, it.exports)
  Object.assign(inScope, lastProgram?.exports, consoleValues)
  const known = Object.keys(inScope).filter((name) => IDENTIFIER.test(name))
  const run = (body: string) => new AsyncFunction(...known, body)(...known.map((name) => inScope[name]))

  const line = javascript.trim().replace(/;$/, "")
  const declared = DECLARATION.exec(line)
  if (declared) {
    const [, name, value] = declared
    consoleValues[name!] = await run(`return (${value}\n)`)
    return consoleValues[name!]
  }
  const named = NAMED_DECLARATION.exec(line)
  if (named) {
    consoleValues[named[1]!] = await run(`${line.replace(/^export\s+/, "")}\nreturn ${named[1]}`)
    return undefined
  }
  return run(isExpression(line) ? `return (${line}\n)` : line)
}

/** Is `line` javascript that reads as one expression?  Made into a function, not run, to find out. */
function isExpression(line: string): boolean {
  try {
    new AsyncFunction(`return (${line}\n)`)
    return true
  } catch (ignored) {
    return false
  }
}

/** What lines run in the console declared, by name, e.g. `x is 3`'s `x`:  forgotten when the program starts afresh. */
let consoleValues: Record<string, unknown> = {}

/** The constructor of `async` functions:  a line may wait, e.g. an action that reads a place. */
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (
  ...parameters: string[]
) => (...values: unknown[]) => Promise<unknown>

/** A name a line can read as a variable. */
const IDENTIFIER = /^[\p{L}_$][\p{L}\p{N}_$]*$/u

/** A compiled line declaring a value, `export const x = 3`:  its name, then its value's javascript. */
const DECLARATION = /^(?:export\s+)?(?:const|let|var)\s+([\p{L}_$][\p{L}\p{N}_$]*)\s*=\s*([\s\S]+)$/u

/** A compiled line declaring a function or class by name:  its name. */
const NAMED_DECLARATION = /^(?:export\s+)?(?:async\s+)?(?:function\*?|class)\s+([\p{L}_$][\p{L}\p{N}_$]*)/u

/**
 * Take an edit to the running program as it runs, keeping every thing and element (epic `editor`, Edit Without Redraw):
 * - The new program's classes are loaded, with its top-level code left out and its variables the running ones (`LiveEdit`).
 * - The running things become those classes (`core.takeNewClasses()`).
 * - Each project it imports is weighed the same way, deepest first (epic `editor`, Live Edit Everywhere):
 *   one that changed loads over its running self, its things kept;  one that didn't stays the module it was.
 * - Only the views of what changed draw again, keeping their elements (`core.drawAgain()`):
 *   only the parts that changed of a drawing made of parts, e.g. a notebook's examples (epic `notebook` P4).
 * - What only moved in its file (a line typed above it) keeps its elements, given their new places.
 * - Answers `undefined` when this edit isn't for it, and the run goes on as usual:
 *   - no app mounted, nor a last run to go from
 *   - a code file it calls is new, or changed since it was linked (`nativesChanged()`)
 *   - a project whose imports changed which projects they are:  a project added or dropped
 *   - a program it can't read for sure (`LiveEdit`'s `not-live`)
 *   - what the program can't take, for a runner that can't say so:  no `onRestartNeeded`
 * - What it can't take, with `onRestartNeeded`:  nothing runs, the app stays as it is, and the runner says so.
 * - A program that fails as it loads:  the running one stays as it was, and its message is the answer's `problem`.
 */
async function takeEdit(compiled: string, options: RunCompiledOptions): Promise<{ problem?: string } | undefined> {
  const last = lastProgram
  if (!last || !appIsMounted()) return undefined
  const importIds = projectImportsOf(compiled)
  // a code file the last run didn't link:  it runs again, linking it
  if (nativeImportsOf(compiled).some((module) => !last.natives[module])) return undefined
  // one changed since:  it runs again too, as a live edit keeps the module it linked (from-console I37)
  if (await nativesChanged(last, options)) return undefined
  // each project it imports, read again and weighed as the program is:  deepest first (epic `editor`, Live Edit Everywhere)
  const importEdits: Array<{ projectId: string; text: string; edit: LiveEdit }> = []
  if (importIds.length) {
    if (!options.loadImport || !sameImports(last.imports, compiled)) return undefined
    for (const [projectId, running] of last.imports) {
      const text = await options.loadImport(projectId)
      const before = { compiled: running.compiled, stamped: running.compiled }
      importEdits.push({ projectId, text, edit: LiveEdit.between(before, { compiled: text, stamped: text }) })
    }
  }
  const stamped = stampedFrom(compiled, options)
  const edit = LiveEdit.between(last, { compiled, stamped })
  const edits = [...importEdits.map((it) => it.edit), edit]
  if (edits.some((it) => it.kind === "not-live")) return undefined
  const restart = importEdits.find((it) => it.edit.kind === "restart")
  const restartBecause = edit.restartBecause ?? (restart && `${restart.edit.restartBecause}, in ${restart.projectId}`)
  if (restartBecause) {
    if (!options.onRestartNeeded) return undefined
    core.console.info(`This takes effect on restart:  ${restartBecause}.`)
    options.onRestartNeeded(restartBecause)
    return {}
  }
  options.onRestartNeeded?.(undefined)
  if (edits.every((it) => it.kind === "same")) return {}
  const urls: string[] = []
  const imports: RunningImports = new Map(last.imports)
  try {
    const drawAgain: string[] = []
    const parts: PartEdit[] = []
    const places = new Map<string, string>()
    let isEverything = false
    const followDrawing = (taken: LiveEdit) => {
      if (taken.drawAgain === "everything") isEverything = true
      else drawAgain.push(...taken.drawAgain)
      parts.push(...taken.parts)
      for (const [was, now] of taken.places) places.set(was, now)
    }
    // each changed project loads over its running self, its own imports the running ones
    for (const { projectId, text, edit: taken } of importEdits) {
      if (taken.kind !== "live") continue
      const running = imports.get(projectId)!
      const url = blobUrl(linkModule(taken.text, options.coreUrl, urlsOf(imports), last.natives))
      const exports = await core.loadOverRunning(
        running.exports,
        () => import(/* @vite-ignore */ url) as Promise<Record<string, unknown>>
      )
      core.takeNewClasses(running.exports, exports)
      core.things.addClasses(exports)
      imports.set(projectId, { compiled: text, url, exports })
      urls.push(running.url)
      followDrawing(taken)
    }
    let program = last.exports
    if (edit.kind === "live") {
      const text = SourceMarks.inline(
        linkModule(edit.text, options.coreUrl, urlsOf(imports), last.natives),
        options.sourceMap
      )
      program = await core.loadOverRunning(last.exports, () => runProgram(text, options.projectId))
      core.takeNewClasses(last.exports, program)
      core.things.setTopLevel(program)
      followDrawing(edit)
    }
    lastProgram = { ...last, compiled, stamped, exports: program, imports }
    lastCompiled = compiled
    // the old modules' URLs:  their modules are retired, so nothing imports them again
    urls.forEach((url) => URL.revokeObjectURL(url))
    // what only moved keeps its elements, at their new places:  what draws again is stamped anew
    SourceMarks.movePlaces(core.appElement(), places)
    core.drawAgain(isEverything ? "everything" : [...new Set(drawAgain)], parts)
    return {}
  } catch (error) {
    console.error(error)
    return { problem: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Has a code file the running program calls changed since it was linked?  Each asked for afresh, `loadNative()`.
 * - `false` without `loadNative`;  a code file it can't load now counts as unchanged:  the edit keeps the one it has.
 */
async function nativesChanged(last: NonNullable<typeof lastProgram>, options: RunCompiledOptions): Promise<boolean> {
  const { loadNative } = options
  if (!loadNative) return false
  for (const [module, text] of Object.entries(last.nativeTexts)) {
    const now = await loadNative(module).catch(() => text)
    if (now !== text) return true
  }
  return false
}

/**
 * Does `compiled` import the projects the running program does, and only them?
 * - A project added or dropped:  the program runs again, as before.
 */
function sameImports(running: RunningImports, compiled: string): boolean {
  const imported = new Set<string>()
  const add = (source: string) => {
    for (const projectId of projectImportsOf(source)) {
      if (imported.has(projectId)) continue
      imported.add(projectId)
      const it = running.get(projectId)
      if (it) add(it.compiled)
    }
  }
  add(compiled)
  return imported.size === running.size && [...imported].every((projectId) => running.has(projectId))
}

/** A `blob:` URL of module `text`. */
function blobUrl(text: string): string {
  return URL.createObjectURL(new Blob([text], { type: "text/javascript" }))
}

/**
 * Run `linked`, a program's text with its imports linked (`linkModule()`), and answer what it exports.
 * - As a FUNCTION, not a module (epic `solid-2-final` P10, TLDR 26):  the browser keeps every module it ever
 *   imported, so a module from a new `blob:` URL per run, and per live edit, was never let go.
 *   - Its imports are read first, `import()`ed:  modules already loaded (the runtime, each project it imports,
 *     each code file it calls), so nothing new enters the browser's modules.
 *   - Its source map stays:  dev tools and an error's stack still name its `.spell` lines (`//# sourceURL`).
 * - As a module still, from a `blob:` URL, when it can't be:
 *   - the page forbids running text as code (VS Code's webview:  no `unsafe-eval`)
 *   - a shape `asFunction()` doesn't know (`export default` ...), which the compiler never writes today
 * - `projectId`:  names it in dev tools, `<projectId>.spell.js`.
 * - throws what the program throws as it runs, or a `SyntaxError`
 */
export async function runProgram(linked: string, projectId?: string): Promise<Record<string, unknown>> {
  const program = canRunText() ? asFunction(linked, projectId) : undefined
  if (!program) {
    const url = blobUrl(linked)
    try {
      return (await import(/* @vite-ignore */ url)) as Record<string, unknown>
    } finally {
      URL.revokeObjectURL(url)
    }
  }
  const modules: Record<string, Record<string, unknown>> = {}
  for (const url of program.imports) modules[url] = (await import(/* @vite-ignore */ url)) as Record<string, unknown>
  // indirect:  in the page's own scope, never this file's
  // oxlint-disable-next-line no-eval -- running the program's own text is what this is for
  const run = (0, eval)(program.text) as (imports: typeof modules) => Promise<Record<string, unknown>>
  return run(modules)
}

/**
 * `linked`, a program's module text, as the text of an `async` function that runs it and answers its exports.
 * - `imports`:  the URL of each module it imports, which the function is handed, by URL.
 * - Its lines stay where they were, so its source map still holds:
 *   its imports become one line, put before its first;  their own lines are left blank.
 * - `undefined` for a shape it doesn't know:  `export default`, `export { ... }`, `export *`, a side-effect import,
 *   a destructured export.
 * - Its exports are getters, so they stay live as a module's are:  `export let x`, set later, reads as it is now.
 * - An import is read once, as the program starts:  what a project exports is set once it has loaded.
 * - Pure.
 */
export function asFunction(linked: string, projectId?: string): { text: string; imports: string[] } | undefined {
  const mapAt = linked.search(SOURCE_MAP_COMMENT)
  const [code, map] = mapAt >= 0 ? [linked.slice(0, mapAt), linked.slice(mapAt)] : [linked, ""]
  const imports: string[] = []
  const reads: string[] = []
  const withoutImports = code.replace(IMPORT_LINE, (_whole, names: string, url: string) => {
    if (!imports.includes(url)) imports.push(url)
    const bound = names
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => name.replace(/\s+as\s+/, ": "))
    reads.push(`const { ${bound.join(", ")} } = ${IMPORTS}[${JSON.stringify(url)}];`)
    return ""
  })
  if (UNKNOWN_SHAPE.test(withoutImports)) return undefined
  const exported: string[] = []
  const body = withoutImports.replace(EXPORT_LINE, (_whole, kind: string, name: string) => {
    exported.push(name)
    return `${kind} ${name}`
  })
  const name = `${projectId ?? "program"}.spell.js`
  const text =
    `(async (${IMPORTS}) => { "use strict"; ${reads.join(" ")} ${body}\n` +
    `return { ${exported.map((it) => `get ${it}() { return ${it} }`).join(", ")} }\n})\n${map}\n//# sourceURL=${name}\n`
  return { text, imports }
}

/**
 * Can this page run text as code (`eval`)?  Asked once.
 * - Not where its rules forbid it (a `Content-Security-Policy` with no `unsafe-eval`):  VS Code's webview.
 */
function canRunText(): boolean {
  canEval ??= (() => {
    try {
      // oxlint-disable-next-line typescript/no-implied-eval -- the question is whether the page allows it
      new Function("")
      return true
    } catch (ignored) {
      return false
    }
  })()
  return canEval
}

/** What `canRunText()` found. */
let canEval: boolean | undefined

/** The name a program run as a function reads its imports by:  each module, by URL. */
const IMPORTS = "__spellImports__"

/** An `import { a, b as c } from "url"` on its own line, as the compiler writes them:  its names, then its URL. */
const IMPORT_LINE = /^import\s*\{([^}]*)\}\s*from\s*"([^"]+)";?[ \t]*$/gm

/** A declaration exported on its own line:  `export class Card`, `export const solitaire`, `export async function f`. */
const EXPORT_LINE = /^export\s+((?:async\s+)?function\*?|class|const|let|var)\s+([\p{L}_$][\p{L}\p{N}_$]*)/gmu

/** What `asFunction()` can't turn into a function:  an import or export it doesn't know. */
const UNKNOWN_SHAPE = /^(?:import\b|export\s+(?:default\b|\{|\*|(?:const|let|var)\s*[{[]))/m

/** Where a program's inline source map starts. */
const SOURCE_MAP_COMMENT = /^\/\/# sourceMappingURL=/m

/** Each running project's URL, by id:  what `linkModule()` points a program's imports at. */
function urlsOf(imports: RunningImports): Record<string, string> {
  return Object.fromEntries([...imports].map(([projectId, it]) => [projectId, it.url]))
}

/**
 * Keep the URLs of the projects `imports` holds:  a live edit links the program onto them again (`takeEdit()`).
 * - Taken out of `urls`, so the run doesn't revoke them;  the last run's are revoked instead.
 */
function keepImportUrls(imports: RunningImports, urls: string[]): void {
  const kept = new Set([...imports.values()].map((it) => it.url))
  for (const url of kept) {
    const at = urls.indexOf(url)
    if (at >= 0) urls.splice(at, 1)
  }
  for (const it of lastProgram?.imports.values() ?? []) if (!kept.has(it.url)) URL.revokeObjectURL(it.url)
}

/** `compiled`, as the program runs it:  what it draws saying where it's written, for an editor (`placesFrom`). */
function stampedFrom(compiled: string, options: RunCompiledOptions): string {
  return options.placesFrom ? SourceMarks.stamped(compiled, options.placesFrom) : compiled
}

/** The program running now, to take an edit as it runs -- see `takeEdit()`. */
let lastProgram:
  | (ProgramText & {
      exports: Record<string, unknown>
      imports: RunningImports
      /** `blob:` URL of each code file it calls, by module */
      natives: Record<string, string>
      /** each code file's javascript, by module:  what `nativesChanged()` compares */
      nativeTexts: Record<string, string>
    })
  | undefined

/** Each project the running program imports, by id, deepest first:  the text it ran, its module's URL, what it exports. */
type RunningImports = Map<string, { compiled: string; url: string; exports: Record<string, unknown> }>

/** Options for `runCompiled()`. */
export type RunCompiledOptions = {
  /**
   * An edit the running program can't take as it runs:  `reason` says why, and it needs a restart to show;
   * `undefined`:  no edit's waiting any more.
   * - Without it, such an edit starts the program afresh, as it always did.
   */
  onRestartNeeded?: (reason: string | undefined) => void
  /**
   * URL of the module compiled spell's `@spell/core` import is pointed at:  the runtime copy it runs on.
   * - See `loadRuntime()`.
   * - MUST be the copy this `runCompiled()` is from, so the program's `core` is ours.
   */
  coreUrl: string
  /** Compiled javascript of project `projectId`, which the program imports. */
  loadImport?: (projectId: string) => Promise<string>
  /**
   * Javascript of the code file the program imports as `module`, for `call native` (epic `from-console` P10):
   * `@spell/native/owen@spell/clipboard/clipboard.ts` => `clipboard.ts` as javascript, its types taken out.
   * - None:  a program that calls one won't run, and says so.
   */
  loadNative?: (module: string) => Promise<string>
  /**
   * The program's project, e.g. `@spell/examples/solitaire`:  what its remembered props are kept under.
   * - Kept in the browser's storage, from run to run (`core.remember()`, epic `prefs-and-undo` P8):
   *   its app's `theme` at `@spell/examples/solitaire:theme`.
   * - None:  nothing's remembered.
   */
  projectId?: string
  /** Keep what's on the console, e.g. the app's own "Compiling ..." lines, above the program's. */
  keepConsole?: boolean
  /**
   * Carry the last run's things over, e.g. the game in progress -- for a recompile of the same program.
   * - Never for Restart, which starts afresh on purpose (Q25), nor for another program.
   */
  keepThings?: boolean
  /**
   * Then run each `to test ...` it exports which it didn't run itself as it loaded (`core.runTests()`):
   * how they went is in `core.testResults()`.  See `testApp()`.
   */
  runTests?: boolean
  /**
   * The program's words for what the core says to the person running it, e.g. a test's lines:
   * its words file's `messages` (epic `spanish` P12) -- English with none.
   */
  messages?: Record<string, string>
  /**
   * The program's source map, its `<Project>.spell.js.map` (epic `elemental-spell` P14):  inlined into what runs, so dev
   * tools and an error's stack name its `.spell` lines.
   * - None:  the program's own `sourceMappingURL` line comes out, since a `blob:` URL can't fetch the map beside it.
   */
  sourceMap?: string
  /**
   * The source map to stamp the program from, so what it draws and makes says where it's written
   * (`SourceMarks.stamped()`):  the editor's, so it can show a part's source.  None, the code as it shipped.
   */
  placesFrom?: string
}

/**
 * The last run's things, to carry over into the next -- `undefined` if it left none.
 * - After a run that threw:  the run before it's, kept in `carryAfterFailure`.
 */
function lastRun(): LastRun | undefined {
  const things = core.things.topLevel()
  if (!things.length || lastCompiled === undefined) return carryAfterFailure
  const app = (core.appElement() as AppElement | null)?.spellRoot?.app
  return { things, app, compiled: lastCompiled }
}

/**
 * Put `previous`'s things in place of what `program` made -- see `core.carryOver()`.
 * - Its app, as it was:  started now, since the program's start, which would have started it, was skipped.
 */
function carryOver(previous: LastRun, program: Record<string, unknown>) {
  const kept = core.carryOver(previous.things, program)
  if (!previous.app || appIsMounted()) return
  const name = previous.things.find(({ thing }) => thing === previous.app)?.name
  const app = name && kept.includes(name) ? (program[name] as { start?: () => void }) : undefined
  app?.start?.()
}

/**
 * What puts the console back as it is now, e.g. a run's output, when the run starts again afresh:
 * the lines in its open group, or at its top.
 * - Lines are replaced, never changed in place (`SpellConsole.lines`):  the old array is what was there.
 */
function consoleRestorer(): () => void {
  const { console: output } = core
  const groups = [...output.groups]
  const into = groups[0] ?? output
  const { lines } = into
  return () => {
    output.groups = groups
    into.lines = lines
  }
}

/** What a run left, for the next to carry over -- see `lastRun()`. */
type LastRun = {
  /** Its top-level things, by name. */
  things: ReturnType<typeof core.things.topLevel>
  /** The app it drew, if any. */
  app?: object
  /** The javascript it ran, to tell whether the next changes the program's start -- see `startChanged()`. */
  compiled: string
}

/** The things of the last run that ran to its end, while the runs after it throw -- see `lastRun()`. */
let carryAfterFailure: LastRun | undefined

/** The javascript of the last run that ran to its end. */
let lastCompiled: string | undefined

/**
 * Does `after`, a program compiled again, change its START from `before`?
 * Then it runs afresh, as Restart does (Owen, epic `drawable-thing` P17).
 * - A project of several files:  when the file that starts its app changed,
 *   e.g. Solitaire's, which says `start the game`.
 *   - An edit to a file of types, e.g. Card's, keeps the game in progress.
 * - A project of one file:  when its start's own lines changed -- starting its app, or which tests it runs.
 * - When it has a file more or less:  yes.
 * - No app started:  never, as nothing tells which file starts it.
 * - Reads the compiled javascript, which every runner has:  a file's code is between two `FILE_SEPARATOR`s.
 *   - NOTE: a method one file declares on another's type is compiled into that type's class, in ITS file:
 *     Solitaire's `to play a card` is in Card's code, so an edit to it keeps things.
 *   - The lines `import`ing from the runtime don't count:  they change with what any file uses.
 * - Pure.
 */
export function startChanged(before: string, after: string): boolean {
  const [was, now] = [filesOf(before), filesOf(after)]
  if (was.length !== now.length) return true
  if (now.filter((code) => code.some((line) => !STYLES_LINE.test(line))).length <= 1) {
    return startLinesOf(was).join("\n") !== startLinesOf(now).join("\n")
  }
  return now.some((code, index) => {
    const startsApp = [code, was[index]!].some((file) => file.some((line) => APP_START_LINE.test(line)))
    return startsApp && code.join("\n") !== was[index]!.join("\n")
  })
}

/** Each file's code in `compiled`, as its lines:  without blank lines, or those importing from the runtime. */
function filesOf(compiled: string): string[][] {
  return compiled
    .split(FILE_SEPARATOR)
    .map((code) => code.split("\n").filter((line) => line.trim() && !RUNTIME_IMPORT_LINE.test(line)))
}

/** The lines of `files` that are part of the program's start:  its tests' calls, starting its app. */
function startLinesOf(files: string[][]): string[] {
  return files.flat().filter((line) => line.startsWith(START_LINE))
}

/**
 * How a line of the program's start begins, as compiled -- `P.ASTProgramStart`:
 * `if (!core.isCarryingOver) game.start()`.
 * - NOTE: a copy, NOT imported:  `spell/parser/parser` would pull the whole parser into the runner bundle.
 */
const START_LINE = "if (!core.isCarryingOver) "

/** A line of the program's start that starts its app:  `if (!core.isCarryingOver) game.start()`. */
const APP_START_LINE = /^if \(!core\.isCarryingOver\) .+\??\.start\(\)$/

/** A line that only installs a stylesheet:  a `.css` file's code. */
const STYLES_LINE = /^core\.installStyles\(/

/** A line importing from the runtime, `import { core, ... } from "@spell/core"`. */
const RUNTIME_IMPORT_LINE = /^import .* from "@spell\/(core|elements)"$/

/**
 * Between each file's code in compiled javascript -- `SP.SpellProject.FILE_SEPARATOR`.
 * - NOTE: a copy, NOT imported:  `spell/parser/spell` would pull the whole parser into the runner bundle.
 */
const FILE_SEPARATOR = "\n// -----------\n"

/** Take down the app the last run started, if any -- e.g. before showing another project. */
export function unmountApp() {
  const element = core.appElement() as AppElement | null
  element?.spellRoot?.unmount()
}

/**
 * Did the last run start an app?  `App.start()` leaves it on the mount point (`core.mountApp()`).
 * - An app started later, e.g. from a timer, isn't there yet -- a runner should watch for it drawing.
 */
export function appIsMounted(): boolean {
  return !!(core.appElement() as AppElement | null)?.spellRoot
}

/**
 * `source` with its imports pointed at URLs:
 * `@spell/core` at `coreUrl`, and each `@spell/project/<projectId>` at `imports[projectId]`.
 * - `@spell/elements` at `coreUrl` too:  the runtime copy exports `SpellElement` (`spellRuntime.ts`).
 * - Each code file it calls, `@spell/native/...`, at `natives[module]`.
 * - Pure.  A project not in `imports`, or a code file not in `natives`, is left as it was.
 */
export function linkModule(
  source: string,
  coreUrl: string,
  imports: Record<string, string> = {},
  natives: Record<string, string> = {}
): string {
  return source.replace(SPELL_IMPORT, (whole, from: string, specifier: string) => {
    const isRuntime = specifier === SPELL_CORE_MODULE || specifier === SPELL_ELEMENTS_MODULE
    const url = isRuntime
      ? coreUrl
      : specifier.startsWith(NATIVE_MODULE)
        ? natives[specifier]
        : imports[specifier.slice(PROJECT_MODULE.length)]
    return url ? `${from}"${url}"` : whole
  })
}

/** The code files `source` imports, by module, each once:  `@spell/native/owen@spell/clipboard/clipboard.ts`. */
export function nativeImportsOf(source: string): string[] {
  const modules = [...source.matchAll(SPELL_IMPORT)]
    .map(([, , specifier]) => specifier!)
    .filter((specifier) => specifier.startsWith(NATIVE_MODULE))
  return [...new Set(modules)]
}

/** A code file's name, from the module it's imported as:  `clipboard.ts`. */
function codeFileOf(module: string): string {
  return module.slice(module.lastIndexOf("/") + 1)
}

/** Ids of the projects `source` imports, each once, in order -- e.g. `@spell/examples/Solitaire`. */
export function projectImportsOf(source: string): string[] {
  const ids = [...source.matchAll(SPELL_IMPORT)]
    .map(([, , specifier]) => specifier)
    .filter((specifier) => specifier.startsWith(PROJECT_MODULE))
    .map((specifier) => specifier.slice(PROJECT_MODULE.length))
  return [...new Set(ids)]
}

/** `from "@spell/..."` in an `import` -- its `from`, then the specifier. */
const SPELL_IMPORT = /(\bfrom\s*)"(@spell\/[^"]+)"/g

/**
 * Start of the specifier compiled spell imports another project by -- `SP.SPELL_PROJECT_MODULE`.
 * - NOTE: a copy, NOT imported:  `spell/parser/spell` would pull the whole parser into the runner bundle.
 */
const PROJECT_MODULE = "@spell/project/"

/**
 * Start of the specifier compiled spell imports a code file by -- `SP.SPELL_NATIVE_MODULE`.
 * - NOTE: a copy, NOT imported:  `spell/parser/spell` would pull the whole parser into the runner bundle.
 */
const NATIVE_MODULE = "@spell/native/"

/** The app's mount point, with the mounted app `App.start()` leaves on it. */
type AppElement = HTMLElement & { spellRoot?: { app?: object; unmount(): void } }
