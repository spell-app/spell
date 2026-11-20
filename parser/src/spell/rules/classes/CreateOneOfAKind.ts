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
 * - Only an app, a page or a page layout, or a kind of one:  `x is a thing` isn't ours.
 *   - A page:  `leaderboard is a page` (epic `elemental-spell` Q16).
 *   - A page layout:  `main layout is a page layout` (epic `mockup` T39);  `wide layout is a main layout` builds on it.
 *   - Its kind may be several words, if DECLARED:  `klondike is a card game`, `high scores is a score page`
 *     (epic `elemental-spell` C27;  see `namesOneOfAKindType()`).
 * - The instance is made where the line is, right after its class:
 *   classes declared further down the file move up above it (`SP.hoistClassDeclarations()`),
 *   so its properties' starting values can make things of those types.
 * - Its body's methods that name no receiver (`- to reset:`) can be called anywhere with none, and run on it:
 *   see `DynamicMethodRule.onThis()`.
 * - A page picks its page layout on its line (epic `mockup` T39):  `systems is a page, in the bare layout` =>
 *   `static layout = "BareLayout"`;  `login is a page, no layout` => `static layout = false`, just the page.
 *   - Said nothing, it's in the site's main layout, when the program has one (`static mainLayout`, `create_site`).
 *   - Refused on anything but a page, and when the words name a type that isn't a page layout.
 * - And whether it fills the window:  `home is a page, filling the window` =>
 *   `static fillsWindow = true`;  its site draws its layout `page-height="fluid"`, exactly the window's height, and
 *   the page's `height="fluid"` boxes share what's left.  Refused on anything but a page.
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

  /** Only an app, a page or a page layout, or a kind of one, is one of a kind. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    // refused (`refuseTakenNames()`), with no super-type to check:  not ours, unless it's made from itself, and only ours can say so
    const superType = match?.groups.superType as P.Match<P.MatchGroups, { scopeType?: unknown }> | undefined
    if (!superType) return (match?.data as { isFromItself?: boolean } | undefined)?.isFromItself ? match : undefined
    const { scopeType } = superType.data
    if (!isOneOfAKindType(scopeType)) return undefined
    return CreateOneOfAKind.refuseLayoutOf(match!, scopeType as P.TypeScope)
  }

  /**
   * `match`, refused when its line picks a page layout (`, in the bare layout`, `, no layout`) it can't have:
   * - only a page has a layout
   * - the words must name a page layout:  checked once the whole project has parsed, as a layout may be declared in a
   *   file parsed after this one
   */
  private static refuseLayoutOf(match: P.MatchFor<CreateOneOfAKind>, type: P.TypeScope): P.Match | undefined {
    const { layout, no_layout, fills_window } = match.groups as LayoutGroups
    if (!layout && !no_layout && !fills_window) return match
    const language = SP.Language.of(match.scope)
    if (!type.isA("Page"))
      return CreateOneOfAKind.refuse(
        match,
        language.parserMessage(
          fills_window && !layout && !no_layout ? "fills-window-not-on-a-page" : "layout-not-on-a-page"
        )
      )
    if (!layout) return match
    const words = `${layout.raw ?? layout.inputText}`.trim()
    const named = () => match.scope.getType(CreateOneOfAKind.layoutClassFor(match))
    SP.SpellWarnings.refuseIf(
      match,
      () => language.parserMessage("layout-not-declared", { layout: words }),
      () => {
        const found = named()
        return !(found instanceof P.TypeScope && !found.stub && found.isA("PageLayout"))
      },
      layout
    )
    return match
  }

  /** The class of the layout `match`'s line picks:  `bare layout` => `BareLayout`. */
  static layoutClassFor(match: P.Match): string {
    const { layout } = match.groups as LayoutGroups
    return P.classCase(SP.typeName(`${layout!.raw ?? layout!.inputText}`.trim().split(/\s+/).join("-")))
  }

  /**
   * SIDE EFFECT:  declares our type, then its one instance, e.g. `solitaire` -- a variable of kind `only`.
   * - In the PROJECT's scope, not its file's:  every file can say `the hearing of the pokedex` (epic `data` I44).
   *   - Its other top-level variables stay its own.
   * - Replacing the one the scan made ahead (`SpellParser.stubDeclaredVariables()`).
   */
  mutateScope(match: P.MatchFor<this>) {
    super.mutateScope(match)
    const words = `${match.groups.type.value}`
    // a rule's own test has no project:  its scope, then
    const project = match.getScopeOfType(P.ProjectScope) ?? match.scope
    project.variables?.replace({
      name: CreateOneOfAKind.variableName(match),
      datatype: match.scope.getType(words)?.name ?? words,
      kind: "only",
      declaredBy: match
    })
  }

  /** The class, then its one instance:  `export const solitaire = new Solitaire()`. */
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    const group = CreateOneOfAKind.withLayout(match, super.getAST(match))
    const type = P.matchAST<P.ASTTypeExpression>(match.groups.type)
    const made = new P.ASTAssignmentStatement(match, {
      thing: new P.ASTVariableExpression(match, { name: CreateOneOfAKind.variableName(match) }),
      value: new P.ASTNewInstanceExpression(match, { type }),
      isNewVariable: true
    })
    return new P.ASTStatementGroup(match, { statements: [...(group.statements ?? []), made] })
  }

  /**
   * `group`, its class given the layout its line picks:  `static layout = "BareLayout"`, or `false` for `no layout`;
   * and `static fillsWindow = true` for `filling the window`.
   * - Nothing when its line says neither.
   */
  private static withLayout(match: P.MatchFor<CreateOneOfAKind>, group: P.ASTStatementGroup): P.ASTStatementGroup {
    const { layout, no_layout, fills_window } = match.groups as LayoutGroups
    if (!layout && !no_layout && !fills_window) return group
    const type = P.matchAST<P.ASTTypeExpression>(match.groups.type)
    const members: P.ASTStaticDefinition[] = []
    if (layout || no_layout) {
      const value = layout
        ? new P.ASTStringLiteral(match, { value: JSON.stringify(CreateOneOfAKind.layoutClassFor(match)) })
        : new P.ASTBooleanLiteral(match, false)
      members.push(new P.ASTStaticDefinition(match, { type, name: LAYOUT, value }))
    }
    if (fills_window)
      members.push(
        new P.ASTStaticDefinition(match, { type, name: FILLS_WINDOW, value: new P.ASTBooleanLiteral(match, true) })
      )
    const statements = (group.statements ?? []).map((statement) =>
      statement instanceof P.ASTClassDeclaration ? statement.withMembers(members) : statement
    )
    return new P.ASTStatementGroup(match, { statements })
  }

  /** Name of the one instance's variable:  the line's words, `my_game` for `my game is an app`. */
  static variableName(match: P.Match): string {
    return SP.SpellParser.oneOfAKindVariableName(`${(match.groups.type as P.Match).raw}`)
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

/**
 * The groups a page's line picks its layout with:  `, in the {layout} layout`, `, no layout`;  and
 * `, filling the window`.
 */
type LayoutGroups = { layout?: P.Match; no_layout?: P.Match; fills_window?: P.Match }

/** The static a page's layout goes in:  `static layout = "BareLayout"`, read by the core's `SiteBase`. */
const LAYOUT = "layout"
/** The static saying a page fills the window:  `static fillsWindow = true`, read by the core's `SiteBase`. */
const FILLS_WINDOW = "fillsWindow"

/** Most words a kind's name may have:  as many as a type's (drawable-thing J7). */
const MAX_KIND_WORDS = 4

/**
 * Can `type` be one of a kind:  an app, a page or a page layout, or a kind of one (`solitaire is an app`,
 * `leaderboard is a page`, `main layout is a page layout`).
 * - A page too (epic `elemental-spell` Q16);  a page layout (epic `mockup` T39).
 */
function isOneOfAKindType(type: unknown): boolean {
  return type instanceof P.TypeScope && (type.isA("App") || type.isA("Page") || type.isA("PageLayout"))
}
