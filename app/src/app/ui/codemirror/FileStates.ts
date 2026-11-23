import { autocompletion, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete"
import { isolateHistory } from "@codemirror/commands"
import { css, cssLanguage } from "@codemirror/lang-css"
import { LanguageSupport, syntaxHighlighting } from "@codemirror/language"
import { type Diagnostic as LintDiagnostic, setDiagnostics } from "@codemirror/lint"
import {
  Annotation,
  type ChangeSet,
  Compartment,
  EditorState,
  type Extension,
  RangeSet,
  type StateEffect,
  StateField,
  type Text,
  Transaction,
  type TransactionSpec
} from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, keymap } from "@codemirror/view"
import { styleTags, tags } from "@lezer/highlight"
import type { TextEdit } from "vscode-languageserver"

import { observe } from "spell/util"
import { after, beforeNextPaint, soon, type CancelablePromise } from "spell/util/timing"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { CodeEditorFeatures } from "spell/app/app/ui/CodeEditorFeatures"
import { CodeRules } from "spell/app/app/ui/CodeRules"
import { codeLook } from "spell/app/app/ui/codePopups"
import { CodeMirrorBubbly, type Slice } from "./CodeMirrorBubbly"
import { CodeMirrorCodeOrText } from "./CodeMirrorCodeOrText"
import { CodeMirrorDebug } from "./CodeMirrorDebug"
import { CodeMirrorHeadings } from "./CodeMirrorHeadings"
import { CodeMirrorHovers } from "./CodeMirrorHovers"
import { CodeMirrorLanguage } from "./CodeMirrorLanguage"
import { CodeMirrorLinks } from "./CodeMirrorLinks"
import { CodeMirrorLook } from "./CodeMirrorLook"
import { CodeMirrorMarkup } from "./CodeMirrorMarkup"
import { CodeMirrorPopups } from "./CodeMirrorPopups"
import { CodeMirrorSetup } from "./CodeMirrorSetup"
import { CodeMirrorTokens } from "./CodeMirrorTokens"
import { CodeMirrorTyping } from "./CodeMirrorTyping"
import { CodeMirrorValues } from "./CodeMirrorValues"
import { LanguageClient } from "./LanguageClient"
import { LspToCodeMirror } from "./LspToCodeMirror"

/****************
 * ### `FileStates`
 * One CodeMirror state per file the editor works with:  its text, undo, folds and selection, kept while another file
 * is shown, so switching back finds it as it was left (epic `codemirror` P2).
 * - Each state is a VIEW of its file's `contents`:  `SpellFile` / `SpellProject` stay the source of truth.
 *   This never parses by itself, and keeps nothing about parses.
 * - State => file:  every edit goes into `file.contents`, then `onEdit`;  keys typed in a spell file as typing pauses
 *   (epic `solid-2-final` P9):
 *   - the state holds them till then, and hands them over when its project asks (`project.textLater()`):
 *     at the pause, or as anything is about to read the file (a compile, a save);  then `onTaken`
 *   - an edit from outside the code (`applyEdits()`) goes in at once
 *   - Its parse waits till the typing pauses (`PARSE_WAIT`), so no keystroke waits on it:
 *     `project.takeText()`, with where it changed (`P.EditedSpan`), then `project.parseWaitingText()`,
 *     re-parsing as little as possible.
 *   - Where the language worker parses it, never on the page:  the text typed goes into its file at the pause, and
 *     everything that reads a parse asks the worker (epic `solid-2-final` T36).
 *   - Whatever must see the new parse sooner asks for it, `parseNow()`:  the language features (a hover, a suggestion),
 *     a click or a focus anywhere on the page, where the page parses.
 * - File => state:  a change from outside the editors (a load, another editor of the file) comes in as the one change
 *   that makes them the same, kept out of undo, so the caret and the file's own undo stay right.
 * - Parse => problems:  whenever a spell file's `match` changes, even from an edit to ANOTHER file, its diagnostics
 *   become its state's problems, and its fold arrows and bubbly look follow (`CodeMirrorSetup.PARSED`).
 *   - Where the language worker answers, its problems come from the worker's parse, sent after each one
 *     (`parsedElsewhere()`;  epic `solid-2-final` P18):  the page's parse still draws the rest.
 * - Edits from outside the code (the Inspector, the side bar, a rename, the value picker) come in through
 *   `applyEdits()`:  one undo step each, carrying their `EditWay` (`FileStates.EDIT_WAY`), the one "not typed" mark
 *   the typing helps read to leave them alone.
 * - Shown by a view through `show()`:  ONE view per state at a time;  a state shown nowhere still takes edits.
 *   - A SLICE of it, some of its lines (the Inspector's Code card, `<CodeSlice>`), in as many other views as like,
 *     through `showSlice()` (epic `codemirror` P3):  each slice's state holds the same text, never a copy
 *     (CodeMirror's text is shared, as it's never changed in place), and every edit, the file's or a slice's,
 *     reaches the others at once, as CodeMirror's split view does.
 * - Covers a project at a time:  a state for every spell file it parses (a rename's edits need them), plus any other
 *   file once shown.  Showing a file of another project lets go of the last one's states, UNLESS something `use()`s
 *   it, e.g. a `<spell-editor>`.
 * - What it does that has nothing to do with CodeMirror (its waits, `use()`, `saveAfterEdit()`, `applyEdits()` and
 *   `EditWay`) is what the app's code editor did before CodeMirror, copied in (epic `codemirror` J4).
 * - Follows files with `observe()` (`spell/util`, on spell cells):  a plain function, re-run synchronously as the cells
 *   it read change, so it's fine wherever `stateFor()` is called from.
 * - Its position in the import graph:
 *   CodeMirror, the parser, the language service, the CodeMirror folder's other files.
 ****************/
export class FileStates {
  constructor({
    service,
    client = LanguageClient.inThread(service),
    onEdit = () => {},
    onTaken = () => {}
  }: FileStatesProps) {
    this.service = service
    this.client = client
    // the worker's problems for each file it parsed, where it works them out
    client.onParsed((parsed) => this.parsedElsewhere(parsed))
    // a project the worker can't load:  its problems worked out here from now on
    client.onFallback((project) => {
      for (const entry of this.entries.values()) {
        if (entry.file.project === project && entry.file instanceof SP.SpellFile) this.whenParsed(entry, entry.file)
      }
    })
    this.onEdit = onEdit
    this.onTaken = onTaken
    // the worker draws its parses in the editors' look
    const sendLook = () => client.look(codeLook.isBubbly ? "bubbly" : "tokens")
    codeLook.followers.add(sendLook)
    sendLook()
    // a click or a focus elsewhere acts on the parse where the page parses:  it mustn't be one keystroke behind
    const parseNow = () => this.parseNow()
    globalThis.document?.addEventListener("pointerdown", parseNow, { capture: true })
    globalThis.document?.addEventListener("focusin", parseNow, { capture: true })
  }

