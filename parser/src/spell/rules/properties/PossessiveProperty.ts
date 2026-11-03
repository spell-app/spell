import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import { Priority, declaredPrefix } from "spell/parser/spell/rules/rules.types"
import { MemberReadExpression } from "./MemberReadExpression"
import { PossessiveMark } from "./PossessiveMark"

/**
 * `possessive_property` rule:  `the character's name` ~== `the name of the character` (epic `language`, P16).
 * - A plural's apostrophe alone too (T23):  `the cards' names` ~== `the names of the cards`, whatever that reads,
 *   e.g. a list's own `names`, loose -- never each card's name.  Any word ending in `s`:  `the boss' name`.
 * - Reads a member as `property_expression` does:
 *   - the LONGEST run of words its owner's type declares, e.g. `the card's short rank + 1`
 *   - a built-in type's member, e.g. `the deck's length`
 *   - else ONE word, loose, warning when a type the project declares never says it has it
 * - Its owner is any operand ending at the `'s` (`possessive_owner`):
 *   `the X` as an action reads it, `its friend`, a bare local, another possessive -- but not a call:
 *   `double the card's rank` doubles the card's rank.
 *   - So a chain reads left to right:  `the character's friend's name`.
 *   - `it's name` is refused, saying `it's` means "it is" (`its-not-it-is`):  it still reads `its name`.
 *   - `the card' name` is refused, saying to write `the card's name` (`possessive-needs-s`):  it still reads it.
 * - After an `of`, the TYPES say which name the `'s` belongs to (Q16):
 *   - the nearest one when its type has the member, e.g. `the name of [the character's friend]`
 *   - else the whole phrase, when its type is known and has it, e.g. `[the first card of the deck]'s suit`:  a deck has no suit
 *   - both have it:  the nearest, and the phrase warns (`warnIfEitherReading()`)
 *   - a type not known:  the nearest
 * - `Priority.mostSpecific` for a member the type declares:  it beats every shorter reading of its owner's words,
 *   `the character` alone, and an `of` phrase holding the nearest reading when the whole phrase's is the one
 *   (it rejects itself otherwise).
 *   - A loose read is only `Priority.preferred`:  `the deck's first card` is the ordinal (`possessive_ordinal`).
 *   - Its owner's priority, when higher, e.g. a project's alias.
 * - English only:  Spanish says `el nombre del personaje`, and a translation writes that (`writtenAs`).
 */
export class PossessiveProperty extends MemberReadExpression<"expression|possessive_mark|property"> {
  @proto static priority = Priority.mostSpecific
  /** Another language writes it as `the X of Y`, its groups the same:  see `Translator`. */
  @proto static writtenAs = "property_expression"

  /** Quick test:  an `'s` after our first token. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return PossessiveMark.isIn(tokens, start)
  }

  /** Resolve our words through our owner's type -- or step aside for the nearest name, or refuse `it's`. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { expression: owner, possessive_mark: mark, property } = match.groups
    const misspelled = PossessiveProperty.refuseIfMisspelled(match, owner, mark, `${property.raw}`)
    if (!PossessiveProperty.belongsToWhole(scope, owner, property)) return undefined
    const ownerType = scope.getType(owner.datatype)
    const ownerPriority = owner.priority ?? owner.rule.priority
    const count = declaredPrefix(property, (words) => !!ownerType?.hasProperty(words))
    // fewer words than we took:  parse just those -- the loose read takes one
    const keep = count || 1
    if (keep < property.length) return this.parse(scope, tokens.slice(0, match.length - property.length + keep))
    match.data.ownerType = ownerType
    if (count) {
      this.resolveMember(match, ownerType, `${property.raw}`)
      match.priority = Math.max(Priority.mostSpecific, ownerPriority)
      return match
    }
    if (!PossessiveProperty.isLoose(scope, property)) return undefined
    match.priority = Math.max(Priority.preferred, ownerPriority)
    match.data.member = ownerType?.getMember(`${property.value}`)
    if (!match.data.member && !misspelled) MemberReadExpression.warnIfUndeclared(match, ownerType, property)
    return match
  }

  /** `owner.property`, or what `getMemberAST()` makes of it;  declared further down:  its type's record knows by now. */
  getAST(match: P.MatchFor<this>) {
    const { expression: owner, property } = match.groups
    if (!match.data.member && match.data.ownerType) {
      this.resolveMember(match, match.data.ownerType, `${property.raw}`)
    }
    return this.getMemberAST(match, P.asAST<P.ASTExpression>(owner.AST), property)
  }

  ////////////////
  // ## Which name it belongs to
  ////////////////

