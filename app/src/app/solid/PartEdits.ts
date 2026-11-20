import { setDebugGlobal } from "spell/util"
import { Dragging } from "spell/util/Dragging"
import { beforeNextPaint } from "spell/util/timing"

import type { MenuItem } from "spell/parser/core"
import { SP } from "spell/parser/spell"
import { SourceMarks } from "spell/parser/parser/writers/SourceMarks"
import { SourceEdits, type ElementPlace, type TextSpan, type WrittenElement } from "spell/app/lsp/SourceEdits"
import { editor } from "spell/app/app/editor"
import { isRunningApp } from "spell/app/app/pages/editorHotkeys"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { EDITOR_OWN } from "spell/app/app/ui/ui.types"
import { ActionMenus } from "spell/app/app/runner/ActionMenus"
import { SpellElement } from "spell/app/app/runner/SpellElement"
import { NotebookPageCells } from "spell/app/app/solid/notebook/NotebookPageCells"
import { Inspector, type PartRow } from "./Inspector"
import { InspectorWrites } from "./InspectorWrites"

/**
 * What a person does to the app's parts as a whole, written into the program's source (epic `editor`, Add And Move):
 * add, move, cut, copy, paste, duplicate and delete.
 * - The text changes through `SourceEdits`, the one home for that, as ONE step of `editor.history`:
 *   only those characters change, each thing keeps its words and comments, and ⌘Z takes back the whole gesture.
 * - A part can be changed only if it has a tag of its own in the source (`SourceMarks`):
 *   made in a loop, or by a widget, it says so instead.
 *   - Or a run of prose a page drawing its body draws, a `<markdown>` block or a `##` heading's section
 *     (`NotebookPageCells.proseAt()`, epic `notebook` P5):  so a notebook's cells move as any part does.
 * - A drag is `Dragging`'s, with the place found here (`placeAt()`):  moving goes by the flow, never x and y,
 *   so what's written stays readable and the page still resizes.
 * - Plain TypeScript, no Solid:  the app's area, the tree, the palette and the keys all call it.
 *   - `Palette.tsx` draws what people see of it.
 */
export class PartEdits {
  ////////////////
  // ## The actions
  ////////////////

  /**
   * `action` on what's selected, or `paste` at the place for it.
   * - Answers whether there was anything to do it to:  a key with nothing to do goes on.
   * - NEVER throws:  what can't be done is said in a notice.
   */
  static run(action: PartAction): boolean {
    if (isRunningApp()) return false
    const elements = Inspector.allSelected.map((part) => part.element).filter((element) => !!element) as Element[]
    if (action === "paste") {
      if (!clipboard) return false
      PartEdits.add(clipboard, appTexts.text("partStepPaste"))
      return true
    }
    if (!elements.length) return false
    if (action !== "copy" && elements.some(isTheApp)) {
      editor.showNotice(appTexts.text("partIsApp"))
      return true
    }
    const written = PartEdits.writtenAll(elements)
    if (!written) return true
    if (action === "copy" || action === "cut") {
      clipboard = written.map((one) => SourceEdits.codeOf(one.text, one.element))
      navigator.clipboard?.writeText(clipboard.join("\n")).catch(() => {
        // the page's own clipboard still has it
      })
    }
    if (action === "copy") return true
    if (action === "duplicate") {
      const { file, text } = written[0]!
      const codes = written.map((one) => SourceEdits.codeOf(text, one.element))
      const { text: after, starts } = SourceEdits.writtenAll(text, placeBy(written.at(-1)!, "after"), codes)
      PartEdits.applyText(file, after, appTexts.text("partStepDuplicate"), starts, "new")
      return true
    }
    const { file, text } = written[0]!
    const after = SourceEdits.without(
      text,
      written.map((one) => one.element)
    )
    PartEdits.applyText(file, after, appTexts.text(action === "cut" ? "partStepCut" : "partStepDelete"), [])
    Inspector.letGo()
    return true
  }

  /**
   * Why `action` can't be done to what's selected, in words:  what a menu greys it for;  `undefined` if it can.
   * - Catching up with the last change isn't a reason:  that's over in a moment.
   */
  static whyNot(action: PartAction): string | undefined {
    if (action === "paste") {
      if (!clipboard) return appTexts.text("partNothingCopied")
      return PartEdits.placeForNew() ? undefined : appTexts.text("partNoDrawing")
    }
    const elements = PartEdits.menuPart
      ? [PartEdits.menuPart]
      : Inspector.allSelected.flatMap((part) => part.element ?? [])
    if (!elements.length) return appTexts.text("partNothingSelected")
    if (action !== "copy" && elements.some(isTheApp)) return appTexts.text("partIsApp")
    for (const element of elements) {
      const written = PartEdits.writtenOf(element)
      if ("reason" in written && written.reason !== "partBusy") return appTexts.text(written.reason)
    }
    return undefined
  }

  /** Why what's selected can't be shown in the code, in words;  `undefined` if it can. */
  static get whyNoCode(): string | undefined {
    const element = PartEdits.menuPart ?? Inspector.allSelected.at(-1)?.element
    return element && Inspector.writtenPlaceOf(element) ? undefined : appTexts.text("partNotWritten")
  }

