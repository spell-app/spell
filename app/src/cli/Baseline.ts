import { existsSync, readFileSync, writeFileSync } from "node:fs"

import { CliError } from "spell/cli"

/**
 * A command's saved numbers to compare with later, ONE committed JSON file:  the speed test's
 * (`speedBaseline.json`) and `spell perf`'s (`perfBaseline.json`).
 * - `save()` writes this checkout's commit and when, beside the numbers;  `saved` reads them back.
 * - `compare()` puts numbers now beside numbers then, each with its change, and says which got WORSE.
 * - Lifted out of `spell speedtest` (epic `solid-2-final` P1), so the speed test and `spell perf` compare one way.
 * - Its position:  node's own modules and the kit's `spell/cli` only, so a command that loads no spell can use it.
 */
export class Baseline<T extends object> {
  /** the JSON file, absolute */
  readonly file: string

  /** the command that saves it, for the error when there's none:  `spell speedtest --baseline save` */
  readonly saveCommand: string

  constructor(file: string, saveCommand: string) {
    this.file = file
    this.saveCommand = saveCommand
  }

  /** what was saved, with its commit and when;  `undefined` when nothing was */
  get saved(): (T & BaselineStamp) | undefined {
    if (!existsSync(this.file)) return undefined
    return JSON.parse(readFileSync(this.file, "utf8")) as T & BaselineStamp
  }

  /** what was saved;  throws `CliError` naming the command that saves it when nothing was */
  savedOrDie(): T & BaselineStamp {
    const saved = this.saved
    if (!saved) throw new CliError(`no saved baseline:  run ${this.saveCommand} first`)
    return saved
  }

  /**
   * SIDE EFFECT:  save `numbers` as the baseline, stamped with `commit` and the time.
   * - `merge`:  keep what the file holds besides (`spell speedtest --pipeline` saves its part of `spell perf`'s)
   */
  save(numbers: T, commit: string, { merge = false } = {}): T & BaselineStamp {
    const kept = merge ? (this.saved ?? {}) : {}
    const saved = { ...kept, commit, saved: new Date().toISOString(), ...numbers } as T & BaselineStamp
    writeFileSync(this.file, `${JSON.stringify(saved, null, 2)}\n`)
    return saved
  }

  /**
   * Each number of `now` beside `was`'s, with its change, in `now`'s order;  one `was` hasn't is `added`.
   * - WORSE:  higher by more than `worse` percent (default 10);  lower, for a number `higherIsBetter` matches
   * - `neutral`:  numbers that are counts or settings, not costs:  shown, never worse
   */
  static compare(
    now: Record<string, number>,
    was: Record<string, number> | undefined,
    { worse = WORSE_PERCENT, higherIsBetter, neutral }: CompareProps = {}
  ): Comparison[] {
    return Object.entries(now).map(([name, value]) => {
      const before = was?.[name]
      if (before === undefined) return { name, now: value, added: true, isWorse: false }
      const change = Baseline.change(value, before)
      const isCost = !neutral?.test(name)
      const isWorse = isCost && (higherIsBetter?.test(name) ? change < -worse : change > worse)
      return { name, now: value, was: before, change, isWorse }
    })
  }

  /**
   * `(now - was) / was`, as a whole percent;  0 when both are 0.
   * - `was` 0 and `now` not:  `Infinity`, shown as new
   */
  static change(now: number, was: number): number {
    if (!was) return now ? Infinity : 0
    return Math.round(((now - was) / Math.abs(was)) * 100)
  }

  /** A percent with its sign:  `+5%`, `-3%`, `0%`;  an infinite one, `new`. */
  static signed(percent: number): string {
    if (!Number.isFinite(percent)) return "new"
    return `${percent > 0 ? "+" : ""}${percent}%`
  }
}

/** How much higher a cost may get before it's WORSE, in percent. */
const WORSE_PERCENT = 10

/** What every saved baseline holds beside its numbers. */
export type BaselineStamp = {
  /** the commit it was saved at */
  commit: string
  /** when, an ISO time */
  saved: string
}

/** How `Baseline.compare()` reads its numbers. */
export type CompareProps = {
  /** a cost higher by more than this percent is worse, default 10 */
  worse?: number
  /** the numbers where higher is better (a count of what's done right) */
  higherIsBetter?: RegExp
  /** the numbers that are counts or settings:  never worse */
  neutral?: RegExp
}

/**
 * One number now beside then (`Baseline.compare()`).
 * - `change`:  a whole percent, `Baseline.change()`'s
 * - `added`:  then had no such number
 */
export type Comparison = {
  name: string
  now: number
  was?: number
  change?: number
  added?: boolean
  isWorse: boolean
}
