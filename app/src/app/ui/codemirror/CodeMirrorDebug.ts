import { type Extension, RangeSet, StateEffect, StateField, type EditorState } from "@codemirror/state"
import {
  Decoration,
  type DecorationSet,
  EditorView,
  GutterMarker,
  ViewPlugin,
  type ViewUpdate,
  gutter
} from "@codemirror/view"

import "./CodeMirrorDebug.css"

/****************
 * ### `CodeMirrorDebug`
 * The step debugger in a Spell file's editor (epic `editor` P33):  breakpoints in the code's left margin, and the line
 * the running program is stopped on, lit.
 * - A click in the margin, left of a line, puts a breakpoint there, a red dot;  a click on the dot takes it away.
 *   - The dots move with the text as it's edited, and are kept with each file's state (`FileStates`).
 *   - Each change to a file's dots, a click or an edit that moved them, is told to whoever listens
 *     (`onBreakpoints()`):  the app's debugger, which stops the program there.
 * - The stopped line (`showStopped()`):  a band across it, and an arrow in the margin, in whichever file shows it.
 * - Its position in the import graph:  CodeMirror alone.  It never knows the app or the program:  the app tells it
 *   where it's stopped, and hears where the breakpoints are.
 ****************/
export class CodeMirrorDebug {
  /**
   * The margin and the stopped line, in the state of the file at `path` (its `file.path`).
   * - `lines`:  its breakpoints to start with, lines from 0, e.g. those set before its state was made.
   */
  static extension(path: string, lines: readonly number[] = []): Extension {
    return [
      filePath.init(() => path),
      breakpoints.init((state) =>
        RangeSet.of(
          startsOf(state, lines).map((from) => BREAKPOINT.range(from)),
          true
        )
      ),
      breakpointGutter,
      stoppedLine,
      reportsMoves
    ]
  }

