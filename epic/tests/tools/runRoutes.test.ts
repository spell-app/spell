/**
 * Tests of the run pages' route module on a real page server, over HTTP, in a scratch content folder holding one run:
 * its page, its answers saved row by row, Send, the waiting state, and what it refuses.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { PageServer } from "spell/server/page"
import { ask } from "spell/server/test/serve"
import type { RunAnswers, RunPage, RunWaiting } from "spell/server/runs/runs.types"

import { DataFile } from "spell-epic/data/DataFile"
import runRoutes, { type RunReply } from "spell-epic/tools/runRoutes"

////////////////
// ## Fixtures
////////////////

let root: string
let server: PageServer
let port: number

/** The run in the scratch content folder. */
const RUN: RunPage = {
  id: "spell-translate-20261023-1912",
  command: "spell translate todos --to es",
  title: "Names for todos, in Spanish",
  columns: [
    { key: "english", label: "English" },
    { key: "gender", label: "Gender" }
  ],
  answerLabel: "Spanish",
  rows: [
    { id: "task", cells: { english: "Task", gender: "f" }, value: "Tarea", alternatives: ["Faena", "Labor"] },
    { id: "done", cells: { english: "done", gender: "" }, value: "hecho", tick: { label: "Use for every project" } }
  ],
  progress: [{ at: "2026-10-23T19:12:00.000Z", text: "names:  2 drafted in 1 s" }],
  status: "open",
  updated: "2026-10-23T19:12:00.000Z"
}

/** The run's folder. */
const folder = () => join(root, "pages", "runs", RUN.id)

/** What `answers.json5` holds now. */
const written = () => DataFile.read<RunAnswers>(join(folder(), "answers.json5"))

/** Write the run's heartbeat:  `pid`, seen `ago` ms ago. */
function heartbeat(pid: number, ago = 0) {
  const seen = new Date(Date.now() - ago).toISOString()
  const waiting: RunWaiting = { pid, command: RUN.command, seen, until: new Date(Date.now() + 60_000).toISOString() }
  DataFile.write(join(folder(), "waiting.json5"), waiting)
}

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), "run-routes-"))
  mkdirSync(join(root, ".git"))
  mkdirSync(folder(), { recursive: true })
  DataFile.write(join(folder(), "run.json5"), RUN)
  server = new PageServer({ root })
  await runRoutes.setup(server.routeContext())
  await server.start({ port: 0, routes: false, pidFile: false })
  port = server.info.port
})

afterAll(async () => {
  await server.stop()
  rmSync(root, { recursive: true, force: true })
})

/** headers of a write from a page this server served */
function page() {
  return {
    "content-type": "application/json",
    "x-server-token": server.web.guard.token,
    origin: `http://127.0.0.1:${port}`
  }
}

/** POST `body` to `path` as a page would */
function post(path: string, body: unknown = {}) {
  return ask(port, "POST", path, { body: JSON.stringify(body), headers: page() })
}

/** GET the run as its page does */
async function read(id = RUN.id): Promise<RunReply> {
  const reply = await ask(port, "GET", `/api/runs/${id}`)
  return JSON.parse(reply.text) as RunReply
}

////////////////
// ## Tests
////////////////

