import { Chalk } from "chalk"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { Logger } from "spell/util/spell/Logger"
import { SRV } from "spell/server"

////////////////
// ## Helpers
////////////////

/** Silence `console`;  returns the spies, by method. */
function quiet() {
  const spy = (method: "log" | "info" | "warn" | "error") => vi.spyOn(console, method).mockImplementation(() => {})
  return { log: spy("log"), info: spy("info"), warn: spy("warn"), error: spy("error") }
}

/** The first argument of each call `spy` heard. */
function firstOf(spy: ReturnType<typeof quiet>["log"]): unknown[] {
  return spy.mock.calls.map(([first]) => first)
}

/** A log with no colours, reading `SPELL_DEBUG` from `debug`. */
function logOf(debug?: string, prefix = "bundles"): SRV.ServerLog {
  return new SRV.ServerLog({ prefix, env: { SPELL_DEBUG: debug }, colors: new Chalk({ level: 0 }) })
}

////////////////
// ## Tests
////////////////

describe("ServerLog", () => {
  afterEach(() => vi.restoreAllMocks())

  test("INFO by default:  debug lines hidden;  each line starts with its prefix", () => {
    const spies = quiet()
    const log = logOf()
    log.debug("checking")
    log.info("built brand")
    log.warn("careful")
    log.error("failed:", "why")
    expect(firstOf(spies.log)).toEqual([])
    expect(firstOf(spies.info)).toEqual(["bundles:  built brand"])
    expect(firstOf(spies.warn)).toEqual(["bundles:  careful"])
    expect(spies.error.mock.calls).toEqual([["bundles:  failed:", "why"]])
  })

  test("SPELL_DEBUG turns its debug lines on:  by its name, its parent's, or `*`;  another's leaves it be", () => {
    for (const debug of ["server:bundles", "server", "*", "server:projects,server:bundles:DEBUG"]) {
      expect(logOf(debug).level).toBe(Logger.DEBUG)
    }
    expect(logOf("server:projects").level).toBe(Logger.INFO)
    expect(logOf("server:ERROR").level).toBe(Logger.ERROR)
    expect(logOf("page server", "page server").level).toBe(Logger.INFO)
  })

  test("childLine():  its rules first, then an error or a warning;  the rest INFO;  blank lines dropped", () => {
    const spies = quiet()
    const log = logOf()
    const rules: SRV.LineRule[] = [
      { line: /current$/, level: Logger.DEBUG },
      { line: / · wrote /, level: Logger.INFO, shown: (line) => line.replace(/ · wrote .*$/, "") }
    ]
    const shown = [
      "ui-root:  current",
      "   ",
      "\u001b[33mbuilt\u001b[39m brand",
      "✓ Counter  1 warning · wrote build/Counter.spell.js",
      "Bundle.build():  failed:  exit 1",
      "!! import.meta is empty"
    ].map((line) => log.childLine(line, rules))
    expect(shown).toEqual([false, false, true, true, true, true])
    expect(firstOf(spies.info)).toEqual(["bundles:  built brand", "bundles:  ✓ Counter  1 warning"])
    expect(firstOf(spies.error)).toEqual(["bundles:  Bundle.build():  failed:  exit 1"])
    expect(firstOf(spies.warn)).toEqual(["bundles:  !! import.meta is empty"])
  })

  test("gap() and groupNext():  a blank line between groups, never two in a row, only before a line shown", () => {
    const spies = quiet()
    const log = logOf()
    log.info("one")
    log.gap()
    log.gap()
    log.info("two")
    log.groupNext()
    log.debug("hidden")
    log.info("three")
    expect(firstOf(spies.log)).toEqual(["", ""])
    expect(firstOf(spies.info)).toEqual(["bundles:  one", "bundles:  two", "bundles:  three"])
  })

  test("colours:  the prefix dimmed, an error red, a warning yellow, an address cyan;  none with NO_COLOR", () => {
    const colors = new Chalk({ level: 1 })
    const log = new SRV.ServerLog({ prefix: "page server", env: {}, colors })
    expect(log.colored(Logger.ERROR, "failed")).toBe(colors.red("failed"))
    expect(log.colored(Logger.WARN, "careful")).toBe(colors.yellow("careful"))
    expect(log.colored(Logger.INFO, "at http://127.0.0.1:4747/ now")).toBe(
      `at ${colors.cyan("http://127.0.0.1:4747/")} now`
    )
    const spies = quiet()
    log.info("up")
    expect(firstOf(spies.info)).toEqual([`${colors.dim("page server:")}  up`])
    expect(SRV.colorsFor({ NO_COLOR: "1", FORCE_COLOR: "1" }).level).toBe(0)
  })
})
