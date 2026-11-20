import { spawn, type ChildProcess } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { SRV, type ServerInfo } from "spell/server"
import { serveHandler } from "spell/server/test/serve"

describe("serverAt():  what the server at an address says of itself", () => {
  it("its info;  undefined for an answer that isn't a server's info, or nothing there", async () => {
    const info = { pid: 1, port: 2, root: "/somewhere", started: "2026-10-26T00:00:00.000Z" }
    const server = await serveHandler(
      new SRV.Router().get(SRV.SERVER_API, (_request, reply) => reply.json(info)).handle
    )
    // a server with no such call:  a 404, its `{ error }` as JSON
    const other = await serveHandler(
      new SRV.Router().all("*", () => {
        throw new SRV.HttpError(404, "no such call")
      }).handle
    )
    try {
      expect(await SRV.serverAt(server.base)).toEqual(info)
      expect(await SRV.serverAt(other.base)).toBeUndefined()
    } finally {
      await server.close()
      await other.close()
    }
    expect(await SRV.serverAt(server.base)).toBeUndefined()
  })
})

describe("PidFile's write token (epic `data` P40)", () => {
  it("kept beside the pid file for this machine's person only, read while its server lives, removed with it", () => {
    const root = mkdtempSync(join(tmpdir(), "pid-token-"))
    try {
      const pidFile = new SRV.PidFile(root)
      expect(pidFile.readToken()).toBeUndefined()
      pidFile.write({ pid: process.pid, port: 1, root, started: new Date().toISOString() })
      pidFile.writeToken("secret")
      expect(pidFile.tokenFile).toBe(join(root, ".spell-server.token.json"))
      expect(statSync(pidFile.tokenFile).mode & 0o777).toBe(0o600)
      expect(pidFile.readToken()).toBe("secret")
      // never in what `/api/server` answers
      expect(readFileSync(pidFile.file, "utf8")).not.toContain("secret")
      pidFile.removeIfOurs()
      expect(pidFile.readToken()).toBeUndefined()
      // one a server that's gone left:  no token
      writeFileSync(pidFile.tokenFile, JSON.stringify({ pid: 999_999_999, token: "stale" }))
      expect(pidFile.readToken()).toBeUndefined()
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe("PidFile.forPageServer():  one record per spaces on a kit", () => {
  let root: string
  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), "pid-spaces-")))
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  /** a server answering `SERVER_API` with `info`, its port filled in */
  async function serving(info: Omit<ServerInfo, "port">) {
    let port = 0
    const server = await serveHandler(
      new SRV.Router().get(SRV.SERVER_API, (_request, reply) => reply.json({ ...info, port })).handle
    )
    port = Number(new URL(server.base).port)
    return { ...server, info: { ...info, port } }
  }

  it("the kit's own spaces:  .spell-server.json;  a project's:  its own file, token and log, named by its folder", () => {
    const spaces = join(root, "my-app", "spaces")
    const spell = SRV.PidFile.forPageServer(root, undefined)
    expect(spell.file).toBe(join(root, ".spell-server.json"))
    expect(spell.spaces).toBeUndefined()
    expect(SRV.PidFile.forPageServer(root, SRV.defaultSpacesOf(root)).file).toBe(spell.file)
    const project = SRV.PidFile.forPageServer(root, spaces)
    expect(project.spaces).toBe(spaces)
    expect(project.file).toMatch(/\/\.spell-server\.my-app-[0-9a-f]{8}\.json$/)
    expect(project.tokenFile).toBe(project.file.replace(/\.json$/, ".token.json"))
    // the same rule as the editor's record:  one name for one spaces
    expect(SRV.spacesFileName(".spell-server.editor.json", spaces)).toBe(
      project.file.slice(root.length + 1).replace(".spell-server.", ".spell-server.editor.")
    )
  })

  it("two page servers on one kit keep their own write tokens", () => {
    const spell = SRV.PidFile.forPageServer(root, undefined)
    const project = SRV.PidFile.forPageServer(root, join(root, "my-app", "spaces"))
    spell.writeToken("spell's")
    project.writeToken("the project's")
    expect(spell.readToken()).toBe("spell's")
    expect(project.readToken()).toBe("the project's")
  })

  // the bug:  a project's page server wrote over the kit's record, and `spell server start all` stopped it
  it("a server serving other spaces is never the kit's own, even named by the kit's record", async () => {
    const started = new Date().toISOString()
    const spaces = join(root, "my-app", "spaces")
    const spellServer = await serving({ pid: process.pid, root, started })
    const projectServer = await serving({ pid: process.pid, root, started, spaces })
    const spell = SRV.PidFile.forPageServer(root, undefined)
    const project = SRV.PidFile.forPageServer(root, spaces)
    try {
      spell.write(spellServer.info)
      project.write(projectServer.info)
      expect((await spell.status())?.port).toBe(spellServer.info.port)
      expect((await project.status())?.port).toBe(projectServer.info.port)
      // the project's server in the kit's record (as before this fix):  not the kit's, so not one to stop
      spell.write(projectServer.info)
      expect(await spell.status()).toBeUndefined()
      expect(await spell.ourServerOn(projectServer.info.port)).toBeUndefined()
      expect(await spell.stop()).toBe(false)
    } finally {
      await spellServer.close()
      await projectServer.close()
    }
  })
})

describe("newestChange()", () => {
  let folder: string

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), "newest-change-"))
  })

  afterEach(() => rmSync(folder, { recursive: true, force: true }))

  /** write `path` under the folder, last modified `seconds` after the epoch */
  function file(path: string, seconds: number) {
    const full = join(folder, path)
    mkdirSync(join(full, ".."), { recursive: true })
    writeFileSync(full, "")
    utimesSync(full, seconds, seconds)
  }

  it("the newest code file, all the way down;  0 for none or a missing folder", () => {
    expect(SRV.newestChange([folder, join(folder, "missing")])).toBe(0)
    file("a.ts", 100)
    file("page/deep/b.js", 300)
    file("c.mjs", 200)
    expect(SRV.newestChange([folder])).toBe(300_000)
  })

  it("skips what isn't the server's code:  other files, node_modules, _assets, dot folders", () => {
    file("a.ts", 100)
    file("notes.md", 900)
    file("node_modules/x/index.js", 900)
    file("_assets/spell-ui.js", 900)
    file(".cache/y.ts", 900)
    expect(SRV.newestChange([folder])).toBe(100_000)
  })
})

