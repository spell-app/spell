import { foldedRanges } from "@codemirror/language"
import { type EditorState, type Extension, type Range } from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, type Rect, ViewPlugin, WidgetType } from "@codemirror/view"

import { MarkupMarks, type MarkupShape, type MarkupWithin } from "spell/app/app/ui/MarkupMarks"
import { type MarkMaker, type MarkedStretch, type Spacer, spacer } from "spell/app/app/ui/TextMarks"
import { CodeMirrorRelayout } from "./CodeMirrorRelayout"
import { CodeMirrorSelection } from "./CodeMirrorSelection"
import { CodeMirrorSetup } from "./CodeMirrorSetup"

/****************
 * ### `CodeMirrorMarkup`
 * HTML drawn bubbly in a CodeMirror editor (epic `codemirror` P3), as the drawn-bubbly page draws it:
 * an HTML file (a property editor page, `Card.editor.html`), and a Spell file's drawing's tags.
 * - What's marked how is the editors' shared reading, `MarkupMarks`, from the page's own reading of markup
 *   (`BubblyMarkup`):  the same elements, pieces and classes.
 * - Only the last step is CodeMirror's (`draw()`):  each stretch a mark in its classes, each spacer a widget, and each
 *   SHAPE drawn on the text itself, not in a layer behind it:
 *   - a tag in a line:  its mark a small pill, its ends pointed (`cmb-tag-pill`)
 *   - a tag alone on its line, a block's start tag:  a band, its ends pointed (`cmb-tag-band`)
 *   - a start tag over several lines, an attribute on each:  ONE block round them all, its `>` at its right edge
 *     (`cmb-tag-block`, `CodeMirrorMarkup.tagBlocks`)
 *   - a block's body:  a rail on each line (`--cmb-rails`);  its end tag on its own line a foot, its rail turning out
 *     at a tag's slant into a small pill pointed at both ends, end tags on lines one after another ONE row of feet
 *     (`cmb-tag-foot`, `cmb-feet-row`;  epic `language` I132)
 *   - a one-line element with something between its tags:  a line along the top and bottom between them
 * - The editor's box is a `.bubbly .bubbly-html` (`EDITOR_CLASSES`), so the look's one sheet, `bubbly.css`, reaches it.
 * - Its position in the import graph:  CodeMirror, the shared marks.
 * - NEVER throws:  a reading that fails leaves the text plain, and logs why.
 ****************/
export class CodeMirrorMarkup {
  /** The extension drawing an HTML file bubbly:  marks that follow the typing, laid out again once it pauses. */
  static extension(): Extension {
    return [
      CodeMirrorRelayout.extension((state) => CodeMirrorMarkup.decorationsOf(state), CodeMirrorMarkup.RELAYOUT_MSEC),
      EditorView.editorAttributes.of({ class: EDITOR_CLASSES }),
      CodeMirrorMarkup.tabStops,
      CodeMirrorMarkup.tagBlocks,
      CodeMirrorSelection.extension
    ]
  }

  /**
   * The editor's tab stop and space, as its font draws them, for the sheet:  `--cmb-indent`, `--cmb-space`.
   * - A tab is CodeMirror's 2 spaces (its own `tab-size`, `TAB_SIZE`):  the rails and feet, placed by these, stand
   *   at their bands' ends, at any level (measured:  a guessed 24px left them 7px off a level, epic `codemirror` P3).
   * - Measured once the editor's drawn, and again whenever its font may have changed (a new theme, a zoom).
   */
  static tabStops = ViewPlugin.define((view) => {
    const measure = () =>
      view.requestMeasure({
        read: () => [
          CodeMirrorSetup.widthIn(view.scrollDOM, " ".repeat(100)) / 100,
          CodeMirrorSetup.widthIn(view.scrollDOM, "\t", view.state.tabSize)
        ],
        write: ([space, tab]) => {
          if (!space || !tab) return
          view.dom.style.setProperty("--cmb-space", `${space}px`)
          view.dom.style.setProperty("--cmb-indent", `${tab}px`)
        }
      })
    measure()
    return {
      update: (update) => {
        if (update.geometryChanged) measure()
      }
    }
  })

