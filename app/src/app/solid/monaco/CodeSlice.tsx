import { onSettled, untrack } from "solid-js"

import type { SP } from "spell/parser/spell"

import { monaco, SpellBubbly, SpellMonaco } from "spell/app/app/ui/monaco"
import { keepMouseMovesInShadowRoot } from "./MonacoEditor"

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
 * - `endColumn`:  where its code ends on its last line, when a tag's end follows it there (`its rank</>`):
 *   the rest of that line is hidden the same way.
 * - A body's lines show as if dedented (Owen:  "shouldn't show indent here, should be implicit"):  their common indent
 *   sits past the field's left edge, and a wrapped line starts under its own first word (`showWithoutIndent()`).
 * - `focus`:  puts the cursor at the end of its lines, once made, e.g. for a handler just added.
 * - The one place a part of a file is shown alone:  the notebook's cells could use it too.
 * - Never drawn bubbly (`SpellBubbly.leaveOut()`):  its few lines are laid out as a whole file's would be,
 *   so a declaration would be cut off at its edges.
 * - HACK:  hides the other lines with Monaco's `setHiddenAreas()`, which its folding uses, but its typings leave out.
 * - Its code editor is kept once it goes, for the next slice of the same file (`SlicePool`):
 *   making one measures every line of the file, ~60ms each time the Inspector's card was drawn again (epic `editor` I69).
 * - Its file, lines and columns are read once, as it's drawn:  a slice of other lines is a new `<CodeSlice>`.
 ****************/
export function CodeSlice(props: CodeSliceProps) {
  let element!: HTMLDivElement
  onSettled(() => {
    const lines = untrack(() => `${props.from}:${props.to}:${props.column ?? ""}:${props.endColumn ?? ""}`)
    const slice = SlicePool.take(SpellMonaco.models.modelFor(untrack(() => props.file)), element, lines)
    const shown = untrack(() => showOnly(slice.editor, element, props))
    shown.push(sizedTo(slice))
    return () => {
      for (const each of shown) each.dispose()
      SlicePool.give(slice)
    }
  })
  return <div class="CodeSlice" ref={(div) => (element = div)} />
}

/**
 * Show only `props`' lines in `editor`, as they move with the file, and keep `element` as tall as they are.
 * - Returns what undoes it, for the editor to show another slice later:  its listeners and marks.
 */
function showOnly(
  editor: monaco.editor.IStandaloneCodeEditor,
  element: HTMLElement,
  props: CodeSliceProps
): monaco.IDisposable[] {
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
  const undo: monaco.IDisposable[] = [{ dispose: () => lines.clear() }, editor.onDidChangeModelContent(hide)]
  if (!props.column) undo.push(showWithoutIndent(editor, element, () => lines.getRange(0)))
  if (props.column && props.column > 1) undo.push(...hideWordsBefore(editor, props.from, props.column))
  if (props.endColumn) undo.push(...hideWordsAfter(editor, props.to, props.endColumn))
  undo.push(editor.onDidContentSizeChange(({ contentHeight }) => (element.style.height = `${contentHeight}px`)))
  element.style.height = `${editor.getContentHeight()}px`
  if (props.focus) {
    const end = lines.getRange(0)!
    editor.setPosition({ lineNumber: end.endLineNumber, column: model.getLineMaxColumn(end.endLineNumber) })
    editor.focus()
  }
  return undo
}

/****************
 * ### `SlicePool`
 * The code editors `<CodeSlice>`s have shown, kept while none shows them, for the next slice of the same file.
 * - Why:  a new editor measures EVERY line of its file as it's made (the slice's careful wrapping, I33),
 *   and the Inspector's card makes its slices again for each new selection.
 *   A kept one has measured them already:  only its hidden lines change.
 * - Kept by model, a few each (`KEPT_PER_FILE`);  disposed of with their model.
 * - A kept editor still follows its file's edits, as a showing one does.
 ****************/
