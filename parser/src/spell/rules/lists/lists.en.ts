/**
 * The `lists` rules in English:  each rule's syntax and its tests, registered on the `lists` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `lists.<lang>.ts` (epic `spanish`).
 */
import { P } from "spell-parser/parser"
import { Negatable, Wording } from "spell-parser/spell/rules/expressions"

import { lists } from "./lists.parser"
import { BracketedList } from "./BracketedList"
import { CanGiveUp } from "./CanGiveUp"
import { CanTake } from "./CanTake"
import { CopyList } from "./CopyList"
import { EndsWith } from "./EndsWith"
import { IdentifierList } from "./IdentifierList"
import { ListAdd } from "./ListAdd"
import { ListAddRelative } from "./ListAddRelative"
import { ListAppend } from "./ListAppend"
import { ListCount } from "./ListCount"
import { ListEmpty } from "./ListEmpty"
import { ListFilter } from "./ListFilter"
import { ListIteration } from "./ListIteration"
import { ListLength } from "./ListLength"
import { ListMembershipTest } from "./ListMembershipTest"
import { ListMove } from "./ListMove"
import { ListPosition } from "./ListPosition"
import { ListPrepend } from "./ListPrepend"
import { ListRangeIteration } from "./ListRangeIteration"
import { ListRemove } from "./ListRemove"
import { ListRemoveOrdinal } from "./ListRemoveOrdinal"
import { ListRemovePosition } from "./ListRemovePosition"
import { ListRemoveRange } from "./ListRemoveRange"
import { ListRemoveRangeOrdinal } from "./ListRemoveRangeOrdinal"
import { ListRemoveWhere } from "./ListRemoveWhere"
import { ListReverse } from "./ListReverse"
import { ListShuffle } from "./ListShuffle"
import { MergeLists } from "./MergeLists"
import { NumberRange } from "./NumberRange"
import { Ordinal } from "./Ordinal"
import { OrdinalPositionExpression } from "./OrdinalPositionExpression"
import { OrdinalWhereExpression } from "./OrdinalWhereExpression"
import { PositionExpression } from "./PositionExpression"
import { RandomItemExpression } from "./RandomItemExpression"
import { RandomItemsExpression } from "./RandomItemsExpression"
import { RangeBetweenExpression } from "./RangeBetweenExpression"
import { RangeCountExpression } from "./RangeCountExpression"
import { RangeStartingWithExpression } from "./RangeStartingWithExpression"
import { RepeatNTimes } from "./RepeatNTimes"
import { StartsWith } from "./StartsWith"
import { ValueChoices } from "./ValueChoices"

////////////////
// ## Word rules:  each language's words for one thing, and what each form means (`Wording`, `Negatable`)
////////////////

// `starts with` and its negated forms, for `starts_with`
lists.addRule(Negatable.specialize({ ruleName: "starts_with_or_not" }), {
  syntax: "(starts with|(negated:does not start with|doesnt start with|doesn't start with))"
})

// `ends with` and its negated forms, for `ends_with`
lists.addRule(Negatable.specialize({ ruleName: "ends_with_or_not" }), {
  syntax: "(ends with|(negated:does not end with|doesnt end with|doesn't end with))"
})

// `has` and its negated forms, for `list_membership_test`:  `my-list has no items where ...`
lists.addRule(Negatable.specialize({ ruleName: "has_or_has_no" }), {
  syntax: "(has|(negated:has no|doesnt have|doesn't have|does not have))"
})

// Which end of a list, for `list_add`:  `add thing to the front of my-list`
lists.addRule(Wording.specialize({ ruleName: "list_end", meanings: ["start", "end"] }), {
  syntax: "((start:start|front|top)|(end:end|back|bottom))"
})

// Which side of an item, for `list_add_relative`:  `add thing to my-list after other-thing`
lists.addRule(Wording.specialize({ ruleName: "before_or_after", meanings: ["before", "after"] }), {
  syntax: "((before:before)|(after:after))"
})

