import { stripVTControlCharacters } from "node:util"

import chalk, { Chalk, type ChalkInstance } from "chalk"

import { Logger, type DebugLevel } from "spell/util/spell/Logger"

/**
 * The page server's log:  what a person reading `.spell-server.log` (or `spell server local`) needs,
 * the rest behind `SPELL_DEBUG`.
 * - ONE per part of the server, its `prefix` starting each line:  `bundles:  building ui-site ...`
 *   - its name in `SPELL_DEBUG` is `server:<prefix>`, so `SPELL_DEBUG=server` shows every part's debug lines,
 *     `SPELL_DEBUG=server:bundles` one part's (`Logger.levelIn()`, WWOD §19)
 *   - `INFO` by default:  milestones, warnings and errors;  `debug()` lines are the chatter
 * - How a line looks:
 *   - the prefix dimmed, an error red, a warning yellow, a debug line dimmed, an address cyan
 *   - `gap()`:  a blank line between groups (the server's start, each build), never two in a row
 *   - colour only where the output takes it (`colorsFor()`):  a terminal, or the background server's log,
 *     which it's started with;  never with `NO_COLOR`
 * - `childLine()`:  a line a child process printed (`spell bundle --stale`, `spell compile`), at the level its
 *   rules give it, so a build's file sizes are debug and its failures errors
 * - A `Logger`, so it writes through `console`;  node only (`process.env`):  nothing browser-side imports it.
 */
export class ServerLog extends Logger {
  /** its name in `SPELL_DEBUG`:  `server:<prefix>` */
  readonly name: string

  /** the colours its lines are written in;  none at all, `chalk`'s level 0 */
  readonly colors: ChalkInstance

  /** the next line shown starts a group (`groupNext()`) */
  private gapNext = false

  /**
   * - `prefix`:  starts each line, e.g. `bundles`
   * - `name`:  its name in `SPELL_DEBUG` (default `server:<prefix>`)
   * - `level`:  when `SPELL_DEBUG` doesn't name it (default `INFO`)
   * - `env`:  where `SPELL_DEBUG` and `NO_COLOR` are read (default `process.env`);  a test's own
   * - `colors`:  a test's, e.g. `new Chalk({ level: 1 })`
   */
  constructor({ prefix, name = `server:${prefix}`, level = Logger.INFO, env = process.env, colors }: ServerLogProps) {
    super({ prefix, level: Logger.levelIn(env.SPELL_DEBUG, name) ?? level })
    this.name = name
    this.colors = colors ?? colorsFor(env)
  }

  /**
   * A blank line before what comes next, to start a group:  the server's start, a build.
   * - once:  after a blank line, or before anything was written, nothing
   */
  gap(): void {
    if (ServerLog.lastLine === "text") console.log("")
    ServerLog.lastLine = "blank"
  }

  /**
   * The next line shown starts a group:  a blank line before it (`gap()`), however long until it comes.
   * - for a child's run, whose first lines may all be debug:  a compile with nothing to do shows nothing
   */
  groupNext(): void {
    this.gapNext = true
  }

  /**
   * Log `line`, a line a child process printed, at the level the first of `rules` matching it says;
   * none:  an error when it names one, a warning when it warns, else `INFO`.
   * - matched without the child's own colours, and written without them, in this log's
   * - a blank line:  dropped (this log puts its own between groups)
   * - a rule's `starts`:  a new group, a blank line before it
   * - returns whether it was shown
   */
  childLine(line: string, rules: readonly LineRule[] = []): boolean {
    const text = stripVTControlCharacters(line).trimEnd()
    if (!text.trim()) return false
    const rule = [...rules, ...ServerLog.CHILD_LINES].find((each) => each.line.test(text))
    const level = rule?.level ?? Logger.INFO
    if (!this.shows(level)) return false
    if (rule?.starts) this.groupNext()
    this.output(level, CONSOLE_METHODS[level], [rule?.shown?.(text) ?? text])
    return true
  }

  /** the prefix dimmed;  the message coloured by its level (`args[0]`, when text);  the rest as given */
  protected override write(level: DebugLevel, consoleMethod: ConsoleMethod, args: any[]) {
    if (this.gapNext) this.gap()
    this.gapNext = false
    const [first, ...rest] = args
    const message = typeof first === "string" ? this.colored(level, first) : first
    const prefix = this.prefix ? `${this.colors.dim(`${this.prefix}:`)}  ` : ""
    ServerLog.lastLine = "text"
    console[consoleMethod](`${prefix}${message ?? ""}`, ...rest)
  }

  /** `message` in its level's colour:  an error red, a warning yellow, debug dimmed;  addresses cyan */
  colored(level: DebugLevel, message: string): string {
    const { colors } = this
    if (level === Logger.ERROR) return colors.red(message)
    if (level === Logger.WARN) return colors.yellow(message)
    if (level === Logger.DEBUG) return colors.dim(message)
    return message.replace(ADDRESS, (address) => colors.cyan(address))
  }

  /**
   * The rules every child's lines end with, after its own:  an error, a warning.
   * - an error:  `error`, `Error`, `failed`, `FAILED` as a word (`Bundle.build():  ... failed:  exit 1`,
   *   tsc's `error TS2322`);  not `errors` (`0 errors`)
   * - a warning:  `warning` as a word, esbuild's `!!`, rolldown's `[INEFFECTIVE_DYNAMIC_IMPORT]`
   */
  static readonly CHILD_LINES: readonly LineRule[] = [
    { line: /\b(error|ERROR|failed|FAILED)\b|[A-Za-z]*Error\b/, level: Logger.ERROR },
    { line: /\bwarning\b|^!!|^\[[A-Z_]+\]/, level: Logger.WARN }
  ]

  /** What was written last, by any of them:  one process, one output (`gap()`) */
  private static lastLine: "none" | "blank" | "text" = "none"
}

/** The `console` method each level writes with, as `Logger`'s own do. */
const CONSOLE_METHODS = {
  OFF: "log",
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "log"
} as const satisfies Record<DebugLevel, ConsoleMethod>

/** An address in a line:  `http://127.0.0.1:4747/epics/` */
const ADDRESS = /\bhttps?:\/\/[^\s)'"`]+/g

/**
 * The colours for output written where `env` says, e.g. `process.env`:
 * - none with `NO_COLOR` set (https://no-color.org), whatever else says
 * - else `chalk`'s own choice:  a terminal, or `FORCE_COLOR` (the background server's, `PageServer.ensure()`)
 */
export function colorsFor(env: NodeJS.ProcessEnv): ChalkInstance {
  return new Chalk({ level: env.NO_COLOR ? 0 : chalk.level })
}

/** The `console` method a `Logger` writes a message with. */
type ConsoleMethod = "log" | "info" | "warn" | "error" | "group"

/**
 * How `ServerLog.childLine()` takes a child's line.
 * - `line`:  matches it, without its colours
 * - `level`:  the level it's logged at;  `Logger.OFF`:  never
 * - `starts`:  it starts a group:  a blank line before it
 * - `shown`:  what's logged instead of the whole line, e.g. without its list of files written
 */
export type LineRule = {
  line: RegExp
  level: DebugLevel
  starts?: boolean
  shown?: (line: string) => string
}

/** `new ServerLog()` props:  SEE its constructor. */
export type ServerLogProps = {
  prefix: string
  name?: string
  level?: DebugLevel
  env?: NodeJS.ProcessEnv
  colors?: ChalkInstance
}
