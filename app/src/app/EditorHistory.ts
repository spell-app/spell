import { UndoStack } from "spell/util"

import { SourceEdits, type TextSpan } from "spell/app/lsp/SourceEdits"
import type { TextEdit } from "vscode-languageserver"

/****************
 * ### `EditorHistory`
 * What people undo in the editor outside the code:  the side bar's changes and the notebook's.
 * - The third of three histories, each with one job:
 *   - the running program's (`core.RUNTIME.history`):  the app's own moves, gone at each run
 *   - the code editor's:  what's typed, per file
 *   - this one:  a step for each change made through the side bar or a notebook's page
 * - A step remembers a MEANING, not a position:  "this text was that".
 *   - So undo finds its text again, nearest where it was, and typing elsewhere in the file doesn't break it.
 *   - Its text is gone (someone deleted that tag, or typed in it):  undo says so, and that step does nothing.
 * - On the generic `UndoStack`:  a run of changes to one field folds into one step, by its target,
 *   and a change to many things is one transaction.
 * - Knows nothing of the code editor or the page:  it's handed how to apply an edit and how to say it couldn't.
 *   So it's tested in node, and works with the code editor not loaded.
 ****************/
export class EditorHistory extends UndoStack {
  /** A history that makes its changes with `applyEdits`, and tells people with `onGone` when a change's text has gone. */
  constructor({ applyEdits, onGone, titleFor }: EditorHistoryProps) {
    super({ limit: EditorHistory.LIMIT, titleFor })
    this.applyEdits = applyEdits
    this.onGone = onGone
  }

  /** The most steps kept:  they hold little text, and nobody undoes further. */
  static LIMIT = 200

  /**
   * Make `change` to its file now, and keep it as a step.
   * - `live`:  what else goes with it, to the running app:  run again by undo and redo, `"undo"` or `"redo"`.
   * - `title`, `target`:  `UndoStack.record()`'s.
   */
  change(change: TextChange, step: { title: string; target?: unknown; live?: (way: "undo" | "redo") => void }): void {
    const { file, at, before, after } = change
    const text = file.contents ?? ""
    this.applyEdits(file, [SourceEdits.replacing(text, { start: at, end: at + before.length }, after)])
    const swap = (from: string, to: string, way: "undo" | "redo") => {
      if (this.swapText(file, from, to, at)) step.live?.(way)
      else this.onGone(step.title)
    }
    this.record(
      { undo: () => swap(after, before, "undo"), redo: () => swap(before, after, "redo") },
      { title: step.title, target: step.target }
    )
  }

  /** Put `to` in place of the `from` nearest `at` in `file`:  false when there's none. */
  private swapText(file: EditedFile, from: string, to: string, at: number): boolean {
    const text = file.contents ?? ""
    const found = nearest(text, from, at)
    if (found === undefined) return false
    this.applyEdits(file, [SourceEdits.replacing(text, { start: found, end: found + from.length }, to)])
    return true
  }

  /** How it makes a change:  `EditorHistoryProps.applyEdits`. */
  private readonly applyEdits: EditorHistoryProps["applyEdits"]

  /** How it says a change's text has gone:  `EditorHistoryProps.onGone`. */
  private readonly onGone: EditorHistoryProps["onGone"]
}

////////////////
// ## Types
////////////////

/** What a history needs of a file:  its text, which `applyEdits` changes. */
export type EditedFile = {
  /** its text */
  contents?: string
}

/** One change to a file's text:  at `at`, `before` became `after`. */
export type TextChange = {
  /** the file it's in */
  file: EditedFile
  /** where `before` starts */
  at: number
  /** its text before:  whole enough to find again, e.g. a tag's head */
  before: string
  /** its text after */
  after: string
}

/** What `new EditorHistory()` is handed. */
export type EditorHistoryProps = {
  /** Make `edits` to `file`'s text, with the code editor or without it. */
  applyEdits: (file: EditedFile, edits: TextEdit[]) => void
  /** A step titled `title` couldn't be put back:  its text has gone. */
  onGone: (title: string) => void
  /** The Edit menu's titles:  `UndoStackProps.titleFor`. */
  titleFor?: (action: "undo" | "redo", title: string | undefined) => string
}

////////////////
// ## Helpers
////////////////

/** The offset of the `text` in `source` nearest `at`:  `undefined` when it isn't there. */
function nearest(source: string, text: string, at: number): number | undefined {
  let best: number | undefined
  for (let found = source.indexOf(text); found >= 0; found = source.indexOf(text, found + 1)) {
    if (best === undefined || Math.abs(found - at) < Math.abs(best - at)) best = found
  }
  return best
}

/** The text at `span` of `text`, for a `TextChange`'s `before`. */
export function textAt(text: string, span: TextSpan): string {
  return text.slice(span.start, span.end)
}
