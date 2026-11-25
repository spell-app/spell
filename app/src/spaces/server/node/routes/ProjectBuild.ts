import { spawn as nodeSpawn, type ChildProcess, type SpawnOptions } from "child_process"
import { existsSync, readFileSync } from "fs"
import { createRequire } from "module"
import { dirname, join } from "path"
import { createInterface } from "readline"

import { Logger } from "spell/util/spell/Logger"
import { within } from "spell/util/timing"
import { SRV } from "spell/server"
import environment from "spell/app/spaces/server/node/environment"
import * as projectUtils from "spell/app/spaces/server/node/projects/project-utils"
import * as responseUtils from "spell/app/spaces/server/node/projects/response-utils"
import { SP } from "spell/parser/spell"
import { hasProjectFile, projectFileIn } from "spell/parser/spell/node/projectFile"
import { parseJSON5 } from "spell/util"
import { appDir } from "spell/app/spaces/server/node/people/localPerson"

/**
 * Builds spell projects when the API needs what they build:  their compiled output and scope packs are in `build/`
 * (epic `people-and-orgs` P11), never committed, so a fresh checkout or worktree has none.
 * - `start()`:  when the page server starts, compiles the built-in projects that are out of date, in the background:
 *   `spell compile --stale --all @spell/examples @spell/library @spell/guides` (`STARTUP_PROJECTS`), as the kit's page
 *   server's `BundleBuild` builds the bundles;  the guides since the page server shows the Spell UI site with no
 *   editor, at `/components/ui/` (epic `editor` P43)
 * - `builtFirst()`:  a route's handler.
 *   A request for a built file that isn't there (`/spaces/<project>/<file>`) compiles its project first,
 *   `spell compile <projectId>`, then goes on to be served:
 *   - while the startup build runs, it waits for that instead
 *   - one compile per project at a time:  a second request for it waits on the first's
 *   - at most `timeout` ms in all;  then it's served as it is (a 404), while the compile carries on
 *   - only a project that's there (it has a project file):  an unknown one 404s at once
 *   - a file that's there is served at once, even if its sources changed since:
 *     `start()` and `spell compile --stale` catch those
 *   - a compile that ended without writing it says why (`failureOf()`):  its request answers with what the compile
 *     said, not that the file isn't there (`projectUtils.buildFailures`, I50:  "ENOENT ... stat" hid "isn't a project")
 * - A child process, the checkout's OWN `spell` CLI, never this one:
 *   - it compiles exactly as `spell compile` does:  every target, the scope pack, the checks
 *   - the page server runs the API in its own process, and keeps serving pages while it compiles
 *   - told the page server's own app (`SPELL_APP_DIR`, `localPerson.ts`'s `appDir()`), e.g. a project outside the
 *     kit with its own org:  else it'd take the kit's, and not know that org's groups (`@acme/tools/...` "isn't a
 *     project");  `SPELL_SPACES_DIR` passes through as it is
 * - Its output goes to the server's log, each line prefixed `projects:  ` (`SRV.ServerLog`, `server:projects`):
 *   - shown:  each project compiled, with how many warnings, and every error;  each run a group of its own
 *   - debug (`SPELL_DEBUG=server:projects`):  the command, the projects up to date, each warning, the files written
 * - `progress()`:  how a compile a request waits for is coming along, for the page that's waiting to say so
 *   (`GET /api/projects/building/<project>`):  a fresh checkout's first run of a big project takes a while.
 * - NEVER throws.
 */
export class ProjectBuild {
  /** the checkout whose CLI compiles */
  readonly root: string

  /** the app the page server runs for, whose org's groups the compile knows (`SPELL_APP_DIR`) */
  readonly app: string

  /** ms a request waits for its project to compile */
  readonly timeout: number

  /** starts a child:  `child_process`'s `spawn`, or a test's stub */
  private spawn: SpawnBuild

  /** the startup build, while it runs */
  private startup?: Promise<void>

  /** the projects (or groups) the startup build compiles, `start()`'s */
  private startupProjects: string[] = []

  /** each project's compile, by project id, while it runs */
  private compiles = new Map<string, Promise<void>>()

  /** each project requests wait to see built, by project id:  since when, and how many requests -- see `progress()` */
  private waiting = new Map<string, { since: number; requests: number }>()

  /** the projects each run has compiled so far, as its lines say:  the startup build's, and each project's compile's */
  private compiled = { startup: [] as string[], byProject: new Map<string, string[]>() }

