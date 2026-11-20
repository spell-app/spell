import { EditorSelection, EditorState, type Extension, type SelectionRange, type Text } from "@codemirror/state"
import { EditorView, layer, RectangleMarker } from "@codemirror/view"

/** The class of the layer drawn in place of CodeMirror's own:  the sheet hides that one. */
const SELECTION_LAYER = "cmb-selection-layer"

/** The class of each piece of the selection:  CodeMirror's own, so its rules reach them. */
const PIECE = "cm-selectionBackground"

/****************
 * ### `CodeMirrorSelection`
 * The selection in the bubbly look, on the bands and pills:  each line's part of it as tall as a band, in the middle
 * of its line, as the bands are (epic `language` I124:  Owen, "move codemirrors selection bar down so it's centered
 * in the pill").
 * - CodeMirror's own is drawn from the letters, which sit at a band's top:  it stood high, and short of the band's
 *   bottom;  a whole line's reached lower again, from the tabs before the words, which aren't lifted with them.
 * - Drawn in place of CodeMirror's own (`cm-selectionLayer`, still made by `drawSelection()`, hidden by the sheet):
 *   the same pieces, in the same class, each moved onto the bands of the lines it's on;  a piece over several lines
 *   still meets the ones above and below it.
 * - Its colour, see-through black, is the sheet's (`bubbly.css`).
 * - One ending at a blank line's end reaches the caret there, drawn where the line's words will go
 *   (`reachingCaret()`;  epic `language` I157).
 * - And the caret at a line's first word always drawn AT that word (`wordsSide`;  epic `language` I141).
 * - And a click on something drawn as one step for the caret, a comment's `--` drawn as one dash,
 *   puts the caret at its nearer end, as seen (`atomicPresses`;  epic `codemirror` I25).
 * - Its position in the import graph:  CodeMirror alone;  the bubbly look's extensions add it
 *   (`CodeMirrorBubbly`, `CodeMirrorMarkup`).
 ****************/
export class CodeMirrorSelection {
  /**
   * The caret right before a line's first word sticks to that word (`assoc` 1), however it got there.
   * - In the bubbly look the room before a line's words is the padding of the mark round them (a band's), or of
   *   the mark round its indent (a plain body line's):  between the indent's end and the first letter.
   * - CodeMirror draws a caret at a mark's edge on the side it came from:  stepping Left onto it, on the word;
   *   stepping Right (or down from the line above), at the indent's end, a band's room further left, outside its
   *   band (Owen, epic `language` I141:  "Inconsistent").
   * - So that one place is drawn one way, at the word:  Left and Right step indent end <=> the line's column 0.
   * - The same for a word after a space inside a line, a pill's first (Owen, I141:  "Seeing the same thing in pills
   *   before unquoted white pill"):  `when |creating solitaire` at `creating`, not back at `when`'s end;
   *   never before a `"`, whose curly mark places its caret itself (`QuoteWidget`)
   */
  static wordsSide: Extension = EditorState.transactionFilter.of((transaction) => {
    const { selection } = transaction
    if (!selection) return transaction
    const doc = transaction.newDoc
    if (selection.ranges.every((range) => !isBeforeWords(doc, range))) return transaction
    const ranges = selection.ranges.map((range) =>
      isBeforeWords(doc, range)
        ? EditorSelection.cursor(range.head, 1, range.bidiLevel ?? undefined, range.goalColumn)
        : range
    )
    return [transaction, { selection: EditorSelection.create(ranges, selection.mainIndex), sequential: true }]
  })

