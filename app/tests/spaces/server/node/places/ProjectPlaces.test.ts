/**
 * End to end (epic `from-console` P14):  a program's authenticated web server, read by a PAGE through the page server,
 * which adds the secret;  the secret never reaches the page;  a secret that isn't set is named at startup, and the
 * page's read refused in those words.
 * - The program is compiled here, in a project with an address, and its declarations written where the page server
 *   reads them (`ProjectPlaces`).
 * - The page:  the compiled program run on the core with nothing that holds a key, as in a browser, its requests to
 *   its own server's addresses sent to the page server here.
 * - The place:  a stand-in server that answers only with the secret, and says it back.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs"
import { createServer } from "http"
import { tmpdir } from "os"
import { dirname, join } from "path"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { AUTHENTICATED_PLACES_PREFIX, PlaceError } from "spell/places"
import { SRV } from "spell/server"
import { AuthenticatedPlaces } from "spell/server/places"
import { serveHandler } from "spell/server/test/serve"
import { core } from "spell/parser/core"
import { SP } from "spell/parser/spell"
import { parseSpellProject, runSpellFiles } from "spell/parser/spell/test"
import "spell/app/spaces"
import { ProjectPlaces } from "spell/app/spaces/server/node/places/ProjectPlaces"
import { buildFolderFor } from "spell/app/spaces/server/node/projects/project-utils"
import environment from "spell/app/spaces/server/node/environment"

/** The project the program's in:  a test project's address, which no folder holds. */
const PROJECT = "@spell/test/jobs-board"

/** The secret the stand-in server wants. */
const SECRET = "s3cret-jobs-token"

/** This run's write token, as the page server hands its pages. */
const TOKEN = "this-run"

/** What to undo after each test. */
const closing: Array<() => void | Promise<void>> = []
afterEach(async () => {
  for (const close of closing.splice(0).reverse()) await close()
  vi.unstubAllGlobals()
})

/** The program:  an authenticated web server at `at`, and the jobs on it. */
function program(at: string): string[] {
  return [
    `board is a web server at "${at}":`,
    `\tit is authenticated with the secret "JOBS_TOKEN"`,
    `\tit is read only`,
    `a "job" is a thing:`,
    `\tit lives in the board`,
    `\tits "title" is text`
  ]
}

/** A stand-in for the place:  `/jobs` only with the secret as a bearer, saying back what it was sent. */
async function standIn(): Promise<{ url: string; sent: string[] }> {
  const sent: string[] = []
  const server = createServer((request, reply) => {
    const bearer = request.headers.authorization?.replace(/^Bearer /, "") ?? ""
    sent.push(bearer)
    const ok = bearer === SECRET && request.url === "/jobs"
    reply.writeHead(ok ? 200 : 401, { "content-type": "application/json" })
    reply.end(JSON.stringify(ok ? [{ id: "j-1", title: "Plumber", sentWith: bearer }] : { error: "who are you?" }))
  })
  const port = await SRV.listenPreferred(server)
  closing.push(
    () =>
      new Promise<void>((done) => {
        server.closeAllConnections()
        server.close(() => done())
      })
  )
  return { url: `http://127.0.0.1:${port}`, sent }
}

/**
 * The page server:  the project compiled, its declarations where `ProjectPlaces` reads them, and `from` its environment.
 * - SIDE EFFECT:  this test's page has the page server's token, and its requests to `/api/...` go there;
 *   every answer it got is in `seen`.
 */
