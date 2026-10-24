/**
 * Tests of `CommandRun`:  a command asking Owen on a page (epic `epic-engine` P23) -- its files in the content folder,
 * rows replaced with answers kept, progress lines, waiting for Send or the time limit, the heartbeat the page reads.
 * On a scratch content folder (`SPELL_SHARED_DIR`), with no child repo.
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, afterEach, beforeAll, describe, expect, test } from "vite-plus/test"

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

/** A new run of the translator, with `ROWS`. */
function openRun(): SRV.CommandRun {
  return SRV.CommandRun.open({
    root,
    command: "spell translate todos --to es",
    title: "Names for todos, in Spanish",
    columns: [{ key: "english", label: "English" }],
    answerLabel: "Spanish",
    rows: ROWS
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

  test("throws a CommandRunError for a given id that's there already, and with no content folder", () => {
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
