import { createSignal, type Accessor } from "solid-js"

import { PrefStore } from "spell/util/persist/PrefStore"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SX } from "spell/parser/spellx"
import { editor } from "spell/app/app/editor"
import { isStaticBuild } from "spell/app/app/static/staticBuild"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"
// By file:  the folder's barrel loads the language service
import { SourceEdits } from "spell/app/lsp/SourceEdits"
import { NotebookCode, CODE_VIEWS, type CodeView } from "./NotebookCode"
import { NotebookPageCells, type ExampleSpan, type NotebookPageModel, type PageCell } from "./NotebookPageCells"

/**
 * What a notebook page's tools know of its file (epic `notebook` P3):  its examples' code, the edits the page makes,
 * the code view, "On this page", the lock.
 * - The page itself is the RUNNING PROGRAM's drawing, in the app area (`<NotebookPage>`):  this draws nothing.
 * - The file's text is the editor's (`file.contents`), the one the code column shows:  no copy of its own.
 *   - Typing in an example goes the code column's way (`editor.typeInto()`):  its undo groups the typing, and the
 *     running app takes it a moment after the typing stops (`LiveEdit`), drawing again only what changed.
 *   - A step that isn't typing (add, move, delete, lock) is one step of the editor's history
 *     (`editor.history.change()`):  ⌘Z puts it back.
 *   - Saved as any edit is:  AutoSave or ⌘S.  Locked, never, by anything (`editor.isLocked()`):  every edit is a
 *     try-out, gone on reload or the editor's Reset (`editor.resetApp()`).
 * - Each example is found by where it's written:  the place its `<spell-example>` is marked with
 *   (`SourceMarks.placeOfDrawn()`), as an offset into the file's text (`exampleAt()`).
 * - The pane header's ⋯ menu acts on the SELECTED cell, the one holding what was last clicked (`selectAt()`).
 * - Plain TypeScript and Solid's signals:  made in `<NotebookPage>`'s body, so its signals are the page's.
 */
export class NotebookController {
  /** The notebook's file. */
  readonly file: SP.SpellFile
  /** Its project. */
  readonly project: SP.SpellProject

  constructor(file: SP.SpellFile, project: SP.SpellProject) {
    this.file = file
    this.project = project
    ;[this.selected, this.setSelected] = createSignal<string | undefined>(undefined)
    const contents = PrefStore.getAt(this.contentsKey)
    ;[this.contentsShown, this.setContentsShown] = createSignal(contents !== false)
    ;[this.contentsOpen, this.setContentsOpenSignal] = createSignal(PrefStore.getAt(this.contentsOpenKey) === true)
    const view = PrefStore.getAt(this.viewKey) as CodeView | undefined
    ;[this.codeView, this.setCodeViewSignal] = createSignal<CodeView>(CODE_VIEWS.includes(view!) ? view! : "spellx")
  }

  /**
   * `project`'s notebooks:  its `.spellml` files holding a page with the `notebook` flag, in its order --
   * `<spell-page "x" notebook>`, `<spell-notebook "x">`, `<encanto-cuaderno "x">` ...
   * - Read from the files' text (`NotebookPageCells.holdsNotebook()`), so the page shows as soon as the project's
   *   loaded;  `[]` until then.
   */
  static notebooksIn(project: SP.SpellProject | undefined): SP.SpellFile[] {
    if (!project?.isLoaded) return []
    return project.spellFiles.filter((file) => file.form === "spellx" && NotebookPageCells.holdsNotebook(file))
  }

  ////////////////
  // ## The file
  ////////////////

  /** The file's text as it is now.  Reactive:  follows every edit that reaches it (`editor.edits`). */
  text(): string {
    void editor.edits
    return this.file.contents ?? ""
  }

  /** The notebook, read from the file's text as it is now:  its tag and its cells.  Reactive, as `text()`. */
  model(): NotebookPageModel | undefined {
    const text = this.text()
    if (this.read?.text !== text) this.read = { text, model: NotebookPageCells.of(text, this.file.path) }
    return this.read.model
  }
  private read: { text: string; model: NotebookPageModel | undefined } | undefined

  /** Is the page locked, so its edits are try-outs, never saved?  Reactive. */
  isLocked(): boolean {
    return !!this.model()?.locked
  }

