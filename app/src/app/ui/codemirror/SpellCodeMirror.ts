import { redo, redoDepth, undo, undoDepth } from "@codemirror/commands"
import { javascript } from "@codemirror/lang-javascript"
import { python } from "@codemirror/lang-python"
import { syntaxHighlighting } from "@codemirror/language"
import { MergeView } from "@codemirror/merge"
import { openSearchPanel } from "@codemirror/search"
import type { Extension } from "@codemirror/state"
import { EditorView, type KeyBinding, keymap, type ViewUpdate } from "@codemirror/view"
import type { WorkspaceEdit } from "vscode-languageserver"

import type { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { CodeRules } from "spell/app/app/ui/CodeRules"
import { codeEditors, type CodeEditorCommand, type CodeEditorHandle } from "spell/app/app/ui/ui.types"
// types only:  the editor page's keys bring the app with them, which `<spell-editor>`'s chunk mustn't
import type { Hotkey } from "spell/app/app/pages/editorHotkeys"
import { CodeMirrorBubbly } from "./CodeMirrorBubbly"
import { CodeMirrorFollowed } from "./CodeMirrorFollowed"
import type { CodeMirrorLanguage } from "./CodeMirrorLanguage"
import { CodeMirrorLook } from "./CodeMirrorLook"
import { CodeMirrorRename } from "./CodeMirrorRename"
import { CodeMirrorSetup } from "./CodeMirrorSetup"
import { CodeMirrorTokens } from "./CodeMirrorTokens"
import { CodeMirrorTyping } from "./CodeMirrorTyping"
import { FileStates } from "./FileStates"
import { LspToCodeMirror, type CodeMirrorLocation } from "./LspToCodeMirror"

import "spell/app/app/components/spell-code/bubbly.css"
import "./codemirror.css"

/****************
 * ### `SpellCodeMirror`
 * Spell in CodeMirror 6:  an editor of a project's files, drawn bubbly, with the language service, find and replace,
 * Spell's main typing helps and a right-click menu of the page's own;  and the other views code is shown in.
 * - `SpellCodeMirror.edit()` makes an editor of a view (`<CodeMirrorEditor>`'s), showing one file's state at a time:
 *   `show()` another, and switching back finds it as it was left, undo and folds too (`FileStates`).
 * - `codeExtensions()` shows another language's code (the compiled javascript);  `merge()` shows two sides of a file,
 *   each change takeable, as Publish's clash dialog does.
 * - Every one of them starts from the one base setup, `CodeMirrorSetup`:  keys, undo, find, the gutter,
 *   CodeMirror's words in the app's language.
 * - An editor of project files is a code editor as the page's keys and menus reach one (`UIT.CodeEditorHandle`,
 *   `run()`):  its keys are the editor's one shortcut list's (`EDITOR_HOTKEYS`, passed in;  `keymapFor()`),
 *   and while it has the focus, the Edit menu's Undo, Cut, Copy and Paste are its own
 *   (`codeEditors.focused`;  epic `codemirror` P5).
 * - The app's code editor (epic `codemirror` P6):  the code pane, the Inspector's Code
 *   card, the compiled code, Publish's diff, a notebook's cells and `<spell-editor>`, each loading it lazily.
 * - Its position in the import graph:  CodeMirror, the parser, the language service, `bubbly.css`.
 *   NEVER the editor page (`editorHotkeys.ts` but its types, `spell/app/app/solid`, `editor`):  `<spell-editor>`'s
 *   chunk is this, on a page with no app.
 *   The typing helps' rules and the files' addresses are the language service's (`LSP.SpellTyping`,
 *   `LSP.AppAddresses`), shared with VS Code.
 ****************/
export class SpellCodeMirror implements CodeEditorHandle {
  /** The page's one language service for CodeMirror's editors, made on first use. */
  static get service(): LSP.SpellLanguageService {
    if (!SpellCodeMirror._service) {
      SpellCodeMirror._service = new LSP.SpellLanguageService(new LSP.AppAddresses())
      // its value's words list a Pick row first, which opens the picker at the caret (epic `editor` T61)
      SpellCodeMirror._service.picksValues = true
    }
    return SpellCodeMirror._service
  }
  private static _service: LSP.SpellLanguageService | undefined

  /**
   * The page's one set of file states, every CodeMirror editor's, made on first use:  see `FileStates`.
   * - STATIC:  every editor of the page's files shows these, so each file's text is kept once.
   * - Its edits reach whoever listens, `SpellCodeMirror.onEdit()`.
   */
  static get states(): FileStates {
    SpellCodeMirror._states ??= new FileStates({
      service: SpellCodeMirror.service,
      onEdit: (file) => {
        for (const listener of SpellCodeMirror.editListeners) listener(file)
      }
    })
    return SpellCodeMirror._states
  }
  private static _states: FileStates | undefined

  /**
   * Hear each edit of a file's state, once it's gone into the file, e.g. to compile or save soon.
   * - Several may listen:  the app's editor, each `<spell-editor>` on the page.
   * - Returns what stops it.
   */
  static onEdit(listener: (file: SP.AnySpellFile) => void): () => void {
    SpellCodeMirror.editListeners.add(listener)
    return () => SpellCodeMirror.editListeners.delete(listener)
  }

  /** Who hears each edit -- see `onEdit()`. */
  private static editListeners = new Set<(file: SP.AnySpellFile) => void>()

  /**
   * An editor of project files in `view`, showing `options.file`'s state.
   * - `onOpen`:  show another place, e.g. a declaration in another file;  this file's are selected here
   * - `onContextMenu`:  a right click, at `x` and `y` on the page:  the page draws its own menu
   * - The view stays its maker's:  `release()` lets go of the state before it's destroyed.
   */
  static edit(view: EditorView, options: SpellCodeMirrorOptions): SpellCodeMirror {
    return new SpellCodeMirror(view, options)
  }

  private constructor(
    /** the editor */
    readonly view: EditorView,
    private readonly options: SpellCodeMirrorOptions
  ) {
    this.file = options.file
    SpellCodeMirror.states.show(view, this.file, this.host())
  }

  /** The file shown. */
  file: SP.AnySpellFile

  /** The language service's features for the file shown, if it's Spell. */
  get language(): CodeMirrorLanguage | undefined {
    return SpellCodeMirror.states.languageFor(this.file)
  }

  /** Show `file`'s state:  as it was left, undo, folds and selection too.  The one shown before is kept. */
  show(file: SP.AnySpellFile): void {
    if (file === this.file && SpellCodeMirror.states.fileShownIn(this.view) === file) return
    this.file = file
    SpellCodeMirror.states.show(this.view, file, this.host())
  }

  /** Let go of the file's state, which is kept, e.g. before the view is destroyed. */
  release(): void {
    SpellCodeMirror.states.release(this.view)
    if (codeEditors.focused === this) codeEditors.focused = undefined
  }

  ////////////////
  // ## Commands
  ////////////////

  /**
   * Run `command`, the page's name for one of the code editor's own (`EDITOR_HOTKEYS`' `codeEditorCommand`),
   * at the caret, focusing the editor first:  what a menu row or a key runs.
   */
  run(command: CodeEditorCommand): void {
    const { view } = this
    view.focus()
    const head = view.state.selection.main.head
    const commands: Record<CodeEditorCommand, () => unknown> = {
      undo: () => undo(view),
      redo: () => redo(view),
      find: () => openSearchPanel(view),
      cut: () => this.cutOrCopy("cut"),
      copy: () => this.cutOrCopy("copy"),
      paste: () => this.paste(),
      goToDefinition: () => this.goToDefinition(head),
      goToTypeDefinition: () => this.goToDefinition(head, "typeDefinition"),
      findReferences: () => this.findReferences(head),
      rename: () => this.rename()
    }
    void Promise.resolve(commands[command]()).catch((error: unknown) =>
      console.error(`SpellCodeMirror.run():  ${command} failed`, error)
    )
  }

  /** Has the file's own history a step to `action`? */
  canUndo(action: "undo" | "redo"): boolean {
    return (action === "undo" ? undoDepth : redoDepth)(this.view.state) > 0
  }

  /** Undo or redo the file's last step, leaving the focus where it is. */
  undo(action: "undo" | "redo"): void {
    ;(action === "undo" ? undo : redo)(this.view)
  }

  /**
   * Go to where the thing at `pos` is declared, or its type is:  here, selected;  in another file, through `onOpen`.
   * - A Spell UI tag or attribute, which no file declares:  its help, where it's written (epic `editor` I148).
   */
  async goToDefinition(pos: number, method: "definition" | "typeDefinition" = "definition"): Promise<boolean> {
    const location = await this.language?.definitionAt(this.view, pos, method)
    if (location) return this.open(location)
    return method === "definition" && !!(await this.language?.showHelp(this.view, pos))
  }

  /**
   * Go to Symbol (⇧⌘O, Ctrl+Shift+O off a Mac):  what the file declares, its outline, listed at the caret through
   * `onReferences`, each row going there.
   */
  async goToSymbol(): Promise<void> {
    const symbols = (await this.language?.symbolsOf(this.view)) ?? []
    const at = this.view.coordsAtPos(this.view.state.selection.main.head)
    if (at)
      this.options.onReferences?.(
        this,
        { x: at.left, y: at.bottom },
        symbols.map((symbol) => symbol.location)
      )
  }

  /** Show `location`:  here, selected;  in another file, through `onOpen`.  `true` if shown. */
  open(location: CodeMirrorLocation): boolean {
    if (location.path === this.file.path) {
      this.select(location)
      return true
    }
    return this.options.onOpen?.(location) ?? false
  }

  /** List every use of the thing at `pos`, through `onReferences`:  the page's menu of them. */
  async findReferences(pos: number): Promise<void> {
    const locations = (await this.language?.referencesAt(this.view, pos)) ?? []
    const at = this.view.coordsAtPos(pos)
    if (at) this.options.onReferences?.(this, { x: at.left, y: at.bottom }, locations)
  }

  /** Rename Symbol (F2) at the caret:  see `CodeMirrorRename`. */
  async rename(): Promise<void> {
    const { language } = this
    if (language) await CodeMirrorRename.start(this.view, language, (edit) => this.applyEverywhere(edit))
  }

  /** Can the thing at `pos` be renamed?  Rename Symbol's menu row shows only where it can (I147). */
  async canRename(pos: number): Promise<boolean> {
    return !!(await this.language?.renameRangeAt(this.view, pos))
  }

  /**
   * Make `edit`'s changes, each file's through its state (`FileStates.applyEdits()`):  ONE undo step in each.
   * - SIDE EFFECT:  each file it touches saves once it takes its edit.
   */
  private applyEverywhere(edit: WorkspaceEdit): void {
    const { states } = SpellCodeMirror
    const files = Object.keys(edit.changes ?? {}).flatMap((uri) => {
      const path = LSP.AppAddresses.pathOf(uri)
      return this.file.project.spellFiles.find((file) => file.path === path) ?? []
    })
    states.saveAfterEdit(files)
    for (const file of files) states.applyEdits(file, LspToCodeMirror.editsFor(edit, file.path))
  }

  /** Cut or copy the selection, through the system's clipboard. */
  private async cutOrCopy(action: "cut" | "copy"): Promise<void> {
    const { view } = this
    const { from, to } = view.state.selection.main
    if (from === to) return
    await navigator.clipboard.writeText(view.state.sliceDoc(from, to))
    if (action === "cut") view.dispatch({ changes: { from, to }, userEvent: "delete.cut" })
  }

  /** Paste the system's clipboard, re-indented where it lands in a Spell file, as ⌘V's is. */
  private async paste(): Promise<void> {
    const { view } = this
    const text = await navigator.clipboard.readText()
    if (CodeMirrorTyping.paste(view, text)) return
    view.dispatch(view.state.replaceSelection(text), { userEvent: "input.paste" })
  }

  ////////////////
  // ## Showing
  ////////////////

  /**
   * Select from `anchor` to `head`, offsets in the file shown, bringing `head` into the middle of the view when it's out
   * of it:  the file's place restored, e.g. where it was last left.
   * - Never takes the keyboard's focus.
   */
  selectRange(anchor: number, head: number): void {
    const isShown = CodeMirrorFollowed.isInView(this.view, head)
    this.view.dispatch({
      selection: { anchor, head },
      effects: isShown ? [] : EditorView.scrollIntoView(head, { y: "center" })
    })
  }

  /** Select `location`'s range, in this file, and show it. */
  select(location: CodeMirrorLocation): void {
    const { from, to } = LspToCodeMirror.range(this.view.state.doc, location.range)
    this.view.dispatch({ selection: { anchor: from, head: to }, scrollIntoView: true })
    this.view.focus()
  }

  /**
   * What this editor adds to the state it shows:  the editor's keys (`keymapFor()`), Rename Symbol's field, the uses
   *   of the word at the caret if asked (`highlights`), ⌘-click to the definition, a right click its menu;
   *   and it's the page's code editor while it has the focus (`codeEditors.focused`).
   */
  private host(): Extension {
    return [
      keymap.of([
        ...SpellCodeMirror.keymapFor(this, this.options.hotkeys ?? {}),
        { key: "Mod-Shift-o", run: () => (void this.goToSymbol(), true), preventDefault: true }
      ]),
      CodeMirrorRename.extension(),
      this.options.highlights && this.language ? this.language.highlights() : [],
      EditorView.updateListener.of((update) => this.options.onUpdate?.(update)),
      EditorView.focusChangeEffect.of((_state, isFocused) => {
        if (isFocused) codeEditors.focused = this
        return null
      }),
      EditorView.domEventHandlers({
        contextmenu: (event, view) => {
          // no menu of the page's:  the browser's
          if (!this.options.onContextMenu) return false
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
          // a click outside the selection moves the caret there first, as VS Code does
          if (pos !== null && !view.state.selection.ranges.some((range) => range.from <= pos && pos <= range.to))
            view.dispatch({ selection: { anchor: pos } })
          event.preventDefault()
          this.options.onContextMenu?.(this, { x: event.clientX, y: event.clientY })
          return true
        },
        mousedown: (event, view) => {
          // ⌘-click goes to the definition, as in VS Code
          if (!(event.metaKey || event.ctrlKey) || event.button !== 0) return false
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
          if (pos === null) return false
          event.preventDefault()
          void this.goToDefinition(pos)
          return true
        }
      })
    ]
  }

  /**
   * The editor page's shortcuts as `editor`'s keys:
   * each code-editor command (`codeEditorCommand`) runs in it;  each other key the page runs (`run`) runs, but those
   * the code never takes (`outsideCode`:  Esc, the parts' Cut and Copy).
   * - Its own Undo, Redo and Find too, through `run()`:  the same as CodeMirror's.
   */
  static keymapFor(editor: SpellCodeMirror, hotkeys: Readonly<Record<string, Hotkey>>): KeyBinding[] {
    return Object.values(hotkeys).flatMap(({ shortcut, run, codeEditorCommand, outsideCode }): KeyBinding[] => {
      const key = codeMirrorKey(shortcut)
      if (codeEditorCommand) return [{ key, run: () => (editor.run(codeEditorCommand), true), preventDefault: true }]
      if (!run || outsideCode) return []
      return [{ key, run: () => (void run(), true), preventDefault: true }]
    })
  }

  ////////////////
  // ## Other views
  ////////////////

  /**
   * What a view of another language's code takes, read only:  the compiled javascript, TypeScript or Python,
   * its lines numbered.
   * - Coloured through the ONE table of code colours (`CodeRules.codeMirrorStyle`):
   *   the page theme's `--ui-code-<role>` tokens, light or dark as the page is.
   */
  static codeExtensions(language: CompiledLanguage = "javascript"): Extension {
    return [
      language === "python" ? python() : javascript({ typescript: language === "typescript" }),
      syntaxHighlighting(CodeRules.codeMirrorStyle),
      EditorView.editorAttributes.of({ class: "cmb-code" }),
      CodeMirrorSetup.extensions({ editable: false, lineNumbers: true })
    ]
  }

  /**
   * What a view of a snippet of Spell takes, not a project file:  a notebook's example code (`<CellEditor>`).
   * - Drawn bubbly while the look's on, as the code pane draws Spell;  coloured by its tokens while it's off
   *   (`CodeMirrorLook`).
   * - Its long lines wrapped:  it's as tall as its text.
   * - Its own undo, a run of typing undone as one.
   */
  static snippetExtensions(): Extension {
    return [
      CodeMirrorLook.extension((isBubbly) =>
        isBubbly ? CodeMirrorBubbly.extension(() => undefined) : CodeMirrorTokens.extension(() => undefined)
      ),
      EditorView.lineWrapping,
      CodeMirrorSetup.extensions()
    ]
  }

  /**
   * Two sides of a file in `parent`:  `theirs` left, read only, `mine` right, editable;  each change takeable by its
   * arrow, from theirs into yours (⌘Z puts yours back).
   * - Both drawn bubbly while the look's on, each side on its own, lined up round the merge view's collapsed gaps
   *   (`CodeMirrorLook`);  coloured by their tokens while it's off.
   * - `onChange`:  your side's whole text after each change
   */
  static merge(parent: HTMLElement, sides: MergeSides): MergeView {
    const bubbly = () =>
      CodeMirrorLook.extension((isBubbly) =>
        isBubbly ? CodeMirrorBubbly.extension(() => undefined) : CodeMirrorTokens.extension(() => undefined)
      )
    const merge = new MergeView({
      parent,
      a: { doc: sides.theirs, extensions: [bubbly(), CodeMirrorSetup.extensions({ editable: false })] },
      b: {
        doc: sides.mine,
        extensions: [
          bubbly(),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) sides.onChange?.(update.state.doc.toString())
          }),
          CodeMirrorSetup.extensions()
        ]
      },
      revertControls: "a-to-b",
      highlightChanges: true,
      gutter: true,
      collapseUnchanged: { margin: 3, minSize: 6 }
    })
    rootOnceConnected(parent, [merge.a, merge.b])
    return merge
  }
}

