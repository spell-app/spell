import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
import { Priority } from "spell-parser/spell/rules/rules.types"
import { getKnownType } from "spell-parser/spell/rules/types"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"
import { type MethodBody } from "./classes.shared"

/** The words for a literal's type, by its rule, e.g. `a number` for `0` -- see `warnIfAlwaysTheSame()`. */
/** The type a getter's literal value says, by its rule, as its language's message writes it:  `a number` ... */
const LITERAL_TYPES: Record<string, SP.ParserMessageKey> = {
  number: "example-number",
  text: "example-text",
  boolean: "example-yes-or-no"
}

/**
 * `property_value_getter` rule:  `the value of a card is:` -- defines a property getter whose body is an inline
 * EXPRESSION or nested block (`{expression_body}?`), with `its`/`it` mapped to `this` inside.
 * - `getNestedScopeForMatch()` maps `it`/`its` to `this` via `mapItTo`, so the body can say
 *   `return the first word of the name` instead of repeating `of the card`.
 * - Compiles to a getter in its class running the parsed body, e.g.
 *   `the value of a card is its name` => `get value() { return this.name }`.
 */
export class PropertyValueGetter extends SpellStatement<
  "property|type|body?",
  { valueKind?: boolean; inheritedType?: string }
> {
  @proto static alias = "statement"
  @proto static declares: P.DeclaresSpec = { kind: "property", name: "property", of: "type" }

  /**
   * Refused on a built-in type -- see `SpellStatement.refuseBuiltInType()`.
   * - Notes whether its type is a VALUE kind, e.g. `the "color" of a suit is: ...` -- see `value_kind`.
   * - With its subject left out, in a type's outline body (`- score is its rank * 2`), it's a declaration:
   *   it outranks setting a variable, `score is ...` (epic page `outline-spell`, P9).
   * - In an outline body, a body that's just a value warns -- see `warnIfAlwaysTheSame()`.
   * - A super-type's property it gives a value, e.g. a tableau's `- its layout is vertical` for a pile's `layout`:
   *   the getter has that property's type, so TypeScript takes it as the same property (epic `outline-spell` P27).
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    if (getKnownType(match.groups.type).valueKind) match.data.valueKind = true
    // ... once its body parsed:  `- color is red if ... otherwise it is black` is `property_value_either`'s
    const bodyParsed = !!this.getBody(match) || match.length === tokens.length
    if (!match.groups.type.length && bodyParsed) match.priority = Priority.declaration
    match.data.inheritedType = PropertyValueGetter.inheritedTypeOf(match)
    this.warnIfAlwaysTheSame(match)
    return SpellStatement.refuseBuiltInType(match, match.groups.type, match.groups.property)
  }

  /**
   * The datatype of the super-type's property we give a value -- `undefined` if none declares it.
   * - Its own, e.g. `number`;  else, for one of a list (`- its "layout" is one of stacked or vertical`),
   *   the kind of its values, e.g. `PileLayout` -- see `DefinePropertyHas.declareKind()`.
   */
  private static inheritedTypeOf(match: P.MatchFor<PropertyValueGetter>): string | undefined {
    const { superType } = getKnownType(match.groups.type)
    const words = `${match.groups.property.value}`
    const owner = superType
      ? match.scope
          .getType(superType)
          ?.chain()
          .find((type) => type.variables.get(words, "LOCAL_ONLY"))
      : undefined
    const member = owner?.variables.get(words, "LOCAL_ONLY")
    if (!owner || !member) return undefined
    if (typeof member.datatype === "string") return member.datatype
    const kind = SP.Language.of(match.scope).propertyKindType(owner.name, `${member.name}`)
    return match.scope.getType(kind)?.valueKind?.property ? kind : undefined
  }

  /**
   * SIDE EFFECT:  warns when an outline body's getter is just a value, e.g. `- score is 0`:
   * always 0, never the score of the thing -- most likely meant as a type, `- score is a number`.
   * - Only in an outline body (`it` / `its` / no subject), where a property's line looks the same either way.
   * - Not when a super-type declares it already:  `- droppable is no` in a stock pile's body is a stock pile's
   *   value for a pile's `droppable` (epic page `outline-spell`, P26).
   */
  private warnIfAlwaysTheSame(match: P.MatchFor<this>): void {
    const body = this.getBody(match)
    const literalType = LITERAL_TYPES[`${body?.rule.name}`]
    if (!body || !literalType || !SpellStatement.subjectWords(match)) return
    const name = match.groups.property.raw
    const { superType } = getKnownType(match.groups.type)
    if (superType && match.scope.getType(superType)?.getMember(`${match.groups.property.value}`)) return
    const language = SP.Language.of(match.scope)
    const type = language.parserMessage(literalType)
    SP.SpellWarnings.note(
      match,
      language.parserMessage("always-the-same", { name: `${name}`, value: body.inputText.trim(), type })
    )
  }

  /**
   * SIDE EFFECT:  records the property on its type -- see `P.TypeScope.declareProperty()`.
   * - Later lines read it, e.g. `the value of the card`'s datatype:
   *   so editing a getter's line re-parses what follows (epic page D9).
   * - An edit to its indented body does only if what it returns changes -- see `mutateScopeFromBody()`.
   * - A value kind's property reads as a call of its static method, e.g. `Suit.color({it})`:  its `readAs`.
   */
  mutateScope(match: P.MatchFor<this>) {
    const { type, property } = match.groups
    const typeScope = getKnownType(type)
    // a value kind's is its static method, which `readAs` reads;  anything else's, a getter
    const readAs = match.data.valueKind ? `${typeScope.name}.${property.value}({it})` : undefined
    typeScope.declareProperty(`${property.value}`, match, { asWritten: property.raw, readAs })
  }

  /**
   * SIDE EFFECT:  now our body has parsed, what it returns is the property's `datatype` --
   * if we declared it, and nothing gave it one first, e.g. `a card has a value as number`.
   * - See `getReturnedDatatype()`.
   * - Journaled.  Returns it, so `BlockLine.reparseBody()` can tell when an edit changes it.
   */
  mutateScopeFromBody(match: P.MatchFor<this>): string | undefined {
    const { type, property } = match.groups
    const datatype = this.getReturnedDatatype(match)
    const variable = getKnownType(type).variables.get(`${property.value}`, "LOCAL_ONLY")
    // ours:  noted on our match, or the match we're a re-bodied clone of -- see `P.ScopeList.noteDeclared()`
    const declared = (match.data as { declared?: unknown[] }).declared
    const isOurs =
      !!declared && (variable?.declaredBy?.data as { declared?: unknown[] } | undefined)?.declared === declared
    if (datatype && variable && isOurs && !variable.datatype) {
      P.ParseJournal.assign(match.scope.parser?.journal, variable, { datatype })
    }
    return datatype
  }
  /**
   * Nested scope for the getter body -- maps `its`/`it` to `this` so the body can say `its name`.
   * - A value kind's:  `it` / `the suit` are its argument, the value, e.g. `static color(suit)`.
   */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const { type } = match.groups
    const typeScope = getKnownType(type)
    const datatype = SP.typeName(typeScope.name)
    if (match.data.valueKind) {
      return new P.MethodScope({
        parentScope: match.scope,
        args: [{ name: typeScope.instanceName, datatype }],
        mapItTo: typeScope.instanceName,
        itDatatype: datatype,
        declaredBy: match
      })
    }
    return new P.MethodScope({
      parentScope: match.scope,
      thisVar: typeScope.instanceName,
      mapItTo: "this",
      itDatatype: SP.typeName(typeScope.name),
      declaredBy: match
    })
  }
  getAST(match: P.MatchFor<this>): P.ASTPropertyDefinition | P.ASTStaticMethod {
    const { type, property } = match.groups
    if (match.data.valueKind) {
      const typeAST = P.matchAST<P.ASTTypeExpression>(type)
      const value = new P.ASTVariableExpression(match, { name: P.instanceCase(typeAST.name) })
      return new P.ASTStaticMethod(match, {
        type: typeAST,
        name: `${property.value}`,
        method: new P.ASTMethodDefinition(match, { args: [value], body: P.matchAST<MethodBody>(this.getBody(match)) })
      })
    }
    return new P.ASTPropertyDefinition(match, {
      type: P.matchAST<P.ASTTypeExpression>(type),
      property: P.matchAST<P.ASTPropertyLiteral>(property),
      get: new P.ASTMethodDefinition(match, {
        body: P.matchAST<MethodBody>(this.getBody(match)),
        datatype: match.data.inheritedType
      })
    })
  }
}
