import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Wording } from "spell/parser/spell/rules/expressions"
import { CreateType } from "./CreateType"

/**
 * `create_one_of_a_kind` rule:  `solitaire is an app` --
 * declares an app AND its one instance (epic `outline-spell` P21).
 * - e.g. `solitaire is an app where:`, then its outline body, as `a solitaire is an app where:` has
 * - No article:  it names the thing, not a kind of thing.
 *   - The type is `Solitaire`, as for `a solitaire is an app`;  its one instance is the variable `solitaire`.
 *   - So there's no `set the solitaire to a new solitaire`:  `print solitaire`, `debug the solitaire` just work.
 * - Only an app or a page, or a kind of one:  `x is a thing` isn't ours.
 *   - A page:  spellx's `<spell-page>` (epic `elemental-spell` Q16), `leaderboard is a page`.
 *   - Its kind may be several words, if DECLARED:  `klondike is a card game`, `high scores is a score page`
 *     (epic `elemental-spell` C27;  see `namesOneOfAKindType()`).
 * - The instance is made where the line is, right after its class:
 *   classes declared further down the file move up above it (`SP.hoistClassDeclarations()`),
 *   so its properties' starting values can make things of those types.
 * - Its body's methods that name no receiver (`- to reset:`) can be called anywhere with none, and run on it:
 *   see `DynamicMethodRule.onThis()`.
 */
export class CreateOneOfAKind extends CreateType {
  @proto static declares: P.DeclaresSpec = { kind: "type", name: "type", detail: "superType" }

  /**
   * Quick test:  no article first (`a solitaire is an app` is `create_type`'s), and `is a|an <app>` after it.
   * - So an editor doesn't offer `is a ...` after just any words, e.g. `set y`:  only on a line naming an app.
   * - `is` and the article are the language's own, its `is_or_is_not` and `indefinite_article` word rules.
   * - The app's word too:  `SP.typeName()` reads Spanish's `aplicación` as `app`.
   *   Each is read only before a word naming an app:  reading a word rule's word tokenizes it.
   */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    const reads = (ruleName: string, token: P.Token | undefined) =>
      !!token && Wording.reads(scope, ruleName, `${token.value}`)
    if (reads("indefinite_article", tokens[start])) return false
    const app = tokens.findIndex(
      (token, index) =>
        index > start + 2 &&
        reads("indefinite_article", tokens[index - 1]) &&
        reads("is_or_is_not", tokens[index - 2]) &&
        namesOneOfAKindType(scope, tokens, index)
    )
    if (app < 0) return false
    return super.test(scope, tokens, start)
  }

  /** Only an app or a page, or a kind of one, is one of a kind. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    // refused (`refuseTakenNames()`), with no super-type to check:  not ours, unless it's made from itself, and only ours can say so
    const superType = match?.groups.superType as P.Match<P.MatchGroups, { scopeType?: unknown }> | undefined
    if (!superType) return (match?.data as { isFromItself?: boolean } | undefined)?.isFromItself ? match : undefined
    const { scopeType } = superType.data
    return isOneOfAKindType(scopeType) ? match : undefined
  }

  /** SIDE EFFECT:  declares our type, then its one instance, e.g. `solitaire` -- a variable of kind `only`. */
  mutateScope(match: P.MatchFor<this>) {
    super.mutateScope(match)
    const words = `${match.groups.type.value}`
    match.scope.variables?.add({
      name: CreateOneOfAKind.variableName(match),
      datatype: match.scope.getType(words)?.name ?? words,
      kind: "only",
      declaredBy: match
    })
  }

  /** The class, then its one instance:  `export const solitaire = new Solitaire()`. */
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    const group = super.getAST(match)
    const type = P.matchAST<P.ASTTypeExpression>(match.groups.type)
    const made = new P.ASTAssignmentStatement(match, {
      thing: new P.ASTVariableExpression(match, { name: CreateOneOfAKind.variableName(match) }),
      value: new P.ASTNewInstanceExpression(match, { type }),
      isNewVariable: true
    })
    return new P.ASTStatementGroup(match, { statements: [...(group.statements ?? []), made] })
  }

  /** Name of the one instance's variable:  the line's words, `my_game` for `my game is an app`. */
  static variableName(match: P.Match): string {
    return `${(match.groups.type as P.Match).raw}`
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_")
  }
}

/**
 * Do the words at `tokens[index]` name a DECLARED app or page, or a kind of one -- longest first, up to
 * `MAX_KIND_WORDS` words:  `card game` in `klondike is a card game` (epic `elemental-spell` C27).
 * - Only declared names match, as everywhere a type is named (drawable-thing O5):  no guessing from the words.
 */
function namesOneOfAKindType(scope: P.Scope, tokens: P.Token[], index: number): boolean {
  for (let count = Math.min(MAX_KIND_WORDS, tokens.length - index); count > 0; count--) {
    const words = tokens.slice(index, index + count)
    if (!words.every((token) => token instanceof P.WordToken)) continue
    // a name of several words reads dashed, as the type rule reads it:  `card-game` => `CardGame`
    const name = SP.typeName(words.map((token) => token.value).join("-"))
    if (isOneOfAKindType(scope.getType(P.isValueType(name) ? name : P.classCase(name)))) return true
  }
  return false
}

/** Most words a kind's name may have:  as many as a type's (drawable-thing J7). */
const MAX_KIND_WORDS = 4

/**
 * Can `type` be one of a kind:  an app or a page, or a kind of one (`solitaire is an app`, `leaderboard is a page`).
 * - A page:  spellx's `<spell-page>` (epic `elemental-spell` Q16).
 */
function isOneOfAKindType(type: unknown): boolean {
  return type instanceof P.TypeScope && (type.isA("App") || type.isA("Page"))
}
