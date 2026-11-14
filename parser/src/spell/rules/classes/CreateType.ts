import { proto, upperFirst } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SpellConstant } from "spell/parser/spell/rules/constants"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
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
 * - Its own values for properties its super-type has, on its line (epic `language` P55):
 *   `a "column" is a pile with layout "vertical"` (or `layout = vertical`), several joined by commas, as on a new thing.
 *   - The same as its body's line, `its "layout" is vertical`:  `get layout() { return "vertical" }`.
 *   - Spanish:  `una "columna" es una pila con disposición "vertical"`.
 *   - A property its super-type hasn't is refused, naming it:  "A pile has no size" -- see `checkDefaults()`.
 */
export class CreateType extends TypeDeclaration<
  "type|aka?|superType|defaults?|with_nested_statements?|body?",
  { elementProject?: string; elementName?: string; defaults?: TypeDefault[] }
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
    const refused = CreateType.checkDefaults(match, scopeType)
    return refused ?? this.refuseTakenNames(match)
  }

  /**
   * Notes our own values for the super-type's properties (`with layout "vertical"`) in `match.data.defaults`;
   * a refusal if the super-type has no such property, e.g. "A pile has no size".
   * - Each value in the member's own words, as its body's line says it (`SpellConstant.sayForMember()`).
   * - A lookup:  call it WHILE PARSING.
   */
  private static checkDefaults(match: P.MatchFor<CreateType>, superType: unknown): P.Match | undefined {
    const { defaults } = match.groups as { defaults?: P.Match }
    if (!defaults) return undefined
    const language = SP.Language.of(match.scope)
    const found: TypeDefault[] = []
    for (const item of defaults.items ?? []) {
      const { property, value } = item.groups as { property?: P.Match; value?: P.Match }
      const name = `${property?.value ?? ""}`
      const member = superType instanceof P.TypeScope ? CreateType.memberOf(superType, name) : undefined
      if (!member || !(superType instanceof P.TypeScope)) {
        const typeScope = superType instanceof P.TypeScope ? superType : undefined
        const aType = language.withArticle("indefinite", `${match.groups.superType.raw}`, typeScope)
        return SpellStatement.refuse(
          match,
          language.parserMessage("type-default-not-a-property", { AType: upperFirst(aType), property: name })
        )
      }
      SpellConstant.sayForMember(member, value)
      found.push({ name, output: member.output, datatype: CreateType.datatypeOf(match.scope, superType, member), item })
    }
    match.data.defaults = found
    return undefined
  }

  /** `superType`'s member `name`, its own or one it inherits -- `undefined` if it has none. */
  private static memberOf(superType: P.TypeScope, name: string): P.ScopeVariable | undefined {
    for (const type of superType.chain()) {
      const member = type.variables.get(name, "LOCAL_ONLY")
      if (member) return member
    }
    return undefined
  }

  /**
   * The datatype of `superType`'s property `member`, for TypeScript's getter -- as `PropertyValueGetter.inheritedTypeOf()`:
   * its own, e.g. `number`;  else, for one of a list, the kind of its values, e.g. `PileLayout`.
   */
  private static datatypeOf(scope: P.Scope, superType: P.TypeScope, member: P.ScopeVariable): string | undefined {
    if (typeof member.datatype === "string") return member.datatype
    const owner = superType.chain().find((type) => type.variables.get(`${member.name}`, "LOCAL_ONLY"))
    const kind = owner && SP.Language.of(scope).propertyKindType(owner.name, `${member.name}`)
    return kind && scope.getType(kind)?.valueKind?.property ? kind : undefined
  }

  /**
   * SIDE EFFECT:  declares our type -- see `TypeDeclaration.declareType()`.
   * - Its own values for its super-type's properties declare nothing:  the super-type's members are ours already.
   */
  mutateScope(match: P.MatchFor<this>) {
    this.declareType(match, `${match.groups.superType.value}`)
  }
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    const { type, superType } = match.groups
    const typeAST = P.matchAST<P.ASTTypeExpression>(type)
    const element = this.elementMember(match, typeAST, match.data.elementProject, match.data.elementName)
    const members = [...(element ? [element] : []), ...CreateType.defaultGetters(match, typeAST)]
    return new P.ASTStatementGroup(match, {
      statements: [
        new P.ASTClassDeclaration(match, {
          type: typeAST,
          superType: P.matchAST<P.ASTTypeExpression>(superType),
          members: members.length ? members : undefined
        })
      ]
    })
  }

  /** A getter for each of our own values, as its body's line writes it:  `get layout() { return "vertical" }`. */
  private static defaultGetters(match: P.MatchFor<CreateType>, type: P.ASTTypeExpression): P.ASTPropertyDefinition[] {
    return (match.data.defaults ?? []).map(({ name, output, datatype, item }) => {
      const { value } = item.groups as { value?: P.Match }
      // a flag, `with face up`:  yes
      const body = value ? P.matchAST<P.ASTExpression>(value) : new P.ASTBooleanLiteral(item, true)
      return new P.ASTPropertyDefinition(item, {
        type,
        property: new P.ASTPropertyLiteral(item, output ?? name),
        get: new P.ASTMethodDefinition(item, { body, datatype })
      })
    })
  }
}

/** One of a type's own values for its super-type's properties, `layout "vertical"`:  what `getAST()` writes. */
type TypeDefault = {
  /** the property's name, as spell knows it */
  name: string
  /** its name in compiled code, when that differs (a built-in's, in another language's words) */
  output?: string
  /** its type, for TypeScript's getter */
  datatype?: string
  /** the `object_literal_property` it's from */
  item: P.Match
}

/** The built-in type an app is made from:  `solitaire is an app`. */
const APP_TYPE = "app"

/** The word an app's element is named by, after its project's:  `<solitaire-app>`. */
const APP_ELEMENT_NAME = "App"
