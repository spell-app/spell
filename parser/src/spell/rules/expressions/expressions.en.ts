/**
 * The `expressions` rules in English:
 * each rule's syntax and its tests, registered on the `expressions` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `expressions.<lang>.ts` (epic `spanish`).
 */
import { P } from "spell-lang/parser"

import { expressions } from "./expressions.parser"
import { And } from "./And"
import { ArithmeticExpression } from "./ArithmeticExpression"
import { AsAType } from "./AsAType"
import { AsLowercase } from "./AsLowercase"
import { AsUppercase } from "./AsUppercase"
import { CompoundExpression } from "./CompoundExpression"
import { DoesNotInclude } from "./DoesNotInclude"
import { Exists } from "./Exists"
import { Includes } from "./Includes"
import { IsA } from "./IsA"
import { IsDefined } from "./IsDefined"
import { IsEmpty } from "./IsEmpty"
import { IsEqual } from "./IsEqual"
import { IsExactly } from "./IsExactly"
import { IsIn } from "./IsIn"
import { IsSameTypeAs } from "./IsSameTypeAs"
import { Synonyms } from "./Synonyms"
import { Wording } from "./Wording"
import { Negatable } from "./Negatable"
import { Or } from "./Or"
import { ParenthesizedExpression } from "./ParenthesizedExpression"
import { ThereIsA } from "./ThereIsA"
import { HexDigits } from "./HexDigits"
import { HexLiteral } from "./HexLiteral"
import { UnicodeCode } from "./UnicodeCode"
import { UnicodeExpression } from "./UnicodeExpression"
import { UnicodeLiteral } from "./UnicodeLiteral"
import { UnicodeOffset } from "./UnicodeOffset"

////////////////
// ## Word rules:  each language's words for one thing, and what each form means (`Wording`, `Negatable`)
////////////////

// Use `{is_or_is_not}` in a syntax for every form of `is`, including `isn't`;  plain `is` for just the word.
// Each keeps its old name as an alias (`is`, `can`, `will`, `has`):
// declarations compiled before epic `spanish` say it.
expressions.addRule(Negatable.specialize({ ruleName: "is_or_is_not", alias: "is" }), {
  syntax: "(is|(negated:is not|isn't|isnt))"
})

// `is a`, and the plural's `are a`:  `cards which are not a face card`
expressions.addRule(Negatable.specialize({ ruleName: "is_or_is_not_a" }), {
  syntax:
    "(is a|is an|are a|are an|(negated:is not a|is not an|isn't a|isn't an|isnt a|isnt an|are not a|are not an|aren't a|aren't an|arent a|arent an))"
})

expressions.addRule(Negatable.specialize({ ruleName: "can_or_cannot", alias: "can" }), {
  syntax: "(can|(negated:can not|cannot|can't|cant))"
})

expressions.addRule(Negatable.specialize({ ruleName: "will_or_will_not", alias: "will" }), {
  syntax: "(will|(negated:will not|won't|wont))"
})

expressions.addRule(Negatable.specialize({ ruleName: "has_or_has_not", alias: "has" }), {
  syntax: "(has|(negated:does not have|doesn't have|doesnt have))"
})

// The articles:  `{indefinite_article}` matches `a` or `an`, `{definite_article}` `the`
expressions.addRule(Synonyms.specialize({ ruleName: "indefinite_article" }), { syntax: "(a|an)" })
expressions.addRule(Synonyms.specialize({ ruleName: "definite_article" }), { syntax: "the" })

// `is` or `are` after a property's quoted name, its subject left out:
// `- "color" is red`, `- piles are a list of piles`
expressions.addRule(Synonyms.specialize({ ruleName: "is_or_are" }), { syntax: "(is|are)/i" })

// The verbs an outline body's line may start with after `it`:  `it has a deck`, `it belongs to a game`
expressions.addRule(Synonyms.specialize({ ruleName: "has_or_belongs" }), { syntax: "(has|belongs)/i" })

// The words joining things in a list:  `jokers and name = "big"`;  `Wording.meaningOf()` says which
expressions.addRule(Wording.specialize({ ruleName: "and_or", meanings: ["and", "or"] }), {
  syntax: "((and:and)|(or:or))"
})