  /**
   * What the pane's header says of the edits:  `locked` while a locked page holds a try-out not put back
   * (Owen, 2026-10-26:  "If doc is locked, nothing is ever saved");  else nothing.  Reactive.
   */
  status(): SaveStatus | undefined {
    return this.isTriedOut() ? "locked" : undefined
  }

  /** Has a try-out changed the locked page, so the editor's Reset would put it back?  Reactive. */
  isTriedOut(): boolean {
    return this.isLocked() && this.file.isDirty
  }

  /** May this person lock and unlock it, writing its file?  Today:  anyone the page server serves (not the static build). */
  isAdmin(): boolean {
    return !isStaticBuild
  }

  ////////////////
  // ## Examples
  ////////////////

  /**
   * The example written at `place` in the file (an example's `<spell-example>`'s mark, `SourceMarks.placeOfDrawn()`):
   * its span and its body, in the text as it is now.  `undefined` when none starts there.
   */
  exampleAt(place: { line: number; column: number }): ExampleSpan | undefined {
    const text = this.text()
    const offset = SourceEdits.offsetAt(text, { line: place.line, character: place.column })
    return this.examples().find((example) => example.span.start === offset)
  }

  /** Every example of the page, in order.  Reactive. */
  private examples(): ExampleSpan[] {
    return (this.model()?.cells ?? []).flatMap((cell) => cell.examples ?? [])
  }

  /**
   * `example`'s code in `view`:  only what it DRAWS, never its `<example>` tags.
   * - spellx:  its body as written;  spell:  its body's code spell twin (`SX.CodeSpellWriter.writeMarkup()`).
   * - A body that's one `<html>` block:  what's inside it, as written, in either view.
   */
  exampleCode(example: ExampleSpan, view = this.codeView()): string {
    if (view === "spellx" || example.html) return example.body.code
    return SX.CodeSpellWriter.writeMarkup(example.body.code, {
      path: this.file.path,
      componentTag: (word) => this.tagFor(word)
    })
  }

  /**
   * The example written at `place` now has `code`, typed in its code editor, in the page's code view:
   * a spell view edit is turned back into spellx (`NotebookCode.toSpellx()`).
   * - Typed into the file as the code column types (`editor.typeInto()`), and drawn again once the typing pauses.
   */
  editExample(place: { line: number; column: number }, code: string) {
    const example = this.exampleAt(place)
    if (!example) return
    // an `<html>` block's markup is written as it is, in either view
    const isSpell = this.codeView() === "spell" && !example.html
    const spellx = isSpell ? NotebookCode.toSpellx(code, (tag) => this.wordFor(tag)) : code
    if (spellx === example.body.code) return
    const before = this.file.contents ?? ""
    const { edit } = SourceEdits.editBetween(before, NotebookPageCells.withCode(before, example.body, spellx))
    editor.typeInto(this.file, [edit], EXAMPLE_COMPILE_DELAY)
  }

  ////////////////
  // ## Cells:  the ⋯ menu's
  ////////////////

  /** The selected cell's key, the one holding what was last clicked:  what the pane header's ⋯ menu acts on. */
  readonly selected: Accessor<string | undefined>
  private readonly setSelected: (key: string | undefined) => void

  /** Select the top-level cell written around `offset` in the file:  a click on what it draws. */
  selectAt(offset: number) {
    const cell = this.model()?.cells.find((each) => each.span.start <= offset && offset <= each.span.end)
    this.setSelected(cell && keyOf(cell))
  }

  /** The cell `key` names, in the text as it is now. */
  private cellFor(key: string): PageCell | undefined {
    return this.model()?.cells.find((cell) => keyOf(cell) === key)
  }

  /** Can cell `key` move `direction`?  Not past the page's start or end, nor out of its section.  Reactive. */
  canMove(key: string, direction: "up" | "down"): boolean {
    const text = this.text()
    return this.movedText(key, direction) !== text
  }

  /** Move cell `key` up or down one:  a section written as a tag, past the one beside it.  ⌘Z puts it back. */
  move(key: string, direction: "up" | "down") {
    const cell = this.cellFor(key)
    if (!cell) return
    this.change(this.movedText(key, direction))
    // the same cell, where it's moved to
    const moved = this.model()?.cells.find((each) => each.code === cell.code)
    this.setSelected(moved && keyOf(moved))
  }