lists.addRule(IdentifierList, {
  syntax: "[({number_range}|{known_variable}|{constant}|{number}) (,|or|and|nor)]",
  tests: [
    {
      tests: [
        ["up or down", '["up", "down"]'],
        ["red and black", '["red", "black"]'],
        ["back nor forth", '["back", "forth"]'],
        ["clubs, diamonds, hearts, spades", '["clubs", "diamonds", "hearts", "spades"]'],
        ["ace, 2, 3, 4, jack, queen or king", '["ace", 2, 3, 4, "jack", "queen", "king"]'],
        ["ace, 2 ... 5, jack, queen or king", '["ace", 2, 3, 4, 5, "jack", "queen", "king"]']
      ]
    }
  ]
})

lists.addRule(NumberRange, {
  syntax: "{start:number} ... {end:number}",
  tests: [
    {
      tests: [
        ["2 ... 4", "[2, 3, 4]"],
        ["4 ... 2", undefined],
        ["1.5 ... 3", undefined]
      ]
    }
  ]
})

lists.addRule(ValueChoices, {
  syntax: "[({known_constant}|{number}) (,|(or:or))]",
  tests: [
    {
      beforeEach(scope: P.Scope) {
        for (const name of ["jack", "queen", "king"]) scope.constants?.add(name)
      },
      tests: [
        ["jack or queen", '["jack", "queen"]'],
        ["jack, queen or king", '["jack", "queen", "king"]'],
        ["2 or 3", "[2, 3]"],
        ["jack, queen", undefined],
        ["jack or red", undefined]
      ]
    }
  ]
})

lists.addRule(BracketedList, {
  syntax: "\\[ [list:{expression} ,]? \\]",
  tests: [
    {
      title: "correctly matches literal lists",
      tests: [
        ["[]", "[]"],
        ["[1]", "[1]"],
        ["[1,]", "[1]"],
        ["[1,2,3]", "[1, 2, 3]"],
        ["[1, 2, 3]", "[1, 2, 3]"],
        ["[1,2,3,]", "[1, 2, 3]"],
        [`[yes,no,"a",1]`, `[true, false, "a", 1]`]
      ]
    },
    {
      title: "doesn't match malformed lists ",
      tests: [
        ["", undefined],
        ["[,1]", undefined]
      ]
    }
  ]
})

lists.addRule(CopyList, {
  syntax: "a (copy|duplicate) of list? {expression:operand} (as (a|an) {type:known_type})?",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("piles")
      },
      tests: [
        ["a copy of the piles", "core.duplicateList(piles)"],
        ["a duplicate of list the piles as a list", "core.duplicateList(piles, List)"]
      ]
    }
  ]
})

lists.addRule(MergeLists, {
  syntax: "merge lists? {expression:operand} ((as|into) (a|an) new? {type:known_type})?",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("piles")
      },
      tests: [
        ["merge the piles", "core.mergeLists(piles)"],
        ["merge the piles as a list", "core.mergeLists(piles, List)"]
      ]
    }
  ]
})

lists.addRule(ListLength, {
  syntax: "the? number of {arg:plural_identifier} (in|of) {list:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("bar")
      },
      tests: [
        ["number of items in my-list", "core.itemCountOf(myList)"],
        ["the number of foos in the foo of the bar", "core.itemCountOf(bar.foo)"],
        ["the number of items in [1,2,3]", "core.itemCountOf([1, 2, 3])"]
      ]
    }
  ]
})

lists.addRule(ListLength, {
  syntax: "the? number of {arg:plural_identifier} (in|of) {list:operand} where {inline_expression}?",
  tests: [
    {
      compileAs: "expression",
      showAll: true,
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
      },
      tests: [
        [
          "the number of items in my-list where its id > 1",
          "core.itemCountOf(core.filter(myList, (item) => item.id > 1))"
        ]
      ]
    }
  ]
})

lists.addRule(ListCount, {
  syntax: "the? number of {list:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(["a card is a thing", "a card has a suit as one of clubs, diamonds", "set x to 1"].join("\n"))
      },
      tests: [
        ["the number of card suits", "core.itemCountOf(Card.Suits)"],
        ["the number of [1, 2]", "core.itemCountOf([1, 2])"],
        { title: "not a list:  a property read", input: "the number of x", js: "x.number" }
      ]
    }
  ]
})

