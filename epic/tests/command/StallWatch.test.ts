/**
 * Tests of `StallWatch`:  the stall rule on a fake clock and CPU reader, then `Turns.runCommand()` stopping a silent,
 * idle child (its turn freed) and leaving a chatty one alone.  In a scratch epic home.
 */
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeAll, describe, expect, test, vi } from "vite-plus/test"

import { StallWatch, cpuSeconds } from "spell/epic/command/StallWatch"
import { Turns } from "spell/epic/command/Turns"

const HOME = mkdtempSync(join(tmpdir(), "stall-"))
const before = process.env.SPELL_EPIC_HOME
const turnsBefore = process.env[Turns.ENV]
beforeAll(() => {
  process.env.SPELL_EPIC_HOME = HOME
  delete process.env[Turns.ENV]
})
afterAll(() => {
  if (before === undefined) delete process.env.SPELL_EPIC_HOME
  else process.env.SPELL_EPIC_HOME = before
  if (turnsBefore !== undefined) process.env[Turns.ENV] = turnsBefore
  rmSync(HOME, { recursive: true, force: true })
})

/** A watch on a clock the test moves. */
function watchAt(stallMs = 10 * 60_000) {
  const clock = { now: 0 }
  return { clock, watch: new StallWatch({ stallMs, now: () => clock.now }) }
}

describe("StallWatch", () => {
  test("no output and no CPU for the window:  stalled", () => {
    const { clock, watch } = watchAt()
    expect(watch.sample(5)).toBe(false)
    for (let minute = 1; minute < 10; minute++) {
      clock.now = minute * 60_000
      expect(watch.sample(5.01)).toBe(false)
    }
    clock.now = 10 * 60_000
    expect(watch.sample(5.01)).toBe(true)
  })

  test("steady output keeps it alive, CPU or not", () => {
    const { clock, watch } = watchAt()
    for (let minute = 1; minute <= 30; minute++) {
      clock.now = minute * 60_000
      watch.output(` ✓ |browser (chromium)| tests/x${minute}.test.ts (3 tests) 40ms\n`)
      expect(watch.sample(5)).toBe(false)
    }
    expect(watch.lastProject).toBe("browser (chromium)")
    expect(watch.lastLine).toBe("✓ |browser (chromium)| tests/x30.test.ts (3 tests) 40ms")
  })

  test("a quiet tree using CPU is busy;  one it can't measure too", () => {
    const { clock, watch } = watchAt()
    watch.output("building\n")
    for (let minute = 1; minute < 30; minute++) {
      clock.now = minute * 60_000
      expect(watch.sample(minute * 20)).toBe(false)
    }
    clock.now = 29.5 * 60_000
    expect(watch.sample(undefined)).toBe(false)
  })

  test("silent for 3 windows, however busy:  stalled (a page stuck in a loop, I422)", () => {
    const { clock, watch } = watchAt()
    watch.output("RUN  v5.1.0\n")
    for (let minute = 1; minute < 30; minute++) {
      clock.now = minute * 60_000
      expect(watch.sample(minute * 60)).toBe(false)
    }
    clock.now = 30 * 60_000
    expect(watch.sample(30 * 60)).toBe(true)
    expect(watch.stoppedLine("yarn test")).toBe(
      'epic turns:  "yarn test" stalled -- no output for 30m, though busy;  stopped it and freed the turn ' +
        '(last output:  "RUN  v5.1.0")'
    )
  })

  test("stoppedLine():  how long, the project, the last line", () => {
    const { clock, watch } = watchAt()
    watch.output("\x1b[32m ✓ |ui:browser (chromium)| a.test.ts\x1b[39m\nRUN  waiting")
    clock.now = 12 * 60_000
    expect(watch.stoppedLine("yarn test")).toBe(
      'epic turns:  "yarn test" stalled -- no output and no CPU for 12m;  stopped it and freed the turn ' +
        '(in project ui:browser (chromium);  last output:  "RUN  waiting")'
    )
  })

  test("cpuSeconds():  ps's time, either shape", () => {
    expect(cpuSeconds("0:01.50")).toBe(1.5)
    expect(cpuSeconds("01:02:03")).toBe(3723)
    expect(cpuSeconds("2-00:00:01")).toBe(172_801)
  })
})

describe("Turns.runCommand() with the watch", () => {
  const fast = { every: 20, graceMs: 200, cpu: () => 0 }

  test("a silent, idle child:  stopped, one line, exit 1, and the turn freed", async () => {
    const said = vi.spyOn(console, "error").mockImplementation(() => {})
    const code = await Turns.runCommand("stall", [process.execPath, "-e", "setTimeout(() => {}, 60_000)"], {
      stallMs: 200,
      watch: fast
    })
    expect(code).toBe(1)
    expect(said.mock.calls.flat().join("\n")).toMatch(/stalled -- no output and no CPU.*no output at all/)
    expect(Turns.held().find((it) => it.kind === "stall")).toBeUndefined()
    said.mockRestore()
  })

  test("a child printing steadily is left alone", async () => {
    const write = vi.spyOn(process.stdout, "write").mockImplementation(() => true)
    const chatty = "let n = 0; const t = setInterval(() => { console.log(n); if (++n > 15) process.exit(0) }, 30)"
    const code = await Turns.runCommand("chatty", [process.execPath, "-e", chatty], { stallMs: 200, watch: fast })
    write.mockRestore()
    expect(code).toBe(0)
  })
})
