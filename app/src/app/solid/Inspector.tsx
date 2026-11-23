import { Show, createSignal } from "solid-js"
import type { JSX } from "@solidjs/web"
import type { TextEdit } from "vscode-languageserver"

import { UIError, kebabCase, setDebugGlobal, upperFirst } from "spell/util"
import { E } from "spell/element"
import { P } from "spell/parser/parser"
import { SourceMarks } from "spell/parser/parser/writers/SourceMarks"
import { SP } from "spell/parser/spell"
// By file:  the folder's barrel loads the language service
import { SourceEdits } from "spell/app/lsp/SourceEdits"
// by file:  the language service itself loads with the code editor
import { RenameError } from "spell/app/lsp/lsp.types"
import { editor, runtimeCore } from "spell/app/app/editor"
import type { TextChange } from "spell/app/app/EditorHistory"
import { editorPrefs } from "spell/app/app/editorPrefs"
// Import directly:  `spell/ui/util` leaves it out, so it stays out of the `core` bundle
import { SpellUIGuide } from "spell/ui/util/SpellUIGuide"
// By file:  a click's rule is all this needs
import { ListSelection, type ListClick } from "spell/util/ListSelection"
import { appTexts, renameRefusal } from "spell/app/app/ui/AppTexts"
import { ClassSchemas } from "spell/app/app/ui/ClassSchemas"
import { EDITOR_FRAME, EDITOR_OWN } from "spell/app/app/ui/ui.types"
// Import directly, NOT through the runner barrel, which brings the runners themselves
import { DRAG_START_PX } from "spell/util/Dragging"
import { SpellElement } from "spell/app/app/runner/SpellElement"
import { barTooltip } from "./chrome"
import { CodeShown } from "./EditorMode"
import { InspectorActions } from "./InspectorActions"
import { LazyCodeMirror } from "./LazyCodeMirror"
import {
  eventsDeclared,
  handlerPlacesInSource,
  handlersInSource,
  newEventIn,
  oneOfAt,
  startingValues,
  oneOfWritten,
  declaredActionPlace,
  declaredEventSpan,
  handlerSpanInSource,
  placeOfDeclaredAction,
  placeOfDeclaredEvent,
  propertyCodePlace,
  testsDeclared,
  propertyEditorInSource,
  propertyEditorTagsIn,
  withClassNames,
  type CodePlace,
  type SourceFile,
  type WrittenEvent
} from "./InspectorSource"
import { InspectorData } from "./InspectorData"
import { InspectorWrites, type InspectorScope, type NotWritten } from "./InspectorWrites"
import { FieldHomes } from "./FieldHomes"
import { PartEdits } from "./PartEdits"
import { NotebookDocs } from "./notebook/NotebookDocs"
import { LazyPiece } from "./LazyPiece"
import { PageLoading } from "./PageLoading"

import "./Inspector.css"

/****************
 * ### `Inspector`
 * Look inside the running app, and change it (epic `debut` P13):  a part selected in the app, its properties to edit.
 * - Open or closed, all its cards together:  View › Inspector, or the Inspector card's ✕;
 *   closed by the Close in its top card's header too (I186);  the top bar's Inspect app opens it again;
 *   remembered in the browser (`OPEN_PREF`).
 *   No card is hidden on its own (epic `editor` T78):  each folds to its header instead.
 * - PICKING:  while it's on, pointing at the app outlines the part under the pointer, and a click selects it:
 *   a drawn thing or a Spell UI control (an input, a button);  Alt-click selects any Spell UI element.
 *   - It starts as the Inspector opens, and stops once something's selected:  the app works as ever again.
 *   - Its crosshairs button starts it again;  Esc stops it.
 *   - The click goes to the Inspector, never to the app:  selecting a button doesn't press it.
 *   - Shift, Command or Control adds to what's selected, and keeps inspecting;
 *     so does dragging across the app's background, a rubber band (`PartSelector`).
 * - What a part is (`SelectedPart`):
 *   - a drawn spell thing (a drawable type's element, `<solitaire-card>`):
 *     its thing, with its class's properties (`ClassSchemas`)
 *   - a Spell UI element (`<ui-input>`):  the element, with its tag's attributes (its vocabulary)
 * - Edits change the running app at once, and go into the program's text as a step of `editor.history`
 *   (`InspectorWrites`;  epic `editor`);  what can't go there says so in the card (`<NotSavedNote>`).
 * - The column is `<InspectorColumn>`, in its pane (`<InspectorPane>`);
 *   the app's area it watches is handed over by `<AppPane>` (`watch()`).
 *   - They're in `InspectorView.tsx`, loaded the first time the column opens (`Inspector.views`, a `LazyPiece`):
 *     this file is the state the top bar, the menus and the hotkeys ask, in the editor's first load.
 * - On a phone, the pane is a SHEET over the page's lower part, up while something's just been selected
 *   (`isSheetUp`;  Owen's pick, epic `debut` P17, Q6).
 ****************/
export class Inspector {
  /** The Inspector's views, loaded the first time it opens:  see `LazyPiece`. */
  static views = new LazyPiece(() => import("./InspectorView"))

  /** Is the column showing (reactive)? */
  static get isOpen(): boolean {
    return isOpen()
  }

  /** Is a click in the app a selection (reactive)? */
  static get isInspecting(): boolean {
    return isInspecting()
  }

  /**
   * Does Inspect app's help show (reactive):  while inspecting, until the first selection ever, or until it's closed
   * (`dismissHelp()`);  remembered in the browser (`inspector:helpSeen`).
   */
  static get isHelpShown(): boolean {
    return isInspecting() && !helpSeen()
  }

  /** Never show Inspect app's help again:  closed, or a part selected. */
  static dismissHelp(): void {
    if (helpSeen()) return
    setHelpSeen(true)
    editorPrefs.set(HELP_SEEN_PREF, true)
  }

  /** The part selected, if any, the last one clicked when there are several (reactive). */
  static get selected(): SelectedPart | undefined {
    return selectedParts().at(-1)
  }

  /** Every part selected, in the order they were (reactive). */
  static get allSelected(): readonly SelectedPart[] {
    return selectedParts()
  }

  /**
   * On a phone, is the Inspector up, a sheet over the page's lower part (reactive)?
   * - A selection in the app puts it up;  its close, Esc, dragging it down, or inspecting again puts it away.
   * - Put away, what's selected stays selected, and outlined.
   * - Read only by a phone's layout (`Inspector.css`):  wider, the Inspector is a column, whatever this says.
   */
  static get isSheetUp(): boolean {
    return isSheetUp()
  }

  /** Put the phone's sheet away:  what's selected stays selected. */
  static putSheetAway(): void {
    setSheetUp(false)
  }

  /** The phone's sheet's height, px, as last dragged (reactive);  `undefined`:  its usual share of the screen. */
  static get sheetHeight(): number | undefined {
    return sheetHeight()
  }

  /** Make the phone's sheet `height` px tall, and remember it. */
  static setSheetHeight(height: number): void {
    setSheetHeight(height)
    editorPrefs.set(SHEET_HEIGHT_PREF, height)
  }

  /** Open the column if closed, else close it;  remember which.  Opening starts inspecting. */
  static toggle(): void {
    if (isOpen()) return Inspector.close()
    Inspector.open()
    Inspector.startInspecting()
  }

  /**
   * View › Inspector:  open the column, or close it;  remember which.
   * - Opening doesn't start inspecting:  that's Inspect app's (Owen, 2026-11-14, I75).
   */
  static showOrHide(): void {
    if (isOpen()) Inspector.close()
    else Inspector.open()
  }

  /** Open the column, every card in it, if it's closed;  remember that.  Doesn't start inspecting. */
  static open(): void {
    if (isOpen()) return
    Inspector.views.loadSoon()
    setOpen(true)
    editorPrefs.set(OPEN_PREF, true)
  }

  /**
   * Open the column, inspecting, with no help popup:  for a page that says what to do itself.
   * - SIDE EFFECT:  the help counts as seen.
   */
  static openQuietly(): void {
    Inspector.dismissHelp()
    if (isOpen()) Inspector.startInspecting()
    else Inspector.toggle()
  }

  /** Is the properties card's section for `group` folded (reactive)?  Advanced starts folded. */
  static isGroupFolded(group: InspectorBand): boolean {
    return foldedGroups().includes(group)
  }

  /** Fold the properties card's section for `group`, or unfold it;  remember which. */
  static setGroupFolded(group: InspectorBand, isFolded: boolean): void {
    const next = [...foldedGroups().filter((each) => each !== group), ...(isFolded ? [group] : [])]
    setFoldedGroups(next)
    editorPrefs.set(FOLDED_GROUPS_PREF, next)
  }

  /** Is card `panel` folded to its header (reactive)? */
  static isFolded(panel: InspectorCardId): boolean {
    return foldedPanels().includes(panel)
  }

  /** Fold card `panel` to its header, or unfold it;  remember which. */
  static toggleFolded(panel: InspectorCardId): void {
    const folded = foldedPanels()
    const next = folded.includes(panel) ? folded.filter((each) => each !== panel) : [...folded, panel]
    setFoldedPanels(next)
    editorPrefs.set(FOLDED_PANELS_PREF, next)
  }

  /** Close the column:  no inspecting, nothing selected. */
  static close(): void {
    setOpen(false)
    setSheetUp(false)
    editorPrefs.set(OPEN_PREF, false)
    Inspector.stopInspecting()
    Inspector.select(undefined)
  }

  /**
   * Start inspecting:  outline what's pointed at in the app, select what's clicked.
   * - On a phone the sheet goes down meanwhile, so the whole app can be selected from.
   */
  static startInspecting(): void {
    setInspecting(true)
    setSheetUp(false)
    const area = appArea
    if (area) PartSelector.listen(area)
  }

  /**
   * Ring `element` in the app, as Inspect app does on hover (`undefined`:  take the ring away):
   * pointing at a part in the part menu's Inspect submenu (epic `editor` P31).
   */
  static ring(element: Element | undefined): void {
    PartSelector.hover(element)
  }

  /** Stop inspecting:  the app gets its clicks back. */
  static stopInspecting(): void {
    setInspecting(false)
    PartSelector.stop()
  }

  /**
   * Select `element` (`undefined`:  nothing), outlined while it stays selected.
   * - A new selection starts the trail afresh (`inspected`);  `trail`, inspecting it again after a redraw, follows that one.
   * - It unfolds the Views card, folded, so its row can come into view there (Owen, 2026-11-16, epic `editor` I206:
   *   "Selecting a card should expand the views panel and scroll so the card is visible");  not `unfoldsViews: false`,
   *   what was selected found again after a reload or a redraw, so a card folded by hand stays folded.
   * - NOTE:  the new selection and trail are passed along, never read back:
   *   a signal reads its old value until the next flush.
   */
  static select(
    element: Element | undefined,
    { trail: steps = [] as readonly string[], unfoldsViews = true } = {}
  ): void {
    const part = element && Inspector.partFor(element)
    if (part && unfoldsViews && Inspector.isFolded("views")) Inspector.toggleFolded("views")
    setSelectedParts(part ? [part] : [])
    setTrail(steps)
    clicks.pivot = element
    editorPrefs.set(Inspector.projectPref(TRAIL_PREF), steps)
    // a thing the trail leads to that nothing draws (the deck):  nothing outlined, never the part it's reached from
    const outlined = element && (part && steps.length ? Inspector.outlinedElement(steps, part) : element)
    PartSelector.markSelected(outlined ? [outlined] : [])
    if (element) Inspector.rememberSelection([element])
  }

  /**
   * Select all of `elements` at once:  what isn't a part is left out;  one is as `select()`, none lets go.
   * - It unfolds the Views card as `select()` does, but with `unfoldsViews: false`.
   * - The last is the one the properties card says most about (`selected`).
   * - Several have no trail:  a trail starts from one thing.
   */
  static selectAll(elements: readonly Element[], { unfoldsViews = true } = {}): void {
    if (elements.length < 2) return Inspector.select(elements[0], { unfoldsViews })
    const parts = elements.flatMap((element) => Inspector.partFor(element) ?? [])
    if (parts.length && unfoldsViews && Inspector.isFolded("views")) Inspector.toggleFolded("views")
    setSelectedParts(parts)
    setTrail([])
    editorPrefs.set(Inspector.projectPref(TRAIL_PREF), [])
    PartSelector.markSelected(parts.map((part) => part.element))
    Inspector.rememberSelection(parts.map((part) => part.element))
  }

  /**
   * `element` was clicked among `items`, with `keys` held:  the same rule as a program's lists (`ListSelection`).
   * - `items` `undefined`:  it isn't in a list, so Shift toggles it.
   * - NOTE:  `select()` moves the pivot too, so a plain click elsewhere (a link, Things) starts a range;
   *   here the rule's own pivot stands.
   */
  static clicked(element: Element, items: readonly Element[] | undefined, keys: ListClick<Element>["keys"]): void {
    const selected = selectedParts().map((part) => part.element)
    const next = clicks.clicked(element, { items, selected, keys })
    const { pivot } = clicks
    Inspector.selectAll(next)
    clicks.pivot = pivot
    const place = Inspector.followedPlaceOf(element)
    if (place) editor.followed = { path: place.path, line: place.line, column: place.column, from: "parts" }
  }

  /**
   * Where the code follows to when `element` is clicked (epic `editor` P17, Code Follows Along):
   * where it's written (`writtenPlaceOf()`), except for a drawn thing made in a loop with others.
   * - Those go to their type's declaration:  a card clicked shows `a "card" is a ...` in Card.spell,
   *   not the `a new card` in Deck.spell that makes all 52 (Owen, 2026-11-17, I253:
   *   "I inspected a card and `Deck.spell` opened").
   * - A thing made on its own (the stock) still shows the line that makes it, its own place.
   * - `undefined`:  written nowhere.
   */
  static followedPlaceOf(element: Element): P.SourcePlace | undefined {
    const written = Inspector.writtenPlaceOf(element)
    const thing = SpellElement.thingOf(element)
    if (!written || written.sharedBy < 2 || !thing) return written?.place
    const names = classNamesOf(thing)
    const declared = declarationPlaces().find((place) => place.kind === "type" && place.name === names[0])
    return declared ? { path: declared.path, line: declared.line, column: declared.column } : written.place
  }

  /**
   * Select what line `line`, from 0, of the file named `path` draws or makes:  the code's cursor moved there.
   * - Every card, for the line that makes them all.
   * - A line in a tag, its content and closing tag included:  what the innermost tag around it draws,
   *   inside a drawn thing's own drawing too (a pile's placeholder, a square's button, nine times).
   * - None:  `ifNone` says.  `"keep"` leaves what's selected as it was;  `"deselect"` lets go (the code's cursor:
   *   one selection everywhere, so the card matches the outline).
   * - Returns whether it found something there.
   * - NEVER throws.
   */
  static async selectWrittenAt(
    path: string,
    line: number,
    { ifNone = "keep", isWanted = () => true }: { ifNone?: "keep" | "deselect"; isWanted?: () => boolean } = {}
  ): Promise<boolean> {
    const area = appArea
    if (!area) return false
    const written = Inspector.partsIn(area)
      .map((row) => row.element)
      .filter((element) => {
        const place = placeOfPart(element)
        return place?.path === path && place.line === line
      })
    const found = written.length
      ? written
      : await Inspector.drawnInTagAround(area, path, line).catch((error: unknown) => {
          console.error("Inspector.selectWrittenAt():  couldn't read the tag around the line", error)
          return []
        })
    // what selected it has moved on while the language service answered
    if (!isWanted()) return false
    // what's selected already, with no trail from it (another line of the same tag):  nothing to do again (I69)
    if (found.length && !trail().length && isSameElements(selectedParts(), found)) return true
    if (found.length) Inspector.selectAll(found)
    else if (ifNone === "deselect" && selectedParts().length) Inspector.select(undefined)
    return found.length > 0
  }

  /**
   * The parts in `area` the innermost tag around line `line` of file `path` draws, as the language service reads
   * its parse:  the language worker's, where it parses (`spell/partPlace`;  epic `solid-2-final` T36).
   */
  private static async drawnInTagAround(area: Element, path: string, line: number): Promise<Element[]> {
    const file = InspectorWrites.fileNamed(path)
    if (!(file instanceof SP.SpellFile) || file.contents === undefined) return []
    const lines = file.contents.split("\n")
    if (line >= lines.length) return []
    const character = Math.max(0, lines[line]!.search(/\S/))
    const { states } = (await LazyCodeMirror.load()).SpellCodeMirror
    const tag = await states.ask(file, "spell/partPlace", { position: { line, character } })
    if (!tag) return []
    // by `path` as the stamps name it:  the parse's own path is the file's whole one
    const key = placeKey({ ...tag, path })
    return drawnElementsIn(area).filter((element) => {
      const drawnAt = SourceMarks.placeOfDrawn(element)
      return Inspector.isPart(element) && drawnAt && placeKey(drawnAt) === key
    })
  }

  /** Is `element` one of what's selected, or what a trail from it has reached (reactive)? */
  static isSelected(element: Element): boolean {
    const parts = selectedParts()
    return parts.length > 1 ? parts.some((part) => part.element === element) : Inspector.inspected?.element === element
  }

  /**
   * The parts a click in the app can select, in document order:  `PartSelector.partAt()`'s rule.
   */
  static selectableParts(): Element[] {
    const area = appArea
    if (!area) return []
    return Inspector.partsIn(area)
      .map((row) => row.element)
      .filter(isSelectablePart)
  }