  /**
   * Each tag laid out over lines drawn as ONE block (epic `language` I135):  every row from the block's left edge to
   * its right edge, the widest row's;  measured once they're drawn, and after every change (`measureTagBlocks()`).
   */
  static tagBlocks = ViewPlugin.define((view) => {
    /** the reaches written so far, by their names:  the ones no row reads any more are taken off */
    let written = new Map<string, string>()
    const measure = () =>
      view.requestMeasure({
        key: TAG_BLOCKS_KEY,
        read: () => measureTagBlocks(view),
        write: (rows) => {
          const reaches = tagRowReaches(rows)
          for (const name of written.keys()) if (!reaches.has(name)) view.dom.style.removeProperty(name)
          for (const [name, value] of reaches) if (written.get(name) !== value) view.dom.style.setProperty(name, value)
          written = reaches
        }
      })
    measure()
    return {
      update: (update) => {
        if (update.docChanged || update.viewportChanged || update.geometryChanged || update.transactions.length)
          measure()
      }
    }
  })

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

/** `CodeMirrorMarkup.tagBlocks`' measure, one at a time. */
const TAG_BLOCKS_KEY = {}

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
          this.tagOn(shape.place, classes, shape.partOfSpeech)
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
          if (shape.isBare) this.bareQuotes(shape.place)
          break
      }
    }
  }

  /**
   * A value written without quotes (`direction=down`) drawn as `direction="down"` is (epic `language` I123):
   * its curly marks and the room outside them, as widgets beside its words, nothing added to the file.
   * - Placed outside its pill's room, which is at its words' ends too (sides -1, 1)
   */
  private bareQuotes(place: number) {
    const value = this.marks[place]
    if (!value) return
    const room = (kind: "quote" | "tag-quote", side: "before" | "after") => spacer(kind, side).inlineClassName
    const { start, end } = value
    this.decorations.add(
      Decoration.widget({ widget: new SpacerWidget(room("quote", "before")), side: -3 }).range(start)
    )
    this.decorations.add(QuoteWidget.bare("open").range(start))
    this.decorations.add(QuoteWidget.bare("close").range(end))
    this.decorations.add(
      Decoration.widget({ widget: new SpacerWidget(room("tag-quote", "after")), side: 3 }).range(end)
    )
  }

  /** An element with what's inside it on lines of its own:  its band, its body's rail, its end tag's tiny pill. */
  private block(block: Extract<MarkupShape, { kind: "markup-block" }>, rails: Rail[]) {
    const head = this.marks[block.head]
    const whole = this.marks[block.place]
    if (!head || !whole) return
    const hue = hueOf(block.partOfSpeech)
    // folded:  its start tag alone, a band pointed at both ends, the fold's `…` in its end (I116)
    if (this.decorations.isFoldedAt(head.start)) {
      this.tagOn(block.head, ["cmb-tag-band", "cmb-band-folded", "cmb-tag-start", ...hue], block.partOfSpeech)
      return
    }
    this.tagOn(block.head, ["cmb-tag-band", "cmb-band-open", "cmb-tag-start", ...hue], block.partOfSpeech)
    const inside = [...rails, { ...this.decorations.indentAt(head.start), partOfSpeech: block.partOfSpeech }]
    // the rail:  every line under its start tag's first, its attributes' lines too (I133), to its end tag's
    const { doc } = this.decorations.state
    const first = doc.lineAt(head.start).number + 1
    const last = doc.lineAt(whole.end).number
    for (let number = first; number <= last; number++) this.decorations.line(doc.line(number).from, inside, hue)
    const foot = block.foot === undefined ? undefined : this.marks[block.foot]
    if (foot) {
      this.on(block.foot!, ["cmb-tag-foot", ...hue])
      // alone on its line:  a foot, on one row with the end tags alone on the lines round it (I132)
      const line = doc.lineAt(foot.start)
      if (doc.sliceString(line.from, line.to).trim() === doc.sliceString(foot.start, foot.end))
        this.decorations.footAlone(foot, inside)
    }

    this.draw(block.inside, inside)
  }

  /**
   * A tag's classes `classes` on the mark at `place`, a tag of `partOfSpeech`'s.
   * - A start tag over several lines, its attributes on lines of their own (`<toolbar`, `class="GameBar"` ...
   *   `shrinkable>`, as Enter lays it out;  epic `language` I133, I135):  ONE block of its colour round them all
   *   (Owen:  "show in a block pill"), drawn as a row on each line (`cmb-tag-block`):
   *   - its first line its band, `classes`;  on each line under it, a row round that line's words, never its indent
   *   - every row from the block's left edge, its band's, to its right edge, its widest row's:
   *     how far each reaches past its words is measured once it's drawn (`TagBlocks`)
   *   - its `>` or `/>` at the block's right edge, the end of the last row, wherever it is in the text
   *     (`TagPointWidget`):  the caret before it still at the words' end
   */
  private tagOn(place: number, classes: string[], partOfSpeech: string) {
    const stretch = this.marks[place]
    if (!stretch) return
    const { doc } = this.decorations.state
    const firstLine = doc.lineAt(stretch.start)
    if (stretch.end <= firstLine.to) return this.on(place, classes)
    const block = this.decorations.nextBlock()
    const lastLine = doc.lineAt(stretch.end)
    const isOpen = classes.includes("cmb-band-open")
    const rowOf = (extra: string[]) => {
      const row = this.decorations.nextRow()
      return {
        classes: ["cmb-tag-block", ...extra],
        attributes: {
          "data-tag-block": String(block),
          "data-tag-row": String(row),
          style:
            `--cmb-reach-before: var(--cmb-tag-row-${row}-before, 0px); ` +
            `--cmb-reach-after: var(--cmb-tag-row-${row}-after, 0px); ` +
            `--cmb-reach-end: var(--cmb-tag-row-${row}-end, var(--bubbly-bracket-pad))`
        }
      }
    }
    const first = rowOf(["cmb-tag-block-first"])
    // the tag's own mark (`bubbly-piece`) on its first row alone:  over all its lines, it cut the last row in two
    const own = this.decorations.unmark(stretch.start, stretch.end)
    this.decorations.mark(
      stretch.start,
      firstLine.to,
      [...own, ...classes, "cmb-tag-continued", ...first.classes],
      first.attributes
    )
    for (let number = firstLine.number + 1; number <= lastLine.number; number++) {
      const line = doc.line(number)
      const from = line.from + /^\s*/.exec(line.text)![0].length
      const to = Math.min(line.to, stretch.end)
      if (to <= from) continue
      const isLast = number === lastLine.number
      const row = rowOf(["cmb-tag-band", "cmb-tag-row", ...hueOf(partOfSpeech)])
      if (isLast) row.classes.push("cmb-tag-block-last", ...(isOpen ? ["cmb-tag-block-opens"] : []))
      // its `>` alone on its line, back at the tag's level (as I133 laid it out):  from the band's left edge
      if (/^\/?>$/.test(doc.sliceString(from, to))) row.classes.push("cmb-tag-row-close")
      // round what's marked on the line, never merged into a mark of the same stretch (a `>` alone, a bare attribute):
      // CodeMirror puts an inclusive mark outside an exclusive one over the same text
      this.decorations.add(
        Decoration.mark({ class: row.classes.join(" "), attributes: row.attributes, inclusive: true }).range(from, to)
      )
    }
    // its `>` or `/>` at the block's right edge
    const close = /\/?>$/.exec(doc.sliceString(lastLine.from, stretch.end))
    if (close) this.decorations.point(stretch.end - close[0].length, stretch.end)
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
 * One drawing's decorations being made, for the look's two kinds of text:
 * Spell (`CodeMirrorBubbly`) and HTML (`CodeMirrorMarkup`), a Spell file's drawing's tags among its Spell.
 * - ONE mark per stretch, its classes together:  CodeMirror nests two marks over the same stretch in no set order,
 *   so `bubbly-quoted` round `bubbly-input` came out either way round;  a longer mark always holds a shorter one.
 * - ONE decoration per line, its classes together, the rails of every block round it.
 ****************/
export class CodeMirrorDecorations {
  /** The decorations that are neither marks nor lines:  feet, spacers. */
  private readonly ranges: Array<Range<Decoration>> = []
  /** Where a tag laid out over lines has its `>` or `/>`, drawn at its block's right edge (`TagPointWidget`). */
  private readonly points: Array<{ start: number; end: number }> = []
  /** How many tags laid out over lines, and their rows, so far:  each one's number (`CodeMirrorMarkup.tagBlocks`). */
  private blocks = 0
  private rows = 0
  /** Each mark's classes and attributes, by its stretch (`start:end`). */
  private readonly marks = new Map<string, { classes: Set<string>; attributes: Record<string, string> }>()
  /**
   * Each line's classes and rails, by where it starts;
   * `stopped`, the rails (by their place in `rails`) that stop short above a foot's round corner in the row under it;
   * `ended`, those not drawn in it at all:  an HTML block's own, in its foot's row.
   */
  private readonly lines = new Map<number, LineDecoration>()
  /** The end tags alone on their lines, drawn as feet (`footAlone()`). */
  private readonly feet: FootAlone[] = []

  /**
   * - `hiddenIndent`:  the characters of indent hidden at each line's start, a slice shown dedented (`<CodeSlice>`):
   *   not counted in a line's indent, so its rails stand where its bands are drawn (epic `language` I128)
   */
  constructor(
    readonly state: EditorState,
    private readonly hiddenIndent = 0
  ) {
    this.text = state.doc.toString()
  }

  /** The text being drawn. */
  readonly text: string

  /**
   * Is the block whose head is on the line `at` is on folded?
   * - Its fold starts at its head line's end (`CodeMirrorLanguage.folding()`), so it's drawn as its head alone:
   *   a pill, no rail, no foot, nothing of its hidden body (epic `language` I116)
   */
  isFoldedAt(at: number): boolean {
    const { to } = this.state.doc.lineAt(at)
    let isFolded = false
    foldedRanges(this.state).between(to, to, (from) => {
      if (from === to) isFolded = true
      return isFolded ? false : undefined
    })
    return isFolded
  }

  /** Mark `start`-`end` with `classes`, and `attributes`, along with any the same stretch has. */
  mark(start: number, end: number, classes: string[], attributes: Record<string, string> = {}): void {
    if (end <= start || (!classes.length && !Object.keys(attributes).length)) return
    const key = `${start}:${end}`
    const marked = this.marks.get(key) ?? { classes: new Set(), attributes: {} }
    for (const each of classes) marked.classes.add(each)
    Object.assign(marked.attributes, attributes)
    this.marks.set(key, marked)
  }

  /** Take the mark off `start`-`end`:  its classes, none if it had none. */
  unmark(start: number, end: number): string[] {
    const key = `${start}:${end}`
    const classes = [...(this.marks.get(key)?.classes ?? [])]
    this.marks.delete(key)
    return classes
  }

  /** The line `at` is on:  inside the blocks `rails` holds, outermost first, and in `classes`. */
  line(at: number, rails: Rail[], classes: string[] = []): void {
    const from = this.state.doc.lineAt(at).from
    const line = this.decorationOf(from)
    for (const each of classes) line.classes.add(each)
    // the most a line's in:  a drawing's tags inside a Spell block hold its rails, and their own
    if (rails.length >= line.rails.length) line.rails = rails
    this.lines.set(from, line)
  }

  /**
   * The rail `rail` (its place among the line's rails, outermost 0) stops short on the line `at` is on:
   * a foot's round corner, in the row under it, takes its place there.
   */
  stopRail(at: number, rail: number): void {
    const from = this.state.doc.lineAt(at).from
    const line = this.decorationOf(from)
    line.stopped.add(rail)
    this.lines.set(from, line)
  }

  /** The rail `rail` (its place among the line's rails, outermost 0) isn't drawn on the line `at` is on. */
  endRail(at: number, rail: number): void {
    const from = this.state.doc.lineAt(at).from
    const line = this.decorationOf(from)
    line.ended.add(rail)
    this.lines.set(from, line)
  }

  /** The decoration so far of the line starting at `from`, or a new one. */
  private decorationOf(from: number): LineDecoration {
    return this.lines.get(from) ?? { classes: new Set(), rails: [], stopped: new Set(), ended: new Set() }
  }

  /** Room `spacer` injected at `at`, before or after the text there. */
  spacer(at: number, spacer: Spacer, side: "before" | "after"): void {
    const widget = Decoration.widget({
      widget: new SpacerWidget(spacer.inlineClassName),
      side: side === "before" ? -1 : 1
    })
    this.ranges.push(widget.range(at))
  }

  /** The next tag laid out over lines' number, among this drawing's. */
  nextBlock(): number {
    return this.blocks++
  }

  /** The next row of such a tag's number, among this drawing's. */
  nextRow(): number {
    return this.rows++
  }

  /**
   * `start`-`end`, a tag's `>` or `/>`, drawn at its block's right edge (`TagPointWidget`):
   * the marks of its pieces drawn inside it.
   */
  point(start: number, end: number): void {
    this.points.push({ start, end })
  }

  /** Any other decoration, e.g. a foot. */
  add(range: Range<Decoration>): void {
    this.ranges.push(range)
  }

  /**
   * `foot`, an HTML block's end tag alone on its line, inside the blocks `rails` holds, its own the last:
   * drawn as a foot, on one row with the end tags alone on the lines round it (`feetRow()`;  epic `language` I132).
   */
  footAlone(foot: { start: number; end: number }, rails: Rail[]): void {
    this.feet.push({ start: foot.start, end: foot.end, rails })
  }

  /** Each run of end tags alone on lines one after another:  one row of feet (`feetRow()`). */
  private feetRows() {
    const { doc } = this.state
    const feet = [...this.feet].sort((one, other) => one.start - other.start)
    const lineOf = (foot: FootAlone) => doc.lineAt(foot.start).number
    for (let first = 0; first < feet.length;) {
      let last = first
      while (feet[last + 1] && lineOf(feet[last + 1]!) === lineOf(feet[last]!) + 1) last++
      this.feetRow(feet.slice(first, last + 1))
      first = last + 1
    }
  }

  /**
   * A run of end tags alone on lines one after another (`</>` closing `<toolbar>`, then `</>` closing `<segment>`):
   * their lines drawn as ONE row, a foot for each (Owen, 2026-11-16;  epic `language` I132)
   * - each end tag the file's own text, drawn small in a pill pointed at both ends, at the end of its block's foot:
   *   its rail turning out at a tag's slant, then a short bar (`.cmb-feet-row`, `bubbly.css`)
   * - the feet nested as Spell's (I125):  each one round the one before it, below it and a rail further left
   * - the line breaks between them hidden, so the caret, a click and Delete reach each end tag as before
   * - its blocks' rails end in it:  each foot draws its own, down to its turn
   * - right above a band:  room under it, so the two blocks stand apart, as under a Spell foot (T141)
   */
  private feetRow(run: FootAlone[]) {
    const { doc } = this.state
    const row = doc.lineAt(run[0]!.start)
    const rails = run.reduce((most, foot) => (foot.rails.length > most.length ? foot.rails : most), run[0]!.rails)
    const classes = ["cmb-feet-row"]
    if (this.isBandAt(doc.lineAt(run.at(-1)!.end).to + 1)) classes.push("cmb-feet-above-band")
    this.line(row.from, rails, classes)
    const rowDecoration = this.decorationOf(row.from)
    rowDecoration.feet = run.length
    for (const [level, foot] of run.entries()) {
      // a line joined to the row:  its own decoration not drawn, a rail stopping short in it (a Spell foot's under it) the row's
      const line = doc.lineAt(foot.start).from
      if (level) {
        for (const rail of this.lines.get(line)?.stopped ?? []) rowDecoration.stopped.add(rail)
        this.lines.delete(line)
      }
      const rail = foot.rails.length - 1
      const { tabs, spaces } = foot.rails[rail]!
      this.endRail(row.from, rail)
      this.mark(foot.start, foot.end, [], {
        style: `--cmb-column: ${tabs}; --cmb-spaces: ${spaces}; --cmb-foot-level: ${level}`
      })
      const next = run[level + 1]
      // the line break to the next one hidden, one step for the caret
      if (next) this.ranges.push(FeetJoinWidget.decoration.range(foot.end, next.start))
    }
  }

  /** Does a band start the line `at` is on, a block's start tag or a Spell declaration's head? */
  private isBandAt(at: number): boolean {
    if (at > this.state.doc.length) return false
    const { from, to } = this.state.doc.lineAt(at)
    for (const [range, { classes }] of this.marks) {
      const start = Number(range.split(":")[0])
      if (start >= from && start <= to && (classes.has("cmb-band") || classes.has("cmb-band-open"))) return true
    }
    return false
  }

  /**
   * How far in the line `at` is on is `at`, as shown:  its tabs and spaces, which a rail starts at.
   * - less a slice's hidden indent, which isn't drawn
   */
  indentAt(at: number): Indent {
    const line = this.state.doc.lineAt(at)
    const indent = this.text.slice(Math.min(line.from + this.hiddenIndent, at), at)
    return { tabs: indent.split("\t").length - 1, spaces: indent.replaceAll("\t", "").length }
  }

  /** The decorations, sorted as CodeMirror wants them. */
  build(): DecorationSet {
    this.feetRows()
    const ranges = [...this.ranges]
    const marks = [...this.marks].map(([range, mark]) => {
      const [start, end] = range.split(":").map(Number) as [number, number]
      return { start, end, ...mark }
    })
    // a quote mark's `"` shown as its curly mark;  where they start and end
    const quotes = marks.filter((mark) => mark.classes.has(QUOTE_MARK))
    const quoteStarts = new Set(quotes.map((quote) => quote.start))
    const quoteEnds = new Set(quotes.map((quote) => quote.end))
    // a tag's `>` drawn at its block's edge:  its pieces' marks inside it
    const isInPoint = (start: number, end: number) =>
      this.points.find((point) => point.start <= start && end <= point.end)
    for (const point of this.points) {
      const pieces = marks
        .filter((mark) => point.start <= mark.start && mark.end <= point.end)
        .sort((one, other) => one.start - other.start)
        // its `⟩` shown, at the block's edge:  not hidden as at a pill's pointed end
        .map((mark) => ({
          classes: [...mark.classes].filter((each) => each !== "bubbly-angle-at-end").join(" "),
          text: this.text.slice(mark.start, mark.end)
        }))
      ranges.push(Decoration.replace({ widget: new TagPointWidget(pieces) }).range(point.start, point.end))
    }
    for (const { start, end, classes, attributes } of marks) {
      if (isInPoint(start, end)) continue
      if (classes.has(QUOTE_MARK)) {
        ranges.push(QuoteWidget.over(classes).range(start, end))
        continue
      }
      // a mark starting or ending with a quote holds it:  CodeMirror draws a widget at a mark's edge outside it,
      // unless the mark's inclusive there;  every one at that edge, so they still nest as they did
      const inclusiveStart = quoteStarts.has(start)
      const inclusiveEnd = quoteEnds.has(end)
      const mark = Decoration.mark({ class: [...classes].join(" "), attributes, inclusiveStart, inclusiveEnd })
      ranges.push(mark.range(start, end))
    }
    for (const [from, { classes, rails, stopped, ended, feet }] of this.lines) {
      const innermost = rails.at(-1)
      const lineClasses = [...classes, ...(innermost ? hueOf(innermost.partOfSpeech) : [])]
      const styles = rails.length ? [railsStyle(rails, stopped, ended)] : []
      if (feet) styles.push(`--cmb-feet: ${feet}`)
      const attributes: Record<string, string> = styles.length ? { style: styles.join("; ") } : {}
      ranges.push(Decoration.line({ class: lineClasses.join(" "), attributes }).range(from))
    }
    return Decoration.set(ranges, true)
  }
}

/**
 * A line's decoration being made:  its classes, the rails of the blocks round it, which of them stop short or end;
 * `feet`, how many feet it draws, a row of them (`CodeMirrorDecorations.feetRow()`).
 */
type LineDecoration = { classes: Set<string>; rails: Rail[]; stopped: Set<number>; ended: Set<number>; feet?: number }

/** An HTML block's end tag alone on its line:  where it is, the rails of the blocks round it, its own the last. */
type FootAlone = { start: number; end: number; rails: Rail[] }

/** How far in a line's words start:  its tabs, then its spaces. */
export type Indent = { tabs: number; spaces: number }

/** One enclosing block, as a body line draws its rail:  where its band starts, and its colour. */
export type Rail = Indent & { partOfSpeech: string }

/**
 * `rails` as a CSS background:  one stripe per enclosing block, at its band's left edge, in its band's colour.
 * - its middle where its body's lines start, so the caret at a body line's start stands on it (epic `language` I131)
 * - `bubbly.css` sizes a tab stop (`--cmb-indent`), a space (`--cmb-space`), a rail (`--cmb-rail`) and where a band
 *   starts from its line's indent (`--cmb-band-left`):  only the columns are written here.
 */
function railsOf(rails: Rail[]): string {
  return rails
    .map(({ tabs, spaces, partOfSpeech }) => {
      const x = `calc(var(--cmb-line-pad) + ${tabs} * var(--cmb-indent) + ${spaces} * var(--cmb-space) + var(--cmb-band-left))`
      const colour = `var(--cmb-band-${partOfSpeech})`
      return `linear-gradient(to right, transparent ${x}, ${colour} ${x}, ${colour} calc(${x} + var(--cmb-rail)), transparent calc(${x} + var(--cmb-rail)))`
    })
    .join(", ")
}

/**
 * `rails` as a row's style:  `--cmb-rails`, and `--cmb-rail-sizes` when any of them, by their place in `rails`,
 * stops short above a foot's round corner in the row under it (`stopped`, `--cmb-foot-lift` in `bubbly.css`), or isn't
 * drawn in it (`ended`).
 */
export function railsStyle(
  rails: Rail[],
  stopped: ReadonlySet<number> = new Set(),
  ended: ReadonlySet<number> = new Set()
): string {
  const style = `--cmb-rails: ${railsOf(rails)}`
  if (![...stopped, ...ended].some((rail) => rail < rails.length)) return style
  const sizes = rails.map((_, rail) => (ended.has(rail) ? "0 0" : stopped.has(rail) ? STOPPED_RAIL : "100% 100%"))
  return `${style}; --cmb-rail-sizes: ${sizes.join(", ")}`
}

/** A rail's size in a row it stops short in:  the row's width, its height less the corner's reach into it. */
const STOPPED_RAIL = "100% max(0px, 100% - var(--cmb-foot-lift))"

/** The class the shared marks give a quoted value's own `"` (`MarkupMarks`, `CodeMirrorBubbly`). */
const QUOTE_MARK = "bubbly-quote-mark"

/** The quote classes renamed for the editor's own:  `bubbly-quote-open` => `cmb-quote-open` ... */
const QUOTE_CLASS = /^bubbly-(?=quote-|tag-quote|tag-word-quote)/

/****************
 * ### `QuoteWidget`
 * A quoted value's `"` drawn as its curly mark:  `“` before it, `”` after it, the mark the look's (`cmb-quote`).
 * - Shown IN PLACE of the file's `"`, which stays in the file:  the caret and a selection step over it as one
 *   letter, and a copy copies the `"`.
 * - Nothing see-through left under it:  the file's own `"`, kept transparent with its curly mark drawn over it,
 *   came back as a straight quote beside the curly one whenever it was selected (epic `language` I115)
 * - Its classes:  the mark's, `bubbly-quote-*` and `bubbly-tag-*quote` as `cmb-*`, so none of the drawn-bubbly
 *   page's rules for its own `"` reach it
 ****************/
class QuoteWidget extends WidgetType {
  constructor(
    readonly classes: string,
    readonly mark: string,
    readonly isBare = false
  ) {
    super()
  }

  /** The decoration showing a `"` marked `classes` as its curly mark. */
  static over(classes: ReadonlySet<string>): Decoration {
    const isOpen = classes.has("bubbly-quote-open")
    const own = [...classes].filter((each) => each !== QUOTE_MARK).map((each) => each.replace(QUOTE_CLASS, "cmb-"))
    return Decoration.replace({ widget: new QuoteWidget(["cmb-quote", ...own].join(" "), isOpen ? "“" : "”") })
  }

  /**
   * A curly mark for a value written without quotes (`direction=down`), with nothing of the file under it:
   * outside the room either side of its words (sides -2, 2), inside the room outside the marks (-3, 3).
   */
  static bare(end: "open" | "close"): Decoration {
    const classes = new Set([QUOTE_MARK, "bubbly-tag-quote", `bubbly-quote-${end}`])
    const { classes: own, mark } = (QuoteWidget.over(classes).spec as { widget: QuoteWidget }).widget
    return Decoration.widget({ widget: new QuoteWidget(own, mark, true), side: end === "open" ? -2 : 2 })
  }

  eq(other: QuoteWidget): boolean {
    return other.classes === this.classes && other.mark === this.mark && other.isBare === this.isBare
  }

  /** `<span class="cmb-quote ..."><span class="cmb-quote-glyph">“</span></span>`:  the glyph placed in its box. */
  toDOM(): HTMLElement {
    const box = document.createElement("span")
    box.className = this.classes
    const glyph = box.appendChild(document.createElement("span"))
    glyph.className = "cmb-quote-glyph"
    glyph.textContent = this.mark
    return box
  }

  /**
   * Where the caret stands beside the mark:  outside it, or at the quoted words' edge, as tall as they are.
   * - CodeMirror's own measure was the box's:  no height, since its glyph is placed on its own (epic `language` I122:
   *   no caret after a closing quote, or before an opening one)
   * - `pos` 0 is before the `"`, 1 after it
   * - A bare value's mark has no `"` to step over:  the caret beside it is at its words' edge, where a letter typed
   *   goes into the value
   */
  coordsAt(box: HTMLElement, pos: number): Rect | null {
    const isOpen = this.mark === "“"
    const words = letterBeside(box, isOpen ? "after" : "before")
    if (!words) return null
    const isOutside = !this.isBare && (pos === 0 ? isOpen : !isOpen)
    return caretAt(isOutside ? outsideOf(box, isOpen ? "before" : "after") : isOpen ? words.left : words.right, words)
  }

  ignoreEvent(): boolean {
    return false
  }
}

/**
 * The first letter after `element` on its line (`"after"`), or the last one before it;  else any letter on its line.
 * - What a caret beside a widget takes its height from:  a widget's own box may have none
 */
function letterBeside(element: HTMLElement, side: "before" | "after"): DOMRect | undefined {
  const line = element.closest(".cm-line")
  if (!line) return undefined
  const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.textContent?.trim() && !node.parentElement?.closest(".cmb-quote")
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP
  })
  const letters: Text[] = []
  while (walker.nextNode()) letters.push(walker.currentNode as Text)
  const isAfter = (text: Text) => Boolean(element.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING)
  const beside = side === "after" ? letters.find(isAfter) : letters.findLast((text) => !isAfter(text))
  const text = beside ?? letters[0]
  if (!text) return undefined
  // its first letter, or its last:  past any spaces at that end
  const content = text.textContent!
  const at = side === "after" || !beside ? content.search(/\S/) : content.trimEnd().length - 1
  const range = document.createRange()
  range.setStart(text, at)
  range.setEnd(text, at + 1)
  return range.getBoundingClientRect()
}

