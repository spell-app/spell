import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
import {
  InfixOperatorSuffix,
  Precedence,
  SuffixLeft,
  type SpellExpressionProps
} from "spell/parser/spell/rules/expressions"
import { placeholderData, placeholderValueIndex, type QuotedPropertyFormulaBits } from "./classes.shared"

/**
 * Calls a quoted property formula's generated method:
 * `is not? the queen of spades` => `card.is_the_$rank_of_$suits('queen', 'spades')`.
 * - Never registered as is:
 *   `quoted_property_formula` makes one per formula, with `QuotedPropertyRule.specialize({ output, ruleData })`.
 * - Reads ONLY its statics, so a project's declarations can rebuild it elsewhere -- see `P.Rule.specialize()`.
 */
export class QuotedPropertyRule extends InfixOperatorSuffix {
  @proto static importableAs = "quoted_property"
  /** A user's alias wins over a built-in suffix matching the same words, e.g. `is the queen of spades`. */
  @proto static priority = Priority.userDeclared
  @proto static precedence = Precedence.comparison

  /** Generated method to call, e.g. `is_the_$rank_of_$suits`. */
  declare methodName: string
  /** One entry per `(var)` placeholder -- see `QuotedPropertyFormulaBits`. */
  declare ruleData: QuotedPropertyFormulaBits["ruleData"]
  /** TYPE-ONLY: what `specialize()` accepts for this rule -- see `P.RuleStatics`. */
  declare readonly Props: QuotedPropertyRuleProps

  /** TYPE-ONLY: what `specialize()` takes -- see `P.SpecializeWith`. */
  declare static readonly SpecializeWith: {
    output: string
    values: Record<string, Array<string | number>>
    kinds?: Record<string, string>
    of?: string
    /** A sub-type's phrase:  the type whose STATIC method it calls, e.g. `Joker` -- see `staticArg`. */
    staticOf?: string
    /** Each placeholder's values by what they compile to, when that isn't themselves -- see `valueOutputs`. */
    valueOutputs?: Record<string, Record<string, string | number>>
  }
  /** The phrase's owner, e.g. `Card`, if known -- see `parse()`. */
  declare thisType: P.Datatype | undefined
  /**
   * A sub-type's phrase:  the type whose STATIC method it calls, given the thing first, e.g. `Joker`:
   * `the card is the red joker` => `Joker.isTheColorJoker(card, 'red')`, false for a card that's no joker.
   * - See `QuotedPropertyFormulaBits.staticArg`.
   */
  declare staticOf: string | undefined
  /**
   * Each placeholder's values, by what they compile to when that isn't themselves, e.g.
   * `{ direction: { abajo: "down", arriba: "up" } }`:  a built-in template's Spanish words for its English class's
   * values (epic `elemental-spell` Q71).
   */
  declare valueOutputs: Record<string, Record<string, string | number>> | undefined
  /**
   * Calls generated method `output`, e.g. `is_a_$suit` -- also our `ruleName`.
   * - `values`:  each `(var)` placeholder's enumerated values, in order, e.g. `{ suit: ["'clubs'", ...] }`.
   *   `ruleData` is worked out from them -- see `placeholderData()`.
   * - `kinds`:  a placeholder whose values aren't known yet, by its VALUE kind,
   *   e.g. `{ suit: "Suit" }` for a card above the deck declaring suits (epic page `outline-spell`, P3).
   *   Its `values` are `[]`, and `parse()` checks the word against the kind's values where the phrase is USED:
   *   see `kindValue()`.
   * - What a project's `SPELL: DECLARES` comment holds for us -- see `SP.SpellDeclarations`.
   */
  static specialize<T extends AbstractClass<P.Rule>>(this: T, declared: P.SpecializeWith<T>): T {
    const { output, values, kinds, of, staticOf, valueOutputs } =
      declared as (typeof QuotedPropertyRule)["SpecializeWith"]
    const ruleData = Object.entries(values).map(([instanceVar, varValues]) =>
      placeholderData(instanceVar, varValues, kinds?.[instanceVar])
    )
    const statics: P.RuleStatics<QuotedPropertyRule> = {
      ruleName: output,
      methodName: output,
      ruleData,
      thisType: of,
      staticOf,
      valueOutputs
    }
    return super.specialize(statics, declared) as unknown as T
  }

  /** What we write into our statement's `SPELL: DECLARES` comment -- see `P.Rule.declarationProps()`. */
  static declarationProps(
    { output, values, kinds, staticOf, valueOutputs }: (typeof QuotedPropertyRule)["SpecializeWith"],
    syntax: string | undefined
  ) {
    return {
      syntax,
      output,
      values,
      ...(kinds ? { kinds } : {}),
      ...(staticOf ? { staticOf } : {}),
      ...(valueOutputs ? { valueOutputs } : {})
    }
  }

