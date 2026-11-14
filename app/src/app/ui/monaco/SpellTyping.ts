import { SP } from "spell/parser/spell"
import type { monaco } from "./monaco"

/****************
 * ### `SpellTyping`
 * Five helps as a person types Spell in a Monaco editor (epic `language` P50;  epic `editor` P28), so what they see
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
 * - A paste takes the indent where it lands (epic `editor` I53, I59, I63):
 *   ⌘V or the right-click menu's Paste alike;
 *   its first line at the caret's indent, the rest kept where they were from it;
 *   a drawing's markup laid out as a tree instead, each tag's children one level under it.
 *   - One undo takes the whole paste back.
 *   - At a line's very start, or a one-line paste:  as it was copied.
 * - A line moved out a level takes the lines under it along (epic `editor` I59):
 *   Shift+Tab, or Backspace at the end of its indent, on a tag moves its children and its closing tag;
 *   on a type or a property, its body.  One undo for all of it.
 * - One per editor, made as each editor is (`SpellMonaco.register()`).
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
    editor.pushUndoStop()
    editor.executeEdits(SPELL_TYPING, [{ range: selection, text: lines.join(model.getEOL()), forceMoveMarkers: true }])
    editor.pushUndoStop()
    editor.revealPosition(editor.getPosition()!)
    return true
  }

  ////////////////
  // ## A line moved out takes what's under it
  ////////////////

  /**
   * Shift+Tab, or Backspace at the end of a line's indent:  when lines sit under that line, move them out with it,
   * all as one edit.  A line with nothing under it is left to Monaco.
   */
  private keyDown(event: monaco.IKeyboardEvent) {
    const { editor } = this
    const model = editor.getModel()
    const { browserEvent: key } = event
    const isShiftTab = key.key === "Tab" && key.shiftKey && !key.metaKey && !key.ctrlKey && !key.altKey
    const isBackspace = key.key === "Backspace" && !key.shiftKey && !key.metaKey && !key.ctrlKey && !key.altKey
    if (!model || !(isShiftTab || isBackspace) || editor.getRawOptions().readOnly) return
    if (!this.languages.indents.includes(model.getLanguageId())) return
    const selections = editor.getSelections() ?? []
    const selection = selections[0]
    if (selections.length !== 1 || !selection || selection.startLineNumber !== selection.endLineNumber) return
    const line = selection.startLineNumber
    const text = model.getLineContent(line)
    const indent = indentOf(text)
    if (!indent || !text.trim()) return
    if (isBackspace && (!selection.isEmpty() || selection.startColumn !== indent.length + 1)) return
    const lines = model.getLinesContent()
    const under = SpellTyping.linesUnder(lines, line - 1)
    if (!under) return
    const settings = indentSettingsOf(model)
    const out = widthOf(indent, settings.tabSize) - outdentWidth(indent, settings.tabSize)
    const edits = lines.slice(line - 1, line + under).flatMap((each, at) => {
      const its = indentOf(each)
      if (!each.trim()) return []
      const lineNumber = line + at
      const width = Math.max(0, widthOf(its, settings.tabSize) - out)
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
    editor.executeEdits(SPELL_TYPING, edits)
    editor.pushUndoStop()
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
    editor.executeEdits(SPELL_TYPING, [edit], [caret as monaco.Selection])
    this.snapped = { line, before: text }
  }

  /** Give the line the caret snapped on back what it had, if it's still nothing but its indent. */
  private unsnap({ line, before }: Snapped) {
    const model = this.editor.getModel()
    if (!model || line > model.getLineCount()) return
    const text = model.getLineContent(line)
    if (text === before || text.trim()) return
    const range = { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: text.length + 1 }
    this.editor.executeEdits(SPELL_TYPING, [{ range, text: before }])
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
    const change = event.changes[0]!
    const model = this.editor.getModel()
    if (!model || change.rangeLength !== 0 || !/^.$/su.test(change.text)) return
    const languageId = model.getLanguageId()
    const line = change.range.startLineNumber
    const lines = model.getLinesContent()
    const typedAt = change.range.startColumn - 1
    if (this.languages.indents.includes(languageId)) {
      const indent = SpellTyping.indentToAdd(lines, line - 1, typedAt)
      if (indent) return this.help(() => this.indent(line, typedAt, indent))
    }
    if (this.languages.quotes.includes(languageId) && change.text === " ") {
      const lang = SP.Language.langOfFile(model.uri.path) ?? "en"
      if (SpellTyping.opensQuotes(lines, line - 1, lang)) this.help(() => this.openQuotes())
    }
  }

  /**
   * Run `edit` once the keystroke's own edit is done, marked as ours so it isn't taken for typing.
   * - NEVER throws:  a help that fails leaves what was typed, and logs why.
   */
  private help(edit: () => void) {
    queueMicrotask(() => {
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

  /**
   * Write `indent` on `line` before what was typed at `column` (0-based):
   * the same undo step as the letter, so one undo takes back both.
   */
  private indent(line: number, column: number, indent: string) {
    const range = { startLineNumber: line, startColumn: column + 1, endLineNumber: line, endColumn: column + 1 }
    this.editor.executeEdits(SPELL_TYPING, [{ range, text: indent }])
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
      editor.executeEdits(SPELL_TYPING, [{ range, text: '"' }])
      editor.setPosition(caret)
    }
    editor.pushUndoStop()
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

/** A model, with the colouring Monaco keeps for it but leaves out of its types. */
type TokenizedModel = monaco.editor.ITextModel & { tokenization?: { forceTokenization?(line: number): void } }

/** The source of the edits it makes, for Monaco's undo and the editor's listeners. */
const SPELL_TYPING = "spell-typing"

/** What moves the caret onto a line it snaps on:  a click or a key, never code (`"api"`) nor its own edits. */
const MOVED_BY = ["mouse", "keyboard"]

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
