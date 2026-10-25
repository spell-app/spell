import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { constants } from "node:os"
import { join } from "node:path"

// By its file, not the server's barrel:  every `spell` command loads this, and needs no linkedom
import { RealPath } from "spell/server/RealPath"
import { CLI } from "spell/cli"

/**
 * Running another program from a command:  a repo's own tool script (`runTool()`), any program (`runChild()`), or
 * spell-epic's `epic` command (`runEpic()`).
 * - Node built-ins only:  every repo's commands use these, and `spell` must start fast.
 */

/**
 * Run tool `spec` of the nearest checkout from the current folder (`findCheckout(spec.tool)`),
 * with `args` verbatim and this terminal attached.  Resolves to its exit code.
 * - a child `node`, under `tsx` and the run-time alias hook when `spec.tsx` is set:
 *   the tool's own `tsconfig.json` then maps its `$/...` imports into the TOOL's checkout,
 *   which may be a worktree while `spell` runs from main
 * - `env`:  added to this process's
 */
export function runTool(spec: CLI.ToolSpec, args: string[], env: NodeJS.ProcessEnv = {}): Promise<number> {
  const root = CLI.findCheckout(spec.tool)
  return runChild(process.execPath, [...toolArgs(spec, root), ...args], {
    cwd: spec.cwd ? join(root, spec.cwd) : process.cwd(),
    env: {
      ...process.env,
      ...(spec.tsx ? { TSX_TSCONFIG_PATH: join(root, spec.tsx) } : {}),
      ...(spec.tool.startsWith(`${ENGINE}/`) ? engineEnv(root) : {}),
      ...env
    }
  })
}

/**
 * What an engine tool run through checkout `root`'s spell-epic needs to work on THAT checkout, as `epic` tells
 * its tools:  `EPIC_CHECKOUT`, its data.
 */
export function engineEnv(root: string): NodeJS.ProcessEnv {
  return { EPIC_CHECKOUT: root }
}

/**
 * `node`'s arguments before the tool's own, for `spec` in checkout `root`:  the `tsx` loader if any, the script.
 * - the script by its REAL path:  one through a link runs only when it's its own `argv[1]`
 *   (`import.meta.url`, which node gives as the real path, against `process.argv[1]`)
 */
export function toolArgs(spec: CLI.ToolSpec, root: string): string[] {
  const script = RealPath.of(join(root, spec.tool))
  return spec.tsx ? ["--import", TSX_LOADER, script] : [script]
}

/** The kit's own `tsx` loader:  a worktree's tool runs before the worktree has a `node_modules`. */
export const TSX_LOADER = import.meta.resolve("tsx/esm")

/**
 * Run `command` with `args` as a child, with this terminal attached, and resolve to its exit code.
 * - `Ctrl-C` reaches the child from the terminal itself, so this process ignores it until the child is done:
 *   a foreground server (`spell server local`) gets to stop cleanly, and we exit with its code
 * - `SIGTERM` / `SIGHUP` sent to us alone are passed on
 * - killed by a signal:  `128 +` its number, as a shell reports it;  failed to start:  `EXIT.ERRORS`, saying why
 * - as spell-epic's `EpicTools.runChild()`, which the kit can't import (it's a repo above)
 */
export function runChild(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): Promise<number> {
  const child = spawn(command, args, { ...options, stdio: "inherit" })
  const ignore = () => {}
  const pass = (signal: NodeJS.Signals) => child.kill(signal)
  process.on("SIGINT", ignore)
  for (const signal of PASSED_SIGNALS) process.on(signal, pass)
  return new Promise((done) => {
    child.on("error", (error) => {
      process.stderr.write(`${command}:  ${error.message}\n`)
      finish(CLI.EXIT.ERRORS)
    })
    child.on("exit", (code, signal) => finish(code ?? 128 + (signal ? constants.signals[signal] : 0)))

    /** Stop listening for signals, and resolve to `code`. */
    function finish(code: number) {
      process.off("SIGINT", ignore)
      for (const signal of PASSED_SIGNALS) process.off(signal, pass)
      done(code)
    }
  })
}

/** The signals `runChild()` passes on to its child (`SIGINT` reaches it from the terminal). */
const PASSED_SIGNALS: NodeJS.Signals[] = ["SIGTERM", "SIGHUP"]

////////////////
// ## The `epic` command
////////////////

/** spell-epic, the epic engine:  a child repo of the kit, at its root. */
export const ENGINE = "spell-epic"

/**
 * The `epic` command to run:  spell-epic's `bin/epic` in the nearest checkout that has one (`findCheckout()`, else
 * the kit `spell` runs from);  else plain `epic`, on the `PATH`.
 * - `from`:  where to look from, default the current folder
 */
export function epicBin(from = process.cwd()): string {
  const bin = join(ENGINE, "bin", "epic")
  const found = join(CLI.findCheckout(bin, from), bin)
  return existsSync(found) ? found : "epic"
}

/**
 * Run `epic <args>`, with this terminal attached;  resolves to its exit code.
 * - spell-epic's command, which runs ITS code on the caller's checkout's data
 * - `bin`:  which `epic` (`epicBin()`);  a path runs under this `node`, plain `epic` from the `PATH`
 */
export function runEpic(args: string[], bin = epicBin()): Promise<number> {
  return bin === "epic" ? runChild(bin, args) : runChild(process.execPath, [bin, ...args])
}