  /** Answers a spell file's problems, and what's still asked of the page's own parse (folding) */
  readonly service: LSP.SpellLanguageService

  /**
   * Answers what a person asks of a spell file's code (suggestions, hovers, Go to Definition ...):
   * the page's own service, or the editor's language worker, which each state's edits are sent to (epic `solid-2-final` P18).
   */
  readonly client: LanguageClient

  /**
   * Called after each edit of a state, e.g. to compile or save soon.
   * - A spell file's typed text may not be in its `contents` yet:  `onTaken` says when it is.
   */
  onEdit: (file: SP.AnySpellFile) => void

  /** Called once a spell file's typed text is in its `contents` -- see `stateEdited()`. */
  onTaken: (file: SP.SpellFile) => void

  ////////////////
  // ## Parsing
  ////////////////

  /**
   * Parse the text typed and not parsed yet, now, in every project with some waiting -- see `project.takeText()`.
   * - Only where the page parses it:  where the language worker does, the text goes into its files, unparsed here
   *   (epic `solid-2-final` T36).
   * - The incremental parse is done when it returns;  a parse from scratch, if that couldn't cope, comes later.
   * - NEVER throws:  a parse error shows on its line, as ever.
   */
  parseNow(): void {
    this.parseTimer?.cancel()
    this.parseTimer = undefined
    const projects = this.waiting
    this.waiting = new Set()
    for (const project of projects) {
      if (!this.parsesOnPageFor(project)) {
        project.takeWaitingText()
        continue
      }
      project
        .parseWaitingText()
        .catch((error: unknown) => console.error("FileStates.parseNow():  couldn't parse", error))
    }
    const waiters = this.parsedWaiters
    this.parsedWaiters = []
    waiters.forEach((resolve) => resolve())
  }

  /**
   * Resolves once the text typed so far is parsed, when the typing pauses:  at once if none is waiting.
   * - For what can wait, so it doesn't parse on every keystroke.
   */
  parsed(): Promise<void> {
    if (!this.waiting.size) return Promise.resolve()
    return new Promise((resolve) => this.parsedWaiters.push(resolve))
  }

  /**
   * The answer to `method` about `file`, for what asks from outside the code, e.g. the Inspector
   * (epic `solid-2-final` T36):  the language worker's where it parses, about the text as it is now.
   * - SIDE EFFECT:  `file`'s project gets its states, so the worker has its files, shown in the code or not.
   * - `undefined` when its text changed meanwhile, or it isn't parsed:  an answer about other text places edits wrong.
   * - throws what the service throws (`LSP.RenameError` ...)
   */
  async ask<M extends LSP.LanguageMethod>(
    file: SP.SpellFile,
    method: M,
    params: Omit<LSP.LanguageParams<M>, "textDocument">
  ): Promise<LSP.LanguageAnswer<M> | undefined> {
    const entry = this.entryFor(file)
    // a change from outside the code reaches the state, and so the client, a microtask later
    await Promise.resolve()
    const { doc } = entry.state
    if (!entry.language || !(await entry.language.fileParsed(doc))) return undefined
    const answer = await entry.language.ask(method, params)
    return entry.state.doc === doc ? answer : undefined
  }

  /**
   * The old forms of Spell written in `file`, as `ask()` answers `spell/oldForms`, with the text they're found in:
   * the editor's offer to upgrade a project, and its Upgrade (`editor.oldFormsIn()`;  epic `solid-2-final` T36).
   * - `undefined` when its text changed as it asked, or it isn't parsed.
   */
  async oldForms(file: SP.SpellFile): Promise<OldFormsFound | undefined> {
    const entry = this.entryFor(file)
    await Promise.resolve()
    const { doc } = entry.state
    const answer = await this.ask(file, "spell/oldForms", {})
    return answer && entry.state.doc === doc ? { text: doc.toString(), ...answer } : undefined
  }

  /**
   * Parse `project`'s waiting text once the typing pauses for `PARSE_WAIT` msec (`parseNow()`):
   * where the language worker parses it, only its text goes into its files then (epic `solid-2-final` T36).
   */
  private parseSoon(project: SP.SpellProject): void {
    this.waiting.add(project)
    this.parseTimer?.cancel()
    this.parseTimer = after(FileStates.PARSE_WAIT / 1000, () => this.parseNow())
  }

  /**
   * How long the typing must pause before what's typed is parsed, in msec.
   */
  static PARSE_WAIT = 200

  /** Is `project` parsed here for the code itself:  its problems, its look?  Else the language worker parses it. */
  private parsesOnPageFor(project: SP.SpellProject): boolean {
    return this.client.answersOnPage(project) || this.service.hostNames.some((names) => names.project === project.path)
  }

  /** Projects with text typed and not parsed yet -- see `parseSoon()`. */
  private waiting = new Set<SP.SpellProject>()

  /** What `parsed()` resolves, at the next `parseNow()`. */
  private parsedWaiters: (() => void)[] = []

  /** The wait of a pending `parseSoon()`. */
  private parseTimer: CancelablePromise<void> | undefined

  ////////////////
  // ## Each file's state
  ////////////////

  /**
   * State of `file` as it is now, made if need be -- along with one for every spell file its project parses.
   * - SIDE EFFECT:  a file of another project lets go of the last project's states first, unless it's `use()`d.
   */
  stateFor(file: SP.AnySpellFile): EditorState {
    return this.entryFor(file).state
  }

  /** The language service's features for `file`'s state:  `undefined` for a file that isn't Spell. */
  languageFor(file: SP.AnySpellFile): CodeMirrorLanguage | undefined {
    return this.entryFor(file).language
  }

  /**
   * Keep `project`'s states while it's in use, e.g. by a `<spell-editor>` -- whatever other project's files are shown.
   * - Returns what stops using it:  once nobody does, its states go, unless it's the project last shown.
   */
  use(project: SP.SpellProject): () => void {
    this.users.set(project, (this.users.get(project) ?? 0) + 1)
    let isReleased = false
    return () => {
      if (isReleased) return
      isReleased = true
      const users = this.users.get(project)! - 1
      if (users) this.users.set(project, users)
      else {
        this.users.delete(project)
        if (project !== this.project) this.disposeProject(project)
      }
    }
  }

  /**
   * Save each of `files` once its state takes its next edit, e.g. a rename's.
   * - Forgets any that haven't had one after `SAVE_WAIT` msec, e.g. a rename that wasn't applied.
   */
  saveAfterEdit(files: SP.AnySpellFile[]): void {
    for (const file of files) this.toSave.add(file.path)
    void after(FileStates.SAVE_WAIT / 1000, () => files.forEach((file) => this.toSave.delete(file.path)))
  }