lists.addRule(ListPosition, {
  syntax: "the? position of {thing:expression} in {list:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("thing")
        scope.variables?.add("bar")
      },
      tests: [
        ["position of thing in my-list", "spellPosition(positionOf(myList, thing))"],
        ["the position of thing in the foo of the bar", "spellPosition(positionOf(bar.foo, thing))"],
        [`the position of "a" in ["a", "b", "c"]`, 'spellPosition(positionOf(["a", "b", "c"], "a"))']
      ]
    }
  ]
})

// ... and a kind's value, in its kind's own list (epic page `outline-spell`, P12):  `the position of its rank`
lists.addRule(ListPosition, {
  syntax: "the? position of {thing:expression}",
  tests: [
    // ... or a property's own list:  `its "rank" is one of ...`
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.parse(
          [
            "a card is a thing",
            "a card has a rank as one of ace, 2, 3, 4, 5, 6, 7, 8, 9, 10, jack, queen, king",
            "card = a new card"
          ].join("\n"),
          "block"
        )
      },
      tests: [["the position of the rank of card", "spellPosition(positionOf(Card.Ranks, card.rank))"]]
    }
  ]
})

lists.addRule(StartsWith, {
  syntax: "{operator:starts_with_or_not} {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("thing")
      },
      tests: [
        ["my-list starts with thing", "core.startsWith(myList, thing)"],
        ["[1,2,3] starts with 1", "core.startsWith([1, 2, 3], 1)"],
        ["[1,2,3] does not start with 10", "!core.startsWith([1, 2, 3], 10)"],
        ["[1,2,3] doesn't start with 10", "!core.startsWith([1, 2, 3], 10)"],
        ["[1,2,3] doesnt start with 10", "!core.startsWith([1, 2, 3], 10)"]
      ]
    }
  ]
})

lists.addRule(EndsWith, {
  syntax: "{operator:ends_with_or_not} {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("thing")
      },
      tests: [
        ["my-list ends with thing", "core.endsWith(myList, thing)"],
        ["[1,2,3] ends with 1", "core.endsWith([1, 2, 3], 1)"],
        ["[1,2,3] does not end with 10", "!core.endsWith([1, 2, 3], 10)"],
        ["[1,2,3] doesnt end with 10", "!core.endsWith([1, 2, 3], 10)"],
        ["[1,2,3] doesn't end with 10", "!core.endsWith([1, 2, 3], 10)"]
      ]
    }
  ]
})

lists.addRule(
  Ordinal.specialize({
    pattern: /^(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|penultimate|final|last|top|bottom)$/,
    VALUE_MAP: {
      first: 1,
      second: 2,
      third: 3,
      fourth: 4,
      fifth: 5,
      sixth: 6,
      seventh: 7,
      eighth: 8,
      ninth: 9,
      tenth: 10,
      penultimate: -2,
      final: -1,
      last: -1,
      top: 1,
      bottom: -1
    }
  }),
  {
    tests: [
      {
        tests: [
          ["first", 1],
          ["second", 2],
          ["third", 3],
          ["fourth", 4],
          ["fifth", 5],
          ["sixth", 6],
          ["seventh", 7],
          ["eighth", 8],
          ["ninth", 9],
          ["tenth", 10],

          ["penultimate", -2],
          ["final", -1],
          ["last", -1],

          ["top", 1],
          ["bottom", -1]
        ]
      }
    ]
  }
)

lists.addRule(PositionExpression, {
  syntax: "{arg:singular_identifier} {position:expression} of {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("deck")
        scope.variables?.add("n")
      },
      tests: [
        ["item 1 of my-list", "core.getItemAt(myList, 0)"],
        ["card 10 of deck", "core.getItemAt(deck, 9)"],
        ["card n of the cards of the deck", "core.getItemAt(deck.cards, position(n))"]
      ]
    }
  ]
})

lists.addRule(OrdinalPositionExpression, {
  syntax: "the {ordinal} {arg:singular_identifier} (in|of) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("deck")
        scope.variables?.add("words")
      },
      tests: [
        ["the first item of my-list", "core.getItemAt(myList, 0)"],
        ["the tenth card of deck", "core.getItemAt(deck, 9)"],
        ["the penultimate word in words", "core.getItemAt(words, -2)"]
      ]
    }
  ]
})

