/**
 * Tests of `CommandRun`:  a command asking Owen on a page (epic `epic-engine` P23) -- its files in the epic folder,
 * rows replaced with answers kept, progress lines, waiting for Send or the time limit, the heartbeat the page reads;
 * and steering (P25):  passes as data, the effort picked on the page, rows taken, answers as they come.
 * On a scratch epic folder (`SPELL_SHARED_DIR`), with no child repo.
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vite-plus/test"

import { SRV } from "spell/server"

const content = mkdtempSync(join(tmpdir(), "command-run-"))
const root = mkdtempSync(join(tmpdir(), "command-run-root-"))
const savedShared = process.env.SPELL_SHARED_DIR
const savedPath = process.env.PATH
beforeAll(() => {
  process.env.SPELL_SHARED_DIR = content
})
afterAll(() => {
  if (savedShared === undefined) delete process.env.SPELL_SHARED_DIR
  else process.env.SPELL_SHARED_DIR = savedShared
  rmSync(content, { recursive: true, force: true })
  rmSync(root, { recursive: true, force: true })
})
afterEach(() => {
  process.env.PATH = savedPath
})

/** Two drafted names, the second with alternatives and a tick box. */
const ROWS: SRV.RunRow[] = [
  { id: "todo", cells: { english: "Todo" }, value: "Tarea" },
  {
    id: "list",
    cells: { english: "List" },
    value: "Lista",
    alternatives: ["Listado", "Relación"],
    tick: { label: "Use for every project" }
  }
]

/** The translator's efforts, starting at `balanced`. */
const EFFORT: SRV.RunEffortChoice = { choices: ["fast", "balanced", "best"], initial: "balanced", label: "Effort" }

/** A new run of the translator, with `ROWS` (or `rows`), and `effort` when given. */
function openRun({ rows = ROWS, effort }: { rows?: SRV.RunRow[]; effort?: SRV.RunEffortChoice } = {}): SRV.CommandRun {
  return SRV.CommandRun.open({
    root,
    command: "spell translate todos --to es",
    title: "Names for todos, in Spanish",
    columns: [{ key: "english", label: "English" }],
    answerLabel: "Spanish",
    rows,
    effort
  })
}

/** Write `answers` as the page would:  `answers.json5`, under its lock. */
function answer(run: SRV.CommandRun, answers: SRV.RunAnswers): void {
  const file = join(run.folder, SRV.RUN_FILES.answers)
  SRV.FileLock.run(file, () => SRV.DataFile.write(file, answers))
}

/** An answer accepting the proposal. */
const ACCEPTED: SRV.RunAnswer = { outcome: "accepted", value: "Tarea", at: "2026-10-23T19:00:00.000Z" }

/** Resolves after `ms`. */
function after(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms))
}

describe("CommandRun.open()", () => {
  test("writes run.json5 in pages/runs/<id>/, status open, and gives its page's path", () => {
    const run = openRun()
    expect(run.id).toMatch(/^spell-translate-todos-\d{8}-\d{4}(-\d+)?$/)
    expect(run.folder).toBe(join(content, "pages/runs", run.id))
    expect(run.path).toBe(`/runs/${run.id}/`)
    expect(run.url("http://127.0.0.1:4747/")).toBe(`http://127.0.0.1:4747/runs/${run.id}/`)
    expect(run.page).toMatchObject({
      id: run.id,
      command: "spell translate todos --to es",
      answerLabel: "Spanish",
      rows: ROWS,
      progress: [],
      status: "open"
    })
  })

  test("gives each run its OWN folder, the same minute too", () => {
    expect(openRun().id).not.toBe(openRun().id)
  })

  test("throws a CommandRunError for a given id that's there already, and with no epic folder", () => {
    SRV.CommandRun.open({ ...openRun().page, root, id: "fixed" })
    expect(() => SRV.CommandRun.open({ ...openRun().page, root, id: "fixed" })).toThrow(
      expect.objectContaining({ name: "CommandRunError", kind: "run-exists" })
    )
    delete process.env.SPELL_SHARED_DIR
    try {
      expect(() => openRun()).toThrow(expect.objectContaining({ kind: "no-content-folder" }))
    } finally {
      process.env.SPELL_SHARED_DIR = content
    }
  })
})

describe("CommandRun.at()", () => {
  test("reopens a run by id;  throws for one that isn't there", () => {
    const run = openRun()
    expect(SRV.CommandRun.at(root, run.id).page.title).toBe("Names for todos, in Spanish")
    expect(() => SRV.CommandRun.at(root, "nope")).toThrow(expect.objectContaining({ kind: "no-run" }))
  })
})

