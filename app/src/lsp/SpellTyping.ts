// Import directly to avoid circular import:  `ENTER_RULES` reads them as this file loads
import { MarkupIndent } from "./MarkupIndent"
import { SpellKeywords } from "./SpellKeywords"

/****************
 * ### `SpellTyping`
 * The rules behind the typing helps every editor gives as Spell is typed:  where a letter on a blank line lands,
 * which words open quotes, what a space after a tag writes, where Enter puts the caret ...
 * - Plain functions of the lines and columns, so the app's code editor and its tests decide alike
 *   (epic `codemirror` P1;  the helps themselves:  epic `language` P50, epic `editor` P28).
 *   - Each editor wires them to its own keys and edits:  CodeMirror's `CodeMirrorTyping`
 *     (epic `codemirror` P4).
 * - The Enter rules are ONE table (`ENTER_RULES`):  the app's code editor reads it (`CodeMirrorTyping`),
 *   and a test holds VS Code's `language-configuration.json` to it.
 * - Knows nothing of any editor:  no CodeMirror, no DOM, so the language service stays browser-safe and
 *   editor-free.
 ****************/
export class SpellTyping {
  ////////////////
  // ## A blank line takes its body's indent
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

  ////////////////
  // ## A space opens quotes, or finishes a tag
  ////////////////

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
   * - What the space then writes is the language service's (`CompletionShapes.spaceAfterTag()`).
   */
  static tagBeforeSpace(lines: readonly string[], index: number, column: number): string | undefined {
    const text = lines[index] ?? ""
    if (text[column] !== " ") return undefined
    const name = /<([\p{L}\p{M}][\p{L}\p{M}\d_-]*)$/u.exec(text.slice(0, column))?.[1]
    if (!name || !NOTHING_MORE_OF_THE_TAG.test(text.slice(column + 1))) return undefined
    return name
  }

  ////////////////
  // ## The quoted value at the caret
  ////////////////

  /**
   * The attribute value the caret at `column` (0-based) of `line` is in, inside its quotes:
   * `spacing="x|s"` => `{ from: 9, to: 11 }`, the columns of `xs`.
   * - What an attribute's words show under (`ValuePopups`'s choices) and what a picker writes over:
   *   both editors ask here, so they agree on where a value is.
   * - On the caret's line only, as an attribute's value is;  a name and `="` right before it,
   *   so a quoted name (`group "Rank"`) isn't one.
   * - `end`:
   *   - `closing-quote` (the default):  only a value whose closing quote is written
   *   - `closing-quote-or-caret`:  one still being typed, with no closing quote yet, runs to the caret
   */
  static quotedValueAt(line: string, column: number, end: QuotedValueEnd = "closing-quote"): QuotedValue | undefined {
    const open = ATTRIBUTE_VALUE_OPEN.exec(line.slice(0, column))
    if (!open) return undefined
    const from = line.indexOf('"', open.index) + 1
    const close = line.indexOf('"', column)
    if (close >= 0) return { from, to: close }
    return end === "closing-quote-or-caret" ? { from, to: column } : undefined
  }

  ////////////////
  // ## Enter
  ////////////////

  /**
   * What Enter does in Spell, by the text round the caret:  ONE table, first match wins (epic `editor` I65, I155;
   * epic `language` P55).
   * - Every rule keeps the line's own indent, then adds what its `indent` says.
   * - The app's code editor reads it (`CodeMirrorTyping`);  VS Code's
   *   `language-configuration.json` is written by hand, and a test checks it's the same.
   */
  static ENTER_RULES: readonly EnterRule[] = [
    // between `<x>` and `</x>`:  the caret a level in, the closing tag on its own line
    { beforeText: SpellKeywords.OPENS_TAG, afterText: SpellKeywords.CLOSES_TAG, indent: "indentOutdent" },
    { beforeText: SpellKeywords.OPENS_TAG, indent: "indent" },
    // a comment after code goes on its own line, a level in (epic `editor` I155)
    { beforeText: SpellKeywords.CODE_BEFORE, afterText: SpellKeywords.COMMENT_AFTER, indent: "indent" },
    { beforeText: /:\s*$/, indent: "indent" },
    // a condition going on onto the next line (epic `language` P55, Q53)
    { beforeText: SpellKeywords.CONTINUES_LINE, indent: "indent" }
  ]

