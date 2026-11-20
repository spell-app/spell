import chalk from "chalk"

import { commaList } from "spell/util/string"

////////////////
// ## Debug states
////////////////

// Ordered least to most verbose -- `indexOf()` on this array is how `Logger.output()` compares levels.
const DEBUG_LEVELS = ["OFF", "ERROR", "WARN", "INFO", "DEBUG"] as const
/** One of `Logger`'s level names, e.g. `"WARN"`. */
export type DebugLevel = (typeof DEBUG_LEVELS)[number]

/** The `console` method a `Logger` writes a message with. */
type ConsoleMethod = "log" | "info" | "warn" | "error" | "group"

/**
 * Create a `logger` instance with its own level/prefix/color, so different subsystems can be tuned
 * independently at runtime.
 *
 * ```
 * class Foo {
 *   logger = new Logger({ prefix: "Foo", level: Logger.INFO })
 *   ...
 *   this.logger.debug("will be skipped")
 *   this.logger.info("will output")
 *   this.logger.warn("will output")
 *   ...
 *   this.logger.level = Logger.DEBUG
 *   this.logger.debug("will now be shown")
 * }
 * ```
 */
export class Logger {
  /**
   * Current log level -- messages more verbose than this are skipped by `output()`.
   * - `"WARN"`, not `Logger.WARN`:  the statics are declared below, and a field can't read them before they are.
   */
  level: DebugLevel = "WARN"
  /** Prefix to prepend to all messages, e.g. subsystem name. */
  prefix: string | undefined = undefined
  /** Color to apply to `prefix` in our output, as any CSS color `chalk.hex()` accepts. */
  color: string = "#999"

  /** All of `level`/`prefix`/`color` are optional and fall back to class field defaults above. */
  constructor({ level, prefix, color }: { level?: DebugLevel; prefix?: string; color?: string } = {}) {
    if (level !== undefined) this.level = level
    if (prefix !== undefined) this.prefix = prefix
    if (color !== undefined) this.color = color
  }

  /** Log at `DEBUG` level via `console.log`. */
  public debug = (...args: any[]) => this.output(Logger.DEBUG, "log", args)
  /** Log at `INFO` level via `console.info`. */
  public info = (...args: any[]) => this.output(Logger.INFO, "info", args)
  /** Log at `WARN` level via `console.warn`. */
  public warn = (...args: any[]) => this.output(Logger.WARN, "warn", args)
  /** Log at `ERROR` level via `console.error`. */
  public error = (...args: any[]) => this.output(Logger.ERROR, "error", args)
  /** Open a `console.group()`, gated at `INFO` level. */
  public group = (...args: any[]) => this.output(Logger.INFO, "group", args)
  /** Close a `console.group()` -- NOTE: not level-gated, so always call it if you called `group()`. */
  public groupEnd = () => console.groupEnd()

  /** Would a message at `level` be shown, at this logger's `level`? */
  shows(level: DebugLevel): boolean {
    return level !== Logger.OFF && DEBUG_LEVELS.indexOf(level) <= DEBUG_LEVELS.indexOf(this.level)
  }

  /** Shared implementation for `debug`/`info`/`warn`/`error`/`group` -- drops message if too verbose for `level`. */
  protected output(outputLevel: DebugLevel, consoleMethod: ConsoleMethod, args: any[]) {
    if (this.shows(outputLevel)) this.write(outputLevel, consoleMethod, args)
  }

  /**
   * Write a message `output()` let through:  `prefix` in its colour, then `args`, through `console`.
   * - A subclass changes how its lines look here (the page server's `SRV.ServerLog`).
   */
  protected write(_level: DebugLevel, consoleMethod: ConsoleMethod, args: any[]) {
    if (this.prefix) args.unshift(chalk.hex(this.color)(this.prefix))
    console[consoleMethod](...args)
  }

  /**
   * The level `setting` gives the logger named `name`, or `undefined` when it doesn't name it.
   * - `setting`:  `SPELL_DEBUG`'s format (WWOD §19), comma-separated names, each with an optional level:
   *   `tokenizer,server:INFO`;  a bare name means `DEBUG`
   * - a name covers its own children:  `server` names `server:bundles` too;  `*` names every logger
   * - the most specific wins:  `server:INFO,server:bundles` is `DEBUG` for `server:bundles`
   * - Browser-safe:  it takes the setting as text;  a node package reads the variable itself
   */
  static levelIn(setting: string | undefined, name: string): DebugLevel | undefined {
    let found: { level: DebugLevel; length: number } | undefined
    for (const entry of commaList(setting)) {
      const colon = entry.lastIndexOf(":")
      const named = entry.slice(colon + 1).toUpperCase() as DebugLevel
      const hasLevel = colon > 0 && DEBUG_LEVELS.includes(named)
      const entryName = hasLevel ? entry.slice(0, colon) : entry
      const covers = entryName === "*" || entryName === name || name.startsWith(`${entryName}:`)
      const length = entryName === "*" ? 0 : entryName.length
      if (covers && (!found || length >= found.length)) found = { level: hasLevel ? named : Logger.DEBUG, length }
    }
    return found?.level
  }

  /** No output at all. */
  static readonly OFF = "OFF" as unknown as DebugLevel
  /** Errors only. */
  static readonly ERROR = "ERROR" as unknown as DebugLevel
  /** Errors and warnings. */
  static readonly WARN = "WARN" as unknown as DebugLevel
  /** Errors, warnings, and info. */
  static readonly INFO = "INFO" as unknown as DebugLevel
  /** Everything, including debug messages. */
  static readonly DEBUG = "DEBUG" as unknown as DebugLevel
}
