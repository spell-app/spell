import chalk from "chalk"
import { relative } from "node:path"

import { CLI } from "spell-kit/cli"

/**
 * Run `work`, then exit with the code it resolves to:  every command's action ends here.
 * - A `CliError` prints just its message, and exits with its code;  anything else is a crash, and prints its stack.
 * - NOTE: exits explicitly:  a parse can leave timers running, which would keep the process alive.
 * - Never resolves.
 */
export async function runCommand(work: () => Promise<number>): Promise<never> {
  let exitCode: number
  try {
    exitCode = await work()
  } catch (error) {
    const isCliError = error instanceof CLI.CliError
    process.stderr.write(`${chalk.red(isCliError ? error.message : ((error as Error)?.stack ?? String(error)))}\n`)
    exitCode = isCliError ? error.exitCode : CLI.EXIT.ERRORS
  }
  // let stdout drain first, e.g. into a pipe, or `process.exit()` cuts it short
  await new Promise<void>((done) => process.stdout.write("", () => done()))
  process.exit(exitCode)
}

/**
 * Everything on the command line after `words`, as typed:  `rawArgsAfter("design")` of `spell design build --out x`
 * is `["build", "--out", "x"]`.
 * - Why:  commander would take a tool's own flags, e.g. `--all`, as ours.
 * - `words`:  the command's path, each found after the one before;  so `rawArgsAfter("app", "vscode")`
 */
export function rawArgsAfter(...words: string[]): string[] {
  const argv = process.argv
  let at = 1
  for (const word of words) at = argv.indexOf(word, at + 1)
  return argv.slice(at + 1)
}

/** Write `text` to stdout, on its own line. */
export function out(text: string): void {
  process.stdout.write(text.endsWith("\n") ? text : `${text}\n`)
}

/** Write `text` to stderr, on its own line. */
export function err(text: string): void {
  process.stderr.write(text.endsWith("\n") ? text : `${text}\n`)
}

/** `path` relative to the current folder, when it's under it;  else as given. */
export function relativePath(path: string): string {
  const rel = relative(process.cwd(), path)
  return rel.startsWith("..") ? path : rel
}
