import { SP } from "spell/parser/spell"
import { codeLook } from "spell/app/app/ui/codePopups"
import { monaco } from "./monaco"
import { AppAddresses } from "./AppAddresses"
import {
  BubblyMarks,
  indentColumns,
  type BubblyBlockShape,
  type BubblyInputShape,
  type BubblyShape
} from "./BubblyMarks"
import {
  MarkupMarks,
  type MarkupBlockShape,
  type MarkupLinkShape,
  type MarkupShape,
  type MarkupTagShape,
  type TagRoom
} from "./MarkupMarks"

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
 *   - or it's an HTML file (`.html`):  drawn as the drawn-bubbly page draws HTML (`MarkupMarks`), the box a
 *     `.bubbly-html` too, so the sheet's HTML settings reach it
 *   - either side of a diff too (`<DiffView>`, epic `editor` T75):  Monaco's diff editor lines its two sides up
 *     round each side's own view zones, and the taller lines are the same on both
 * - A `<CodeSlice>`'s editor, a few lines of a file alone, is drawn too (`showSlice()`, epic `editor` T72):
 *   only what's wholly in its lines;  the declaration whose body it shows draws nothing of its own.
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

  /**
   * Draw `editor` as a slice of its file (`<CodeSlice>`):  only the shapes wholly in `shown()`, its other lines hidden.
   * - A declaration it shows only part of, e.g. the action whose body it is, draws nothing of its own:
   *   its band, rail and foot would be cut off at the slice's edges, and its room under its last line too.
   *   What's inside it is drawn as usual.
   * - `shown` `undefined`:  the editor is kept out of the page (`SlicePool`), so it isn't laid out or drawn
   *   till it's shown again;  its marks stay, so its lines needn't be measured again.
   */
  static showSlice(editor: monaco.editor.ICodeEditor, shown: (() => monaco.IRange | null) | undefined): void {
    const drawing = SpellBubbly.drawings.get(editor)
    if (!drawing) return
    drawing.slice = shown ? { shown } : { shown: () => null, isKept: true }
    if (shown) drawing.refreshSoon()
  }

  /** The drawing of `editor`, if it has one:  for tests and a look in devtools. */
  static of(editor: monaco.editor.ICodeEditor): SpellBubbly | undefined {
    return SpellBubbly.drawings.get(editor)
  }

  /** Each editor's drawing. */
  private static drawings = new WeakMap<monaco.editor.ICodeEditor, SpellBubbly>()

  /** Each model's Spell as last laid out, for its text's version and its project's parse of it:  `spellMarks()`. */
  private static laidOutByModel = new WeakMap<
    monaco.editor.ITextModel,
    { version: number; parse: SP.SpellFile["match"]; marks: BubblyMarks }
  >()

  /** Is it drawing now? */
  isDrawing = false

  /** The marks and shapes it last laid out. */
  laidOut: BubblyMarks | MarkupMarks | undefined

  private constructor(
    private readonly editor: monaco.editor.ICodeEditor,
    private readonly languages: readonly string[]
  ) {
    // in a microtask, never in the middle of Monaco's own work:  Monaco gives a new editor its model inside
    // `create()`, before whoever made it can say it's a slice (`<CodeSlice>`'s `showSlice()`)
    const later = () => this.refreshSoon()
    const redrawSoon = () => this.redrawSoon()
    codeLook.followers.add(later)
    editor.onDidChangeModel(later)
    editor.onDidChangeModelLanguage(later)
    editor.onDidChangeModelContent(({ changes }) => {
      if (!this.isDrawing) return
      this.relayoutSoon()
      // a slice's shapes stay put through an edit to other lines of its file:  drawn again once it's laid out
      if (changes.some(({ range }) => this.isNearShown(range))) this.redrawSoon()
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
    later()
  }

  ////////////////
  // ## Drawing, or not
  ////////////////

  /** Start or stop drawing, as the setting, the model and its text say;  lay it out again if drawing. */
  refresh(): void {
    // a slice kept out of the page:  laid out again once it's shown
    if (this.slice?.isKept) return
    if (this.shouldDraw()) {
      // from Spell to HTML or back:  its box's classes and the sheet's sizes change
      if (this.isDrawing && this.isMarkup !== isMarkupFile(this.editor.getModel()!)) this.stop()
      if (!this.isDrawing) this.start()
      this.relayout()
    } else if (this.isDrawing) this.stop()
  }

  /** `refresh()` in a microtask, once however many ask first. */
  private refreshSoon() {
    if (this.isRefreshQueued) return
    this.isRefreshQueued = true
    queueMicrotask(() => {
      this.isRefreshQueued = false
      this.refresh()
    })
  }

  /** Should it draw now? */
  private shouldDraw(): boolean {
    const { editor } = this
    const model = editor.getModel()
    if (!codeLook.isBubbly || !model) return false
    if (isMarkupFile(model)) return true
    return this.languages.includes(model.getLanguageId()) && SP.formOfText(model.getValue()) !== "page"
  }

  /** Start drawing:  the editor's box a `.bubbly`, its lines taller, a layer for the shapes behind it. */
  private start() {
    const { editor } = this
    this.isDrawing = true
    this.isMarkup = isMarkupFile(editor.getModel()!)
    this.marks ??= editor.createDecorationsCollection()
    const container = editor.getContainerDomNode()
    container.classList.add(...BOX_CLASSES, ...(this.isMarkup ? [MARKUP_CLASS] : []))
    this.lineHeightBefore = editor.getRawOptions().lineHeight ?? 0
    this.measured = undefined
    const measures = this.measures()
    editor.updateOptions({ lineHeight: measures.lineHeight })
    this.layer = Object.assign(document.createElement("div"), { className: "bubbly-layer" })
    this.shapes = Object.assign(document.createElement("div"), { className: "bubbly-shapes" })
    this.layer.append(this.shapes)
    container.prepend(this.layer)
    this.descriptionSheet = Object.assign(document.createElement("style"), { className: "bubbly-description-sheet" })
    container.dataset.bubblySheet = String(++SpellBubbly.sheets)
    container.append(this.descriptionSheet)
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
    this.descriptionSheet?.remove()
    this.descriptionSheet = undefined
    this.descriptionWidths.clear()
    this.descriptionWordWidths.clear()
    editor.getContainerDomNode().classList.remove(...BOX_CLASSES, MARKUP_CLASS)
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
      if (this.isMarkup) {
        this.laidOut = MarkupMarks.of(model.getValue())
        this.marks!.set(this.withShortFootLines(this.laidOut))
        return this.redraw()
      }
      const laidOut = this.spellMarks(model)
      // the marks it has already, e.g. a slice shown again (`showSlice()`):  only drawn again
      if (laidOut === this.laidOut) return this.redraw()
      this.laidOut = laidOut
      this.marks!.set(this.withShortFootLines(this.laidOut))
      this.resetDescriptions()
    } catch (error) {
      console.error("SpellBubbly.relayout():  couldn't lay the code out", error)
      this.laidOut = undefined
      this.marks?.clear()
    }
    this.redraw()
  }

  /**
   * `model`'s Spell laid out and marked:  the one laid out last for its text and its project's parse of it,
   * so a file's editors share it (the code pane, each `<CodeSlice>` of it:  ~100ms each for Solitaire's main file).
   * - throws if the layout does
   */
  private spellMarks(model: monaco.editor.ITextModel): BubblyMarks {
    // its project's parse of it, if it's a project's file:  what the compiler sees, names from other files too
    const path = AppAddresses.pathOf(model.uri)
    const within = path === undefined ? undefined : SP.SpellFile.registry.get(path)
    const version = model.getVersionId()
    const kept = SpellBubbly.laidOutByModel.get(model)
    if (kept && kept.version === version && kept.parse === within?.match) {
      this.parseWaits = 0
      return kept.marks
    }
    const text = model.getValue()
    // typed and not parsed yet (`SpellModels`):  parsed now, so it lays out the project's parse, not a reading of its own
    if (within?.project.isTextWaiting) void within.project.parseWaitingText().catch(() => undefined)
    const drawing = SP.BubblyLayout.of(text, parserFor(model), { within })
    const marks = BubblyMarks.of(drawing, model.getOptions().tabSize, (tag) => isViewTag(within, tag))
    // the project hasn't parsed this text yet:  read alone for now, and again once it has;  kept only once it has
    const isWaiting = !!within && !SP.BubblyLayout.isParseOf(within, text)
    if (isWaiting && this.parseWaits++ < PARSE_WAITS) this.relayoutSoon()
    else this.parseWaits = 0
    if (!isWaiting) SpellBubbly.laidOutByModel.set(model, { version, parse: within?.match, marks })
    return marks
  }

  /**
   * Each HTML block's end tag on its own line, `</segment>` or `</>`:  its line only its tiny pill's row tall
   * (`--bubbly-foot-tiny-row`, Owen, Q61), so nested ones stack close, as on the page.
   * - Monaco's own line height for the lines a mark spans (`lineHeight`, a multiple of the editor's):
   *   on the mark holding the end tag's place.
   */
  private withShortFootLines(laidOut: BubblyMarks | MarkupMarks): monaco.editor.IModelDeltaDecoration[] {
    const { footTinyRow, lineHeight } = this.measures()
    const multiple = footTinyRow / lineHeight
    // a copy:  the marks are shared by the file's editors (`spellMarks()`), each its own line height
    const marks = [...laidOut.marks]
    const shorten = (shapes: Shape[]) => {
      for (const shape of shapes) {
        if (shape.kind === "markup-block" && shape.foot !== undefined) {
          const mark = marks[shape.foot]!
          marks[shape.foot] = { ...mark, options: { ...mark.options, lineHeight: multiple } }
        }
        if ("inside" in shape) shorten(shape.inside)
      }
    }
    shorten(laidOut.shapes)
    return marks
  }

  ////////////////
  // ## Drawing the shapes
  ////////////////

  /** Draw the shapes again before the next paint, once however many changes come first. */
  private redrawSoon() {
    if (!this.isDrawing || this.isRedrawQueued || this.slice?.isKept) return
    this.isRedrawQueued = true
    requestAnimationFrame(() => {
      this.isRedrawQueued = false
      if (this.isDrawing && !this.slice?.isKept) this.redraw()
    })
  }

  /** Move the shapes with the text as it scrolls, till they're drawn again. */
  private follow() {
    if (!this.layer) return
    const { editor } = this
    const { contentLeft } = editor.getLayoutInfo()
    this.layer.style.setProperty("--bubbly-monaco-x", `${contentLeft - editor.getScrollLeft()}px`)
    this.layer.style.setProperty("--bubbly-monaco-y", `${-editor.getScrollTop()}px`)
    // scrolled sideways:  the shapes stop where the text does, never over the gutter (epic `language` r19)
    this.layer.style.setProperty("--bubbly-monaco-clip", `${editor.getScrollLeft() > 0 ? contentLeft : 0}px`)
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
    // a line scrolled partly out of view is drawn by Monaco, but left out of its visible ranges:  its shapes too
    while (view.first > 1 && this.isDrawnByMonaco(view.first - 1)) view.first--
    while (view.last < editor.getModel()!.getLineCount() && this.isDrawnByMonaco(view.last + 1)) view.last++
    // each head's description against the window's edge:  its lines drawn again, so Monaco measures them anew
    if (this.fitDescriptions(laidOut.shapes, view)) editor.render(true)
    shapes.replaceChildren(...this.drawAll(laidOut.shapes, view))
  }

  ////////////////
  // ## Descriptions at the window's edge
  ////////////////

  /**
   * Widen the spacer before each shown head's description, `-- A playing card`, so it ends at the window's right
   * edge, a band's padding in, its band reaching there too (Owen);  returns whether any changed.
   * - The window's edge where it's scrolled to, NOT the widest line's:  but never past where the code alone could be
   *   scrolled, or each scroll to the right would make room to scroll further (`naturalWidth`).
   * - Too narrow a window:  no room, the description right after the code as before.
   * - Each spacer's width is a rule in the editor's own sheet (`bubbly-description-<n>`):  a decoration's class
   *   can't change without the text being marked again.
   */
  private fitDescriptions(shapes: Shape[], view: View): boolean {
    const { editor } = this
    const layout = editor.getLayoutInfo()
    // the text's width in the window:  its content less the scrollbar over its right side
    const shown = layout.contentWidth - layout.verticalScrollbarWidth
    // what the code alone needs, read while every spacer is empty:  just after it's laid out
    this.naturalWidth ??= editor.getScrollWidth()
    const right = Math.min(editor.getScrollLeft() + shown, Math.max(shown, this.naturalWidth)) - view.measures.padRight
    let isChanged = false
    const fit = (shapes: Shape[]) => {
      for (const shape of shapes) {
        if (shape.kind !== "block") continue
        const range = shape.description && view.ranges[shape.description.place]
        const line = range?.startLineNumber ?? 0
        if (range && line >= view.first && line <= view.last) {
          const { spacer } = shape.description!
          const was = this.descriptionWidths.get(spacer) ?? 0
          // where its spacer starts:  Monaco's place for a column is before the room injected there
          const start = this.xOf(line, range.startColumn)
          const words = this.descriptionWords(spacer, line, range)
          const width = Math.max(0, Math.round(right - start - words))
          if (width !== was) {
            this.descriptionWidths.set(spacer, width)
            isChanged = true
          }
        }
        fit(shape.inside)
      }
    }
    fit(shapes)
    if (isChanged) this.writeDescriptionSheet()
    return isChanged
  }

  /**
   * How wide a description's words are, `-- A playing card`:  read while its spacer is still empty, and kept.
   * - HACK:  Monaco's place for the END of a line whose spacer is wider than its sheet first said counts that spacer
   *   twice (measured:  865px for a line its page draws 653px wide, its spacer 212px);  a place inside it is right.
   */
  private descriptionWords(spacer: string, line: number, range: monaco.IRange): number {
    let words = this.descriptionWordWidths.get(spacer)
    if (words === undefined) {
      words = this.xOf(line, range.endColumn) - this.xOf(line, range.startColumn)
      this.descriptionWordWidths.set(spacer, words)
    }
    return words
  }

  /** Where a head's line ends, when it ends in a description `fitDescriptions()` has placed. */
  private descriptionEnd(shape: BubblyBlockShape, view: View): number | undefined {
    const range = shape.description && view.ranges[shape.description.place]
    const width = shape.description && this.descriptionWidths.get(shape.description.spacer)
    if (!range || width === undefined) return undefined
    const words = this.descriptionWordWidths.get(shape.description!.spacer)!
    return this.xOf(range.startLineNumber, range.startColumn) + width + words
  }

  /** Every description's spacer empty again, and the code's own width read afresh:  its marks were made anew. */
  private resetDescriptions() {
    this.naturalWidth = undefined
    this.descriptionWordWidths.clear()
    if (!this.descriptionWidths.size) return
    this.descriptionWidths.clear()
    this.writeDescriptionSheet()
    this.editor.render(true)
  }

  /** The editor's own sheet:  each description's spacer as wide as `fitDescriptions()` worked out. */
  private writeDescriptionSheet() {
    if (!this.descriptionSheet) return
    // as strong as the sheet's rule for every such spacer, and more:  `.bubbly.bubbly-monaco .bubbly-description-spacer`
    const box = `[data-bubbly-sheet="${this.editor.getContainerDomNode().dataset.bubblySheet}"].bubbly.bubbly-monaco`
    this.descriptionSheet.textContent = [...this.descriptionWidths]
      .map(([spacer, width]) => `${box} .${spacer} { width: ${width}px; }`)
      .join("\n")
  }

  /**
   * Where the band of each block in `shapes` starts, those inside each too, into `view.lefts`:
   * from its words, its lines drawn or not;  `parent`:  the block they're in.
   * - A group starts where its parent does (Owen, 2026-11-11):  its grey band grows out of its parent's rail, its
   *   rail over its parent's while it lasts, then its foot;  its members are drawn as the parent's other lines are.
   */
  private placeBands(shapes: Shape[], view: View, parent?: BubblyBlockShape) {
    for (const shape of shapes) {
      const range = view.ranges[shape.place]
      if (shape.kind !== "block" || !range) continue
      // a group starts where its parent does:  its rail on its parent's
      const left =
        shape.isGroup && parent ? view.lefts.get(parent)! : this.wordsX(range.startLineNumber) - view.measures.padLeft
      view.lefts.set(shape, left)
      this.placeBands(shape.inside, view, shape)
    }
  }

  /**
   * How much lower `shape`'s foot goes than a foot right under its last line:  0 unless a block in it ends there too.
   * - Then that block's foot goes first, and this one under it,
   *   as far below it as this one's rail is left of that one's (Owen, 2026-11-11:
   *   the feet as far apart down as the rails across).
   * - A group in it, on its rail, ends in the SAME foot:  its rails 0 apart across, so its feet 0
   *   apart down;  the group's, drawn over it, shows.
   *   Stacked under the group's, they were one foot twice as thick, in two colours (Owen, 2026-11-13:  "end
   *   class/group footers don't line up").
   */
  private footDrop(shape: BubblyBlockShape, view: View): number {
    const known = view.footDrops.get(shape)
    if (known !== undefined) return known
    const { measures } = view
    const inner = this.innerFoot(shape, view.ranges[shape.place]!.endLineNumber, view)
    const railsApart = inner ? this.railX(inner, view) - this.railX(shape, view) : 0
    const drop = !inner
      ? 0
      : railsApart <= 0
        ? this.footDrop(inner, view)
        : this.footDrop(inner, view) + measures.footHeight + Math.max(0, railsApart - measures.gutter)
    view.footDrops.set(shape, drop)
    return drop
  }

  /** The block inside `shape` that ends on `lastLine` with a foot of its own, a group's too. */
  private innerFoot(shape: BubblyBlockShape, lastLine: number, view: View): BubblyBlockShape | undefined {
    for (const inner of shape.inside) {
      const range = inner.kind === "block" ? view.ranges[inner.place] : undefined
      if (inner.kind !== "block" || !range || range.endLineNumber !== lastLine) continue
      if (inner.hasBody && range.endLineNumber > range.startLineNumber) return inner
    }
    return undefined
  }

  /** Where `shape`'s rail starts:  at its band's round left end. */
  private railX(shape: BubblyBlockShape, view: View): number {
    return view.lefts.get(shape)!
  }

  /** The elements of `shapes`, those inside each in its own. */
  private drawAll(shapes: Shape[], view: View): HTMLElement[] {
    const elements: HTMLElement[] = []
    for (const shape of shapes) {
      const range = view.ranges[shape.place]
      if (!range) continue
      // a slice's:  a declaration it shows part of draws only what's inside it, anything else is left out
      if (!this.isShown(range)) {
        if (shape.kind === "block" || shape.kind === "markup-block") elements.push(...this.drawAll(shape.inside, view))
        continue
      }
      if (shape.kind === "block") {
        const block = this.drawBlock(shape, range, view)
        if (block) elements.push(block)
      } else if (shape.kind === "markup-block") {
        const block = this.drawMarkupBlock(shape, range, view)
        if (block) elements.push(this.asHtml(block))
      } else if (range.endLineNumber < view.first || range.startLineNumber > view.last) continue
      else if (shape.kind === "tag") elements.push(this.asHtml(this.drawTag(shape, range, view)))
      else if (shape.kind === "tag-link") elements.push(this.asHtml(this.drawLink(shape, range, view)))
      else if (range.startLineNumber < view.first) continue
      else if (shape.kind === "underline") elements.push(this.drawUnderline(range, view))
      else {
        const element = this.drawInput(shape, range, view)
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
    const left = view.lefts.get(shape)!
    if (headLine >= view.first) {
      const ends = shape.ends
      const lineEnd =
        this.descriptionEnd(shape, view) ?? this.xOf(headLine, editor.getModel()!.getLineMaxColumn(headLine))
      const right = !ends.endsWithInput
        ? lineEnd + measures.padRight
        : lineEnd + (ends.endsQuoted ? measures.quoteSpacer : measures.inputSpacer) + measures.endInset
      const band = element(hasBody ? "bubbly-head-pill" : "bubbly-pill")
      if (ends.startsWithInput) band.classList.add("bubbly-starts-input")
      if (ends.endsWithInput) band.classList.add("bubbly-ends-input")
      block.append(place(band, { left, top: headTop + lineHeight / 2, width: right - left }, measures.scale))
    }
    if (hasBody) {
      const bodyTop = headTop + (lineHeight + measures.pillHeight) / 2
      // its last line may be an HTML end tag's, shorter than the rest (`withShortFootLines()`)
      const lastBottom = lastTop + this.lineHeightOf(lastLine)
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

  /**
   * An HTML element with what's inside it on lines of its own:  its start tag's band, its gutter and body down to its
   * end tag's band (when that starts its line), then what's inside it;  `undefined` when none of it is in view.
   * - Its band starts `blockInset` left of its line's indent:  in a Spell file where a Spell band starts, so its rail
   *   is one indent right of the one it's in (I87);  in an HTML file a bracket's room.
   * - Its words clear of the cut corner by the spacer before the `<` (`bubbly-tag-head-spacer`);
   *   its end tag's band likewise (`bubbly-tag-foot-spacer`).
   * - A start tag on lines of its own:  one tall band (`drawTall()`), its body from under its last line.
   * - Its end tag on its own line, named or `</>`:  a TINY pill at the rail's turn, the body down to it (Q61);
   *   its line only the pill's row tall (`withShortFootLines()`).
   */
  private drawMarkupBlock(shape: MarkupBlockShape, range: monaco.Range, view: View): HTMLElement | undefined {
    const { editor } = this
    const { measures, lineHeight } = view
    const headLine = range.startLineNumber
    const lastLine = range.endLineNumber
    if (lastLine < view.first - 1 || headLine > view.last) return undefined
    const block = element(`bubbly-block bubbly-${shape.partOfSpeech}`)
    const left = this.wordsX(headLine) - measures.blockInset
    const headTop = editor.getTopForLineNumber(headLine)
    const head = view.ranges[shape.head]
    // its start tag's last line:  a tall one's (T118), else its first
    const headEnd = head && head.endLineNumber > headLine ? head.endLineNumber : headLine
    if (headEnd > headLine) {
      const classes = `bubbly-tag-tall bubbly-tag-start bubbly-tag-tall-head${tallEnd(shape)}`
      block.append(this.drawTall(classes, head!, left, view))
    } else if (headLine >= view.first) {
      const endColumn =
        head && head.endLineNumber === headLine ? head.endColumn : editor.getModel()!.getLineMaxColumn(headLine)
      const right = this.xOf(headLine, endColumn) + measures.bracketPad
      const band = element("bubbly-head-pill bubbly-tag-start")
      block.append(place(band, { left, top: headTop + lineHeight / 2, width: right - left }, measures.scale))
    }
    const foot = shape.foot === undefined ? undefined : view.ranges[shape.foot]
    const lastTop = editor.getTopForLineNumber(lastLine)
    const bodyTop = editor.getTopForLineNumber(headEnd) + (lineHeight + measures.pillHeight) / 2
    // the body down to its end tag's tiny pill, the paper's room above it (Q61)
    const bodyBottom = foot ? lastTop + measures.footTinyAbove : lastTop + (lineHeight + measures.pillHeight) / 2
    if (bodyBottom > bodyTop) {
      const height = bodyBottom - bodyTop
      block.append(
        place(element("bubbly-gutter"), { left, top: bodyTop, height }, measures.scale),
        place(
          element("bubbly-body"),
          { left: left + measures.gutter, top: bodyTop, height, width: view.width - left },
          measures.scale
        )
      )
    }
    if (foot && lastLine >= view.first && lastLine <= view.last) {
      const right = this.xOf(lastLine, foot.endColumn) + measures.footTinyPadRight
      const pill = element("bubbly-foot bubbly-foot-tiny bubbly-tag-end")
      block.append(place(pill, { left, top: bodyBottom, width: right - left }, measures.scale))
    }
    block.append(...this.drawAll(shape.inside, view))
    return block
  }

  /**
   * An HTML tag:  a band by itself when it's alone on its line, else a small pill in it;
   * from a bracket's room before its `<` to a bracket's room after its `>`.
   * - Monaco's place for a column is before the room injected there:  the pill starts past that room.
   */
  private drawTag(shape: MarkupTagShape, range: monaco.Range, view: View): HTMLElement {
    const { measures, lineHeight } = view
    const line = range.startLineNumber
    const left = this.tagLeft(shape, range, view)
    // a tag that declares the member it draws:  round, not pointed (epic `editor` I84)
    const kind = `bubbly-${shape.partOfSpeech}${shape.declares ? " bubbly-tag-declares" : ""}`
    // a start tag on lines of its own:  one tall band (T118)
    if (range.endLineNumber > line && shape.side === "start") {
      const where = shape.isAlone ? "bubbly-tag-tall-alone" : "bubbly-tag-tall-inline"
      return this.drawTall(`bubbly-tag-tall bubbly-tag-start ${where} ${kind}${tallEnd(shape)}`, range, left, view)
    }
    const right = this.tagRight(range, view)
    const classes = shape.isAlone
      ? `bubbly-pill bubbly-tag-start ${kind}`
      : `bubbly-tag-pill bubbly-tag-${shape.side} ${kind}`
    const top = this.editor.getTopForLineNumber(line) + lineHeight / 2
    return place(element(classes), { left, top, width: right - left }, measures.scale)
  }

  /**
   * A start tag on lines of its own, in `range`:  ONE tall band from `left` (T118), as the page draws it
   * (`BubblyMarkup`):  a box of its colour over its lines but the last, to past the longest;  then its last line's
   * piece, a band from `left` to past its `⟩`, ending in the point.
   * - `classes`:  the sheet's for it, which cut its corners
   * - flush (`bubbly-tag-tall-flush`):  its last line's piece as wide as the rows, its `⟩` drawn at their right end
   *   (Owen, 2026-11-14:  "make the whole block top extend to the same end point")
   */
  private drawTall(classes: string, range: monaco.IRange, left: number, view: View): HTMLElement {
    const { editor } = this
    const { measures, lineHeight } = view
    const model = editor.getModel()!
    const firstLine = range.startLineNumber
    const lastLine = range.endLineNumber
    const top = (line: number) => editor.getTopForLineNumber(line) + (lineHeight - measures.pillHeight) / 2
    let rowsRight = left
    for (let line = firstLine; line < lastLine; line++) {
      const column = model.getLineLastNonWhitespaceColumn(line)
      // a line ending with a quoted value:  room for its curly mark, injected after it
      const room = /"\s*$/.test(model.getLineContent(line)) ? measures.quoteSpacer : 0
      rowsRight = Math.max(rowsRight, this.xOf(line, column) + room + measures.bracketPad)
    }
    let tailRight = this.xOf(lastLine, range.endColumn) + measures.bracketPad
    const isFlush = classes.includes(FLUSH)
    const tail = element("bubbly-tag-tail")
    if (isFlush) {
      // its `⟩` drawn here, at the right end;  in its line it's only room (`MarkupMarks`);
      // a block's as far in as its `⟨` (`--bubbly-tall-close-inset`), the band wider by that room
      const room = classes.includes("bubbly-tag-tall-head") ? measures.tagPadLeft - measures.bracketPad : 0
      tailRight = rowsRight = Math.max(rowsRight, tailRight + room)
      tail.append(element("bubbly-mark bubbly-angle bubbly-angle-close"))
    }
    const tall = element(classes)
    tall.append(
      place(
        element("bubbly-tag-rows"),
        // a pixel under its last line's piece, so no seam shows between them where they're one width
        {
          left,
          top: top(firstLine),
          width: rowsRight - left,
          height: top(lastLine) - top(firstLine) + (isFlush ? 1 : 0)
        },
        measures.scale
      ),
      place(tail, { left, top: top(lastLine), width: tailRight - left }, measures.scale)
    )
    return tall
  }

  /**
   * Where a tag's pill starts:  a bracket's room before its `<`.
   * - Monaco's place for a column is before the room injected there:  the pill starts past that room.
   */
  private tagLeft(shape: MarkupTagShape, range: monaco.Range, view: View): number {
    const { measures } = view
    return this.xOf(range.startLineNumber, range.startColumn) + roomOf(shape.room, measures) - measures.bracketPad
  }

  /** Where a tag's pill on one line ends:  a bracket's room after its `>`, or its line's end. */
  private tagRight(range: monaco.Range, view: View): number {
    const line = range.startLineNumber
    const endColumn = range.endLineNumber === line ? range.endColumn : this.editor.getModel()!.getLineMaxColumn(line)
    return this.xOf(line, endColumn) + view.measures.bracketPad
  }

  /**
   * A one-line element's two tags linked:  a line along the top and bottom of what's between their pills, from its
   * start tag's point to its end tag's (Owen, Q58), never under the tags;  drawn before them, so under them.
   */
  private drawLink(shape: MarkupLinkShape, range: monaco.Range, view: View): HTMLElement {
    const { measures, lineHeight } = view
    const start = view.ranges[shape.start.place]!
    const end = view.ranges[shape.end.place]!
    // from where the start tag's point starts, so the line runs on from its pill's top and bottom
    const left = this.tagRight(start, view) - measures.tagPoint
    const right = this.tagLeft(shape.end, end, view) + measures.tagPoint
    const top = this.editor.getTopForLineNumber(range.startLineNumber) + lineHeight / 2
    const link = element(`bubbly-tag-link bubbly-${shape.partOfSpeech}`)
    return place(link, { left, top, width: right - left }, measures.scale)
  }

  /**
   * `shape`, an HTML shape, as the sheet draws HTML:  in a Spell file, a drawing's tags, in a box of HTML's
   * (`bubbly-html`) so its settings and rules reach them;  in an HTML file the editor's box is one already.
   */
  private asHtml(shape: HTMLElement): HTMLElement {
    if (this.isMarkup) return shape
    const box = element(HTML_BOX)
    box.append(shape)
    return box
  }

  /**
   * A pill under the words in `range`:  from the room before them to the end of the room after.
   * - code's, a `{…}` in a drawing's markup, inverted, in a shade of its tag's colour (`bubbly-expression`, Owen):
   *   its own narrower room either side, so its braces sit at its ends (I162);  past a tag's room right before it
   */
  private drawInput(
    { isChoice, inTag, isExpression, afterHeadSpacer, room }: BubblyInputShape,
    range: monaco.Range,
    view: View
  ): HTMLElement | undefined {
    const { measures, lineHeight } = view
    const line = range.startLineNumber
    if (range.endLineNumber !== line) return undefined
    // the column's x is before everything injected there:  a top-level head's spacer too, outside the pill
    const left =
      this.xOf(line, range.startColumn) + (afterHeadSpacer ? measures.headSpacer : 0) + roomOf(room, measures)
    const right = this.xOf(line, range.endColumn) + (isExpression ? measures.codeSpacer : measures.inputSpacer)
    const top = this.editor.getTopForLineNumber(line) + lineHeight / 2
    // a tag's value in its tag's hue:  the layer draws it beside its tag's pill, not in it, so it can't inherit it
    const classes = [
      "bubbly-input",
      isChoice && "bubbly-choice",
      isExpression && "bubbly-expression",
      inTag && `bubbly-${inTag}`
    ]
    const pill = element(classes.filter(Boolean).join(" "))
    return place(pill, { left, top, width: right - left }, measures.scale)
  }

  /**
   * ONE dotted line under the words in `range`, a value or a question (`bubbly-underline`):  from its first letter
   * to its last, its dots evenly spaced under bold and plain words alike;  how far below the line's middle, the sheet's
   * (`--bubbly-underline-drop`).
   */
  private drawUnderline(range: monaco.Range, view: View): HTMLElement {
    const line = range.startLineNumber
    const left = this.xOf(line, range.startColumn)
    const right = this.xOf(line, range.endColumn)
    const top = this.editor.getTopForLineNumber(line) + view.lineHeight / 2
    return place(element(UNDERLINE), { left, top, width: right - left }, view.measures.scale)
  }

  ////////////////
  // ## Room under each declaration
  ////////////////

  /**
   * A view zone under each line that ends declarations with a body:  room for their feet,
   * and the gap from the lowest to the band on the next line (`--bubbly-line-gap`);  if they've moved.
   */
  private updateZones(laidOut: BubblyMarks | MarkupMarks, view: View) {
    const room = new Map<number, number>()
    const measure = (shapes: Shape[]) => {
      for (const shape of shapes) {
        if (shape.kind !== "block") continue
        const range = view.ranges[shape.place]
        if (range && shape.hasBody && range.endLineNumber > range.startLineNumber && this.isShown(range)) {
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

  /** How tall `line` is:  the editor's line height, or a shorter one's (`withShortFootLines()`). */
  private lineHeightOf(line: number): number {
    return this.editor.getLineHeightForPosition({ lineNumber: line, column: 1 })
  }

  /** Is `range` wholly in what the editor shows:  always, but in a slice (`showSlice()`). */
  private isShown(range: monaco.IRange): boolean {
    if (!this.slice) return true
    const shown = this.slice.shown()
    return !!shown && monaco.Range.containsRange(shown, range)
  }

  /**
   * Is `range`, where an edit was before it, at or next to the lines the editor shows:  always, but in a slice.
   * - Loosely:  an edit just above a slice that moved it counts too, and only costs a redraw.
   */
  private isNearShown(range: monaco.IRange): boolean {
    if (!this.slice) return true
    const shown = this.slice.shown()
    if (!shown) return false
    return range.startLineNumber <= shown.endLineNumber + 1 && range.endLineNumber >= shown.startLineNumber - 1
  }

  /** Has Monaco drawn `line` on the page, so its letters' places can be measured?  A line out of view hasn't. */
  private isDrawnByMonaco(line: number): boolean {
    return this.editor.getOffsetForColumn(line, 1) >= 0
  }

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
   * a probe in the editor's box, sized by each `--bubbly-` setting;  and the spacer injected beside an input, as wide as
   * its own rule makes it.
   */
  private measures(): Measures {
    if (this.measured) return this.measured
    const { editor } = this
    const container = editor.getContainerDomNode()
    const { fontSize } = editor.getOption(monaco.editor.EditorOption.fontInfo)
    const probe = element("bubbly-monaco-probe")
    container.append(probe)
    const length = (variable: string, from = probe) => {
      from.style.width = `var(${variable})`
      return from.getBoundingClientRect().width
    }
    // HTML's settings, as a Spell file's drawing's tags read them:  in a box of HTML's
    const htmlBox = element(`${HTML_BOX} bubbly-monaco-probe`)
    const htmlProbe = element("bubbly-monaco-probe")
    htmlBox.append(htmlProbe)
    container.append(htmlBox)
    /** How wide the spacer injected with `classes` is:  its own rule's width, at the editor's scale. */
    const spacerWidth = (classes: string) => {
      const spacer = Object.assign(document.createElement("span"), { className: `bubbly-spacer ${classes}` })
      probe.append(spacer)
      const width = spacer.getBoundingClientRect().width
      spacer.remove()
      return width
    }
    const scale = fontSize / (length("--bubbly-font-size") || fontSize)
    container.style.setProperty("--bubbly-monaco-scale", String(scale))
    const ratio = Number.parseFloat(getComputedStyle(container).getPropertyValue("--bubbly-monaco-line-height")) || 1.5
    this.measured = {
      scale,
      lineHeight: Math.round(fontSize * ratio),
      inputSpacer: spacerWidth("bubbly-input-spacer"),
      codeSpacer: spacerWidth("bubbly-code-spacer"),
      headSpacer: spacerWidth("bubbly-head-spacer"),
      quoteSpacer: spacerWidth("bubbly-quote-spacer"),
      tagSpacer: spacerWidth("bubbly-tag-spacer"),
      touchSpacer: spacerWidth("bubbly-touch-spacer"),
      bracketPad: length("--bubbly-bracket-pad", htmlProbe) * scale,
      blockInset: length("--bubbly-tag-block-inset") * scale,
      tagPoint: length("--bubbly-tag-point", htmlProbe) * scale,
      tagPadLeft: length("--bubbly-tag-pad-left", htmlProbe) * scale,
      footTinyAbove: length("--bubbly-foot-tiny-above", htmlProbe) * scale,
      footTinyPadRight: length("--bubbly-foot-tiny-pad-right", htmlProbe) * scale,
      footTinyRow: length("--bubbly-foot-tiny-row", htmlProbe) * scale,
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
    htmlBox.remove()
    return this.measured
  }

  ////////////////
  // ## State
  ////////////////

  /** A slice's lines (`showSlice()`):  `isKept` while it's out of the page. */
  private slice: { shown: () => monaco.IRange | null; isKept?: boolean } | undefined

  /** Drawing an HTML file, not Spell. */
  private isMarkup = false

  /** The editor's decorations:  the marks. */
  private marks: monaco.editor.IEditorDecorationsCollection | undefined

  /** The layer behind the editor, and the shapes in it, while drawing. */
  private layer: HTMLElement | undefined
  private shapes: HTMLElement | undefined

  /** The editor's own sheet:  the width of each spacer before a head's description (`fitDescriptions()`). */
  private descriptionSheet: HTMLStyleElement | undefined

  /** Each description's spacer's width, by its class. */
  private readonly descriptionWidths = new Map<string, number>()

  /** Each description's words' width, by its spacer's class:  read while the spacer was empty (`descriptionWords()`). */
  private readonly descriptionWordWidths = new Map<string, number>()

  /** How wide the code alone is, its descriptions' spacers empty:  how far right they may reach. */
  private naturalWidth: number | undefined

  /** How many editors have had a sheet of their own:  each one's box is told apart by its number. */
  private static sheets = 0

  /** The view zones under declarations, and what they were made from. */
  private zoneIds: string[] = []
  private zonesKey = "[]"

  /** The line height the editor had before:  put back when it stops drawing. */
  private lineHeightBefore = 0

  /** The sheet's sizes, once read. */
  private measured: Measures | undefined

  /** The wait before laying out again. */
  private relayoutTimer: ReturnType<typeof setTimeout> | undefined

  /** A `refresh()` is waiting for its microtask. */
  private isRefreshQueued = false

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
  /** the spacer either side of a pill's words */
  inputSpacer: number
  /** ... of code's, a `{…}` in a drawing's markup:  narrower, its braces at its pill's ends (I162) */
  codeSpacer: number
  /** the spacer before a head line's words */
  headSpacer: number
  /** the spacer outside a quoted input's marks */
  quoteSpacer: number
  /** HTML:  the spacer either side of a tag in a line, and between an empty element's tags */
  tagSpacer: number
  touchSpacer: number
  /** HTML:  a tag's bracket this far in from its band's end */
  bracketPad: number
  /**
   * HTML:  a block's band, rail and tiny foot this far left of its words (`--bubbly-tag-block-inset`):
   * in a Spell file where a Spell band starts (`padLeft`), so the rails are one indent apart at every level
   */
  blockInset: number
  /** HTML:  how wide a tag's pointed end is */
  tagPoint: number
  /** HTML:  a block's band's room before its `⟨`, and a flush one's after its `⟩` */
  tagPadLeft: number
  /** HTML:  a block's end tag's tiny pill:  the body's paper above it, its room after its `⟩`, its line's height */
  footTinyAbove: number
  footTinyPadRight: number
  footTinyRow: number
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

/** A shape it draws:  Spell's, or HTML's. */
type Shape = BubblyShape | MarkupShape

/** What a redraw knows. */
type View = {
  /** each mark's range now, by index */
  ranges: monaco.Range[]
  /** where each block's band starts:  `placeBands()` */
  lefts: Map<BubblyBlockShape, number>
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

/** A value's or a question's dotted line (`SP.BubblyUnderline`). */
const UNDERLINE = "bubbly-underline"

/** The classes that make an editor's box a drawing. */
const BOX_CLASSES = ["bubbly", "bubbly-monaco"]

/** ... and an HTML file's:  the sheet's HTML settings and rules reach it. */
const MARKUP_CLASS = "bubbly-html"

/** The box a Spell file's drawing's tags are drawn in, in the layer:  HTML's settings and rules reach them there. */
const HTML_BOX = "bubbly bubbly-html bubbly-html-shapes"

/** Is `model` an HTML file, drawn as HTML?  By its name, as its language is plain text. */
function isMarkupFile(model: monaco.editor.ITextModel): boolean {
  return /\.html?$/i.test(model.uri.path)
}

/** A shape's element, its classes `classes`. */
/** A flush tall tag's class (`drawTall()`). */
const FLUSH = "bubbly-tag-tall-flush"

/** The room injected before a pill, each spacer's kind (`MarkupTagShape.room`), in the editor's pixels. */
function roomOf(room: readonly TagRoom[] | undefined, measures: Measures): number {
  const widths: Record<TagRoom, number> = {
    tag: measures.tagSpacer,
    touch: measures.touchSpacer,
    code: measures.codeSpacer
  }
  return (room ?? []).reduce((sum, kind) => sum + widths[kind], 0)
}

/** A tall start tag's end:  flush, its rows one width;  or short, its rows overhanging its `>`;  else neither. */
function tallEnd(shape: { isFlush?: boolean; isShortTail?: boolean }): string {
  return shape.isFlush ? ` ${FLUSH}` : shape.isShortTail ? " bubbly-tag-tall-short-tail" : ""
}

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

/**
 * Is `tag`, in a drawing in `file`, one of its project's own views (`<tableau>`), so it draws a thing?
 * - As the compiler decides it, by its type:  a view or a viewable list (SpellJSX's `isDrawnType()`).
 * - No project file:  none is.
 */
function isViewTag(file: SP.SpellFile | undefined, tag: string): boolean {
  const type = file?.scope?.getType(SP.typeName(tag))
  return !!type && DRAWN_BASE_TYPES.some((base) => type.isA(base))
}

/** What a project's own view is built on:  SEE SpellJSX's `DRAWN_BASE_TYPES`, which this follows. */
const DRAWN_BASE_TYPES = ["View", "ViewableList"]

/** The parser that reads `model`'s Spell:  its file's language (`Carta.es.spell`), else English. */
function parserFor(model: monaco.editor.ITextModel): SP.SpellParser {
  try {
    return SP.Language.forFile(model.uri.path).parser
  } catch {
    return SP.spellParser
  }
}