/** The element next to `element` on `side`, past CodeMirror's buffers beside a widget. */
function besideOf(element: Element, side: "before" | "after"): Element | undefined {
  let next = side === "after" ? element.nextElementSibling : element.previousElementSibling
  while (next?.matches(".cm-widgetBuffer"))
    next = side === "after" ? next.nextElementSibling : next.previousElementSibling
  return next ?? undefined
}

/**
 * Where a caret stands outside a quote's curly mark, `side` of it.
 * - A tag's mark:  past the room outside it, where the text beside it starts, so the caret's at one place whichever
 *   way it came;  without that room, its box's edge, as wide as the `"`, the mark over its middle
 * - A Spell value's has no box, its mark outside the white:  the mark's own edge
 */
function outsideOf(quote: HTMLElement, side: "before" | "after"): number {
  const room = besideOf(quote, side)
  const box = quote.getBoundingClientRect()
  const edges = room?.matches(".bubbly-spacer")
    ? room.getBoundingClientRect()
    : box.width >= 1
      ? box
      : (quote.firstElementChild ?? quote).getBoundingClientRect()
  return side === "before" ? edges.left : edges.right
}

/** A caret at `x`, as tall as `letter`. */
function caretAt(x: number, letter: DOMRect): Rect {
  return { left: x, right: x, top: letter.top, bottom: letter.bottom }
}

