/**
 * The `math` rules in English:  each rule's syntax and its tests, registered on the `math` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `math.<lang>.ts` (epic `spanish`).
 */
import { P } from "spell/parser/parser"
import { Wording } from "spell/parser/spell/rules/expressions"

import { math } from "./math.parser"
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

////////////////
// ## Word rules:  each language's words for one thing, and what each form means (`Wording`, `Negatable`)
////////////////

// Which comparison, for `is_gt_lt`:  `salary is greater than or equal to expenses` means `at_least`
math.addRule(
  Wording.specialize({ ruleName: "is_greater_or_less_than", meanings: ["greater", "less", "at_least", "at_most"] }),
  {
    syntax:
      "((greater:is greater than)|(less:is less than)|(at_least:is greater than or equal to)|(at_most:is less than or equal to))"
  }
)

// Which way to round, for `round_number`:  `round price up`;  `off` means nothing special, the nearest
math.addRule(Wording.specialize({ ruleName: "rounding", meanings: ["up", "down"] }), {
  syntax: "(off|(up:up)|(down:down))"
})

math.addRule(GtLt, {
  syntax: "(operator:(<|>) =?) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("salary")
        scope.variables?.add("expenses")
      },
      tests: [
        { title: "> with spaces", input: "salary > expenses", js: "(salary > expenses)" },
        { title: "> without spaces", input: "salary>expenses", js: "(salary > expenses)" },

        { title: "< with spaces", input: "salary < expenses", js: "(salary < expenses)" },
        { title: "< without spaces", input: "salary<expenses", js: "(salary < expenses)" },

        { title: ">= with spaces", input: "salary >= expenses", js: "(salary >= expenses)" },
        { title: ">= without spaces", input: "salary>=expenses", js: "(salary >= expenses)" },

        { title: "<= with spaces", input: "salary <= expenses", js: "(salary <= expenses)" },
        { title: "<= without spaces", input: "salary<=expenses", js: "(salary <= expenses)" }
      ]
    }
  ]
})

math.addRule(IsGtLt, {
  syntax: "{operator:is_greater_or_less_than} {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("salary")
        scope.variables?.add("expenses")
      },
      tests: [
        ["salary is greater than expenses", "(salary > expenses)"],
        ["salary is greater than or equal to expenses", "(salary >= expenses)"],
        ["salary is less than expenses", "(salary < expenses)"],
        ["salary is less than or equal to expenses", "(salary <= expenses)"]
      ]
    }
  ]
})

math.addRule(Plus, {
  syntax: "(operator:plus|+) {expression:operand}",
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
        ["price plus tax", "(price + tax)"]
      ]
    }
  ]
})

math.addRule(Minus, {
  syntax: "(operator:minus|-) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("price")
        scope.variables?.add("tax")
      },
      tests: [
        //        ["price-tax", "(price - tax)"],     // NOTE: `-` requires spaces...
        ["price - tax", "(price - tax)"],
        ["price minus tax", "(price - tax)"]
      ]
    }
  ]
})

math.addRule(Times, {
  syntax: "(operator:*|times) {expression:operand}",
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
        ["price times taxRate", "(price * taxRate)"]
      ]
    }
  ]
})

math.addRule(DividedBy, {
  syntax: "(operator:/|divided by) {expression:operand}",
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
        ["price divided by taxRate", "(price / taxRate)"]
      ]
    }
  ]
})

math.addRule(AbsoluteValue, {
  syntax: "(operator:the? absolute value of) {expression:arithmetic_expression}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("difference")
      },
      tests: [["the absolute value of the difference", "core.absoluteValue(difference)"]]
    }
  ]
})

math.addRule(Max, {
  syntax: "(operator:the? (biggest|largest)) {argument:singular_identifier}? (of|in) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("prices")
        scope.variables?.add("price")
      },
      tests: [
        ["largest of the prices", "core.largestOf(prices)"],
        ["biggest in prices", "core.largestOf(prices)"],
        ["the biggest number in prices", "core.largestOf(prices)"]
      ]
    }
  ]
})

math.addRule(Min, {
  syntax: "(operator:the? smallest) {argument:singular_identifier}? (of|in) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("prices")
      },
      tests: [
        ["smallest of prices", "core.smallestOf(prices)"],
        ["smallest value in prices", "core.smallestOf(prices)"]
      ]
    }
  ]
})

math.addRule(RoundNumber, {
  syntax: "round {expression:arithmetic_expression} {operator:rounding}?",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("price")
      },
      tests: [
        ["round price", "Math.round(price)"],
        ["round price off", "Math.round(price)"],
        ["round price up", "Math.ceil(price)"],
        ["round price down", "Math.floor(price)"]
      ]
    }
  ]
})
