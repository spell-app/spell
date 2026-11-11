import { Loading, Show, createEffect, createSignal } from "solid-js"
import type { monaco } from "spell/app/app/ui/monaco"

import { EDITOR_OWN } from "spell/app/app/ui/ui.types"
import { LazyMonaco } from "spell/app/app/solid/LazyMonaco"
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
  onEditor?: (instance: monaco.editor.IStandaloneCodeEditor) => void
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
            language={EXAMPLE_LANGUAGE}
            readOnly={false}
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
 * A piece of code in a small Monaco editor, no line numbers or minimap.
 * - As tall as its text, wrapped lines too:  growing and shrinking as it's typed in, never scrolling inside
 *   (Owen, 2026-10-27:  "example code is getting cut off, should size based on the content").
 * - Its own model, so its own undo:  a run of typing undone as one, as in the code column.
 * - `readOnly` follows its prop:  switching to an editable view makes it editable, without a new editor.
 * - Until Monaco's loaded, its code as plain text.
 * - Its own edits never come back into it while it's typed in:
 *   the code the page hands back after an edit may differ (a blank last line dropped, a view's twin written again),
 *   and putting that in would move the cursor.
 ****************/
export function CellEditor(props: {
  code: string
  language: string
  readOnly: boolean
  onChange: (code: string) => void
  /** its text flush with its box's left edge, no margin before it:  an example's code, under its demo */
  flush?: boolean
  /** hears its Monaco editor, once made */
  onEditor?: (instance: monaco.editor.IStandaloneCodeEditor) => void
}) {
  let instance: monaco.editor.IStandaloneCodeEditor | undefined
  // its lines' height until Monaco's in;  then Monaco's own measure of its text, wrapped lines too
  const [height, setHeight] = createSignal(props.code.split("\n").length * LINE_HEIGHT)
  // what it shows:  the page's code, but its own text while it's typed in
  const shownCode = () => (instance?.hasTextFocus() ? instance.getValue() : props.code)
  createEffect(
    () => props.readOnly,
    (readOnly) => {
      instance?.updateOptions({ readOnly })
    }
  )
  return (
    <div class="NotebookCode" style={{ height: `${height()}px` }}>
      <Loading fallback={<pre class="NotebookCodeLoading">{props.code}</pre>}>
        <LazyMonaco.MonacoEditor
          value={shownCode()}
          language={props.language}
          options={{ ...CODE_OPTIONS, ...(props.flush ? FLUSH_OPTIONS : {}), readOnly: props.readOnly }}
          onChange={(code) => props.onChange(code)}
          onMount={(editor) => {
            instance = editor
            props.onEditor?.(editor)
            editor.onDidContentSizeChange((event) => setHeight(event.contentHeight))
            queueMicrotask(() => setHeight(editor.getContentHeight()))
          }}
        />
      </Loading>
    </div>
  )
}

/** Monaco's language for an example's markup:  a page's, which reads bare names and `</>` (`spellx`'s colours). */
const EXAMPLE_LANGUAGE = "spellx"

/** Height of a line in a cell's editor, px. */
const LINE_HEIGHT = 20

/** An example's editor:  its text starts where its demo's does, as a component page's example code does. */
const FLUSH_OPTIONS = { glyphMargin: false, lineDecorationsWidth: 0, lineNumbersMinChars: 0 } as const

/** A cell's editor:  no line numbers, minimap or scrolling past the end;  it follows its box's size. */
const CODE_OPTIONS = {
  fontSize: 13,
  lineHeight: LINE_HEIGHT,
  lineNumbers: "off",
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  folding: false,
  automaticLayout: true,
  // a long line wraps, rather than run off the cell's edge with nothing to say so
  wordWrap: "on",
  renderLineHighlight: "none",
  overviewRulerLanes: 0,
  // as tall as its text:  nothing to scroll, and the wheel scrolls the page
  scrollbar: { vertical: "hidden", handleMouseWheel: false, alwaysConsumeMouseWheel: false }
} as const
