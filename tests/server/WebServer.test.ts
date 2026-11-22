import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { createServer, request as httpRequest, type IncomingMessage, type Server } from "node:http"
import { connect as http2Connect } from "node:http2"
import { request as httpsRequest } from "node:https"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test"

import { SRV } from "spell/server"
// the leaf, not the `site` barrel:  that's browser code (`SiteHeader extends HTMLElement`)
import { FAVICON_SVG } from "spell/server/site/favicon"
import { ask } from "spell/server/test/serve"

describe("WebServer's favicon", () => {
  const root = mkdtempSync(join(tmpdir(), "srv-web-"))
  let live: SRV.WebServer
  let plain: SRV.WebServer
  let mine: SRV.WebServer

  beforeAll(async () => {
    writeFileSync(join(root, "page.html"), "<!doctype html><html><head><title>T</title></head><body>P</body></html>\n")
    writeFileSync(
      join(root, "own.html"),
      `<!doctype html><head><link href="x.svg" rel="icon"></head><body><code>&lt;link rel="icon"&gt;</code></body>\n`
    )
    writeFileSync(join(root, "body.html"), `<!doctype html><head></head><body><link rel="icon" href="x.svg"></body>\n`)
    mkdirSync(join(root, "own"))
    writeFileSync(join(root, "own", "favicon.ico"), "ICO")
    writeFileSync(join(root, "own", "favicon.svg"), "<svg>own</svg>")
    live = new SRV.WebServer({ live: true, mounts: [{ prefix: "/", dir: root }] })
    plain = new SRV.WebServer({ mounts: [{ prefix: "/", dir: root }] })
    // a folder with its own favicon.ico and favicon.svg at `/`:  they win
    mine = new SRV.WebServer({ mounts: [{ prefix: "/", dir: join(root, "own") }] })
    // an SPA's fallback answers everything else:  `/favicon.ico` still comes first
    plain.fallback.get("/*", (_request, reply) => reply.send("<!doctype html>SPA"))
    await Promise.all([live.listen(), plain.listen(), mine.listen()])
  })

  afterAll(async () => {
    await Promise.all([live.close(), plain.close(), mine.close()])
    rmSync(root, { recursive: true, force: true })
  })

  it("serves the SVG, the PNGs and /favicon.ico, live or not", async () => {
    for (const server of [live, plain]) {
      const svg = await ask(server.port, "GET", "/favicon.svg")
      expect(svg.status).toBe(200)
      expect(svg.headers["content-type"]).toBe("image/svg+xml")
      expect(svg.text).toBe(FAVICON_SVG)
      expect(svg.headers["cache-control"]).toMatch(/max-age/)
      for (const path of [SRV.FAVICON_PNG, "/apple-touch-icon.png", "/favicon.ico"]) {
        const png = await ask(server.port, "GET", path)
        expect(png.status, path).toBe(200)
        expect(png.headers["content-type"], path).toBe("image/png")
        expect(png.text.slice(1, 4), path).toBe("PNG")
      }
    }
    expect((await ask(plain.port, "HEAD", "/favicon.ico")).status).toBe(200)
    expect((await ask(plain.port, "GET", "/other")).text).toContain("SPA")
  })

  it("lets a folder's own icons win", async () => {
    expect((await ask(mine.port, "GET", "/favicon.ico")).text).toBe("ICO")
    expect((await ask(mine.port, "GET", "/favicon.svg")).text).toBe("<svg>own</svg>")
    expect((await ask(mine.port, "GET", "/apple-touch-icon.png")).headers["content-type"]).toBe("image/png")
  })

  it("answers nothing at the old /_server/ paths", async () => {
    for (const path of ["/_server/favicon.svg", "/_server/live.js"])
      expect((await ask(live.port, "GET", path)).status, path).toBe(404)
  })

  it("injects the icon links into live pages, before </head>", async () => {
    const page = (await ask(live.port, "GET", "/page.html")).text
    expect(page).toContain(SRV.FAVICON_LINKS)
    expect(page.indexOf(`rel="icon"`)).toBeLessThan(page.indexOf("</head>"))
    expect(page.indexOf(`href="${SRV.FAVICON_PNG}" sizes="32x32"`)).toBeLessThan(page.indexOf("favicon.svg"))
    expect(page).toContain(`<link rel="apple-touch-icon" href="/apple-touch-icon.png">`)
  })

  it("never duplicates a page's own icon;  a link outside <head> doesn't count", async () => {
    const own = (await ask(live.port, "GET", "/own.html")).text
    expect(own).not.toContain(`href="/favicon.svg"`)
    expect(own).toContain(`<script src="/api/server/live.js" defer></script>`)
    expect((await ask(live.port, "GET", "/body.html")).text).toContain(SRV.FAVICON_LINKS)
  })

  it("injects nothing into pages of a server that isn't live", async () => {
    expect((await ask(plain.port, "GET", "/page.html")).text).not.toContain(`href="/favicon.svg"`)
  })
})

