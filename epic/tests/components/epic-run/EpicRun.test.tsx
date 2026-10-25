import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"
import type { RunAnswers, RunPage } from "spell/server/runs/runs.types"

import { RunForm } from "spell-epic/answers"

import "spell-epic/components/epic-run"

////////////////
// ## Fakes
////////////////

/** A run of three rows:  one with alternatives, one with a tick box and details, one plain. */
const RUN: RunPage = {
  id: "demo",
  command: "spell translate todos --to es",
  title: "Names for todos, in Spanish",
  description: "Accept, type over, or pick;  Send and the translator writes the lines.",
  columns: [
    { key: "english", label: "English" },
    { key: "from", label: "From" }
  ],
  answerLabel: "Spanish",
  rows: [
    { id: "task", cells: { english: "Task", from: "glossary" }, value: "Tarea", alternatives: ["Faena", "Labor"] },
    {
      id: "done",
      cells: { english: "done", from: "drafted" },
      value: "hecho",
      tick: { label: "Use for every project" },
      details: ["line 3:  task is done", "line 9:  mark done"]
    },
    { id: "todo", cells: { english: "Todo", from: "drafted" }, value: "Pendiente" }
  ],
  progress: [
    { at: "2026-10-23T19:12:00.000Z", text: "names:  3 drafted in 1 s" },
    { at: "2026-10-23T19:12:02.000Z", text: "waiting for Owen" }
  ],
  status: "open",
  updated: "2026-10-23T19:12:02.000Z"
}

/** The run, steered (P25):  two passes, the second running, an effort to pick, `task` taken. */
const STEERED: RunPage = {
  ...RUN,
  passes: [
    { name: "names", state: "done", done: 3, total: 3, calls: 1, ms: 6_000, started: "2026-10-23T19:11:50.000Z" },
    {
      name: "lines",
      state: "running",
      done: 212,
      total: 380,
      calls: 14,
      ms: 125_000,
      effort: "best",
      started: "2026-10-23T19:12:00.000Z"
    }
  ],
  effort: { choices: ["fast", "balanced", "best"], initial: "balanced" },
  taken: { task: "2026-10-23T19:12:30.000Z" }
}

/** The run's routes, as `fetch`:  the run (`waiting` as given), each answer, effort and Send echoed back. */
function fakeRoutes({
  waiting = true,
  page = RUN,
  answers: given = { rows: {} }
}: { waiting?: boolean; page?: RunPage; answers?: RunAnswers } = {}) {
  let answers: RunAnswers = given
  return vi.fn(async (url: string, init?: RequestInit): Promise<Response> => {
    if (!init?.method || init.method === "GET") return Response.json({ page, answers, waiting })
    const body = JSON.parse(init.body as string) as Record<string, unknown>
    if (url.endsWith("/answer")) {
      const { rowId, ...answer } = body
      answers = { ...answers, rows: { ...answers.rows, [rowId as string]: answer as never } }
    } else if (url.endsWith("/effort")) answers = { ...answers, effort: body.effort as string }
    else answers = { ...answers, sent: new Date().toISOString() }
    return Response.json({ ok: true, answers, waiting })
  })
}

/** The page's form for the run, on `routes`. */
function adoptForm(routes = fakeRoutes()) {
  const form = new RunForm(RUN.id, {
    page: `/runs/${RUN.id}/`,
    server: { token: "t" },
    protocol: "http:",
    fetch: routes as unknown as typeof fetch
  })
  RunForm.adopt(form)
  return { form, fetch: routes }
}

afterEach(() => {
  RunForm.adopt(undefined)
  vi.useRealTimers()
})

/** `host`'s shadow part `name`. */
function part<T extends HTMLElement = HTMLElement>(host: Element, name: string): T | null {
  return host.shadowRoot!.querySelector<T>(`[part~="${name}"]`)
}

/** `run`'s rows. */
function rows(run: Element): Element[] {
  return Array.from(run.shadowRoot!.querySelectorAll("epic-run-row"))
}

