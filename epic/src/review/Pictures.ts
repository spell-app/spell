import { SHOT_MAX_BYTES } from "./review.types"

/****************
 * ### `Pictures`
 * A picture Owen gives a page:  pasted, dropped or chosen, then sent to the page server (`POST shot`) as a PNG.
 * - ONE way for every place that takes one (epic `epic-engine` P51):  a note box (`<epic-review>`), an option's
 *   form (`<epic-option-form>`, P50;  in its words since I334), a comment's field (`intoWords()`, I267)
 * - Plain browser DOM, static:  no Solid, no element;  the caller saves it (`ReviewClient.saveShot()`) and says what
 *   went wrong in its own words (`problemOf()`)
 ****************/
export class Pictures {
  /** The picture in a paste or a drop:  its first image file;  `undefined` for none (text, a link). */
  static fileOf(event: ClipboardEvent | DragEvent): File | undefined {
    const items = "clipboardData" in event ? event.clipboardData?.items : event.dataTransfer?.items
    const item = Array.from(items ?? []).find((each) => each.kind === "file" && each.type.startsWith("image/"))
    return item?.getAsFile() ?? ("dataTransfer" in event ? event.dataTransfer?.files[0] : undefined) ?? undefined
  }

  /** Why `file` can't be taken:  `notImage`, `tooBig` (over 8 MB);  `undefined` when it can. */
  static problemOf(file: File): PictureProblem | undefined {
    if (!file.type.startsWith("image/")) return "notImage"
    if (file.size > SHOT_MAX_BYTES) return "tooBig"
    return undefined
  }

  /**
   * `file` as a PNG data URL, what the page server takes:  a PNG as it is;  any other picture (a JPEG from Finder, a
   * WebP) drawn onto a canvas first.
   * - rejects when the browser can't read or draw it
   */
  static async pngOf(file: Blob): Promise<string> {
    if (file.type === PNG) return Pictures.dataUrlOf(file)
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement("canvas")
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0)
    bitmap.close()
    return canvas.toDataURL(PNG)
  }

  /**
   * SIDE EFFECT:  a picture pasted or dropped in `field` is saved (`save`), and its path goes into the words at the
   * cursor, as `![picture](<path>)` (epic `epic-engine` I267):  so it goes wherever the words go -- the comment saved,
   * the Send, the inbox a session reads -- and the thread draws it as a picture (`<epic-thread>`).
   * - `field`:  a `<textarea>`, or an element drawing one in its shadow roots (`<epic-text-box>`, `<ui-textarea>`):
   *   the `<textarea>` the paste or drop came from takes the words
   * - text pastes as usual
   * - `save`:  the PNG data URL to its path (a URL path the page can show);  `undefined` when it failed (it said why)
   * - `notify`:  says, in the page's words, why a file can't be taken (`problemOf()`, or a picture it can't read)
   * - in VS Code's side bar the page gets the picture as a paste too (the extension's `ClipboardImage`)
   * - NEVER throws;  answers what stops listening
   */
  static intoWords(field: HTMLElement, saver: PictureSaver): () => void {
    const take = (event: ClipboardEvent | DragEvent) => {
      const file = Pictures.fileOf(event)
      const textarea = Pictures.textareaOf(event, field)
      if (!file || !textarea) return
      event.preventDefault()
      void Pictures.putInto(textarea, file, saver)
    }
    const over = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault()
    }
    field.addEventListener("paste", take)
    field.addEventListener("drop", take)
    field.addEventListener("dragover", over)
    return () => {
      field.removeEventListener("paste", take)
      field.removeEventListener("drop", take)
      field.removeEventListener("dragover", over)
    }
  }

  /**
   * SIDE EFFECT:  picture `file` saved (`save`), and its words put in `textarea` where the cursor is now, on a line of
   * their own:  a paste's or a drop's (`intoWords()`), or a file chosen with a button (`<epic-option-form>`).
   * - NEVER throws:  `notify` says why a file can't be taken;  a failed save said so itself
   */
  static async putInto(textarea: HTMLTextAreaElement, file: File, { save, notify }: PictureSaver): Promise<void> {
    const problem = Pictures.problemOf(file)
    if (problem) return notify(problem)
    // where the cursor was, so typing meanwhile doesn't move where it lands
    const at = textarea.selectionStart ?? textarea.value.length
    const png = await Pictures.pngOf(file).catch(() => undefined)
    if (!png) return notify("notImage")
    const path = await save(png).catch(() => undefined)
    if (path) Pictures.insert(textarea, at, Pictures.wordsFor(path))
  }

  /** How a picture at `path` reads in the words:  `![picture](<path>)`. */
  static wordsFor(path: string): string {
    return `![picture](${path})`
  }

  /** Each piece of `words`:  a picture's path (`{ picture }`, from `wordsFor()`), or text between. */
  static piecesOf(words: string): Array<string | { picture: string }> {
    return words
      .split(PICTURE_WORDS)
      .map((piece, index) => (index % 2 ? { picture: piece } : piece))
      .filter((piece) => piece !== "")
  }

  /** SIDE EFFECT:  `words` go into `field` at `at`, on a line of their own, and the field says it changed (`input`). */
  private static insert(field: HTMLTextAreaElement, at: number, words: string) {
    const before = field.value.slice(0, at)
    const after = field.value.slice(at)
    const lead = before && !before.endsWith("\n") ? "\n" : ""
    const tail = after.startsWith("\n") ? "" : "\n"
    field.value = before + lead + words + tail + after
    const cursor = (before + lead + words + tail).length
    field.setSelectionRange(cursor, cursor)
    field.dispatchEvent(new Event("input", { bubbles: true }))
  }

  /** The `<textarea>` a paste or drop on `field` came from:  `field` itself, or one in its shadow roots. */
  private static textareaOf(event: Event, field: HTMLElement): HTMLTextAreaElement | undefined {
    if (field instanceof HTMLTextAreaElement) return field
    const from = event.composedPath()[0]
    return from instanceof HTMLTextAreaElement ? from : undefined
  }

  /** `file` as a data URL. */
  private static dataUrlOf(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error ?? new Error("couldn't read the picture"))
      reader.readAsDataURL(file)
    })
  }
}

/**
 * What takes a picture into words (`intoWords()`, `putInto()`):
 * - `save`:  the PNG data URL to its path;  `undefined` when it failed (it said why)
 * - `notify`:  says, in the page's words, why a file can't be taken
 */
export type PictureSaver = {
  save: (png: string) => Promise<string | undefined>
  notify: (problem: PictureProblem) => void
}

/** Why a picture can't be taken, as a key of the page's words. */
export type PictureProblem = "notImage" | "tooBig"

/** A picture in the words (`wordsFor()`), its path captured. */
const PICTURE_WORDS = /!\[picture\]\(([^)\s]+)\)/

/** The one type the page server takes. */
const PNG = "image/png"
