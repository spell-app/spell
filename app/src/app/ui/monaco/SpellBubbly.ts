import { SP } from "spell/parser/spell"
import { codeLook } from "spell/app/app/ui/codePopups"
import { monaco } from "./monaco"
import { AppAddresses } from "./AppAddresses"
import { BubblyMarks, indentColumns, type BubblyBlockShape, type BubblyShape } from "./BubblyMarks"

import "spell/app/app/components/spell-code/bubbly.css"

/****************
 * ### `SpellBubbly`
 * Spell in a Monaco editor drawn in the BUBBLY LOOK as it's typed (epic `language` P50), while its text stays
 * ordinary text to edit:  the look `<spell-code>` draws on a page, from the same layout and the same sheet.
 * - One per editor, made as each editor is (`watch()`, from `SpellMonaco.register()`).
 * - It lays the code out with the parser (`SP.BubblyLayout`, by `SP.BubblyPresentation`'s table), from its project's
 *   own parse of it when it's a project's file, then:
 *   - marks the text:  each piece's weight, slant and ink, room round what a person typed, a quoted input's curly
 *     marks (`BubblyMarks`, Monaco decorations)
 *   - draws the shapes UNDER the text, in a layer behind the editor (`bubbly-layer`):  each block's band,
 *     gutter, body and foot (a declaration's, a control line's), a pill under each input;  placed from where Monaco draws each
 *     line and letter, and drawn again as it scrolls, folds or is edited
 *   - leaves room under each declaration's last line for its foot:  a view zone
 * - Every look is the sheet's, `bubbly.css`:  the editor's box is a `.bubbly` too, and its own rules are the sheet's
 *   marked Monaco section.  Nothing here styles anything;  it only says where.
 * - Typing never waits for the layout:  the marks move with the text as Monaco keeps them, and the shapes with them;
 *   the code is laid out again once the typing pauses (`RELAYOUT_MSEC`).
 * - Drawn when:
 *   - the page's setting says so (`codeLook`, on by default:  `CodeSettings`' "Bubbly look")
 *   - its model is Spell, not a page file (`SP.formOfText()`);  a notebook example's code is drawn, as it's Spell
 *   - it isn't one side of a diff, whose lines must line up, nor left out (`leaveOut()`:  `<CodeSlice>`)
 * - NEVER throws:  a layout that fails leaves the code as Monaco colours it, and logs why.
 ****************/
export class SpellBubbly {
  /**
   * Draw Spell bubbly in every editor of `languages` made from now on.
   * - Call once, from `SpellMonaco.register()`.
   */
  static watch(languages: readonly string[]): monaco.IDisposable {
    return monaco.editor.onDidCreateEditor((editor) => {
      SpellBubbly.drawings.set(editor, new SpellBubbly(editor, languages))
    })
  }

  /** Never draw `editor` bubbly, e.g. a `<CodeSlice>`, which shows a few lines of a file alone. */
  static leaveOut(editor: monaco.editor.ICodeEditor): void {
    const drawing = SpellBubbly.drawings.get(editor)
    if (!drawing) return
    drawing.isLeftOut = true
    drawing.refresh()
  }

  /** The drawing of `editor`, if it has one:  for tests and a look in devtools. */
  static of(editor: monaco.editor.ICodeEditor): SpellBubbly | undefined {
    return SpellBubbly.drawings.get(editor)
  }

  /** Each editor's drawing. */
  private static drawings = new WeakMap<monaco.editor.ICodeEditor, SpellBubbly>()

  /** Is it drawing now? */
  isDrawing = false

  /** The marks and shapes it last laid out. */
  laidOut: BubblyMarks | undefined

  private constructor(
    private readonly editor: monaco.editor.ICodeEditor,
    private readonly languages: readonly string[]
  ) {
    const later = () => this.refresh()
    const redrawSoon = () => this.redrawSoon()
    codeLook.followers.add(later)
    editor.onDidChangeModel(later)
    editor.onDidChangeModelLanguage(later)
    editor.onDidChangeModelContent(() => {
      if (!this.isDrawing) return
      this.relayoutSoon()
      this.redrawSoon()
    })
    editor.onDidScrollChange(() => {
      this.follow()
      redrawSoon()
    })
    editor.onDidLayoutChange(redrawSoon)
    editor.onDidContentSizeChange(redrawSoon)
    editor.onDidChangeHiddenAreas(redrawSoon)
    editor.onDidChangeConfiguration((event) => {
      if (event.hasChanged(monaco.editor.EditorOption.fontInfo)) this.measured = undefined
      redrawSoon()
    })
    editor.onDidDispose(() => {
      codeLook.followers.delete(later)
      clearTimeout(this.relayoutTimer)
    })
    // its model comes after it's made:  `create()` sets it once its container's in the page
    queueMicrotask(later)
  }

