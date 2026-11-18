import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { core } from "spell/parser/core"
import { P } from "spell/parser/parser"
import { PY } from "spell/parser/py"
import { parseSpellProject, runSpell } from "spell/parser/spell/test"

/**
 * `every_timer` (epic `language` T159):  `every second` in a thing's or an app's outline, its steps under it,
 * run while the program runs, adding no undo step;  `until <time>` or `<number> times` stops it.
 */

/** `lines`, one file at `path`:  its match, errors and javascript. */
function parsed(lines: string[], path = "/Countdown.spell") {
  return parseSpellProject([{ path, contents: lines.join("\n") }]).files[0]!
}

/** Owen's example, the Weekend Countdown's clock. */
const COUNTDOWN = ["weekend countdown is an app", '\tits "time" is a date', "\tevery second", "\t\tset its time to now"]

describe("every_timer:  compiled", () => {
  test("javascript:  a method of the app, then `core.addTimer()` after its class", () => {
    const file = parsed(COUNTDOWN)
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain(["  everySecond() {", "    this.time = core.now()", "  }"].join("\n"))
    expect(file.compiled).toContain('core.addTimer(WeekendCountdown, "everySecond", { seconds: 1 })')
  })

  test("TypeScript:  the same", () => {
    const ts = String(P.TSWriter.instance.writeMatch(parsed(COUNTDOWN).match!))
    expect(ts).toContain("  everySecond() {")
    expect(ts).toContain('core.addTimer(WeekendCountdown, "everySecond", { seconds: 1 })')
  })

  test("Python:  by Python's names", () => {
    const python = String(PY.PyWriter.instance.writeMatch(parsed(COUNTDOWN).match!))
    expect(python).toContain(["    def every_second(self) -> None:", "        self.time = core.now()"].join("\n"))
    expect(python).toContain('core.add_timer(WeekendCountdown, "every_second", {"seconds": 1})')
  })

  test("a Python program's page runs no timer of its own:  Python does", () => {
    const page = String(PY.ElementsWriter.instance.writeMatch(parsed(COUNTDOWN).match!))
    expect(page).not.toContain("addTimer")
  })

  test("how often:  a measure, or a unit alone;  `until` a getter, `times` a number", () => {
    const file = parsed([
      "a clock is a thing",
      '\tits "end" is a date',
      '\tits "count" is a number',
      "\tevery 2 seconds until its end",
      "\t\tset its count to its count + 1",
      "\tevery 5 minutes 10 times:",
      "\t\tset its count to 0",
      "\tevery 1 minute 30 seconds",
      "\t\tset its count to 0",
      "\tevery second 3 times",
      "\t\tset its count to 0"
    ])
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain(["  get every2SecondsUntil() {", "    return this.end", "  }"].join("\n"))
    expect(file.compiled).toContain(
      'core.addTimer(Clock, "every2Seconds", { seconds: 2, until: "every2SecondsUntil" })'
    )
    expect(file.compiled).toContain('core.addTimer(Clock, "every5Minutes10Times", { seconds: 300, times: 10 })')
    expect(file.compiled).toContain('core.addTimer(Clock, "every90Seconds", { seconds: 90 })')
    expect(file.compiled).toContain('core.addTimer(Clock, "everySecond3Times", { seconds: 1, times: 3 })')
  })

  test("Spanish:  `cada segundo`, `hasta`, `veces`, compiled as English is", () => {
    const file = parsed(
      [
        "cuenta atrás es una aplicación",
        '\tsu "hora" es una fecha',
        '\tsu "fin" es una fecha',
        "\tcada segundo",
        "\t\tponer su hora a ahora",
        "\tcada 5 minutos hasta su fin",
        "\t\tponer su hora a ahora",
        "\tcada segundo 10 veces",
        "\t\tponer su hora a ahora"
      ],
      "/Cuenta.es.spell"
    )
    expect(file.errors).toEqual([])
    expect(file.compiled).toContain(["  everySecond() {", "    this.hora = core.now()", "  }"].join("\n"))
    expect(file.compiled).toContain('core.addTimer(CuentaAtrás, "everySecond", { seconds: 1 })')
    expect(file.compiled).toContain(
      'core.addTimer(CuentaAtrás, "every5Minutes", { seconds: 300, until: "every5MinutesUntil" })'
    )
    expect(file.compiled).toContain('core.addTimer(CuentaAtrás, "everySecond10Times", { seconds: 1, times: 10 })')
  })

  test("refused:  what isn't a duration;  outside a type's outline it isn't this rule", () => {
    const file = parsed(["a clock is a thing", "\tevery 2 cm", "\t\tprint 1", "every second", "\tprint 1"])
    expect(file.errors).toEqual([
      `2:1 "2 cm" isn't a duration:  say how long, as in "300 msec" or "5 minutes"`,
      `4:0 Don't understand "every second"`
    ])
  })
})

describe("every_timer:  run", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    core.resetRuntime()
  })
  afterEach(() => {
    core.clearRuntime()
    vi.useRealTimers()
  })

  /** A counter app ticking `every second`, with `limit` after it, and an undoable action `bump`. */
  const counter = (limit = "") => [
    "counter is an app",
    '\tits "count" is a number',
    '\tits "end" is a date',
    `\tevery second${limit}`,
    "\t\tbump it",
    "\tto bump it",
    "\t\tset its count to its count + 1"
  ]

  test("its steps run every second, adding no undo step, nor does the action they call", async () => {
    const { counter: app } = runSpell(counter())("counter") as { counter: { count: number } }
    await vi.advanceTimersByTimeAsync(3000)
    expect(app.count).toBe(3)
    expect(core.RUNTIME.history.steps).toHaveLength(0)
  })

  test("`10 times`:  then it stops", async () => {
    const { counter: app } = runSpell(counter(" 2 times"))("counter") as { counter: { count: number } }
    await vi.advanceTimersByTimeAsync(5000)
    expect(app.count).toBe(2)
  })

  test("`until its end`:  it stops once that moment has come", async () => {
    const { counter: app } = runSpell(counter(" until its end"))("counter") as { counter: { count: number; end: Date } }
    app.end = new Date(Date.now() + 2500)
    await vi.advanceTimersByTimeAsync(5000)
    expect(app.count).toBe(2)
  })

  test("the program starting again stops it (`resetRuntime()`)", async () => {
    const { counter: app } = runSpell(counter())("counter") as { counter: { count: number } }
    await vi.advanceTimersByTimeAsync(1000)
    core.resetRuntime()
    await vi.advanceTimersByTimeAsync(3000)
    expect(app.count).toBe(1)
  })
})