  /**
   * The list `part` is in, on the page:  the parts written in the same place as it, made in a loop.
   * - `undefined` when it's the only one:  it isn't in a list, so Shift toggles it, as Owen asked.
   */
  static listAround(part: Element): Element[] | undefined {
    const key = writtenKeyOf(part)
    if (!key) return undefined
    const list = Inspector.selectableParts().filter((each) => writtenKeyOf(each) === key)
    return list.length > 1 ? list : undefined
  }

  /**
   * Show what's selected in the properties card, with Inspect app off and staying off:  a right click's Inspect.
   * - SIDE EFFECT:  opens the column if it's closed, and unfolds the card;  the help counts as seen.
   */
  static showSelected(): void {
    Inspector.dismissHelp()
    if (foldedPanels().includes("properties")) Inspector.toggleFolded("properties")
    Inspector.open()
    setSheetUp(true)
  }

  /**
   * Go to where `element` is written, in the code:  a right click's Show in Code.
   * - Answers whether it's written anywhere.  NEVER throws.
   */
  static showWritten(element: Element): boolean {
    CodeShown.set(editor.project?.path, true)
    const place = Inspector.writtenPlaceOf(element)?.place
    const file = place && InspectorWrites.fileNamed(place.path)
    if (!place || !file) return false
    const at = { line: place.line, ch: place.column }
    void editor
      .showFileAt(file.path, { anchor: at, head: at })
      .catch((error: unknown) => editor.showError(error as Error))
    return true
  }

  /** Let go of what's selected:  no outline, and the properties card shows its nothing-selected state. */
  static letGo(): void {
    Inspector.select(undefined)
    editorPrefs.forget(Inspector.selectionPref)
  }

  /**
   * What the properties card shows (reactive):  what's selected, or the thing its TRAIL leads to from it
   * (Owen:  "I'd expect that the \"new discards\" line would make something that could be inspected").
   * - The trail:  the steps from the selected part's thing, a property's name (`discards`) or a list's item (`#3`);
   *   remembered with the project, as the selection is.
   * - A step that leads nowhere any more (the program changed) ends the trail there.
   * - The thing at its end is drawn when an element in the app draws it (`element`):  else it has none.
   */
  static get inspected(): Inspected | undefined {
    const parts = selectedParts()
    const base = parts.at(-1)
    if (!base) return undefined
    if (parts.length > 1) return inspectedTogether(parts, base)
    const crumbs: Crumb[] = [{ label: base.label, depth: 0 }]
    let value = base.value
    for (const step of trail()) {
      const next = stepInto(value, step)
      if (!next) break
      value = next
      crumbs.push({ label: Inspector.thingLabel(next, step), depth: crumbs.length })
    }
    if (value === base.value) return { ...base, crumbs }
    return {
      element: Inspector.elementDrawing(value),
      value,
      schema: ClassSchemas.fromClass(value.constructor, Inspector.programRoot),
      label: crumbs.at(-1)!.label,
      crumbs
    }
  }

  /** Inspect what `step` leads to from what's inspected now:  a property's thing (`discards`), a list's item (`#3`). */
  static inspect(step: string): void {
    Inspector.followTrail([...trail(), step])
  }

  /**
   * Inspect `thing`, one of the program's things, at once (Owen:  "clicking something in the 'views' tab should
   * inspect it"):  the Things view's clicks.
   * - Drawn:  its element is selected, as a click in the app would.
   * - Not drawn (a deck, a list of piles):  the drawn part it's reached from is selected, and the trail followed
   *   to it (`trailTo()`), so its crumbs say how it's reached.
   * - Neither:  nothing changes.
   * - The properties card shows, unfolded.
   */
  static inspectThing(thing: object): void {
    const area = appArea
    if (!area) return
    const drawn = Inspector.elementDrawing(thing)
    const found = drawn
      ? { element: drawn, trail: [] }
      : Inspector.partsIn(area)
          .map(({ element }) => ({ element, base: SpellElement.thingOf(element) }))
          .filter((row): row is { element: Element; base: object } => !!row.base)
          .map(({ element, base }) => ({ element, trail: trailTo(base, thing) }))
          .find((row) => row.trail)
    if (!found?.trail) return
    Inspector.open()
    if (Inspector.isFolded("properties")) Inspector.toggleFolded("properties")
    Inspector.select(found.element, { trail: found.trail })
  }

  /** Follow `steps` from what's selected;  remember them, and outline what they lead to when it's drawn. */
  private static followTrail(steps: readonly string[]): void {
    setTrail(steps)
    editorPrefs.set(Inspector.projectPref(TRAIL_PREF), steps)
    // `steps` itself:  the trail signal reads its old value until the next flush
    const outlined = Inspector.outlinedElement(steps)
    PartSelector.markSelected(outlined ? [outlined] : [])
  }

  /** The element to outline:  the one drawing what `steps` lead to (the trail), else what's selected. */
  private static outlinedElement(steps: readonly string[], base = Inspector.selected): Element | undefined {
    if (!base) return undefined
    let value = base.value
    for (const step of steps) value = stepInto(value, step) ?? value
    return value === base.value ? base.element : Inspector.elementDrawing(value)
  }

  /** The element in the app that draws `thing`, if one does. */
  static elementDrawing(thing: object): Element | undefined {
    const area = appArea
    return area
      ? Inspector.partsIn(area).find((row) => SpellElement.thingOf(row.element) === thing)?.element
      : undefined
  }

  /**
   * A thing's title:  its type in words, then which one, quoted (`thingWordsOf()`):
   * `Stock Pile "stock"`, `Card "ace of spades"`;  a list's item with neither, its place too (`Pile #3`).
   * - `element`:  the one drawing it, when the caller has it;  `null`:  none draws it;  left out, it's looked for.
   */
  static thingLabel(thing: object, step = "", element?: Element | null): string {
    const { title, which } = Inspector.thingWordsOf(thing, element)
    const titled = which ? `${title} ${which}` : title
    return step.startsWith(ITEM_STEP) && !which ? `${titled} ${step}` : titled
  }

  /**
   * A thing's type in words and which one it is, as Owen would say them:  `Stock Pile`, `"stock"`.
   * - The type:  as its program declares it (`a "stock pile" is a pile`), each word capitalised but the small ones
   *   (`Pila de Reserva`);  a type written elsewhere, its class name split into words (`StockPile` => `Stock Pile`).
   * - Which:  its name (`nameOf()`), else the id the program chose for it
   *   (`"stock" is a new stock pile`, drawn `<stock-pile "stock"/>`);  quoted, or `""` for neither.
   *   - The id is read off the element drawing it:  reading `thing.id` would make one up (`Thing.id`).
   *   - Name first:  a named thing's element is given an id from its name (`7-of-spades`), not as written.
   */
  static thingWordsOf(thing: object, element?: Element | null): { title: string; which: string } {
    const name = Inspector.nameOf(thing)
    const id = name
      ? ""
      : ((element === undefined ? Inspector.elementDrawing(thing) : element)?.getAttribute("id") ?? "")
    const which = name || (isMadeUpId(id, thing) ? "" : id)
    return { title: typeWordsOf(thing.constructor.name), which: which ? `"${which}"` : "" }
  }

  /**
   * What `thing` is called, if it has a name:  its `name`, else the one under its language's own word for it
   * (Spanish's `nombre`, from `SP.LanguageWords.builtInMembers`).
   * - Why:  a type declares its name in the language it's written in, and it compiles under that word.
   * - `languages`:  the codes to read the words of;  the running project's, by default.
   * - `""` if it has none.
   */
  static nameOf(thing: object, languages: readonly string[] = editor.project?.wordsLanguages ?? []): string {
    const words = languages.flatMap((lang) => SP.Language.all.get(lang)?.words.builtInMembers?.name ?? [])
    for (const key of ["name", ...words]) {
      const name = (thing as Record<string, unknown>)[key]
      if (typeof name === "string" && name) return name
    }
    return ""
  }

  /**
   * Select again what was selected, once the app's parts are drawn:  after a reload, a restart, a recompile
   * (Owen:  "keep everything EXACTLY THE SAME across page moves").
   * - `rows`:  the app's parts, as the parts tree walks them (`partsIn()`).
   * - While what's selected is still in the app, only its outline is put on what the trail leads to again.
   * - Found by its path among the parts (`SelectionAddress`), for this project:  none there, nothing's selected.
   */
  static restoreSelection(rows: readonly PartRow[]): void {
    const parts = selectedParts()
    // only once the edit is drawn:  until then a place in the new text still names what's there now
    if (placesToSelect && !Inspector.isCatchingUp) {
      const wanted = placesToSelect
      const found = rows.filter((row) => wanted.has(writtenKeyOf(row.element) ?? "")).map((row) => row.element)
      if (found.length) {
        const drawn = whenDrawn
        placesToSelect = undefined
        whenDrawn = undefined
        Inspector.selectAll(found)
        drawn?.(found)
        if (wordsReadyNext) requestAnimationFrame(() => setTimeout(makeWordsReady, WORDS_READY_DELAY))
        wordsReadyNext = false
        return
      }
    }
    // still there:  only their outlines, on what the trail leads to now (a redraw replaces a drawn thing's element)
    if (parts.length && parts.every((part) => part.element.isConnected)) {
      const elements = parts.map((part) => part.element)
      if (parts.length > 1) return PartSelector.markSelected(elements)
      const outlined = Inspector.outlinedElement(trail())
      return PartSelector.markSelected(outlined ? [outlined] : elements)
    }
    const remembered = editorPrefs.get(Inspector.selectionPref) as SelectionAddress | SelectionAddress[] | undefined
    const found = [remembered ?? []].flat().flatMap((address) => Inspector.elementAt(address, rows) ?? [])
    // the trail from it too, as it was left
    const steps = (editorPrefs.get(Inspector.projectPref(TRAIL_PREF)) as string[] | undefined) ?? []
    // found again, not chosen anew:  the Views card stays as it was left
    if (found.length > 1) return Inspector.selectAll(found, { unfoldsViews: false })
    if (found.length) return Inspector.select(found[0], { trail: steps, unfoldsViews: false })
    // a part no row holds (a button in a drawn thing's own drawing):  the element drawn again from the same place
    const redrawn = parts.flatMap((part) =>
      part.element.isConnected ? part.element : (Inspector.redrawnElement(part.element) ?? [])
    )
    if (redrawn.length > 1) Inspector.selectAll(redrawn, { unfoldsViews: false })
    else if (redrawn.length) Inspector.select(redrawn[0], { trail: steps, unfoldsViews: false })
    else if (parts.length) Inspector.select(undefined)
  }

  /**
   * The element a redraw put in place of `gone`, drawn from the same place in the code:  `undefined` if the part is gone.
   * - A drawn thing:  the element drawing the same thing (a live edit keeps the things).
   * - A plain tag (a button in a card's own drawing):  the tag drawn from the same place, in the same thing's drawing,
   *   found again by that thing if its element was drawn again too.
   */
  private static redrawnElement(gone: Element): Element | undefined {
    const thing = SpellElement.thingOf(gone)
    if (thing) return Inspector.elementDrawing(thing)
    const place = writtenKeyOf(gone)
    const area = appArea
    if (!place || !area) return undefined
    const host = (gone.getRootNode() as ShadowRoot).host as Element | undefined
    const hostThing = host && SpellElement.thingOf(host)
    const newHost = host?.isConnected ? host : hostThing ? Inspector.elementDrawing(hostThing) : undefined
    const where: ParentNode = newHost?.shadowRoot ?? area
    return drawnElementsIn(where).find(
      (element) => element.localName === gone.localName && writtenKeyOf(element) === place
    )
  }

  /**
   * Select what's written at `places` once it's drawn:  what was just added or moved, which the next compile draws.
   * - Each place is `path:line:column`, as a part's written key is.
   * - `drawn`:  told what's selected, once it is (`PartEdits` shows it).
   */
  static selectWhenDrawn(places: readonly string[], drawn?: (elements: readonly Element[]) => void): void {
    placesToSelect = new Set(places)
    whenDrawn = drawn
  }

  /** A gesture's compile is running:  what's drawn is behind the text (`PartEdits`). */
  static isCatchingUp = false

  /** What's selected next is new from the palette:  its words, ready to type over in the properties card. */
  static readyWordsNext(): void {
    wordsReadyNext = true
  }

  /**
   * The element at `address`:  the part at the same path (`partKeysFor()`), else the one with the same tag and `id`
   * anywhere, a card dealt to another column;  `undefined` while it isn't drawn yet.
   * - A path is never found by its place in the source or among the parts:
   *   while the app draws (Solitaire's deal), those name another part (epic `editor` I171).
   * - An address remembered before paths:  the same place in the source, else the same place among the parts.
   */
  private static elementAt(address: SelectionAddress, rows: readonly PartRow[]): Element | undefined {
    if (address.path) {
      const keys = partKeysFor(rows)
      const last = address.path.slice(address.path.lastIndexOf("/"))
      const byId = last.includes("#") ? (key: string) => key.endsWith(last) : () => false
      const entries = [...keys]
      return (entries.find(([, key]) => key === address.path) ?? entries.find(([, key]) => byId(key)))?.[0]
    }
    if (address.place) {
      const same = rows.filter((row) => writtenKeyOf(row.element) === address.place)
      const element = same[address.nth ?? 0]?.element
      if (element?.localName === address.tag) return element
    }
    const row = address.index === undefined ? undefined : rows[address.index]
    return row && row.element.localName === address.tag ? row.element : undefined
  }

  /**
   * Remember what's selected, to find it again:  by where each is written (`SelectionAddress`), so moving a part in
   * the program doesn't lose it.
   */
  private static rememberSelection(elements: readonly Element[]): void {
    const area = appArea
    const rows = area ? Inspector.partsIn(area) : []
    const keys = partKeysFor(rows)
    const addresses = elements.flatMap((element): SelectionAddress[] => {
      const path = keys.get(element)
      return path ? [{ path }] : []
    })
    if (addresses.length) editorPrefs.set(Inspector.selectionPref, addresses)
  }

  /**
   * The app's parts under `element`, in document order, each with its depth;  what isn't a part is looked through.
   * - Never the editor's own, round the program (`EDITOR_OWN`):  a notebook's contents, its examples' code editors.
   * - A view drawn in Design (`DESIGNED`):
   *   its own drawing too, in its shadow root, as it's what's being edited (epic `editor` P35, P37).
   */
  static partsIn(element: Element | ShadowRoot, depth = 0): PartRow[] {
    return [...element.children].flatMap((child) => {
      if (child.hasAttribute(EDITOR_OWN)) return []
      if (!Inspector.isPart(child)) return Inspector.partsIn(child, depth)
      const drawing = child.hasAttribute(DESIGNED) ? child.shadowRoot : null
      return [
        { element: child, depth },
        ...Inspector.partsIn(child, depth + 1),
        ...(drawing ? Inspector.partsIn(drawing, depth + 1) : [])
      ]
    })
  }

  /** The pref remembering what's selected, the project's own:  `inspector:selected:@spell/examples/tic-tac-toe`. */
  private static get selectionPref(): string {
    return Inspector.projectPref(SELECTION_PREF)
  }

  /** A pref of the Inspector's that's each project's own:  `start`, then the project's path. */
  static projectPref(start: string): string {
    return `${start}:${editor.project?.path ?? ""}`
  }

  /**
   * Watch `area`, the element the running app draws in:  `<AppPane>`'s, as it's drawn.
   * - Inspecting listens there;  a new area while inspecting moves the listening to it.
   * - Not inspecting, a click anywhere in the app lets go of what's selected
   *   (Owen, 2026-11-07:  "clicking on the blue in the pokemon page" should deselect everything).
   *   - A click inspecting takes is never the app's, so what's selected stays.
   *   - On a page that draws its body, a notebook among them, a click picks the cell it's on instead (`pagePartAt`):
   *     its controls still work as ever, as the click goes on to them (epic `notebook` P5).
   * - Returns the cleanup:  forget it, if it's still the one watched.
   */
  static watch(area: HTMLElement): () => void {
    setArea(area)
    if (isInspecting()) PartSelector.listen(area)
    const stopEditing = PartEdits.watch(area, (event) => {
      const part = PartSelector.partAt(event, area)
      const cell = Inspector.pagePartAt?.(event)
      // a control inside a page's cell is a part of its own;  else the cell, never the page round it
      return cell && !(part && part !== cell && cell.contains(part)) ? cell : part
    })
    const clicked = (event: MouseEvent) => {
      if (event.defaultPrevented || isInspecting()) return
      const cell = Inspector.pagePartAt?.(event)
      if (cell) {
        if (!Inspector.isSelected(cell) || event.shiftKey || event.metaKey || event.ctrlKey)
          Inspector.clicked(cell, undefined, event)
      } else if (Inspector.allSelected.length) Inspector.letGo()
    }
    area.addEventListener("click", clicked)
    return () => {
      area.removeEventListener("click", clicked)
      stopEditing()
      if (appArea !== area) return
      setArea(undefined)
      PartSelector.stop()
    }
  }

  /** The element the running app draws in, while it's watched (reactive):  the parts tree walks it. */
  static get area(): HTMLElement | undefined {
    areaMoved()
    return appArea
  }

  /**
   * The part a click on the app picks when it's a page that draws its body, a notebook among them:
   * the cell it's on (`NotebookController.cellAt()`).
   * - Set by `<AppPane>` while one shows;  `undefined` for any other app.
   * - Not inspecting, a click there selects it;  a press on it once selected drags it (`PartEdits.watch()`).
   */
  static pagePartAt: ((event: Event) => Element | undefined) | undefined

