import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands"
import { foldGutter, foldKeymap, indentUnit } from "@codemirror/language"
import { lintKeymap } from "@codemirror/lint"
import { openSearchPanel, search, searchKeymap } from "@codemirror/search"
import { Compartment, EditorState, type Extension, StateEffect } from "@codemirror/state"
import {
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  drawSelection,
  dropCursor,
  highlightSpecialChars,
  keymap,
  lineNumbers
} from "@codemirror/view"

import { observe } from "spell/util"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"
import { CodeMirrorFollowed } from "./CodeMirrorFollowed"

/****************
 * ### `CodeMirrorSetup`
 * What EVERY CodeMirror editor starts with:
 * the keys, undo, find, the gutter, and CodeMirror's own words in the app's language.
 * - `CodeMirrorSetup.extensions()` is the set;  each editor adds its own on top:
 *   a project file's (`FileStates`), the compiled code's, the merge view's (`SpellCodeMirror`).
 *   - "On top" means BEFORE these in the list:  CodeMirror gives an earlier extension's keys the first go,
 *     so a file's own Enter wins over the plain one here.
 * - The gutter:  no line numbers until asked (`showLineNumbers()`), fold arrows over the code's padding,
 *   shown while the mouse is on the edge, a folded block's always.
 *   No change bar (epic `codemirror` Q1).
 * - CodeMirror's words are the app's texts, `AppTexts` keys (`cm...`;  epic `codemirror` Q3):
 *   - CodeMirror asks for each by its English, through one table (`EditorState.phrases`)
 *   - `PHRASE_KEYS` turns that English into our keys
 *   - the editors follow `appTexts.lang`:  each one's words change when the app's do, a Spanish page's included
 * - Its position in the import graph:  CodeMirror and the app's texts;  never a file or the parser.
 ****************/
