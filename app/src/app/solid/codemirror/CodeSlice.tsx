import { createEffect, untrack } from "solid-js"
import type { EditorView } from "@codemirror/view"

import type { SP } from "spell/parser/spell"
import { SpellCodeMirror } from "spell/app/app/ui/codemirror"
import { CodeMirrorEditor } from "./CodeMirrorEditor"

/****************
 * ### `<CodeSlice>`
 * Some lines of a file, alone, in a CodeMirror editor:  the twin of Monaco's `<CodeSlice>`, as the Inspector's Code
 * card shows an action's body (epic `codemirror` P3).
 * - A slice of the file's state in the page's `FileStates` (`showSlice()`), never a copy of its text:
 *   typing in it is typing in the file, and an edit anywhere else in the file shows in it at once.
 * - Drawn as the file is, but only what's wholly in its lines bubbly:  a block it cuts draws no band or rail cut off
 *   at its edges, as Monaco's `SpellBubbly.showSlice()`.
 * - A new `file` or new `lines`:  shown in the same view.
 * - Not yet Monaco's `column`, `endColumn`, `focus`, nor its lines shown dedented:  the Inspector itself still shows
 *   Monaco's slices until the swap (epic `codemirror` P6).
 ****************/
export function CodeSlice(props: CodeSliceProps) {
  /** The view, once made. */
  let view: EditorView | undefined

  // Show new lines, or another file's, in the same view.
  createEffect(
    () => [props.file, props.from, props.to] as const,
    ([file, from, to]) => {
      show(file, from, to)
    }
  )

  return (
    <CodeMirrorEditor
      onMount={(made) => {
        view = made
        untrack(() => show(props.file, props.from, props.to))
        props.onMount?.(made)
      }}
      onUnmount={(made) => {
        SpellCodeMirror.states.releaseSlice(made)
        view = undefined
      }}
    />
  )

  /** Show `file`'s lines `from` to `to` in the view. */
  function show(file: SP.AnySpellFile, from: number, to: number) {
    if (view) SpellCodeMirror.states.showSlice(view, file, { first: from, last: to })
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
  /** called with the view once it's made */
  onMount?: (view: EditorView) => void
}
