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
   * - Whether it's in view is asked once the view has measured itself (`requestMeasure()`):
   *   a file just shown has only guessed line heights, and the bubbly look's lines are taller than the guess,
   *   so a line far down read as in view and was never scrolled to (epic `editor` I245).
   */
  static show(view: EditorView, lines: readonly number[]): void {
    const { doc } = view.state
    const starts = lines.filter((line) => line >= 0 && line < doc.lines).map((line) => doc.line(line + 1).from)
    view.dispatch({ effects: setFollowed.of(starts) })
    const first = starts[0]
    if (first === undefined) return
    view.requestMeasure({
      // where to scroll to, centring the line:  none when it's in view
      read: () => {
        if (CodeMirrorFollowed.isInView(view, first)) return undefined
        const block = view.lineBlockAt(first)
        const scroller = view.scrollDOM
        // the document's top in the scroller's content:  its padding above it
        const documentStart = view.documentTop - scroller.getBoundingClientRect().top + scroller.scrollTop
        return Math.max(0, documentStart + block.top - (scroller.clientHeight - block.height) / 2)
      },
      write: (scrollTop) => {
        if (scrollTop !== undefined) view.scrollDOM.scrollTop = scrollTop
      }
    })
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
