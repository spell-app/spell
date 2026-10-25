import {
  core,
  Thing,
  List,
  App,
  View,
  Page,
  TwoSidedView,
  ViewableList,
  h,
  css,
  on,
  off,
  once,
  trigger,
  send,
  positionOf,
  position,
  spellPosition,
  endPosition,
  withSpellPositions
} from "spell-parser/core"
import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"

import { parseSpellProject } from "./parseSpellProject"

/**
 * Spell `lines` compiled as one file, then RUN on `core`'s source:  what a program does, end to end.
 * - Returns a function that runs it and hands back the top-level variables `names` lists, by spell's names:
 *   `run("deck, first_pile")` => `{ deck, first_pile }`.
 * - Each run is a fresh program:  its classes and things are new.
 * - Its things don't register in `core.things` (`quietly()`).
 * - Fails the test if the file has parse errors.
 * - Several files, or things that register:  `runSpellFiles()`.
 */
export function runSpell(lines: string[]): (names: string) => Record<string, unknown> {
  return runSpellFiles([{ path: "/Test.spell", contents: lines.join("\n") }])
}

/**
 * `sources`, a project, compiled then RUN -- see `runSpell()`.
 * - Throws on a parse error, listing them.
 */
export function runSpellFiles(
  sources: Array<{ path: string; contents: string }>,
  { registered = false }: RunOptions = {}
): (names: string) => Record<string, unknown> {
  const { files } = parseSpellProject(sources)
  const errors = files.flatMap((file) => file.errors)
  if (errors.length) throw new Error(`parse errors:\n${JSON.stringify(errors, null, 2)}`)
  const parts = files.map(({ match, compiled }) => (match?.AST instanceof P.ASTStatementGroup ? match.AST : compiled))
  const code = SP.SpellProject.combineCompiled(parts)
    .split("\n")
    .filter((line) => !line.startsWith("import "))
    .join("\n")
    .replace(/^export /gm, "")
  return (names: string) => {
    // each top-level variable by spell's name, e.g. `first_pile`:  compiled javascript calls it `firstPile`
    const named = names
      .split(/,\s*/)
      .filter(Boolean)
      .map((name) => `${name}: ${P.JSWriter.instance.nameOf(name)}`)
    const body = `${code}\nreturn { ${named.join(", ")} }`
    // `@spell/core`'s helpers it imports by name, e.g. `trigger()`, as the import it lost would give them
    // and a view type's classes, drawing and `<css>`:  `View`, `h()`, `css`
    const imported = {
      ...{ on, off, once, trigger, send, positionOf, position, spellPosition, endPosition, withSpellPositions },
      ...{ View, Page, TwoSidedView, ViewableList, h, css }
    }
    // oxlint-disable-next-line no-implied-eval -- running compiled spell, as a runner does, is the test
    const fn = new Function("core", "Thing", "List", "App", ...Object.keys(imported), body)
    const run = () => fn(core, Thing, List, App, ...Object.values(imported))
    if (!registered) return core.things.quietly(run) as Record<string, unknown>
    core.things.clear()
    return run() as Record<string, unknown>
  }
}

/** How `runSpellFiles()` runs a program. */
export type RunOptions = {
  /** `true`:  its things register in `core.things`, as a running program's do, e.g. for `every pile`.  Default:  not. */
  registered?: boolean
}
