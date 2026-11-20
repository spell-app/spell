/**
 * `AuthenticatedPlaces`:  a page's reads of an authenticated place, passed on by the page server with the secret added,
 * and never sent back.
 * - A stand-in server that answers only with the secret, and says it back, so a test sees it scrubbed.
 */
import { createServer, type IncomingMessage } from "node:http"

import { afterEach, describe, expect, test } from "vite-plus/test"

import { AUTHENTICATED_PLACES_PREFIX, PAGE_SERVER_ANSWER_HEADER, STALE_TOKEN_ANSWER } from "spell/places/places.types"
import { SRV } from "spell/server"
import { AuthenticatedPlaces, type AuthenticatedPlace } from "spell/server/places"
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

/** The page server's side:  `places` read through it, with `from` its environment. */
async function pageServer(places: AuthenticatedPlace[], from: Record<string, string | undefined>) {
  const router = new SRV.Router()
  const guard = new SRV.Guard({ token: TOKEN })
  const served = AuthenticatedPlaces.for({ router, guard }, { from }).addSource({
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
  return { served, read }
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
