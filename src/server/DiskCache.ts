import { createHash } from "node:crypto"
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync
} from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import { parseBodies } from "./bodies"
import { Router } from "./Router"
import { HttpError } from "./server.types"

/****************
 * ### `DiskCache`
 * Text kept on disk by key, for ONE version of whatever made it at a time:  e.g. Spell's compiles, by a hash of
 * what was compiled, for the compiler as it is now (epic `language` P27).
 * - Each version's entries are a folder of their own, `<folder>/<version>/<key>`:
 *   a new version starts empty, and only the newest `keep` versions' folders stay.
 * - CAPPED at `limit` bytes, every version's entries together (200 MB by default;  epic `language` Q41):
 *   past it, a write drops the entries used least recently first.
 *   - "Used":  written or read;  a read touches its file's time.
 * - Only the CURRENT version takes writes (`version()`, asked each time):
 *   a page still running an older compiler can read what that compiler made, but never file it under the new one.
 * - Over HTTP, `router()`:  `GET /version`, `GET /<version>/<key>`, `PUT /<version>/<key>`.
 * - Knows nothing of what it keeps:  the caller says what makes a version (`codeVersion()`, for code).
 * - NOTE:  one machine's.  Sharing it between machines is left out.
 ****************/
export class DiskCache {
  /** Folder its versions' folders are in. */
  readonly folder: string
  /** The version entries are written for now. */
  readonly version: () => string
  /** How many versions' folders stay, the newest. */
  readonly keep: number
  /**
   * The most its entries may take, in bytes, every version's together:  past it, a write drops the least recently
   * used.
   * - The page server's `cacheLimit` setting sets it (the app's route module), e.g. `"200MB"`:  see `sizeInBytes()`.
   */
  limit: number

  constructor({ folder, version, keep = 3, limit = DiskCache.DEFAULT_LIMIT }: DiskCacheProps) {
    this.folder = folder
    this.version = version
    this.keep = keep
    this.limit = limit
  }

  /** `limit` when none's given:  200 MB. */
  static DEFAULT_LIMIT = 200 * 1024 * 1024

  /** Where Spell keeps its caches on this machine:  `~/.spell/cache`. */
  static get home(): string {
    return join(homedir(), ".spell", "cache")
  }

  /**
   * Entry `key` of `version`, or `undefined` if there's none.
   * - throws a `TypeError` for a version or key that isn't a hash's letters
   */
  read(version: string, key: string): string | undefined {
    const file = this.fileFor(version, key)
    if (!existsSync(file)) return undefined
    const text = readFileSync(file, "utf8")
    touch(file)
    return text
  }

  /**
   * Keep `text` as entry `key` of `version`, if `version` is the current one.
   * - Returns whether it was kept.
   * - SIDE EFFECT:  a version's first entry drops the folders of all but the newest `keep` versions.
   * - SIDE EFFECT:  past `limit`, drops the entries used least recently, never this one.
   * - Written all at once:  a temp file, then a rename.
   * - throws a `TypeError` for a version or key that isn't a hash's letters
   */
  write(version: string, key: string, text: string): boolean {
    const file = this.fileFor(version, key)
    if (version !== this.version()) return false
    const versionFolder = join(this.folder, version)
    const isNewVersion = !existsSync(versionFolder)
    mkdirSync(versionFolder, { recursive: true })
    const temp = `${file}.${process.pid}.tmp`
    writeFileSync(temp, text)
    renameSync(temp, file)
    if (isNewVersion) this.dropOldVersions()
    this.trimToLimit(file)
    return true
  }

  /** How many entries `version` has. */
  count(version: string): number {
    const versionFolder = join(this.folder, checkedName(version, "version"))
    return existsSync(versionFolder) ? readdirSync(versionFolder).filter((name) => !name.endsWith(".tmp")).length : 0
  }

  /**
   * Its HTTP routes, to mount under a prefix, e.g. `/api/compiles`:
   * - `GET /version`:  `{ version }`, the current one
   * - `GET /<version>/<key>`:  the entry, as text;  404 if there's none
   * - `PUT /<version>/<key>`:  keep the body (text);  204, or 409 if `<version>` isn't current
   * - a version or key that isn't a hash's letters:  400
   */
  router({ limit = 20 * 1024 * 1024 }: { limit?: number } = {}): Router {
    const router = new Router()
    router.use(parseBodies({ limit }))
    router.get("/version", (_request, reply) => reply.json({ version: this.version() }))
    router.get("/:version/:key", (request, reply) => {
      const text = this.read(...versionAndKey(request.params))
      if (text === undefined) throw new HttpError(404, "no such entry")
      reply.type("text/plain").send(text)
    })
    router.put("/:version/:key", (request, reply) => {
      if (typeof request.body !== "string") throw new HttpError(400, "send the entry as text")
      const kept = this.write(...versionAndKey(request.params), request.body)
      if (!kept) throw new HttpError(409, "not the current version")
      reply.status(204).end()
    })
    return router
  }

  /** File for entry `key` of `version`. */
  private fileFor(version: string, key: string): string {
    return join(this.folder, checkedName(version, "version"), checkedName(key, "key"))
  }

  /**
   * Every version's entries together under `limit`:  drop the ones used least recently first, never `kept`.
   * - NEVER throws.
   */
  private trimToLimit(kept: string): void {
    try {
      const entries = readdirSync(this.folder)
        .filter((name) => HASH.test(name))
        .flatMap((version) => {
          const versionFolder = join(this.folder, version)
          return readdirSync(versionFolder)
            .filter((name) => HASH.test(name))
            .map((name) => {
              const path = join(versionFolder, name)
              const { size, mtimeMs } = statSync(path)
              return { path, size, usedAt: mtimeMs }
            })
        })
      let total = entries.reduce((sum, entry) => sum + entry.size, 0)
      if (total <= this.limit) return
      for (const entry of entries.sort((a, b) => a.usedAt - b.usedAt)) {
        if (total <= this.limit) break
        if (entry.path === kept) continue
        rmSync(entry.path, { force: true })
        total -= entry.size
      }
    } catch (error) {
      console.error("DiskCache.trimToLimit():  couldn't tidy", this.folder, error)
    }
  }