  ////////////////
  // ## Drawing, or not
  ////////////////

  /** Start or stop drawing, as the setting, the model and its text say;  lay it out again if drawing. */
  refresh(): void {
    if (this.shouldDraw()) {
      if (!this.isDrawing) this.start()
      this.relayout()
    } else if (this.isDrawing) this.stop()
  }

  /** Should it draw now? */
  private shouldDraw(): boolean {
    const { editor } = this
    const model = editor.getModel()
    if (!codeLook.isBubbly || this.isLeftOut || !model || editor.getOption(monaco.editor.EditorOption.inDiffEditor))
      return false
    return this.languages.includes(model.getLanguageId()) && SP.formOfText(model.getValue()) !== "page"
  }

  /** Start drawing:  the editor's box a `.bubbly`, its lines taller, a layer for the shapes behind it. */
  private start() {
    const { editor } = this
    this.isDrawing = true
    this.marks ??= editor.createDecorationsCollection()
    const container = editor.getContainerDomNode()
    container.classList.add(...BOX_CLASSES)
    this.lineHeightBefore = editor.getRawOptions().lineHeight ?? 0
    this.measured = undefined
    const measures = this.measures()
    editor.updateOptions({ lineHeight: measures.lineHeight })
    this.layer = Object.assign(document.createElement("div"), { className: "bubbly-layer" })
    this.shapes = Object.assign(document.createElement("div"), { className: "bubbly-shapes" })
    this.layer.append(this.shapes)
    container.prepend(this.layer)
  }

  /** Stop drawing:  every mark, shape, room and class gone, the lines their height again. */
  private stop() {
    const { editor } = this
    this.isDrawing = false
    clearTimeout(this.relayoutTimer)
    this.marks?.clear()
    this.laidOut = undefined
    this.setZones([])
    this.layer?.remove()
    this.layer = this.shapes = undefined
    editor.getContainerDomNode().classList.remove(...BOX_CLASSES)
    editor.updateOptions({ lineHeight: this.lineHeightBefore })
  }

  ////////////////
  // ## Laying out
  ////////////////

  /** Lay the code out again once the typing pauses. */
  private relayoutSoon() {
    clearTimeout(this.relayoutTimer)
    this.relayoutTimer = setTimeout(() => this.refresh(), RELAYOUT_MSEC)
  }

  /**
   * Lay the model's text out, and mark it.
   * - NEVER throws:  a layout that fails clears the marks.
   */
  private relayout() {
    clearTimeout(this.relayoutTimer)
    const model = this.editor.getModel()
    if (!model) return
    try {
      // its project's parse of it, if it's a project's file:  what the compiler sees, names from other files too
      const text = model.getValue()
      const path = AppAddresses.pathOf(model.uri)
      const within = path === undefined ? undefined : SP.SpellFile.registry.get(path)
      const drawing = SP.BubblyLayout.of(text, parserFor(model), { within })
      // the project hasn't parsed this text yet:  read alone for now, and again once it has
      if (within && !SP.BubblyLayout.isParseOf(within, text) && this.parseWaits++ < PARSE_WAITS) this.relayoutSoon()
      else this.parseWaits = 0
      this.laidOut = BubblyMarks.of(drawing)
      this.marks!.set(this.laidOut.marks)
    } catch (error) {
      console.error("SpellBubbly.relayout():  couldn't lay the code out", error)
      this.laidOut = undefined
      this.marks?.clear()
    }
    this.redraw()
  }

  ////////////////
  // ## Drawing the shapes
  ////////////////

  /** Draw the shapes again before the next paint, once however many changes come first. */
  private redrawSoon() {
    if (!this.isDrawing || this.isRedrawQueued) return
    this.isRedrawQueued = true
    requestAnimationFrame(() => {
      this.isRedrawQueued = false
      if (this.isDrawing) this.redraw()
    })
  }

