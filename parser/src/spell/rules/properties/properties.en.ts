/**
 * The `properties` rules in English:  each rule's syntax and its tests, registered on the `properties` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `properties.<lang>.ts` (epic `spanish`).
 */
import { P } from "spell-parser/parser"

import { properties } from "./properties.parser"
import { BodyMemberWords } from "./BodyMemberWords"
import { ItsKnownProperty } from "./ItsKnownProperty"
import { ItsOrdinal } from "./ItsOrdinal"
import { ItsProperty } from "./ItsProperty"
import { MemberWords } from "./MemberWords"
import { ObjectLiteralProperties } from "./ObjectLiteralProperties"
import { ObjectLiteralProperty, NamedObjectLiteralProperty, FlagObjectLiteralProperty } from "./ObjectLiteralProperty"
import { Property } from "./Property"
import { PropertyExpression } from "./PropertyExpression"
import { QuotedMember } from "./QuotedMember"

properties.addRule(Property)

properties.addRule(MemberWords, {
  tests: [
    {
      tests: [
        { title: "one word", input: "rank", js: "rank" },
        { title: "several words", input: "short rank", js: "shortRank" },
        { title: "a blacklisted word", input: "short", js: "short" },
        { title: "dashed", input: "short-rank", js: "shortRank" },
        { title: "a structural word", input: "of", js: undefined },
        { title: "a leading preposition", input: "with jokers", js: "withJokers" },
        { title: "a preposition after the first word ends it", input: "jokers with", js: "jokers" }
      ]
    }
  ]
})

properties.addRule(BodyMemberWords, {
  tests: [
    {
      tests: [
        { title: "a name", input: "short rank", js: "shortRank" },
        { title: "a statement's first word", input: "return x", js: undefined }
      ]
    }
  ]
})

properties.addRule(QuotedMember, {
  tests: [
    {
      tests: [
        { title: "one word", input: '"rank"', js: "rank" },
        { title: "several words", input: '"short rank"', js: "shortRank" },
        { title: "dashed", input: '"short-rank"', js: "shortRank" },
        { title: "a leading preposition", input: '"with jokers"', js: "withJokers" },
        { title: "a structural word inside (epic `spanish` P14)", input: '"side of play"', js: "sideOfPlay" },
        { title: "a structural word last", input: '"what if"', js: "whatIf" },
        { title: "a structural word first", input: '"of play"', js: undefined }
      ]
    }
  ]
})

properties.addRule(PropertyExpression, {
  syntax: "the {property:member_words} of {expression:operand}",
  tests: [
    {
      title: "resolved:  what the type declares",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(
          [
            "a card is a thing",
            "a card has a suit as one of clubs, diamonds",
            "the short rank of a card is: 1",
            "the long-name of a card is: 2",
            "a deck is a list of cards",
            "the last card of a deck is: its bottom card",
            "the card is a new card",
            "the deck is a new deck"
          ].join("\n"),
          "block"
        )
      },
      tests: [
        ["the short rank of the card", "card.shortRank"],
        ["the short-rank of the card", "card.shortRank"],
        ["the long name of the card", "card.longName"],
        ["the last card of the deck", "deck.lastCard"],
        ["the short rank of the last card of the deck", "deck.lastCard.shortRank"],
        ["the suit of the card", "card.suit"],
        ["the suits of the card", "Card.Suits"]
      ]
    },
    {
      title: "built in:  as the type's table entry compiles it -- see `SP.BUILT_IN_TYPE_TABLE`",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add({ name: "name", datatype: "text" })
        scope.variables?.add({ name: "deck", datatype: "list" })
        scope.variables?.add({ name: "due", datatype: "date" })
        scope.variables?.add("bar")
      },
      tests: [
        ["the length of the name", "name.length"],
        ["the length of the deck", "core.itemCountOf(deck)"],
        ["the year of the due", "due.getFullYear()"],
        { title: "unknown type:  a loose read, as before", input: "the length of bar", js: "bar.length" }
      ]
    },
    {
      title: "loose:  one word, nothing need declare",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("bar")
        scope.variables?.add("baz")
      },
      tests: [
        ["the foo of bar", "bar.foo"],
        ["the foo of the bar", "bar.foo"],
        ["the foo of the bar of the baz", "baz.bar.foo"],
        ["the foo-bar of the baz", "baz.fooBar"],
        { title: "several undeclared words:  not a property read", input: "the foo bar of the baz", js: undefined },
        { title: "a blacklisted word:  not a loose read", input: "the if of the baz", js: undefined }
      ]
    }
  ]
})

