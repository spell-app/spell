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
 * - Built on a Spell UI element, `a "netlist column" is a ui tree view` (epic `from-console` P11):
 *   it extends `View`, naming its element, `static uiElement = "ui-tree"`;  see `SP.UIViews`.
 * - Its own values for properties its super-type has, on its line (epic `language` P55):
 *   `a "column" is a pile with layout "vertical"` (or `layout = vertical`), several joined by commas, as on a new thing.
 *   - The same as its body's line, `its "layout" is vertical`:  `get layout() { return "vertical" }`.
 *   - Each is the type's own member, as its body's line would be (epic `language` J157):
 *     declared on it (`mutateScope()`), with its `SPELL: DECLARES` comment above its getter,
 *     so the words file, hover, the Inspector and the scope explorer list it.
 *   - Spanish:  `una "columna" es una pila con disposición "vertical"`.
 *   - A property its super-type hasn't is refused, naming it:  "A pile has no size" -- see `checkDefaults()`.
 */
export class CreateType extends TypeDeclaration<
  "type|aka?|superType|defaults?|with_nested_statements?|body?",
  { elementProject?: string; elementName?: string; defaults?: TypeDefault[]; uiElement?: string }
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
      // built on a Spell UI element, `a "netlist column" is a ui tree view`:  its element is that one
      if (SP.UIViews.isUIView(scopeType)) match.data.uiElement = SP.UIViews.baseOf(scopeType)?.tag
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
   * - And each of its own values for its super-type's properties as a member of ours, declared by its own words
   *   (`layout "vertical"`), as its body's line `its layout is "vertical"` declares it (epic `language` J157):
   *   - what the value is, its datatype:  `text` for a quoted one, `boolean` for a flag (`with face up`)
   *   - the inherited member's names in compiled code and its values, as `PropertyValueGetter.mutateScope()` keeps
   */
  mutateScope(match: P.MatchFor<this>) {
    this.declareType(match, `${match.groups.superType.value}`)
    const typeScope = match.scope.getType(`${match.groups.type.value}`)
    if (!typeScope) return
    for (const { name, item } of match.data.defaults ?? []) {
      const { property, value } = item.groups as { property?: P.Match; value?: P.Match }
      const member = typeScope.inheritedMember(name)
      const datatype = value ? value.datatype : "boolean"
      typeScope.declareProperty(name, item, {
        asWritten: property?.raw,
        datatype: typeof datatype === "string" ? datatype : undefined,
        output: member?.output,
        valueOutputs: member?.valueOutputs,
        listedValues: member?.listedValues
      })
    }
  }
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    const { type, superType } = match.groups
    const { uiElement } = match.data
    const typeAST = P.matchAST<P.ASTTypeExpression>(type)
    const element = this.elementMember(match, typeAST, match.data.elementProject, match.data.elementName)
    const members = [
      ...(uiElement ? [CreateType.uiElementMember(match, typeAST, uiElement)] : []),
      ...(element ? [element] : []),
      ...CreateType.defaultGetters(match, typeAST)
    ]
    // a Spell UI element's view is a view, naming its element:  `extends View`, `static uiElement = "ui-tree"`
    const superTypeAST = uiElement
      ? new P.ASTTypeExpression(superType, { raw: `${superType.raw}`, name: P.BUILT_IN_CLASS_NAMES.view! })
      : P.matchAST<P.ASTTypeExpression>(superType)
    return new P.ASTStatementGroup(match, {
      statements: [
        new P.ASTClassDeclaration(match, {
          type: typeAST,
          superType: superTypeAST,
          members: members.length ? members : undefined
        })
      ]
    })
  }

  /**
   * `static uiElement = "ui-tree"`:  the Spell UI element a type built on one draws as (epic `from-console` P11).
   * - The core reads it, `core.uiElementOf()`, and the page builds the type's tag on that element.
   */
  private static uiElementMember(match: P.Match, type: P.ASTTypeExpression, tag: string): P.ASTClassMember {
    return new P.ASTStaticDefinition(match, {
      type,
      name: "uiElement",
      value: new P.ASTStringLiteral(match, JSON.stringify(tag))
    })
  }

  /**
   * A getter for each of our own values, as its body's line writes it:  `get layout() { return "vertical" }`.
   * - Its `SPELL: DECLARES` comment above it, as its body's line has (J157):  see `mutateScope()`.
   */
  private static defaultGetters(
    match: P.MatchFor<CreateType>,
    type: P.ASTTypeExpression
  ): Array<P.ASTPropertyDefinition | P.ASTComment> {
    return (match.data.defaults ?? []).flatMap(({ name, output, datatype, item }) => {
      const { value } = item.groups as { value?: P.Match }
      // a flag, `with face up`:  yes
      const body = value ? P.matchAST<P.ASTExpression>(value) : new P.ASTBooleanLiteral(item, true)
      const getter = new P.ASTPropertyDefinition(item, {
        type,
        property: new P.ASTPropertyLiteral(item, output ?? name),
        get: new P.ASTMethodDefinition(item, { body, datatype })
      })
      const declared = SP.SpellDeclarations.commentFor(item)
      return declared ? [declared, getter] : [getter]
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
