import { existsSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs"
import { registerHooks } from "node:module"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/**
 * The code files a running page server has LOADED, each with its time when it was loaded:
 * so "is this server older than its code?" asks only about code it runs (epic `epic-engine` I309).
 * - Why:  the old rule (`newestChange()` over whole `src/` folders) restarted main's page server after nearly every
 *   merge into main -- 24 of 26 today -- a component's browser code, a docs page's script or the epics pack
 *   counting the same as a route module.
 *   Each restart left the side bar's views a few seconds with no server;  Owen:  "This is happening a lot,
 *   several times an hour".
 * - The server's half:  `record()`, run before anything else loads (`page/loadedCodeHook.ts`, an `--import` of the
 *   command `PageServer.ensure()` starts), notes each file node loads, through node's module hooks, and writes
 *   them to `<root>/.spell-server.code.json` (`fileFor()`), a moment after the last one:
 *   `{ pid, files: { "<path>": <its time when loaded, ms> } }`
 * - The asking half:  `isChanged()`, from `PidFile.ensure()`:  any of them changed or gone since it was loaded.
 *   - `undefined` when there's no record for that server (an older one, or one started by hand):
 *     the caller falls back to the old rule
 * - A file the server hasn't loaded yet doesn't count:  when it's first asked for, it's loaded as it is then.
 * - Node built-ins only:  it's loaded first, before `tsx` has a say on anything of ours.
 */
export class LoadedCode {
  /**
   * The record's file, beside the pid file:  `<root>/.spell-server.code.json`.
   */
  static fileFor(root: string): string {
    return join(resolve(root), ".spell-server.code.json")
  }

  /**
   * In the server's process:  note every file node loads from now on, and keep `fileFor(root)` up to date.
   * - SIDE EFFECT:  registers a module hook for the process's life;  writes the record 1s after the last new file
   * - NEVER throws:  a server whose record can't be written is restarted by the old rule, nothing worse
   */
  static record(root: string): void {
    const files: Record<string, number> = {}
    const file = LoadedCode.fileFor(root)
    let timer: ReturnType<typeof setTimeout> | undefined
    const write = () => {
      try {
        const temp = `${file}.${process.pid}.tmp`
        writeFileSync(temp, `${JSON.stringify({ pid: process.pid, files } satisfies LoadedCodeRecord)}\n`)
        renameSync(temp, file)
      } catch (ignored) {
        console.error(`LoadedCode.record():  can't write ${file}`, ignored)
      }
    }
    registerHooks({
      load(url, context, next) {
        if (url.startsWith("file:")) {
          try {
            const path = fileURLToPath(url)
            if (!(path in files)) {
              files[path] = statSync(path).mtimeMs
              clearTimeout(timer)
              timer = setTimeout(write, WRITE_AFTER_MS)
              timer.unref()
            }
          } catch {
            // a file that can't be read is node's to report
          }
        }
        return next(url, context)
      }
    })
  }

  /** The record for the server with process `pid`;  `undefined` with none, or one another server wrote. */
  static read(root: string, pid: number): LoadedCodeRecord | undefined {
    const file = LoadedCode.fileFor(root)
    if (!existsSync(file)) return undefined
    try {
      const record = JSON.parse(readFileSync(file, "utf8")) as Partial<LoadedCodeRecord>
      return record.pid === pid && record.files ? (record as LoadedCodeRecord) : undefined
    } catch {
      return undefined
    }
  }

  /**
   * Has any file the server with process `pid` loaded changed, or gone, since it loaded it?
   * - `undefined`:  no record for that server -- the caller decides by its own rule
   * - NEVER throws
   */
  static isChanged(root: string, pid: number): boolean | undefined {
    const record = LoadedCode.read(root, pid)
    if (!record) return undefined
    for (const [path, loaded] of Object.entries(record.files)) {
      try {
        if (statSync(path).mtimeMs !== loaded) return true
      } catch {
        return true
      }
    }
    return false
  }
}

/** How long after the last newly loaded file the record is written, in ms. */
const WRITE_AFTER_MS = 1000

/**
 * `LoadedCode`'s record:  the server's process, and each file it loaded with that file's time when loaded (ms).
 */
export type LoadedCodeRecord = {
  /** the server's process */
  pid: number
  /** each loaded file's absolute path => its modification time when loaded, ms */
  files: Record<string, number>
}
