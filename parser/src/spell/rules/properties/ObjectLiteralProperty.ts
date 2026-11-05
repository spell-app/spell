import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Wording } from "spell/parser/spell/rules/expressions"

/**
 * `object_literal_property` rule:  single object-literal property declaration:
 *   `{property} (=|is|of) {value:expression}`.
 * - Its name is `member_words`, e.g. `short rank is 1`,
 *   or a `property` for a structural word, e.g. `a = 1`.
 */
export class ObjectLiteralProperty extends P.Sequence<"property|value"> {
  getAST(match: P.MatchFor<this>) {
    const { property, value } = match.groups
    return new P.ASTObjectLiteralProperty(match, {
      property: P.asAST<P.ASTPropertyLiteral>(property.AST),
      value: P.asAST<P.ASTExpression>(value.AST)
    })
  }
}
/**
 * `named_object_literal_property` rule:  `name T1` --
 * a one-word property and a bare name, no `=` (epic `outline-spell` P19).
 * - e.g. `a new tableau with name T1`, as `tableau T1` names it
 * - The name starts with a capital letter (`thing_name`);  a lowercase one is written `name = "t1"`.
 */
export class NamedObjectLiteralProperty extends ObjectLiteralProperty {
  @proto static alias = "object_literal_property"

  /** Quick test:  two words, the second starting with a capital letter. */
  test(_scope: P.Scope, tokens: P.Token[], start = 0) {
    return /^\p{Lu}/u.test(`${tokens[start + 1]?.value ?? ""}`)
  }
}

/**
 * `flag_object_literal_property` rule:  `jokers` --
 * a property's name alone, meaning `jokers = yes` (epic `outline-spell` P26).
 * - e.g. `a new deck with jokers`, `a new deck with jokers and name = "big"`
 * - Several words, when a type declares them (`declared_member_words`, epic `data` P32):  `a new card with face up`.
 * - Its words, then the end, a comma or `and` (`and_or`, meaning `and`):  a word with more after it is something else.
 */
export class FlagObjectLiteralProperty extends ObjectLiteralProperty {
  @proto static alias = "object_literal_property"

  /** Quick test:  a word, then nothing, `,`, `and` -- or another word, for a name of several (`face up`). */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    if (!tokens[start]) return false
    return tokens[start + 1] instanceof P.WordToken || endsAProperty(scope, tokens, start + 1)
  }

  /** Its words, then nothing, `,` or `and`. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    return match && endsAProperty(scope, tokens, match.length) ? match : undefined
  }

  getAST(match: P.MatchFor<this>) {
    return new P.ASTObjectLiteralProperty(match, {
      property: P.asAST<P.ASTPropertyLiteral>(match.groups.property.AST),
      value: new P.ASTBooleanLiteral(match, true)
    })
  }
}

/**
 * `said_object_literal_property` rule:  `suit hearts`, `short name "foo"` --
 * a property and its value, no `=` (epic `data` P32, I68).
 * - e.g. `a new card with suit hearts, rank queen, short name "foo"`
 * - The property is the longest run of words some type declares (`declared_member_words`), any number of them;
 *   the value is any expression.
 * - After `name T1` (`named_object_literal_property`):  a tie goes to it, so `T1` stays a name.
 */
export class SaidObjectLiteralProperty extends ObjectLiteralProperty {
  @proto static alias = "object_literal_property"
}

/**
 * `the_object_literal_property` rule:  `the suit` -- the property `suit`, set to what `the suit` means where the line is
 * (epic `data` P32, Q30).
 * - e.g. `a new card with the suit`, `a new card with the suit and the rank`
 * - Spanish's `una nueva carta con el palo`.
 * - Its words, `the` and all, are read as an expression, in the line's own scope:  a local, a property of the thing
 *   the action is on, ...  Read as nothing:  no match.
 * - Then the end, a comma or `and` (`and_or`, meaning `and`), as `flag_object_literal_property`:
 *   `the suit of the deck` is something else.
 */
export class TheObjectLiteralProperty extends P.Sequence<"property", { value?: P.Match }> {
  @proto static alias = "object_literal_property"

  /** `the suit` as the line reads it, its value:  only when that's all of its words, and they end the property. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match || !endsAProperty(scope, tokens, match.length)) return undefined
    const value = scope.getRuleOrDie("expression").parse(scope, match.tokens)
    if (value?.length !== match.length) return undefined
    match.data.value = value
    return match
  }

  getAST(match: P.MatchFor<this>) {
    return new P.ASTObjectLiteralProperty(match, {
      property: P.asAST<P.ASTPropertyLiteral>(match.groups.property.AST),
      value: P.asAST<P.ASTExpression>(match.data.value!.AST)
    })
  }
}

/** Does a property end at `tokens[index]`:  nothing more, a `,` or `and`? */
function endsAProperty(scope: P.Scope, tokens: P.Token[], index: number): boolean {
  const next = tokens[index]
  return !next || next.matchesLiteral(",") || Wording.lengthAt(scope, "and_or", tokens, index, "and") > 0
}
