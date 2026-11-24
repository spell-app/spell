import { mkdirSync, mkdtempSync, realpathSync, rmSync } from "fs"
import { createServer, type Server } from "http"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"
import { DEFAULT_PORT } from "spell/server/page"
import {
  isOtherCheckout,
  MACHINE_PROBE,
  planPageServer,
  serveSpaces,
  type PortProbe
} from "spell/app/cli/servePageServer"

/** A folder per test run:  the kit's checkout, a project's checkout with its `spaces/`, one without, and a loose folder. */
let base: string
let kit: string
let project: string
let bare: string
let loose: string

beforeAll(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), "serve-page-server-")))
  kit = join(base, "kit")
  project = join(base, "my-app")
  bare = join(base, "other-app")
  loose = join(base, "loose")
  for (const checkout of [kit, project, bare]) mkdirSync(join(checkout, ".git"), { recursive: true })
  mkdirSync(join(project, "spaces"), { recursive: true })
  mkdirSync(join(project, "src", "deep"), { recursive: true })
  mkdirSync(join(kit, "app"), { recursive: true })
  mkdirSync(loose, { recursive: true })
})

afterAll(() => rmSync(base, { recursive: true, force: true }))

/** `ServerInfo` of a server on `root`, at `port`. */
function infoOf(root: string, port: number, spaces?: string): SRV.ServerInfo {
  return { pid: 1, port, root, started: new Date().toISOString(), ...(spaces ? { spaces } : {}) }
}

/** A probe with `servers` answering on their ports, `busy` ports held by other programs, the rest free;  counts asks. */
function probeWith(servers: SRV.ServerInfo[] = [], busy: number[] = []): PortProbe & { asked: number[] } {
  const asked: number[] = []
  return {
    asked,
    serverOn: async (port) => {
      asked.push(port)
      return servers.find((server) => server.port === port)
    },
    isFree: async (port) => !busy.includes(port) && !servers.some((server) => server.port === port)
  }
}

describe("serveSpaces()", () => {
  test("--spaces wins, from the folder it's run in", () => {
    expect(serveSpaces({ given: "spaces", env: "/elsewhere", cwd: project, root: kit })).toBe(join(project, "spaces"))
  })

  test("else SPELL_SPACES_DIR", () => {
    expect(serveSpaces({ env: "/elsewhere/spaces", cwd: project, root: kit })).toBe("/elsewhere/spaces")
  })

  test("else a project's checkout's own spaces/, from any folder of it", () => {
    expect(serveSpaces({ cwd: project, root: kit })).toBe(join(project, "spaces"))
    expect(serveSpaces({ cwd: join(project, "src", "deep"), root: kit })).toBe(join(project, "spaces"))
  })

  test("the kit's own:  from the kit, from a checkout with no spaces/, and from a folder in no checkout", () => {
    expect(serveSpaces({ cwd: join(kit, "app"), root: kit })).toBeUndefined()
    expect(serveSpaces({ cwd: bare, root: kit })).toBeUndefined()
    expect(serveSpaces({ cwd: loose, root: kit })).toBeUndefined()
  })
})

describe("isOtherCheckout()", () => {
  test("a project's checkout is another;  the kit's, a loose folder and a kit in no checkout aren't", () => {
    expect(isOtherCheckout(project, kit)).toBe(true)
    expect(isOtherCheckout(join(kit, "app"), kit)).toBe(false)
    expect(isOtherCheckout(loose, kit)).toBe(false)
    expect(isOtherCheckout(project, loose)).toBe(false)
  })
})