  /** The Enter rule for the caret between `before` and `after` on its line, if one applies (`ENTER_RULES`). */
  static enterRuleFor(before: string, after: string): EnterRule | undefined {
    return SpellTyping.ENTER_RULES.find(
      (rule) => rule.beforeText.test(before) && (!rule.afterText || rule.afterText.test(after))
    )
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
   * The indent a comment after the code on `lines[index]` takes on its own line (I161):  the level of the body under
   * that line, so the body still reads as its body.
   * - The next non-blank line's indent, when it's further in than the line's:  its body's first line.
   * - Else a level in from the line's, in the file's tabs or spaces:  a body of only that comment.
   */
  static commentIndent(lines: readonly string[], index: number, settings: IndentSettings): string {
    const own = SpellTyping.indentOf(lines[index] ?? "")
    const next = lines.slice(index + 1).find((line) => line.trim())
    const body = next === undefined ? "" : SpellTyping.indentOf(next)
    if (SpellTyping.widthOf(body, settings.tabSize) > SpellTyping.widthOf(own, settings.tabSize)) return body
    return own + (settings.insertSpaces ? " ".repeat(settings.tabSize) : "\t")
  }

  /** How many tabs and spaces end `text`:  the ones Enter leaves at the end of the line it splits (I160). */
  static spaceAtEnd(text: string): number {
    return /[ \t]*$/.exec(text)![0].length
  }

  ////////////////
  // ## A paste takes its indent
  ////////////////

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
      lines[lines.length - 1] = SpellTyping.indentOfWidth(SpellTyping.pasteBase(before, pasted[0]!, settings), settings)
    return lines
  }

  /** The indent width a paste lands at:  the caret's, when it's in a line's indent, else its line's (or the paste's). */
  private static pasteBase(before: string, first: string, { tabSize }: IndentSettings): number {
    const isIndent = !!before && !before.trim()
    return isIndent
      ? SpellTyping.widthOf(before, tabSize)
      : SpellTyping.widthOf(SpellTyping.indentOf(before || first), tabSize)
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
      const indent = (width: number) => SpellTyping.indentOfWidth(width, settings)
      const [, ...rest] = MarkupIndent.layout(pasted, { base, tabSize, indentOfWidth: indent })
      return [firstLine, ...rest]
    }
    const from = SpellTyping.widthOf(SpellTyping.indentOf(first), tabSize)
    const rest = pasted.slice(1).map((line) => {
      if (!line.trim()) return ""
      const width = Math.max(0, base + SpellTyping.widthOf(SpellTyping.indentOf(line), tabSize) - from)
      return SpellTyping.indentOfWidth(width, settings) + line.trimStart()
    })
    return [firstLine, ...rest]
  }

  ////////////////
  // ## A line moved out takes what's under it
  ////////////////

  /**
   * How many lines after `lines[index]` sit under it, and so move with it:
   * the ones indented further (blank lines among them, not after them), then its closing tag if it opens one.
   */
  static linesUnder(lines: readonly string[], index: number): number {
    const text = lines[index] ?? ""
    const indent = SpellTyping.indentOf(text).length
    let under = 0
    for (let at = index + 1; at < lines.length; at++) {
      const line = lines[at]!
      if (!line.trim()) continue
      if (SpellTyping.indentOf(line).length <= indent) {
        const closes =
          SpellTyping.indentOf(line) === SpellTyping.indentOf(text) &&
          line.trim().startsWith("</") &&
          MarkupIndent.depthChange(text) > 0
        if (closes) under = at - index
        break
      }
      under = at - index
    }
    return under
  }

  /** Is `text` a comment line, `-- ...` or `// ...`?  It moves alone:  what's under it is the line above's body (I161). */
  static isComment(text: string): boolean {
    return SpellKeywords.COMMENT_AFTER.test(text)
  }

  ////////////////
  // ## Indents
  ////////////////

  /** `line`'s indent:  its leading tabs and spaces. */
  static indentOf(line: string): string {
    return /^[ \t]*/.exec(line)![0]
  }

  /** How wide `indent` is, a tab `tabSize` columns. */
  static widthOf(indent: string, tabSize: number): number {
    return MarkupIndent.widthOf(indent, tabSize)
  }

  /** How wide one level out takes off `indent`:  back to the tab stop before its end. */
  static outdentWidth(indent: string, tabSize: number): number {
    const width = SpellTyping.widthOf(indent, tabSize)
    return width % tabSize ? width - (width % tabSize) : Math.max(0, width - tabSize)
  }

  /** An indent `width` columns wide, in the file's tabs or spaces. */
  static indentOfWidth(width: number, { insertSpaces, tabSize }: IndentSettings): string {
    if (insertSpaces) return " ".repeat(width)
    return "\t".repeat(Math.floor(width / tabSize)) + " ".repeat(width % tabSize)
  }
}

