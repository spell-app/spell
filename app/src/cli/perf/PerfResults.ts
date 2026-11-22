import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { Baseline, type Comparison } from "spell/app/cli/Baseline"
import type { PerfBaselineNumbers, PerfRecord } from "./perf.types"
import type { LoadResult } from "./LoadMeasure"
import type { LeaksResult } from "./LeaksMeasure"
import type { TypingResult } from "./TypingMeasure"
import type { A11yResult } from "./A11yMeasure"
import type { ListenersResult } from "./ListenersMeasure"
import type { SheetsResult } from "./SheetsMeasure"
import type { CpuResult } from "./CpuMeasure"

/**
 * Where `spell perf run` keeps what it measured, and how `spell perf report` compares it.
 * - Each run:  a dated file, `<YYYY-MM-DD-HHMM>.json`, in the kit's git-ignored `.perf-results/`.
 * - The baseline:  ONE committed file, `perfBaseline.json` beside this, written by `spell perf run --baseline save`;
 *   each later phase saves it again once its gain is in.
 * - The report:  every number now beside the last run's AND the baseline's, "WORSE" past 10% (`Baseline.compare()`).
 */
export class PerfResults {
  /** the folder of dated runs:  `.perf-results/` at the kit's root */
  readonly folder: string

  constructor(kitRoot: string) {
    this.folder = join(kitRoot, RESULTS_FOLDER)
  }

  /** the saved baseline */
  static readonly baseline = new Baseline<PerfBaselineNumbers>(
    join(import.meta.dirname, "perfBaseline.json"),
    "spell perf run --baseline save"
  )

  /** every dated run's file, oldest first */
  get files(): string[] {
    if (!existsSync(this.folder)) return []
    return readdirSync(this.folder)
      .filter((file) => DATED.test(file))
      .sort()
      .map((file) => join(this.folder, file))
  }

  /** the newest run, or the newest before `file`;  `undefined` when there's none */
  latest(before?: string): PerfRecord | undefined {
    const files = this.files.filter((file) => !before || file < before)
    const file = files.at(-1)
    return file ? (JSON.parse(readFileSync(file, "utf8")) as PerfRecord) : undefined
  }

