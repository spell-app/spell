import { spawn as nodeSpawn, type ChildProcess, type SpawnOptions } from "child_process"
import { existsSync } from "fs"
import { createRequire } from "module"
import { dirname, join } from "path"
import { createInterface } from "readline"

import { readJSON5File } from "spell/util/node/json5"
import { Logger } from "spell/util/spell/Logger"
import { within } from "spell/util/timing"
import { SRV } from "spell/server"
import { BUILD_STEPS_VARIABLE, buildStepIn, type BuildStep } from "spell/app/spaces/models/buildSteps"
import environment from "spell/app/spaces/server/node/environment"
import * as projectUtils from "spell/app/spaces/server/node/projects/project-utils"
import { SP } from "spell/parser/spell"
import { projectFileIn } from "spell/parser/spell/node/projectFile"
import { appDir } from "spell/app/spaces/server/node/people/localPerson"

/**
 * Builds spell projects when the API needs what they build:  their compiled output and scope packs are in `build/`
 * (epic `people-and-orgs` P11), never committed, so a fresh checkout or worktree has none.
 * - `start()`:  when the page server starts, compiles Spell's built-in LIBRARIES that are out of date, in the
 *   background:  `spell compile --stale --all @spell/library` (`STARTUP_PROJECTS`), as the kit's page server's
 *   `BundleBuild` builds the bundles
 *   - only the libraries (epic `editor` P45, Q88):  other projects import them, and VS Code reads their schemas;
 *     every example and guide compiles the first time a page asks for it (below)
 *   - out of date by what's in its files, not by their dates (the cli's `staleBecause()`):  a merge that doesn't
 *     really change the compiler rebuilds nothing
 * - `builtFirst()`:  a route's handler.
 *   A request for a built file that isn't there (`/spaces/<project>/<file>`) compiles its project AT ONCE,
 *   `spell compile <projectId>`, beside anything else running, then goes on to be served (epic `editor` P45, Q89):
 *   - never waiting behind the startup compile, except a project that imports one of the projects it compiles
 *     (`STARTUP_PROJECTS`):  that one waits for it first, so two compiles never write the same library at once
 *   - one compile per project at a time:  a second request for it waits on the first's
 *   - at most `timeout` ms in all;  then it's served as it is (a 404), while the compile carries on
 *   - only a project that's there (it has a project file):  an unknown one 404s at once
 *   - a file that's there is served at once, even if its sources changed since:
 *     `start()` and `spell compile --stale` catch those
 * - Each step of a request's compile is told to whoever listens (`onStep()`), which the route module passes on to
 *   every open page:  `reading` as it starts, `compiling` and `checking` as `spell compile` says it reaches them
 *   (its `spell-step:` lines, `BUILD_STEPS_VARIABLE`), then `built`, or `mistakes`
 *   - the runner's waiting box and the editor's loading screen say them in words (`BuildStep`, spaces' models)
 * - A child process, the checkout's OWN `spell` CLI, never this one:
 *   - it compiles exactly as `spell compile` does:  every target, the scope pack, the checks
 *   - the page server runs the API in its own process, and keeps serving pages while it compiles
 *   - told the page server's own app (`SPELL_APP_DIR`, `localPerson.ts`'s `appDir()`), e.g. a project outside the
 *     kit with its own org:  else it'd take the kit's, and not know that org's groups (`@acme/tools/...` "isn't a
 *     project");  `SPELL_SPACES_DIR` passes through as it is
 * - Its output goes to the server's log, each line prefixed `projects:  ` (`SRV.ServerLog`, `server:projects`):
 *   - shown:  each project compiled, with how many warnings, and every error;  each run a group of its own
 *   - debug (`SPELL_DEBUG=server:projects`):  the command, the projects up to date, each warning, the files written
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

  /** each project's compile, by project id, while it runs */
  private compiles = new Map<string, Promise<void>>()

  /** its lines in the server's log */
  readonly log = new SRV.ServerLog({ prefix: "projects" })

  /** every child still running, for `stop()` */
  private children = new Set<ChildProcess>()

  /** who hears each step of a request's compile (`onStep()`) */
  private stepListeners = new Set<(step: BuildStep) => void>()

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
    const startup = this.run(["compile", "--stale", "--all", ...projects]).then(() => undefined)
    this.startup = startup
    void startup.then(() => {
      if (this.startup === startup) this.startup = undefined
    })
    return this
  }

  /**
   * Hear each step of a request's compile:  `reading`, `compiling`, `checking`, then `built` or `mistakes`.
   * - The startup compile's are never told:  no page waits on it.
   * - Returns what stops it.
   */
  onStep(listener: (step: BuildStep) => void): () => void {
    this.stepListeners.add(listener)
    return () => {
      this.stepListeners.delete(listener)
    }
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
    const projectFile = projectFileIn(SP.SpellLocation.getProjectLocation(projectId).serverPath)
    if (!projectFile) return false
    const deadline = Date.now() + this.timeout
    const secondsLeft = () => Math.max(0, deadline - Date.now()) / 1000
    this.say({ projectId, step: "reading" })
    // what the startup compile builds, written by one compile at a time:  a project importing it waits for that first
    if (this.startup && importsAny(projectFile, STARTUP_PROJECTS)) {
      await within(this.startup, secondsLeft())
      if (existsSync(file)) {
        this.say({ projectId, step: "built" })
        return true
      }
    }
    let compile = this.compiles.get(projectId)
    if (!compile) {
      compile = this.run(["compile", projectId], { steps: true }).then((code) => {
        // 1:  it has mistakes;  its files are written all the same
        this.say({ projectId, step: code === 0 && existsSync(file) ? "built" : "mistakes" })
      })
      this.compiles.set(projectId, compile)
      void compile.then(() => this.compiles.delete(projectId))
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
      if (projectUtils.isBuiltFile(location)) await this.untilBuilt(location)
      next()
    }
  }

  /**
   * Run the CLI with `args`, in the checkout, logging its output;  resolves when it ends, however it ends:
   * with its exit code, `undefined` when it didn't run or was stopped.
   * - a checkout without the CLI (a test's temp folder) runs nothing
   * - its own process group (`detached`), so `stop()` ends what it starts too
   * - `steps`:  it prints each step it reaches (`BUILD_STEPS_VARIABLE`), told to `onStep()`'s listeners, not logged
   */
  private run(args: string[], { steps = false }: { steps?: boolean } = {}): Promise<number | undefined> {
    const cli = this.cli
    if (!cli || !existsSync(cli)) return Promise.resolve(undefined)
    // each run its own group, from its first line shown
    this.log.groupNext()
    this.log.debug(`spell ${args.join(" ")}`)
    let child: ChildProcess
    try {
      child = this.spawn(process.execPath, [cli, ...args], {
        cwd: this.root,
        // not this server's `TSX_TSCONFIG_PATH`:  the CLI registers its own `tsconfig.json`;
        // this server's app, so a project outside the kit is known by its org's groups
        env: {
          ...process.env,
          INIT_CWD: this.root,
          SPELL_APP_DIR: this.app,
          TSX_TSCONFIG_PATH: undefined,
          [BUILD_STEPS_VARIABLE]: steps ? "1" : undefined
        },
        stdio: ["ignore", "pipe", "pipe"],
        detached: true
      })
    } catch (error) {
      this.log.error("couldn't start the compile:", error)
      return Promise.resolve(undefined)
    }
    this.children.add(child)
    for (const stream of [child.stdout, child.stderr]) {
      if (stream) createInterface({ input: stream }).on("line", (line) => this.lineFromChild(line))
    }
    return new Promise((done) => {
      child.once("error", (error) => {
        this.log.error("the compile failed to run:", error)
        this.children.delete(child)
        done(undefined)
      })
      child.once("exit", (code, signal) => {
        // 1:  a project had errors, listed above;  its files are written all the same
        if (code !== 0 && code !== 1) this.log.error(`the compile failed (${signal ?? `exit ${code}`})`)
        this.children.delete(child)
        done(code ?? undefined)
      })
    })
  }

  /** A line of a compile's output:  a step, told to `onStep()`'s listeners;  else logged (`COMPILE_LINES`). */
  private lineFromChild(line: string): void {
    const step = buildStepIn(line)
    if (step) this.say(step)
    else this.log.childLine(line, COMPILE_LINES)
  }

  /** Tell `step` to every `onStep()` listener, and the log's debug lines.  NEVER throws. */
  private say(step: BuildStep): void {
    this.log.debug(`${step.projectId}:  ${step.step}`)
    for (const listener of this.stepListeners) {
      try {
        listener(step)
      } catch (error) {
        this.log.error("a build step's listener failed:", error)
      }
    }
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
 * The built-in projects `start()` compiles:  Spell's libraries, which other projects import and VS Code reads the
 * schemas of (epic `editor` P45, Q88).
 * - Every example and guide compiles the first time a page asks for it (`builtFirst()`).
 */
export const STARTUP_PROJECTS = ["@spell/library"]

/** ms a request waits for its project to compile, the startup compile included for one that imports a library. */
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

/**
 * Does the project whose project file is `projectFile` import a project in any of `groups`, e.g. `@spell/library`?
 * - Its project file's `imports`:  another project's entry is its address, a file's starts with `/`.
 * - A file that can't be read imports nothing.
 */
function importsAny(projectFile: string, groups: string[]): boolean {
  try {
    const { imports = [] } = readJSON5File<{ imports?: Array<{ path?: string }> }>(projectFile)
    return imports.some(({ path = "" }) => groups.some((group) => path.startsWith(`${group}/`)))
  } catch {
    return false
  }
}