  /** what each project's last compile said, by project id, when it ended without writing what was asked for */
  private failures = new Map<string, string[]>()

  /** its lines in the server's log */
  readonly log = new SRV.ServerLog({ prefix: "projects" })

  /** every child still running, for `stop()` */
  private children = new Set<ChildProcess>()

  constructor({ root = CHECKOUT_ROOT, app, timeout = COMPILE_WAIT_MS, spawn = nodeSpawn }: ProjectBuildProps = {}) {
    this.root = root
    this.app = app ?? appDir()
    this.timeout = timeout
    this.spawn = spawn
  }

  /** the checkout's own `spell`:  the kit's `bin/spell.mjs`, as `root`'s install resolves it (`kitSpell()`) */
  get cli(): string | undefined {
    return kitSpell(this.root)
  }

  /** Is the startup build running? */
  get isStarting(): boolean {
    return this.startup !== undefined
  }

  /**
   * Compile `projects` that are out of date, in the background:  `spell compile --stale --all <projects...>`.
   * - Once:  a second call while it runs does nothing.
   */
  start(projects: string[] = STARTUP_PROJECTS): this {
    if (this.startup) return this
    this.startupProjects = projects
    this.compiled.startup = []
    const startup = this.run(["compile", "--stale", "--all", ...projects], this.compiled.startup)
    this.startup = startup
    void startup.then(() => {
      if (this.startup === startup) this.startup = undefined
    })
    return this
  }

  /** Stop every compile still running:  each one's whole process group.  NEVER throws. */
  stop(): void {
    for (const child of this.children) {
      try {
        process.kill(-child.pid!, "SIGTERM")
      } catch {
        child.kill("SIGTERM")
      }
    }
  }

  /**
   * Make sure built file `location` is there, compiling its project if it isn't -- see the class.
   * - `true`:  it's there;  `false`:  it isn't, e.g. its project has errors, isn't there, or took too long
   */
  async untilBuilt(location: SP.SpellLocation): Promise<boolean> {
    const file = location.serverPath
    if (existsSync(file)) return true
    const { projectId } = location
    if (!hasProjectFile(SP.SpellLocation.getProjectLocation(projectId).serverPath)) return false
    const waiting = this.waiting.get(projectId) ?? { since: Date.now(), requests: 0 }
    waiting.requests++
    this.waiting.set(projectId, waiting)
    try {
      return await this.compiledFor(location)
    } finally {
      if (--waiting.requests === 0) this.waiting.delete(projectId)
    }
  }

  /**
   * Why project `projectId`'s last compile wrote nothing:  what it said, its errors and how it ended, a line each;
   * `undefined` when it wrote what was asked for, or hasn't run.
   */
  failureOf(projectId: string): string[] | undefined {
    return this.failures.get(projectId)
  }

  /**
   * How project `projectId`'s compile is coming along, while a request waits for it -- `building: false` when none does.
   * - `seconds`:  how long the first request has waited
   * - `afterStartup`:  it waits for the startup build first, `start()`'s (Spell's own projects)
   * - `compiled`:  the projects the compile it waits for has compiled so far, e.g. one it imports
   */
  progress(projectId: string): BuildProgress {
    const waiting = this.waiting.get(projectId)
    if (!waiting) return { building: false }
    const ownCompile = this.compiles.has(projectId)
    return {
      building: true,
      seconds: Math.floor((Date.now() - waiting.since) / 1000),
      ...(!ownCompile && this.startup && { afterStartup: true }),
      compiled: [
        ...((ownCompile ? this.compiled.byProject.get(projectId) : this.startup && this.compiled.startup) || [])
      ]
    }
  }

