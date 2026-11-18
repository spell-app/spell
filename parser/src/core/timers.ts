/**
 * TIMERS:  steps a thing runs again and again while its program runs, `every second` in its type's outline
 * (epic `language` T159).
 * - e.g. a countdown's clock:
 *
 *   ```spell
 *   weekend countdown is an app
 *   	its "time" is a date
 *   	every second
 *   		set its time to now
 *   ```
 *
 * - Compiled spell describes each timer after its class, the steps a method of their own:
 *   `core.addTimer(WeekendCountdown, "everySecond", { seconds: 1 })`.
 *   - `until`:  a getter giving the moment it stops, read again before each run (`every second until its end`)
 *   - `times`:  how many runs, then it stops (`every second 10 times`)
 * - Each thing of the class gets its own timers, started once it's made (`onMade()`), after the code making it:
 *   so the one of a kind made before its timers are described (`weekendCountdown = new WeekendCountdown()`) has them too.
 *   A copy (`withoutCreate()`) gets none.
 * - `core.every()` starts one, for any steps:  what each of a thing's timers is.
 * - Each run:
 *   - adds no undo step, as an action described `can't be undone` (`UndoHistory.run()`):  nor does an action it calls
 *   - waits for the last to end, if it waits:  a slow one skips a beat rather than piling up
 *   - says a failure on the program's console (`core.meanwhile()`), and carries on
 * - Every timer belongs to the run it started in (`core.RUNTIME.timers`):  it stops when the program ends or starts
 *   again (`resetRuntime()`, `clearRuntime()`).
 *   - It never keeps node running by itself (`inBackground`):  `spell run` ends when its program does.
 * - Part of `core`:  imported by `spell/parser/core`'s barrel for its side effect.
 *   Python's twin is `spell_core.timers`.
 */
import { isMakingCopy } from "spell/util"
import { afterSolidUpdate, every as everySeconds } from "spell/util/timing"

import { core, onMade } from "./core"
import { defineCoreModule } from "./core.types"

/**
 * One timer a type's things have, as compiled spell describes it:  `{ seconds: 1, until: "everySecondUntil" }`.
 * - `seconds`:  how long between runs
 * - `until`:  the getter giving the moment it stops, if it says one
 * - `times`:  how many runs, if it says
 */
export type TimerDescription = { seconds: number; until?: string; times?: number }

/**
 * What `core.every()` takes after its steps.
 * - `until`:  the moment it stops, read again before each run:  a date, or a time in msec;  nothing yet goes on
 * - `times`:  how many runs, then it stops
 */
export type TimerOptions = { until?: () => unknown; times?: number }

/** Each class's timers, by the method each runs:  `addTimer()`'s. */
const TIMERS = new Map<Function, Array<TimerDescription & { method: string }>>()

/** The things made since the last start:  `startTimersOfMade()` gives each its timers. */
let madeSince: object[] = []

export const timerMethods = defineCoreModule({
  /**
   * Each thing of `type` runs its method `method` every `description.seconds`, from when it's made until its program
   * ends:  what `every second` in a type's outline compiles to, after its class.
   * - `core.addTimer(WeekendCountdown, "everySecond", { seconds: 1, until: "everySecondUntil", times: 10 })`
   * - A sub-type's things have it too.
   * - See the file's header.
   */
  addTimer(type: Function, method: string, description: TimerDescription): void {
    const timers = TIMERS.get(type) ?? []
    TIMERS.set(type, [...timers.filter((timer) => timer.method !== method), { ...description, method }])
  },

  /**
   * Run `run` every `seconds` while the program runs:  a thing's timer, `every second`.
   * - The first run is `seconds` from now.
   * - Stops:
   *   - once `until()` gives a moment that's come, read before each run
   *   - after `times` runs
   *   - when the program ends or starts again (`resetRuntime()`, `clearRuntime()`)
   * - Each run adds no undo step;  one still running when the next is due skips it.
   * - Returns what stops it.  No program running:  nothing starts.
   */
  every(seconds: number, run: () => unknown, { until, times }: TimerOptions = {}): () => void {
    const runtime = core.RUNTIME
    if (!runtime) return () => {}
    let runs = 0
    let isRunning = false
    const tick = () => {
      if (isRunning) return
      if (core.RUNTIME !== runtime || hasCome(until?.()) || (times !== undefined && runs >= times)) return stop()
      runs++
      isRunning = true
      const unrecorded = () => runtime.history.run({ cantBeUndone: "keeps history" }, run)
      void core.meanwhile(unrecorded).then(() => {
        isRunning = false
        if (times !== undefined && runs >= times) stop()
      })
    }
    const stopTicking = everySeconds(seconds, tick, { inBackground: true })
    const stop = () => {
      stopTicking()
      runtime.timers.delete(stop)
    }
    runtime.timers.add(stop)
    return stop
  }
})
Object.assign(core, timerMethods)

/** Has `moment`, a date or a time in msec, come?  Nothing is never. */
function hasCome(moment: unknown): boolean {
  if (moment instanceof Date) return Date.now() >= moment.getTime()
  return typeof moment === "number" && Date.now() >= moment
}

/** `thing`'s class's timers, and its super-classes', nearest first. */
function timersOf(thing: object): Array<TimerDescription & { method: string }> {
  const timers: Array<TimerDescription & { method: string }> = []
  for (let type = thing.constructor; type && type !== Object; type = Object.getPrototypeOf(type)) {
    timers.push(...(TIMERS.get(type) ?? []))
  }
  return timers
}

/** SIDE EFFECT:  each thing made since the last time starts its timers -- see `onMade()` below. */
function startTimersOfMade(): void {
  const made = madeSince
  madeSince = []
  if (!TIMERS.size) return
  for (const thing of made) {
    for (const { method, seconds, until, times } of timersOf(thing)) {
      const named = thing as Record<string, unknown>
      const run = () => (named[method] as () => unknown).call(thing)
      core.every(seconds, run, { until: until ? () => named[until] : undefined, times })
    }
  }
}

// a thing made gets its timers once the code making it has run:  its class's are described after it
onMade((thing) => {
  if (isMakingCopy()) return
  if (!madeSince.length) afterSolidUpdate(startTimersOfMade)
  madeSince.push(thing)
})
