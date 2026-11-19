/**
 * Tests of `EpicLifecycle`, a card menu's work on a whole epic, in a scratch checkout (no git, no epic settings):
 * rename, complete, delete, resume (its launch a stand-in), and the routes over HTTP.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { PageServer } from "spell/server/page"
import { ask } from "spell/server/test/serve"

import { EpicConfig } from "spell/epic/config/EpicConfig"
import { EpicLifecycle } from "spell/epic/tool/EpicLifecycle"
import epicRoutes from "spell/epic/tool/epicRoutes"

const root = mkdtempSync(join(tmpdir(), "epic-lifecycle-"))
const epics = join(root, "epics")
// the scratch checkout has no docs tools:  the docs index isn't rebuilt, and says so on stderr
vi.spyOn(process.stderr, "write").mockImplementation(() => true)

afterAll(() => rmSync(root, { recursive: true, force: true }))

/** A lifecycle on the scratch checkout:  its launches recorded, no epic repo to commit. */
function lifecycle(launches: string[][] = []) {
  return new EpicLifecycle({
    root,
    commitShared: () => {},
    runEpic: async (args) => {
      launches.push(args)
      return { code: 0, out: "opened a new session\n" }
    }
  })
}

/** Make epic `name` with two phases (the first done) and an open question;  returns its lifecycle's tool. */
async function makeEpic(name: string) {
  const { commands } = lifecycle()
  for (const argv of [
    ["create", name, "--title", `Epic ${name}`],
    ["add-phase", name, "First", "--symptom", "<p>a</p>", "--changes", "<p>b</p>"],
    ["add-phase", name, "Second", "--symptom", "<p>c</p>", "--changes", "<p>d</p>"],
    ["phase", name, "1", "done", "--no-open"],
    ["add", name, "question", "Which way?"]
  ])
    expect(await commands.run(argv)).toBe(0)
}

beforeEach(() => {
  rmSync(epics, { recursive: true, force: true })
  mkdirSync(epics)
})

describe("EpicLifecycle.facts()", () => {
  test("what's left and what waits on the person;  nothing blocks it", async () => {
    await makeEpic("alpha")
    expect(lifecycle().facts("alpha")).toMatchObject({
      epic: "alpha",
      done: false,
      phases: 2,
      phasesLeft: 1,
      needsYou: ["Q1"],
      standing: false,
      home: false
    })
    expect(lifecycle().facts("alpha").blocked).toBeUndefined()
  })

  test("a worktree blocks it, and says so;  no such epic is a 404, a bad name a 400", async () => {
    await makeEpic("alpha")
    const worktree = EpicConfig.of(root).worktreeFolder("alpha")
    mkdirSync(worktree, { recursive: true })
    try {
      expect(lifecycle().facts("alpha").blocked).toMatch(/own VS Code window.*\n.*\/epic done/)
    } finally {
      rmSync(worktree, { recursive: true, force: true })
    }
    expect(() => lifecycle().facts("nope")).toThrow(expect.objectContaining({ status: 404 }))
    expect(() => lifecycle().facts("Not A Name")).toThrow(expect.objectContaining({ status: 400 }))
  })
})

describe("EpicLifecycle.rename()", () => {
  test("its folder, its files, its page, links to it, the favourites and the tooling home follow", async () => {
    await makeEpic("alpha")
    await makeEpic("beta")
    writeFileSync(join(epics, "alpha", "alpha.inbox.json5"), "{}\n")
    writeFileSync(join(epics, "favorites.json5"), '["alpha", "beta"]\n')
    writeFileSync(join(epics, "home.json5"), '{ "epic": "alpha", "set": "2026-11-19" }\n')
    const other = join(epics, "beta", "beta.plan.html")
    writeFileSync(
      other,
      readFileSync(other, "utf8").replace(
        "</body>",
        '<a href="../alpha/alpha.plan.html">a</a> <a href="/epics/alpha/alpha.plan.html#p1">b</a> ' +
          '<epic-link epic="alpha" item="T1"></epic-link> alpha stays in prose</body>'
      )
    )

    expect(await lifecycle().rename("alpha", "gamma")).toBe("/epics/gamma/gamma.plan.html")

    expect(existsSync(join(epics, "alpha"))).toBe(false)
    expect(existsSync(join(epics, "gamma", "gamma.inbox.json5"))).toBe(true)
    const page = readFileSync(join(epics, "gamma", "gamma.plan.html"), "utf8")
    expect(page).toMatch(/<epic-page[^>]*\sepic="gamma"/)
    expect(readFileSync(join(epics, "gamma", "parts", "log.html"), "utf8")).toContain("Renamed from alpha")
    const linking = readFileSync(other, "utf8")
    expect(linking).toContain('href="../gamma/gamma.plan.html"')
    expect(linking).toContain('href="/epics/gamma/gamma.plan.html#p1"')
    expect(linking).toContain('<epic-link epic="gamma"')
    expect(linking).toContain("alpha stays in prose")
    expect(readFileSync(join(epics, "favorites.json5"), "utf8")).toMatch(/"beta",\s*"gamma"/)
    expect(readFileSync(join(epics, "home.json5"), "utf8")).toContain('"epic": "gamma"')
  })

  test("refuses a taken name, a bad one, the same one, and a blocked epic", async () => {
    await makeEpic("alpha")
    await makeEpic("beta")
    await expect(lifecycle().rename("alpha", "beta")).rejects.toMatchObject({ status: 409 })
    await expect(lifecycle().rename("alpha", "Bad Name")).rejects.toMatchObject({ status: 400 })
    await expect(lifecycle().rename("alpha", "alpha")).rejects.toMatchObject({ status: 400 })
    const worktree = EpicConfig.of(root).worktreeFolder("alpha")
    mkdirSync(worktree, { recursive: true })
    try {
      await expect(lifecycle().rename("alpha", "gamma")).rejects.toMatchObject({ status: 409 })
    } finally {
      rmSync(worktree, { recursive: true, force: true })
    }
    expect(existsSync(join(epics, "alpha", "alpha.plan.html"))).toBe(true)
  })
})

