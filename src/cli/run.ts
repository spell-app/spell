import chalk from "chalk"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { emitKeypressEvents } from "node:readline"
import { createInterface } from "node:readline/promises"

import { within } from "spell/util/timing"
import { pathInside } from "spell/server/RealPath"
import { CLI } from "spell/cli"

/**
 * Run `work`, then exit with the code it resolves to:  every command's action ends here.
 * - A `CliError` prints just its message, and exits with its code;  a package the basic install left out says what
 *   to install (`missingAddOnMessage()`);  anything else is a crash, and prints its stack.
 * - NOTE: exits explicitly:  a parse can leave timers running, which would keep the process alive.
 * - Never resolves.
 */
export async function runCommand(work: () => Promise<number>): Promise<never> {
  let exitCode: number
  try {
    exitCode = await work()
  } catch (error) {
    const isCliError = error instanceof CLI.CliError
    const message = isCliError
      ? error.message
      : (missingAddOnMessage(error) ?? (error as Error)?.stack ?? String(error))
    process.stderr.write(`${chalk.red(message)}\n`)
    exitCode = isCliError ? error.exitCode : CLI.EXIT.ERRORS
  }
  // let stdout drain first, e.g. into a pipe, or `process.exit()` cuts it short -- but never wait long for it:
  // on CI a command printed all of its answer, then never exited (epic `repo-split` I73)
  const drained = new Promise<void>((done) => process.stdout.write("", () => done()))
  await within(drained, DRAIN_WAIT_MS / 1000)
  process.exit(exitCode)
}

/**
 * What to say when `error` is a package the published `spell` left out (`"optionalPeers"`):  the command to paste,
 * naming every one of them, so one paste is enough;  `undefined` for any other error.
 * - Read from the `package.json` of `kit`, so it's the versions this `spell` was built with.
 * - `spell@next`, not this version:  the people we tell this to are following the docs' `npx spell@next`.
 * - NEVER throws.
 */
export function missingAddOnMessage(error: unknown, kit = CLI.KIT_ROOT): string | undefined {
  const missing = missingPackageOf(error)
  if (!missing) return undefined
  try {
    const manifest = JSON.parse(readFileSync(join(kit, "package.json"), "utf8")) as {
      peerDependencies?: Record<string, string>
      peerDependenciesMeta?: Record<string, { optional?: boolean }>
    }
    const meta = manifest.peerDependenciesMeta ?? {}
    if (!meta[missing]?.optional) return undefined
    const addOns = Object.entries(manifest.peerDependencies ?? {})
      .filter(([name]) => meta[name]?.optional)
      .map(([name, version]) => shellWord(`${name}@${version}`))
    return [
      `This needs ${missing}, which the basic install of Spell leaves out.`,
      "Add the rest of Spell to this project, then run the command again with `npx spell`:",
      "",
      `  npm install spell@${CLI.PUBLISH_TAG} ${addOns.join(" ")}`
    ].join("\n")
  } catch {
    return undefined
  }
}

/** The package Node couldn't find, from its error;  `undefined` for any other error. */
function missingPackageOf(error: unknown): string | undefined {
  const { code, message } = (error ?? {}) as NodeJS.ErrnoException
  if (code !== "ERR_MODULE_NOT_FOUND" && code !== "MODULE_NOT_FOUND") return undefined
  const specifier = /(?:package|module) '([^']+)'/i.exec(String(message))?.[1]
  return specifier?.match(/^(@[^/]+\/[^/]+|[^./][^/]*)/)?.[1]
}

