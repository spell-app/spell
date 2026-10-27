/**
 * The `math` rules in Spanish (epic `spanish`):
 * each rule's syntax and its tests, registered on Spanish's own `math` parser.
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `math.en.ts`:  a tie between two rules goes to the first.
 * - Its tests compile to the same javascript as English's:  the same program, said in Spanish.
 * - A keyword with a written accent is accepted without it too:  `(más|mas)`, `(pequeño|pequeno)`.
 */
import { P } from "spell/parser/parser"
import { SpellParser } from "spell/parser/spell/SpellParser"
import { Wording } from "spell/parser/spell/rules/expressions"

import { AbsoluteValue } from "./AbsoluteValue"
import { DividedBy } from "./DividedBy"
import { GtLt } from "./GtLt"
import { IsGtLt } from "./IsGtLt"
import { Max } from "./Max"
import { Min } from "./Min"
import { Minus } from "./Minus"
import { Plus } from "./Plus"
import { RoundNumber } from "./RoundNumber"
import { Times } from "./Times"

/** Spanish's `math` rules. */
export const mathEs = new SpellParser({ module: "math" })

////////////////
// ## Word rules:  Spanish's words for each of English's, under the same names and meanings
////////////////

// Which comparison, for `is_gt_lt`:  `salary es mayor o igual que expenses` means `at_least`;
// `o igual a` and `que o igual a` are accepted too
mathEs.addRule(
  Wording.specialize({ ruleName: "is_greater_or_less_than", meanings: ["greater", "less", "at_least", "at_most"] }),
  {
    syntax:
      "((greater:es mayor que)|(less:es menor que)" +
      "|(at_least:es mayor o igual (que|a)|es mayor que o igual (que|a))" +
      "|(at_most:es menor o igual (que|a)|es menor que o igual (que|a)))"
  }
)

// Which way to round, for `round_number`:  `redondear price hacia arriba`;  no word means the nearest
mathEs.addRule(Wording.specialize({ ruleName: "rounding", meanings: ["up", "down"] }), {
  syntax: "((up:hacia arriba|para arriba)|(down:hacia abajo|para abajo))"
})

////////////////
// ## Operators
////////////////

mathEs.addRule(GtLt, {
  syntax: "(operator:(<|>) =?) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("salary")
        scope.variables?.add("expenses")
      },
      tests: [
        { title: "> con espacios", input: "salary > expenses", js: "(salary > expenses)" },
        { title: "> sin espacios", input: "salary>expenses", js: "(salary > expenses)" },

        { title: "< con espacios", input: "salary < expenses", js: "(salary < expenses)" },
        { title: "< sin espacios", input: "salary<expenses", js: "(salary < expenses)" },

        { title: ">= con espacios", input: "salary >= expenses", js: "(salary >= expenses)" },
        { title: ">= sin espacios", input: "salary>=expenses", js: "(salary >= expenses)" },

        { title: "<= con espacios", input: "salary <= expenses", js: "(salary <= expenses)" },
        { title: "<= sin espacios", input: "salary<=expenses", js: "(salary <= expenses)" }
      ]
    }
  ]
})

mathEs.addRule(IsGtLt, {
  syntax: "{operator:is_greater_or_less_than} {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("salary")
        scope.variables?.add("expenses")
      },
      tests: [
        ["salary es mayor que expenses", "(salary > expenses)"],
        ["salary es mayor o igual que expenses", "(salary >= expenses)"],
        ["salary es mayor que o igual a expenses", "(salary >= expenses)"],
        ["salary es menor que expenses", "(salary < expenses)"],
        ["salary es menor o igual a expenses", "(salary <= expenses)"]
      ]
    }
  ]
})

mathEs.addRule(Plus, {
  syntax: "(operator:más|mas|+) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("price")
        scope.variables?.add("tax")
      },
      tests: [
        ["price + tax", "(price + tax)"],
        ["price+tax", "(price + tax)"],
        ["price más tax", "(price + tax)"],
        ["price mas tax", "(price + tax)"]
      ]
    }
  ]
})

mathEs.addRule(Minus, {
  syntax: "(operator:menos|-) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("price")
        scope.variables?.add("tax")
      },
      tests: [
        // NOTE: `-` requires spaces, as in English
        ["price - tax", "(price - tax)"],
        ["price menos tax", "(price - tax)"]
      ]
    }
  ]
})

mathEs.addRule(Times, {
  syntax: "(operator:*|por) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("price")
        scope.variables?.add("taxRate")
      },
      tests: [
        ["price*taxRate", "(price * taxRate)"],
        ["price * taxRate", "(price * taxRate)"],
        ["price por taxRate", "(price * taxRate)"]
      ]
    }
  ]
})

mathEs.addRule(DividedBy, {
  syntax: "(operator:/|dividido (por|entre)) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("price")
        scope.variables?.add("taxRate")
      },
      tests: [
        ["price/taxRate", "(price / taxRate)"],
        ["price / taxRate", "(price / taxRate)"],
        ["price dividido por taxRate", "(price / taxRate)"],
        ["price dividido entre taxRate", "(price / taxRate)"]
      ]
    }
  ]
})

////////////////
// ## Math functions
////////////////

mathEs.addRule(AbsoluteValue, {
  syntax: "(operator:el? valor absoluto (de|del)) {expression:arithmetic_expression}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("difference")
      },
      tests: [
        ["el valor absoluto de la difference", "core.absoluteValue(difference)"],
        ["valor absoluto de difference", "core.absoluteValue(difference)"]
      ]
    }
  ]
})

mathEs.addRule(Max, {
  syntax:
    "(operator:(el|la)? (mayor|más grande|mas grande)) {argument:singular_identifier}? (de|del|en) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("prices")
        scope.variables?.add("price")
      },
      tests: [
        ["el mayor de los prices", "core.largestOf(prices)"],
        ["más grande en prices", "core.largestOf(prices)"],
        ["el mayor número en prices", "core.largestOf(prices)"]
      ]
    }
  ]
})

mathEs.addRule(Min, {
  syntax:
    "(operator:(el|la)? (menor|más pequeño|mas pequeño|más pequeno|mas pequeno)) {argument:singular_identifier}? (de|del|en) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("prices")
      },
      tests: [
        ["el menor de prices", "core.smallestOf(prices)"],
        ["el menor valor en prices", "core.smallestOf(prices)"],
        ["el más pequeño de prices", "core.smallestOf(prices)"]
      ]
    }
  ]
})

mathEs.addRule(RoundNumber, {
  syntax: "redondear {expression:arithmetic_expression} {operator:rounding}?",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("price")
      },
      tests: [
        ["redondear price", "Math.round(price)"],
        ["redondear price hacia arriba", "Math.ceil(price)"],
        ["redondear price hacia abajo", "Math.floor(price)"]
      ]
    }
  ]
})
