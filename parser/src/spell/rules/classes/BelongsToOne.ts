import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { getKnownType } from "spell/parser/spell/rules/types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `belongs_to_one` rule:  `a card belongs to one pile` -- a card is in at most ONE pile at a time
 * (epic page D7, D8, Q22):
 * - "pile" means the pile FAMILY:  `Pile` and every sub-type of it, e.g. `a tableau is a pile`.
 *   Adding a card to one takes it out of the other.
 * - A list outside the family, e.g. `a deck is a list of cards`, stays outside:
 *   a card can be in the deck AND one pile.
 * - Both types MUST be declared ABOVE, e.g. `a pile is a list of cards`:  what we compile to needs both classes.
 *   - A type only mentioned so far (a stub) is refused,
 *     as is a list type of spell's own, e.g. `one list`:  it'd make every list hold a card once.
 * - SIDE EFFECT:  the item type gains a READ-ONLY member naming the list type, `the pile of a card`:
 *   the pile holding it, or nothing.  Declared by THIS line -- see `P.TypeScope.declareOwnerMember()`.
 *   - A built-in item type, e.g. `a thing belongs to one bag`, gets NO member:
 *     it would go on a type every project shares.  Its lists still hold each OBJECT once.
 * - Compiles to two patches, run where we are, after both classes:
 *   - `Pile.exclusive = true`:  the runtime `List` keeps who holds each item
 *   - the member, `Object.defineProperty(Card.prototype, 'pile', { get() { return Pile.ownerOf(this) } ... })`
 *   - NEVER hoisted into the classes:  the member must win over any accessor an earlier statement gave it,
 *     e.g. `set the pile of the card to ...` above us.
 * - An owner saved in a place needn't be a list (epic `data` Q10):  `an ingredient belongs to one recipe` keeps ingredients
 *   INSIDE the recipe's row, in its list of them.  So a recipe removed takes them with it, and undo brings them back,
 *   on every kind of place, and `the recipe of an ingredient` is a read of who holds it (`core.ownerOfSaved()`).
 * - `a card can belong to many piles` is the opposite:  see `can_belong_to_many`.
 */
