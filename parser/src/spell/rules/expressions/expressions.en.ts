/**
 * The `expressions` rules in English:
 * each rule's syntax and its tests, registered on the `expressions` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `expressions.<lang>.ts` (epic `spanish`).
 */
import { P } from "spell/parser/parser"

import { expressions } from "./expressions.parser"
import { And } from "./And"
import { ArithmeticExpression } from "./ArithmeticExpression"
import { AsAType } from "./AsAType"
import { AsLowercase } from "./AsLowercase"
import { AsTitleCase } from "./AsTitleCase"
import { WithCommas } from "./WithCommas"
import { Joined } from "./Joined"
import { Now } from "./Now"
import { AsADate } from "./AsADate"
import { AsADuration } from "./AsADuration"
import { AsTwoDigits } from "./AsTwoDigits"
import { DaysInTheMonth } from "./DaysInTheMonth"
import { DaysUntil } from "./DaysUntil"
import { DurationPart } from "./DurationPart"
import { IsBeforeOrAfter } from "./IsBeforeOrAfter"
import { IsDayFromToday } from "./IsDayFromToday"
import { IsDayPart } from "./IsDayPart"
import { IsMeridiem } from "./IsMeridiem"
import { IsSameDayAs } from "./IsSameDayAs"
import { IsWeekendDay } from "./IsWeekendDay"
import { NextWeekend } from "./NextWeekend"
import { StartOfTheDay } from "./StartOfTheDay"
import { TheDate } from "./TheDate"
import { TimeLiteral } from "./TimeLiteral"
import { TimeOfDay } from "./TimeOfDay"
import { AsUppercase } from "./AsUppercase"
import { CompoundExpression } from "./CompoundExpression"
import { DoesNotInclude } from "./DoesNotInclude"
import { Exists } from "./Exists"
import { Includes } from "./Includes"
import { IsA } from "./IsA"
import { IsDefined } from "./IsDefined"
import { IsEmpty } from "./IsEmpty"
import { IsEqual } from "./IsEqual"
import { IsListedValue } from "./IsListedValue"
import { IsExactly } from "./IsExactly"
import { IsIn } from "./IsIn"
import { IsInAType } from "./IsInAType"
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
import { UnitWords } from "./UnitWords"
import { MeasureLiteral } from "./MeasureLiteral"
import { MeasureIn } from "./MeasureIn"

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

// The word before a list's condition (epic `language` T133):  `the cards in the deck where it is face up`;
// `which`, `that` and `who` start one with no subject, the item its subject:  `... which are face up`
// - Each rule writes the words out, `(where:where|which|that|who)`, so a line without one is turned away at once;
//   this says which ones mean `which` (`Wording.reads()`, `SpellStatement.withWhichSubject()`)
expressions.addRule(Wording.specialize({ ruleName: "where_or_which", meanings: ["which"] }), {
  syntax: "(where|(which:which|that|who))"
})

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
      tests: [[`the suit of the card is "ace"`, '(card.suit === "ace")']]
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
        ["x is 1 and y is empty", "(x === 1 && core.isEmpty(y))"]
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
        ["thing is 1 and other is 2", "(thing === 1 && other === 2)"]
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

// two values equal, said in full (epic `language` P55, Q51):  `if column is the same as row`
expressions.addRule(IsEqual, {
  syntax: "{operator:is_or_is_not} the same as {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("other")
      },
      tests: [
        ["thing is the same as other", "(thing === other)"],
        ["thing is not the same as other", "(thing !== other)"]
      ]
    }
  ]
})