  /**
   * A click inside an atomic range (`EditorView.atomicRanges`) on one line puts the caret at its nearer end,
   * by where the pointer is on screen;  a drag from it selects from there.
   * - e.g. a comment's `--`, drawn as ONE dash (`BubblyHtml.DASH`):  a click on its left half, before it;
   *   on its right half, after it (epic `codemirror` I25).
   * - CodeMirror's own moves a place inside an atomic range to its nearer end by CHARACTERS,
   *   and a tie to its end:  the place between the two `-`, which a click on the dash's left half finds too,
   *   went after the dash.
   * - Left to CodeMirror:  two clicks or more, ⇧, ⌘, and every press not inside an atomic range.
   */
  static atomicPresses: Extension = EditorView.mouseSelectionStyle.of((view, event) => {
    if (event.button !== 0 || event.detail > 1 || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) {
      return null
    }
    const pressed = nearerEndOfAtom(view, event.clientX, event.clientY)
    if (pressed === undefined) return null
    let anchor = pressed
    return {
      get(current) {
        const head =
          nearerEndOfAtom(view, current.clientX, current.clientY) ??
          view.posAtCoords({ x: current.clientX, y: current.clientY }, false)
        return EditorSelection.single(anchor, head)
      },
      update(update) {
        if (update.docChanged) anchor = update.changes.mapPos(anchor)
      }
    }
  })

  /** The bubbly look's selection layer, over the text, as CodeMirror's own is in the look;  `wordsSide`, `atomicPresses`. */
  static extension: Extension = [
    layer({
      above: false,
      class: SELECTION_LAYER,
      markers: (view) => CodeMirrorSelection.markersIn(view),
      update: (update) => update.docChanged || update.selectionSet || update.viewportChanged || update.geometryChanged
    }),
    CodeMirrorSelection.wordsSide,
    CodeMirrorSelection.atomicPresses
  ]

  /**
   * The selection's pieces in `view`:  CodeMirror's, each moved onto its lines' bands.
   * - One ending at a blank line's end reaches the caret there (`reachingCaret()`).
   * - SIDE EFFECT:  reads the layout;  CodeMirror calls it when that's fine.
   */
  static markersIn(view: EditorView): RectangleMarker[] {
    const ranges = view.state.selection.ranges.filter((range) => !range.empty)
    // a caret alone, as while typing:  nothing to draw, and no probe laying the pane out again (epic `codemirror` I21)
    if (!ranges.length) return []
    const bands = new LineBands(view)
    return ranges
      .flatMap((range) => reachingCaret(view, range, RectangleMarker.forRange(view, PIECE, range)))
      .map((piece) => bands.onBands(piece))
  }
}

/**
 * `pieces`, the selection of `range`, its last reaching the caret when `range` ends at a blank line's end.
 * - The caret there is drawn past the room after the line's tabs, where its words will go
 *   (`CodeMirrorBubbly`'s `WordsPlace`;  epic `language` I157).
 * - CodeMirror ends the selection at the tabs, as they're all it holds:  it stopped a tab short of the caret.
 */
function reachingCaret(
  view: EditorView,
  range: SelectionRange,
  pieces: readonly RectangleMarker[]
): readonly RectangleMarker[] {
  const last = pieces.at(-1)
  const line = view.state.doc.lineAt(range.to)
  // no width:  it reaches the editor's right edge already
  if (!last || last.width === null || range.to !== line.to || line.text.trim()) return pieces
  const caret = view.coordsAtPos(range.to, -1)
  if (!caret) return pieces
  // where CodeMirror's pieces are measured from, across:  the scroller's left, scrolled (its `getBase()`)
  const base = view.scrollDOM.getBoundingClientRect().left - view.scrollDOM.scrollLeft * view.scaleX
  const right = caret.left - base
  if (right <= last.left + last.width) return pieces
  return [...pieces.slice(0, -1), new RectangleMarker(PIECE, last.left, last.top, right - last.left, last.height)]
}

/**
 * Where each line's band is, in one view, for the selection's pieces:  in the middle of its line, as tall as a band
 * (`--bubbly-pill-height`), or the whole line when that's shorter.
 */
class LineBands {
  constructor(private readonly view: EditorView) {
    const scroller = view.scrollDOM.getBoundingClientRect()
    // where CodeMirror's pieces are measured from:  the scroller's top, scrolled (its `getBase()`)
    this.base = scroller.top - view.scrollDOM.scrollTop * view.scaleY
    this.bandHeight = pixelsOf(view.scrollDOM, "var(--bubbly-pill-height)")
  }