lists.addRule(OrdinalWhereExpression, {
  syntax: "the {ordinal} {arg:singular_identifier} (in|of) {list:expression} where {inline_expression}?",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
      },
      tests: [
        ["the first item in my-list where its id > 1", "core.getItemAt(core.filter(myList, (item) => item.id > 1), 0)"]
      ]
    }
  ]
})

lists.addRule(RandomItemExpression, {
  syntax: "a random {arg:singular_identifier} (of|from|in) {list:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("deck")
      },
      tests: [
        ["a random item of my-list", "core.randomItemOf(myList)"],
        [`a random word in "some words"`, `core.randomItemOf("some words")`],
        ["a random card from the deck", "core.randomItemOf(deck)"]
      ]
    }
  ]
})

lists.addRule(RandomItemsExpression, {
  syntax: "{number} random {arg:plural_identifier} (of|from|in) {list:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("deck")
      },
      tests: [
        ["2 random items of my-list", "core.randomItemsOf(myList, 2)"],
        [`2 random words in "some other words"`, `core.randomItemsOf("some other words", 2)`],
        ["3 random cards from deck", "core.randomItemsOf(deck, 3)"]
      ]
    }
  ]
})

lists.addRule(RangeBetweenExpression, {
  syntax: "{arg:variable} {start:expression} to {end:expression} (of|in|from) {list:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("deck")
      },
      tests: [
        ["item 1 to 2 of my-list", "core.rangeBetween(myList, 0, 2)"],
        [`word 2 to 3 in "some other words"`, 'core.rangeBetween("some other words", 1, 3)'],
        ["card 1 to 3 from deck", "core.rangeBetween(deck, 0, 3)"]
      ]
    }
  ]
})

lists.addRule(RangeStartingWithExpression, {
  syntax: "{arg:plural_identifier} (in|of) {list:expression} starting with {thing:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("thing")
      },
      tests: [
        [
          "items in my-list starting with thing",
          "core.rangeStartingAt(myList, position(spellPosition(positionOf(myList, thing))))"
        ],
        [
          `words in "some words" starting with "some"`,
          'core.rangeStartingAt("some words", position(spellPosition(positionOf("some words", "some"))))'
        ]
      ]
    }
  ]
})

lists.addRule(RangeCountExpression, {
  syntax: "{ordinal} {number} {arg:plural_identifier} (of|in|from) {list:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("deck")
      },
      tests: [
        ["top 2 items of my-list", "core.rangeStartingAt(myList, 0, 2)"],
        [`first 2 words in "some other words"`, 'core.rangeStartingAt("some other words", 0, 2)'],
        ["last two cards from deck", "core.rangeStartingAt(deck, -2, 2)"],
        ["penultimate two cards from deck", "core.rangeStartingAt(deck, -3, 2)"]
      ]
    }
  ]
})

lists.addRule(ListFilter, {
  syntax: "the? {arg:plural_identifier} (in|of) {list:expression} where {inline_expression}?",
  tests: [
    {
      compileAs: "expression",
      showAll: true,
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
      },
      tests: [
        [`words in "a word list" where`, 'core.filter("a word list", () => {})'],
        [
          `words in "a word list" where word starts with "a"`,
          'core.filter("a word list", (word) => core.startsWith(word, "a"))',
          'core.filter("a word list", (word: string) => core.startsWith(word, "a"))'
        ],
        ["the items in my-list where the id of the item > 1", "core.filter(myList, (item) => item.id > 1)"],
        ["the items in my-list where the id of it > 1", "core.filter(myList, (item) => item.id > 1)"],
        ["the items in my-list where its id > 1", "core.filter(myList, (item) => item.id > 1)"]
      ]
    }
  ]
})

