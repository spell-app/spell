import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { delimiter, join } from "node:path"

import { CLI } from "spell/cli"

import { GRAPHIFY_PACKAGE } from "./map.types"

/**
 * graphify, the open-source code-mapping engine `spell map` runs:  an OPTIONAL install, in Python, on this machine.
 * - Static and instance-free on purpose:  it's one program on the PATH, with nothing to hold.
 * - Nothing else in the repos needs it:  without it, `spell map` says how to install it, and the rest works as before.
 * - Its own docs:  https://graphify.com (the hosted site, which `spell map` never uses).
 */
export class Graphify {
  /** Its program's path, when it's on the PATH;  else `undefined`. */
  static get program(): string | undefined {
    return onPath(PROGRAM)
  }

  /** Its program's path;  throws `CliError` saying how to install it when it isn't. */
  static need(): string {
    const program = Graphify.program
    if (!program) throw new CLI.CliError(`graphify isn't installed:  ${INSTALL_HINT}`, CLI.EXIT.ERRORS)
    return program
  }

  /**
   * Install it, with uv (`uv tool install graphifyy`), or upgrade it when it's there.
   * - throws `CliError` when uv itself isn't installed, saying how to get it
   */
  static install(): Promise<number> {
    if (!onPath("uv")) throw new CLI.CliError(`graphify installs with uv, which isn't installed:  ${UV_HINT}`)
    return CLI.runChild("uv", ["tool", "install", "--upgrade", GRAPHIFY_PACKAGE])
  }

  /**
   * Map the code of the repo at `root`:  graphify's code pass, which reads the code's structure, with no model.
   * - Writes `<root>/graphify-out/graph.json`;  only files changed since its last run are read again.
   * - Skips what git ignores:  so the kit's map has none of the old child repos' folders.
   * - throws when graphify fails, with what it printed
   */
  static mapRepo(root: string): void {
    const run = spawnSync(Graphify.need(), ["update", ".", "--no-cluster", "--force"], { cwd: root, encoding: "utf8" })
    if (run.status !== 0) throw new Error(`graphify update in ${root} failed:\n${run.stderr || run.stdout}`)
  }

  /**
   * Run one of graphify's own questions on map `graph`, its answer straight to the terminal.
   * - `verb`:  `query` (a question in words), `explain` (a thing and its links), `affected` (what uses a thing)
   */
  static ask(verb: string, graph: string, args: string[]): Promise<number> {
    return CLI.runChild(Graphify.need(), [verb, ...args, "--graph", graph])
  }
}

/** graphify's program. */
const PROGRAM = "graphify"

/** What to type to install graphify. */
const INSTALL_HINT = "spell map install"

/** What to type to install uv, which installs graphify. */
const UV_HINT = "brew install uv (or see https://docs.astral.sh/uv/)"

/** `program`'s path, from the PATH;  `undefined` when it isn't on it. */
function onPath(program: string): string | undefined {
  for (const folder of (process.env.PATH ?? "").split(delimiter)) {
    const path = join(folder, program)
    if (folder && existsSync(path)) return path
  }
  return undefined
}
