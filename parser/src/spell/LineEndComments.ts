/**
 * A note written at the end of a line of code, `load its sound  // so Hear it plays it at once`:  the old way, which
 * Spell warns about, and how to move it to where notes go now (epic `language` T166;  Owen, 2026-11-18):
 * "deprecating the `//` on the same line ... convert to `--` comments on the first line after the thing".
 * - A note goes on the first line INSIDE the thing it's about, starting `--`:
 *   for a declaration, that's its description (epic `language` P48).
 *
 *   ```text
 *   its "primary image" is text  // an address        its "primary image" is text
 *                                               =>       -- an address
 *   ```
 *
 * - A line with lines indented under it gets the note as the first of them, at their indent;
 *   a line with none, a new line one tab further in.
 * - Only `//`:  a `--` at a line's end stays, as it's how a drawing says what it draws (`to draw its placeholder
 *   -- a grey ace`) and how a type's line is described (`a "card image" is a view  -- A card's picture`).
 * - Not a line holding markup:  a line indented under one is more markup, never a note.
 *   A page's prose and `<!-- -->` comments are tokens of their own kind, never these.
 * - Read from tokens, so a `//` in a string, an address or a `<markdown>` code block is never one.
 * - The warning is `BlockLine`'s, as it reads the line;  the moves are the language server's quick fix and
 *   `spell lint --fix`'s.
 * - Plain text and tokens in, plain edits out:  static and instance-free on purpose.
 */
import { P } from "spell/parser/parser"

/** How a note starts now. */
const NOTE_START = "--"

/** How the old line-end note starts. */
const OLD_NOTE_START = "//"

/** An edit of a file's text:  `start` to `end` replaced by `newText`, offsets from 0. */
export type LineEndCommentEdit = { start: number; end: number; newText: string }

export class LineEndComments {
  /**
   * The old line-end note ending `line`, `// ...` after its code -- `undefined` if it doesn't end in one.
   * - A plain `CommentToken` written `//`, after other tokens, none of them markup.
   */
  static endingLine(line: P.LineToken): P.CommentToken | undefined {
    const { tokens } = line
    const last = tokens.at(-1)
    if (tokens.length < 2 || !LineEndComments.isOldNote(last)) return undefined
    const holdsMarkup = tokens.some((token) => token instanceof P.JSXToken || token instanceof P.JSXFragmentToken)
    return holdsMarkup ? undefined : last
  }

  /** Every old line-end note in `tokens`, a file's, in the order they're written. */
  static in(tokens: P.Token[]): P.CommentToken[] {
    const found: P.CommentToken[] = []
    P.Tokenizer.forEachToken(tokens, (token) => {
      const comment = token instanceof P.LineToken ? LineEndComments.endingLine(token) : undefined
      if (comment) found.push(comment)
    })
    return found
  }

  /**
   * The edits moving `comment`, an old line-end note of `text`, to the first line inside its line:
   * its `//` and the spaces before it gone, a `-- ...` line put under it.
   * - At the indent of the lines under it, if any;  else one deeper than its own, a tab (or the spaces its file
   *   indents with).
   * - Its words as written, trimmed:  `// so it runs` => `-- so it runs`.
   */
  static moved(text: string, comment: P.CommentToken): LineEndCommentEdit[] {
    const { start } = comment
    const lineStart = text.lastIndexOf("\n", start - 1) + 1
    const codeEnd = lineStart + text.slice(lineStart, start).trimEnd().length
    const newline = text.indexOf("\n", start)
    const lineEnd = newline < 0 ? text.length : newline
    const indent = /^[ \t]*/.exec(text.slice(lineStart))![0]
    const note = `${NOTE_START} ${String(comment.value ?? "").trim()}`.trimEnd()
    const under = LineEndComments.indentUnder(text, lineEnd, indent)
    return [
      { start: codeEnd, end: lineEnd, newText: "" },
      {
        start: lineEnd,
        end: lineEnd,
        newText: `\n${under ?? indent + LineEndComments.indentStep(text, indent)}${note}`
      }
    ]
  }

  /** Is `token` a plain comment written `//`? */
  private static isOldNote(token: P.Token | undefined): token is P.CommentToken {
    return token?.constructor === P.CommentToken && (token as P.CommentToken).commentSymbol === OLD_NOTE_START
  }

  /** The indent of the first line after `lineEnd` that isn't blank, if it's deeper than `indent`. */
  private static indentUnder(text: string, lineEnd: number, indent: string): string | undefined {
    for (const line of text.slice(lineEnd + 1).split("\n")) {
      if (!line.trim()) continue
      const itsIndent = /^[ \t]*/.exec(line)![0]
      return itsIndent.length > indent.length && itsIndent.startsWith(indent) ? itsIndent : undefined
    }
    return undefined
  }

  /** One step of indent, as `text` writes them:  a tab, unless the line is indented with spaces. */
  private static indentStep(text: string, indent: string): string {
    if (indent.includes("\t") || !indent) return /^\t/m.test(text) || !/^ +\S/m.test(text) ? "\t" : "  "
    return "  "
  }
}
