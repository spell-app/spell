import { LoadOnce } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly:  through `PY` every program that parses would bundle Python's writers (the language worker too)
import { PLACE_KINDS } from "spell/parser/py/places"
import type { PY } from "spell/parser/py"

import { COMPILED_JS_SUFFIX, COMPILED_PY_SUFFIX, COMPILED_TSX_SUFFIX, ELEMENTS_JS_SUFFIX } from "./spell.types"

/**
 * The TARGETS spell compiles to:  a language and the runtime its code runs on, e.g. `js/solid`.
 * - Each target has:
 *   - its WRITER (a `P.ProgramWriter`), which writes the parsed tree as that language's code
 *   - the file its code goes in
 *   - what its runtime can do
 * - A project lists its own in its project file, e.g. `"targets": ["js/solid", "ts/solid"]` (`SpellProject.targets`).
 * - `spell compile --target <name>` picks one for a single run.
 * - `js/solid` is ALWAYS compiled:  it's what the editor, the runners and `spell run` run.
 * - Only `js/solid`'s writer is here from the start.
 *   Every other target's loads on first use (epic `solid-2-final` P19):
 *   `await SP.loadTarget(name)` (or `loadTargets()`) before reading its `writer`;  `SpellProject` does, as it compiles.
 *   - So a program that only runs, or parses, never downloads the TypeScript and Python writers:
 *     the editor's language worker, about 19 KB brotli lighter.
 */

/** A target spell compiles to -- see `TARGETS`. */
export type Target = {
  /** Its name, LANGUAGE/RUNTIME, e.g. `js/solid`. */
  name: string
  /**
   * Writes its code.
   * - throws until it has loaded, for every target but `js/solid`:  `await SP.loadTarget(name)` first
   */
  readonly writer: P.ProgramWriter
  /** End of its compiled output file's name, e.g. `.spell.js`. */
  suffix: string
  /** What its runtime can do. */
  can: TargetAbilities
  /**
   * What checks its output after `spell compile`, a function in `spell/parser/spell/node`:
   * - `tsc`:  `typecheck()`
   * - `pyright`:  `pyright()`
   */
  checkedBy?: "tsc" | "pyright"
  /**
   * End of the name of its own words file, beside its output, e.g. `.py.en.json5`.
   * - The file:  spell's wording of each member, keyed by THIS target's names (`move_to_pile`).
   *   See `SP.SpellWords.json()`.
   * - `js/solid`'s words are `<Project>.en.js`, which every runner loads -- see `SP.SpellProject.wordsFile`.
   */
  wordsSuffix?: string
  /**
   * End of the name of its PAGE's file, beside its output, e.g. `.elements.spell.js` (epic `python-target` P19).
   * - The file:  a program that draws, its drawing half in javascript (`PY.ElementsWriter`),
   *   for a page that mirrors the program running here.
   * - Written only for a project that draws.
   */
  elementsSuffix?: string
  /**
   * End of the name of its web APP's file, beside its output, e.g. `.app.py` (epic `python-target` P20).
   * - The file:  a Quart app serving the program, a game per visitor (`PY.quartApp()`).
   * - Written only for a project that draws, and only while nobody has edited it (`PY.isUneditedApp()`).
   */
  appSuffix?: string
}

/** What a target's runtime can do -- checked while compiling, so a project asks only what its targets give. */
export type TargetAbilities = {
  /** Draw a UI:  `dom` into the page, `html` as text (e.g. server pages), or not at all. */
  draw: "dom" | "html" | false
  /**
   * Run the program:  its top-level steps, e.g. `spell run`, and the core contract's runs.
   * - `false` for a library (`ts/lib`), which keeps only the classes;  every other target runs.
   */
  run?: false
  /**
   * Keep things in a place (epic `data`, J10):  left out, every kind.
   * - `false`:  none yet, and a project that keeps things in one is told.
   * - A list of kinds' words (`"data folder"`):  only those;  a place of any other kind is refused by its kind's word,
   *   a web server's too (`"web server"`), as Python's are (epic `data` P40).
   */
  places?: false | readonly string[]
}

/** `spell/parser/py`, once the `py` target's writer has loaded. */
let loadedPython: typeof PY | undefined

/** Each loaded writer, by its target's name:  `loadTarget()`. */
const WRITERS = new LoadOnce<string, P.ProgramWriter>()

/** How each target past `js/solid` loads its writer, by name. */
const WRITER_LOADS = new Map<string, () => Promise<P.ProgramWriter>>()