  /**
   * Hear each change to a file's breakpoints:  its path, and every line it has one on, from 0.
   * - Returns what stops it.
   */
  static onBreakpoints(listener: BreakpointListener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  /** The file and line the program's stopped on, from 0:  each view showing that file lights it.  None:  nowhere. */
  static get stopped(): StoppedAt | undefined {
    return stoppedAt
  }

  /**
   * Light `at`, the line the program's stopped on, in every view showing its file;  none:  take the light away.
   * - `views`:  the views to draw again now, e.g. the code pane's;  any other shows it as it's next drawn.
   * - One showing its file scrolls it to the middle when it's out of view;  the caret and the focus stay as they were.
   */
  static showStopped(at: StoppedAt | undefined, views: readonly EditorView[]): void {
    stoppedAt = at
    for (const view of views) {
      const from = stoppedFrom(view.state)
      const effects: StateEffect<unknown>[] = [stoppedChanged.of(null)]
      if (from !== undefined && !isInView(view, from)) effects.push(EditorView.scrollIntoView(from, { y: "center" }))
      view.dispatch({ effects })
    }
  }

  /** The lines with a breakpoint in `state`, from 0. */
  static breakpointsIn(state: EditorState): number[] {
    const lines: number[] = []
    const marks = state.field(breakpoints, false)
    marks?.between(0, state.doc.length, (from) => {
      lines.push(state.doc.lineAt(from).number - 1)
    })
    return lines
  }

  /** Put or take away the breakpoint on `line`, from 0, of the file `view` shows. */
  static toggle(view: EditorView, line: number): void {
    const { doc } = view.state
    if (line < 0 || line >= doc.lines) return
    view.dispatch({ effects: toggleBreakpoint.of(doc.line(line + 1).from) })
    tell(view.state)
  }

  /** Take every breakpoint away from the file `view` shows. */
  static clearAll(view: EditorView): void {
    view.dispatch({ effects: setBreakpoints.of([]) })
    tell(view.state)
  }
}

/** Hears a file's breakpoints:  its path and its lines, from 0. */
export type BreakpointListener = (path: string, lines: number[]) => void

/** Where the program's stopped:  a file, by its path, and a line, from 0. */
export type StoppedAt = { path: string; line: number }

/** Who hears each change of breakpoints. */
const listeners = new Set<BreakpointListener>()

/** Where the program's stopped now:  `showStopped()`. */
let stoppedAt: StoppedAt | undefined

/** Tell each listener `state`'s file's breakpoints.  NEVER throws:  a listener's failure is logged. */
function tell(state: EditorState): void {
  const path = state.field(filePath, false)
  if (path === undefined) return
  const lines = CodeMirrorDebug.breakpointsIn(state)
  for (const listener of [...listeners]) {
    try {
      listener(path, lines)
    } catch (error) {
      console.error(error)
    }
  }
}

/** Where each of `lines`, from 0, starts in `state`:  those past its end left out. */
function startsOf(state: EditorState, lines: readonly number[]): number[] {
  const { doc } = state
  return [...new Set(lines)]
    .filter((line) => line >= 0 && line < doc.lines)
    .sort((a, b) => a - b)
    .map((line) => doc.line(line + 1).from)
}

////////////////
// ## Breakpoints
////////////////

/** The path of the file a state is of. */
const filePath = StateField.define<string>({
  create: () => "",
  update: (path) => path
})

/** Put a breakpoint on the line starting at the position, or take its one away. */
const toggleBreakpoint = StateEffect.define<number>()
/** Every breakpoint, by where each line starts. */
const setBreakpoints = StateEffect.define<number[]>()

/** A breakpoint's dot, in the margin. */
class BreakpointMarker extends GutterMarker {
  override toDOM(): Node {
    const dot = document.createElement("span")
    dot.className = "cm-breakpoint"
    return dot
  }
}
const BREAKPOINT = new BreakpointMarker()

/** The margin's width, set by an empty marker:  no dot. */
class SpacerMarker extends GutterMarker {
  override toDOM(): Node {
    const room = document.createElement("span")
    room.className = "cm-breakpointRoom"
    return room
  }
}

/** The stopped line's arrow, in the margin, over its breakpoint if it has one. */
class StoppedMarker extends GutterMarker {
  override elementClass = "cm-debugStoppedGutter"
  override toDOM(): Node {
    const arrow = document.createElement("span")
    arrow.className = "cm-debugStoppedArrow"
    return arrow
  }
}
const STOPPED = new StoppedMarker()

/** The breakpoints, moved with each edit. */
const breakpoints = StateField.define<RangeSet<GutterMarker>>({
  create: () => RangeSet.empty,
  update: (marks, transaction) => {
    let next = transaction.docChanged ? marks.map(transaction.changes) : marks
    for (const effect of transaction.effects) {
      if (effect.is(setBreakpoints))
        next = RangeSet.of(
          effect.value.map((from) => BREAKPOINT.range(from)),
          true
        )
      if (effect.is(toggleBreakpoint)) {
        let isSet = false
        next.between(effect.value, effect.value, () => {
          isSet = true
        })
        next = isSet
          ? next.update({ filter: (from) => from !== effect.value })
          : next.update({ add: [BREAKPOINT.range(effect.value)] })
      }
    }
    return next
  }
})

/** The margin:  each line's dot, a click putting one or taking it away;  the stopped line's arrow. */
const breakpointGutter = gutter({
  class: "cm-breakpointGutter",
  markers: (view) => {
    const marks = view.state.field(breakpoints)
    const stopped = stoppedFrom(view.state)
    return stopped === undefined ? marks : marks.update({ add: [STOPPED.range(stopped)] })
  },
  initialSpacer: () => new SpacerMarker(),
  domEventHandlers: {
    mousedown: (view, line) => {
      CodeMirrorDebug.toggle(view, view.state.doc.lineAt(line.from).number - 1)
      return true
    }
  }
})

/** An edit that moved the breakpoints:  told, as a click is. */
const reportsMoves = EditorView.updateListener.of((update: ViewUpdate) => {
  if (!update.docChanged) return
  const before = update.startState.field(breakpoints, false)
  if (before?.size) tell(update.state)
})

////////////////
// ## The stopped line
////////////////

/** Where the program's stopped changed:  draw it again. */
const stoppedChanged = StateEffect.define<null>()

/** Is the line at `pos` among what `view` draws now, and inside its scrolled-to part? */
function isInView(view: EditorView, pos: number): boolean {
  if (!view.visibleRanges.some(({ from, to }) => pos >= from && pos <= to)) return false
  const block = view.lineBlockAt(pos)
  const top = view.documentTop + block.top
  const shown = view.scrollDOM.getBoundingClientRect()
  return top >= shown.top && top + block.height <= shown.top + view.scrollDOM.clientHeight
}

/** Where the stopped line starts in `state`, when its file is `stoppedAt`'s. */
function stoppedFrom(state: EditorState): number | undefined {
  const at = stoppedAt
  if (!at || state.field(filePath, false) !== at.path) return undefined
  const { doc } = state
  return at.line >= 0 && at.line < doc.lines ? doc.line(at.line + 1).from : undefined
}

/** The band across the stopped line. */
const STOPPED_LINE = Decoration.line({ class: "cm-debugStopped" })

/** Lights the stopped line, in whichever view shows its file. */
const stoppedLine = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = this.build(view)
    }
    update(update: ViewUpdate) {
      const changed = update.transactions.some((it) => it.effects.some((effect) => effect.is(stoppedChanged)))
      if (changed || update.docChanged || update.startState !== update.state) this.decorations = this.build(update.view)
    }
    build(view: EditorView): DecorationSet {
      const from = stoppedFrom(view.state)
      return from === undefined ? Decoration.none : Decoration.set([STOPPED_LINE.range(from)])
    }
  },
  { decorations: (plugin) => plugin.decorations }
)
