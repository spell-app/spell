import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { getKnownType } from "spell/parser/spell/rules/types"
import { Wording } from "spell/parser/spell/rules/expressions"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { type MethodBody } from "./classes.shared"

/**
 * What a list takes or gives up, after its subject:  `can take a card when: ...`, `can give up a card when: ...`.
 * - `take_or_give_up` says which:  see `ListGuard.methodName()`.
 * - `when`, or the old `if`, which still works with a warning (Q42):  `when_or_if`.
 */
export const CAN_MOVE = "can {verb:take_or_give_up} (a|an) {item:type} {when:when_or_if} :? {expression_body}?"

/**
 * The short form of `can give up a card when:`, which also makes the list's items draggable (Q47):
 * `- its cards are draggable when the card is face up`.
 */
export const ITEMS_DRAGGABLE = "{type:subject_its} {item:plural_type} are draggable when :? {expression_body}"

/**
 * The short form of `can take a card when:`, which also makes the list droppable (Q47):
 * `- droppable when the card is one lower`;  the item is the one the list holds.
 */
export const DROPPABLE_WHEN = "{type:subject_implied} droppable when :? {expression_body}"
/**
 * What a list never takes or gives up, after its subject (epic page `outline-spell`, P26):
 * `can never take a card`, `can never let go of a card`.
 */
export const CAN_NEVER_MOVE = "can (never:never) {verb:take_or_give_up} (a|an) {item:type}"

/**
 * `list_guard` rule:  what a list type takes, or gives up, when something MOVES (epic page Q23 - Q25):
 * - `a tableau can (add|take) a card if: ...`
 * - `a stock-pile can (release|remove|give up|let go of) a card if: ...`
 * - `a foundation can never (release|remove|give up|let go of) a card` -- always no
 * - `a pile can never (add|take) a card` -- always no:  a sub-type says what it does take, e.g. a tableau
 * - Its body answers yes or no:  an inline expression, or an indented block which `return`s.
 *   `the card` is the card moving;  `it`, `its` and `the tableau` are the list.
 * - Compiles to a method of the list type's class, overriding `List`'s yes:
 *   `canTake(card) {...}` or `canGiveUp(card) {...}`.
 *   A sub-type inherits it, unless it says its own.
 * - Only a move asks, e.g. `move the card to the tableau` -- see `list_move`.
 *   `add`, `remove` and `clear` never do:  dealing, gathering cards back.
 * - In a list type's outline body, `it` or no subject at all (epic page `outline-spell`, P8):
 *   `- can take a card when: ...`
 * - Its rule starts with `when` (epic `debut` P27, Q42);  the old `if:` still works one release, with a warning.
 * - The short forms (Q47), each of which also says the ability it gives:
 *   - `- its cards are draggable when the card is face up`:  `canGiveUp(card)`, and `static itemsDraggable = true`,
 *     so its cards drag with no `draggable` of their own
 *   - `- droppable when the card is one lower`:  `canTake(card)`, and `static droppable = true`;
 *     the card is the item the list holds
 * - A FILE or a FOLDER from the desktop, on any view (epic `language` I167):  `can take a file when: ...` is
 *   `canTakeFile(file)` (`canTakeFolder(folder)`), in every language, so it never clashes with a card's `canTake()`.
 *   - The page asks it of each file dropped (app's `SpellElement`);  a view with it takes desktop files.
 *   - A program's own `file` type wins:  then it's an ordinary `canTake(file)`.
 */