  /**
   * How long `saveAfterEdit()` waits for an edit, in msec.
   */
  static SAVE_WAIT = 2000

  /**
   * Make `edits` to `file` through its state, so its caret and its own undo stay right:  `false` with no state of it.
   * - Edits from outside the code:  the Inspector, the side bar, a rename, the value picker.
   * - `step`, the default:  an undo step of its own (a move, a lock).
   * - `typing`:  joins the run of typing before it, as keys typed in the code do (a notebook's example typed in).
   * - Either way the change carries `EDIT_WAY`, so the typing helps leave it alone.
   * - Shown in a view:  through the view, which follows it;  shown nowhere:  into the state, kept for later.
   */
  applyEdits(file: SP.AnySpellFile, edits: readonly TextEdit[], way: EditWay = "step"): boolean {
    const entry = this.entries.get(file.path)
    if (!entry) return false
    const { doc } = entry.state
    this.dispatch(entry, {
      changes: LspToCodeMirror.changes(doc, edits),
      annotations: [
        FileStates.EDIT_WAY.of(way),
        way === "step" ? isolateHistory.of("full") : Transaction.userEvent.of("input.type")
      ]
    })
    return true
  }

  /**
   * The "not typed" mark:  an edit the editor didn't take from the keys carries its `EditWay` (epic `codemirror` P2).
   * - On every `applyEdits()` change, and on the file's text coming in from outside (`contentsChanged()`).
   * - Read by the typing helps (P4), so they never act on an edit the editor writes itself.
   * - STATIC:  one mark for every file state on the page.
   */
  static readonly EDIT_WAY = Annotation.define<EditWay>()

  /** Let go of every state we have, and stop following their files. */
  disposeAll(): void {
    for (const entry of this.entries.values()) entry.dispose()
    for (const project of new Set([...this.entries.values()].map((entry) => entry.file.project))) {
      this.client.closed(project)
    }
    this.entries.clear()
    this.project = undefined
  }

  /** Let go of `project`'s states, and stop following their files. */
  private disposeProject(project: SP.SpellProject): void {
    for (const [path, entry] of this.entries) {
      if (entry.file.project !== project) continue
      entry.dispose()
      this.entries.delete(path)
    }
    this.client.closed(project)
  }

  /** Project of the file we last made a state for -- see `stateFor()`. */
  private project: SP.SpellProject | undefined

  /** How many are using each project, so its states stay -- see `use()`. */
  private users = new Map<SP.SpellProject, number>()

  /** Each file's state and what goes with it, by `file.path`. */
  private entries = new Map<string, FileEntry>()

  /**
   * Paths of files to save as soon as their state takes an edit -- see `saveAfterEdit()`.
   * - By path:  what `saveAfterEdit()` is handed may be a fresh object for the same file.
   */
  private toSave = new Set<string>()

  ////////////////
  // ## Showing a state
  ////////////////

  /**
   * Show `file`'s state in `view`, as it was last left:  its text, undo, folds, selection and scroll.
   * - `host`:  what the view adds for itself, e.g. its right-click menu and go to definition, as it shows this state.
   * - The state `view` showed before is kept, with where it was scrolled to.
   * - SIDE EFFECT:  `view` takes the state from any other view showing it, which then follows it no more.
   */
  show(view: EditorView, file: SP.AnySpellFile, host: Extension = []): void {
    this.release(view)
    const entry = this.entryFor(file)
    if (entry.view) this.release(entry.view)
    entry.view = view
    view.setState(entry.state)
    view.dispatch({ effects: [FileStates.host.reconfigure(host), ...(entry.scroll ? [entry.scroll] : [])] })
  }

  /** The file state `view` shows, if any. */
  fileShownIn(view: EditorView): SP.AnySpellFile | undefined {
    for (const entry of this.entries.values()) if (entry.view === view) return entry.file
    return undefined
  }

  /**
   * `view` shows its file's state no more, e.g. before it's destroyed:  the state is kept, where it was scrolled to too.
   * - Nothing to do for a view that shows none.
   */
  release(view: EditorView): void {
    for (const entry of this.entries.values()) {
      if (entry.view !== view) continue
      entry.scroll = view.scrollSnapshot()
      entry.view = undefined
      entry.state = entry.state.update({ effects: FileStates.host.reconfigure([]) }).state
    }
  }

  /**
   * Show `lines` of `file`'s state in `view`, alone:  a slice of it, drawn as the file is, only what's wholly in its
   * lines bubbly (epic `codemirror` P3).
   * - `lines`:  the first and last, 1-based;  they move with edits above them, and grow with lines typed in them
   *   - `column`:  where its code starts on its first line, 1-based, when words come before it there
   *     (`- clickable when it is face up`):  those are hidden, and the caret never goes into them
   *   - `endColumn`:  where its code ends on its last line, when a tag's end follows it there (`its rank</>`):
   *     the rest of that line is hidden the same way
   *   - `dedent`:  its lines shown without their common indent, which the caret never goes into either
   *     (Owen:  "shouldn't show indent here, should be implicit")
   * - `host`:  what the view adds for itself
   * - Its edits are the file's at once, and the file's its;  its own undo is its own edits'.
   * - `releaseSlice()` before the view's destroyed.
   */
  showSlice(view: EditorView, file: SP.AnySpellFile, lines: SliceLines, host: Extension = []): void {
    this.releaseSlice(view)
    const entry = this.entryFor(file)
    const { doc } = entry.state
    const first = doc.line(Math.max(1, Math.min(lines.first, doc.lines)))
    const last = doc.line(Math.max(first.number, Math.min(lines.last, doc.lines)))
    const from = lines.column ? Math.min(first.from + lines.column - 1, first.to) : first.from
    const to = lines.endColumn ? Math.max(from, Math.min(last.from + lines.endColumn - 1, last.to)) : last.to
    const shown = sliceShown.init(() => ({ from, to, dedent: !!lines.dedent }))
    const fileOf = () => (entry.file instanceof SP.SpellFile ? entry.file : undefined)
    const state = EditorState.create({
      doc,
      extensions: [
        shown,
        EditorView.updateListener.of((update) => {
          for (const transaction of update.transactions)
            if (transaction.docChanged && !transaction.annotation(FileStates.SLICED))
              this.fromSlice(entry, update.view, transaction)
        }),
        host,
        // typed in, a slice helps as its file's editor does:  only the editor typed in hears the key
        entry.language
          ? [
              closeBrackets(),
              keymap.of(closeBracketsKeymap),
              CodeMirrorTyping.extension(fileOf, entry.language.file.language.lang, entry.language.elsewhere),
              CodeMirrorCodeOrText.extension(),
              CodeMirrorHovers.extension(),
              CodeMirrorHeadings.extension()
            ]
          : [],
        CodeMirrorLinks.extension(),
        CodeMirrorPopups.extension(),
        CodeMirrorLook.extension((isBubbly) =>
          isBubbly
            ? CodeMirrorBubbly.extension(fileOf, (state) => drawnSlice(state), entry.language?.elsewhere)
            : CodeMirrorTokens.extension(fileOf, entry.language?.elsewhere)
        ),
        CodeMirrorSetup.extensions()
      ]
    })
    view.setState(state)
    entry.slices.add(view)
  }

