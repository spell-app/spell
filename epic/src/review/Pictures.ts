import { SHOT_MAX_BYTES } from "./review.types"

/****************
 * ### `Pictures`
 * The pictures the person gives a page:  pasted, dropped or chosen, then sent to the page server as PNGs, and written
 * into the words of the box they went into, LABELLED:  `![IMG2](<path>)` (epic `epic-engine` P75).
 * - ONE way for every place that takes them:  a note box (`<epic-review>`), an option's form (`<epic-option-form>`),
 *   a comment's field (`intoWords()`, I267), the kickoff box (`<epic-kickoff>`)
 * - Several at once:  every picture in a paste, a drop or a file chooser, saved in order (`filesOf()`, `putAllInto()`)
 * - Labels count within one box's words:  IMG1, IMG2 ... (`picturesOf()`);  the person writes "IMG2 is wrong", and
 *   the session finds IMG2's file (`epic inbox wait` prints each)
 * - Renumbered ONLY while a box is typed in, nothing sent yet (P75's choice B):  taking IMG2 out makes IMG3 IMG2, in
 *   the links and in the words that name them (`without()`, `closeGap()`);  once sent, a gap stays, so anything
 *   already said about IMG3 stays true
 * - Plain browser DOM, static:  no Solid, no element;  the words' helpers are pure, node-safe at import, so the epic
 *   tool reads them too;  the caller saves a picture (`ReviewClient.saveShot()`) and says what went wrong in its own
 *   words (`problemOf()`)
 ****************/