lists.addRule(ListMembershipTest, {
  syntax: "{operator:has_or_has_no} {arg:plural_identifier} where {inline_expression}?",
  tests: [
    {
      compileAs: "expression",
      showAll: true,
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("bar")
      },
      tests: [
        ["my-list has items where", "core.any(myList, () => {})"],
        ["my-list has items where the item is 1", "core.any(myList, (item) => item === 1)"],
        ["my-list has items where it is 1", "core.any(myList, (item) => item === 1)"],
        ["my-list has items where its foo is 1", "core.any(myList, (item) => item.foo === 1)"],
        ["my-list has no items where item is 1", "!core.any(myList, (item) => item === 1)"],
        ["my-list has no items where it is 1", "!core.any(myList, (item) => item === 1)"],
        ["my-list doesnt have items where item is 1", "!core.any(myList, (item) => item === 1)"],
        ["the foo of the bar does not have items where item is 1", "!core.any(bar.foo, (item) => item === 1)"]
      ]
    }
  ]
})

lists.addRule(ListAdd, {
  syntax: "add {thing:expression} to (the {method:list_end} of)? {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("thing")
      },
      tests: [
        ["add thing to the start of my-list", "core.prepend(myList, thing)"],
        ["add thing to the front of my-list", "core.prepend(myList, thing)"],
        ["add thing to the top of my-list", "core.prepend(myList, thing)"],

        ["add thing to my-list", "core.append(myList, thing)"],
        ["add thing to the end of my-list", "core.append(myList, thing)"],
        ["add thing to the back of my-list", "core.append(myList, thing)"],
        ["add thing to the bottom of my-list", "core.append(myList, thing)"]
      ]
    }
  ]
})

lists.addRule(ListPrepend, {
  syntax: "prepend {thing:expression} to {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("thing")
      },
      tests: [["prepend thing to my-list", "core.prepend(myList, thing)"]]
    }
  ]
})

lists.addRule(ListAppend, {
  syntax: "append {thing:expression} to {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("thing")
      },
      tests: [["append thing to my-list", "core.append(myList, thing)"]]
    }
  ]
})

lists.addRule(ListAddRelative, {
  syntax: "add {thing:expression} to {list:expression} {operator:before_or_after} {item:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("thing")
        scope.variables?.add("other-thing")
      },
      tests: [
        ["add thing to my-list before other-thing", "core.addBefore(myList, otherThing, thing)"],
        ["add thing to my-list after other-thing", "core.addAfter(myList, otherThing, thing)"]
      ]
    }
  ]
})

lists.addRule(ListEmpty, {
  syntax: "(empty|clear) {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
        scope.variables?.add("deck")
      },
      tests: [
        ["empty my-list", "core.clear(myList)"],
        ["clear the cards of the deck", "core.clear(deck.cards)"]
      ]
    },
    {
      title: "a value that isn't a list goes back to its empty one",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.parse(
          [
            "a sign is a thing",
            "a sign has a hint as text",
            "a sign has a count as a number",
            "a sign has a lit as yes or no"
          ].join("\n"),
          "block"
        )
      },
      tests: [
        [
          "to reset a sign\n\tclear its hint\n\tclear its count\n\tclear its lit",
          ["Sign.prototype.reset = function () {", '  this.hint = ""', "  this.count = 0", "  this.lit = false", "}"],
          [
            "export interface Sign { reset(): any /* spell: type unknown */ }",
            "Sign.prototype.reset = function (this: Sign) {",
            '  this.hint = ""',
            "  this.count = 0",
            "  this.lit = false",
            "}"
          ]
        ]
      ]
    }
  ]
})

lists.addRule(ListRemoveOrdinal, {
  syntax: "remove the? {position:ordinal} {arg:singular_identifier} of {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("deck")
      },
      tests: [
        ["remove last card of deck", "core.removeItemAt(deck, -1)"],
        ["remove the first card of the deck", "core.removeItemAt(deck, 0)"]
      ]
    }
  ]
})

lists.addRule(ListRemovePosition, {
  syntax: "remove {arg:singular_identifier} {number:expression} of {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
      },
      tests: [["remove item 4 of my-list", "core.removeItemAt(myList, 3)"]]
    }
  ]
})