/** Room beside a mark, an empty inline box, its width the sheet's. */
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

  /**
   * Where the caret stands beside the room:  at its edge by the text, as tall as the letters there;
   * beside a quote's curly mark, outside the mark;  inside a pill, at its words' edge.
   * - CodeMirror's own measure was the box's:  no height (epic `language` I122)
   */
  coordsAt(room: HTMLElement): Rect | null {
    const isBefore = room.classList.contains("bubbly-spacer-before")
    const letter = letterBeside(room, isBefore ? "after" : "before")
    if (!letter) return null
    const quote = besideOf(room, isBefore ? "after" : "before")
    const edge = room.getBoundingClientRect()
    if (quote?.matches(".cmb-quote"))
      return caretAt(outsideOf(quote as HTMLElement, isBefore ? "before" : "after"), letter)
    // a pill's room inside it:  at its words' edge, where a letter typed goes;
    // an end tag's in a row of feet too:  the room's left in the row, its tag a block of its own (I132)
    if (room.matches(".bubbly-input-spacer") || room.closest(".cmb-feet-row"))
      return caretAt(isBefore ? letter.left : letter.right, letter)
    return caretAt(isBefore ? edge.right : edge.left, letter)
  }

  ignoreEvent(): boolean {
    return false
  }
}

/****************
 * ### `FeetJoinWidget`
 * The line break, and the next line's indent, hidden between two end tags in a row of feet
 * (`CodeMirrorDecorations.feetRow()`;  epic `language` I132):  nothing drawn, one step for the caret.
 * - The caret beside it stands at the end tag beside it, not at the row's left, where its empty box is.
 ****************/
