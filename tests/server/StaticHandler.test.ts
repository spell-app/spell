import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { brotliCompressSync, brotliDecompressSync, gunzipSync } from "node:zlib"
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test"

import { SRV } from "spell/server"
import { ask, serveHandler, type Served } from "spell/server/test/serve"

/** Two folders:  `site/` at `/`, `element/` at `/element/`. */
const DIR = mkdtempSync(join(tmpdir(), "srv-static-"))
mkdirSync(join(DIR, "site", "docs"), { recursive: true })
mkdirSync(join(DIR, "element"))
writeFileSync(join(DIR, "site", "index.html"), "<html><head></head><body>home</body></html>")
writeFileSync(join(DIR, "site", "docs", "index.html"), "<html><head></head><body>docs</body></html>")
writeFileSync(join(DIR, "site", "app.ts"), "const x: number = 1")
writeFileSync(join(DIR, "site", "style.css"), "a{}")
writeFileSync(join(DIR, "site", ".hidden"), "no")
writeFileSync(join(DIR, "element", "spell-viewer.js"), "export {}")

describe("StaticHandler", () => {
  let served: Served

  beforeAll(async () => {
    const files = new SRV.StaticHandler({
      mounts: [
        { prefix: "/", dir: join(DIR, "site") },
        { prefix: "/element", dir: join(DIR, "element") }
      ],
      html: [(html, { path }) => html.replace("<head>", `<head><meta name="path" content="${path}">`)],
      transforms: {
        ".ts": (source) => ({ body: `/* js */ ${source.replace(": number", "")}`, type: SRV.TYPES[".js"]! })
      }
    })
    const router = new SRV.Router().use(files.handle).get("*", (_request, reply) => reply.send("fallback"))
    served = await serveHandler(router.handle)
  })

  afterAll(async () => {
    await served.close()
    rmSync(DIR, { recursive: true, force: true })
  })

  it("serves files with type, no-store and an ETag", async () => {
    const answer = await ask(served.port, "GET", "/style.css")
    expect(answer.text).toBe("a{}")
    expect(answer.headers["content-type"]).toBe("text/css; charset=utf-8")
    expect(answer.headers["cache-control"]).toBe("no-store")
    expect(answer.headers.etag).toMatch(/^"[0-9a-f]+-[0-9a-f]+"$/)
  })

  it("picks the longest prefix", async () => {
    expect((await ask(served.port, "GET", "/element/spell-viewer.js")).text).toBe("export {}")
  })

  it("runs html hooks on pages, with the path", async () => {
    const answer = await ask(served.port, "GET", "/docs/")
    expect(answer.text).toContain(`<meta name="path" content="/docs/">`)
    expect(answer.text).toContain("docs")
  })

  it("redirects a folder without its slash", async () => {
    const answer = await ask(served.port, "GET", "/docs")
    expect(answer.status).toBe(301)
    expect(answer.headers.location).toBe("/docs/")
  })

  it("redirects a mount's own folder without its slash", async () => {
    const answer = await ask(served.port, "GET", "/element")
    expect(answer.status).toBe(301)
    expect(answer.headers.location).toBe("/element/")
  })

  it("runs transforms by extension", async () => {
    const answer = await ask(served.port, "GET", "/app.ts")
    expect(answer.headers["content-type"]).toBe("text/javascript; charset=utf-8")
    expect(answer.text).toBe("/* js */ const x = 1")
  })

  it("refuses dot files and escapes;  passes misses on", async () => {
    expect((await ask(served.port, "GET", "/.hidden")).status).toBe(403)
    expect((await ask(served.port, "GET", "/%2e%2e/element/spell-viewer.js")).status).toBe(403)
    expect((await ask(served.port, "GET", "/missing.html")).text).toBe("fallback")
    expect((await ask(served.port, "POST", "/style.css")).status).toBe(404)
  })
})

