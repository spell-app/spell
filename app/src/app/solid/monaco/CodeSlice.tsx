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
 * - Drawn bubbly as the code pane is, while the page's setting says so (`SpellBubbly.showSlice()`, epic `editor` T72):
 *   only what's wholly in its lines, so the action whose body it shows draws no band or rail cut off at its edges.
 * - HACK:  hides the other lines with Monaco's `setHiddenAreas()`, which its folding uses, but its typings leave out.
 * - Its code editor is kept once it goes, for the next slice of the same file (`SlicePool`):
 *   making one measures every line of the file, ~60ms each time the Inspector's card was drawn again (epic `editor` I69).
 * - Its file, lines and columns are read once, as it's drawn:  a slice of other lines is a new `<CodeSlice>`.
 * - Made again while it's typed in, it keeps the cursor where it was (`keepCursor()`, epic `editor` I141).
 ****************/
export function CodeSlice(props: CodeSliceProps) {
  let element!: HTMLDivElement
  onSettled(() => {
    const lines = untrack(() => `${props.from}:${props.to}:${props.column ?? ""}:${props.endColumn ?? ""}`)
    const slice = SlicePool.take(SpellMonaco.models.modelFor(untrack(() => props.file)), element, lines)
    const shown = untrack(() => showOnly(slice.editor, element, props))
    shown.push(sizedTo(slice))
    untrack(() => takeCursorBack(slice.editor, props.from, props.to))
    return () => {
      if (slice.editor.hasTextFocus()) keepCursor(slice.editor)
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
  const before = props.column && props.column > 1 ? hideWordsBefore(editor, props.from, props.column) : undefined
  const after = props.endColumn ? hideWordsAfter(editor, props.to, props.endColumn) : undefined
  undo.push(...[before, after].filter((words) => !!words))
  // drawn bubbly:  what's between the words hidden at either end
  SpellBubbly.showSlice(editor, () => {
    const shown = lines.getRange(0)
    if (!shown) return null
    const start = before?.range()?.getEndPosition() ?? shown.getStartPosition()
    const end = after?.range()?.getStartPosition() ?? shown.getEndPosition()
    return monaco.Range.fromPositions(start, end)
  })
  undo.push({ dispose: () => SpellBubbly.showSlice(editor, undefined) })
  const fit = () => (element.style.height = `${heightOf(editor, lines.getRange(0))}px`)
  undo.push(editor.onDidContentSizeChange(fit), editor.onDidLayoutChange(fit))
  fit()
  if (props.focus) {
    const end = lines.getRange(0)!
    editor.setPosition({ lineNumber: end.endLineNumber, column: model.getLineMaxColumn(end.endLineNumber) })
    editor.focus()
  }
  return undo
}

////////////////
// ## The cursor, across a slice made again
////////////////

/**
 * The cursor of a slice that went while it was typed in, for the slice made in its place to take back
 * (epic `editor` I141).
 * - Why:  a Spell UI element's handler, `onClick={...}`, is a change to its drawing,
 *   so each compile draws the element again, the Inspector's card with it, and makes its slice again:
 *   the cursor would drop out of it after the first word.
 * - Forgotten once anything else takes the focus.
 */
let cursorLeft: { model: monaco.editor.ITextModel; position: monaco.Position } | undefined

/** Keep `editor`'s cursor, as its slice goes while it's typed in. */
function keepCursor(editor: monaco.editor.IStandaloneCodeEditor): void {
  const model = editor.getModel()
  const position = editor.getPosition()
  if (!model || !position) return
  const kept = (cursorLeft = { model, position })
  const forget = () => {
    if (cursorLeft === kept) cursorLeft = undefined
  }
  document.addEventListener("focusin", forget, { capture: true, once: true })
}

/**
 * Put the cursor kept (`keepCursor()`) back in `editor`, when it's in the same file, inside lines `from` to `to`.
 * - Only while nothing else has the focus:  it dropped to the page as the old slice went.
 */
function takeCursorBack(editor: monaco.editor.IStandaloneCodeEditor, from: number, to: number): void {
  const kept = cursorLeft
  if (!kept || kept.model !== editor.getModel()) return
  if (kept.position.lineNumber < from || kept.position.lineNumber > to) return
  const focused = document.activeElement
  if (focused && focused !== document.body) return
  cursorLeft = undefined
  editor.setPosition(kept.position)
  editor.focus()
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
function hideWordsBefore(editor: monaco.editor.IStandaloneCodeEditor, line: number, column: number): HiddenWords {
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
  return { range: () => words.getRange(0), dispose: () => (keepOut.dispose(), words.clear()) }
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
function hideWordsAfter(editor: monaco.editor.IStandaloneCodeEditor, line: number, column: number): HiddenWords {
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
  return { range: () => words.getRange(0), dispose: () => (keepOut.dispose(), words.clear()) }
}

/** Words hidden at a slice's start or end (`hideWordsBefore()`, `hideWordsAfter()`):  where they are now, and what shows them again. */
type HiddenWords = monaco.IDisposable & { range(): monaco.Range | null }

/**
 * How tall a slice is:  its lines, and the sideways scrollbar under them while one runs past its edge
 * (long lines don't wrap unless Wrap long lines is on, I110).
 */
function heightOf(editor: monaco.editor.ICodeEditor, shown: monaco.IRange | null): number {
  const { contentWidth, horizontalScrollbarHeight } = editor.getLayoutInfo()
  const model = editor.getModel()
  let isWide = false
  // its own lines' ends, as drawn:  the editor's scroll width counts the file's hidden lines too
  for (let line = shown?.startLineNumber ?? 1; model && shown && line <= shown.endLineNumber && !isWide; line++) {
    isWide = editor.getOffsetForColumn(line, model.getLineMaxColumn(line)) > contentWidth
  }
  return editor.getContentHeight() + (isWide ? horizontalScrollbarHeight : 0)
}

/** Monaco's own way to hide lines:  its code editor has it, its typings don't say. */
type HiddenAreas = { setHiddenAreas(ranges: monaco.IRange[]): void }

/**
 * How a slice looks:  no line numbers or margin, as tall as its lines.
 * - Its long lines wrap only while Wrap long lines is on (`CodeSettings`, epic `editor` I110);  off, the default,
 *   they scroll sideways, a thin scrollbar under them while one runs past the edge.
 * - No vertical scrolling:  the wheel scrolls the card, unless it's sideways over a line that runs past the edge.
 */
const SLICE_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  folding: false,
  glyphMargin: false,
  lineDecorationsWidth: 4,
  // laid out by its slice (`sizedTo()`), which moves it from page to pool and back
  automaticLayout: false,
  // while it wraps:  its words' real widths, measured;  the code's font isn't monospaced, so the simple way wrapped early (I33)
  wrappingStrategy: "advanced",
  // a wrapped line starts under its own first word
  wrappingIndent: "same",
  guides: { indentation: false },
  scrollbar: {
    vertical: "hidden",
    horizontal: "auto",
    horizontalScrollbarSize: 6,
    useShadows: false,
    alwaysConsumeMouseWheel: false
  },
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