  /** The file's text with cell `key` moved `direction`:  as it is when it can't move. */
  private movedText(key: string, direction: "up" | "down"): string {
    const text = this.text()
    const model = this.model()
    const index = model?.cells.findIndex((cell) => keyOf(cell) === key) ?? -1
    const cell = model?.cells[index]
    if (!model || !cell) return text
    return cell.block
      ? NotebookPageCells.sectionMoved(text, model, cell, direction)
      : NotebookPageCells.moved(text, model.cells, index, direction)
  }

  /** Delete cell `key`, a section with what's in it:  ⌘Z brings it back. */
  remove(key: string) {
    const cell = this.cellFor(key)
    if (!cell) return
    this.change(NotebookPageCells.deleted(this.text(), cell))
    this.setSelected(undefined)
  }

  /**
   * Add a new cell of `kind` just below cell `key` (a section's title:  first in it), and select it.  ⌘Z takes it
   * away.
   * - Written as the notebook writes its own:  a section as a tag where its sections are tags, else `##`;
   *   its words in the notebook's language.
   */
  add(key: string, kind: NewCellKind) {
    const model = this.model()
    const after = this.cellFor(key)
    if (!model || !after) return
    const { text, start } = NotebookPageCells.inserted(this.text(), model, after, this.newCell(kind))
    this.change(text)
    this.selectAt(start)
  }

  /** A new cell of `kind`'s code, in the notebook's language. */
  private newCell(kind: NewCellKind): string {
    const model = this.model()
    const spanish = model?.language === "es"
    const name = (key: AppTextKey) => appTexts.text(key)
    if (kind === "text") return name("notebookPageNewText")
    if (kind === "section") {
      const asTag = model?.cells.some((cell) => cell.block)
      const label = name("notebookPageNewSection")
      if (!asTag) return `## ${label}`
      return spanish ? `<seccion etiqueta="${label}">\n</seccion>` : `<section label="${label}">\n</section>`
    }
    if (kind === "template") {
      const view = name("notebookPageNewTemplate")
      return spanish
        ? `<encanto-vista "${view}">\n\t<dibujar><texto>${view}</texto></dibujar>\n</encanto-vista>`
        : `<spell-view "${view}">\n\t<draw><text>${view}</text></draw>\n</spell-view>`
    }
    const example = name("notebookPageNewExample")
    return spanish
      ? `<ejemplo "${example}">\n\t<texto>Hola</texto>\n</ejemplo>`
      : `<example "${example}">\n\t<text>Hello</text>\n</example>`
  }

  /**
   * Lock the page, or unlock it:  its tag's `locked`, one step of the editor's history, and SAVED either way.
   * - Locked, nothing else is ever saved, for anyone (`editor.isLocked()`);  unlocking it is how an admin saves again.
   * - The one save that doesn't ask the lock:  it's the lock itself.
   * - NEVER throws:  a failed save is the editor's error banner.
   */
  setLocked(locked: boolean) {
    const model = this.model()
    if (!model) return
    this.change(NotebookPageCells.withLock(this.text(), model, locked))
    void Promise.resolve(this.file.save(undefined))
      .then(() => editor.refreshDrafts())
      .catch((error: unknown) => editor.showError(error))
  }

  /**
   * The file's text is now `text`, by a step that isn't typing:  ONE step of the editor's history, and the running app
   * takes it at once.
   */
  private change(text: string) {
    const before = this.file.contents ?? ""
    if (text === before) return
    const { span, newText } = SourceEdits.editBetween(before, text)
    const compile = () => void editor.compileApp().catch(editor.showError)
    editor.history.change(
      { file: this.file, at: span.start, before: before.slice(span.start, span.end), after: newText },
      { title: appTexts.text("changeNotebook"), live: compile }
    )
    compile()
  }

  ////////////////
  // ## Modes
  ////////////////

  /** Which view the page shows code in:  one switch for every example (`CODE_VIEWS`). */
  readonly codeView: Accessor<CodeView>
  private readonly setCodeViewSignal: (view: CodeView) => void

  /** Show every example's code as `view`, and remember it for this notebook. */
  setCodeView(view: CodeView) {
    this.setCodeViewSignal(view)
    try {
      PrefStore.setAt(this.viewKey, view)
    } catch (error) {
      console.error("NotebookController:  couldn't remember the code view", error)
    }
  }

