import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { CalendarSettings } from "spell/util/measures/CalendarSettings"
import { core } from "spell/parser/core"
import { spanishMessages } from "spell/parser/spell/languages/es/messages"
import { parseSpellProject, runSpell, runSpellFiles } from "spell/parser/spell/test"

/**
 * Dates said as HyperTalk says them (epic `data`):  `the date`, `the long time`, `now`,
 * a date's own `short date`, and joining into text with `&` and `&&`.
 * - And the date and time words (epic `language` P63):  a date's parts and names, two digits, AM / PM, the time zone,
 *   how long ago, working with dates, and Weekend Countdown, mockup's example, run.
 * - Each test runs on Tuesday, November 17, 2026, 9:05:07 PM, its person in the US.
 */

/** `expression`, compiled and run:  what it gives. */
function valueOf(expression: string, before: string[] = []): unknown {
  return runSpell([...before, `set answer to ${expression}`])("answer").answer
}

/** `expression` in Spanish, compiled and run in a Spanish program:  what it gives. */
function valorDe(expression: string): unknown {
  core.useMessages(spanishMessages)
  return runSpellFiles([{ path: "/Prueba.es.spell", contents: `poner respuesta a ${expression}` }])("respuesta")
    .respuesta
}

/** `lines` compiled:  their javascript and errors. */
function compiled(lines: string[], path = "/Test.spell") {
  const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
  return { js: `${file!.compiled}`, errors: file!.errors.map((error) => `${error}`) }
}

const NOTE = ["a note is a thing:", "\t- it has a due as date", "the note is a new note"]

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(2026, 10, 17, 21, 5, 7))
  CalendarSettings.use({ region: "US" })
})

afterEach(() => {
  vi.useRealTimers()
  CalendarSettings.use({})
  core.useMessages(undefined)
})

