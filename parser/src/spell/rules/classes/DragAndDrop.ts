import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { getKnownType } from "spell/parser/spell/rules/types"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { Negatable, Wording } from "spell/parser/spell/rules/expressions"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { type MethodBody } from "./classes.shared"

/**
 * An ability's condition, after its word:  `when it is face down`, the colon optional (Q42, Q47).
 * - A body, so `it` / `its` are the thing, as in its methods:  inline, or an indented block that `return`s.
 * - Each language's own `when`:  English's.  Spanish's is `ABILITY_CONDITION_ES`.
 */
export const ABILITY_CONDITION = "when :? {expression_body}"

/** Spanish's `ABILITY_CONDITION`:  `es pulsable cuando está boca abajo`. */
export const ABILITY_CONDITION_ES = "cuando :? {expression_body}"

/**
 * `drag_and_drop` rule:  what people may do to a type's things on the page -- drag, click, select, drop on them.
 * - Epic `outline-spell` P28;  ONE word per ability since epic `debut` P27 (Q47):
 *   `draggable`, `clickable`, `selectable`, `droppable`.
 * - `a card is draggable`;  in a type's outline body `- it is draggable`, or just `- draggable`.
 *   - `is not` turns one off, e.g. for a sub-type:  `a joker is not draggable`.
 * - An optional condition says when (Q42):  `- clickable when it is face down`, `- it is draggable when: it is face up`.
 *   - `it` / `its` are the thing, as in its other methods.
 * - The template's attribute says the same:  `<spell-view "card" draggable>`, its twin `- it is draggable`;
 *   and so does an ability's own tag, `<clickable when it is face down/>`.
 * - An event implies its ability (Q44):  `- on click:` makes a thing clickable, `- on drag:` draggable;
 *   this line then adds only the `when`.  The page asks `core.isAble()`.
 * - Nothing drags without one:  dragging is opt-in, so a list of tasks doesn't turn draggable by itself.
 * - They only open the door:  the lists' own rules still decide each move.
 *   - A thing is dragged only when the list holding it will give it up (`- its cards are draggable when ...`).
 *   - A list takes the drop only when it will take the thing (`- droppable when ...`, `list_guard`).
 *   - The list hears the drop by its own `- on card dropped:` (`DragHandler`).
 * - The old words, `a card can be dragged`, `can be dropped on`, `can be selected`, still work one release,
 *   with a warning:  "say `it is draggable`".
 * - Spanish:  `una carta es arrastrable`, `es pulsable`, `es seleccionable`, `no es soltable`;
 *   the old `se puede arrastrar` with the same warning.
 * - Compiles to a flag on the class, `false` for `is not`:
 *   `Card.draggable = true`, `Pile.droppable = true`, `Task.selectable = true`, `Card.clickable = true`.
 *   - With a condition, a getter too, named for the ability:  `get clickableWhen() { return !this.isFaceUp }`.
 *   - The runtime's view classes say `false`;  a sub-type inherits its super-type's.
 */
export class DragAndDrop extends SpellStatement<"type|what|is?|body?"> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"
  /** What `specialize()` takes:  whether its words are the old ones. */
  declare static readonly SpecializeWith: { oldWords: boolean }
  /** Are its words the old ones, `can be dragged`, which still work with a warning? */
  @proto static oldWords = false

  /**
   * The line, with a warning for the old words (`can be dragged`):  "say `it is draggable`".
   * - Not `droppable when ...`:  that's a list's own rule, `list_guard`, whose body knows the item dropped.
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const flag = DragAndDrop.flagOf(match)
    if (this.bodySpec && flag === "droppable") return undefined
    if (this.oldWords) {
      const language = SP.Language.of(scope)
      const line = language.words.spellx?.twins?.viewFlags[flag]
      if (line)
        SP.SpellWarnings.note(match, language.parserMessage("say-is-able", { line, old: match.inputText.trim() }))
    }
    return match
  }

  /** The condition's scope:  `it` / `its` are the thing, as in its type's methods. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const type = getKnownType(match.groups.type)
    return new P.MethodScope({
      parentScope: match.scope,
      thisVar: type.instanceName,
      mapItTo: "this",
      itDatatype: SP.typeName(type.name),
      args: [],
      declaredBy: match
    })
  }

  getAST(match: P.MatchFor<this>): P.ASTStatement {
    const { type, is } = match.groups
    const flagName = DragAndDrop.flagOf(match)
    const typeAST = P.matchAST<P.ASTTypeExpression>(type)
    const flag = new P.ASTStaticDefinition(match, {
      type: typeAST,
      name: flagName,
      value: new P.ASTBooleanLiteral(match, !Negatable.isNegated(is))
    })
    const patched = new P.ASTPatchedMember(match, { member: flag })
    const body = this.getBody(match)
    if (!body) return patched
    const getter = new P.ASTPropertyDefinition(match, {
      type: typeAST,
      property: `${flagName}_when`,
      get: new P.ASTMethodDefinition(match, { body: P.matchAST<MethodBody>(body), datatype: "choice" })
    })
    return new P.ASTStatementGroup(match, { statements: [getter, patched] })
  }

  /** The flag the line sets, by what its words mean:  `draggable` for `can be dragged` and `is draggable`. */
  static flagOf(match: P.MatchFor<DragAndDrop>): Ability {
    return FLAGS[Wording.meaningOf(match.groups.what) as keyof typeof FLAGS]
  }
}

/** The flag each meaning sets on the class:  the core's `Ability`. */
const FLAGS = { dragged: "draggable", dropped_on: "droppable", selected: "selectable", clicked: "clickable" } as const

/** An ability's flag, e.g. `draggable`. */
type Ability = (typeof FLAGS)[keyof typeof FLAGS]

/** Declared, so a `specialize()`d instance reads its own. */
export interface DragAndDrop {
  oldWords: boolean
}

/** `drag_and_drop` for the old words, `- it can be dragged`:  the same flags, with a warning. */
export const OLD_ABILITY_WORDS = DragAndDrop.specialize({ oldWords: true })
