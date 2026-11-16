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
 *   - a block's body:  a rail on each line (`--cmb-rails`);  its end tag on its own line a tiny pill (`cmb-tag-foot`)
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
      this.on(block.head, ["cmb-tag-band", "cmb-band-folded", "cmb-tag-start", ...hue])
      return
    }
    this.on(block.head, ["cmb-tag-band", "cmb-band-open", "cmb-tag-start", ...hue])
    const inside = [...rails, { ...this.decorations.indentAt(head.start), partOfSpeech: block.partOfSpeech }]
    // the rail:  every line under its start tag, to its end tag's
    const { doc } = this.decorations.state
    const first = doc.lineAt(head.end).number + 1
    const last = doc.lineAt(whole.end).number
    for (let number = first; number <= last; number++) this.decorations.line(doc.line(number).from, inside, hue)
    const foot = block.foot === undefined ? undefined : this.marks[block.foot]
    if (foot) {
      this.on(block.foot!, ["cmb-tag-foot", ...hue])
      // alone on its line:  the line only as tall as its tiny pill and the paper round it, as Monaco's (I113)
      const line = doc.lineAt(foot.start)
      if (doc.sliceString(line.from, line.to).trim() === doc.sliceString(foot.start, foot.end)) {
        this.decorations.line(foot.start, inside, ["cmb-foot-line"])
        // its own rail ends at the foot's top, as Monaco's did (I114):  the foot draws the bit above it, and its corner
        this.decorations.endRail(foot.start, inside.length - 1)
      }
    }

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
 * One drawing's decorations being made, for the look's two kinds of text:
 * Spell (`CodeMirrorBubbly`) and HTML (`CodeMirrorMarkup`), a Spell file's drawing's tags among its Spell.
 * - ONE mark per stretch, its classes together:  CodeMirror nests two marks over the same stretch in no set order,
 *   so `bubbly-quoted` round `bubbly-input` came out either way round;  a longer mark always holds a shorter one.
 * - ONE decoration per line, its classes together, the rails of every block round it.
 ****************/
export class CodeMirrorDecorations {
  /** The decorations that are neither marks nor lines:  feet, spacers. */
  private readonly ranges: Array<Range<Decoration>> = []
  /** Each mark's classes and attributes, by its stretch (`start:end`). */
  private readonly marks = new Map<string, { classes: Set<string>; attributes: Record<string, string> }>()
  /**
   * Each line's classes and rails, by where it starts;
   * `stopped`, the rails (by their place in `rails`) that stop short above a foot's round corner in the row under it;
   * `ended`, those not drawn in it at all:  an HTML block's own, in its foot's row.
   */
  private readonly lines = new Map<number, LineDecoration>()

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

  /** Any other decoration, e.g. a foot. */
  add(range: Range<Decoration>): void {
    this.ranges.push(range)
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
    const ranges = [...this.ranges]
    const marks = [...this.marks].map(([range, mark]) => {
      const [start, end] = range.split(":").map(Number) as [number, number]
      return { start, end, ...mark }
    })
    // a quote mark's `"` shown as its curly mark;  where they start and end
    const quotes = marks.filter((mark) => mark.classes.has(QUOTE_MARK))
    const quoteStarts = new Set(quotes.map((quote) => quote.start))
    const quoteEnds = new Set(quotes.map((quote) => quote.end))
    for (const { start, end, classes, attributes } of marks) {
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
    for (const [from, { classes, rails, stopped, ended }] of this.lines) {
      const innermost = rails.at(-1)
      const lineClasses = [...classes, ...(innermost ? hueOf(innermost.partOfSpeech) : [])]
      const attributes: Record<string, string> = rails.length ? { style: railsStyle(rails, stopped, ended) } : {}
      ranges.push(Decoration.line({ class: lineClasses.join(" "), attributes }).range(from))
    }
    return Decoration.set(ranges, true)
  }
}

/** A line's decoration being made:  its classes, the rails of the blocks round it, which of them stop short or end. */
type LineDecoration = { classes: Set<string>; rails: Rail[]; stopped: Set<number>; ended: Set<number> }

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
    // a pill's room inside it:  at its words' edge, where a letter typed goes
    if (room.matches(".bubbly-input-spacer")) return caretAt(isBefore ? letter.left : letter.right, letter)
    return caretAt(isBefore ? edge.right : edge.left, letter)
  }

  ignoreEvent(): boolean {
    return false
  }
}
