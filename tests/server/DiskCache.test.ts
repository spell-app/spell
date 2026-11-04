import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readdirSync, utimesSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { SRV } from "spell/server"
import { ask, serveHandler } from "spell/server/test/serve"

describe("DiskCache", () => {
  let folder: string
  let version: string
  let cache: SRV.DiskCache

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "disk-cache-"))
    version = "aaaa0001"
    cache = new SRV.DiskCache({ folder, version: () => version, keep: 2 })
  })
  afterEach(() => rmSync(folder, { recursive: true, force: true }))

  it("keeps an entry by key, for the current version only", () => {
    expect(cache.read(version, "beef0001")).toBeUndefined()
    expect(cache.write(version, "beef0001", "compiled")).toBe(true)
    expect(cache.read(version, "beef0001")).toBe("compiled")
    expect(cache.count(version)).toBe(1)
    // an older compiler's page can't file its output under the new version
    expect(cache.write("aaaa0000", "beef0002", "old")).toBe(false)
    expect(cache.read("aaaa0000", "beef0002")).toBeUndefined()
  })

  it("starts each new version empty, and keeps only the newest `keep` versions' folders", () => {
    cache.write(version, "beef0001", "one")
    utimesSync(join(folder, version), new Date(1000), new Date(1000))
    version = "aaaa0002"
    expect(cache.read(version, "beef0001")).toBeUndefined()
    expect(cache.count(version)).toBe(0)
    cache.write(version, "beef0001", "two")
    utimesSync(join(folder, version), new Date(2000), new Date(2000))
    version = "aaaa0003"
    cache.write(version, "beef0001", "three")
    expect(readdirSync(folder).sort()).toEqual(["aaaa0002", "aaaa0003"])
  })

  it("past its cap, drops the entries used least recently first:  a read counts as a use", () => {
    cache.limit = 30
    const at = (key: string, seconds: number) =>
      utimesSync(join(folder, version, key), new Date(seconds * 1000), new Date(seconds * 1000))
    cache.write(version, "beef0001", "a".repeat(10))
    at("beef0001", 1)
    cache.write(version, "beef0002", "b".repeat(10))
    at("beef0002", 2)
    cache.write(version, "beef0003", "c".repeat(10))
    at("beef0003", 3)
    // the oldest written is read now:  the least recently USED is beef0002
    expect(cache.read(version, "beef0001")).toBe("a".repeat(10))
    cache.write(version, "beef0004", "d".repeat(10))
    expect(readdirSync(join(folder, version)).sort()).toEqual(["beef0001", "beef0003", "beef0004"])
    // an entry bigger than the cap is still kept, and everything older goes
    cache.write(version, "beef0005", "e".repeat(40))
    expect(readdirSync(join(folder, version))).toEqual(["beef0005"])
  })

  it("counts every version's entries against its cap", () => {
    cache.limit = 25
    cache.write(version, "beef0001", "a".repeat(10))
    utimesSync(join(folder, version, "beef0001"), new Date(1000), new Date(1000))
    version = "aaaa0002"
    cache.write(version, "beef0002", "b".repeat(10))
    cache.write(version, "beef0003", "c".repeat(10))
    expect(cache.count("aaaa0001")).toBe(0)
    expect(cache.count(version)).toBe(2)
  })

  it("refuses a version or key that isn't a hash", () => {
    expect(() => cache.read("../x", "beef0001")).toThrow(TypeError)
    expect(() => cache.write(version, "../../etc", "x")).toThrow(TypeError)
  })

  it("answers over HTTP", async () => {
    const router = new SRV.Router().use("/api/compiles", cache.router())
    const served = await serveHandler(router.handle)
    try {
      expect(JSON.parse((await ask(served.port, "GET", "/api/compiles/version")).text)).toEqual({ version })
      expect((await ask(served.port, "GET", `/api/compiles/${version}/beef0001`)).status).toBe(404)
      const headers = { "content-type": "text/plain" }
      const put = await ask(served.port, "PUT", `/api/compiles/${version}/beef0001`, { body: '{"a":1}', headers })
      expect(put.status).toBe(204)
      const got = await ask(served.port, "GET", `/api/compiles/${version}/beef0001`)
      expect([got.status, got.text]).toEqual([200, '{"a":1}'])
      expect((await ask(served.port, "PUT", "/api/compiles/aaaa0000/beef0001", { body: "x", headers })).status).toBe(
        409
      )
      expect((await ask(served.port, "GET", "/api/compiles/zz/beef0001")).status).toBe(400)
    } finally {
      await served.close()
    }
  })
})

describe("sizeInBytes()", () => {
  it("reads a size with a unit, binary, or a number of bytes", () => {
    expect(SRV.sizeInBytes("200MB")).toBe(200 * 1024 * 1024)
    expect(SRV.sizeInBytes("1.5 gb")).toBe(1.5 * 1024 ** 3)
    expect(SRV.sizeInBytes("512KB")).toBe(512 * 1024)
    expect(SRV.sizeInBytes("4096")).toBe(4096)
    expect(SRV.sizeInBytes(100)).toBe(100)
    expect(() => SRV.sizeInBytes("lots")).toThrow(/write e.g. "200MB"/)
  })
})

describe("codeVersion()", () => {
  let folder: string
  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "code-version-"))
    mkdirSync(join(folder, "node_modules"))
  })
  afterEach(() => rmSync(folder, { recursive: true, force: true }))

  it("changes when the code changes, and only then", async () => {
    writeFileSync(join(folder, "a.ts"), "one")
    writeFileSync(join(folder, "notes.md"), "words")
    const version = SRV.codeVersion([folder, join(folder, "missing")])
    const first = version()
    expect(first).toMatch(/^[0-9a-f]{32}$/)
    // a file that isn't code, or one in node_modules, doesn't count
    writeFileSync(join(folder, "notes.md"), "other words")
    writeFileSync(join(folder, "node_modules", "b.ts"), "x")
    await new Promise((done) => setTimeout(done, 1100))
    expect(version()).toBe(first)
    writeFileSync(join(folder, "a.ts"), "two")
    await new Promise((done) => setTimeout(done, 1100))
    expect(version()).not.toBe(first)
    expect(existsSync(folder)).toBe(true)
  })
})