describe("EpicLifecycle.complete()", () => {
  test("drops the phases left and cancels what waits on the person:  done as every list reads it", async () => {
    await makeEpic("alpha")
    expect(await lifecycle().complete("alpha")).toEqual({ dropped: [expect.any(String)], canceled: ["Q1"] })
    expect(lifecycle().facts("alpha")).toMatchObject({ done: true, phasesLeft: 0, needsYou: [] })
  })

  test("refuses an epic with no phases", async () => {
    expect(await lifecycle().commands.run(["create", "idea", "--future"])).toBe(0)
    await expect(lifecycle().complete("idea")).rejects.toMatchObject({ status: 409 })
  })
})

describe("EpicLifecycle.remove()", () => {
  test("deletes its folder and its star;  refuses the tooling home and a blocked epic", async () => {
    await makeEpic("alpha")
    await makeEpic("beta")
    writeFileSync(join(epics, "favorites.json5"), '["alpha", "beta"]\n')
    writeFileSync(join(epics, "home.json5"), '{ "epic": "beta" }\n')
    await lifecycle().remove("alpha")
    expect(existsSync(join(epics, "alpha"))).toBe(false)
    expect(readFileSync(join(epics, "favorites.json5"), "utf8")).not.toContain("alpha")
    await expect(lifecycle().remove("beta")).rejects.toMatchObject({ status: 409 })
    expect(existsSync(join(epics, "beta"))).toBe(true)
  })
})

describe("EpicLifecycle.resume()", () => {
  test('launches `epic window launch <name> --prompt "/epic resume <name>"`;  refuses a done epic', async () => {
    await makeEpic("alpha")
    const launches: string[][] = []
    expect(await lifecycle(launches).resume("alpha")).toBe("opened a new session")
    expect(launches).toEqual([["window", "launch", "alpha", "--prompt", "/epic resume alpha"]])
    await lifecycle().complete("alpha")
    await expect(lifecycle(launches).resume("alpha")).rejects.toMatchObject({ status: 409 })
    expect(launches).toHaveLength(1)
  })
})

////////////////
// ## The routes
////////////////

describe("the card menu's routes", () => {
  let server: PageServer
  let port: number

  beforeAll(async () => {
    server = new PageServer({ root })
    await epicRoutes.setup(server.routeContext())
    await server.start({ port: 0, routes: false, pidFile: false })
    port = server.info.port
  })

  afterAll(async () => server.stop())

  /** POST `body` to `path` from a page this server served;  the status and the answer. */
  async function post(path: string, body: unknown, token = server.web.guard.token) {
    const answer = await ask(port, "POST", path, {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json", "x-server-token": token, origin: `http://127.0.0.1:${port}` }
    })
    return { status: answer.status, body: JSON.parse(answer.text || "{}") }
  }

  test("GET answers the facts;  writes need the token", async () => {
    await makeEpic("alpha")
    const facts = await ask(port, "GET", "/api/epics/manage?epic=alpha")
    expect(JSON.parse(facts.text)).toMatchObject({ epic: "alpha", phasesLeft: 1, needsYou: ["Q1"] })
    expect((await post("/api/epics/manage/delete", { name: "alpha" }, "wrong")).status).toBe(403)
    expect(existsSync(join(epics, "alpha"))).toBe(true)
  })

  test("rename, complete and delete, each refusal in words", async () => {
    await makeEpic("alpha")
    expect(await post("/api/epics/manage/rename", { name: "alpha", to: "gamma" })).toEqual({
      status: 200,
      body: { page: "/epics/gamma/gamma.plan.html" }
    })
    expect((await post("/api/epics/manage/complete", { name: "gamma" })).body).toMatchObject({ canceled: ["Q1"] })
    expect(await post("/api/epics/manage/delete", { name: "nope" })).toEqual({
      status: 404,
      body: { error: "There's no epic called nope." }
    })
    expect((await post("/api/epics/manage/delete", { name: "gamma" })).status).toBe(200)
    expect(existsSync(join(epics, "gamma"))).toBe(false)
  })
})