describe("runRoutes", () => {
  test("serves the page at `/runs/<id>/`:  titled with the run's title, its `<epic-run run>`, the server's page config", async () => {
    const reply = await ask(port, "GET", `/runs/${RUN.id}/`)
    expect(reply.status).toBe(200)
    expect(reply.text).toContain(`<title>${RUN.title}</title>`)
    expect(reply.text).toContain(`<h1>${RUN.title}</h1>`)
    expect(reply.text).toContain(`<epic-run run="${RUN.id}">`)
    expect(reply.text).toContain("window.SPELL_SERVER")
    const bare = await ask(port, "GET", `/runs/${RUN.id}`)
    expect(bare.status).toBe(301)
  })

  test("a title is text, never markup", async () => {
    const other = { ...RUN, id: "markup-title", title: "<b>bold</b> & <script>x</script>" }
    mkdirSync(join(root, "pages", "runs", other.id), { recursive: true })
    DataFile.write(join(root, "pages", "runs", other.id, "run.json5"), other)
    const reply = await ask(port, "GET", `/runs/${other.id}/`)
    expect(reply.text).not.toContain("<b>bold</b>")
    expect(reply.text).not.toContain("<script>x</script>")
    expect(reply.text).toContain("<title>&lt;b&gt;bold&lt;/b&gt; &amp; &lt;script&gt;x&lt;/script&gt;</title>")
    expect(reply.text).toContain("<h1>&lt;b&gt;bold&lt;/b&gt; &amp; &lt;script&gt;x&lt;/script&gt;</h1>")
  })

  test("GET answers the run:  what's asked, nothing answered yet, nobody waiting", async () => {
    expect(await read()).toEqual({ page: RUN, answers: { rows: {} }, waiting: false })
  })

  test("POST answer saves ONE row's answer into answers.json5, beside the others;  the tick only on a row that has one", async () => {
    const first = await post(`/api/runs/${RUN.id}/answer`, {
      rowId: "task",
      outcome: "picked",
      value: "Faena",
      ticked: true
    })
    expect(first.status).toBe(200)
    await post(`/api/runs/${RUN.id}/answer`, { rowId: "done", outcome: "accepted", value: "hecho", ticked: true })
    expect(written()).toMatchObject({
      rows: {
        task: { outcome: "picked", value: "Faena" },
        done: { outcome: "accepted", value: "hecho", ticked: true }
      }
    })
    expect(written()!.rows.task).not.toHaveProperty("ticked")
    expect((await read()).answers).toEqual(written())
  })

  test("POST send stamps `sent`, afresh each time, keeping the rows", async () => {
    const first = JSON.parse((await post(`/api/runs/${RUN.id}/send`)).text) as { answers: RunAnswers }
    expect(first.answers.sent).toMatch(/^\d{4}-\d\d-\d\dT/)
    await new Promise((done) => setTimeout(done, 5))
    const again = JSON.parse((await post(`/api/runs/${RUN.id}/send`)).text) as { answers: RunAnswers }
    expect(again.answers.sent! > first.answers.sent!).toBe(true)
    expect(Object.keys(written()!.rows)).toEqual(["task", "done"])
  })

  test("waiting:  a fresh heartbeat from a live process;  NOT a stale one, a gone process, or a run that's done", async () => {
    heartbeat(process.pid)
    expect((await read()).waiting).toBe(true)
    heartbeat(process.pid, 120_000)
    expect((await read()).waiting).toBe(false)
    heartbeat(2 ** 22 + 12345)
    expect((await read()).waiting).toBe(false)
    heartbeat(process.pid)
    DataFile.write(join(folder(), "run.json5"), { ...RUN, status: "done" })
    expect((await read()).waiting).toBe(false)
    DataFile.write(join(folder(), "run.json5"), RUN)
  })

  test("refuses a bad run id (400), a run that isn't there (404), a row not in the run and a bad answer (400)", async () => {
    expect((await ask(port, "GET", "/api/runs/Bad_Id")).status).toBe(400)
    expect((await ask(port, "GET", "/api/runs/nope")).status).toBe(404)
    expect((await ask(port, "GET", "/runs/nope/")).status).toBe(404)
    const answer = (body: object) => post(`/api/runs/${RUN.id}/answer`, body)
    expect((await answer({ rowId: "other", outcome: "typed", value: "x" })).status).toBe(400)
    expect((await answer({ rowId: "task", outcome: "guessed", value: "x" })).status).toBe(400)
    expect((await answer({ rowId: "task", outcome: "typed", value: 3 })).status).toBe(400)
    expect((await post("/api/runs/Bad_Id/send")).status).toBe(400)
  })

  test("writes need the page server's token", async () => {
    const reply = await ask(port, "POST", `/api/runs/${RUN.id}/send`, {
      body: "{}",
      headers: { "content-type": "application/json" }
    })
    expect(reply.status).toBe(403)
  })

  test("a hand-added comment in answers.json5 stays through a save", async () => {
    const file = join(folder(), "answers.json5")
    writeFileSync(file, readFileSync(file, "utf8").replace("{", "{\n  // Owen's note"))
    await post(`/api/runs/${RUN.id}/answer`, { rowId: "task", outcome: "typed", value: "Quehacer" })
    expect(readFileSync(file, "utf8")).toContain("// Owen's note")
    expect(written()!.rows.task!.value).toBe("Quehacer")
  })
})