  /** Move the shapes with the text as it scrolls, till they're drawn again. */
  private follow() {
    if (!this.layer) return
    const { editor } = this
    const { contentLeft } = editor.getLayoutInfo()
    this.layer.style.setProperty("--bubbly-monaco-x", `${contentLeft - editor.getScrollLeft()}px`)
    this.layer.style.setProperty("--bubbly-monaco-y", `${-editor.getScrollTop()}px`)
  }

  /**
   * Draw the shapes of the lines Monaco shows, where it draws them now;  and the room under each declaration.
   * - Only those it shows:  Monaco measures a letter's place only on a line it has drawn.
   */
  private redraw() {
    const { editor, laidOut, shapes } = this
    if (!laidOut || !shapes) return
    const ranges = this.marks!.getRanges()
    // across first:  where each band starts, and so how far below its last line each foot goes
    const view: View = {
      ranges,
      lefts: new Map(),
      partsOfParents: new Set(),
      footDrops: new Map(),
      first: 0,
      last: 0,
      measures: this.measures(),
      lineHeight: editor.getOption(monaco.editor.EditorOption.lineHeight),
      width: editor.getLayoutInfo().contentWidth + editor.getScrollWidth()
    }
    this.placeBands(laidOut.shapes, view)
    this.updateZones(laidOut, view)
    // its lines drawn as they are now, zones and all, before we ask where
    editor.render()
    this.follow()
    const visible = editor.getVisibleRanges()
    if (!visible.length) return shapes.replaceChildren()
    view.first = visible[0]!.startLineNumber
    view.last = visible.at(-1)!.endLineNumber
    shapes.replaceChildren(...this.drawAll(laidOut.shapes, view))
  }

  /**
   * Where the band of each block in `shapes` starts, those inside each too, into `view.lefts`:
   * from its words, its lines drawn or not;  `parent`:  the block they're in.
   * - A group is drawn as part of its parent (Owen, 2026-11-11):  its band, grey, starts where its parent's does;
   *   its grey rail covers its parent's while it lasts, and it has no paper or foot of its own;
   *   its members are drawn as the parent's other lines are.
   */
  private placeBands(shapes: BubblyShape[], view: View, parent?: BubblyBlockShape) {
    for (const shape of shapes) {
      const range = view.ranges[shape.place]
      if (shape.kind !== "block" || !range) continue
      const isPartOfParent = shape.isGroup && !!parent
      const left = isPartOfParent ? view.lefts.get(parent)! : this.wordsX(range.startLineNumber) - view.measures.padLeft
      view.lefts.set(shape, left)
      if (isPartOfParent) view.partsOfParents.add(shape)
      this.placeBands(shape.inside, view, shape)
    }
  }

  /** Is `shape` a group drawn as part of its parent:  its band, and its rail over its parent's? */
  private isPartOfParent(shape: BubblyBlockShape, view: View): boolean {
    return view.partsOfParents.has(shape)
  }

  /**
   * How much lower `shape`'s foot goes than a foot right under its last line:  0 unless a block in it ends there too.
   * - Then that block's foot goes first, and this one under it,
   *   as far below it as this one's rail is left of that one's (Owen, 2026-11-11:
   *   the feet as far apart down as the rails across).
   * - A group in it has no foot:  the block in the group that ends there counts, as if it were the parent's own.
   */
  private footDrop(shape: BubblyBlockShape, view: View): number {
    const known = view.footDrops.get(shape)
    if (known !== undefined) return known
    const { measures } = view
    const inner = this.innerFoot(shape, view.ranges[shape.place]!.endLineNumber, view)
    const drop = !inner
      ? 0
      : this.footDrop(inner, view) +
        measures.footHeight +
        Math.max(0, this.railX(inner, view) - (this.railX(shape, view) + measures.gutter))
    view.footDrops.set(shape, drop)
    return drop
  }

  /** The block inside `shape`, through any group, that ends on `lastLine` with a foot of its own. */
  private innerFoot(shape: BubblyBlockShape, lastLine: number, view: View): BubblyBlockShape | undefined {
    for (const inner of shape.inside) {
      const range = inner.kind === "block" ? view.ranges[inner.place] : undefined
      if (inner.kind !== "block" || !range || range.endLineNumber !== lastLine) continue
      if (this.isPartOfParent(inner, view)) return this.innerFoot(inner, lastLine, view)
      if (inner.hasBody && range.endLineNumber > range.startLineNumber) return inner
    }
    return undefined
  }

