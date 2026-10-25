import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
import { isViewType } from "./classes.shared"
import { TypeDeclaration } from "./TypeDeclaration"

/**
 * `create_type` rule:  `a card is a thing` -- declares `type` as a new class extending `superType`.
 * - Its name may be several words, with a short name (see `TypeDeclaration`):
 *   `a bank account aka account is a thing`
 * - `Priority.declaration`, so this wins over other `{type} is {type}` -ish statement rules.
 * - SIDE EFFECT: adds `type` to `scope.types`, unless it's already defined (no redefinition/merge) --
 *   see `TypeDeclaration.declareType()`.
 * - Compiles to an exported class declaration, e.g. `a card is a thing` => `export class Card extends Thing {}`.
 *   - A view defines its element in it -- see `TypeDeclaration.elementMember()`.
 *   - Another project reaches it by `import`ing it -- no globals.
 * - Made straight from a built-in template written in spell, e.g. `a card is a two sided view`, it gets that
 *   template's lines in its outline body, before its own:  its parts, its direction, `turn it over`, its drawing
 *   (epic `elemental-spell` P5, J8) -- see `preludeOf()`.
 */
export class CreateType extends TypeDeclaration<
  "type|aka?|superType|with_nested_statements?|body?",
  { elementProject?: string; elementName?: string; prelude?: string; preludeBlock?: P.Match }
> {
  @proto static declares: P.DeclaresSpec = { kind: "type", name: "type", detail: "superType" }

  /**
   * Notes a view type's project, for its element (`elementMember()`);
   * then refuses a name some other type already goes by -- see `TypeDeclaration.refuseTakenNames()`.
   * - An app made straight from `app` names its element `app`, not its class:  `<solitaire-app>`
   *   (epic `elemental-spell` Q62).  A sub-type of it keeps its own name, so the two tags differ.
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { scopeType } = (match.groups.superType as P.Match<P.MatchGroups, { scopeType?: unknown }>).data
    if (scopeType instanceof P.TypeScope && isViewType(scopeType)) {
      match.data.elementProject = TypeDeclaration.projectNameOf(scope)
      if (scopeType.name === P.classCase(APP_TYPE)) match.data.elementName = APP_ELEMENT_NAME
    }
    if (scopeType instanceof P.TypeScope) match.data.prelude = CreateType.preludeOf(scope, scopeType)
    return this.refuseTakenNames(match)
  }

  /**
   * The lines a type made straight from `superType` gets, if it's a built-in template written in spell -- in the
   * language of `scope`, e.g. a two sided view's (`SP.LanguageWords.templatePreludes`).
   * - Straight from it only:  a sub-type of a card gets them through the card.
   */
  static preludeOf(scope: P.Scope, superType: P.TypeScope): string | undefined {
    const preludes = SP.Language.of(scope).words.templatePreludes ?? {}
    const datatype = Object.keys(preludes).find((name) => P.classCase(name) === superType.name)
    return datatype && preludes[datatype]
  }

  /** SIDE EFFECT:  declares our type -- see `TypeDeclaration.declareType()`. */
  mutateScope(match: P.MatchFor<this>) {
    this.declareType(match, `${match.groups.superType.value}`)
    this.readPrelude(match)
  }

  /**
   * SIDE EFFECT:  reads our built-in template's lines (`preludeOf()`) into our outline body's scope, before the body:
   * each is committed as the body's lines are, so `it is face up` and `turn it over` read in the lines below.
   * - Kept as `match.data.preludeBlock`:  NOT in our groups, as its words aren't the file's.
   *   They compile into our class, before the body's lines -- see `getAST()`.
   */
  private readPrelude(match: P.MatchFor<this>): void {
    const { prelude } = match.data
    if (!prelude) return
    const { nestedScope } = match
    match.data.preludeBlock = nestedScope.parser?.parse(prelude, "block", nestedScope) ?? undefined
  }
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    const { type, superType } = match.groups
    const typeAST = P.matchAST<P.ASTTypeExpression>(type)
    const element = this.elementMember(match, typeAST, match.data.elementProject, match.data.elementName)
    const declaration = new P.ASTClassDeclaration(match, {
      type: typeAST,
      superType: P.matchAST<P.ASTTypeExpression>(superType),
      members: element ? [element] : undefined
    })
    // our built-in template's lines, beside the class as the body's are:  hoisted into it
    const prelude = match.data.preludeBlock?.AST as P.ASTStatement | undefined
    return new P.ASTStatementGroup(match, { statements: prelude ? [declaration, prelude] : [declaration] })
  }
}

/** The built-in type an app is made from:  `solitaire is an app`. */
const APP_TYPE = "app"

/** The word an app's element is named by, after its project's:  `<solitaire-app>`. */
const APP_ELEMENT_NAME = "App"
