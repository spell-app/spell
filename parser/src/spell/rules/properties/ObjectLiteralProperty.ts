import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { Wording } from "spell-lang/spell/rules/expressions"

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
 * `flag_object_literal_property` rule:  `jokers` -- a property's name alone, meaning `jokers = yes`
 * (epic `outline-spell` P26).
 * - e.g. `a new deck with jokers`, `a new deck with jokers and name = "big"`
 * - One word, then the end, a comma or `and` (`and_or`, meaning `and`):  a word with more after it is something else.
 */
export class FlagObjectLiteralProperty extends ObjectLiteralProperty {
  @proto static alias = "object_literal_property"

  /** Quick test:  one word, then nothing, `,` or `and`. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    const next = tokens[start + 1]
    if (!tokens[start]) return false
    return !next || next.matchesLiteral(",") || Wording.lengthAt(scope, "and_or", tokens, start + 1, "and") > 0
  }

  getAST(match: P.MatchFor<this>) {
    return new P.ASTObjectLiteralProperty(match, {
      property: P.asAST<P.ASTPropertyLiteral>(match.groups.property.AST),
      value: new P.ASTBooleanLiteral(match, true)
    })
  }
}
