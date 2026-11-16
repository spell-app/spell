import { completionStatus } from "@codemirror/autocomplete"
import { isolateHistory, moveLineDown } from "@codemirror/commands"
import { type EditorState, type Extension, Facet, Prec } from "@codemirror/state"
import { EditorView, keymap, ViewPlugin, type ViewUpdate } from "@codemirror/view"

import type { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { ValuePopups, type CaretValue, type ValuePopupHost } from "spell/app/app/ui/ValuePopups"

/****************
 * ### `CodeMirrorValues`
 * An attribute's value chosen rather than typed, in a CodeMirror editor, as Monaco's `ValueChoices` and `ValuePicker`
 * give it (epic `editor` T61, T70;  epic `codemirror` P5).
 * - The choices strip:  an attribute's words, quietly under its value once the caret has rested in it for a second,
 *   the value ticked (`extension()`).
 *   - Only with one caret and nothing selected, the editor holding the keys, and CodeMirror's suggestion list
 *     not up;  typing, moving the caret, a scroll or the editor losing the keys hides it.
 *   - ⌥↓ shows it at once and moves the keys into it, ahead of CodeMirror's own ⌥↓ (move the line down),
 *     which still runs where the caret's value has no words.
 * - The picker:  the palette or the icon picker at the caret (`pick()`), opened by the words list's
 *   "Pick a color…" row.
 * - Choosing either way writes the word between the quotes as ONE undo step of its own, the caret after
 *   the closing quote.
 * - What both popups show and how their keys work is the editor-neutral `ValuePopups`, Monaco's too:
 *   this class is only CodeMirror's wiring onto it, one per view showing a Spell file's state.
 * - Its position in the import graph:  CodeMirror, the language service's types, the app's `ValuePopups`;
 *   never Monaco.
 ****************/
export class CodeMirrorValues {
  /**
   * The choices strip, for a Spell file's state.
   * - `valuesAt`:  the words the attribute whose quoted value is at `pos` takes, as the suggestion list's
   *   (`CodeMirrorLanguage.attributeValuesAt`)
   */
  static extension(valuesAt: ValuesAt): Extension {
    return [
      VALUES_AT.of(valuesAt),
      PLUGIN,
      // ahead of the base setup's keys:  its ⌥↓ moves the line down
      Prec.high(keymap.of([{ key: "Alt-ArrowDown", run: (view) => CodeMirrorValues.stepIn(view) }]))
    ]
  }

  /**
   * Open the picker `picker` says at `view`'s caret, for the quoted value it's in
   * (its closing quote not typed yet is fine:  the value runs to the caret).
   * - `values`:  the attribute's words, as the file's language writes them (a palette's, each `picker.colors`' colour).
   * - Works on any view;  one with the choices strip (`extension()`) also closes it on an edit or a scroll.
   * - NEVER throws:  no quoted value at the caret, nothing opens.
   */
  static pick(view: EditorView, picker: SP.ComponentValuePicker, values: readonly string[]): void {
    try {
      ValuePopups.pick(view.plugin(PLUGIN)?.host ?? hostFor(view, new Set()), picker, values)
    } catch (error) {
      console.error("CodeMirrorValues.pick():  the picker didn't open", error)
    }
  }

  /** ⌥↓:  the strip's, when it steps in;  CodeMirror's own when the value has no words after all. */
  private static stepIn(view: EditorView): boolean {
    const stepped = view.plugin(PLUGIN)?.popups.stepIn() ?? false
    if (!(stepped instanceof Promise)) return stepped
    // the words come later:  the key is taken now, and given back if there are none
    void stepped.then((isIn) => isIn || moveLineDown(view))
    return true
  }

  constructor(private readonly view: EditorView) {
    this.host = hostFor(view, this.followers)
    this.popups = new ValuePopups(this.host)
    view.scrollDOM.addEventListener("scroll", this.scrolled, { passive: true })
    // made again whenever the view takes a whole new state (another file, CodeMirror's words in another language):
    // a caret already resting in a value shows its words all the same
    this.popups.restart()
  }

  /** What the popups need of this view. */
  readonly host: ValuePopupHost
  /** The strip, through the editor-neutral popups. */
  readonly popups: ValuePopups
  /** Who follows this view's edits and scrolls:  the picker, while it's up. */
  private readonly followers = new Set<(change: "edit" | "scroll") => void>()

  /** The view changed:  an edit or a move restarts the strip's wait;  losing the keys hides it;  the picker hears of an edit. */
  update(update: ViewUpdate): void {
    if (update.docChanged) for (const follower of [...this.followers]) follower("edit")
    if (update.docChanged || update.selectionSet) this.popups.restart()
    if (update.focusChanged && !update.view.hasFocus) this.popups.blurred()
  }

  /** The view is going:  its popups with it. */
  destroy(): void {
    this.view.scrollDOM.removeEventListener("scroll", this.scrolled)
    this.popups.dispose()
  }

  /** A scroll hides the strip, and moves the picker with the caret. */
  private scrolled = (): void => {
    this.popups.hide()
    for (const follower of [...this.followers]) follower("scroll")
  }
}

/** Where `CodeMirrorValues` finds an attribute's words:  for the quoted value at `pos` in `state`. */
export type ValuesAt = (
  state: EditorState,
  pos: number
) => Promise<LSP.AttributeValues | undefined> | LSP.AttributeValues | undefined

////////////////
// ## Types and helpers
////////////////

/** Each state's `ValuesAt`:  the last one given. */
const VALUES_AT = Facet.define<ValuesAt, ValuesAt | undefined>({ combine: (values) => values.at(-1) })

/** One `CodeMirrorValues` per view. */
const PLUGIN = ViewPlugin.fromClass(CodeMirrorValues)

/**
 * What `ValuePopups` needs of `view`:  its caret's quoted value, its words, its keys.
 * - `followers`:  the set its `follow()` adds to, which the view's `CodeMirrorValues` calls.
 */
function hostFor(view: EditorView, followers: Set<(change: "edit" | "scroll") => void>): ValuePopupHost {
  return {
    valueAt: (end) => caretValueOf(view, end),
    wordsAt: () => {
      const { state } = view
      const answer = state.facet(VALUES_AT)?.(state, state.selection.main.head)
      return answer instanceof Promise ? answer.then((values) => values?.values) : answer?.values
    },
    canShowChoices: () => {
      const { state } = view
      const isOneCaret = state.selection.ranges.length === 1 && state.selection.main.empty
      return isOneCaret && view.hasFocus && !state.readOnly && completionStatus(state) === null
    },
    focus: () => view.focus(),
    type: (letter) => {
      view.focus()
      const { from, to } = view.state.selection.main
      const insert = () =>
        view.state.update({
          changes: { from, to, insert: letter },
          selection: { anchor: from + letter.length },
          scrollIntoView: true,
          userEvent: "input.type"
        })
      // through the input handlers, as the keyboard's letters go:  the typing helps see it
      const handlers = view.state.facet(EditorView.inputHandler)
      if (!handlers.some((handler) => handler(view, from, to, letter, insert))) view.dispatch(insert())
    },
    follow: (listener) => {
      followers.add(listener)
      return () => followers.delete(listener)
    }
  }
}

/** The quoted value at `view`'s caret, as `ValuePopups` takes it (`LSP.SpellTyping.quotedValueAt()`). */
function caretValueOf(view: EditorView, end: LSP.QuotedValueEnd): CaretValue | undefined {
  const { state } = view
  const caret = state.selection.main.head
  const line = state.doc.lineAt(caret)
  const found = LSP.SpellTyping.quotedValueAt(line.text, caret - line.from, end)
  if (!found) return undefined
  const from = line.from + found.from
  const to = line.from + found.to
  return {
    text: state.sliceDoc(from, to),
    boxOf: (at) => {
      const box = view.coordsAtPos(at === "start" ? from : caret, 1)
      const visible = view.scrollDOM.getBoundingClientRect()
      if (!box || box.bottom < visible.top || box.top > visible.bottom) return undefined
      return { left: box.left, top: box.top, bottom: box.bottom }
    },
    write: (word) => {
      view.dispatch({
        changes: { from, to, insert: word },
        // after the closing quote;  at the line's end when there's none yet (the picker's)
        selection: { anchor: Math.min(from + word.length + 1, line.to + word.length - (to - from)) },
        scrollIntoView: true,
        userEvent: "input.choose",
        annotations: isolateHistory.of("full")
      })
      view.focus()
    }
  }
}