/** Every target, by name. */
export const TARGETS: Record<string, Target> = {
  "js/solid": { name: "js/solid", writer: P.JSWriter.instance, suffix: COMPILED_JS_SUFFIX, can: { draw: "dom" } },
  // Solid TypeScript, as a person writes it, on the same runtime:  JSX, decorators (`@prop`, `@drawn`)
  // - checked by `tsc`
  // - never run as is:  it needs a build first (`buildTsx()` in `spell/parser/spell/node/buildTsx`)
  "ts/solid": loadsItsWriter(
    { name: "ts/solid", suffix: COMPILED_TSX_SUFFIX, can: { draw: "dom" }, checkedBy: "tsc" },
    async () => (await import("spell/parser/parser/writers/TSWriter")).TSWriter.instance
  ),
  // Python as a person writes it, with PEP 8's names, on `spell_core` (`src/py/core`), on asyncio
  // (epic `python-target`, one target since P22):
  // - a function that pauses is `async def`, and its callers await it
  // - draws HTML as text (Q2)
  // - a program that draws also gets its page, `.elements.spell.js`, and its web app, `.app.py`
  // - keeps things in three kinds of place (epic `data` P40):  a file beside it, and the page server's data folders
  //   and sheets (`spell_core.places`)
  py: loadsItsWriter(
    {
      name: "py",
      suffix: COMPILED_PY_SUFFIX,
      can: { draw: "html", places: PLACE_KINDS },
      wordsSuffix: ".py.en.json5",
      elementsSuffix: ELEMENTS_JS_SUFFIX,
      appSuffix: ".app.py",
      checkedBy: "pyright"
    },
    async () => {
      const { PY } = await import("spell/parser/py")
      loadedPython = PY
      return PY.PyWriter.instance
    }
  ),
  // A LIBRARY (epic `people-and-orgs` P3):  the project's classes alone, as ONE TypeScript file,
  // for the repo's code to import
  // - no drawing, no top-level steps, the core with no Solid (`spell/parser/core/model`)
  // - `People.lib.ts`, committed beside its source and marked generated
  // - checked by `tsc`, as `ts/solid` is
  "ts/lib": loadsItsWriter(
    { name: "ts/lib", suffix: ".lib.ts", can: { draw: false, run: false, places: false }, checkedBy: "tsc" },
    async () => (await import("spell/parser/parser/writers/LibraryWriter")).LibraryWriter.instance
  )
}

/** The target everything runs:  always compiled -- see the module docs. */
export const RUNNING_TARGET = "js/solid"

/** Target `name` -- throws, listing the targets there are, if there's no such target. */
export function targetFor(name: string): Target {
  const target = TARGETS[name]
  if (!target) {
    throw new P.ParserError({
      message: `There's no target '${name}':  try ${Object.keys(TARGETS).join(", ")}.`,
      activity: "SP.targetFor",
      params: { name }
    })
  }
  return target
}

/**
 * Target `name`, its writer loaded:  the one way to use a target's `writer` past `js/solid`'s (see the module docs).
 * - Once:  every later call has it at once (`LoadOnce`).
 * - throws as `targetFor()` does, or if its writer's code can't be loaded
 */
export async function loadTarget(name: string): Promise<Target> {
  const target = targetFor(name)
  const load = WRITER_LOADS.get(name)
  if (load) await WRITERS.get(name, load)
  return target
}

/** Load every one of `targets` (`loadTarget()`), by name or as they are. */
export async function loadTargets(targets: Iterable<Target | string>): Promise<void> {
  await Promise.all([...targets].map((target) => loadTarget(typeof target === "string" ? target : target.name)))
}

/**
 * Python's writers and its page and app (`spell/parser/py`), once the `py` target has loaded (`loadTarget("py")`).
 * - What `SpellProject` writes a Python program's drawing half and web app with, after loading the target.
 * - throws before it's loaded
 */
export function python(): typeof PY {
  if (!loadedPython) throw new TypeError(`SP.python():  the py target hasn't loaded;  await SP.loadTarget("py") first`)
  return loadedPython
}

/**
 * `target` with a `writer` that loads on first use, by `load()`:  reading it before `loadTarget()` has throws.
 * - SIDE EFFECT:  records `load` for `loadTarget()`.
 */
function loadsItsWriter(target: Omit<Target, "writer">, load: () => Promise<P.ProgramWriter>): Target {
  WRITER_LOADS.set(target.name, load)
  return {
    ...target,
    get writer() {
      const writer = WRITERS.valueOf(target.name)
      if (!writer) {
        throw new TypeError(
          `SP.TARGETS["${target.name}"].writer:  it loads on first use;  await SP.loadTarget("${target.name}") first`
        )
      }
      return writer
    }
  }
}