  /** Is "On this page" shown as a column?  Always, unless its Hide hid it:  remembered per notebook. */
  readonly contentsShown: Accessor<boolean>
  private readonly setContentsShown: (shown: boolean) => void

  /** Show or hide "On this page", and remember it for this notebook. */
  toggleContents() {
    const shown = !this.contentsShown()
    this.setContentsShown(shown)
    try {
      PrefStore.setAt(this.contentsKey, shown)
    } catch (error) {
      console.error("NotebookController:  couldn't remember the contents", error)
    }
  }

  /**
   * Is "On this page" open as a flyout, from its icon, while its column isn't showing?
   * - remembered per notebook, as the column is
   */
  readonly contentsOpen: Accessor<boolean>
  private readonly setContentsOpenSignal: (open: boolean) => void

  /** Open or close "On this page"'s flyout, and remember it for this notebook. */
  setContentsOpen(open: boolean) {
    if (open === this.contentsOpen()) return
    this.setContentsOpenSignal(open)
    try {
      PrefStore.setAt(this.contentsOpenKey, open)
    } catch (error) {
      console.error("NotebookController:  couldn't remember the contents' flyout", error)
    }
  }

  /** Where "On this page"'s flyout being open is remembered:  per notebook. */
  private get contentsOpenKey(): string {
    return `spellEditor:notebook-contents-open:${this.file.path}`
  }

  /** Where "On this page" being shown is remembered:  per notebook. */
  private get contentsKey(): string {
    return `spellEditor:notebook-contents:${this.file.path}`
  }

  /** Where the code view is remembered:  per notebook. */
  private get viewKey(): string {
    return `spellEditor:notebook-view:${this.file.path}`
  }

  ////////////////
  // ## Code views
  ////////////////

  /**
   * The tag bare name `word` draws in this notebook, as its last compile chose:  `counter` => `counter-counter`,
   * `button` => `ui-button`.
   */
  tagFor(word: string): string | undefined {
    return this.tags().get(word) ?? SP.ComponentPacks.tagFor(word, this.model()?.language ?? "en")
  }

  /** The bare name tag `tag` stands for:  `tagFor()` backwards. */
  wordFor(tag: string): string | undefined {
    for (const [word, each] of this.tags()) if (each === tag) return word
    // a pack's own:  `ui-button` is `button`
    const word = tag.replace(/^[a-z]+-/, "")
    return this.tagFor(word) === tag ? word : undefined
  }

  /** Each bare name the notebook's file draws, and its tag, from its last parse. */
  private tags(): Map<string, string> {
    const match = this.file.match
    if (this.tagsFrom && this.tagsFrom.match === match) return this.tagsFrom.tags
    const tags = new Map<string, string>()
    const visit = (each: P.Match) => {
      const [element] = each.matched
      const data = each.data as { tagName?: string; children?: unknown[] }
      if (element instanceof P.JSXElementToken && data.tagName && data.tagName !== element.tagName)
        tags.set(element.tagName, data.tagName)
      for (const inner of [...each.matched, ...(data.children ?? [])]) if (inner instanceof P.Match) visit(inner)
    }
    if (match) visit(match)
    this.tagsFrom = { match, tags }
    return tags
  }
  private tagsFrom: { match: P.Match | undefined; tags: Map<string, string> } | undefined
}

/** A cell's key:  where it starts in the file's text, as it was read.  An edit before it gives it a new one. */
function keyOf(cell: PageCell): string {
  return String(cell.span.start)
}

/** The kinds of cell the tools add:  Add below's menu, in order. */
export const NEW_CELL_KINDS = ["example", "text", "section", "template"] as const
export type NewCellKind = (typeof NEW_CELL_KINDS)[number]

/** What the pane's header says of the edits (`NotebookController.status()`). */
export type SaveStatus = "locked"

/**
 * How long after typing in an example pauses the running app takes it, seconds.
 * - Shorter than the code column's wait (`EDIT_COMPILE_DELAY`), so the example draws again as it's typed;
 *   long enough that it isn't drawn between keys:  the program draws its whole page again for each edit, about
 *   2 to 3 seconds on the biggest component pages (Dropdown's Examples, epic `notebook` P3), and the page waits
 *   while it does.
 */
const EXAMPLE_COMPILE_DELAY = 1
