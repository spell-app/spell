/**
 * `AuthenticatedPlaces`:  a page's reads of an authenticated place, passed on by the page server with the secret added,
 * and never sent back.
 * - A stand-in server that answers only with the secret, and says it back, so a test sees it scrubbed.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { createServer, type IncomingMessage } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, test } from "vite-plus/test"

import { AUTHENTICATED_PLACES_PREFIX, PAGE_SERVER_ANSWER_HEADER, STALE_TOKEN_ANSWER } from "spell/places/places.types"
import { SAVED_ANSWER_HEADER } from "spell/places/SavedAnswers"
import { SRV } from "spell/server"
import {
  AuthenticatedPlaces,
  TOKENS_ROUTE,
  type AuthenticatedPlace,
  type AuthenticatedPlacesProps
} from "spell/server/places"
import { ask, serveHandler } from "spell/server/test/serve"

/** The secret the stand-in server wants. */
const SECRET = "s3cret-jobs-token"

/** This run's write token. */
const TOKEN = "this-run"

/** What to close after each test. */
const closing: Array<() => Promise<void>> = []
afterEach(async () => {
  for (const close of closing.splice(0)) await close()
})

/**
 * A stand-in authenticated server:  `/jobs` with the secret as a bearer, in `X-Api-Key`, or as `?api_key=`;
 * a 401 without it.  Its answer says the secret back, and its own next page's address.
 * - `/token`:  a token service, turning `id:SECRET` into a token.
 */
async function standIn(): Promise<{ url: string; asked: Array<{ method: string; url: string; body: string }> }> {
  const asked: Array<{ method: string; url: string; body: string }> = []
  const server = createServer(async (request: IncomingMessage, reply) => {
    const body = await new Promise<string>((done) => {
      let text = ""
      request.on("data", (chunk: Buffer) => (text += chunk))
      request.on("end", () => done(text))
    })
    asked.push({ method: request.method!, url: request.url!, body })
    const address = new URL(request.url!, "http://stand.in")
    if (address.pathname === "/token") {
      const basic = Buffer.from(`id:${SECRET}`).toString("base64")
      const ok = request.headers.authorization === `Basic ${basic}`
      reply.writeHead(ok ? 200 : 401, { "content-type": "application/json" })
      return reply.end(JSON.stringify(ok ? { token: "minted-token", expires_in: 3600 } : { error: "no" }))
    }
    const sent =
      request.headers.authorization?.replace(/^Bearer /, "") ??
      (request.headers["x-api-key"] as string | undefined) ??
      address.searchParams.get("api_key") ??
      undefined
    if (sent !== SECRET && sent !== "minted-token") {
      reply.writeHead(401, { "content-type": "application/json" })
      return reply.end(JSON.stringify({ error: "who are you?" }))
    }
    reply.writeHead(200, { "content-type": "application/json", link: `<${base}/jobs?page=2>; rel="next"` })
    reply.end(JSON.stringify({ rows: [{ id: "j-1", title: "Plumber" }], youSent: sent, next: `${base}/jobs?page=2` }))
  })
  const port = await SRV.listenPreferred(server)
  const base = `http://127.0.0.1:${port}`
  closing.push(
    () =>
      new Promise<void>((done) => {
        server.closeAllConnections()
        server.close(() => done())
      })
  )
  return { url: base, asked }
}

/** The page server's side:  `places` read through it, with `from` its environment, and `more` of its props. */
async function pageServer(
  places: AuthenticatedPlace[],
  from: Record<string, string | undefined>,
  more: AuthenticatedPlacesProps = {}
) {
  const router = new SRV.Router()
  const guard = new SRV.Guard({ token: TOKEN })
  const kept = { kept: () => undefined, keep: () => undefined }
  const served = AuthenticatedPlaces.for({ router, guard }, { from, kept, ...more }).addSource({
    placeIn: (path) => {
      const place = places.find(
        ({ project, name }) => path === `${project}/${name}` || path.startsWith(`${project}/${name}/`)
      )
      if (!place) return undefined
      const prefix = `${place.project}/${place.name}`
      return { place, served: prefix, rest: path.slice(prefix.length) }
    },
    every: () => places
  })
  const server = await serveHandler(router.handle)
  guard.allowPort(server.port)
  closing.push(() => server.close())
  const read = (path: string, init: { method?: string; body?: string; token?: string } = {}) =>
    ask(server.port, init.method ?? "GET", `${AUTHENTICATED_PLACES_PREFIX}/${path}`, {
      headers: {
        host: `127.0.0.1:${server.port}`,
        "content-type": "application/json",
        "x-server-token": init.token ?? TOKEN
      },
      ...(init.body !== undefined && { body: init.body })
    })
  const tokens = async () => ask(server.port, "GET", TOKENS_ROUTE, { headers: { host: `127.0.0.1:${server.port}` } })
  return { served, read, tokens }
}

