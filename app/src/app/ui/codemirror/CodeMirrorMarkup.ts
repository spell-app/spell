import { type EditorState, type Extension, type Range } from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, WidgetType } from "@codemirror/view"

import { MarkupMarks, type MarkupShape, type MarkupWithin } from "spell/app/app/ui/MarkupMarks"
import type { MarkMaker, MarkedStretch, Spacer } from "spell/app/app/ui/TextMarks"
import { CodeMirrorRelayout } from "./CodeMirrorRelayout"

/****************
 * ### `CodeMirrorMarkup`
 * HTML drawn bubbly in a CodeMirror editor (epic `codemirror` P3), as the drawn-bubbly page draws it:
 * an HTML file (a property editor page, `Card.editor.html`), and a Spell file's drawing's tags.
 * - What's marked how is the editors' shared reading, `MarkupMarks`, from the page's own reading of markup
 *   (`BubblyMarkup`):  the same elements, pieces and classes as Monaco's.
 * - Only the last step is CodeMirror's (`draw()`):  each stretch a mark in its classes, each spacer a widget, and each
 *   SHAPE drawn on the text itself, not in a layer behind it:
 *   - a tag in a line:  its mark a small pill, its ends pointed (`cmb-tag-pill`)
 *   - a tag alone on its line, a block's start tag:  a band, its ends pointed (`cmb-tag-band`)
 *   - a block's body:  a rail on each line (`--cmb-rails`);  its end tag on its own line a tiny pill (`cmb-tag-foot`)
 *   - a one-line element with something between its tags:  a line along the top and bottom between them
 * - The editor's box is a `.bubbly .bubbly-html` (`EDITOR_CLASSES`), so the look's one sheet, `bubbly.css`, reaches it.
 * - Its position in the import graph:  CodeMirror, the shared marks;  never Monaco.
 * - NEVER throws:  a reading that fails leaves the text plain, and logs why.
 ****************/
export class CodeMirrorMarkup {
  /** The extension drawing an HTML file bubbly:  marks that follow the typing, laid out again once it pauses. */
  static extension(): Extension {
    return [
      CodeMirrorRelayout.extension((state) => CodeMirrorMarkup.decorationsOf(state), CodeMirrorMarkup.RELAYOUT_MSEC),
      EditorView.editorAttributes.of({ class: EDITOR_CLASSES })
    ]
  }

  /** How long the typing must pause before the file's laid out again, in msec:  as `CodeMirrorBubbly`'s. */
  static RELAYOUT_MSEC = 150

  /**
   * Every decoration of `state`'s text, an HTML file, drawn bubbly.
   * - NEVER throws:  `Decoration.none` when it fails.
   */
  static decorationsOf(state: EditorState): DecorationSet {
    try {
      const marks = MarkupMarks.of(state.doc.toString(), CodeMirrorMarkup.make)
      const decorations = new CodeMirrorDecorations(state)
      CodeMirrorMarkup.draw(marks, decorations)
      return decorations.build()
    } catch (error) {
      console.error("CodeMirrorMarkup:  couldn't lay the file out", error)
      return Decoration.none
    }
  }

  /**
   * A Spell drawing's tags, from `from` to `to` in `state`'s text:  drawn into `decorations`, inside the blocks `rails`
   * holds;  returns where each tag is, so Spell's marks leave them alone.
   * - throws if the reading does
   */
  static within(
    decorations: CodeMirrorDecorations,
    { from, to, rails = [], ...within }: { from: number; to: number; rails?: Rail[] } & MarkupWithin
  ): Array<{ start: number; end: number }> {
    const marks = MarkupMarks.within(decorations.text, from, to, CodeMirrorMarkup.make, [], within)
    CodeMirrorMarkup.draw(marks, decorations, rails)
    return marks.tags
  }

  /** CodeMirror's mark of a stretch:  the stretch itself, drawn by `draw()`. */
  static make: MarkMaker<MarkedStretch> = (stretch) => stretch

  /** `marks`' stretches and shapes into `decorations`, inside the blocks `rails` holds. */
  static draw(marks: MarkupMarks<MarkedStretch>, decorations: CodeMirrorDecorations, rails: Rail[] = []): void {
    for (const stretch of marks.marks) {
      const { start, end, classes, before, after } = stretch
      if (classes) decorations.mark(start, end, classes.split(" "))
      if (before) decorations.spacer(start, before, "before")
      if (after) decorations.spacer(end, after, "after")
    }
    new MarkupShapes(marks.marks, decorations).draw(marks.shapes, rails)
  }
}

