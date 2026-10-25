import { proto } from "spell/util"
import { P } from "spell-parser/parser"
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
 */
export class CreateType extends TypeDeclaration<
  "type|aka?|superType|with_nested_statements?|body?",
  { elementProject?: string; elementName?: string }
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
    return this.refuseTakenNames(match)
  }

  /** SIDE EFFECT:  declares our type -- see `TypeDeclaration.declareType()`. */
  mutateScope(match: P.MatchFor<this>) {
    this.declareType(match, `${match.groups.superType.value}`)
  }
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    const { type, superType } = match.groups
    const typeAST = P.matchAST<P.ASTTypeExpression>(type)
    const element = this.elementMember(match, typeAST, match.data.elementProject, match.data.elementName)
    return new P.ASTStatementGroup(match, {
      statements: [
        new P.ASTClassDeclaration(match, {
          type: typeAST,
          superType: P.matchAST<P.ASTTypeExpression>(superType),
          members: element ? [element] : undefined
        })
      ]
    })
  }
}

/** The built-in type an app is made from:  `solitaire is an app`. */
const APP_TYPE = "app"

/** The word an app's element is named by, after its project's:  `<solitaire-app>`. */
const APP_ELEMENT_NAME = "App"
