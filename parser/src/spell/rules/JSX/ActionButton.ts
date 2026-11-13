import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Through the folder:  read only when parsing, once the folder has loaded
import { DefineMenu } from "spell/parser/spell/rules/classes"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { ACTION_TAG_MEANING, SPELL_TAG_WORDS, webWordFor, type JSXMatchData } from "./JSX.shared"
// Read only when compiling:  SpellJSX imports this file's neighbours
import { SpellJSX } from "./SpellJSX"

/**
 * `action_button` rule:  a button for ONE of the program's actions, in a drawing, named by its quoted word.
 *
 * ```spell
 * <action "auto play"/>
 * <action "undo" icon-only basic size="small" class="Undo"/>
 * <action "restart the game" icon="refresh"/>
 * ```
 *
 * - Its word is the language's, in the tag words (`spell_jsx_tag`, meaning `action`):  `<action>`, Spanish's `<acción>`.
 * - Its quoted word names the action as it's declared:  `to auto play` is `"auto play"`,
 *   `to "restart the game" with title "Restart"` is `"restart the game"`;  the app's own `undo` and `redo` too
 *   (`SP.LanguageWords.appActions`:  Spanish's `deshacer`, `rehacer`).
 * - Found on the drawing's thing, or up its chain to the app, as a menu's actions are (`core.actionOf()`):
 *   so a card's drawing may draw its game's actions.
 * - Draws a `<ui-button>`, which the action gives, LIVE:  its title as its text, its icon, its key in its tooltip,
 *   disabled while it isn't enabled.  A click runs it through the core, as a menu item's does:  one undo step.
 * - Every other attribute goes to the button, and wins over what the action gives:
 *   `<action "restart the game" icon="refresh"/>` keeps its own icon.
 *   - `icon-only`, the tag's own:  the button shows only its icon, its title its name for a screen reader.
 *   - Children, if any, are its text instead of the title.
 * - Compiles to `core.drawAction(this, "autoPlay", { ... })` in javascript and TypeScript,
 *   `core.draw_action(self, "auto_play", {...})` in Python (`P.ASTJSXElement.action`).
 *   - A Python program's page draws it with its drawing half's javascript, the action run in Python (`core.remote`).
 * - An action named nowhere in the program, its thing's types or any other:  the line is refused, naming it
 *   (`unknown-action`).  Asked once the whole program has parsed:  an action may be declared below its drawing.
 * - Without a quoted word, `<action>` is Spell UI's `<ui-action>`, a menu's item, as before.
 */
export class ActionButton extends P.TokenType<never, ActionButtonData> {
  @proto static alias = ["jsxChild", "expression"]
  @proto static tokenType = P.JSXElementToken
  // beats `jsxElement`, which would draw Spell UI's `<ui-action>`
  @proto static priority = Priority.preferred

  /** An element named by our language's action word, with a quoted word:  its action looked up, its parts parsed. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const [element] = tokens
    if (!(element instanceof P.JSXElementToken) || !element.quotedWord || element.chain) return undefined
    if (webWordFor(scope, SPELL_TAG_WORDS, element.tagName) !== ACTION_TAG_MEANING) return undefined
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { parser } = scope
    match.data.children = element.children?.map(
      (child) => parser?.parse(child, "jsxChild", scope) || parser?.parse(child, "parse_error", scope)
    )
    match.data.attributes = element.attributes?.map((attribute) => parser?.parse(attribute, "jsxAttribute", scope))
    const { value } = element.quotedWord
    const words = (value instanceof P.TextToken ? value.innerText : `${value?.raw ?? ""}`).trim()
    const types = ActionButton.typesFor(scope)
    const found = DefineMenu.appActionNamed(scope, words) ?? ActionButton.actionIn(types, words)
    match.data.action = found ?? DefineMenu.methodNameFor(words)
    // declared further down, or nowhere:  refused once the whole program has parsed, if it's still nowhere
    if (!found) {
      const message = SP.Language.of(scope).parserMessage("unknown-action", { tag: element.tagName, action: words })
      SP.SpellWarnings.refuseIf(match, message, () => !ActionButton.actionIn(types, words))
    }
    if (element.unreadable) SpellJSX.noteUnreadable(scope, match, element)
    return match
  }

  /** `core.drawAction(this, "autoPlay", props, ...children)`:  a `ui-button`'s element, marked with its action. */
  getAST(match: P.MatchFor<this>): P.ASTJSXElement {
    const attrs = match.data.attributes?.map((attr) => P.asAST<P.ASTJSXAttribute>(attr?.AST)).filter(Boolean)
    const children = match.data.children?.flatMap((child) => SpellJSX.childAST(child) ?? []) ?? []
    return new P.ASTJSXElement(match, { tagName: BUTTON_TAG, attrs, children, action: match.data.action })
  }

  /**
   * Where an action may be, in order:  the drawing's own type and its super-types first, then every other type
   * the program knows, as any of them may be up its thing's chain when it draws (a card's game, the app).
   */
  private static typesFor(scope: P.Scope): P.TypeScope[] {
    const own: P.TypeScope[] = []
    const others: P.TypeScope[] = []
    for (let at: P.Scope | undefined = scope; at; at = at.parentScope) {
      if (at instanceof P.TypeScope && !own.length) own.push(at)
      for (const type of at.types?.get() ?? []) others.push(type)
    }
    return [...new Set([...own, ...others])]
  }

  /** The method of the first of `types` written as `words`, its name as compiled code names it:  `auto_play`. */
  private static actionIn(types: readonly P.TypeScope[], words: string): string | undefined {
    for (const type of types) {
      const name = DefineMenu.actionNamed(type, words)
      if (name) return name
    }
    return undefined
  }
}

/** What `action_button` keeps on its match:  an element's parts, and the action's method. */
type ActionButtonData = JSXMatchData & {
  /** The action's method, as spell names it:  `auto_play`, `undo`. */
  action?: string
}

/** What an action's button is:  Spell UI's, which the core draws (`core.drawAction()`). */
const BUTTON_TAG = "ui-button"