  /** What `state`, a slice's (`showSlice()`), shows of its file, from and to:  `undefined` for a file's own. */
  static sliceIn(state: EditorState): Slice | undefined {
    const slice = state.field(sliceShown, false)
    return slice && { from: slice.from, to: slice.to }
  }

  /** `view` shows a slice no more, e.g. before it's destroyed. */
  releaseSlice(view: EditorView): void {
    for (const entry of this.entries.values()) entry.slices.delete(view)
  }

  /** The mark on an edit passed on to a slice, or from one:  each takes it once, and keeps it out of its undo. */
  private static readonly SLICED = Annotation.define<boolean>()

  /** A slice's edit `transaction`:  into its file's state, and every other slice of it. */
  private fromSlice(entry: FileEntry, slice: EditorView, transaction: Transaction): void {
    this.slicing = slice
    try {
      this.dispatch(entry, {
        changes: transaction.changes,
        annotations: [FileStates.SLICED.of(true), Transaction.userEvent.of("input.slice")]
      })
    } finally {
      this.slicing = undefined
    }
  }

  /** `changes` made to `entry`'s state:  passed on to each slice of it, but the one they came from. */
  private toSlices(entry: FileEntry, changes: ChangeSet): void {
    for (const slice of entry.slices) {
      if (slice === this.slicing) continue
      slice.dispatch({ changes, annotations: [FileStates.SLICED.of(true), Transaction.addToHistory.of(false)] })
    }
  }

  /** The slice whose edit is going into its file's state now. */
  private slicing: EditorView | undefined

  /**
   * Each state's place for what the view showing it adds (`show()`'s `host`).
   * - STATIC:  every file state has one, empty while it's shown nowhere.
   */
  private static readonly host = new Compartment()

  ////////////////
  // ## Following files
  ////////////////

  /** `file`'s entry, made with those of its project's spell files if need be -- see `stateFor()`. */
  private entryFor(file: SP.AnySpellFile): FileEntry {
    const previous = this.project
    if (file.project !== previous) {
      this.project = file.project
      if (previous && !this.users.has(previous)) this.disposeProject(previous)
    }
    for (const spellFile of file.project.spellFiles) this.ensureEntry(spellFile)
    return this.ensureEntry(file)
  }

  /** `file`'s entry, made and set following its file if we don't have one. */
  private ensureEntry(file: SP.AnySpellFile): FileEntry {
    const existing = this.entries.get(file.path)
    if (existing) return existing

    const language =
      file instanceof SP.SpellFile
        ? new CodeMirrorLanguage({
            service: this.service,
            client: this.client,
            file,
            parseNow: () => this.parseNow(),
            isHolding: () => !!this.entries.get(file.path)?.isHolding
          })
        : undefined
    const entry: FileEntry = {
      file,
      language,
      slices: new Set(),
      state: EditorState.create({ doc: file.contents ?? "", extensions: this.extensionsFor(file, language) }),
      dispose: () => {
        stopContents()
        stopParse?.()
      }
    }
    this.entries.set(file.path, entry)
    this.openInClient(entry)
    const stopContents = observe(() => this.whenContentsChange(entry))
    const stopParse = file instanceof SP.SpellFile ? observe(() => this.whenParsed(entry, file)) : undefined
    return entry
  }

  /**
   * What `file`'s state is made of:  how it follows its view, room for the view's own, Spell's features for a spell
   * file, its look, and the setup every editor takes.
   * - Spell's before the setup's, so its keys (Enter) get the first go.
   * - Its look as the page's setting says (`CodeMirrorLook`):  a Spell file bubbly, else coloured by its tokens;
   *   an HTML file (a property editor page) bubbly, else plain (epic `codemirror` P3).
   * - A property editors file, `Card.editor.spell`, is Spell to look at but never parsed (`SP.isPropertyEditorsName()`),
   *   and so is a samples file, `Card.samples.spell` (`SP.isSamplesName()`, epic `editor` P38):
   *   drawn from its text alone, as Spell is, bubbly or coloured;  its headings, and the help in its tags
   *   (epic `codemirror` I18:  it had no look at all, plain black text).
   * - A CSS file (`styles.css`) coloured by CodeMirror's CSS language, through the ONE colour table (`CodeRules`),
   *   whatever the look;  its property names and values suggested as you type (epic `codemirror` I20:  plain black).
   */
  private extensionsFor(file: SP.AnySpellFile, language: CodeMirrorLanguage | undefined): Extension {
    const spell = language
      ? [
          closeBrackets(),
          keymap.of(closeBracketsKeymap),
          autocompletion({ override: [language.completions], icons: false }),
          CodeMirrorTyping.extension(() => language.file, language.file.language.lang, language.elsewhere),
          CodeMirrorCodeOrText.extension(),
          CodeMirrorValues.extension(language.attributeValuesAt),
          CodeMirrorHovers.extension(),
          CodeMirrorHeadings.extension(),
          // breakpoints in the margin, and the line the program's stopped on (epic `editor` P33)
          CodeMirrorDebug.extension(file.path),
          language.extensions(),
          CodeMirrorLook.extension((isBubbly) =>
            isBubbly
              ? CodeMirrorBubbly.extension(() => language.file, undefined, language.elsewhere)
              : CodeMirrorTokens.extension(() => language.file, language.elsewhere)
          )
        ]
      : SP.isPropertyEditorsName(file.path) || SP.isSamplesName(file.path)
        ? [
            CodeMirrorTyping.markupExtension(),
            CodeMirrorHeadings.extension(),
            CodeMirrorLook.extension((isBubbly) =>
              isBubbly ? CodeMirrorBubbly.extension(() => undefined) : CodeMirrorTokens.extension(() => undefined)
            )
          ]
        : isMarkupFile(file)
          ? [
              CodeMirrorTyping.markupExtension(),
              CodeMirrorLook.extension((isBubbly) => (isBubbly ? CodeMirrorMarkup.extension() : []))
            ]
          : isCssFile(file)
            ? cssExtensions()
            : []
    return [
      EditorView.updateListener.of((update) => {
        const entry = this.entries.get(file.path)
        // only the view showing it:  another may still hold an old copy of the state
        if (entry && update.view === entry.view)
          this.took(entry, update.state, update.docChanged ? update.changes : undefined, wayOf(update.transactions))
      }),
      FileStates.host.of([]),
      spell,
      CodeMirrorLinks.extension(),
      // Settings…' choices, changed live
      CodeMirrorPopups.extension(),
      CodeMirrorSetup.extensions()
    ]
  }