  /**
   * Is `element` a part the Inspector shows:  a drawn thing, or a Spell UI element?
   * - Or an element of a component built on Spell UI's, its vocabulary its own:  a notebook's `<spell-example>`.
   * - Or any other tag the drawing writes, a `<spacer />` (`isWrittenTag()`;  epic `editor` I169).
   * - An arrow:  handed on as it is (`NotebookController.cellAt()`).
   * - Never a box the editor draws round parts (`EDITOR_FRAME`):  Design's device.
   */
  static isPart = (element: Element): boolean => {
    // a box the editor draws round parts (Design's device) is looked through
    if (element.hasAttribute(EDITOR_FRAME)) return false
    return !!SpellElement.thingOf(element) || isUIElement(element) || isWrittenTag(element)
  }

  /**
   * A part's title:  `Card "queen of spades"`, `Stock Pile "stock"`, `<ui-button "20%" />`.
   * - A Spell UI element reads as its tag, then which it is:
   *   - its `name`
   *   - else its `label` (or `aria-label`:  an icon-only menu item's, `<ui-item "Cheat" />`)
   *   - else the action it draws, by its name as the code writes it, `<ui-action "auto play" />`:
   *     not its title (epic `editor` I107, I129;  Owen:  "\"Cheat\" shouldn't be upper case")
   *   - else its own words, shortened
   *     (Owen:  "show name or label to make it clearer which is which";  `<ui-button "20%" />`)
   *   - none:  its tag alone, `<ui-form />`
   */
  static labelFor(element: Element): string {
    const thing = SpellElement.thingOf(element)
    if (!thing) {
      const which = ownTitleOf(element, "as written")
      return which ? `<${element.localName} "${which}" />` : `<${element.localName} />`
    }
    return Inspector.thingLabel(thing, "", element)
  }

  /**
   * A part's title in two pieces, for the views tree:  what it is, then which one, shown muted.
   * - A drawn thing:  its type in words, then which one, quoted (`thingWordsOf()`):  `Stock Pile`, `"stock"`.
   * - A Spell UI element:  its whole title (`labelFor()`), nothing after.
   */
  static labelPartsFor(element: Element): { title: string; which: string } {
    const thing = SpellElement.thingOf(element)
    if (!thing) return { title: Inspector.labelFor(element), which: "" }
    return Inspector.thingWordsOf(thing, element)
  }

  /**
   * What kind of part `element` is, as a person would say it:  "Inspect {type}" in the part menu (epic `editor` P31).
   * - A drawn thing:  its type in words, as its Views tree row shows it (`labelPartsFor()`):  `Card`, `Stock Pile`.
   * - A Spell UI element:  its tag, `ui-button`.
   */
  static typeWordsOf(element: Element): string {
    return SpellElement.thingOf(element) ? Inspector.labelPartsFor(element).title : element.localName
  }

  /**
   * A part's words in the views tree, as a person would say them:
   * `Moves: 0`, `Stock Pile "stock"`, `Auto Play`, `Menu`.
   * - A drawn thing:  its type in words, then which one (`labelPartsFor()`).
   * - A Spell UI element:  which one it is, when it says (`ownTitleOf()`:  its `name`, `label`, action's title
   *   or own words), else what it is.
   * - `tag`:  how it's written, for the row's tooltip.
   */
  static rowWordsFor(element: Element): { label: string; which: string; tag: string } {
    const tag = Inspector.labelFor(element)
    if (SpellElement.thingOf(element)) {
      const { title, which } = Inspector.labelPartsFor(element)
      return { label: title, which, tag: element.localName }
    }
    const noun = Inspector.vocabularyOf(element)?.noun
    // a menu's or toolbar's line between groups is one of its items:  it says what it is, not "Item" (I107)
    const what =
      element.getAttribute("kind") === "divider"
        ? appTexts.text("inspectorDivider")
        : upperFirst(noun ?? element.localName)
    return { label: ownTitleOf(element) || what, which: "", tag }
  }

  /**
   * A part's icon, in the views tree.
   * - A drawn thing:  the type's own, when it has a property `icon`;  else a cube.
   * - An action (a `<ui-action>` drawing one):  a circled play, as every action shows (Owen, epic `editor` I131).
   * - A Spell UI element:  its vocabulary's (`ComponentVocabulary.icon`).
   */
  static iconFor(element: Element): string {
    const thing = SpellElement.thingOf(element) as { icon?: unknown } | undefined
    if (thing) return typeof thing.icon === "string" && thing.icon ? thing.icon : THING_ICON
    const drawn = (element as E.DOMElement).component as { actionToDraw?: object } | undefined
    if (drawn?.actionToDraw) return ACTION_ICON
    return Inspector.vocabularyOf(element)?.icon ?? CONTROL_ICON
  }

  /**
   * `element`'s Spell UI tag, `ui-segment`, when it's a Spell UI element:  for its docs (`<SpellUIDocsButton>`, T95).
   * - Its vocabulary's own tag, so a translated element (`<es-segmento>`) finds the English page.
   * - `undefined`:  a drawn thing (a program's own view, the app), or not Spell UI's.
   */
  static spellUITagOf(element: Element): string | undefined {
    if (SpellElement.thingOf(element)) return undefined
    const tag = Inspector.vocabularyOf(element)?.tag
    return tag?.startsWith("ui-") ? tag : undefined
  }

  /**
   * Open `tag`'s page of the Spell UI site, on the page server (`SpellUIGuide.addressOf()`), in ONE browser tab every
   * time (`window.open()`'s name, `spell-ui-docs`;  Owen, T95:  "Re-use the same tab for all components").
   * - Its page as the docs' data says (`SiteData.tag()`):  a tag with no page of its own, its family's, at its section
   *   (`ui-column` => `ui-grid.html#ui-column`, so `/components/ui/grid#ui-column`);  until the data's in, the tag's.
   * - SIDE EFFECT:  starts loading the data, for the next one.
   */
  static openSpellUIDocs(tag: string): void {
    const page = SpellUIGuide.addressOf(docsPages?.[tag] ?? tag)
    window.open(new URL(page, location.href).href, DOCS_TAB)
    loadDocsPages()
  }

  /** A Spell UI element's vocabulary, once its family has loaded. */
  private static vocabularyOf(element: Element): E.ComponentVocabulary | undefined {
    return (element as E.DOMElement).component?.vocabulary as E.ComponentVocabulary | undefined
  }

  /**
   * The events `element` handles:  what its drawing listens for, through Solid (`onClick` ...), each once.
   * - A drawn thing's drawing is in its shadow root:  its handlers count as the thing's.
   * - And those its tag was written with in the program (`writtenHandlersOf()`), whatever listens for them:
   *   so one added here (`addEvent()`) shows as soon as it's written.
   */
  static eventsOf(element: Element): string[] {
    const handled = [element, ...(element.shadowRoot?.querySelectorAll("*") ?? [])].flatMap((at) =>
      Object.keys(at).flatMap((key) => SOLID_HANDLER.exec(key)?.[1] ?? [])
    )
    handled.push(...Object.keys(Inspector.writtenHandlersOf(element)))
    return [...new Set(handled)]
  }

  /**
   * Where `element`'s event or ability `row` is written:  its file and lines, for its code to be edited there
   * (epic `editor`, Events In Code);  `undefined` if it can't be found.
   * - A drawn thing's:  in its type, or a type it inherits,
   *   where the compiler says it's declared (`placeOfDeclaredEvent()`).
   * - A Spell UI element's (`row.key`, its DOM event):
   *   the code inside its `onClick={...}`, never the tag around it (`handlerPlacesInSource()`, I141).
   */
  static placeOfEvent(element: Element, row: WrittenEvent & { key?: string }): SlicePlace | undefined {
    const thing = SpellElement.thingOf(element)
    if (thing) return sliceOf(placeOfDeclaredEvent(row, classNamesOf(thing), declarationPlaces(), sourceFiles()))
    const sources = new Map(sourceFiles().map((file) => [file.path, file.text]))
    const handling = [...(element.shadowRoot?.querySelectorAll("*") ?? [])]
    for (const at of [element, ...handling]) {
      const place = row.key ? handlerPlacesInSource(at, sources)[row.key] : undefined
      if (place) return sliceOf(place)
    }
    return undefined
  }

  /**
   * Where `thing`'s action `action` is written:  its file and lines, where the compiler says it's declared
   * (`placeOfDeclaredAction()`);  `undefined` if not found.
   */
  static placeOfAction(thing: object, action: { words: string; name: string }): SlicePlace | undefined {
    return sliceOf(placeOfDeclaredAction(action, classNamesOf(thing), declarationPlaces(), sourceFiles()))
  }

  /**
   * Call `thing`'s action `action` `newWords`, wherever it's named (epic `editor` I111):  its head, each call and each
   * `<action "...">`, in every file of the project, as the language service finds them (`renameActionAt()`),
   * the language worker's where it parses (`spell/renameAction`).
   * - ONE step of the editor's history, however many files it changes;  then a compile.
   * - Each place it's named is a change of its own, the last first (I168):
   *   one change from its first place to its last replaced every line between,
   *   and each code slice on those lines showed other lines until the Code card was drawn again.
   * - Answers once the files are changed, with the compile that follows (`compiled`, which NEVER rejects:
   *   a failure shows in the error banner);  `undefined` when it wasn't renamed.
   * - throws a `UIError` when the name is refused (empty, taken, not words ...):  its message says why, in words,
   *   for the field it was typed in;  any other failure shows in the error banner
   */
  static async renameAction(
    thing: object,
    action: { words: string; name: string },
    newWords: string
  ): Promise<{ compiled: Promise<void> } | undefined> {
    const place = declaredActionPlace(action, classNamesOf(thing), declarationPlaces())
    const file = place && editor.project?.spellFiles.find((each) => marksPathOf(each) === place.path)
    const head = file?.contents?.split("\n")[place!.line] ?? ""
    const at = head.toLowerCase().indexOf(action.words.toLowerCase())
    if (!file || at < 0) throw new UIError(appTexts.text("renameActionNotAction", { action: action.words }))
    try {
      const { service, states } = (await LazyCodeMirror.load()).SpellCodeMirror
      const { addresses } = service
      const renamed = await states.ask(file, "spell/renameAction", {
        position: { line: place!.line, character: at + 1 },
        newName: newWords
      })
      if (!renamed)
        throw new RenameError("renameAction():  no parse of its text as it is", { cause: { kind: "not-an-action" } })
      const { changes = {} } = renamed
      const wanted = newWords.trim().replace(/\s+/g, " ")
      const title = appTexts.text("renameAction", { action: action.words, newName: wanted })
      editor.history.transaction(title, () => {
        for (const [uri, edits] of Object.entries(changes)) {
          const at = editor.project?.spellFiles.find((each) => addresses.uriFor(each) === uri)
          if (!at) continue
          // the last first:  so the places before it are still where the service said
          for (const edit of [...edits].sort(laterFirst)) {
            const before = at.contents ?? ""
            const { span, newText } = SourceEdits.editBetween(before, SourceEdits.applied(before, [edit]))
            editor.history.change(
              { file: at, at: span.start, before: before.slice(span.start, span.end), after: newText },
              { title }
            )
          }
        }
      })
      return { compiled: editor.compileApp().catch((error: unknown) => editor.showError(error as Error)) }
    } catch (error) {
      if (!(error instanceof RenameError)) {
        editor.showError(error as Error)
        return undefined
      }
      throw new UIError(renameRefusal(error, newWords, action.words))
    }
  }

  /**
   * The thing whose TYPE the side bar is editing (epic `editor` P23, Q29):  what's inspected, a thing, while its
   * changes apply to all of its type (`scopeOf()`, All Cards);  `undefined` otherwise.
   * - Then the properties card edits the type's fields, and its events, actions and tests are cards of their own
   *   (`typeWithCards`);  a one of a kind's are its Code card (I186).
   */
  static get typeEdited(): object | undefined {
    const part = Inspector.inspected
    if (!part || part.layout || !isThing(part.value) || part.crumbs.length > 1) return undefined
    return Inspector.scopeOf(part) === "all" ? part.value : undefined
  }

  /**
   * The type whose events, actions and tests show as cards of their own (`TYPE_PANES`):
   * `typeEdited`, except a one of a kind's (the app),
   * whose code is the one Code card a column's is (epic `editor` I186).
   * - Owen:  "merge them back in like when a column is selected, with `add event` and `add action`".
   */
  static get typeWithCards(): object | undefined {
    const thing = Inspector.typeEdited
    return thing && !InspectorWrites.isOneOfAKind(thing) ? thing : undefined
  }

  /**
   * The thing whose Tests card shows:  All Cards' type, always;
   * a one of a kind's, under its Code card, only while it has tests (epic `editor` I186).
   */
  static get typeWithTests(): object | undefined {
    const thing = Inspector.typeEdited
    if (!thing) return undefined
    return !InspectorWrites.isOneOfAKind(thing) || Inspector.testsOf(thing).length ? thing : undefined
  }

  /** `thing`'s type's abilities and events, as `writtenEventsOf()` says a drawn thing's:  for its type's Events card. */
  static eventsOfType(thing: object): WrittenEvent[] {
    return eventsDeclared(classNamesOf(thing), declarationPlaces(), sourceFiles())
  }

  /** Where `thing`'s type's event or ability `row` is written (`placeOfEvent()`, for a thing). */
  static placeOfTypeEvent(thing: object, row: Pick<WrittenEvent, "words">): SlicePlace | undefined {
    return sliceOf(placeOfDeclaredEvent(row, classNamesOf(thing), declarationPlaces(), sourceFiles()))
  }

  /**
   * `thing`'s type's tests (`<test "card setup">`), each its words, compiled name and where its code is:
   * those written in its type's own lines (`testsDeclared()`), its own type's and those it inherits.
   */
  static testsOf(thing: object): { words: string; output?: string; place?: SlicePlace }[] {
    return classNamesOf(thing).flatMap((name) =>
      testsDeclared(name, declarationPlaces(), sourceFiles()).map((test) => ({ ...test, place: sliceOf(test.place) }))
    )
  }

  /**
   * How `thing`'s type writes its property `name` (its compiled name), for the All Cards fields (epic `editor` P23, Q29):
   * - `spell`:  where the Spell that works it out is (`<property "name">its rank + ...</>`), to show and edit there
   * - `oneOf`:  its values, as its `one-of` says them (`ace, 2 ... 10, jack ...`)
   * - `undefined`:  the program doesn't declare it, e.g. a built-in type's
   */
  static propertyWritten(
    thing: object,
    name: string
  ): { spell?: SlicePlace; oneOf?: NonNullable<ReturnType<typeof oneOfAt>> & { path: string } } | undefined {
    const files = sourceFiles()
    const key = name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")
    for (const type of classNamesOf(thing)) {
      for (const place of declarationPlaces()) {
        if (place.kind !== "property" || place.of !== type) continue
        if ((place.output ?? place.name).toLowerCase().replace(/[^\p{L}\p{N}]/gu, "") !== key) continue
        const lines = files.find((file) => file.path === place.path)?.text.split("\n")
        if (!lines) return undefined
        const oneOf = oneOfAt(place, lines)
        return { spell: sliceOf(propertyCodePlace(place, lines)), oneOf: oneOf && { ...oneOf, path: place.path } }
      }
    }
    return undefined
  }

  /**
   * What a new thing of the type `classNames` names must be told to draw (`startingValues()`):  `[]` for none.
   * - `classNames`:  its type's compiled name, then those it inherits, its own first.
   */
  static startingValuesOf(classNames: readonly string[]): { words: string; value: string }[] {
    return startingValues(classNames, declarationPlaces(), sourceFiles())
  }

  /**
   * Write `values` as `thing`'s type's property `name`'s `one-of`, as a step of `editor.history`:
   * All Cards' rank, its values as pills (Q29).
   * - Nothing happens when it has no `one-of` written, or the values are the same.
   */
  static writeOneOf(thing: object, name: string, values: readonly string[]): void {
    const oneOf = Inspector.propertyWritten(thing, name)?.oneOf
    const file = oneOf && sliceOf({ path: oneOf.path, from: oneOf.line + 1, to: oneOf.line + 1 })?.file
    if (!oneOf || !file || !values.length) return
    const text = file.contents ?? ""
    const before = text.split("\n")[oneOf.line]!.slice(oneOf.from, oneOf.to)
    const after = oneOfWritten(values, oneOf.isOr)
    if (before === after) return
    const at = SourceEdits.offsetAt(text, { line: oneOf.line, character: oneOf.from })
    editor.history.change({ file, at, before, after }, { title: InspectorWrites.titleOf(name) })
  }

  /**
   * A drawn thing's abilities and events, in its program's own words, each with its code (epic `debut` P28):
   * `it can give up a card if` (`the card is face up`), `on click` (`play it`).
   * - Where the compiler says its type and those it inherits declare them (`eventsDeclared()`).
   * - None found there (a program compiled with no source map):  its event methods, by their names.
   * - Not a drawn thing:  none.
   */
  static writtenEventsOf(element: Element): WrittenEvent[] {
    const thing = SpellElement.thingOf(element)
    if (!thing) return []
    const written = eventsDeclared(classNamesOf(thing), declarationPlaces(), sourceFiles())
    return written.length ? written : InspectorActions.eventsOf(thing)
  }