// `is neither red nor green`:  only negated
expressions.addRule(Negatable.specialize({ ruleName: "is_neither" }), { syntax: "(negated:is neither|isn't either)" })

expressions.addRule(Negatable.specialize({ ruleName: "is_defined_or_not" }), {
  syntax: "(is defined|(negated:is undefined|is not defined|isn't defined|isnt defined))"
})

expressions.addRule(Negatable.specialize({ ruleName: "exists_or_not" }), {
  syntax: "(exists|(negated:does not exist|doesn't exist|doesnt exist))"
})

expressions.addRule(Negatable.specialize({ ruleName: "there_is_or_is_not" }), {
  syntax:
    "(there is a|there is an|(negated:there is not a|there is not an|there isn't a|there isn't an|there is no such))"
})

expressions.addRule(ParenthesizedExpression, {
  syntax: "\\( {expression} \\)",
  tests: [
    {
      title: "correctly matches parenthesized expressions",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
      },
      tests: [
        ["(thing)", "(thing)"],
        ["((thing))", "(thing)"],
        ["(((thing)))", "(thing)"],
        ["(1 and yes)", "(1 && true)"]
      ]
    },
    {
      title: "correctly matches multiple parenthesis",
      compileAs: "expression",
      tests: [
        ["(1) and (yes)", "(1 && true)"],
        ["((1) and (yes))", "(1 && true)"],
        ["((1) and ((yes)))", "(1 && true)"]
      ]
    },
    {
      title: "doesn't match malformed parenthesized expressions",
      tests: [
        ["(foo", undefined],
        ["(foo(bar)baz", undefined]
      ]
    }
  ]
})

expressions.addRule(CompoundExpression, {
  syntax: "{lhs:operand} {rhsChain:expression_suffix}*",
  // test multiple infix expressions in a row
  tests: [
    {
      title: "complex math expressions",
      compileAs: "expression",
      tests: [
        ["1 + 2 + 3", "(1 + 2 + 3)"],
        ["1 + 2 * 3", "(1 + 2 * 3)"],
        ["(1+1) * (2+2)", "((1 + 1) * (2 + 2))"],
        ["((1+1) * (2+2))", "((1 + 1) * (2 + 2))"]
      ]
    },
    {
      title: "complex property/etc expressions",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("card")
      },
      tests: [[`the suit of the card is "ace"`, `(card.suit == "ace")`]]
    },
    {
      title: "postfix binds like a comparison:  after arithmetic, before `and`",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("x")
        scope.variables?.add("y")
      },
      tests: [
        ["x + y is empty", "core.isEmpty(x + y)"],
        ["x is 1 and y is empty", "(x == 1 && core.isEmpty(y))"]
      ]
    }
  ]
})

expressions.addRule(ArithmeticExpression, {
  syntax: "{lhs:operand} {rhsChain:expression_suffix}*",
  tests: [
    {
      compileAs: "arithmetic_expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("x")
      },
      tests: [
        ["x + 1 * 2", "(x + 1 * 2)"],
        ["x", "x"]
      ]
    }
  ]
})

expressions.addRule(And, {
  syntax: "(operator:and) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("other")
        scope.variables?.add("yet-another")
      },
      tests: [
        ["thing and other", "(thing && other)"],
        ["thing and other and yet-another", "(thing && other && yetAnother)"],
        ["thing is 1 and other is 2", "(thing == 1 && other == 2)"]
      ]
    }
  ]
})

expressions.addRule(Or, {
  syntax: "(operator:or) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("other")
      },
      tests: [["thing or other", "(thing || other)"]]
    }
  ]
})

expressions.addRule(IsEqual, {
  syntax: "{operator:is_or_is_not} {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("other")
      },
      tests: [
        ["thing is other", "(thing == other)"],
        ["thing is not other", "(thing != other)"]
      ]
    },
    // a thing compared to one of the values its type lists:  the property that lists it
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.parse(
          [
            "a card is a thing",
            "a card has a suit as one of clubs, diamonds, hearts, spades",
            "card = a new card"
          ].join("\n"),
          "block"
        )
      },
      tests: [
        ["card is clubs", '(card.suit == "clubs")'],
        ["card is not hearts", '(card.suit != "hearts")']
      ]
    }
  ]
})