lists.addRule(ListRemoveRange, {
  syntax: "remove {arg:plural_identifier} {start:expression} to {end:expression} of {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("my-list")
      },
      tests: [["remove items 2 to 4 of my-list", "core.removeRangeBetween(myList, 1, 4)"]]
    }
  ]
})

lists.addRule(ListRemoveRangeOrdinal, {
  syntax: "remove {start:ordinal} to {end:ordinal} {arg:plural_identifier} of {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("deck")
      },
      tests: [["remove first to third cards of the deck", "core.removeRangeBetween(deck, 0, 3)"]]
    }
  ]
})

lists.addRule(ListRemove, {
  syntax: "remove {thing:expression} from {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("thing")
        scope.variables?.add("my-list")
      },
      tests: [["remove thing from my-list", "core.remove(myList, thing)"]]
    }
  ]
})

lists.addRule(ListRemoveWhere, {
  syntax: "remove {arg:plural_identifier} (in|of|from) {list:expression} where {inline_expression}?",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("deck")
        scope.variables?.add("my-list")
        scope.constants?.add("clubs")
      },
      tests: [
        ["remove items from my-list where", "core.removeWhere(myList, () => {})"],
        [`remove items from my-list where item is not "ace"`, 'core.removeWhere(myList, (item) => item !== "ace")'],
        [
          "remove cards in deck where the suit of the card is clubs",
          'core.removeWhere(deck, (card) => card.suit === "clubs")'
        ],
        [
          "remove cards in deck where the suit of it is clubs",
          'core.removeWhere(deck, (card) => card.suit === "clubs")'
        ],
        ["remove cards in deck where its suit is clubs", 'core.removeWhere(deck, (card) => card.suit === "clubs")']
      ]
    }
  ]
})

lists.addRule(ListMove, {
  syntax: "move {thing:expression} to {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("card")
        scope.variables?.add("tableau")
      },
      tests: [
        ["move card to tableau", "core.move(card, tableau)"],
        ["if move card to tableau then print 1", "if (core.move(card, tableau)) core.console.log(1)"]
      ]
    }
  ]
})

lists.addRule(CanTake, {
  syntax: "{operator:can_or_cannot} (add|take) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("card")
        scope.variables?.add("tableau")
      },
      tests: [
        ["tableau can take card", "core.canTake(tableau, card)"],
        ["tableau can add card", "core.canTake(tableau, card)"],
        ["tableau cannot take card", "!core.canTake(tableau, card)"]
      ]
    }
  ]
})

lists.addRule(CanGiveUp, {
  syntax: "{operator:can_or_cannot} (release|remove|give up|let go of) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("card")
        scope.variables?.add("stock")
      },
      tests: [
        ["stock can give up card", "core.canGiveUp(stock, card)"],
        ["stock can let go of card", "core.canGiveUp(stock, card)"],
        ["stock can't release card", "!core.canGiveUp(stock, card)"]
      ]
    }
  ]
})

lists.addRule(ListReverse, {
  syntax: "reverse (the? {arg:plural_identifier} (in|of))? {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("deck")
        scope.variables?.add("my-list")
      },
      tests: [
        ["reverse the cards of the deck", "core.reverse(deck)"],
        ["reverse my-list", "core.reverse(myList)"]
      ]
    }
  ]
})

lists.addRule(ListShuffle, {
  syntax: "(randomize|shuffle) (the? {arg:plural_identifier} (in|of))? {list:expression}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("deck")
        scope.variables?.add("my-list")
      },
      tests: [
        ["shuffle cards of deck", "core.randomize(deck)"],
        ["shuffle the cards of the deck", "core.randomize(deck)"],
        ["randomize my-list", "core.randomize(myList)"]
      ]
    }
  ]
})

lists.addRule(RepeatNTimes, {
  syntax: "repeat {number:expression} (time|times) :? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "No statements",
          input: "repeat 1 time:",
          js: "core.map(core.countTo(1), () => {})"
        },
        {
          title: "Inline statement",
          input: "repeat 3 times: print the number",
          js: "core.map(core.countTo(3), (number) => core.console.log(number))"
        },
        {
          title: "Nested block statement",
          input: ["repeat 3 times:", "\tprint it"],
          js: "core.map(core.countTo(3), (number) => core.console.log(number))"
        },
        {
          title: "Error if nested block and inline statement",
          input: ["repeat 3 times: print 1", "\tprint it"],
          js: [
            "core.map(core.countTo(3), (number) => core.console.log(number))",
            "/* PARSE ERROR: Got both inline statement and nested block */"
          ]
        }
      ]
    }
  ]
})

