import type { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import type { monaco } from "./monaco"

/****************
 * ### `SpellTyping`
 * Seven helps as a person types Spell in a Monaco editor (epic `language` P50;  epic `editor` P28), so what they see
 * is what they type.
 * - The caret snaps into the body a blank line is drawn in:
 *   clicking or arrowing onto a blank line inside a body writes that body's indent (the next line's, as below),
 *   the caret after it, so it shows where typing goes (Owen, 2026-11-11:  tab stops).
 *   - Backspace there takes one indent off, the caret out a level:  it doesn't snap back in till the caret leaves.
 *   - Left without typing, the line gets back what it had.
 *   - No undo step of its own:  the indent is part of the edit before it.
 *   - Written as Monaco's own auto-indent is, so its `trimAutoWhitespace` takes it out at the next edit too.
 * - A blank line takes its block's indent at its first letter:
 *   typing on an empty line between two lines of a body writes the next line's indent first,
 *   so the line lands in the body the bubbly look draws it in, not at the top level outside it.
 *   - e.g. `g` on the empty line before `\tgroup "Names"`, inside `a "card" is ...`, writes `\tg`
 *   - The next non-blank line's indent, not the layout's:  it works with the look off too,
 *     and a blank line before a line that leaves a body is drawn outside it, as here.
 * - A space after a word that names something writes its quotes, the caret between:
 *   `group ` => `group "|"`, at a line's start with nothing after it.
 *   - The words are each language's `QUOTED_NAME_WORDS`, by where the line is:  at the top level, a type's
 *     (`a`, `an`);  in a type, a member's (`group`, `its`, `it`);  under a property, a choice's (`it`).
 *   - Typed as a `"` would be, so Monaco closes the pair itself:  a `"` typed after the name steps over the closing one.
 *   - Its own undo step:  one undo leaves `group ` again.
 * - A space after a tag's name writes the rest of the tag, the caret where its next words go (epic `editor` T68):
 *   - a tag a quoted name names:  `<action ` => `<action "|" />`, the program's actions listed at once
 *   - one that holds nothing:  `<divider ` => `<divider | />`
 *   - any other:  its closing tag written out, `<segment ` => `<segment |></segment>`
 *   - The language service's shapes (`LSP.CompletionShapes.spaceAfterTag()`), the ones choosing the tag from the
 *     suggestion list writes, so the two agree.
 *   - Only with nothing more of the tag after the caret:  editing `<action "x" />`, or a space elsewhere in a tag,
 *     is left alone.
 *   - Its own undo step:  one undo leaves `<action ` again.
 * - A paste takes the indent where it lands (epic `editor` I53, I59, I63):
 *   ⌘V or the right-click menu's Paste alike;
 *   its first line at the caret's indent, the rest kept where they were from it;
 *   a drawing's markup laid out as a tree instead, each tag's children one level under it.
 *   - One undo takes the whole paste back.
 *   - At a line's very start, or a one-line paste:  as it was copied.
 * - A line moved out a level takes the lines under it along (epic `editor` I59):
 *   Shift+Tab, or Backspace at the end of its indent, on a tag moves its children and its closing tag;
 *   on a type or a property, its body.  One undo for all of it.
 *   Tab there, or Cmd / Ctrl+], moves them in a level the same way.
 *   - A line of a tag's attributes under its first line moves alone, its indent tabs then spaces (I142).
 * - Enter between a tag's attributes lines the rest up under its first attribute (epic `editor` I142):
 *   `<container columns="7" |spacing="xs">` puts `spacing` under `columns`, tabs then spaces, as it's drawn.
 * - One per editor, made as each editor is (`SpellMonaco.register()`).
 *   - Several editors can show one file (the Code card's slices show the code editor's):  each hears every edit,
 *     so only the one typed in helps, at its own caret (epic `editor` I150).
 *   - Every help writes only on the lines it's working on:  an edit anywhere else is dropped, with an error saying so,
 *     so a help gone wrong never breaks a file silently (`write()`).
 * - Only Monaco's TYPE (`import type`):  its rules are plain functions of the lines, tested without an editor.
 ****************/
export class SpellTyping {
  constructor(
    private readonly editor: monaco.editor.ICodeEditor,
    private readonly languages: SpellTypingLanguages
  ) {
    editor.onDidChangeModelContent((event) => this.typed(event))
    editor.onDidChangeCursorPosition((event) => this.moved(event))
    editor.onKeyDown((event) => this.keyDown(event))
    // in the capture phase, before Monaco's own text area takes it;  on the container, there before a model is
    editor.getContainerDomNode().addEventListener("paste", (event) => this.pasting(event), { capture: true })
    // the right-click menu's Paste reads the clipboard itself and asks the editor to paste it:  no paste event
    // HACK: Monaco has no hook for a paste it's asked for, so this editor's `trigger()` is wrapped
    const trigger = editor.trigger.bind(editor)
    editor.trigger = (source, handlerId, payload) => {
      const asked = handlerId === MONACO_PASTE && (payload as MonacoPaste | undefined)
      if (asked && this.paste(asked.text, !!asked.pasteOnNewLine)) return
      trigger(source, handlerId, payload)
    }
  }

  ////////////////
  // ## A paste takes its indent
  ////////////////

  /** Cmd / Ctrl+V:  the browser's paste, re-indented by `paste()` unless it's left to Monaco. */
  private pasting(event: ClipboardEvent) {
    const clipboard = event.clipboardData
    const text = clipboard?.getData("text/plain")
    if (!clipboard || !text || !this.paste(text, wasCopiedAsWholeLine(clipboard))) return
    event.preventDefault()
    event.stopPropagation()
  }

  /**
   * Write `text` re-indented to where it lands, as one edit, so one undo takes it back:
   * every paste, Cmd / Ctrl+V's and the right-click menu's (epic `editor` I63).
   * - Returns whether it did:  `false` leaves the paste to Monaco, as it was.
   * - Left to Monaco:  several carets, a whole line copied (`isWholeLine`:  it pastes above),
   *   a one-line paste, or no change needed.
   */
  private paste(text: string, isWholeLine: boolean): boolean {
    const { editor } = this
    const model = editor.getModel()
    const selections = editor.getSelections() ?? []
    if (!model || !text || isWholeLine || selections.length !== 1 || editor.getRawOptions().readOnly) return false
    if (!this.languages.indents.includes(model.getLanguageId())) return false
    const selection = selections[0]!
    const pasted = text.replace(/\r\n?/g, "\n").split("\n")
    const before = model.getLineContent(selection.startLineNumber).slice(0, selection.startColumn - 1)
    const lines = SpellTyping.pastedLines(pasted, before, indentSettingsOf(model))
    if (lines.join("\n") === pasted.join("\n")) return false
    const pastedOn = { from: selection.startLineNumber, to: selection.endLineNumber }
    editor.pushUndoStop()
    const edit = { range: selection, text: lines.join(model.getEOL()), forceMoveMarkers: true }
    if (!this.write([edit], pastedOn)) return false
    editor.pushUndoStop()
    editor.revealPosition(editor.getPosition()!)
    return true
  }

  ////////////////
  // ## A line moved out takes what's under it
  ////////////////

  /**
   * Shift+Tab, Cmd / Ctrl+[, or Backspace at the end of a line's indent:  when lines sit under that line, move them out
   * with it;  Cmd / Ctrl+] moves them in with it (Owen, 2026-11-14, I59).  All as one edit.
   * - Tab with the caret at the end of a line's indent moves them in too (Owen:  "Hitting tab before <segment> should
   *   have tabbed its children to the right"):  only there, with no selection and no suggestions showing,
   *   so Tab mid-line, over a selection, or taking a suggestion is still Monaco's.
   * - A line with nothing under it is left to Monaco.
   */
  private keyDown(event: monaco.IKeyboardEvent) {
    if (this.enterInTag(event)) return
    const { editor } = this
    const model = editor.getModel()
    const { browserEvent: key } = event
    const isMod = (key.metaKey || key.ctrlKey) && !key.shiftKey && !key.altKey
    const isShiftTab = key.key === "Tab" && key.shiftKey && !key.metaKey && !key.ctrlKey && !key.altKey
    const isTab = key.key === "Tab" && !key.shiftKey && !key.metaKey && !key.ctrlKey && !key.altKey
    const isBackspace = key.key === "Backspace" && !key.shiftKey && !key.metaKey && !key.ctrlKey && !key.altKey
    const isIn = (isMod && key.key === "]") || isTab
    const isOut = isShiftTab || isBackspace || (isMod && key.key === "[")
    if (!model || !(isOut || isIn) || editor.getRawOptions().readOnly) return
    if (!this.languages.indents.includes(model.getLanguageId())) return
    const selections = editor.getSelections() ?? []
    const selection = selections[0]
    if (selections.length !== 1 || !selection || selection.startLineNumber !== selection.endLineNumber) return
    const line = selection.startLineNumber
    const text = model.getLineContent(line)
    const indent = indentOf(text)
    if ((isOut && !indent) || !text.trim()) return
    const isAtIndent = selection.isEmpty() && selection.startColumn === indent.length + 1
    if ((isBackspace || isTab) && !isAtIndent) return
    // Tab takes a suggestion while the list shows:  Monaco's, not ours
    if (isTab && editor.getDomNode()?.querySelector(SUGGESTIONS_SHOWING)) return
    const lines = model.getLinesContent()
    // a line of a tag's attributes, under its first line, moves alone:  its indent tabs then spaces again (I142);
    // Backspace there is Monaco's, a space at a time
    const isAttributeLine = !!SpellTyping.tagOpenAt(lines, line - 1, 0)
    if (isAttributeLine && isBackspace) return
    const under = isAttributeLine ? 0 : SpellTyping.linesUnder(lines, line - 1)
    if (!under && !isAttributeLine) return
    const settings = indentSettingsOf(model)
    // how far the lines move:  out to the level before, or in a level
    // (a tag's attribute line:  a whole level, so its spaces stay lined up)
    const outBy = isAttributeLine
      ? settings.tabSize
      : widthOf(indent, settings.tabSize) - outdentWidth(indent, settings.tabSize)
    const by = isIn ? settings.tabSize : -outBy
    const edits = lines.slice(line - 1, line + under).flatMap((each, at) => {
      const its = indentOf(each)
      if (!each.trim()) return []
      const lineNumber = line + at
      const width = Math.max(0, widthOf(its, settings.tabSize) + by)
      const range = {
        startLineNumber: lineNumber,
        startColumn: 1,
        endLineNumber: lineNumber,
        endColumn: its.length + 1
      }
      return [{ range, text: indentOfWidth(width, settings) }]
    })
    event.preventDefault()
    event.stopPropagation()
    editor.pushUndoStop()
    this.write(edits, { from: line, to: line + under })
    // Tab:  the caret stays where typing goes, at the end of the line's new indent
    if (isTab) editor.setPosition({ lineNumber: line, column: indentOf(model.getLineContent(line)).length + 1 })
    editor.pushUndoStop()
  }

  ////////////////
  // ## Enter between a tag's attributes
  ////////////////

  /**
   * Enter between a tag's attributes (`<container columns="7" |spacing="xs">`):  the rest goes to a new line
   * lined up under the tag's first attribute, `columns`, as one undo (Owen, 2026-11-14, I142).
   * - Lined up as the editor draws it, not by counting letters:  its font isn't monospace, and the bubbly look
   *   leaves room round some words.  So it measures where the first attribute is, then writes tabs, then spaces
   *   for what's left (`indentOfWidth()`).
   * - The spaces before the caret go:  no trailing space left on the tag's line.
   * - Returns whether it did:  `false` leaves the key to Monaco (several carets, a selection, suggestions showing,
   *   not between a tag's attributes).
   */
  private enterInTag(event: monaco.IKeyboardEvent): boolean {
    const { editor } = this
    const model = editor.getModel()
    const key = event.browserEvent
    if (key.key !== "Enter" || key.shiftKey || key.metaKey || key.ctrlKey || key.altKey || key.isComposing) return false
    if (!model || editor.getRawOptions().readOnly || !this.languages.indents.includes(model.getLanguageId()))
      return false
    const selections = editor.getSelections() ?? []
    const selection = selections[0]
    if (selections.length !== 1 || !selection?.isEmpty()) return false
    // Enter takes a suggestion while the list shows:  Monaco's
    if (editor.getDomNode()?.querySelector(SUGGESTIONS_SHOWING)) return false
    const line = selection.startLineNumber
    const lines = model.getLinesContent()
    const tag = SpellTyping.tagOpenAt(lines, line - 1, selection.startColumn - 1)
    const firstAttribute = tag?.firstAttribute
    if (!tag || firstAttribute === undefined) return false
    if (tag.line === line - 1 && selection.startColumn - 1 <= firstAttribute) return false
    const text = lines[line - 1]!
    const before = text.slice(0, selection.startColumn - 1).replace(/[ \t]+$/, "")
    const after = text.slice(selection.startColumn - 1).replace(/^[ \t]+/, "")
    const { spaceWidth } = editor.getOption(FONT_INFO as monaco.editor.EditorOption.fontInfo)
    const width = Math.round(editor.getOffsetForColumn(tag.line + 1, firstAttribute + 1) / spaceWidth)
    const indent = indentOfWidth(width, indentSettingsOf(model))
    const range = {
      startLineNumber: line,
      startColumn: before.length + 1,
      endLineNumber: line,
      endColumn: text.length - after.length + 1
    }
    event.preventDefault()
    event.stopPropagation()
    editor.pushUndoStop()
    this.write([{ range, text: model.getEOL() + indent }], { from: line, to: line })
    editor.setPosition({ lineNumber: line + 1, column: indent.length + 1 })
    editor.pushUndoStop()
    editor.revealPosition(editor.getPosition()!)
    return true
  }

  ////////////////
  // ## The caret snaps into its body
  ////////////////

  /**
   * The caret moved:  onto a blank line inside a body, by a click or a key, write that body's indent before it;
   * off a line it snapped on, give that line back what it had.
   */
  private moved(event: monaco.editor.ICursorPositionChangedEvent) {
    const line = event.position.lineNumber
    const cameFrom = this.caretLine
    this.caretLine = line
    if (this.isHelping || line === cameFrom || !MOVED_BY.includes(event.source)) return
    const { snapped } = this
    this.snapped = undefined
    this.help(() => {
      if (snapped) this.unsnap(snapped)
      if (event.reason === CURSOR_MOVED_EXPLICITLY) this.snap(line)
    })
  }

  /** Write the indent of the body `line` is drawn in before the caret, if it's a blank line in one;  remember it. */
  private snap(line: number) {
    const { editor } = this
    const model = editor.getModel()
    const selections = editor.getSelections() ?? []
    if (!model || selections.length !== 1 || !selections[0]!.isEmpty() || editor.getRawOptions().readOnly) return
    if (!this.languages.indents.includes(model.getLanguageId()) || editor.getPosition()?.lineNumber !== line) return
    const text = model.getLineContent(line)
    const indent = SpellTyping.indentToSnap(model.getLinesContent(), line - 1)
    if (!indent) return
    const column = text.length + 1
    const range = { startLineNumber: line, startColumn: column, endLineNumber: line, endColumn: column }
    const end = column + indent.length
    const caret = {
      selectionStartLineNumber: line,
      selectionStartColumn: end,
      positionLineNumber: line,
      positionColumn: end
    }
    // HACK: `isAutoWhitespaceEdit` isn't in Monaco's typed API:  it marks the edit as auto-indent, which it trims
    const edit = { range, text: indent, isAutoWhitespaceEdit: true } as monaco.editor.IIdentifiedSingleEditOperation
    if (!this.write([edit], { from: line, to: line }, [caret as monaco.Selection])) return
    this.snapped = { line, before: text }
  }

  /** Give the line the caret snapped on back what it had, if it's still nothing but its indent. */
  private unsnap({ line, before }: Snapped) {
    const model = this.editor.getModel()
    if (!model || line > model.getLineCount()) return
    const text = model.getLineContent(line)
    if (text === before || text.trim()) return
    const range = { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: text.length + 1 }
    this.write([{ range, text: before }], { from: line, to: line })
  }

  /** The line the caret was last on. */
  private caretLine = 0

  /** The line the caret last snapped on, and what it had before, till the caret leaves it or it's edited. */
  private snapped: Snapped | undefined

  ////////////////
  // ## What was typed
  ////////////////

  /** What one keystroke wrote:  indent its line, or open a name's quotes, after it's in. */
  private typed(event: monaco.editor.IModelContentChangedEvent) {
    if (this.isHelping) return
    // something typed on the line the caret snapped on:  it's the person's now (Backspace alone leaves it ours)
    if (this.snapped && this.editor.getModel()?.getLineContent(this.snapped.line).trim()) this.snapped = undefined
    if (event.isUndoing || event.isRedoing || event.isFlush || event.changes.length !== 1) return
    // every editor showing the file hears the edit:  only the one typed in helps, at its own caret (I150)
    if (!this.editor.hasTextFocus()) return
    const change = event.changes[0]!
    const model = this.editor.getModel()
    if (!model || change.rangeLength !== 0 || !/^.$/su.test(change.text)) return
    const languageId = model.getLanguageId()
    const line = change.range.startLineNumber
    const lines = model.getLinesContent()
    const typedAt = change.range.startColumn - 1
    // where the caret is once the keystroke is in:  after what was typed
    const caret = { lineNumber: line, column: typedAt + 2 }
    if (this.languages.indents.includes(languageId)) {
      const indent = SpellTyping.indentToAdd(lines, line - 1, typedAt)
      if (indent) return this.help(() => this.indent(line, typedAt, indent), caret)
    }
    if (this.languages.quotes.includes(languageId) && change.text === " ") {
      const lang = SP.Language.langOfFile(model.uri.path) ?? "en"
      const tag = SpellTyping.tagBeforeSpace(lines, line - 1, typedAt)
      const rest = tag && LSP.CompletionShapes.spaceAfterTag(this.scopeOf(model, lang), tag)
      if (rest) return this.help(() => this.finishTag(rest), caret)
      if (SpellTyping.opensQuotes(lines, line - 1, lang)) this.help(() => this.openQuotes(), caret)
    }
  }

  /**
   * The scope a tag typed in `model` is read in:  its file's, from its last parse, so the program's own views are known
   * (`<column ` => `<column "|" />`, epic `editor` I149);  else its language's, for a model that isn't a project's file.
   * - The last parse, not one of the text as it is now:  a type declared since isn't known till the next.
   */
  private scopeOf(model: monaco.editor.ITextModel, lang: string): P.Scope {
    // the app's address for a file, `spell:/<path>` (`AppAddresses`, which loads Monaco's own code:  not here)
    const file = model.uri.scheme === APP_SCHEME ? SP.SpellFile.registry.get(model.uri.path.slice(1)) : undefined
    return file?.scope ?? file?.project.scope ?? SP.Language.for(lang).rootScope
  }

  /**
   * Run `edit` once the keystroke's own edit is done, marked as ours so it isn't taken for typing.
   * - `caret`:  where the caret must still be, just after what was typed, for the help to write.
   *   Its snippet and its quotes are written at the caret, so a caret anywhere else would put them there:
   *   then nothing is written, and it logs why (epic `editor` I150).
   * - NEVER throws:  a help that fails leaves what was typed, and logs why.
   */
  private help(edit: () => void, caret?: monaco.IPosition) {
    queueMicrotask(() => {
      if (caret && !this.isCaretAt(caret)) {
        console.error(
          `SpellTyping:  the caret left line ${caret.lineNumber}, column ${caret.column}, where it typed;  its help isn't written`
        )
        return
      }
      this.isHelping = true
      try {
        edit()
      } catch (error) {
        console.error("SpellTyping:  couldn't help with what was typed", error)
      } finally {
        this.isHelping = false
      }
    })
  }

  /** Is the editor's one caret at `caret`, nothing selected? */
  private isCaretAt(caret: monaco.IPosition): boolean {
    const selections = this.editor.getSelections() ?? []
    const [selection] = selections
    if (selections.length !== 1 || !selection?.isEmpty()) return false
    return selection.positionLineNumber === caret.lineNumber && selection.positionColumn === caret.column
  }

  /**
   * Write `edits` as a help, each inside the lines it's working on, `from` to `to` (1-based);
   * returns whether it did (epic `editor` I150).
   * - An edit outside them is a help gone wrong:  nothing is written, and it logs which, so a file is never broken
   *   silently.  The `></column>` written four times at the top of Solitaire's file was one.
   */
  private write(
    edits: monaco.editor.IIdentifiedSingleEditOperation[],
    { from, to }: { from: number; to: number },
    caret?: monaco.Selection[]
  ): boolean {
    const outside = edits.find(({ range }) => range.startLineNumber < from || range.endLineNumber > to)
    if (outside) {
      console.error(
        `SpellTyping:  a help's edit at line ${outside.range.startLineNumber} is outside lines ${from}-${to}, the ones it's working on;  not written`,
        outside
      )
      return false
    }
    this.editor.executeEdits(SPELL_TYPING, edits, caret)
    return true
  }

  /**
   * Write `indent` on `line` before what was typed at `column` (0-based):
   * the same undo step as the letter, so one undo takes back both.
   */
  private indent(line: number, column: number, indent: string) {
    const range = { startLineNumber: line, startColumn: column + 1, endLineNumber: line, endColumn: column + 1 }
    this.write([{ range, text: indent }], { from: line, to: line })
  }

  /**
   * Type a `"` where the caret is:  Monaco closes the pair, the caret between;  an undo step of its own.
   * - As the keyboard:  Monaco closes pairs only for what's typed there.
   * - Monaco closes one only on a line it has coloured already, and quick typing outruns its colouring:
   *   so it colours the line first;  and if the pair still isn't closed, writes the closing `"` itself
   *   (a `"` typed then doesn't step over it).
   */
  private openQuotes() {
    const { editor } = this
    const model = editor.getModel()!
    const line = editor.getPosition()!.lineNumber
    // HACK: `tokenization` isn't in Monaco's typed API:  it's the model's colouring, which auto-closing reads
    ;(model as TokenizedModel).tokenization?.forceTokenization?.(line)
    editor.pushUndoStop()
    editor.trigger("keyboard", "type", { text: '"' })
    const caret = editor.getPosition()!
    if (model.getLineContent(line).slice(caret.column - 1) !== '"') {
      const range = { startLineNumber: line, startColumn: caret.column, endLineNumber: line, endColumn: caret.column }
      this.write([{ range, text: '"' }], { from: line, to: line })
      editor.setPosition(caret)
    }
    editor.pushUndoStop()
  }

  /**
   * Write the rest of a tag after the caret, `rest`'s snippet (`"$1" />`, `$0></segment>`), the caret at its first stop;
   * an undo step of its own.  Then run its command, if it has one:  the suggestion list, shown again.
   */
  private finishTag(rest: LspCompletionFields) {
    const { editor } = this
    const snippets = editor.getContribution(MONACO_SNIPPETS) as SnippetController | null
    if (!snippets || !rest.insertText) return
    editor.pushUndoStop()
    snippets.insert(rest.insertText, { undoStopBefore: true, undoStopAfter: true })
    if (rest.command) editor.trigger(SPELL_TYPING, rest.command.command, {})
  }

  /** It's writing a help:  the edits it makes aren't typing. */
  private isHelping = false

  ////////////////
  // ## The rules
  ////////////////

  /**
   * The indent to write before the letter just typed at `column` (0-based) of `lines[index]`, if any:
   * the next non-blank line's, less what the line has already.
   * - Only for the line's first letter, typed on a line of nothing but tabs and spaces,
   *   and only when those are the start of that indent:  `""` otherwise.
   * - None at the end of a body:  the next line is the top level's, so is this one.
   */
  static indentToAdd(lines: readonly string[], index: number, column: number): string {
    const text = lines[index] ?? ""
    const before = text.slice(0, column)
    const typed = text.slice(column)
    if (!/^[ \t]*$/.test(before) || !/^\S$/u.test(typed)) return ""
    return indentStillToWrite(lines, index, before)
  }

  /**
   * The indent to write on blank line `lines[index]` as the caret lands on it, so it's in the body it's drawn in:
   * the next non-blank line's, less the tabs and spaces it has already.
   * - `""` when the line isn't blank, or is already that far in, or is drawn at the top level.
   */
  static indentToSnap(lines: readonly string[], index: number): string {
    const text = lines[index] ?? ""
    return /^[ \t]*$/.test(text) ? indentStillToWrite(lines, index, text) : ""
  }

  /**
   * Does the space just typed at the end of `lines[index]` follow a word whose next slot is a quoted name,
   * in language `lang` (`en`, `es` ...)?  See `QUOTED_NAME_WORDS`.
   * - Only a line of its indent, ONE word and the space:  `group `, `\tits `.
   * - The word counts only where the line is:
   *   - at the top level:  a type's word (`a "card" is ...`)
   *   - one level in, under a type:  a member's (`group "Rank"`, `its "rank" is ...`)
   *   - under a property:  a choice's (`it "is a (rank)"`)
   */
  static opensQuotes(lines: readonly string[], index: number, lang: string): boolean {
    const words = QUOTED_NAME_WORDS[lang]
    const match = /^([ \t]*)(\S+) $/u.exec(lines[index] ?? "")
    if (!words || !match) return false
    const [, indent, typedWord] = match
    const word = typedWord!.toLowerCase()
    if (!indent) return words.types.includes(word)
    const parent = parentOf(lines, index, indent!.length)
    if (!parent) return false
    const parentWord = parent.text.trim().split(/\s/)[0]!.toLowerCase()
    if (!parent.indent && words.types.includes(parentWord)) return words.members.includes(word)
    return words.properties.includes(parentWord) && words.choices.includes(word)
  }

  /**
   * The tag the space just typed at `column` (0-based) of `lines[index]` follows, if it ends one's name:
   * `<action ` => `action`.
   * - Only when nothing more of the tag is written after the space:  the line's end, or another tag.
   * - `undefined` for a space anywhere else:  after an attribute, inside quotes, in text.
   */
  static tagBeforeSpace(lines: readonly string[], index: number, column: number): string | undefined {
    const text = lines[index] ?? ""
    if (text[column] !== " ") return undefined
    const name = /<([\p{L}\p{M}][\p{L}\p{M}\d_-]*)$/u.exec(text.slice(0, column))?.[1]
    if (!name || !NOTHING_MORE_OF_THE_TAG.test(text.slice(column + 1))) return undefined
    return name
  }

  /**
   * The tag whose attributes `column` (0-based) of `lines[index]` is between, if any:
   * after its name, before its `>`, outside quotes.
   * - `line`:  the index of the line the tag starts on
   * - `firstAttribute`:  the column of the first word after its name on that line;
   *   `undefined` when its name ends that line
   * - Looks back at most `TAG_LINES_BACK` lines, so a long file isn't read for each key.
   */
  static tagOpenAt(lines: readonly string[], index: number, column: number): OpenTag | undefined {
    for (let at = index; at >= Math.max(0, index - TAG_LINES_BACK); at--) {
      const line = lines[at] ?? ""
      const text = at === index ? line.slice(0, column) : line
      const start = [...text.matchAll(TAG_START)].at(-1)
      if (!start) continue
      const nameEnd = start.index + start[0].length
      const since = at === index ? [text.slice(nameEnd)] : [text.slice(nameEnd), ...lines.slice(at + 1, index)]
      if (at !== index) since.push((lines[index] ?? "").slice(0, column))
      if (!isStillOpen(since.join("\n"))) return undefined
      const word = /\S/.exec(line.slice(nameEnd))
      return { line: at, firstAttribute: word ? nameEnd + word.index : undefined }
    }
    return undefined
  }

  /**
   * `pasted`'s lines as they should land after `before`, the text before the caret on its line.
   * - The indent they're laid out from:
   *   - the caret's, when `before` is only an indent:  the first line's own indent goes
   *   - the line's, when `before` has text:  the first line follows it as it was
   *   - the first line's own, at the line's very start
   * - A drawing's markup (its first line a tag):  each line one level under each tag still open above it,
   *   a closing tag back at its tag's level.
   * - Anything else:  each line keeps its indent from the first line, shifted with it.
   * - One line, or none:  as it is.
   */
  static pastedLines(pasted: readonly string[], before: string, settings: IndentSettings): string[] {
    if (pasted.length < 2) return [...pasted]
    const lines = SpellTyping.reindented(pasted, before, settings)
    // a paste that ends its last line (`restart the game\n`) leaves what was after the caret on a line of its own:
    // at the caret's indent, so it stays in its body (Owen, 2026-11-14, I53)
    if (!pasted.at(-1)!.trim())
      lines[lines.length - 1] = indentOfWidth(SpellTyping.pasteBase(before, pasted[0]!, settings), settings)
    return lines
  }

  /** The indent width a paste lands at:  the caret's, when it's in a line's indent, else its line's (or the paste's). */
  private static pasteBase(before: string, first: string, { tabSize }: IndentSettings): number {
    const isIndent = !!before && !before.trim()
    return isIndent ? widthOf(before, tabSize) : widthOf(indentOf(before || first), tabSize)
  }

  /** `pastedLines()`' re-indenting, its last line left as it came. */
  private static reindented(pasted: readonly string[], before: string, settings: IndentSettings): string[] {
    const { tabSize } = settings
    const first = pasted[0]!
    const isIndent = !!before && !before.trim()
    const base = SpellTyping.pasteBase(before, first, settings)
    const firstLine = isIndent ? first.trimStart() : first
    const isMarkup = /^\s*</.test(pasted.find((line) => line.trim()) ?? "")
    if (isMarkup) {
      let depth = tagDepthChange(first)
      const rest = pasted.slice(1).map((line) => {
        const trimmed = line.trim()
        if (!trimmed) return ""
        const level = Math.max(0, trimmed.startsWith("</") ? depth - 1 : depth)
        depth = Math.max(0, depth + tagDepthChange(trimmed))
        return indentOfWidth(base + level * tabSize, settings) + trimmed
      })
      return [firstLine, ...rest]
    }
    const from = widthOf(indentOf(first), tabSize)
    const rest = pasted.slice(1).map((line) => {
      if (!line.trim()) return ""
      const width = Math.max(0, base + widthOf(indentOf(line), tabSize) - from)
      return indentOfWidth(width, settings) + line.trimStart()
    })
    return [firstLine, ...rest]
  }

  /**
   * How many lines after `lines[index]` sit under it, and so move with it:
   * the ones indented further (blank lines among them, not after them), then its closing tag if it opens one.
   */
  static linesUnder(lines: readonly string[], index: number): number {
    const text = lines[index] ?? ""
    const indent = indentOf(text).length
    let under = 0
    for (let at = index + 1; at < lines.length; at++) {
      const line = lines[at]!
      if (!line.trim()) continue
      if (indentOf(line).length <= indent) {
        const closes = indentOf(line) === indentOf(text) && line.trim().startsWith("</") && tagDepthChange(text) > 0
        if (closes) under = at - index
        break
      }
      under = at - index
    }
    return under
  }
}

////////////////
// ## Types and helpers
////////////////

/** Which Monaco languages get which help:  ids, e.g. `["spell", "spell-page"]`. */
export type SpellTypingLanguages = {
  /** A blank line's indent:  every form of Spell, since indent is what a line belongs to. */
  indents: readonly string[]
  /** A name's quotes:  code Spell, whose lines these words start. */
  quotes: readonly string[]
}

/** A language's words whose next slot is a quoted name, by where the line is -- see `SpellTyping.opensQuotes()`. */
export type QuotedNameWords = {
  /** start a type at the top level:  `a "card" is ...` */
  types: string[]
  /** start a type's member, one level in:  `group "Rank"`, `its "rank" is ...`, `it "is a face card" if ...` */
  members: string[]
  /** start a property, whose choices go under it:  `its "rank" is one of ...` */
  properties: string[]
  /** start a property's choice, under it:  `it "is a (rank)"` */
  choices: string[]
}

/**
 * Each language's `QuotedNameWords`, by its code.
 * - A hand list, NOT from the packs' rules:  a rule's syntax puts a quoted name after many shapes of words
 *   (`{type:subject_implied} group {group:text}`), and the same words start lines with no name after them
 *   (`its rank && "of" && its suit` as a property's value, Spanish's `para cada ...`).
 *   So only these, where the line's place says a name comes next.
 * - Spanish has no `it` for a choice:  `"es un (palo)"` starts with its quotes.
 */
export const QUOTED_NAME_WORDS: Record<string, QuotedNameWords> = {
  en: { types: ["a", "an"], members: ["group", "its", "it"], properties: ["its"], choices: ["it"] },
  es: { types: ["un", "una"], members: ["grupo", "su", "sus"], properties: ["su", "sus"], choices: [] }
}

/** How a file indents:  tabs or spaces, and how wide a tab or a level is. */
export type IndentSettings = {
  /** Spaces for a level, not a tab. */
  insertSpaces: boolean
  /** Columns a tab, and a level, takes. */
  tabSize: number
}

/** The tags HTML never closes:  no children under them. */
const VOID_TAGS = /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/i

/** One tag on a line:  `<x ...>`, `<x/>`, `</x>`, `</>`, `<>`;  its slash before the name, its name, its slash at the end. */
const TAG = /<(\/?)([A-Za-z][\w.:-]*)?(?:\s(?:[^>"']|"[^"]*"|'[^']*')*?)?(\/?)>/g

/** A tag `SpellTyping.tagOpenAt()` found open:  the line it starts on, and its first attribute's column there. */
export type OpenTag = {
  /** index of the line the tag starts on */
  line: number
  /** column (0-based) of the first word after its name on that line;  `undefined` when the name ends the line */
  firstAttribute: number | undefined
}

/** How far back `SpellTyping.tagOpenAt()` looks for the tag's start:  a tag's attributes span a few lines at most. */
const TAG_LINES_BACK = 20

/** A tag's start, `<` and its name:  `<container`, `<ui-button`;  never a closing tag's `</`. */
const TAG_START = /<[\p{L}][\p{L}\p{M}\d_.:-]*/gu

/** Is a tag still open at the end of `text`, what follows its name:  no `>` outside quotes, and not inside quotes? */
function isStillOpen(text: string): boolean {
  let quote = ""
  for (const char of text) {
    if (quote) {
      if (char === quote) quote = ""
    } else if (char === '"' || char === "'") quote = char
    else if (char === ">") return false
  }
  return !quote
}

/** How many tags `line` leaves open:  each opened adds one, each closed takes one;  `<x/>` and `<br>` neither. */
function tagDepthChange(line: string): number {
  let change = 0
  for (const [, closing, name = "", selfClosing] of line.matchAll(TAG)) {
    if (closing) change--
    else if (!selfClosing && !VOID_TAGS.test(name)) change++
  }
  return change
}

/** How wide `indent` is, a tab `tabSize` columns. */
function widthOf(indent: string, tabSize: number): number {
  let width = 0
  for (const char of indent) width = char === "\t" ? (Math.floor(width / tabSize) + 1) * tabSize : width + 1
  return width
}

/** How wide one level out takes off `indent`:  back to the tab stop before its end. */
function outdentWidth(indent: string, tabSize: number): number {
  const width = widthOf(indent, tabSize)
  return width % tabSize ? width - (width % tabSize) : Math.max(0, width - tabSize)
}

/** An indent `width` columns wide, in the file's tabs or spaces. */
function indentOfWidth(width: number, { insertSpaces, tabSize }: IndentSettings): string {
  if (insertSpaces) return " ".repeat(width)
  return "\t".repeat(Math.floor(width / tabSize)) + " ".repeat(width % tabSize)
}

/** `model`'s indent settings. */
function indentSettingsOf(model: monaco.editor.ITextModel): IndentSettings {
  const { insertSpaces, tabSize } = model.getOptions()
  return { insertSpaces, tabSize }
}

/**
 * Did the clipboard come from a copy with nothing selected, a whole line (Monaco's own note on it)?
 * - Monaco pastes that above the caret's line:  left to it.
 */
function wasCopiedAsWholeLine(clipboard: DataTransfer): boolean {
  try {
    const data = JSON.parse(clipboard.getData("vscode-editor-data") || "{}") as { isFromEmptySelection?: boolean }
    return !!data.isFromEmptySelection
  } catch {
    return false
  }
}

/** Monaco's handler id for a paste it's asked for, `editor.trigger(source, "paste", ...)`:  its `Handler.Paste`. */
const MONACO_PASTE = "paste"

/** What Monaco's right-click Paste hands its `"paste"` handler. */
type MonacoPaste = { text: string; pasteOnNewLine?: boolean }

/** What's after a tag's name when none of the rest of it is written yet:  the line's end, or another tag. */
const NOTHING_MORE_OF_THE_TAG = /^\s*(?:<|$)/

/** Monaco's snippet writer's contribution id:  its `SnippetController2.ID`. */
const MONACO_SNIPPETS = "snippetController2"

/** What Monaco's snippet writer does that's used here, left out of its typed API. */
type SnippetController = {
  insert(template: string, options?: { undoStopBefore?: boolean; undoStopAfter?: boolean }): void
}

/** The completion fields a shape hands back:  its snippet, and the command to run once it's written. */
type LspCompletionFields = { insertText?: string; command?: { command: string } }

/** A model, with the colouring Monaco keeps for it but leaves out of its types. */
type TokenizedModel = monaco.editor.ITextModel & { tokenization?: { forceTokenization?(line: number): void } }

/** The source of the edits it makes, for Monaco's undo and the editor's listeners. */
/** Monaco's list of suggestions, while it shows:  Tab then takes one. */
const SUGGESTIONS_SHOWING = ".suggest-widget.visible"

const SPELL_TYPING = "spell-typing"

/** The app's scheme for its files' addresses:  `AppAddresses.SCHEME`. */
const APP_SCHEME = "spell"

/** What moves the caret onto a line it snaps on:  a click or a key, never code (`"api"`) nor its own edits. */
const MOVED_BY = ["mouse", "keyboard"]

/** Monaco's `EditorOption.fontInfo`:  the font's measures, a space's width among them. */
const FONT_INFO = 59

/** Monaco's `CursorChangeReason.Explicit`:  a move, not an edit's (`NotSet`) nor an undo's. */
const CURSOR_MOVED_EXPLICITLY = 3

/** A line the caret snapped on, and what it had before. */
type Snapped = { line: number; before: string }

/**
 * What's still to write of the next non-blank line's indent after `before`, the start of `lines[index]`:
 * `""` when `before` isn't the start of it, or is all of it.
 */
function indentStillToWrite(lines: readonly string[], index: number, before: string): string {
  const next = lines.slice(index + 1).find((line) => line.trim())
  const indent = next ? indentOf(next) : ""
  return indent.length > before.length && indent.startsWith(before) ? indent.slice(before.length) : ""
}

/** `line`'s indent:  its leading tabs and spaces. */
function indentOf(line: string): string {
  return /^[ \t]*/.exec(line)![0]
}

/** The nearest line above `lines[index]` indented less than `indent`, comments and blank lines aside. */
function parentOf(
  lines: readonly string[],
  index: number,
  indent: number
): { text: string; indent: number } | undefined {
  for (let above = index - 1; above >= 0; above--) {
    const text = lines[above]!
    const trimmed = text.trim()
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) continue
    const its = indentOf(text).length
    if (its < indent) return { text, indent: its }
  }
  return undefined
}
