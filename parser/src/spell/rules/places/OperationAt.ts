import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
// Import directly to avoid circular import
import { CANT_BE_UNDONE, MethodDefinition } from "spell/parser/spell/rules/methods/MethodDefinition"
import type { ActionDetails } from "spell/parser/spell/rules/methods/ActionDetail"
import type { MethodSignatureData } from "spell/parser/spell/rules/methods/methods.shared"
import { PLACE_KIND_ABILITIES } from "./places.shared"
import { textIn } from "./PlaceDetail"

/** The method core runs as a thing is made:  no operation can have that name on a type (epic `data` T56). */
const CREATE_HOOK = "create"

/**
 * `operation_at` rule:  an action that happens at a place, by its own address (epic `data` Q14, Q17's C).
 *
 * ```spell
 * family cookbook is a web server at "https://api.example.com/v1":
 * 	- to publish a recipe is at "/recipes/publish"
 * 	- to refresh is at "/recipes/refresh"
 *
 * publish the recipe
 * refresh
 * ```
 *
 * - Called as any action is, from anywhere, and it waits for the place's answer.
 * - A known type's name is what's sent:  `publish the recipe` sends that recipe, as a method of `recipe`.
 *   - With none there's nothing to send, and the action is a loose one:  `refresh`.
 *   - It's only a type's name that sends:  a word that isn't one stays part of the action's name, as in any action.
 * - Only says something under a place, which no action anywhere else could have read:  this line was an error everywhere.
 *   - Copied anywhere else it warns, and its action does nothing, as there's no place to reach.
 * - Known ahead of its line too, as an action in a type's outline is:  `refresh` above the place's line (epic `data` T67).
 * - `to create a recipe is at "..."` won't compile:  it would be the recipe's `create()`, run as each one is made.
 * - Compiles to `core.callPlace()`;  `create_place` gathers the addresses into its `core.place()`.
 * - `Priority.declaration`:  `to_do_something` reads as far as the text, and this reads the whole line.
 */
export class OperationAt extends MethodDefinition<"signature|path", OperationData> {
  @proto static alias = "statement"
  @proto static priority = Priority.declaration
  @proto static inlineInitialType = true
  // a real action (epic `data` I101):  described on its type, so its hooks run, `cancel` calls it off, the Inspector lists it
  @proto static undoableByDefault = true
  // when it fails, `when any server call fails` hears of it (epic `data` Q93)
  @proto static callsServer = true

  /** Says which place it's under, or warns that it's under none. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const place = P.SubjectScope.of(scope)?.subjectType
    const language = SP.Language.of(scope)
    const { methodName, instanceType } = this.getSignature(match)!
    if (methodName === CREATE_HOOK && instanceType) {
      return SpellStatement.refuse(match, language.parserMessage("operation-named-create", { thing: instanceType }))
    }
    if (!place?.placeName) {
      SP.SpellWarnings.note(match as P.Match, language.parserMessage("operation-outside-place"))
      return match
    }
    match.data.placeName = place.placeName
    // a kind a library adds isn't known here, so nothing's said of it
    const abilities = place.placeKind ? PLACE_KIND_ABILITIES[place.placeKind] : undefined
    if (abilities && !abilities.takesOperations) {
      const message = language.parserMessage("operation-not-taken", { kind: place.placeKind! })
      SP.SpellWarnings.note(match as P.Match, message)
    }
    return match
  }

  /** With a known type:  a method of it, as any action.  With none, a loose action, not the place's own. */
  processSignature(groups: P.MatchGroups, signature: MethodSignatureData, scope: P.Scope): MethodSignatureData {
    return signature.types.some((type) => !type.isSimple) ? super.processSignature(groups, signature, scope) : signature
  }

  /** What the server did can't be taken back here:  a server's action can't be undone, whatever it says. */
  protected undoOfAction(_details: ActionDetails, _isAction: boolean, _title: string): P.ASTActionUndo {
    return { cantBeUndone: CANT_BE_UNDONE }
  }

  /** The operation this line names, and its address. */
  static operationOf(match: P.Match): { name: string; at: string } | undefined {
    const { placeName, signature } = match.data as Partial<OperationData> & { signature?: MethodSignatureData }
    return placeName && signature?.methodName
      ? { name: signature.methodName, at: textIn(match.groups.path as P.Match) }
      : undefined
  }

  /** A loose one is `export`ed, as one at a file's top level is:  written under a place, it's still the program's. */
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    const group = super.getAST(match)
    for (const each of group.statements ?? []) if (each instanceof P.ASTMethodDefinition) each.exported = true
    return group
  }

  /**
   * The call:  `core.callPlace("family_cookbook", "publish", this)`.
   * - What's sent:  the thing it's a method of, else nothing;  then its other blanks by name (epic `data` Q78):
   *   `to move a job to (queue as text)` sends `{ queue }`, filling `{queue}` in its address.
   *   - A `(with reason as text)` sends what the call says, `{ reason }` (`WithPropsArg`).
   * - The operation by its method's name, as `core.place()`'s `operations` has it:  `moveToQueue`.
   * - Under no place:  nothing to call.
   */
  protected bodyAST(match: P.MatchFor<this>): P.ASTStatement | undefined {
    const { placeName } = match.data as Partial<OperationData>
    if (!placeName) return undefined
    const { methodName = "", instanceType, args, props } = this.getSignature(match)!
    const text = (value: string) => new P.ASTStringLiteral(match, { value: JSON.stringify(value) })
    const operation = new P.ASTMemberNameLiteral(match, { name: methodName })
    const sent = instanceType ? new P.ASTSelfLiteral(match) : new P.ASTNothingLiteral(match)
    const named = args.map((arg) => (arg as P.ASTVariableExpression).name).filter((name) => name !== PROPS)
    const params: P.ASTExpression[] = []
    if (named.length) {
      const properties = named.map((name) => new P.ASTObjectLiteralProperty(match, { property: name }))
      params.push(new P.ASTObjectLiteral(match, { properties }))
    }
    if (props) params.push(new P.ASTVariableExpression(match, { name: PROPS }))
    const callArgs: P.ASTExpression[] = [text(placeName), operation]
    if (instanceType || params.length) callArgs.push(sent, ...params)
    return new P.ASTReturnStatement(match, {
      value: new P.ASTCoreMethodInvocation(match, { methodName: "callPlace", args: callArgs })
    })
  }
}

/** What a `(with ...)` clause's values come in as:  `WithPropsArg`'s. */
const PROPS = "props"

/** What `operation_at` notes while parsing. */
type OperationData = {
  /** The place it's under:  `undefined`, under none. */
  placeName?: string
}
