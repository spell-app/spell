/**
 * A server's actions, really run:  compiled spell, on `core`, calling a stand-in server (epic `data` P50).
 * - Calling one, by a thing held or by its id;  its parameters;  steps before, while, after and when it fails.
 * - The worked example on the server actions details page is the last test here.
 */
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { core } from "spell/parser/core"
import { parseSpellProject, runSpell, runSpellFiles } from "spell/parser/spell/test"

const HOST = "https://jobs.test"

/** A stand-in server:  each request's method and address, answered from `routes` by `"METHOD address"`, else 404. */
function serve(routes: Record<string, unknown> = {}): string[] {
  const asked: string[] = []
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = `${input instanceof Request ? input.url : input instanceof URL ? input.href : input}`
    const method = (input instanceof Request ? input.method : init?.method) ?? "GET"
    const body = typeof init?.body === "string" ? ` ${init.body}` : ""
    asked.push(`${method} ${url}${body}`)
    const route = routes[`${method} ${url}`]
    if (typeof route === "number") return new Response("no", { status: route })
    return route === undefined ? new Response("no", { status: 404 }) : Response.json(route)
  })
  return asked
}

/** Each thing of `Class`, read from its place. */
async function read(Class: unknown): Promise<unknown[]> {
  return (await core.savedThings(Class as new () => unknown)).items as unknown[]
}

/** The job API's lines, as its own file starts. */
const PLACE = [
  `work is a web server at "${HOST}":`,
  '\t- jobs live at "/jobs"',
  '\t- to complete a job is at "/jobs/{id}/complete"',
  "a job is a thing:",
  "\t- it lives in work",
  '\t- its "status" is text'
]

afterEach(() => void vi.unstubAllGlobals())

describe("a server's action is a real action (epic `data` I101)", () => {
  test("described on its type, as one that can't be undone", () => {
    const { compiled, errors } = parseSpellProject([{ path: "/Jobs.spell", contents: PLACE.join("\n") }]).files[0]!
    expect(errors).toEqual([])
    expect(compiled).toContain(
      'core.describeAction(Job, "complete", { title: "Complete Job", callsServer: true, cantBeUndone: "keeps history" })'
    )
    expect([...core.actionsOf(class {}).keys()]).toEqual([])
  })

  test("its after step runs once the server has answered", async () => {
    const asked = serve({ [`GET ${HOST}/jobs`]: [{ id: 7, status: "open" }], [`POST ${HOST}/jobs/7/complete`]: {} })
    core.resetRuntime()
    const { Job } = runSpell([...PLACE, "after completing a job:", '\tset the job\'s status to "done"'])("Job")
    const job = (await read(Job))[0] as { status?: string; complete(): Promise<unknown> }
    await job.complete()
    expect(asked.filter((each) => each.startsWith("POST"))).toEqual([
      `POST ${HOST}/jobs/7/complete {"id":"7","status":"open"}`
    ])
    expect(job.status).toBe("done")
  })
})

