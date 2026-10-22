import { isNode } from "browser-or-node"

import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { Negatable, Wording } from "spell-lang/spell/rules/expressions"
import { SubjectImplied, SubjectRule } from "spell-lang/spell/rules/types"
import { Priority } from "spell-lang/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"
import { MethodDefinition } from "./MethodDefinition"
import type { MethodSignatureData } from "./methods.shared"

/**
 * `quoted_type_expression` rule:  defines an ad-hoc expression on a type from a QUOTED signature,
 * e.g. `a thing "nerds out" if`, `a thing "is a bug" if`, `a thing "nerds out with (another as a thing)" if`.
 * - `Priority.belowDeclaration`:  defers to more specific method-definition rules in `classes/`
 *   (e.g. `define_property_has`) when both could match the same tokens.
 * - Quoting the signature (`quoted_method_signature`) lets it start with plain english words
 *   (`is`, `has`, `can`, `will`, ...) that would otherwise collide with other statement/expression rules.
 * - Trailing `if` / `is` is a no-op keyword purely for readability:
 *   `a thing "is a bug" if` vs. plain `a thing "is a bug"`.  Neither is captured into `match.groups`.
 * - `{expression_body}?`:  the inline body (`a thing "nerds out" if yes`) parses as an `expression`,
 *   not a `statement` like other `MethodDefinition` subclasses,
 *   since the result compiles to a getter/method returning a value.
 * - `parse()` rejects signatures that don't start with a keyword, or that captured more than one argument:
 *   only zero- or one-arg expressions are supported.
 * - `processSignature()` decides the form:
 *   - postfix (`asPostfixExpression`, zero args), e.g. `card.isABug`
 *   - or infix (`asInfixExpression`, one arg), e.g. `card.nerdsOutWithAnother(thing)`
 *   - It rewrites `is` / `can` / `will` / `has` into a negatable `{operator}` group,
 *     so the positive and negative phrasings (`is` / `is not` / `isn't` / `isnt`) compile to the same rule,
 *     with `shouldNegateOutput()` flipping the output.
 */
export class QuotedTypeExpression extends MethodDefinition<"type|signature|body?"> {
  @proto static priority = Priority.belowDeclaration
  @proto static alias = "statement"