class SlicePool {
  /**
   * An editor for the slice `lines` of `model` in `element`:  a kept one when there is one, else a new one.
   * - A kept one that showed the same `lines` first:  it's laid out for them already, so nothing wraps again.
   * - SIDE EFFECT:  puts its own box in `element`;  for the same lines, at the width it had (`indent`).
   */
  static take(model: monaco.editor.ITextModel, element: HTMLElement, lines: string): KeptSlice {
    const root = element.getRootNode()
    const kept = SlicePool.kept.get(model) ?? []
    const here = kept.filter((slice) => slice.root === root)
    const slice = here.find((each) => each.lines === lines) ?? here[0]
    if (slice) {
      kept.splice(kept.indexOf(slice), 1)
      if (slice.lines === lines) element.style.setProperty(INDENT_VARIABLE, slice.indent)
      slice.lines = lines
      element.append(slice.box)
      return slice
    }
    const box = document.createElement("div")
    box.className = "MonacoEditor"
    element.append(box)
    SpellMonaco.register()
    const editor = monaco.editor.create(box, { ...SpellMonaco.OPTIONS, ...SLICE_OPTIONS, model })
    SpellBubbly.leaveOut(editor)
    editor.onDidDispose(keepMouseMovesInShadowRoot(editor))
    if (!SlicePool.kept.has(model)) {
      SlicePool.kept.set(model, [])
      model.onWillDispose(() => {
        for (const each of SlicePool.kept.get(model) ?? []) each.editor.dispose()
        SlicePool.kept.delete(model)
      })
    }
    return { editor, box, root, lines, indent: "" }
  }

  /** Keep `slice`, no longer shown, for the next slice of its file;  past `KEPT_PER_FILE`, dispose of it. */
  static give(slice: KeptSlice): void {
    slice.indent = slice.box.parentElement?.style.getPropertyValue(INDENT_VARIABLE) ?? ""
    slice.box.remove()
    const model = slice.editor.getModel()
    const kept = model && SlicePool.kept.get(model)
    if (!kept || kept.length >= KEPT_PER_FILE) return slice.editor.dispose()
    kept.push(slice)
  }

  /** The editors kept, by the model they show. */
  private static kept = new Map<monaco.editor.ITextModel, KeptSlice[]>()
}

/**
 * Lay `slice`'s editor out to its box's size as it changes, while it's in the page;  returns what stops it.
 * - In place of Monaco's own `automaticLayout`, which lays a kept editor out at no width at all once its box leaves
 *   the page:  wrapping every line of its file again, twice, measured.
 * - Monaco keeps the layout it has when the size is the same, so a kept editor of the same width wraps nothing again.
 * - Told the size by the browser once the page is laid out (a `ResizeObserver`), so it never makes the page lay out
 *   early, and draws on its own next frame.
 */
function sizedTo(slice: KeptSlice): monaco.IDisposable {
  const sizes = new ResizeObserver(([entry]) => {
    const { width, height } = entry!.contentRect
    // its size as the browser measured it, drawn on Monaco's own next frame:  nothing measured or drawn here
    if (slice.box.isConnected && width) slice.editor.layout({ width, height }, true)
  })
  sizes.observe(slice.box)
  return { dispose: () => sizes.disconnect() }
}

/** A slice's code editor, in its own box:  it moves from slice to slice with it. */
type KeptSlice = {
  /** The code editor. */
  editor: monaco.editor.IStandaloneCodeEditor
  /** Its box, which a slice holds while it shows it. */
  box: HTMLDivElement
  /** The document or shadow root it was made in:  only a slice there takes it (`keepMouseMovesInShadowRoot()`). */
  root: Node
  /** The lines it shows, or showed last:  `from:to:column:endColumn`. */
  lines: string
  /** Its lines' indent when it was last shown (`showWithoutIndent()`), the width it was laid out at with them. */
  indent: string
}

/** The CSS variable holding a slice's indent, past its left edge (`showWithoutIndent()`). */
const INDENT_VARIABLE = "--CodeSlice-indent"

/** How many editors are kept for each file:  about as many slices as a card shows of it. */
const KEPT_PER_FILE = 8