/** An HTML file's editor's classes:  a `.bubbly` and a `.bubbly-html`, so `bubbly.css` reaches it, and ours. */
const EDITOR_CLASSES = "bubbly bubbly-html cmb-editor"

/** One markup drawing's shapes being drawn on its text. */
class MarkupShapes {
  constructor(
    private readonly marks: MarkedStretch[],
    private readonly decorations: CodeMirrorDecorations
  ) {}

  /** `shapes`, inside the blocks `rails` holds. */
  draw(shapes: MarkupShape[], rails: Rail[]) {
    for (const shape of shapes) {
      switch (shape.kind) {
        case "tag": {
          const kind = shape.isAlone ? "cmb-tag-band" : "cmb-tag-pill"
          const classes = [kind, ...hueOf(shape.partOfSpeech), `cmb-tag-${shape.side}`]
          if (shape.declares) classes.push("cmb-tag-round")
          this.on(shape.place, classes)
          break
        }
        case "tag-link": {
          const start = this.marks[shape.start.place]
          const end = this.marks[shape.end.place]
          if (start && end) this.decorations.mark(start.end, end.start, ["cmb-tag-link", ...hueOf(shape.partOfSpeech)])
          break
        }
        case "markup-block":
          this.block(shape, rails)
          break
        case "input":
          break
      }
    }
  }

  /** An element with what's inside it on lines of its own:  its band, its body's rail, its end tag's tiny pill. */
  private block(block: Extract<MarkupShape, { kind: "markup-block" }>, rails: Rail[]) {
    const head = this.marks[block.head]
    const whole = this.marks[block.place]
    if (!head || !whole) return
    const hue = hueOf(block.partOfSpeech)
    this.on(block.head, ["cmb-tag-band", "cmb-band-open", "cmb-tag-start", ...hue])
    const inside = [...rails, { ...this.decorations.indentAt(head.start), partOfSpeech: block.partOfSpeech }]
    // the rail:  every line under its start tag, to its end tag's
    const { doc } = this.decorations.state
    const first = doc.lineAt(head.end).number + 1
    const last = doc.lineAt(whole.end).number
    for (let number = first; number <= last; number++) this.decorations.line(doc.line(number).from, inside, hue)
    const foot = block.foot === undefined ? undefined : this.marks[block.foot]
    if (foot) this.on(block.foot!, ["cmb-tag-foot", ...hue])
    this.draw(block.inside, inside)
  }

  /** Classes `classes` on the mark at `place`. */
  private on(place: number, classes: string[]) {
    const stretch = this.marks[place]
    if (stretch) this.decorations.mark(stretch.start, stretch.end, classes)
  }
}

/** A part of speech's colour on a mark:  `bubbly.css`'s hue, and the band's own shades of it (`cmb-hue`). */
function hueOf(partOfSpeech: string): string[] {
  return ["cmb-hue", `bubbly-${partOfSpeech}`]
}

/****************
 * ### `CodeMirrorDecorations`
 * One drawing's decorations being made, for the look's two kinds of text:  Spell (`CodeMirrorBubbly`) and HTML
 * (`CodeMirrorMarkup`), a Spell file's drawing's tags among its Spell.
 * - ONE mark per stretch, its classes together:  CodeMirror nests two marks over the same stretch in no set order,
 *   so `bubbly-quoted` round `bubbly-input` came out either way round;  a longer mark always holds a shorter one.
 * - ONE decoration per line, its classes together, the rails of every block round it.
 ****************/
export class CodeMirrorDecorations {
  /** The decorations that are neither marks nor lines:  feet, spacers. */
  private readonly ranges: Array<Range<Decoration>> = []
  /** Each mark's classes and attributes, by its stretch (`start:end`). */
  private readonly marks = new Map<string, { classes: Set<string>; attributes: Record<string, string> }>()
  /** Each line's classes and rails, by where it starts. */
  private readonly lines = new Map<number, { classes: Set<string>; rails: Rail[] }>()

  constructor(readonly state: EditorState) {
    this.text = state.doc.toString()
  }

  /** The text being drawn. */
  readonly text: string

