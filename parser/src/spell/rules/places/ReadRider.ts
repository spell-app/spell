import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { loopItemOf } from "./places.shared"
// Import directly to avoid circular import
import { DrawIt } from "spell/parser/spell/rules/classes/DrawIt"

/** Which of a read's riders a line is:  what `core.drawRead()` calls each. */
export type RiderKind = "waiting" | "none" | "failed"

/**
 * `read_rider` rule:  what a read in a drawing shows while it has no list to show (epic `data` P11).
 *
 * ```spell
 * for each recipe in the matches
 * 	draw the recipe
 * while waiting:
 * 	<ui-loader/>
 * if there are none:
 * 	<ui-text>No recipes yet.</ui-text>
 * if that fails:
 * 	<ui-message color="red">Can't reach the cookbook.</ui-message>
 * ```
 *
 * - Each hangs off the read above it, as `otherwise` hangs off its `if`:  `DrawnLines` gathers them.
 * - Writing none of them still shows something sensible:  see `core.drawRead()`.
 * - Only in a drawing:  an action waits by itself, and has nothing to show meanwhile.
 */
export class ReadRider extends SpellStatement<"body?"> {
  @proto static alias = "statement"
  @proto static priority = Priority.declaration
  /** What lets a line of markup draw in it:  see `DrawIt.drawingIn()`. */
  @proto static loops = true
  /** Which rider it is. */
  @proto static kind: RiderKind = "waiting"
  declare kind: RiderKind

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    if (!match) return undefined
    if (DrawIt.drawingIn(scope)) return match
    return SpellStatement.refuse(match, SP.Language.of(scope).parserMessage("rider-only-in-a-drawing"))
  }

  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    return new P.MethodScope({ parentScope: match.scope, declaredBy: match })
  }

  /** `core.readRider("waiting", () => ...)`, until `DrawnLines` takes it into its read.  With no read above it:  nothing draws it. */
  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const body = this.getBody(match)
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "readRider",
      args: [
        new P.ASTStringLiteral(match, { value: JSON.stringify(this.kind) }),
        new P.ASTMethodDefinition(body ?? match, { inline: true, body: P.matchAST(body) })
      ]
    })
  }
}

/** `while waiting:` -- see `ReadRider`. */
export class WhileWaiting extends ReadRider {
  @proto static kind: RiderKind = "waiting"
}

/**
 * `if there are none:` -- see `ReadRider`.
 * - Spanish's `ninguna` agrees with what its loop reads:  a warning when it doesn't.
 */
export class IfThereAreNone extends ReadRider {
  @proto static kind: RiderKind = "none"

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    if (!match) return undefined
    const language = SP.Language.of(scope)
    const none = tokens.find((token) => /^ningun/.test(`${token.value}`))
    const wanted = none && language.agreedForm(`${none.value}`, loopItemOf(scope), false)
    if (wanted) SP.SpellWarnings.note(match, language.parserMessage("did-you-mean", { phrase: wanted }))
    return match
  }
}

/** `if that fails:` -- see `ReadRider`. */
export class IfThatFails extends ReadRider {
  @proto static kind: RiderKind = "failed"
}