expressions.addRule(IsExactly, {
  syntax: "{operator:is_or_is_not} exactly {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("other")
      },
      tests: [
        ["thing is exactly other", "(thing === other)"],
        ["thing is not exactly other", "(thing !== other)"]
      ]
    }
  ]
})

expressions.addRule(IsA, {
  syntax: "{operator:is_or_is_not_a} {expression:known_type}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.types?.add("Bee")
        scope.types?.add("Animal")
      },
      tests: [
        ["thing is a Bee", "thing instanceof Bee"],
        ["thing is an Animal", "thing instanceof Animal"],
        ["thing is not a Bee", "!(thing instanceof Bee)"],
        ["thing is not an Animal", "!(thing instanceof Animal)"],
        ["thing is a number", 'typeof thing === "number"'],
        ["thing is a boolean", 'core.isOfType(thing, "choice")'],
        ["thing is a list", 'core.isOfType(thing, "List")'],
        // an unknown type is no type:  `is a crad` doesn't parse
        ["thing is a crad", "thing"]
      ]
    }
  ]
})

expressions.addRule(IsSameTypeAs, {
  syntax: "{operator:is_or_is_not} the same type as {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("other")
      },
      tests: [
        ["thing is the same type as other", "core.matchesType(thing, other)"],
        ["thing is not the same type as other", "!core.matchesType(thing, other)"]
      ]
    }
  ]
})

expressions.addRule(IsIn, {
  syntax: "{operator:is_or_is_not} (in|one of|either of?) (expression:{operand}|{identifier_list})",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("red")
        scope.constants?.add("green")
        scope.variables?.add("theList")
      },
      tests: [
        ["thing is in theList", "core.includes(theList, thing)"],
        ["thing is one of theList", "core.includes(theList, thing)"],
        ["thing is not in theList", "!core.includes(theList, thing)"],
        ["thing is not one of theList", "!core.includes(theList, thing)"],
        ["thing is either red or green", 'core.includes([red, "green"], thing)'],
        ["thing is not either red or green", '!core.includes([red, "green"], thing)'],
        ["thing is not either of red or green", '!core.includes([red, "green"], thing)']
      ]
    }
  ]
})

// `is neither red nor green`:  always negated
expressions.addRule(IsIn, {
  syntax: "{operator:is_neither} (expression:{operand}|{identifier_list})",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("red")
        scope.constants?.add("green")
      },
      tests: [["thing is neither red nor green", '!core.includes([red, "green"], thing)']]
    }
  ]
})

// `thing is green or blue`, the values known -- see `value_choices`
expressions.addRule(IsIn, {
  syntax: "{operator:is_or_is_not} (expression:{value_choices})",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.constants?.add("green")
        scope.constants?.add("blue")
      },
      tests: [
        ["thing is green or blue", 'core.includes(["green", "blue"], thing)'],
        ["thing is not green or blue", '!core.includes(["green", "blue"], thing)'],
        ["thing is green or thing is blue", '(thing == "green" || thing == "blue")']
      ]
    }
  ]
})

expressions.addRule(Includes, {
  syntax: "(operator:includes|contains) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("theList")
        scope.variables?.add("thing")
      },
      tests: [
        ["theList includes thing", "core.includes(theList, thing)"],
        ["theList contains thing", "core.includes(theList, thing)"]
      ]
    }
  ]
})

expressions.addRule(DoesNotInclude, {
  syntax: "(operator:does not (include|contain)) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("theList")
        scope.variables?.add("thing")
      },
      tests: [
        ["theList does not include thing", "!core.includes(theList, thing)"],
        ["theList does not contain thing", "!core.includes(theList, thing)"]
      ]
    }
  ]
})

