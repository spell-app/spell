import { NONE, proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly to avoid circular import -- rules are constructed while the `SP` barrel is still loading.
import { BODY_KEYWORDS, type StatementBodySpec } from "spell/parser/spell/spell.types"
import { SubjectIt, SubjectRule } from "spell/parser/spell/rules/types"
// Import directly to avoid circular import:  the word rules' folder builds on this file
import { Wording } from "spell/parser/spell/rules/expressions/Wording"
import { Block } from "./Block"
import { JoinedLines } from "./JoinedLines"
import { ParseError } from "./ParseError"

/**
 * Base class for all spell statement rules.
 * In spell, we generally match `statements` across the entire line.
 * - An exception is statements with a BODY (like `if` or `for each`):
 *   an inline statement at the end of the line, or a nested block of statements indented under it.
 * - A body is declared by a body keyword at the END of `syntax` -- see `BODY_KEYWORDS`:
 *   e.g. `if {condition:expression} (then|:)? {statement_body}?`.
 *   - The keyword is taken OUT of `rules`:  a body can't be matched with the rest of the syntax,
 *     as it's parsed in `match.nestedScope`, which needs the statement's match to exist first.
 *   - `parse()` then parses an inline body;  `commitStatement()` parses a nested one.
 */
export class SpellStatement<
  Groups extends string | P.AnyGroups = P.AnyGroups,
  MatchData extends P.AnyMatchData = P.AnyMatchData
> extends P.Sequence<Groups, MatchData> {
  /** What we take as a body, from the body keyword which ended our `syntax`.  `undefined` => no body. */
  declare bodySpec: StatementBodySpec | undefined
  /**
   * `true`:  used INSIDE an expression, our LAST slot (a trailing `{x:expression}`) takes an `operand` instead,
   * so it stops before an operator.
   * - As a statement it keeps the whole expression:
   *   - `notify x + y` => `notify(x + y)`, but `if double x is 4` => `double(x) == 4`
   *   - `wait for x is 1` => `await (x == 1)`, but `if wait for x is 1` => `(await x) == 1`
   * - Only for a rule aliased both `statement` and `expression`:
   *   `SpellParser.addRule()` registers it as the statement, plus a twin of it as the expression.
   *   See `SpellParser.addStatementAndOperand()`.
   */
  declare operandInExpressions: boolean
  @proto static operandInExpressions = false
  /**
   * `true`:  a nested block body compiles FLAT -- its statements beside ours, in the block holding us, NOT
   * wrapped in `{}` -- e.g. an outline-style type's bulleted body, `a card is a thing where:`.
   * - So its members are hoisted into the class like any top-level line's (`SP.hoistClassMembers()`).
   * - `parseNestedBlock()` leaves the body un-`enclose`d;  `Block.getAST()` splices its statements in after ours.
   */
  declare flatBody: boolean
  @proto static flatBody = false
  /**
   * `true`:  a LOOP (`for each card in its cards`, `repeat 3 times`):  its body runs inside whatever method holds it,
   * as a callback (`core.map(list, (card) => ...)`).
   * - So a markup line in a loop inside a drawing draws, one for each time round (`drawn_markup`, epic
   *   `elemental-spell` C28):  see `DrawIt.drawingIn()`.
   */
  declare loops: boolean
  @proto static loops = false
  /**
   * In the expression twin `operandInExpressions` makes:  the statement rule it's the twin of,
   * the one `scope.addRule()` recorded.  See `SpellStatement.statementRuleOf()`.
   */
  declare statementRule: P.Rule | undefined
  /**
   * `true`:  a line of ours is a VALUE, e.g. a call of a method, `quadruple it`:
   * as an action's or a property's last line, it's what that gives back -- see `returnsLastLine()`.
   */
  declare givesValue: boolean
  @proto static givesValue = false
  /**
   * `true`:  as the last line of a body answering yes or no (`answersYesOrNo()`), a line of ours that reads whole as
   * a yes or no asks it instead (epic `language` T135):
   * `it is droppable when` then `the card is the last item of the card's pile` asks, it doesn't set the card.
   * - `assignment`'s:  `x is 1` sets `x` anywhere else.
   */
  declare readsAsQuestion: boolean
  @proto static readsAsQuestion = false
  /** TYPE-ONLY: props `parser.addRule()` accepts for this rule -- see `P.Rule`'s `Props`. */
  declare readonly Props: SpellStatementProps

  /** SIDE EFFECT:  moves a trailing body keyword out of `rules` into `bodySpec`. */
  constructor(props: SpellStatementProps) {
    super(props)
    if (!this.bodySpec) this.extractBodySpecFromRules()
  }

  /**
   * Is `match`, at a file's top level, part of the program's START?  `false` unless a rule says so.
   * - A line of the start is skipped when an edit keeps the last run's things.
   * - The start (epic `drawable-thing` P17, Q26):
   *   - a call of one of the program's tests:  `test card setup` (`DynamicMethodRule`)
   *   - starting its app:  `start the game` (`StartApp`)
   * - `SP.Block` wraps such a line in a `P.ASTProgramStart`.
   * - Reads only `match` and our statics:  `getAST()` may call it.
   */
  startsTheProgram(_match: P.Match): boolean {
    return false
  }

  /**
   * If `rules` ends with a body keyword (or a choice of them), move it into `bodySpec` -- see `BODY_KEYWORDS`.
   * - A `leadIn` keyword stays in `rules` too:  it matches the words opening the body, e.g. `where:`.
   * - SIDE EFFECT: sets `rules` / `bodySpec`.  Only call before the rule is frozen, i.e. from the constructor.
   */
  protected extractBodySpecFromRules() {
    const last = this.rules.at(-1)
    const keywords = last instanceof P.Subrule ? [last] : last instanceof P.Choice ? last.rules : []
    const specs = keywords.map((keyword) => (keyword instanceof P.Subrule ? BODY_KEYWORDS[keyword.rule] : undefined))
    if (!last || !specs.length || specs.some((spec) => !spec)) return
    const bodySpec = Object.assign({ syntaxRule: last }, ...specs) as StatementBodySpec
    if (!bodySpec.leadIn) this.rules = this.rules.slice(0, -1)
    this.bodySpec = bodySpec
  }

  /**
   * Do we take the indented block after `match` as our body?
   * Whenever we take a body -- but after a `leadIn` keyword, only when it matched:
   * e.g. `a card is a thing where:`, not `a card is a thing`.
   */
  takesNestedBody(match: P.Match): boolean {
    const { bodySpec } = this
    if (!bodySpec) return false
    if (!bodySpec.leadIn) return true
    const keyword = bodySpec.syntaxRule as P.Subrule
    return !!match.groups[keyword.matchGroup ?? keyword.rule]
  }

  ////////////////
  // ## What's indented under the line (epic `language` P48)
  ////////////////

  /**
   * The block indented under the line `BlockLine` is reading, while it reads that line's statement:
   * so a line with no colon at its end can say it takes that block as its body (epic `language` P48).
   * - e.g. `a pile` with lines under it re-opens the type;  alone, it's a fragment.
   * - e.g. `its "color" is one of red, black` with value lines under it is worked out, not stored (T93).
   * - Set by `BlockLine.parse()` around its statement's parse only:  `undefined` anywhere else.
   * - A line whose statement read it is re-parsed whole when its body changes (`BlockLine.reparseBody()`):
   *   `readBelow` says it did.
   */
  static below: P.BlockToken | undefined
  /** Did a rule read `below` while the current line's statement parsed? */
  static readBelow = false

  /** The block indented under the line being read, if any -- see `below`. */
  static blockBelow(): P.BlockToken | undefined {
    SpellStatement.readBelow = true
    return SpellStatement.below
  }

  /**
   * Does the block under the line hold a line of CODE:  one that isn't only a comment?
   * - `false` for a block of comments alone:  a line's description, not its body (epic `language` P48).
   */
  static hasCodeBelow(): boolean {
    const block = SpellStatement.blockBelow()
    return !!block && SpellStatement.codeLinesOf(block).length > 0
  }

  /** The lines of `block` holding code:  not blank, not only a comment;  its nested blocks left out. */
  static codeLinesOf(block: P.BlockToken): P.LineToken[] {
    return block.tokens.filter(
      (token): token is P.LineToken =>
        token instanceof P.LineToken &&
        token.tokens.length > 0 &&
        !(token.tokens.length === 1 && token.tokens[0] instanceof P.CommentToken)
    )
  }

  /**
   * A `parse_error` match in place of statement `match`, saying why spell won't take it,
   * e.g. a property declared on a built-in type.
   * - For a `parse()` which understood what it read, but mustn't accept it:
   *   return this, NOT `undefined`, so the error says why, instead of "Don't understand ...".
   * - `BlockLine` reports it as its line's error, and commits nothing:  the line compiles to the error.
   * - It competes with `match`'s priority (`P.Match.priority`):  a plainer rule which merely fits the same words
   *   can't take the line instead, e.g. `quoted_type_expression` taking `it "is a suit"` as an empty method.
   */
  static refuse(match: P.Match, message: string): P.Match {
    // NOTE: `message` is in the scope's language:  `SP.Language.of(scope).parserMessage(key, params)`
    const { scope, tokens, rule } = match
    return new P.Match({
      scope,
      rule: scope.getRuleOrDie("parse_error"),
      matched: tokens,
      tokens: [...tokens],
      message,
      priority: rule.priority
    })
  }

  /**
   * `match`, a `pause` or a `wait for` -- or, in a thing's drawing, a parse error saying it can't wait there.
   * - A drawing must answer at once.  A value that waits is fine, as a getter:  it shows a "…", then fills in.
   */
  static refuseWaitInDraw<M extends P.Match | undefined>(match: M): M | P.Match {
    if (!match) return match
    const method = P.MethodScope.withThing(match.scope)
    if (!/^draw(?:$|_its_slot$|_each_item$|_its_placeholder$)/.test(method?.name ?? "")) return match
    return SpellStatement.refuse(match, SP.Language.of(match.scope).parserMessage("cant-wait-in-draw"))
  }

  /**
   * `match`, a statement declaring `property` on `type` -- or, when `type` is one of spell's BUILT-IN types,
   * e.g. `text` or `thing`, a parse error saying it can't be (epic page caveat C9).
   * - e.g. `the length of a text is: ...`
   * - Why:  a built-in type's `P.TypeScope` is the shared root scope's,
   *   which every project parses against and no project's journal records.
   *   - A property there would leak into every other project, and outlive its edit.
   *   - Its members are spell's own, in `SP.BUILT_IN_TYPE_TABLE`.
   * - A METHOD of a built-in type is fine:  its record goes in the project's `methods` -- see `MethodDefinition`.
   * - ALSO refused:  a property every thing has built in, e.g. `a person has an id as text`
   *   (epic `people-and-orgs`, Q9) -- see `SP.builtInStoredMember()`.
   *   - Except one a type may declare again (`declarable`), with its own datatype or none (epic `spanish` P15):
   *     `a pile has a name as text` is fine, `a pile has a name as number` isn't.
   *   - `datatype`:  what the statement says it holds, if it says.
   * - A lookup:  call it WHILE PARSING, e.g. from `DefinePropertyHas.parse()`.
   */
  static refuseBuiltInType(
    match: P.Match,
    type: P.Match,
    property: P.Match | undefined,
    datatype?: P.Datatype
  ): P.Match {
    const ofPropertyKind = SpellStatement.refusePropertyKind(match, type)
    if (ofPropertyKind !== match) return ofPropertyKind
    const language = SP.Language.of(match.scope)
    const words = property ? `"${property.raw}"` : language.parserMessage("a-property")
    const typeName = language.wordFor(SP.typeName(`${type.value}`))
    const typeScope = match.scope.types?.get(`${type.value}`)
    const params = { property: words, type: typeName }
    if (SP.isBuiltInTypeScope(typeScope)) {
      return SpellStatement.refuse(match, language.parserMessage("cant-add-to-built-in-type", params))
    }
    const builtIn = property ? SP.builtInStoredMember(typeScope, `${property.value}`) : undefined
    if (!builtIn) return match
    const { member, on } = builtIn
    if (!member.declarable) {
      return SpellStatement.refuse(match, language.parserMessage("cant-add-built-in-member", params))
    }
    if (datatype && datatype !== member.datatype && !member.anyDatatype) {
      const message = language.parserMessage("cant-retype-built-in-member", {
        ...params,
        datatype: language.wordFor(datatype),
        on: language.wordFor(on),
        builtInType: language.wordFor(`${member.datatype}`)
      })
      return SpellStatement.refuse(match, message)
    }
    return match
  }

  /**
   * `match`, a statement adding to `type` -- or, when spell knows NO type of that name, a parse error saying so,
   * e.g. `the color of a suit is ...` with no `suit` declared anywhere in the project.
   * - Why:  it'd compile against a class nobody defines, `Suit.prototype`, and throw when run
   *   (was `agents/SUSPECTED-BUGS.md`;  epic page `outline-spell`, P2).
   * - A type declared further down is known:  every declaration is stubbed before a project parses.
   * - A lookup:  call it WHILE PARSING.
   */
  static refuseUnknownType(match: P.Match, type: P.Match): P.Match {
    const { scopeType } = type.data as { scopeType?: unknown }
    if (scopeType !== NONE) return SpellStatement.refusePropertyKind(match, type)
    const example = SpellStatement.exampleTypeDeclaration(match.scope, `${type.raw}`)
    const message = SP.Language.of(match.scope).parserMessage("no-such-type", { type: `${type.raw}`, example })
    return SpellStatement.refuse(match, message)
  }

  /**
   * `match`, or a parse error if `type` is the kind of a property's values, e.g. `card rank` (epic `spanish` P22):
   * it has no class to hold a property or phrase of its own -- see `P.ValueKind.property`.
   * - e.g. `the "value" of a card rank is ...`, `a card rank "is a face card" if ...`, `a card rank:`
   * - Call it WHILE PARSING:  it reads the type's record, found then.
   */
  static refusePropertyKind(match: P.Match, type: P.Match): P.Match {
    const { scopeType } = type.data as { scopeType?: unknown }
    const kind = scopeType instanceof P.TypeScope ? scopeType : match.scope.types?.get(`${type.value}`)
    const message = SP.SpellWarnings.noMembersOnPropertyKind(match.scope, kind)
    return message ? SpellStatement.refuse(match, message) : match
  }

  /**
   * How a program declares a type called `words`, in `scope`'s language, for an error's example:
   * `a pile is a thing`, Spanish's `una pila es una cosa`.
   */
  static exampleTypeDeclaration(scope: P.Scope, words: string): string {
    const language = SP.Language.of(scope)
    const aType = language.withArticle("indefinite", words, scope.getType(SP.typeName(words)))
    return language.parserMessage("example-type", { type: words, aType })
  }

  /**
   * Parse the statement itself -- assume comment was already popped off the end.
   * - If we take an inline body, attempt to parse the rest of the line as that.
   * - `BlockLine.parse()` will worry about extra stuff at the end of the statement.
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const statement = super.parse(scope, tokens)
    if (!statement) return undefined

    const unparsed = tokens.slice(statement.length)
    const inlineAs = this.bodySpec?.inlineAs
    if (inlineAs && unparsed.length) this.parseInlineStatement(statement, unparsed, inlineAs)

    return statement
  }

  /**
   * Attempt to parse `unparsed` tokens from end of the line as our inline body, in `statement.nestedScope`.
   * - Returns inline statement match if successful.
   * - SIDE EFFECT: on success, adds it to `statement.groups` as `body`,
   *   and records it as `statement.data.body` -- see `getBody()`.
   * - NEVER calls `mutateScope()` here:  we may be one of several candidates for the line.
   *   `commitStatement()` does that for the winner only.
   */
  parseInlineStatement(statement: P.Match, unparsed: P.Token[], parseAs: string): P.Match | undefined {
    // NOTE: `Scope.parse()` is typed for string input only;
    // call `parser.parse()` directly (exactly what `Scope.parse()` would do internally) so we can pass tokens instead.
    const { nestedScope } = statement
    const tokens = SpellStatement.withVerbCarried(
      statement,
      SpellStatement.withWhichSubject(statement, SpellStatement.beforeAlternatives(statement, unparsed))
    )
    const inlineStatement = nestedScope.parser?.parse(tokens, parseAs, nestedScope)
    if (inlineStatement) {
      statement.addMatch(inlineStatement, "body")
      // the subjects `withWhichSubject()` put back aren't on the line:  we're as long as the words we read
      if (tokens !== unparsed) {
        const asWritten = new Set(unparsed)
        statement.tokens = statement.tokens.filter((token) => token.raw !== "" || asWritten.has(token))
      }
      statement.data.body = inlineStatement
    }
    return inlineStatement
  }

  /**
   * `unparsed`, a condition after a list, with its subject put back when it starts `which` (epic `language` T133):
   * `the cards in the deck which are face up` reads its condition as `it is face up`, as `where` would.
   * - Only after a `where` group whose word means `which` (the `where_or_which` word rule):  `which`, `that`, `who`.
   * - The subject, from the language's `whichClause`;  none (Spanish's `que`):  `unparsed` as it is,
   *   its subject left out as after `donde` (`implied_it`).
   * - Each plural verb starting a clause made the item's own (`are` => `is`):  the first word,
   *   and the first after each of the clause's joining words (`and`, `or`;  epic `language` J173):
   *   `which are face up and are in the stock` ~== `where it is face up and is in the stock`.
   * - The subject takes no room on the line, just after `which`:  editors colour `which` and the words after as they are.
   */
  static withWhichSubject(statement: P.Match, unparsed: P.Token[]): P.Token[] {
    const where = statement.groups.where
    if (!(where instanceof P.Match)) return unparsed
    if (!Wording.reads(statement.scope, "where_or_which", where.inputText.trim(), "which")) return unparsed
    const clause = SP.Language.of(statement.scope).words.whichClause
    const first = unparsed[0]
    if (!clause || !(first instanceof P.WordToken)) return unparsed
    const subjectAt = (start: number) => new P.WordToken({ value: clause.subject, raw: "", whitespace: "", start })
    const tokens = [subjectAt(where.end ?? first.start ?? 0), ...unparsed]
    SpellStatement.singularVerbAt(tokens, 1, clause.singularVerbs)
    // each later clause starting with a plural verb:  its subject put back too, `... and it is in the stock`
    for (let index = 2; index < tokens.length; index++) {
      if (!clause.joins.has(String(tokens[index - 1]!.value))) continue
      if (!SpellStatement.singularVerbAt(tokens, index, clause.singularVerbs)) continue
      tokens.splice(index, 0, subjectAt(tokens[index]!.start ?? 0))
      index++
    }
    // the words we changed, known to every rule's quick test of the line's words
    P.Sequence.addLineWords(tokens, unparsed)
    return tokens
  }

  /**
   * `unparsed`, a condition after a list (`where`, `which`), up to an alternative on a line of its own
   * (epic `language` T146):  the lines under it starting with `or`, each in parentheses of no width (`JoinedLines`).
   *
   *   ```spell
   *   set card to the last card in the discard pile where it can play the card
   *   	or the first card in the columns where it can go up and can play the card
   *   ```
   *
   * - So the first line's `where` ends with its line, as each other line's does inside its parentheses:
   *   the `or` joins the values, never the conditions.
   * - On one line, `where it is face up or the deck is empty` is all the condition, as always.
   */
  static beforeAlternatives(statement: P.Match, unparsed: P.Token[]): P.Token[] {
    if (!(statement.groups.where instanceof P.Match)) return unparsed
    const { scope } = statement
    const at = unparsed.findIndex(
      (token, index) =>
        // the cheap test first:  most conditions have no `(` of no width at all
        JoinedLines.isWidthlessOpen(unparsed[index + 1]) && Wording.lengthAt(scope, "and_or", [token], 0, "or") === 1
    )
    return at > 0 ? unparsed.slice(0, at) : unparsed
  }

  /**
   * `tokens`, a condition after a list (`where`, `which`), with its verb carried to a bare word after `and` / `or`
   * (epic `language` I152):  `which are face up and red` reads as `... and it is red`, as `where it is face up and it
   * is red` does.
   * - Only when the condition starts with the item and its verb:  `it is`, `it isn't`, Spanish's `es` (its subject
   *   left out);  `where its rank is king or queen` is the rank's, as it was.
   * - Only a clause of ONE word, after `and` / `or` (the `and_or` word rule), that's no name in scope:
   *   `where it is face up and done`, `done` a variable, is a question of its own.
   * - The verb as written, `not` and all, after `and`:  `it is not red and black`.
   *   Not after `or`, which would always be true:  `it isn't red or black` is left as it was.
   * - Without it, `red` was a text, always true:  `card.isFaceDirection("up") && "red"`, every face-up card.
   * - The copies take no room on the line, as `withWhichSubject()`'s subject doesn't.
   */
  static withVerbCarried(statement: P.Match, tokens: P.Token[]): P.Token[] {
    if (!(statement.groups.where instanceof P.Match)) return tokens
    const { scope } = statement
    const subject = SP.Language.of(scope).words.whichClause?.subject
    const startsWithSubject = !!subject && tokens[0] instanceof P.WordToken && tokens[0].value === subject
    if (subject && !startsWithSubject) return tokens
    const start = startsWithSubject ? 1 : 0
    const verbLength = Wording.lengthAt(scope, "is_or_is_not", tokens, start)
    if (!verbLength) return tokens
    const verb = tokens.slice(0, start + verbLength)
    const negated = Wording.lengthAt(scope, "is_or_is_not", tokens, start, "negated") > 0
    const joins = (token: P.Token | undefined) => !!token && Wording.lengthAt(scope, "and_or", [token]) === 1
    const nested = statement.nestedScope
    let carried: P.Token[] | undefined
    const out = [...tokens]
    for (let index = start + verbLength; index < out.length - 1; index++) {
      const word = out[index + 1]
      if (!joins(out[index]) || !(word instanceof P.WordToken)) continue
      // `isn't red or black` is neither:  not carried, as `it isn't red or it isn't black` is always true
      if (negated && Wording.lengthAt(scope, "and_or", [out[index]!], 0, "or")) continue
      if (out[index + 2] && !joins(out[index + 2])) continue
      if (nested.variables?.get(String(word.value))) continue
      const copies = verb.map((token) => {
        const Token = token.constructor as new (record: P.TokenProps) => P.Token
        return new Token({ ...token.record, raw: "", whitespace: token.whitespace ? " " : "", start: word.start })
      })
      out.splice(index + 1, 0, ...copies)
      index += copies.length
      carried = out
    }
    if (!carried) return tokens
    P.Sequence.addLineWords(carried, tokens)
    return carried
  }

  /**
   * SIDE EFFECT:  the plural verb at `tokens[index]`, if it is one, made singular in place (`are` => `is`),
   * for `withWhichSubject()`;  `true` if it was.
   * - One with an apostrophe too:  spell's words split `aren't` into `aren`, `'`, `t`, so `aren` => `isn`
   *   when its `'t` follows straight on (`singularVerbs` names it `aren't`).
   */
  static singularVerbAt(tokens: P.Token[], index: number, singularVerbs: Readonly<Record<string, string>>): boolean {
    const word = tokens[index]
    if (!(word instanceof P.WordToken)) return false
    const apostrophe = tokens[index + 1]
    const t = tokens[index + 2]
    const contracted =
      !word.whitespace && apostrophe?.value === "'" && !apostrophe.whitespace && t?.value === "t"
        ? singularVerbs[`${word.value}'t`]
        : undefined
    const verb = contracted?.slice(0, -2) ?? singularVerbs[String(word.value)]
    if (!verb) return false
    tokens[index] = new P.WordToken({ ...word.record, value: verb })
    return true
  }

  /**
   * Body of `match`, if any:  its inline statement OR its nested block.
   * - Set by `parseInlineStatement()` / `parseNestedBlock()`.  Given both (an error), the nested block.
   * - Read THIS, not `match.groups.body` -- that's an array when given both, and a rule's syntax
   *   could name its own group `body`.
   */
  getBody(match: { data: P.AnyMatchData }): P.Match | undefined {
    return match.data.body as P.Match | undefined
  }

  /**
   * Attempt to parse `nestedBlock` as our nested body, if we take one.
   * - Returns the nested body match if successful.
   * - `bodySpec.nestedAs` ~== `"block"` => parses the whole nested block via `statement.nestedScope` and marks
   *   the result `enclose`d (wrapped in `{}` when compiled), unless we're `flatBody`.  Otherwise, only a single-line nested block
   *   can be parsed, as `nestedAs` directly (e.g. an `expression`).
   * - SIDE EFFECT: on success, adds it to `statement.groups` as `body`,
   *   and records it as `statement.data.body` -- see `getBody()`.
   * - NOTE: this will throw if rule does not implement `getNestedScopeForMatch`.
   */
  parseNestedBlock(statement: P.Match, nestedBlock: P.BlockToken): P.Match | undefined {
    const parseAs = this.bodySpec?.nestedAs
    if (!parseAs) return undefined
    let result: P.Match | undefined
    if (parseAs === "block") {
      const { nestedScope } = statement
      result = nestedScope.parser?.parse([nestedBlock], "block", nestedScope)
      // ONE line a block can't read, under a line taking a value:  that value, as if on our line (epic `language` T58)
      result = this.oneLineValue(statement, nestedBlock, result) ?? result
      // its last line's value is what it gives back (epic `language` I47)
      if (this.returnsLastLine(statement)) result = this.lastLineValue(statement, nestedBlock, result) ?? result
      // wrap output in braces -- or not, see `flatBody`
      if (result?.is(Block) && !this.flatBody) result.data.enclose = true
      // a declaration's body starting with a comment:  that comment is its description (epic `language` P48)
      if (result?.is(Block) && Block.descriptionLineOf(result) && statement.rule.getDeclaration(statement)) {
        result.data.describes = true
      }
    } else {
      // if parsing as anything else, we can only handle a single line
      if (nestedBlock.tokens.length > 1) return undefined
      // get line to process, minus leading whitespace
      // TODO: remove comment????
      const first = nestedBlock.tokens[0]
      // Only a `LineToken` (not a nested `BlockToken`) can be parsed as a single rule here.
      if (!(first instanceof P.LineToken)) return undefined
      const { tokens } = first
      // the body's scope, as an inline body's (`parseInlineStatement()`):  e.g. `draw_it`'s markup, where `[rank]`
      // is the card's.  The same as `statement.scope` for a rule with no scope of its own, e.g. `return`
      const { nestedScope } = statement
      result = nestedScope.parser?.parse(tokens, parseAs, nestedScope)
      // forget it if we didn't parse the entire line
      if (result?.length !== tokens.length) return undefined
    }
    if (result) {
      statement.addMatch(result, "body")
      statement.data.body = result
    }
    return result
  }

  /**
   * The ONE line of `nestedBlock`, as an expression, when `block` (that line parsed as statements) can't read it,
   * and our line takes a value (`inlineAs` is `expression`):  e.g. a property's list on the line below its name,
   *   `its "days" is:` then `[the monday, the tuesday]`.
   * - Only when the WHOLE line reads as one:  else `undefined`, and the block's error stands.
   */
  private oneLineValue(statement: P.Match, nestedBlock: P.BlockToken, block: P.Match | undefined): P.Match | undefined {
    if (this.bodySpec?.inlineAs !== "expression" || !block?.is(Block)) return undefined
    if (!Block.getParseErrors(block)?.length) return undefined
    const [line, ...more] = nestedBlock.tokens
    if (more.length || !(line instanceof P.LineToken)) return undefined
    const { nestedScope } = statement
    const tokens = line.tokens.filter((token) => !(token instanceof P.CommentToken))
    const value = nestedScope.parser?.parse(tokens, "expression", nestedScope)
    return value?.length === tokens.length && !value.is(ParseError) ? value : undefined
  }

  /**
   * Does our indented body give back its LAST line's value, when that line is a value (epic `language` I47, Owen's C)?
   * - As Ruby and Rust do:  `to double it:` ending `its n * 2` returns it;  so does a property's last line,
   *   even a call, `quadruple it`.
   * - A value:  an expression, or a call of a method (`givesValue`).
   *   A line that's a statement stays one:  `set`, `if`, `for each`, `print`, `return` ...
   * - Default:  a body that takes a value, e.g. a property's (`inlineAs` is `expression`).
   *   `MethodDefinition` says yes for its actions and `to ...` methods too.
   */
  returnsLastLine(_statement: P.Match): boolean {
    return this.bodySpec?.inlineAs === "expression"
  }

  /**
   * Does our body answer yes or no, so its last line asks (`readsAsQuestion`)?
   * - e.g. `it is droppable when` (`ListGuard`), `it "is face up" if` (`QuotedTypeExpression`).
   * - Default:  no.
   */
  answersYesOrNo(_statement: P.Match): boolean {
    return false
  }

  /**
   * `block`, our indented body, giving back its last line's value -- see `returnsLastLine()`:
   * - its last line a value already (a call, `givesValue`):  `block`, noting that line as `returnsLast`
   * - its last line one no statement reads, but an expression does, e.g. `its n * x`:
   *   a new block, with that line read as the expression -- but not markup, which only a drawing reads
   * - else `undefined`, and `block` stands as it is
   * - `SP.Block.getAST()` writes the `return`.
   */
  private lastLineValue(
    statement: P.Match,
    nestedBlock: P.BlockToken,
    block: P.Match | undefined
  ): P.Match | undefined {
    if (!block?.is(Block)) return undefined
    const line = [...block.matched].reverse().find((item) => item instanceof P.Match && Block.isCodeLine(item))
    if (!(line instanceof P.Match)) return undefined
    const lineStatement = (line.data as { statement?: P.Match }).statement
    // a statement that asks, in a body answering yes or no (`the card is ...`):  read again, as a question
    const asks =
      lineStatement?.rule instanceof SpellStatement &&
      lineStatement.rule.readsAsQuestion &&
      this.answersYesOrNo(statement)
    if (lineStatement && !asks) {
      if (!(lineStatement.rule instanceof SpellStatement) || !lineStatement.rule.givesValue) return undefined
      block.data.returnsLast = lineStatement
      return block
    }
    // a line nothing read:  read as an expression, the whole of it
    const lineToken = line.tokens[0]
    if (!(lineToken instanceof P.LineToken) || (!asks && !Block.getParseErrors(line)?.length)) return undefined
    const { nestedScope } = statement
    const tokens = lineToken.tokens.filter((token) => !(token instanceof P.CommentToken))
    const value = nestedScope.parser?.parse(tokens, "expression", nestedScope)
    if (!value || value.is(ParseError)) return undefined
    // in a body answering yes or no, a question that reads up to a point:  the error is what's after it, as on one
    // line (`the card is on top` + "Don't understand `of its pile`"), not the whole line (epic `language` I101)
    const rest = tokens.slice(value.length)
    if (rest.length && !(this.answersYesOrNo(statement) && value.datatype === "choice")) return undefined
    if (asks && value.datatype !== "choice") return undefined
    const restError = rest.length ? nestedScope.parser?.parse(rest, "parse_error", nestedScope) : undefined
    // markup draws, only in a drawing:  anywhere else it stays an error (epic `elemental-spell` Q14)
    if (value.AST instanceof P.ASTJSXElement) return undefined
    const kept = line.matched.filter(
      (item) => !(item instanceof P.Match && (item.is(ParseError) || item === lineStatement))
    )
    const valueLine = new P.Match({
      rule: line.rule,
      matched: restError ? [...kept, value, restError] : [...kept, value],
      tokens: line.tokens,
      scope: line.scope
    })
    if (restError) valueLine.data.errors = [restError]
    const matched = block.matched.map((item) => (item === line ? valueLine : item)) as P.Match[]
    const result = (block.rule as Block).assembleBlock(nestedScope, nestedBlock, matched)
    if (result) result.data.returnsLast = value
    return result
  }

  /**
   * SIDE EFFECT hook:  change scope once our BODY has parsed, e.g. a method records what it returns.
   * - Run by `commitStatement()`, after `mutateScope()` and the body.  Default:  nothing.
   * - Returns what it recorded, as a string, if anything:
   *   `BlockLine.reparseBody()` compares it, so an edit to the body which changes it re-parses what follows.
   */
  mutateScopeFromBody(_match: P.Match): string | undefined {
    return undefined
  }

  /**
   * `match`, an outline body's line, as the sentence style would say it -- what editors show as "Reads as"
   * (epic page `outline-spell`, Q1:  hover teaches the long form).  `undefined` for any other line.
   * - Default:  a line whose subject (its `type` group) is the body's `it` / `its`, with the subject spelled out:
   *   - `it has a deck` => `a card has a deck`
   *   - `its "color" is red if ...` => `the "color" of a card is red if ...`
   *   - the same with the subject left out (`subject_implied`, epic page `outline-spell` P8):
   *     `has a deck`, `"color" is red if ...`
   * - Override where the sentence style says it differently, e.g. `define_property_has`'s `has ... as ...`.
   * - Its FIRST line only:  a body stays as written.
   * - In the scope's language:  its pack's `long-form-...` messages, e.g. Spanish's `una carta tiene ...`.
   */
  getLongForm(match: P.Match): string | undefined {
    const { subject, property } = SpellStatement.subjectOf(match)
    const subjectParams = SpellStatement.longFormParams(match)
    if (!subject || !subjectParams) return undefined
    const text = SpellStatement.firstLineOf(match)
    const language = SP.Language.of(match.scope)
    const spelledOut = language.parserMessage("long-form-subject", subjectParams)
    // `its <property> ...` => `the <property> of a <type> ...`
    const propertyOf = (propertyText: string) =>
      language.parserMessage("long-form-property", {
        ...subjectParams,
        property: propertyText,
        theProperty: language.withArticle("definite", propertyText)
      })
    const propertyText = property?.inputText.trimEnd()
    if (!subject.length) {
      if (propertyText && text.startsWith(propertyText)) {
        return `${propertyOf(propertyText)}${text.slice(propertyText.length)}`
      }
      return `${spelledOut} ${text}`
    }
    const at = subject.start! - match.start!
    const after = text.slice(at + subject.inputText.trimEnd().length).trimStart()
    if (subject.is(SubjectIt)) return `${text.slice(0, at)}${spelledOut} ${after}`
    if (!propertyText || !after.startsWith(propertyText)) return undefined
    return `${text.slice(0, at)}${propertyOf(propertyText)}${after.slice(propertyText.length)}`
  }

  /**
   * The params a long form's message names its subject with, if `match`'s subject is its outline body's type --
   * see `getLongForm()`:
   * - `type`:  the type's words as written, `card`
   * - `aType`:  with the article it takes in the scope's language, `a card`, `una carta`
   */
  static longFormParams(match: P.Match): { type: string; aType: string } | undefined {
    const typeWords = SpellStatement.subjectWords(match)
    if (!typeWords) return undefined
    const subjectType = P.SubjectScope.of(match.scope)?.subjectType
    return { type: typeWords, aType: SP.Language.of(match.scope).withArticle("indefinite", typeWords, subjectType) }
  }

  /**
   * The words for the type an outline body is about, e.g. `card`, if `match`'s subject is that body's `it` / `its`,
   * or left out (`subject_implied`) -- else `undefined`.  See `getLongForm()`.
   * - As its declaration wrote them, e.g. `stock pile` for `a "stock pile" is a pile where:`;
   *   the subject's own `raw` is the type's name run together, `stockpile`.
   */
  static subjectWords(match: P.Match): string | undefined {
    const { subject } = SpellStatement.subjectOf(match)
    const subjectScope = P.SubjectScope.of(match.scope)
    if (!subject || !subjectScope || !subject.is(SubjectRule)) return undefined
    const declared = (subjectScope.declaredBy?.groups as { type?: P.Match } | undefined)?.type
    return `${declared?.raw ?? subject.raw}`
  }

  /**
   * `match`'s subject and property:
   * its `type` and `property` groups, or its `type_property`'s, e.g. `property_value_either`'s `its "color"`.
   */
  static subjectOf(match: P.Match): { subject?: P.Match; property?: P.Match } {
    type Groups = { type?: P.Match; property?: P.Match; type_property?: P.Match }
    const groups = match.groups as Groups
    const holder = groups.type ? groups : ((groups.type_property?.groups as Groups | undefined) ?? groups)
    return { subject: holder.type, property: holder.property }
  }

  /**
   * `match`'s source text, up to the end of its first line.
   * - By its tokens' lines:  a body's line breaks aren't in its `inputText`, just their indents.
   */
  static firstLineOf(match: P.Match): string {
    const { line } = match
    return match.tokens
      .filter((token) => token.line === line)
      .join("")
      .trimEnd()
  }

  /**
   * If `match` RETURNS from the method it's in, e.g. `return the card`:  `{ value }`, the returned expression's match.
   * - `value` is `undefined` for a bare `return`.
   * - `undefined` if it doesn't return.  See `getReturnedDatatype()`.
   * - Default:  it doesn't.  `return_statement` overrides.
   */
  getReturnValue(_match: P.Match): { value: P.Match | undefined } | undefined {
    return undefined
  }

  /**
   * What our body RETURNS, e.g. `Card` for a body whose every `return` returns a card -- `undefined` if unknown.
   * - An inline EXPRESSION body (`the value of a card is its rank`):  that expression's datatype.
   * - Otherwise its `return` statements' (`getReturnValue()`), wherever they are, e.g. inside an `if`.
   *   - But NOT inside a body with a method scope of its own, e.g. a loop's:
   *     that compiles to a callback, whose `return` is its own.
   *   - All the same => that;  any other mix => unknown.  A bare `return` is `nothing`, and so is none at all.
   * - Reads ONLY matches:  call it once the body has parsed, e.g. from `mutateScopeFromBody()`.
   */
  getReturnedDatatype(match: P.Match): P.Datatype | undefined {
    const body = this.getBody(match)
    if (!body) return undefined
    if (!body.is(Block) && this.bodySpec?.inlineAs === "expression") return body.datatype
    const returned = new Set<P.Datatype | undefined>()
    visit(body)
    // its last line's value -- see `returnsLastLine()`
    const { returnsLast } = body.data as { returnsLast?: P.Match }
    if (returnsLast) returned.add(returnsLast.datatype)
    // no `return`, and no last line's value:  it gives nothing (`to turn it face up:  set its direction to up`);
    // not a drawing or a test, whose lines aren't its value
    if (!returned.size) return this.returnsLastLine(match) ? "nothing" : undefined
    return returned.size === 1 ? [...returned][0] : undefined

    /** Note the datatype of each `return` in `item`, a block, line or statement. */
    function visit(item: P.Match | undefined) {
      if (!item) return
      if (item.is(Block)) {
        for (const child of item.matched) if (child instanceof P.Match) visit(child)
        return
      }
      const statement = item.rule instanceof SpellStatement ? item : (item.data as { statement?: P.Match }).statement
      if (!(statement?.rule instanceof SpellStatement)) return
      const result = statement.rule.getReturnValue(statement)
      if (result) returned.add(result.value ? result.value.datatype : "nothing")
      // a callback's `return`s are its own:  a body with a method scope of its OWN, not one it's in (`return`'s ladder)
      else if (statement.nestedScope === statement.scope || !(statement.nestedScope instanceof P.MethodScope)) {
        visit(statement.rule.getBody(statement))
      }
    }
  }

  /**
   * The rule `rule` stands for:  the statement rule, if it's that rule's expression twin
   * (see `operandInExpressions`) -- else `rule` itself.
   * - e.g. for editors, mapping a call back to the method's `P.ScopeRule`
   */
  static statementRuleOf(rule: P.Rule): P.Rule {
    return (rule instanceof SpellStatement && rule.statementRule) || rule
  }

  /** Our syntax's groups, plus `body` if we take one. */
  getGroupSpecEntries(): P.GroupSpecEntry[] {
    const entries = super.getGroupSpecEntries()
    if (this.bodySpec) entries.push({ name: "body", optional: true, array: false })
    return entries
  }

  /** Echo our syntax back out as rulex, INCLUDING the body keyword we took out of `rules` (a `leadIn` one stayed). */
  toRulexSyntax() {
    const { matchGroup, optional } = this.getRulexFlags()
    const keyword = this.bodySpec?.leadIn ? undefined : this.bodySpec?.syntaxRule
    const rules = P.joinRulex([...this.rules, keyword].filter((rule): rule is P.Rule => !!rule))
    if (optional || matchGroup) return `(${matchGroup}${rules})${optional}`
    return `${rules}${optional}`
  }
}

/**
 * Props bag accepted by `SpellStatement`.
 * - Declare a body with a body keyword at the end of `syntax`, NOT here -- see `BODY_KEYWORDS`.
 */
export type SpellStatementProps = Prettify<
  P.SequenceProps & {
    bodySpec?: StatementBodySpec
  }
>

////////////////
// ## Committing a line's winning statement
////////////////

/**
 * Lock in a line's WINNING `statement`, in order:
 * - `mutateScope()` on it, then on each inline statement inside it, outermost first
 * - if it takes a nested body and `nextItem` is a `BlockToken`:
 *   - `bodyMark` in the parser's journal, if it has one, so incremental parsing can re-parse just the body
 *     -- see `P.IncrementalParse`
 *   - parse the body in its nested scope
 * - `mutateScopeFromBody()` on it, e.g. a method records what its body returns
 * - then `bodyEndMark`, after the body, so a body re-parsed on its own keeps what follows it
 * - NOTE: this is the ONLY place a parsed statement changes scope.
 *   - Candidates which lose the line never do, so their types / rules / variables can't leak.
 *   - Call it for any statement you parse on its own and keep, e.g. a JSX `on...` handler.
 */
export function commitStatement(statement: P.Match, nextItem?: P.Token): CommittedStatement {
  statement.rule.mutateScope(statement)
  mutateScopeForInlineStatements(statement)

  const committed: CommittedStatement = {}
  if (!(statement.rule instanceof SpellStatement)) return committed
  // a line with its body on it, and only comments under it:  its description, not a second body (epic `language` P48)
  const describedBelow =
    nextItem instanceof P.BlockToken &&
    !!statement.rule.getBody(statement) &&
    SpellStatement.codeLinesOf(nextItem).length === 0
  if (nextItem instanceof P.BlockToken && !describedBelow && statement.rule.takesNestedBody(statement)) {
    committed.bodyMark = statement.scope.parser?.journal?.mark()
    committed.body = statement.rule.parseNestedBlock(statement, nextItem)
  }
  committed.fromBody = statement.rule.mutateScopeFromBody(statement)
  if (committed.bodyMark) committed.bodyEndMark = statement.scope.parser?.journal?.mark()
  return committed
}

/** What `commitStatement()` did about a nested body. */
export type CommittedStatement = {
  /** Nested body's match, if one parsed. */
  body?: P.Match
  /** Journal mark just before the nested body was parsed, if there's a journal. */
  bodyMark?: P.JournalMark
  /**
   * Journal mark just after the body and what `mutateScopeFromBody()` recorded, with `bodyMark`:
   * what the journal holds from there on is the lines after it, which a re-parsed body keeps.
   */
  bodyEndMark?: P.JournalMark
  /** What `mutateScopeFromBody()` recorded, if anything. */
  fromBody?: string
}

/**
 * Call `mutateScope()` on every inline statement in `match` (its own, then those inside it), outermost first.
 * - Found by rule TYPE:  any `SpellStatement` match's `getBody()`, never by group name.
 * - Walks the whole match tree, as expressions can have them too, e.g. `list_filter`'s `where` clause.
 * - NEVER walks into a `Block`:  a nested block's lines were each committed by their own `BlockLine`,
 *   so doing them again would apply their scope changes twice.  (`mutateScope()` on the `Block` match
 *   itself is a no-op.)
 */
function mutateScopeForInlineStatements(match: P.Match) {
  if (match.is(Block)) return
  const body = match.rule instanceof SpellStatement ? match.rule.getBody(match) : undefined
  if (body && !body.is(Block)) body.rule.mutateScope(body)
  for (const item of match.matched) {
    if (item instanceof P.Match) mutateScopeForInlineStatements(item)
  }
}