/** A place in `@acme/jobs` at `at`. */
function jobs(at: string, more: Partial<AuthenticatedPlace> = {}): AuthenticatedPlace {
  return { project: "@acme/jobs", name: "jobs", kind: "web server", at, keyNamed: "JOBS_TOKEN", ...more }
}

describe("a page's read, passed on", () => {
  test("goes to the place's own address with the secret, and comes back with the secret and the address taken out", async () => {
    const { url, asked } = await standIn()
    const { read } = await pageServer([jobs(url)], { JOBS_TOKEN: SECRET })
    const answer = await read("@acme/jobs/jobs/jobs?page=1")
    expect(answer.status).toBe(200)
    expect(asked[0]).toMatchObject({ method: "GET", url: "/jobs?page=1" })
    expect(answer.text).not.toContain(SECRET)
    expect(answer.text).not.toContain(url)
    expect(JSON.parse(answer.text)).toEqual({
      rows: [{ id: "j-1", title: "Plumber" }],
      youSent: "[the key JOBS_TOKEN]",
      next: `${AUTHENTICATED_PLACES_PREFIX}/@acme/jobs/jobs/jobs?page=2`
    })
    expect(answer.headers.link).toBe(`<${AUTHENTICATED_PLACES_PREFIX}/@acme/jobs/jobs/jobs?page=2>; rel="next"`)
    expect(answer.headers["cache-control"]).toBe("no-store")
  })

  test("in the header or the address its line says", async () => {
    const { url, asked } = await standIn()
    const header = await pageServer([jobs(url, { keyGoes: { header: "X-Api-Key" } })], { JOBS_TOKEN: SECRET })
    expect((await header.read("@acme/jobs/jobs/jobs")).status).toBe(200)
    const inAddress = await pageServer([jobs(url, { keyGoes: { inAddress: "api_key" } })], { JOBS_TOKEN: SECRET })
    const answer = await inAddress.read("@acme/jobs/jobs/jobs")
    expect(answer.status).toBe(200)
    expect(asked.at(-1)!.url).toBe(`/jobs?api_key=${SECRET}`)
    expect(answer.text).not.toContain(SECRET)
  })

  test("a token made from the secret, at its token service, kept for the next read", async () => {
    const { url, asked } = await standIn()
    const { read } = await pageServer([jobs(url, { tokenFrom: `${url}/token` })], { JOBS_TOKEN: `id:${SECRET}` })
    expect((await read("@acme/jobs/jobs/jobs")).status).toBe(200)
    expect((await read("@acme/jobs/jobs/jobs")).text).not.toContain("minted-token")
    expect(asked.filter(({ url }) => url === "/token")).toHaveLength(1)
  })

  test("a write goes on with its body;  read only, it's refused, and nothing's sent", async () => {
    const { url, asked } = await standIn()
    const writes = await pageServer([jobs(url)], { JOBS_TOKEN: SECRET })
    const body = JSON.stringify({ title: "Welder" })
    expect((await writes.read("@acme/jobs/jobs/jobs", { method: "POST", body })).status).toBe(200)
    expect(asked.at(-1)).toMatchObject({ method: "POST", body })
    const readOnly = await pageServer([jobs(url, { readOnly: true })], { JOBS_TOKEN: SECRET })
    const refused = await readOnly.read("@acme/jobs/jobs/jobs", { method: "POST", body })
    expect(refused.status).toBe(422)
    expect(refused.headers[PAGE_SERVER_ANSWER_HEADER]).toBe("refused")
    expect(JSON.parse(refused.text)).toMatchObject({ kind: "refused", error: expect.stringMatching(/read only/) })
    expect(asked).toHaveLength(1)
  })

  test("read only, a GET to a route its lines list as a write is refused too:  a load changes things", async () => {
    const { url, asked } = await standIn()
    const readOnly = jobs(url, { readOnly: true, writes: ["/designs/{design_id}/load", "/jobs/{id}/complete"] })
    const { read } = await pageServer([readOnly], { JOBS_TOKEN: SECRET })
    const refused = await read("@acme/jobs/jobs/designs/top-level/load?force=1")
    expect(refused.status).toBe(422)
    expect(JSON.parse(refused.text)).toMatchObject({ kind: "refused", error: expect.stringMatching(/read only/) })
    expect(asked).toHaveLength(0)
    expect((await read("@acme/jobs/jobs/jobs")).status).toBe(200)
    expect(asked).toHaveLength(1)
  })

  test("a read only graphql server still takes its reads, which are POSTs, and refuses a mutation", async () => {
    const { url, asked } = await standIn()
    const graph = jobs(url, { kind: "graphql server", readOnly: true })
    const { read } = await pageServer([graph], { JOBS_TOKEN: SECRET })
    const query = JSON.stringify({ query: "{ jobs { id } }" })
    expect((await read("@acme/jobs/jobs", { method: "POST", body: query })).status).toBe(200)
    const mutation = JSON.stringify({ query: "mutation { addJob(input: {}) { id } }" })
    expect((await read("@acme/jobs/jobs", { method: "POST", body: mutation })).status).toBe(422)
    expect(asked).toHaveLength(1)
  })

  test("behind the guard, reads too:  no write token, no read;  a path no place has, not found", async () => {
    const { url, asked } = await standIn()
    const { read } = await pageServer([jobs(url)], { JOBS_TOKEN: SECRET })
    const stale = await read("@acme/jobs/jobs/jobs", { token: "stale" })
    expect(stale.status).toBe(403)
    // marked, so the page asks again once it has the new token, rather than taking it as refused (I29)
    expect(stale.headers[PAGE_SERVER_ANSWER_HEADER]).toBe(STALE_TOKEN_ANSWER)
    expect((await read("@acme/other/place")).status).toBe(404)
    expect(asked).toHaveLength(0)
  })
})