expressions.addRule(IsDefined, {
  syntax: "{operator:is_defined_or_not}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
      },
      tests: [
        ["thing is defined", "thing !== undefined"],
        ["thing is undefined", "thing === undefined"],
        ["thing is not defined", "thing === undefined"]
      ]
    }
  ]
})

expressions.addRule(Exists, {
  syntax: "{operator:exists_or_not}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
      },
      tests: [
        ["thing exists", "thing !== undefined"],
        ["thing does not exist", "thing === undefined"]
      ]
    }
  ]
})

expressions.addRule(ThereIsA, {
  syntax: "{operator:there_is_or_is_not} {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("animal")
      },
      tests: [
        { input: "there is a thing", js: "thing !== undefined" },
        { input: "there is an animal", js: "animal !== undefined" },
        { input: "there is not a thing", js: "thing === undefined" },
        { input: "there is no such animal", js: "animal === undefined" },
        // an operand:  `and` is the expression's, not the thing's (D23)
        {
          input: "there is a thing and animal",
          js: "(thing !== undefined && animal)"
        }
      ]
    }
  ]
})

expressions.addRule(IsEmpty, {
  syntax: "{operator:is_or_is_not} empty",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
      },
      tests: [
        ["thing is empty", "core.isEmpty(thing)"],
        ["thing is not empty", "!core.isEmpty(thing)"]
      ]
    }
  ]
})

expressions.addRule(AsUppercase, {
  syntax: "as (upper case|uppercase)",
  tests: [
    {
      compileAs: "expression",
      tests: [
        [`"foo" as upper case`, '"foo".toLocaleUpperCase()'],
        [`1 as uppercase`, '`${1 ?? ""}`.toLocaleUpperCase()']
      ]
    }
  ]
})

expressions.addRule(AsLowercase, {
  syntax: "as (lower case|lowercase)",
  tests: [
    {
      compileAs: "expression",
      tests: [
        [`"foo" as lower case`, '"foo".toLocaleLowerCase()'],
        [`1 as lowercase`, `core.lowerCase(1)`]
      ]
    }
  ]
})

expressions.addRule(AsAType, {
  syntax: "as (a|an) (type:string|number|fraction|integer)",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["1 as a string", "`${1}`"],
        [`"hello" as a string`, '`${"hello"}`'],
        ["1 as a number", "parseFloat(1)"],
        ["1.3 as a fraction", "parseFloat(1.3)"],
        ["1.4 as an integer", "parseInt(1.4)"],
        [`"foo" as a number`, `parseFloat("foo")`]
      ]
    }
  ]
})

expressions.addRule(AsAType, {
  syntax: "as (type:text)",
  tests: [
    {
      compileAs: "expression",
      tests: [["1 as text", "`${1}`"]]
    }
  ]
})

expressions.addRule(HexDigits)

expressions.addRule(HexLiteral, {
  syntax: "hex {digits:hex_digits}",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["hex 1F0A0", "0x1F0A0"],
        ["hex ff", "0xff"],
        ["hex 10", "0x10"]
      ]
    }
  ]
})

expressions.addRule(UnicodeCode)

expressions.addRule(UnicodeOffset, {
  syntax: "unicode {code:unicode_code} (plus|+) {offset:arithmetic_expression}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("column")
      },
      tests: [
        ["unicode 1F0A0 + 1", "core.unicode(0x1F0A0 + 1)"],
        ["unicode 1F0A0 plus column", "core.unicode(0x1F0A0 + column)"],
        ["unicode 1F0A0 + column * 2", "core.unicode(0x1F0A0 + column * 2)"]
      ]
    }
  ]
})

expressions.addRule(UnicodeLiteral, {
  syntax: "unicode {code:unicode_code}",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["unicode 1F0A0", '"🂠"'],
        ["unicode 2665", '"♥"'],
        ["unicode A0", '" "'],
        ["unicode 110000", "core.unicode(110000)"]
      ]
    }
  ]
})

expressions.addRule(UnicodeExpression, {
  syntax: "unicode {code:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("code")
      },
      tests: [
        ["unicode code", "core.unicode(code)"],
        ["unicode (code + 1)", "core.unicode(code + 1)"]
      ]
    }
  ]
})
