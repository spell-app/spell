import { spawn as nodeSpawn, type ChildProcess, type SpawnOptions } from "node:child_process"
import { existsSync, statSync } from "node:fs"
import { createRequire } from "node:module"
import { basename, dirname, join } from "node:path"
import { createInterface } from "node:readline"

import { Logger } from "spell/util/spell/Logger"
import { within } from "spell/util/timing"
import { SRV, type Handler } from "spell/server"
import {
  BUNDLE_WAIT_MS,
  componentSetPath,
  componentSets,
  engineRoutePath,
  engineRoutes,
  folderUrl,
  pageServerSettings,
  type ComponentSet,
  type EngineRoute
} from "spell/server/page"

/**
 * Builds the bundles the page server serves, once it listens (`PageServer.start()`).
 * - the bundles:  the Spell UI docs site's;  built on demand, never committed
 *   - and the committed generated files (`SRV.BundleSpec.committed`:  Spell UI's root catalog, the epics pack,
 *     spell-epic's docs bundle):  rebuilt only in a worktree;  the main checkout's run logs what to run (epic
 *     `epic-engine` P54)
 *   - `folders`:  the settings' `"bundles"`, every installed repo's (`pageServerSettings()`)
 * - `start()`:  runs `spell bundle --stale` in the background, with the checkout's OWN `spell` (the kit's, as its
 *   install resolves it)
 *   - it builds only the bundles whose sources changed since their last build, or that lost a file it made
 *     (the logic:  `spell/server` `Bundle`)
 *   - so a start with nothing changed builds nothing
 * - its output goes to the server's log, each line prefixed `bundles:  ` (`SRV.ServerLog`, `server:bundles`)
 *   - shown:  each bundle built, and what failed;  each build a group of its own
 *   - debug (`SPELL_DEBUG=server:bundles`):  the checks, "current", the files and sizes each build wrote
 * - `wait`:  while it runs, a request for a MISSING built file waits for it to end,
 *   at most `timeout` ms, then is served as usual;  a file that's there is served at once
 *   - and with none running, such a request STARTS one when a bundle lost a file (`repairIfMissing()`):
 *     nothing else notices a deletion, as no source changed (epic `epic-engine` I364)
 * - while a request waits, every open page hears it (`BUNDLES_WAITING_EVENT`, through `live`), until the build ends:
 *   a page held by it says "Spell was just updated.  Getting this page ready…" (the live client;  epic `editor` T178)
 * - when it ends, live reload reloads the open pages that load a bundle:  the page server watches both folders
 * - `watch()`:  and again whenever a bundle's SOURCES change while it runs (a merge into this checkout, an edit), once
 *   they've been quiet `REBUILD_QUIET_MS`:  so a merge never leaves pages on an old bundle (epic `epic-engine`, 2026-10-25:
 *   ui-gaps' renames merged after the last build, and every components page drew with the old code)
 * - It runs the kit's CLI as a child process, never imports it:  the CLI imports the server.
 * - spell-app's (its `page-server` folder) from epic `repo-split` P4 until P16, which moved it into the kit's server:
 *   it names no repo, its folders are the settings'.
 */
export class BundleBuild {
  /** the checkout served */
  readonly root: string

  /** ms a request waits for the build */
  readonly timeout: number

  /** the bundles' folders, relative to `root`:  its settings' `bundles` (`pageServerSettings()`), read once */
  readonly folders: readonly string[]

  /** the component sets, whose `_assets/` are a bundle's folder:  its settings' `componentSets`, read once */
  readonly sets: readonly ComponentSet[]

  /** the engine routes, some leading to built files (`/_epic/pack/`):  its settings' `engineRoutes`, read once */
  readonly routes: readonly EngineRoute[]

  /** `start()` was called, and `stop()` not since:  only then does a missing file start a build */
  private builds = false

  /** `bundles`, once asked */
  private foundBundles?: SRV.Bundle[]

  /** `places`, once asked */
  private foundPlaces?: string[]

  /** starts the child:  `node:child_process`'s `spawn`, or a test's stub */
  private spawn: SpawnBuild

  /** the build, while it runs */
  private child?: ChildProcess