class FeetJoinWidget extends WidgetType {
  /** The hiding decoration:  `atomic`, so `CodeMirrorRelayout` makes it one step for the caret. */
  static readonly decoration = Decoration.replace({ widget: new FeetJoinWidget(), atomic: true })

  eq(): boolean {
    return true
  }

  toDOM(): HTMLElement {
    return document.createElement("span")
  }

  /** `pos` 0, before it:  after the end tag above;  else before the end tag below. */
  coordsAt(join: HTMLElement, pos: number): Rect | null {
    const letter = letterBeside(join, pos === 0 ? "before" : "after")
    return letter ? caretAt(pos === 0 ? letter.right : letter.left, letter) : null
  }

  ignoreEvent(): boolean {
    return false
  }
}

/****************
 * ### `TagPointWidget`
 * A tag laid out over lines' `>` or `/>`, drawn at its block's right edge (epic `language` I135;  Owen:  "The `>`
 * should be on the same line as the last tag, but outdented past the farthest right attribute value").
 * - Shown IN PLACE of the file's `>`, which stays right after the last attribute:  the row's room before it,
 *   `--cmb-reach-after`, puts it at the edge (`CodeMirrorMarkup.tagBlocks`).
 * - Its pieces the marks the `>` had (`bubbly-angle-close` ...), so the sheet draws it as it draws every tag's.
 * - The caret before it stands at the words' end, where a letter typed goes;  after it, past its point.
 ****************/