  /**
   * The property editor `thing`'s type was written with, its markup (epic `debut` I86):
   * its `"card" is a property editor`, else the one of a type it inherits;
   * `""` if none, and the Inspector draws its bands.
   * - In its own file, `Card.editor.spell` or `Solitaire.editors.spell` (epic `editor` P25).
   * - Read from the program's files as they are now, so an edit shows once the app runs again.
   * - A built-in template's property, named in the program's language (`name="dirección"`):
   *   named as its class names it, so it's bound to the thing (`withClassNames()`;  epic `language` T73).
   */
  static ownEditorOf(thing: object): string {
    const project = editor.project
    const files = project?.files.filter((file) => SP.isPropertyEditorsName(file.path)) ?? []
    loadUnread(files)
    const editors = files.map((file) => file.contents ?? "")
    const markup = propertyEditorInSource(InspectorActions.typeWordsOf(thing), editors)
    const root = Inspector.programRoot
    if (!markup || !root) return markup
    const said = ClassSchemas.templateWordsOf(thing.constructor, root)
    return withClassNames(markup, new Map([...said].map(([name, words]) => [words.name, name])))
  }

  /**
   * Where each element of `thing`'s own property editor is written (`ownEditorOf()`), as a drawn part's place:
   * `Card.editor.spell:6:2`, in the order written;  `[]` with none.
   * - So Design (`<DesignStage>`) marks its editor's elements, and a drop on one writes beside it.
   */
  static ownEditorPlacesOf(thing: object): string[] {
    const editors = (editor.project?.files ?? [])
      .filter((file) => SP.isPropertyEditorsName(file.path))
      .map((file) => ({ path: InspectorWrites.pathOf(file), text: file.contents ?? "" }))
    const found = propertyEditorTagsIn(InspectorActions.typeWordsOf(thing), editors)
    return found?.places.map(({ line, column }) => `${found.path}:${line}:${column}`) ?? []
  }

  /**
   * The root scope of the program the editor has, in its languages (`SP.Language.rootScopeFor()`):
   * what its built-in templates' properties and values are called there.
   * - `undefined`:  no program, or one whose files name a language spell doesn't read.
   */
  static get programRoot(): P.Scope | undefined {
    const project = editor.project
    if (!project) return undefined
    try {
      return SP.Language.rootScopeFor(project.languages)
    } catch {
      return undefined
    }
  }

  /** Is `element` a drawn spell thing (`<solitaire-card>`), not a Spell UI element? */
  static isDrawnThing(element: Element): boolean {
    return !!SpellElement.thingOf(element)
  }

  /**
   * The code `element` was written with for each event, from the program's spell (`handlersInSource()`):
   * `{ click: "add someone" }`.
   * - A drawn thing's handlers are on what its drawing holds:  the thing's, merged.
   * - Not found:  `{}`.
   */
  static writtenHandlersOf(element: Element): Record<string, string> {
    const sources = new Map(
      (editor.project?.spellFiles ?? []).map((file) => [
        SP.SpellLocation.filePathOf(file.path)?.replace(/^\//, "") ?? file.path,
        file.contents ?? ""
      ])
    )
    const handling = [...(element.shadowRoot?.querySelectorAll("*") ?? [])].filter((at) =>
      Object.keys(at).some((key) => SOLID_HANDLER.test(key))
    )
    return Object.assign({}, ...[element, ...handling].map((at) => handlersInSource(at, sources)))
  }

  /**
   * Where `element` is written, as the compiler marked it:  a thing's making (`a new card`), else its drawn tag.
   * - `sharedBy`:  how many of the app's parts come from that one place.  More than one:  made in a loop, so an edit
   *   of "this one" has nowhere of its own to go.
   * - `undefined`:  it has no place, e.g. a widget made it.
   */
  static writtenPlaceOf(element: Element): { place: P.SourcePlace; sharedBy: number } | undefined {
    const place = placeOfPart(element)
    if (!place) return undefined
    const rows = appArea ? Inspector.partsIn(appArea) : []
    const key = placeKey(place)
    const sharedBy = rows.filter((row) => {
      const other = placeOfPart(row.element)
      return other && placeKey(other) === key
    }).length
    return { place, sharedBy }
  }

  /** The tooltip saying where `element` is written, in the app's words:  `""` when it has no place. */
  static writtenPlaceTitle(element: Element | undefined): string {
    const written = element && Inspector.writtenPlaceOf(element)
    if (!written) return ""
    const { place, sharedBy } = written
    const params = { file: place.path, line: place.line + 1, count: sharedBy }
    return appTexts.text(sharedBy > 1 ? "inspectorWrittenAtShared" : "inspectorWrittenAt", params)
  }

  /** Show the code a field's value comes from. */
  static async showCode(home: Extract<NotWritten, { reason: "expression" }>): Promise<void> {
    const file = editor.project?.spellFiles.find((each) => each.path.endsWith(`/${home.file}`))
    if (!file) return
    const text = file.contents ?? ""
    const anchor = SourceEdits.positionAt(text, home.span.start)
    const head = SourceEdits.positionAt(text, home.span.end)
    await editor.showFileAt(file.path, {
      anchor: { line: anchor.line, ch: anchor.character },
      head: { line: head.line, ch: head.character }
    })
  }

  /**
   * Field `name` of `part` was changed in the properties card:  the same change goes into the program's source.
   * - Written once where each field lives is known (`FieldHomes`):  at once, as it is once the part's been drawn.
   * - What can't go there says so under its field (`Inspector.noteNotSaved()`);
   *   code, with a way to it, in the card (`<NotSavedNote>`).
   */
  static fieldWritten(part: Inspected, name: string, value: unknown, late?: "late"): void {
    // a value kept in a place is the program's data, never the source's:  its change is held until it's committed
    if (!part.layout && InspectorData.isKeptInPlace(part.value, name)) return
    const each = part.together ?? [part]
    // where each lives isn't known yet (the language worker's answer):  all of them written once it is, as one step
    const unknown = late ? [] : each.filter((one) => !InspectorWrites.knowsHomes(one, name))
    if (unknown.length) {
      void Promise.all(unknown.map((one) => FieldHomes.asked(one.value, [name])))
        .then(() => Inspector.fieldWritten(part, name, value, "late"))
        .catch((error: unknown) => console.error("Inspector.fieldWritten():  couldn't write it", error))
      return
    }
    const whys = editor.history.transaction(
      InspectorWrites.titleOf(name),
      () => each.map((one) => InspectorWrites.written(one, name, value, Inspector.scopeOf(one))),
      `together:${name}`
    )
    const why = whys.find((reason) => reason)
    setNotSaved(why && { part, name, why })
  }

  /**
   * What a change to `part`'s fields applies to:  this one, or all of its type.
   * - The person's last choice for its type, in this project;  else where it starts (`InspectorWrites.startingScope()`).
   * - A Spell UI element has no type of its own to change:  always this one.
   */
  static scopeOf(part: { value: object }): InspectorScope {
    if (!isThing(part.value)) return "this"
    // the only one of its type:  its type IS it, so changes go there, never asked (epic `editor` I183)
    void homesAnswered()
    if (InspectorWrites.isOneOfAKind(part.value)) return "all"
    void scopeChoices()
    const chosen = Inspector.scopesChosen[part.value.constructor.name]
    return chosen ?? InspectorWrites.startingScope(part.value, Inspector.storedNamesOf(part.value))
  }

  /**
   * Why changes to `part`'s fields can't all be saved, for each field's flask icon (Q29, Q30):
   * on This, a thing made in a loop has no line of its own to write to.
   * - Several:  each one's own line is written, and this says some can't be.
   * - `undefined`:  every change can be saved.
   */
  static unsavedTipOf(part: Inspected): string | undefined {
    if (!isThing(part.value) || Inspector.scopeOf(part) !== "this") return undefined
    const each = part.together ?? [part]
    const automatic = each.filter((one) => !InspectorWrites.hasOwnLine(one.value)).length
    if (!automatic) return undefined
    return appTexts.text(automatic < each.length ? "inspectorUnsavedSomeAuto" : "inspectorUnsavedAuto")
  }

  /** Apply changes to `part`'s fields to `scope`, remembered for its type. */
  static setScope(part: { value: object }, scope: InspectorScope): void {
    const key = part.value.constructor.name
    editorPrefs.set(Inspector.projectPref(SCOPE_PREF), { ...Inspector.scopesChosen, [key]: scope })
    setScopeChoices((count) => count + 1)
    setNotSaved(undefined)
  }

  /** The choices made in this project, by type. */
  private static get scopesChosen(): Record<string, InspectorScope> {
    return (editorPrefs.get(Inspector.projectPref(SCOPE_PREF)) as Record<string, InspectorScope> | undefined) ?? {}
  }

  /** The names of `thing`'s stored properties:  what the side bar can edit. */
  private static storedNamesOf(thing: object): string[] {
    return ClassSchemas.fromClass(thing.constructor).attributes.map((attribute) => attribute.name)
  }

  /**
   * Where each of `part`'s fields comes from, for its `<ui-property-editor>`.
   * - A thing's value kept in a data place, or worked out from one, says so over what the code says (epic `editor` P26).
   */
  static originsOf(part: Inspected): ReturnType<typeof InspectorWrites.originsOf> {
    void homesAnswered()
    const names = part.layout ? part.layout.fields.map((field) => field.name) : Inspector.storedNamesOf(part.value)
    const origins = InspectorWrites.originsOf(part, names, Inspector.scopeOf(part))
    // the others changed with it:  where their fields live asked now, so a change writes them all at once
    for (const one of part.together ?? []) if (one !== part) FieldHomes.of(one.value, names)
    Inspector.noteNotSaved(part, origins)
    if (part.layout) return origins
    for (const name of [...names, ...Inspector.computedNamesOf(part.value)]) {
      const origin = InspectorData.originOf(part.value, name)
      if (origin) origins[name] = InspectorData.propertyOrigin(origin)
    }
    return origins
  }

  /**
   * The last change to one of `part`'s fields wasn't kept:  a line under that field says why (epic `editor` I244).
   * - Not code it comes from:  that says so in the card, with a link to the code (`<NotSavedNote>`).
   * - SIDE EFFECT:  writes `origins`.
   */
  private static noteNotSaved(part: Inspected, origins: ReturnType<typeof InspectorWrites.originsOf>): void {
    const last = notSaved()
    if (last?.part !== part || !isNotedUnderField(last.why)) return
    origins[last.name] = {
      ...(origins[last.name] ?? { kind: "inherited" }),
      note: notSavedWords(last.why.reason, part)
    }
  }

  /** The names of `thing`'s stored properties, which a data place may keep:  for `<DataSourceNote>`. */
  static dataNamesOf(thing: object): string[] {
    return Inspector.storedNamesOf(thing)
  }

  /** The names of `thing`'s computed properties, as the running program knows them:  shown read only. */
  private static computedNamesOf(thing: object): string[] {
    const things = runtimeCore()?.things
    if (!things || !isThing(thing)) return []
    return things
      .propertiesOf(thing as never)
      .filter((property) => property.computed)
      .map((property) => property.name)
  }

  /** Seen from "all of them", can nothing of `part`'s change?  Each one's values come from the code that makes it. */
  static isAllFromCode(part: Inspected): boolean {
    return Object.values(Inspector.originsOf(part)).every((origin) => origin.kind === "worked out")
  }

  /** The field's reset button:  take it off the source. */
  static fieldReset(part: Inspected, name: string): void {
    editor.history.transaction(InspectorWrites.titleOf(name), () => {
      for (const one of part.together ?? [part]) InspectorWrites.reset(one, name)
    })
    setNotSaved(undefined)
  }

  /** The field's code button:  show where its value comes from. */
  static fieldCode(part: { element?: Element; value: object }, name: string): void {
    // kept in a data place, or worked out from one:  the line that declares it
    const declaredAt = InspectorData.originOf(part.value, name)?.declaredAt
    if (declaredAt) {
      // its name in the project, as `showCode()` finds a file:  a line in another project isn't shown
      const project = `${editor.project?.path ?? ""}/`
      const file = declaredAt.path.startsWith(project) ? declaredAt.path.slice(project.length) : declaredAt.path
      void Inspector.showCode({ reason: "expression", file, span: { start: declaredAt.start, end: declaredAt.end } })
      return
    }
    const why = InspectorWrites.written(
      part,
      name,
      (part.value as Record<string, unknown>)[name],
      Inspector.scopeOf(part)
    )
    if (why?.reason === "expression") void Inspector.showCode(why)
  }

  /**
   * Add DOM event `event` (`click`) to `element`:  an empty handler, written in its place in the program,
   * as a step of `editor.history` (epic `editor`, Events In Code).
   * - A drawn thing's:  in its own type, `- on click:` after its outline header's lines (`a card:`),
   *   else `<on click>` ... `</on>` before its tag's end.
   * - A Spell UI element's:  `onClick={}` on its tag.
   * - Its row then shows with the cursor in its code (`Inspector.justAdded`).
   * - Nothing happens where it can't be written:  an element with no place in the program.
   * - TODO:  a Spanish program's own words (`al hacer clic`):  English is written for now.
   */
  static addEvent(element: Element, event: string): void {
    const thing = SpellElement.thingOf(element)
    const written = thing
      ? newEventIn(InspectorActions.typeWordsOf(thing), sourceFiles(), onWordsOf(event))
      : newHandlerOn(element, event)
    if (!written) return
    const file = sliceOf({ path: written.path, from: 1, to: 1 })?.file
    if (!file) return
    setJustAdded(thing ? onWordsOf(event) : event)
    editor.history.change(
      { file, at: written.at, before: "", after: written.code },
      { title: appTexts.text("inspectorAddEvent") }
    )
  }

  /**
   * The thing whose type Add Action writes into, for `element` selected (epic `editor` I197, J160):
   * - a drawn thing (`<solitaire-card>`):  its own thing
   * - a Spell UI element (a `<button>` in a drawing):  the nearest view drawing it, the element whose drawing holds it,
   *   through its shadow root:  its event handlers can call that view's actions
   * - `undefined`:  no view draws it
   */
  static actionHomeOf(element: Element): object | undefined {
    for (let at: Element | undefined = element; at; at = at.parentElement ?? shadowHostOf(at)) {
      const thing = SpellElement.thingOf(at)
      if (thing) return thing
    }
    return undefined
  }

  /**
   * Add an empty action to `thing`'s type, `to "new action"`, as a step of `editor.history` (epic `editor` T79):
   * the Code card's Add Action.
   * - Written as an event is (`newEventIn()`):  after its type's last line, its empty body a level in.
   * - Named `new action`, else `new action 2` ... one none of its actions has.
   * - Its row then shows with the cursor in its code (`Inspector.justAdded`);  it's renamed in its signature.
   * - `from`:  the Spell UI element it was added from, when `thing` is the view drawing it (`actionHomeOf()`, I197):
   *   that view is selected, so its Code card shows the new action, the cursor in it.
   * - Nothing happens where its type can't be found in the program.
   * - TODO:  a Spanish program's own words (`para "nueva acción"`):  English is written for now, as `addEvent()` does.
   */
  static addAction(thing: object, from?: Element): void {
    const core = runtimeCore()
    const actions = core ? InspectorActions.of(thing, core, editor.programWords) : []
    const words = newActionWords(actions.map((action) => action.words))
    const written = newEventIn(InspectorActions.typeWordsOf(thing), sourceFiles(), `to "${words}"`)
    if (!written) return
    const file = sliceOf({ path: written.path, from: 1, to: 1 })?.file
    if (!file) return
    setJustAdded(words)
    editor.history.change(
      { file, at: written.at, before: "", after: written.code },
      { title: appTexts.text("inspectorAddAction") }
    )
    if (from) Inspector.inspectThing(thing)
  }

  /**
   * Remove `element`'s event `row` from the program (epic `editor` T73):  its head and its code, as a step of
   * `editor.history`, so one undo puts it back.
   * - `when`:  `"after asking"` (a click on its ✕) asks first, naming it;  `"at once"` (an ⌥-click) doesn't.
   * - A drawn thing's:  its lines in its type (`declaredEventSpan()`).
   * - A Spell UI element's:  its ` onClick={...}` (`handlerSpanInSource()`).
   * - Nothing happens where it can't be found.
   * - NEVER throws.
   */
  static async removeEvent(
    element: Element,
    row: WrittenEvent & { key?: string },
    when: "after asking" | "at once"
  ): Promise<void> {
    const title = appTexts.text("inspectorRemoveEvent", { event: row.words })
    if (when === "after asking") {
      if (!Inspector.removalOf(element, row)) return
      const message = appTexts.text("inspectorRemoveEventConfirm", { event: row.words })
      const ok = appTexts.text("inspectorRemoveEventOk")
      if (!(await editor.confirm({ message, ok, danger: true }).catch(() => false))) return
    }
    // found again after asking:  the file may have changed meanwhile
    const removal = Inspector.removalOf(element, row)
    if (removal) editor.history.change(removal, { title })
  }

  /**
   * The change that removes `element`'s event `row` (`removeEvent()`):  `undefined` when it isn't found,
   * or what's there isn't it, e.g. the code typed since its last compile moved it.
   */
  private static removalOf(element: Element, row: WrittenEvent & { key?: string }): TextChange | undefined {
    const thing = SpellElement.thingOf(element)
    const sources = new Map(sourceFiles().map((file) => [file.path, file.text]))
    const handling = [element, ...(element.shadowRoot?.querySelectorAll("*") ?? [])]
    const span = thing
      ? declaredEventSpan(row, classNamesOf(thing), declarationPlaces(), sourceFiles())
      : handling.map((at) => (row.key ? handlerSpanInSource(at, sources, row.key) : undefined)).find(Boolean)
    const file = span && sliceOf({ path: span.path, from: 1, to: 1 })?.file
    if (!span || !file) return undefined
    const before = (file.contents ?? "").slice(span.start, span.end)
    const named = thing ? row.words : `on${upperFirst(row.key ?? "")}`
    if (!before.replace(/\s+/g, " ").toLowerCase().includes(named.replace(/\s+/g, " ").toLowerCase())) return undefined
    return { file, at: span.start, before, after: "" }
  }

  /** The words or DOM event of the row added last (`addEvent()`), for it to take the cursor;  `""` once it has. */
  static get justAdded(): string {
    return justAdded()
  }

  /** The row added last has taken the cursor. */
  static tookCursor(): void {
    setJustAdded("")
  }

  /**
   * What `element` is, as the Inspector shows it:  a drawn thing, a Spell UI element, else `undefined`.
   * - `thing`:  what it draws, when the caller knows it before the element does (a view drawn alone, as it is made).
   */
  static partFor(element: Element, thing = SpellElement.thingOf(element)): SelectedPart | undefined {
    if (thing) {
      return {
        element,
        value: thing,
        schema: ClassSchemas.fromClass(thing.constructor, Inspector.programRoot),
        label: Inspector.labelFor(element)
      }
    }
    if (isUIElement(element) || isWrittenTag(element)) {
      // its attributes as its vocabulary lists them
      const component = (element as Element & { component?: { vocabulary?: { attributes?: FieldSpec[] } } }).component
      const fields = component?.vocabulary?.attributes ?? []
      return {
        element,
        value: element,
        schema: element.localName,
        label: Inspector.labelFor(element),
        layout: {
          // its text, when it holds only text:  a button's words aren't an attribute
          hasText: element.childElementCount === 0 && !!element.textContent?.trim(),
          // every field in its vocabulary's place, set or not:  a value never moves its field (epic `editor` I199)
          fields
        }
      }
    }
    return undefined
  }
}

/** What the Inspector shows for several parts selected together. */
function inspectedTogether(parts: readonly SelectedPart[], main: SelectedPart): Inspected {
  const label = togetherLabel(parts)
  return {
    ...main,
    label,
    together: parts,
    crumbs: [{ label, depth: 0 }],
    schema: sharedSchema(parts),
    layout: sharedLayout(parts)
  }
}

/** Several parts' title:  `3 cards` when they're one kind, else `3 parts`. */
function togetherLabel(parts: readonly SelectedPart[]): string {
  const [first] = parts
  const count = parts.length
  if (parts.every((part) => isSameKind(part, first!))) {
    const kind = isThing(first!.value) ? first!.value.constructor.name : first!.element.localName
    return appTexts.text("inspectorSelectedMany", {
      count,
      kind: P.pluralize(kind.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase())
    })
  }
  return appTexts.text("inspectorSelectedParts", { count })
}

/** Are `a` and `b` one kind:  things of one type, or Spell UI elements of one tag? */
function isSameKind(a: SelectedPart, b: SelectedPart): boolean {
  return isThing(a.value) && isThing(b.value)
    ? a.value.constructor === b.value.constructor
    : !isThing(a.value) && !isThing(b.value) && a.element.localName === b.element.localName
}

/**
 * What several parts have in common, as the properties editor's schema:  their one schema when they're one kind;
 * things of several types, the properties they all declare;  anything else, none.
 */
function sharedSchema(parts: readonly SelectedPart[]): SelectedPart["schema"] {
  const [first] = parts as readonly [SelectedPart, ...SelectedPart[]]
  if (parts.every((part) => isSameKind(part, first))) return first.schema
  const schemas = parts.map((part) => part.schema)
  if (schemas.some((schema) => typeof schema === "string")) return { name: first.label, attributes: [] }
  const [one, ...others] = schemas as ReturnType<typeof ClassSchemas.fromClass>[]
  const attributes = one!.attributes.filter((attribute) =>
    others.every((other) =>
      other.attributes.some((each) => each.name === attribute.name && each.type === attribute.type)
    )
  )
  return { name: first.label, attributes }
}

/** Several Spell UI elements' fields:  one tag's, and no text field;  else none. */
function sharedLayout(parts: readonly SelectedPart[]): SelectedPart["layout"] {
  const [first] = parts as readonly [SelectedPart, ...SelectedPart[]]
  if (!first.layout || !parts.every((part) => isSameKind(part, first))) return undefined
  return { hasText: false, fields: first.layout.fields }
}

/**
 * Is `element` a Spell UI element (`<ui-*>`), or of a component built on Spell UI's with a vocabulary of its own
 * (a notebook's `<spell-example>`, once its family has loaded)?
 */
function isUIElement(element: Element): boolean {
  return element.localName.startsWith(UI_PREFIX) || !!(element as E.DOMElement).component?.vocabulary
}

/** Where a part is written, as a key:  `undefined` when it has no place. */
function writtenKeyOf(element: Element): string | undefined {
  const place = placeOfPart(element)
  return place && placeKey(place)
}

/** Can a click in the app select `element`, with no Alt held -- see `PartSelector.partAt()`? */
function isSelectablePart(element: Element): boolean {
  if (isPartOfItsThing(element)) return false
  return !!SpellElement.thingOf(element) || isClickableTag(element) || hasOwnHandler(element)
}

/**
 * Is `element` part of the drawn thing whose drawing it's in:  a Solitaire card's card image, a pile's placeholder?
 * - Then a click or a rubber band takes that thing, as a button's icon is the button's;
 *   Alt-click still reaches it (epic `codemirror` I13:  a card's front and back and a foundation's placeholder are card
 *   images since epic `language` T138, and a click on any card selected its image).
 * - It is when it's drawn inside another drawn thing (never the app itself), and either
 *   - draws a thing its tag made for itself (`SpellElement.drawsItsOwnThing()`), not one of the program's,
 *   - or fills that thing:  its drawn box within a pixel of the thing's, each edge
 */
function isPartOfItsThing(element: Element): boolean {
  const host = (element.getRootNode() as ShadowRoot).host
  if (!host || !SpellElement.thingOf(element) || !SpellElement.thingOf(host)) return false
  if (appArea && host === Inspector.partsIn(appArea)[0]?.element) return false
  if (SpellElement.drawsItsOwnThing(element)) return true
  const [own, its] = [element.getBoundingClientRect(), host.getBoundingClientRect()]
  return (
    Math.abs(own.left - its.left) <= 1 &&
    Math.abs(own.top - its.top) <= 1 &&
    Math.abs(own.right - its.right) <= 1 &&
    Math.abs(own.bottom - its.bottom) <= 1
  )
}

/** Every element under `root`, in document order, through drawn things' shadow roots. */
function drawnElementsIn(root: ParentNode): Element[] {
  return [...root.querySelectorAll("*")].flatMap((element) =>
    element.shadowRoot ? [element, ...drawnElementsIn(element.shadowRoot)] : [element]
  )
}

/** Where a part is written:  its thing's making, else its drawn tag -- see `Inspector.writtenPlaceOf()`. */
function placeOfPart(element: Element): P.SourcePlace | undefined {
  const thing = SpellElement.thingOf(element)
  return (thing && SourceMarks.placeOfThing(thing)) ?? SourceMarks.placeOfDrawn(element)
}

/** `place` as a key. */
function placeKey({ path, line, column }: P.SourcePlace): string {
  return `${path}:${line}:${column}`
}

/** What the properties card shows:  a selection, or the thing its trail leads to, with the trail to it. */
export type Inspected = Omit<SelectedPart, "element"> & {
  /** The element drawing it, outlined:  none for a thing nothing draws. */
  element?: Element
  /** The trail from what's selected to it, a step each (what's selected first). */
  crumbs: Crumb[]
  /**
   * Every part, when several are selected together:  a change goes to them all, as one step.
   * - `value`, `element` and the rest are the last one clicked's;  `schema`, `label` and `layout` are theirs together.
   */
  together?: readonly SelectedPart[]
}

/** One step of the trail:  its title, and how far along it is (0:  what's selected). */
export type Crumb = { label: string; depth: number }

/** A part of the running app, selected in the Inspector. */
export type SelectedPart = {
  /** Its element in the app, outlined. */
  element: Element
  /** What the editor binds to:  the thing a drawn element draws, else the element itself. */
  value: object
  /** What the editor shows:  the thing's class's properties, or the Spell UI tag's name (its vocabulary's). */
  schema: ReturnType<typeof ClassSchemas.fromClass> | string
  /** Its title:  `Card "queen of spades"`, `<ui-input>`. */
  label: string
  /**
   * A Spell UI element's fields, in its vocabulary's order, whether it sets them or not;
   * `undefined`, the schema's own order (a thing's properties are all set).
   */
  layout?: {
    /** It holds only text, its words:  a field for them first, its `textContent`. */
    hasText: boolean
    /** Its attributes, in its vocabulary's order:  each keeps its place, set or not (epic `editor` I199). */
    fields: FieldSpec[]
  }
}

/** The name ending of an attribute that places another:  `icon-position` places `icon`. */
export const POSITION_SUFFIX = "-position"

/** One of the app's parts, as the parts tree lists it:  the part, and how deep it sits. */
export type PartRow = { element: Element; depth: number }

/**
 * Where a selected part was, to select it again:  its `path` among the parts (`partKeysFor()`).
 * - Remembered before paths (epic `editor` I171), and still read:  where it's written first (`place`), the `nth` drawn
 *   from that place;  else its place among the parts (`index`) and its `tag`.
 */
type SelectionAddress = { path?: string; index?: number; tag?: string; place?: string; nth?: number }

/** `element`'s own words, its text children's, shortened to `WORDS_LENGTH` characters:  `""` for none. */
function ownWords(element: Element): string {
  const words = [...element.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
  return words.length > WORDS_LENGTH ? `${words.slice(0, WORDS_LENGTH - 1)}…` : words
}

/** The most of a part's own words its title shows. */
const WORDS_LENGTH = 24

/**
 * Which Spell UI element `element` is, in its own words:  `""` for none.
 * - its `name`, else its `label` (or `aria-label`:  an icon-only menu item's)
 * - else the action it draws:  a `<ui-action>`'s words are its action's, not its own (epic `editor` I107)
 *   - `"as said"`:  its title, as people read it, `Auto Play` (the views tree's row)
 *   - `"as written"`:  its name as the code writes it, `auto play` (the card's header, the row's tooltip;  I129)
 * - else its own words, shortened
 */
function ownTitleOf(element: Element, words: "as said" | "as written" = "as said"): string {
  const action = (element as E.DOMElement).component as
    | { actionToDraw?: { title?: unknown; name?: unknown } }
    | undefined
  const { title, name } = action?.actionToDraw ?? {}
  // an action's name is its method's, `autoPlay`:  its words are the code's, `auto play`
  const actionWords =
    words === "as written" && typeof name === "string" && name
      ? kebabCase(name).replaceAll("-", " ")
      : typeof title === "string"
        ? title
        : ""
  return (
    element.getAttribute("name") ||
    element.getAttribute("label") ||
    element.getAttribute("aria-label") ||
    actionWords ||
    ownWords(element)
  )
}

/**
 * A type's name in words, as its program declares it, each word capitalised but the small ones:
 * `StockPile` => `Stock Pile` (`a "stock pile" is a pile`), `PilaDeReserva` => `Pila de Reserva` (epic `editor` I108).
 * - Read from its declaration's line (`declarationPlaces()`), so a Spanish type keeps its accents (`Fundación`).
 * - Declared nowhere this program says (a built-in type, a program not compiled here):  its class name, split.
 */
export function typeWordsOf(className: string): string {
  const declared = declarationPlaces().find((place) => place.kind === "type" && place.name === className)
  const line =
    declared &&
    sourceFiles()
      .find((file) => file.path === declared.path)
      ?.text.split("\n")[declared.line]
  const quoted = line && /"([^"]+)"/.exec(line.slice(declared.column))?.[1]
  const words = quoted || className.replace(/(\p{Ll}|\d)(\p{Lu})/gu, "$1 $2")
  return headlineCase(words)
}

