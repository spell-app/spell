import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { COLLECTION_NAME } from "spell/parser/spell/rules/places/places.shared"
import { textIn } from "spell/parser/spell/rules/places/PlaceDetail"

/**
 * `published_as` rule:  a type's records are published as a Lexicon, AT Protocol's schema language,
 * so other apps can read them (epic `atmosphere` P10):
 * - `- it is published as "xyz.statusphere.status"`:  under that name, e.g. another app's, read in from its Lexicon
 * - `- it is published`:  under the name its project's address gives it, by `SC.nsidFor()`:
 *   `space.spell.owen.recipes.recipe`, for a recipe in `owen@spell/recipes`
 * - What it MARKS:  `spell compile` writes every library type's Lexicon, but only a published type
 *   - is watched for what can't make the round trip
 *   - is published by `spell app lexicon publish`
 *   - A decimal number (`- its "price" is a number`):  Lexicon has none, so it's kept as text.
 *     Warned here, naming every one the type declares, wherever its line is.
 *   - A rename (`a recipe version 2 renames name to title`):  warned at that line (`version_step`).
 * - Refused for a built-in type, as `saved_inline` is;  and for a name that isn't an NSID.
 * - Compiles to `Status.publishedAs = "xyz.statusphere.status"`, or `= true`, after the class.
 */
export class PublishedAs extends SpellStatement<"type|name?"> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"

  /**
   * Refused for a built-in type, or a name that's no NSID.
   * - SIDE EFFECT:  the decimals warning -- see class docs.
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { type, name } = match.groups
    const language = SP.Language.of(scope)
    const { scopeType } = type.data as { scopeType?: unknown }
    if (!(scopeType instanceof P.TypeScope)) return match
    if (SP.isBuiltInTypeScope(scopeType)) {
      const typeName = language.wordFor(SP.typeName(`${type.value}`))
      return SpellStatement.refuse(match, language.parserMessage("cant-publish-built-in", { type: typeName }))
    }
    if (name && !COLLECTION_NAME.test(textIn(name))) {
      return SpellStatement.refuse(match, language.parserMessage("published-not-a-name", { name: textIn(name) }))
    }
    const decimals = () => PublishedAs.decimalFieldsOf(scopeType)
    SP.SpellWarnings.noteIf(
      match,
      () => language.parserMessage("published-decimals", { fields: decimals().join(", ") }),
      () => decimals().length > 0,
      match,
      "published-decimals"
    )
    return match
  }

  /** SIDE EFFECT:  our type is published -- see `P.TypeScope.declarePublished()`. */
  mutateScope(match: P.MatchFor<this>) {
    const { scopeType } = match.groups.type.data as { scopeType?: unknown }
    if (!(scopeType instanceof P.TypeScope)) return
    const { name } = match.groups
    scopeType.declarePublished(name ? { name: textIn(name) } : {}, match)
  }

  getAST(match: P.MatchFor<this>): P.ASTPatchedMember {
    const { name } = match.groups
    const publishedAs = new P.ASTStaticDefinition(match, {
      type: P.matchAST<P.ASTTypeExpression>(match.groups.type),
      name: "publishedAs",
      value: name
        ? new P.ASTStringLiteral(match, { value: textIn(name), quote: '"' })
        : new P.ASTBooleanLiteral(match, true)
    })
    return new P.ASTPatchedMember(match, { member: publishedAs })
  }

  /** The words of each decimal number `type` (and what it's built on) declares, as the program wrote them. */
  static decimalFieldsOf(type: P.TypeScope): string[] {
    return type
      .chain()
      .flatMap((each) => each.variables.get())
      .filter(({ datatype }) => datatype === "number")
      .map(({ name, asWritten }) => asWritten ?? name.replace(/_/g, " "))
  }
}