class TagPointWidget extends WidgetType {
  constructor(readonly pieces: ReadonlyArray<{ classes: string; text: string }>) {
    super()
  }

  eq(other: TagPointWidget): boolean {
    return JSON.stringify(other.pieces) === JSON.stringify(this.pieces)
  }

  /** `<span class="cmb-tag-point"><span class="bubbly-piece bubbly-mark bubbly-angle-close ...">></span></span>` */
  toDOM(): HTMLElement {
    const point = document.createElement("span")
    point.className = "cmb-tag-point"
    for (const { classes, text } of this.pieces) {
      const piece = point.appendChild(document.createElement("span"))
      piece.className = classes
      piece.textContent = text
    }
    return point
  }

  /** Where the caret stands beside it:  before it, at the words' end on its line;  after it, past its point. */
  coordsAt(point: HTMLElement, pos: number): Rect | null {
    const box = point.getBoundingClientRect()
    if (pos > 0) return { left: box.right, right: box.right, top: box.top, bottom: box.bottom }
    const words = letterBeside(point, "before")
    if (!words || words.right > box.left) return { left: box.left, right: box.left, top: box.top, bottom: box.bottom }
    return caretAt(words.right, words)
  }

  ignoreEvent(): boolean {
    return false
  }
}

/** A row of a tag laid out over lines, as `TagBlocks` measures it:  its block, its number, its words' edges. */
/** A row of a tag laid out over lines, as `measureTagBlocks()` finds it, its reach taken off. */
type TagRow = {
  /** its block's number, and its own (`CodeMirrorMarkup.tagOn()`) */
  block: string
  row: string
  /** where its words start and end:  the last row's, before its room and its `>` */
  left: number
  right: number
  /** the first row's:  from its left edge to its `⟨` */
  gap?: number
  /** the last row's:  its `>`'s width, and the room before it */
  point?: { width: number; room: number }
}