describe("CommandRun.setRows() and progress()", () => {
  test("replaces the rows, and KEEPS the answers, by row id", () => {
    const run = openRun()
    answer(run, { rows: { todo: ACCEPTED } })
    run.setRows([...ROWS, { id: "done", cells: { english: "Done" }, value: "Hecho" }])
    expect(run.page.rows.map((row) => row.id)).toEqual(["todo", "list", "done"])
    expect(run.answers().rows).toEqual({ todo: ACCEPTED })
    expect(run.unanswered().map((row) => row.id)).toEqual(["list", "done"])
  })

  test("adds progress lines after the others, and stamps updated", () => {
    const run = openRun()
    const before = run.page.updated
    run.progress("names:  2 drafted in 1 s").progress("lines:  4 written")
    expect(run.page.progress.map((line) => line.text)).toEqual(["names:  2 drafted in 1 s", "lines:  4 written"])
    expect(run.page.updated >= before).toBe(true)
  })
})

describe("CommandRun.answers()", () => {
  test("none yet:  no rows, not sent;  then each row's outcome, value and tick", () => {
    const run = openRun()
    expect(run.answers()).toEqual({ rows: {} })
    const picked: SRV.RunAnswer = { outcome: "picked", value: "Listado", ticked: true, at: ACCEPTED.at }
    answer(run, { rows: { todo: ACCEPTED, list: picked }, sent: "2026-10-23T19:01:00.000Z" })
    expect(run.answers()).toEqual({ rows: { todo: ACCEPTED, list: picked }, sent: "2026-10-23T19:01:00.000Z" })
  })
})

describe("CommandRun.wait()", () => {
  test("resolves once answers.json5 is SENT, waiting meanwhile;  then nobody waits", async () => {
    const run = openRun()
    const waiting = run.wait({ timeoutMs: 10_000 })
    await after(50)
    expect(SRV.CommandRun.isWaiting(run.folder)).toBe(true)
    expect(SRV.DataFile.read(join(run.folder, SRV.RUN_FILES.waiting))).toMatchObject({
      pid: process.pid,
      command: "spell translate todos --to es"
    })
    // an answer without Send doesn't end it
    answer(run, { rows: { todo: ACCEPTED } })
    await after(100)
    expect(SRV.CommandRun.isWaiting(run.folder)).toBe(true)
    answer(run, { rows: { todo: ACCEPTED }, sent: new Date().toISOString() })
    expect(await waiting).toMatchObject({ rows: { todo: ACCEPTED }, timedOut: false })
    expect(existsSync(join(run.folder, SRV.RUN_FILES.waiting))).toBe(false)
    expect(SRV.CommandRun.isWaiting(run.folder)).toBe(false)
  })

  test("a Send from BEFORE the wait doesn't end it:  the time limit does, timedOut, the heartbeat gone", async () => {
    const run = openRun()
    answer(run, { rows: { todo: ACCEPTED }, sent: "2026-01-01T00:00:00.000Z" })
    expect(await run.wait({ timeoutMs: 150 })).toEqual({
      rows: { todo: ACCEPTED },
      sent: "2026-01-01T00:00:00.000Z",
      timedOut: true
    })
    expect(existsSync(join(run.folder, SRV.RUN_FILES.waiting))).toBe(false)
  })

  test("an abort rejects with its reason, and removes the heartbeat", async () => {
    const run = openRun()
    const controller = new AbortController()
    const waiting = run.wait({ timeoutMs: 10_000, signal: controller.signal })
    controller.abort(new Error("stop"))
    await expect(waiting).rejects.toThrow("stop")
    expect(existsSync(join(run.folder, SRV.RUN_FILES.waiting))).toBe(false)
  })
})

describe("CommandRun.isWaiting()", () => {
  test("false with no heartbeat, a dead process's, or a stale one", () => {
    const run = openRun()
    const file = join(run.folder, SRV.RUN_FILES.waiting)
    const heartbeat = { pid: process.pid, command: "x", seen: new Date().toISOString(), until: "" }
    expect(SRV.CommandRun.isWaiting(run.folder)).toBe(false)
    SRV.DataFile.write(file, heartbeat)
    expect(SRV.CommandRun.isWaiting(run.folder)).toBe(true)
    SRV.DataFile.write(file, { ...heartbeat, pid: spawnSync("true").pid })
    expect(SRV.CommandRun.isWaiting(run.folder)).toBe(false)
    const stale = new Date(Date.now() - SRV.WAITING_STALE_MS - 1000).toISOString()
    SRV.DataFile.write(file, { ...heartbeat, seen: stale })
    expect(SRV.CommandRun.isWaiting(run.folder)).toBe(false)
  })
})

