import { proto, withoutAccents } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Through the folder:  read only when parsing, once the folder has loaded
import { DefineMenu } from "spell/parser/spell/rules/classes"
import { Priority } from "spell/parser/spell/rules/rules.types"
import {
  ACTION_TAG_MEANING,
  IN_DIALOG_ATTRIBUTE,
  IN_MENU_ATTRIBUTE,
  SPELL_TAG_WORDS,
  webWordFor,
  type JSXMatchData
} from "./JSX.shared"
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
 *     Spanish's `solo-icono` (`SP.LanguageWords.iconOnlyAttribute`).
 *   - In another language than English, Spell UI's names in that language, as its `ui-*` tags take them
 *     (epic `language` P53):  `<acción "deshacer" solo-icono tamano="pequeno"/>` draws the same button as
 *     `<action "undo" icon-only size="small"/>`.
 *     They're read through the component pack's dictionary as the program compiles (`SP.ComponentPacks.readAttribute()`),
 *     since the core draws Spell UI's English `<ui-button>`;  one it doesn't know (`class`, `aria-label`) stays as written.
 *   - Children, if any, are its text instead of the title.
 * - Compiles to `core.drawAction(this, "autoPlay", { ... })` in javascript and TypeScript,
 *   `core.draw_action(self, "auto_play", {...})` in Python (`P.ASTJSXElement.action`).
 *   - A Python program's page draws it with its drawing half's javascript, the action run in Python (`core.remote`).
 * - An action named nowhere in the program, its thing's types or any other:  the line is refused, naming it
 *   (`unknown-action`).  Asked once the whole program has parsed:  an action may be declared below its drawing.
 * - Inside a Spell UI `<menu>` or `<toolbar>`, it's a menu's ROW, not a button (epic `editor` P29):
 *   Spell UI's `<ui-action>`, its title, icon and key the action's,
 *   greyed by its `enabled when` and ticked by its `selected when`, live;
 *   a click runs it through the core, one undo step, as a button's does.
 *   - `icon-only` there is Spell UI's `<ui-action icon-only>`:  its icon alone, at every width.
 *   - `SpellJSX` marks it as the menu parses (`markMenuRows()`);  it compiles with the core's own `in-menu`,
 *     `core.drawAction(this, "save", { "in-menu": true })`.
 * - In a modal's ACTIONS, its row of buttons (`<actions>` in a `<modal>`), its click runs the action, then closes the
 *   modal, as a dialog's buttons do (epic `language` T155):  `SpellJSX` marks it as the modal parses (`markDialog()`);
 *   it compiles with the core's own `in-dialog`.  `keep-open` (Spanish's `mantener-abierto`) leaves it open.
 *   Anywhere else in a modal, its click runs the action alone.
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
    match.data.readings = ActionButton.readingsOf(scope, element)
    match.data.keepOpenAt = ActionButton.keepOpenAt(scope, element)
    const { value } = element.quotedWord
    const words = (value instanceof P.TextToken ? value.innerText : `${value?.raw ?? ""}`).trim()
    // only a type with the action matters (`P.Outline`)
    const types = ActionButton.typesFor(scope, (type) => !!DefineMenu.actionNamed(type, words))
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
    const { readings, keepOpenAt } = match.data
    const attrs = match.data.attributes
      ?.map((attr, index) => {
        // `keep-open` is the compiler's:  it leaves the action unmarked, and goes no further
        if (index === keepOpenAt) return undefined
        const reading = readings?.[index]
        if (!attr || !reading) return P.asAST<P.ASTJSXAttribute>(attr?.AST)
        const { attribute: name, value } = reading
        const valueAST =
          typeof value === "boolean"
            ? new P.ASTBooleanLiteral(attr, { value })
            : new P.ASTStringLiteral(attr, { value: `${value}`, quote: '"', raw: JSON.stringify(`${value}`) })
        return new P.ASTJSXAttribute(attr, { name, value: valueAST })
      })
      .filter((attr): attr is P.ASTJSXAttribute => !!attr)
    const children = match.data.children?.flatMap((child) => SpellJSX.childAST(child) ?? []) ?? []
    // a menu's row, or a modal's button:  the core's own mark, last, so the tag's attributes keep their places
    const mark = (name: string) =>
      new P.ASTJSXAttribute(match, { name, value: new P.ASTBooleanLiteral(match, { value: true }) })
    const { inMenu, inDialog } = match.data
    const marked = inMenu
      ? [...(attrs ?? []), mark(IN_MENU_ATTRIBUTE)]
      : inDialog
        ? [...(attrs ?? []), mark(IN_DIALOG_ATTRIBUTE)]
        : attrs
    return new P.ASTJSXElement(match, { tagName: BUTTON_TAG, attrs: marked, children, action: match.data.action })
  }

  /**
   * Every action `<action "...">` may name in `scope`, for the editor's completions (epic `language` P53):
   * the drawing's own type's first, then the app's own (`undo`, `redo`;  Spanish's `deshacer`, `rehacer`),
   * then every other type's the program knows.
   * - Each as its quoted word is written:  `auto play`, `restart the game`, `jugar solo`.
   * - An action is a method of the program's own that takes nothing and gives nothing back (`isAction()`):
   *   not a question, a drawing (`to draw it`), a creation hook or a test, nor one the program imports (the core's).
   */
  static actionsIn(scope: P.Scope): ActionWords[] {
    const actions = new Map<string, ActionWords>()
    const add = (action: ActionWords) => {
      if (!actions.has(action.words)) actions.set(action.words, action)
    }
    const types = ActionButton.typesFor(scope)
    const own = ActionButton.ownTypeOf(scope)
    const methodsOf = (from: readonly P.TypeScope[], kind: ActionWords["kind"]) => {
      for (const method of from.flatMap((type) => type.chain()).flatMap((type) => type.methods.get())) {
        if (!ActionButton.isAction(method)) continue
        const words = (method.asWritten ?? method.name.replace(/_/g, " ")).replace(/"/g, "")
        add({ words, kind, of: method.of })
      }
    }
    if (own) methodsOf([own], "own")
    for (const words of Object.keys(SP.Language.of(scope).words.appActions)) add({ words, kind: "app" })
    methodsOf(
      types.filter((type) => type !== own),
      "other"
    )
    return [...actions.values()]
  }

  /**
   * Is `method` one a button may run:  the program's own, taking nothing and giving nothing back?
   * - Not a question (`it "is a face card" if ...`, a `choice`), a drawing, a creation hook or a test.
   */
  private static isAction(method: P.ScopeMethod): boolean {
    if (!method.declaredBy || method.params.length || method.kind === "static") return false
    if (method.returns && method.returns !== "nothing") return false
    return !NOT_ACTIONS.test(method.name)
  }

  /**
   * Each of `element`'s attributes in the component pack's own names, where the language isn't English
   * (epic `language` P53):  `solo-icono` => `icon-only`, `tamano="grande"` => `size="large"`.
   * - By attribute, in order:  `undefined` for one that stays as written (`class`, `{...}` values, English).
   * - Read once, while parsing:  `getAST()` is pure.
   */
  private static readingsOf(
    scope: P.Scope,
    element: P.JSXElementToken
  ): Array<SP.AttributeReading | undefined> | undefined {
    const language = SP.Language.of(scope)
    if (language === SP.Language.default || !element.attributes?.length) return undefined
    const iconOnly = withoutAccents(language.words.iconOnlyAttribute)
    const packs = SpellJSX.packsFor(scope)
    const readings = element.attributes.map((attribute) => {
      if (!(attribute instanceof P.JSXAttributeToken)) return undefined
      const { name, value } = attribute
      if (withoutAccents(name) === iconOnly && value === undefined) return { attribute: ICON_ONLY, value: true }
      // a `{...}` value is code, which stays as written
      if (value !== undefined && !(value instanceof P.TextToken)) return undefined
      const written = value?.innerText ?? true
      const read = SP.ComponentPacks.readAttribute(
        { tag: BUTTON_TAG, attribute: name, value: written },
        language.lang,
        packs
      )
      return read && (read.attribute !== name || read.value !== written) ? read : undefined
    })
    return readings.some(Boolean) ? readings : undefined
  }

  /**
   * Where `element` says `keep-open` (Spanish's `mantener-abierto`, bare, accents or not;  English's in every language):
   * in a modal's actions, its click leaves the modal open (epic `language` T155) -- `undefined` if it doesn't.
   */
  private static keepOpenAt(scope: P.Scope, element: P.JSXElementToken): number | undefined {
    const words = [KEEP_OPEN, withoutAccents(SP.Language.of(scope).words.keepOpenAttribute)]
    const index = element.attributes?.findIndex(
      (attribute) => attribute.value === undefined && words.includes(withoutAccents(attribute.name))
    )
    return index === undefined || index < 0 ? undefined : index
  }

  /** The type whose drawing `scope` is in:  its method's thing's (`a solitaire` / `to draw it`), else the nearest type. */
  private static ownTypeOf(scope: P.Scope): P.TypeScope | undefined {
    const thing = P.MethodScope.thingTypeOf(scope)
    if (thing) return thing
    for (let at: P.Scope | undefined = scope; at; at = at.parentScope) if (at instanceof P.TypeScope) return at
    return undefined
  }

  /**
   * Where an action may be, in order:  the drawing's own type and its super-types first, then every other type
   * the program knows, as any of them may be up its thing's chain when it draws (a card's game, the app).
   * - `test`:  which of them matter to the caller, for an outline (`P.ScopeList.scan()`).
   */
  private static typesFor(scope: P.Scope, test?: (type: P.TypeScope) => boolean): P.TypeScope[] {
    const own = ActionButton.ownTypeOf(scope)
    const others: P.TypeScope[] = []
    for (let at: P.Scope | undefined = scope; at; at = at.parentScope) {
      others.push(...((test ? at.types?.scan(test) : at.types?.get()) ?? []))
    }
    return [...new Set(own ? [own, ...others] : others)]
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
  /** Its attributes in Spell UI's own names, by attribute, for a language other than English -- see `readingsOf()`. */
  readings?: Array<SP.AttributeReading | undefined>
  /** A `<menu>` holds it:  it draws a menu's row, not a button (`SpellJSX.markMenuRows()`, epic `editor` P29). */
  inMenu?: boolean
  /**
   * A modal's actions hold it:  its click closes the modal too, after running the action
   * (`SpellJSX.markDialog()`, epic `language` T155).
   */
  inDialog?: boolean
  /** Which of its attributes is `keep-open`:  in a modal's actions, it leaves the modal open (T155). */
  keepOpenAt?: number
}

/** One action `<action "...">` may name, as the editor offers it -- see `ActionButton.actionsIn()`. */
export type ActionWords = {
  /** its quoted word, as written:  `auto play`, `restart the game`, `deshacer` */
  words: string
  /** whose:  the drawing's own type's, the app's own (`undo`, `redo`), or another type's */
  kind: "own" | "app" | "other"
  /** the type it's a method of, as declared:  `Solitaire`;  none for the app's own */
  of?: string
}

/** `<action>`'s own attribute, in the core's names:  the button shows only its icon (`core.drawAction()`). */
const ICON_ONLY = "icon-only"

/** Methods no button runs:  a type's drawings (`draw`, `draw_its_placeholder` ...), creation hooks and tests. */
const NOT_ACTIONS = /^(draw|create|test)(_|$)/

/** What an action's button is:  Spell UI's, which the core draws (`core.drawAction()`). */
const BUTTON_TAG = "ui-button"

/** `<action>`'s own attribute in a modal's actions, English's word:  its click leaves the modal open (T155). */
const KEEP_OPEN = "keep-open"