// ... or both said first:  `if row and column are the same`, an `and` of its own (`are_or_are_not`:  the places module's)
expressions.addRule(IsEqual, {
  syntax: "and {expression:operand} {operator:are_or_are_not} the same",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("other")
      },
      tests: [
        ["thing and other are the same", "(thing === other)"],
        ["thing and other are not the same", "(thing !== other)"],
        ["thing and other are the same and other", "(thing === other && other)"]
      ]
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
        ["thing is other", "(thing === other)"],
        ["thing is not other", "(thing !== other)"]
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
        ["card is clubs", '(card.suit === "clubs")'],
        ["card is not hearts", '(card.suit !== "hearts")']
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
  roles: { match: "question" },
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

// after `is_a`, so a known type wins:  `is a queen` with a type named `queen`
expressions.addRule(IsListedValue, {
  roles: { match: "question" },
  syntax: "{operator:is_or_is_not_a} {expression:constant}"
})
// ... a number of its list too (epic `language` P55):  `it is a 2`
expressions.addRule(IsListedValue, {
  syntax: "{operator:is_or_is_not_a} {expression:number}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.parse(
          ["a card is a thing", "a card has a rank as one of ace, 2, 3, king", "card = a new card"].join("\n"),
          "block"
        )
      },
      tests: [
        ["card is a 2", "(card.rank === 2)"],
        ["card is not a 3", "(card.rank !== 3)"]
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

// in any list of a type (epic `language` P55):  `the card is in a column`
expressions.addRule(IsInAType, {
  roles: { match: "question" },
  syntax: "{operator:is_or_is_not} in (a|an) (expression:{known_type})",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile("a column is a list", "block")
        scope.variables?.add("thing")
      },
      tests: [
        ["thing is in a column", "core.isInA(thing, Column)"],
        ["thing is not in a column", "!core.isInA(thing, Column)"]
      ]
    },
    {
      // a card that belongs to one pile:  its own pile says, no search (epic `language` J148)
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(
          "a card is a thing\na pile is a list of cards\na column is a pile\na card belongs to one pile",
          "block"
        )
        scope.variables?.add({ name: "card", datatype: "Card" })
      },
      tests: [
        ["card is in a column", "card.pile instanceof Column"],
        ["card is not in a column", "!(card.pile instanceof Column)"],
        ["card is in a pile", "card.pile instanceof Pile"]
      ]
    }
  ]
})

// `is in` takes ONE list, never one said inline:  `it is in my-list and it is 1` is two conditions (epic `language` J185)
expressions.addRule(IsIn, {
  syntax: "{operator:is_or_is_not} in (expression:{operand})"
})

expressions.addRule(IsIn, {
  syntax: "{operator:is_or_is_not} (one of|either of?) (expression:{operand}|{identifier_list})",
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
        ["thing is not either of red or green", '!core.includes([red, "green"], thing)'],
        // `is in` takes one list:  the `and` after it starts a condition of its own (epic `language` J185)
        ["thing is in theList and thing is red", "(core.includes(theList, thing) && thing === red)"]
      ]
    },
    {
      // a card that belongs to one pile:  its own pile says, no search (epic `language` J148)
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile("a card is a thing\na pile is a list of cards\na card belongs to one pile", "block")
        scope.variables?.add({ name: "card", datatype: "Card" })
        scope.variables?.add({ name: "stock", datatype: "Pile" })
        scope.variables?.add({ name: "deck", datatype: "list of cards" })
      },
      tests: [
        ["card is in stock", "(card.pile === stock)"],
        ["card is not in stock", "(card.pile !== stock)"],
        // a list outside the family:  a card can be in it AND a pile
        ["card is in deck", "core.includes(deck, card)"]
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
        ["thing is green or thing is blue", '(thing === "green" || thing === "blue")']
      ]
    }
  ]
})

expressions.addRule(Includes, {
  syntax: "(operator:includes|contains) (exactly:exactly)? {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("theList")
        scope.variables?.add("thing")
      },
      tests: [
        ["theList includes thing", "core.includes(theList, thing)"],
        ["theList contains thing", "core.includes(theList, thing)"],
        ["theList includes exactly thing", "core.includesExactly(theList, thing)"]
      ]
    }
  ]
})

expressions.addRule(DoesNotInclude, {
  syntax: "(operator:does not (include|contain)) (exactly:exactly)? {expression:operand}",
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
  roles: { match: "question" },
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
  roles: { match: "question" },
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
  roles: { match: "question" },
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
  roles: { match: "question" },
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
  roles: { match: "value" },
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

// Join into text, `&` as they are, `&&` with a space (HyperTalk's)
expressions.addRule(Wording.specialize({ ruleName: "join_mark", meanings: ["spaced"] }), {
  syntax: "((spaced:&&)|&)"
})
expressions.addRule(Joined, {
  syntax: "{operator:join_mark} {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("price")
        scope.variables?.add("tax")
        scope.variables?.add({ name: "due", datatype: "date" })
      },
      tests: [
        ['"Total:" && price', 'core.joined("Total:", price, " ")'],
        ['"Total:" & price', 'core.joined("Total:", price)'],
        ['"Total:" && price + tax', 'core.joined("Total:", price + tax, " ")'],
        ['"due" && due', 'core.joined("due", due, " ")']
      ]
    }
  ]
})