describe("a secret that isn't set", () => {
  test("a read is refused in words that name it and the place, never a value", async () => {
    const { url, asked } = await standIn()
    const { read } = await pageServer([jobs(url)], {})
    const answer = await read("@acme/jobs/jobs/jobs")
    expect(answer.status).toBe(422)
    expect(answer.headers[PAGE_SERVER_ANSWER_HEADER]).toBe("refused")
    expect(JSON.parse(answer.text).error).toBe(
      "JOBS_TOKEN is not set:  the jobs place in @acme/jobs needs it.  Set it where Spell's page server starts, then start it again"
    )
    expect(asked).toHaveLength(0)
  })

  test("is said as the page server starts, one line each, only the ones not set", async () => {
    const { served } = await pageServer(
      [jobs("https://jobs.acme.test"), jobs("https://hr.acme.test", { name: "people", keyNamed: "HR_TOKEN" })],
      { HR_TOKEN: "set" }
    )
    const said: string[] = []
    await served.sayMissing((line) => said.push(line))
    expect(said).toEqual([
      "JOBS_TOKEN is not set:  the jobs place in @acme/jobs needs it.  Set it where Spell's page server starts, then start it again"
    ])
    expect(said.join()).not.toContain("set,")
  })
})

/** A folder of saved answers:  `jobs.json`, three rows, and `jobs/j-1.json`;  gone after the test. */
function savedAnswers(): string {
  const folder = mkdtempSync(join(tmpdir(), "spell-saved-answers-"))
  closing.push(async () => rmSync(folder, { recursive: true, force: true }))
  mkdirSync(join(folder, "jobs"))
  const rows = [
    { id: "j-1", title: "Plumber", next: "https://jobs.acme.test/jobs/j-2" },
    { id: "j-2", title: "Welder" },
    { id: "j-3", title: "Baker" }
  ]
  writeFileSync(join(folder, "jobs.json"), JSON.stringify(rows))
  writeFileSync(join(folder, "jobs", "j-1.json"), JSON.stringify(rows[0]))
  return folder
}

/** An address nothing answers at:  a port listened on, then closed. */
async function nobodyThere(): Promise<string> {
  const server = createServer()
  const port = await SRV.listenPreferred(server)
  await new Promise<void>((done) => server.close(() => done()))
  return `http://127.0.0.1:${port}`
}

