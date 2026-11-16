import { createEffect, untrack } from "solid-js"
import type { EditorView } from "@codemirror/view"

import type { SP } from "spell/parser/spell"
import { FileStates, SpellCodeMirror, type SliceLines } from "spell/app/app/ui/codemirror"
import { CodeMirrorEditor } from "./CodeMirrorEditor"

import "./CodeSlice.css"

/****************
 * ### `<CodeSlice>`
 * Some lines of a file, alone, in a CodeMirror editor, as the Inspector's Code card shows an action's body
 * (epic `editor`, Events In Code;  epic `codemirror` P3, P6).
 * - A slice of the file's state in the page's `FileStates` (`showSlice()`), never a copy of its text:
 *   typing in it is typing in the file, the code pane shows it at once, it compiles as any edit does, and undo is
 *   the file's.  The language service sees the whole file, so colours, suggestions, hovers and errors are its.
 * - Its lines follow the file as it changes:  a line added inside them, or at their edges, is theirs.
 * - As tall as its lines, no taller:  it grows as they do (`CodeSlice.css`).
 * - `column`:  where its code starts on its first line, when words come before it there (`- clickable when it is
 *   face up`):  those words are hidden, as the row's header already says them, and the caret never goes into them.
 * - `endColumn`:  where its code ends on its last line, when a tag's end follows it there (`its rank</>`):
 *   the rest of that line is hidden the same way.
 * - Without a `column`, its lines show as if dedented (Owen:  "shouldn't show indent here, should be implicit"):
 *   their common indent is hidden.
 * - `focus`:  puts the caret at the end of its lines, once made, e.g. for a handler just added.
 * - Drawn as the file is, but only what's wholly in its lines bubbly:
 *   a block it cuts draws no band or rail cut off at its edges.
 * - A new `file` or new lines:  shown in the same view.
 * - Made again while it's typed in, it keeps the caret where it was (`keepCaret()`, epic `editor` I141).
 ****************/
export function CodeSlice(props: CodeSliceProps) {
  /** The view, once made. */
  let view: EditorView | undefined

  // Show new lines, or another file's, in the same view.
  createEffect(
    () => [props.file, props.from, props.to, props.column, props.endColumn] as const,
    () => {
      show()
    }
  )

  return (
    <div class="CodeSlice">
      <CodeMirrorEditor
        onMount={(made) => {
          view = made
          untrack(() => {
            show()
            if (props.focus) caretToEnd(made)
            else takeCaretBack(made, props.file)
          })
          props.onMount?.(made)
        }}
        onUnmount={(made) => {
          if (made.hasFocus)
            keepCaret(
              made,
              untrack(() => props.file)
            )
          SpellCodeMirror.states.releaseSlice(made)
          view = undefined
        }}
      />
    </div>
  )

  /** Show the props' lines of their file in the view. */
  function show() {
    if (!view) return
    const lines: SliceLines = {
      first: props.from,
      last: props.to,
      column: props.column,
      endColumn: props.endColumn,
      dedent: !props.column
    }
    SpellCodeMirror.states.showSlice(view, props.file, lines)
  }
}

/** Props for `<CodeSlice>`. */
export type CodeSliceProps = {
  /** the file it shows some lines of */
  file: SP.AnySpellFile
  /** its first line shown, 1-based */
  from: number
  /** its last line shown, 1-based */
  to: number
  /** where its code starts on line `from`, 1-based:  the words before it are hidden */
  column?: number
  /** where its code ends on line `to`, 1-based:  the words from there on are hidden */
  endColumn?: number
  /** put the caret in it, at its end, once made */
  focus?: boolean
  /** called with the view once it's made */
  onMount?: (view: EditorView) => void
}

/** Put `view`'s caret at the end of what it shows, and focus it. */
function caretToEnd(view: EditorView) {
  const slice = FileStates.sliceIn(view.state)
  if (!slice) return
  view.dispatch({ selection: { anchor: slice.to }, scrollIntoView: true })
  view.focus()
}

////////////////
// ## The caret, across a slice made again
////////////////

/**
 * The caret of a slice that went while it was typed in, for the slice made in its place to take back
 * (epic `editor` I141).
 * - Why:  a Spell UI element's handler, `onClick={...}`, is a change to its drawing,
 *   so each compile draws the element again, the Inspector's card with it, and makes its slice again:
 *   the caret would drop out of it after the first word.
 * - Forgotten once anything else takes the focus.
 */
let caretLeft: { file: SP.AnySpellFile; pos: number } | undefined

/** Keep `view`'s caret, as its slice of `file` goes while it's typed in. */
function keepCaret(view: EditorView, file: SP.AnySpellFile): void {
  const kept = (caretLeft = { file, pos: view.state.selection.main.head })
  const forget = () => {
    if (caretLeft === kept) caretLeft = undefined
  }
  document.addEventListener("focusin", forget, { capture: true, once: true })
}

/**
 * Put the caret kept (`keepCaret()`) back in `view`, when it shows the same file and the caret's inside what it shows.
 * - Only while nothing else has the focus:  it dropped to the page as the old slice went.
 */
function takeCaretBack(view: EditorView, file: SP.AnySpellFile): void {
  const kept = caretLeft
  const slice = FileStates.sliceIn(view.state)
  if (!kept || kept.file !== file || !slice || kept.pos < slice.from || kept.pos > slice.to) return
  const focused = document.activeElement
  if (focused && focused !== document.body) return
  caretLeft = undefined
  view.dispatch({ selection: { anchor: kept.pos } })
  view.focus()
}
