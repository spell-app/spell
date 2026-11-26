/**
 * Tests of `Settings` (epic `epic-engine` P86):  `epic settings`, reading and setting, Bells & Whistles' steps too.
 * - the developer's file is the tests' scratch one (`$SPELL_SETTINGS_HOME`, the setup's)
 */
import { rmSync } from "node:fs"
import { join } from "node:path"

import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { Settings } from "spell/epic/command/Settings"
import { LayeredSettings } from "spell/epic/config/LayeredSettings"

/** What `epic settings ...args` prints. */
function run(...args: string[]): string {
  let out = ""
  const write = vi.spyOn(process.stdout, "write").mockImplementation((text) => ((out += String(text)), true))
  try {
    Settings.run(args)
  } finally {
    write.mockRestore()
  }
  return out
}

afterEach(() => rmSync(join(LayeredSettings.home(), ".spell"), { recursive: true, force: true }))

describe("epic settings", () => {
  test("bells:  the slider, then each step with its cost and whether it runs now", () => {
    const out = run("bells")
    expect(out).toMatch(/^Token burn:  high/)
    expect(out).toMatch(/on   designReview\s+high\s+Design review/)
  })

  test("bells.<key> off, then bells.<key>:  off, and why", () => {
    run("bells.designReview", "off")
    expect(run("bells.designReview")).toBe("off  (your switch)\n")
    run("bells.burn", "low")
    expect(run("bells.burn")).toBe("low\n")
    expect(run("bells.planCheck")).toBe("off  (the Token burn slider)\n")
    run("bells.planCheck", "on")
    expect(run("bells.burn")).toBe("custom\n")
    expect(run("bells.planCheck")).toBe("on\n")
  })

  test("any other key:  set in your file, typed", () => {
    expect(run("away.finishedPhaseDays", "5")).toBe("5\n")
    expect(run("bells.burnFlips")).toBe("{}\n")
  })

  test.each([
    [["bells.nope", "off"], /no step nope/],
    [["bells.designReview", "maybe"], /on or off/],
    [["away.finishedPhaseDays", "soon"], /a number, 0 or more/],
    [["nope"], /no such key/]
  ])("refuses %j", (args, why) => {
    expect(() => run(...args)).toThrow(why)
  })
})