properties.addRule(ItsKnownProperty, {
  syntax: "its {property:member_words}",
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.compile(["a card is a thing", "the short rank of a card is: 1"].join("\n"), "block")
      },
      tests: [
        [
          ["get a new card", "print its short rank"],
          ["const it = new Card()", "core.console.log(it.shortRank)"]
        ],
        [
          ["get a new card", "print its short rank + 1"],
          ["const it = new Card()", "core.console.log(it.shortRank + 1)"]
        ]
      ]
    }
  ]
})

properties.addRule(ItsProperty, {
  syntax: "its {property}",
  tests: [
    {
      title: "tracks `it` when it var defined explicitly",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add({ name: "it", output: "it" })
      },
      tests: [
        ["its foo", "it.foo"],
        ["the foo of its bar", "it.bar.foo"]
      ]
    },
    {
      title: "tracks `it` when it var defined via get",
      compileAs: "block",
      tests: [
        [
          ["get a new thing", "print its foo"],
          ["const it = new Thing()", "core.console.log(it.foo)"]
        ]
      ]
    },
    {
      title: "tracks `it` when it var defined as output `other`",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add({ name: "it", output: "other" })
      },
      tests: [
        ["its foo", "other.foo"],
        ["the foo of its bar", "other.bar.foo"]
      ]
    },
    {
      title: "maps to `this` when `it` is not defined",
      compileAs: "expression",
      tests: [
        ["its foo", "this.foo"],
        ["the foo of its bar", "this.bar.foo"]
      ]
    }
  ]
})

properties.addRule(ItsOrdinal, {
  syntax: "its {ordinal} {arg:singular_identifier}",
  tests: [
    {
      title: "tracks `it` when it var defined explicitly",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add({ name: "it", output: "it" })
      },
      tests: [
        ["its third foo", "core.getItemAt(it, 2)"],
        ["its last card", "core.getItemAt(it, -1)"]
      ]
    },
    {
      title: "tracks `it` when it var defined via get",
      compileAs: "block",
      tests: [
        [
          ["get a new thing", "print its last item"],
          ["const it = new Thing()", "core.console.log(core.getItemAt(it, -1))"],
          ["const it = new Thing()", "core.console.log(core.getItemAt(it, -1)!)"]
        ]
      ]
    },
    {
      title: "tracks `it` when it var defined as output `other`",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add({ name: "it", output: "other" })
      },
      tests: [["its third thing", "core.getItemAt(other, 2)"]]
    },
    {
      title: "maps to `this` when `it` is not defined",
      compileAs: "expression",
      tests: [["its third thing", "core.getItemAt(this, 2)"]]
    }
  ]
})

properties.addRule(ObjectLiteralProperty, {
  syntax: "(property:{member_words}|{property}) (=|is|of) {value:expression}",
  tests: [
    {
      beforeEach(scope: P.Scope) {
        scope.variables?.add("bar")
      },
      tests: [
        [``, undefined],
        [`a = 1`, `a: 1`],
        [`b = yes`, `b: true`],
        [`c = "quoted"`, `c: "quoted"`],
        [`b = the foo of the bar`, `b: bar.foo`],

        [`length is 1`, `length: 1`],
        [`rank of "queen"`, `rank: "queen"`],
        [`short rank is 1`, "shortRank: 1"],

        // TODO: `{property}` converts to `foo_bar` before we get here
        [`foo-bar = 1`, "fooBar: 1"]
      ]
    }
  ]
})

properties.addRule(NamedObjectLiteralProperty, {
  syntax: "{property} {value:thing_name}",
  tests: [
    {
      tests: [
        [`name T1`, `name: "T1"`],
        [`name t1`, undefined]
      ]
    }
  ]
})

properties.addRule(FlagObjectLiteralProperty, {
  syntax: "{property}",
  tests: [{ tests: [[`jokers`, `jokers: true`]] }]
})

properties.addRule(ObjectLiteralProperties, {
  syntax: "[{object_literal_property} (,|and)]",
  tests: [
    {
      beforeEach(scope: P.Scope) {
        scope.variables?.add("bar")
      },
      tests: [
        [``, undefined],
        [`a = 1`, `{ a: 1 }`],
        [`a = 1,`, `{ a: 1 }`],
        [`a = 1, b = yes, c = "quoted"`, [`{`, `  a: 1,`, `  b: true,`, `  c: "quoted"`, `}`]],
        [`a = 1, b = the foo of the bar`, `{ a: 1, b: bar.foo }`],

        [`length is 1, rank of "queen"`, `{ length: 1, rank: "queen" }`],

        // TODO: `{property}` converts to `foo_bar` before we get here
        [`foo-bar = 1`, "{ fooBar: 1 }"]
      ]
    }
  ]
})