  /**
   * Write `codes` (each a whole tag) at `place`, or at the place for something new (`placeForNew()`), as one step.
   * - NEVER throws:  no place for it is said in a notice.
   */
  static add(codes: readonly string[], title: string, place?: FilePlace): void {
    const at = place ?? PartEdits.placeForNew()
    if (!at) return editor.showNotice(appTexts.text("partNoDrawing"))
    const text = at.file.contents ?? ""
    const step = /^\t/m.test(text) ? "\t" : "  "
    const fitted = codes.map((code) => code.replaceAll("\t", step))
    const { text: after, starts } = SourceEdits.writtenAll(text, at, fitted)
    PartEdits.applyText(at.file, after, title, starts, "new")
  }

  /** Move `elements` to `place`, as one step.  NEVER throws:  what can't move is said in a notice. */
  static move(elements: readonly Element[], place: FilePlace): void {
    const written = PartEdits.writtenAll(elements)
    if (!written) return
    const { file, text } = written[0]!
    if (file !== place.file) return editor.showNotice(appTexts.text("partAcrossFiles"))
    const spans = written.map((one) => one.element)
    if (spans.some((span) => place.opening >= span.start && place.opening < span.end)) {
      return editor.showNotice(appTexts.text("partInsideItself"))
    }
    const { text: after, starts } = SourceEdits.moved(text, spans, place)
    PartEdits.applyText(file, after, appTexts.text("partStepMove"), starts)
  }

  /**
   * The program's text is now `after`:  one step, the app compiled at once, and what's at `starts` selected once drawn.
   * - Compiled now, not after the usual pause:  a person who just dropped something is looking at the app.
   * - Once drawn, it's shown (`showDrawn()`):  scrolled into view, or, when it's `new` and draws nothing to see,
   *   a notice saying so.
   */
  private static applyText(
    file: SP.AnySpellFile,
    after: string,
    title: string,
    starts: readonly number[],
    what: "new" | "moved" = "moved"
  ): void {
    const before = file.contents ?? ""
    const { span, newText } = SourceEdits.editBetween(before, after)
    if (starts.length) {
      const places = starts.map((start) => placeKeyAt(file, after, start))
      Inspector.selectWhenDrawn(places, (elements) => PartEdits.showDrawn(elements, what))
    }
    editor.history.change(
      { file, at: span.start, before: before.slice(span.start, span.end), after: newText },
      { title, live: () => compileNow() }
    )
    compileNow()
  }

  /**
   * Show `elements`, just drawn and selected:  the last one scrolled into the app's view, its ring showing
   * (epic `editor` P35:  "clicking to add something ... is often hidden").
   * - A `new` one that draws nothing to see (an empty box):  a notice says it's there, selected in the Views tree.
   * - After the next paint:  its box is laid out by then.
   */
  private static showDrawn(elements: readonly Element[], what: "new" | "moved"): void {
    requestAnimationFrame(() => {
      const last = elements.at(-1)
      if (!last?.isConnected) return
      const shown = shownElementOf(last)
      if (!shown) {
        if (what === "new") editor.showNotice(appTexts.text("partAddedEmpty"))
        return
      }
      // into the middle, with room for its ring, only when it isn't already in view
      const area = Inspector.area?.getBoundingClientRect()
      const box = shown.getBoundingClientRect()
      const isInView =
        !!area &&
        box.top >= area.top + RING_ROOM &&
        box.bottom <= area.bottom - RING_ROOM &&
        box.left >= area.left + RING_ROOM &&
        box.right <= area.right - RING_ROOM
      if (!isInView) shown.scrollIntoView({ block: "center", inline: "nearest" })
    })
  }

  ////////////////
  // ## What's written where
  ////////////////

  /** Where each of `elements` is written, in the order they're written.  None, with a notice, if one can't be changed. */
  private static writtenAll(elements: readonly Element[]): WrittenPart[] | undefined {
    const written: WrittenPart[] = []
    for (const element of elements) {
      const one = PartEdits.writtenOf(element)
      if ("reason" in one) {
        editor.showNotice(appTexts.text(one.reason))
        return undefined
      }
      written.push(one)
    }
    if (new Set(written.map((one) => one.file)).size > 1) {
      editor.showNotice(appTexts.text("partAcrossFiles"))
      return undefined
    }
    return written.sort((one, other) => one.element.start - other.element.start)
  }

  /** Where `element` is written:  else why it can't be changed. */
  private static writtenOf(element: Element): WrittenPart | { reason: NotEditable } {
    const place = SourceMarks.placeOfDrawn(element)
    if (!place) {
      const thing = SpellElement.thingOf(element)
      return { reason: thing && !InspectorWrites.hasOwnLine(thing) ? "partFromLoop" : "partNotWritten" }
    }
    const file = InspectorWrites.fileNamed(place.path)
    if (!file) return { reason: "partNotWritten" }
    if (Inspector.isCatchingUp) return { reason: "partBusy" }
    const key = element.getAttribute(DRAWN_AT)
    const area = Inspector.area
    if (area && Inspector.partsIn(area).filter((row) => row.element.getAttribute(DRAWN_AT) === key).length > 1) {
      return { reason: "partFromLoop" }
    }
    const text = file.contents ?? ""
    const opening = SourceEdits.offsetAt(text, { line: place.line, character: place.column })
    const written = SourceEdits.elementAt(text, opening) ?? NotebookPageCells.proseAt(text, opening, file.path)
    // the file has moved on since this was drawn
    if (!written) return { reason: "partBusy" }
    return { file, text, element: written }
  }