  /**
   * Tell the client `entry`'s spell file is open, with its state's text, once its file has text:
   * a file not loaded yet is an empty state, which the worker's own copy of it mustn't take (epic `solid-2-final` P18).
   * - From then on each change of its state goes to the client (`took()`).
   */
  private openInClient(entry: FileEntry): void {
    const { file } = entry
    if (entry.isOpenInClient || !(file instanceof SP.SpellFile) || file.contents === undefined) return
    entry.isOpenInClient = true
    entry.version = 0
    entry.sent = [{ version: 0, doc: entry.state.doc }]
    this.client.opened(file, entry.state.doc.toString())
  }

  /** Make `spec`'s change to `entry`'s state:  through the view showing it, else into the state itself. */
  private dispatch(entry: FileEntry, spec: TransactionSpec): void {
    if (entry.view) {
      entry.view.dispatch(spec)
      return
    }
    const transaction = entry.state.update(spec)
    const changes = transaction.docChanged ? transaction.changes : undefined
    this.took(entry, transaction.state, changes, transaction.annotation(FileStates.EDIT_WAY))
  }

  /**
   * `entry`'s state is now `state`:  kept;  its `changes` go into its file (`stateEdited()`) and its slices.
   * - `way`:  the edit's `EditWay`, if it isn't keys typed in the code.
   */
  private took(entry: FileEntry, state: EditorState, changes: ChangeSet | undefined, way?: EditWay): void {
    entry.state = state
    if (!changes) return
    if (entry.isOpenInClient) {
      entry.version = (entry.version ?? 0) + 1
      this.client.changed(entry.file as SP.SpellFile, changes)
      this.keepSent(entry, changes, state.doc)
      this.untilPainted(entry)
    } else this.openInClient(entry)
    this.toSlices(entry, changes)
    this.stateEdited(entry, changes, way)
  }

  /**
   * `entry`'s state was edited by `changes`:  its text goes into its file, which re-parses once the typing pauses
   * (`parseSoon()`).
   * - A spell file's text TYPED is handed over later, when its project asks (`project.textLater()`):
   *   once the typing pauses, or as anything is about to read it, e.g. a save (epic `solid-2-final` P9).
   *   So a key makes no string of the file's text, nor wakes what follows its `contents`.
   *   - Where it changed goes with it (`P.EditedSpan`), so its parse reads only around it.
   * - An edit from outside the code (`way`, `applyEdits()`) goes in at once:  what made it may read the file next.
   * - Ignores `contentsChanged()` putting the file's own text in, which leaves them equal.
   */
  private stateEdited(entry: FileEntry, changes: ChangeSet, way: EditWay | undefined): void {
    const { file } = entry
    if (this.following === entry) return
    if (file instanceof SP.SpellFile) {
      file.isDirty = true
      entry.span = P.EditedSpan.joined(entry.span, spanOf(changes))
      if (!entry.isHolding) {
        entry.isHolding = true
        file.project.textLater(file, () => this.handOver(entry))
      }
      if (way || this.toSave.has(file.path)) file.project.takeWaitingText()
      this.parseSoon(file.project)
    } else {
      const text = entry.state.doc.toString()
      if (text === file.contents) return
      file.isDirty = true
      file.contents = text
      file.project.updatedContentsFor(file)
    }
    this.onEdit(file)
    if (this.toSave.delete(file.path)) {
      Promise.resolve(file.save(undefined)).catch((error: unknown) =>
        console.warn(`FileStates:  couldn't save ${file.path}`, error)
      )
    }
  }

  /**
   * Hand `entry`'s text over to its spell file, with where it changed since the last time:  see `stateEdited()`.
   * - Its project calls it (`takeWaitingText()`), before a parse or a compile, or a save.
   * - Then `onTaken`, a microtask later, so what follows the edit count sees the file's new text.
   * - NEVER throws.
   */
  private handOver(entry: FileEntry): void {
    const { file } = entry
    if (!entry.isHolding || !(file instanceof SP.SpellFile)) return
    entry.isHolding = false
    const { span } = entry
    entry.span = undefined
    const text = entry.state.doc.toString()
    entry.handedOver = text
    if (text !== file.contents) file.project.takeText(file, text, span)
    queueMicrotask(() => this.onTaken(file))
  }

  /** The entry whose state `contentsChanged()` is making its file's, if any:  that edit isn't the person's. */
  private following: FileEntry | undefined

  /**
   * Follow `entry.file.contents` -- and ONLY that:  when they change, `contentsChanged()` in a microtask.
   * - NEVER touch CodeMirror inside the reaction:  a dispatch runs the view's listeners there and then, which read
   *   spell state -- which the reaction would follow too.
   */
  private whenContentsChange(entry: FileEntry): void {
    if (entry.file.contents !== undefined) queueMicrotask(() => this.contentsChanged(entry))
  }

  /**
   * `entry`'s file's `contents` changed from outside, e.g. it loaded, or another editor typed in it:
   * its state takes the one change that makes them the same.
   * - Kept out of undo:  undoing your own edits still works, around it.
   */
  private contentsChanged(entry: FileEntry): void {
    const { contents } = entry.file
    if (contents === undefined || this.entries.get(entry.file.path) !== entry) return
    // the text we handed over ourselves (`handOver()`):  the state holds it, or more typed since
    if (contents === entry.handedOver) return
    const now = entry.state.doc.toString()
    if (contents === now) return
    // the file's text wins over what was typed and not handed over yet, as when typing reached it first
    entry.isHolding = false
    entry.span = undefined
    this.following = entry
    try {
      this.dispatch(entry, {
        changes: differenceOf(now, contents),
        annotations: [FileStates.EDIT_WAY.of("step"), Transaction.addToHistory.of(false)]
      })
    } finally {
      this.following = undefined
    }
  }

  /**
   * Follow `file.match` -- and ONLY that:  when it changes, `parseChanged()` in a microtask.
   * - Outside this reaction, so nothing `parseChanged()` reads is followed too:  the diagnostics read, and fill
   *   caches in, observable state, e.g. `project.activeImports`, which would set this off again, for ever.
   * - A microtask also lets a parse finish setting `scope`, `inputLines` and `match` first.
   */
  private whenParsed(entry: FileEntry, file: SP.SpellFile): void {
    if (file.match) queueMicrotask(() => this.parseChanged(entry, file))
  }

