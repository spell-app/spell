import { describe, expect, test } from "vite-plus/test"

import { EpicCommandError, duration, parseVerbArgs, stringFlag } from "spell-epic/command/command.types"

/**
 * The ONE reader of every `epic` verb's and docs tool's command line (epic `coherence` P20):  its flags, their values,
 * and the times a wait takes.
 */

describe("parseVerbArgs()", () => {
  test("--key value flags, bare switches, the rest in order;  names camelCased", () => {
    expect(parseVerbArgs(["open", "x.html", "--hash", "p2", "--show", "--dry-run"])).toEqual({
      positional: ["open", "x.html"],
      flags: { hash: "p2", show: true, dryRun: true },
      lists: { hash: ["p2"] }
    })
  })

  test("a switch never takes the word after it;  any other flag does, unless it's a flag", () => {
    expect(parseVerbArgs(["--all", "seo", "--json"], ["all"])).toEqual({
      positional: ["seo"],
      flags: { all: true, json: true },
      lists: {}
    })
    expect(parseVerbArgs(["--title", "--json"]).flags).toEqual({ title: true, json: true })
  })

  test("a flag given twice:  its last value, and every value in order", () => {
    const { flags, lists } = parseVerbArgs(["--title", "a", "--title", "b"])
    expect({ flags, lists }).toEqual({ flags: { title: "b" }, lists: { title: ["a", "b"] } })
  })

  test("ONLY --name is a flag:  -x, --x=y and a lone -- are words, as a value starting with - is", () => {
    expect(parseVerbArgs(["-x", "--a=b", "--", "- a note"]).positional).toEqual(["-x", "--a=b", "--", "- a note"])
  })
})

test("stringFlag():  a flag's text;  none for a bare flag or none", () => {
  expect([stringFlag("seo"), stringFlag(true), stringFlag(undefined)]).toEqual(["seo", undefined, undefined])
})

describe("duration()", () => {
  test("a unit, or a bare number of seconds:  in ms", () => {
    expect(duration("8h")).toBe(8 * 3_600_000)
    expect(duration("1h30m")).toBe(90 * 60_000)
    expect(duration("45s")).toBe(45_000)
    expect(duration("3300")).toBe(3_300_000)
    expect(duration("1.5")).toBe(1500)
  })

  test("anything else is a usage error, never a wait for ever (--max 2h was NaN seconds)", () => {
    expect(() => duration("soon")).toThrow(EpicCommandError)
    expect(() => duration("soon")).toThrow(/a duration is like/)
  })
})
