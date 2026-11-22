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
 *   - Each continued line may end in one too, and go on again:  onto the line after it, at its indent,
 *     or onto a line indented under it (epic `language` T135).
 *   - What's indented under the last of them is the statement's body, as it would be under the first:
 *     `if it is empty and`, then `the card is a king`, then its steps under that.
 * - Lines indented under a line, STARTING with `and` or `or`, go on from it, any number of them (Owen's T135):
 *
 *   ```spell
 *   the foundation's suit is the suit of the card
 *   	and the foundation's value is the card's value - 1
 *   	and the card is the last item of the card's pile
 *   ```
 *
 *   - What's indented under the last of them is the statement's body:  `if a`, `and b`, then its steps under that.
 * - A comment among those lines doesn't end them (epic `language` I181):  it goes first in what's under the joined line.
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
    if (!items.some((item, at) => JoinedLines.mayJoin(scope, item, items[at - 1]))) return items
    const continued = JoinedLines.continued(scope, items)
    return JoinedLines.lonesJoined(scope, continued)
  }

  ////////////////
  // ## A line going on onto the lines indented under it
  ////////////////

  /**
   * `items` with each line that goes on onto the block under it (ending in `and` / `or`, or the block's lines starting
   * with one) one line, then the body, if any.
   */
  private static continued(scope: P.Scope, items: (P.LineToken | P.BlockToken)[]): (P.LineToken | P.BlockToken)[] {
    const out: (P.LineToken | P.BlockToken)[] = []
    for (let index = 0; index < items.length; index++) {
      const item = items[index]!
      const next = items[index + 1]
      if (item instanceof P.LineToken && next instanceof P.BlockToken) {
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
   * `line` joined with the lines indented under it in `below` that go on from it -- then what's under those, its
   * body;  `undefined` unless `below` starts with such a line.
   * - A line goes on from the one above when that one ends in `and` / `or`, or when it STARTS with one:
   *   `the card is the last item of the card's pile`, then `and its suit is the suit of the card` under it.
   *   - Any number of them, at the same indent:  each goes on from the one before.
   * - A continued line may be deeper than the body (spaces past the tab stop, as the editor indents it):
   *   then it's a block of its own in `below`, and `below`'s lines after it are the body.
   * - The last may end in one too:  it goes on onto the block under it, the same way.
   */
  private static joinBelow(
    scope: P.Scope,
    line: P.LineToken,
    below: P.BlockToken
  ): (P.LineToken | P.BlockToken)[] | undefined {
    const items = below.tokens
    const lines: P.LineToken[] = [line]
    // the comments among them:  first in what's under the joined line
    const notes: P.LineToken[] = []
    let passed: P.LineToken[] = []
    let taken = 0
    let deeper = false
    for (let index = 0; index < items.length; index++) {
      const item = items[index]!
      const held = item instanceof P.LineToken ? [item] : JoinedLines.linesOf(item)
      if (!held) break
      const isNote = (each: P.LineToken) => JoinedLines.isNote(scope, each)
      const more = held.filter((each) => !isNote(each))
      passed.push(...held.filter(isNote))
      if (!more.length) continue
      if (!more.every((each, at) => JoinedLines.goesOn(scope, at ? more[at - 1]! : lines.at(-1)!, each))) break
      lines.push(...more)
      notes.push(...passed)
      passed = []
      taken = index + 1
      deeper = item instanceof P.BlockToken
    }
    if (!taken) return undefined
    const rest = items.slice(taken)
    let body: P.BlockToken | undefined
    if (rest.length === 1 && rest[0] instanceof P.BlockToken) body = rest[0]
    else if (rest.length && (deeper || JoinedLines.areNotes(scope, rest))) body = JoinedLines.blockOf(below, rest)
    else if (rest.length) return undefined
    if (notes.length) body = JoinedLines.blockOf(below, [...notes, ...(body?.tokens ?? [])])

    const last = lines.at(-1)!
    // each line's code, a space after it;  the last line whole, with its comment
    // - a line starting with `or`:  what follows it in parentheses, one alternative (epic `language` T146)
    const tokens = lines.flatMap((each, at) => {
      const code = at ? JoinedLines.orInParentheses(scope, each) : JoinedLines.codeOf(each)
      if (each !== last) return JoinedLines.spaced(code)
      const comment = each.tokens.at(-1) instanceof P.CommentToken ? [each.tokens.at(-1)!] : []
      return [...code, ...comment]
    })
    const joined = JoinedLines.lineOf(line, tokens, last)
    if (!body) return [joined]
    return JoinedLines.joinBelow(scope, joined, body) ?? [joined, body]
  }

  /** Does `next`, a line under `line`, go on from it:  `line` ends in `and` / `or`, or `next` starts with one? */
  private static goesOn(scope: P.Scope, line: P.LineToken, next: P.LineToken): boolean {
    return JoinedLines.endsWithJoin(scope, line) || JoinedLines.startsWithJoin(scope, next)
  }

  /** Every line `block` holds, however many blocks deep (one per tab stop it's past) -- `undefined` if none. */
  private static linesOf(block: P.BlockToken): P.LineToken[] | undefined {
    const lines = block.tokens.flatMap((item) =>
      item instanceof P.LineToken ? [item] : (JoinedLines.linesOf(item) ?? [])
    )
    return lines.length ? lines : undefined
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
    return (
      item instanceof P.LineToken && item.tokens.length > 0 && !item.tokens.some((it) => it instanceof P.CommentToken)
    )
  }

  /**
   * `line`'s code;  when it starts with `or`, what follows the `or` in parentheses of no width (epic `language` T146):
   * so each line is one alternative, its `where` its own --
   *
   *   ```spell
   *   set card to the last card in the discard pile
   *   	or a random card in the columns where it is face down
   *   	or the first card in the columns where it is face up
   *   ```
   *
   * - A question reads the same:  `or` joins loosest, so `a or (b and c)` is `a or b and c`.
   * - Not `and`, which binds tighter than `or`:  `a or b`, then `and c` under it, is `a or (b and c)` as it was.
   */
  private static orInParentheses(scope: P.Scope, line: P.LineToken): P.Token[] {
    const code = JoinedLines.codeOf(line)
    const [or, ...rest] = code
    if (!or || !rest.length || !JoinedLines.joins(scope, or, "or")) return code
    return [or, ...JoinedLines.inParentheses(new P.LineToken({ ...line.record, tokens: rest }))]
  }

  /** Is `token` a `(` of no width, one of ours:  a part, or an alternative (`orInParentheses()`)? */
  static isWidthlessOpen(token: P.Token | undefined): boolean {
    return token instanceof P.SymbolToken && token.value === "(" && token.raw === ""
  }

  /** `line`'s tokens, a zero-width `(` before them and `)` after. */
  private static inParentheses(line: P.LineToken): P.Token[] {
    const { tokens } = line
    const at = (token: P.Token, where: "start" | "end") =>
      new P.SymbolToken({
        start: where === "start" ? token.start : token.end,
        raw: "",
        value: where === "start" ? "(" : ")",
        whitespace: " "
      })
    return [at(tokens[0]!, "start"), ...tokens, at(tokens.at(-1)!, "end")]
  }

  ////////////////
  // ## Helpers
  ////////////////

  /**
   * May `item` join:  a line ending in, or of just, a joining word, or a block under a line whose first line starts with
   * one?  Cheap:  one token a line.
   */
  private static mayJoin(
    scope: P.Scope,
    item: P.LineToken | P.BlockToken,
    before: P.LineToken | P.BlockToken | undefined
  ): boolean {
    if (item instanceof P.LineToken) {
      const last = JoinedLines.codeOf(item).at(-1)
      return !!last && JoinedLines.joins(scope, last)
    }
    const first =
      before instanceof P.LineToken && JoinedLines.linesOf(item)?.find((it) => !JoinedLines.isNote(scope, it))
    return !!first && JoinedLines.startsWithJoin(scope, first)
  }

  /** Does `line` start with `and` / `or`, then words of its own (not a lone one)? */
  private static startsWithJoin(scope: P.Scope, line: P.LineToken): boolean {
    const code = JoinedLines.codeOf(line)
    return code.length > 1 && JoinedLines.joins(scope, code[0]!)
  }

  /** Does `line` end in `and` / `or`, after a word of its own (not a lone one)? */
  private static endsWithJoin(scope: P.Scope, line: P.LineToken): boolean {
    const code = JoinedLines.codeOf(line)
    return code.length > 1 && JoinedLines.joins(scope, code.at(-1)!)
  }

  /** Is `token` a joining word, `and` or `or` in the language's words (`and_or`) -- `meaning`, if given? */
  private static joins(scope: P.Scope, token: P.Token, meaning?: "and" | "or"): boolean {
    return token instanceof P.WordToken && Wording.lengthAt(scope, "and_or", [token], 0, meaning) === 1
  }

  /** Is `line` a comment, or another aside with no say in how lines go on (`P.Tokenizer.isAside()`), not a blank? */
  private static isNote(scope: P.Scope, line: P.LineToken): boolean {
    return !!(line.tokens.length || line.leading) && !!scope.parser?.tokenizer.isAside(line)
  }

  /** Is every line in `items` a comment, or blank:  what trails the lines that go on? */
  private static areNotes(scope: P.Scope, items: (P.LineToken | P.BlockToken)[]): boolean {
    return items.every((item) =>
      item instanceof P.LineToken ? !!scope.parser?.tokenizer.isAside(item) : JoinedLines.areNotes(scope, item.tokens)
    )
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