  /** resolves when the build ends, however it ends */
  private ended: Promise<void> = Promise.resolve()

  /** its lines in the server's log */
  readonly log = new SRV.ServerLog({ prefix: "bundles" })

  /** the sources' watchers (`watch()`) */
  private watchers: SRV.FolderWatch[] = []

  /** the rebuild waiting for the sources to be quiet */
  private quiet?: NodeJS.Timeout

  /** a source changed while the build ran:  check again once it ends */
  private again = false

  /** the page server's live reload, which tells open pages a request waits on the build (`pagesWait()`) */
  private live: () => SRV.LiveReload | undefined

  /** a request waits on the build now, and the pages were told (`pagesWait()`) */
  private isHolding = false

  constructor({ root, timeout = BUNDLE_WAIT_MS, spawn = nodeSpawn, live = () => undefined }: BundleBuildProps) {
    this.root = root
    this.timeout = timeout
    this.spawn = spawn
    this.live = live
    const settings = pageServerSettings(root)
    this.folders = settings.bundles ?? []
    this.sets = componentSets(settings)
    this.routes = engineRoutes(settings)
  }

  /** Is the build running? */
  get isBuilding(): boolean {
    return this.child !== undefined
  }

  /** the bundles that are never committed, found when first asked;  none when the settings name one nobody builds */
  private get bundles(): SRV.Bundle[] {
    if (this.foundBundles) return this.foundBundles
    try {
      this.foundBundles = SRV.Bundle.all(this.root).filter((bundle) => !bundle.spec.committed)
    } catch (ignored) {
      this.log.debug("can't tell what the bundles write:", ignored)
      this.foundBundles = []
    }
    return this.foundBundles
  }

  /** where built files are, from `root`:  the bundles' folders, and the files some builds write beside theirs */
  private get places(): string[] {
    this.foundPlaces ??= [...new Set([...this.folders, ...this.bundles.flatMap((bundle) => bundle.outputs)])]
    return this.foundPlaces
  }

  /** the checkout's own `spell`:  the kit's `bin/spell.mjs`, as `root`'s install resolves it (`kitSpell()`) */
  get cli(): string | undefined {
    return kitSpell(this.root)
  }

  /**
   * Start the build in the background;  a checkout without the CLI (a test's temp folder) builds nothing.
   * - its own process group (`detached`), so `stop()` ends yarn and vite under it too
   * - NEVER throws:  a failed build is logged, and leaves its bundle stale for the next start
   */
  start(): this {
    this.builds = true
    const cli = this.cli
    if (this.child || !cli || !existsSync(cli)) return this
    const args = [cli, "bundle", "--stale"]
    // each run its own group, from its first line shown
    this.log.groupNext()
    this.log.debug("checking (spell bundle --stale)")
    let child: ChildProcess
    try {
      child = this.spawn(process.execPath, args, {
        cwd: this.root,
        // not the server's `TSX_TSCONFIG_PATH`:  the CLI registers its own `tsconfig.json`
        env: { ...process.env, INIT_CWD: this.root, TSX_TSCONFIG_PATH: undefined },
        stdio: ["ignore", "pipe", "pipe"],
        detached: true
      })
    } catch (error) {
      this.log.error("couldn't start the build:", error)
      return this
    }
    this.child = child
    for (const stream of [child.stdout, child.stderr]) {
      if (stream) createInterface({ input: stream }).on("line", (line) => this.log.childLine(line, BUNDLE_LINES))
    }
    this.ended = new Promise((done) => {
      child.once("error", (error) => {
        this.log.error("the build failed to run:", error)
        this.child = undefined
        this.pagesWait(false)
        done()
      })
      child.once("exit", (code, signal) => {
        if (code !== 0) this.log.error(`the build failed (${signal ?? `exit ${code}`});  see above`)
        this.child = undefined
        this.pagesWait(false)
        done()
        if (this.again) {
          this.again = false
          this.start()
        }
      })
    })
    return this
  }