async function pageServer(lines: string[], from: Record<string, string | undefined>) {
  const { files } = parseSpellProject([{ path: "/Jobs.spell", contents: `${lines.join("\n")}\n` }], {
    projectPath: PROJECT
  })
  expect(files[0]!.errors).toEqual([])
  // as a compile writes them:  its statements' declarations, under a header saying what wrote them
  const declarations = SP.SpellDeclarations.fromComments(
    `/*! SPELL: PROJECT {"spellVersion":"test"} */\n${files[0]!.compiled}`
  )!
  const buildDir = mkdtempSync(join(tmpdir(), "project-places-"))
  closing.push(() => rmSync(buildDir, { recursive: true, force: true }))
  const location = SP.SpellLocation.getProjectLocation(PROJECT)
  const folder = buildFolderFor(location.serverPath, { ...environment, buildDir })
  const file = join(folder, `${location.projectName}${SP.DECLARATIONS_JSON_SUFFIX}`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(declarations))

  const router = new SRV.Router()
  const guard = new SRV.Guard({ token: TOKEN })
  const places = AuthenticatedPlaces.for({ router, guard }, { from }).addSource(new ProjectPlaces({ from, buildDir }))
  const server = await serveHandler(router.handle)
  guard.allowPort(server.port)
  closing.push(() => server.close())

  // the page:  its server's token, and its own addresses on its server
  const seen: string[] = []
  const realFetch = globalThis.fetch
  vi.stubGlobal("SPELL_SERVER", { token: TOKEN })
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = `${input instanceof Request ? input.url : input}`
    seen.push(url)
    const answer = await realFetch(url.startsWith("/") ? `${server.base}${url}` : url, init)
    seen.push(await answer.clone().text())
    return answer
  })
  return { places, compiled: files[0]!.compiled, seen }
}

/** The program's jobs, read as its page reads them. */
async function jobsRead(lines: string[]): Promise<Array<Record<string, unknown>>> {
  core.resetRuntime()
  const { Job } = runSpellFiles([{ path: "/Jobs.spell", contents: lines.join("\n") }], { projectPath: PROJECT })("Job")
  delete (Job as { savedIn: { select?: unknown } }).savedIn.select
  return (await core.savedThings(Job as new () => unknown)).items as Array<Record<string, unknown>>
}

describe("an authenticated place, read by a page through the page server", () => {
  test("the page asks its own server;  the place gets the secret;  the page never sees it", async () => {
    const { url, sent } = await standIn()
    const lines = program(url)
    const { compiled, seen } = await pageServer(lines, { JOBS_TOKEN: SECRET })
    expect(compiled).toContain(`servedAt: "${AUTHENTICATED_PLACES_PREFIX}/${PROJECT}/board"`)

    const jobs = await jobsRead(lines)
    expect(jobs.map(({ title }) => title)).toEqual(["Plumber"])
    expect(sent).toEqual([SECRET])
    // every address it asked, every answer it got:  its own server's, and no secret in any
    expect(
      seen.filter((_, index) => index % 2 === 0).every((asked) => asked.startsWith(AUTHENTICATED_PLACES_PREFIX))
    ).toBe(true)
    expect(seen.join("\n")).not.toContain(SECRET)
    expect(seen.join("\n")).not.toContain(url)
  })

  test("a secret that isn't set:  named as the page server starts, and the page's read refused in those words", async () => {
    const { url, sent } = await standIn()
    const lines = program(url)
    const { places } = await pageServer(lines, {})
    const said: string[] = []
    await places.sayMissing((line) => said.push(line))
    expect(said).toEqual([
      `JOBS_TOKEN is not set:  the board place in ${PROJECT} needs it.  Set it where Spell's page server starts, then start it again`
    ])

    const read = jobsRead(lines)
    await expect(read).rejects.toBeInstanceOf(PlaceError)
    await expect(read).rejects.toMatchObject({ kind: "refused", message: said[0] })
    expect(sent).toEqual([])
  })

  test("its deployment, picked by SPELL_DEPLOYMENT from the project file, as spell run picks", () => {
    const places = { jobs: { dev: { at: "https://dev.acme.test", key: "JOBS_DEV_TOKEN" } } }
    expect(SP.SpellProject.deploymentsIn(places, "dev", PROJECT)).toEqual({
      jobs: { at: "https://dev.acme.test", key: "JOBS_DEV_TOKEN" }
    })
    expect(() => SP.SpellProject.deploymentsIn(places, "prod", PROJECT)).toThrow(/no place in .* named "prod"/)
  })
})
