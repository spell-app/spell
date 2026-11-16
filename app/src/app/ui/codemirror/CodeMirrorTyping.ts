import { snippet, startCompletion } from "@codemirror/autocomplete"
import type { Extension } from "@codemirror/state"
import { EditorView, keymap } from "@codemirror/view"

import type { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
// The pure helps' reading of lines, shared with Monaco's:  its file imports Monaco's TYPES only, so no Monaco comes with it
import { SpellTyping } from "spell/app/app/ui/monaco/SpellTyping"
import { snippetOf } from "./CodeMirrorLanguage"

/****************
 * ### `CodeMirrorTyping`
 * The Spell typing helps that matter most, in a CodeMirror editor (epic `editor` P30, the CodeMirror test):
 * four of the nine Monaco's `SpellTyping` gives, enough to judge.
 * - Enter keeps the line's indent, goes in a level after a `:` or an opening tag, and between `<x>` and `</x>` puts
 *   the caret a level in and the closing tag on its own line;  it leaves no tabs or spaces at the end of the line
 *   it splits.
 * - A space after a tag's name writes the rest of the tag, the caret where its next words go:
 *   `<action ` => `<action "|" />`, the program's actions listed at once (`LSP.CompletionShapes.spaceAfterTag()`).
 * - `group `, `its `, `a ` ... at a line's start open a name's quotes, the caret between.
 * - A letter typed on a blank line takes the next line's indent, so it lands in the body it's drawn in.
 * - What each reads of the lines is Monaco's own (`SpellTyping`'s static helpers), so both editors decide alike.
 ****************/
export class CodeMirrorTyping {
  /** The helps, for a file in `lang`;  `fileOf()`:  the project file, whose parse says which tags are its views. */
  static extension(fileOf: () => SP.SpellFile | undefined, lang = "en"): Extension {
    return [
      keymap.of([{ key: "Enter", run: (view) => CodeMirrorTyping.enter(view) }]),
      EditorView.inputHandler.of((view, from, to, text) =>
        CodeMirrorTyping.typed(view, { from, to, text, lang, fileOf })
      )
    ]
  }

  /** Enter, Spell's way.  `false` with more than one caret, for CodeMirror's own. */
  static enter(view: EditorView): boolean {
    const { state } = view
    if (state.selection.ranges.length > 1) return false
    const { from, to } = state.selection.main
    const line = state.doc.lineAt(from)
    const before = state.sliceDoc(line.from, from).replace(/[ \t]+$/, "")
    const after = state.sliceDoc(to, line.to)
    const indent = /^[ \t]*/.exec(line.text)![0]
    const opens = /:$/.test(before) || OPENING_TAG_AT_END.test(before)
    const inner = opens ? indent + "\t" : indent
    // between `<x>` and `</x>`:  the caret a level in, the closing tag on its own line
    if (opens && /^\s*<\//.test(after)) {
      const insert = `\n${inner}\n${indent}`
      view.dispatch({
        changes: { from: line.from + before.length, to, insert },
        selection: { anchor: line.from + before.length + 1 + inner.length },
        userEvent: "input"
      })
      return true
    }
    const insert = `\n${inner}`
    view.dispatch({
      changes: { from: line.from + before.length, to, insert },
      selection: { anchor: line.from + before.length + insert.length },
      scrollIntoView: true,
      userEvent: "input"
    })
    return true
  }

  /**
   * A key typed:  a help to give with it, if any.
   * - `true` when the help wrote the key itself, with what it adds.
   */
  private static typed(view: EditorView, typing: Typing): boolean {
    const { from, to, text, lang, fileOf } = typing
    if (from !== to || !/^.$/su.test(text) || view.state.selection.ranges.length > 1) return false
    const line = view.state.doc.lineAt(from)
    const column = from - line.from
    const lineText = line.text.slice(0, column) + text + line.text.slice(column)
    const lines = view.state.doc.toString().split("\n")
    lines[line.number - 1] = lineText
    const index = line.number - 1
    const indent = SpellTyping.indentToAdd(lines, index, column)
    if (indent) {
      view.dispatch({
        changes: { from: line.from, insert: indent + line.text.slice(0, column) + text, to: from },
        selection: { anchor: from + indent.length + 1 },
        userEvent: "input.type"
      })
      return true
    }
    if (text !== " ") return false
    const tag = SpellTyping.tagBeforeSpace(lines, index, column)
    if (tag) {
      const rest = LSP.CompletionShapes.spaceAfterTag(scopeOf(fileOf(), lang), tag)
      view.dispatch({ changes: { from, insert: " " }, selection: { anchor: from + 1 }, userEvent: "input.type" })
      if (rest.insertText) snippet(snippetOf(rest.insertText))(view, { label: tag }, from + 1, from + 1)
      if (rest.command) queueMicrotask(() => startCompletion(view))
      return true
    }
    if (SpellTyping.opensQuotes(lines, index, lang)) {
      view.dispatch({ changes: { from, insert: ' ""' }, selection: { anchor: from + 2 }, userEvent: "input.type" })
      return true
    }
    return false
  }
}

/** A key being typed, and what the helps need to know. */
type Typing = {
  from: number
  to: number
  /** what's typed */
  text: string
  /** the file's language */
  lang: string
  /** the project file shown */
  fileOf: () => SP.SpellFile | undefined
}

/** A line ending in a tag that opens, `<content>` or `<toolbar class="x">`:  not `<divider />`, not `</x>`. */
const OPENING_TAG_AT_END = /<[\p{L}][^<>/]*(?:"[^"]*"[^<>/]*)*>$/u

/** The scope a tag typed in `file` is read in:  its last parse's, else its language's. */
function scopeOf(file: SP.SpellFile | undefined, lang: string): P.Scope {
  return file?.scope ?? file?.project.scope ?? SP.Language.for(lang).rootScope
}