  /** Mark `start`-`end` with `classes`, and `attributes`, along with any the same stretch has. */
  mark(start: number, end: number, classes: string[], attributes: Record<string, string> = {}): void {
    if (end <= start || (!classes.length && !Object.keys(attributes).length)) return
    const key = `${start}:${end}`
    const marked = this.marks.get(key) ?? { classes: new Set(), attributes: {} }
    for (const each of classes) marked.classes.add(each)
    Object.assign(marked.attributes, attributes)
    this.marks.set(key, marked)
  }

  /** The line `at` is on:  inside the blocks `rails` holds, outermost first, and in `classes`. */
  line(at: number, rails: Rail[], classes: string[] = []): void {
    const from = this.state.doc.lineAt(at).from
    const line = this.lines.get(from) ?? { classes: new Set(), rails: [] }
    for (const each of classes) line.classes.add(each)
    // the most a line's in:  a drawing's tags inside a Spell block hold its rails, and their own
    if (rails.length >= line.rails.length) line.rails = rails
    this.lines.set(from, line)
  }

  /** Room `spacer` injected at `at`, before or after the text there. */
  spacer(at: number, spacer: Spacer, side: "before" | "after"): void {
    const widget = Decoration.widget({
      widget: new SpacerWidget(spacer.inlineClassName),
      side: side === "before" ? -1 : 1
    })
    this.ranges.push(widget.range(at))
  }

  /** Any other decoration, e.g. a foot. */
  add(range: Range<Decoration>): void {
    this.ranges.push(range)
  }

  /** How far in the line `at` is on is `at`:  its tabs and spaces, which a rail starts at. */
  indentAt(at: number): Indent {
    const line = this.state.doc.lineAt(at)
    const indent = this.text.slice(line.from, at)
    return { tabs: indent.split("\t").length - 1, spaces: indent.replaceAll("\t", "").length }
  }

  /** The decorations, sorted as CodeMirror wants them. */
  build(): DecorationSet {
    const ranges = [...this.ranges]
    for (const [range, { classes, attributes }] of this.marks) {
      const [start, end] = range.split(":").map(Number) as [number, number]
      ranges.push(Decoration.mark({ class: [...classes].join(" "), attributes }).range(start, end))
    }
    for (const [from, { classes, rails }] of this.lines) {
      const innermost = rails.at(-1)
      const lineClasses = [...classes, ...(innermost ? hueOf(innermost.partOfSpeech) : [])]
      const attributes: Record<string, string> = rails.length ? { style: `--cmb-rails: ${railsOf(rails)}` } : {}
      ranges.push(Decoration.line({ class: lineClasses.join(" "), attributes }).range(from))
    }
    return Decoration.set(ranges, true)
  }
}

/** How far in a line's words start:  its tabs, then its spaces. */
export type Indent = { tabs: number; spaces: number }

/** One enclosing block, as a body line draws its rail:  where its band starts, and its colour. */
export type Rail = Indent & { partOfSpeech: string }

/**
 * `rails` as a CSS background:  one stripe per enclosing block, at its band's left edge, in its band's colour.
 * - `bubbly.css` sizes a tab stop (`--cmb-indent`), a space (`--cmb-space`) and a rail (`--cmb-rail`):
 *   only the columns are written here.
 */
export function railsOf(rails: Rail[]): string {
  return rails
    .map(({ tabs, spaces, partOfSpeech }) => {
      const x = `calc(var(--cmb-line-pad) + ${tabs} * var(--cmb-indent) + ${spaces} * var(--cmb-space) - var(--cmb-band-inset))`
      const colour = `var(--cmb-band-${partOfSpeech})`
      return `linear-gradient(to right, transparent ${x}, ${colour} ${x}, ${colour} calc(${x} + var(--cmb-rail)), transparent calc(${x} + var(--cmb-rail)))`
    })
    .join(", ")
}

/** Room beside a mark, as Monaco's injected text is:  an empty inline box, its width the sheet's. */
class SpacerWidget extends WidgetType {
  constructor(readonly classes: string) {
    super()
  }

  eq(other: SpacerWidget): boolean {
    return other.classes === this.classes
  }

  toDOM(): HTMLElement {
    const room = document.createElement("span")
    room.className = this.classes
    return room
  }

  ignoreEvent(): boolean {
    return false
  }
}
