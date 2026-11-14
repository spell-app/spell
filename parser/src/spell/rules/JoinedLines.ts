import { P } from "spell/parser/parser"
import { Wording } from "spell/parser/spell/rules/expressions"

/**
 * A condition said over several lines, joined into ONE line before it's read (epic `language` P55, Q53 A):
 * - A line ending in `and` or `or` goes on onto the line indented under it, as an inline `if` takes its body:
 *
 *   ```spell
 *   its color is not the color of the card and
 *   	its value is the value of the card + 1
 *   ```
 *
 *   - Indented by spaces past the tab stop, as the editor puts it (under the line's first word), the same:
 *     the steps under it are its body.
 *   - Each continued line may end in one too, and go on again.
 *   - What's indented under the last of them is the statement's body, as it would be under the first:
 *     `if it is empty and`, then `the card is a king`, then its steps under that.
 * - A line of just `and` or `or` joins the lines on either side, each in parentheses:
 *
 *   ```spell
 *   it is droppable when
 *   	it is empty and the card is a king
 *   	or
 *   	its color is not the color of the card and its value is the value of the card + 1
 *   ```
 *
 *   is `(isEmpty && card.isAKing) || (this.color !== card.color && ...)`.
 * - Everywhere a line is read:  an `if`, a `while`, a `when` rule's body, a `return`, a question's body.
 * - The words are the language's `and_or` word rule's:  Spanish's `y` and `o`.
 * - Only how the lines are cut changes:  the tokens are the lines' own, so every rule reads the joined line as it reads
 *   one written whole.  A part's parentheses are tokens of no width, at its start and its end.
 * - What doesn't fit the shape (a lone `or` with nothing after it, a part with a body of its own) is left as it is,
 *   its lines read one by one, as before.
 * - NEVER imports `Block`:  `Block.parse()` calls it on its items.
 */
export class JoinedLines {
  /**
   * `items`, a block's lines and nested blocks, with each condition said over several lines joined into one line.
   * - Returns `items` itself when nothing joins, so a block with none pays one scan.
   */
  static of(scope: P.Scope, items: (P.LineToken | P.BlockToken)[]): (P.LineToken | P.BlockToken)[] {
    if (!items.some((item) => item instanceof P.LineToken && JoinedLines.lastWordJoins(scope, item))) return items
    const continued = JoinedLines.continued(scope, items)
    return JoinedLines.lonesJoined(scope, continued)
  }

  ////////////////
  // ## A line ending in `and` / `or`
  ////////////////

  /** `items` with each line ending in `and` / `or`, and the block under it, one line (then the body, if any). */
  private static continued(scope: P.Scope, items: (P.LineToken | P.BlockToken)[]): (P.LineToken | P.BlockToken)[] {
    const out: (P.LineToken | P.BlockToken)[] = []
    for (let index = 0; index < items.length; index++) {
      const item = items[index]!
      const next = items[index + 1]
      if (item instanceof P.LineToken && next instanceof P.BlockToken && JoinedLines.endsWithJoin(scope, item)) {
        const joined = JoinedLines.joinBelow(scope, item, next)
        if (joined) {
          out.push(...joined)
          index++
          continue
        }
      }
      out.push(item)
    }
    return out
  }

  /**
   * `line`, ending in `and` / `or`, joined with the line indented under it in `below` -- then what's under that, its
   * body;  `undefined` unless `below` has that shape.
   * - The continued line may be deeper than the body (spaces past the tab stop, as the editor indents it):
   *   then it's a block of its own, first in `below`, and `below`'s other lines are the body.
   * - That line may end in one too:  it goes on onto the block under it, the same way.
   */
  private static joinBelow(
    scope: P.Scope,
    line: P.LineToken,
    below: P.BlockToken
  ): (P.LineToken | P.BlockToken)[] | undefined {
    const [first, ...rest] = below.tokens
    let continued: P.LineToken
    let body: P.BlockToken | undefined
    if (first instanceof P.LineToken) {
      continued = first
      if (rest.length > 1 || (rest[0] && !(rest[0] instanceof P.BlockToken))) return undefined
      body = rest[0] as P.BlockToken | undefined
    } else {
      // deeper than the body:  a block of one line (a block per tab stop it's past), the body's lines after it
      const only = first && JoinedLines.soleLineOf(first)
      if (!only) return undefined
      continued = only
      if (rest.length) body = JoinedLines.blockOf(below, rest)
    }
    const joined = JoinedLines.lineOf(line, [...JoinedLines.spaced(JoinedLines.codeOf(line)), ...continued.tokens], continued)
    if (body && JoinedLines.endsWithJoin(scope, continued)) return JoinedLines.joinBelow(scope, joined, body)
    return body ? [joined, body] : [joined]
  }

  /** The one line `block` holds, however many blocks deep (one per tab stop it's past) -- `undefined` if not one. */
  private static soleLineOf(block: P.BlockToken): P.LineToken | undefined {
    let current: P.LineToken | P.BlockToken = block
    while (current instanceof P.BlockToken) {
      if (current.tokens.length !== 1) return undefined
      current = current.tokens[0]!
    }
    return current
  }

