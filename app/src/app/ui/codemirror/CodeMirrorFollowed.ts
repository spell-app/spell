import { type Extension, RangeSet, StateEffect, StateField } from "@codemirror/state"
import { EditorView, GutterMarker, gutterLineClass } from "@codemirror/view"

/****************
 * ### `CodeMirrorFollowed`
 * The lines being followed, marked in a CodeMirror editor:  a bar in the gutter, in the theme's accent,
 * and no band across the code (`FollowedLine` on the line's gutter elements, `CodeOutput.css`).
 * - What the code pane and the compiled code show of the place in focus (`editor.followed`, `<FollowAlong>`).
 * - Every editor has room for the marks (`CodeMirrorSetup` adds `extension()`):  `show()` puts them in any of them.
 * - The marks move with the text as it's edited;  `show()` with no lines takes them away.
 * - Its position in the import graph:  CodeMirror alone.
 ****************/
export class CodeMirrorFollowed {
  /** Room for the marks, in every editor's state. */
  static extension(): Extension {
    return followedLines
  }

  /**
   * Mark `lines`, from 0, in `view`, and bring the first into view when it's out of it;  none:  no mark.
   * - Never takes the keyboard's focus, and never moves the caret.
   */
  static show(view: EditorView, lines: readonly number[]): void {
    const { doc } = view.state
    const starts = lines.filter((line) => line >= 0 && line < doc.lines).map((line) => doc.line(line + 1).from)
    const effects: StateEffect<unknown>[] = [setFollowed.of(starts)]
    const first = starts[0]
    if (first !== undefined && !CodeMirrorFollowed.isInView(view, first))
      effects.push(EditorView.scrollIntoView(first, { y: "center" }))
    view.dispatch({ effects })
  }

  /** Take the marks away from `view`. */
  static clear(view: EditorView): void {
    if (view.state.field(followedLines, false)?.size) view.dispatch({ effects: setFollowed.of([]) })
  }

  /** Is the line holding `pos` wholly in `view`'s scrolled-to part? */
  static isInView(view: EditorView, pos: number): boolean {
    const block = view.lineBlockAt(pos)
    const top = view.documentTop + block.top
    const shown = view.scrollDOM.getBoundingClientRect()
    return top >= shown.top && top + block.height <= shown.top + view.scrollDOM.clientHeight
  }
}

/** The lines to mark, by where each starts:  `CodeMirrorFollowed.show()`. */
const setFollowed = StateEffect.define<number[]>()

/** The mark on a followed line's gutter elements:  their class. */
class FollowedMarker extends GutterMarker {
  override elementClass = "FollowedLine"
}
const FOLLOWED = new FollowedMarker()

/** The followed lines' marks, moved with each edit. */
const followedLines = StateField.define<RangeSet<GutterMarker>>({
  create: () => RangeSet.empty,
  update: (marks, transaction) => {
    for (const effect of transaction.effects)
      if (effect.is(setFollowed))
        return RangeSet.of(
          effect.value.map((from) => FOLLOWED.range(from)),
          true
        )
    return transaction.docChanged ? marks.map(transaction.changes) : marks
  },
  provide: (field) => gutterLineClass.from(field)
})