  /** Drop the folders of all but the newest `keep` versions.  NEVER throws. */
  private dropOldVersions(): void {
    try {
      const versions = readdirSync(this.folder)
        .filter((name) => HASH.test(name))
        .map((name) => ({ name, at: statSync(join(this.folder, name)).mtimeMs }))
        .sort((a, b) => b.at - a.at)
      for (const { name } of versions.slice(this.keep))
        rmSync(join(this.folder, name), { recursive: true, force: true })
    } catch (error) {
      console.error("DiskCache.dropOldVersions():  couldn't tidy", this.folder, error)
    }
  }
}

/** `DiskCache`'s constructor props. */
export type DiskCacheProps = {
  /** Folder its versions' folders go in, e.g. `~/.spell/cache/compiles` */
  folder: string
  /** The current version, asked at each write and `GET /version`:  e.g. `codeVersion()`'s */
  version: () => string
  /** How many versions' folders stay, the newest;  default 3 */
  keep?: number
  /** The most its entries may take, in bytes;  default `DiskCache.DEFAULT_LIMIT`, 200 MB */
  limit?: number
}

/** Bytes in each unit `sizeInBytes()` reads. */
const SIZE_UNITS = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 }

/**
 * `size` in bytes:  a number of bytes as is, or text with a unit, e.g. `"200MB"`, `"1.5 GB"`, `"512KB"`, `"4096"`.
 * - Units are binary:  a KB is 1024 bytes.
 * - throws a `TypeError` naming the forms it takes, for anything else
 */
export function sizeInBytes(size: string | number): number {
  if (typeof size === "number" && size >= 0) return size
  const match = /^\s*(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)?\s*$/i.exec(String(size))
  if (!match) throw new TypeError(`sizeInBytes():  '${size}' isn't a size;  write e.g. "200MB", "1GB" or "512KB"`)
  const unit = (match[2] ?? "B").toUpperCase() as keyof typeof SIZE_UNITS
  return Math.round(Number(match[1]) * SIZE_UNITS[unit])
}

/** Mark `file` used now, for the least-recently-used drop.  NEVER throws. */
function touch(file: string): void {
  try {
    const now = new Date()
    utimesSync(file, now, now)
  } catch {
    // gone meanwhile:  nothing to mark
  }
}

/**
 * A version for the code in `paths` (folders or files):  a hash of each code file's path and text, as a function to
 * ask whenever it's wanted.
 * - Read again only when a file's size or time changed, or one came or went;  checked at most once a second.
 * - Code:  `.ts`, `.js`, `.mjs`, `.json`, `.json5`;  never in `node_modules`, `.venv`, `__pycache__`, `dist*`.
 * - A path that isn't there counts as empty.
 */
export function codeVersion(paths: readonly string[]): () => string {
  let checkedAt = 0
  let stamp = ""
  let version = ""
  return () => {
    const now = Date.now()
    if (version && now - checkedAt < 1000) return version
    checkedAt = now
    const files = paths.flatMap((path) => codeFilesIn(path))
    const nextStamp = files.map(({ path, size, at }) => `${path}:${size}:${at}`).join("\n")
    if (nextStamp === stamp) return version
    stamp = nextStamp
    const hash = createHash("sha256")
    for (const { path } of files) hash.update(path).update("\0").update(readFileSync(path)).update("\0")
    version = hash.digest("hex").slice(0, 32)
    return version
  }
}

/** Every code file under `path`, sorted, with its size and time;  `path` itself if it's a file. */
function codeFilesIn(path: string): Array<{ path: string; size: number; at: number }> {
  if (!existsSync(path)) return []
  const stats = statSync(path)
  if (stats.isFile()) return [{ path, size: stats.size, at: stats.mtimeMs }]
  const files: Array<{ path: string; size: number; at: number }> = []
  for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(path, entry.name)
    if (entry.isDirectory()) {
      if (!SKIPPED_FOLDER.test(entry.name)) files.push(...codeFilesIn(full))
    } else if (CODE_FILE.test(entry.name)) {
      const { size, mtimeMs } = statSync(full)
      files.push({ path: full, size, at: mtimeMs })
    }
  }
  return files
}

/** `name`, if it's a hash's letters;  else a `TypeError` naming `what`. */
function checkedName(name: string, what: string): string {
  if (!HASH.test(name)) throw new TypeError(`DiskCache:  a ${what} is 8 to 128 lowercase hex letters, not '${name}'`)
  return name
}

/** A route's `version` and `key`, each checked:  a 400 if either isn't a hash's letters. */
function versionAndKey(params: Record<string, string>): [string, string] {
  const { version = "", key = "" } = params
  if (!HASH.test(version) || !HASH.test(key)) throw new HttpError(400, "a version and key are hex hashes")
  return [version, key]
}

/** A version or key:  a hash, as lowercase hex. */
const HASH = /^[0-9a-f]{8,128}$/

/** A file `codeVersion()` counts. */
const CODE_FILE = /\.(ts|js|mjs|json|json5)$/

/** Folders `codeVersion()` never looks in. */
const SKIPPED_FOLDER = /^(node_modules|\.venv|__pycache__|dist.*|\..*)$/
