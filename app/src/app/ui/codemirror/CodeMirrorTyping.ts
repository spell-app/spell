import { completionStatus, insertBracket, snippet, startCompletion } from "@codemirror/autocomplete"
import { isolateHistory } from "@codemirror/commands"
import { indentUnit } from "@codemirror/language"
import {
  ChangeSet,
  EditorState,
  type Extension,
  Facet,
  Prec,
  StateEffect,
  StateField,
  Transaction,
  type TransactionSpec
} from "@codemirror/state"
import { EditorView, keymap } from "@codemirror/view"

import { after } from "spell/util/timing"
import type { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { hoverDelay } from "spell/app/app/ui/codePopups"
import { FileStates } from "./FileStates"
import { LspToCodeMirror } from "./LspToCodeMirror"

/****************
 * ### `CodeMirrorTyping`
 * The ten helps as a person types Spell in a CodeMirror editor
 * (epic `codemirror` P4), so what they see is what they type.
 * - The caret snaps into the body a blank line is drawn in:
 *   clicked or arrowed onto, a blank line inside a body gets that body's indent, the caret after it.
 *   - Backspace there takes one indent off, the caret out a level:  it doesn't snap back in till the caret leaves.
 *   - Left without typing, the line gets back what it had.
 *   - No undo step of its own:  kept out of undo, as an edit from outside the code is.
 * - A letter typed on a blank line takes the next line's indent, so it lands in the body it's drawn in;
 *   the same undo step as the letter.
 *   - Not on a line Backspace (or Shift+Tab) just took out a level:  the letter stays where the caret's drawn,
 *     at that level, till the caret leaves the line (`wentOut`;  epic `language` I159).
 * - `group `, `its `, `a ` ... at a line's start open a name's quotes, the caret between;
 *   one undo leaves `group ` again, and a `"` typed after the name steps over the closing one.
 * - A space after a tag's name writes the rest of the tag, the caret where its next words go:
 *   `<action ` => `<action "|" />`, the program's actions listed once the typing pauses `hoverDelay()`
 *   (`LSP.CompletionShapes.spaceAfterTag()`;  epic `codemirror` I22);
 *   one undo leaves `<action `.
 * - A paste takes the indent where it lands, ⌘V and the right-click menu's Paste alike (`paste()`);
 *   one undo takes it all back.  A whole line copied (nothing selected) pastes as copied.
 * - Shift+Tab, ⌘[, or Backspace at the end of a line's indent moves the lines under it out a level with it;
 *   Tab there, or ⌘], moves them in.  One undo.
 *   - A line of a tag's attributes under its first line moves alone, its indent tabs then spaces;
 *     so does a comment line.
 * - `|>` typed in a tag writes `/>`, which the bubbly look draws as a bar and a point, `|⟩`;
 *   one undo leaves the `|>` typed.  HTML files have this one alone (`markupExtension()`).
 * - Enter between a tag's attributes lays the tag out as Prettier lays out a long one:  each attribute on its own line,
 *   a level in, its `>` on its own line;  Backspace at an attribute line's start joins it to the line above.
 * - Enter before a comment after code puts the comment on its own line, at the level of the body under it.
 * - Enter keeps the line's indent and follows Spell's Enter rules (`LSP.SpellTyping.ENTER_RULES`),
 *   and leaves no tabs or spaces at the end of the line it splits.
 * - Two editors on one file (the code and a slice of it, `FileStates.showSlice()`):
 *   each has these helps, but only the one typed in hears the keys, so only it helps.
 * - Its own edits, and an edit from outside the code (`FileStates.EDIT_WAY`), are never taken for typing.
 * - Every help writes only on the lines it's working on:  an edit anywhere else is dropped, with an error saying so,
 *   so a help gone wrong never breaks a file silently (`write()`).
 * - What each help decides, from the lines, is the language service's (`LSP.SpellTyping`),
 *   so the editor and its tests decide alike;  this class is only the CodeMirror wiring.
 ****************/
export class CodeMirrorTyping {
  /** The helps, for a file in `lang`;  `fileOf()`:  the project file, whose parse says which tags are its views. */
  static extension(fileOf: () => SP.SpellFile | undefined, lang = "en"): Extension {
    return [
      HAS_TYPING_HELPS.of(true),
      snapped,
      wentOut,
      EditorState.transactionFilter.of((transaction) => CodeMirrorTyping.moved(transaction, lang)),
      // before the base setup's keys:  its Tab, ⌘[ and ⌘] would indent the line alone
      Prec.high(
        keymap.of([
          { key: "Enter", run: (view) => CodeMirrorTyping.enter(view) },
          { key: "Tab", run: (view) => CodeMirrorTyping.moveLines(view, "in", "tab") },
          { key: "Shift-Tab", run: (view) => CodeMirrorTyping.moveLines(view, "out", "tab") },
          {
            key: "Backspace",
            run: (view) => backspaceInTag(view) || CodeMirrorTyping.moveLines(view, "out", "backspace")
          },
          { key: "Mod-[", run: (view) => CodeMirrorTyping.moveLines(view, "out", "mod") },
          { key: "Mod-]", run: (view) => CodeMirrorTyping.moveLines(view, "in", "mod") }
        ])
      ),
      EditorView.inputHandler.of((view, from, to, text) =>
        CodeMirrorTyping.typed(view, { from, to, text, lang, fileOf })
      ),
      EditorView.domEventHandlers({ paste: (event, view) => CodeMirrorTyping.pasting(event, view) }),
      EditorView.clipboardOutputFilter.of((text, state) => {
        copiedWholeLine = state.selection.ranges.every((range) => range.empty) ? text : undefined
        return text
      })
    ]
  }

  /**
   * The help an HTML file's editor has (a property editor page, `Card.editor.html`):
   * `|>` in a tag writes `/>`, as in a Spell file's drawing.
   */
  static markupExtension(): Extension {
    return EditorView.inputHandler.of(
      (view, from, to, text) =>
        from === to && text === ">" && view.state.selection.ranges.length === 1 && closeWithBar(view, from)
    )
  }

  ////////////////
  // ## A paste takes its indent
  ////////////////

  /**
   * Write `text` re-indented to where it lands, as one edit, so one undo takes it back:
   * every paste, ⌘V's and the right-click menu's.
   * - Returns whether it did:  `false` leaves the paste to CodeMirror, as it was.
   * - Left to CodeMirror:  a view without these helps, several carets, a whole line copied (it pastes above),
   *   a one-line paste, or no change needed.
   */
  static paste(view: EditorView, text: string): boolean {
    const { state } = view
    if (!state.facet(HAS_TYPING_HELPS) || state.readOnly || state.selection.ranges.length !== 1) return false
    if (!text || text === copiedWholeLine) return false
    const { from, to } = state.selection.main
    const pasted = text.replace(/\r\n?/g, "\n").split("\n")
    const line = state.doc.lineAt(from)
    const lines = LSP.SpellTyping.pastedLines(pasted, state.sliceDoc(line.from, from), indentSettingsOf(state))
    if (lines.join("\n") === pasted.join("\n")) return false
    const insert = lines.join(state.lineBreak)
    return write(view, linesOf(state, from, to), {
      changes: { from, to, insert },
      selection: { anchor: from + insert.length },
      scrollIntoView: true,
      userEvent: "input.paste"
    })
  }

  /** ⌘V:  the browser's paste, re-indented by `paste()` unless it's left to CodeMirror. */
  private static pasting(event: ClipboardEvent, view: EditorView): boolean {
    const text = event.clipboardData?.getData("text/plain")
    if (!text || !CodeMirrorTyping.paste(view, text)) return false
    event.preventDefault()
    return true
  }

  ////////////////
  // ## A line moved out takes what's under it
  ////////////////

  /**
   * Move the caret's line `way`, the lines under it along, as one edit:  `key` says which key asked.
   * - `"tab"`:  Shift+Tab anywhere on the line;  Tab only with the caret at the end of its indent,
   *   nothing selected and no suggestions showing, so Tab elsewhere is CodeMirror's
   * - `"backspace"`:  only at the end of its indent;  never on a tag's attribute line, where it's a space at a time
   * - `"mod"`:  ⌘[ and ⌘]
   * - A line with nothing under it is left to CodeMirror;  a tag's attribute line and a comment line move alone.
   * - Returns whether it did.
   */
  static moveLines(view: EditorView, way: "in" | "out", key: "tab" | "backspace" | "mod"): boolean {
    const { state } = view
    if (state.readOnly || state.selection.ranges.length !== 1) return false
    const selection = state.selection.main
    const line = state.doc.lineAt(selection.from)
    if (state.doc.lineAt(selection.to).number !== line.number) return false
    const { text } = line
    const indent = LSP.SpellTyping.indentOf(text)
    if ((way === "out" && !indent) || !text.trim()) return false
    const isAtIndent = selection.empty && selection.head === line.from + indent.length
    const isTab = key === "tab" && way === "in"
    if ((key === "backspace" || isTab) && !isAtIndent) return false
    // Tab takes a suggestion while the list shows:  CodeMirror's, not ours
    if (isTab && completionStatus(state) === "active") return false
    const lines = state.doc.toJSON()
    const index = line.number - 1
    // a line of a tag's attributes, under its first line, moves alone:  its indent tabs then spaces again (I142)
    const isAttributeLine = !!LSP.SpellTyping.tagOpenAt(lines, index, 0)
    if (isAttributeLine && key === "backspace") return false
    // a comment line moves alone:  what's under it is the body of the line above it (I161)
    const isComment = LSP.SpellTyping.isComment(text)
    const under = isAttributeLine || isComment ? 0 : LSP.SpellTyping.linesUnder(lines, index)
    if (!under && !isAttributeLine) return false
    const settings = indentSettingsOf(state)
    // how far the lines move:  out to the level before, or in a level
    // (a tag's attribute line:  a whole level, so its spaces stay lined up)
    const outBy = isAttributeLine
      ? settings.tabSize
      : LSP.SpellTyping.widthOf(indent, settings.tabSize) - LSP.SpellTyping.outdentWidth(indent, settings.tabSize)
    const by = way === "in" ? settings.tabSize : -outBy
    const changes = lines.slice(index, index + under + 1).flatMap((each, at) => {
      if (!each.trim()) return []
      const its = LSP.SpellTyping.indentOf(each)
      const from = state.doc.line(line.number + at).from
      const width = Math.max(0, LSP.SpellTyping.widthOf(its, settings.tabSize) + by)
      return [{ from, to: from + its.length, insert: LSP.SpellTyping.indentOfWidth(width, settings) }]
    })
    const changeSet = ChangeSet.of(changes, state.doc.length)
    const first = changes[0]!
    return write(
      view,
      { from: line.number, to: line.number + under },
      {
        changes: changeSet,
        // at its indent, the caret stays where typing goes:  the end of the line's new indent
        selection: isAtIndent ? { anchor: changeSet.mapPos(first.to, 1) } : undefined,
        scrollIntoView: true,
        userEvent: way === "in" ? "input.indent" : "input.dedent"
      }
    )
  }

  ////////////////
  // ## Enter
  ////////////////

  /**
   * Enter, Spell's way:  before a comment after code, between a tag's attributes, else by Spell's Enter rules.
   * - `false` with more than one caret, for CodeMirror's own.
   */
  static enter(view: EditorView): boolean {
    const { state } = view
    if (state.readOnly || state.selection.ranges.length > 1) return false
    if (state.selection.main.empty && (enterBeforeComment(view) || enterInTag(view))) return true
    const { from, to } = state.selection.main
    const line = state.doc.lineAt(from)
    const text = state.sliceDoc(line.from, from)
    const after = state.sliceDoc(to, line.to)
    // no tabs or spaces left at the end of the line Enter splits (I160)
    const before = text.slice(0, text.length - LSP.SpellTyping.spaceAtEnd(text))
    const indent = LSP.SpellTyping.indentOf(line.text)
    const rule = LSP.SpellTyping.enterRuleFor(before, after)
    const inner = rule ? indent + "\t" : indent
    const insert = rule?.indent === "indentOutdent" ? `\n${inner}\n${indent}` : `\n${inner}`
    view.dispatch({
      changes: { from: line.from + before.length, to, insert },
      selection: { anchor: line.from + before.length + 1 + inner.length },
      scrollIntoView: true,
      userEvent: "input"
    })
    return true
  }

  ////////////////
  // ## What was typed
  ////////////////

  /**
   * A key typed:  a help to give with it, if any.
   * - `true` when the help wrote the key itself, with what it adds.
   */
  private static typed(view: EditorView, typing: Typing): boolean {
    const { from, to, text, lang, fileOf } = typing
    const { state } = view
    if (from !== to || !/^.$/su.test(text) || state.selection.ranges.length > 1) return false
    const line = state.doc.lineAt(from)
    const column = from - line.from
    const lines = state.doc.toJSON()
    const index = line.number - 1
    lines[index] = line.text.slice(0, column) + text + line.text.slice(column)
    const onLine = { from: line.number, to: line.number }
    if (text === ">" && closeWithBar(view, from)) return true
    // a line Backspace took out a level:  its letter stays at that level (I159)
    const indent = state.field(wentOut) === line.from ? "" : LSP.SpellTyping.indentToAdd(lines, index, column)
    // the letter and its indent, one undo step
    if (indent)
      return write(view, onLine, {
        changes: { from, insert: indent + text },
        selection: { anchor: from + indent.length + text.length },
        userEvent: "input.type"
      })
    if (text !== " ") return false
    const tag = LSP.SpellTyping.tagBeforeSpace(lines, index, column)
    if (tag) {
      const rest = LSP.CompletionShapes.spaceAfterTag(scopeOf(fileOf(), lang), tag)
      view.dispatch({ changes: { from, insert: " " }, selection: { anchor: from + 1 }, userEvent: "input.type" })
      // the rest an undo step of its own:  a snippet's edit never joins the typing before it
      if (rest.insertText) {
        snippet(LspToCodeMirror.snippet(rest.insertText))(view, { label: tag }, from + 1, from + 1)
        // what's typed in it next is a step of its own
        view.dispatch({ annotations: isolateHistory.of("after") })
      }
      if (rest.command) suggestOncePaused(view)
      return true
    }
    if (!LSP.SpellTyping.opensQuotes(lines, index, lang)) return false
    view.dispatch({ changes: { from, insert: " " }, selection: { anchor: from + 1 }, userEvent: "input.type" })
    // typed as a `"` would be, so a `"` typed after the name steps over the closing one;  an undo step of its own
    const quotes = insertBracket(view.state, '"')
    if (!quotes) return true
    return write(view, onLine, {
      changes: quotes.changes,
      selection: quotes.selection,
      effects: quotes.effects,
      userEvent: "input"
    })
  }

  ////////////////
  // ## The caret snaps into its body
  ////////////////

  /**
   * The caret moved onto another line, by a click or a key (`transaction`, a `select` event):
   * a blank line inside a body gets that body's indent, the caret after it;
   * the line it snapped on before gets back what it had, if it's still blank.
   * - Written with the move, out of undo, marked as not typed (`FileStates.EDIT_WAY`).
   */
  private static moved(transaction: Transaction, lang: string): TransactionSpec | readonly TransactionSpec[] {
    const { startState } = transaction
    if (transaction.docChanged || !transaction.selection || !transaction.isUserEvent("select")) return transaction
    if (startState.readOnly || !startState.facet(HAS_TYPING_HELPS)) return transaction
    const { doc } = startState
    const caret = transaction.newSelection
    const line = doc.lineAt(caret.main.head)
    if (line.number === doc.lineAt(startState.selection.main.head).number) return transaction
    const changes: { from: number; to?: number; insert: string }[] = []
    const was = startState.field(snapped)
    if (was) {
      const left = doc.lineAt(was.from)
      if (left.text !== was.before && !left.text.trim())
        changes.push({ from: left.from, to: left.to, insert: was.before })
    }
    const isCaret = caret.ranges.length === 1 && caret.main.empty
    const indent = isCaret ? LSP.SpellTyping.indentToSnap(doc.toJSON(), line.number - 1, lang) : ""
    if (indent) changes.push({ from: line.to, insert: indent })
    const now = indent ? { from: line.from, before: line.text } : undefined
    if (!changes.length) return was ? [transaction, { effects: snap.of(now) }] : transaction
    const changeSet = ChangeSet.of(changes, doc.length)
    // after the move, in the same transaction:  its changes in the text as the move leaves it, which it doesn't change
    return [
      transaction,
      {
        changes: changeSet,
        selection: indent ? { anchor: changeSet.mapPos(line.to, 1) } : caret.map(changeSet),
        effects: snap.of(now && { ...now, from: changeSet.mapPos(now.from, -1) }),
        annotations: [Transaction.addToHistory.of(false), FileStates.EDIT_WAY.of("typing")],
        sequential: true
      }
    ]
  }
}

////////////////
// ## Enter's own helps
////////////////

/**
 * Enter before a comment after code (`its "face" is\t\t-- the card it draws`):  the comment goes on its own line,
 * at the level of the body under that line, so the body still reads as its body (I155, I161, I24).
 * - The tabs and spaces round the caret go:  none left at the end of the code's line, none before the comment.
 * - The caret anywhere in the gap before the comment, or inside its `--`, drawn as one dash (I24):
 *   `LSP.SpellTyping.commentSplitAt()`.
 * - Returns whether it did:  `false` leaves the key to Spell's Enter rules.
 */
function enterBeforeComment(view: EditorView): boolean {
  const { state } = view
  const caret = state.selection.main.head
  const line = state.doc.lineAt(caret)
  const split = LSP.SpellTyping.commentSplitAt(line.text, caret - line.from)
  if (!split) return false
  const indent = LSP.SpellTyping.commentIndent(state.doc.toJSON(), line.number - 1, indentSettingsOf(state))
  const from = line.from + split.codeEnd
  return write(
    view,
    { from: line.number, to: line.number },
    {
      changes: { from, to: line.from + split.commentStart, insert: state.lineBreak + indent },
      selection: { anchor: from + 1 + indent.length },
      scrollIntoView: true,
      userEvent: "input"
    }
  )
}

/**
 * Enter between a tag's attributes (`<toolbar class="GameBar" |appearance="pills">`):  the tag laid out as Prettier
 * lays out a long one, each attribute on its own line a level in, its `>` on its own line (epic `language` I133;
 * `LSP.SpellTyping.tagLaidOut()`);  one undo.
 * - Returns whether it did:  `false` leaves the key to Spell's Enter rules (not between a tag's attributes).
 */
function enterInTag(view: EditorView): boolean {
  const { state } = view
  const caret = state.selection.main.head
  const line = state.doc.lineAt(caret)
  const layout = LSP.SpellTyping.tagLaidOut(
    state.doc.toJSON(),
    line.number - 1,
    caret - line.from,
    indentSettingsOf(state)
  )
  return !!layout && writeLayout(view, layout)
}

/**
 * Backspace at the start of a tag's attribute line, after its indent:  the line joins the one above, a space between
 * (epic `language` I133;  `LSP.SpellTyping.tagLineJoined()`);  one undo.
 * - Returns whether it did.
 */
function backspaceInTag(view: EditorView): boolean {
  const { state } = view
  const selection = state.selection.main
  if (state.readOnly || state.selection.ranges.length !== 1 || !selection.empty) return false
  const line = state.doc.lineAt(selection.head)
  const layout = LSP.SpellTyping.tagLineJoined(state.doc.toJSON(), line.number - 1, selection.head - line.from)
  return !!layout && writeLayout(view, layout, "delete.backward")
}

/** Write `layout` over the lines it replaces, the caret where it says. */
function writeLayout(view: EditorView, layout: LSP.TagLayout, userEvent = "input"): boolean {
  const { doc, lineBreak } = view.state
  const from = doc.line(layout.from + 1).from
  const to = doc.line(layout.to + 1).to
  const anchor = from + layout.lines.slice(0, layout.caret.line - layout.from).join(lineBreak).length
  return write(
    view,
    { from: layout.from + 1, to: layout.to + 1 },
    {
      changes: { from, to, insert: layout.lines.join(lineBreak) },
      selection: { anchor: anchor + (layout.caret.line > layout.from ? lineBreak.length : 0) + layout.caret.column },
      scrollIntoView: true,
      userEvent
    }
  )
}

////////////////
// ## `|>` closes a tag
////////////////

/**
 * A `>` typed at `at`, right after a `|` in a tag:  the `|>` becomes `/>`, the caret after it (epic `codemirror` T16).
 * - The `>` is written first, as typed, then the `/` over the `|` as a step of its own:
 *   one undo leaves the `|>` typed, as the other helps leave what was typed.
 * - Returns whether it did:  `false` leaves the key to the editor (`LSP.SpellTyping.closesWithBar()`).
 */
function closeWithBar(view: EditorView, at: number): boolean {
  const { state } = view
  if (state.readOnly) return false
  const line = state.doc.lineAt(at)
  const column = at - line.from
  const lines = state.doc.toJSON()
  lines[line.number - 1] = line.text.slice(0, column) + ">" + line.text.slice(column)
  if (!LSP.SpellTyping.closesWithBar(lines, line.number - 1, column)) return false
  view.dispatch({ changes: { from: at, insert: ">" }, selection: { anchor: at + 1 }, userEvent: "input.type" })
  return write(
    view,
    { from: line.number, to: line.number },
    { changes: { from: at - 1, to: at, insert: "/" }, selection: { anchor: at + 1 }, userEvent: "input" }
  )
}

////////////////
// ## Writing a help
////////////////

/**
 * Write `spec` as a help, each change inside the lines it's working on, `from` to `to` (1-based);
 * returns whether it did (epic `editor` I150).
 * - A change outside them is a help gone wrong:
 *   nothing is written, and it logs which, so a file is never broken silently.
 */
function write(view: EditorView, { from, to }: { from: number; to: number }, spec: TransactionSpec): boolean {
  const { doc } = view.state
  const changes = spec.changes instanceof ChangeSet ? spec.changes : view.state.changes(spec.changes ?? [])
  let outside: number | undefined
  changes.iterChangedRanges((start, end) => {
    const first = doc.lineAt(start).number
    const last = doc.lineAt(end).number
    if (first < from || last > to) outside ??= first
  })
  if (outside !== undefined) {
    console.error(
      `CodeMirrorTyping:  a help's edit at line ${outside} is outside lines ${from}-${to}, the ones it's working on;  not written`,
      spec
    )
    return false
  }
  // its own undo step, before and after:  typing on joins it no more than it joins the typing before
  // (a letter's indent is part of the letter's step:  `input.type`)
  const isolated = spec.userEvent === "input.type" ? [] : [isolateHistory.of("full")]
  view.dispatch({ ...spec, changes, annotations: [...asList(spec.annotations), ...isolated] })
  return true
}

/** `value` as a list:  none, one or several. */
function asList<T>(value: T | readonly T[] | undefined): readonly T[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value as T]
}