// epic `epic-engine` I293:  after a restart, a page reloads only when a script it runs changed
describe("WebServer's /api/server/versions", () => {
  const root = mkdtempSync(join(tmpdir(), "srv-versions-"))
  let live: SRV.WebServer

  beforeAll(async () => {
    writeFileSync(join(root, "app.js"), "console.log(1)\n")
    live = new SRV.WebServer({ live: true, mounts: [{ prefix: "/", dir: root }] })
    await live.listen()
  })

  afterAll(async () => {
    await live.close()
    rmSync(root, { recursive: true, force: true })
  })

  /** what the server says each of `paths` holds */
  async function versions(...paths: string[]): Promise<Record<string, string | null>> {
    const query = paths.map((path) => `path=${encodeURIComponent(path)}`).join("&")
    const answer = await ask(live.port, "GET", `${SRV.LIVE_VERSIONS}?${query}`)
    expect(answer.status).toBe(200)
    const body = JSON.parse(answer.text) as SRV.LiveVersions
    expect(body.token).toBe(live.guard.token)
    expect(body.run).toBe(live.live?.run)
    return body.versions
  }

  it("hashes each served file;  none for a missing one;  the live client's own text", async () => {
    const first = await versions("/app.js", "/gone.js", SRV.LIVE_SCRIPT)
    expect(first["/app.js"]).toMatch(/^[0-9a-f]{40}$/)
    expect(first["/gone.js"]).toBeNull()
    expect(first[SRV.LIVE_SCRIPT]).toMatch(/^[0-9a-f]{40}$/)
    // rewritten with the same text:  the same;  changed:  another
    writeFileSync(join(root, "app.js"), "console.log(1)\n")
    expect((await versions("/app.js"))["/app.js"]).toBe(first["/app.js"])
    writeFileSync(join(root, "app.js"), "console.log(2)\n")
    expect((await versions("/app.js"))["/app.js"]).not.toBe(first["/app.js"])
  })
})

/** A certificate for `localhost` and `127.0.0.1`, made by openssl in `folder`;  `undefined` without openssl. */
function testCertificate(folder: string): SRV.CertificateFiles | undefined {
  const [key, cert] = [join(folder, "key.pem"), join(folder, "cert.pem")]
  const named = spawnSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "ec",
      "-pkeyopt",
      "ec_paramgen_curve:prime256v1",
      "-nodes",
      "-days",
      "2",
      "-subj",
      "/CN=localhost",
      "-addext",
      "subjectAltName=DNS:localhost,IP:127.0.0.1",
      "-keyout",
      key,
      "-out",
      cert
    ],
    { stdio: "ignore" }
  )
  if (named.error || named.status !== 0) return undefined
  return { key: readFileSync(key, "utf8"), cert: readFileSync(cert, "utf8") }
}