/**
 * Give `views` their root (the page, or a shadow root) once `parent` is in it.
 * - HACK: a view made in an element that's not in the page yet (Solid draws a branch, then inserts it) takes that
 *   element's own tree as its root, and puts its style sheet there:  the editor then draws with none of CodeMirror's
 *   own CSS.  `setRoot()` moves it.
 */
function rootOnceConnected(parent: HTMLElement, views: EditorView[], frames = 60) {
  if (parent.isConnected) {
    const root = parent.getRootNode() as Document | ShadowRoot
    for (const view of views) if (view.root !== root) view.setRoot(root)
  } else if (frames > 0) requestAnimationFrame(() => rootOnceConnected(parent, views, frames - 1))
}

/** How `SpellCodeMirror.edit()` makes an editor. */
export type SpellCodeMirrorOptions = {
  /** the project file it shows first */
  file: SP.AnySpellFile
  /** show `location`, in another file;  `true` if shown */
  onOpen?: (location: CodeMirrorLocation) => boolean
  /** a right click, at `at` on the page:  the page draws its menu */
  onContextMenu?: (editor: SpellCodeMirror, at: { x: number; y: number }) => void
  /** Find All References' answer, every use of the thing at the caret:  the page lists them at `at` */
  onReferences?: (editor: SpellCodeMirror, at: { x: number; y: number }, locations: CodeMirrorLocation[]) => void
  /** each change to the view, its text's, its caret's, the file it shows:  e.g. to follow the caret */
  onUpdate?: (update: ViewUpdate) => void
  /**
   * the page's shortcuts, as its keys:  the editor page's, `EDITOR_HOTKEYS`, or a page's own.
   * - None:  CodeMirror's own keys alone (undo, find ...), no Go to Definition, Rename Symbol ...
   * - No default:  `EDITOR_HOTKEYS` brings the editor page with it, which `<spell-editor>`'s chunk mustn't
   */
  hotkeys?: Readonly<Record<string, Hotkey>>
  /**
   * mark the other uses of the word at the caret?
   * Default:  `false` (Owen:  "distracting, turn it off")
   */
  highlights?: boolean
}

/** A shortcut in Spell UI's words (`shift+mod+R`) as CodeMirror writes a key (`Shift-Mod-r`). */
function codeMirrorKey(shortcut: string): string {
  return shortcut
    .split("+")
    .map((part, index, parts) => {
      if (index < parts.length - 1) return CODEMIRROR_MODIFIERS[part.toLowerCase()] ?? part
      return part.length === 1 ? part.toLowerCase() : part
    })
    .join("-")
}

/** Spell UI's modifier words, as CodeMirror writes them. */
const CODEMIRROR_MODIFIERS: Record<string, string> = {
  mod: "Mod",
  shift: "Shift",
  alt: "Alt",
  ctrl: "Ctrl",
  meta: "Meta"
}

/** The languages `SpellCodeMirror.codeExtensions()` colours:  what Spell compiles to (`SP.TARGETS`). */
export type CompiledLanguage = "javascript" | "typescript" | "python"

/** The two sides `SpellCodeMirror.merge()` shows. */
export type MergeSides = {
  /** the published text, left */
  theirs: string
  /** your draft, right:  the result */
  mine: string
  /** your side's text after each change */
  onChange?: (mine: string) => void
}
