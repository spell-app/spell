import { watch, type FSWatcher } from "node:fs"
import { resolve, sep } from "node:path"

/****************
 * ### `FolderWatch`
 * A folder watched for changes, the ONE way every tool watches files (epic `coherence` P28):
 * the page server's live reload, the bundles' rebuild, the running epics' list, a command run's answers,
 * the app's disk storage, `spell app watch`.
 *
 * ```ts
 * const watching = new FolderWatch(dir, { only: /\.ts$/, quiet: 3000 }, (paths) => rebuild(paths))
 * watching.close()
 * ```
 *
 * - `onChange` gets the changed paths, from `dir`, `/`-separated (`src/x.ts`)
 *   - `quiet`:  only once nothing has changed for that many ms, every path that changed meanwhile, each once;
 *     0 (the default):  each change at once, alone
 * - NEVER reports what no reader wants (`WATCH_SKIPPED`):  dot files and folders, `node_modules`, lock files
 *   (`FileLock`'s `<file>.lock`) and editors' temporary files (`~`, `.tmp`, `.swp`)
 * - a missing folder, or one that can't be watched, is watched by nobody:  `isWatching` says so, nothing throws
 * - `recursive: false` watches the folder's own names only:  one file, with `only` naming it
 * - `keepsAlive: false`:  the watcher (and its quiet timer) never keeps the process running
 * - Its position:  node's own modules only.
 *   Before P28 six watchers each wrote their own `fs.watch`, skip list and quiet time;  one skipped lock files.
 ****************/
export class FolderWatch {
  /** the folder watched, absolute */
  readonly dir: string

  /** the paths changed since the last report, while waiting for quiet */
  private pending = new Set<string>()

  /** the quiet timer, while one runs */
  private timer?: NodeJS.Timeout

  /** node's watcher;  none when the folder couldn't be watched, or once closed */
  private watcher?: FSWatcher

  /** what it skips, how long it waits for quiet ... */
  private readonly props: FolderWatchProps

  /** told the paths that changed */
  private readonly onChange: (paths: string[]) => void

  constructor(dir: string, props: FolderWatchProps, onChange: (paths: string[]) => void) {
    this.dir = resolve(dir)
    this.props = props
    this.onChange = onChange
    const { recursive = true, keepsAlive = true, onError } = props
    try {
      this.watcher = watch(this.dir, { recursive }, (_event, name) => {
        if (name) this.changed(name.split(sep).join("/"))
      })
      this.watcher.on("error", () => {
        this.close()
        onError?.()
      })
      if (!keepsAlive) this.watcher.unref()
    } catch {
      // missing, or not watchable:  nothing to report
    }
  }

  /** whether it watches now:  the folder was there, and it isn't closed */
  get isWatching(): boolean {
    return this.watcher !== undefined
  }

  /** Stop watching;  a change waiting for quiet is never reported. */
  close(): void {
    this.watcher?.close()
    this.watcher = undefined
    clearTimeout(this.timer)
    this.pending.clear()
  }

  /** `path` changed:  reported now, or once quiet, unless it's skipped. */
  private changed(path: string): void {
    const { ignore, only, quiet = 0, keepsAlive = true } = this.props
    if (WATCH_SKIPPED.test(path) || ignore?.test(path)) return
    if (only && !(typeof only === "function" ? only(path) : only.test(path))) return
    if (!quiet) return this.onChange([path])
    this.pending.add(path)
    clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      const paths = [...this.pending]
      this.pending.clear()
      this.onChange(paths)
    }, quiet)
    if (!keepsAlive) this.timer.unref()
  }
}

/** `new FolderWatch()`'s props. */
export type FolderWatchProps = {
  /** more paths never to report, e.g. `/(^|\/)experiments\//`, beside `WATCH_SKIPPED` */
  ignore?: RegExp
  /** only the paths it matches (or that it says yes to) are reported */
  only?: RegExp | ((path: string) => boolean)
  /** ms of quiet before the paths changed are reported, together;  0:  each at once */
  quiet?: number
  /** the folders inside it too (default);  `false`:  its own names only */
  recursive?: boolean
  /** whether the watcher keeps the process running (default `true`) */
  keepsAlive?: boolean
  /** called once if node's watcher fails, after it's closed */
  onError?: () => void
}

/**
 * Paths (from the folder, `/`-separated) no watcher reports:  dot files and folders, `node_modules`, lock files,
 * editors' temporary files.
 */
export const WATCH_SKIPPED = /(^|\/)(\.|node_modules\/)|\.lock$|~$|\.tmp$|\.swp$/