  /**
   * `GET /api/projects/building/<project>`'s handler:  `progress()`, as JSON.
   * - The project's address as it arrived, still encoded (`SP.SpellUrls.projectIdFor()`);  400 when it names none.
   * - Asked by a page while its request for a built file waits:  the runner's `buildProgress.ts`.
   */
  request_progress(): SRV.Handler {
    return responseUtils.respondWithJSON(async (request) => {
      let projectId: string
      try {
        projectId = SP.SpellUrls.projectIdFor(request.originalUrl.split(/[?#]/)[0]!)
      } catch (error) {
        throw new SRV.HttpError(400, `GET ${SP.SpellUrls.BUILDING}:  ${(error as Error).message}`)
      }
      return this.progress(projectId)
    })
  }

  /**
   * Does project `projectId` wait for the startup build:  is it, or does it import (at any depth), one it compiles?
   * - Else its own compile starts at once (I120):  a project of another space's, e.g. an org's, waited a minute for
   *   Spell's own examples and guides on a fresh checkout, and its request ran out of time before its compile began.
   * - It does when its imports can't be read:  waiting is how it was.
   */
  needsStartup(projectId: string, seen = new Set<string>()): boolean {
    const isStartup = (id: string) => this.startupProjects.some((it) => id === it || id.startsWith(`${it}/`))
    if (isStartup(projectId)) return true
    if (seen.has(projectId)) return false
    seen.add(projectId)
    try {
      const file = projectFileIn(SP.SpellLocation.getProjectLocation(projectId).serverPath)
      if (!file) return false
      const { imports = [] } = parseJSON5(readFileSync(file, "utf8")) as { imports?: Array<{ path?: string }> }
      // a project's own files start with `/`;  another project is named by its address
      return imports.some(({ path }) => !!path && !path.startsWith("/") && this.needsStartup(path, seen))
    } catch {
      return true
    }
  }

  /** `untilBuilt()`'s work, once it's known the file isn't there and its project is. */
  private async compiledFor(location: SP.SpellLocation): Promise<boolean> {
    const file = location.serverPath
    const { projectId } = location
    const deadline = Date.now() + this.timeout
    const secondsLeft = () => Math.max(0, deadline - Date.now()) / 1000
    if (this.startup && this.needsStartup(projectId)) {
      await within(this.startup, secondsLeft())
      if (existsSync(file)) return true
    }
    let compile = this.compiles.get(projectId)
    if (!compile) {
      const compiled: string[] = []
      const said: string[] = []
      this.compiled.byProject.set(projectId, compiled)
      compile = this.run(["compile", projectId], compiled, said).then(() => {
        if (existsSync(file) || !said.length) this.failures.delete(projectId)
        else this.failures.set(projectId, said)
      })
      this.compiles.set(projectId, compile)
      void compile.then(() => {
        this.compiles.delete(projectId)
        this.compiled.byProject.delete(projectId)
      })
    }
    await within(compile, secondsLeft())
    return existsSync(file)
  }

  /**
   * A route's handler, ahead of the one that serves the file:  makes sure the built file it names is there.
   * - The file is the request's URL's, `/spaces/<project>/<file>` (`projectUtils.locationForUrl()`),
   *   when that's a file spell builds (`projectUtils.isBuiltFile()`), e.g. `Solitaire.spell.js`.
   * - A bad URL goes on to the next handler, which says what's wrong.
   */
  builtFirst(): SRV.Handler {
    return async (request, _reply, next) => {
      let location: SP.SpellLocation
      try {
        location = projectUtils.locationForUrl(request.originalUrl)
      } catch {
        return next()
      }
      if (projectUtils.isBuiltFile(location) && !(await this.untilBuilt(location))) {
        const failure = this.failures.get(location.projectId)
        if (failure)
          projectUtils.buildFailures.set(request, `${location.projectId} didn't compile:  ${failure.join("\n")}`)
      }
      next()
    }
  }

  /**
   * Run the CLI with `args`, in the checkout, logging its output;  resolves when it ends, however it ends.
   * - SIDE EFFECT:  each project it says it compiled goes on the end of `compiled`, as it says so;  every other line
   *   it says, but a warning or node's own notes, on the end of `said`, and how it ended when that's a failure
   * - a checkout without the CLI (a test's temp folder) runs nothing
   * - its own process group (`detached`), so `stop()` ends what it starts too
   */
  private run(args: string[], compiled: string[] = [], said: string[] = []): Promise<void> {
    const cli = this.cli
    if (!cli || !existsSync(cli)) return Promise.resolve()
    // each run its own group, from its first line shown
    this.log.groupNext()
    this.log.debug(`spell ${args.join(" ")}`)
    let child: ChildProcess
    try {
      child = this.spawn(process.execPath, [cli, ...args], {
        cwd: this.root,
        // not this server's `TSX_TSCONFIG_PATH`:  the CLI registers its own `tsconfig.json`;
        // this server's app, so a project outside the kit is known by its org's groups
        env: { ...process.env, INIT_CWD: this.root, SPELL_APP_DIR: this.app, TSX_TSCONFIG_PATH: undefined },
        stdio: ["ignore", "pipe", "pipe"],
        detached: true
      })
    } catch (error) {
      this.log.error("couldn't start the compile:", error)
      return Promise.resolve()
    }
    this.children.add(child)
    for (const stream of [child.stdout, child.stderr]) {
      if (!stream) continue
      createInterface({ input: stream }).on("line", (line) => {
        const project = COMPILED_LINE.exec(line)?.[1]
        if (project) compiled.push(project)
        else if (line.trim() && !NOT_SAID.some((it) => it.test(line))) said.push(line.trim())
        this.log.childLine(line, COMPILE_LINES)
      })
    }
    return new Promise((done) => {
      child.once("error", (error) => {
        this.log.error("the compile failed to run:", error)
        this.children.delete(child)
        done()
      })
      child.once("exit", (code, signal) => {
        // 1:  a project had errors, listed above;  its files are written all the same
        if (code !== 0 && code !== 1) {
          this.log.error(`the compile failed (${signal ?? `exit ${code}`})`)
          said.push(`the compile failed (${signal ?? `exit ${code}`})`)
        }
        this.children.delete(child)
        done()
      })
    })
  }
}

/**
 * How `spell compile`'s lines are logged, before `SRV.ServerLog.CHILD_LINES` (errors, warnings);  the rest are shown.
 * - debug:  a project up to date;  each warning under a project, which its line counts (`18 warnings`)
 * - a project compiled:  shown without the files it wrote (`· wrote build/...`)
 */
const COMPILE_LINES: SRV.LineRule[] = [
  { line: /^✓ \S+ {2}up to date$/, level: Logger.DEBUG },
  { line: /^\s+\S.*\bwarning:/, level: Logger.DEBUG },
  { line: /^✓ .* · wrote /, level: Logger.INFO, shown: (line) => line.replace(/ · wrote .*$/, "") }
]

/**
 * Lines of a compile's that never say why it failed:  a project up to date or compiled, a warning, node's own notes
 * (`(node:123) [DEP0205] DeprecationWarning ...`).
 */
const NOT_SAID = [/^✓ /, /^\s+\S.*\bwarning:/, /^\(node:\d+\)/, /^\(Use `node /]

/** A line of `spell compile`'s saying it compiled a project, and wrote its files:  `✓ <project>  ... · wrote ...`. */
const COMPILED_LINE = /^✓ (\S+) .* · wrote /

/** How a project's compile is coming along:  `progress()`'s answer, see `SP.BuildProgress`. */
export type BuildProgress = SP.BuildProgress

/** The built-in projects `start()` compiles:  what the demo pages and App UI's component pages run. */
export const STARTUP_PROJECTS = ["@spell/examples", "@spell/library", "@spell/guides"]

/** ms a request waits for its project to compile, startup build included. */
export const COMPILE_WAIT_MS = 60_000

/** This checkout's root:  where its `build/` is (`environment.buildDir`), and its CLI. */
const CHECKOUT_ROOT = environment.repoDir

/** Starts a compile's child process:  `child_process`'s `spawn`, or a test's stub. */
export type SpawnBuild = (command: string, args: string[], options: SpawnOptions) => ChildProcess

/**
 * `new ProjectBuild()` props.
 * - `root`:  the checkout whose CLI compiles (default:  this one)
 * - `app`:  the app the page server runs for (default:  `appDir()`, this server's)
 * - `timeout`:  ms a request waits (default `COMPILE_WAIT_MS`)
 * - `spawn`:  starts a child (default `child_process`'s);  tests pass a stub
 */
export type ProjectBuildProps = { root?: string; app?: string; timeout?: number; spawn?: SpawnBuild }

/**
 * The kit's `spell` command (`spell`'s `bin/spell.mjs`), as checkout `root`'s install resolves the kit:
 * the checkout's OWN, never the `spell` on `PATH` (maybe main's);  `undefined` when its install has no kit.
 * - By package, never a path into the kit (the root `AGENTS.md`, "Imports across repos").
 * - NOTE: the kit's `BundleBuild` (`spell/server/page`) keeps a twin of this:  the kit imports no repo above it
 */
function kitSpell(root: string): string | undefined {
  try {
    const kit = dirname(createRequire(join(root, "package.json")).resolve("spell/package.json"))
    return join(kit, "bin", "spell.mjs")
  } catch {
    return undefined
  }
}
