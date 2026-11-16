import type { MarkMaker } from "spell/app/app/ui/TextMarks"
import type { monaco } from "./monaco"

/****************
 * ### `MonacoMarks`
 * Monaco's step from the look's marks to its own:  each stretch `TextMarks` works out (`BubblyMarks`, `MarkupMarks`)
 * becomes a Monaco decoration, its classes inline, its spacers injected text.
 * - Every other step is the editors' shared one:  CodeMirror makes its own marks of the same stretches
 *   (epic `codemirror` P3).
 * - Pure data:  Monaco's TYPES only, so it's tested without an editor.
 ****************/
export class MonacoMarks {
  /** A stretch as a Monaco decoration:  a place's has no options. */
  static make: MarkMaker<monaco.editor.IModelDeltaDecoration> = (stretch, marks) => {
    const { start, end, classes, before, after } = stretch
    const range = MonacoMarks.range(marks, start, end)
    if (classes === undefined) return { range, options: {} }
    return { range, options: { inlineClassName: classes, ...(before ? { before } : {}), ...(after ? { after } : {}) } }
  }

  /** Monaco's range from offset `start` to `end`, by `marks`' lines. */
  static range(
    marks: { positionAt(offset: number): { line: number; column: number } },
    start: number,
    end: number
  ): monaco.IRange {
    const from = marks.positionAt(start)
    const to = marks.positionAt(end)
    return { startLineNumber: from.line, startColumn: from.column, endLineNumber: to.line, endColumn: to.column }
  }
}