describe("CommandRun.show()", () => {
  test("with no epic program and no page server:  opens nothing, and gives the page's path", async () => {
    process.env.PATH = ""
    const run = openRun()
    expect(await run.show()).toBe(run.path)
  })
})

describe("CommandRun passes", () => {
  test("records each pass with its facts, ms, the effort at its start, and running / done", async () => {
    const run = openRun({ effort: EFFORT })
    run.startPass("names", { total: 41 })
    expect(run.page.passes).toEqual([
      { name: "names", state: "running", total: 41, ms: 0, effort: "balanced", started: expect.any(String) }
    ])
    await after(30)
    run.endPass({ done: 41, calls: 3 })
    run.startPass("lines")
    const [names, lines] = run.page.passes!
    expect(names).toMatchObject({ name: "names", state: "done", done: 41, total: 41, calls: 3 })
    expect(names.ms).toBeGreaterThanOrEqual(25)
    expect(lines).toMatchObject({ name: "lines", state: "running", effort: "balanced" })
    // a pass the command runs at an effort of its own (a flag of its own won):  that one, not the page's
    run.startPass("fix-ups", { effort: "best" })
    expect(run.page.passes![2]).toMatchObject({ name: "fix-ups", effort: "best" })
    expect(run.page.passes![1].state).toBe("done")
    // finish() ends the pass still running
    run.finish()
    expect(run.page.passes![2].state).toBe("done")
    expect(run.page.status).toBe("done")
  })

  test("throttles a tight loop's writes, and still ends with the final state", async () => {
    const run = openRun()
    run.startPass("lines", { total: 380 })
    for (let done = 1; done <= 380; done++) run.updatePass({ done })
    // held back:  the pass was written at its start, less than PASS_WRITE_MS ago
    expect(run.page.passes![0].done).toBeUndefined()
    // ... and written once the time is up, with the last state
    await after(SRV.CommandRun.PASS_WRITE_MS + 50)
    expect(run.page.passes![0]).toMatchObject({ done: 380, state: "running" })
    run.updatePass({ done: 1, calls: 7 })
    run.updatePass({ done: 2 })
    run.endPass()
    expect(run.page.passes![0]).toMatchObject({ done: 2, calls: 7, state: "done" })
  })

  test("updatePass() and endPass() with no pass running throw a TypeError", () => {
    const run = openRun()
    expect(() => run.updatePass({ done: 1 })).toThrow(TypeError)
    expect(() => run.endPass()).toThrow(/startPass\(\) first/)
  })
})

describe("CommandRun.effort and take()", () => {
  test("effort:  the initial one, then what answers.effort picks, ignoring one not in the choices", () => {
    expect(openRun().effort).toBeUndefined()
    const run = openRun({ effort: EFFORT })
    expect(run.page.effort).toEqual(EFFORT)
    expect(run.effort).toBe("balanced")
    answer(run, { rows: {}, effort: "best" })
    expect(run.effort).toBe("best")
    answer(run, { rows: {}, effort: "reckless" })
    expect(run.effort).toBe("balanced")
  })

  test("take() marks rows taken, by row id, keeping the earlier ones", () => {
    const run = openRun()
    run.take("todo").take("list")
    expect(Object.keys(run.page.taken!)).toEqual(["todo", "list"])
    expect(Date.parse(run.page.taken!.todo)).not.toBeNaN()
  })
})