// Today, as HyperTalk says it:  `the date`, `the long time`
expressions.addRule(Wording.specialize({ ruleName: "date_form", meanings: ["short", "long", "abbreviated"] }), {
  syntax: "((short:short)|(long:long)|(abbreviated:abbreviated|abbrev|abbr))"
})
expressions.addRule(
  Wording.specialize({ ruleName: "date_or_time", meanings: ["date", "time", "timestamp", "time_zone"] }),
  { syntax: "((date:date)|(time_zone:time zone)|(time:time)|(timestamp:timestamp))" }
)
expressions.addRule(TheDate, {
  syntax: "the {form:date_form}? {what:date_or_time}",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["the date", "core.shortDate(core.now())"],
        ["the long date", "core.longDate(core.now())"],
        ["the abbrev date", "core.abbreviatedDate(core.now())"],
        ["the time", "core.shortTime(core.now())"],
        ["the long time", "core.longTime(core.now())"],
        ["the timestamp", "core.timestamp(core.now())"],
        ["the time zone", 'core.timeZone("city")'],
        ["the short time zone", 'core.timeZone("short")'],
        ["the long time zone", 'core.timeZone("long")']
      ]
    }
  ]
})
// A date said one way:  `its time as a short date`
expressions.addRule(
  Wording.specialize({
    ruleName: "date_style",
    meanings: ["short", "long", "abbreviated", "short_time", "long_time", "date_and_time", "timestamp"]
  }),
  {
    syntax:
      "((short:short date)|(long:long date)|(abbreviated:(abbreviated|abbrev|abbr) date)|(short_time:short time)|(long_time:long time)|(date_and_time:date and time)|(timestamp:timestamp))"
  }
)
expressions.addRule(AsADate, {
  roles: { match: "value" },
  syntax: "as (a|an)? {style:date_style}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add({ name: "due", datatype: "date" })
      },
      tests: [
        ["due as a short date", 'core.dateAs(due, "short")'],
        ["due as an abbreviated date", 'core.dateAs(due, "abbreviated")'],
        ["due as a long time", 'core.dateAs(due, "long time")'],
        ["due as a date and time", 'core.dateAs(due, "date and time")'],
        ["due as a timestamp", 'core.dateAs(due, "timestamp")']
      ]
    }
  ]
})
expressions.addRule(Now, {
  syntax: "now",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["now", "core.now()"],
        ["the hour of now", "core.hourOf(core.now())"]
      ]
    }
  ]
})

////////////////
// ## Date and time words (epic `language` P63)
////////////////

/** A date variable `due`, in the scope of a test of the date words. */
function addDue(scope: P.Scope) {
  scope.variables?.add({ name: "due", datatype: "date" })
}

