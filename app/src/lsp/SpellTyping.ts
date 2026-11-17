// Import directly to avoid circular import:  `ENTER_RULES` reads them as this file loads
import { MarkupIndent } from "./MarkupIndent"
import { SpellKeywords } from "./SpellKeywords"

/****************
 * ### `SpellTyping`
 * The rules behind the typing helps every editor gives as Spell is typed:  where a letter on a blank line lands,
 * which words open quotes, what a space after a tag writes, where Enter puts the caret ...
 * - Plain functions of the lines and columns, so the app's code editor and its tests decide alike
 *   (epic `codemirror` P1;  the helps themselves:  epic `language` P50, epic `editor` P28).
 *   - Each editor wires them to its own keys and edits:
 *     CodeMirror's `CodeMirrorTyping` (epic `codemirror` P4).
 * - The Enter rules are ONE table (`ENTER_RULES`):  the app's code editor reads it (`CodeMirrorTyping`),
 *   and a test holds VS Code's `language-configuration.json` to it.
 * - Knows nothing of any editor, no CodeMirror, no DOM:
 *   so the language service stays browser-safe and editor-free.
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
   * - `""` before a group's line (`group "Names"`, in language `lang`):  the blank lines there are drawn
   *   outside the group above, so the caret stays at the margin, not in that group's rail (epic `language` I121).
   *   - A letter typed there still takes the indent (`indentToAdd()`):  `group "X"` lands at the group's level.
   */
  static indentToSnap(lines: readonly string[], index: number, lang = "en"): string {
    const text = lines[index] ?? ""
    if (!/^[ \t]*$/.test(text)) return ""
    const next = lines.slice(index + 1).find((line) => line.trim())
    const groupWords = QUOTED_NAME_WORDS[lang]?.groups ?? []
    const nextWord = next
      ?.trim()
      .split(/[\s"“]/u)[0]!
      .toLowerCase()
    if (nextWord && groupWords.includes(nextWord)) return ""
    return indentStillToWrite(lines, index, text)
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
  // ## `|>` closes a tag
  ////////////////

  /**
   * Does the `>` just typed at `column` (0-based) of `lines[index]` follow a `|` that's meant as a tag's `/`?
   * The bubbly look draws a tag's `/>` as a bar and a point, `|⟩`, so a person copying what they see types `|>`
   * (epic `codemirror` T16):  the editor writes `/>` instead.
   * - Only between a tag's attributes (`tagOpenAt()`):  never in a quoted value, in a `{…}` code value, in an
   *   unquoted value (`<x a=b|>`, HTML's), in text or in Spell code.
   * - `|` alone is no part of a tag anywhere in Spell's markup, nor in HTML's outside a value.
   */
  static closesWithBar(lines: readonly string[], index: number, column: number): boolean {
    const text = lines[index] ?? ""
    if (text[column] !== ">" || text[column - 1] !== "|") return false
    const bar = column - 1
    const tag = SpellTyping.tagOpenAt(lines, index, bar)
    if (!tag) return false
    const since = [...lines.slice(tag.line, index), text.slice(0, bar)].join("\n")
    const tagText = since.slice(since.lastIndexOf("<"))
    // in a `{…}` code value:  its braces outside quotes don't match up
    if (bracesOpenIn(tagText)) return false
    // right after an unquoted value's `=`:  the `|` is the value's own
    return !/=[^\s"'{}]*$/.test(tagText)
  }

  ////////////////
  // ## The quoted value at the caret
  ////////////////

  /**
   * The attribute value the caret at `column` (0-based) of `line` is in, inside its quotes:
   * `spacing="x|s"` => `{ from: 9, to: 11 }`, the columns of `xs`.
   * - What an attribute's words show under (`ValuePopups`'s choices) and what a picker writes over:
   *   both ask here, so they agree on where a value is.
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
   * - The app's code editor reads it (`CodeMirrorTyping`).
   * - VS Code's `language-configuration.json` is written by hand, and a test checks it's the same.
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
      return { line: at, start: start.index, nameEnd, firstAttribute: word ? nameEnd + word.index : undefined }
    }
    return undefined
  }

  /**
   * Enter between a tag's attributes, `column` (0-based) of `lines[index]`:  the tag laid out as Prettier lays out a
   * long one (epic `language` I133;  Owen:  "indent all of the attributes the same as prettier would format them").
   * - Its `<` and name stay where they are;  each attribute on a line of its own, a level in from the tag's line.
   * - Its `>` or `/>` at the end of the last attribute's line, with whatever followed it:  `shrinkable>`,
   *   `"cheat" />` (epic `language` I135;  Owen:  "The `>` should be on the same line as the last tag");
   *   the bubbly look draws it at the block's right edge.
   * - A tag already laid out so, or partly:  laid out again the same way;
   *   a `>` alone on a line under its attributes (as I133 laid it out) comes up onto the last one.
   * - The caret:  where it was in the attribute it was in, or at the start of the next;
   *   after the last, on a new line of its own, where the next attribute would go, the `>` after it.
   * - A tag with no `>` yet:  only its lines up to the caret's.
   * - `undefined`:  not between a tag's attributes, or the tag has none.
   */
  static tagLaidOut(
    lines: readonly string[],
    index: number,
    column: number,
    settings: IndentSettings
  ): TagLayout | undefined {
    const tag = SpellTyping.tagOpenAt(lines, index, column)
    if (!tag) return undefined
    const first = lines[tag.line]!
    // what follows its name, its lines joined;  the caret's place in it
    const after = [first.slice(tag.nameEnd), ...lines.slice(tag.line + 1, tag.line + 1 + TAG_LINES_BACK)]
    const starts = after.reduce<number[]>(
      (all, line, at) => [...all, at ? all[at - 1]! + after[at - 1]!.length + 1 : 0],
      []
    )
    const caret = starts[index - tag.line]! + (index === tag.line ? column - tag.nameEnd : column)
    let { words, close } = tagWords(after.join("\n"))
    // no `>` yet:  only up to the caret's line, the lines under it left alone
    if (!close) ({ words } = tagWords(after.slice(0, index - tag.line + 1).join("\n")))
    if (!words.length) return undefined
    const lastLine = close ? starts.findLastIndex((start) => start <= close!.at) : index - tag.line
    const indent = SpellTyping.indentOf(first)
    const inside = indent + (settings.insertSpaces ? " ".repeat(settings.tabSize) : "\t")
    const laidOut = [first.slice(0, tag.nameEnd).trimEnd(), ...words.map((word) => inside + word.text)]
    // the caret:  in the word it's in, or before the next;  after the last, on a line of its own
    let at = words.findIndex((word) => word.at + word.text.length > caret)
    const offset = at < 0 ? 0 : Math.max(0, caret - words[at]!.at)
    if (at < 0) {
      at = words.length
      laidOut.push(inside)
    }
    if (close) {
      // `shrinkable>`, `"cheat" />`:  a space before a `/>`, as a tag that closes itself is written (I70 C4)
      const rest = after[lastLine]!.slice(close.at + close.text.length - starts[lastLine]!)
      const space = close.text === "/>" && laidOut.at(-1)!.trim() ? " " : ""
      laidOut[laidOut.length - 1] += space + close.text + rest
    }
    return {
      from: tag.line,
      to: tag.line + lastLine,
      lines: laidOut,
      caret: { line: tag.line + 1 + at, column: inside.length + offset }
    }
  }

  /**
   * Backspace at the start of a tag's attribute line, right after its indent (epic `language` I133;  Owen:
   * "backspace with cursor here should move `appearance` back to the line above, with a space between"):
   * the line joins the one above, its indent gone, a space between;  none before a `>`, as `shrinkable>` is written.
   * - The `>` stays at the end of the last attribute's line (I135):  a `>` or `/>` alone on the line under the joined
   *   one (as I133 laid a tag out) comes up onto it.
   * - `undefined`:  not at the start of a tag's attribute line.
   */
  static tagLineJoined(lines: readonly string[], index: number, column: number): TagLayout | undefined {
    const line = lines[index] ?? ""
    if (!index || column !== SpellTyping.indentOf(line).length || !line.trim()) return undefined
    const tag = SpellTyping.tagOpenAt(lines, index, 0)
    if (!tag) return undefined
    const above = lines[index - 1]!.trimEnd()
    const joined = joinedTagLine(above, line)
    const next = lines[index + 1] ?? ""
    const closesAlone = /^\s*\/?>/.test(next) && isStillOpen(line)
    return {
      from: index - 1,
      to: closesAlone ? index + 1 : index,
      lines: [closesAlone ? joinedTagLine(joined, next) : joined],
      caret: { line: index - 1, column: joined.length - line.trim().length }
    }
  }

  /**
   * Where Enter before a comment after code splits `text`, the caret at `column` (0-based), if it's there
   * (epic `editor` I155;  epic `codemirror` I24):  the code before it stays, the comment goes on its own line.
   * - The caret anywhere in the gap between the code and the comment, or between the comment's two dashes:
   *   the bubbly look draws `--` as ONE dash, `—`, so a click on it can put the caret inside it.
   * - `codeEnd`:  the column just after the code, its tabs and spaces off;  `commentStart`:  the comment's `--` or `//`
   * - `undefined`:  no code before the caret, or no comment after it.
   * - Any head:  a group's, a type's, an action's, an event's, a property's.
   */
  static commentSplitAt(text: string, column: number): CommentSplit | undefined {
    const isInDashes = column > 0 && text.startsWith("--", column - 1) && text[column - 2] !== "-"
    const at = isInDashes ? column - 1 : column
    const before = text.slice(0, at)
    const after = text.slice(at)
    if (!SpellKeywords.CODE_BEFORE.test(before) || !SpellKeywords.COMMENT_AFTER.test(after)) return undefined
    return { codeEnd: before.trimEnd().length, commentStart: at + SpellTyping.indentOf(after).length }
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

/** Where Enter before a comment after code splits its line:  `SpellTyping.commentSplitAt()`'s. */
export type CommentSplit = {
  /** column just after the code, the tabs and spaces after it left off */
  codeEnd: number
  /** column of the comment's `--` or `//` */
  commentStart: number
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
  /** start a group of a type's members:  `group "Rank"` */
  groups: string[]
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
  en: { types: ["a", "an"], members: ["group", "its", "it"], properties: ["its"], choices: ["it"], groups: ["group"] },
  es: {
    types: ["un", "una"],
    members: ["grupo", "su", "sus"],
    properties: ["su", "sus"],
    choices: [],
    groups: ["grupo"]
  }
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
  /** column (0-based) of its `<` on that line */
  start: number
  /** column just after its name on that line */
  nameEnd: number
  /** column (0-based) of the first word after its name on that line;  `undefined` when the name ends the line */
  firstAttribute: number | undefined
}

/** Lines `from` ... `to` (indexes) written as `lines`, and where the caret goes:  `SpellTyping.tagLaidOut()`'s ... */
export type TagLayout = {
  /** index of the first line it replaces */
  from: number
  /** index of the last */
  to: number
  /** what's written in their place */
  lines: string[]
  /** where the caret goes, in the file as written:  a line's index and a column (0-based) */
  caret: { line: number; column: number }
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

/** Is a `{…}` still open at the end of `text`:  more `{` than `}`, outside quotes? */
function bracesOpenIn(text: string): boolean {
  let quote = ""
  let depth = 0
  for (const char of text) {
    if (quote) {
      if (char === quote) quote = ""
    } else if (char === '"' || char === "'") quote = char
    else if (char === "{") depth++
    else if (char === "}") depth = Math.max(0, depth - 1)
  }
  return depth > 0
}

/**
 * The words of a tag after its name, `text`:  each attribute (`size="small"`, `inverted`, `{x}`, `"stock"`),
 * where it starts in `text`, and the `>` or `/>` that ends the tag, if there's one yet.
 * - A word ends at a space or a line's end outside quotes and braces, or at the tag's end:  `shrinkable>`.
 */
function tagWords(text: string): { words: Array<{ text: string; at: number }>; close?: { text: string; at: number } } {
  const words: Array<{ text: string; at: number }> = []
  let at = 0
  const isEnd = (from: number) => text[from] === ">" || text.startsWith("/>", from)
  while (at < text.length) {
    while (/\s/.test(text[at] ?? "")) at++
    if (at >= text.length) break
    if (isEnd(at)) return { words, close: { text: text[at] === ">" ? ">" : "/>", at } }
    const start = at
    let quote = ""
    let braces = 0
    for (; at < text.length; at++) {
      const char = text[at]!
      if (quote) {
        if (char === quote) quote = ""
      } else if (char === '"' || char === "'") quote = char
      else if (char === "{") braces++
      else if (char === "}") braces = Math.max(0, braces - 1)
      else if (!braces && (/\s/.test(char) || isEnd(at))) break
    }
    words.push({ text: text.slice(start, at), at: start })
  }
  return { words }
}

/** `line` after `above`, a tag's lines joined:  its indent gone, a space between, none before a `>`. */
function joinedTagLine(above: string, line: string): string {
  const words = line.trim()
  return above.trimEnd() + (words.startsWith(">") ? "" : " ") + words
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
