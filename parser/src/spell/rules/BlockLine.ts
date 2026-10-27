import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Wording } from "spell/parser/spell/rules/expressions"
import { SpellType, SubjectRule } from "spell/parser/spell/rules/types"
import { SpellStatement, commitStatement } from "./Statement"
import { Block, type BlockMatchData } from "./Block"
import { SpellJSX } from "./JSX"
import { ParseError } from "./ParseError"

/**
 * A blank line, compiling to `P.ASTBlankLine`.
 * - The parser's own `P.BlankLine` has no `getAST()`, and spell always converts to AST before compiling.
 * - Subclass rather than patching `P.BlankLine.prototype`, which would change it for every language.
 * - Class named `SpellBlankLine`, so it doesn't read as the parser's `P.BlankLine`.
 */
export class SpellBlankLine extends P.BlankLine {
  static ruleName = "blank_line"

  getAST(match: P.MatchFor<this>) {
    return new P.ASTBlankLine(match)
  }
}

/**
 * Parse a single `LineToken` in a `BlockToken` as:
 * - a `statement`
 * - an optional `comment` at the end of the line
 * - if the statement takes a nested body and the next item in `lines` is a `BlockToken`, we'll let the
 *   statement attempt to parse that next line as well -- see `commitStatement()`.
 */
export class BlockLine extends P.Rule<P.RuleProps, never, BlockMatchData> {
  /** Registered as `line`:  the class name would give `block_line`. */
  static ruleName = "line"

  /**
   * The innermost `line` match at `offset` in a file's `match`, e.g. the line the cursor is on -- `undefined` if none.
   * - At the very end of a line the stack starts with the NEXT `line`:  back up one character and look again.
   * - The app's spell tree pane and the language server's `spell/lineTree` both use it.
   */
  static lineAt(match: P.Match, offset: number): P.Match | undefined {
    let stack = match.matchStackForOffset(offset).reverse()
    if (stack[0]?.rule instanceof BlockLine) stack = match.matchStackForOffset(offset - 1).reverse()
    return stack.find((each) => each.rule instanceof BlockLine)
  }

