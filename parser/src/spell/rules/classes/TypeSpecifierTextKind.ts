import { proto, type PropRule } from "spell/util"
import { P } from "spell-parser/parser"
import { Priority } from "spell-parser/spell/rules/rules.types"
import { Wording } from "spell-parser/spell/rules/expressions"

/**
 * `type_specifier_text_kind` rule:  makes a property text that must be a web address or an email address.
 * - e.g. `as a url`, `as an email`
 * - Its datatype is `text`.
 * - Which kind is what its word rule's word means, `url_or_email`:  whatever the language.
 * - The property also gets the rule `must be a url` (or `an email`), as if it said so:
 *   see `define_property_has`'s `rulesOf()`.
 * - `Priority.specific`, so it wins over `as a {type}`, which would take `url` for a type of the project's.
 * - Epic `property-editor` P9.
 */
export class TypeSpecifierTextKind extends P.Sequence<"kind"> {
  @proto static alias = "type_specifier"
  @proto static datatype = "text"
  @proto static priority = Priority.specific

  /** The rule it brings:  `{ type: "url" }` or `{ type: "email" }`. */
  static ruleOf(match: P.Match): PropRule {
    const { kind } = (match as P.MatchFor<TypeSpecifierTextKind>).groups
    return { type: Wording.meaningOf(kind) === "url" ? "url" : "email" }
  }

  getAST(match: P.MatchFor<this>): P.ASTTypeExpression {
    return new P.ASTTypeExpression(match, { raw: `${match.groups.kind.value}`, name: "text" })
  }
}
