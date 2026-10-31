import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { abilitiesOf } from "./places.shared"

/**
 * `all_or_nothing` rule:  what's changed in its body goes out as one, or not at all (epic `data` P11).
 * - e.g. `all or nothing:`, then its lines
 * - As true as the place can make it:  the compiler says so of one that can't, once it knows.
 * - Compiles to `await core.allOrNothing(() => { ... })`.
 */
export class AllOrNothing extends SpellStatement<"body?"> {
  @proto static alias = "statement"

  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    return new P.MethodScope({ parentScope: match.scope, declaredBy: match })
  }

  /** SIDE EFFECT:  a warning, if every saved type's place in this project can't make it true. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    if (!match) return undefined
    const language = SP.Language.of(scope)
    SP.SpellWarnings.noteIf(match, language.parserMessage("all-or-nothing-not-atomic"), () => {
      const saved = AllOrNothing.typeOfWrites(match, this.getBody(match))?.savedPlace()
      return !!saved && !abilitiesOf(saved)?.isAtomic
    })
    return match
  }

  /** The type of the first saved thing its body writes:  what it can tell of its place. */
  private static typeOfWrites(match: P.Match, body: P.Match | undefined): P.TypeScope | undefined {
    const stack = [body]
    for (let each = stack.pop(); each; each = stack.pop()) {
      const { type, list } = each.groups as { type?: P.Match; list?: P.Match }
      const named = list && !Array.isArray(list) ? (list.groups as { type?: P.Match }).type : type
      const scopeType = named && !Array.isArray(named) ? (named.data as { scopeType?: unknown }).scopeType : undefined
      if (scopeType instanceof P.TypeScope && scopeType.savedPlace()) return scopeType
      for (const item of each.matched) if (item instanceof P.Match) stack.push(item)
      for (const value of Object.values(each.data)) {
        for (const item of [value].flat()) if (item instanceof P.Match) stack.push(item)
      }
    }
    return match.scope.getType(undefined)
  }

  getAST(match: P.MatchFor<this>): P.ASTCoreMethodInvocation {
    const body = this.getBody(match)
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "allOrNothing",
      args: [new P.ASTMethodDefinition(body ?? match, { inline: true, body: P.matchAST(body) })]
    })
  }
}