describe("dates as HyperTalk says them", () => {
  test("`the date` and `the time` are today's, as text;  `now` is the date itself", () => {
    expect(valueOf("the date")).toBe("11/17")
    expect(valueOf("the long time")).toBe("9:05:07 PM")
    expect(valueOf("now")).toBeInstanceOf(Date)
    expect(valueOf("the year of now")).toBe(2026)
  })

  test("`&` joins as they are, `&&` with a space, a date said in words", () => {
    const due = ["set the due of the note to now"]
    expect(valueOf('"a" & 1 & 2', NOTE)).toBe("a12")
    expect(valueOf('"due" && the due of the note', [...NOTE, ...due])).toBe("due November 17, 2026")
    expect(valueOf('"due" && the short date of the due of the note', [...NOTE, ...due])).toBe("due 11/17")
    expect(valueOf('"at " + the due of the note', [...NOTE, ...due])).toBe("at November 17, 2026")
  })

  test("`as a short date`, and the rest of HyperTalk's ways, and a timestamp", () => {
    const due = [...NOTE, "set the due of the note to now"]
    expect(valueOf("the time as a short date", ["set the time to now"])).toBe("11/17")
    expect(valueOf("the due of the note as a long time", due)).toBe("9:05:07 PM")
    expect(valueOf("the due of the note as a timestamp", due)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(valueOf("the timestamp of the due of the note", due)).toMatch(/Z$/)
    expect(valueOf("the timestamp")).toMatch(/Z$/)
  })

  test("`dates are shown as short dates` changes how every date draws and joins, from then on", () => {
    const due = [...NOTE, "set the due of the note to now", "dates are shown as short dates"]
    try {
      expect(valueOf('"due" && the due of the note', due)).toBe("due 11/17")
      expect(valueOf("the due of the note as a long date", due)).toBe("Tuesday, November 17, 2026")
    } finally {
      runSpell(["dates are shown as plain dates"])
    }
  })

  test("a program's own `time` wins over today's", () => {
    expect(valueOf("the time", ['set the time to "tea"'])).toBe("tea")
  })
})

describe("the person's region and clock (epic `language` P63)", () => {
  test("Spain's order of day and month, and its 24-hour clock", () => {
    CalendarSettings.use({ region: "ES" })
    expect([valueOf("the short date of (now - 400 days)"), valueOf("the time")]).toEqual(["13/10/25", "21:05"])
  })

  test("a US person who uses a 24-hour clock;  `the hour of` is 0 to 23 for everyone", () => {
    CalendarSettings.use({ region: "US", clock: "24" })
    expect([valueOf("the time"), valueOf("the hour of now")]).toEqual(["21:05", 21])
  })
})

describe("a date's parts and names (epic `language` P63)", () => {
  test.each([
    ["the short year of now", 26],
    ["the month of now", "November"],
    ["the short month of now", "Nov"],
    ["the month number of now", 11],
    ["the minute of now", 5],
    ["the minutes of now", 5],
    ["the second of now", 7],
    ["the seconds of now", 7],
    ["the week of now", 47],
    ["the weekday of now", "Tuesday"],
    ["the day of the week of now", "Tuesday"],
    ["the short weekday of now", "Tue"],
    ["the short day of the week of now", "Tue"],
    ["the weekday number of now", 3],
    ["the day of the week number of now", 3],
    ["the weekday of now as a number", 3],
    ["the AM or PM of now", "PM"],
    ["the AMPM of now", "PM"],
    ["the meridiem of now", "PM"],
    ["the Meridian of now", "PM"],
    ["the minute of now as two digits", "05"],
    ["the second of now with a leading zero", "07"],
    ["the hour of now as two digits", "21"]
  ])("%s => %j", (expression, expected) => {
    expect(valueOf(expression)).toBe(expected)
  })

  test("the weekday number counts from the person's first day of the week:  Monday in Spain", () => {
    CalendarSettings.use({ region: "ES" })
    expect(valueOf("the weekday number of now")).toBe(2)
  })

  test("`is AM`, `is PM`, any case", () => {
    expect([valueOf("now is PM"), valueOf("now is am"), valueOf("now is not pm")]).toEqual([true, false, false])
  })

  test("the time zone, three ways", () => {
    expect(valueOf("the time zone")).toBe(core.timeZone("city"))
    expect(valueOf("the short time zone")).toBe(core.timeZone("short"))
    expect(valueOf("the long time zone")).toBe(core.timeZone("long"))
  })

  test("`the second of` a list is still its 2nd item", () => {
    expect(valueOf("the second of [1, 2, 3]")).toBe(2)
  })
})

describe("how long ago, and working with dates (epic `language` P63)", () => {
  test.each([
    ["now + 1 day as a duration", "tomorrow"],
    ["now - 30 minutes as a duration", "30 minutes ago"],
    ["now - 1426 minutes as a duration", "23 hours, 46 minutes ago"],
    ["now - 1426 minutes as a short duration", "yesterday"],
    ["now - 85595 seconds as a long duration", "23 hours, 46 minutes, 35 seconds ago"],
    ["now + 14 days as a short duration", "in 2 weeks"],
    ["now + 60 hours as a duration in days", "in 3 days"],
    ["(now + 2 days + 3 hours - now) as a duration", "2 days, 3 hours"],
    ["90 minutes as a duration", "1 hour, 30 minutes"]
  ])("%s => %j", (expression, expected) => {
    expect(valueOf(expression)).toBe(expected)
  })

  test("adding and taking away durations, and the duration between two dates", () => {
    expect((valueOf("now + 2 days") as Date).getDate()).toBe(19)
    expect((valueOf("now - 90 minutes") as Date).getHours()).toBe(19)
    expect(valueOf("(now + 1 hour) - now")).toBe(3600)
    expect(valueOf("((now + 1 hour) - now) in minutes")).toBe(60)
  })

  test("a duration's parts", () => {
    const left = ["set left to (now + 2 days + 3 hours + 4 minutes + 5 seconds) - now"]
    expect(["days", "hours", "minutes", "seconds"].map((part) => valueOf(`the ${part} of left`, left))).toEqual([
      2, 3, 4, 5
    ])
  })

  test.each([
    ["now is a weekend day", false],
    ["now + 4 days is a weekend day", true],
    ["the next weekend as a long date", "Saturday, November 21, 2026"],
    ["now is before now + 1 hour", true],
    ["now is after now + 1 hour", false],
    ["now is the same day as now + 1 hour", true],
    ["now is today", true],
    ["now + 1 day is tomorrow", true],
    ["now - 1 day is yesterday", true],
    ["now + 1 day is yesterday", false],
    ["the days until (now + 3 days)", 3],
    ["the days since (now - 7 days)", 7],
    ["the start of the day of now as a long time", "12:00:00 AM"],
    ["the end of the day of now as a long time", "11:59:59 PM"],
    ["the days in the month of now", 30],
    ['"2026-12-25" as a date as a long date', "Friday, December 25, 2026"]
  ])("%s => %j", (expression, expected) => {
    expect(valueOf(expression)).toBe(expected)
  })

  test("the weekend follows the person's region:  Friday and Saturday in Israel", () => {
    CalendarSettings.use({ region: "IL" })
    expect([valueOf("now + 3 days is a weekend day"), valueOf("the next weekend as a short date")]).toEqual([
      true,
      "20/11"
    ])
  })
})

describe("in Spanish (epic `language` P63)", () => {
  test.each([
    ["el mes de ahora", "noviembre"],
    ["el mes corto de ahora", "nov"],
    ["el día de la semana de ahora", "martes"],
    ["el número del mes de ahora", 11],
    ["el minuto de ahora como dos dígitos", "05"],
    ["los segundos de ahora", 7],
    ["ahora - 30 minutos como duración", "hace 30 minutos"],
    ["ahora + 1 día como duración", "mañana"],
    ["ahora es pm", true],
    ["ahora + 4 días es fin de semana", true],
    ["ahora es antes de ahora + 1 hora", true],
    ["los días hasta (ahora + 3 días)", 3],
    ["los días del mes de ahora", 30]
  ])("%s => %j", (expression, expected) => {
    expect(valorDe(expression)).toBe(expected)
  })
})

describe("Weekend Countdown, mockup's example (epic `language` P63)", () => {
  /** The example, as mockup will build it (its T54). */
  const COUNTDOWN = [
    "# Weekend Countdown",
    "// How long until the weekend:  days, hours, minutes and seconds, ticking down every second.",
    "weekend countdown is an app",
    '\tits "time" is a date',
    "\t\t// This moment:  set again every second, so the countdown redraws",
    "\tevery second",
    "\t\tset its time to now",
    '\tit "is the weekend" if its time is a weekend day',
    "\t\t// Saturday and Sunday in most places:  the person's region says",
    '\tits "time left" is the next weekend - its time',
    "\t\t// A duration:  2 days, 3 hours, 4 minutes and 5 seconds",
    "\tto draw it",
    "\t\t<container text>",
    '\t\t\t<segment padded="very">',
    "\t\t\t\t<if it is the weekend>",
    "\t\t\t\t\t<header>It's the weekend!</header>",
    "\t\t\t\t<else>",
    '\t\t\t\t\t<text color="grey">Weekend starts in</text>',
    "\t\t\t\t\t<statistics>",
    '\t\t\t\t\t\t<statistic value={the days of its time left} label="Days"/>',
    '\t\t\t\t\t\t<statistic value={the hours of its time left as two digits} label="Hr"/>',
    '\t\t\t\t\t\t<statistic value={the minutes of its time left as two digits} label="Min"/>',
    '\t\t\t\t\t\t<statistic value={the seconds of its time left as two digits} label="Sec"/>',
    "\t\t\t\t\t</statistics>",
    "\t\t\t\t</if>",
    "\t\t\t</segment>",
    "\t\t</container>"
  ]

  beforeEach(() => {
    vi.useRealTimers()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 17, 21, 5, 7))
    core.resetRuntime()
  })

  afterEach(() => {
    core.clearRuntime()
  })

  test("it compiles:  its parts read the duration left, in two digits", () => {
    const { js, errors } = compiled(COUNTDOWN)
    expect(errors).toEqual([])
    expect(js).toContain("return core.secondsBetween(core.nextWeekend(), this.time)")
    expect(js).toContain('core.twoDigits(core.durationPartOf(this.timeLeft, "seconds"))')
    expect(js).toContain('core.addTimer(WeekendCountdown, "everySecond", { seconds: 1 })')
  })

  test("it runs:  every second its time moves on, and the time left counts down", async () => {
    type Countdown = { time: Date; timeLeft: number; isTheWeekend: boolean }
    const { weekend_countdown: app } = runSpell(COUNTDOWN)("weekend_countdown") as { weekend_countdown: Countdown }
    await vi.advanceTimersByTimeAsync(1000)
    // Tuesday 9:05:08 PM to Saturday midnight:  3 days, 2 hours, 54 minutes and 52 seconds
    expect([app.isTheWeekend, app.timeLeft]).toEqual([false, 3 * 86_400 + 2 * 3600 + 54 * 60 + 52])
    const parts = ["days", "hours", "minutes", "seconds"].map((part) =>
      core.durationPartOf(app.timeLeft, part as never)
    )
    expect(parts.map((part) => core.twoDigits(part))).toEqual(["03", "02", "54", "52"])
    await vi.advanceTimersByTimeAsync(2000)
    expect(app.timeLeft).toBe(3 * 86_400 + 2 * 3600 + 54 * 60 + 50)
  })

  test("in Spanish, it compiles the same", () => {
    const CUENTA = [
      "cuenta atrás es una aplicación",
      '\tsu "hora" es una fecha',
      "\tcada segundo",
      "\t\tponer su hora a ahora",
      '\t"es fin de semana" si su hora es un día de fin de semana',
      '\tsu "tiempo restante" es el próximo fin de semana - su hora',
      "\tpara dibujarla",
      "\t\t<statistic value={las horas de su tiempo restante como dos dígitos}/>"
    ]
    const { js, errors } = compiled(CUENTA, "/Cuenta.es.spell")
    expect(errors).toEqual([])
    expect(js).toContain("return core.secondsBetween(core.nextWeekend(), this.hora)")
    expect(js).toContain('core.twoDigits(core.durationPartOf(this.tiempoRestante, "hours"))')
  })
})