describe("`if that fails:` under a line that's the last of its action (epic `data` I102)", () => {
  test("keeps the line, inside its try", () => {
    const lines = [...PLACE, "to finish a job:", "\tcomplete the job", "\tif that fails:", '\t\tprint "no"']
    const { compiled, errors } = parseSpellProject([{ path: "/Jobs.spell", contents: lines.join("\n") }]).files[0]!
    expect(errors).toEqual([])
    expect(compiled).toMatch(/try \{\s+await this\.complete\(\)\s+\}\s+catch \(error\) \{\s+core\.console\.log\("no"\)/)
  })
})

describe("the place's action line above its type (epic `data` I103)", () => {
  test("is the type's action, in one file or two", () => {
    const place = [`work is a web server at "${HOST}":`, '\t- to complete a job is at "/jobs/{id}/complete"']
    const job = ["a job is a thing", "\t- it lives in work", "to finish a job", "\tcomplete the job"]
    const one = parseSpellProject([{ path: "/Jobs.spell", contents: [...place, ...job].join("\n") }]).files[0]!
    expect(one.errors).toEqual([])
    expect(one.compiled).toContain("async complete() {")
    expect(one.compiled).not.toContain("completeAJob")
    const run = runSpellFiles([
      { path: "/Work.api.spell", contents: place.join("\n") },
      { path: "/Jobs.spell", contents: ["a job is a thing", "to finish a job", "\tcomplete the job"].join("\n") }
    ])
    expect(run).toBeTypeOf("function")
  })
})

/** The worked example on the server actions details page, its three files:  the API file, the app's, one page. */
function jobsProject(): (names: string) => Record<string, unknown> {
  const api = [
    `netbox is a web server at "${HOST}"`,
    '\tjobs live at "/api/jobs"',
    '\tto complete a job is at "/api/jobs/{id}/complete"',
    '\tto move a job to (queue as text) is at "/api/jobs/{id}/move/{queue}"',
    'a "job" is a thing',
    "\tit lives in netbox",
    '\tits "status" is text',
    '\tits "note" is text',
    "before completing a job",
    '\tcancel if the job\'s status is "done"',
    "after completing a job",
    '\tset the job\'s status to "done"',
    "if completing a job fails",
    '\tif the error is "not found"',
    "\t\tnevermind"
  ]
  const app = [
    "after completing a job",
    "\tset the job's note to the job's note && \"app\"",
    "when any server call fails",
    '\tif the error is "not authorized"',
    '\t\tprint "sign in"',
    '\totherwise if the error is "offline"',
    '\t\tprint "You\'re offline:  try again soon"',
    "\totherwise",
    "\t\tdo nothing"
  ]
  const page = [
    'a "jobs page" is a page',
    '\tits "busy note" is text',
    "while completing a job",
    '\tset the job\'s note to "busy"',
    '\tset the busy note to "Completing ..."',
    "after completing a job",
    '\tprint "page after"',
    "if completing a job fails",
    '\tif the error is "not permitted"',
    '\t\tprint "You can\'t complete jobs"',
    "\totherwise",
    "\t\tpass the error"
  ]
  core.resetRuntime()
  return runSpellFiles([
    { path: "/NetBox.api.spell", contents: api.join("\n") },
    { path: "/Jobs.spell", contents: app.join("\n") },
    { path: "/JobsPage.spell", contents: page.join("\n") }
  ])
}

type Job = {
  id?: string
  status?: string
  note?: string
  complete(): Promise<unknown>
  moveToQueue(queue: string): Promise<unknown>
}

describe("the steps around a server's action (epic `data` P50)", () => {
  test("before, while and after, in order:  the while step's change put back when the call ends", async () => {
    const asked = serve({
      [`GET ${HOST}/api/jobs`]: [{ id: 7, status: "open", note: "" }],
      [`POST ${HOST}/api/jobs/7/complete`]: {}
    })
    const { Job, JobsPage } = jobsProject()("Job, JobsPage")
    const page = new (JobsPage as new () => { busyNote?: string })()
    const job = (await read(Job))[0] as Job
    const notes: unknown[] = []
    const busyNotes: unknown[] = []
    const sent = asked.length
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      notes.push(job.note)
      busyNotes.push(page.busyNote)
      asked.push(
        `${init?.method ?? "GET"} ${input instanceof Request ? input.url : `${input instanceof URL ? input.href : input}`}`
      )
      return Response.json({})
    })
    await job.complete()
    const posts = asked.slice(sent).filter((each) => each.startsWith("POST"))
    expect(posts).toEqual([`POST ${HOST}/api/jobs/7/complete`])
    expect(notes[0]).toBe("busy")
    // the page's own field, from its file's while step (epic `data` I112), put back too
    expect(busyNotes[0]).toBe("Completing ...")
    expect(page.busyNote).toBe("")
    expect(job.status).toBe("done")
    // the app's after step ran, then the busy note went back
    expect(job.note).toBe("")
  })

  test("a before step's cancel:  nothing is sent", async () => {
    const asked = serve({ [`GET ${HOST}/api/jobs`]: [{ id: 7, status: "done" }] })
    const { Job } = jobsProject()("Job")
    const job = (await read(Job))[0] as Job
    await job.complete()
    expect(asked.filter((each) => each.startsWith("POST"))).toEqual([])
  })

  test("a failure:  the API file's step drops not found, the page's catches not permitted, the app's not authorized", async () => {
    const log = vi.spyOn(core.console, "log").mockImplementation(() => {})
    serve({ [`GET ${HOST}/api/jobs`]: [{ id: 7, status: "open" }], [`POST ${HOST}/api/jobs/7/complete`]: 404 })
    const { Job, JobsPage } = jobsProject()("Job, JobsPage")
    new (JobsPage as new () => object)()
    const job = (await read(Job))[0] as Job
    await expect(job.complete()).resolves.toBeUndefined()
    serve({ [`POST ${HOST}/api/jobs/7/complete`]: 403 })
    await expect(job.complete()).resolves.toBeUndefined()
    expect(log).toHaveBeenLastCalledWith("You can't complete jobs")
    serve({ [`POST ${HOST}/api/jobs/7/complete`]: 401 })
    await expect(job.complete()).resolves.toBeUndefined()
    expect(log).toHaveBeenLastCalledWith("sign in")
    // anything else:  the app's `otherwise do nothing` catches it, so Spell's notice stays away
    serve({ [`POST ${HOST}/api/jobs/7/complete`]: 500 })
    await expect(job.complete()).resolves.toBeUndefined()
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed")
    })
    await expect(job.complete()).resolves.toBeUndefined()
    expect(log).toHaveBeenLastCalledWith("You're offline:  try again soon")
    log.mockRestore()
  })

  test("a page's after step runs once the page is left;  its while step doesn't (epic `data` I116)", async () => {
    const log = vi.spyOn(core.console, "log").mockImplementation(() => {})
    serve({ [`GET ${HOST}/api/jobs`]: [{ id: 7, status: "open", note: "" }], [`POST ${HOST}/api/jobs/7/complete`]: {} })
    const { Job, JobsPage } = jobsProject()("Job, JobsPage")
    const page = new (JobsPage as new () => object)()
    const job = (await read(Job))[0] as Job
    // left:  moving from page to page isn't built, so the page is taken out of the pages made
    core.RUNTIME!.pages.splice(core.RUNTIME!.pages.indexOf(page as never), 1)
    const notes: unknown[] = []
    vi.stubGlobal("fetch", async () => {
      notes.push(job.note)
      return Response.json({})
    })
    await job.complete()
    // the while step didn't run:  the note was as it was when the call went out
    expect(notes[0]).toBe("")
    expect(log).toHaveBeenCalledWith("page after")
    log.mockRestore()
  })

  test("by its id:  read first;  none, and its failure steps hear not found", async () => {
    const asked = serve({ [`GET ${HOST}/api/jobs/7151`]: { id: 7151, status: "open" } })
    const { Job } = jobsProject()("Job")
    const missing = await core.savedThingOrMissing(Job as new () => Job, 99)
    await expect(Promise.resolve(missing.complete())).resolves.toBeUndefined()
    expect(asked.filter((each) => each.startsWith("POST"))).toEqual([])
  })

  test("another blank goes by name, filling its brace", async () => {
    const asked = serve({ [`GET ${HOST}/api/jobs`]: [{ id: 7 }], [`POST ${HOST}/api/jobs/7/move/night`]: {} })
    const { Job } = jobsProject()("Job")
    const job = (await read(Job))[0] as Job
    await job.moveToQueue("night")
    expect(asked.at(-1)).toBe(`POST ${HOST}/api/jobs/7/move/night {"id":"7","queue":"night"}`)
  })
})