/**
 * Each tag laid out over lines' rows, measured where they're drawn (epic `language` I135), for
 * `CodeMirrorMarkup.tagBlocks`:  where each one's words start and end, its reach past them taken off.
 * - A row's words end past the room after its last value's closing quote, drawn just outside it.
 */
function measureTagBlocks(view: EditorView): TagRow[] {
  return [...view.contentDOM.querySelectorAll<HTMLElement>(".cmb-tag-block")].map((element) => {
    const style = getComputedStyle(element)
    const box = element.getBoundingClientRect()
    const reach = (name: string) => parseFloat(style.getPropertyValue(name)) || 0
    const after = reach("--cmb-reach-after")
    const row: TagRow = {
      block: element.dataset.tagBlock ?? "",
      row: element.dataset.tagRow ?? "",
      left: box.left + reach("--cmb-reach-before"),
      right: box.right - after
    }
    const point = element.querySelector<HTMLElement>(".cmb-tag-point")
    if (point) {
      const at = point.getBoundingClientRect()
      const room = parseFloat(getComputedStyle(point).marginLeft) - after
      row.right = at.left - room - after
      row.point = { width: at.width, room }
    } else
      for (let next = besideOf(element, "after"); next?.matches(".bubbly-spacer"); next = besideOf(next, "after"))
        row.right = Math.max(row.right, next.getBoundingClientRect().right - after)
    const angle = element.classList.contains("cmb-tag-block-first") && element.querySelector(".bubbly-angle-open")
    if (angle) row.gap = angle.getBoundingClientRect().left - row.left
    return row
  })
}

