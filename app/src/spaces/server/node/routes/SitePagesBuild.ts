import type { ChildProcess } from "child_process"
import { createInterface } from "readline"

import {
  SITE_PAGES_PREFIX,
  type SitePagesRequest,
  type SitePagesResult
} from "spell/app/spaces/server/node/projects/SitePages"

/****************
 * ### `SitePagesBuild`
 * The page server's ONE `spell compile --pages`, kept running:  it compiles a site's frame, then each page the first
 * time it's asked for (the cli's `SitePagesCompiler`;  epic `editor` P46).
 * - `ProjectBuild` owns it, and hands it what starts the child (`start`) and what hears its other lines (`onLine`):
 *   its steps, for the waiting box, and what it says it wrote, for the server's log.
 * - One request at a time, in order:  each waits for the one before.
 * - Started on first need;  `warm()` starts it ahead, so the first page skips the cli's start (about 3 s).
 * - A child that answers `restart` (a file it read changed) has ended:  a new one is started, and asked again, once.
 * - A child that ends on its own (after 10 minutes unused, or a crash):  what it was asked answers `undefined`, and the
 *   next request starts another.
 * - NEVER throws.
 ****************/
export class SitePagesBuild {
  /** starts `spell compile --pages`;  `undefined` when it can't */
  private readonly start: () => ChildProcess | undefined

  /** hears each line the child writes that isn't an answer */
  private readonly onLine: (line: string) => void

  /** the child, while it runs */
  private child?: ChildProcess

  /** whoever waits for the child's next answer */
  private answered?: (result: SitePagesResult | undefined) => void

  /** the last request asked, so each waits for the one before */
  private queue: Promise<unknown> = Promise.resolve()

  constructor({ start, onLine }: SitePagesBuildProps) {
    this.start = start
    this.onLine = onLine
  }

  /** Start the child now, if it isn't running:  the first page then waits for no start. */
  warm(): this {
    this.childOrStart()
    return this
  }

  /**
   * Ask the child for `request`, once each request before it is answered.
   * - `undefined`:  it couldn't be asked, or it ended before it answered.
   */
  ask(request: SitePagesRequest): Promise<SitePagesResult | undefined> {
    const asked = this.queue.then(async () => {
      const result = await this.askNow(request)
      return result === "restart" ? await this.askNow(request) : result
    })
    this.queue = asked.catch(() => undefined)
    return asked
  }

  /** Stop the child, if it's running.  NEVER throws. */
  stop(): void {
    const { child } = this
    if (!child) return
    try {
      process.kill(-child.pid!, "SIGTERM")
    } catch {
      child.kill("SIGTERM")
    }
  }

  /** Ask the child for `request` now, starting it if it isn't running. */
  private askNow(request: SitePagesRequest): Promise<SitePagesResult | undefined> {
    const child = this.childOrStart()
    if (!child?.stdin) return Promise.resolve(undefined)
    return new Promise((done) => {
      this.answered = done
      child.stdin!.write(`${JSON.stringify(request)}\n`, (error) => {
        if (error) this.answer(undefined)
      })
    })
  }

  /** The child running now, started if it isn't. */
  private childOrStart(): ChildProcess | undefined {
    if (this.child) return this.child
    const child = this.start()
    if (!child) return undefined
    this.child = child
    if (child.stdout) {
      createInterface({ input: child.stdout }).on("line", (line) => {
        if (!line.startsWith(SITE_PAGES_PREFIX)) return this.onLine(line)
        const result = resultIn(line)
        // it ends next:  the request asked again goes to a new one
        if (result === "restart" && this.child === child) this.child = undefined
        this.answer(result)
      })
    }
    if (child.stderr) createInterface({ input: child.stderr }).on("line", (line) => this.onLine(line))
    // only the child running now:  one that ended to restart has already answered
    const gone = () => {
      if (this.child !== child) return
      this.child = undefined
      this.answer(undefined)
    }
    child.once("exit", gone)
    child.once("error", gone)
    return child
  }

  /** Hand `result` to whoever waits for an answer, if anyone does. */
  private answer(result: SitePagesResult | undefined): void {
    const done = this.answered
    this.answered = undefined
    done?.(result)
  }
}

/**
 * `new SitePagesBuild()` props.
 * - `start`:  starts `spell compile --pages`, in its own process group, its three streams piped
 * - `onLine`:  hears each line it writes that isn't an answer
 */
export type SitePagesBuildProps = { start: () => ChildProcess | undefined; onLine: (line: string) => void }

/** The result an answer's line says;  `undefined` when it can't be read. */
function resultIn(line: string): SitePagesResult | undefined {
  try {
    return (JSON.parse(line.slice(SITE_PAGES_PREFIX.length)) as { result?: SitePagesResult }).result
  } catch {
    return undefined
  }
}