describe("WebServer with a certificate:  HTTP/2, HTTPS and plain HTTP on one port (epic solid-2-final P14)", () => {
  const root = mkdtempSync(join(tmpdir(), "srv-web-h2-"))
  const certificate = testCertificate(root)
  let web: SRV.WebServer
  let target: Server
  let targetPort: number

  beforeAll(async () => {
    if (!certificate) return
    writeFileSync(join(root, "page.txt"), "served\n")
    // the server behind a proxied path:  says what it got
    target = createServer((request, response) => {
      response.writeHead(200, { "content-type": "application/json", connection: "keep-alive" })
      response.end(JSON.stringify({ url: request.url, version: request.httpVersion, headers: request.headers }))
    })
    targetPort = await SRV.listenPreferred(target)
    web = new SRV.WebServer({ mounts: [{ prefix: "/", dir: root }], certificate, live: true })
    web.router.post("/echo", SRV.parseBodies(), (request, reply) =>
      reply.json({ body: request.body as unknown, version: request.raw.httpVersion })
    )
    web.router.all(
      "/behind/*",
      SRV.proxyTo(() => targetPort)
    )
    await web.listen()
  })

  afterAll(async () => {
    await web?.close()
    target?.close()
    rmSync(root, { recursive: true, force: true })
  })

  /** `method` `path` over HTTP/2, trusting the test's certificate:  its status, text and version */
  function askHttp2(path: string, { method = "GET", body }: { method?: string; body?: string } = {}) {
    return new Promise<{ status: number; text: string }>((done, fail) => {
      const session = http2Connect(`https://localhost:${web.port}`, { ca: certificate!.cert })
      session.on("error", fail)
      const headers = { ":path": path, ":method": method, ...(body && { "content-type": "application/json" }) }
      const stream = session.request(headers)
      let status = 0
      let text = ""
      stream.on("response", (answer) => (status = Number(answer[":status"])))
      stream.on("data", (chunk: Buffer) => (text += chunk.toString()))
      stream.on("end", () => {
        session.close()
        done({ status, text })
      })
      stream.end(body)
    })
  }

  it.skipIf(!certificate)("answers HTTP/2 over HTTPS, the host check reading its `:authority`", async () => {
    expect(web.secureUrl).toBe(`https://localhost:${web.port}`)
    const answer = await askHttp2("/page.txt")
    expect(answer).toEqual({ status: 200, text: "served\n" })
  })

  it.skipIf(!certificate)("reads a body sent over HTTP/2", async () => {
    const answer = await askHttp2("/echo", { method: "POST", body: JSON.stringify({ a: 1 }) })
    expect(JSON.parse(answer.text)).toEqual({ body: { a: 1 }, version: "2.0" })
  })

  it.skipIf(!certificate)(
    "passes an HTTP/2 request on as HTTP/1.1, and its answer back without connection headers",
    async () => {
      const answer = await askHttp2("/behind/x?y=1")
      expect(answer.status).toBe(200)
      const got = JSON.parse(answer.text) as { url: string; version: string; headers: Record<string, string> }
      expect(got.url).toBe("/behind/x?y=1")
      expect(got.version).toBe("1.1")
      expect(Object.keys(got.headers).filter((name) => name.startsWith(":"))).toEqual([])
    }
  )

  it.skipIf(!certificate)("still answers plain HTTP on the same port:  what the tools ask", async () => {
    const answer = await ask(web.port, "GET", "/page.txt")
    expect(answer.status).toBe(200)
    expect(answer.text).toBe("served\n")
  })

  it.skipIf(!certificate)("upgrades a websocket over TLS and over plain HTTP, on the same port", async () => {
    const upgradeHeaders = {
      connection: "Upgrade",
      upgrade: "websocket",
      "sec-websocket-version": "13",
      "sec-websocket-key": "dGhlIHNhbXBsZSBub25jZQ=="
    }
    const upgraded = (send: typeof httpRequest | typeof httpsRequest, host: string) =>
      new Promise<number>((done, fail) => {
        const asking = send({
          host,
          port: web.port,
          path: SRV.LIVE_EVENTS,
          headers: upgradeHeaders,
          ...(send === httpsRequest && { ca: certificate!.cert })
        })
        asking.on("upgrade", (answer: IncomingMessage, socket) => {
          socket.destroy()
          done(answer.statusCode ?? 0)
        })
        asking.on("response", (answer) => done(answer.statusCode ?? 0))
        asking.on("error", fail)
        asking.end()
      })
    expect(await upgraded(httpsRequest, "localhost")).toBe(101)
    expect(await upgraded(httpRequest, "127.0.0.1")).toBe(101)
  })
})
