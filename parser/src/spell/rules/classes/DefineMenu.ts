import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
import { Priority } from "spell-parser/spell/rules/rules.types"
import { getKnownType } from "spell-parser/spell/rules/types"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

/**
 * `define_menu` rule:  a template's named MENU, a list of its actions (epic `elemental-spell` P10, Q34, Q41).
 * - e.g. `- its "game menu" is a menu of "deal", "-", "undo" and "redo"`;
 *   Spanish's `- su "menú del juego" es un menú de "repartir", "-", "deshacer" y "rehacer"`
 * - spellx's twin:  `<menu "game menu">` holding `<action "deal" />` ... (`SpellxTwin.menu()`).
 * - Each item names one of the template's actions as it's written (`to deal:` is `"deal"`), or the app's own `undo`
 *   and `redo` (`SP.LanguageWords.appActions`:  Spanish's `deshacer`, `rehacer`);  `"-"` is a line between groups.
 * - Compiles to the menu on the class, which a toolbar, the app's menu bar and a `context-menu=` draw by its name:
 *   `core.describeMenu(Game, "gameMenu", { items: ["deal", "-", "undo", "redo"] })` -- see core's `acting.ts`.
 * - An item naming no action of the template is still written, as its words:  the page leaves it out, saying so.
 */
export class DefineMenu extends SpellStatement<"type|menu|items", { members?: string[] }> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"

  /** The items `match` lists, as written:  `["deal", "-", "undo"]`. */
  static itemsOf(match: P.MatchFor<DefineMenu>): string[] {
    const items = match.groups.items.matched.filter((item): item is P.Match => item instanceof P.Match && !!item.raw)
    return items.filter((item) => /^["']/.test(`${item.raw}`)).map((item) => unquoted(`${item.raw}`))
  }

  /** Each item's method, looked up while parsing (`getAST()` is pure):  `match.data.members`. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const type = getKnownType(match.groups.type)
    const { appActions } = SP.Language.of(scope).words
    match.data.members = DefineMenu.itemsOf(match).map(
      (item) => (item === "-" ? item : appActions[normalWords(item)]) ?? methodNamed(type, item)
    )
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTTypeDescription {
    const members = match.data.members ?? []
    return new P.ASTTypeDescription(match, {
      type: P.matchAST<P.ASTTypeExpression>(match.groups.type),
      describes: "menu",
      // `game_menu`:  the writer names it as it names a member, `gameMenu`
      name: unquoted(`${match.groups.menu.raw}`)
        .trim()
        .replace(/[\s-]+/g, "_"),
      description: { items: { members } }
    })
  }
}

/** `"game menu"` => `game menu`. */
function unquoted(text: string): string {
  return text.trim().replace(/^["']|["']$/g, "")
}

/**
 * The method of `type` (or a super-type) written as `words`:  `deal` for `to deal:`, `turn_over` for
 * `to turn it over:` -- its name as compiled code names it (`P.ScopeMethod.name`).
 * - Compared as written, any case and spacing;  a parameter in its signature, `turn (a card) over`, reads as `it`.
 * - None yet (an action declared below the menu):  its name as a method's is made, its words but `it` and its
 *   inputs, `turn it over` => `turn_over`.
 */
function methodNamed(type: P.TypeScope, words: string): string {
  const wanted = normalWords(words)
  for (const each of type.chain()) {
    for (const method of each.methods.get()) {
      if (method.asWritten && normalWords(method.asWritten) === wanted) return method.name
      if (normalWords(method.name) === wanted) return method.name
    }
  }
  return wanted
    .split(" ")
    .filter((word) => word !== "it")
    .join("_")
}

/** `Turn (a card)  Over` => `turn it over`;  `turn_over` => `turn over`. */
function normalWords(words: string): string {
  return words
    .replace(/\([^)]*\)/g, "it")
    .replace(/[_\s]+/g, " ")
    .trim()
    .toLowerCase()
}