////////////////
// ## Types and helpers
////////////////

/** One of Spell's Enter rules (`SpellTyping.ENTER_RULES`):  VS Code's `onEnterRules` shape, editor-neutral. */
export type EnterRule = {
  /** the text before the caret on its line */
  beforeText: RegExp
  /** the text after it, when the rule asks */
  afterText?: RegExp
  /**
   * - `indent`:  the new line a level in from the line's
   * - `indentOutdent`:  the caret on a line a level in, what was after it on a line of its own at the line's level
   */
  indent: "indent" | "indentOutdent"
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

/** A tag `SpellTyping.tagOpenAt()` found open:  the line it starts on, and its first attribute's column there. */
export type OpenTag = {
  /** index of the line the tag starts on */
  line: number
  /** column (0-based) of the first word after its name on that line;  `undefined` when the name ends the line */
  firstAttribute: number | undefined
}

/** An attribute value `SpellTyping.quotedValueAt()` found:  the columns (0-based) of its text, inside its quotes. */
export type QuotedValue = {
  /** column of its first character, just after the opening quote */
  from: number
  /** column just after its last:  the closing quote's, or the caret's when it has none yet */
  to: number
}

/** Where a quoted value ends, for `SpellTyping.quotedValueAt()`:  at its closing quote only, or at the caret too. */
export type QuotedValueEnd = "closing-quote" | "closing-quote-or-caret"

/** An attribute's name and its opening quote, then its value up to the caret:  `spacing="x`. */
const ATTRIBUTE_VALUE_OPEN = /[\p{L}\p{M}\d-]="[^"]*$/u

/** How far back `SpellTyping.tagOpenAt()` looks for the tag's start:  a tag's attributes span a few lines at most. */
const TAG_LINES_BACK = 20

/** A tag's start, `<` and its name:  `<container`, `<ui-button`;  never a closing tag's `</`. */
const TAG_START = /<[\p{L}][\p{L}\p{M}\d_.:-]*/gu

/** What's after a tag's name when none of the rest of it is written yet:  the line's end, or another tag. */
const NOTHING_MORE_OF_THE_TAG = /^\s*(?:<|$)/

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

/**
 * What's still to write of the next non-blank line's indent after `before`, the start of `lines[index]`:
 * `""` when `before` isn't the start of it, or is all of it.
 */
function indentStillToWrite(lines: readonly string[], index: number, before: string): string {
  const next = lines.slice(index + 1).find((line) => line.trim())
  const indent = next ? SpellTyping.indentOf(next) : ""
  return indent.length > before.length && indent.startsWith(before) ? indent.slice(before.length) : ""
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
    const its = SpellTyping.indentOf(text).length
    if (its < indent) return { text, indent: its }
  }
  return undefined
}