  /**
   * SIDE EFFECT: calls `statement.rule.mutateScope()` on the parsed statement,
   * so a locked-in statement can e.g. add variables to `scope` as it's parsed.
   * - A nested block's errors are folded in too.
   * - SIDE EFFECT:  then notes a warning on the statement for each article which doesn't agree with its noun,
   *   e.g. `a apple` -- see `SP.SpellWarnings.noteArticles()`.
   */
  parse(scope: P.Scope, lines: P.Token[]): P.Match | undefined {
    const written = lines[0]
    if (!written) return undefined
    const matched: (P.Match | P.Token)[] = []
    const errors: P.Match[] = []
    const tokensMatched: P.Token[] = [written]
    let lineStatement: P.Match | undefined
    let lineBodyMark: P.JournalMark | undefined
    let fromBody: string | undefined
    let bodyErrorsAt: number | undefined
    if (!(written instanceof P.LineToken)) {
      console.warn("BlockLine.parse(): got non-line", written)
      return undefined
    }
    // a spellx tag line reads as its code-spell twin, with the body that takes (epic `elemental-spell` P6):
    // only in a spellx file, so code spell's lines pay nothing for it
    const spellx = (scope.parser as SP.SpellParser | undefined)?.form === "spellx"
    const twin = spellx ? SP.SpellxTwin.of(scope, written, lines[1]) : undefined
    if (spellx) errors.push(...SP.SpellxTwin.errorsIn(scope, written))
    const line = twin?.line ?? written
    const nextItem = twin ? twin.body : lines[1]
    if (twin?.swallowsNextItem) tokensMatched.push(lines[1]!)
    if (twin?.skipped) {
      if (twin.takesNextItem) tokensMatched.push(lines[1]!)
      const result: P.MatchFor<this> = new P.Match({ rule: this, matched: errors, tokens: tokensMatched, scope })
      if (errors.length) result.data.errors = errors
      return result
    }
    const { tokens } = line
    // Blank line
    if (tokens.length === 0) {
      // NOTE: only `line.newline` is ever a usable `Token` here.
      // `line.leading` (once a fallback) is a plain `string`:
      // pushing it into `matched` / `tokens` below would fail `Match`'s own runtime assertions.
      const token = line.newline
      if (token) {
        matched.push(
          new P.Match({
            rule: scope.getRuleOrDie("blank_line"),
            matched: [token],
            tokens: [token],
            scope
          })
        )
      }
    }
    // parse as a `statement` with optional `comment`
    else {
      const start = 0
      let end = tokens.length

      // pop the comment (a single token) off of the end if found -- or each of a spellx twin's, its description's
      // lines (`SP.SpellxTwin`):  code spell's line has one at most
      const comments: P.Match[] = []
      while (end > 0) {
        const comment = scope.parser?.parse([tokens[end - 1]!], "comment", scope)
        if (!comment) break
        comments.unshift(comment)
        end -= 1
        if (!(tokens[end] instanceof SP.SpellxProseToken)) break
      }
      // add comments BEFORE statement
      matched.push(...comments)

      // parse the statement (which may parse an inline body as well)
      const unparsed = tokens.slice(start, end)
      // an outline's bullet, e.g. `- it has a deck`:  kept as a token, never part of the statement
      if (BlockLine.isBullet(unparsed)) matched.push(unparsed.shift()!)
      let statement = scope.parser?.parse(unparsed, "statement", scope)
      // a statement its rule refused, saying why -- see `SpellStatement.refuse()`:  an error, never committed
      if (statement?.is(ParseError)) {
        errors.push(statement)
        matched.push(statement)
        unparsed.splice(0, statement.length)
        statement = undefined
      }
      if (statement) {
        lineStatement = statement
        matched.push(statement)
        unparsed.splice(0, statement.length)
      }

      // add anything unparsed at the end as a parse error -- saying why, for an outline line out of its body
      if (unparsed.length && !statement && BlockLine.isOutlineLineOutsideBody(scope, unparsed)) {
        const message = SP.Language.of(scope).parserMessage("outline-line-outside")
        const error = SP.spellParser.createParseError(scope, unparsed, message)
        errors.push(error)
        matched.push(error)
      } else if (unparsed.length) {
        const error = scope.parser?.parse(unparsed, "parse_error", scope)
        if (error) {
          errors.push(error)
          matched.push(error)
        }
      }

      if (statement) {
        // Errors inside JSX `{...}` -- reported here, but compiled where they are, so NOT added to `matched`.
        errors.push(...SpellJSX.parseErrorsIn(statement))
        // an old word for a built-in type, e.g. `drawable thing`:  an error naming its new word, the line still compiled
        errors.push(...SpellType.retiredWordErrorsIn(statement))

        const inlineBody = statement.rule instanceof SpellStatement ? statement.rule.getBody(statement) : undefined
        const committed = commitStatement(statement, nextItem)
        // once committed:  a type this line declares has its gender -- see `SpellWarnings.noteArticles()`
        SP.SpellWarnings.noteArticles(statement)
        const nestedBlockMatch = committed.body
        lineBodyMark = committed.bodyMark
        fromBody = committed.fromBody
        if (nestedBlockMatch) {
          // add any errors in the nestedBlock to `errors`
          bodyErrorsAt = errors.length
          if (nestedBlockMatch.is(Block)) errors.push(...(nestedBlockMatch.data.errors ?? []))
          // a body that's ONE expression, e.g. `return` with its markup on the lines below:  errors in its JSX
          else errors.push(...SpellJSX.parseErrorsIn(nestedBlockMatch))
          // add the nestedBlock to `tokensMatched` to account for it in the output:  a twin's, the block it took
          if (!twin) tokensMatched.push(nextItem!)
          else if (twin.takesNextItem) tokensMatched.push(lines[1]!)
        }

        // Add parse error if we got both an inline body and a nested one
        if (inlineBody && nestedBlockMatch) {
          const error = SP.spellParser.createParseError(
            scope,
            [line, nextItem].filter((item): item is P.Token => item !== undefined),
            SP.Language.of(scope).parserMessage("inline-and-nested-body")
          )
          errors.push(error)
          matched.push(error)
        }
      }
    }
    const result: P.MatchFor<this> = new P.Match({
      rule: this,
      matched,
      tokens: tokensMatched,
      scope
    })
    if (errors.length) result.data.errors = errors
    if (lineStatement) result.data.statement = lineStatement
    if (bodyErrorsAt !== undefined) result.data.bodyErrorsAt = bodyErrorsAt
    if (lineBodyMark) result.data.bodyMark = lineBodyMark
    if (fromBody !== undefined) result.data.fromBody = fromBody
    return result
  }

  /**
   * Do `tokens` start with an outline's bullet:  a `-` with a space after it, and more after that?
   * - e.g. `- it has a deck`, in an outline-style type's body (epic page `outline-spell`) -- or any line:
   *   a statement never starts `- `.
   * - NOT `-5`, nor a lone `-`.
   */
  static isBullet(tokens: P.Token[]): boolean {
    const [first] = tokens
    return tokens.length > 1 && first instanceof P.SymbolToken && first.value === "-" && !!first.whitespace
  }