describe("saved answers", () => {
  test("a read its server doesn't answer is answered from them, paged, marked saved;  a thing by its id too", async () => {
    const at = await nobodyThere()
    const { read } = await pageServer([jobs(at, { fixtures: savedAnswers() })], { JOBS_TOKEN: SECRET })
    const page = await read("@acme/jobs/jobs/jobs?limit=2&offset=0")
    expect(page.status).toBe(200)
    expect(page.headers[SAVED_ANSWER_HEADER]).toBe("saved")
    expect(JSON.parse(page.text).map(({ id }: { id: string }) => id)).toEqual(["j-1", "j-2"])
    expect(JSON.parse((await read("@acme/jobs/jobs/jobs?limit=2&offset=2")).text)).toHaveLength(1)
    expect(JSON.parse((await read("@acme/jobs/jobs/jobs/j-1")).text)).toMatchObject({ title: "Plumber" })
    // nothing saved for it:  the server's own failure
    expect((await read("@acme/jobs/jobs/people")).status).toBe(502)
  })

  test("a refusal for its token, a 5xx, or a secret not set:  saved;  a server that answers:  live", async () => {
    const { url, asked } = await standIn()
    const notSet = await pageServer([jobs(url, { fixtures: savedAnswers() })], {})
    const saved = await notSet.read("@acme/jobs/jobs/jobs")
    expect(saved.headers[SAVED_ANSWER_HEADER]).toBe("saved")
    expect(asked).toHaveLength(0)
    const wrong = await pageServer([jobs(url, { fixtures: savedAnswers() })], { JOBS_TOKEN: "not-the-secret" })
    expect((await wrong.read("@acme/jobs/jobs/jobs")).headers[SAVED_ANSWER_HEADER]).toBe("saved")
    const live = await pageServer([jobs(url, { fixtures: savedAnswers() })], { JOBS_TOKEN: SECRET })
    const answer = await live.read("@acme/jobs/jobs/jobs")
    expect(answer.headers[SAVED_ANSWER_HEADER]).toBeUndefined()
    expect(JSON.parse(answer.text)).toMatchObject({ youSent: "[the key JOBS_TOKEN]" })
  })

  test("offline:  read from them alone, its server never asked;  a write refused;  nothing saved, not found", async () => {
    const { url, asked } = await standIn()
    const { read } = await pageServer([jobs(url, { fixtures: savedAnswers(), offline: true })], { JOBS_TOKEN: SECRET })
    expect((await read("@acme/jobs/jobs/jobs")).headers[SAVED_ANSWER_HEADER]).toBe("saved")
    expect((await read("@acme/jobs/jobs/people")).status).toBe(404)
    const write = await read("@acme/jobs/jobs/jobs", { method: "POST", body: "{}" })
    expect(write.status).toBe(422)
    expect(JSON.parse(write.text).error).toMatch(/offline/)
    expect(asked).toHaveLength(0)
  })

  test("offline for some paths:  those from them, the rest live", async () => {
    const { url, asked } = await standIn()
    const place = jobs(url, { fixtures: savedAnswers(), offline: ["/jobs/j-1"] })
    const { read } = await pageServer([place], { JOBS_TOKEN: SECRET })
    expect((await read("@acme/jobs/jobs/jobs/j-1")).headers[SAVED_ANSWER_HEADER]).toBe("saved")
    expect((await read("@acme/jobs/jobs/jobs")).headers[SAVED_ANSWER_HEADER]).toBeUndefined()
    expect(asked).toHaveLength(1)
  })
})

/** A made-up JWT, unsigned, from `issued` to `ends` (msec):  only its claims are read. */
function jwt(issued: number, ends: number, mark = "a"): string {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url")
  return `${part({ alg: "none" })}.${part({ iat: Math.floor(issued / 1000), exp: Math.floor(ends / 1000), mark })}.sig`
}

/**
 * A made-up server whose sign-in token renews itself:  `GET /auth/refresh` with a live token, a new one, 8 hours;
 * `GET /jobs`, for the latest only, saying it back.
 */
