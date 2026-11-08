import { describe, expect, test } from "vite-plus/test"

import { runSpell } from "spell/parser/spell/test"

/**
 * Dates said as HyperTalk says them (epic `data`):  `the date`, `the long time`, `now`,
 * a date's own `short date`, and joining into text with `&` and `&&`.
 */

/** `expression`, compiled and run:  what it gives. */
function valueOf(expression: string, before: string[] = []): unknown {
  return runSpell([...before, `set answer to ${expression}`])("answer").answer
}

const NOTE = ["a note is a thing:", "\t- it has a due as date", "the note is a new note"]

describe("dates as HyperTalk says them", () => {
  test("`the date` and `the time` are today's, as text;  `now` is the date itself", () => {
    expect(valueOf("the date")).toMatch(/^\d{1,2}\/\d{1,2}\/\d{2}$/)
    expect(valueOf("the long time")).toMatch(/^\d{1,2}:\d{2}:\d{2} (AM|PM)$/)
    expect(valueOf("now")).toBeInstanceOf(Date)
    expect(valueOf("the year of now")).toBe(new Date().getFullYear())
  })

  test("`&` joins as they are, `&&` with a space, a date said in words", () => {
    const due = ["set the due of the note to now"]
    expect(valueOf('"a" & 1 & 2', NOTE)).toBe("a12")
    expect(valueOf('"due" && the due of the note', [...NOTE, ...due])).toMatch(/^due \w+ \d{1,2}, \d{4}$/)
    expect(valueOf('"due" && the short date of the due of the note', [...NOTE, ...due])).toMatch(/^due \d+\/\d+\/\d+$/)
    expect(valueOf('"at " + the due of the note', [...NOTE, ...due])).toMatch(/^at \w+ \d{1,2}, \d{4}$/)
  })

  test("a program's own `time` wins over today's", () => {
    expect(valueOf("the time", ['set the time to "tea"'])).toBe("tea")
  })
})