  /**
   * Reject the match if its (quoted) signature doesn't start with a keyword, or captured more than one arg.
   * - `quoted_type_expression` only supports plain (`nerds out`) or single-arg (`nerds out with (x as y)`) forms.
   */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (match) {
      const signature = this.getSignature(match)!
      if (!signature.startsWithKeyword) {
        if (!isNode) {
          // console.warn("quoted_type_expression: must start with a keyword. Skipping match.", { tokens, match })
        }
        return undefined
      }
      if (signature.args.length > 1) {
        if (!isNode) {
          // console.warn("quoted_type_expression: too many arguments. Skipping match.", { tokens, match })
        }
        return undefined
      }
      if (QuotedTypeExpression.isPropertyWithoutSubject(match, tokens)) return undefined
      const refused = SpellStatement.refuseUnknownType(match, match.groups.type)
      if (refused !== match) return refused
      if (QuotedTypeExpression.isPropertySlip(scope, tokens)) {
        const whole = match.clone({ matched: tokens, tokens: [...tokens] })
        const name = (tokens[1] as P.TextToken).innerText
        return SpellStatement.refuse(whole, `A property starts "its":  write its "${name}" is ...`)
      }
      if (QuotedTypeExpression.isBodiless(match, tokens)) {
        const phrase = match.groups.signature.inputText.trim()
        return SpellStatement.refuse(match, `${phrase} has no body:  write ${phrase} always, or ${phrase} if ...`)
      }
    }
    return match
  }

  /**
   * Is `match` the quoted phrase and NOTHING more:  no `if` / `is` / `:`, no body?
   * - e.g. `- it "can move"` (epic page `outline-spell` I6)
   * - Refused, saying so:  it'd compile to an empty method, `get canMove() {}`, always `undefined`.
   * - A dangling `if` is fine:  its body may be the indented lines below.
   */
  private static isBodiless(match: P.MatchFor<QuotedTypeExpression>, tokens: P.Token[]): boolean {
    const lastOfSignature = match.groups.signature.tokens.at(-1)
    const after = tokens.slice(tokens.indexOf(lastOfSignature!) + 1)
    return !after.join("").trim()
  }

  /**
   * Is `match` a property, not a phrase:  its subject left out, then `is` or `are` (`is_or_are`) after the quoted name?
   * - e.g. `- "color" is red if ...` or `- "short name" is: ...` in an outline body (epic page `outline-spell`, P8)
   * - Not ours:  the property rules take it, as they take `its "color" is ...`.
   *   We'd outrank them (`Priority.belowDeclaration`), and take the quoted name alone.
   */
  private static isPropertyWithoutSubject(match: P.MatchFor<QuotedTypeExpression>, tokens: P.Token[]): boolean {
    if (!match.groups.type.is(SubjectImplied)) return false
    const lastOfSignature = match.groups.signature.tokens.at(-1)
    return Wording.lengthAt(match.scope, "is_or_are", tokens, tokens.indexOf(lastOfSignature!) + 1) > 0
  }

  /**
   * Is `tokens` a property written with `it` for `its` in an outline body, e.g. `- it "rank" is a number`
   * (epic page `outline-spell`, todo T3)?
   * - `it` (`subject_it`), a quoted member name (no verb, so not a phrase like `"is face up"`), then `is`
   *   (`is_or_is_not`, not negated).
   * - Refused, saying so:
   *   read as a phrase, it'd make an empty `get rank() {}`, and say only "Don't understand `a number`".
   */
  private static isPropertySlip(scope: P.Scope, tokens: P.Token[]): boolean {
    const [subject, name, is] = tokens
    return (
      SubjectRule.reads(scope, "subject_it", subject) &&
      !!name &&
      !!scope.getRuleOrDie("quoted_member").test(scope, [name]) &&
      !!is &&
      Wording.reads(scope, "is_or_is_not", `${is.value}`.toLowerCase())
    )
  }

  /**
   * Turn the quoted signature into a postfix (no args) or infix (one arg) expression on `groups.type`.
   * - SIDE EFFECT: sets `signature.instanceType` directly from the OUTER `{type:singular_type}`
   *   capture -- bypasses `MethodDefinition`'s normal inline-type-promotion path (`inlineInitialType`)
   *   entirely, since the type here is captured outside the (quoted) signature, not inside it.
   * - Zero args => `asPostfixExpression`.
   * - One arg => `asInfixExpression`, and its single `{callArgs:expression}` syntax bit is rewritten
   *   to `{expression:operand}` -- see `getRule()`'s infix-rule branch.
   * - More than one arg isn't handled (see `parse()`'s rejection above) -- the `TODO` in the `else`
   *   branch notes the unimplemented `{thisArg:operand}` prefix for that case.
   * - Rewrites the FIRST `is`/`can`/`will`/`has` bit found (scanning signature order) into an
   *   `(operator:...)` alternation so all its negated spellings (`is not`, `isn't`, `isnt`, etc.) share
   *   one compiled rule; `shouldNegateOutput()` then flips `P.ASTExpression` output for a match on
   *   anything other than the bare positive form.
   */
  processSignature(
    groups: P.MatchGroups & { type: P.Match },
    signature: MethodSignatureData,
    scope: P.Scope
  ): MethodSignatureData {
    signature.instanceType = groups.type.raw
    if (signature.args.length === 0) {
      signature.asPostfixExpression = true
      // a value kind's phrase:  its static method -- see `MethodSignatureData.valueKindOf`
      const { scopeType } = groups.type.data as { scopeType?: unknown }
      if (scopeType instanceof P.TypeScope && scopeType.valueKind) signature.valueKindOf = scopeType.name
    } else if (signature.args.length === 1) {
      signature.asInfixExpression = true
      signature.syntaxBits = signature.syntaxBits.map((bit) => (bit.startsWith("{") ? "{expression:operand}" : bit))
    } else {
      // TODO: we don't handle this currently...
      // signature.syntaxBits.unshift("{thisArg:operand}")
    }
    // FIRST negatable word, e.g. `is`, matches all its forms, e.g. `isn't`, in the parser's language;
    // `is a` + a word matches `are not a` too, e.g. `cards which are not a face card` -- see `Negatable`
    if (signature.asPostfixExpression || signature.asInfixExpression) {
      signature.syntaxBits = negatableSyntaxBits(scope, signature.syntaxBits)
    }
    // console.warn(signature)
    return signature
  }
}

/**
 * A phrase's syntax bits with its first negatable word as an `{operator:<rule>}`, e.g. `is a face card` =>
 * `{operator:is_or_is_not_a} face card`, so it matches `isn't a face card` and `are not a face card` too.
 * - The longest reading wins:  the first TWO words (`is a`) before the first one (`is`) -- `Negatable.ruleReading()`.
 * - Words, not rule names:  `es` in Spanish reads as `is_or_is_not` just as `is` does in English.
 * - Only the first:  `is face up if ...` keeps the rest as written.
 */
export function negatableSyntaxBits(scope: P.Scope, bits: string[]): string[] {
  for (let index = 0; index < bits.length; index++) {
    const bit = bits[index]!
    if (bit.startsWith("{") || bit.startsWith("(")) continue
    const next = bits[index + 1]
    const pair =
      next && !next.startsWith("{") && !next.startsWith("(")
        ? Negatable.ruleReading(scope, `${bit} ${next}`)
        : undefined
    if (pair) return [...bits.slice(0, index), `{operator:${pair}}`, ...bits.slice(index + 2)]
    const single = Negatable.ruleReading(scope, bit)
    if (single) return [...bits.slice(0, index), `{operator:${single}}`, ...bits.slice(index + 1)]
  }
  return bits
}