/**
 * Is `id` one the core made up for `thing`, not one its program chose:  its class in kebab case, then 8 random
 * characters (`dated-event-k3x9q2mf`, core's `newThingId()`)?  A made-up id says nothing to a person.
 */
function isMadeUpId(id: string, thing: object): boolean {
  return new RegExp(`^${kebabCase(thing.constructor.name) || "thing"}-[0-9a-z]{8}$`).test(id)
}

/**
 * Each part's key, from `rows` (`Inspector.partsIn()`):  its PATH, which stays the same while the app draws more.
 * - Its parent's key, then its tag and its `id`:  `/solitaire-app:0/ui-container:0/solitaire-column#C5`;
 *   with no `id`, which of its parent's parts of that tag with no `id` it is:  `ui-action:2`.
 * - Never its place among all the parts:  that moves whenever a part is added above it.
 *   So the Views tree's rows opened by hand, and the selection, followed the place, not the part:
 *   a column opened by hand moved to another column each time Solitaire's deal added a card above it,
 *   so columns opened and closed as the cards came (epic `editor` I171).
 */
export function partKeysFor(rows: readonly PartRow[]): Map<Element, string> {
  const keys = new Map<Element, string>()
  // the parts round the row walked now, outermost first:  each one's key, and how many of each tag it holds with no `id`
  const around: { key: string; counts: Map<string, number> }[] = []
  const topCounts = new Map<string, number>()
  for (const { element, depth } of rows) {
    around.length = depth
    const parent = around.at(-1)
    const counts = parent?.counts ?? topCounts
    const tag = element.localName
    const nth = counts.get(tag) ?? 0
    if (!element.id) counts.set(tag, nth + 1)
    const key = `${parent?.key ?? ""}/${tag}${element.id ? `#${element.id}` : `:${nth}`}`
    keys.set(element, key)
    around.push({ key, counts: new Map() })
  }
  return keys
}

/** What the Inspector reads of a Spell UI attribute:  its name and kind (`size`, `color` ...). */
export type FieldSpec = { name: string; kind?: string; group?: E.AttributeGroup; description?: string }

/** The preference that remembers whether the Inspector is open. */
const OPEN_PREF = "inspector"
/** The start of the pref remembering the trail, a project's each. */
const TRAIL_PREF = "inspector:trail"
/** The pref remembering which of the properties card's sections are folded. */
const FOLDED_GROUPS_PREF = "inspector:foldedGroups"
/** The pref remembering which cards are folded. */
const FOLDED_PANELS_PREF = "inspector:foldedPanels"
/** The start of the pref remembering what's selected, a project's each (`Inspector.selectionPref`). */
const SELECTION_PREF = "inspector:selected"
/** The pref remembering that Inspect app's help was seen:  closed, or a part selected (`Inspector.isHelpShown`). */
const HELP_SEEN_PREF = "inspector:helpSeen"
/** The pref remembering the phone's sheet's height, as dragged (`Inspector.sheetHeight`). */
const SHEET_HEIGHT_PREF = "inspector:sheetHeight"
/** Spell UI's tags start so. */
const UI_PREFIX = "ui-"
/** Spell UI's controls:  what a plain click selects, beside a drawn thing (Alt-click:  any Spell UI element). */
const CONTROL_TAGS = new Set([
  "ui-button",
  // an action's button, `<action "cheat" />`:  it runs its action, with no handler of its own to find it by (I158)
  "ui-action",
  "ui-input",
  "ui-textarea",
  "ui-checkbox",
  "ui-radio",
  "ui-select",
  "ui-dropdown",
  "ui-slider",
  "ui-rating",
  "ui-calendar",
  "ui-search",
  "ui-progress"
])

/**
 * What else a click selects, in the app's own drawing:  what the palette adds, so a click finds it again.
 * - Not in a drawn thing's shadow root:  there it's how the thing looks, and a click means the thing.
 */
const ADDED_TAGS = new Set([
  "ui-card",
  "ui-text",
  "ui-label",
  "ui-message",
  "ui-segment",
  "ui-divider",
  "ui-list",
  "ui-menu",
  "ui-image"
])

/**
 * Does a click on `element` mean it, by its tag?
 * - A Spell UI control (`CONTROL_TAGS`), anywhere
 * - What the palette adds (`ADDED_TAGS`), or any other tag the drawing writes, a `<spacer />` say (`isWrittenTag()`),
 *   when it isn't in a drawn thing's shadow root:
 *   there it's how the thing looks, and a click means the thing.
 */
function isClickableTag(element: Element): boolean {
  if (CONTROL_TAGS.has(element.localName)) return true
  return (ADDED_TAGS.has(element.localName) || isWrittenTag(element)) && !(element.getRootNode() instanceof ShadowRoot)
}

/**
 * Is `element` a tag the drawing writes that's neither a drawn thing nor a Spell UI element:
 * a `<spacer />`, which only takes room (epic `editor` I169;  Owen:  "I should be able to select a spacer").
 * - It's in the code (stamped with where:  `SourceMarks.placeOfDrawn()`), so the code's caret can go to it.
 */
function isWrittenTag(element: Element): boolean {
  return !SpellElement.thingOf(element) && !isUIElement(element) && !!SourceMarks.placeOfDrawn(element)
}

