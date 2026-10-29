import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import type { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { getKnownType, SpellType } from "spell/parser/spell/rules/types"
// Through the folder:  read only when called, once the folder has loaded
import { DrawIt } from "spell/parser/spell/rules/classes"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `has_slots` rule:  a view's SLOTS, the named drawings it places (epic `elemental-spell` P5, Q55, Q56;  P27).
 * - e.g. `- it has slots "front" and "back"`, `a card has slots "front" and "back"`;
 *   Spanish's `- tiene las ranuras "frente" y "dorso"`
 * - Each slot is drawn by its own `to draw its front:` (`draw_it`), here or in a type built on this one,
 *   and placed in a drawing by `draw its front` (`draw_slot`).
 * - Where the view is drawn, a slot can be filled from outside:  `<card><text slot="front">Ace</text></card>`
 *   -- see `draw_slot`.
 * - SIDE EFFECT:  each is one of its type's slots -- see `P.TypeScope.declareSlot()`.
 * - Compiles to the list of them on the class, for whatever reads its slots:  `static slots = ["front", "back"]`.
 * - Declaring a slot is optional:  its drawing declares it too.  Declare one that a type built on this one draws.
 * - The old word, `it has parts ...`, still reads, as an error naming `slots`, which `spell lint --fix` writes:
 *   see `SpellType.noteRetiredLiterals()`.
 */
export class HasSlots extends SpellStatement<"type|slots", { declaresSlots?: SP.DeclaredSlots }> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"

  /** Notes the old word, `parts`, if it says it -- see the class's docs. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    return match && SpellType.noteRetiredLiterals(match)
  }

  /** The slots `match` declares, by name, e.g. `["front", "back"]` -- see `DrawIt.slotName()`. */
  static slotsOf(match: P.MatchFor<HasSlots>): string[] {
    // the list's items:  its quoted names, between its commas and `and`s
    const names = match.groups.slots.matched.filter((item): item is P.Match => item instanceof P.Match && !!item.raw)
    return names
      .filter((name) => /^["']/.test(`${name.raw}`))
      .map((name) => DrawIt.slotName(`${name.raw}`.replace(/^["']|["']$/g, "")))
  }

  /**
   * SIDE EFFECT:  each of its slots is one of its type's.
   * - Noted in `match.data.declaresSlots` too, for the project's declarations:  slots aren't scope records, so an
   *   importer -- or a root loading a built-in template -- learns them from there (`SP.SpellDeclarations`).
   */
  mutateScope(match: P.MatchFor<this>) {
    const type = getKnownType(match.groups.type)
    const slots = HasSlots.slotsOf(match)
    for (const slot of slots) type.declareSlot(slot, match)
    match.data.declaresSlots = { of: type.name, slots }
  }

  getAST(match: P.MatchFor<this>): P.ASTStaticDefinition {
    const items = HasSlots.slotsOf(match).map((value) => new P.ASTStringLiteral(match, { value, quote: '"' }))
    return new P.ASTStaticDefinition(match, {
      type: P.matchAST<P.ASTTypeExpression>(match.groups.type),
      name: "slots",
      value: new P.ASTArrayLiteral(match, { items })
    })
  }
}