  /**
   * `file`'s parse changed:  its diagnostics become its state's problems, and `CodeMirrorSetup.PARSED` tells the rest,
   * its slices' views too.
   * - Only a parse of the text the state holds:  an older one would put its problems in the wrong places.
   * - A `<css>` block before the CSS service is in shows no CSS mistakes:  worked out again once it lands
   *   (`LSP.SpellCSS.load()`, epic `solid-2-final` P6).
   */
  private parseChanged(entry: FileEntry, file: SP.SpellFile): void {
    if (!file.match || this.entries.get(file.path) !== entry) return
    const { state } = entry
    if (file.contents !== state.doc.toString()) return
    if (!this.diagnosesOnPage(file)) {
      this.dispatch(entry, { effects: CodeMirrorSetup.PARSED.of(null) })
    } else {
      if (!LSP.SpellCSS.isLoaded && this.service.css.regionsIn(file.contents ?? "").length) {
        LSP.SpellCSS.load().then(
          () => this.parseChanged(entry, file),
          () => undefined // logged by `SpellCSS`
        )
      }
      const problems = this.withFixIt(
        file,
        this.service.diagnostics(file).map((diagnostic) => LspToCodeMirror.diagnostic(state.doc, diagnostic))
      )
      const { effects } = setDiagnostics(state, problems)
      this.dispatch(entry, { effects: [...asList(effects), CodeMirrorSetup.PARSED.of(null)] })
    }
    // its slices too, so their bubbly look takes the parse:
    // a slice made before it drew its `if`s as plain lines (epic `editor` I215)
    for (const slice of entry.slices) slice.dispatch({ effects: CodeMirrorSetup.PARSED.of(null) })
  }

  /**
   * `problems` of `file`, each one with a fix in one click given a "Fix it" button in the problem popup
   * (`CodeMirrorHovers`;  Owen's C3, epic `language` P68):  a warning on one of Spell's old forms,
   * or the error it becomes once Spell drops it (`CodeEditorFeatures.fixItAt()`).
   * - Pressed:  the fix is worked out again where the problem is now, and made through `applyEdits()`,
   *   one undo step, kept or saved as any edit is.
   */
  private withFixIt(
    file: SP.SpellFile,
    problems: LintDiagnostic[],
    starts = CodeEditorFeatures.fixItStarts(file)
  ): LintDiagnostic[] {
    if (!starts.size) return problems
    return problems.map((problem) =>
      problem.severity !== "hint" && problem.severity !== "info" && starts.has(problem.from)
        ? { ...problem, actions: [{ name: appTexts.text("fixIt"), apply: (view, from) => this.fixIt(file, from) }] }
        : problem
    )
  }

  /** The "Fix it" button pressed on the problem at `from` in `file`'s state:  its fix made, if it still has one. */
  private fixIt(file: SP.SpellFile, from: number): void {
    const entry = this.entries.get(file.path)
    if (!entry) return
    const { doc } = entry.state
    const position = LspToCodeMirror.lspPosition(doc, from)
    if (!this.diagnosesOnPage(file)) {
      // the worker's fix, of the text the state holds now
      const textDocument = { uri: LanguageClient.uriOf(file) }
      void this.client
        .request("spell/oldFormFix", { textDocument, position })
        .then((fix) => {
          if (fix && entry.state.doc === doc) this.applyEdits(file, LspToCodeMirror.editsFor(fix.edit, file.path))
        })
        .catch((error: unknown) => console.error("FileStates:  couldn't fix it", error))
      return
    }
    // the fix reads the parse:  of the text the state holds now
    if (this.waiting.has(file.project)) this.parseNow()
    const edit = CodeEditorFeatures.fixItAt(this.service, file, position)
    if (edit) this.applyEdits(file, LspToCodeMirror.editsFor(edit, file.path))
  }

  /**
   * Are `file`'s problems worked out from the page's own parse?
   * - Not where the language worker answers:  it sends them after each parse (`parsedElsewhere()`).
   * - Except in a project whose names its host fills (the editor's own Spell, `service.hostNames`):
   *   that check is the page's alone.
   */
  private diagnosesOnPage(file: SP.SpellFile): boolean {
    return this.parsesOnPageFor(file.project)
  }

  /**
   * The language worker's parse of a file (of its text after edit `version`, counted since it was opened):
   * its problems become the state's, with their "Fix it" buttons, and what the code's drawn with is kept
   * (`CodeMirrorLanguage.tookParse()`), its slices' too;  a later parse's come after.
   * - Of an earlier edit than the state's, it's moved along the edits since (`sentSince()`):  typing steadily outruns
   *   the worker's parse, and dropping each one left the colours, folds and problems seconds behind the text, up to
   *   18 in a big file (epic `solid-2-final` J70).  An older parse than the one taken is dropped.
   * - An edit's is taken once that edit is painted (epic `solid-2-final` I45):  taken before, laying the file out
   *   again made the browser work the whole page's layout out first, and the key showed up to a second later.
   *   - At once when it's painted already, as it is once the typing pauses:  waiting for another frame there held
   *     the drawing back 600 msec in a big file.  At once too with nothing to paint:  a hidden page, no DOM.
   */
  private parsedElsewhere(parsed: LSP.LanguageParsed): void {
    const path = LSP.AppAddresses.pathOf(parsed.uri)
    const entry = path === undefined ? undefined : this.entries.get(path)
    const isShown = !!entry?.view && globalThis.document?.hidden === false
    if (entry && isShown && parsed.version !== entry.version) return this.hold(entry, parsed)
    if (entry) entry.held = undefined
    if (!entry?.isUnpainted || !isShown) return this.takeParsed(parsed)
    beforeNextPaint(() => soon(() => this.takeParsed(parsed)))
  }

  /**
   * Hold `parsed`, a parse edits outran, till the next edit is painted, or `HELD_MSEC` with none:  then it's taken
   * (epic `solid-2-final` J70).
   * - Why:  taking one marks the lines on screen again from it, 50 msec of work on a phone in a big file's tags;
   *   taken as it came, it held up nearly half the keys typed 120 msec apart.  Taken just after a key's painted,
   *   it's done before the next one.
   * - A later parse coming meanwhile takes its place.
   */
  private hold(entry: FileEntry, parsed: LSP.LanguageParsed): void {
    const wasHeld = !!entry.held
    entry.held = parsed
    if (!wasHeld) void after(FileStates.HELD_MSEC / 1000, () => this.takeHeld(entry))
  }

  /** Take `entry`'s held parse, if it has one:  see `hold()`. */
  private takeHeld(entry: FileEntry): void {
    const { held } = entry
    entry.held = undefined
    if (held) this.takeParsed(held)
  }

