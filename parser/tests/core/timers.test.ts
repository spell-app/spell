import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { core, Thing } from "spell/parser/core"

/**
 * Timers (`timers.ts`, epic `language` T159):  a thing's steps run every so often while its program runs,
 * written the way compiled spell writes `every second` -- a method, then `core.addTimer()` after the class.
 */

/** `a clock is a thing`, its ticks counted, `every second` adding one;  `turn` an undoable action. */
class Clock extends Thing {
  static {
    this.declareProp("ticks", { type: "number" })
    this.declareProp("end", { type: "date" })
  }
  get ticks(): number {
    return this.getProp("ticks") ?? 0
  }
  set ticks(ticks: number) {
    this.setProp("ticks", ticks)
  }
  get end(): Date | undefined {
    return this.getProp("end")
  }
  set end(end: Date | undefined) {
    this.setProp("end", end)
  }

  everySecond(): void {
    this.ticks = this.ticks + 1
  }

  turn(): void {
    this.ticks = this.ticks + 10
  }

  get everySecondUntil(): Date | undefined {
    return this.end
  }
}
core.describeAction(Clock, "turn", { title: "Turn", undoneAs: "Turn" })

/** A clock running `every second`, with `options`:  a new class each, so their timers don't mix. */
function clockClass(description: { until?: string; times?: number } = {}): typeof Clock {
  const Timed = class extends Clock {}
  core.addTimer(Timed, "everySecond", { seconds: 1, ...description })
  return Timed
}

/** Let what the code just made start its timers. */
const settle = () => Promise.resolve()

describe("timers", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    core.resetRuntime()
  })
  afterEach(() => {
    core.clearRuntime()
    vi.useRealTimers()
  })

  test("a thing runs its timer's steps every second, once made", async () => {
    const clock = new (clockClass())()
    await settle()
    expect(clock.ticks).toBe(0)
    await vi.advanceTimersByTimeAsync(3000)
    expect(clock.ticks).toBe(3)
  })

  test("made before its timer's described, as a one of a kind is:  it runs all the same", async () => {
    const Timed = class extends Clock {}
    const clock = new Timed()
    core.addTimer(Timed, "everySecond", { seconds: 1 })
    await vi.advanceTimersByTimeAsync(2000)
    expect(clock.ticks).toBe(2)
  })

  test("a sub-type's things run it too", async () => {
    const Timed = clockClass()
    const clock = new (class extends Timed {})()
    await vi.advanceTimersByTimeAsync(2000)
    expect(clock.ticks).toBe(2)
  })

  test("`times` stops it after that many runs", async () => {
    const clock = new (clockClass({ times: 3 }))()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(clock.ticks).toBe(3)
    expect(core.RUNTIME.timers.size).toBe(0)
  })

  test("`until` stops it once its moment has come, read before each run", async () => {
    const clock = new (clockClass({ until: "everySecondUntil" }))()
    clock.end = new Date(Date.now() + 2500)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(clock.ticks).toBe(2)
    expect(core.RUNTIME.timers.size).toBe(0)
  })

  test("`until` with no moment yet goes on", async () => {
    const clock = new (clockClass({ until: "everySecondUntil" }))()
    await vi.advanceTimersByTimeAsync(3000)
    expect(clock.ticks).toBe(3)
  })

  test("a run adds no undo step, nor does an action it calls", async () => {
    const Timed = class extends Clock {
      everySecond(): void {
        this.turn()
      }
    }
    core.addTimer(Timed, "everySecond", { seconds: 1 })
    const clock = new Timed()
    await vi.advanceTimersByTimeAsync(2000)
    expect(clock.ticks).toBe(20)
    expect(core.RUNTIME.history.steps).toHaveLength(0)
    // a person's action still is one
    clock.turn()
    expect(core.RUNTIME.history.steps.map((step) => step.title)).toEqual(["Turn"])
  })

  test("the program starting again stops it (`resetRuntime()`), as its ending does (`clearRuntime()`)", async () => {
    const clock = new (clockClass())()
    await vi.advanceTimersByTimeAsync(1000)
    const runtime = core.RUNTIME
    expect(runtime.timers.size).toBe(1)
    core.resetRuntime()
    expect(runtime.timers.size).toBe(0)
    await vi.advanceTimersByTimeAsync(3000)
    expect(clock.ticks).toBe(1)

    const other = new (clockClass())()
    await settle()
    core.clearRuntime()
    await vi.advanceTimersByTimeAsync(3000)
    expect(other.ticks).toBe(0)
    core.resetRuntime()
  })

  test("a copy starts no timer of its own", async () => {
    const clock = new (clockClass())()
    const copy = core.newThingLike(clock)
    await vi.advanceTimersByTimeAsync(2000)
    expect([clock.ticks, (copy as Clock).ticks]).toEqual([2, 0])
  })

  test("a run that fails is said on the console, and the next runs all the same", async () => {
    const Timed = class extends Clock {
      everySecond(): void {
        this.ticks = this.ticks + 1
        throw new Error("broken")
      }
    }
    core.addTimer(Timed, "everySecond", { seconds: 1 })
    const clock = new Timed()
    const error = vi.spyOn(core.console, "error").mockImplementation(() => {})
    await vi.advanceTimersByTimeAsync(2000)
    expect(clock.ticks).toBe(2)
    expect(error).toHaveBeenCalledTimes(2)
  })

  test("`core.every()` runs any steps;  what it returns stops them;  nothing runs with no program", async () => {
    let runs = 0
    const stop = core.every(0.5, () => runs++)
    await vi.advanceTimersByTimeAsync(1000)
    stop()
    await vi.advanceTimersByTimeAsync(1000)
    expect(runs).toBe(2)
    core.clearRuntime()
    core.every(0.5, () => runs++)
    await vi.advanceTimersByTimeAsync(1000)
    expect(runs).toBe(2)
    core.resetRuntime()
  })
})
