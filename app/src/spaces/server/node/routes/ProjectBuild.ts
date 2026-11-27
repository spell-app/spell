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
import * as responseUtils from "spell/app/spaces/server/node/projects/response-utils"
import { SitePages } from "spell/app/spaces/server/node/projects/SitePages"
import { SP } from "spell/parser/spell"
import { projectFileIn } from "spell/parser/spell/node/projectFile"
import { appDir } from "spell/app/spaces/server/node/people/localPerson"
import { SitePagesBuild } from "./SitePagesBuild"
import { ProjectPack } from "spell/app/spaces/server/node/projects/ProjectPack"

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
 *     (`STARTUP_PROJECTS`), itself or through another project:  that one waits for it first, so two compiles never
 *     write the same library at once
 *   - one compile per project at a time:  a second request for it waits on the first's
 *   - at most `timeout` ms in all;  then it's served as it is (a 404), while the compile carries on
 *   - only a project that's there (it has a project file):  an unknown one 404s at once
 *   - a file that's there is served at once, even if its sources changed since:
 *     `start()` and `spell compile --stale` catch those
 *   - a compile that ended without writing it says why (`failureOf()`):  its request answers with what the compile
 *     said, not that the file isn't there (`projectUtils.buildFailures`, I50:  "ENOENT ... stat" hid "isn't a project")
 * - A SITE is compiled page by page while it has no whole build (epic `editor` P46):  `SitePages`, spaces' projects'.
 *   - What a `<spell-viewer>` asks of it (`?pages=lazy`, its declarations, words, scope pack and map) is its FRAME:
 *     the site without its pages alone in their files;  `?page=<Class>` is one page, compiled the first time it's asked
 *   - both by ONE child kept running, `spell compile --pages` (`SitePagesBuild`):  started as the startup compile
 *     ends (`warmsSites`), so the first page waits for no start
 *   - each served from the site's `__pages/` folder, by `builtFirst()` itself
 *   - out of date by its own fingerprints, checked on each request (`SitePages.frameStaleBecause()`,
 *     `pageStaleBecause()`):  a page edited compiles again as it's next asked for
 *   - a whole build, once there (`spell compile`, the editor's Save), is served as before:  `<Project>.spell.js`
 *     asked with no query compiles the whole site, as for any project
 *   - a project the child says has no page alone in its file (`whole`) is compiled whole from then on
 * - Each step of a request's compile is told to whoever listens (`onStep()`), which the route module passes on to
 *   every open page:  `reading` as it starts, `compiling` and `checking` as `spell compile` says it reaches them
 *   (its `spell-step:` lines, `BUILD_STEPS_VARIABLE`), then `built`, or `mistakes`
 *   - the runner's waiting box and the editor's loading screen say them in words (`BuildStep`, spaces' models)
 * - `progress()`:  how a compile a request waits for is coming along, for the page that's waiting to say so
 *   (`GET /api/projects/building/<project>`):  how long so far, and each project it's compiled
 * - A child process, the checkout's OWN `spell` CLI, never this one:
 *   - it compiles exactly as `spell compile` does:  every target, the scope pack, the checks
 *   - the page server runs the API in its own process, and keeps serving pages while it compiles
 *   - told the page server's own app (`SPELL_APP_DIR`, `localPerson.ts`'s `appDir()`), e.g. a project outside the
 *     kit with its own org:  else it'd take the kit's, and not know that org's groups (`@acme/tools/...` "isn't a
 *     project");  `SPELL_SPACES_DIR` passes through as it is
 * - Its output goes to the server's log, each line prefixed `projects:  ` (`SRV.ServerLog`, `server:projects`):
 *   - shown:  each project compiled, with how many warnings, and every error;  each run a group of its own
 *   - debug (`SPELL_DEBUG=server:projects`):  the command, the projects up to date, each warning, the files written
 * - `rebuildPack()`:  a project's component pack, built again as one of its elements is saved (the page server's watch
 *   of the spaces, `appRoutes.ts`):  `spell compile --pack <project>`, one at a time per project
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

  /** who hears each step of a request's compile (`onStep()`) */
  private stepListeners = new Set<(step: BuildStep) => void>()

  /** does `start()` start the sites' child as its compile ends (`SitePagesBuild.warm()`)? */
  readonly warmsSites: boolean

  /** the ONE child compiling sites page by page, kept running */
  readonly sitePages: SitePagesBuild

  /** each project the sites' child said has no page alone in its file:  compiled whole */
  private wholeProjects = new Set<string>()

  /** each site's compile by the sites' child, by what it asks, while it runs:  one at a time */
  private pageCompiles = new Map<string, Promise<boolean>>()

  constructor({
    root = CHECKOUT_ROOT,
    app,
    timeout = COMPILE_WAIT_MS,
    spawn = nodeSpawn,
    warmsSites = true
  }: ProjectBuildProps = {}) {
    this.root = root
    this.app = app ?? appDir()
    this.timeout = timeout
    this.spawn = spawn
    this.warmsSites = warmsSites
    this.sitePages = new SitePagesBuild({
      start: () => this.startChild(["compile", "--pages"], { steps: true, stdin: true }),
      onLine: (line) => this.lineFromChild(line)
    })
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
    const startup = this.run(["compile", "--stale", "--all", ...projects], { compiled: this.compiled.startup }).then(
      () => undefined
    )
    this.startup = startup
    void startup.then(() => {
      if (this.startup === startup) this.startup = undefined
      // ready for a site's first page, once the libraries are:  it then waits for no `spell` to start
      if (this.warmsSites) this.sitePages.warm()
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
    if (!projectFileIn(SP.SpellLocation.getProjectLocation(projectId).serverPath)) return false
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
   * - `afterStartup`:  it waits for the startup build first, `start()`'s (Spell's libraries)
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
   * Does project `projectId` wait for the startup build:  is it one it compiles, or does it import one, itself or
   * through another project, at any depth (`importsAny()`)?
   * - Two compiles never write the same library at once.
   * - Else its own compile starts at once (I120):  a project of another space's, e.g. an org's, waited for Spell's own
   *   projects on a fresh checkout, and its request ran out of time before its compile began.
   */
  needsStartup(projectId: string): boolean {
    const groups = this.startupProjects
    if (groups.some((group) => projectId === group || projectId.startsWith(`${group}/`))) return true
    const projectFile = projectFileIn(SP.SpellLocation.getProjectLocation(projectId).serverPath)
    return !!projectFile && importsAny(projectFile, groups)
  }

  /**
   * Build project `projectId`'s component pack again, as one of its elements was saved:
   * `spell compile --pack <project>`, unminified, in the same child `spell` it compiles with.
   * - One at a time per project:  a save while one runs queues ONE more, after it, which every save meanwhile shares.
   * - Resolves `true` once it built, `false` when it failed (what it said is in the server's log);  NEVER rejects.
   */
  rebuildPack(projectId: string): Promise<boolean> {
    const queue = this.packQueues.get(projectId) ?? {}
    if (queue.waiting) return queue.waiting
    const after = queue.running ?? Promise.resolve(true)
    const waiting = after.then(() => {
      queue.waiting = undefined
      const running = this.run(["compile", "--pack", projectId]).then((code) => code === 0)
      queue.running = running
      void running.then(() => {
        if (queue.running === running && !queue.waiting) this.packQueues.delete(projectId)
      })
      return running
    })
    queue.waiting = waiting
    this.packQueues.set(projectId, queue)
    return waiting
  }

  /**
   * When `location` is a project's pack's script that's there but built from older sources than its project has now
   * (`ComponentPack.needsBuild()`):  build it again first (`rebuildPack()`), for at most `timeout` ms.
   * - NEVER throws:  a pack that can't be read is served as it is.
   */
  private async packCurrent(location: SP.SpellLocation): Promise<void> {
    if (!location.file?.endsWith(PACK_SCRIPT_SUFFIX) || !existsSync(location.serverPath)) return
    try {
      const pack = ProjectPack.ofProject(location.projectId)
      if (pack?.needsBuild()) await within(this.rebuildPack(location.projectId), this.timeout / 1000)
    } catch {
      // served as it is
    }
  }

  /** Each project's pack rebuild, by project id:  the one running, and the one waiting after it (`rebuildPack()`). */
  private packQueues = new Map<string, { running?: Promise<boolean>; waiting?: Promise<boolean> }>()

  /**
   * `GET /api/projects/pack/<project>/__pack/<name>.pack.ts`'s handler:  where a project's pack's SOURCE entry is on
   * disk, built first when it isn't there (`untilBuilt()`), for Spell's own dev server to serve it from its sources
   * (the app's `vite.config.ts`, `projectPacksInDev()`).
   * - Answers `{ entry, components, project }`:  the entry file, its families' folder, the project's folder;  absolute.
   * - 404 for a project that declares no pack, or one whose entry couldn't be built (what its compile said).
   * - Only the editor's dev server asks:  it reads these files itself, on this machine.
   */
  request_devPack(): SRV.Handler {
    return responseUtils.respondWithJSON(async (request) => {
      const path = request.originalUrl.split(/[?#]/)[0]!
      const address = decodeURI(path.slice(path.indexOf(DEV_PACK_API) + DEV_PACK_API.length))
      let location: SP.SpellLocation
      try {
        location = SP.SpellLocation.getFileLocation(address)
      } catch (error) {
        throw new SRV.HttpError(400, `GET ${DEV_PACK_API}:  ${(error as Error).message}`)
      }
      const project = SP.SpellLocation.getProjectLocation(location.projectId).serverPath
      const pack = projectUtils.isPackFile(location) ? ProjectPack.of(project) : undefined
      if (!pack || location.serverPath !== pack.files.devEntry) {
        throw new SRV.HttpError(404, `${address}:  no component pack's source entry`)
      }
      if (!(await this.untilBuilt(location))) {
        const failure = this.failures.get(location.projectId)
        throw new SRV.HttpError(404, `${address}:  not built${failure ? `:  ${failure.join("\n")}` : ""}`)
      }
      return { entry: pack.files.devEntry, components: pack.components, project }
    })
  }

  /** `untilBuilt()`'s work, once it's known the file isn't there and its project is. */
  private async compiledFor(location: SP.SpellLocation): Promise<boolean> {
    const file = location.serverPath
    const { projectId } = location
    const deadline = Date.now() + this.timeout
    const secondsLeft = () => Math.max(0, deadline - Date.now()) / 1000
    this.say({ projectId, step: "reading" })
    // what the startup compile builds, written by one compile at a time:  a project needing it waits for that first
    if (this.startup && this.needsStartup(projectId)) {
      await within(this.startup, secondsLeft())
      if (existsSync(file)) {
        this.say({ projectId, step: "built" })
        return true
      }
    }
    let compile = this.compiles.get(projectId)
    if (!compile) {
      const compiled: string[] = []
      const said: string[] = []
      this.compiled.byProject.set(projectId, compiled)
      compile = this.run(["compile", projectId], { steps: true, compiled, said }).then((code) => {
        // 1:  it has mistakes;  its files are written all the same
        this.say({ projectId, step: code === 0 && existsSync(file) ? "built" : "mistakes" })
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
   * Once the startup compile is done, when project `projectId` needs what it compiles (`needsStartup()`):
   * two compiles never write the same library at once.  At once otherwise.
   */
  private async untilLibrariesFor(projectId: string): Promise<void> {
    if (this.startup && this.needsStartup(projectId)) {
      await within(this.startup, this.timeout / 1000)
    }
  }

  /**
   * A route's handler, ahead of the one that serves the file:  makes sure the built file it names is there.
   * - The file is the request's URL's, `/spaces/<project>/<file>` (`projectUtils.locationForUrl()`),
   *   when that's a file spell builds (`projectUtils.isBuiltFile()`), e.g. `Solitaire.spell.js`;
   *   or one of its component pack's (`projectUtils.isPackFile()`), `__pack/widgets.pack.js`, which its compile builds
   *  :  so a fresh checkout, or a page server just deployed, builds it on its first request;
   *   its script there but built from older sources (an element edited while no page server watched) is built again
   *   first (`packCurrent()`).
   * - A bad URL goes on to the next handler, which says what's wrong.
   */
  builtFirst(): SRV.Handler {
    return async (request, reply, next) => {
      let location: SP.SpellLocation
      try {
        location = projectUtils.locationForUrl(request.originalUrl)
      } catch {
        return next()
      }
      const isPack = projectUtils.isPackFile(location)
      if (!isPack && !projectUtils.isBuiltFile(location)) return next()
      if (isPack) await this.packCurrent(location)
      else {
        const page = typeof request.query.page === "string" ? request.query.page : undefined
        const sitePath = await this.siteFileFor(location, { page, lazy: request.query.pages === "lazy" })
        if (sitePath) return await responseUtils.sendFile(reply, sitePath, { dotfiles: "allow" })
      }
      if (!(await this.untilBuilt(location))) {
        const failure = this.failures.get(location.projectId)
        if (failure)
          projectUtils.buildFailures.set(request, `${location.projectId} didn't compile:  ${failure.join("\n")}`)
      }
      next()
    }
  }

  /**
   * Where built file `location` of a site is served from while it has no whole build:  its frame's copy, or page
   * `page`'s chunk, compiled first when it's missing or out of date (see the class);
   * `undefined` when it's a whole build's to serve, as any project's.
   * - `lazy`:  the program asked as a main chunk (`?pages=lazy`);  asked with neither, the program is the whole one
   * - waits at most `timeout` ms;  then it's served as it is, maybe a 404, while the compile carries on
   */
  async siteFileFor(
    location: SP.SpellLocation,
    { page, lazy = false }: { page?: string; lazy?: boolean } = {}
  ): Promise<string | undefined> {
    const { projectId, file = "" } = location
    if (this.wholeProjects.has(projectId) || !SitePages.mayBeSite(projectId)) return undefined
    const program = SP.SpellLocation.getFileLocation(projectId, `${location.projectName}${SP.COMPILED_JS_SUFFIX}`)
    if (existsSync(program.serverPath)) return undefined
    if (file.endsWith(SP.COMPILED_JS_SUFFIX) && !lazy && !page) return undefined
    const pages = new SitePages(projectId)
    const path = page ? pages.chunkFor(page) : pages.fileFor(file)
    const stale = page ? pages.pageStaleBecause(page) : pages.frameStaleBecause()
    // not there with the frame up to date:  its scope pack, written once the frame's answer is sent, so asking waits
    if (stale || !existsSync(path)) await this.untilSiteBuilt(pages, page)
    if (this.wholeProjects.has(projectId)) return undefined
    return path
  }

  /**
   * Have the sites' child compile `pages`' frame, and `page` if asked:  one compile per thing asked at a time.
   * - `true`:  written;  `false`:  not, e.g. it has no page alone in its file (then `wholeProjects`), or took too long
   */
  private untilSiteBuilt(pages: SitePages, page: string | undefined): Promise<boolean> {
    const { projectId } = pages
    const key = `${projectId}?${page ?? ""}`
    let compile = this.pageCompiles.get(key)
    if (!compile) {
      this.say({ projectId, step: "reading" })
      compile = this.untilLibrariesFor(projectId)
        .then(() => this.sitePages.ask({ projectId, page }))
        .then((result) => {
          if (result === "whole") this.wholeProjects.add(projectId)
          else if (result !== "no page") this.say({ projectId, step: result === "built" ? "built" : "mistakes" })
          if (result !== "built" && result !== "mistakes")
            this.log.debug(`${projectId}:  ${page ?? "frame"}, ${result}`)
          return result === "built" || result === "mistakes"
        })
      this.pageCompiles.set(key, compile)
      void compile.then(() => this.pageCompiles.delete(key))
    }
    return within(compile, this.timeout / 1000).then((done) => done ?? false)
  }

  /**
   * Run the CLI with `args`, in the checkout, logging its output;  resolves when it ends, however it ends:
   * with its exit code, `undefined` when it didn't run or was stopped.
   * - a checkout without the CLI (a test's temp folder) runs nothing
   * - its own process group (`detached`), so `stop()` ends what it starts too
   * - `steps`:  it prints each step it reaches (`BUILD_STEPS_VARIABLE`), told to `onStep()`'s listeners, not logged
   * - SIDE EFFECT:  each project it says it compiled goes on the end of `compiled`, as it says so;  every other line
   *   it says, but a step, a warning or node's own notes, on the end of `said`, and how it ended when that's a failure
   */
  private run(
    args: string[],
    { steps = false, compiled = [], said = [] }: { steps?: boolean; compiled?: string[]; said?: string[] } = {}
  ): Promise<number | undefined> {
    const child = this.startChild(args, { steps })
    if (!child) return Promise.resolve(undefined)
    for (const stream of [child.stdout, child.stderr]) {
      if (stream) createInterface({ input: stream }).on("line", (line) => this.lineFromChild(line, { compiled, said }))
    }
    return new Promise((done) => {
      child.once("error", (error) => {
        this.log.error("the compile failed to run:", error)
        this.children.delete(child)
        done(undefined)
      })
      child.once("exit", (code, signal) => {
        // 1:  a project had errors, listed above;  its files are written all the same
        if (code !== 0 && code !== 1) {
          this.log.error(`the compile failed (${signal ?? `exit ${code}`})`)
          said.push(`the compile failed (${signal ?? `exit ${code}`})`)
        }
        this.children.delete(child)
        done(code ?? undefined)
      })
    })
  }

  /**
   * Start the CLI with `args`, in the checkout, in a process group of its own (`detached`), kept for `stop()`;
   * `undefined` when it can't, e.g. a checkout without the CLI (a test's temp folder).
   * - `steps`:  it prints each step it reaches (`BUILD_STEPS_VARIABLE`)
   * - `stdin`:  piped, for a child asked on it (`spell compile --pages`);  else ignored
   */
  private startChild(args: string[], { steps = false, stdin = false } = {}): ChildProcess | undefined {
    const cli = this.cli
    if (!cli || !existsSync(cli)) return undefined
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
        stdio: [stdin ? "pipe" : "ignore", "pipe", "pipe"],
        detached: true
      })
    } catch (error) {
      this.log.error("couldn't start the compile:", error)
      return undefined
    }
    this.children.add(child)
    child.once("exit", () => this.children.delete(child))
    return child
  }

  /**
   * A line of a compile's output:  a step, told to `onStep()`'s listeners;  else logged (`COMPILE_LINES`).
   * - SIDE EFFECT:  a project it says it compiled goes on the end of `compiled`;  a line saying why it may fail, on
   *   the end of `said` -- see `run()`
   */
  private lineFromChild(line: string, { compiled, said }: { compiled?: string[]; said?: string[] } = {}): void {
    const step = buildStepIn(line)
    if (step) return this.say(step)
    const project = COMPILED_LINE.exec(line)?.[1]
    if (project) compiled?.push(project)
    else if (line.trim() && !NOT_SAID.some((it) => it.test(line))) said?.push(line.trim())
    this.log.childLine(line, COMPILE_LINES)
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
 * Lines of a compile's that never say why it failed:  a project up to date or compiled, a warning, node's own notes
 * (`(node:123) [DEP0205] DeprecationWarning ...`).
 */
const NOT_SAID = [/^✓ /, /^\s+\S.*\bwarning:/, /^\(node:\d+\)/, /^\(Use `node /]

/** A line of `spell compile`'s saying it compiled a project, and wrote its files:  `✓ <project>  ... · wrote ...`. */
const COMPILED_LINE = /^✓ (\S+) .* · wrote /

/** How a project's compile is coming along:  `progress()`'s answer, see `SP.BuildProgress`. */
export type BuildProgress = SP.BuildProgress

/** End of a pack's script's name:  `widgets.pack.js`. */
const PACK_SCRIPT_SUFFIX = ".pack.js"

/** Where Spell's dev server asks for a project pack's source entry:  `request_devPack()`. */
export const DEV_PACK_API = "/projects/pack/"

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
 * - `warmsSites`:  start the sites' child as the startup compile ends (default `true`)
 */
export type ProjectBuildProps = {
  root?: string
  app?: string
  timeout?: number
  spawn?: SpawnBuild
  warmsSites?: boolean
}

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
 * Does the project whose project file is `projectFile` import a project in any of `groups`, e.g. `@spell/library`,
 * itself or through another project it imports, at any depth?
 * - Its project file's `imports`:  another project's entry is its address, a file's starts with `/`.
 * - Each project imported is read once (`seen`):  two projects importing each other end.
 * - A file that can't be read, or a project that isn't there, imports nothing.
 */
function importsAny(projectFile: string, groups: string[], seen = new Set<string>()): boolean {
  if (seen.has(projectFile)) return false
  seen.add(projectFile)
  let imports: Array<{ path?: string }>
  try {
    imports = readJSON5File<{ imports?: Array<{ path?: string }> }>(projectFile).imports ?? []
  } catch {
    return false
  }
  const projects = imports.map(({ path = "" }) => path).filter((path) => SP.SpellLocation.isAddress(path))
  if (projects.some((path) => groups.some((group) => path.startsWith(`${group}/`)))) return true
  return projects.some((path) => {
    const projectId = SP.SpellProject.projectIdForImport(path)
    const imported = projectFileIn(SP.SpellLocation.getProjectLocation(projectId).serverPath)
    return !!imported && importsAny(imported, groups, seen)
  })
}