  /**
   * Warn when `phrase`, an `of` phrase reading a possessive, could mean its own `'s` too (Q16), e.g.
   * `the name of the character's friend`, when the name of the character has a friend:
   * `Read as the character's friend;  the name of the character has a friend too ...`.
   * - We read the nearest name's, as `belongsToWhole()` says.  The warning names the other, and how to say it.
   * - Re-parses `phrase` up to the possessive's owner, for what the whole phrase is:  only when it reads one.
   * - SIDE EFFECT:  notes it on `phrase`.  Call it WHILE PARSING `phrase`, with its `tokens`.
   */
  static warnIfEitherReading(scope: P.Scope, tokens: P.Token[], phrase: P.Match): void {
    const read = (phrase.rule as SpellExpression).ofObject(phrase)
    if (!read?.is(PossessiveProperty) || !read.data.member) return
    const { expression: owner, possessive_mark: mark, property } = read.groups
    const wholeLength = phrase.length - (read.length - owner.length)
    const whole = phrase.rule.parse(scope, tokens.slice(0, wholeLength))
    if (whole?.length !== wholeLength || !scope.getType(whole.datatype)?.hasProperty(`${property.raw}`)) return
    const message = SP.Language.of(scope).parserMessage("possessive-either", {
      owner: P.Tokenizer.join(owner.tokens),
      possessive: P.Tokenizer.join([...owner.tokens, ...mark.tokens]),
      property: `${property.raw}`,
      whole: P.Tokenizer.join(whole.tokens)
    })
    SP.SpellWarnings.note(phrase, message, read)
  }

  /**
   * Is the `'s` after `owner` ours -- or the nearest name's inside it, which reads it itself?  See class docs.
   * - `owner` an `of` phrase, e.g. `the name of the character`:  the nearest name is what it reads from, innermost.
   * - A lookup:  call it WHILE PARSING.
   */
  private static belongsToWhole(scope: P.Scope, owner: P.Match, property: P.Match): boolean {
    if (SP.SpellStatement.statementRuleOf(owner.rule) !== owner.rule) return false
    const nearest = PossessiveProperty.nearestNameIn(owner)
    if (nearest === owner) return true
    const nearestHasIt = PossessiveProperty.typeHas(scope, nearest, property)
    // unknown, or it has it:  the nearest's
    if (nearestHasIt !== false) return false
    return PossessiveProperty.typeHas(scope, owner, property) === true
  }

  /**
   * The name `owner` ends with, if it's an `of` phrase:  what it reads from, innermost --
   * `the character` in `the name of the friend of the character`;  else `owner` itself.
   */
  private static nearestNameIn(owner: P.Match): P.Match {
    let nearest = owner
    for (;;) {
      const { rule } = nearest
      const object = rule instanceof SpellExpression ? rule.ofObject(nearest) : undefined
      if (!object || object.tokens.at(-1) !== nearest.tokens.at(-1)) return nearest
      nearest = object
    }
  }

  /** Does what `match` is have a member starting `property`'s words?  `undefined` if its type isn't known. */
  private static typeHas(scope: P.Scope, match: P.Match, property: P.Match): boolean | undefined {
    const type = scope.getType(match.datatype)
    if (!type) return undefined
    return declaredPrefix(property, (words) => type.hasProperty(words)) > 0
  }

  /**
   * Refuse a possessive misspelled, saying how to write it -- `true` if it is:
   * - `it's name`:  `it's` means "it is" (`its-not-it-is`)
   * - `the card' name`:  an apostrophe alone after a word not ending in `s` (`possessive-needs-s`)
   * - `property`:  the words after it, for the message;  `ownerWords`:  the words before it, when not `owner`'s.
   * - SIDE EFFECT:  refuses `match`, at `owner`.  The line still parses as the possessive it means.
   */
  static refuseIfMisspelled(
    match: P.Match,
    owner: P.Match,
    mark: P.Match,
    property: string,
    ownerWords = P.Tokenizer.join(owner.tokens)
  ): boolean {
    const language = SP.Language.of(match.scope)
    let message: string | undefined
    if (PossessiveProperty.isIt(match.scope, owner)) message = language.parserMessage("its-not-it-is", { property })
    else if (PossessiveMark.needsS(owner, mark)) {
      message = language.parserMessage("possessive-needs-s", { owner: ownerWords, property })
    }
    if (message) SP.SpellWarnings.refuseIf(match, message, () => true, owner)
    return !!message
  }

  /**
   * Refuse a possessive DECLARATION misspelled, e.g. `a card' value is ...` (T24) -- see `refuseIfMisspelled()`.
   * - `match`:  a declaration's, with groups `type`, `property` and, when it's a possessive, `possessive_mark`.
   * - SIDE EFFECT:  refuses `match`.
   */
  static refuseIfDeclarationMisspelled(match: P.Match): void {
    const { type, possessive_mark: mark, property } = match.groups as Partial<Record<string, P.Match>>
    if (!mark || !type || !property) return
    const before = match.tokens.slice(0, match.tokens.indexOf(mark.tokens[0]!))
    PossessiveProperty.refuseIfMisspelled(match, type, mark, `${property.raw}`, P.Tokenizer.join(before))
  }

  /** Is `owner` the word `it`, alone:  `it's name`? */
  static isIt(scope: P.Scope, owner: P.Match): boolean {
    const [word] = owner.tokens
    if (owner.tokens.length !== 1 || !(word instanceof P.WordToken)) return false
    const itWords = SP.Language.of(scope).words.itWords ?? new Set(["it"])
    return itWords.has(`${word.value}`.toLowerCase())
  }

  /** Is `property`, a `member_words` match, ONE word the `property` rule takes:  lower case, not blacklisted? */
  private static isLoose(scope: P.Scope, property: P.Match): boolean {
    return property.length === 1 && scope.getRuleOrDie("property").test(scope, property.tokens, 0) !== false
  }
}