editorPrefs.declare(OPEN_PREF, { type: "choice" })
const [isOpen, setOpen] = createSignal(editorPrefs.get(OPEN_PREF) as boolean)
editorPrefs.declare(HELP_SEEN_PREF, { type: "choice" })
const [helpSeen, setHelpSeen] = createSignal(!!editorPrefs.get(HELP_SEEN_PREF))

/**
 * The Inspector's cards, top to bottom:  what's selected, its code, then the app's views.
 * - The Events card is gone (epic `debut` P28):  its events are the Code card's.
 * - Code is a card of its own again, under what's selected
 *   (Owen, 2026-11-14, I109;  a band of the properties card since P21).
 */
export const INSPECTOR_PANELS = ["properties", "code", "views"] as const
/** One of the Inspector's cards. */
export type InspectorPanel = (typeof INSPECTOR_PANELS)[number]

/**
 * The cards of a TYPE, under what's selected while a change applies to all of its type (All Cards;  epic `editor` P23):
 * its events, its actions and its tests, each a card of its own, resizable (Owen:  "make Events, Actions, Tests separate
 * panes so they can be resized").
 * - Not in the menu of cards:  they show and go with the switch (`Inspector.typeWithCards`, `typeWithTests`).
 */
export const TYPE_PANES = ["events", "actions", "tests"] as const
/** One of a type's cards. */
export type TypePane = (typeof TYPE_PANES)[number]
/** Any of the Inspector's cards. */
export type InspectorCardId = InspectorPanel | TypePane

/** The cards folded to their headers (remembered:  `FOLDED_PANELS_PREF`). */
const [foldedPanels, setFoldedPanels] = createSignal<readonly InspectorCardId[]>(
  knownPanels(editorPrefs.get(FOLDED_PANELS_PREF), [...INSPECTOR_PANELS, ...TYPE_PANES]) ?? []
)

/** The cards a pref names that are still cards:  `undefined` if it names none. */
function knownPanels<Card extends InspectorCardId = InspectorPanel>(
  remembered: unknown,
  cards: readonly Card[] = INSPECTOR_PANELS as readonly InspectorCardId[] as readonly Card[]
): Card[] | undefined {
  if (!Array.isArray(remembered)) return undefined
  return remembered.filter((panel): panel is Card => (cards as readonly string[]).includes(panel))
}

/**
 * One of the properties card's folding bands:  a group of a Spell UI element's fields, its Events or Actions,
 * or a band of a thing's properties (`thing:Card:rank`;  `thing:open:builtIn` for one that starts folded).
 */
export type InspectorBand = E.AttributeGroup | "events" | "actions" | `thing:${string}`

/** The properties card's folded sections (remembered:  `FOLDED_GROUPS_PREF`). */
const [foldedGroups, setFoldedGroups] = createSignal<readonly InspectorBand[]>(
  (editorPrefs.get(FOLDED_GROUPS_PREF) as InspectorBand[] | undefined) ?? ["advanced"]
)

const [isInspecting, setInspecting] = createSignal(false)
/** What's selected, the last one clicked last (`Inspector.allSelected`). */
const [selectedParts, setSelectedParts] = createSignal<readonly SelectedPart[]>([])
/** Clicks in the app and the views tree:  the pivot, where a shift-click's range starts. */
const clicks = new ListSelection<Element>()

/**
 * Marks a view drawn in Design (`<DesignStage>`, epic `editor` P35, P37):  the Inspector's parts are its own drawing's too,
 * in its shadow root (`Inspector.partsIn()`).
 */
export const DESIGNED = "data-designed"

/**
 * Marks what's drawn scaled up (Design's `<FitInside>`, epic `editor` P37):
 * the selection's ants round a part in it are a box of their own, never a ring the scale would thicken.
 */
export const SCALED_UP = "data-scaled-up"

/** The places `Inspector.selectWhenDrawn()` is waiting to see drawn. */
let placesToSelect: Set<string> | undefined
/** Told what `placesToSelect` found, once it's selected:  `Inspector.selectWhenDrawn()`'s `drawn`. */
let whenDrawn: ((elements: readonly Element[]) => void) | undefined
/** Are the words of what's selected next ready to type over?  `Inspector.readyWordsNext()`. */
let wordsReadyNext = false

/** How long the properties card takes to draw what's just been selected, ms. */
const WORDS_READY_DELAY = 150

/** The fields that hold a part's words, first found first. */
const WORDS_FIELDS = 'ui-property[name="textContent"], ui-property[name="heading"]'

/** Focus the words of what's selected, all selected:  what a person changes first about anything new. */
function makeWordsReady(): void {
  const field = document.querySelector<HTMLElement>(`.InspectorColumn ${WORDS_FIELDS}`)
  const input = field?.querySelector<HTMLElement & { select?: () => void }>("ui-input, ui-textarea")
  input?.focus()
  input?.select?.()
}
/** On a phone, is the sheet up (`Inspector.isSheetUp`)?  Down as the page opens:  the app its full size until a selection. */
const [isSheetUp, setSheetUp] = createSignal(false)
/** The phone's sheet's height as dragged, px (remembered:  `SHEET_HEIGHT_PREF`). */
export const [sheetHeight, setSheetHeight] = createSignal(editorPrefs.get(SHEET_HEIGHT_PREF) as number | undefined)
/** The trail from what's selected (`Inspector.inspected`):  property names and list items (`#3`). */
const [trail, setTrail] = createSignal<readonly string[]>([])

/** Where a step leads from `value`:  a property's thing (`discards`), a list's item (`#3`);  `undefined` if nowhere. */
function stepInto(value: object, step: string): object | undefined {
  const next = step.startsWith(ITEM_STEP)
    ? itemsOf(value)?.[Number(step.slice(ITEM_STEP.length))]
    : (value as Record<string, unknown>)[step]
  return isThing(next) ? next : undefined
}

/**
 * The trail from `from` to `to`, a step each (`stepInto()`'s):  the shortest, its properties and a list's items,
 * at most `TRAIL_DEPTH` steps;  `undefined` when `to` isn't reached.
 * - A thing's properties are its class's own (`ClassSchemas`), in their order.
 */
function trailTo(from: object, to: object): string[] | undefined {
  let reached: Array<{ value: object; trail: string[] }> = [{ value: from, trail: [] }]
  const seen = new Set<object>([from])
  for (let depth = 0; depth < TRAIL_DEPTH; depth++) {
    const next: typeof reached = []
    for (const { value, trail } of reached) {
      const names = ClassSchemas.fromClass(value.constructor).attributes.map((attribute) => attribute.name)
      const items = (itemsOf(value) ?? []).map((_item, index) => `${ITEM_STEP}${index}`)
      for (const step of [...names, ...items]) {
        const child = stepInto(value, step)
        if (!child || seen.has(child)) continue
        if (child === to) return [...trail, step]
        seen.add(child)
        next.push({ value: child, trail: [...trail, step] })
      }
    }
    reached = next
  }
  return undefined
}

/** The most steps `trailTo()` looks along. */
const TRAIL_DEPTH = 3

/**
 * Is `value` one of the program's things:  an instance of a spell class (lists too)?
 * - By what its class carries, its `schema` symbol:  the runtime has its own copy of `spell/util`, so no symbol
 *   or class of the page's own would match.
 */
export function isThing(value: unknown): value is object {
  if (
    !value ||
    typeof value !== "object" ||
    value instanceof Node ||
    typeof (value as { toJSON?: unknown }).toJSON !== "function"
  )
    return false
  for (let Class = value.constructor; Class && Class !== Function.prototype; Class = Object.getPrototypeOf(Class)) {
    if (Object.getOwnPropertySymbols(Class).some((symbol) => symbol.description === "schema")) return true
  }
  return false
}

/** A list thing's items (a `Deck`'s cards), when it's a list:  else `undefined`. */
export function itemsOf(value: object): unknown[] | undefined {
  if (typeof (value as { [Symbol.iterator]?: unknown })[Symbol.iterator] !== "function") return undefined
  return [...(value as Iterable<unknown>)]
}

/** How a list's item is named in the trail:  `#3`. */
export const ITEM_STEP = "#"

/** Where the running app draws, as `<AppPane>` last handed it over. */
let appArea: HTMLElement | undefined
/**
 * Counts the area's moves, for its reactive readers (`Inspector.area`).
 * - The area itself is a plain variable:  a signal reads its old value until the next flush,
 *   and inspecting reads it straight after `watch()`.
 */
const [areaMoved, setAreaMoved] = createSignal(0)

/** Watch `area` from now on (`undefined`:  none), and tell its reactive readers. */
/**
 * The `clip-path` that cuts a box at `left`, `top` (page pixels) to the app's area:
 * `""` when it's all inside, or there's no area.
 * - An upright box only:  a turned one is left whole.
 */
function clipToArea(box: { left: number; top: number; width: number; height: number }): string {
  const area = appArea?.getBoundingClientRect()
  if (!area) return ""
  const cut = [
    area.top - box.top,
    box.left + box.width - area.right,
    box.top + box.height - area.bottom,
    area.left - box.left
  ].map((each) => Math.max(0, each))
  return cut.some((each) => each > 0) ? `inset(${cut.map((each) => `${each}px`).join(" ")})` : ""
}

function setArea(area: HTMLElement | undefined): void {
  appArea = area
  setAreaMoved((count) => count + 1)
}

/** Are `parts` the parts of `elements`, in the same order? */
function isSameElements(parts: readonly SelectedPart[], elements: readonly Element[]): boolean {
  return parts.length === elements.length && parts.every((part, index) => part.element === elements[index])
}

/** A new action's name:  `new action`, else `new action 2` ..., whichever of `taken` doesn't have. */
function newActionWords(taken: readonly string[]): string {
  const isTaken = (words: string) => taken.some((each) => each.trim().toLowerCase() === words)
  let words = NEW_ACTION_WORDS
  for (let count = 2; isTaken(words); count++) words = `${NEW_ACTION_WORDS} ${count}`
  return words
}
/** What Add Action names the action it writes, before it's renamed. */
const NEW_ACTION_WORDS = "new action"

/** The row added last, by its words (a drawn thing's or an action's) or DOM event:  `Inspector.justAdded`. */
const [justAdded, setJustAdded] = createSignal("")

/** Where an event's or action's code is:  its file, and its lines, 1-based (`Inspector.placeOfEvent()`). */
export type SlicePlace = { file: SP.AnySpellFile; from: number; to: number; column?: number; endColumn?: number }

/** The program's spell files, by the names the compiler's marks give them, with their text. */
function sourceFiles(): SourceFile[] {
  return (editor.project?.spellFiles ?? []).map((file) => ({ path: marksPathOf(file), text: file.contents ?? "" }))
}

/**
 * Where each of the program's declarations is written, as its compiler said:  the running target's source map's
 * `x_spellDeclarations` (`SP.SpellDeclarationPlaces`, epic `editor` P23).
 * - Read again only when the map's text changes.
 * - None:  `[]`, e.g. a program not compiled here.
 */
function declarationPlaces(): SP.SpellDeclarationPlace[] {
  const map = editor.project?.sourceMapFileFor(SP.targetFor(SP.RUNNING_TARGET)).contents ?? ""
  if (map !== readPlaces.map) {
    let places: SP.SpellDeclarationPlace[] = []
    try {
      places = map
        ? ((JSON.parse(map) as { x_spellDeclarations?: SP.SpellDeclarationPlace[] }).x_spellDeclarations ?? [])
        : []
    } catch (ignored) {
      console.error("Inspector:  can't read the program's source map", ignored)
    }
    readPlaces = { map, places }
  }
  return readPlaces.places
}
/** The map `declarationPlaces()` read last, and what it read. */
let readPlaces: { map: string; places: SP.SpellDeclarationPlace[] } = { map: "", places: [] }

/** The class names of `thing`'s type and those it inherits, its own first:  `["Tableau", "Pile", ...]`. */
function classNamesOf(thing: object): string[] {
  const names: string[] = []
  for (
    let proto = Object.getPrototypeOf(thing) as object | null;
    proto && proto !== Object.prototype;
    proto = Object.getPrototypeOf(proto)
  ) {
    if (proto.constructor.name) names.push(proto.constructor.name)
  }
  return names
}

/** `file`'s name as the compiler's marks give it:  its path in its project. */
function marksPathOf(file: SP.AnySpellFile): string {
  return SP.SpellLocation.filePathOf(file.path)?.replace(/^\//, "") ?? file.path
}

/** `place`, with the file it names. */
function sliceOf(place: CodePlace | undefined): SlicePlace | undefined {
  const file = place && editor.project?.spellFiles.find((each) => marksPathOf(each) === place.path)
  return file && place
    ? { file, from: place.from, to: place.to, column: place.column, endColumn: place.endColumn }
    : undefined
}

/** A new event's words, as a drawn thing's type writes it:  `click` => `on click`, `dblclick` => `on double click`. */
function onWordsOf(event: string): string {
  const words = event.replace(/^dbl/, "double ").replace(/^(mouse|key)(down|up|enter|leave)$/, "$1 $2")
  return `on ${words}`
}

/**
 * Where a new handler for `event` goes on Spell UI element `element`:  ` onClick={}` at the end of its tag as written.
 * - `undefined`:  it has no place in the program, or it handles `event` already.
 */
function newHandlerOn(element: Element, event: string): { path: string; at: number; code: string } | undefined {
  const place = SourceMarks.placeOfDrawn(element)
  const text = place && sourceFiles().find((file) => file.path === place.path)?.text
  if (!place || text === undefined) return undefined
  const tag = SourceEdits.tagAt(text, SourceEdits.offsetAt(text, { line: place.line, character: place.column }))
  const attribute = `on${upperFirst(event)}`
  if (!tag || tag.attributes.some((each) => each.name.toLowerCase() === attribute.toLowerCase())) return undefined
  return { path: place.path, at: tag.end - (tag.selfClosing ? 2 : 1), code: ` ${attribute}={}` }
}

/** Where Solid keeps an element's handler for a delegated event:  `_$$click` (NOT its data, `_$$clickData`). */
const SOLID_HANDLER = /^_\$\$([a-z]+)$/

/**
 * Where `element` is drawn, on screen.
 * - A Spell UI element's own box is often none (`display: contents`):  then the boxes its shadow root draws, together.
 */
function drawnBox(element: Element): DOMRect {
  const own = element.getBoundingClientRect()
  if (isFlat(own) && !element.shadowRoot) return roomOf(element, own)
  if (own.width || own.height || !element.shadowRoot) return own
  const boxes = [...element.shadowRoot.children]
    .map((child) => child.getBoundingClientRect())
    .filter((box) => box.width || box.height)
  if (!boxes.length) return own
  const left = Math.min(...boxes.map((box) => box.left))
  const top = Math.min(...boxes.map((box) => box.top))
  const right = Math.max(...boxes.map((box) => box.right))
  const bottom = Math.max(...boxes.map((box) => box.bottom))
  return new DOMRect(left, top, right - left, bottom - top)
}

/** Is `box` a line, no wider or no taller than nothing, but not nothing at all? */
function isFlat(box: DOMRect): boolean {
  return (box.width === 0) !== (box.height === 0)
}

/**
 * The room a box-less element takes between its neighbours:  a toolbar's `<spacer />` is 0px wide,
 * and the gap between the buttons on each side of it is what it makes (epic `editor` I169).
 * - `own` 0px wide:  from the right of the one before it to the left of the one after, as tall as `own`;
 *   0px tall:  from the bottom of the one before to the top of the one after, as wide.
 * - No neighbour drawn on a side:  its own edge there.
 */
function roomOf(element: Element, own: DOMRect): DOMRect {
  const before = element.previousElementSibling && drawnBox(element.previousElementSibling)
  const after = element.nextElementSibling && drawnBox(element.nextElementSibling)
  const isDrawn = (box: DOMRect | null) => !!box && (box.width > 0 || box.height > 0)
  if (own.width === 0) {
    const left = isDrawn(before) && before!.right <= own.left ? before!.right : own.left
    const right = isDrawn(after) && after!.left >= own.right ? after!.left : own.right
    return new DOMRect(left, own.top, right - left, own.height)
  }
  const top = isDrawn(before) && before!.bottom <= own.top ? before!.bottom : own.top
  const bottom = isDrawn(after) && after!.top >= own.bottom ? after!.top : own.bottom
  return new DOMRect(own.left, top, own.width, bottom - top)
}

/** Is `point` inside `box`? */
function isInside(point: { x: number; y: number }, box: DOMRect): boolean {
  return point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom
}

/**
 * `box`, `out` px bigger all round, its edges moved to the nearest whole device pixel.
 * - So a line drawn along its edges is as thick on every side:
 *   at 1.5 device pixels a pixel, a 2px line on an edge at 307.75px came out thinner on that side.
 */
function snapped(box: DOMRect, out: number): DOMRect {
  const scale = devicePixelRatio
  const snap = (at: number) => Math.round(at * scale) / scale
  const [left, top] = [snap(box.left - out), snap(box.top - out)]
  const [right, bottom] = [snap(box.right + out), snap(box.bottom + out)]
  return new DOMRect(left, top, right - left, bottom - top)
}

/**
 * How `element` is drawn when something turns it:  its own size, and the matrix taking its box to the screen.
 * - `undefined`:  nothing turns, scales or skews it;  its upright drawn box is where it is.
 *   A move alone (`translate`) doesn't count.
 * - Every transform from it up to the page counts, its own and each ancestor's, through shadow roots and slots:
 *   anchor positioning and `getBoundingClientRect()` both give an upright box, which a tilted card isn't.
 * - Only the turning, scaling and skewing are multiplied together (`linearTransformOf()`):
 *   where the box lands comes from its drawn box, the bounds of the turned one.
 *   So no offsets, scrolls or transform origins are walked.
 * - A 3D transform counts as its flat part:  a perspective tilt comes out a little off.
 * - Its scale is taken out of the matrix into its size (epic `editor` P37):  the ants' dashes are never scaled.
 */
function turnedBox(element: Element): { width: number; height: number; matrix: DOMMatrix } | undefined {
  let linear: DOMMatrix | undefined
  for (let node: Element | undefined = element; node; node = flatParentOf(node)) {
    const own = linearTransformOf(node)
    if (own) linear = linear ? own.multiply(linear) : own
  }
  if (!linear || linear.isIdentity) return undefined
  const { width, height } = untransformedSizeOf(element)
  const corners = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height]
  ].map(([x, y]) => linear.transformPoint({ x, y }))
  const drawn = element.getBoundingClientRect()
  const left = drawn.left - Math.min(...corners.map((corner) => corner.x))
  const top = drawn.top - Math.min(...corners.map((corner) => corner.y))
  // its scale goes into its size, not the matrix:  the ants round a card drawn large (Design's) stay thin
  const scale = Math.sqrt(Math.abs(linear.a * linear.d - linear.b * linear.c)) || 1
  const { a, b, c, d } = linear
  return {
    width: width * scale,
    height: height * scale,
    matrix: new DOMMatrix([a / scale, b / scale, c / scale, d / scale, left, top])
  }
}