  /**
   * Build again whenever a bundle's sources change, once quiet for `quiet` ms (`spell bundle --stale`:  a change
   * that leaves the sources' hash as it was builds nothing).
   * - SIDE EFFECT:  a `FolderWatch` per source folder or file, closed by `stop()`
   * - NEVER throws:  a source it can't watch is skipped
   */
  watch(quiet = REBUILD_QUIET_MS): this {
    let specs: ReturnType<typeof SRV.Bundle.specs>
    try {
      specs = SRV.Bundle.specs(this.root)
    } catch (error) {
      this.log.error("can't watch the sources:", error)
      return this
    }
    // one quiet time for every source:  a merge touching several builds once
    const changed = () => {
      clearTimeout(this.quiet)
      this.quiet = setTimeout(() => this.checkAgain("sources changed"), quiet)
      this.quiet.unref()
    }
    const roots = new Set(specs.flatMap((spec) => new SRV.Bundle(this.root, spec).sourceRoots()))
    for (const root of roots) {
      // a file:  its folder's own names, only its own
      const isFile = statSync(root, { throwIfNoEntry: false })?.isFile() ?? false
      const watcher = isFile
        ? new SRV.FolderWatch(
            dirname(root),
            { recursive: false, only: (name) => name === basename(root), keepsAlive: false },
            changed
          )
        : new SRV.FolderWatch(root, { keepsAlive: false }, changed)
      // gone, or not watchable:  the next start checks it
      if (watcher.isWatching) this.watchers.push(watcher)
    }
    return this
  }

  /**
   * Check the bundles again (`spell bundle --stale`):  now, or once the running build ends.
   * - however many ask while one runs, ONE more run
   * - who:  `watch()`, its sources changed;  the page server, a page found a stale catalog (`PageServer`'s
   *   `onStaleReport`, epic `epic-engine` P54)
   * - `why`:  logged as it starts
   */
  checkAgain(why = "asked again"): void {
    if (this.child) {
      this.again = true
      return
    }
    this.log.debug(why)
    this.start()
  }

  /** Stop the build, if it runs:  its whole process group;  and stop watching.  NEVER throws. */
  stop(): void {
    this.builds = false
    clearTimeout(this.quiet)
    for (const watcher of this.watchers) watcher.close()
    this.watchers = []
    const pid = this.child?.pid
    if (pid === undefined) return
    try {
      process.kill(-pid, "SIGTERM")
    } catch {
      this.child?.kill("SIGTERM")
    }
  }

  /**
   * Resolve when the build ends, or after `timeout` ms, whichever comes first;  at once when none runs.
   * - `true`:  it ended (or none ran);  `false`:  timed out
   */
  async untilBuilt(timeout = this.timeout): Promise<boolean> {
    if (!this.child) return true
    return (
      (await within(
        this.ended.then(() => true),
        timeout / 1000
      )) ?? false
    )
  }

  /**
   * Is URL path `path` a built file that isn't there?  If so, and a bundle lost a file, build again.
   * - SIDE EFFECT:  may start the build, once `start()` has been called and while none runs
   * - a name no build made (an old page's chunk), every bundle whole:  builds nothing
   */
  repairIfMissing(path: string): boolean {
    const file = this.bundleFileFor(path)
    if (!file || existsSync(file)) return false
    if (this.builds && !this.child && this.bundles.some((bundle) => bundle.isIncomplete))
      this.checkAgain(`a built file is missing, asked for at ${path}`)
    return true
  }

  /**
   * The router handler:  a request for a missing built file waits for the build, which it may start
   * (`repairIfMissing()`).
   * - this checkout's own bundles only, at the URL path each is served at
   *   (`folderUrl()`;  beside the checkout, `/_beside/...`):
   *   - `/_beside/spell-x/_assets/ui/...`
   *   - `/_beside/ui/site/_assets/...`, and the same laid over a component set's pages at
   *     `/components/<set>/_assets/...` (`componentSetPath()`)
   *   - `/_epic/assets/spell-ui/...`, `/_epic/pack/...`, the engine routes (`engineRoutePath()`):
   *     this checkout's copy under a worktree's address too
   */
  wait: Handler = async (request, _reply, next) => {
    if (request.method !== "GET" && request.method !== "HEAD") return next()
    if (this.repairIfMissing(request.path)) {
      if (this.child) this.pagesWait(true)
      await this.untilBuilt()
    }
    next()
  }