  /** Can `element` be changed?  No notice:  for a drag or a drop line, which only look. */
  private static isWritten(element: Element): boolean {
    return !("reason" in PartEdits.writtenOf(element))
  }

  /**
   * Where something new goes:  beside what's selected, inside it if it holds things;  else last in the app's drawing,
   * inside its one outer tag if that's all it has.
   */
  static placeForNew(): FilePlace | undefined {
    const selected = PartEdits.menuPart ?? Inspector.allSelected.at(-1)?.element
    const written = selected && PartEdits.writtenOf(selected)
    if (written && !("reason" in written)) {
      return {
        file: written.file,
        ...placeBy(written, holdsThings(written.element, selected!) ? "inside" : "after")
      }
    }
    return PartEdits.placeInDrawing()
  }

  /**
   * The end of the app's drawing.
   * - The open file's page that draws its body, a notebook, first:  the end of its body (epic `notebook` P5).
   * - Then what the app draws (`placeInDrawn()`), however it's written.
   * - Else, for an app that draws nothing yet:  the text's `<draw>`, of the old tag form, the app's file first.
   */
  private static placeInDrawing(): FilePlace | undefined {
    const open = editor.file
    const page = open && NotebookPageCells.drawnPageIn(open.contents ?? "", open.path)
    if (open && page !== undefined) return { file: open, opening: page, where: "inside" }
    const drawn = PartEdits.placeInDrawn()
    if (drawn) return drawn
    const files = editor.project?.spellFiles ?? []
    const ordered = [...files].sort((one, other) => rankOf(other) - rankOf(one))
    for (const file of ordered) {
      const text = file.contents ?? ""
      // past the app's opening:  a type's own drawings come first in a file
      const appAt = Math.max(text.search(APP_TAG), 0)
      const inApp = text.slice(appAt).search(DRAW_TAG)
      const opening = inApp < 0 ? -1 : appAt + inApp
      const drawing = opening < 0 ? undefined : SourceEdits.elementAt(text, opening)
      if (!drawing) continue
      const only = onlyTagIn(text, drawing)
      if (only && only.bodyStart !== undefined && !LEAF_TAGS.test(text.slice(only.start + 1, only.tag.nameEnd))) {
        return { file, opening: only.start, where: "inside" }
      }
      return { file, opening, where: "inside" }
    }
    return undefined
  }

  /**
   * The end of what the app draws, found from its drawn parts, so plain Spell's `to draw` works as the tag form did
   * (epic `editor` I126):
   * - its outermost parts with a tag of their own, in the first one's file
   *   - in a site, the page shown's own:  never its layout's panes (`placeableParts()`)
   * - just one, which holds things (a blank app's `<container>`):  inside it, at its end
   * - else after the last of them
   * - `undefined` when nothing written is drawn
   */
  private static placeInDrawn(): FilePlace | undefined {
    const area = Inspector.area
    if (!area) return undefined
    const outermost: WrittenPart[] = []
    const elements: Element[] = []
    let depth = Infinity
    for (const row of PartEdits.placeableParts(area)) {
      if (row.depth > depth) continue
      const written = PartEdits.writtenOf(row.element)
      if ("reason" in written || !("tag" in written.element)) continue
      if (outermost[0] && written.file !== outermost[0].file) continue
      depth = row.depth
      outermost.push(written)
      elements.push(row.element)
    }
    const last = outermost.at(-1)
    if (!last) return undefined
    const isOnlyHolder = outermost.length === 1 && holdsThings(last.element, elements[0]!)
    return { file: last.file, ...placeBy(last, isOnlyHolder ? "inside" : "after") }
  }

  /**
   * The app's parts a drop or something new may land in, as `Inspector.partsIn()` walks them:
   * in a site, the page shown's own (epic `editor` P35).
   * - A site's layout panes are passed over:  its app menu, page menu, drawer, side bars and footer.
   *   They're written in the layout's own drawing, so what lands there shows on every page.
   * - Unless a pane is chosen:  it, or something in it, is selected.
   *   The Views tree's rows are always there to pick from (`placeInTree()`).
   * - Never a layout kept hidden while another is shown.
   */
  private static placeableParts(area: HTMLElement): PartRow[] {
    const chosen = new Set(Inspector.allSelected.flatMap((part) => (part.element && paneOf(part.element)) ?? []))
    return Inspector.partsIn(area).filter((row) => {
      if (isInHiddenLayout(row.element)) return false
      const pane = paneOf(row.element)
      return !pane || chosen.has(pane)
    })
  }

  ////////////////
  // ## Dragging
  ////////////////

