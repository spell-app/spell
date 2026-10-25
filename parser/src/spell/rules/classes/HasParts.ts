import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { Priority } from "spell-parser/spell/rules/rules.types"
import { getKnownType } from "spell-parser/spell/rules/types"
// Through the folder:  read only when called, once the folder has loaded
import { DrawIt } from "spell-parser/spell/rules/classes"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

/**
 * `has_parts` rule:  a view's PARTS, the named drawings it places (epic `elemental-spell` P5, Q55, Q56).
 * - e.g. `- it has parts "front" and "back"`, `a card has parts "front" and "back"`;
 *   Spanish's `- tiene las partes "frente" y "dorso"`
 * - Each part is drawn by its own `to draw its front:` (`draw_it`), here or in a type built on this one,
 *   and placed in a drawing by `draw its front` (`draw_part`).
 * - SIDE EFFECT:  each is one of its type's parts -- see `P.TypeScope.declarePart()`.
 * - Compiles to the list of them on the class, for whatever reads its parts:  `static parts = ["front", "back"]`.
 * - Declaring a part is optional:  its drawing declares it too.  Declare one that a type built on this one draws.
 */
export class HasParts extends SpellStatement<"type|parts"> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"

  /** The parts `match` declares, by name, e.g. `["front", "back"]` -- see `DrawIt.partName()`. */
  static partsOf(match: P.MatchFor<HasParts>): string[] {
    // the list's items:  its quoted names, between its commas and `and`s
    const names = match.groups.parts.matched.filter((item): item is P.Match => item instanceof P.Match && !!item.raw)
    return names
      .filter((name) => /^["']/.test(`${name.raw}`))
      .map((name) => DrawIt.partName(`${name.raw}`.replace(/^["']|["']$/g, "")))
  }

  mutateScope(match: P.MatchFor<this>) {
    const type = getKnownType(match.groups.type)
    for (const part of HasParts.partsOf(match)) type.declarePart(part, match)
  }

  getAST(match: P.MatchFor<this>): P.ASTStaticDefinition {
    const items = HasParts.partsOf(match).map((value) => new P.ASTStringLiteral(match, { value, quote: '"' }))
    return new P.ASTStaticDefinition(match, {
      type: P.matchAST<P.ASTTypeExpression>(match.groups.type),
      name: "parts",
      value: new P.ASTArrayLiteral(match, { items })
    })
  }
}