/**
 * How far each row of `rows` reaches past its words, `--cmb-tag-row-<n>-before`, `-after` and `-end`:
 * every row from its block's left edge to its right edge.
 * - The right edge:  past the widest row's words, the room a value has in a band, then the `>`, then as much as the
 *   block has before its `⟨` (Owen:  "the `>` has as much space to its right as `<toolbar` has")
 * - The last row's `>` at that edge, less that much (`-end`), past its own reach (`-after`)
 */
function tagRowReaches(rows: TagRow[]): Map<string, string> {
  const blocks = new Map<string, { left: number; right: number; gap: number; point: { width: number; room: number } }>()
  for (const { block, left, right, gap, point } of rows) {
    const edges = blocks.get(block) ?? { left, right, gap: 0, point: { width: 0, room: 0 } }
    blocks.set(block, {
      left: Math.min(edges.left, left),
      right: Math.max(edges.right, right),
      gap: gap ?? edges.gap,
      point: point ?? edges.point
    })
  }
  const reaches = new Map<string, string>()
  const px = (value: number) => `${Math.max(0, value).toFixed(2)}px`
  for (const { block, row, left, right, point } of rows) {
    const edges = blocks.get(block)!
    const edge = edges.right + edges.point.room + edges.point.width + edges.gap
    reaches.set(`--cmb-tag-row-${row}-before`, px(left - edges.left))
    if (point) {
      reaches.set(`--cmb-tag-row-${row}-after`, px(edge - edges.gap - point.width - point.room - right))
      reaches.set(`--cmb-tag-row-${row}-end`, px(edges.gap))
    } else reaches.set(`--cmb-tag-row-${row}-after`, px(edge - right))
  }
  return reaches
}