describe("planPageServer():  the port", () => {
  const spaces = () => join(project, "spaces")

  test("a project's own page server takes any free port, never the kit's default", async () => {
    const probe = probeWith([infoOf(kit, DEFAULT_PORT)])
    expect(await planPageServer({ root: kit, cwd: project, spaces: spaces(), probe })).toEqual({
      use: "own",
      port: 0,
      notes: []
    })
    expect(probe.asked).toEqual([])
  })

  test("--page-port, when free", async () => {
    const plan = await planPageServer({ root: kit, cwd: project, spaces: spaces(), pagePort: 5123, probe: probeWith() })
    expect(plan).toEqual({ use: "own", port: 5123, notes: [] })
  })

  test("--page-port held by this project's own server:  kept, for `ensure()` to find it there", async () => {
    const probe = probeWith([infoOf(kit, 5123, spaces())])
    expect(await planPageServer({ root: kit, cwd: project, spaces: spaces(), pagePort: 5123, probe })).toEqual({
      use: "own",
      port: 5123,
      notes: []
    })
  })

  test("--page-port held by another program:  says so, and takes a free one", async () => {
    const plan = await planPageServer({
      root: kit,
      cwd: project,
      spaces: spaces(),
      pagePort: 5123,
      probe: probeWith([], [5123])
    })
    expect(plan.use === "own" && plan.port).toBe(0)
    expect(plan.notes).toEqual(["Port 5123 is in use by another program:  using a free port instead"])
  })

  test("the kit's own, from the kit's main checkout:  the default port only, as `spell server start` keeps it", async () => {
    const probe = probeWith([infoOf(join(base, "somewhere"), DEFAULT_PORT)])
    expect(await planPageServer({ root: kit, cwd: join(kit, "app"), probe })).toEqual({
      use: "own",
      port: DEFAULT_PORT,
      notes: []
    })
    expect(probe.asked).toEqual([])
  })
})

describe("planPageServer():  never replaces another root's server", () => {
  test("the kit's own page server, from a project's checkout:  used as it runs, never started or restarted", async () => {
    const probe = probeWith([infoOf(kit, DEFAULT_PORT)])
    expect(await planPageServer({ root: kit, cwd: bare, probe })).toEqual({ use: "running", notes: [] })
    expect(probe.asked).toEqual([])
  })

  test("--page-port there doesn't apply, and says so", async () => {
    const plan = await planPageServer({ root: kit, cwd: bare, pagePort: 5123, probe: probeWith() })
    expect(plan.use).toBe("running")
    expect(plan.notes).toEqual([`--page-port applies only to a page server this checkout owns:  ${kit}'s is used as it is`])
  })

  test("--page-port held by another root's page server:  says whose, and takes a free one", async () => {
    const probe = probeWith([infoOf(kit, 5123)])
    const plan = await planPageServer({ root: kit, cwd: project, spaces: join(project, "spaces"), pagePort: 5123, probe })
    expect(plan).toEqual({
      use: "own",
      port: 0,
      notes: [`Port 5123 is held by the page server of ${kit}:  using a free port instead`]
    })
  })

  test("--page-port held by another project's server on the same kit:  says whose, and takes a free one", async () => {
    const theirs = join(bare, "spaces")
    const probe = probeWith([infoOf(kit, 5123, theirs)])
    const plan = await planPageServer({ root: kit, cwd: project, spaces: join(project, "spaces"), pagePort: 5123, probe })
    expect(plan.use === "own" && plan.port).toBe(0)
    expect(plan.notes).toEqual([`Port 5123 is held by the page server of ${kit}, for ${theirs}:  using a free port instead`])
  })

  describe("on the machine:  a real server answering for another root", () => {
    let server: Server
    let port: number

    beforeAll(async () => {
      server = createServer((request, response) => {
        response.setHeader("content-type", "application/json")
        response.end(JSON.stringify(request.url === SRV.SERVER_API ? infoOf(kit, port) : {}))
      })
      await new Promise<void>((done) => server.listen(0, SRV.LOCALHOST, done))
      port = (server.address() as { port: number }).port
    })

    afterAll(() => new Promise<void>((done) => server.close(() => done())))

    test("its port is left to it", async () => {
      const spaces = join(project, "spaces")
      const plan = await planPageServer({ root: kit, cwd: project, spaces, pagePort: port, probe: MACHINE_PROBE })
      expect(plan).toEqual({
        use: "own",
        port: 0,
        notes: [`Port ${port} is held by the page server of ${kit}:  using a free port instead`]
      })
      expect(server.listening).toBe(true)
    })
  })
})