/** The element whose shadow root holds `node`, if one does. */
function shadowHostOf(node: Element): Element | undefined {
  return node.parentNode instanceof ShadowRoot ? node.parentNode.host : undefined
}

/** `node`'s parent as it's drawn:  the slot it's in, else its parent, else its shadow root's host. */
function flatParentOf(node: Element): Element | undefined {
  if (node.assignedSlot) return node.assignedSlot
  if (node.parentElement) return node.parentElement
  return shadowHostOf(node)
}

/**
 * How `node` itself turns, scales and skews what it draws:  its `rotate`, `scale` and `transform`, in that order,
 * without their moves;  `undefined`:  it doesn't.
 */
function linearTransformOf(node: Element): DOMMatrix | undefined {
  const style = getComputedStyle(node)
  const steps: string[] = []
  if (style.rotate !== "none") {
    const words = style.rotate.split(" ")
    const axis =
      words.length === 2 ? { x: "1, 0, 0", y: "0, 1, 0", z: "0, 0, 1" }[words[0]!] : words.slice(0, 3).join(", ")
    steps.push(words.length === 1 ? `rotate(${words[0]})` : `rotate3d(${axis}, ${words.at(-1)})`)
  }
  if (style.scale !== "none") {
    const [x, y = x] = style.scale.split(" ")
    steps.push(`scale(${x}, ${y})`)
  }
  if (style.transform !== "none") steps.push(style.transform)
  if (!steps.length) return undefined
  const { a, b, c, d } = new DOMMatrix(steps.join(" "))
  return a === 1 && b === 0 && c === 0 && d === 1 ? undefined : new DOMMatrix([a, b, c, d, 0, 0])
}

/** `element`'s border box before any transform:  its laid-out size, to the fraction of a pixel. */
function untransformedSizeOf(element: Element): { width: number; height: number } {
  const style = getComputedStyle(element)
  let width = parseFloat(style.width)
  let height = parseFloat(style.height)
  if (Number.isNaN(width) || Number.isNaN(height)) {
    return element instanceof HTMLElement
      ? { width: element.offsetWidth, height: element.offsetHeight }
      : element.getBoundingClientRect()
  }
  if (style.boxSizing !== "border-box") {
    const sum = (...names: string[]) =>
      names.reduce((total, name) => total + parseFloat(style.getPropertyValue(name)), 0)
    width += sum("padding-left", "padding-right", "border-left-width", "border-right-width")
    height += sum("padding-top", "padding-bottom", "border-top-width", "border-bottom-width")
  }
  return { width, height }
}

/**
 * The element that draws `element`'s box:  itself, or, when it has none of its own (`display: contents`),
 * the one box its shadow root draws;  `undefined`:  several, or none.
 */
function boxDrawerOf(element: Element): Element | undefined {
  const own = element.getBoundingClientRect()
  if (own.width || own.height || !element.shadowRoot) return element
  const drawers = [...element.shadowRoot.children].filter((child) => {
    const box = child.getBoundingClientRect()
    return box.width || box.height
  })
  return drawers.length === 1 ? drawers[0] : undefined
}

/**
 * The corner radius `element` is drawn with, in CSS px:  its top left corner's.
 * - at most half its shorter side:  a pill's `999px` is half its height
 * - at least `MIN_ANTS_RADIUS - ANTS_OUT`:  so the ants' box, `ANTS_OUT` further out, rounds a square part too
 */
function ringRadiusOf(element: Element): number {
  const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0
  const { width, height } = element.getBoundingClientRect()
  return Math.max(MIN_ANTS_RADIUS - ANTS_OUT, Math.min(radius, Math.min(width, height) / 2))
}

/** The ants' box's smallest corner radius, in CSS px:  square parts get a soft corner (`Inspector.css`). */
const MIN_ANTS_RADIUS = 9

/** Does `element` itself listen for an event through Solid (`onClick` ...)? */
function hasOwnHandler(element: Element): boolean {
  return Object.keys(element).some((key) => SOLID_HANDLER.test(key))
}

/** The mark that rings the part under the pointer, by its own `::after` (`Inspector.css`). */
const HOVER_MARK = "data-inspect-hover"
/** How long a press is held still before it opens the part menu, while inspecting (`PartSelector.startLongPress()`). */
const LONG_PRESS_SECONDS = 0.5
/** How far that ring is outside the part, in CSS px (`Inspector.css`). */
const RING_OUT = 3
/**
 * How far the marching ants' box is outside what's selected, in CSS px:
 * its line is 4px to 6px out (`Inspector.css`), clear of what's drawn at the part's edge
 * (its text, a pill's rim;  epic `notebook` P9).
 */
const ANTS_OUT = 8
/** On the app's area while Inspect app is on:  `Inspector.css` shows its crosshair. */
const INSPECTING_MARK = "data-inspecting"

/** The parts tree's stub icons:  a drawn thing's, a Spell UI element's. */
export const THING_ICON = "cube"
/** The browser tab every Spell UI docs page opens in (`Inspector.openSpellUIDocs()`). */
const DOCS_TAB = "spell-ui-docs"

/** Each Spell UI tag's docs page (`ui-grid.html#ui-column`), once the docs' data is in (`loadDocsPages()`). */
let docsPages: Record<string, string> | undefined

/**
 * Load each tag's docs page from Spell UI's docs data, once (`NotebookDocs.dataUrl`, through `SiteData`).
 * - NEVER throws:  without it, a tag's page is guessed (its own name).
 */
function loadDocsPages(): void {
  if (docsPages) return
  docsPages = {}
  void import("spell/ui/docs-components/SiteData")
    .then(async ({ SiteData }) => {
      SiteData.url ??= NotebookDocs.dataUrl
      const data = await SiteData.load()
      for (const entry of data.components) if (entry.href) docsPages![entry.tag] = entry.href
    })
    .catch((error: unknown) => console.error("loadDocsPages():  couldn't load Spell UI's docs data", error))
}
const CONTROL_ICON = "square outline"
/** An action's icon, wherever the Inspector shows one:  Font Awesome's circled play (epic `editor` I116, I131). */
export const ACTION_ICON = "fa7-free:circle-play"

/****************
 * ### `PartSelector`
 * The Inspector's hands in the app:  the rings, and the listeners that select.
 * - Plain DOM, no Solid.
 * - What a click would select:  a dashed RING, the part's own (epic `debut` P32), marked `data-inspect-hover`;
 *   its `::after` draws it 3px outside the part, pinned by CSS anchor positioning (`Inspector.css`):
 *   the browser keeps it on the part through scrolls and drags, and no parent that hides its overflow cuts it.
 *   - A part that can't draw one (`canRing()`) gets a box on `<body>` over it instead:
 *     no box of its own (`display: contents`), inside a shadow root the page's sheet can't reach,
 *     an `::after` of its own, or a ring the browser didn't place (`isRingDrawn()`)
 * - What's selected:  MARCHING ANTS, always a box on `<body>` (`.InspectorSelected`), following it each frame.
 *   - On `<body>`, above everything, so they can invert the whole page under them:
 *     a part's own `::after` blends only with what's inside the part's layer, and Chrome dropped even that
 *     (Owen, 2026-11-07:  "The ants are not actually inverting")
 *   - Upright, their edges are put on whole device pixels (`place()`), so the line is the same on every side.
 * - The listeners are on the app's area, capturing:  they see a click before the app does, and stop it.
 ****************/
class PartSelector {
  /** Start listening on `area`;  stops listening anywhere else first. */
  static listen(area: HTMLElement): void {
    PartSelector.stop()
    const stop = new AbortController()
    PartSelector.listening = stop
    PartSelector.area = area
    area.setAttribute(INSPECTING_MARK, "")
    const options = { capture: true, signal: stop.signal }
    area.addEventListener(
      "pointermove",
      (event) => PartSelector.band || PartSelector.hover(PartSelector.partAt(event, area)),
      options
    )
    area.addEventListener("pointerleave", () => PartSelector.hover(undefined), options)
    area.addEventListener(
      "click",
      (event) => {
        if (PartSelector.bandJustEnded) {
          PartSelector.bandJustEnded = false
          event.preventDefault()
          event.stopPropagation()
          return
        }
        PartSelector.clicked(event, area)
      },
      options
    )
    // and the presses before a click:  inspecting a draggable card mustn't start a drag
    area.addEventListener(
      "pointerdown",
      (event) => {
        PartSelector.bandJustEnded = false
        PartSelector.startLongPress(event, area)
        const part = PartSelector.partAt(event, area)
        // the app itself is its own background:  a press there may be a band, and still a click on it if it never moves
        if (part) event.stopPropagation()
        if (part && PartEdits.startDrag(part, event)) return
        if (!part || part === Inspector.partsIn(area)[0]?.element) PartSelector.startBand(event, area)
      },
      options
    )
    // Esc is the page's key:  `EDITOR_HOTKEYS.stopInspecting`
  }

  /**
   * A click in the app while inspecting, on a part:  it selects it, and the app never hears of it.
   * - Plain:  it, and inspecting stops:  the app has its clicks back.
   * - Shift, Command or Control:  it joins what's selected, or leaves;  in a list, Shift takes a run (`ListSelection`).
   *   Inspecting goes on, for more.
   */
  private static clicked(event: MouseEvent, area: HTMLElement): void {
    const part = PartSelector.partAt(event, area)
    if (!part) return
    event.preventDefault()
    event.stopPropagation()
    PartSelector.hover(undefined)
    Inspector.clicked(part, Inspector.listAround(part), event)
    if (!event.shiftKey && !event.metaKey && !event.ctrlKey) Inspector.stopInspecting()
    Inspector.dismissHelp()
    // on a phone, the sheet comes up with what's selected
    setSheetUp(true)
  }

  /**
   * A press held still for `LONG_PRESS_SECONDS`, mouse or touch:  the part menu opens there, as a right click's,
   * for the top-most part under it, Inspect's submenu listing every part there (Owen, epic `editor` P31, C3).
   * - A move past `DRAG_START_PX`, or letting go, before then:  no long press;  the drag or click goes on as ever.
   * - Once open, the click the same press ends in is swallowed, on the window, before anyone hears it:
   *   it would select the part, and the menu would take it for a click outside it, and close.
   */
  private static startLongPress(down: PointerEvent, area: HTMLElement): void {
    if (down.button !== 0) return
    const stop = new AbortController()
    const options = { capture: true, signal: stop.signal }
    // read now:  once the press has been dispatched, its path is empty
    const part = PartSelector.partAt(down, area) ?? Inspector.partsIn(area)[0]?.element
    const programMenu = SpellElement.programMenuAt(down.composedPath())
    if (!part) return
    const timer = setTimeout(() => {
      stop.abort()
      PartSelector.swallowNextClick()
      PartSelector.hover(undefined)
      const { clientX: x, clientY: y } = down
      PartEdits.openMenu(part, { x, y, programMenu, partsUnder: PartEdits.partsAt(x, y, area) })
    }, LONG_PRESS_SECONDS * 1000)
    const cancel = () => {
      clearTimeout(timer)
      stop.abort()
    }
    window.addEventListener(
      "pointermove",
      (move) => Math.hypot(move.clientX - down.clientX, move.clientY - down.clientY) >= DRAG_START_PX && cancel(),
      options
    )
    window.addEventListener("pointerup", cancel, options)
    window.addEventListener("pointercancel", cancel, options)
  }

  /** Swallow the next click anywhere, before anyone hears it;  a press first means there's none to swallow. */
  private static swallowNextClick(): void {
    const stop = new AbortController()
    const options = { capture: true, signal: stop.signal }
    window.addEventListener(
      "click",
      (click) => {
        click.preventDefault()
        click.stopImmediatePropagation()
        stop.abort()
      },
      options
    )
    window.addEventListener("pointerdown", () => stop.abort(), options)
  }

  /**
   * A press on the app's background:  past `DRAG_START_PX` it draws a rubber band, which selects what it touches.
   * - Over what's selected with Shift, Command or Control held, else in place of it.
   * - Only the innermost parts it touches:  cards, not the pile they're in.
   * - Esc cancels it, and inspecting goes on.
   */
  private static startBand(down: PointerEvent, area: HTMLElement): void {
    if (down.button !== 0) return
    const stop = new AbortController()
    const options = { capture: true, signal: stop.signal }
    const end = () => {
      stop.abort()
      PartSelector.band?.remove()
      PartSelector.band = undefined
    }
    window.addEventListener(
      "pointermove",
      (move) => {
        const [dx, dy] = [move.clientX - down.clientX, move.clientY - down.clientY]
        if (!PartSelector.band) {
          if (Math.hypot(dx, dy) < DRAG_START_PX) return
          PartSelector.hover(undefined)
          PartSelector.band = document.body.appendChild(document.createElement("div"))
          PartSelector.band.className = "InspectorBand"
        }
        const box = new DOMRect(
          Math.min(down.clientX, move.clientX),
          Math.min(down.clientY, move.clientY),
          Math.abs(dx),
          Math.abs(dy)
        )
        Object.assign(PartSelector.band.style, {
          left: `${box.left}px`,
          top: `${box.top}px`,
          width: `${box.width}px`,
          height: `${box.height}px`
        })
      },
      options
    )
    window.addEventListener(
      "pointerup",
      (up) => {
        const box = PartSelector.band?.getBoundingClientRect()
        end()
        if (!box) return
        // the click this press ends in, on whatever's under it, is the band's
        PartSelector.bandJustEnded = true
        const touched = PartSelector.partsTouching(box, area)
        const isAdding = up.shiftKey || up.metaKey || up.ctrlKey
        const already = isAdding ? Inspector.allSelected.map((part) => part.element) : []
        Inspector.selectAll([...already.filter((element) => !touched.includes(element)), ...touched])
        Inspector.dismissHelp()
      },
      options
    )
    window.addEventListener("pointercancel", end, options)
    window.addEventListener(
      "keydown",
      (key) => {
        if (key.key !== "Escape" || !PartSelector.band) return
        key.stopPropagation()
        key.preventDefault()
        end()
        PartSelector.bandJustEnded = true
      },
      options
    )
  }

  /** The innermost parts `box` touches, never the app itself:  a part with another inside it that it touches is left out. */
  private static partsTouching(box: DOMRect, area: HTMLElement): Element[] {
    const background = Inspector.partsIn(area)[0]?.element
    const touched = Inspector.selectableParts().filter((part) => {
      const drawn = drawnBox(part)
      return (
        part !== background &&
        (drawn.width || drawn.height) &&
        drawn.left < box.right &&
        drawn.right > box.left &&
        drawn.top < box.bottom &&
        drawn.bottom > box.top
      )
    })
    return touched.filter((part) => !touched.some((other) => other !== part && part.contains(other)))
  }

  /** Stop listening, and hide the hover box. */
  static stop(): void {
    PartSelector.listening?.abort()
    PartSelector.listening = undefined
    PartSelector.area?.removeAttribute(INSPECTING_MARK)
    PartSelector.area = undefined
    PartSelector.hover(undefined)
  }

  /** Ring `element` as the one a click would select;  `undefined`:  none. */
  static hover(element: Element | undefined): void {
    const box = PartSelector.box("InspectorHover")
    if (PartSelector.ring(HOVER_MARK, element)) PartSelector.place(box, undefined)
    else PartSelector.place(box, element)
  }

  /**
   * Keep marching ants round each of `elements`:  a box on `<body>` each, following it every frame.
   * - Not while the page's loading hero is up (`PageLoading`):  they start once it has gone, fade and all.
   */
  static markSelected(elements: readonly Element[]): void {
    PartSelector.selected = elements
    if (!PageLoading.isGone) {
      PartSelector.selectedBoxes.forEach((box) => PartSelector.place(box, undefined))
      return PageLoading.whenGone(() => PartSelector.selected === elements && PartSelector.markSelected(elements))
    }
    const boxes = PartSelector.selectedBoxes
    while (boxes.length < elements.length) {
      const box = document.body.appendChild(document.createElement("div"))
      box.className = "InspectorBox InspectorSelected"
      boxes.push(box)
    }
    boxes.slice(elements.length).forEach((box) => PartSelector.place(box, undefined))
    const follow = () => {
      if (PartSelector.selected !== elements) return
      elements.forEach((element, index) =>
        PartSelector.place(boxes[index]!, element.isConnected ? element : undefined, ANTS_OUT)
      )
      if (elements.length) requestAnimationFrame(follow)
    }
    follow()
  }

