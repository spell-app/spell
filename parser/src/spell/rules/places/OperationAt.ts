import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { MethodDefinition } from "spell/parser/spell/rules/methods/MethodDefinition"
import type { MethodSignatureData } from "spell/parser/spell/rules/methods/methods.shared"
import { PLACE_KIND_ABILITIES } from "./places.shared"
import { textIn } from "./PlaceDetail"

/**
 * `operation_at` rule:  an action that happens at a place, by its own address (epic `data` Q14, Q17's C).
 *
 * ```spell
 * family cookbook is a web service at "https://api.example.com/v1":
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
 * - Known below its line:  a place's lines come first in a program, as a saved type needs them to.
 * - Compiles to `core.callPlace()`;  `create_place` gathers the addresses into its `core.place()`.
 * - `Priority.declaration`:  `to_do_something` reads as far as the text, and this reads the whole line.
 */
export class OperationAt extends MethodDefinition<"signature|path", OperationData> {
  @proto static alias = "statement"
  @proto static priority = Priority.declaration
  @proto static inlineInitialType = true

  /** Says which place it's under, or warns that it's under none. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const place = P.SubjectScope.of(scope)?.subjectType
    const language = SP.Language.of(scope)
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
   * - What's sent:  the thing it's a method of, else its first `(argument)`, else nothing.
   * - Under no place:  nothing to call.
   */
  protected bodyAST(match: P.MatchFor<this>): P.ASTStatement | undefined {
    const { placeName } = match.data as Partial<OperationData>
    if (!placeName) return undefined
    const { methodName = "", instanceType, args } = this.getSignature(match)!
    const text = (value: string) => new P.ASTStringLiteral(match, { value: JSON.stringify(value) })
    const sent = instanceType ? new P.ASTSelfLiteral(match) : args[0]
    return new P.ASTReturnStatement(match, {
      value: new P.ASTCoreMethodInvocation(match, {
        methodName: "callPlace",
        args: [text(placeName), text(methodName), ...(sent ? [sent as P.ASTExpression] : [])]
      })
    })
  }
}

/** What `operation_at` notes while parsing. */
type OperationData = {
  /** The place it's under:  `undefined`, under none. */
  placeName?: string
}