  /**
   * Is `tokens` an outline body's line, e.g. `it has a deck` or `its "suit" is ...`, NOT in a type's body,
   * so it didn't parse?
   * - Its error then says where it belongs (epic page `outline-spell`, P6).
   * - `it` / `its` (`subject_it`, `subject_its`), then a quoted name or phrase, or `has` / `belongs`
   *   (`has_or_belongs`):  each language's own words.
   */
  static isOutlineLineOutsideBody(scope: P.Scope, tokens: P.Token[]): boolean {
    const [subject, next] = tokens
    const isSubject =
      SubjectRule.reads(scope, "subject_it", subject) || SubjectRule.reads(scope, "subject_its", subject)
    if (!isSubject || P.SubjectScope.of(scope) || scope instanceof P.MethodScope) return false
    return next instanceof P.TextToken || Wording.lengthAt(scope, "has_or_belongs", tokens, 1) > 0
  }

  /**
   * Re-parse ONLY the nested body of `line` from `blockToken`,
   * keeping its header statement's match -- and so the scope changes that made -- as they are.
   * - SEE:  `P.IncrementalParse`.
   * - Returns a new `line` match, or `undefined` if that's not safe, so caller does a full parse:
   *   - no statement, or its body isn't an indented block of statements
   *   - body shares the header's scope, so its variables land outside it
   *   - old or new body `changesGlobalScope()`, e.g. declares a type or a method
   *   - what the statement records once its body has parsed changed, e.g. the type a method returns:
   *     later lines may read it -- see `SpellStatement.mutateScopeFromBody()`
   * - The new body gets a FRESH nested scope:  we re-parse on a clone of the statement, without its old body.
   */
  reparseBody(line: P.MatchFor<this>, blockToken: P.BlockToken): P.Match | undefined {
    const { statement, bodyErrorsAt } = line.data
    if (!statement || !(statement.rule instanceof SpellStatement) || bodyErrorsAt === undefined) return undefined
    const oldBody = statement.rule.getBody(statement)
    if (!oldBody?.is(Block) || line.tokens[1] !== oldBody.tokens[0]) return undefined
    if (statement.nestedScope === statement.scope || P.IncrementalParse.changesGlobalScope(oldBody)) return undefined

    // Statement without its old body, re-bodied.
    const bodyTokens = new Set(oldBody.tokens)
    const header = statement.clone({
      matched: statement.matched.filter((item) => item !== oldBody),
      tokens: statement.tokens.filter((token) => !bodyTokens.has(token))
    })
    header.data.body = undefined
    const newBody = statement.rule.parseNestedBlock(header, blockToken)
    if (!newBody?.is(Block) || P.IncrementalParse.changesGlobalScope(newBody)) return undefined
    const fromBody = statement.rule.mutateScopeFromBody(header)
    if (fromBody !== line.data.fromBody) return undefined

    // Swap the old body's errors for the new body's, in place.
    const errors = [...(line.data.errors ?? [])]
    errors.splice(bodyErrorsAt, oldBody.data.errors?.length ?? 0, ...(newBody.data.errors ?? []))
    const result = line.clone({
      matched: line.matched.map((item) => (item === statement ? header : item)),
      tokens: [line.tokens[0]!, blockToken]
    })
    result.data.statement = header
    result.data.errors = errors.length ? errors : undefined
    result.data.fromBody = fromBody
    return result
  }

  /**
   * `Match.compile()` always prefers `getAST()` (below) over calling `rule.compile()` directly, but
   * `Rule.compile()` is abstract, so provide the equivalent fallback for completeness.
   */
  compile(match: P.MatchFor<this>): unknown {
    return match.AST?.compile()
  }

  /** If only one matched item (statement, comment, or blank line), return its AST directly; else group them. */
  getAST(match: P.MatchFor<this>): P.ASTNode {
    // ???  If only one matched item, return it by itself
    const first = match.matched[0]
    if (match.matched.length === 1 && first instanceof P.Match) return first.AST!
    // otherwise
    return new P.ASTStatementGroup(match, {
      // `match.matched` here is always `Match`es (never raw `Token`s) -- not staticaly representable.
      statements: match.matched
        .filter((item): item is P.Match => item instanceof P.Match)
        .map((item) => item.AST) as Array<P.ASTStatement | P.ASTExpression | P.ASTComment | P.ASTBlankLine>
    })
  }
}