expressions.addRule(AsTwoDigits, {
  roles: { match: "value" },
  syntax: "(as two digits|with a leading zero)",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["the minute of now as two digits", "core.twoDigits(core.minuteOf(core.now()))"],
        ["5 with a leading zero", "core.twoDigits(5)"]
      ]
    }
  ]
})
expressions.addRule(IsMeridiem, {
  roles: { match: "question" },
  syntax: "{operator:is_or_is_not} ((am:am|AM|Am)|(pm:pm|PM|Pm))",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["now is PM", "core.isPM(core.now())"],
        ["now is not am", "!core.isAM(core.now())"]
      ]
    }
  ]
})
// How a duration is said:  `as a short duration`
expressions.addRule(Wording.specialize({ ruleName: "duration_style", meanings: ["short", "long"] }), {
  syntax: "((short:short)|(long:long))"
})
// A unit a duration is said in:  `as a duration in months and days` (J253)
expressions.addRule(
  Wording.specialize({
    ruleName: "duration_unit",
    meanings: ["year", "month", "week", "day", "hour", "minute", "second"]
  }),
  {
    syntax:
      "((year:years|year|yrs|yr)|(month:months|month)|(week:weeks|week)|(day:days|day)|(hour:hours|hour|hrs|hr)|(minute:minutes|minute|mins|min)|(second:seconds|second|secs|sec))"
  }
)
expressions.addRule(AsADuration, {
  roles: { match: "value" },
  syntax: "as (a|an)? {style:duration_style}? duration (in [units:{unit:duration_unit} (,|and)])?",
  tests: [
    {
      compileAs: "expression",
      beforeEach: addDue,
      tests: [
        ["due as a duration", "core.timeFromNow(due)"],
        ["due as a short duration", 'core.timeFromNow(due, "short")'],
        ["due as a long duration", 'core.timeFromNow(due, "long")'],
        ["due as a duration in days", 'core.timeFromNow(due, "normal", "day")'],
        ["due as a duration in months and days", 'core.timeFromNow(due, "normal", ["month", "day"])'],
        ["due as a duration in days and months", 'core.timeFromNow(due, "normal", ["month", "day"])'],
        ["5400 as a duration in minutes, hours", 'core.durationText(5400, "normal", ["hour", "minute"])'],
        ["90 seconds as a duration", "core.durationText(90)"],
        ["(due - now) as a short duration", 'core.durationText(core.secondsBetween(due, core.now()), "short")']
      ]
    }
  ]
})
// A part of a duration:  `the hours of its time left`
expressions.addRule(
  Wording.specialize({ ruleName: "duration_part_name", meanings: ["days", "hours", "minutes", "seconds"] }),
  { syntax: "((days:days)|(hours:hours)|(minutes:minutes)|(seconds:seconds))" }
)
expressions.addRule(DurationPart, {
  syntax: "the {part:duration_part_name} of {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach: addDue,
      tests: [
        ["the hours of 5400 seconds", 'core.durationPartOf(5400, "hours")'],
        ["the seconds of (due - now)", 'core.durationPartOf(core.secondsBetween(due, core.now()), "seconds")'],
        ["the seconds of due", "core.secondOf(due)"]
      ]
    }
  ]
})
expressions.addRule(IsWeekendDay, {
  roles: { match: "question" },
  syntax: "{operator:is_or_is_not} a weekend day",
  tests: [{ compileAs: "expression", tests: [["now is a weekend day", "core.isWeekendDay(core.now())"]] }]
})
expressions.addRule(NextWeekend, {
  syntax: "the next weekend",
  tests: [{ compileAs: "expression", tests: [["the next weekend", "core.nextWeekend()"]] }]
})
expressions.addRule(IsBeforeOrAfter, {
  roles: { match: "question" },
  syntax: "{operator:is_or_is_not} ((before:before)|(after:after)) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach: addDue,
      tests: [
        ["due is before now", "core.isBefore(due, core.now())"],
        ["due is not after now", "!core.isAfter(due, core.now())"]
      ]
    }
  ]
})
expressions.addRule(IsSameDayAs, {
  roles: { match: "question" },
  syntax: "{operator:is_or_is_not} the same day as {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach: addDue,
      tests: [["due is the same day as now", "core.isSameDay(due, core.now())"]]
    }
  ]
})
expressions.addRule(IsDayFromToday, {
  roles: { match: "question" },
  syntax: "{operator:is_or_is_not} ((today:today)|(tomorrow:tomorrow)|(yesterday:yesterday))",
  tests: [
    {
      compileAs: "expression",
      beforeEach: addDue,
      tests: [
        ["due is today", "core.isDaysFromToday(due, 0)"],
        ["due is tomorrow", "core.isDaysFromToday(due, 1)"],
        ["due isn't yesterday", "!core.isDaysFromToday(due, -1)"]
      ]
    }
  ]
})
// Noon and midnight today, and a time as people write it (J252)
expressions.addRule(TimeOfDay, {
  syntax: "((noon:noon)|(midnight:midnight))",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["noon", "core.todayAt(12)"],
        ["midnight", "core.todayAt(0)"]
      ]
    }
  ]
})
expressions.addRule(TimeLiteral.specialize({ ruleName: "time_literal" }), {
  // its own `parse()` reads it:  this is for people, and the syntax files
  syntax: "{number} (: {number})? (am|pm)",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["9am", "core.todayAt(9)"],
        ["9 am", "core.todayAt(9)"],
        ["9:30am", "core.todayAt(9, 30)"],
        ["9:30 PM", "core.todayAt(21, 30)"],
        ["12am", "core.todayAt(0)"],
        ["12pm", "core.todayAt(12)"],
        ["now is after 9am", "core.isAfter(core.now(), core.todayAt(9))"]
      ]
    }
  ]
})
// A part of the day:  `if now is in the morning`
expressions.addRule(
  Wording.specialize({
    ruleName: "day_part",
    meanings: ["morning", "afternoon", "earlyEvening", "evening", "lateEvening", "night"]
  }),
  {
    syntax:
      "((earlyEvening:early evening)|(lateEvening:late evening)|(morning:morning)|(afternoon:afternoon)|(evening:evening)|(night:night))"
  }
)
expressions.addRule(IsDayPart, {
  roles: { match: "question" },
  syntax: "{operator:is_or_is_not} ((today:this)|in the|at) {part:day_part}",
  tests: [
    {
      compileAs: "expression",
      beforeEach: addDue,
      tests: [
        ["due is in the morning", 'core.isDayPart(due, "morning")'],
        ["due is not in the late evening", '!core.isDayPart(due, "lateEvening")'],
        ["due is at night", 'core.isDayPart(due, "night")'],
        ["due is this afternoon", 'core.isDayPart(due, "afternoon", "today")']
      ]
    }
  ]
})
expressions.addRule(DaysUntil, {
  syntax: "the days ((until:until)|(since:since)) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach: addDue,
      tests: [
        ["the days until due", "core.daysUntil(due)"],
        ["the days since due", "core.daysSince(due)"]
      ]
    }
  ]
})
expressions.addRule(StartOfTheDay, {
  syntax: "the ((start:start)|(end:end)) of the day of {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["the start of the day of now", "core.startOfDay(core.now())"],
        ["the end of the day of now", "core.endOfDay(core.now())"]
      ]
    }
  ]
})
expressions.addRule(DaysInTheMonth, {
  syntax: "the days in the month of {expression:operand}",
  tests: [{ compileAs: "expression", tests: [["the days in the month of now", "core.daysInMonth(core.now())"]] }]
})

