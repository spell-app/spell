import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { loopItemOf } from "./places.shared"
// Import directly to avoid circular import
import { DrawIt } from "spell/parser/spell/rules/classes/DrawIt"

/** Which of a read's riders a line is:  what `core.drawRead()` calls each. */
export type RiderKind = "waiting" | "none" | "failed" | "failedSay" | "items" | "whole" | "paging" | "pageSize"

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

  /** Its body reads as the drawing around the loop does:  in a `<for>`'s body, `its` is still the drawing's, not the item's. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    return new P.MethodScope({ parentScope: outsideTheLoop(match.scope), declaredBy: match })
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

/**
 * `if that fails say "Lost the signal"`:  the failure's own words, its Try again kept -- see `core.drawRead()` (epic `language` P17).
 * - A block `if that fails:` is `IfThatFails`, which draws its own body instead.
 */
export class IfThatFailsSay extends SpellStatement<"text"> {
  @proto static alias = "statement"
  @proto static priority = Priority.declaration
  /** What lets it sit in a loop's body. */
  @proto static loops = true
  @proto static kind: RiderKind = "failedSay"
  declare kind: RiderKind

  /** Its words read as the drawing around the loop does -- see `ReadRider.getNestedScopeForMatch()`. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    return super.parse(outsideTheLoop(scope), tokens)
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    return riderSaying(match, this.kind, P.matchAST(match.groups.text))
  }
}

/**
 * `show them in pages`, `show them all`:  how a long list is drawn, instead of more as you scroll -- see `core.drawRead()`.
 */
export class ShowThemPaged extends SpellStatement {
  @proto static alias = "statement"
  @proto static priority = Priority.declaration
  @proto static loops = true
  @proto static kind: RiderKind = "paging"
  declare kind: RiderKind
  /** How it draws. */
  @proto static paging: "pages" | "all" = "pages"
  declare paging: "pages" | "all"

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    return riderSaying(match, "paging", new P.ASTStringLiteral(match, { value: JSON.stringify(this.paging) }))
  }
}

/** `show them all` -- see `ShowThemPaged`. */
export class ShowThemAll extends ShowThemPaged {
  @proto static paging: "pages" | "all" = "all"
}

/**
 * `show them 12 at a time`:  how many a long list draws at once:  a page of `show them in pages`, or each lot of more as you
 * scroll -- see `core.drawRead()` (epic `data` Q35).
 * - e.g. `<for films paging="pages" page-size="12">`, the same thing as an attribute
 * - Left out:  24.
 * - Spanish says the number twice, `mostrarlos de 12 en 12`:  two different numbers aren't this rule.
 * - A whole number, 1 or more:  anything else won't compile.
 */
export class ShowThemAtATime extends SpellStatement<"size|same?"> {
  @proto static alias = "statement"
  @proto static priority = Priority.declaration
  @proto static loops = true
  @proto static kind: RiderKind = "pageSize"
  declare kind: RiderKind

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { size, same } = match.groups
    if (same && same.raw !== size.raw) return undefined
    const howMany = Number(size.raw)
    if (Number.isInteger(howMany) && howMany >= 1) return match
    return SpellStatement.refuse(match, SP.Language.of(scope).parserMessage("page-size-a-whole-number"))
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    return riderSaying(match, "pageSize", P.matchAST(match.groups.size))
  }
}

/**
 * The scope a rider written in a loop's body reads in:  the loop's own, outside it.
 * - So `<for its films loading={its signal}>` and its `<failed>` mean the drawing's `its`, as a rider under the loop would.
 */
function outsideTheLoop(scope: P.Scope): P.Scope {
  const rule = (scope as P.MethodScope).declaredBy?.rule as { loops?: boolean; kind?: unknown } | undefined
  return rule?.loops && rule.kind === undefined && scope.parentScope ? scope.parentScope : scope
}

/** `core.readRider(kind, () => value)`, until `DrawnLines` takes it into its read. */
function riderSaying(match: P.AnyMatch, kind: RiderKind, value: P.ASTExpression): P.ASTCoreMethodInvocation {
  return new P.ASTCoreMethodInvocation(match, {
    methodName: "readRider",
    args: [
      new P.ASTStringLiteral(match, { value: JSON.stringify(kind) }),
      new P.ASTMethodDefinition(match, { inline: true, body: new P.ASTReturnStatement(match, { value }) })
    ]
  })
}

/**
 * `show them in:`, then an element:  what goes around a list's items, the loader and messages outside it.
 *
 * ```spell
 * for film in films
 * show them in: <ui-cards columns="4"></ui-cards>
 * ```
 *
 * - An element with a row in it, a table's:  each item draws in a copy of the row -- see `core.drawRead()`.
 */
export class ShowThemIn extends ReadRider {
  @proto static kind: RiderKind = "items"
}

/** `show it all in:`, then an element:  what goes around the list and whatever shows in its place, a titled section. */
export class ShowItAllIn extends ReadRider {
  @proto static kind: RiderKind = "whole"
}

/** `while waiting:`, `while loading:` -- see `ReadRider`. */
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