  /** The most a parse edits outran is held, with no edit painted meanwhile, in msec:  see `hold()`. */
  static HELD_MSEC = 150

  /**
   * Keep `entry`'s text after an edit sent to the language worker, as `changes` made `doc` of it:
   * a parse of it may come after more edits, and is moved along them (`sentSince()`;  epic `solid-2-final` J70).
   * - The last `SENT_KEPT` edits:  a parse further behind than that is dropped, the next one being on its way.
   */
  private keepSent(entry: FileEntry, changes: ChangeSet, doc: Text): void {
    const sent = (entry.sent ??= [])
    sent.push({ version: entry.version!, doc, changes })
    if (sent.length > FileStates.SENT_KEPT) sent.splice(0, sent.length - FileStates.SENT_KEPT)
  }

  /** How many of a file's edits sent to the language worker are kept:  see `keepSent()`. */
  static SENT_KEPT = 200

  /**
   * `entry`'s text after its edit `version`, and the edits made since, if any:  `undefined` when it isn't kept.
   * - SIDE EFFECT:  forgets the edits before it, as no later parse can be of them.
   */
  private static sentSince(entry: FileEntry, version: number): { doc: Text; changes?: ChangeSet } | undefined {
    if (entry.version === version) return { doc: entry.state.doc }
    const sent = entry.sent ?? []
    const at = sent.findIndex((each) => each.version === version)
    if (at < 0) return undefined
    sent.splice(0, at)
    let changes: ChangeSet | undefined
    for (const each of sent.slice(1)) changes = changes ? changes.compose(each.changes!) : each.changes
    return { doc: sent[0]!.doc, changes }
  }

  /** `problem`, found in an earlier text, where it is after `changes`, if any. */
  private static movedAlong(problem: LintDiagnostic, changes: ChangeSet | undefined): LintDiagnostic {
    if (!changes) return problem
    const from = changes.mapPos(problem.from, 1)
    return { ...problem, from, to: Math.max(from, changes.mapPos(problem.to, -1)) }
  }

  /** `entry`'s edit is unpainted till the browser has drawn a frame:  see `parsedElsewhere()`. */
  private untilPainted(entry: FileEntry): void {
    if (!entry.view || globalThis.document?.hidden !== false) return
    const { version } = entry
    entry.isUnpainted = true
    beforeNextPaint(() =>
      soon(() => {
        if (entry.version === version) entry.isUnpainted = false
        // the parse edits outran, taken now the key's on screen:  see `hold()`
        this.takeHeld(entry)
      })
    )
  }

  /**
   * Take `parsed` as `parsedElsewhere()` says, unless the state was edited since.
   * - Its problems only where the worker diagnoses:  the editor's own Spell keeps the page's (`diagnosesOnPage()`).
   */
  private takeParsed(parsed: LSP.LanguageParsed): void {
    const { uri, version, diagnostics, fixItStarts } = parsed
    const path = LSP.AppAddresses.pathOf(uri)
    const entry = path === undefined ? undefined : this.entries.get(path)
    const file = entry?.file
    if (!entry || !(file instanceof SP.SpellFile)) return
    // a parse older than the one drawn from:  nothing new in it
    if ((entry.language?.lastParseVersion ?? -1) > version) return
    const since = FileStates.sentSince(entry, version)
    if (!since) return
    const { state } = entry
    const { doc, changes } = since
    // what the code's drawn with:  its fold arrows, its look, the types its tags name
    entry.language?.tookParse(parsed, doc, changes && { doc: state.doc, changes })
    const effects: StateEffect<unknown>[] = [CodeMirrorSetup.PARSED.of(null)]
    if (!this.diagnosesOnPage(file)) {
      const problems = this.withFixIt(
        file,
        diagnostics.map((diagnostic) => FileStates.movedAlong(LspToCodeMirror.diagnostic(doc, diagnostic), changes)),
        new Set(fixItStarts.map((start) => changes?.mapPos(start, 1) ?? start))
      )
      effects.unshift(...asList(setDiagnostics(state, problems).effects))
    }
    this.dispatch(entry, { effects })
    for (const slice of entry.slices) slice.dispatch({ effects: CodeMirrorSetup.PARSED.of(null) })
  }
}

/** How a `FileStates` is made. */
export type FileStatesProps = {
  /** the language service, which answers each spell file's problems */
  service: LSP.SpellLanguageService
  /** what answers what a person asks of the code:  default, `service` itself (`LanguageClient.inThread()`) */
  client?: LanguageClient
  /** called after each edit of a state, e.g. to compile soon.  Default:  nothing. */
  onEdit?: (file: SP.AnySpellFile) => void
  /** called once a spell file's typed text is in its `contents`.  Default:  nothing. */
  onTaken?: (file: SP.SpellFile) => void
}

/** The `EditWay` of an update's transactions, if one carries it:  `undefined` for keys typed in the code. */
function wayOf(transactions: readonly Transaction[]): EditWay | undefined {
  for (const transaction of transactions) {
    const way = transaction.annotation(FileStates.EDIT_WAY)
    if (way) return way
  }
  return undefined
}

/** The one span `changes` touch (`P.EditedSpan`):  from the first change to the last, in the old text's offsets. */
function spanOf(changes: ChangeSet): P.EditedSpan | undefined {
  let from = Infinity
  let to = -1
  changes.iterChangedRanges((fromA, toA) => {
    from = Math.min(from, fromA)
    to = Math.max(to, toA)
  })
  if (to < 0) return undefined
  return { from, to, toNew: to + changes.newLength - changes.length }
}

/**
 * How an edit from outside the code joins its file's undo:
 * a step of its own, or part of a run of typing -- see `FileStates.applyEdits()`.
 */
export type EditWay = "step" | "typing"

/**
 * The old forms of Spell written in a file, with the text they're found in (`FileStates.oldForms()`).
 * - `count`:  how many;  `edits`:  one list rewriting them all the new way, offsets in `text`
 */
export type OldFormsFound = LSP.LanguageAnswer<"spell/oldForms"> & {
  /** the file's text the edits are in */
  text: string
}

/** The lines `FileStates.showSlice()` shows:  see there. */
export type SliceLines = {
  /** its first line, 1-based */
  first: number
  /** its last line, 1-based */
  last: number
  /** where its code starts on its first line, 1-based:  the words before it are hidden */
  column?: number
  /** where its code ends on its last line, 1-based:  the words from there on are hidden */
  endColumn?: number
  /** show its lines without their common indent */
  dedent?: boolean
}

