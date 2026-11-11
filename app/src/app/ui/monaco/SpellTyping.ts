import { SP } from "spell/parser/spell"
import type { monaco } from "./monaco"

/****************
 * ### `SpellTyping`
 * Two helps as a person types Spell in a Monaco editor (epic `language` P50), so what they see is what they type.
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
 * - One per editor, made as each editor is (`SpellMonaco.register()`).
 * - Only Monaco's TYPE (`import type`):  its rules are plain functions of the lines, tested without an editor.
 ****************/
export class SpellTyping {
  constructor(
    private readonly editor: monaco.editor.ICodeEditor,
    private readonly languages: SpellTypingLanguages
  ) {
    editor.onDidChangeModelContent((event) => this.typed(event))
  }

  /** What one keystroke wrote:  indent its line, or open a name's quotes, after it's in. */
  private typed(event: monaco.editor.IModelContentChangedEvent) {
    if (this.isHelping || event.isUndoing || event.isRedoing || event.isFlush || event.changes.length !== 1) return
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
    const next = lines.slice(index + 1).find((line) => line.trim())
    const indent = next ? indentOf(next) : ""
    return indent.length > before.length && indent.startsWith(before) ? indent.slice(before.length) : ""
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

/** A model, with the colouring Monaco keeps for it but leaves out of its types. */
type TokenizedModel = monaco.editor.ITextModel & { tokenization?: { forceTokenization?(line: number): void } }

/** The source of the edits it makes, for Monaco's undo and the editor's listeners. */
const SPELL_TYPING = "spell-typing"

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
