import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete"
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands"
import { javascript } from "@codemirror/lang-javascript"
import {
  HighlightStyle,
  codeFolding,
  foldGutter,
  foldKeymap,
  indentUnit,
  syntaxHighlighting
} from "@codemirror/language"
import { lintKeymap } from "@codemirror/lint"
import { MergeView } from "@codemirror/merge"
import { openSearchPanel, search, searchKeymap } from "@codemirror/search"
import { Compartment, EditorState, type Extension } from "@codemirror/state"
import {
  EditorView,
  drawSelection,
  dropCursor,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  type KeyBinding
} from "@codemirror/view"
import { tags } from "@lezer/highlight"

import type { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { CodeMirrorBubbly } from "./CodeMirrorBubbly"
import { CodeMirrorAddresses, CodeMirrorLanguage, type CodeMirrorLocation, offsetOf } from "./CodeMirrorLanguage"
import { CodeMirrorTexts } from "./CodeMirrorTexts"
import { CodeMirrorTyping } from "./CodeMirrorTyping"

import "spell/app/app/components/spell-code/bubbly.css"
import "./codemirror.css"

/****************
 * ### `SpellCodeMirror`
 * Spell in CodeMirror 6 (epic `editor` P30, the CodeMirror test):  ONE editor of a project's Spell file, drawn bubbly,
 * with the language service, find and replace, Spell's main typing helps and a right-click menu of the page's own.
 * - A TEST beside Monaco, which stays the editor:  only the test page reaches this folder.
 * - `SpellCodeMirror.edit()` makes an editor;  `code()` shows another language's code (the compiled javascript);
 *   `merge()` shows two sides of a file, each change takeable, as Publish's clash dialog does.
 * - Its words (find, folds, suggestions, problems, the merge view's) are the page's language's:  `speak()`,
 *   from `CodeMirrorTexts`.
 * - Its position in the import graph:  CodeMirror, the parser, the language service, `bubbly.css`.
 *   NEVER Monaco:  `SpellTyping`'s pure helpers only, whose file imports Monaco's types alone.
 * - NEVER saves anything:  edits go into the project file's text, and are parsed, but never written to disk.
 ****************/
export class SpellCodeMirror {
  /** The page's one language service for CodeMirror's editors, made on first use. */
  static get service(): LSP.SpellLanguageService {
    SpellCodeMirror.#service ??= new LSP.SpellLanguageService(new CodeMirrorAddresses())
    return SpellCodeMirror.#service
  }
  static #service: LSP.SpellLanguageService | undefined

  /** Every view made, so `speak()` reaches each. */
  private static readonly views = new Set<EditorView>()

  /** The language CodeMirror's own words are in. */
  private static lang = "en"

  /** Each view's phrases, swapped by `speak()`. */
  private static readonly phrases = new Compartment()

  /** CodeMirror's own words in `lang` from now on, in every editor on the page. */
  static speak(lang: string): void {
    SpellCodeMirror.lang = lang
    for (const view of SpellCodeMirror.views) {
      if (!view.dom.isConnected) {
        SpellCodeMirror.views.delete(view)
        continue
      }
      view.dispatch({ effects: SpellCodeMirror.phrases.reconfigure(SpellCodeMirror.phrasesNow()) })
    }
  }

  /** The phrases extension for the language now. */
  private static phrasesNow(): Extension {
    return EditorState.phrases.of(CodeMirrorTexts.phrasesFor(SpellCodeMirror.lang))
  }

  /**
   * An editor of `file`, in `parent`.
   * - `onOpen`:  show another place, e.g. a declaration in another file;  this file's are selected here
   * - `onContextMenu`:  a right click, at `x` and `y` on the page:  the page draws its own menu
   */
  static edit(parent: HTMLElement, options: SpellCodeMirrorOptions): SpellCodeMirror {
    return new SpellCodeMirror(parent, options)
  }

  /** The editor. */
  readonly view: EditorView

  /** Its language service, for this file. */
  readonly language: CodeMirrorLanguage

  private constructor(parent: HTMLElement, options: SpellCodeMirrorOptions) {
    const { file } = options
    this.language = new CodeMirrorLanguage(SpellCodeMirror.service, file)
    const lang = file.language.lang
    const keys: KeyBinding[] = [
      // ⌘F finds with its replace row showing:  CodeMirror's panel always has it
      { key: "Mod-f", run: openSearchPanel, preventDefault: true },
      { key: "F12", run: (view) => (void this.goToDefinition(view.state.selection.main.head), true) }
    ]
    this.view = new EditorView({
      parent,
      state: EditorState.create({
        doc: file.contents ?? "",
        extensions: [
          SpellCodeMirror.phrases.of(SpellCodeMirror.phrasesNow()),
          highlightSpecialChars(),
          history(),
          drawSelection(),
          dropCursor(),
          EditorState.allowMultipleSelections.of(true),
          indentUnit.of("\t"),
          EditorState.tabSize.of(4),
          closeBrackets(),
          codeFolding(),
          foldGutter(),
          search({ top: true }),
          autocompletion({ override: [this.language.completions], icons: false }),
          CodeMirrorTyping.extension(() => file, lang),
          keymap.of([
            ...keys,
            ...closeBracketsKeymap,
            ...searchKeymap,
            ...historyKeymap,
            ...foldKeymap,
            ...completionKeymap,
            ...lintKeymap,
            indentWithTab,
            ...defaultKeymap
          ]),
          this.language.extensions(),
          CodeMirrorBubbly.extension(() => file),
          EditorView.domEventHandlers({
            contextmenu: (event, view) => {
              const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
              // a click outside the selection moves the caret there first, as Monaco does
              if (pos !== null && !view.state.selection.ranges.some((range) => range.from <= pos && pos <= range.to))
                view.dispatch({ selection: { anchor: pos } })
              event.preventDefault()
              options.onContextMenu?.(this, { x: event.clientX, y: event.clientY })
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
      })
    })
    this.onOpen = options.onOpen
    SpellCodeMirror.views.add(this.view)
    rootOnceConnected(parent, [this.view])
  }

  /** Show another place:  the test page's. */
  private readonly onOpen: SpellCodeMirrorOptions["onOpen"]

  /** Go to where the thing at `pos` is declared:  here, selected;  in another file, through `onOpen`. */
  async goToDefinition(pos: number): Promise<boolean> {
    const location = await this.language.definitionAt(this.view, pos)
    if (!location) return false
    if (location.path === this.language.file.path) {
      this.select(location)
      return true
    }
    return this.onOpen?.(location) ?? false
  }

  /** Select `location`'s range, in this file, and show it. */
  select(location: CodeMirrorLocation): void {
    const { doc } = this.view.state
    const anchor = offsetOf(doc, location.range.start)
    const head = offsetOf(doc, location.range.end)
    this.view.dispatch({ selection: { anchor, head }, scrollIntoView: true })
    this.view.focus()
  }

  /** Let go of the editor. */
  destroy(): void {
    SpellCodeMirror.views.delete(this.view)
    this.view.destroy()
  }

  ////////////////
  // ## Other views
  ////////////////

  /** Another language's code, read only, in `parent`:  the compiled javascript, coloured by the page's code colours. */
  static code(parent: HTMLElement, text: string): EditorView {
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: text,
        extensions: [
          SpellCodeMirror.phrases.of(SpellCodeMirror.phrasesNow()),
          EditorState.readOnly.of(true),
          lineNumbers(),
          codeFolding(),
          foldGutter(),
          drawSelection(),
          search({ top: true }),
          keymap.of([{ key: "Mod-f", run: openSearchPanel, preventDefault: true }, ...searchKeymap, ...foldKeymap]),
          javascript(),
          syntaxHighlighting(PAGE_CODE_COLOURS),
          EditorView.editorAttributes.of({ class: "cmb-code" })
        ]
      })
    })
    SpellCodeMirror.views.add(view)
    rootOnceConnected(parent, [view])
    return view
  }

  /**
   * Two sides of a file in `parent`:  `theirs` left, read only, `mine` right, editable;  each change takeable by its
   * arrow, from theirs into yours (⌘Z puts yours back), both drawn bubbly.
   * - `onChange`:  your side's whole text after each change
   */
  static merge(parent: HTMLElement, sides: MergeSides): MergeView {
    const shared = [
      SpellCodeMirror.phrases.of(SpellCodeMirror.phrasesNow()),
      drawSelection(),
      indentUnit.of("\t"),
      CodeMirrorBubbly.extension(() => undefined)
    ]
    const merge = new MergeView({
      parent,
      a: { doc: sides.theirs, extensions: [...shared, EditorState.readOnly.of(true)] },
      b: {
        doc: sides.mine,
        extensions: [
          ...shared,
          history(),
          keymap.of([...historyKeymap, ...defaultKeymap]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) sides.onChange?.(update.state.doc.toString())
          })
        ]
      },
      revertControls: "a-to-b",
      highlightChanges: true,
      gutter: true,
      collapseUnchanged: { margin: 3, minSize: 6 }
    })
    SpellCodeMirror.views.add(merge.a)
    SpellCodeMirror.views.add(merge.b)
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
  /** the project file it edits:  its text, parse and language */
  file: SP.SpellFile
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