  /** Where `shape`'s rail starts:  at its band's round left end. */
  private railX(shape: BubblyBlockShape, view: View): number {
    return view.lefts.get(shape)!
  }

  /** The elements of `shapes`, those inside each in its own. */
  private drawAll(shapes: BubblyShape[], view: View): HTMLElement[] {
    const elements: HTMLElement[] = []
    for (const shape of shapes) {
      const range = view.ranges[shape.place]
      if (!range) continue
      if (shape.kind === "block") {
        const block = this.drawBlock(shape, range, view)
        if (block) elements.push(block)
      } else if (range.startLineNumber >= view.first && range.startLineNumber <= view.last) {
        const element = this.drawInput(shape.isChoice, range, view)
        if (element) elements.push(element)
      }
    }
    return elements
  }

  /**
   * A declaration:  its band (on its head's line, if shown), its gutter, body and foot (if it has a body that isn't
   * folded away), then what's inside it;  `undefined` when none of it is in view.
   */
  private drawBlock(shape: BubblyBlockShape, range: monaco.Range, view: View): HTMLElement | undefined {
    const { editor } = this
    const { measures, lineHeight } = view
    const headLine = range.startLineNumber
    const lastLine = range.endLineNumber
    if (lastLine < view.first - 1 || headLine > view.last) return undefined
    const block = element(`bubbly-block bubbly-${shape.partOfSpeech}${shape.isGroup ? " bubbly-group" : ""}`)
    block.classList.add(`bubbly-level-${shape.level}`)
    const headTop = editor.getTopForLineNumber(headLine)
    const lastTop = editor.getTopForLineNumber(lastLine)
    const hasBody = shape.hasBody && lastTop > headTop
    // a group drawn as part of its parent:  its band, and its rail over its parent's down to its last line
    const isPartOfParent = this.isPartOfParent(shape, view)
    const left = view.lefts.get(shape)!
    if (headLine >= view.first) {
      const ends = shape.ends
      const lineEnd = this.xOf(headLine, editor.getModel()!.getLineMaxColumn(headLine))
      const right = !ends.endsWithInput
        ? lineEnd + measures.padRight
        : lineEnd + (ends.endsQuoted ? measures.quoteRoom : measures.inputRoom) + measures.endInset
      const band = element(hasBody ? "bubbly-head" : "bubbly-pill")
      if (ends.startsWithInput) band.classList.add("bubbly-starts-input")
      if (ends.endsWithInput) band.classList.add("bubbly-ends-input")
      block.append(place(band, { left, top: headTop + lineHeight / 2, width: right - left }, measures.scale))
    }
    if (hasBody && isPartOfParent) {
      const bodyTop = headTop + (lineHeight + measures.pillHeight) / 2
      const height = lastTop + lineHeight - bodyTop
      block.append(place(element("bubbly-gutter"), { left, top: bodyTop, height }, measures.scale))
    } else if (hasBody) {
      const bodyTop = headTop + (lineHeight + measures.pillHeight) / 2
      const lastBottom = lastTop + lineHeight
      const footTop = lastBottom + measures.footRoom - measures.footHeight + this.footDrop(shape, view)
      const height = footTop - bodyTop
      const gutter = this.railX(shape, view)
      block.append(
        place(element("bubbly-gutter"), { left: gutter, top: bodyTop, height }, measures.scale),
        place(
          element("bubbly-body"),
          { left: gutter + measures.gutter, top: bodyTop, height, width: view.width - gutter },
          measures.scale
        ),
        place(element("bubbly-foot"), { left: gutter, top: footTop }, measures.scale)
      )
    }
    block.append(...this.drawAll(shape.inside, view))
    return block
  }

  /** A pill under the words in `range`:  from the room before them to the end of the room after. */
  private drawInput(isChoice: boolean, range: monaco.Range, view: View): HTMLElement | undefined {
    const { measures, lineHeight } = view
    const line = range.startLineNumber
    if (range.endLineNumber !== line) return undefined
    const left = this.xOf(line, range.startColumn)
    const right = this.xOf(line, range.endColumn) + measures.inputRoom
    const top = this.editor.getTopForLineNumber(line) + lineHeight / 2
    const pill = element(isChoice ? "bubbly-input bubbly-choice" : "bubbly-input")
    return place(pill, { left, top, width: right - left }, measures.scale)
  }