  /**
   * Match -- and for a placeholder of a value kind (see `specialize()`),
   * only a word which is one of the kind's values, e.g. `spade` for `(suit)`.
   * - Noted as `data.kindArgs`, for `compileASTExpression()`.
   * - A lookup WHERE THE PHRASE IS USED, e.g. `if the card is a spade`:  by then the kind's list is known.
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    // not on a thing KNOWN to be another type's, e.g. `the game is red` with a card's `is (color)` -- see `SuffixLeft`
    if (!SuffixLeft.couldBeA(scope, this.thisType)) return undefined
    const match = super.parse(scope, tokens)
    if (!match || !this.ruleData.some((data) => data.kind)) return match
    const found = (match.groups as { expression?: P.Match | P.Match[] }).expression
    const args = Array.isArray(found) ? found : found ? [found] : []
    const kindArgs = this.ruleData.map((data, index) =>
      data.kind ? QuotedPropertyRule.kindValue(scope, data, args[index]) : undefined
    )
    if (this.ruleData.some((data, index) => data.kind && kindArgs[index] === undefined)) return undefined
    ;(match.data as QuotedPropertyRuleData).kindArgs = kindArgs
    return match
  }

  /**
   * The value of placeholder `data`'s kind that `arg` says, as compiled, e.g. `'spades'` for `spade`.
   * - `undefined` if it's none of them, or the kind isn't known.
   */
  private static kindValue(
    scope: P.Scope,
    data: QuotedPropertyFormulaBits["ruleData"][number],
    arg: P.Match | undefined
  ): string | number | undefined {
    const values = scope.types?.get(data.kind!)?.valueKind?.values
    if (!values || !arg) return undefined
    // by its singular or plural, e.g. `club` or `clubs` for `(suit)`
    const index = placeholderValueIndex(values, arg.value as string | number)
    return index === -1 ? undefined : values[index]
  }

  /** Map each matched placeholder word/number to its compiled enumeration value or literal. */
  compileASTExpression(
    match: P.Match,
    { lhs, rhs }: { lhs?: P.ASTExpression; rhs?: unknown }
  ): P.ASTScopedMethodInvocation {
    // `rhs` is the raw `P.Match[]` here, not resolved to an `Expression`:
    // - this generated rule's syntax repeats the `expression` group name, once per `$var` in the quoted alias
    // - each of those groups matches a plain keyword literal, with no `getAST()`
    // - so the shunting-yard algorithm's `compile()` helper (`CompoundExpression`, in `expressions/`) leaves it as is
    // Neither shape (`P.Match`, `P.Match[]`) fits `OperatorOperands`, which assumes ONE already-resolved `Expression`.
    const rhsMatches = (Array.isArray(rhs) ? rhs : [rhs]) as P.Match[]
    const { kindArgs } = match.data as QuotedPropertyRuleData
    const args = rhsMatches
      .map((arg, index) => {
        // a value kind's placeholder:  its value, found by `parse()`
        const kindArg = kindArgs?.[index]
        if (typeof kindArg === "number") return new P.ASTNumericLiteral(arg, { value: kindArg })
        if (kindArg !== undefined) {
          return new P.ASTConstantExpression(arg, { name: `${arg.value}`, value: P.spellValueOf(kindArg) })
        }
        if (typeof arg.value === "string") {
          // the word said, singular or plural (`club`, `clubs`), to its value:
          // `values` are `clubs`, `spades`, etc -- quoted (`'clubs'`) in older declarations
          const { values, instanceVar } = this.ruleData[index]!
          const valueIndex = placeholderValueIndex(values, arg.value)
          // not one of its values:  the word as said (it was the text `arg.value`, a typo)
          const said = valueIndex !== -1 ? P.spellValueOf(values[valueIndex]!) : arg.value
          // what it compiles to, if not itself:  a built-in template's Spanish `abajo` is its `down`
          const output = this.valueOutputs?.[instanceVar]?.[`${said}`]
          return new P.ASTConstantExpression(arg, { name: arg.value, value: output ?? said })
        }
        if (typeof arg.value === "number") {
          return new P.ASTNumericLiteral(arg, {
            value: arg.value
          })
        }
        console.warn("quoted_property_formula: don't understand arg", arg)
        return undefined
      })
      .filter((arg): arg is P.ASTConstantExpression | P.ASTNumericLiteral => Boolean(arg))
    // a sub-type's phrase:  `Joker.isTheColorJoker(card, 'red')` -- see `staticOf`
    if (this.staticOf) {
      const thing = new P.ASTTypeExpression(match, { name: this.staticOf })
      return new P.ASTScopedMethodInvocation(match, { thing, methodName: this.methodName, args: [lhs!, ...args] })
    }
    return new P.ASTScopedMethodInvocation(match, {
      thing: lhs!,
      methodName: this.methodName,
      args
    })
  }
}

/** What `QuotedPropertyRule` stashes on its match:  each value-kind placeholder's value, by placeholder. */
type QuotedPropertyRuleData = { kindArgs?: Array<string | number | undefined> }

/** Props bag accepted by `QuotedPropertyRule` -- the generated method, and how to map each placeholder. */
type QuotedPropertyRuleProps = Prettify<
  SpellExpressionProps & {
    methodName: string
    ruleData: QuotedPropertyFormulaBits["ruleData"]
    thisType?: P.Datatype
    staticOf?: string
    valueOutputs?: Record<string, Record<string, string | number>>
  }
>
