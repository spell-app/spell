import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands"
import { codeFolding, foldable, foldGutter, foldKeymap, indentUnit } from "@codemirror/language"
import { lintKeymap } from "@codemirror/lint"
import { openSearchPanel, searchKeymap } from "@codemirror/search"
import {
  Compartment,
  EditorSelection,
  EditorState,
  type Extension,
  type SelectionRange,
  StateEffect
} from "@codemirror/state"
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
import { CodeMirrorFind } from "./CodeMirrorFind"
import { CodeMirrorFollowed } from "./CodeMirrorFollowed"

/****************
 * ### `CodeMirrorSetup`
 * What EVERY CodeMirror editor starts with:
 * the keys, undo, find, the gutter, and CodeMirror's own words in the app's language.
 * - `CodeMirrorSetup.extensions()` is the set;  each editor adds its own on top:
 *   a project file's (`FileStates`), the compiled code's, the merge view's (`SpellCodeMirror`).
 *   - "On top" means BEFORE these in the list:  CodeMirror gives an earlier extension's keys the first go,
 *     so a file's own Enter wins over the plain one here.
 * - Find and replace is the find bar, `CodeMirrorFind`, on CodeMirror's own search.
 * - The gutter:  no line numbers until asked (`showLineNumbers()`), fold arrows over the code's padding,
 *   shown while the mouse is on the edge, a folded block's always.
 *   No change bar (epic `codemirror` Q1).
 * - CodeMirror's words are the app's texts, `AppTexts` keys (`cm...`;  epic `codemirror` Q3):
 *   - CodeMirror asks for each by its English, through one table (`EditorState.phrases`)
 *   - `PHRASE_KEYS` turns that English into our keys
 *   - the editors follow `appTexts.lang`:  each one's words change when the app's do, a Spanish page's included
 * - Selected text never drags:  a press inside the selection starts a new one, as VS Code's
 *   `editor.dragAndDrop: false` (`PRESS_STARTS_SELECTION`, epic `codemirror` I9).
 * - A quadruple click selects the block its line is in, the one its fold arrow folds;
 *   each click after that, the block around it (`CLICKS_SELECT_BLOCKS`, epic `codemirror` T15).
 * - A Go to … jump shows the whole block it lands in, its head a row below the top (`revealBlock()`,
 *   epic `codemirror` I11).
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
      // a press inside the selection starts a new one:  selections don't drag (epic `codemirror` I9)
      PRESS_STARTS_SELECTION,
      // four clicks select a block, five the block around it ... (epic `codemirror` T15)
      CLICKS_SELECT_BLOCKS,
      // a Go to … jump shows its whole block (epic `codemirror` I11)
      REVEALS_BLOCKS,
      EditorState.allowMultipleSelections.of(true),
      indentUnit.of("\t"),
      // a tab 2 spaces wide, as Monaco drew it:  each level of a body 8px further in, not 17px (epic `language` I113)
      EditorState.tabSize.of(TAB_SIZE),
      // the find bar (⌘F), VS Code's look and keys
      CodeMirrorFind.extension(),
      CodeMirrorSetup.gutter({ lineNumbers }),
      keymap.of([
        // ⌘F finds, ⌥⌘F replaces;  the find bar's switches, ⌥⌘C, ⌥⌘W, ⌥⌘R
        { key: "Mod-f", run: openSearchPanel, preventDefault: true },
        ...CodeMirrorFind.keys(),
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
  // ## Showing a block
  ////////////////

  /**
   * The scroll that shows the whole block at `pos`, for a Go to … jump (epic `codemirror` I11):
   * dispatched with the selection it lands on.
   * - The block is the one four clicks select there (`CLICKS_SELECT_BLOCKS`):  what its head line's fold arrow folds,
   *   or the innermost block `pos` is in;  a line in no block is its line alone.
   * - Its head lands at least one row below the pane's top, so the line above shows;  at the file's start, at the top.
   * - Scrolled as little as that takes:  a block already wholly in view, with its row above, doesn't move.
   * - Taller than the pane:  its head one row below the top.
   * - Worked out as CodeMirror scrolls, after the file's lines are drawn and measured (`REVEALS_BLOCKS`):
   *   so a jump into another file shows right too, the bubbly look's heights and all.
   */
  static revealBlock(state: EditorState, pos: number): StateEffect<unknown> {
    const { doc } = state
    const block = blockAround(state, pos, 0)
    const head = doc.lineAt(block?.from ?? pos)
    const last = block ? doc.lineAt(block.to === doc.length ? block.to : block.to - 1) : head
    // its head the range's head:  CodeMirror draws the lines around a scroll's head first
    const range = EditorSelection.range(last.to, head.from)
    BLOCK_REVEALS.add(range)
    return EditorView.scrollIntoView(range)
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
   * - A folded block's hidden lines are a quiet `…` after its head, no box (`foldedMore()`):
   *   in the bubbly look, inside its band's right end (`bubbly.css`;  epic `language` I116).
   */
  static gutter({ lineNumbers: isNumbered = false }: Pick<CodeMirrorSetupOptions, "lineNumbers">): Extension {
    return [
      CodeMirrorSetup.lineNumbers.of(isNumbered ? lineNumbers() : []),
      foldGutter({
        markerDOM: foldArrow,
        foldingChanged: (update) => wasParsed(update)
      }),
      codeFolding({ placeholderDOM: foldedMore })
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

/**
 * A press inside the selection starts a new selection there, as a press outside it does:
 * selected text never drags to move (or, with ⌥, copy) it.
 * - CodeMirror has no setting for it:  a plain press inside the main selection always waits to see if it's a drag
 *   (`MouseSelection.dragging`), and lets the browser drag the text.
 * - So the press first puts the caret where it landed, then CodeMirror's own press handling runs, with no selection
 *   to drag:  a drag from there selects, a click leaves the caret there, a double-click picks the word.
 *   - NOT blocking `dragstart`:  CodeMirror would still wait 10px before selecting, and select nothing on a short drag.
 * - Left alone:  ⇧ (extend the selection), ⌘ (add or drop a cursor), and text dragged in from outside, which still drops.
 */
const PRESS_STARTS_SELECTION = EditorView.domEventHandlers({
  mousedown(event, view) {
    if (event.button !== 0 || event.detail > 1 || event.shiftKey || event.metaKey || event.ctrlKey) return false
    const { main } = view.state.selection
    if (main.empty) return false
    const pressed = view.posAtCoords({ x: event.clientX, y: event.clientY })
    if (pressed === null || pressed < main.from || pressed > main.to) return false
    view.dispatch({ selection: { anchor: pressed }, userEvent: "select.pointer" })
    // CodeMirror's own handler runs next
    return false
  }
})

/**
 * A quadruple click selects the whole block the clicked line is in:  its head line and every line of its body,
 * a tag's closing line too.
 * - One click puts the caret, two pick the word, three the line (CodeMirror's own);  four the block.
 *   - On a head line (`to draw solitaire`, `a "card" is a view`, `<content>`), the block it opens.
 *   - On a line of a body, the innermost block it's in.
 *   - Each click after the fourth, the block around that one, up to the outermost.
 *   - On a line in no block, the line, as three clicks select it.
 * - A block is what folds, from the head line whose fold arrow folds it (`foldable()`):
 *   Spell's from the language service (`CodeMirrorLanguage.folding()`), another language's from its own syntax.
 * - The block as picked on the press:  dragging after it doesn't grow it.
 * - Left to CodeMirror:  ⇧ (extend the selection), ⌘ (add a cursor).
 * - The press lands inside the line three clicks selected:  `PRESS_STARTS_SELECTION` lets it be, as it's no single press.
 */
const CLICKS_SELECT_BLOCKS = EditorView.mouseSelectionStyle.of((view, event) => {
  if (event.button !== 0 || event.detail < 4 || event.shiftKey || event.metaKey || event.ctrlKey) return null
  const pressed = view.posAtCoords({ x: event.clientX, y: event.clientY })
  if (pressed === null) return null
  const block = blockAround(view.state, pressed, event.detail - 4)
  if (!block) return null
  return {
    get: () => EditorSelection.create([EditorSelection.range(block.from, block.to)]),
    update: () => {}
  }
})

/**
 * The block around `pos`, from its head line's start through its last line's newline, as three clicks take a line;
 * `outward`:  how many blocks further out (0, the innermost);  past the outermost, the outermost.
 * - `undefined` where `pos` is in no block.
 */
function blockAround(state: EditorState, pos: number, outward: number): { from: number; to: number } | undefined {
  const { doc } = state
  const pressedLine = doc.lineAt(pos)
  let found: { from: number; to: number } | undefined
  let outer = 0
  // up from the pressed line, each head whose block reaches down to it
  for (let number = pressedLine.number; number >= 1; number--) {
    const head = doc.line(number)
    const fold = foldable(state, head.from, head.to)
    // the whole of its last line:  a syntax's fold may stop before a closing `}`
    const last = fold && doc.lineAt(fold.to)
    if (!last || last.number < pressedLine.number) continue
    const to = last.to < doc.length ? last.to + 1 : last.to
    found = { from: head.from, to }
    if (outer++ === outward) break
  }
  return found
}

/** The scroll targets `CodeMirrorSetup.revealBlock()` made:  `REVEALS_BLOCKS` scrolls these its own way. */
const BLOCK_REVEALS = new WeakSet<SelectionRange>()

/**
 * Scrolls a block `CodeMirrorSetup.revealBlock()` asked for into view, as CodeMirror is about to scroll to it:
 * its lines drawn and measured by then.
 * - Any other scroll is CodeMirror's own.
 * - Its row above:  the line before its head, however tall it's drawn:  a tall bubbly line, or a short blank one.
 * - Sideways, all the way left:  the head line's start.
 * - NEVER asks CodeMirror for coordinates (`coordsAtPos()`):  it runs inside CodeMirror's update, where they throw.
 * - A view whose words change before it scrolls is laid out afresh, and the scroll is lost:
 *   `SpellCodeMirror.show()` puts a file's words right at once, so a jump into another file isn't.
 */
const REVEALS_BLOCKS = EditorView.scrollHandler.of((view, range) => {
  if (!BLOCK_REVEALS.has(range)) return false
  const scroller = view.scrollDOM
  const shown = scroller.getBoundingClientRect()
  // a line block's top, in the scroller's scrolled coordinates
  const offset = view.documentTop - shown.top + scroller.scrollTop
  const bottom = offset + view.lineBlockAt(range.anchor).bottom
  // the highest the pane's top may be:  the row above's top, or the very top at the file's start
  const ceiling = range.head > 0 ? offset + view.lineBlockAt(range.head - 1).top : 0
  const current = scroller.scrollTop
  const pane = scroller.clientHeight
  let target = current
  if (ceiling < current) target = ceiling
  else if (bottom > current + pane) target = Math.min(bottom - pane, ceiling)
  scroller.scrollTop = Math.max(0, target)
  // its head is a line's start:  in view only scrolled all the way left
  scroller.scrollLeft = 0
  return true
})

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

/**
 * A folded block's hidden lines:  a quiet `…`, which unfolds them when clicked.
 * - In place of CodeMirror's grey box;  the bubbly look draws it inside its band's right end (`cmb-fold-more`).
 */
function foldedMore(_view: EditorView, onclick: (event: Event) => void): HTMLElement {
  const more = document.createElement("span")
  more.className = "cmb-fold-more"
  more.textContent = "…"
  more.title = appTexts.text("cmUnfold")
  more.setAttribute("aria-label", appTexts.text("cmFoldedCode"))
  more.onclick = onclick
  return more
}

/** The fold arrow's chevron, pointing down;  `codemirror.css` turns a folded block's to the right. */
const CHEVRON =
  '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4.5 6 8 9.5 11.5 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'

/**
 * Each of CodeMirror's words, by its English, to the app's text for it:  every phrase CodeMirror's packages ask for
 * (`state.phrase(...)`), as of `@codemirror/*` 6.x;  and the find bar's (`CodeMirrorFind`).
 * - `$` (or `$1`, `$2`) is what the asker fills in:  a number, a key.
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
  // the find bar's own (`CodeMirrorFind`):  `$` its key
  "Match Case ($)": "cmFindMatchCase",
  "Match Whole Word ($)": "cmFindWholeWord",
  "Use Regular Expression ($)": "cmFindRegexp",
  "Previous Match ($)": "cmFindPrevious",
  "Next Match ($)": "cmFindNext",
  "Close ($)": "cmFindClose",
  "Toggle Replace": "cmFindToggleReplace",
  "Replace ($)": "cmFindReplace",
  "Replace All ($)": "cmFindReplaceAll",
  "No results": "cmFindNoResults",
  "$1 of $2": "cmFindCount",
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