/** `word`, quoted when a shell would otherwise read part of it. */
function shellWord(word: string): string {
  return /^[\w@./:=+-]+$/.test(word) ? word : `"${word}"`
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
 * - keys typed before the question showed are thrown away (`dropTypedAhead()`):  a stray Enter can't answer it
 * - `input` / `output`:  the streams, `process.stdin` / `process.stdout` by default (tests hand their own)
 * - NEVER throws:  a closed terminal (Ctrl+D) answers `suggestion`
 */
export async function ask(
  question: string,
  { suggestion = "", input = process.stdin, output = process.stdout, typedAheadMs = TYPED_AHEAD_MS }: AskOptions = {}
): Promise<string> {
  if (!input.isTTY || !output.isTTY) return suggestion
  await dropTypedAhead(input, typedAheadMs)
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
 *   the up and down arrows move the mark, Enter takes it
 * - a number:
 *   - 9 choices or fewer:  its key takes that choice at once
 *   - more:  digits build the number and move the mark (`1` then `3` lands on 13), Enter takes it;  a digit that
 *     would go past the end starts a new number, and so does a pause of a second (`NUMBER_PAUSE_MS`)
 * - once picked, the list folds into one line:  the question and the answer (Escape's too)
 * - keys typed before the list showed are thrown away (`dropTypedAhead()`):  a stray arrow can't move the mark,
 *   nor a stray Enter pick (epic `epic-engine` P69:  "there was a problem with keys when selecting a color")
 * - asks only in a real terminal, as `ask()` does:  else `suggestion` (default the first choice), asking nothing
 * - Escape or Ctrl+D:  `suggestion`;  Ctrl+C:  stops the command, as anywhere else
 * - Node only, no library:  the kit's command base takes none (`spell/cli`'s barrel);  the app's Ink pickers
 *   (`ProjectPicker`) are a folder above, which the kit can't use
 * - NEVER throws
 */
export async function choose(
  question: string,
  choices: readonly Choice[],
  {
    suggestion = choices[0]?.value ?? "",
    input = process.stdin,
    output = process.stdout,
    typedAheadMs = TYPED_AHEAD_MS
  }: AskOptions = {}
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
  const raw = input as RawInput
  raw.setRawMode?.(true)
  await dropTypedAhead(input, typedAheadMs, { keepRaw: true })
  output.write(`${questionText(question)}\n${lines().join("\n")}\n`)
  const redraw = () =>
    output.write(
      `\x1b[${choices.length}A\r${lines()
        .map((line) => `\x1b[2K${line}`)
        .join("\n")}\n`
    )
  // the list folded:  back up over it and the question, clear to the end, and say what was picked
  const fold = (value: string) => {
    const label = choices.find((choice) => choice.value === value)?.label ?? value
    output.write(`\x1b[${choices.length + 1}A\r\x1b[J${questionText(question)} ${chalk.cyan(label)}\n`)
  }
  const numbered = new TypedNumber(choices.length)
  emitKeypressEvents(input)
  raw.setRawMode?.(true)
  input.resume()
  try {
    return await new Promise<string>((done) => {
      const finish = (value: string) => {
        input.off("keypress", onKey)
        fold(value)
        done(value)
      }
      const onKey = (text: string | undefined, key: { name?: string; ctrl?: boolean } = {}) => {
        if (key.ctrl && key.name === "c") {
          raw.setRawMode?.(false)
          process.kill(process.pid, "SIGINT")
        } else if (key.name === "up" || key.name === "down") {
          at = (at + (key.name === "up" ? -1 : 1) + choices.length) % choices.length
          numbered.clear()
          redraw()
        } else if (key.name === "return" || key.name === "enter") finish(choices[at]!.value)
        else if (key.name === "escape" || (key.ctrl && key.name === "d")) finish(suggestion)
        else if (text && /^\d$/.test(text)) {
          const number = numbered.type(text)
          if (number === undefined) return
          at = number - 1
          redraw()
          if (choices.length <= 9) finish(choices[at]!.value)
        }
      }
      input.on("keypress", onKey)
    })
  } finally {
    raw.setRawMode?.(false)
    input.pause()
  }
}

/**
 * Run `work` while the terminal waits on something slow (the code host asked who you are, a push):
 * a gray line saying what (`checking GitLab…`), and what's typed meanwhile not shown.
 * - why:  between questions the terminal is back in its normal mode, so keys pressed during a wait were printed
 *   (`^[[B^[[A`), looking like the picker's fault (epic `epic-engine` P69)
 * - hides typing with `stty -echo` where there is one, put back afterwards, even when `work` throws or the command
 *   is stopped;  NOT raw mode, which would stop Ctrl+C working while git and the host's command run
 * - the line only when `output` is a terminal;  the typing hidden only when `input` is one
 * - `work` may be async:  put back once it settles
 * - throws what `work` throws
 */
export function waiting<T>(
  text: string,
  work: () => T,
  { input = process.stdin, output = process.stdout }: Pick<AskOptions, "input" | "output"> = {}
): T {
  if (output.isTTY) output.write(`${chalk.gray(text)}\n`)
  const hides = Boolean(input.isTTY) && echo(false)
  // stopped meanwhile (Ctrl+C):  the typing shown again before it goes, as a stop with no listener would
  const stopped = () => {
    echo(true)
    process.exit(EXIT_STOPPED)
  }
  const restore = () => {
    if (!hides) return
    echo(true)
    process.off("exit", restore).off("SIGINT", stopped).off("SIGTERM", stopped)
  }
  if (hides) process.on("exit", restore).on("SIGINT", stopped).on("SIGTERM", stopped)
  let result: T
  try {
    result = work()
  } catch (error) {
    restore()
    throw error
  }
  if (result instanceof Promise) return result.finally(restore) as T
  restore()
  return result
}

/** `stty echo` / `stty -echo` on the terminal stdin is:  whether it worked (no `stty`, no terminal:  `false`). */
function echo(on: boolean): boolean {
  try {
    return spawnSync("stty", [on ? "echo" : "-echo"], { stdio: ["inherit", "ignore", "ignore"] }).status === 0
  } catch {
    return false
  }
}

/**
 * Throw away whatever `input` already holds, and what comes in the next `ms`:  keys typed before a question showed.
 * - why:  pressed while nothing was asking, they'd move the next pick or answer it (epic `epic-engine` P69)
 * - raw mode while it reads, so keys held in the terminal's line (no Enter yet) come too;  put back after, unless
 *   `keepRaw`
 * - `ms` 0:  nothing thrown away (the tests' streams)
 */
async function dropTypedAhead(
  input: NodeJS.ReadableStream,
  ms: number,
  { keepRaw = false }: { keepRaw?: boolean } = {}
): Promise<void> {
  if (ms <= 0) return
  const raw = input as RawInput
  raw.setRawMode?.(true)
  const drop = () => {}
  input.on("data", drop)
  input.resume()
  await new Promise((resolve) => setTimeout(resolve, ms))
  input.off("data", drop)
  input.pause()
  if (!keepRaw) raw.setRawMode?.(false)
}

/**
 * A number typed a digit at a time into a list of `count` choices:  `choose()`'s, for more than 9.
 * - `type()`:  the number now, once it's one of the choices;  `undefined` for a digit that names none
 * - a digit that would go past the end starts a new number;  so does a pause of `NUMBER_PAUSE_MS`
 */
class TypedNumber {
  /** how many choices there are */
  readonly count: number
  /** the digits so far */
  private digits = ""
  /** when the last digit came, ms */
  private lastAt = 0

  constructor(count: number) {
    this.count = count
  }

  /** Add `digit`:  the choice's number it comes to, or `undefined` when it names none. */
  type(digit: string, now = Date.now()): number | undefined {
    const paused = now - this.lastAt > NUMBER_PAUSE_MS
    this.lastAt = now
    const longer = paused || this.count <= 9 ? digit : this.digits + digit
    this.digits = this.fits(longer) ? longer : this.fits(digit) ? digit : ""
    return this.digits ? Number(this.digits) : undefined
  }

  /** Forget the digits:  the arrows moved the mark. */
  clear(): void {
    this.digits = ""
  }

  /** Whether `digits` is one of the choices' numbers. */
  private fits(digits: string): boolean {
    const number = Number(digits)
    return !digits.startsWith("0") && number >= 1 && number <= this.count
  }
}

/**
 * A question as `ask()` and `choose()` draw it:  `? ` and the question, bold yellow,
 * apart from what's typed (Owen, 2026-10-29).
 */
function questionText(question: string): string {
  return chalk.yellow.bold(`? ${question}`)
}

/** How long keys typed before a question showed are thrown away, ms:  `ask()`'s and `choose()`'s default. */
const TYPED_AHEAD_MS = 100

/** The exit code of a command stopped by Ctrl+C:  the shell's, 128 + SIGINT's 2. */
const EXIT_STOPPED = 130

/** How long a pause between digits starts a new number, ms (`choose()`, more than 9 choices). */
const NUMBER_PAUSE_MS = 1000

/** A stream that may switch the terminal into raw mode:  `process.stdin`. */
type RawInput = NodeJS.ReadableStream & { setRawMode?: (on: boolean) => void }

/** One of `choose()`'s choices. */
export type Choice = {
  /** what `choose()` answers when it's picked */
  value: string
  /** what the list shows */
  label: string
  /** a few words after it, after ` -- ` */
  hint?: string
}

/** `ask()`'s and `choose()`'s options. */
export type AskOptions = {
  /** the answer when they just press Enter, or when there's no terminal to ask in;  default `""` */
  suggestion?: string
  /** where the answer is read from;  default `process.stdin` */
  input?: NodeJS.ReadableStream & { isTTY?: boolean }
  /** where the question is written;  default `process.stdout` */
  output?: NodeJS.WritableStream & { isTTY?: boolean }
  /** how long keys typed before the question showed are thrown away, ms;  default 100;  0 (the tests):  none */
  typedAheadMs?: number
}

/** `path` relative to the current folder, when it's under it;  else as given. */
export function relativePath(path: string): string {
  return pathInside(process.cwd(), path) ?? path
}
