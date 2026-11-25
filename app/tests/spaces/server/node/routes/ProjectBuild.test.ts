import type { ChildProcess } from "node:child_process"
import { EventEmitter } from "node:events"
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { PassThrough } from "node:stream"
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { locationForDiskPath } from "spell/app/spaces/server/node/projects/disk-fetch"
import { SP } from "spell/parser/spell"
import type { BuildStep } from "spell/app/spaces/models/buildSteps"
import { compilerVersion } from "spell/app/spaces/server/node/projects/compilerCode"
import { SitePages, sourceHashOf, type FramePrint } from "spell/app/spaces/server/node/projects/SitePages"
import { ProjectBuild } from "spell/app/spaces/server/node/routes/ProjectBuild"
import * as projectUtils from "spell/app/spaces/server/node/projects/project-utils"

////////////////
// ## Fakes
////////////////

/** A compile's child process:  output streams, `exit` when the test says. */
class FakeChild extends EventEmitter {
  stdin = new PassThrough()
  stdout = new PassThrough()
  stderr = new PassThrough()
  pid = 4242
  kill = vi.fn()

  /** end the compile with `code` */
  exit(code = 0): void {
    this.emit("exit", code, null)
  }
}

/** A `spawn` stub handing out a new `FakeChild` each call, kept in `children`. */
function spawnStub() {
  const children: FakeChild[] = []
  const spawn = vi.fn(() => {
    const child = new FakeChild()
    children.push(child)
    return child as unknown as ChildProcess
  })
  return { spawn, children }
}

/** Write `text` at `path`, making folders. */
function put(path: string, text = ""): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

////////////////
// ## Tests
////////////////

