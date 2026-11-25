import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { MemberReadExpression } from "./MemberReadExpression"
import { PossessiveMark } from "./PossessiveMark"

/**
 * `quoted_key_read` rule:  `the "run_by" of its meta` ~== `meta.run_by`, a key read off a thing or an object by
 * the key AS WRITTEN, in quotes.
 * - For a key a member's words can't say:  `run_by`, `Display Title`, `x-total` -- what an object type keeps as a
 *   row sent it (`Thing.keepsEveryKey`), or a plain `is an object`.
 *   - Unquoted, `the run_by of its meta` reads Spell's name for those words, `runBy`, which such a key isn't under.
 * - A key its owner's type declares, by its name or its words (`checked_at` for `its "checked at"`), reads that
 *   member, as `the checked at of its meta` would:  the row's key was made Spell's name as it was read.
 * - Any other key reads off it as written, nothing when it isn't there, and warns of nothing.
 * - `possessive_quoted_key_read`:  the same, `its meta's "run_by"` (`PossessiveQuotedKeyRead`).
 */
export class QuotedKeyRead extends MemberReadExpression<"key|expression"> {
  @proto static priority = Priority.preferred

  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    QuotedKeyRead.resolveKey(match, match.groups.expression)
    return match
  }

  getAST(match: P.MatchFor<this>) {
    return QuotedKeyRead.keyAST(match, match.groups.expression)
  }

  /** The key inside `key`'s quotes, as written. */
  static keyOf(match: P.Match): string {
    const key = (match.groups as Record<string, P.Match>).key!
    return (key.matched[0] as P.TextToken).innerText
  }

  /** SIDE EFFECT:  notes the member `owner`'s type declares by the key's name or words, if it does. */
  static resolveKey(match: P.Match, owner: P.Match): void {
    const ownerType = match.scope.getType(owner.datatype)
    const data = match.data as { ownerType?: P.TypeScope; member?: unknown }
    data.ownerType = ownerType
    const key = QuotedKeyRead.keyOf(match)
    const words = key
      .split(/[\s_-]+|(?<=[a-z0-9])(?=[A-Z])/)
      .filter(Boolean)
      .map((word) => word.toLowerCase())
      .join(" ")
    data.member = [key, words].map((said) => MemberReadExpression.propertyOf(ownerType, said)).find(Boolean)
  }

  /**
   * `owner.member` for a member its type declares;  else `owner.key`, or `owner["key"]`, the key as written.
   * - Looked for again:  a type declared further down, or in a later file, knows its members by now.
   */
  static keyAST(match: P.Match, owner: P.Match): P.ASTExpression {
    const object = P.asAST<P.ASTExpression>(owner.AST)
    if (!(match.data as { member?: unknown }).member) QuotedKeyRead.resolveKey(match, owner)
    const { member } = match.data as { member?: P.ScopeVariable }
    if (member) return new P.ASTPropertyExpression(match, { object, property: member.name })
    const property = new P.ASTPropertyLiteral(match, { value: QuotedKeyRead.keyOf(match), asWritten: true })
    return new P.ASTPropertyExpression(match, { object, property })
  }
}

/** `possessive_quoted_key_read` rule:  `its meta's "run_by"` ~== `the "run_by" of its meta` (`QuotedKeyRead`). */
export class PossessiveQuotedKeyRead extends MemberReadExpression<"expression|possessive_mark|key"> {
  @proto static priority = Priority.mostSpecific
  /** Another language writes it as `the "key" of Y`, its groups the same. */
  @proto static writtenAs = "quoted_key_read"

  /** Quick test:  an `'s` after our first token. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return PossessiveMark.isIn(tokens, start)
  }

  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    QuotedKeyRead.resolveKey(match, match.groups.expression)
    return match
  }

  getAST(match: P.MatchFor<this>) {
    return QuotedKeyRead.keyAST(match, match.groups.expression)
  }
}