export class CodeMirrorSetup {
  /** The extensions every editor takes, as `options` say. */
  static extensions({ editable = true, lineNumbers = false }: CodeMirrorSetupOptions = {}): Extension {
    CodeMirrorSetup.followLanguage()
    return [
      CodeMirrorSetup.phrases.of(CodeMirrorSetup.phrasesNow()),
      SPEAKS_NOW,
      editable ? history() : EditorState.readOnly.of(true),
      highlightSpecialChars(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentUnit.of("\t"),
      // a tab 2 spaces wide, as Monaco drew it:  each level of a body 8px further in, not 17px (epic `language` I113)
      EditorState.tabSize.of(TAB_SIZE),
      search({ top: true }),
      CodeMirrorSetup.gutter({ lineNumbers }),
      keymap.of([
        // ⌘F finds with its replace row showing:  CodeMirror's panel always has it
        { key: "Mod-f", run: openSearchPanel, preventDefault: true },
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...lintKeymap,
        ...(editable ? [indentWithTab] : []),
        ...defaultKeymap
      ]),
      EditorView.editorAttributes.of({ class: EDITOR_CLASS }),
      // room for the place in focus's mark (`<FollowAlong>`)
      CodeMirrorFollowed.extension()
    ]
  }

  ////////////////
  // ## The gutter
  ////////////////

  /**
   * The gutter:  line numbers when asked, then the fold arrows.
   * - The fold column is 16px, pulled 8px over the code's padding, each arrow 4px toward the code (`codemirror.css`;
   *   epic `editor` I154).
   *   - With the bubbly look, 12px wholly over the room before a line's band, so every band is 12px in (I187).
   * - A press on an arrow folds or unfolds its block, and never moves the caret:  the gutter is outside the text.
   * - The arrows follow each new parse (`PARSED`), as the blocks that fold are the parse's.
   */
  static gutter({ lineNumbers: isNumbered = false }: Pick<CodeMirrorSetupOptions, "lineNumbers">): Extension {
    return [
      CodeMirrorSetup.lineNumbers.of(isNumbered ? lineNumbers() : []),
      foldGutter({
        markerDOM: foldArrow,
        foldingChanged: (update) => wasParsed(update)
      })
    ]
  }

  /** Line numbers in `view` or not, as View › Line Numbers says:  none at first. */
  static showLineNumbers(view: EditorView, show: boolean): void {
    view.dispatch({ effects: CodeMirrorSetup.lineNumbers.reconfigure(show ? lineNumbers() : []) })
  }

  /**
   * `text`'s width in `element`'s font, as the browser lays it out, in px;  a tab `tabSize` spaces, as CodeMirror's is.
   * - A hidden probe in the scroller, beside the text, never in it:  CodeMirror reads any change to its content as an edit.
   * - A tab's measured, not worked out from a space:  the browser rounds a tab stop (8.44px, 2 spaces of 4.22px).
   * - SIDE EFFECT:  lays the page out, if it's due;  call it where reading layout is fine.
   */
  static widthIn(element: HTMLElement, text: string, tabSize = TAB_SIZE): number {
    const probe = document.createElement("span")
    probe.style.cssText = `position: absolute; visibility: hidden; white-space: pre; tab-size: ${tabSize}`
    probe.textContent = text
    element.append(probe)
    const width = probe.getBoundingClientRect().width
    probe.remove()
    return width
  }

  /**
   * Sent with a file's new parse, so whatever reads the parse looks again:  the fold arrows, the bubbly look.
   * - STATIC:  one effect for every editor on the page, so each extension can ask for it.
   */
  static readonly PARSED = StateEffect.define<null>()

  /** Each editor's line numbers, on or off -- see `showLineNumbers()`. */
  private static readonly lineNumbers = new Compartment()

  ////////////////
  // ## CodeMirror's words
  ////////////////

  /** Each editor's words, swapped when the app's language changes. */
  private static readonly phrases = new Compartment()

  /** The words extension for the app's language now:  ONE object, until the language changes. */
  private static phrasesNow(): Extension {
    CodeMirrorSetup.spoken ??= CodeMirrorSetup.phrasesFor()
    return CodeMirrorSetup.spoken
  }

  /** The last words extension made:  each view's compartment holds this one while it's up to date. */
  private static spoken: Extension | undefined

  /** CodeMirror's English to the app's texts, in the app's language now. */
  private static phrasesFor(): Extension {
    const table: Record<string, string> = {}
    for (const [english, key] of Object.entries(PHRASE_KEYS)) table[english] = appTexts.text(key)
    return EditorState.phrases.of(table)
  }

  /**
   * Follow `appTexts.lang` from now on:  when it changes, every editor's words do.
   * - Once per page;  never stopped.
   * - NEVER touches an editor inside the reaction:  a dispatch reads spell state, which it would follow too.
   */
  private static followLanguage(): void {
    if (CodeMirrorSetup.isFollowing) return
    CodeMirrorSetup.isFollowing = true
    observe(() => {
      const spoken = CodeMirrorSetup.phrasesFor()
      queueMicrotask(() => {
        CodeMirrorSetup.spoken = spoken
        for (const view of CodeMirrorSetup.views) CodeMirrorSetup.speakNow(view)
      })
    })
  }

  /** Whether `followLanguage()` has started. */
  private static isFollowing = false

  /**
   * Every editor on the page, while it's drawn, so `followLanguage()` reaches each.
   * - Filled by `SPEAKS_NOW`, a plugin every editor has:  nothing to register by hand.
   */
  static readonly views = new Set<EditorView>()

  /** Speak the app's language now in `view`, if its words are another's:  e.g. a file's state shown again. */
  static speakNow(view: EditorView): void {
    const spoken = CodeMirrorSetup.phrasesNow()
    if (CodeMirrorSetup.phrases.get(view.state) !== spoken) {
      view.dispatch({ effects: CodeMirrorSetup.phrases.reconfigure(spoken) })
    }
  }
}

/** What an editor's setup is to be. */
export type CodeMirrorSetupOptions = {
  /** `false` for one that shows code only, e.g. the compiled javascript:  no undo, nothing typed.  Default:  `true`. */
  editable?: boolean
  /** its lines numbered from the start, as the compiled code's are.  Default:  `false`. */
  lineNumbers?: boolean
}

/**
 * Each editor's place in `CodeMirrorSetup.views`, while it's drawn.
 * - A state shown again (`setState()`) may be in another language:  it's put right after the update, as a dispatch
 *   inside one isn't allowed.
 */
const SPEAKS_NOW = ViewPlugin.fromClass(
  class {
    constructor(readonly view: EditorView) {
      CodeMirrorSetup.views.add(view)
      queueMicrotask(() => {
        if (CodeMirrorSetup.views.has(view)) CodeMirrorSetup.speakNow(view)
      })
    }

    destroy() {
      CodeMirrorSetup.views.delete(this.view)
    }
  }
)

/** The class every CodeMirror editor has, for `codemirror.css`:  its gutter, whatever else it draws. */
const EDITOR_CLASS = "cmb"

/** How many spaces wide a tab is:  2, as Monaco's was (epic `language` I113);  `codemirror.css`'s `tab-size` too. */
const TAB_SIZE = 2

/** Whether `update` brought a new parse:  `CodeMirrorSetup.PARSED`. */
function wasParsed(update: ViewUpdate): boolean {
  return update.transactions.some((transaction) =>
    transaction.effects.some((effect) => effect.is(CodeMirrorSetup.PARSED))
  )
}

/**
 * A fold arrow:  pointing down while its block is open, right while it's folded.
 * - Its own chevron:  the font's `⌄` / `›` sit at different heights.
 * - No title:  the words CodeMirror would give it need the editor.
 */
function foldArrow(isOpen: boolean): HTMLElement {
  const arrow = document.createElement("span")
  arrow.className = isOpen ? "cmb-fold cmb-fold-open" : "cmb-fold cmb-fold-folded"
  arrow.innerHTML = CHEVRON
  return arrow
}

/** The fold arrow's chevron, pointing down;  `codemirror.css` turns a folded block's to the right. */
const CHEVRON =
  '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4.5 6 8 9.5 11.5 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'

/**
 * Each of CodeMirror's words, by its English, to the app's text for it:  every phrase CodeMirror's packages ask for
 * (`state.phrase(...)`), as of `@codemirror/*` 6.x.  `$` is a number CodeMirror fills in.
 * - Find and replace, go to line (`@codemirror/search`);  folds (`@codemirror/language`);
 *   suggestions (`@codemirror/autocomplete`);  problems (`@codemirror/lint`);  the merge view (`@codemirror/merge`);
 *   the editor's own (`@codemirror/view`).
 * - A word CodeMirror adds after an upgrade shows in English until it's here.
 */
const PHRASE_KEYS: Record<string, AppTextKey> = {
  // find and replace
  Find: "cmFind",
  Replace: "cmReplace",
  next: "cmNext",
  previous: "cmPrevious",
  all: "cmAll",
  "match case": "cmMatchCase",
  regexp: "cmRegexp",
  "by word": "cmByWord",
  replace: "cmReplaceOne",
  "replace all": "cmReplaceAll",
  close: "cmClose",
  "current match": "cmCurrentMatch",
  "on line": "cmOnLine",
  "replaced match on line $": "cmReplacedMatchOnLine",
  "replaced $ matches": "cmReplacedMatches",
  "Go to line": "cmGoToLine",
  go: "cmGo",
  // folds
  "Folded lines": "cmFoldedLines",
  "Unfolded lines": "cmUnfoldedLines",
  "Fold line": "cmFoldLine",
  "Unfold line": "cmUnfoldLine",
  "folded code": "cmFoldedCode",
  unfold: "cmUnfold",
  to: "cmTo",
  // suggestions and problems
  Completions: "cmCompletions",
  Diagnostics: "cmDiagnostics",
  "No diagnostics": "cmNoDiagnostics",
  // the merge view
  "Revert this chunk": "cmRevertChunk",
  Accept: "cmAccept",
  Reject: "cmReject",
  "$ unchanged lines": "cmUnchangedLines",
  // the editor's own
  "Control character": "cmControlCharacter",
  "Selection deleted": "cmSelectionDeleted"
}