expressions.addRule(WithCommas, {
  roles: { match: "value" },
  syntax: "with commas",
  tests: [{ compileAs: "expression", tests: [["1000 with commas", "core.withCommas(1000)"]] }]
})
expressions.addRule(AsLowercase, {
  roles: { match: "value" },
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
expressions.addRule(AsTitleCase, {
  roles: { match: "value" },
  syntax: "as (title case|titlecase)",
  tests: [
    {
      compileAs: "expression",
      tests: [
        [`"ace of spades" as title case`, 'core.titleCase("ace of spades")'],
        [`1 as titlecase`, `core.titleCase(1)`]
      ]
    }
  ]
})

expressions.addRule(AsAType, {
  roles: { match: "value" },
  syntax: "as (a|an) (type:string|number|fraction|integer|date)",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["1 as a string", "`${1}`"],
        [`"hello" as a string`, '`${"hello"}`'],
        ["1 as a number", "parseFloat(1)"],
        ["1.3 as a fraction", "parseFloat(1.3)"],
        ["1.4 as an integer", "parseInt(1.4)"],
        [`"2026-12-25" as a date`, `core.dateFrom("2026-12-25")`],
        ["the weekday of now as a number", "core.weekdayNumberOf(core.now())"],
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
  roles: { match: "written value" },
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
  roles: { match: "written value" },
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

////////////////
// ## Measures:  numbers with units (epic `language` P23) -- their tests:  `tests/spell/Dimensions.test.ts`
////////////////

// one unit of a dimension the scope knows, by its name, an `aka` or a plural:  `cm`, `feet`, `°F`
expressions.addRule(UnitWords)

// a measure as people write it:  `172 cm`, `5 ft 8 in`, `2' 3 1/2"`
expressions.addRule(MeasureLiteral, {
  roles: { match: "quantity" },
  syntax: "{number} {unit:unit_words}"
})

// a measure in other units:  `its height in feet`, `its height in feet and inches`
expressions.addRule(MeasureIn, {
  roles: { match: "value" },
  syntax: "in [units:{unit:unit_words} (,|and)]"
})