  /** SIDE EFFECT:  write `record` as its dated file (or `out`);  returns the file. */
  write(record: PerfRecord, out?: string): string {
    mkdirSync(this.folder, { recursive: true })
    const file = out ?? join(this.folder, `${datedName(new Date(record.when))}.json`)
    writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`)
    return file
  }

  /**
   * The report's lines:  each number of `now` beside the last run's (`last`) and the baseline's, with each change.
   * - "WORSE" past 10% higher (lower, for the counts of what's done right);  counts and settings are never worse
   * - a busy machine on either side is said:  its times are noisy, its bytes and counts aren't
   */
  static report(now: PerfRecord, last: PerfRecord | undefined, baseline: PerfBaselineNumbers | undefined): string[] {
    const sinceLast = Baseline.compare(now.numbers, last?.numbers, COMPARE)
    const sinceBaseline = Baseline.compare(now.numbers, baseline?.numbers, COMPARE)
    const lines = [
      `This run:  ${now.when}${now.busyMachine ? "   BUSY MACHINE:  times are noisy, bytes and counts aren't" : ""}`,
      `Last run:  ${last ? `${last.when}${last.busyMachine ? "  (busy)" : ""}` : "none"};  ` +
        `baseline:  ${baseline?.when ?? "none saved"}`,
      "",
      `${"number".padEnd(NAME_WIDTH)}${"baseline".padStart(12)}${"last".padStart(12)}${"now".padStart(12)}` +
        `${"vs last".padStart(9)}${"vs base".padStart(9)}`
    ]
    let worse = 0
    sinceLast.forEach((row, index) => {
      const base = sinceBaseline[index]!
      const isWorse = row.isWorse || base.isWorse
      if (isWorse) worse++
      lines.push(
        `${row.name.slice(0, NAME_WIDTH - 1).padEnd(NAME_WIDTH)}${shown(base.was).padStart(12)}` +
          `${shown(row.was).padStart(12)}${shown(row.now).padStart(12)}${changeOf(row).padStart(9)}` +
          `${changeOf(base).padStart(9)}${isWorse ? "  WORSE" : ""}`
      )
    })
    lines.push("", `${worse} number(s) worse by more than 10%`)
    return lines
  }

  /** Every number worth comparing, as `<step> <page>/<profile> <metric>`, flat. */
  static numbersOf(data: PerfRecord["data"]): Record<string, number> {
    const out: Record<string, number> = {}
    const keep = (key: string, value: unknown) => {
      if (typeof value === "number" && Number.isFinite(value)) out[key] = +value.toFixed(1)
    }
    for (const [target, load] of Object.entries(data.load ?? {}) as Array<[string, LoadResult]>) {
      for (const [metric, value] of Object.entries(load.median)) keep(`load ${target} ${metric}`, value)
      for (const [metric, value] of Object.entries(load.bytes)) keep(`load ${target} ${metric}`, value)
      keep(`load ${target} elements`, load.census.elements)
      keep(`load ${target} shadowRoots`, load.census.shadowRoots)
      keep(`load ${target} uniqueAdoptedSheets`, load.census.uniqueAdopted)
      keep(`load ${target} errors`, load.errors)
      keep(`load ${target} liveMessages`, load.liveMessages)
    }
    for (const [target, leaks] of Object.entries(data.leaks ?? {}) as Array<[string, LeaksResult]>) {
      for (const loop of leaks.results) {
        keep(`leaks ${target} ${loop.name} heapPerCycle`, loop.heapPerCycle)
        keep(`leaks ${target} ${loop.name} nodesPerCycle`, loop.nodesPerCycle)
        keep(`leaks ${target} ${loop.name} listenersPerCycle`, loop.listenersPerCycle)
      }
    }
    for (const [profile, typing] of Object.entries(data.typing ?? {}) as Array<[string, TypingResult]>) {
      for (const [metric, value] of Object.entries(typing.eventTiming))
        keep(`typing ${profile} eventTiming.${metric}`, value)
      for (const [metric, value] of Object.entries(typing.frame)) keep(`typing ${profile} frame.${metric}`, value)
      keep(`typing ${profile} heapPerKey`, typing.heapPerKey)
    }
    for (const [target, a11y] of Object.entries(data.a11y ?? {}) as Array<[string, A11yResult]>) {
      keep(`a11y ${target} violationRules`, a11y.axe?.length)
      keep(
        `a11y ${target} violationNodes`,
        a11y.axe?.reduce((total, rule) => total + rule.count, 0)
      )
      keep(`a11y ${target} tabsVisiblyMarked`, a11y.tabs?.visiblyMarked)
      keep(`a11y ${target} animationsWithReduce`, a11y.motionReduce?.withDuration)
    }
    for (const [target, listeners] of Object.entries(data.listeners ?? {}) as Array<[string, ListenersResult]>)
      keep(`listeners ${target} total`, listeners.total)
    for (const [target, sheets] of Object.entries(data.sheets ?? {}) as Array<[string, SheetsResult]>)
      keep(`sheets ${target} adoptedCharsPerRoot`, sheets.adoptedCharsPerRoot)
    for (const [profile, cpu] of Object.entries(data.cpu ?? {}) as Array<[string, CpuResult]>) {
      keep(`cpu ${profile} loadSampledMs`, cpu.load.totalMs)
      keep(`cpu ${profile} typingSampledMs`, cpu.typing?.totalMs)
    }
    const pipeline = (data.pipeline?.Solitaire ?? {}) as { median?: Record<string, unknown> }
    for (const [metric, value] of Object.entries(pipeline.median ?? {})) keep(`pipeline Solitaire ${metric}`, value)
    return out
  }
}

/** The folder of dated runs, at the kit's root (git-ignored). */
export const RESULTS_FOLDER = ".perf-results"

/** A dated run's file name. */
const DATED = /^\d{4}-\d{2}-\d{2}-\d{4}\.json$/

/** How wide the report's first column is. */
const NAME_WIDTH = 70

/**
 * How the report reads its numbers:  the counts of what's done right are better higher;
 * counts and settings (runs, elements, interactions, samples, live messages, requests) are never worse
 */
const COMPARE = {
  higherIsBetter: /tabsVisiblyMarked/,
  neutral: /runs|customElements|elements|interactions|samples|liveMessages|requests|shadowRoots/
}

/** `when` as a dated run's name:  `2026-11-21-2130`. */
export function datedName(when: Date): string {
  const pad = (number: number) => String(number).padStart(2, "0")
  return (
    `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}-` +
    `${pad(when.getHours())}${pad(when.getMinutes())}`
  )
}

/** A number for the report, or `-` for none. */
function shown(value: number | undefined): string {
  return value === undefined ? "-" : String(value)
}

/** A comparison's change, or nothing when there was nothing to compare with. */
function changeOf(row: Comparison): string {
  return row.change === undefined ? "" : Baseline.signed(row.change)
}