describe("PidFile.ensure(), a server on older code", () => {
  let root: string
  let old: ChildProcess | undefined

  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), "pid-file-")))
  })

  afterEach(() => {
    old?.kill("SIGKILL")
    rmSync(root, { recursive: true, force: true })
  })

  // its own process:  `process.kill()` on it must not reach the test runner
  it("stops this root's server that holds its port but doesn't answer SERVER_API, then starts a fresh one", async () => {
    old = spawn(process.execPath, ["-e", SERVER_404], { stdio: ["ignore", "pipe", "ignore"] })
    const port = Number(await new Promise<string>((done) => old!.stdout!.once("data", (data) => done(String(data)))))
    const pidFile = new SRV.PidFile(root)
    pidFile.write({ pid: old.pid!, port, root, started: new Date().toISOString() })
    expect(await pidFile.status()).toBeUndefined()
    const fresh = await pidFile.ensure({ command: [process.execPath, "-e", serverAnswering(root)], timeout: 5000 })
    expect(fresh.launched).toBe(true)
    expect(old.exitCode !== null || old.signalCode !== null).toBe(true)
    await pidFile.stop()
  })
})

describe("PidFile.stop():  waits for the PROCESS, not just for it to stop answering", () => {
  let root: string
  let server: ChildProcess | undefined

  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), "pid-file-stop-")))
  })

  afterEach(() => {
    server?.kill("SIGKILL")
    rmSync(root, { recursive: true, force: true })
  })

  /** run `code` (a server answering for the root, `serverAnswering()`), wait for it to answer;  its pid file */
  async function start(code: string): Promise<SRV.PidFile> {
    server = spawn(process.execPath, ["-e", code], { stdio: "ignore" })
    const pidFile = new SRV.PidFile(root)
    await vi.waitFor(async () => expect(await pidFile.status()).toBeDefined(), { timeout: 5000, interval: 50 })
    return pidFile
  }

  // the bug it fixes:  `ensure()` started the new server while the old one still held the port (epic `airplane`)
  it("a server that stops answering at once but takes a while to end:  returns once it HAS ended", async () => {
    const pidFile = await start(serverAnswering(root, { onTerm: "close, then exit after 800ms" }))
    const stopped = await pidFile.stop()
    expect(stopped).toBe(true)
    expect(alive(server!.pid!)).toBe(false)
  })

  it("a server that won't end:  SIGKILL once the wait is up", async () => {
    const pidFile = await start(serverAnswering(root, { onTerm: "ignore" }))
    const begun = Date.now()
    expect(await pidFile.stop({ wait: 500 })).toBe(true)
    expect(Date.now() - begun).toBeGreaterThanOrEqual(500)
    expect(alive(server!.pid!)).toBe(false)
  })

  it("nothing running:  false", async () => {
    expect(await new SRV.PidFile(root).stop()).toBe(false)
  })

  // epic `epic-engine` I329:  the editor's vite stays up through a restart, for the next server to take over
  it("a restart:  the server is told so as it stops (`isRestarting()`), and the note is gone after", async () => {
    const pidFile = await start(serverAnswering(root, { onTerm: "note restart, then exit" }))
    const pid = server!.pid!
    expect(await pidFile.stop({ restart: true })).toBe(true)
    expect(JSON.parse(readFileSync(join(root, "seen-on-term.json"), "utf8"))).toEqual({ pid, pids: [pid] })
    expect(pidFile.isRestarting(pid)).toBe(false)
  })

  it("a plain stop:  no note, so the server stops everything it started", async () => {
    const pidFile = await start(serverAnswering(root, { onTerm: "note restart, then exit" }))
    expect(await pidFile.stop()).toBe(true)
    expect(readFileSync(join(root, "seen-on-term.json"), "utf8")).toBe("none")
  })
})