describe("ProjectBuild", () => {
  // its REAL path:  on macOS `tmpdir()` is a symlink, and a project's location is worked out from real paths
  const root = realpathSync(mkdtempSync(join(tmpdir(), "app-project-build-")))
  const projectFolder = join(root, "projects", "Built")
  // a fake kit in its install:  its `spell`, found by package (`kitSpell()`)
  put(
    join(root, "node_modules/spell/package.json"),
    JSON.stringify({ name: "spell", exports: { "./package.json": "./package.json" } })
  )
  put(join(root, "node_modules/spell/bin/spell.mjs"))
  put(join(projectFolder, SP.PROJECT_FILE), JSON.stringify({ imports: [{ path: "/Built.spell", active: true }] }))
  put(join(projectFolder, "Built.spell"), 'print "built"\n')
  // outside `packages/`:  its built files sit beside its source (`buildFolderFor()`)
  const projectId = locationForDiskPath(join(projectFolder, SP.PROJECT_FILE))!.projectId
  const compiled = SP.SpellLocation.getFileLocation(projectId, `Built${SP.COMPILED_JS_SUFFIX}`)
  // one importing a library, which the startup compile builds
  const importerFolder = join(root, "projects", "Importer")
  put(
    join(importerFolder, SP.PROJECT_FILE),
    JSON.stringify({
      imports: [
        { path: "@spell/library/games", active: true },
        { path: "/Importer.spell", active: true }
      ]
    })
  )
  put(join(importerFolder, "Importer.spell"), 'print "imports"\n')
  const importerId = locationForDiskPath(join(importerFolder, SP.PROJECT_FILE))!.projectId
  const importerCompiled = SP.SpellLocation.getFileLocation(importerId, `Importer${SP.COMPILED_JS_SUFFIX}`)
  // one importing a library THROUGH another project:  it imports the importer
  const throughFolder = join(root, "projects", "Through")
  put(
    join(throughFolder, SP.PROJECT_FILE),
    JSON.stringify({
      imports: [
        { path: importerId, active: true },
        { path: "/Through.spell", active: true }
      ]
    })
  )
  put(join(throughFolder, "Through.spell"), 'print "through"\n')
  const throughId = locationForDiskPath(join(throughFolder, SP.PROJECT_FILE))!.projectId
  const throughCompiled = SP.SpellLocation.getFileLocation(throughId, `Through${SP.COMPILED_JS_SUFFIX}`)

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "info").mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
    rmSync(compiled.serverPath, { force: true })
    rmSync(importerCompiled.serverPath, { force: true })
    rmSync(throughCompiled.serverPath, { force: true })
  })
  afterAll(() => rmSync(root, { recursive: true, force: true }))

  test("start():  the checkout's OWN `spell` (the kit's), `compile --stale --all @spell/library`, the libraries alone, in a process group of its own", () => {
    const { spawn } = spawnStub()
    new ProjectBuild({ root, spawn }).start()
    expect(spawn).toHaveBeenCalledWith(
      process.execPath,
      [join(root, "node_modules/spell/bin/spell.mjs"), "compile", "--stale", "--all", "@spell/library"],
      expect.objectContaining({ cwd: root, detached: true })
    )
    // its steps aren't told:  no page waits on it
    const [, , { env }] = spawn.mock.calls[0] as unknown as [string, string[], { env: Record<string, unknown> }]
    expect(env.SPELL_COMPILE_STEPS).toBeUndefined()
  })

  test("a built file that's there:  at once, compiling nothing", async () => {
    const { spawn } = spawnStub()
    put(compiled.serverPath, "export {}\n")
    expect(await new ProjectBuild({ root, spawn }).untilBuilt(compiled)).toBe(true)
    expect(spawn).not.toHaveBeenCalled()
  })

  test("a missing one:  compiles its project ONCE for every request waiting on it, then it's there", async () => {
    const { spawn, children } = spawnStub()
    const build = new ProjectBuild({ root, spawn })
    const waiting = [build.untilBuilt(compiled), build.untilBuilt(compiled)]
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce())
    expect(spawn).toHaveBeenCalledWith(process.execPath, [build.cli, "compile", projectId], expect.anything())
    put(compiled.serverPath, "export {}\n")
    children[0]!.exit(0)
    expect(await Promise.all(waiting)).toEqual([true, true])
  })

  // I50:  a request for it said "ENOENT ... stat", and what the compile said was only in the server's log
  test("a compile that writes nothing says why:  its lines, and how it ended;  its request answers with them", async () => {
    const { spawn, children } = spawnStub()
    const build = new ProjectBuild({ root, spawn })
    const request = { originalUrl: SP.SpellUrls.fileUrl(compiled.path), query: {} }
    const next = vi.fn()
    const serving = build.builtFirst()(request as never, {} as never, next)
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce())
    children[0]!.stderr.write("(node:1) [DEP0205] DeprecationWarning:  register()\n")
    children[0]!.stdout.write(`'${projectId}' isn't a project, a spell file or a project root\n`)
    await new Promise((done) => setTimeout(done, 10))
    children[0]!.exit(2)
    await serving
    const said = [`'${projectId}' isn't a project, a spell file or a project root`, "the compile failed (exit 2)"]
    expect(build.failureOf(projectId)).toEqual(said)
    expect(next).toHaveBeenCalledOnce()
    expect(projectUtils.buildFailures.get(request as never)).toBe(`${projectId} didn't compile:  ${said.join("\n")}`)
  })

  test("a compile that writes it says nothing failed", async () => {
    const { spawn, children } = spawnStub()
    const build = new ProjectBuild({ root, spawn })
    const waiting = build.untilBuilt(compiled)
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce())
    children[0]!.stdout.write("an error that the compile got past\n")
    put(compiled.serverPath, "export {}\n")
    await new Promise((done) => setTimeout(done, 10))
    children[0]!.exit(1)
    expect(await waiting).toBe(true)
    expect(build.failureOf(projectId)).toBeUndefined()
  })

  test("a compile is told the page server's app (`SPELL_APP_DIR`), for its org's groups;  run in the checkout", async () => {
    const { spawn, children } = spawnStub()
    const app = join(root, "acme-app")
    const build = new ProjectBuild({ root, app, spawn, timeout: 20 })
    await build.untilBuilt(compiled)
    expect(spawn).toHaveBeenCalledWith(
      process.execPath,
      [build.cli, "compile", projectId],
      expect.objectContaining({ cwd: root, env: expect.objectContaining({ SPELL_APP_DIR: app, INIT_CWD: root }) })
    )
    children[0]!.exit(0)
  })

  test("a project that isn't there:  no compile, not there", async () => {
    const { spawn } = spawnStub()
    const missing = SP.SpellLocation.getFileLocation(
      `${SP.SpellLocation.getProjectLocation(projectId).projectRoot}/nope`,
      "Nope.spell.js"
    )
    expect(await new ProjectBuild({ root, spawn }).untilBuilt(missing)).toBe(false)
    expect(spawn).not.toHaveBeenCalled()
  })

  test("while the startup compile runs (a slow one):  a project importing no library compiles AT ONCE, beside it", async () => {
    const { spawn, children } = spawnStub()
    const build = new ProjectBuild({ root, spawn }).start()
    const waiting = build.untilBuilt(compiled)
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledTimes(2))
    expect(spawn).toHaveBeenLastCalledWith(process.execPath, [build.cli, "compile", projectId], expect.anything())
    put(compiled.serverPath, "export {}\n")
    children[1]!.exit(0)
    // answered while the startup compile still runs
    expect(await waiting).toBe(true)
    children[0]!.exit(0)
  })

  test("while the startup build runs, for a project it compiles:  waits for it, instead of compiling the project again", async () => {
    const { spawn, children } = spawnStub()
    const build = new ProjectBuild({ root, spawn, warmsSites: false }).start([projectId])
    const waiting = build.untilBuilt(compiled)
    put(compiled.serverPath, "export {}\n")
    children[0]!.exit(0)
    expect(await waiting).toBe(true)
    expect(spawn).toHaveBeenCalledOnce()
  })

  test("while the startup compile runs:  a project importing a library waits for it first, then compiles", async () => {
    const { spawn, children } = spawnStub()
    // the sites' child left out:  it would start as the startup compile ends
    const build = new ProjectBuild({ root, spawn, warmsSites: false }).start()
    const waiting = build.untilBuilt(importerCompiled)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(spawn).toHaveBeenCalledOnce()
    children[0]!.exit(0)
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledTimes(2))
    expect(spawn).toHaveBeenLastCalledWith(process.execPath, [build.cli, "compile", importerId], expect.anything())
    put(importerCompiled.serverPath, "export {}\n")
    children[1]!.exit(0)
    expect(await waiting).toBe(true)
  })

  test("while the startup compile runs:  a project importing a library THROUGH another project waits for it too", async () => {
    const { spawn, children } = spawnStub()
    const build = new ProjectBuild({ root, spawn, warmsSites: false }).start()
    const waiting = build.untilBuilt(throughCompiled)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(spawn).toHaveBeenCalledOnce()
    children[0]!.exit(0)
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledTimes(2))
    expect(spawn).toHaveBeenLastCalledWith(process.execPath, [build.cli, "compile", throughId], expect.anything())
    put(throughCompiled.serverPath, "export {}\n")
    children[1]!.exit(0)
    expect(await waiting).toBe(true)
  })

  test("each step of a request's compile is told:  reading, what `spell compile` says it reaches, then built", async () => {
    const { spawn, children } = spawnStub()
    const build = new ProjectBuild({ root, spawn })
    const steps: BuildStep[] = []
    build.onStep((step) => steps.push(step))
    const waiting = build.untilBuilt(compiled)
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce())
    const [, , { env }] = spawn.mock.calls[0] as unknown as [string, string[], { env: Record<string, unknown> }]
    expect(env.SPELL_COMPILE_STEPS).toBe("1")
    children[0]!.stderr.write(`spell-step: compiling ${projectId}\n`)
    children[0]!.stderr.write(`spell-step: checking ${projectId}\n`)
    await vi.waitFor(() => expect(steps).toHaveLength(3))
    put(compiled.serverPath, "export {}\n")
    children[0]!.exit(0)
    expect(await waiting).toBe(true)
    expect(steps.map((it) => it.step)).toEqual(["reading", "compiling", "checking", "built"])
    expect(steps.every((it) => it.projectId === projectId)).toBe(true)
  })

  test("a compile with mistakes (exit 1):  `mistakes`, told at once", async () => {
    const { spawn, children } = spawnStub()
    const build = new ProjectBuild({ root, spawn })
    const steps: string[] = []
    build.onStep(({ step }) => steps.push(step))
    const waiting = build.untilBuilt(compiled)
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce())
    put(compiled.serverPath, "export {}\n")
    children[0]!.exit(1)
    expect(await waiting).toBe(true)
    expect(steps).toEqual(["reading", "mistakes"])
  })

  test("...and for one that imports a project it compiles, at any depth", () => {
    const build = new ProjectBuild({ root, spawn: spawnStub().spawn }).start(["@spell/library"])
    expect(build.needsStartup("@spell/library/cards")).toBe(true)
    expect(build.needsStartup(projectId)).toBe(false)
    put(
      join(projectFolder, SP.PROJECT_FILE),
      JSON.stringify({ imports: [{ path: "/Built.spell" }, { path: "@spell/library/cards" }] })
    )
    try {
      expect(build.needsStartup(projectId)).toBe(true)
    } finally {
      put(join(projectFolder, SP.PROJECT_FILE), JSON.stringify({ imports: [{ path: "/Built.spell", active: true }] }))
    }
  })

  test("a compile slower than `timeout`:  gives up, not there;  a request after waits on the same compile", async () => {
    const { spawn, children } = spawnStub()
    const build = new ProjectBuild({ root, spawn, timeout: 20 })
    expect(await build.untilBuilt(compiled)).toBe(false)
    expect(await build.untilBuilt(compiled)).toBe(false)
    expect(spawn).toHaveBeenCalledOnce()
    children[0]!.exit(0)
  })

  test("progress():  nothing while no request waits;  while one does, how long, and each project the compile wrote", async () => {
    const { spawn, children } = spawnStub()
    const build = new ProjectBuild({ root, spawn })
    expect(build.progress(projectId)).toEqual({ building: false })
    const waiting = build.untilBuilt(compiled)
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce())
    expect(build.progress(projectId)).toEqual({ building: true, seconds: 0, compiled: [] })
    children[0]!.stdout.write("✓ @acme/tools/api  (imported by Built)  never compiled · wrote build/api\n")
    children[0]!.stdout.write("✓ @spell/library/cards  up to date\n")
    await vi.waitFor(() => expect(build.progress(projectId).compiled).toEqual(["@acme/tools/api"]))
    put(compiled.serverPath, "export {}\n")
    children[0]!.exit(0)
    await waiting
    expect(build.progress(projectId)).toEqual({ building: false })
  })

  test("progress() while the startup build runs:  `afterStartup`, with what IT has compiled", async () => {
    const { spawn, children } = spawnStub()
    const build = new ProjectBuild({ root, spawn, warmsSites: false }).start([projectId])
    const waiting = build.untilBuilt(compiled)
    children[0]!.stdout.write("✓ @spell/examples/Solitaire  never compiled · wrote build/solitaire\n")
    await vi.waitFor(() =>
      expect(build.progress(projectId)).toEqual({
        building: true,
        seconds: 0,
        afterStartup: true,
        compiled: ["@spell/examples/Solitaire"]
      })
    )
    put(compiled.serverPath, "export {}\n")
    children[0]!.exit(0)
    expect(await waiting).toBe(true)
  })

  ////////////////
  // ## A site, page by page (editor P46)
  ////////////////

  describe("a site with no whole build:  its frame and each page, from the sites' child kept running", () => {
    const siteFolder = join(root, "projects", "Site")
    put(join(siteFolder, SP.PROJECT_FILE), JSON.stringify({ imports: [{ path: "/Home.spell", active: true }] }))
    put(join(siteFolder, "Home.spell"), '"home" is a notebook page\n\t<header>Hi</>\n')
    const siteId = locationForDiskPath(join(siteFolder, SP.PROJECT_FILE))!.projectId
    const built = (suffix: string) => SP.SpellLocation.getFileLocation(siteId, `Site${suffix}`)
    const pages = new SitePages(siteId)

    afterEach(() => rmSync(pages.folder, { recursive: true, force: true }))

    /** What the child would write for the frame, and page `page` if asked. */
    function writeAsTheChild(page?: string): void {
      const print: FramePrint = {
        compiler: compilerVersion(),
        imports: {},
        sources: {
          [SP.PROJECT_FILE]: sourceHashOf(join(siteFolder, SP.PROJECT_FILE), "whole"),
          "Home.spell": sourceHashOf(join(siteFolder, "Home.spell"), "alone")
        },
        pages: { Home: "Home.spell" }
      }
      put(pages.framePrintFile, JSON.stringify(print))
      put(pages.fileFor("Site.declarations.json5"), "{}")
      put(pages.fileFor(`Site${SP.COMPILED_JS_SUFFIX}`), "// spell-lazy-pages: Home\n")
      if (!page) return put(pages.pagePrintsFile, "{}")
      put(pages.chunkFor(page), "export class Home {}\n")
      const source = sourceHashOf(join(siteFolder, "Home.spell"), "whole")
      put(
        pages.pagePrintsFile,
        JSON.stringify({ [page]: { frame: sourceHashOf(pages.framePrintFile, "whole"), source } })
      )
    }

    /** The child's next request, once it's asked. */
    async function nextRequest(child: FakeChild): Promise<{ projectId: string; page?: string }> {
      const line = await new Promise<string>((done) => child.stdin.once("data", (data: Buffer) => done(String(data))))
      return JSON.parse(line) as { projectId: string; page?: string }
    }

    /** Answer `request` as the child does. */
    function answer(child: FakeChild, request: object, result: string): void {
      child.stdout.write(`spell-pages: ${JSON.stringify({ ...request, result })}\n`)
    }

    test("start():  the sites' child starts once the startup compile ends:  `spell compile --pages`, asked on its standard input", async () => {
      const { spawn, children } = spawnStub()
      const build = new ProjectBuild({ root, spawn }).start()
      children[0]!.exit(0)
      await vi.waitFor(() => expect(spawn).toHaveBeenCalledTimes(2))
      expect(spawn).toHaveBeenLastCalledWith(
        process.execPath,
        [build.cli, "compile", "--pages"],
        expect.objectContaining({ stdio: ["pipe", "pipe", "pipe"], detached: true })
      )
    })

    test("its declarations, first of what a <spell-viewer> asks:  the frame, compiled by the child, from its folder", async () => {
      const { spawn, children } = spawnStub()
      const build = new ProjectBuild({ root, spawn, warmsSites: false })
      const steps: string[] = []
      build.onStep(({ step }) => steps.push(step))
      const served = build.siteFileFor(built(".declarations.json5"))
      await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce())
      const request = await nextRequest(children[0]!)
      expect(request).toEqual({ projectId: siteId })
      writeAsTheChild()
      answer(children[0]!, request, "built")
      expect(await served).toBe(pages.fileFor("Site.declarations.json5"))
      expect(steps).toEqual(["reading", "built"])
      // up to date now:  nothing asked
      expect(await build.siteFileFor(built(SP.COMPILED_JS_SUFFIX), { lazy: true })).toBe(
        pages.fileFor(`Site${SP.COMPILED_JS_SUFFIX}`)
      )
      expect(spawn).toHaveBeenCalledOnce()
    })

    test("a page's chunk (`?page=Home`):  asked for by its class, compiled once, then served as it is", async () => {
      const { spawn, children } = spawnStub()
      const build = new ProjectBuild({ root, spawn, warmsSites: false })
      writeAsTheChild()
      const served = build.siteFileFor(built(SP.COMPILED_JS_SUFFIX), { page: "Home" })
      await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce())
      const request = await nextRequest(children[0]!)
      expect(request).toEqual({ projectId: siteId, page: "Home" })
      writeAsTheChild("Home")
      answer(children[0]!, request, "built")
      expect(await served).toBe(pages.chunkFor("Home"))
      expect(await build.siteFileFor(built(SP.COMPILED_JS_SUFFIX), { page: "Home" })).toBe(pages.chunkFor("Home"))
      expect(spawn).toHaveBeenCalledOnce()
    })

    test("the child says `whole`:  compiled as any project, from then on, and never asked again", async () => {
      const { spawn, children } = spawnStub()
      const build = new ProjectBuild({ root, spawn, warmsSites: false })
      const served = build.siteFileFor(built(".declarations.json5"))
      await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce())
      answer(children[0]!, await nextRequest(children[0]!), "whole")
      expect(await served).toBeUndefined()
      expect(await build.siteFileFor(built(".declarations.json5"))).toBeUndefined()
      expect(spawn).toHaveBeenCalledOnce()
    })

    test("the child restarts (a file changed):  a new one is asked the same again", async () => {
      const { spawn, children } = spawnStub()
      const build = new ProjectBuild({ root, spawn, warmsSites: false })
      const served = build.siteFileFor(built(".declarations.json5"))
      await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce())
      answer(children[0]!, await nextRequest(children[0]!), "restart")
      children[0]!.exit(0)
      await vi.waitFor(() => expect(spawn).toHaveBeenCalledTimes(2))
      const again = await nextRequest(children[1]!)
      expect(again).toEqual({ projectId: siteId })
      writeAsTheChild()
      answer(children[1]!, again, "built")
      expect(await served).toBe(pages.fileFor("Site.declarations.json5"))
    })

    test("a whole build there, or the whole program asked (no query):  a whole build's to serve, the child never asked", async () => {
      const { spawn } = spawnStub()
      const build = new ProjectBuild({ root, spawn, warmsSites: false })
      expect(await build.siteFileFor(built(SP.COMPILED_JS_SUFFIX))).toBeUndefined()
      put(built(SP.COMPILED_JS_SUFFIX).serverPath, "export {}\n")
      try {
        expect(await build.siteFileFor(built(".declarations.json5"))).toBeUndefined()
      } finally {
        rmSync(built(SP.COMPILED_JS_SUFFIX).serverPath, { force: true })
      }
      // a project with no page file:  not a site
      expect(await build.siteFileFor(compiled, { lazy: true })).toBeUndefined()
      expect(spawn).not.toHaveBeenCalled()
    })
  })

  // a project's own elements, its pack, beside its compiled output
  test("a pack file missing (`__pack/<name>.pack.js`):  a built file too, its project compiled first", async () => {
    const { spawn, children } = spawnStub()
    const build = new ProjectBuild({ root, spawn })
    const script = SP.SpellLocation.getFileLocation(projectId, "__pack/built.pack.js")
    expect(projectUtils.isPackFile(script)).toBe(true)
    const next = vi.fn()
    const serving = build.builtFirst()({ originalUrl: SP.SpellUrls.fileUrl(script.path) } as never, {} as never, next)
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce())
    expect(spawn).toHaveBeenCalledWith(process.execPath, [build.cli, "compile", projectId], expect.anything())
    put(script.serverPath, "/* built */\n")
    children[0]!.exit(0)
    await serving
    expect(next).toHaveBeenCalledOnce()
    rmSync(dirname(script.serverPath), { recursive: true, force: true })
  })

  test("rebuildPack():  `compile --pack`, one at a time:  saves meanwhile share ONE more after it", async () => {
    const { spawn, children } = spawnStub()
    const build = new ProjectBuild({ root, spawn })
    const first = build.rebuildPack(projectId)
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce())
    expect(spawn).toHaveBeenCalledWith(process.execPath, [build.cli, "compile", "--pack", projectId], expect.anything())
    const second = build.rebuildPack(projectId)
    const third = build.rebuildPack(projectId)
    expect(third).toBe(second)
    await new Promise((done) => setTimeout(done, 10))
    expect(spawn).toHaveBeenCalledOnce()
    children[0]!.exit(0)
    expect(await first).toBe(true)
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledTimes(2))
    children[1]!.exit(1)
    expect(await second).toBe(false)
  })
})