  ////////////////
  // ## Room under each declaration
  ////////////////

  /**
   * A view zone under each line that ends declarations with a body:  room for their feet,
   * and the gap from the lowest to the band on the next line (`--bubbly-line-gap`);  if they've moved.
   */
  private updateZones(laidOut: BubblyMarks, view: View) {
    const room = new Map<number, number>()
    const measure = (shapes: BubblyShape[]) => {
      for (const shape of shapes) {
        if (shape.kind !== "block") continue
        const range = view.ranges[shape.place]
        // a group drawn as part of its parent has no foot:  its parent's, or its last member's, marks its end
        const hasFoot = !this.isPartOfParent(shape, view)
        if (range && hasFoot && shape.hasBody && range.endLineNumber > range.startLineNumber) {
          // its lowest foot's bottom, then the gap to the band on the next line, whose top is down its line a little
          const { footRoom, footGap, pillHeight } = view.measures
          const footBottom = footRoom + this.footDrop(shape, view)
          const below = Math.max(footBottom, footBottom + footGap - (view.lineHeight - pillHeight) / 2)
          room.set(range.endLineNumber, Math.max(room.get(range.endLineNumber) ?? 0, below))
        }
        measure(shape.inside)
      }
    }
    measure(laidOut.shapes)
    this.setZones([...room].map(([line, height]) => ({ afterLineNumber: line, heightInPx: Math.round(height) })))
  }

  /** Make the view zones `zones`, unless they're the ones there now. */
  private setZones(zones: Array<{ afterLineNumber: number; heightInPx: number }>) {
    const key = JSON.stringify(zones)
    if (key === this.zonesKey) return
    this.zonesKey = key
    this.editor.changeViewZones((accessor) => {
      for (const id of this.zoneIds) accessor.removeZone(id)
      this.zoneIds = zones.map((zone) => accessor.addZone({ ...zone, domNode: document.createElement("div") }))
    })
  }

  ////////////////
  // ## Where Monaco draws
  ////////////////

  /** Where the letter at `column` of `line` starts, before any room injected there:  from the line's start, px. */
  private xOf(line: number, column: number): number {
    return Math.max(0, this.editor.getOffsetForColumn(line, column))
  }

  /**
   * Where `line`'s words start, past its indent:  from its tabs and spaces, so it's known for a line Monaco hasn't
   * drawn (a declaration whose head is scrolled away).
   */
  private wordsX(line: number): number {
    const { editor } = this
    const model = editor.getModel()!
    const { spaceWidth } = editor.getOption(monaco.editor.EditorOption.fontInfo)
    return indentColumns(model.getLineContent(line), model.getOptions().tabSize) * spaceWidth
  }

  /**
   * The sheet's sizes, in the editor's pixels, read off the page once (and again when the font changes):
   * a probe in the editor's box, sized by each `--bubbly-` setting;  and the room injected beside an input, as wide as
   * its own rule makes it.
   */
  private measures(): Measures {
    if (this.measured) return this.measured
    const { editor } = this
    const container = editor.getContainerDomNode()
    const { fontSize } = editor.getOption(monaco.editor.EditorOption.fontInfo)
    const probe = element("bubbly-monaco-probe")
    container.append(probe)
    const length = (variable: string) => {
      probe.style.width = `var(${variable})`
      return probe.getBoundingClientRect().width
    }
    /** How wide the room injected with `classes` is:  its own rule's width, at the editor's scale. */
    const roomWidth = (classes: string) => {
      const room = Object.assign(document.createElement("span"), { className: `bubbly-room ${classes}` })
      probe.append(room)
      const width = room.getBoundingClientRect().width
      room.remove()
      return width
    }
    const scale = fontSize / (length("--bubbly-font-size") || fontSize)
    container.style.setProperty("--bubbly-monaco-scale", String(scale))
    const ratio = Number.parseFloat(getComputedStyle(container).getPropertyValue("--bubbly-monaco-line-height")) || 1.5
    this.measured = {
      scale,
      lineHeight: Math.round(fontSize * ratio),
      inputRoom: roomWidth("bubbly-room-input"),
      quoteRoom: roomWidth("bubbly-room-quote"),
      padLeft: length("--bubbly-pill-pad-left") * scale,
      padRight: length("--bubbly-pill-pad-right") * scale,
      endInset: length("--bubbly-end-inset") * scale,
      gutter: length("--bubbly-gutter") * scale,
      pillHeight: length("--bubbly-pill-height") * scale,
      footHeight: length("--bubbly-foot-height") * scale,
      footRoom: (length("--bubbly-foot-height") + length("--bubbly-body-pad-bottom")) * scale,
      footGap: length("--bubbly-line-gap") * scale
    }
    probe.remove()
    return this.measured
  }