function renewingServer() {
  const hour = 3_600_000
  const state = { latest: jwt(Date.now() - 7.5 * hour, Date.now() + 0.5 * hour, "given"), refreshes: 0 }
  const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(`${input instanceof Request ? input.url : input}`)
    const sent = new Headers(init?.headers).get("authorization")?.replace(/^Bearer /, "")
    if (sent !== state.latest) return Response.json({ error: "who are you?" }, { status: 401 })
    if (url.pathname === "/auth/refresh") {
      state.refreshes++
      state.latest = jwt(Date.now(), Date.now() + 8 * hour, `r${state.refreshes}`)
      return Response.json({ access_token: state.latest })
    }
    return Response.json({ rows: [{ id: "j-1" }], youSent: sent })
  }) as typeof globalThis.fetch
  return { fetch, state, given: state.latest }
}

describe("a token that renews itself", () => {
  test("renewed at its refresh route before it runs out, kept, sent, and never sent back", async () => {
    const { fetch, state, given } = renewingServer()
    const kept = new Map<string, string>()
    const store = {
      kept: (name: string) => kept.get(name),
      keep: (name: string, value: string) => void kept.set(name, value)
    }
    const said: string[] = []
    const place = jobs("https://jobs.acme.test", { renewsAt: "/auth/refresh" })
    const { read, served } = await pageServer(
      [place],
      { JOBS_TOKEN: given },
      { fetch, kept: store, say: (line) => said.push(line) }
    )
    const answer = await read("@acme/jobs/jobs/jobs")
    expect(answer.status).toBe(200)
    expect(state.refreshes).toBe(1)
    expect(kept.get("JOBS_TOKEN")).toBe(state.latest)
    expect(answer.text).not.toContain(state.latest)
    expect(said).toEqual([
      expect.stringMatching(/^renewed JOBS_TOKEN:  it has 4\d\d minutes left \(the jobs place in @acme\/jobs\)$/)
    ])
    // the renewed one lasts:  read again, nothing renewed
    await read("@acme/jobs/jobs/jobs")
    expect(state.refreshes).toBe(1)
    const [report] = await served.tokens()
    expect(report).toMatchObject({ project: "@acme/jobs", place: "jobs", secret: "JOBS_TOKEN", state: "ok" })
    expect(report!.minutesLeft).toBeGreaterThan(470)
  })

  test("of the environment's and the one kept, the one that lasts longer is sent:  a renewal outlives a restart", async () => {
    const { fetch, state, given } = renewingServer()
    const fresher = jwt(Date.now(), Date.now() + 8 * 3_600_000, "kept")
    state.latest = fresher
    const store = { kept: () => fresher, keep: () => undefined }
    const place = jobs("https://jobs.acme.test", { renewsAt: "/auth/refresh" })
    const { read } = await pageServer([place], { JOBS_TOKEN: given }, { fetch, kept: store })
    expect((await read("@acme/jobs/jobs/jobs")).status).toBe(200)
    expect(state.refreshes).toBe(0)
  })

  test("how each token is, at the tokens route:  never a token, with the line that fixes one", async () => {
    const { fetch, given } = renewingServer()
    const places = [
      jobs("https://jobs.acme.test", { renewsAt: "/auth/refresh" }),
      jobs("https://hr.acme.test", { name: "people", keyNamed: "HR_TOKEN" })
    ]
    const { tokens } = await pageServer(places, { JOBS_TOKEN: given }, { fetch })
    const answer = await tokens()
    expect(answer.status).toBe(200)
    expect(answer.text).not.toContain(given)
    expect(JSON.parse(answer.text)).toEqual([
      { project: "@acme/jobs", place: "jobs", secret: "JOBS_TOKEN", state: "ok", minutesLeft: expect.any(Number) },
      {
        project: "@acme/jobs",
        place: "people",
        secret: "HR_TOKEN",
        state: "missing",
        fix: "Keep a fresh HR_TOKEN in ~/.spell/secrets/HR_TOKEN (or the page server's environment):  the page server reads it at once"
      }
    ])
  })

  test("looked at every few minutes, so it renews while nobody reads", async () => {
    const { fetch, state, given } = renewingServer()
    const place = jobs("https://jobs.acme.test", { renewsAt: "/auth/refresh" })
    const { served } = await pageServer([place], { JOBS_TOKEN: given }, { fetch })
    const stop = served.keepRenewing(60_000)
    closing.push(async () => stop())
    await expect.poll(() => state.refreshes).toBe(1)
  })
})