/** Is `pid` still there?  (`stop()` returns only once node has reaped its child, so no zombie counts.) */
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/** A server on code before `/api/server`:  every path a 404;  prints its port. */
const SERVER_404 =
  "const s = require('node:http').createServer((q, r) => { r.statusCode = 404; r.end() });" +
  "s.listen(0, '127.0.0.1', () => console.log(s.address().port))"

/**
 * A server answering `SERVER_API` for `root`, writing its pid file there.
 * - `onTerm`, on `SIGTERM`:  exit (the default);  stop answering at once, but end only 800ms later (as the page
 *   server does while its route modules stop);  or ignore it
 * - `port`:  where it listens (0:  any)
 * - `of`:  the root it says it serves (default `root`):  another checkout's server, holding a port
 */
function serverAnswering(
  root: string,
  { onTerm = "exit", port = 0, of = root }: { onTerm?: TermBehaviour; port?: number; of?: string } = {}
): string {
  return (
    `const fs = require('node:fs'); const s = require('node:http').createServer((q, r) => {` +
    `if (q.url === '${SRV.SERVER_API}') { r.setHeader('content-type', 'application/json');` +
    `r.end(JSON.stringify({ pid: process.pid, port: s.address().port, root: ${JSON.stringify(of)}, started: new Date().toISOString() })) }` +
    `else { r.statusCode = 404; r.end() } });` +
    `s.listen(${port}, '127.0.0.1', () => fs.writeFileSync(${JSON.stringify(join(root, ".spell-server.json"))},` +
    `JSON.stringify({ pid: process.pid, port: s.address().port, root: ${JSON.stringify(root)}, started: new Date().toISOString() })));` +
    `const ROOT = ${JSON.stringify(root)}; process.on('SIGTERM', () => { ${ON_TERM[onTerm]} })`
  )
}

/** What `serverAnswering()`'s server does on `SIGTERM`. */
type TermBehaviour = "exit" | "close, then exit after 800ms" | "ignore" | "note restart, then exit"

/** Each `TermBehaviour`, as code. */
const ON_TERM: Record<TermBehaviour, string> = {
  exit: "process.exit(0)",
  "close, then exit after 800ms": "s.close(); s.closeAllConnections(); setTimeout(() => process.exit(0), 800)",
  ignore: "",
  // copies the restart note (`PidFile.restartFile`) as it stood, to `seen-on-term.json`
  "note restart, then exit":
    "let note = 'none'; try { note = fs.readFileSync(ROOT + '/.spell-server.restart.json', 'utf8') } catch {}" +
    "fs.writeFileSync(ROOT + '/seen-on-term.json', note); process.exit(0)"
}

describe("PidFile.isOlderThanCode():  restart only for code the server LOADED (epic `epic-engine` I309)", () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "pid-code-"))
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  it("with a record:  its files decide, a newer file it never loaded doesn't count;  without:  the folders", () => {
    const loaded = join(root, "route.ts")
    const browserOnly = join(root, "component.ts")
    writeFileSync(loaded, "export {}\n")
    writeFileSync(browserOnly, "export {}\n")
    const started = "2026-11-15T10:00:00.000Z"
    const before = Date.parse(started) / 1000 - 60
    const after = Date.parse(started) / 1000 + 60
    utimesSync(loaded, before, before)
    utimesSync(browserOnly, after, after)
    const running = { pid: 4242, port: 1, root, started, base: "http://127.0.0.1:1" }
    const pidFile = new SRV.PidFile(root)

    // no record:  the folders' newest file is newer than the start
    expect(pidFile.isOlderThanCode(running, [root])).toBe(true)

    // its record:  only route.ts, unchanged since it loaded it
    writeFileSync(
      join(root, ".spell-server.code.json"),
      JSON.stringify({ pid: 4242, files: { [loaded]: statSync(loaded).mtimeMs } })
    )
    expect(pidFile.isOlderThanCode(running, [root])).toBe(false)

    utimesSync(loaded, after, after)
    expect(pidFile.isOlderThanCode(running, [root])).toBe(true)
  })
})

