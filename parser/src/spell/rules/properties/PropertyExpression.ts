import { lowerFirst, proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Wording } from "spell/parser/spell/rules/expressions"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { MemberReadExpression } from "./MemberReadExpression"
import { PossessiveProperty } from "./PossessiveProperty"

/**
 * `property_expression` rule:  `the {member words} of {thing}` ~== `thing.member`.
 * ONE rule for both kinds of read (epic page D5):
 * - RESOLVED:  the words name a PROPERTY the type of `thing` declares (or a super-type does),
 *   e.g. `the short rank of the card` -- several words, blacklisted ones too.
 *   - An enumerated property's values, e.g. `the suits of the card` as `cards have a suit as one of ...` declares,
 *     are its type's class variable, `Card.Suits`:  an instance has none.
 * - else AHEAD:  words a scan found the type declares further down, or in a later file,
 *   e.g. `the picked kind of the pokedex` in a file before the app's
 *   (`P.TypeScope.knowsPropertyAhead()`, epic `data` I44).
 * - else LOOSE:  ONE word nothing need declare, not on the identifier blacklist,
 *   e.g. `the is-set-up of it` -- as spell read every property before types.
 *   - We still note a METHOD of that name, for our datatype.
 *   - NOT with no article before it, a language's whose article is optional, when the word names a variable here:
 *     Spanish's `apuntar borrador de su guardián` gives `borrador` to `apuntar`,
 *     not a `borrador` of the keeper nothing declares (epic `language` T62).
 * - EACH ITEM'S, of a list of things, as a list:  `core.mapToList(deck, (card) => card.shorthand)` (epic `language` I155)
 *   - `the shorthand of each card in the deck` (a `where` too), or `of the cards in the deck`:
 *     words naming the items read theirs first, before the deck's own `shorthand`
 *   - else when the list has none:  `the names of the people`, a plural word reading the singular
 * - else NOT a property read:
 *   several undeclared words, e.g. `the first card of the deck` is the ordinal rule's.
 * - `Priority.preferred`:  a declared member beats a built-in rule reading the SAME words,
 *   e.g. a deck's `last card` beats the ordinal `the last card of`.
 *   - NOT `the position of`, `the number of` (`mostSpecific`), nor `the biggest of` (2), which say more:
 *     a type declaring `position` mustn't break `the position of x in the list`.
 * - ONE rule, not a resolved and a loose one, as `known_variable` / `variable` are:
 *   two would parse every `the X of Y`'s operand twice -- 6% of a project's parse (epic page judgement).
 * - `set` an undeclared one, on a type the project declares, and it's declared there --
 *   see `MemberReadExpression.memberRead()`.
 */
export class PropertyExpression extends MemberReadExpression<"property|each|arg|expression"> {
  @proto static priority = Priority.preferred