describe("StaticHandler overlays", () => {
  it("serves an overlay's file in place of the path asked;  falls through when it has none", () => {
    const dir = mkdtempSync(join(tmpdir(), "srv-overlay-"))
    mkdirSync(join(dir, "pages", "_data"), { recursive: true })
    mkdirSync(join(dir, "build", "_data"), { recursive: true })
    writeFileSync(join(dir, "pages", "_data", "both.json"), "pages")
    writeFileSync(join(dir, "pages", "_data", "pages-only.json"), "pages")
    writeFileSync(join(dir, "build", "_data", "both.json"), "build")
    const files = new SRV.StaticHandler({ mounts: [{ prefix: "/", dir }] })
    files.overlays.push((path) => (path.startsWith("/pages/_data/") ? path.replace("/pages/", "/build/") : undefined))
    expect(fileOf("/pages/_data/both.json")).toBe(join(dir, "build", "_data", "both.json"))
    expect(fileOf("/pages/_data/pages-only.json")).toBe(join(dir, "pages", "_data", "pages-only.json"))
    expect(fileOf("/pages/_data/missing.json")).toMatchObject({ status: 404 })
    rmSync(dir, { recursive: true, force: true })

    /** the file `path` resolves to, else what it resolved to */
    function fileOf(path: string) {
      const resolved = files.resolve(path)
      return resolved && "file" in resolved ? resolved.file : resolved
    }
  })
})

describe("StaticHandler layers", () => {
  it("lays folders mounted at one prefix over each other:  the first that has the path serves it", () => {
    const dir = mkdtempSync(join(tmpdir(), "srv-layers-"))
    for (const [folder, file] of [
      ["new", "both.html"],
      ["new", "new-only.html"],
      ["old", "both.html"],
      ["old", "old-only.html"]
    ] as const) {
      mkdirSync(join(dir, folder, "w"), { recursive: true })
      writeFileSync(join(dir, folder, "w", file), folder)
    }
    const files = new SRV.StaticHandler({ mounts: [{ prefix: "/", dir: join(dir, "new") }] })
    files.mount({ prefix: "/", dir: join(dir, "old") })
    expect(fileOf("/w/both.html")).toBe(join(dir, "new", "w", "both.html"))
    expect(fileOf("/w/new-only.html")).toBe(join(dir, "new", "w", "new-only.html"))
    expect(fileOf("/w/old-only.html")).toBe(join(dir, "old", "w", "old-only.html"))
    expect(fileOf("/w")).toMatchObject({ redirect: "/w/" })
    expect(fileOf("/w/missing.html")).toMatchObject({ status: 404 })
    expect(fileOf("/.git")).toMatchObject({ status: 403 })
    rmSync(dir, { recursive: true, force: true })

    /** the file `path` resolves to, else what it resolved to */
    function fileOf(path: string) {
      const resolved = files.resolve(path)
      return resolved && "file" in resolved ? resolved.file : resolved
    }
  })

  // epic `epic-eject` P12:  the epic folder under every worktree's address, after the worktrees' own files
  it("lays a catch-all (`skip`) under the others at its prefix, whenever mounted:  any first folder, dropped", () => {
    const dir = mkdtempSync(join(tmpdir(), "srv-skip-"))
    for (const [folder, file] of [
      ["worktrees/w/epics", "own.html"],
      ["content/epics", "own.html"],
      ["content/epics", "shared.html"]
    ] as const) {
      mkdirSync(join(dir, folder), { recursive: true })
      writeFileSync(join(dir, folder, file), folder)
    }
    // the catch-all first:  still laid under
    const files = new SRV.StaticHandler({ mounts: [{ prefix: "/worktrees/", dir: join(dir, "content"), skip: 1 }] })
    files.mount({ prefix: "/worktrees/", dir: join(dir, "worktrees") })
    const fileOf = (path: string) => {
      const resolved = files.resolve(path)
      return resolved && "file" in resolved ? resolved.file : resolved
    }
    expect(fileOf("/worktrees/w/epics/own.html")).toBe(join(dir, "worktrees", "w", "epics", "own.html"))
    expect(fileOf("/worktrees/w/epics/shared.html")).toBe(join(dir, "content", "epics", "shared.html"))
    expect(fileOf("/worktrees/any/epics/shared.html")).toBe(join(dir, "content", "epics", "shared.html"))
    expect(fileOf("/worktrees/w/epics")).toHaveProperty("redirect")
    expect(fileOf("/worktrees/w/missing.html")).toMatchObject({ status: 404 })
    rmSync(dir, { recursive: true, force: true })
  })
})

