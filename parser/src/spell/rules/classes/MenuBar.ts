import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `menu_bar` rule:  which of an app's menus is its MENU BAR (epic `elemental-spell` P10, Q34).
 * - e.g. `- its menu bar is "game menu"`;  Spanish's `- su barra de menú es "menú del juego"`
 * - spellx's twin:  the app tag's `menu-bar="GameMenu"`.
 * - Compiles to the name on the class, `static menuBar = "game menu"`:
 *   the page draws that menu along its top (`core.menuBarOf()`).
 */
export class MenuBar extends SpellStatement<"type|menu"> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>): P.ASTStaticDefinition {
    const value = `${match.groups.menu.raw}`.trim().replace(/^["']|["']$/g, "")
    return new P.ASTStaticDefinition(match, {
      type: P.matchAST<P.ASTTypeExpression>(match.groups.type),
      name: "menuBar",
      value: new P.ASTStringLiteral(match, { value, quote: '"' })
    })
  }
}
