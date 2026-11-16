import { javascript } from "@codemirror/lang-javascript"
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { MergeView } from "@codemirror/merge"
import type { Extension } from "@codemirror/state"
import { EditorView, keymap } from "@codemirror/view"
import { tags } from "@lezer/highlight"

import type { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { CodeMirrorBubbly } from "./CodeMirrorBubbly"
import type { CodeMirrorLanguage } from "./CodeMirrorLanguage"
import { CodeMirrorSetup } from "./CodeMirrorSetup"
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
 * - Still a TEST beside Monaco, which stays the app's editor until the swap (epic `codemirror` Q4):
 *   only the test page reaches this folder.
 * - Its position in the import graph:  CodeMirror, the parser, the language service, `bubbly.css`.
 *   NEVER Monaco:  the typing helps' rules and the files' addresses are the language service's
 *   (`LSP.SpellTyping`, `LSP.AppAddresses`), shared with Monaco.
 ****************/
export class SpellCodeMirror {
  /** The page's one language service for CodeMirror's editors, made on first use. */
  static get service(): LSP.SpellLanguageService {
    SpellCodeMirror._service ??= new LSP.SpellLanguageService(new LSP.AppAddresses())
    return SpellCodeMirror._service
  }
  private static _service: LSP.SpellLanguageService | undefined

  /**
   * The page's one set of file states, every CodeMirror editor's, made on first use:  see `FileStates`.
   * - STATIC:  every editor of the page's files shows these, so each file's text is kept once.
   * - Set its `onEdit` to hear each edit, e.g. to save soon.
   */
  static get states(): FileStates {
    SpellCodeMirror._states ??= new FileStates({ service: SpellCodeMirror.service })
    return SpellCodeMirror._states
  }
  private static _states: FileStates | undefined

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
  }

  /** Go to where the thing at `pos` is declared:  here, selected;  in another file, through `onOpen`. */
  async goToDefinition(pos: number): Promise<boolean> {
    const location = await this.language?.definitionAt(this.view, pos)
    if (!location) return false
    if (location.path === this.file.path) {
      this.select(location)
      return true
    }
    return this.options.onOpen?.(location) ?? false
  }

  /** Select `location`'s range, in this file, and show it. */
  select(location: CodeMirrorLocation): void {
    const { from, to } = LspToCodeMirror.range(this.view.state.doc, location.range)
    this.view.dispatch({ selection: { anchor: from, head: to }, scrollIntoView: true })
    this.view.focus()
  }

  /** What this editor adds to the state it shows:  F12 and ⌘-click go to the definition, a right click its menu. */
  private host(): Extension {
    return [
      keymap.of([{ key: "F12", run: (view) => (void this.goToDefinition(view.state.selection.main.head), true) }]),
      EditorView.domEventHandlers({
        contextmenu: (event, view) => {
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
          // a click outside the selection moves the caret there first, as Monaco does
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

  ////////////////
  // ## Other views
  ////////////////

  /**
   * What a view of another language's code takes, read only:  the compiled javascript, coloured by the page's code
   * colours, its lines numbered.
   */
  static codeExtensions(): Extension {
    return [
      javascript(),
      syntaxHighlighting(PAGE_CODE_COLOURS),
      EditorView.editorAttributes.of({ class: "cmb-code" }),
      CodeMirrorSetup.extensions({ editable: false, lineNumbers: true })
    ]
  }

  /**
   * Two sides of a file in `parent`:  `theirs` left, read only, `mine` right, editable;  each change takeable by its
   * arrow, from theirs into yours (⌘Z puts yours back), both drawn bubbly.
   * - `onChange`:  your side's whole text after each change
   */
  static merge(parent: HTMLElement, sides: MergeSides): MergeView {
    const bubbly = CodeMirrorBubbly.extension(() => undefined)
    const merge = new MergeView({
      parent,
      a: { doc: sides.theirs, extensions: [bubbly, CodeMirrorSetup.extensions({ editable: false })] },
      b: {
        doc: sides.mine,
        extensions: [
          bubbly,
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
}

/** The two sides `SpellCodeMirror.merge()` shows. */
export type MergeSides = {
  /** the published text, left */
  theirs: string
  /** your draft, right:  the result */
  mine: string
  /** your side's text after each change */
  onChange?: (mine: string) => void
}

/** Another language's code in the page's code colours, Spell UI's `--ui-code-<role>` tokens, light or dark as it is. */
const PAGE_CODE_COLOURS = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.moduleKeyword], color: "var(--ui-code-keyword, #a626a4)" },
  { tag: [tags.string, tags.special(tags.string)], color: "var(--ui-code-string, #50a14f)" },
  { tag: [tags.number, tags.bool, tags.null], color: "var(--ui-code-constant, #986801)" },
  {
    tag: [tags.comment, tags.lineComment, tags.blockComment],
    color: "var(--ui-code-comment, #a0a1a7)",
    fontStyle: "italic"
  },
  { tag: [tags.className, tags.typeName], color: "var(--ui-code-type, #c18401)" },
  {
    tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
    color: "var(--ui-code-action, #4078f2)"
  },
  { tag: [tags.propertyName], color: "var(--ui-code-member, #e45649)" },
  { tag: [tags.definition(tags.variableName)], color: "var(--ui-code-name, #383a42)" },
  { tag: [tags.punctuation, tags.bracket], color: "var(--ui-code-punctuation, #8a8f99)" },
  { tag: [tags.tagName], color: "var(--ui-code-tag, #e45649)" },
  { tag: [tags.attributeName], color: "var(--ui-code-attr, #986801)" }
])