// epic `epic-engine` P40:  what live reload sends a page with its change
describe("StaticHandler.render()", () => {
  it("renders a page as a navigation gets it:  through the html hooks, with its ETag", async () => {
    const dir = mkdtempSync(join(tmpdir(), "srv-render-"))
    writeFileSync(join(dir, "page.html"), "<p>page</p>")
    writeFileSync(join(dir, "data.json"), "{}")
    const files = new SRV.StaticHandler({
      mounts: [{ prefix: "/", dir }],
      html: [(html, served) => `${html}<!-- ${served.path} -->`]
    })
    const page = await files.render("/page.html")
    expect(page?.html).toBe("<p>page</p><!-- /page.html -->")
    expect(page?.etag).toMatch(/^"[0-9a-f]+-[0-9a-f]+"$/)
    expect(await files.render("/data.json")).toBeUndefined()
    expect(await files.render("/missing.html")).toBeUndefined()
    expect(await files.render("/page.html", 4)).toBeUndefined()
    rmSync(dir, { recursive: true, force: true })
  })
})

// epic `solid-2-final` P2:  compressed on the way out, and cached
describe("StaticHandler, compressed and cached", () => {
  const dir = mkdtempSync(join(tmpdir(), "srv-cache-"))
  const script = `export const words = ${JSON.stringify("words ".repeat(400))}\n`
  const page = `<html><head></head><body>${"<p>page</p>".repeat(200)}</body></html>`
  let served: Served
  let setting = "first"

  beforeAll(async () => {
    mkdirSync(join(dir, "assets"))
    writeFileSync(join(dir, "big.js"), script)
    writeFileSync(join(dir, "small.css"), "a{}")
    writeFileSync(join(dir, "picture.png"), Buffer.alloc(4000, 7))
    writeFileSync(join(dir, "page.html"), page)
    writeFileSync(join(dir, "assets", "Chunk-Bq3xZ9aP.js"), script)
    writeFileSync(join(dir, "assets", "plain-settings.js"), script)
    writeFileSync(join(dir, "built.js"), script)
    writeFileSync(join(dir, "built.js.br"), brotliCompressSync(script))
    writeFileSync(join(dir, "stale.js"), script)
    writeFileSync(join(dir, "stale.js.br"), "old")
    utimesSync(join(dir, "stale.js.br"), new Date(2020, 0, 1), new Date(2020, 0, 1))
    const files = new SRV.StaticHandler({
      caching: "normal",
      mounts: [{ prefix: "/", dir, hashed: SRV.hashedIn("assets") }],
      html: [(html) => html.replace("<head>", `<head><meta name="setting" content="${setting}">`)]
    })
    const router = new SRV.Router()
      .use(files.handle)
      .get("/api/list", (_request, reply) => reply.noStore().json({ words: "words ".repeat(400) }))
    served = await serveHandler(router.handle)
  })

  afterAll(async () => {
    await served.close()
    rmSync(dir, { recursive: true, force: true })
  })

  const GZIP = { "accept-encoding": "gzip, deflate" }
  const BROTLI = { "accept-encoding": "gzip, deflate, br" }

  it("sends a built file's brotli copy, as it is, to a browser that takes brotli", async () => {
    const answer = await ask(served.port, "GET", "/built.js", { headers: BROTLI })
    expect(answer.headers["content-encoding"]).toBe("br")
    expect(answer.headers["content-type"]).toBe("text/javascript; charset=utf-8")
    expect(answer.headers.vary).toBe("Accept-Encoding")
    expect(brotliDecompressSync(answer.bytes).toString()).toBe(script)
  })

  it("gzips a file with no brotli copy, or an older one, as it's sent", async () => {
    for (const path of ["/big.js", "/stale.js"]) {
      const answer = await ask(served.port, "GET", path, { headers: BROTLI })
      expect(answer.headers["content-encoding"]).toBe("gzip")
      expect(gunzipSync(answer.bytes).toString()).toBe(script)
      expect(Number(answer.headers["content-length"])).toBeLessThan(script.length / 5)
    }
  })

  it("sends it as it is to a request that takes neither, and leaves small or packed files alone", async () => {
    const plain = await ask(served.port, "GET", "/big.js")
    expect([plain.headers["content-encoding"], plain.text, plain.headers.vary]).toEqual([
      undefined,
      script,
      "Accept-Encoding"
    ])
    const small = await ask(served.port, "GET", "/small.css", { headers: GZIP })
    expect([small.headers["content-encoding"], small.text]).toEqual([undefined, "a{}"])
    const picture = await ask(served.port, "GET", "/picture.png", { headers: GZIP })
    expect(picture.headers["content-encoding"]).toBeUndefined()
  })

  it("gzips a page made on the way and an API's answer too", async () => {
    const answer = await ask(served.port, "GET", "/page.html", { headers: GZIP })
    expect(answer.headers["content-encoding"]).toBe("gzip")
    expect(gunzipSync(answer.bytes).toString()).toContain(`<meta name="setting"`)
    const listed = await ask(served.port, "GET", "/api/list", { headers: GZIP })
    expect([listed.headers["content-encoding"], listed.headers["cache-control"]]).toEqual(["gzip", "no-store"])
    expect(JSON.parse(gunzipSync(listed.bytes).toString())).toHaveProperty("words")
  })

  it("keeps a hashed name a year;  checks everything else each time", async () => {
    const hashed = await ask(served.port, "GET", "/assets/Chunk-Bq3xZ9aP.js")
    expect(hashed.headers["cache-control"]).toBe("public, max-age=31536000, immutable")
    for (const path of ["/assets/plain-settings.js", "/big.js", "/page.html"])
      expect((await ask(served.port, "GET", path)).headers["cache-control"]).toBe("no-cache")
  })

  it("answers 'not modified' while the browser's copy matches", async () => {
    const first = await ask(served.port, "GET", "/big.js")
    const again = await ask(served.port, "GET", "/big.js", { headers: { "if-none-match": String(first.headers.etag) } })
    expect([again.status, again.text, again.headers.etag]).toEqual([304, "", first.headers.etag])
    const other = await ask(served.port, "GET", "/big.js", { headers: { "if-none-match": '"0-0"' } })
    expect(other.status).toBe(200)
  })

  it("answers a page 'not modified' only while its hooks make the same page", async () => {
    const first = await ask(served.port, "GET", "/page.html")
    expect(first.headers.vary).toContain("Sec-Fetch-Dest")
    const etag = String(first.headers.etag)
    expect((await ask(served.port, "GET", "/page.html", { headers: { "if-none-match": etag } })).status).toBe(304)
    setting = "second"
    const changed = await ask(served.port, "GET", "/page.html", { headers: { "if-none-match": etag } })
    expect([changed.status, changed.text]).toEqual([200, expect.stringContaining(`content="second"`)])
  })

  it("never keeps a copy with caching \"never\":  no-store, no 'not modified'", async () => {
    const never = await serveHandler(new SRV.StaticHandler({ mounts: [{ prefix: "/", dir }] }).handle)
    const first = await ask(never.port, "GET", "/assets/Chunk-Bq3xZ9aP.js")
    expect(first.headers["cache-control"]).toBe("no-store")
    const again = await ask(never.port, "GET", "/big.js", { headers: { "if-none-match": String(first.headers.etag) } })
    expect(again.status).toBe(200)
    await never.close()
  })
})
