import { createSignal, type Accessor } from "solid-js"

import { PrefStore } from "spell/util/persist/PrefStore"
import { SourceMarks } from "spell/parser/parser/writers/SourceMarks"
import { SP } from "spell/parser/spell"
import { SX } from "spell/parser/spellx"
import { editor } from "spell/app/app/editor"
import { isStaticBuild } from "spell/app/app/static/staticBuild"
import { appTexts } from "spell/app/app/ui/AppTexts"
// By file:  the folder's barrel loads the language service
import { SourceEdits } from "spell/app/lsp/SourceEdits"
import { NotebookPageCells, type ExampleSpan, type NotebookPageModel } from "./NotebookPageCells"

/**
 * What the editor knows of a notebook page's file (epic `notebook` P3):
 * its examples' code, the edits the page makes, the code view, "On this page", the lock.
 * - The page itself is the RUNNING PROGRAM's drawing, in the app area (`<NotebookPage>`):  this draws nothing.
 * - The file's text is the editor's (`file.contents`), the one the code column shows:  no copy of its own.
 *   - Typing in an example goes the code column's way (`editor.typeInto()`):
 *     its undo groups the typing, and the running app takes it a moment after the typing stops (`LiveEdit`),
 *     drawing again only what changed.
 *   - The lock is one step of the editor's history (`editor.history.change()`):  ⌘Z puts it back.
 *   - Moving, adding and deleting cells is the editor's own drag and drop, palette and Edit menu
 *     (`PartEdits`, epic `notebook` P5):  a click on the page picks a cell for them (`cellAt()`).
 *   - Saved as any edit is:  AutoSave or ⌘S.
 *   - Locked, nothing saves it (`editor.isLocked()`):
 *     every edit is a try-out, gone on reload or the editor's Reset (`editor.resetApp()`).
 * - Each example is found by where it's written:  the place its `<spell-example>` is marked with
 *   (`SourceMarks.placeOfDrawn()`), as an offset into the file's text (`exampleAt()`).
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
    const contents = PrefStore.getAt(this.contentsKey)
    ;[this.contentsShown, this.setContentsShown] = createSignal(contents !== false)
    ;[this.contentsOpen, this.setContentsOpenSignal] = createSignal(PrefStore.getAt(this.contentsOpenKey) === true)
    const view = PrefStore.getAt(this.viewKey) as CodeView | undefined
    ;[this.codeView, this.setCodeViewSignal] = createSignal<CodeView>(CODE_VIEWS.includes(view!) ? view! : "spellx")
  }

  /**
   * `project`'s notebooks:  its `.spell` files holding a page with the `notebook` flag, in its order --
   * `<page "x" notebook>`, `<notebook "x">`, `<cuaderno "x">` ...
   * - Read from the files' text (`NotebookPageCells.holdsNotebook()`), so the page shows as soon as the project's
   *   loaded;  `[]` until then.
   */
  /**
   * The notebooks `file` sits with:  the project's, or in a folder of a project, the folder's alone, as a folder holds
   * one component's pages (epic `notebook` P10).
   */
  static pagesBeside(file: SP.SpellFile, project: SP.SpellProject | undefined): SP.SpellFile[] {
    const all = NotebookController.notebooksIn(project)
    return all.filter((it) => it.folder === file.folder)
  }

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

  /**
   * May this person lock and unlock it?
   * - Whoever may save its pages, by their role in its space:
   *   `canDesign` in `SPACE_ROLES`, as Save asks (`editor.mayDesign`;  epic `notebook` P6).
   * - Never in the preview.
   * - The lock is saved as any edit to the page is, a designer's draft:  a role that can't design couldn't save it.
   * - Reactive:  follows `editor.refreshDrafts()`.
   */
  mayLock(): boolean {
    return !isStaticBuild && editor.mayDesign
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
   * - spellx:  its body as written;  spell:  its body's code spell twin (`SX.CodeSpellWriter.writeMarkup()`),
   *   each bare name the tag the file's last parse chose (`SP.ComponentTags`), as the code-spell tab shows it.
   * - A body that's one `<html>` block:  what's inside it, as written, in either view.
   */
  exampleCode(example: ExampleSpan, view = this.codeView()): string {
    if (view === "spellx" || example.html) return example.body.code
    const tags = SP.ComponentTags.of(this.file)
    const { body } = example
    // where a place in the body's code is in the file:  each line after the first lost its indent
    const fileOffset = (offset: number) =>
      body.span.start + offset + body.indent.length * (body.code.slice(0, offset).split("\n").length - 1)
    return SX.CodeSpellWriter.writeMarkup(body.code, {
      path: this.file.path,
      componentTag: (word, start) => tags.componentTag(word, fileOffset(start))
    })
  }

  /**
   * The example written at `place` now has `code`, typed in its code editor, in the page's code view.
   * - An edit in the spell view is written back as spellx (`SX.SpellxWriter.writeMarkup()`):
   *   each tag a bare name gave is that name again.
   * - Typed into the file as the code column types (`editor.typeInto()`), and drawn again once the typing pauses.
   */
  editExample(place: { line: number; column: number }, code: string) {
    const example = this.exampleAt(place)
    if (!example) return
    // an `<html>` block's markup is written as it is, in either view
    const isSpell = this.codeView() === "spell" && !example.html
    const tags = SP.ComponentTags.of(this.file)
    const spellx = isSpell
      ? SX.SpellxWriter.writeMarkup(code, { path: this.file.path, componentWord: (tag) => tags.wordFor(tag) })
      : code
    if (spellx === example.body.code) return
    const before = this.file.contents ?? ""
    const { edit } = SourceEdits.editBetween(before, NotebookPageCells.withCode(before, example.body, spellx))
    editor.typeInto(this.file, [edit], EXAMPLE_COMPILE_DELAY)
  }

  ////////////////
  // ## Cells
  ////////////////

  /**
   * The cell a click on the page picks, from the click's path (`event.composedPath()`), innermost first:
   * what the Inspector selects, and the editor's drag and drop moves (epic `notebook` P5).
   * - An example, whole, wherever in it the click was:  `<spell-example>`.
   * - Else the innermost part marked as written in the page's file that the Inspector shows (`isPart`):
   *   a run of prose (`<ui-markdown>`), a section, a header ...
   * - None from inside an example's code editor, nor from what nothing marks:  the page's own background.
   */
  cellAt(path: readonly EventTarget[], isPart: (element: Element) => boolean): Element | undefined {
    const source = SP.SpellProject.sourceNameOf(this.file.path)
    const isOurs = (element: Element) => SourceMarks.placeOfDrawn(element)?.path === source
    let innermost: Element | undefined
    for (const node of path) {
      if (!(node instanceof Element)) continue
      if (node.matches(EXAMPLE_CODE)) return undefined
      if (node.localName === EXAMPLE_TAG) return isOurs(node) ? node : undefined
      if (!innermost && isPart(node) && isOurs(node)) innermost = node
    }
    return innermost
  }

  ////////////////
  // ## The lock
  ////////////////

  /**
   * Lock the page, or unlock it:  its tag's `locked`, one step of the editor's history, and SAVED either way.
   * - Locked, nothing else is ever saved, for anyone (`editor.isLocked()`);
   *   unlocking it, by whoever may (`mayLock()`), is how it's saved again.
   * - The one save that doesn't ask the lock:  it's the lock itself.
   * - NEVER throws:  a failed save is the editor's error banner.
   */
  setLocked(locked: boolean) {
    const model = this.model()
    if (!model) return
    const text = this.text()
    this.change(SourceEdits.applied(text, NotebookPageCells.lockEdits(text, model, locked)))
    void Promise.resolve(this.file.save(undefined))
      .then(() => editor.refreshDrafts())
      .catch((error: unknown) => editor.showError(error))
  }

  /**
   * The file's text is now `text`, by a step that isn't typing:
   * ONE step of the editor's history, and the running app takes it at once.
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
}

/**
 * The views a notebook shows its examples' code in (epic `elemental-spell` P16;  html dropped in P25):
 * - `spellx`:  as written, `<button>`, `<counter/>`
 * - `spell`:  the code spell it reads as, each bare name its element's tag, `<ui-button>`, `<counter-counter/>`
 *   (`NotebookController.exampleCode()`);  an edit there is written back as spellx (`editExample()`)
 */
export const CODE_VIEWS = ["spellx", "spell"] as const

/** One of `CODE_VIEWS`. */
export type CodeView = (typeof CODE_VIEWS)[number]

/** What the pane's header says of the edits (`NotebookController.status()`). */
export type SaveStatus = "locked"

/**
 * How long after typing in an example pauses the running app takes it, seconds.
 * - Shorter than the code column's wait (`EDIT_COMPILE_DELAY`), so the example draws again as it's typed.
 * - Long enough that it isn't drawn between keys.
 * - Set when the program drew its whole page again for each edit, and the page waited while it did:
 *   about 2 to 3 seconds on the biggest component pages (Dropdown's Examples, epic `notebook` P3).
 *   Since P4 an edit draws again only its own example (`LiveEdit`).
 */
const EXAMPLE_COMPILE_DELAY = 1

/** The tag a notebook's example draws as:  `example_block`'s. */
const EXAMPLE_TAG = "spell-example"

/** An example's code editor, in its `source` slot (`<ExampleCode>`):  a click in it is typing, never a pick. */
const EXAMPLE_CODE = ".NotebookExampleCode"
