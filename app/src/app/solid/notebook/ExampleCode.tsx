import { Loading, Show } from "solid-js"
import type { EditorView } from "@codemirror/view"

import { EDITOR_OWN } from "spell/app/app/ui/ui.types"
import { OWN_WRAP } from "spell/app/app/ui/codePopups"
import { LazyCodeMirror } from "spell/app/app/solid/LazyCodeMirror"
import type { NotebookController } from "./NotebookController"

/****************
 * ### `<ExampleCode>`
 * An example's code, in its code pane, which its `</>` button rolls open under its result.
 * - The pane is `<spell-example>`'s `source` slot.
 * - Its code as written:  the page is plain Spell, so there's one view of it (epic `language` P45).
 * - The example is the one written at `place`, where its `<spell-example>` is marked as written
 *   (`NotebookController.exampleAt()`).
 * - ALWAYS editable (`NotebookController.editExample()`).
 *   - Typed into the file as the code column types, and the example draws again once the typing pauses.
 *   - Locked, a try-out:  never saved, put back by the editor's Reset.
 * - Made once per example and MOVED into its example each time the program draws it again (`<NotebookPage>`):
 *   typing in it never loses its text, its cursor or its place.
 ****************/
export function ExampleCode(props: {
  controller: NotebookController
  place: { line: number; column: number }
  /** hears its code editor, once it's made:  what the page focuses again after the example draws again */
  onEditor?: (view: EditorView) => void
}) {
  const { controller } = props
  // the last one found:  a move puts the file's text ahead of `place`, until its compile says where this one went,
  // and for that moment `place` may find none, which would tear down the editor to no end (epic `notebook` I6)
  let lastExample: ReturnType<NotebookController["exampleAt"]>
  const example = () => (lastExample = controller.exampleAt(props.place) ?? lastExample)
  return (
    <div class="NotebookExampleCode" {...{ [EDITOR_OWN]: "" }} onClick={(event) => event.stopPropagation()}>
      <Show when={example()}>
        {(shown) => (
          <CellEditor
            code={controller.exampleCode(shown())}
            flush
            onChange={(code) => controller.editExample(props.place, code)}
            onEditor={props.onEditor}
          />
        )}
      </Show>
    </div>
  )
}

/****************
 * ### `<CellEditor>`
 * A piece of Spell in a small code editor, no line numbers, coloured by its tokens.
 * - As tall as its text, wrapped lines too:  growing and shrinking as it's typed in, never scrolling inside
 *   (Owen, 2026-10-27:  "example code is getting cut off, should size based on the content").
 * - Its own text, so its own undo:  a run of typing undone as one, as in the code column.
 * - Until CodeMirror's loaded, its code as plain text.
 * - Its own edits never come back into it while it's typed in:
 *   the code the page hands back after an edit may differ (a blank last line dropped, a view's twin written again),
 *   and putting that in would move the caret.
 ****************/
export function CellEditor(props: {
  code: string
  onChange: (code: string) => void
  /** its text flush with its box's left edge, no margin before it:  an example's code, under its demo */
  flush?: boolean
  /** hears its code editor, once made */
  onEditor?: (view: EditorView) => void
}) {
  let instance: EditorView | undefined
  // what it shows:  the page's code, but its own text while it's typed in
  const shownCode = () => (instance?.hasFocus ? instance.state.doc.toString() : props.code)
  return (
    // its own wrap, always on:  Wrap long lines is the code pane's and the Inspector's (I110)
    <div class={["NotebookCode", { flush: props.flush }]} {...{ [OWN_WRAP]: "" }}>
      <Loading fallback={<pre class="NotebookCodeLoading">{props.code}</pre>}>
        <LazyCodeMirror.CodeMirrorEditor
          value={shownCode()}
          language="spell"
          onChange={(code) => props.onChange(code)}
          onMount={(view) => {
            instance = view
            props.onEditor?.(view)
          }}
        />
      </Loading>
    </div>
  )
}