describe("a second `to complete a job` wraps the server's (epic `data` I104, Q83)", () => {
  const api = [
    `netbox is a web server at "${HOST}"`,
    '\tjobs live at "/api/jobs"',
    '\tto complete a job is at "/api/jobs/{id}/complete"',
    'a "job" is a thing',
    "\tit lives in netbox",
    '\tits "note" is text'
  ]

  test("its steps run around the call, `call netbox` running it", async () => {
    const asked = serve({ [`GET ${HOST}/api/jobs`]: [{ id: 7, note: "" }], [`POST ${HOST}/api/jobs/7/complete`]: {} })
    core.resetRuntime()
    const wrapper = ["to complete a job", '\tprint "before"', "\tcall netbox", '\tprint "after"']
    const log = vi.spyOn(core.console, "log").mockImplementation(() => {})
    const { Job } = runSpellFiles([
      { path: "/NetBox.api.spell", contents: api.join("\n") },
      { path: "/Jobs.spell", contents: wrapper.join("\n") }
    ])("Job")
    const job = (await read(Job))[0] as Job
    await job.complete()
    expect(log.mock.calls.map(([line]) => line)).toEqual(["before", "after"])
    expect(asked.filter((each) => each.startsWith("POST"))).toHaveLength(1)
    log.mockRestore()
  })

  test("`call the server` only in the API file;  never calling it warns, in either language", () => {
    const project = parseSpellProject([
      { path: "/NetBox.api.spell", contents: api.join("\n") },
      { path: "/Jobs.spell", contents: ["to complete a job", "\tcall the server"].join("\n") },
      { path: "/Other.spell", contents: ["to complete a job", '\tprint "nothing sent"'].join("\n") }
    ])
    expect(project.files[1]!.errors.join()).toMatch(
      /only in its own API file:  here, call it by its name, "call netbox"/
    )
    expect(project.files[2]!.warnings.join()).toMatch(/never calls the server/)
  })
})

describe("the error's names", () => {
  test("one it doesn't know is refused, listing them;  in Spanish too", () => {
    const lines = [...PLACE, "if completing a job fails", '\tif the error is "broken"', "\t\tnevermind"]
    const { errors } = parseSpellProject([{ path: "/Jobs.spell", contents: lines.join("\n") }]).files[0]!
    expect(errors.join()).toMatch(/"broken" isn't a kind of error:  say one of "not found", "not authorized"/)
    const es = [
      "una tarea es una cosa",
      `trabajo es un servidor web en "${HOST}":`,
      '\t- para completar una tarea está en "/t/{id}"',
      "una tarea:",
      "\t- se guarda en trabajo",
      "si falla al completar una tarea",
      '\tsi el error es "límite"',
      "\t\tno importa"
    ]
    const spanish = parseSpellProject([{ path: "/T.es.spell", contents: es.join("\n") }]).files[0]!
    expect(spanish.errors).toEqual([])
    expect(spanish.compiled).toContain('core.errorIs(error, "limit")')
  })

  test("nevermind and pass the error only in a failure step", () => {
    const { errors } = parseSpellProject([{ path: "/T.spell", contents: "to go\n\tnevermind\n\tpass the error" }])
      .files[0]!
    expect(errors).toHaveLength(2)
  })
})