  /** The top of the pieces' frame, on the page. */
  private readonly base: number
  /** A band's height, in px;  0 when the sheet has none (nothing moved). */
  private readonly bandHeight: number

  /**
   * `piece` moved onto the bands of the lines it's on.
   * - On one line:  that line's band.
   * - Over several:  from the band's bottom of the line it starts in to the band's top of the line it ends in,
   *   so it meets the pieces above and below it.
   */
  onBands(piece: RectangleMarker): RectangleMarker {
    if (!this.bandHeight) return piece
    const top = piece.top + this.base
    const bottom = top + piece.height
    const first = this.bandAt(top + 0.5)
    const last = this.bandAt(bottom - 0.5)
    if (!first || !last) return piece
    const [from, to] = first.top === last.top ? [first.top, first.bottom] : [first.bottom, last.top]
    return new RectangleMarker(PIECE, piece.left, from - this.base, piece.width, to - from)
  }

  /** The band of the line at `y` on the page. */
  private bandAt(y: number): { top: number; bottom: number } | undefined {
    const { view } = this
    const block = view.lineBlockAtHeight(y - view.documentTop)
    const node = view.domAtPos(block.from).node
    const line = (node instanceof Element ? node : node.parentElement)?.closest(".cm-line")
    if (!line) return undefined
    const { top } = line.getBoundingClientRect()
    const lineHeight = parseFloat(getComputedStyle(line).lineHeight)
    if (!lineHeight) return undefined
    const room = Math.max(0, (lineHeight - this.bandHeight) / 2)
    return { top: top + room, bottom: top + Math.min(lineHeight, room + this.bandHeight) }
  }
}

/** Is `range` a caret right before a word (its line's first, or one after a space), stuck to what's before it? */
function isBeforeWords(doc: Text, range: SelectionRange): boolean {
  if (!range.empty || range.assoc >= 0) return false
  const line = doc.lineAt(range.head)
  const words = line.text.search(/\S/)
  if (words < 0) return false
  if (range.head === line.from + words) return true
  // ... or a word after a space in the line:  a pill's first, `when |creating solitaire` (I141)
  const at = range.head - line.from
  return at > words && /[ \t]/.test(line.text[at - 1]!) && /[^\s"]/.test(line.text[at] ?? "")
}

/**
 * The end of the atomic range on one line `x`, `y` is inside, nearer it on screen;
 * `undefined` when it's inside none (`CodeMirrorSelection.atomicPresses`).
 */
function nearerEndOfAtom(view: EditorView, x: number, y: number): number | undefined {
  const pos = view.posAtCoords({ x, y })
  if (pos === null) return undefined
  let atom: { from: number; to: number } | undefined
  for (const ranges of view.state.facet(EditorView.atomicRanges)) {
    ranges(view).between(pos, pos, (from, to) => {
      if (from < pos && pos < to) atom = { from, to }
      return atom ? false : undefined
    })
    if (atom) break
  }
  if (!atom) return undefined
  const start = view.coordsAtPos(atom.from, 1)
  const end = view.coordsAtPos(atom.to, -1)
  // over lines (a row of feet's hidden line breaks):  CodeMirror's own
  if (!start || !end || start.top !== end.top) return undefined
  return Math.abs(x - start.left) <= Math.abs(end.left - x) ? atom.from : atom.to
}

/** A CSS length `length` (`var(--x)`, `calc(...)`) in px, as `element`'s styles make it. */
function pixelsOf(element: HTMLElement, length: string): number {
  const probe = document.createElement("div")
  probe.style.cssText = `position: absolute; visibility: hidden; width: 0; height: ${length}`
  element.append(probe)
  const pixels = probe.getBoundingClientRect().height
  probe.remove()
  return pixels
}
