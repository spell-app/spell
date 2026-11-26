import { mkdtempSync, realpathSync, rmSync } from "node:fs"
import { createServer, request as httpRequest, type Server } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { SRV } from "spell/server"
import { ask } from "spell/server/test/serve"

describe("HostRoutes:  one address per worktree, through main's port (epic `editor` P49)", () => {
  let folder: string
  let book: SRV.PortBook
  let main: SRV.WebServer
  let behind: Server[]
  let started: string[]

  beforeEach(async () => {
    folder = realpathSync(mkdtempSync(join(tmpdir(), "host-routes-")))
    book = new SRV.PortBook(join(folder, "ports.json"))
    behind = []
    started = []
  })

  afterEach(async () => {
    await main?.close()
    for (const server of behind) server.close()
    rmSync(folder, { recursive: true, force: true })
  })

  /** a stand-in server on `port`, answering who it is, the path, and the origin it was sent */
  const standIn = (port: number, who: string) =>
    new Promise<void>((done) => {
      const server = createServer((request, response) => {
        response.setHeader("content-type", "application/json")
        response.end(JSON.stringify({ who, path: request.url, origin: request.headers.origin ?? null }))
      })
      server.on("upgrade", (_request, socket) => {
        socket.write(
          `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nx-who: ${who}\r\n\r\n`
        )
      })
      behind.push(server)
      server.listen(port, "127.0.0.1", () => done())
    })

  /** main's server with the names on, over worktrees `seo` and `epic-engine`;  a start starts their stand-ins */
  const mainServer = async ({ waitMs = 5_000 } = {}) => {
    const seo = join(folder, "seo")
    const engine = join(folder, "epic-engine")
    const names = new SRV.HostRoutes({
      worktrees: () => [
        { worktree: "seo", checkout: seo },
        { worktree: "epic-engine", checkout: engine }
      ],
      book,
      waitMs,
      mainServes: (path) => path.startsWith("/_epic/assets/"),
      start: async ({ checkout }) => {
        started.push(checkout)
        const ports = book.portsOf(checkout)
        await standIn(ports["page server"]!, `${checkout} page server`)
        await standIn(ports.editor!, `${checkout} editor`)
      }
    })
    main = new SRV.WebServer({ root: folder })
    main.guard.allowHosts(SRV.HostRoutes.isNamedHost)
    main.firstRoutes.use(names.handle)
    main.upgrade(names.claimsUpgrade, names.upgrade, { first: true })
    main.router.get("/_epic/assets/x.js", (_request, reply) => reply.send("main's own"))
    main.router.get("/", (_request, reply) => reply.send("main's home"))
    await main.listen({ port: 0 })
    return { seo, engine }
  }

  /** a request to main's port, under `host` */
  const at = (host: string, path = "/", headers: Record<string, string> = {}) =>
    ask(main.port, "GET", path, { headers: { host: `${host}:${main.port}`, ...headers } })

  it("names:  a worktree's own, its editor's, upper case and its port;  anything else is no name", () => {
    expect(SRV.HostRoutes.nameOf("seo.localhost:4747")).toEqual({ name: "seo", isEditor: false })
    expect(SRV.HostRoutes.nameOf("epic-engine--app.localhost:4747")).toEqual({ name: "epic-engine", isEditor: true })
    expect(SRV.HostRoutes.nameOf("SEO.localhost")).toEqual({ name: "SEO", isEditor: false })
    expect(SRV.HostRoutes.nameOf("localhost:4747")).toBeUndefined()
    expect(SRV.HostRoutes.nameOf("seo.example.org")).toBeUndefined()
    expect(SRV.hostNameOf("My_Work")).toBe("my-work")
  })

  it("the book's host names, two a checkout:  what the page server's certificate lists", async () => {
    await book.portFor(join(folder, "seo"))
    await book.portFor(join(folder, "seo"), "editor")
    await book.portFor(join(folder, "My_Work"))
    expect(book.hostNames()).toEqual([
      "seo.localhost",
      "seo--app.localhost",
      "my-work.localhost",
      "my-work--app.localhost"
    ])
  })

  it("plain localhost stays main's own", async () => {
    await mainServer()
    expect((await at("localhost")).text).toBe("main's home")
  })

  it("a running worktree:  its page server at <name>, its editor at <name>--app;  same-origin writes made its own", async () => {
    const { seo } = await mainServer()
    const page = await book.portFor(seo)
    const editor = await book.portFor(seo, "editor")
    await standIn(page, "seo page server")
    await standIn(editor, "seo editor")
    expect(JSON.parse((await at("seo.localhost", "/epics/x.html")).text)).toEqual({
      who: "seo page server",
      path: "/epics/x.html",
      origin: null
    })
    expect(JSON.parse((await at("seo--app.localhost", "/")).text)).toMatchObject({ who: "seo editor" })
    const own = await at("seo.localhost", "/api/x", { origin: `http://seo.localhost:${main.port}` })
    expect(JSON.parse(own.text)).toMatchObject({ origin: `http://127.0.0.1:${page}` })
    const other = await at("seo.localhost", "/api/x", { origin: "https://elsewhere.example" })
    expect(JSON.parse(other.text)).toMatchObject({ origin: "https://elsewhere.example" })
    expect(started).toEqual([])
  })

  it("a stopped worktree:  a page says it's starting and asks for the start;  a call waits for it, then answers", async () => {
    const { engine } = await mainServer()
    await book.portFor(engine)
    await book.portFor(engine, "editor")
    const page = await at("epic-engine.localhost", "/", { accept: "text/html" })
    expect(page.status).toBe(503)
    expect(page.text).toContain('"state":"starting"')
    expect(started).toEqual([engine])
    const call = await at("epic-engine.localhost", "/api/server")
    expect(JSON.parse(call.text)).toMatchObject({ who: `${engine} page server` })
  })

  it("while it starts, the names page's own files (Spell UI) are main's", async () => {
    const { engine } = await mainServer({ waitMs: 50 })
    await book.portFor(engine)
    expect((await at("epic-engine.localhost", "/_epic/assets/x.js")).text).toBe("main's own")
  })

  it("an unknown name:  the names page;  /_spell/names lists every worktree, its two addresses, whether it runs", async () => {
    const { seo } = await mainServer()
    await standIn(await book.portFor(seo), "seo page server")
    const page = await at("nothing.localhost", "/", { accept: "text/html" })
    expect(page.status).toBe(404)
    expect(page.text).toContain('"state":"unknown"')
    const names = JSON.parse((await at("nothing.localhost", SRV.NAMES_API)).text)
    expect(names).toEqual([
      {
        name: "seo",
        worktree: "seo",
        address: `http://seo.localhost:${main.port}/`,
        editor: `http://seo--app.localhost:${main.port}/`,
        running: true
      },
      expect.objectContaining({ name: "epic-engine", running: false })
    ])
  })

  it("a websocket by name goes on to the worktree's server:  live reload, the editor's reload", async () => {
    const { seo } = await mainServer()
    const port = await book.portFor(seo, "editor")
    await standIn(await book.portFor(seo), "seo page server")
    await standIn(port, "seo editor")
    const who = await new Promise<string | undefined>((done) => {
      const sent = httpRequest({
        host: "127.0.0.1",
        port: main.port,
        path: "/",
        headers: { host: `seo--app.localhost:${main.port}`, connection: "Upgrade", upgrade: "websocket" }
      })
      sent.on("upgrade", (response, socket) => {
        socket.destroy()
        done(response.headers["x-who"] as string | undefined)
      })
      sent.on("error", () => done(undefined))
      sent.end()
    })
    expect(who).toBe("seo editor")
  })
})
