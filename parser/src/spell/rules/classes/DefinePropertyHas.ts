import { proto, upperFirst, type PropRule } from "spell/util"
import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
import { Priority } from "spell-parser/spell/rules/rules.types"
import { SubjectIts } from "spell-parser/spell/rules/types"
// Through the folder, not its own file:  importing its file would load it first,
// but `outline_specifier_enum` registers AFTER us, and the registration order must not change.
// Read only when called, once the folder has loaded.
import {
  MustRule,
  OutlineSpecifierEnum,
  OutlineSpecifierList,
  PropertyBodyMust,
  QuotedPropertyFormula,
  TypeSpecifierTextKind
} from "spell-parser/spell/rules/classes"
import { QuotedTypeExpression } from "spell-parser/spell/rules/methods"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

/**
 * What may follow a property's declaration:  its RULES -- see `DefinePropertyHas.rulesOf()` (epic `property-editor` P9).
 * - one on its line:  `, which must not be empty`
 * - an indented body of them:  `- it must not be empty`
 */
export const RULES = "(,? which must {rule:must_rule})? {nested_statements}?"

/**
 * `define_property_has` rule:  declares an instance property on `type`,
 * optionally constrained/initialized by a `type_specifier`.
 * - e.g. `a card has a suit as one of clubs, diamonds, hearts, spades`
 * - e.g. `todos have a title as text`
 * - `Priority.declaration`, so this wins over other `{type} has|have ...` -ish statement rules.
 * - SIDE EFFECT: stubs `type` into `scope.types` if not yet declared -- see `P.TypeScope.getOrStub()`.
 * - SIDE EFFECT: when `specifier` is an enumeration, also:
 *   - adds a pluralized class variable holding the raw values, e.g. `Suits`, which `card suits` reads
 *     through `class_member` -- and its instance twin, so `the suits of the card` finds it
 *   - adds string values to `scope.constants`
 * - Its name is `member_words`, e.g. `a card has short rank as text`;  the article is optional.
 * - With no type, e.g. `a calculator has an input`, it asks for one:  a warning -- see `warnUntyped()`.
 * - Compiles to a reactive getter / setter pair in its class, its type declared in the class's schema:
 *   see `P.ASTReactiveProperty`.
 *   - e.g. `a player has a name as text` =>
 *     - `static { this.declareProp("name", { type: "text" }) }`
 *     - `get name() { return this.getProp("name") }`
 *     - `set name(value) { this.setProp("name", value) }`
 * - An enumeration's values also go on the class, e.g. `static Suits = ["clubs", ...]` -- see `class_member`.
 * - Its RULES, what its value must be (epic `property-editor` P9):
 *   - on its line:  `, which must ...`
 *   - indented under it:  `- it must ...` (`property_body_must`)
 *   - Both say a `must_rule`;  and `as a url` / `as an email` brings one.
 *   - They go in its declaration, `{ type: "text", rules: [{ type: "empty" }] }`,
 *     and on its record, for its declarations (`P.TypeScope.addPropertyRules()`).
 *   - A rule on a line of its own, `- its title must ...`, is `property_must`'s.
 */
export class DefinePropertyHas extends SpellStatement<
  "type|property|specifier?|rule?|body?",
  { valueType?: P.TypeScope; builtInName?: string }
> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"
  @proto static declares: P.DeclaresSpec = { kind: "property", name: "property", of: "type", detail: "specifier" }

  /**
   * Refused on a built-in type -- see `SpellStatement.refuseBuiltInType()`.
   * - A built-in member a type may declare again, e.g. a list's `name`, in the language's own words
   *   (`nombre`):  notes the member's name, `data.builtInName`, which it declares and compiles to.
   * - Notes the type its specifier names, e.g. `Suit` for `its "suit" is a suit`:
   *   if it's a VALUE kind, its setter checks against its list -- see `value_kind`.
   *   - The type's RECORD, read when compiling, as a call reads `data.method.returns`.
   *   - Why:  a value kind may be declared further down, e.g. the deck below the card,
   *     so here it's still a stub (epic page `outline-spell`, issue I3).
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { specifier } = match.groups
    const valueType = specifier?.datatype ? scope.types?.get(specifier.datatype) : undefined
    if (valueType) match.data.valueType = valueType
    DefinePropertyHas.warnUntyped(match)
    const { type, property } = match.groups
    const refused = SpellStatement.refuseBuiltInType(match, type, property, specifier?.datatype)
    if (refused !== match) return refused
    // a built-in member in the language's own words, e.g. Spanish's `una pila tiene un nombre como texto`:
    // it declares the member, `name`, not a property of its own
    const builtIn = SP.builtInStoredMember(scope.types?.get(`${type.value}`), `${property.value}`)
    if (builtIn && builtIn.name !== property.value) match.data.builtInName = builtIn.name
    return match
  }

  /** Name of the property `match` declares, as it compiles:  its words', or the built-in member's it names. */
  static propertyName(match: P.MatchFor<DefinePropertyHas>): string {
    return match.data.builtInName ?? `${match.groups.property.value}`
  }

  /**
   * Ask for a type it doesn't say (epic `output-targets`, Q24):  a warning, the property compiles as it is.
   * - none at all, e.g. `a calculator has an input` => `Say what "input" is, e.g. "a calculator has an input as text"`
   * - a list of nothing said, e.g. `a todos-app has tasks as a new list` =>
   *   `Say what "tasks" holds, e.g. "a todos-app has tasks as a new list of tasks"`
   * - NOT an enumeration (`as one of ...`), a type, a new thing, or a list of something:  they say.
   */
  private static warnUntyped(match: P.MatchFor<DefinePropertyHas>): void {
    const { property, specifier } = match.groups
    const words = property.raw ?? `${property.value}`
    const said = match.inputText.trim()
    const language = SP.Language.of(match.scope)
    if (!specifier) {
      const type = SP.SpellWarnings.exampleType(match.scope, words)
      SP.SpellWarnings.note(match, language.parserMessage("untyped-property", { name: words, line: said, type }))
    } else if (specifier.datatype === "list") {
      const items = SP.SpellWarnings.exampleItemType(match.scope, words)
      // the line up to its specifier:  `a todos-app has tasks`
      const line = said.slice(0, said.length - specifier.inputText.trim().length).trimEnd()
      SP.SpellWarnings.note(match, language.parserMessage("untyped-list-property", { name: words, line, items }))
    }
  }

  /**
   * SIDE EFFECT:  declares the KIND of an enumerated property's values (epic `spanish` P22),
   * e.g. `card suit` for a card's `its "suit" is one of clubs, diamonds, hearts or spades`.
   * - Named in the language's word order (`SP.Language.propertyKindName()`):  `card suit`, `palo de carta`.
   * - So another type can say `its "suit" is a card suit`:  one of the card's suits, `Card.Suits`.
   *   And `card suits` / `every card suit` is that list, `a random card suit` one of it.
   * - A `P.TypeScope` with a `valueKind` naming its `property`:  no class of its own, so nothing compiles for it,
   *   and the project neither exports it nor writes it in its declarations (`P.ValueKind.property`).
   * - Claims a stub of it:  a mention above, or the pre-pass's (`SpellParser.declaredTypes()`).
   * - A type declared with that name keeps it, e.g. `a card suit is a thing`:  no kind then.
   * - Returns its name, e.g. `CardSuit` -- `undefined` when another type has it.
   */
  private static declareKind(
    match: P.Match,
    typeScope: P.TypeScope,
    values: Array<string | number>,
    listName: string,
    property: { name: string; written: string }
  ): string | undefined {
    const { scope } = match
    const language = SP.Language.of(scope)
    const name = language.propertyKindType(typeScope.name, property.written)
    const valueKind = { values, listOn: typeScope.name, listName, property: property.name }
    const existing = scope.types?.get(name)
    if (!existing) scope.types?.add({ name, valueKind, declaredBy: match })
    // a stub, or ours from an earlier parse of this statement -- see `P.TypeScope.sameStatement()`
    else if (existing.stub || P.TypeScope.sameStatement(existing.declaredBy, match)) {
      existing.claim(match, undefined, { valueKind })
    } else if (existing.declaredBy !== match) return undefined
    return name
  }

  mutateScope(match: P.MatchFor<this>) {
    const { scope } = match
    const { type, property, specifier } = match.groups
    const specifierAST = specifier?.AST

    const typeName = type.value
    const typeScope = P.TypeScope.getOrStub(scope, typeName, match)
    // what its specifier says it holds, e.g. `text`, `choice`, `thing` for `as a new thing`
    const name = DefinePropertyHas.propertyName(match)
    typeScope.declareProperty(name, match, { asWritten: property.raw, datatype: specifier?.datatype })
    const rule = match.groups.rule as P.MatchFor<MustRule> | undefined
    if (rule) typeScope.addPropertyRules(name, [MustRule.ruleOf(rule)], match)

    // If there is a specifier as enumerated values, add rules to match it
    if (specifierAST instanceof P.ASTEnumeration) {
      DefinePropertyHas.declareEnumeration(
        match,
        typeScope,
        { name, written: `${property.raw ?? property.value}` },
        specifierAST.values
      )
    }
  }

  /**
   * SIDE EFFECT:  declares a property's own list of values on `typeScope`, e.g. a card's `one of clubs, diamonds ...`:
   * - its class variable, by the property's name made plural (`Suits`), and its instance twin -- `card suits`,
   *   `the suits of the card`
   * - the kind of its values, e.g. `card suit` -- see `declareKind()`
   * - each text value as a constant, so `it is clubs` reads it
   * - Shared with `property_value_getter`'s worked-out value from its own list, `- its "color" is one of red, black:`
   *   (epic `elemental-spell` P5).
   */
  static declareEnumeration(
    match: P.Match,
    typeScope: P.TypeScope,
    property: { name: string; written: string },
    values: Array<string | number>
  ): void {
    const { scope } = match
    const groupName = P.pluralize(upperFirst(property.name))
    // the kind of its values, e.g. `card suit`:  its list is a list of them, so a loop over it knows each is one
    const kind = DefinePropertyHas.declareKind(match, typeScope, values, groupName, property)
    const varProps: P.ScopeVariableProps & { enumeration: Array<string | number> } = {
      name: groupName,
      datatype: kind && P.listOfType(kind),
      enumeration: values,
      initializer: P.enumerationInitializer(values),
      declaredBy: match
    }
    // Add variables to scope for lookup elsewhere
    typeScope.classVariables.add({ ...varProps })
    typeScope.variables.add({ ...varProps })

    // Add enumeration string values to scope as constants.
    values.forEach((value) => {
      if (typeof value === "string") scope.constants?.add({ name: value, declaredBy: match })
    })
  }

  /**
   * The scope of our body, the rules indented under us:  a `P.SubjectScope` declared by us, so its lines find us.
   * - `it` there is our property, not the type (`property_body_must`).
   */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.SubjectScope {
    return new P.SubjectScope({ parentScope: match.scope, subject: `${match.groups.type.value}`, declaredBy: match })
  }

  /**
   * SIDE EFFECT:  once our body has parsed, our property records every rule we say, its own line's and its body's.
   * - Returns them, as text, so an edit changing them re-parses what follows.
   */
  mutateScopeFromBody(match: P.Match): string | undefined {
    DefinePropertyHas.warnAboutOtherLines(match as P.MatchFor<DefinePropertyHas>)
    const rules = DefinePropertyHas.rulesOf(match as P.MatchFor<DefinePropertyHas>)
    if (!rules.length) return undefined
    const { type } = (match as P.MatchFor<DefinePropertyHas>).groups
    const name = DefinePropertyHas.propertyName(match as P.MatchFor<DefinePropertyHas>)
    P.TypeScope.getOrStub(match.scope, `${type.value}`, match).addPropertyRules(name, rules, match)
    return JSON.stringify(rules)
  }

  /**
   * The statements of `match`'s body, one per line that has one:  its rules (`- it must ...`), its aliases
   * (`- it "is a (suit)"`) and anything else written there.
   */
  static bodyStatementsOf(match: P.MatchFor<DefinePropertyHas>): P.Match[] {
    const lines = (match.rule as DefinePropertyHas).getBody(match)?.matched ?? []
    return lines.flatMap((line) => {
      const statement = line instanceof P.Match ? (line.data as { statement?: P.Match }).statement : undefined
      return statement ? [statement] : []
    })
  }

  /**
   * Is `statement` one a property's body is for:  one of its rules, or one of its aliases (epic `elemental-spell` Q13)?
   * - e.g. under `- its "suit" is one of clubs, ...`:  `- it must not be empty`, `- it "is a (suit)"`
   */
  static isPropertyBodyStatement(statement: P.Match): boolean {
    return statement.is(PropertyBodyMust) || statement.is(QuotedPropertyFormula) || statement.is(QuotedTypeExpression)
  }

  /**
   * SIDE EFFECT:  warns about each line under a property that is neither one of its rules nor one of its aliases,
   * e.g. a `- to turn it over:` indented by mistake:  it still compiles, as if it were written after the property.
   */
  private static warnAboutOtherLines(match: P.MatchFor<DefinePropertyHas>): void {
    const language = SP.Language.of(match.scope)
    for (const statement of DefinePropertyHas.bodyStatementsOf(match)) {
      if (DefinePropertyHas.isPropertyBodyStatement(statement)) continue
      SP.SpellWarnings.note(statement, language.parserMessage("not-a-property-body-line"))
    }
  }

  /**
   * Every rule `match` says, in order:  its line's (`, which must ...`), then its body's (`- it must ...`).
   * - Reads ONLY matches:  pure, for `getAST()` too.
   */
  static rulesOf(match: P.MatchFor<DefinePropertyHas>): PropRule[] {
    const rules: PropRule[] = []
    const { rule, specifier } = match.groups
    // `as a url` / `as an email`:  text that must be one
    if (specifier?.is(TypeSpecifierTextKind)) rules.push(TypeSpecifierTextKind.ruleOf(specifier))
    if (rule) rules.push(MustRule.ruleOf(rule as P.MatchFor<MustRule>))
    for (const statement of DefinePropertyHas.bodyStatementsOf(match)) {
      if (statement.is(PropertyBodyMust)) rules.push(MustRule.ruleOf(statement.groups.rule as P.MatchFor<MustRule>))
    }
    return rules
  }

  /**
   * The long form of an outline line -- see `SpellStatement.getLongForm()`:
   * - `its "rank" is a number` => `a card has a rank as a number`
   * - `its direction is up or down` => `a card has a direction as one of up or down`
   * - `its "people" is a list of people` => `a friend-list has a people as a new list of people`
   * - the same with the subject left out (epic page `outline-spell`, P8):  `"rank" is a number`
   */
  getLongForm(match: P.Match): string | undefined {
    const params = SpellStatement.longFormParams(match)
    const { type, property, specifier } = match.groups as { type: P.Match; property: P.Match; specifier?: P.Match }
    // `its "rank" is ...`, or `"rank" is ...`:  NOT `it has ...` / `has ...`, which say it as the sentence style does
    const isItsForm = type.is(SubjectIts) || (!type.length && property.start === match.start)
    if (!params || !isItsForm) return super.getLongForm(match)
    const language = SP.Language.of(match.scope)
    const propertyWords = `${property.raw}`
    const has = { ...params, property: propertyWords, aProperty: language.withArticle("indefinite", propertyWords) }
    const said = specifier?.inputText.trim()
    if (!said) return language.parserMessage("long-form-has", has)
    // an enumeration with no `either` / `one of`:  no words before its list
    if (specifier!.is(OutlineSpecifierEnum) && (specifier.groups.enumeration as P.Match).start === specifier.start) {
      return language.parserMessage("long-form-has-one-of", { ...has, values: said })
    }
    // `a list of people`, which a sentence says `as a new list of people`
    if (specifier!.is(OutlineSpecifierList)) {
      const items = `${(specifier.groups.instanceType as P.Match).raw}`
      return language.parserMessage("long-form-has-list", { ...has, items })
    }
    return language.parserMessage("long-form-has-as", { ...has, specifier: said })
  }

  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    const { type, property } = match.groups
    const typeAST = P.matchAST<P.ASTTypeExpression>(type)
    const statements: NonNullable<P.ASTStatementGroup["statements"]> = []
    // what its setter warns about -- see `SC.PropCheck`
    const check = new P.ASTObjectLiteral(match)
    let initializer: P.ASTExpression | undefined

    const specifier = match.groups.specifier?.AST
    // Enumerated values as strings/numbers/etc, as a static on the class, e.g. `Card.Suits`
    if (specifier instanceof P.ASTEnumeration) {
      const name = P.pluralize(upperFirst(property.value))
      statements.push(new P.ASTStaticDefinition(match, { type: typeAST, name, value: specifier }))
      check.addProp("oneOf", new P.ASTPropertyExpression(match, { object: typeAST, property: name }))
    }
    // instance specifier:  a default, made once per instance -- a list's says what it holds, for saving
    else if (specifier instanceof P.ASTNewInstanceExpression) {
      initializer = specifier
      const itemType = DefinePropertyHas.itemTypeOf(specifier)
      if (itemType) check.addProp("itemType", itemType)
    }
    // a value kind, e.g. `a suit`:  one of its list, e.g. `Deck.Suits` -- its values are plain text.  Read when set:
    // the list's class names ours (`static instanceType = Card`), so one of the two is defined second
    else if (match.data.valueType?.valueKind) {
      const { listOn, listName } = match.data.valueType.valueKind
      const list = new P.ASTPropertyExpression(match, {
        object: new P.ASTTypeExpression(match, { name: listOn }),
        property: listName
      })
      check.addProp("oneOf", new P.ASTMethodDefinition(match, { inline: true, body: list }))
    }
    // type
    else if (specifier) {
      // Only `type_specifier_datatype`/`type_specifier_yes_or_no` can produce a `specifier` that reaches here,
      // both of which return a `TypeExpression`.
      // Not statically provable:  `type_specifier`'s `getAST()` can only be typed as returning `ASTNode` in general.
      const typeExpression = specifier as P.ASTTypeExpression
      // a type's name as text, so a writer can read the type:  `P.TSWriter` types the property from it.
      // Checked at runtime by its class's name:  see `P.ASTTypeExpression.runtimeName`.
      check.addProp("type", new P.ASTTypeNameLiteral(match, { value: typeExpression.runtimeName, quote: "'" }))
    }
    // its rules, what its value must be (epic `property-editor` P9)
    const rules = DefinePropertyHas.rulesOf(match)
    if (rules.length) {
      const items = rules.map((rule) => MustRule.astOf(match, rule))
      check.addProp("rules", new P.ASTArrayLiteral(match, { items }))
    }

    statements.push(
      new P.ASTReactiveProperty(match, {
        type: typeAST,
        property: DefinePropertyHas.propertyName(match),
        check: check.properties.length ? check : undefined,
        initializer
      })
    )
    // what its body says besides its rules, e.g. its aliases (epic `elemental-spell` Q13):  compiled after it,
    // as if written after its line
    for (const line of (this.getBody(match)?.matched ?? []) as P.Match[]) {
      const statement = (line.data as { statement?: P.Match }).statement
      if (statement?.is(PropertyBodyMust)) continue
      const ast = line.AST
      if (ast) statements.push(ast as P.ASTStatement)
    }
    return new P.ASTStatementGroup(match, { statements })
  }

  /**
   * What a new list holds, as its schema says it:  `'Task'` for `new List({ instanceType: "Task" })`.
   * - So saving knows a list of people holds people, before it holds any (epic `people-and-orgs`, P1).
   * - `undefined` for a new thing, or a list that doesn't say.
   */
  private static itemTypeOf(made: P.ASTNewInstanceExpression): P.ASTStringLiteral | undefined {
    if (made.type.name !== "List") return undefined
    const said = made.props?.properties.find(
      (it): it is P.ASTObjectLiteralProperty =>
        it instanceof P.ASTObjectLiteralProperty && it.property.value === "instanceType"
    )?.value
    if (!(said instanceof P.ASTStringLiteral)) return undefined
    return new P.ASTStringLiteral(said.match, { value: said.value, quote: "'" })
  }
}