  /**
   * Resolve our words through the type of what follows `of`, while we can look it up --
   * else take ONE word, loose.  See class docs.
   */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { property, expression } = match.groups
    // `caja de recetas`:  a name of several words, not a `caja` of every recipe
    if ((expression.data as { isBare?: boolean }).isBare) return undefined
    const ownerType = (match.data.ownerType = scope.getType(expression.datatype))
    // `the shorthand of the cards in the deck`:  each card's, when its words name the items (epic `language` I155)
    const itemType = PropertyExpression.thingItemTypeOf(scope, expression)
    const namesItems = itemType && (!!match.groups.each || PropertyExpression.namesItems(expression))
    // `the shorthand of each card in ...`:  of a list of things, or not ours
    if (match.groups.each && !itemType) return undefined
    const resolved =
      (namesItems && this.resolveEach(match, itemType, property)) ||
      this.resolveMember(match, ownerType, `${property.raw}`) ||
      // `the names of the people`:  the list has none, its items do
      (!!itemType && this.resolveEach(match, itemType, property))
    if (!resolved) {
      // several words a scan found further down, or in a later file (epic `data` I44):  `the picked kind of the pokedex`
      const ahead = !!ownerType?.knowsPropertyAhead(`${property.raw}`)
      if (!ahead && !PropertyExpression.isLooseProperty(scope, property)) return undefined
      if (!ahead && PropertyExpression.isBareVariable(scope, tokens, property)) return undefined
      match.data.member = ownerType?.getMember(`${property.value}`)
      if (!match.data.member) MemberReadExpression.warnIfUndeclared(match, ownerType, property)
    }
    // `the name of the character's friend`, when the name of the character has a friend too
    PossessiveProperty.warnIfEitherReading(scope, tokens, match)
    return match
  }
  getAST(match: P.MatchFor<this>) {
    const { property, expression } = match.groups
    const list = P.asAST<P.ASTExpression>(expression.AST)
    const { eachItem } = match.data as EachItemData
    if (!eachItem) return this.getMemberAST(match, list, property)
    // `core.mapToList(this, (card) => card.shorthand)`
    const item = new P.ASTVariableExpression(match, { name: eachItem.name, variable: eachItem })
    const { member } = match.data
    const read =
      member instanceof P.ScopeVariable && !member.readAs && !member.output
        ? new P.ASTPropertyExpression(match, { object: item, property: member.name })
        : this.getMemberAST(match, item, property)
    const method = new P.ASTMethodDefinition(match, { inline: true, args: [item], body: read })
    return new P.ASTCoreMethodInvocation(match, { methodName: "mapToList", args: [list, method] })
  }
  /** Each item's member, as a list:  `list of texts` -- else what the member holds. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    const datatype = super.getDatatype(match)
    if (!(match.data as EachItemData).eachItem) return datatype
    return datatype ? P.listOf(datatype) : "list"
  }
  /** Each item's, `the shorthand of each card in the deck`:  items -- see `SpellExpression.saysItems`. */
  saysItemsOf(match: P.Match): boolean {
    return !!(match.data as EachItemData).eachItem
  }
  /** What follows our `of`. */
  ofObject(match: P.Match) {
    return (match as P.MatchFor<this>).groups.expression
  }

  /**
   * SIDE EFFECT:  notes the property `property` names on `itemType`, read off each item (`eachItem`), if it has one
   * -- the singular word first, `the shorthands of the cards` is each card's `shorthand`.
   * - Each item's VALUE, never an enumeration's values:  `the suit of the cards` is each card's suit, not `Card.Suits`.
   * - Or one a scan found further down (`knowsPropertyAhead()`), as for one thing.
   * - A lookup:  call it WHILE PARSING.
   */
  private resolveEach(match: P.MatchFor<this>, itemType: P.TypeScope, property: P.Match): boolean {
    const { scope } = match
    const words = `${property.raw}`
    const singular = SP.singularIn(scope, words)
    const found = [singular, words].find(
      (said) => MemberReadExpression.propertyOf(itemType, said) || itemType.knowsPropertyAhead(said)
    )
    if (!found) return false
    const data = match.data as EachItemData
    data.member = MemberReadExpression.propertyOf(itemType, found)
    data.enumerationOf = undefined
    data.ownerType = itemType
    data.eachItem = new P.ScopeVariable({ name: lowerFirst(itemType.name), datatype: itemType.name })
    return true
  }

  /**
   * The type of thing `list`'s items are, when it's a list of things:  `Card` for `the cards in the deck`.
   * - Never one thing's, nor a list of numbers or text:  `the length of the names` is the list's.
   */
  private static thingItemTypeOf(scope: P.Scope, list: P.Match): P.TypeScope | undefined {
    const listType = scope.getType(list.datatype)
    if (!listType?.isA("list") && !`${list.datatype ?? ""}`.startsWith("list")) return undefined
    const item = scope.getItemType(list.datatype)
    const itemType = typeof item === "string" ? scope.getType(item) : undefined
    return itemType?.isA("thing") ? itemType : undefined
  }

  /** Do `list`'s words name its ITEMS, `the cards in the deck`, so a member is theirs before the list's? */
  private static namesItems(list: P.Match): boolean {
    return list.rule.name === "list_items_in"
  }

  /** Is `property` a variable here, with no article before it:  Spanish's `borrador` in `borrador de g`? */
  private static isBareVariable(scope: P.Scope, tokens: P.Token[], property: P.Match): boolean {
    if (Wording.lengthAt(scope, "definite_article", tokens, 0) > 0) return false
    return !!scope.variables?.get(`${property.value}`)
  }

  /** Is `property`, a `member_words` match, ONE word the `property` rule takes:  lower case, not blacklisted? */
  private static isLooseProperty(scope: P.Scope, property: P.Match): boolean {
    return property.length === 1 && scope.getRuleOrDie("property").test(scope, property.tokens, 0) !== false
  }
}

/** What `property_expression` notes on its match, besides `MemberReadExpression`'s. */
type EachItemData = {
  /** Read off each item of the list, not the list:  the variable each one is, in `(card) => card.shorthand` */
  eachItem?: P.ScopeVariable
  member?: P.ScopeVariable | P.ScopeMethod
  enumerationOf?: string
  ownerType?: P.TypeScope
}
