/**
 * Reading a file a person picked or dropped:  `the file as text`, `as json`, `as binary` (epic `language` P67, r32).
 * - The file is the browser's own `File` (a `Blob`):  what `when a file is dropped on it:` and `<ui-uploader>`'s
 *   events hand a program.
 * - Each read waits, as any other waiting read does:  compiled spell says `await core.readFile(file, "text")`.
 * - Part of `core`:  imported by `spell/parser/core`'s barrel for its side effect.
 * - Not in Python's core:  no file comes from a page to a program running there.
 */
import { core } from "./core"
import { defineCoreModule } from "./core.types"

/** How a file is read:  the words after `as`. */
export type FileReading = "text" | "json" | "binary"

export const fileMethods = defineCoreModule({
  /**
   * The contents of `file`, read `as` text, JSON or binary:  what `the file as text` compiles to.
   * - `text`:  its text;  `json`:  its text read as JSON;  `binary`:  its bytes, a `Uint8Array`.
   * - throws a `TypeError` for something that isn't a file, and a `SyntaxError` for JSON that doesn't read
   * - A file still being dragged (`when a file is dragged over it:`, `dragged out of it`, `while ...`) is only a
   *   summary, how many and their kinds:  the browser hands the file over only once it's dropped (epic `language` I172).
   */
  async readFile(file: unknown, as: FileReading): Promise<unknown> {
    if (isDragSummary(file)) {
      throw new TypeError(
        "core.readFile():  a file still being dragged can't be read:  the browser hands it over only once it's dropped;  read it in `when a file is dropped on it:`"
      )
    }
    if (!isBlob(file)) {
      throw new TypeError(`core.readFile():  ${describe(file)} isn't a file;  read a file a person picked or dropped`)
    }
    if (as === "binary") return new Uint8Array(await file.arrayBuffer())
    const text = await file.text()
    return as === "json" ? JSON.parse(text) : text
  }
})
Object.assign(core, fileMethods)

/** Is `value` a file, or any other `Blob`? */
function isBlob(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob
}

/** Is `value` what the drag lines hand a program while files are dragged:  `{ count, kinds, via }`, no file? */
function isDragSummary(value: unknown): boolean {
  return typeof value === "object" && value !== null && "count" in value && "kinds" in value && !isBlob(value)
}

/** `value`, briefly, for an error. */
function describe(value: unknown): string {
  return value === undefined || value === null ? "nothing" : `a ${typeof value}`
}
