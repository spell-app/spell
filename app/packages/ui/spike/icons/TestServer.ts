import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs"
import { createServer as createHttp, type Server } from "node:http"
import { createSecureServer, type Http2SecureServer } from "node:http2"
import type { AddressInfo } from "node:net"
import { extname, join, normalize } from "node:path"
import { gzipSync } from "node:zlib"

import { CANDIDATES, ICONS } from "./icon-list.ts"

/** `h1` = HTTP/1.1 over plain http (6 connections per host);  `h2` = HTTP/2 over a throwaway self-signed cert. */
export type Protocol = "h1" | "h2"

/** `off` = `cache-control: no-store` (cold runs);  `on` = long-lived, immutable caching of assets (warm runs). */
export type CacheMode = "off" | "on"

/** One request the server answered. */
export type Hit = { path: string; status: number; bytes: number }

/** Content types by extension. */
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
}

/** Types worth gzipping (all of them here:  every asset is text). */
const GZIPPED = new Set([".html", ".js", ".css", ".json", ".svg"])

/**
 * Static server for the experiment, serving `dist/` plus generated pages.
 * - gzip on for every text type (level 6, memoised), `content-length` set, HTTP/1.1 or HTTP/2.
 * - `cache` decides the `cache-control` header (see `CacheMode`);  flip it between runs with `cache =`.
 * - Every answered request lands in `hits` (cleared with `resetHits()`), so requests and body bytes are counted
 *   server-side, independent of what the browser reports.
 * - Pages:  `/page.html?variant=<id>&n=<count>&two=1` draws the first `n` icons of `ICONS` as markup;
 *   `two=1` draws them twice, once per bundle copy (`/a/`, `/b/`).
 */
export class TestServer {
  cache: CacheMode = "off"
  hits: Hit[] = []
  private readonly root: string
  private readonly protocol: Protocol
  private readonly gzipped = new Map<string, Buffer>()
  private server: Server | Http2SecureServer | undefined

  constructor(root: string, protocol: Protocol) {
    this.root = root
    this.protocol = protocol
  }

  /** Starts on a free port and returns the origin. */
  async listen(): Promise<string> {
    const handler = (request: import("node:http").IncomingMessage, response: import("node:http").ServerResponse) =>
      this.handle(request, response)
    if (this.protocol === "h2") {
      const { key, cert } = TestServer.certificate(join(this.root, "..", ".tmp"))
      this.server = createSecureServer({ key, cert }, handler as never)
    } else {
      this.server = createHttp(handler)
    }
    const server = this.server
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const scheme = this.protocol === "h2" ? "https" : "http"
    return `${scheme}://127.0.0.1:${(server.address() as AddressInfo).port}`
  }

  async close(): Promise<void> {
    const server = this.server
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()))
  }

  resetHits(): void {
    this.hits = []
  }

  /**
   * Base64 SHA-256 of the certificate's public key, for Chromium's `--ignore-certificate-errors-spki-list`.
   * - NOTE: plain `--ignore-certificate-errors` is NOT enough:  Chromium refuses to write responses with certificate
   *   errors to its HTTP cache, so `fetch()` would never hit a warm cache over the throwaway certificate.
   */
  static spki(directory: string): string {
    const { cert } = TestServer.certificate(directory)
    const publicKey = execFileSync("openssl", ["x509", "-pubkey", "-noout"], { input: cert })
    const der = execFileSync("openssl", ["pkey", "-pubin", "-outform", "der"], { input: publicKey })
    return createHash("sha256").update(der).digest("base64")
  }

  /** A self-signed certificate for 127.0.0.1, created once under `.tmp/`. */
  private static certificate(directory: string): { key: Buffer; cert: Buffer } {
    mkdirSync(directory, { recursive: true })
    const key = join(directory, "key.pem")
    const cert = join(directory, "cert.pem")
    if (!existsSync(cert)) {
      execFileSync(
        "openssl",
        ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", cert].concat([
          "-days",
          "30",
          "-subj",
          "/CN=127.0.0.1"
        ]),
        { stdio: "ignore" }
      )
    }
    return { key: readFileSync(key), cert: readFileSync(cert) }
  }

  private handle(request: import("node:http").IncomingMessage, response: import("node:http").ServerResponse): void {
    const url = new URL(request.url ?? "/", "http://localhost")
    let body: Buffer
    let extension = extname(url.pathname)
    if (url.pathname === "/page.html") {
      body = Buffer.from(TestServer.page(url.searchParams))
      extension = ".html"
    } else {
      const file = normalize(join(this.root, decodeURIComponent(url.pathname)))
      if (!file.startsWith(this.root) || !existsSync(file) || !statSync(file).isFile()) {
        this.hits.push({ path: url.pathname, status: 404, bytes: 0 })
        response.writeHead(404, { "content-type": "text/plain", "cache-control": "no-store" }).end("not found")
        return
      }
      body = readFileSync(file)
    }
    const headers: Record<string, string | number> = {
      "content-type": TYPES[extension] ?? "application/octet-stream",
      "cache-control":
        this.cache === "off" ? "no-store" : extension === ".html" ? "no-cache" : "public, max-age=31536000, immutable"
    }
    if (GZIPPED.has(extension) && /\bgzip\b/.test(String(request.headers["accept-encoding"] ?? ""))) {
      const key = `${url.pathname}`
      let zipped = extension === ".html" ? undefined : this.gzipped.get(key)
      if (!zipped) {
        zipped = gzipSync(body)
        if (extension !== ".html") this.gzipped.set(key, zipped)
      }
      body = zipped
      headers["content-encoding"] = "gzip"
    }
    headers["content-length"] = body.length
    headers["vary"] = "accept-encoding"
    this.hits.push({ path: url.pathname, status: 200, bytes: body.length })
    response.writeHead(200, headers).end(body)
  }

  /**
   * The test page.
   * - Colours follow `prefers-color-scheme`:  `--fg` is deliberately NOT black/white, so an icon stuck on a fixed
   *   fill cannot pass the colour check.
   */
  static page(params: URLSearchParams): string {
    const candidate = CANDIDATES.find((c) => c.id === params.get("variant")) ?? CANDIDATES[0]!
    const count = Number(params.get("n") ?? 10)
    const copies = params.get("two") === "1" ? ["a", "b"] : ["a"]
    const scripts = copies.map((copy) => `<script type="module" src="/${copy}/${candidate.id}.js"></script>`).join("\n")
    const cells = copies
      .flatMap((copy) =>
        ICONS.slice(0, count).map(
          (icon) =>
            `<${candidate.tag}${copy === "b" ? "-b" : ""} name="${icon.name}" variant="${icon.variant}"></${candidate.tag}${copy === "b" ? "-b" : ""}>`
        )
      )
      .join("\n")
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>icons ${candidate.id} ${count}</title>
<style>
  :root { color-scheme: light dark; --fg: #b3261e; --bg: #ffffff; }
  @media (prefers-color-scheme: dark) { :root { --fg: #7fd6ff; --bg: #14161a; } }
  body { margin: 0; padding: 8px; background: var(--bg); color: var(--fg); font-size: 32px; }
  #grid { display: grid; grid-template-columns: repeat(10, 64px); grid-auto-rows: 56px; align-items: center; justify-items: center; }
</style>
${scripts}
</head>
<body>
<div id="grid">
${cells}
</div>
</body>
</html>
`
  }
}