/** The lines `from` ... `to` (offsets) are on, 1-based. */
function linesOf(state: EditorState, from: number, to: number): { from: number; to: number } {
  return { from: state.doc.lineAt(from).number, to: state.doc.lineAt(to).number }
}

/** `state`'s indent settings:  a level a tab, or spaces, as its indent unit says;  a tab its tab size wide. */
function indentSettingsOf(state: EditorState): LSP.IndentSettings {
  return { insertSpaces: !state.facet(indentUnit).includes("\t"), tabSize: state.tabSize }
}

/** The scope a tag typed in `file` is read in:  its last parse's, else its language's. */
function scopeOf(file: SP.SpellFile | undefined, lang: string): P.Scope {
  return file?.scope ?? file?.project.scope ?? SP.Language.for(lang).rootScope
}

/**
 * Show the suggestion list in `view` once the typing pauses `hoverDelay()`, as the list shown by itself does
 * (epic `codemirror` I22);  never if a key is typed before then:  that key's own wait takes over.
 */
function suggestOncePaused(view: EditorView): void {
  const { doc } = view.state
  void after(hoverDelay(), () => {
    if (view.state.doc === doc && view.hasFocus) startCompletion(view)
  }).catch((error) => console.error("CodeMirrorTyping:  the suggestion list didn't show", error))
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

/** Does a state have these helps?  The right-click menu's Paste asks, through `paste()`. */
const HAS_TYPING_HELPS = Facet.define<boolean, boolean>({ combine: (values) => values.some(Boolean) })

/**
 * The text of the last copy made with nothing selected, a whole line:  CodeMirror pastes that above the caret's line,
 * so it's left to it.
 * - Page-wide, as CodeMirror's own note of it is.
 */
let copiedWholeLine: string | undefined

/** A blank line the caret snapped on:  where it starts, and what it had before. */
type Snapped = { from: number; before: string }

/** The caret snapped on a line, or left it (`undefined`). */
const snap = StateEffect.define<Snapped | undefined>()

/**
 * The line the caret last snapped on, till the caret leaves it or something's typed on it.
 * - Backspace there leaves it snapped:  it's still blank, so leaving gives it back what it had.
 * - Moves with edits above it.
 */
const snapped = StateField.define<Snapped | undefined>({
  create: () => undefined,
  update(value, transaction) {
    for (const effect of transaction.effects) if (effect.is(snap)) return effect.value
    if (!value || !transaction.docChanged) return value
    const from = transaction.changes.mapPos(value.from, -1)
    const line = transaction.state.doc.lineAt(from)
    // typed on, or left by an edit (Enter):  it's the person's now
    const isTyped = !transaction.annotation(FileStates.EDIT_WAY) && transaction.isUserEvent("input")
    const caretLine = transaction.state.doc.lineAt(transaction.state.selection.main.head).number
    if (line.text.trim() || (isTyped && caretLine !== line.number)) return undefined
    return { ...value, from: line.from }
  }
})

/**
 * The blank line Backspace or Shift+Tab last took the caret out a level on, by where it starts, till the caret leaves it
 * or something's typed on it (epic `language` I159).
 * - A letter typed there stays at the level the caret's drawn at:  no indent added (`indentToAdd()`).
 * - Moves with edits above it.
 */
const wentOut = StateField.define<number | undefined>({
  create: () => undefined,
  update(value, transaction) {
    const { state } = transaction
    const caret = state.selection.main
    const line = state.doc.lineAt(caret.head)
    const isBlank = !line.text.trim()
    if (transaction.docChanged && transaction.isUserEvent("delete") && caret.empty && isBlank) return line.from
    if (value === undefined) return undefined
    const from = transaction.docChanged ? transaction.changes.mapPos(value, -1) : value
    return from === line.from && isBlank ? from : undefined
  }
})