export class Pictures {
  /** Every picture file in a paste or a drop, in order;  `[]` for none (text, a link). */
  static filesOf(event: ClipboardEvent | DragEvent): File[] {
    const items = "clipboardData" in event ? event.clipboardData?.items : event.dataTransfer?.items
    const files = Array.from(items ?? [])
      .filter((each) => each.kind === "file" && each.type.startsWith("image/"))
      .map((each) => each.getAsFile())
      .filter((file): file is File => !!file)
    if (files.length || !("dataTransfer" in event)) return files
    return Array.from(event.dataTransfer?.files ?? [])
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
   * SIDE EFFECT:  every picture pasted or dropped in `field` is saved (`save`), and its words go into the words at the
   * cursor, in order, each on a line of its own, `![IMG2](<path>)`:  so they go wherever the words go -- the comment
   * saved, the Send, the inbox a session reads -- and the thread draws them as labelled pictures (`<epic-picture>`).
   * - `field`:  a `<textarea>`, or an element drawing one in its shadow roots (`<epic-text-box>`, `<ui-textarea>`):
   *   the `<textarea>` the paste or drop came from takes the words
   * - text pastes as usual
   * - `renumber`:  the box is still being typed, nothing sent:  a picture's whole link deleted by hand closes the gap
   *   it leaves (`closeGap()`);  a saved comment being edited leaves it
   * - in VS Code's side bar the page gets a picture as a paste too (the extension's `ClipboardImage`)
   * - NEVER throws;  answers what stops listening
   */
  static intoWords(field: HTMLElement, saver: PictureSaver, { renumber = false } = {}): () => void {
    const take = (event: ClipboardEvent | DragEvent) => {
      const files = Pictures.filesOf(event)
      const textarea = Pictures.textareaOf(event, field)
      if (!files.length || !textarea) return
      event.preventDefault()
      void Pictures.putAllInto(textarea, files, saver)
    }
    const over = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes("Files")) event.preventDefault()
    }
    // the words as they were before each key, per field:  what `closeGap()` compares
    const before = new WeakMap<HTMLTextAreaElement, string>()
    const remember = (event: Event) => {
      const textarea = Pictures.textareaOf(event, field)
      if (textarea) before.set(textarea, textarea.value)
    }
    const typed = (event: Event) => {
      const textarea = Pictures.textareaOf(event, field)
      if (!textarea) return
      const was = before.get(textarea)
      before.set(textarea, textarea.value)
      if (renumber && was !== undefined) Pictures.closeGapIn(textarea, was)
    }
    field.addEventListener("paste", take)
    field.addEventListener("drop", take)
    field.addEventListener("dragover", over)
    field.addEventListener("focusin", remember)
    field.addEventListener("beforeinput", remember)
    field.addEventListener("input", typed)
    return () => {
      field.removeEventListener("paste", take)
      field.removeEventListener("drop", take)
      field.removeEventListener("dragover", over)
      field.removeEventListener("focusin", remember)
      field.removeEventListener("beforeinput", remember)
      field.removeEventListener("input", typed)
    }
  }

  /**
   * SIDE EFFECT:  `files` saved and put in `textarea`, one after another, in order (`putInto()`):  several pictures from
   * one paste, drop or file chooser are IMG3, IMG4 ... as they came.
   * - NEVER throws
   */
  static async putAllInto(textarea: HTMLTextAreaElement, files: readonly File[], saver: PictureSaver): Promise<void> {
    for (const file of files) await Pictures.putInto(textarea, file, saver)
  }

  /**
   * SIDE EFFECT:  picture `file` saved (`save`), and its words put in `textarea` where the cursor is now, on a line of
   * their own, labelled the next number in the box (`nextLabel()`):  a paste's or a drop's (`intoWords()`), or a file
   * chosen with a button.
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
    if (path) Pictures.insert(textarea, Math.min(at, textarea.value.length), path)
  }

  ////////////////
  // ## The words
  ////////////////

  /** How a picture at `path` reads in the words:  `![IMG2](<path>)`;  no label, an old one's `![picture](<path>)`. */
  static wordsFor(path: string, label = OLD_LABEL): string {
    return `![${label}](${path})`
  }

  /**
   * The pictures in `words`, in order:  each one's label, number and path.
   * - an old `![picture](<path>)`, from before P75, is counted in its place:  the 2nd picture of the words is IMG2
   */
  static picturesOf(words: string): WordsPicture[] {
    const pictures: WordsPicture[] = []
    for (const match of words.matchAll(PICTURE_WORDS_ALL)) {
      const old = match[1] === OLD_LABEL
      const number = old ? pictures.length + 1 : Number(match[1]!.slice(LABEL.length))
      pictures.push({ label: `${LABEL}${number}`, number, path: match[2]!, ...(old ? { old: true as const } : {}) })
    }
    return pictures
  }

  /** The label the next picture put in `words` gets:  one past the highest there, `IMG1` in none. */
  static nextLabel(words: string): string {
    return `${LABEL}${Math.max(0, ...Pictures.picturesOf(words).map((picture) => picture.number)) + 1}`
  }

  /** Each piece of `words`:  a picture (`{ picture, label }`, from `wordsFor()`), or text between. */
  static piecesOf(words: string): Array<string | { picture: string; label: string }> {
    const labels = Pictures.picturesOf(words).map((picture) => picture.label)
    const pieces: Array<string | { picture: string; label: string }> = []
    let last = 0
    let index = 0
    for (const match of words.matchAll(PICTURE_WORDS_ALL)) {
      if (match.index > last) pieces.push(words.slice(last, match.index))
      pieces.push({ picture: match[2]!, label: labels[index++]! })
      last = match.index + match[0].length
    }
    if (last < words.length) pieces.push(words.slice(last))
    return pieces
  }

  /** `words` with each picture's link as its label alone:  `see ![IMG2](x.png)` => `see IMG2`, for a one-line note. */
  static labelled(words: string): string {
    const labels = Pictures.picturesOf(words).map((picture) => picture.label)
    let index = 0
    return words.replace(PICTURE_WORDS_ALL, () => labels[index++]!)
  }

  /**
   * `words` with picture `label` taken out:  its link, and the line it stood on when it stood alone.
   * - `renumber`:  the box is still being typed (choice B):  the labels after it move down one, in the links and in the
   *   words that name them (`IMG3 is wrong` => `IMG2 is wrong`);  once sent, they stay, a gap left
   * - a label the words don't have:  `words` as they are
   */
  static without(words: string, label: string, { renumber = false } = {}): string {
    const picture = Pictures.picturesOf(words).find((each) => each.label === label)
    if (!picture) return words
    let left = words
    for (const match of words.matchAll(PICTURE_WORDS_ALL)) {
      if (match[2] !== picture.path) continue
      const start = match.index
      const end = start + match[0].length
      const lineStart = words.lastIndexOf("\n", start - 1) + 1
      const lineEnd = words.indexOf("\n", end)
      const alone = !words.slice(lineStart, start).trim() && !words.slice(end, lineEnd < 0 ? undefined : lineEnd).trim()
      left = alone
        ? words.slice(0, lineStart) + (lineEnd < 0 ? "" : words.slice(lineEnd + 1))
        : words.slice(0, start) + words.slice(end)
      if (alone && lineEnd < 0) left = left.replace(/\n$/, "")
      break
    }
    return renumber ? Pictures.shiftedAfter(left, picture.number) : left
  }

  /**
   * `after`, the words once a key changed `before`:  a picture whose whole link went has
   * its gap closed, the labels after it moved down one (`shiftedAfter()`);  anything else, `after` as it is.
   * - only a link wholly gone counts, its path and its start both:  a link half deleted, a key at a time from either
   *   end, renumbers nothing
   */
  static closeGap(before: string, after: string): string {
    const gone = Pictures.picturesOf(before).filter(
      (picture) => !picture.old && !after.includes(picture.path) && !after.includes(`![${picture.label}](`)
    )
    // highest first, so each shift names what's left
    return gone
      .sort((a, b) => b.number - a.number)
      .reduce((words, picture) => Pictures.shiftedAfter(words, picture.number), after)
  }

  /** `words` with every `IMG<n>` above `number` one lower:  in the links and in the words that name them. */
  static shiftedAfter(words: string, number: number): string {
    return words.replace(MENTION, (said, digits: string) =>
      Number(digits) > number ? `${LABEL}${Number(digits) - 1}` : said
    )
  }

  ////////////////
  // ## Helpers
  ////////////////

  /**
   * SIDE EFFECT:  picture `path`'s words go into `field` at `at`, labelled the next number, on a line of their own,
   * and the field says it changed (`input`).
   */
  private static insert(field: HTMLTextAreaElement, at: number, path: string) {
    const words = Pictures.wordsFor(path, Pictures.nextLabel(field.value))
    const before = field.value.slice(0, at)
    const after = field.value.slice(at)
    const lead = before && !before.endsWith("\n") ? "\n" : ""
    const tail = after.startsWith("\n") ? "" : "\n"
    field.value = before + lead + words + tail + after
    const cursor = (before + lead + words + tail).length
    field.setSelectionRange(cursor, cursor)
    // composed:  a field in a shadow root (`<ui-textarea>`'s) tells its host's listeners too, as a key would
    field.dispatchEvent(new Event("input", { bubbles: true, composed: true }))
  }

  /**
   * SIDE EFFECT:  `textarea`'s words with their gap closed (`closeGap()`), its cursor kept where it was in them;  then
   * an `input` of its own, so what holds the words (a `<ui-textarea>`, a comment's saver) takes the new ones.
   */
  private static closeGapIn(textarea: HTMLTextAreaElement, before: string) {
    const words = textarea.value
    const closed = Pictures.closeGap(before, words)
    if (closed === words) return
    const cursor = textarea.selectionStart ?? words.length
    const head = Pictures.closeGap(before, words.slice(0, cursor))
    textarea.value = closed
    textarea.setSelectionRange(head.length, head.length)
    textarea.dispatchEvent(new Event("input", { bubbles: true, composed: true }))
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

/**
 * A picture in a box's words (`picturesOf()`):
 * - `label`:  `IMG2`, as the person names it;  `number`:  its 2
 * - `path`:  its file, as the page server answered it (from the page's folder, or a root path)
 * - `old`:  written before P75, `![picture](<path>)`:  its label is its place, and it never renumbers
 */
export type WordsPicture = { label: string; number: number; path: string; old?: true }

/** What a label starts with:  `IMG2`. */
const LABEL = "IMG"

/** An old picture's words' text, from before P75:  `![picture](<path>)`. */
const OLD_LABEL = "picture"

/** A picture in the words (`wordsFor()`):  its label (or the old `picture`), and its path. */
const PICTURE_WORDS_ALL = /!\[(IMG\d+|picture)\]\(([^)\s]+)\)/g

/** A label named in the words, or a link's:  `IMG2`, its number captured. */
const MENTION = /\bIMG(\d+)\b/g

/** The one type the page server takes. */
const PNG = "image/png"