  /**
   * A press on `element`:  a drag, if it moves, of it and whatever's selected with it.
   * - Answers whether it took the press:  no for what has no tag of its own, so a program's own drag still works.
   * - Inspecting, or in the tree, a person means to move it:  a drag of what can't move says why.
   */
  static startDrag(element: Element, event: PointerEvent, { saysWhy = Inspector.isInspecting } = {}): boolean {
    if (event.button !== 0 || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return false
    if (isRunningApp()) return false
    const written = PartEdits.writtenOf(element)
    if ("reason" in written) {
      if (saysWhy) PartEdits.sayWhyOnDrag(element as HTMLElement, event, written.reason)
      return false
    }
    const selected = Inspector.allSelected.map((part) => part.element).filter((each) => !!each) as Element[]
    const moving = selected.includes(element) ? selected : [element]
    if (!moving.every((each) => PartEdits.isWritten(each))) return false
    PartEdits.dragging(element as HTMLElement, event, moving, (place) => PartEdits.move(moving, place))
    return true
  }

  /** A press on `element`, which can't move:  if it's dragged, nothing moves and the app says why. */
  private static sayWhyOnDrag(element: HTMLElement, event: PointerEvent, reason: NotEditable): void {
    new Dragging(element, event, {
      carried: [element],
      follows: false,
      placing: () => {},
      onDrop: () => editor.showNotice(appTexts.text(reason))
    })
  }

  /** A press on a row of the palette, for `codes`:  dragging a label of it into the app. */
  static startPaletteDrag(
    event: PointerEvent,
    label: string,
    codesFor: (file: SP.AnySpellFile) => string[],
    title: string
  ) {
    if (event.button !== 0) return
    const ghost = document.createElement("div")
    ghost.className = "PaletteGhost"
    ghost.textContent = label
    ghost.style.left = `${event.clientX + GHOST_GAP}px`
    ghost.style.top = `${event.clientY + GHOST_GAP}px`
    ghost.hidden = true
    document.body.append(ghost)
    ghost.addEventListener("dragstart", () => {
      ghost.hidden = false
      PartEdits.onPaletteDrag?.()
    })
    ghost.addEventListener("dragend", () => ghost.remove())
    // a press that never moves:  no drag, so no `dragend`, and its click adds it
    window.addEventListener("pointerup", () => ghost.hidden && ghost.remove(), { capture: true, once: true })
    new Dragging(ghost, event, {
      carried: [ghost],
      placing: (x, y) => PartEdits.showPlace(PartEdits.placeAt(x, y, [])),
      onDrop: () => {
        const place = PartEdits.lastPlace
        PartEdits.showPlace(undefined)
        if (place) PartEdits.add(codesFor(place.file), title, place)
      },
      onCancel: () => PartEdits.showPlace(undefined)
    })
  }

  /** Told as a drag from the palette starts:  a popup steps out of the way. */
  static onPaletteDrag: (() => void) | undefined

  /** A drag of `element`, carrying `moving`, dimmed where they are, which ends in `drop`. */
  private static dragging(
    element: HTMLElement,
    event: PointerEvent,
    moving: readonly Element[],
    drop: (place: FilePlace) => void
  ) {
    const dim = (opacity: string) => {
      for (const each of moving) (each as HTMLElement).style.opacity = opacity
    }
    new Dragging(element, event, {
      carried: moving as HTMLElement[],
      follows: false,
      placing: (x, y) => {
        dim(CARRIED_OPACITY)
        PartEdits.showPlace(PartEdits.placeAt(x, y, moving))
      },
      onDrop: () => {
        const place = PartEdits.lastPlace
        dim("")
        PartEdits.showPlace(undefined)
        if (place) drop(place)
      },
      onCancel: () => {
        dim("")
        PartEdits.showPlace(undefined)
      }
    })
  }

  /**
   * The place under (`x`, `y`):  over a row of the Views tree, or over the app.
   * - Over a part that holds things, its middle goes inside;  else before or after it, as the things around it lie.
   * - Over nothing written, in the app:  the end of the drawing, the whole app outlined.
   * - Over a site's layout pane (its menu, drawer, side bars, footer):  as over nothing, unless the pane is chosen
   *   (`placeableParts()`).
   */
  private static placeAt(x: number, y: number, moving: readonly Element[]): ShownPlace | undefined {
    const inTree = PartEdits.placeInTree(x, y, moving)
    if (inTree) return inTree
    const area = Inspector.area
    if (!area || !contains(area.getBoundingClientRect(), x, y)) return undefined
    let best: Element | undefined
    let bestSize = Infinity
    for (const { element } of PartEdits.placeableParts(area)) {
      const box = boxOf(element)
      if (!contains(box, x, y) || isInside(element, moving) || box.width * box.height >= bestSize) continue
      if (!PartEdits.isWritten(element)) continue
      best = element
      bestSize = box.width * box.height
    }
    if (best) return PartEdits.placeBeside(best, boxOf(best), x, y)
    const place = PartEdits.placeInDrawing()
    return place && { place, box: area.getBoundingClientRect(), mark: "inside" }
  }

  /** The place on the Views tree's row under (`x`, `y`):  the tree has no box of its own, only its rows do. */
  private static placeInTree(x: number, y: number, moving: readonly Element[]): ShownPlace | undefined {
    for (const row of [...document.querySelectorAll(`${TREE_SELECTOR} ui-tree-item`)].reverse()) {
      const element = PartEdits.rowParts.get(row)
      const line = row.shadowRoot?.querySelector(TREE_ROW_LINE)?.getBoundingClientRect()
      if (!element || !line || !contains(line, x, y)) continue
      if (isInside(element, moving) || !PartEdits.isWritten(element)) return undefined
      return PartEdits.placeBeside(element, line, line.left, y, { inColumn: true })
    }
    return undefined
  }

  /** The Views tree's row of each part:  `rememberRow()`. */
  private static rowParts = new WeakMap<Element, Element>()

  /**
   * The Views tree's row showing `element`:  `undefined` when none is drawn (a closed row's parts, the Inspector shut).
   * - Looks through the rows on the page:  a rare question (Change This opening by a part with no box of its own).
   */
  static rowOf(element: Element): Element | undefined {
    for (const row of document.querySelectorAll("ui-tree-item")) if (PartEdits.rowParts.get(row) === element) return row
    return undefined
  }

  /** `row` of the Views tree shows `element`, and a press on it drags it. */
  static rememberRow(row: Element, element: Element): void {
    PartEdits.rowParts.set(row, element)
    row.addEventListener("pointerdown", (event) => {
      // a press bubbles through the rows it's inside:  only the innermost is pressed
      if (isOnTriangle(event) || event.composedPath().find(isTreeRow) !== row) return
      PartEdits.startDrag(element, event as PointerEvent, { saysWhy: true })
    })
    row.addEventListener("contextmenu", (event) => {
      const { clientX, clientY, shiftKey } = event as MouseEvent
      if (isRunningApp() || shiftKey) return
      event.preventDefault()
      event.stopPropagation()
      PartEdits.openMenu(element, { x: clientX, y: clientY, programMenu: SpellElement.programMenuOf(element) })
    })
  }

  /** The place at (`x`, `y`) on `element`, whose box or row is `box`. */
  private static placeBeside(
    element: Element,
    box: DOMRect,
    x: number,
    y: number,
    { inColumn = false } = {}
  ): ShownPlace | undefined {
    const written = PartEdits.writtenOf(element)
    if ("reason" in written) return undefined
    const isRow = !inColumn && liesInRow(element)
    const along = isRow ? (x - box.left) / box.width : (y - box.top) / box.height
    const { file } = written
    if (holdsThings(written.element, element) && along > 0.25 && along < 0.75) {
      return { place: { file, ...placeBy(written, "inside") }, box, mark: "inside" }
    }
    const where = along < 0.5 ? "before" : "after"
    const edge = where === "before" ? (isRow ? box.left : box.top) : isRow ? box.right : box.bottom
    const line = isRow
      ? new DOMRect(edge - LINE_WIDTH / 2, box.top, LINE_WIDTH, box.height)
      : new DOMRect(box.left, edge - LINE_WIDTH / 2, box.width, LINE_WIDTH)
    return { place: { file, ...placeBy(written, where) }, box: line, mark: "line" }
  }

  /** Where a drop would land now. */
  private static lastPlace: FilePlace | undefined

  /** Show where a drop would land:  a line between things, or a ring round what it'd go in. */
  private static showPlace(shown: ShownPlace | undefined): void {
    PartEdits.lastPlace = shown?.place
    let marker = document.body.querySelector<HTMLElement>(`:scope > .${MARKER_CLASS}`)
    if (!shown) return marker?.remove()
    if (!marker) {
      marker = document.createElement("div")
      marker.className = MARKER_CLASS
      document.body.append(marker)
    }
    marker.classList.toggle("inside", shown.mark === "inside")
    const { left, top, width, height } = shown.box
    marker.style.cssText = `left:${left}px;top:${top}px;width:${width}px;height:${height}px`
  }

  ////////////////
  // ## The app's area
  ////////////////

  /**
   * Listen on `area`, in Edit, while it's the app's:  answers how to stop.
   * - A press on what's selected drags it, inspecting or not.
   * - A right click on a part selects it, if it isn't, and opens the part menu;  on the background, the app itself.
   *   - The program's own right-click menu there, if it has one, comes first in it, as Run finds it (epic `editor` I76).
   *   - Its Inspect row lists every part under the mouse (`partsAt()`;  epic `editor` P31).
   *   The browser's own menu never shows there:  `preventDefault()` comes first, before any other work.
   * - In Run the program has every right click;  with Shift held, the browser does, for its Inspect Element.
   * - The Menu key and Shift+F10 open the menu on what's selected.
   */
  static watch(area: HTMLElement, partAt: (event: Event) => Element | undefined): () => void {
    const stop = new AbortController()
    const options = { capture: true, signal: stop.signal }
    area.addEventListener(
      "pointerdown",
      (event) => {
        if (Inspector.isInspecting || isRunningApp()) return
        const part = partAt(event)
        if (part && Inspector.isSelected(part) && PartEdits.startDrag(part, event)) event.stopPropagation()
      },
      options
    )
    area.addEventListener(
      "contextmenu",
      (event) => {
        if (isRunningApp() || event.shiftKey) return
        // first, before anything else:  the browser's own menu never shows over the app in Edit,
        // nor the program's on its own (`<context-menu>`):  its items go first in ours
        event.preventDefault()
        // the editor's own boxes (Design's gallery names) have menus of their own:  theirs, not the part menu
        if (isInEditorOwn(event)) return
        event.stopPropagation()
        const part = partAt(event) ?? Inspector.partsIn(area)[0]?.element
        if (!part) return
        const { clientX: x, clientY: y } = event
        const programMenu = SpellElement.programMenuAt(event.composedPath())
        PartEdits.openMenu(part, { x, y, programMenu, partsUnder: PartEdits.partsAt(x, y, area) })
      },
      options
    )
    window.addEventListener(
      "keydown",
      (event) => {
        const isMenuKey = event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")
        if (!isMenuKey || isRunningApp() || ActionMenus.isTypedIn(event.composedPath()[0])) return
        const selected = Inspector.allSelected.at(-1)?.element
        if (!selected) return
        event.preventDefault()
        const { left, bottom } = boxOf(selected)
        PartEdits.onMenu?.({ x: left, y: bottom, programMenu: SpellElement.programMenuOf(selected), part: selected })
      },
      { signal: stop.signal }
    )
    return () => stop.abort()
  }

  /** Told to open the part menu at a place, the program's own right-click menu first if it has one:  `<PartMenu>`. */
  static onMenu: ((opening: MenuOpening) => void) | undefined

  /**
   * Open the part menu at (`x`, `y`) for `element`, selecting it if it isn't:  a right click on it, or on its row.
   * - The menu first, the selection once the menu is on the screen:
   *   selecting draws the Inspector's card for it, which can take half a second
   *   (a button's card starts a code editor for its `onClick`).
   * - Meanwhile the menu greys its items for `element` (`menuPart`),
   *   and a click on one selects it first (`selectMenuPart()`).
   * - `opening`:  where, the program's own right-click menu there, and the parts under the point (`MenuOpening`).
   */
  static openMenu(element: Element, opening: MenuOpening): void {
    if (Inspector.isSelected(element)) PartEdits.menuPart = undefined
    else {
      PartEdits.menuPart = element
      beforeNextPaint(() => beforeNextPaint(() => PartEdits.selectMenuPart()))
    }
    PartEdits.onMenu?.({ ...opening, part: element })
  }

  /**
   * Every part under (`x`, `y`) in `area`, outermost first, each under the one it's inside:
   * a right click's Inspect submenu (epic `editor` P31).
   * - What the browser draws there (`elementsFromPoint()`), into each shadow root the app draws in,
   *   and the parts round each of those (a part with no box of its own, `display: contents`, is still around it).
   * - Kept if the Inspector can show it, as Alt-click takes it:  a drawn thing, or any Spell UI element,
   *   so the picture inside a card counts (`Inspector.isPart()`).
   * - Never the editor's own boxes (`EDITOR_OWN`), nor what's inside a Spell UI element's own shadow root:
   *   a button's icon is the button's.
   * - Each part once.  Parts side by side under the same one (overlapping cards in a pile):  the one on top first.
   *   - One in the very same box as another above it (the stock's cards, squarely stacked) is hidden by it:
   *     left out, with what's inside it, so the stock lists its top card, not all 24 (epic `editor` P31).
   * - `depth`:  how many of the others it's inside.
   */
  static partsAt(x: number, y: number, area: HTMLElement): PartRow[] {
    const order = new Map<Element, number>()
    drawnAt(document, x, y).forEach((hit) => {
      for (let element: Element | undefined = hit; element && element !== area; element = composedParentOf(element)) {
        if (!order.has(element)) order.set(element, order.size)
      }
    })
    const parts = [...order.keys()].filter((element) => isShownPart(element, area))
    const isAPart = new Set(parts)
    const outerOf = (element: Element) => {
      let outer = composedParentOf(element)
      while (outer && outer !== area && !isAPart.has(outer)) outer = composedParentOf(outer)
      return outer && isAPart.has(outer) ? outer : undefined
    }
    const inside = new Map<Element | undefined, Element[]>()
    for (const part of parts) inside.set(outerOf(part), [...(inside.get(outerOf(part)) ?? []), part])
    const rows: PartRow[] = []
    const add = (outer: Element | undefined, depth: number) => {
      const own = [...(inside.get(outer) ?? [])].sort((a, b) => order.get(a)! - order.get(b)!)
      const shown: DOMRect[] = []
      for (const part of own) {
        // one squarely under another, the same box (the stock's cards):  hidden by it, so left out
        const box = part.getBoundingClientRect()
        if (box.width && shown.some((above) => isSameBox(above, box))) continue
        shown.push(box)
        rows.push({ element: part, depth })
        add(part, depth + 1)
      }
    }
    add(undefined, 0)
    return rows
  }

  /**
   * Select the part the menu was opened for, if that's still to do (`openMenu()`).
   * - Answers whether it did:  a reader of the selection right after must `flush()` first.
   */
  static selectMenuPart(): boolean {
    const element = PartEdits.menuPart
    PartEdits.menuPart = undefined
    if (!element || Inspector.isSelected(element)) return false
    Inspector.select(element)
    return true
  }

  /** The part the menu is open for, not selected yet:  `openMenu()`. */
  private static menuPart: Element | undefined
}

////////////////
// ## Types
////////////////

/** How the part menu opens:  `PartEdits.onMenu()`. */
export type MenuOpening = {
  /** where, on the page:  the click */
  x: number
  /** where, on the page:  the click */
  y: number
  /** the program's own right-click menu there, as Run shows it (`SpellElement.programMenuAt()`), shown first */
  programMenu?: readonly MenuItem[]
  /** the part it's for:  what was right-clicked, else what's selected (the Menu key) */
  part?: Element
  /** every part under the click, outermost first (`PartEdits.partsAt()`):  none from a Views tree row or a key */
  partsUnder?: readonly PartRow[]
}

/** What can be done to what's selected. */
export type PartAction = "cut" | "copy" | "paste" | "duplicate" | "remove"

/** A place, in the file it's in. */
export type FilePlace = ElementPlace & {
  /** the file */
  file: SP.AnySpellFile
}

/** Where a part is written. */
type WrittenPart = {
  /** the file */
  file: SP.AnySpellFile
  /** its text now */
  text: string
  /** the whole element;  a run of prose:  its span alone, no tag saying where it ends */
  element: WrittenElement | TextSpan
}

/** Why a part can't be changed:  the words that say so. */
type NotEditable = "partFromLoop" | "partNotWritten" | "partBusy"

/** A place, and what shows it. */
type ShownPlace = {
  /** the place */
  place: FilePlace
  /** the line, or the box round what it goes in */
  box: DOMRect
  /** which of those */
  mark: "line" | "inside"
}

////////////////
// ## Helpers
////////////////

/** The attribute the compiler's mark is on a drawn element:  `SourceMarks`'. */
const DRAWN_AT = "data-spell-at"

/** Tags that hold words or nothing, never other parts. */
const LEAF_TAGS =
  /^(ui|es)-(button|boton|input|entrada|textarea|checkbox|casilla|radio|select|slider|deslizador|progress|progreso|divider|divisor|icon|icono|image|imagen|text|texto|label|etiqueta|rating|item|elemento)$/

/** An app's tag, and a drawing's, in either language. */
const APP_TAG = /<(spell-app|aplicacion-spell)\b/
const DRAW_TAG = /<(draw|dibujar|dibujo)\b/

/** The Inspector's tree. */
const TREE_SELECTOR = ".InspectorTree"

/** A row's own line, in its shadow root:  its box holds the rows inside it too. */
const TREE_ROW_LINE = ".row"

/** The class of what shows where a drop would land. */
const MARKER_CLASS = "PartDropMarker"

/** How thick that line is, in pixels. */
const LINE_WIDTH = 2

/** What's carried, where it stays. */
const CARRIED_OPACITY = "0.45"

/** How far from the pointer the palette's label rides, in pixels. */
const GHOST_GAP = 8

/** What was last cut or copied, each a whole tag. */
let clipboard: string[] | undefined

/** Compile now, marking that what's drawn is behind the text until it's done. */
function compileNow(): void {
  Inspector.isCatchingUp = true
  editor
    .compileApp()
    .catch((error: unknown) => editor.showError(error as Error))
    .finally(() => {
      Inspector.isCatchingUp = false
    })
}

/** The key of what's at `offset` of `text`, as a part's written key will be:  `path:line:column`. */
function placeKeyAt(file: SP.AnySpellFile, text: string, offset: number): string {
  const { line, character } = SourceEdits.positionAt(text, offset)
  return `${SP.SpellLocation.filePathOf(file.path)?.replace(/^\//, "") ?? file.path}:${line}:${character}`
}

/** Is `element` the app itself, the first of the app's parts? */
function isTheApp(element: Element): boolean {
  const area = Inspector.area
  return !!area && Inspector.partsIn(area)[0]?.element === element
}

/** Does this element hold other things?  A closing tag, and not one that holds only words, nor a run of prose. */
function holdsThings(written: WrittenElement | TextSpan, element: Element): boolean {
  return "tag" in written && written.bodyStart !== undefined && !LEAF_TAGS.test(element.localName)
}

/** The place `where` `written`, beside it or in it:  beside a run of prose, its span goes too, as no tag says it. */
function placeBy(written: WrittenPart, where: ElementPlace["where"]): ElementPlace {
  const { element } = written
  return {
    opening: element.start,
    where,
    ...(!("tag" in element) && { whole: { start: element.start, end: element.end } })
  }
}

/** The first file to look in for a drawing:  the one with the app in it. */
function rankOf(file: SP.AnySpellFile): number {
  return APP_TAG.test(file.contents ?? "") ? 1 : 0
}

/** The one tag in `drawing`, when it holds only that. */
function onlyTagIn(text: string, drawing: WrittenElement): WrittenElement | undefined {
  if (drawing.bodyStart === undefined) return undefined
  const start = text.indexOf("<", drawing.bodyStart)
  if (start < 0 || start >= drawing.bodyEnd!) return undefined
  const only = SourceEdits.elementAt(text, start)
  return only && !text.slice(only.end, drawing.bodyEnd).trim() ? only : undefined
}

/** The box `element` draws:  one with no box of its own (`display: contents`) is what's inside it, shadow root or not. */
function boxOf(element: Element): DOMRect {
  const box = element.getBoundingClientRect()
  if (box.width || box.height) return box
  const inside = [...(element.shadowRoot?.children ?? []), ...element.children].map(boxOf).filter((one) => one.width)
  if (!inside.length) return box
  const left = Math.min(...inside.map((one) => one.left))
  const top = Math.min(...inside.map((one) => one.top))
  return new DOMRect(
    left,
    top,
    Math.max(...inside.map((one) => one.right)) - left,
    Math.max(...inside.map((one) => one.bottom)) - top
  )
}

/** Is (`x`, `y`) in `box`? */
function contains(box: DOMRect, x: number, y: number): boolean {
  return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom
}

/** Is `element` one of `outer`, or inside one? */
function isInside(element: Element, outer: readonly Element[]): boolean {
  for (let at: Element | null = element; at; at = at.parentElement ?? (at.getRootNode() as ShadowRoot).host ?? null) {
    if (outer.includes(at)) return true
  }
  return false
}

/** Do `element` and what's beside it lie side by side? */
function liesInRow(element: Element): boolean {
  const box = boxOf(element)
  const beside = element.nextElementSibling ?? element.previousElementSibling
  if (!beside) return false
  const other = boxOf(beside)
  return Math.min(box.bottom, other.bottom) - Math.max(box.top, other.top) > Math.min(box.height, other.height) / 2
}

/** Is `target` a row of a tree? */
function isTreeRow(target: EventTarget): boolean {
  return target instanceof Element && target.localName === "ui-tree-item"
}

/** Was `event` on a row's triangle, which opens and closes it? */
function isOnTriangle(event: Event): boolean {
  return event.composedPath().some((target) => target instanceof Element && target.classList.contains("toggle"))
}

setDebugGlobal({ PartEdits })

/**
 * Every element the browser draws at (`x`, `y`) in `root`, top-most first,
 * each followed by what its own shadow root draws there:  `PartEdits.partsAt()`.
 * - Not into a Spell UI element's shadow root:  what's in there is the element's.
 */
function drawnAt(root: Document | ShadowRoot, x: number, y: number, seen = new Set<Element>()): Element[] {
  return root.elementsFromPoint(x, y).flatMap((element) => {
    if (seen.has(element)) return []
    seen.add(element)
    const inner = element.shadowRoot && !element.localName.startsWith(UI_PREFIX) ? element.shadowRoot : undefined
    return [element, ...(inner ? drawnAt(inner, x, y, seen) : [])]
  })
}

/** Are `a` and `b` the same box, to within a pixel on each edge? */
function isSameBox(a: DOMRect, b: DOMRect): boolean {
  return (
    Math.abs(a.left - b.left) <= 1 &&
    Math.abs(a.top - b.top) <= 1 &&
    Math.abs(a.right - b.right) <= 1 &&
    Math.abs(a.bottom - b.bottom) <= 1
  )
}

/** The element `element` is inside, across shadow roots:  its parent, else its shadow root's host. */
function composedParentOf(element: Element): Element | undefined {
  return element.parentElement ?? ((element.getRootNode() as ShadowRoot).host || undefined)
}

/**
 * Can Inspect's submenu list `element`, a part under the mouse in `area`:  a part the Inspector shows,
 * inside `area`, never in the editor's own boxes nor in a Spell UI element's own shadow root?
 */
function isShownPart(element: Element, area: HTMLElement): boolean {
  if (!Inspector.isPart(element) || !Inspector.partFor(element)) return false
  if ((element.getRootNode() as ShadowRoot).host?.localName.startsWith(UI_PREFIX)) return false
  for (let outer: Element | undefined = element; outer; outer = composedParentOf(outer)) {
    if (outer === area) return true
    if (outer.hasAttribute(EDITOR_OWN)) return false
  }
  return false
}

/**
 * The element that draws `element`'s box:  itself, else the first inside it with a size, shadow root or not
 * (one with no box of its own, `display: contents`);  `undefined` when nothing of it has any size.
 */
function shownElementOf(element: Element): Element | undefined {
  const box = element.getBoundingClientRect()
  if (box.width && box.height) return element
  for (const child of [...(element.shadowRoot?.children ?? []), ...element.children]) {
    const shown = shownElementOf(child)
    if (shown) return shown
  }
  return undefined
}

/**
 * The site layout's pane `element` is in:  one of the regions a site's `<ui-page-layout>` draws round its page
 * (`SiteBase.drawLayout()`), each a child slotted by name;  `undefined` in the page itself, or outside any site.
 */
function paneOf(element: Element): Element | undefined {
  for (let at: Element | undefined = element; at; at = composedParentOf(at)) {
    if (at.matches(LAYOUT_PANE)) return at
  }
  return undefined
}

/** Is `element` in a site's layout kept, hidden, while the page shown is in another (`SiteBase.drawLayout()`)? */
function isInHiddenLayout(element: Element): boolean {
  for (let at: Element | undefined = element; at; at = composedParentOf(at)) {
    if (at.matches(HIDDEN_LAYOUT)) return true
  }
  return false
}

/** A site layout's pane:  what's slotted by name into the site's `<ui-page-layout>`;  its page is the default slot. */
const LAYOUT_PANE = "ui-page-layout.spell-site > [slot]"

/** A site's layout, or its page drawn alone, kept hidden while another is shown. */
const HIDDEN_LAYOUT = ":is(ui-page-layout.spell-site, .spell-site-alone)[hidden]"

/** Room round a part shown in view, for its ring (`PartEdits.showDrawn()`), px. */
const RING_ROOM = 8

/** The tag start of Spell UI's elements:  what's inside one's shadow root is its own. */
const UI_PREFIX = "ui-"

/** Is `event` on one of the editor's own boxes in the app's area (`EDITOR_OWN`), anywhere on its way up? */
function isInEditorOwn(event: Event): boolean {
  return event.composedPath().some((target) => target instanceof Element && target.hasAttribute(EDITOR_OWN))
}
