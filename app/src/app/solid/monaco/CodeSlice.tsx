import { createMemo } from "solid-js"

import type { SP } from "spell/parser/spell"

import { monaco, SpellMonaco } from "spell/app/app/ui/monaco"
import { MonacoEditor } from "./MonacoEditor"

import "./CodeSlice.css"

/****************
 * ### `<CodeSlice>`
 * A few lines of a file, in the code editor:  `file`'s own model, with every other line hidden (epic `editor`,
 * Events In Code).
 * - Typing here IS typing in the file:  the code pane shows it at once, it compiles as any edit does, and undo is
 *   the file's.  The language service sees the whole file, so colours, completions, hovers and errors are its.
 * - Its lines follow the file as it changes:  a line added inside them, or at their edges, is theirs.
 * - As tall as its lines, no taller:  it grows as they do.
 * - `column`:  where its code starts on its first line, when words come before it there (`- clickable when it is face up`):
 *   those words are hidden, as the row's header already says them, and the cursor never goes into them.
 * - `focus`:  puts the cursor at the end of its lines, once made, e.g. for a handler just added.
 * - The one place a part of a file is shown alone:  the notebook's cells could use it too.
 * - HACK:  hides the other lines with Monaco's `setHiddenAreas()`, which its folding uses, but its typings leave out.
 ****************/
export function CodeSlice(props: CodeSliceProps) {
  const model = createMemo(() => SpellMonaco.models.modelFor(props.file))
  let element!: HTMLDivElement
  return (
    <div class="CodeSlice" ref={(div) => (element = div)}>
      <MonacoEditor model={model()} options={SLICE_OPTIONS} onMount={(editor) => showOnly(editor, element, props)} />
    </div>
  )
}

/** Show only `props`' lines in `editor`, as they move with the file, and keep `element` as tall as they are. */
function showOnly(editor: monaco.editor.IStandaloneCodeEditor, element: HTMLElement, props: CodeSliceProps): void {
  const model = editor.getModel()!
  const lines = editor.createDecorationsCollection([
    {
      range: new monaco.Range(props.from, 1, props.to, model.getLineMaxColumn(props.to)),
      options: { stickiness: monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges }
    }
  ])
  const hide = () => {
    const shown = lines.getRange(0)
    if (!shown) return
    const hidden: monaco.IRange[] = []
    if (shown.startLineNumber > 1) hidden.push(new monaco.Range(1, 1, shown.startLineNumber - 1, 1))
    const count = model.getLineCount()
    if (shown.endLineNumber < count) hidden.push(new monaco.Range(shown.endLineNumber + 1, 1, count, 1))
    ;(editor as unknown as HiddenAreas).setHiddenAreas(hidden)
  }
  hide()
  editor.onDidChangeModelContent(hide)
  if (props.column && props.column > 1) hideWordsBefore(editor, props.from, props.column)
  editor.onDidContentSizeChange(({ contentHeight }) => (element.style.height = `${contentHeight}px`))
  element.style.height = `${editor.getContentHeight()}px`
  if (props.focus) {
    const end = lines.getRange(0)!
    editor.setPosition({ lineNumber: end.endLineNumber, column: model.getLineMaxColumn(end.endLineNumber) })
    editor.focus()
  }
}

/**
 * Hide the words before `column` on line `line`, e.g. `- clickable when `, and keep the cursor after them.
 * - HACK:  Monaco hides only whole lines, so the words are a decoration drawn with `display: none`;
 *   its measuring then gives them no width, and a cursor moved into them is moved back out.
 */
function hideWordsBefore(editor: monaco.editor.IStandaloneCodeEditor, line: number, column: number): void {
  const words = editor.createDecorationsCollection([
    {
      range: new monaco.Range(line, 1, line, column),
      options: {
        inlineClassName: "CodeSliceHidden",
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
      }
    }
  ])
  editor.onDidChangeCursorPosition(({ position }) => {
    const hidden = words.getRange(0)
    if (!hidden || position.lineNumber !== hidden.startLineNumber || position.column >= hidden.endColumn) return
    editor.setPosition({ lineNumber: hidden.startLineNumber, column: hidden.endColumn })
  })
}

/** Monaco's own way to hide lines:  its code editor has it, its typings don't say. */
type HiddenAreas = { setHiddenAreas(ranges: monaco.IRange[]): void }

/** How a slice looks:  no line numbers or margin, and no scrolling of its own;  it wraps. */
const SLICE_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  folding: false,
  glyphMargin: false,
  lineDecorationsWidth: 4,
  wordWrap: "on",
  wrappingIndent: "none",
  scrollbar: { vertical: "hidden", horizontal: "hidden", alwaysConsumeMouseWheel: false, handleMouseWheel: false },
  overviewRulerLanes: 0,
  stickyScroll: { enabled: false },
  fontSize: 14
}

/** Props for `<CodeSlice>`. */
export type CodeSliceProps = {
  /** The file the lines are in. */
  file: SP.AnySpellFile
  /** Its first line shown, 1-based. */
  from: number
  /** Its last line shown, 1-based. */
  to: number
  /** Where its code starts on line `from`, 1-based:  the words before it are hidden. */
  column?: number
  /** Put the cursor in it once made. */
  focus?: boolean
}
