import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import {
  CONTEXT_MENU_TAG_MEANING,
  DIVIDER_TAG_MEANING,
  SPELL_TAG_WORDS,
  webWordFor,
  type JSXMatchData
} from "./JSX.shared"

/**
 * `context_menu_block` rule:  the right-click menu of the element it's in, written inside it, in a drawing.
 *
 * ```spell
 * <grid class="Board" columns="7">
 * 	<context-menu>
 * 		<action "auto play"/>
 * 		<action "restart the game"/>
 * 		<divider/>
 * 		<action "undo"/>
 * 	</>
 * 	<stock-pile "stock"/>
 * ```
 *
 * - Its word is the language's, in the tag words (`spell_jsx_tag`, meaning `context_menu`):
 *   `<context-menu>`, Spanish's `<menú-contextual>`;  so is its divider's, `<divider/>`, Spanish's `<divisor/>`.
 * - Inside it, ONLY:
 *   - `<action "name"/>`:  an item for that action, named as an action's button names it (`action_button`):
 *     its title, icon, key and enabled read live, run through the core
 *     - its attributes go to its row, as a button's go to it:  `<action "undo" icon-only />` shows only its icon,
 *       `title="Restart"` is its text, `icon="refresh"` its icon (Spanish's `solo-icono` ... read as English's);
 *       each a literal, as an item is made when the menu shows:  a `{...}` value is refused (`context-menu-code`)
 *   - `<divider/>`:  a line between groups
 *   - Anything else is an error saying so (`context-menu-item`).  Sub-menus:  not yet.
 * - Draws nothing where it is:  `core.drawContextMenu(this, ["autoPlay", "-", ["undo", { "icon-only": true }]])`
 *   is a hidden
 *   `<spell-context-menu>`, which a right click on the element around it finds (the app's `ActionMenus`),
 *   as it finds a `context-menu="game menu"` naming a template's menu.
 *   - Each action found from the drawing's thing up its chain, when the menu shows (`core.menuItemsOf()`).
 * - Python:  `core.draw_context_menu(self, [...])`, the same hidden element;  its page draws it with its
 *   drawing half's javascript, each action run in Python.
 */
export class ContextMenuBlock extends P.TokenType<never, ContextMenuData> {
  @proto static alias = ["jsxChild", "expression"]
  @proto static tokenType = P.JSXElementToken
  // beats `jsxElement`, which would draw a `<context-menu>` tag
  @proto static priority = Priority.preferred

  /** An element named by our language's context-menu word:  its actions and dividers, as menu items. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const [element] = tokens
    if (!(element instanceof P.JSXElementToken) || element.chain || element.quotedWord) return undefined
    if (webWordFor(scope, SPELL_TAG_WORDS, element.tagName) !== CONTEXT_MENU_TAG_MEANING) return undefined
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { parser } = scope
    const items: P.ASTContextMenuItem[] = []
    const children: P.Match[] = []
    for (const child of (element.children ?? []) as P.Token[]) {
      if (ContextMenuBlock.isNothing(child)) continue
      if (child instanceof P.JSXElementToken && !child.quotedWord && !child.children?.length) {
        if (webWordFor(scope, SPELL_TAG_WORDS, child.tagName) === DIVIDER_TAG_MEANING) {
          items.push(DIVIDER)
          continue
        }
      }
      // an action's item:  read as its button is, so it's named, looked up and refused the same way
      const parsed = parser?.parse(child, "jsxChild", scope)
      const action = (parsed?.data as { action?: string } | undefined)?.action
      const props = parsed && action ? ContextMenuBlock.propsOf(parsed) : undefined
      if (parsed && action && props) {
        items.push(Object.keys(props).length ? { action, props } : action)
        children.push(parsed)
        continue
      }
      const key = parsed && action ? "context-menu-code" : "context-menu-item"
      const tag = parsed && action && child instanceof P.JSXElementToken ? child.tagName : element.tagName
      const message = SP.Language.of(scope).parserMessage(key, { tag })
      children.push(SP.spellParser.createParseError(scope, [child], message))
    }
    match.data.items = items
    match.data.children = children
    return match
  }

  /** `core.drawContextMenu(this, [...])`:  an element that draws nothing, marked with its menu's items. */
  getAST(match: P.MatchFor<this>): P.ASTJSXElement {
    return new P.ASTJSXElement(match, { tagName: CONTEXT_MENU_ELEMENT, children: [], contextMenu: match.data.items })
  }

  /**
   * The attributes an action's tag gives its row, by Spell UI's English names, as its button would take them
   * (`action_button`'s AST):  a bare one `true`, a quoted one its text.
   * - `undefined` if one is code (`{...}`), which a menu's row can't take:  it's made when the menu shows.
   */
  private static propsOf(parsed: P.Match): Record<string, string | boolean> | undefined {
    const props: Record<string, string | boolean> = {}
    for (const attribute of (parsed.AST as P.ASTJSXElement | undefined)?.attrs ?? []) {
      const { value } = attribute
      if (value === undefined) props[attribute.name] = true
      else if (value instanceof P.ASTStringLiteral || value instanceof P.ASTBooleanLiteral) {
        props[attribute.name] = value.value
      } else return undefined
    }
    return props
  }

  /** Is `token` nothing to a menu:  blank text, a comment, its closer? */
  private static isNothing(token: P.Token): boolean {
    if (token instanceof P.JSXEndTagToken || token instanceof P.JSXCommentToken) return true
    return token instanceof P.JSXTextToken && !`${token.value}`.trim()
  }
}

/** What `context_menu_block` keeps on its match:  its items, and its children's matches (their errors too). */
type ContextMenuData = JSXMatchData & {
  /**
   * Its items, each an action's method as spell names it (`auto_play`), or `-` for a divider;
   * an action whose tag gave attributes, with them (`P.ASTContextMenuItem`).
   */
  items?: P.ASTContextMenuItem[]
}

/** A divider among a menu's items, as a template's menu writes one:  see `define_menu`. */
const DIVIDER = "-"

/** What a context menu draws where it is:  an element of the app's, hidden, that its parent's right click finds. */
export const CONTEXT_MENU_ELEMENT = "spell-context-menu"