  /**
   * `tokens`, the last a copy with a space after it:  it ended its line, so it had none, and the joined line's text
   * (`and its value ...`) needs one.
   */
  private static spaced(tokens: P.Token[]): P.Token[] {
    const last = tokens.at(-1)
    if (!last || last.whitespace) return tokens
    const Token = last.constructor as new (record: P.TokenProps) => P.Token
    return [...tokens.slice(0, -1), new Token({ ...last.record, whitespace: " " })]
  }

  /** A block of `tokens`, part of `block`:  from the first of them. */
  private static blockOf(block: P.BlockToken, tokens: (P.LineToken | P.BlockToken)[]): P.BlockToken {
    const [first] = tokens
    return new P.BlockToken({ ...block.record, start: first!.start, line: first!.line, ch: first!.ch, tokens })
  }

  ////////////////
  // ## A line of just `and` / `or`
  ////////////////

  /** `items` with each run of `part`, lone `and` / `or`, `part` ... one line, each part in parentheses. */
  private static lonesJoined(scope: P.Scope, items: (P.LineToken | P.BlockToken)[]): (P.LineToken | P.BlockToken)[] {
    const out: (P.LineToken | P.BlockToken)[] = []
    for (let index = 0; index < items.length; index++) {
      const item = items[index]!
      if (!(item instanceof P.LineToken) || !JoinedLines.isPart(item)) {
        out.push(item)
        continue
      }
      // `part (lone part)+`:  each lone word a line of its own between two parts
      const run: P.LineToken[] = [item]
      while (
        JoinedLines.isLone(scope, items[index + run.length]) &&
        JoinedLines.isPart(items[index + run.length + 1])
      ) {
        run.push(items[index + run.length] as P.LineToken, items[index + run.length + 1] as P.LineToken)
      }
      if (run.length === 1) {
        out.push(item)
        continue
      }
      const tokens = run.flatMap((each, at) =>
        at % 2 ? JoinedLines.spaced(each.tokens) : JoinedLines.spaced(JoinedLines.inParentheses(each))
      )
      out.push(JoinedLines.lineOf(item, tokens, run.at(-1)!))
      index += run.length - 1
    }
    return out
  }

  /** Is `item` a line of just `and` or `or`? */
  private static isLone(scope: P.Scope, item: P.LineToken | P.BlockToken | undefined): boolean {
    if (!(item instanceof P.LineToken) || item.tokens.length !== 1) return false
    return JoinedLines.joins(scope, item.tokens[0]!)
  }

  /** Is `item` a line of code that may be a part:  a line, not blank, with no comment. */
  private static isPart(item: P.LineToken | P.BlockToken | undefined): item is P.LineToken {
    return item instanceof P.LineToken && item.tokens.length > 0 && !item.tokens.some((it) => it instanceof P.CommentToken)
  }

  /** `line`'s tokens, a zero-width `(` before them and `)` after. */
  private static inParentheses(line: P.LineToken): P.Token[] {
    const { tokens } = line
    const at = (token: P.Token, where: "start" | "end") =>
      new P.SymbolToken({ start: where === "start" ? token.start : token.end, raw: "", value: where === "start" ? "(" : ")", whitespace: " " })
    return [at(tokens[0]!, "start"), ...tokens, at(tokens.at(-1)!, "end")]
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** Does any line of `items` end in, or consist of, a joining word?  Cheap:  the last token only. */
  private static lastWordJoins(scope: P.Scope, line: P.LineToken): boolean {
    const last = JoinedLines.codeOf(line).at(-1)
    return !!last && JoinedLines.joins(scope, last)
  }

  /** Does `line` end in `and` / `or`, after a word of its own (not a lone one)? */
  private static endsWithJoin(scope: P.Scope, line: P.LineToken): boolean {
    const code = JoinedLines.codeOf(line)
    return code.length > 1 && JoinedLines.joins(scope, code.at(-1)!)
  }

  /** Is `token` a joining word, `and` or `or` in the language's words (`and_or`)? */
  private static joins(scope: P.Scope, token: P.Token): boolean {
    return token instanceof P.WordToken && Wording.lengthAt(scope, "and_or", [token]) === 1
  }

  /** `line`'s tokens, without a comment at its end. */
  private static codeOf(line: P.LineToken): P.Token[] {
    const { tokens } = line
    return tokens.at(-1) instanceof P.CommentToken ? tokens.slice(0, -1) : tokens
  }

  /**
   * A line from `first`'s start to `last`'s end, holding `tokens`:  `first`'s indent, `last`'s newline.
   * - `first`'s comment, if it had one, goes at the joined line's end.
   */
  private static lineOf(first: P.LineToken, tokens: P.Token[], last: P.LineToken): P.LineToken {
    const comment = first.tokens.at(-1) instanceof P.CommentToken ? [first.tokens.at(-1)!] : []
    const all = [...tokens.filter((token) => !comment.includes(token)), ...comment]
    return new P.LineToken({ ...first.record, tokens: all, newline: last.record.newline })
  }
}
