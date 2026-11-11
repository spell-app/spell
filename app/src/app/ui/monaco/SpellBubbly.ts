import { SP } from "spell/parser/spell"
import { codeLook } from "spell/app/app/ui/codePopups"
import { monaco } from "./monaco"
import { BubblyMarks, indentColumns, type BubblyBlockShape, type BubblyShape } from "./BubblyMarks"

import "spell/app/app/components/spell-code/bubbly.css"

/****************
 * ### `SpellBubbly`
 * Spell in a Monaco editor drawn in the BUBBLY LOOK as it's typed (epic `language` P50), while its text stays
 * ordinary text to edit:  the look `<spell-code>` draws on a page, from the same layout and the same sheet.
 * - One per editor, made as each editor is (`watch()`, from `SpellMonaco.register()`).
 * - It lays the code out with the parser (`SP.BubblyLayout`, by `SP.BubblyPresentation`'s table), then:
 *   - marks the text:  each piece's weight, slant and ink, room round what a person typed, a quoted input's curly
 *     marks, room pushing a group's members past its rail (`BubblyMarks`, Monaco decorations)
 *   - draws the shapes UNDER the text, in a layer behind the editor (`bubbly-layer`):  each declaration's band,
 *     gutter, body and foot, a pill under each input, a control line's bracket;  placed from where Monaco draws each
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
      const drawing = SP.BubblyLayout.of(model.getValue(), parserFor(model))
      this.laidOut = BubblyMarks.of(drawing, model.getOptions().tabSize)
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
    this.updateZones(laidOut, ranges)
    // its lines drawn as they are now, zones and all, before we ask where
    editor.render()
    this.follow()
    const visible = editor.getVisibleRanges()
    if (!visible.length) return shapes.replaceChildren()
    const view: View = {
      ranges,
      pushes: this.pushesByLine(laidOut, ranges),
      first: visible[0]!.startLineNumber,
      last: visible.at(-1)!.endLineNumber,
      measures: this.measures(),
      lineHeight: editor.getOption(monaco.editor.EditorOption.lineHeight),
      width: editor.getLayoutInfo().contentWidth + editor.getScrollWidth()
    }
    shapes.replaceChildren(...this.drawAll(laidOut.shapes, view))
  }

  /**
   * The elements of `shapes`, those inside each in its own.
   * - `floor`:  the left-most a band may start, so a group's members never cover its rail (below)
   * - `parentLeft`:  where the band of the block they're in starts, so a group keeps its members as far from its
   *   rail as it is from its parent's
   */
  private drawAll(shapes: BubblyShape[], view: View, floor = -Infinity, parentLeft?: number): HTMLElement[] {
    const elements: HTMLElement[] = []
    for (const shape of shapes) {
      const range = view.ranges[shape.place]
      if (!range) continue
      if (shape.kind === "block") {
        const block = this.drawBlock(shape, range, view, floor, parentLeft)
        if (block) elements.push(block)
      } else if (range.startLineNumber >= view.first && range.startLineNumber <= view.last) {
        const element =
          shape.kind === "input" ? this.drawInput(shape.isChoice, range, view) : this.drawBracket(range, view)
        if (element) elements.push(element)
      }
    }
    return elements
  }

  /**
   * A declaration:  its band (on its head's line, if shown), its gutter, body and foot (if it has a body that isn't
   * folded away), then what's inside it;  `undefined` when none of it is in view.
   */
  private drawBlock(
    shape: BubblyBlockShape,
    range: monaco.Range,
    view: View,
    floor: number,
    parentLeft: number | undefined
  ): HTMLElement | undefined {
    const { editor } = this
    const { measures, lineHeight } = view
    const headLine = range.startLineNumber
    const lastLine = range.endLineNumber
    const feet = this.feetUnder(shape, view)
    if (lastLine < view.first - 1 || headLine > view.last) return undefined
    const block = element(`bubbly-block bubbly-${shape.partOfSpeech}${shape.isGroup ? " bubbly-group" : ""}`)
    block.classList.add(`bubbly-level-${shape.level}`)
    const headTop = editor.getTopForLineNumber(headLine)
    const lastTop = editor.getTopForLineNumber(lastLine)
    const hasBody = shape.hasBody && lastTop > headTop
    const left = Math.max(this.wordsX(headLine, view) - measures.padLeft, floor)
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
    if (hasBody) {
      const bodyTop = headTop + (lineHeight + measures.pillHeight) / 2
      const lastBottom = lastTop + lineHeight
      const footTop = lastBottom + (feet + 1) * measures.footRoom - measures.footHeight
      const height = footTop - bodyTop
      const gutter = left
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
    // A group's members are written at its own indent, so their bands would start on its rail:
    // they start just past it instead, their words where they are (Owen, 2026-11-11)
    // ... as far past it as the group is past its own parent's rail:  the rails evenly spaced
    const railGap = Math.max(
      GROUP_RAIL_GAP * measures.scale,
      parentLeft === undefined ? 0 : left - parentLeft - measures.gutter
    )
    const insideFloor = shape.isGroup && hasBody ? left + measures.gutter + railGap : floor
    block.append(...this.drawAll(shape.inside, view, insideFloor, hasBody ? left : parentLeft))
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

  /** A control line's bracket:  down from its line, halfway between it and its steps, to its last step. */
  private drawBracket(range: monaco.Range, view: View): HTMLElement {
    const { editor } = this
    const model = editor.getModel()!
    const headLine = range.startLineNumber
    let stepLine = headLine + 1
    while (stepLine < range.endLineNumber && !model.getLineContent(stepLine).trim()) stepLine++
    const left = (this.wordsX(headLine, view) + this.wordsX(stepLine, view)) / 2
    const top = editor.getTopForLineNumber(headLine) + view.lineHeight
    const bottom = editor.getTopForLineNumber(range.endLineNumber) + view.lineHeight
    return place(element("bubbly-bracket"), { left, top, height: bottom - top }, view.measures.scale)
  }

  /**
   * How many declarations inside `shape` end on its last line, with a foot of their own:  their feet go first,
   * under its last line, then its own.
   */
  private feetUnder(shape: BubblyBlockShape, view: View): number {
    const lastLine = view.ranges[shape.place]!.endLineNumber
    let feet = 0
    const count = (inside: BubblyShape[]) => {
      for (const each of inside) {
        if (each.kind !== "block") continue
        if (each.hasBody && view.ranges[each.place]?.endLineNumber === lastLine) feet++
        count(each.inside)
      }
    }
    count(shape.inside)
    return feet
  }

  ////////////////
  // ## Room under each declaration
  ////////////////

  /** A view zone under each line that ends declarations with a body, as tall as their feet:  if they've moved. */
  private updateZones(laidOut: BubblyMarks, ranges: monaco.Range[]) {
    const feet = new Map<number, number>()
    const count = (shapes: BubblyShape[]) => {
      for (const shape of shapes) {
        if (shape.kind !== "block") continue
        const range = ranges[shape.place]
        if (range && shape.hasBody && range.endLineNumber > range.startLineNumber)
          feet.set(range.endLineNumber, (feet.get(range.endLineNumber) ?? 0) + 1)
        count(shape.inside)
      }
    }
    count(laidOut.shapes)
    const { footRoom, scale } = this.measures()
    this.setZones([...feet].map(([line, count]) => ({ afterLineNumber: line, heightInPx: count * footRoom * scale })))
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
   * Where `line`'s words are drawn, past its indent and the room pushing it, if it's a group's member:
   * from its tabs and spaces, so it's known for a line Monaco hasn't drawn (a declaration whose head is scrolled away).
   */
  private wordsX(line: number, view: View): number {
    const { editor } = this
    const model = editor.getModel()!
    const { spaceWidth } = editor.getOption(monaco.editor.EditorOption.fontInfo)
    const columns = indentColumns(model.getLineContent(line), model.getOptions().tabSize)
    return (columns + (view.pushes.get(line) ?? 0)) * spaceWidth
  }

  /** How many columns of room push each line's words right, by line, as Monaco has the marks now. */
  private pushesByLine(laidOut: BubblyMarks, ranges: monaco.Range[]): Map<number, number> {
    const pushes = new Map<number, number>()
    for (const index of laidOut.pushes) {
      const line = ranges[index]?.startLineNumber
      const columns = laidOut.marks[index]!.options.before?.content.length ?? 0
      if (line) pushes.set(line, (pushes.get(line) ?? 0) + columns)
    }
    return pushes
  }

  /**
   * The sheet's sizes, in the editor's pixels, read off the page once (and again when the font changes):
   * a probe in the editor's box, sized by each `--bubbly-` variable.
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
    const scale = fontSize / (length("--bubbly-font-size") || fontSize)
    container.style.setProperty("--bubbly-monaco-scale", String(scale))
    const ratio = Number.parseFloat(getComputedStyle(container).getPropertyValue("--bubbly-monaco-line-height")) || 1.5
    this.measured = {
      scale,
      lineHeight: Math.round(fontSize * ratio),
      inputRoom: length("--bubbly-monaco-input-room"),
      quoteRoom: length("--bubbly-monaco-quote-room"),
      padLeft: length("--bubbly-pill-pad-left") * scale,
      padRight: length("--bubbly-pill-pad-right") * scale,
      endInset: length("--bubbly-end-inset") * scale,
      gutter: length("--bubbly-gutter") * scale,
      pillHeight: length("--bubbly-monaco-band-height") * scale,
      footHeight: length("--bubbly-foot-height") * scale,
      footRoom: length("--bubbly-monaco-foot-room") * scale
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
}

/** What a redraw knows. */
type View = {
  /** each mark's range now, by index */
  ranges: monaco.Range[]
  /** how many columns of room push each line's words right, by line:  `BubblyMarks.pushes` */
  pushes: Map<number, number>
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

/** The least paper between a group's rail and its members' bands, in the drawing's pixels. */
const GROUP_RAIL_GAP = 2

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