// epic `epic-engine` I332:  an orphan of two servers started at once kept 4747, and every restart after took a new port
describe("PidFile with a fixed port:  the server MUST hold it", () => {
  let root: string
  const servers: ChildProcess[] = []

  beforeEach(() => {
    root = realpathSync(mkdtempSync(join(tmpdir(), "pid-file-port-")))
  })

  afterEach(() => {
    for (const server of servers.splice(0)) server.kill("SIGKILL")
    rmSync(root, { recursive: true, force: true })
  })

  /** run `code`, and wait till something answers on `port` */
  async function run(code: string, port: number): Promise<ChildProcess> {
    const server = spawn(process.execPath, ["-e", code], { stdio: "ignore" })
    servers.push(server)
    await vi.waitFor(async () => expect(await SRV.serverAt(`http://127.0.0.1:${port}`)).toBeDefined(), {
      timeout: 5000,
      interval: 50
    })
    return server
  }

  /** the fixed port's orphan:  this root's server on `port`, then the pid file's, elsewhere */
  async function orphanAndPidFileServer(port: number) {
    const orphan = await run(serverAnswering(root, { port }), port)
    const other = await SRV.freePort()
    const named = await run(serverAnswering(root, { port: other }), other)
    const pidFile = new SRV.PidFile(root)
    expect(pidFile.read()?.pid).toBe(named.pid)
    return { orphan, named, pidFile }
  }

  it("stop():  the pid file's server, AND this root's server on the port, as one restart", async () => {
    const port = await SRV.freePort()
    const { orphan, named, pidFile } = await orphanAndPidFileServer(port)
    expect(await pidFile.stop({ port, restart: true })).toBe(true)
    expect(alive(orphan.pid!)).toBe(false)
    expect(alive(named.pid!)).toBe(false)
    expect(await SRV.isFree(port)).toBe(true)
    expect(existsSync(pidFile.restartFile)).toBe(false)
  })

  it("ensure():  a restart off its port stops both, then starts the new one ON it", async () => {
    const port = await SRV.freePort()
    const { orphan, named, pidFile } = await orphanAndPidFileServer(port)
    // the pid file's server, older than its code:  any `sources` file newer than its start
    writeFileSync(join(root, "code.ts"), "")
    utimesSync(join(root, "code.ts"), Date.now() / 1000 + 60, Date.now() / 1000 + 60)
    const fresh = await pidFile.ensure({
      command: [process.execPath, "-e", serverAnswering(root, { port })],
      sources: [root],
      timeout: 5000,
      port
    })
    expect(fresh).toMatchObject({ launched: true, port })
    expect(alive(orphan.pid!)).toBe(false)
    expect(alive(named.pid!)).toBe(false)
    expect(await pidFile.stop({ port })).toBe(true)
    expect(alive(fresh.pid)).toBe(false)
  })

  it("ensure():  the pid file lost, this root's current server on the port is the running one", async () => {
    const port = await SRV.freePort()
    const server = await run(serverAnswering(root, { port }), port)
    const pidFile = new SRV.PidFile(root)
    rmSync(pidFile.file)
    const found = await pidFile.ensure({ command: ["false"], port })
    expect(found).toMatchObject({ launched: false, pid: server.pid, port })
    expect(pidFile.read()?.pid).toBe(server.pid)
  })

  it("ensure():  another checkout's server on the port:  throws, and starts nothing on another port", async () => {
    const port = await SRV.freePort()
    // its pid file in a folder of its own:  only what it ANSWERS says whose it is
    const other = join(root, "other")
    mkdirSync(other)
    const foreign = await run(serverAnswering(other, { port, of: "/elsewhere" }), port)
    const pidFile = new SRV.PidFile(root)
    const marker = join(root, "started")
    await expect(
      pidFile.ensure({
        command: [process.execPath, "-e", `require('node:fs').writeFileSync(${JSON.stringify(marker)}, '')`],
        timeout: 1000,
        port
      })
    ).rejects.toThrow(/must listen on port \d+, but the server of \/elsewhere \(pid \d+\) holds it/)
    expect(existsSync(marker)).toBe(false)
    expect(alive(foreign.pid!)).toBe(true)
  }, 15_000)

  it("isRestarting():  each pid the restart note names, and the old note's one `pid`", () => {
    const pidFile = new SRV.PidFile(root)
    writeFileSync(pidFile.restartFile, JSON.stringify({ pid: 1, pids: [1, 2] }))
    expect([1, 2, 3].map((pid) => pidFile.isRestarting(pid))).toEqual([true, true, false])
    writeFileSync(pidFile.restartFile, JSON.stringify({ pid: 4 }))
    expect(pidFile.isRestarting(4)).toBe(true)
  })
})
