import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

/****************
 * ### `FileStorage`
 * A browser's `localStorage`, kept in ONE JSON file on this machine:  what the kit's `SaveQueue` keeps its unsent work
 * in, on a server (epic `atmosphere` P14, Q19 A:  ONE retry queue for the server's writes, mail and alerts).
 *
 * ```ts
 * const storage = new FileStorage("~/.spell/queue/space-writes.json")
 * new SaveQueue({ key: "space-writes:@club/pantry", storage: () => storage, save, wait: 0 })
 * ```
 *
 * - Read once, as it's made;  each change written whole at once, through a temporary file and a rename,
 *   so a crash leaves the old file or the new one, never half of one.
 * - A file that isn't JSON is read as empty, and said so:  the next change writes a good one.
 * - Synchronous, as `localStorage` is:  a queue's few rows, not a database.
 * - Node only.  Its shape is `StorageLike` (`spell/util/persist`), written out, so nothing of util is imported.
 ****************/
export class FileStorage {
  /** Where it's kept. */
  readonly file: string
  /** What it holds, by key. */
  private readonly values: Map<string, string>

  constructor(file: string) {
    this.file = file
    this.values = new Map(Object.entries(readValues(file)))
  }

  /** How many keys it holds. */
  get length(): number {
    return this.values.size
  }

  /** The `index`th key, in the order they were set:  `null` past the end. */
  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }

  /** What's under `key`:  `null` for nothing. */
  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  /** SIDE EFFECT:  keep `value` under `key`, and write the file. */
  setItem(key: string, value: string): void {
    this.values.set(key, `${value}`)
    this.write()
  }

  /** SIDE EFFECT:  forget `key`, and write the file. */
  removeItem(key: string): void {
    if (this.values.delete(key)) this.write()
  }

  /** Write every value, whole, at once. */
  private write(): void {
    mkdirSync(dirname(this.file), { recursive: true })
    const temporary = `${this.file}.${process.pid}.tmp`
    writeFileSync(temporary, `${JSON.stringify(Object.fromEntries(this.values), null, 2)}\n`, { mode: 0o600 })
    renameSync(temporary, this.file)
  }
}

/** What `file` holds:  nothing, for none, or for one that isn't JSON.  - NEVER throws */
function readValues(file: string): Record<string, string> {
  if (!existsSync(file)) return {}
  try {
    const values = JSON.parse(readFileSync(file, "utf8")) as unknown
    if (values && typeof values === "object" && !Array.isArray(values)) return values as Record<string, string>
  } catch (ignored) {
    console.error(`FileStorage:  ${file} isn't JSON;  read as empty`, ignored)
  }
  return {}
}