  ////////////////
  // ## State
  ////////////////

  /** Never drawn:  `leaveOut()`. */
  private isLeftOut = false

  /** The editor's decorations:  the marks. */
  private marks: monaco.editor.IEditorDecorationsCollection | undefined

  /** The layer behind the editor, and the shapes in it, while drawing. */
  private layer: HTMLElement | undefined
  private shapes: HTMLElement | undefined

  /** The view zones under declarations, and what they were made from. */
  private zoneIds: string[] = []
  private zonesKey = "[]"

  /** The line height the editor had before:  put back when it stops drawing. */
  private lineHeightBefore = 0

  /** The sheet's sizes, once read. */
  private measured: Measures | undefined

  /** The wait before laying out again. */
  private relayoutTimer: ReturnType<typeof setTimeout> | undefined

  /** A redraw is waiting for the next frame. */
  private isRedrawQueued = false

  /** How many times running it's laid out again, waiting for its project to parse its text. */
  private parseWaits = 0
}

////////////////
// ## Types and helpers
////////////////

/** The sheet's sizes, in the editor's pixels, but `scale` and `lineHeight`. */
type Measures = {
  /** the editor's font size over the drawing's, `--bubbly-font-size`:  the layer is drawn at this scale */
  scale: number
  /** the editor's line height while drawing:  its font size times `--bubbly-monaco-line-height` */
  lineHeight: number
  /** the room either side of a pill's words */
  inputRoom: number
  /** the room outside a quoted input's marks */
  quoteRoom: number
  /** a band's room before its words, and after them */
  padLeft: number
  padRight: number
  /** a band's room after a pill it ends with */
  endInset: number
  /** the gutter's width */
  gutter: number
  /** a band's height */
  pillHeight: number
  /** a foot's height, and the room each foot takes under its body */
  footHeight: number
  footRoom: number
  /** the paper between a body's lowest foot and the band on the line under it */
  footGap: number
}

/** What a redraw knows. */
type View = {
  /** each mark's range now, by index */
  ranges: monaco.Range[]
  /** where each block's band starts:  `placeBands()` */
  lefts: Map<BubblyBlockShape, number>
  /** the groups drawn as part of their parent:  `placeBands()` */
  partsOfParents: Set<BubblyBlockShape>
  /** how much lower each block's foot goes than one right under its last line, once worked out:  `footDrop()` */
  footDrops: Map<BubblyBlockShape, number>
  /** the first and last lines shown */
  first: number
  last: number
  measures: Measures
  lineHeight: number
  /** how wide the code is:  a body's paper reaches past it */
  width: number
}

/** How long typing pauses before the code is laid out again:  the marks follow the text till then. */
const RELAYOUT_MSEC = 300

/** How many times it lays out again, `RELAYOUT_MSEC` apart, waiting for its project to parse what was typed. */
const PARSE_WAITS = 20

/** The classes that make an editor's box a drawing. */
const BOX_CLASSES = ["bubbly", "bubbly-monaco"]

/** A shape's element, its classes `classes`. */
function element(classes: string): HTMLElement {
  return Object.assign(document.createElement("div"), { className: classes })
}

/**
 * Put `shape` where `at` says, in the editor's pixels from the code's top left:  the layer draws at `scale`.
 * - Where only:  how each shape looks is the sheet's.
 */
function place(shape: HTMLElement, at: Partial<Record<"left" | "top" | "width" | "height", number>>, scale: number) {
  for (const [side, value] of Object.entries(at)) shape.style.setProperty(side, `${value / scale}px`)
  return shape
}

/** The parser that reads `model`'s Spell:  its file's language (`Carta.es.spell`), else English. */
function parserFor(model: monaco.editor.ITextModel): SP.SpellParser {
  try {
    return SP.Language.forFile(model.uri.path).parser
  } catch {
    return SP.spellParser
  }
}
