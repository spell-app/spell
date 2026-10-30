import chalk from "chalk"
import { relative } from "node:path"
import { emitKeypressEvents } from "node:readline"
import { createInterface } from "node:readline/promises"

import { CLI } from "spell/cli"

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
  // let stdout drain first, e.g. into a pipe, or `process.exit()` cuts it short -- but never wait long for it:
  // on CI a command printed all of its answer, then never exited (epic `repo-split` I73)
  const drained = new Promise<void>((done) => process.stdout.write("", () => done()))
  await Promise.race([drained, new Promise<void>((done) => setTimeout(done, DRAIN_WAIT_MS))])
  process.exit(exitCode)
}

/** How long `runCommand()` waits for stdout to drain before it exits anyway. */
const DRAIN_WAIT_MS = 2000

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

/**
 * Ask the person at the terminal `question`;  their answer, else `suggestion`.
 * - asks only in a real terminal (stdin AND stdout a TTY):  a skill, a Claude session, a pipe or CI has none,
 *   so it answers `suggestion` at once, asking nothing
 * - the question in colour, to stand out from what's typed (`questionText()`);  the suggestion after it,
 *   in the terminal's own colour, readable on a dark background (`What do you want to be called? (Ana Lima) `);
 *   Enter alone, or only spaces, takes it
 * - `input` / `output`:  the streams, `process.stdin` / `process.stdout` by default (tests hand their own)
 * - NEVER throws:  a closed terminal (Ctrl+D) answers `suggestion`
 */
export async function ask(
  question: string,
  { suggestion = "", input = process.stdin, output = process.stdout }: AskOptions = {}
): Promise<string> {
  if (!input.isTTY || !output.isTTY) return suggestion
  const terminal = createInterface({ input, output })
  try {
    const asked = questionText(question)
    const answer = await terminal.question(suggestion ? `${asked} (${suggestion}) ` : `${asked} `)
    return answer.trim() || suggestion
  } catch {
    return suggestion
  } finally {
    terminal.close()
  }
}

/**
 * Ask the person at the terminal to pick one of `choices`:  the value picked, else `suggestion`.
 * - drawn as a numbered list under the question, the suggestion first marked (`❯`):
 *   the up and down arrows move the mark, Enter takes it, a number key takes that choice at once
 * - asks only in a real terminal, as `ask()` does:  else `suggestion` (default the first choice), asking nothing
 * - Escape or Ctrl+D:  `suggestion`;  Ctrl+C:  stops the command, as anywhere else
 * - Node only, no library:  the kit's command base takes none (`spell/cli`'s barrel);  the app's Ink pickers
 *   (`ProjectPicker`) are a folder above, which the kit can't use
 * - NEVER throws
 */
export async function choose(
  question: string,
  choices: readonly Choice[],
  { suggestion = choices[0]?.value ?? "", input = process.stdin, output = process.stdout }: AskOptions = {}
): Promise<string> {
  if (!input.isTTY || !output.isTTY || !choices.length) return suggestion
  let at = Math.max(
    0,
    choices.findIndex(({ value }) => value === suggestion)
  )
  const lines = () =>
    choices.map(({ label, hint }, index) => {
      const line = `${index === at ? "❯" : " "} ${index + 1}. ${label}${hint ? `  -- ${hint}` : ""}`
      return index === at ? chalk.cyan(line) : line
    })
  output.write(`${questionText(question)}\n${lines().join("\n")}\n`)
  const redraw = () =>
    output.write(
      `\x1b[${choices.length}A\r${lines()
        .map((line) => `\x1b[2K${line}`)
        .join("\n")}\n`
    )
  const raw = input as NodeJS.ReadableStream & { setRawMode?: (on: boolean) => void }
  emitKeypressEvents(input)
  raw.setRawMode?.(true)
  input.resume()
  try {
    return await new Promise<string>((done) => {
      const onKey = (text: string | undefined, key: { name?: string; ctrl?: boolean } = {}) => {
        const pick = (index: number) => {
          input.off("keypress", onKey)
          done(choices[index]!.value)
        }
        if (key.ctrl && key.name === "c") {
          raw.setRawMode?.(false)
          process.kill(process.pid, "SIGINT")
        } else if (key.name === "up" || key.name === "down") {
          at = (at + (key.name === "up" ? -1 : 1) + choices.length) % choices.length
          redraw()
        } else if (key.name === "return" || key.name === "enter") pick(at)
        else if (key.name === "escape" || (key.ctrl && key.name === "d")) {
          input.off("keypress", onKey)
          done(suggestion)
        } else if (text && /^[1-9]$/.test(text) && Number(text) <= choices.length) {
          at = Number(text) - 1
          redraw()
          pick(at)
        }
      }
      input.on("keypress", onKey)
    })
  } finally {
    raw.setRawMode?.(false)
    input.pause()
  }
}

/** A question as `ask()` and `choose()` draw it:  bold yellow, apart from what's typed (Owen, 2026-10-29). */
function questionText(question: string): string {
  return chalk.yellow.bold(question)
}

/** One of `choose()`'s choices. */
export type Choice = {
  /** what `choose()` answers when it's picked */
  value: string
  /** what the list shows */
  label: string
  /** a few words after it, after ` -- ` */
  hint?: string
}

/** `ask()`'s options. */
export type AskOptions = {
  /** the answer when they just press Enter, or when there's no terminal to ask in;  default `""` */
  suggestion?: string
  /** where the answer is read from;  default `process.stdin` */
  input?: NodeJS.ReadableStream & { isTTY?: boolean }
  /** where the question is written;  default `process.stdout` */
  output?: NodeJS.WritableStream & { isTTY?: boolean }
}

/** `path` relative to the current folder, when it's under it;  else as given. */
export function relativePath(path: string): string {
  const rel = relative(process.cwd(), path)
  return rel.startsWith("..") ? path : rel
}