  /**
   * Tell every open page whether a request waits on the build now (`BUNDLES_WAITING_EVENT`):  once as it starts
   * waiting, once as the build ends;  a page that connects meanwhile hears it too (`LiveReload.keep()`).
   * - its `build` is this checkout's folder, so a worktree's build and main's are told apart
   * - NEVER throws
   */
  private pagesWait(waiting: boolean) {
    if (waiting === this.isHolding) return
    this.isHolding = waiting
    const live = this.live()
    const data = { build: this.root, waiting }
    const key = `${SRV.BUNDLES_WAITING_EVENT}:${this.root}`
    if (waiting) live?.keep(SRV.BUNDLES_WAITING_EVENT, data, key)
    else live?.drop(SRV.BUNDLES_WAITING_EVENT, data, key)
  }

  /** The built file URL path `path` names (`places`), through the sets' and engine routes' overlays;  else `undefined`. */
  bundleFileFor(path: string): string | undefined {
    let served: string
    try {
      served = decodeURIComponent(componentSetPath(path, this.sets) ?? engineRoutePath(path, this.routes) ?? path)
    } catch {
      return undefined
    }
    const place = this.places.find((each) => `${served}/`.startsWith(`${folderUrl(each)}/`))
    if (!place || served.split("/").includes("..")) return undefined
    return join(this.root, place, served.slice(folderUrl(place).length))
  }
}

/**
 * How `spell bundle --stale`'s lines are logged, before `SRV.ServerLog.CHILD_LINES` (errors, warnings);  the rest
 * are shown.
 * - debug:  `ui-root:  current`, a file `unchanged`, the sizes a build lists (`-- tools/_assets/...`, indented
 *   tables), the bundler's own summary (`ui-site bundle (1.5s):  site/_assets/`, said again by `built ui-site in 1.5s`)
 * - `building ui-site ...`:  shown, a group of its own
 */
const BUNDLE_LINES: SRV.LineRule[] = [
  { line: /^\S+:  current$/, level: Logger.DEBUG },
  { line: /^building /, level: Logger.INFO, starts: true },
  { line: /\bunchanged\b/, level: Logger.DEBUG },
  { line: /^-- |^\s/, level: Logger.DEBUG },
  { line: /^\S+ bundle \([\d.]+m?s\):/, level: Logger.DEBUG }
]

/** How long a bundle's sources must be quiet before it's checked again, in ms (`BundleBuild.watch()`):  a merge writes many files. */
const REBUILD_QUIET_MS = 3000

/** Starts the build's child process:  `node:child_process`'s `spawn`, or a test's stub. */
export type SpawnBuild = (command: string, args: string[], options: SpawnOptions) => ChildProcess

/**
 * `new BundleBuild()` props.
 * - `root`:  the checkout served
 * - `timeout`:  ms a request waits (default `BUNDLE_WAIT_MS`)
 * - `spawn`:  starts the child (default `node:child_process`'s);  tests pass a stub
 * - `live`:  the page server's live reload, asked when there's something to tell its pages (`pagesWait()`);
 *   none:  no page is told
 */
export type BundleBuildProps = {
  root: string
  timeout?: number
  spawn?: SpawnBuild
  live?: () => SRV.LiveReload | undefined
}

/**
 * The kit's `spell` command (`spell`'s `bin/spell.mjs`), as checkout `root`'s install resolves the kit:
 * the checkout's OWN, never the `spell` on `PATH` (maybe main's);  `undefined` when its install has no kit.
 * - By package, never a path into the kit (the kit's `AGENTS.md`, "Imports across repos"):  a test's temp folder,
 *   with no kit installed, builds nothing
 * - NOTE: spell-app's `ProjectBuild` keeps a twin of this:  the kit imports no repo above it
 */
function kitSpell(root: string): string | undefined {
  try {
    const kit = dirname(createRequire(join(root, "package.json")).resolve("spell/package.json"))
    return join(kit, "bin", "spell.mjs")
  } catch {
    return undefined
  }
}