/**
 * Hide the words before `column` on line `line`, e.g. `- clickable when `, and keep the cursor after them.
 * - HACK:  Monaco hides only whole lines, so the words are a decoration drawn with `display: none`;
 *   its measuring then gives them no width, and a cursor moved into them is moved back out.
 */
function hideWordsBefore(
  editor: monaco.editor.IStandaloneCodeEditor,
  line: number,
  column: number
): monaco.IDisposable[] {
  const words = editor.createDecorationsCollection([
    {
      range: new monaco.Range(line, 1, line, column),
      options: {
        inlineClassName: "CodeSliceHidden",
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
      }
    }
  ])
  const keepOut = editor.onDidChangeCursorPosition(({ position }) => {
    const hidden = words.getRange(0)
    if (!hidden || position.lineNumber !== hidden.startLineNumber || position.column >= hidden.endColumn) return
    editor.setPosition({ lineNumber: hidden.startLineNumber, column: hidden.endColumn })
  })
  return [keepOut, { dispose: () => words.clear() }]
}

/**
 * Show `editor`'s lines as if dedented:  the editor is made wider by their common indent and moved left by it, so the
 * indent sits past `element`'s left edge, still the file's own text.
 * - Measured as drawn, and again as the lines change;  returns what stops it.
 */
function showWithoutIndent(
  editor: monaco.editor.IStandaloneCodeEditor,
  element: HTMLElement,
  shown: () => monaco.Range | null
): monaco.IDisposable {
  const model = editor.getModel()!
  const measure = () => {
    const range = shown()
    if (!range) return
    let common = Infinity
    let widest = range.startLineNumber
    for (let line = range.startLineNumber; line <= range.endLineNumber; line++) {
      const text = model.getLineContent(line)
      if (!text.trim()) continue
      const indent = text.length - text.trimStart().length
      if (indent < common) [common, widest] = [indent, line]
    }
    const px = common > 0 && common !== Infinity ? editor.getOffsetForColumn(widest, common + 1) : 0
    element.style.setProperty(INDENT_VARIABLE, `${Math.max(0, px)}px`)
  }
  requestAnimationFrame(measure)
  return editor.onDidChangeModelContent(() => requestAnimationFrame(measure))
}

/** Hide the words from `column` to the end of line `line`, e.g. a tag's `</>`, and keep the cursor before them. */
function hideWordsAfter(
  editor: monaco.editor.IStandaloneCodeEditor,
  line: number,
  column: number
): monaco.IDisposable[] {
  const model = editor.getModel()!
  const words = editor.createDecorationsCollection([
    {
      range: new monaco.Range(line, column, line, model.getLineMaxColumn(line)),
      options: {
        inlineClassName: "CodeSliceHidden",
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
      }
    }
  ])
  const keepOut = editor.onDidChangeCursorPosition(({ position }) => {
    const hidden = words.getRange(0)
    if (!hidden || position.lineNumber !== hidden.startLineNumber || position.column <= hidden.startColumn) return
    editor.setPosition({ lineNumber: hidden.startLineNumber, column: hidden.startColumn })
  })
  return [keepOut, { dispose: () => words.clear() }]
}

/** Monaco's own way to hide lines:  its code editor has it, its typings don't say. */
type HiddenAreas = { setHiddenAreas(ranges: monaco.IRange[]): void }

/** How a slice looks:  no line numbers or margin, and no scrolling of its own;  it wraps. */
const SLICE_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  folding: false,
  glyphMargin: false,
  lineDecorationsWidth: 4,
  // laid out by its slice (`sizedTo()`), which moves it from page to pool and back
  automaticLayout: false,
  wordWrap: "on",
  // its words' real widths, measured:  the code's font isn't monospaced, so the simple way wrapped early (I33)
  wrappingStrategy: "advanced",
  // a wrapped line starts under its own first word
  wrappingIndent: "same",
  guides: { indentation: false },
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
  /** Where its code ends on line `to`, 1-based:  the words from there on are hidden. */
  endColumn?: number
  /** Put the cursor in it once made. */
  focus?: boolean
}