lists.addRule(ListIteration, {
  syntax:
    "for each? {item:singular_identifier} ((and|,) {position:singular_identifier})? (in|of) {list:expression} :? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("deck")
        scope.variables?.add("my-list")
        scope.variables?.add("messages")
      },
      tests: [
        ["for each card in deck:", "core.map(deck, () => {})"],
        ["for item, index in my-list:", "core.map(myList, () => {})"],
        [
          `for each card in deck: set the direction of the card to "down"`,
          'core.map(deck, (card) => (card.direction = "down"))'
        ],
        [
          `for each card in deck: set the direction of it to "down"`,
          'core.map(deck, (card) => (card.direction = "down"))'
        ],
        [
          "for message, index in messages: add message + index to messages",
          "core.map(messages, withSpellPositions((message, index) => core.append(messages, message + index)))",
          "core.map(messages, withSpellPositions((message, index: number) => core.append(messages, message + index)))"
        ],
        [
          "for message, index in messages: add it + index to messages",
          "core.map(messages, withSpellPositions((message, index) => core.append(messages, message + index)))",
          "core.map(messages, withSpellPositions((message, index: number) => core.append(messages, message + index)))"
        ],
        [
          "for message, index in messages: set its list to messages",
          "core.map(messages, (message) => (message.list = messages))"
        ],

        [
          `for each card in deck:\n\tset the direction of the card to "down"`,
          'core.map(deck, (card) => (card.direction = "down"))'
        ],
        [
          [`for each card in deck:`, `\tset the direction of it to "down"`],
          'core.map(deck, (card) => (card.direction = "down"))'
        ],
        [
          [`for each card in deck:`, `\tset the direction of the card to "down"`, `\tset the value of the card to 10`],
          [`core.map(deck, (card) => {`, `  card.direction = "down"`, `  card.value = 10`, `})`]
        ],
        [
          ["for message and index in messages:", "\tif index is greater than 2 add message to messages"],
          [
            "core.map(messages, withSpellPositions((message, index) => {",
            "  if (index > 2) core.append(messages, message)",
            "}))"
          ],
          [
            "core.map(messages, withSpellPositions((message, index: number) => {",
            "  if (index > 2) core.append(messages, message)",
            "}))"
          ]
        ]
      ]
    }
  ]
})

// the item named for a value kind of several words (epic `spanish` P22)
lists.addRule(ListIteration, {
  syntax: "for each? {item:kind_name} (in|of) {list:expression} :? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.compile(["a card is a thing", "a card has a rank as one of ace, 2, 3"].join("\n"), "block")
      },
      tests: [
        [
          "for each card rank in card ranks: print card rank",
          "core.map(Card.Ranks, (cardRank) => core.console.log(cardRank))",
          "core.map(Card.Ranks, (cardRank: (typeof Card.Ranks)[number]) => core.console.log(cardRank))"
        ],
        [
          ["for each card rank in card ranks:", "\tprint it"],
          "core.map(Card.Ranks, (cardRank) => core.console.log(cardRank))",
          "core.map(Card.Ranks, (cardRank: (typeof Card.Ranks)[number]) => core.console.log(cardRank))"
        ]
      ]
    }
  ]
})

lists.addRule(ListRangeIteration, {
  syntax: "for each? {item:singular_identifier} from {start:expression} down? to {end:expression} :? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        ["for each number from 1 to 10:", "core.getRange(1, 10).forEach(() => {})"],
        [
          "for each number from 1 to 10: print the number",
          "core.getRange(1, 10).forEach((number) => core.console.log(number))"
        ],
        [
          "for each number from 1 to 10:\n\tprint the number",
          "core.getRange(1, 10).forEach((number) => core.console.log(number))"
        ]
      ]
    }
  ]
})