describe("CommandRun.answersAsTheyCome()", () => {
  test("yields each answer as it's written, a changed one again, and ends on Send;  heartbeat meanwhile", async () => {
    const run = openRun()
    const given: SRV.RunRowAnswer[] = []
    const listening = (async () => {
      const answers = run.answersAsTheyCome({ timeoutMs: 10_000 })
      for (;;) {
        const next = await answers.next()
        if (next.done) return next.value
        given.push(next.value)
      }
    })()
    await after(50)
    expect(SRV.CommandRun.isWaiting(run.folder)).toBe(true)
    answer(run, { rows: { todo: ACCEPTED } })
    await vi.waitFor(() => expect(given).toEqual([{ rowId: "todo", answer: ACCEPTED }]))
    const typed: SRV.RunAnswer = { outcome: "typed", value: "Pendiente", at: "2026-10-23T19:02:00.000Z" }
    answer(run, { rows: { todo: typed } })
    await vi.waitFor(() => expect(given).toHaveLength(2))
    expect(given[1]).toEqual({ rowId: "todo", answer: typed })
    // the same again:  nothing new
    answer(run, { rows: { todo: typed }, effort: "best" })
    await after(100)
    expect(given).toHaveLength(2)
    // Send, with one more answer:  that one first, then the end
    const list: SRV.RunAnswer = { outcome: "picked", value: "Listado", at: "2026-10-23T19:03:00.000Z" }
    answer(run, { rows: { todo: typed, list }, sent: new Date().toISOString() })
    expect(await listening).toBe("sent")
    expect(given[2]).toEqual({ rowId: "list", answer: list })
    expect(existsSync(join(run.folder, SRV.RUN_FILES.waiting))).toBe(false)
  })

  test("gives rows answered before it started first;  ends at its time limit, the heartbeat gone", async () => {
    const run = openRun()
    answer(run, { rows: { todo: ACCEPTED }, sent: "2026-01-01T00:00:00.000Z" })
    const given: string[] = []
    for await (const { rowId } of run.answersAsTheyCome({ timeoutMs: 150 })) given.push(rowId)
    expect(given).toEqual(["todo"])
    expect(existsSync(join(run.folder, SRV.RUN_FILES.waiting))).toBe(false)
  })

  test("ends quietly on an abort, on a break, and at finish()", async () => {
    const run = openRun()
    const controller = new AbortController()
    setTimeout(() => controller.abort(new Error("stop")), 50)
    expect(await run.answersAsTheyCome({ signal: controller.signal }).next()).toEqual({ done: true, value: "aborted" })
    expect(existsSync(join(run.folder, SRV.RUN_FILES.waiting))).toBe(false)

    answer(run, { rows: { todo: ACCEPTED } })
    for await (const _ of run.answersAsTheyCome()) break
    expect(existsSync(join(run.folder, SRV.RUN_FILES.waiting))).toBe(false)

    const answers = run.answersAsTheyCome()
    await answers.next() // the todo row
    setTimeout(() => run.finish("stopped"), 50)
    expect(await answers.next()).toEqual({ done: true, value: "finished" })
    expect(existsSync(join(run.folder, SRV.RUN_FILES.waiting))).toBe(false)
  })
})

describe("Steering a run (the plan's verify, as a stand-in)", () => {
  test("three timed passes over 20 rows:  answers arrive mid-run, and an effort switch takes at the next pass", async () => {
    const rows = Array.from({ length: 20 }, (_, n) => ({
      id: `row${n}`,
      cells: { english: `Row ${n}` },
      value: `R${n}`
    }))
    const run = openRun({ rows, effort: EFFORT })

    // the command:  takes each answer as it comes, while its passes run
    const taken: string[] = []
    const listening = (async () => {
      for await (const { rowId } of run.answersAsTheyCome({ timeoutMs: 10_000 })) {
        taken.push(rowId)
        run.take(rowId)
      }
    })()
    const efforts: string[] = []
    for (const name of ["names", "lines", "fix-ups"]) {
      efforts.push(run.effort!)
      run.startPass(name, { total: rows.length })
      for (let done = 1; done <= rows.length; done++) {
        await after(5)
        run.updatePass({ done, calls: done })
        // Owen, on the page:  answers two rows in the first pass, picks "best" in it too
        if (name === "names" && done === 5) answer(run, { rows: { row0: ACCEPTED } })
        if (name === "names" && done === 10) answer(run, { rows: { row0: ACCEPTED, row1: ACCEPTED }, effort: "best" })
      }
      run.endPass()
    }
    answer(run, { rows: { row0: ACCEPTED, row1: ACCEPTED }, effort: "best", sent: new Date().toISOString() })
    await listening
    run.finish()

    expect(efforts).toEqual(["balanced", "best", "best"])
    expect(taken).toEqual(["row0", "row1"])
    const page = run.page
    expect(Object.keys(page.taken!)).toEqual(["row0", "row1"])
    expect(page.passes!.map(({ name, state, done, calls, effort }) => ({ name, state, done, calls, effort }))).toEqual([
      { name: "names", state: "done", done: 20, calls: 20, effort: "balanced" },
      { name: "lines", state: "done", done: 20, calls: 20, effort: "best" },
      { name: "fix-ups", state: "done", done: 20, calls: 20, effort: "best" }
    ])
    expect(page.passes!.every((pass) => pass.ms! >= 90)).toBe(true)
    expect(page.status).toBe("done")
  })
})