  /**
   * Move ring `mark` to `element` (`undefined`:  off whatever has it):  true if `element` draws it itself,
   * false if it can't (`canRing()`, `isRingDrawn()`), so a box stands in.
   * - Pinned by its anchor.
   * - A part that is its own `::after`'s containing block (a transform:  a tilted card) can't anchor to itself,
   *   so its ring falls back to 3px outside its own box (`Inspector.css`).
   * - Fixed, its ring is drawn inside the nearest transformed ancestor, so it turns with the part.
   */
  private static ring(mark: string, element: Element | undefined): boolean {
    if (element?.hasAttribute(mark)) return true
    for (const marked of document.querySelectorAll(`[${mark}]`)) PartSelector.unmark(mark, marked)
    return !!element && PartSelector.putRing(mark, element)
  }

  /** Take ring `mark` off `element`. */
  private static unmark(mark: string, element: Element): void {
    element.removeAttribute(mark)
  }

  /** Put ring `mark` on `element`:  true if it draws it, false if it can't, so a box stands in. */
  private static putRing(mark: string, element: Element): boolean {
    if (element.hasAttribute(mark)) return true
    if (!PartSelector.canRing(element)) return false
    element.setAttribute(mark, "")
    if (PartSelector.isRingDrawn(element)) return true
    element.removeAttribute(mark)
    return false
  }

  /**
   * Is `element`'s ring drawn round it:  3px bigger than it all round?
   * - Not when the browser couldn't anchor it to the part:  then each `anchor()` falls back, and the ring is
   *   somewhere else, or as big as the window.
   *   Safari 26 does that for a part inside a fixed or absolutely placed box (most of the app's), where Chrome doesn't.
   */
  private static isRingDrawn(element: Element): boolean {
    const ring = getComputedStyle(element, "::after")
    const { width, height } = untransformedSizeOf(element)
    return (
      Math.abs(parseFloat(ring.width) - width - 2 * RING_OUT) < 1 &&
      Math.abs(parseFloat(ring.height) - height - 2 * RING_OUT) < 1
    )
  }

  /**
   * Can `element` draw a ring itself:  a box of its own, in the page's document (so the page's sheet reaches it),
   * and no `::after` of its own the ring would replace?
   */
  private static canRing(element: Element): boolean {
    if (element.getRootNode() !== document) return false
    // drawn scaled up (Design's):  a ring would scale up with it, its dashes too
    if (element.closest(`[${SCALED_UP}]`)) return false
    if (getComputedStyle(element).display === "contents") return false
    // a box-less spacer:  a box stands in, over the room it takes (`roomOf()`)
    if (isFlat(element.getBoundingClientRect())) return false
    // its own `::after`, unless it's our ring already
    return element.hasAttribute(HOVER_MARK) || getComputedStyle(element, "::after").content === "none"
  }

  /**
   * The part under the event's pointer:  the innermost on its path, inside `area`, that's
   * - a drawn thing (its type's element, a card),
   *   or a Spell UI CONTROL (`CONTROL_TAGS`:  an input, a button, an action's button ...)
   * - or a Spell UI element with a handler of its own:  a menu item that acts as a button
   *   (Owen:  "I can't e.g. inspect buttons in the solitaire app header (e.g. cheat button)")
   * - with Alt held, any Spell UI element:  the text or label inside a card too
   * - Not a drawn thing that is part of the one it's drawn in (`isPartOfItsThing()`):  a card's image is the card's, but with Alt
   * - Not one inside a Spell UI element's own shadow root:  a button's icon is the button's.
   * - Nothing inside the editor's own (`EDITOR_OWN`):  Design's picker, a notebook's frame.
   * - A box-less tag the drawing writes, in the room it takes:  a toolbar's `<spacer />`, 0px wide,
   *   in the gap between the buttons on each side of it (`spacerAt()`;  epic `editor` I169).
   */
  static partAt(event: Event, area: HTMLElement): Element | undefined {
    const anyElement = (event as MouseEvent).altKey
    const path = event.composedPath()
    // inside the editor's own, anywhere on the way up:  a row of Design's picker is no part, though it's a menu item
    if (path.some((target) => target instanceof Element && target.hasAttribute(EDITOR_OWN))) return undefined
    for (const target of path) {
      if (target === area) return undefined
      if (!(target instanceof Element)) continue
      if (target.hasAttribute(EDITOR_FRAME)) continue
      const host = (target.getRootNode() as ShadowRoot).host
      if (host?.localName.startsWith(UI_PREFIX)) continue
      const spacer = PartSelector.spacerAt(target, event as MouseEvent)
      if (spacer) return spacer
      if (!anyElement && isPartOfItsThing(target)) continue
      const isPart = SpellElement.thingOf(target) || anyElement || isClickableTag(target) || hasOwnHandler(target)
      if (isPart && Inspector.partFor(target)) return target
    }
    return undefined
  }

  /**
   * The box-less tag the drawing writes among `element`'s children whose room holds the pointer (`roomOf()`):
   * a click can't land on a 0px wide `<spacer />` itself, only in the gap it makes.
   */
  private static spacerAt(element: Element, event: MouseEvent): Element | undefined {
    const point = { x: event.clientX, y: event.clientY }
    for (const child of element.children) {
      if (!isClickableTag(child) || !isWrittenTag(child)) continue
      const own = child.getBoundingClientRect()
      if (isFlat(own) && isInside(point, roomOf(child, own))) return child
    }
    return undefined
  }

  /** Box `className` on `<body>`, made the first time. */
  private static box(className: string): HTMLElement {
    let box = document.body.querySelector<HTMLElement>(`:scope > .${className}`)
    if (!box) {
      box = document.body.appendChild(document.createElement("div"))
      box.className = `InspectorBox ${className}`
    }
    return box
  }

  /**
   * Put `box` over `element`, `out` px bigger all round, or hide it.
   * - Turned with it when something turns it (`turnedBox()`):  its own size, and the matrix to the screen.
   * - Else upright, on its drawn box, its edges moved to the nearest whole device pixel:
   *   a line along an edge between two device pixels comes out thinner on that side (`snapped()`).
   */
  private static place(box: HTMLElement, element: Element | undefined, out = 0): void {
    if (!element) {
      box.hidden = true
      return
    }
    const drawer = boxDrawerOf(element)
    const turned = drawer && turnedBox(drawer)
    const { left, top, width, height } = turned
      ? { left: 0, top: 0, width: turned.width + 2 * out, height: turned.height + 2 * out }
      : snapped(drawnBox(element), out)
    const transform = turned ? turned.matrix.translate(-out, -out).toString() : ""
    // Only when it moved:  a style written each frame over the pointer makes Chrome flicker its cursor
    // (Owen:  "Cursor flashes between arrow and drag when I mouse over a face up card")
    const rect = `${left} ${top} ${width} ${height} ${transform}`
    if (box.dataset.rect !== rect) {
      box.dataset.rect = rect
      Object.assign(box.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        transform,
        transformOrigin: turned ? "0 0" : ""
      })
    }
    // cut to the app's area:  never over the top bar or a pane beside it, as the app scrolls under them (Owen)
    const clip = turned ? "" : clipToArea({ left, top, width, height })
    if (box.style.clipPath !== clip) box.style.clipPath = clip
    // the ants' corners follow the part's, `out` further out:  a pill's ring is a pill (epic `notebook` P9)
    if (out) {
      const radius = `${ringRadiusOf(drawer ?? element) + out}px`
      if (box.style.borderRadius !== radius) box.style.borderRadius = radius
    }
    if (box.hidden) box.hidden = false
  }

  /** What's selected now, as `markSelected()` follows it. */
  private static selected: readonly Element[] = []
  /** The boxes for what can't ring itself:  made as needed, hidden when not. */
  private static selectedBoxes: HTMLElement[] = []
  /** The rubber band, while one is being drawn. */
  private static band: HTMLElement | undefined
  /** A rubber band just ended:  the click the same press ends in is the band's. */
  private static bandJustEnded = false
  /** Stops the listeners, while listening. */
  private static listening: AbortController | undefined
  /** The app's area it's listening on, marked `INSPECTING_MARK`. */
  private static area: HTMLElement | undefined
}

// DEBUG:  `Inspector` at the devtools console, and the browser tests
setDebugGlobal({ Inspector })

// A change to the Inspector's code reloads the page, rather than swapping this file in (epic `editor` I236):
// it and its views (`InspectorView`, `InspectorParts`) import each other, so a hot swap made a second Inspector,
// its own selection, area and runtime, beside the first:  the Views tree chose parts in the new one,
// the cards still showed the old one's, so a click on a row inspected nothing until the page was reloaded.
import.meta.hot?.accept(() => location.reload())

/** `<InspectorColumn>`, loaded on first use:  see `InspectorView.tsx`. */
export const InspectorColumn = Inspector.views.view("InspectorColumn")
/** `<InspectorPane>`, the Inspector's pane in the editor's page, loaded the first time it opens. */
export const InspectorPane = Inspector.views.view("InspectorPane")
/** `<OwnEditorPage>`, a view's property editor drawn as the Inspector draws it, loaded on first use. */
export const OwnEditorPage = Inspector.views.view("OwnEditorPage")

/****************
 * ### `<InspectAppButton>`
 * Inspect app, in the top bar's Run | Edit group, after the compiled code's button (and in the Inspector card's
 * header, `<InspectAppMenu>`):  select a part of the app.
 * - A click starts inspecting, or stops it;  pressed while inspecting.  Esc stops too.
 * - With the Inspector closed, it opens it, which starts inspecting.
 * - A menu item of its icon alone, in a circle (Spell UI's `appearance="circular"`), pressed while inspecting:
 *   ONE look in both places (epic `editor` T90, T91:  "Make this look like the inset for inspector in the top bar").
 * - `id`:  its element's, for the help popup under it (`<InspectHelp>`).
 ****************/
export function InspectAppButton(props: { id?: string }): JSX.Element {
  const pressed = () => (Inspector.isInspecting ? "true" : "false")
  const title = () =>
    Inspector.isHelpShown ? undefined : appTexts.text(Inspector.isInspecting ? "stopInspectingTip" : "inspectTip")
  const inspect = () => {
    if (!Inspector.isOpen) Inspector.toggle()
    else if (Inspector.isInspecting) Inspector.stopInspecting()
    else Inspector.startInspecting()
  }
  return (
    <ui-item
      id={props.id}
      icon="crosshairs"
      appearance="circular"
      class={["InspectAppButton", { inspecting: Inspector.isInspecting }]}
      data-tour="inspect app"
      label={appTexts.text("inspectorInspect")}
      aria-pressed={pressed()}
      {...barTooltip(title())}
      onClick={inspect}
      ref={(button: Element) => Inspector.views.ahead(button)}
    />
  )
}

/****************
 * ### `<SpellUIDocsButton>`
 * Spell UI's docs for what's selected, left of Inspect app, while it's a Spell UI element (epic `editor` T95):
 * a `<ui-segment>`, or a program's `<segment>` drawn as one.
 * - A click opens its page of Spell UI's docs (`Inspector.openSpellUIDocs()`), every one in the same browser tab.
 * - Not for a program's own view, nor the app:  they have no page.
 ****************/
export function SpellUIDocsButton(): JSX.Element {
  const tag = () => {
    const element = Inspector.inspected?.element
    return element ? Inspector.spellUITagOf(element) : undefined
  }
  return (
    <Show when={tag()}>
      {(shown) => (
        <ui-item
          icon="book"
          appearance="circular"
          class="SpellUIDocsButton"
          label={appTexts.text("inspectorSpellUIDocs", { tag: shown() })}
          title={appTexts.text("inspectorSpellUIDocs", { tag: shown() })}
          onClick={(event: MouseEvent) => {
            event.stopPropagation()
            Inspector.openSpellUIDocs(shown())
          }}
        />
      )}
    </Show>
  )
}

/****************
 * ### `<InspectHelp>`
 * Inspect app's help:  a small popup under its button, while inspecting.
 * - Shown until the first selection ever, or until it's closed (`Inspector.isHelpShown`).
 * - It says:  "Click a part of the app to inspect it.  Alt-click for a part inside it.  Esc stops."
 * - `for`:  the button's id (`<InspectAppButton id>`).
 ****************/
export function InspectHelp(props: { for: string }): JSX.Element {
  return (
    <ui-popup
      for={props.for}
      open-on="manual"
      visible={Inspector.isHelpShown}
      position="bottom right"
      class="InspectHelp"
      role="note"
    >
      <span class="InspectHelpText">{appTexts.text("inspectHelp")}</span>
      <ui-icon
        name="close"
        link=""
        class="InspectHelpClose"
        label={appTexts.text("inspectHelpClose")}
        onClick={() => Inspector.dismissHelp()}
      />
    </ui-popup>
  )
}

/** Sorts text edits from the last in the file to the first:  made in that order, each one's place still holds. */
function laterFirst(one: TextEdit, other: TextEdit): number {
  return other.range.start.line - one.range.start.line || other.range.start.character - one.range.start.character
}

/**
 * Start loading each of `files` not read yet, a property editors file no compile reads (`Card.editor.spell`):
 * what reads its `contents` reads again once it's in.
 * - After this moment:  a read in a drawing never writes.
 * - NEVER throws:  one that won't load is said on the console.
 */
function loadUnread(files: readonly SP.AnySpellFile[]): void {
  const unread = files.filter((file) => !file.isLoaded && !file.isLoading)
  if (!unread.length) return
  queueMicrotask(() => {
    for (const file of unread) {
      if (file.isLoaded || file.isLoading) continue
      file.load().catch((error: unknown) => console.error(`Inspector:  can't load ${file.path}`, error))
    }
  })
}

/** The last change in the properties card that couldn't be written to the source:  `<NotSavedNote>`'s. */
export const [notSaved, setNotSaved] = createSignal<{ part: object; name: string; why: NotWritten } | undefined>(
  undefined
)

/** Bumped as a thing's scope is chosen:  `Inspector.scopeOf()` reads it. */
const [scopeChoices, setScopeChoices] = createSignal(0)

/**
 * Bumped as the language worker answers where a thing's fields live (`FieldHomes`):
 * `Inspector.originsOf()` and `Inspector.scopeOf()` read it, so they're worked out again with the answer.
 */
const [homesAnswered, setHomesAnswered] = createSignal(0)
FieldHomes.followers.add(() => setHomesAnswered((count) => count + 1))

// a change written once its homes were known, that couldn't be:  said under its field, as at once
InspectorWrites.whenNotWrittenLate = (part, name, why) => setNotSaved({ part, name, why })

/** The pref remembering `Inspector.setScope()`, by project. */
const SCOPE_PREF = "scope"

/** Is `why` said under its field, not in the card?  Everything but code, which the card links to. */
function isNotedUnderField(why: NotWritten): boolean {
  return why.reason !== "expression" && why.reason !== "playing" && why.reason !== "allFromCode"
}

/** Why a change to `part` wasn't kept, in words. */
export function notSavedWords(reason: NotWritten["reason"], part: Inspected): string {
  if (reason === "allFromCode") return appTexts.text("inspectorAllFromCode", { type: wordsOfType(part.value) })
  if (reason === "expression") return appTexts.text("inspectorNotSavedCode")
  if (reason === "noStart") return appTexts.text("inspectorNotSavedNoStart")
  if (reason === "typeSets") {
    return appTexts.text("inspectorNotSavedTypeSets", { types: P.pluralize(wordsOfType(part.value)) })
  }
  return appTexts.text("inspectorNotSavedRunning")
}

/**
 * `words` as a title:  `Card "king of diamonds"` => `Card "King of Diamonds"`, its small words left small.
 * - A word just inside a quote is a first word too.
 */
function headlineCase(words: string): string {
  return words.replace(/(^|\s)("?)(\p{L}[\p{L}\p{N}]*)/gu, (all, space: string, quote: string, word: string) =>
    space && !quote && SMALL_WORDS.test(word) ? all : space + quote + word.charAt(0).toUpperCase() + word.slice(1)
  )
}

/** The words a title leaves small, after its first:  English's, and Spanish's for `Pila de Reserva`. */
const SMALL_WORDS = /^(?:a|an|and|at|by|for|in|of|on|or|the|to|de|del|el|la|los|las|y|en)$/

/** `words` with each one's first letter capital:  `discard piles` => `Discard Piles`. */
export function titleCase(words: string): string {
  return words.replace(/(^|\s)(\p{L})/gu, (_, space: string, letter: string) => space + letter.toUpperCase())
}

/** An element's tag closing itself, `<ui-property name="rank" />`:  its name, then its attributes. */
export const SELF_CLOSING_TAG = /<([a-z][\w-]*-[\w-]*)((?:\s[^<>]*?)?)\s*\/>/gi

/** A thing's type, in words, small:  `DiscardPile` => `discard pile`;  as its program declares it (`typeWordsOf()`). */
export function wordsOfType(thing: object): string {
  return typeWordsOf(thing.constructor.name).toLowerCase()
}