export class ListGuard extends SpellStatement<"type|verb?|item?|when?|body?|never?"> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"
  /** It says what a list will take or give up:  the editor lists it with its type's abilities (`SP.SpellDeclarationPlaces`). */
  @proto static isAbility = true
  declare isAbility: boolean
  /** What `specialize()` takes:  the short form's move. */
  declare static readonly SpecializeWith: { shortFor: Move }
  /** A short form's move, `take` for `droppable when`, `give_up` for `its cards are draggable when`;  else none. */
  @proto static shortFor: Move | undefined = undefined

  /**
   * The line, with a warning for the old `if:`;  a short form with no item works out its list's, e.g. `card`.
   * - A list type that holds nothing said refuses the short form.
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { when, item } = match.groups
    if (when && Wording.meaningOf(when) === "if")
      SP.SpellWarnings.note(match, SP.Language.of(scope).parserMessage("say-when"), when)
    if (!item && !ListGuard.listItemType(match)) return undefined
    ListGuard.noteDesktopItem(match)
    return match
  }

  /**
   * The method we define, e.g. `can take a card` of `tableau` -- for editors' symbol lists.
   * - Named by the line's own words, from after its subject to the item:  whatever the language.
   */
  getDeclaration(match: P.MatchFor<this>): P.Declaration {
    const { type, verb, item } = match.groups
    const text = match.inputText
    // a subject left out (`- can take a card when: ...`) takes no words
    const from = type.length ? type.next! - match.start! : 0
    const end = (item ?? verb)?.end ?? match.end!
    return {
      kind: "method",
      name:
        text
          .slice(from, end - match.start!)
          // its first line's words:  its body under it, with no colon, isn't its name (epic `language` P48)
          .split("\n")[0]!
          .replace(/\s*(when|cuando)?\s*:?\s*$/, "")
          .trim() || text.trim(),
      nameMatch: verb ?? item ?? match,
      of: `${type.value}`,
      detail: `${ListGuard.methodName(match)}()`
    }
  }

  /** Its body answers yes or no:  a last line `the card is ...` asks (epic `language` T135). */
  answersYesOrNo(_match: P.Match): boolean {
    return true
  }

  /** Nested scope for the body:  the item as its own word, e.g. `the card`, and `it` / `its` as the list. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const listType = getKnownType(match.groups.type)
    const itemType = ListGuard.itemTypeOf(match)
    return new P.MethodScope({
      parentScope: match.scope,
      thisVar: listType.instanceName,
      mapItTo: "this",
      itDatatype: SP.typeName(listType.name),
      args: [new P.ScopeVariable({ name: ListGuard.itemNameOf(match), datatype: itemType })],
      declaredBy: match
    })
  }

  getAST(match: P.MatchFor<this>): P.ASTStatement {
    const { type, never } = match.groups
    const itemType = ListGuard.itemTypeOf(match)
    // its type, e.g. `Card` for `a card`:  a typed target writes it
    const arg = new P.ASTVariableExpression(match, { name: ListGuard.itemNameOf(match), datatype: itemType })
    const body = never
      ? new P.ASTReturnStatement(match, { value: new P.ASTBooleanLiteral(match, false) })
      : P.matchAST<MethodBody>(this.getBody(match))
    const typeAST = P.matchAST<P.ASTTypeExpression>(type)
    const guard = new P.ASTPropertyDefinition(match, {
      type: typeAST,
      property: ListGuard.methodName(match),
      method: new P.ASTMethodDefinition(match, { args: [arg], body, datatype: "choice" })
    })
    const { shortFor } = this
    if (!shortFor) return guard
    // the ability the short form gives:  its list droppable, or its items draggable
    const flag = new P.ASTStaticDefinition(match, {
      type: typeAST,
      name: shortFor === "take" ? "droppable" : "itemsDraggable",
      value: new P.ASTBooleanLiteral(match, true)
    })
    return new P.ASTStatementGroup(match, { statements: [guard, new P.ASTPatchedMember(match, { member: flag })] })
  }

  /**
   * `canTake` for a verb meaning `take`, e.g. `add`;  else `canGiveUp` -- the `List` method we override.
   * - Taking a desktop file or folder:  `canTakeFile`, `canTakeFolder`, which the page asks as one is dropped.
   */
  static methodName(match: P.MatchFor<ListGuard>): string {
    const move = (match.rule as ListGuard).shortFor ?? Wording.meaningOf(match.groups.verb)
    if (move !== "take") return "canGiveUp"
    const { desktop } = match.data as ListGuardData
    return desktop ? `canTake${desktop}` : "canTake"
  }

  /**
   * Is the line's item a file or a folder from the desktop (`a file`, `una carpeta`)?  Kept on the match, while parsing.
   * - Not when the program has its own type of that name.
   */
  private static noteDesktopItem(match: P.MatchFor<ListGuard>) {
    const { item } = match.groups
    const word = item && `${item.value}`.toLowerCase()
    const desktop = word ? SP.Language.of(match.scope).words.desktopFileWords[word] : undefined
    if (!desktop || match.scope.getType(SP.typeName(word!))) return
    ;(match.data as ListGuardData).desktop = desktop
    SP.SpellWarnings.noteFilesNotInPython(match)
  }

  /**
   * The item's type, e.g. `Card`:  as the line says it, else the list's own (`listItemType()`).
   * - A desktop file or folder:  `File` or `Folder` in every language.
   */
  private static itemTypeOf(match: P.MatchFor<ListGuard>): string {
    const { desktop } = match.data as ListGuardData
    if (desktop) return desktop
    const { item } = match.groups
    return SP.typeName(item ? `${item.value}` : (ListGuard.listItemType(match) ?? "thing"))
  }

  /** What the body calls the item, e.g. `card`;  a desktop file as it's written, `the file`, Spanish `el archivo`. */
  private static itemNameOf(match: P.MatchFor<ListGuard>): string {
    const { item } = match.groups
    if ((match.data as ListGuardData).desktop) return P.instanceCase(SP.typeName(`${item!.value}`))
    return P.instanceCase(ListGuard.itemTypeOf(match))
  }

  /**
   * What the line's list holds, e.g. `Card`, for a short form that names no item:  looked up while parsing,
   * as its body's scope is made, and kept on the match.
   */
  private static listItemType(match: P.MatchFor<ListGuard>): string | undefined {
    const data = match.data as ListGuardData
    data.itemType ??= ListGuard.itemTypeOfList(match.scope, getKnownType(match.groups.type))
    return data.itemType
  }

  /**
   * What list type `type` holds, its own or a super-type's, e.g. `Card` for a tableau, a pile of cards --
   * `undefined` when none says.  Looked up while parsing.
   */
  private static itemTypeOfList(scope: P.Scope, type: P.TypeScope): string | undefined {
    for (let at: P.TypeScope | undefined = type, hops = 0; at && hops < 20; hops++) {
      if (typeof at.itemType === "string") return at.itemType
      at = at.superType ? scope.types?.get(at.superType) : undefined
    }
    return undefined
  }
}

/** A move a list's rule is about:  taking a thing, or giving one up. */
type Move = "take" | "give_up"

/** What `ListGuard` keeps on its match. */
type ListGuardData = {
  /** a short form's list's item type, e.g. `Card` */
  itemType?: string
  /** `File` or `Folder`:  its item is one from the desktop */
  desktop?: "File" | "Folder"
}

/** Declared, so a `specialize()`d instance reads its own. */
export interface ListGuard {
  shortFor: Move | undefined
}