/** One file's state, and what goes with it. */
type FileEntry = {
  /** the file */
  file: SP.AnySpellFile
  /** its state now:  what the view showing it holds, or what it was left as */
  state: EditorState
  /** the language service's features for it, if it's Spell */
  language: CodeMirrorLanguage | undefined
  /** the view showing it, if any */
  view?: EditorView
  /** its state holds text typed and not handed over to its spell file yet (`handOver()`) */
  isHolding?: boolean
  /** where that text changed since it was last handed over */
  span?: P.EditedSpan
  /** the text last handed over:  `contentsChanged()` knows its own */
  handedOver?: string
  /** the views showing a slice of it (`showSlice()`) */
  slices: Set<EditorView>
  /** the client was told it's open, with its text:  each change goes to it (`openInClient()`) */
  isOpenInClient?: boolean
  /** its last edit isn't painted yet:  the worker's parse of it waits till it is (`parsedElsewhere()`) */
  isUnpainted?: boolean
  /** how many changes went to the client since it was opened:  the worker's problems name it (`parsedElsewhere()`) */
  version?: number
  /**
   * its last texts sent, each with the edit that made it:  a late parse is moved along the edits since
   * (`sentSince()`;  epic `solid-2-final` J70)
   */
  sent?: Array<{ version: number; doc: Text; changes?: ChangeSet }>
  /** a parse edits outran, waiting to be taken till an edit's painted:  see `hold()` */
  held?: LSP.LanguageParsed
  /** where it was scrolled to when last shown */
  scroll?: StateEffect<unknown>
  /** stops following its file */
  dispose: () => void
}

/** Is `file` HTML, e.g. a property editor page, `Card.editor.html`:  drawn as the drawn-bubbly page draws HTML? */
function isMarkupFile(file: SP.AnySpellFile): boolean {
  return /\.html?$/i.test(file.path)
}

/** Is `file` a style sheet, e.g. a project's `styles.css`? */
function isCssFile(file: SP.AnySpellFile): boolean {
  return /\.css$/i.test(file.path)
}

/**
 * What a CSS file's editor takes:
 * CodeMirror's CSS language, coloured by `CodeRules`, its suggestions, its brackets closed as typed.
 * - Its functions (`var()`, `calc()`) are actions, as a javascript call is:
 *   CodeMirror's CSS calls them `operatorKeyword`, which would colour them as `and` and `not` are.
 */
function cssExtensions(): Extension {
  const calls = cssLanguage.configure({ props: [styleTags({ Callee: tags.function(tags.variableName) })] })
  return [
    new LanguageSupport(calls, css().support),
    syntaxHighlighting(CodeRules.codeMirrorStyle),
    autocompletion({ icons: false }),
    closeBrackets(),
    keymap.of(closeBracketsKeymap)
  ]
}

/**
 * The lines a slice shows, moved with each edit;  the text above and below them hidden, and out of the caret's way,
 * with the words before its code on its first line and after it on its last, and its lines' common indent if asked.
 * - Set by `showSlice()`:  `init()`, as each slice shows its own.
 */
const sliceShown = StateField.define<Slice & { dedent: boolean }>({
  create: () => ({ from: 0, to: 0, dedent: false }),
  update: (slice, transaction) =>
    transaction.docChanged
      ? {
          ...slice,
          from: transaction.changes.mapPos(slice.from, -1),
          to: transaction.changes.mapPos(slice.to, 1)
        }
      : slice,
  provide: (field) => {
    const hidden = (state: EditorState): DecorationSet => {
      const { from, to, dedent } = state.field(field)
      const { doc } = state
      const first = doc.lineAt(from)
      const last = doc.lineAt(to)
      const ranges = []
      if (first.from > 0) ranges.push(HIDDEN.range(0, first.from - 1))
      if (from > first.from) ranges.push(HIDDEN_WORDS.range(first.from, from))
      if (dedent) ranges.push(...indentHidden(doc, first.number, last.number, from))
      if (to < last.to) ranges.push(HIDDEN_WORDS.range(to, last.to))
      if (last.to < doc.length) ranges.push(HIDDEN.range(last.to + 1, doc.length))
      return Decoration.set(ranges, true)
    }
    return [
      EditorView.decorations.compute([field, "doc"], hidden),
      EditorView.atomicRanges.of((view) => hidden(view.state) as RangeSet<Decoration>)
    ]
  }
})

/** Lines out of a slice:  hidden, a block of nothing. */
const HIDDEN = Decoration.replace({ block: true })

/** Words on a slice's first or last line that aren't its code, and its lines' common indent:  hidden. */
const HIDDEN_WORDS = Decoration.replace({})

/**
 * The common indent of lines `first` to `last` of `doc`, hidden on each:  the slice's lines shown as if dedented.
 * - Blank lines lose only what they have of it.
 * - A first line whose code starts at `from`, past its indent, keeps what's before it to `HIDDEN_WORDS`.
 */
function indentHidden(doc: EditorState["doc"], first: number, last: number, from: number) {
  const common = commonIndentOf(doc, first, last)
  if (!common) return []
  const ranges = []
  for (let number = first; number <= last; number++) {
    const line = doc.line(number)
    const indent = Math.min(common, line.text.length - line.text.trimStart().length)
    if (indent && line.from >= from) ranges.push(HIDDEN_WORDS.range(line.from, line.from + indent))
  }
  return ranges
}

/** How many characters of indent lines `first` to `last` of `doc` all start with;  blank lines don't count. */
function commonIndentOf(doc: EditorState["doc"], first: number, last: number): number {
  let common = Infinity
  for (let number = first; number <= last; number++) {
    const { text } = doc.line(number)
    if (text.trim()) common = Math.min(common, text.length - text.trimStart().length)
  }
  return common === Infinity ? 0 : common
}

/**
 * The slice `state` shows, as the bubbly look draws it:  its lines, and the indent hidden on each when it's dedented,
 * so its rails and feet stand under its bands, where the hidden indent leaves them (epic `language` I128).
 */
function drawnSlice(state: EditorState): Slice {
  const { from, to, dedent } = state.field(sliceShown)
  if (!dedent) return { from, to }
  const { doc } = state
  return { from, to, hiddenIndent: commonIndentOf(doc, doc.lineAt(from).number, doc.lineAt(to).number) }
}

/** `effects`, one or many or none, as a list. */
function asList<T>(effects: T | readonly T[] | undefined): T[] {
  if (effects === undefined) return []
  return Array.isArray(effects) ? [...(effects as readonly T[])] : [effects as T]
}

/** The one change taking `before` to `after`:  what's between their common start and end. */
function differenceOf(before: string, after: string) {
  let start = 0
  while (start < before.length && start < after.length && before[start] === after[start]) start++
  let end = 0
  while (
    end < before.length - start &&
    end < after.length - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  )
    end++
  return { from: start, to: before.length - end, insert: after.slice(start, after.length - end) }
}
