import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { getKnownType } from "spell/parser/spell/rules/types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

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
 * - An item may name another of its menus:  a sub-menu, so a menu bar is a menu of menus (epic `language` P19),
 *   `- its "menu bar" is a menu of "file menu", "edit menu" and "run menu"`.
 * - Its title, as an action's (P18):  `, titled "File"`;  a fill-in follows the program, a getter and `titleFrom`.
 * - Or filled from a LIST (Q21):  `- its "more examples" is a menu of its examples, each running "open example"`,
 *   an item per thing in it, titled with its title (else its name), running the action with it.
 * - Or said with HAS, Owen's wording (epic `language` C1):  `- its "file" menu has actions "save" and "open"`,
 *   Spanish's `- su menú "archivo" tiene acciones "guardar" y "abrir"`.
 *   - The same menu as `its "file menu" is a menu of "save" and "open"`:  its name is the quoted words and the
 *     language's word for a menu, in the order it's said (`file menu`, `menú archivo`).
 *   - Its sub-menus by their quoted words, `has menus "file" and "edit"`, named the same way (`file menu`);
 *     words already holding that word stay as they are (`menus "file menu"`).
 *   - Both at once, actions first:  `has actions "save" and "open" and menus "recent"`.
 *   - Filled from a list:  `- its "examples" menu has its examples, each running "open example"`.
 *   - With no `titled`, its title is the quoted words, `file`, not its name.
 */
export class DefineMenu extends SpellStatement<
  "type|menu|items?|title?|menuWord?|menus?|list?|action?",
  { members?: string[]; action?: string }
> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"

  /**
   * The items `match` lists, as written:  `["deal", "-", "undo"]`;
   * then its sub-menus, `has menus "file"`, by their names:  `file menu` -- see class docs.
   */
  static itemsOf(match: P.MatchFor<DefineMenu>): string[] {
    const { items, menus } = match.groups
    return [...quotedItems(items), ...quotedItems(menus).map((words) => DefineMenu.menuNamed(match, words))]
  }

  /**
   * The name of the menu `words` names in the HAS form:  `words` and the menu word, in the order it was said --
   * `file menu`, Spanish's `menú archivo`;  `words` itself when it holds that word already, or in the older form.
   */
  static menuNamed(match: P.MatchFor<DefineMenu>, words: string): string {
    const { menuWord, menu } = match.groups
    if (!menuWord) return words
    const word = `${menuWord.tokens.map((token) => token.raw ?? token.value).join(" ")}`.trim()
    if (words.split(/\s+/).some((each) => normalWords(each) === normalWords(word))) return words
    return (menuWord.start ?? 0) < (menu.start ?? 0) ? `${word} ${words}` : `${words} ${word}`
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
    const { action } = match.groups
    if (action) match.data.action = methodNamed(type, unquoted(`${action.raw}`))
    return match
  }

  getAST(match: P.MatchFor<this>): P.ASTTypeDescription | P.ASTStatementGroup {
    const type = P.matchAST<P.ASTTypeExpression>(match.groups.type)
    // `game_menu`:  the writer names it as it names a member, `gameMenu`
    const words = unquoted(`${match.groups.menu.raw}`).trim()
    const name = DefineMenu.menuNamed(match, words).replace(/[\s-]+/g, "_")
    const statements: P.ASTStatement[] = []
    const description: Record<string, P.ASTDescriptionValue> = { items: { members: match.data.members ?? [] } }
    const { title, list } = match.groups
    if (title) {
      // with a fill-in:  a getter its title follows, as an action's (`MethodDefinition.describedAction()`)
      if ((title.data as { fillIns?: unknown }).fillIns) {
        const getter = `${name}_title`
        statements.push(DefineMenu.getter(title, type, getter))
        description.title_from = { member: getter }
      } else description.title = textOf(title)
    } else if (match.groups.menuWord) description.title = words
    if (list && match.data.action) {
      const getter = `${name}_items`
      statements.push(DefineMenu.getter(list, type, getter))
      description.each = { member: getter }
      description.action = { member: match.data.action }
    }
    const menu = new P.ASTTypeDescription(match, { type, describes: "menu", name, description })
    return statements.length ? new P.ASTStatementGroup(match, { statements: [...statements, menu] }) : menu
  }

  /** A getter `property` of `type` returning what `value` says, e.g. `get moreExamplesItems() { return this.examples }`. */
  private static getter(value: P.Match, type: P.ASTTypeExpression, property: string): P.ASTPropertyDefinition {
    return new P.ASTPropertyDefinition(value, {
      type,
      property,
      get: new P.ASTMethodDefinition(value, { body: value.AST as P.ASTExpression })
    })
  }
}

/** The quoted items of a list match, `[items:{item:text} (,|and)]`, as written:  `["save", "-", "open"]`. */
function quotedItems(list: P.Match | undefined): string[] {
  if (!list) return []
  const items = list.matched.filter((item): item is P.Match => item instanceof P.Match && !!item.raw)
  return items.filter((item) => /^["']/.test(`${item.raw}`)).map((item) => unquoted(`${item.raw}`))
}

/** The text inside a `text` match's quotes, e.g. `File`. */
function textOf(match: P.Match): string {
  const [token] = match.tokens
  return token instanceof P.TextToken ? token.innerText : unquoted(`${match.value}`)
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