/** The POSTs `fetch` was asked, as `[url, body]`. */
function posts(fetch: ReturnType<typeof fakeRoutes>): [string, Record<string, unknown>][] {
  return fetch.mock.calls
    .filter(([, init]) => init?.method === "POST")
    .map(([url, init]) => [url, JSON.parse(init!.body as string) as Record<string, unknown>])
}

/** Draw the run page's body, its run read (the form's own read, as it connected, done). */
async function drawRun() {
  const run = await ElementFixture.render(`<epic-run run="${RUN.id}"></epic-run>`)
  await vi.waitFor(() => expect(RunForm.forPage(RUN.id).page).toBeDefined())
  await ElementFixture.settle()
  return run
}

////////////////
// ## Tests
////////////////

describe("<epic-run>, <epic-run-row>", () => {
  test("draws who waits, the progress, the heads and a row per thing to answer, the proposal in each box;  axe", async () => {
    adoptForm()
    const run = await drawRun()
    expect(run.matches(":state(waiting)")).toBe(true)
    expect(part(run, "who")!.textContent).toBe("spell translate todos --to es is waiting")
    expect(part(run, "description")!.textContent).toContain("Accept, type over")
    expect(part(run, "progress")!.textContent).toContain("waiting for Owen")
    expect(part(run, "progress")!.querySelector("summary")!.textContent).toBe("Progress · 2")
    expect(Array.from(part(run, "head")!.children, (head) => head.textContent)).toEqual(["English", "From", "Spanish"])
    const [task, done, todo] = rows(run) as [Element, Element, Element]
    expect(Array.from(task.shadowRoot!.querySelectorAll('[part~="cell"]'), (cell) => cell.textContent)).toEqual([
      "Task",
      "glossary"
    ])
    expect(part<HTMLTextAreaElement>(task, "box")!.value).toBe("Tarea")
    // the pick:  the proposal first, then the alternatives;  the box's value chosen
    const pills = Array.from(part(task, "picks")!.querySelectorAll("input"))
    expect(pills.map((pill) => [pill.value, pill.checked])).toEqual([
      ["Tarea", true],
      ["Faena", false],
      ["Labor", false]
    ])
    expect(part(done, "tick")!.textContent).toBe("Use for every project")
    expect(part(done, "details")!.querySelectorAll("li")).toHaveLength(2)
    expect(part(todo, "picks")).toBeNull()
    expect(part(todo, "tick")).toBeNull()
    expect(part(run, "state")!.textContent).toBe("0 of 3 answered · not sent")
    expect(part(run, "send")!.getAttribute("state")).toBe("unsent")
    await expectAccessible(run)
  })

  test("nobody waiting:  says why, no green dot", async () => {
    adoptForm(fakeRoutes({ waiting: false }))
    const run = await drawRun()
    expect(run.matches(":state(waiting)")).toBe(false)
    expect(part(run, "who")!.textContent).toBe("Nobody is waiting:  the command isn't running")
    RunForm.adopt(undefined)
    adoptForm(fakeRoutes({ page: { ...RUN, status: "done" } }))
    const finished = await drawRun()
    expect(part(finished, "who")!.textContent).toBe("The command finished:  nobody is waiting")
  })

  test("a run that ran out of time says so, with no green dot;  no passes and no effort:  no status card", async () => {
    adoptForm(fakeRoutes({ page: { ...RUN, status: "timed-out" } }))
    const run = await drawRun()
    expect(run.matches(":state(waiting)")).toBe(false)
    expect(run.matches(":state(ended)")).toBe(true)
    expect(part(run, "who")!.textContent).toBe("The command's wait ran out:  nobody is waiting")
    expect(part(run, "status")).toBeNull()
  })

  test("the status card draws a line per pass:  name, how far, calls, time;  only the running one has a bar;  axe", async () => {
    // the page's clock 10 s past what the command last wrote:  the running pass's time ticks on (Owen, 2026-10-23)
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-10-23T19:14:15.000Z"))
    adoptForm(fakeRoutes({ page: STEERED }))
    const run = await drawRun()
    const lines = Array.from(part(run, "passes")!.querySelectorAll('[part~="pass"]'))
    const cells = (line: Element) => Array.from(line.children, (cell) => cell.textContent!.trim())
    expect(lines.map((line) => [line.classList.contains("running"), ...cells(line)])).toEqual([
      [false, "names", "3 of 3", "1 call", "6 s"],
      [true, "lines", "212 of 380", "14 calls", "2 min 15 s at best"]
    ])
    expect(lines[0]!.querySelector("progress")).toBeNull()
    const bar = lines[1]!.querySelector("progress")!
    expect([bar.max, bar.value]).toEqual([380, 212])
    // with passes, the progress lines are only their fold, closed (Owen:  "Fold them away")
    expect(part(run, "progress")!.querySelector(".latest")).toBeNull()
    vi.useRealTimers()
    await expectAccessible(run)
  })

  test("the effort picker:  the run's effort chosen;  a pick saves at once, and takes effect at the next pass", async () => {
    const { fetch } = adoptForm(fakeRoutes({ page: STEERED }))
    const run = await drawRun()
    const picker = part(run, "effort")!
    const radios = Array.from(picker.querySelectorAll("input"))
    expect(radios.map((radio) => [radio.value, radio.checked])).toEqual([
      ["fast", false],
      ["balanced", true],
      ["best", false]
    ])
    expect(part(run, "effort-note")!.textContent).toBe("takes effect at the next pass")
    radios[2]!.click()
    await vi.waitFor(() => expect(posts(fetch)).toEqual([["/api/runs/demo/effort", { effort: "best" }]]))
    await ElementFixture.settle()
    expect(radios[2]!.checked).toBe(true)
    expect(RunForm.forPage(RUN.id).effort).toBe("best")
  })

  test("a taken row has its quiet mark;  changed after it was taken, the orange note", async () => {
    const answers: RunAnswers = {
      rows: { todo: { outcome: "typed", value: "Por hacer", at: "2026-10-23T19:12:10.000Z" } }
    }
    const page = { ...STEERED, taken: { task: "2026-10-23T19:12:30.000Z", todo: "2026-10-23T19:12:20.000Z" } }
    adoptForm(fakeRoutes({ page, answers }))
    const run = await drawRun()
    const [task, done, todo] = rows(run) as [Element, Element, Element]
    expect(task.matches(":state(taken)")).toBe(true)
    expect(part(task, "taken")!.textContent).toBe("taken")
    expect(part(task, "taken")!.title).toMatch(/^The run took this at \d\d:\d\d$/)
    expect(part(done, "taken")).toBeNull()
    // answered BEFORE it was taken:  no note
    expect(todo.matches(":state(changed-after-taken)")).toBe(false)
    // answered after:  the note
    part(task, "picks")!.querySelectorAll("input")[1]!.click()
    await ElementFixture.settle()
    expect(task.matches(":state(changed-after-taken)")).toBe(true)
    expect(part(task, "changed-after-taken")!.textContent).toBe("changed after the run took it")
  })

  test("typing saves the row half a second after the last keystroke:  `typed`, orange, with its reset", async () => {
    const { fetch } = adoptForm()
    const run = await drawRun()
    const [, , todo] = rows(run) as [Element, Element, Element]
    const box = part<HTMLTextAreaElement>(todo, "box")!
    vi.useFakeTimers()
    for (const text of ["Por", "Por hacer"]) {
      box.value = text
      box.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
    }
    expect(posts(fetch)).toEqual([])
    await vi.advanceTimersByTimeAsync(600)
    vi.useRealTimers()
    await ElementFixture.settle()
    expect(posts(fetch)).toEqual([
      ["/api/runs/demo/answer", expect.objectContaining({ rowId: "todo", outcome: "typed", value: "Por hacer" })]
    ])
    expect(todo.matches(":state(changed)")).toBe(true)
    expect(part(todo, "reset")).not.toBeNull()
    expect(part(run, "state")!.textContent).toBe("1 of 3 answered · not sent")
  })

  test("a pill picks its alternative into the box, saved at once:  `picked`;  the proposal's pill `accepted`", async () => {
    const { fetch } = adoptForm()
    const run = await drawRun()
    const [task] = rows(run) as [Element]
    const pills = Array.from(part(task, "picks")!.querySelectorAll("input"))
    pills[1]!.click()
    await ElementFixture.settle()
    expect(part<HTMLTextAreaElement>(task, "box")!.value).toBe("Faena")
    pills[0]!.click()
    await ElementFixture.settle()
    await vi.waitFor(() =>
      expect(posts(fetch).map(([, body]) => [body.outcome, body.value])).toEqual([
        ["picked", "Faena"],
        ["accepted", "Tarea"]
      ])
    )
    expect(task.matches(":state(changed)")).toBe(false)
  })

  test("the tick box saves at once, with the box's value", async () => {
    const { fetch } = adoptForm()
    const run = await drawRun()
    const [, done] = rows(run) as [Element, Element]
    part(done, "tick")!.querySelector("input")!.click()
    await ElementFixture.settle()
    expect(posts(fetch)).toEqual([
      [
        "/api/runs/demo/answer",
        expect.objectContaining({ rowId: "done", outcome: "accepted", value: "hecho", ticked: true })
      ]
    ])
  })

  test("Send saves what's waiting, then stamps sent:  `sent HH:MM`, its group outlined", async () => {
    const { fetch } = adoptForm()
    const run = await drawRun()
    const [, , todo] = rows(run) as [Element, Element, Element]
    const box = part<HTMLTextAreaElement>(todo, "box")!
    box.value = "Por hacer"
    box.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
    part(part(run, "send")!, "send")!.click()
    await vi.waitFor(() =>
      expect(posts(fetch).map(([url]) => url)).toEqual(["/api/runs/demo/answer", "/api/runs/demo/send"])
    )
    await vi.waitFor(() => expect(RunForm.forPage(RUN.id).isSending).toBe(false))
    await ElementFixture.settle()
    expect(run.matches(":state(sent)")).toBe(true)
    expect(part(run, "state")!.textContent).toMatch(/^1 of 3 answered · sent \d\d:\d\d$/)
    expect(part(run, "send")!.getAttribute("state")).toBe("sent")
  })

  test("a run's file changing reads it again:  a new progress line shows without a reload", async () => {
    const routes = fakeRoutes()
    adoptForm(routes)
    const run = await drawRun()
    const more = { ...RUN, progress: [...RUN.progress, { at: "2026-10-23T19:13:00.000Z", text: "still waiting" }] }
    routes.mockImplementation(async () => Response.json({ page: more, answers: { rows: {} }, waiting: true }))
    dispatchEvent(new CustomEvent("spell-server:changed", { detail: { path: "/pages/runs/demo/run.json5" } }))
    await vi.waitFor(() => expect(RunForm.forPage(RUN.id).page?.progress).toHaveLength(3))
    await ElementFixture.settle()
    expect(part(run, "progress")!.querySelector(".latest")!.textContent).toContain("still waiting")
  })

  test("a run's file changing redraws its passes and taken rows too", async () => {
    const routes = fakeRoutes()
    adoptForm(routes)
    const run = await drawRun()
    expect(part(run, "status")).toBeNull()
    routes.mockImplementation(async () => Response.json({ page: STEERED, answers: { rows: {} }, waiting: true }))
    dispatchEvent(new CustomEvent("spell-server:changed", { detail: { path: "/pages/runs/demo/run.json5" } }))
    await vi.waitFor(() => expect(RunForm.forPage(RUN.id).passes).toHaveLength(2))
    await ElementFixture.settle()
    expect(part(run, "passes")!.querySelectorAll('[part~="pass"]')).toHaveLength(2)
    expect(part(rows(run)[0]!, "taken")).not.toBeNull()
  })
})