export class BelongsToOne extends SpellStatement<"type|list"> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"
  @proto static declares: P.DeclaresSpec = { kind: "property", name: "list", of: "type" }

  /** `it belongs to a pile` => `a card belongs to one pile` -- see `SpellStatement.getLongForm()`. */
  getLongForm(match: P.MatchFor<this>): string | undefined {
    const params = SpellStatement.longFormParams(match)
    if (!params || super.getLongForm(match) === undefined) return undefined
    const language = SP.Language.of(match.scope)
    const list = `${match.groups.list.raw}`
    const aList = language.withArticle("indefinite", list, BelongsToOne.typeOf(match.groups.list))
    return language.parserMessage("long-form-belongs-to-one", { ...params, list, aList })
  }

  /** Refused unless both types are declared above, and `list` is a list type of the project's -- see class docs. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { type, list } = match.groups
    const language = SP.Language.of(scope)
    const sentence = `"${match.inputText.trim()}"`
    const typeWords = `${type.raw}`
    const listWords = `${list.raw}`
    const aType = language.withArticle("indefinite", typeWords, BelongsToOne.typeOf(type))
    const aList = language.withArticle("indefinite", listWords, BelongsToOne.typeOf(list))
    const listExample = language.parserMessage("example-list-type", {
      list: listWords,
      aList,
      items: P.pluralize(typeWords)
    })
    for (const [word, example] of [
      [type, SpellStatement.exampleTypeDeclaration(scope, typeWords)],
      [list, listExample]
    ] as const) {
      const declared = BelongsToOne.typeOf(word)
      if (!declared || declared.stub) {
        return SpellStatement.refuse(match, language.parserMessage("belongs-to-undeclared", { sentence, example }))
      }
    }
    const listType = BelongsToOne.typeOf(list)!
    if (SP.isBuiltInTypeScope(listType)) {
      const message = language.parserMessage("belongs-to-built-in-list", { sentence, type: typeWords, aType })
      return SpellStatement.refuse(match, message)
    }
    if (listType.savedPlace() && !listType.isA("list")) return this.savedWithOwner(match, listType)
    if (!listType.isA("list")) {
      const message = language.parserMessage("belongs-to-not-a-list", { sentence, list: listWords, aList })
      return SpellStatement.refuse(match, message)
    }
    return match
  }

  /**
   * `match`, whose owner is saved in a place, and isn't a list (epic `data` Q10):  the owner's list of them is where they're kept.
   * - Refused when it has none to keep them in.
   */
  private savedWithOwner(match: P.MatchFor<this>, owner: P.TypeScope): P.Match {
    const { type, list } = match.groups
    const plural = P.pluralize(`${type.raw}`.trim())
    const member = owner.getMember(plural)
    if (!(member instanceof P.ScopeVariable)) {
      const message = SP.Language.of(match.scope).parserMessage("belongs-to-saved-needs-list", {
        owner: `${list.raw}`.trim(),
        items: plural
      })
      return SpellStatement.refuse(match, message)
    }
    ;(match.data as { savedField?: string }).savedField = P.JSWriter.instance.nameOf(`${member.name}`)
    return match
  }

  /** SIDE EFFECT:  the item type's member naming the list type -- not on a built-in type.  See class docs. */
  mutateScope(match: P.MatchFor<this>) {
    const { type, list } = match.groups
    const itemType = getKnownType(type)
    if (!SP.isBuiltInTypeScope(itemType)) getKnownType(list).declareOwnerMember(itemType, match)
  }

  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    const { type, list } = match.groups
    const listAST = P.matchAST<P.ASTTypeExpression>(list)
    const { savedField } = match.data as { savedField?: string }
    if (savedField) {
      const itemAST = P.matchAST<P.ASTTypeExpression>(type)
      const kept = new P.ASTCoreMethodInvocation(match, {
        methodName: "savedWithOwner",
        args: [itemAST, listAST, new P.ASTStringLiteral(match, { value: JSON.stringify(savedField) })]
      })
      const owner = new P.ASTCoreMethodInvocation(match, {
        methodName: "ownerOfSaved",
        args: [new P.ASTSelfLiteral(match)]
      })
      const member = new P.ASTPatchedMember(match, {
        member: new P.ASTPropertyDefinition(match, {
          type: itemAST,
          property: P.instanceCase(listAST.runtimeName),
          get: new P.ASTMethodDefinition(match, { body: new P.ASTReturnStatement(match, { value: owner }) })
        })
      })
      return new P.ASTStatementGroup(match, { statements: [kept, member] })
    }
    const exclusive = new P.ASTStaticDefinition(match, {
      type: listAST,
      name: "exclusive",
      value: new P.ASTBooleanLiteral(match, true)
    })
    const statements: P.ASTStatement[] = [new P.ASTPatchedMember(match, { member: exclusive })]
    if (!P.isBuiltInType(SP.typeName(`${type.value}`))) {
      statements.push(BelongsToOne.ownerMemberAST(match, P.matchAST<P.ASTTypeExpression>(type), listAST))
    }
    return new P.ASTStatementGroup(match, { statements })
  }

  /** What type word `word` names, as `parse()` looked it up -- `undefined` if nothing does yet. */
  private static typeOf(word: P.Match): P.TypeScope | undefined {
    const { scopeType } = word.data as { scopeType?: unknown }
    return scopeType instanceof P.TypeScope ? scopeType : undefined
  }

  /**
   * The item type's member naming the list type, patched on,
   * e.g. `Object.defineProperty(Card.prototype, 'pile', { get() { return Pile.ownerOf(this) }, ... })`.
   * - Named as `declareOwnerMember()` names it, e.g. `stock_pile` for `a stock-pile`.
   */
  static ownerMemberAST(
    match: P.MatchFor<BelongsToOne>,
    itemAST: P.ASTTypeExpression,
    listAST: P.ASTTypeExpression
  ): P.ASTPatchedMember {
    const owner = new P.ASTScopedMethodInvocation(match, {
      thing: listAST,
      methodName: "ownerOf",
      args: [new P.ASTSelfLiteral(match)]
    })
    return new P.ASTPatchedMember(match, {
      member: new P.ASTPropertyDefinition(match, {
        type: itemAST,
        property: P.instanceCase(listAST.runtimeName),
        get: new P.ASTMethodDefinition(match, { body: new P.ASTReturnStatement(match, { value: owner }) })
      })
    })
  }
}
