/**
 * The `classes` rules in English:  each rule's syntax and its tests, registered on the `classes` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in the order the rules were registered before (`index.ts`):  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `classes.<lang>.ts` (epic `spanish`).
 */
import { P } from "spell-lang/parser"
import { Wording } from "spell-lang/spell/rules/expressions"

import { classes } from "./classes.parser"
import { AThingsProperty } from "./AThingsProperty"
import { BelongsToOne } from "./BelongsToOne"
import { CanBelongToMany } from "./CanBelongToMany"
import { ClassMember } from "./ClassMember"
import { CreateDrawableListType } from "./CreateDrawableListType"
import { CreateListType } from "./CreateListType"
import { CreateOneOfAKind } from "./CreateOneOfAKind"
import { CreateThing } from "./CreateThing"
import { CreateType } from "./CreateType"
import { CSSBlock } from "./CSSBlock"
import { DefinePropertyHas, RULES } from "./DefinePropertyHas"
import { DrawSide } from "./DrawSide"
import { EveryThing } from "./EveryThing"
import { ItsQuotedProperty } from "./ItsQuotedProperty"
import { ListGuard, CAN_MOVE, CAN_NEVER_MOVE } from "./ListGuard"
import { MarkdownDescription } from "./MarkdownDescription"
import { MustRule } from "./MustRule"
import { NamedThing } from "./NamedThing"
import { NewList } from "./NewList"
import { NewThing } from "./NewThing"
import { OutlineSpecifierDatatype } from "./OutlineSpecifierDatatype"
import { OutlineSpecifierEnum } from "./OutlineSpecifierEnum"
import { OutlineSpecifierInstance } from "./OutlineSpecifierInstance"
import { OutlineSpecifierList } from "./OutlineSpecifierList"
import { OutlineSpecifierTextKind } from "./OutlineSpecifierTextKind"
import { OutlineSpecifierYesOrNo } from "./OutlineSpecifierYesOrNo"
import { PatternText } from "./PatternText"
import { PropertyBodyMust } from "./PropertyBodyMust"
import { PropertyMust } from "./PropertyMust"
import { PropertyValueEither } from "./PropertyValueEither"
import { PropertyValueGetter } from "./PropertyValueGetter"
import { QuotedPropertyFormula } from "./QuotedPropertyFormula"
import { ReopenType } from "./ReopenType"
import { RuleSuggestion } from "./RuleSuggestion"
import { SavedInFile } from "./SavedInFile"
import { SavedInline } from "./SavedInline"
import { ThePropertyOfAThing } from "./ThePropertyOfAThing"
import { TheThings } from "./TheThings"
import { ThingAtPlace } from "./ThingAtPlace"
import { ThingName } from "./ThingName"
import { TypeSpecifierDatatype } from "./TypeSpecifierDatatype"
import { TypeSpecifierEnum } from "./TypeSpecifierEnum"
import { TypeSpecifierInstance } from "./TypeSpecifierInstance"
import { TypeSpecifierTextKind } from "./TypeSpecifierTextKind"
import { TypeSpecifierYesOrNo } from "./TypeSpecifierYesOrNo"
import { UpgradeMethod } from "./UpgradeMethod"
import { ValueKind } from "./ValueKind"
import { VersionStep } from "./VersionStep"
import { WithNestedStatements } from "./WithNestedStatements"

////////////////
// ## Word rules:  each language's words for one thing, and what each form means (`Wording`)
////////////////

// Which way a list's item moves, for `list_guard`:  `a pile can let go of a card if: ...` means `give_up`
classes.addRule(Wording.specialize({ ruleName: "take_or_give_up", meanings: ["take", "give_up"] }), {
  syntax: "((take:add|take)|(give_up:release|remove|give up|let go of))"
})

// Which bound, for `must_rule`:  `be at least 3 letters long`
classes.addRule(Wording.specialize({ ruleName: "at_least_or_at_most", meanings: ["at_least", "at_most"] }), {
  syntax: "((at_least:at least)|(at_most:at most))"
})

// Which kind of text, for `must_rule` and `type_specifier_text_kind`:  `as a url`, `must be an email`
classes.addRule(Wording.specialize({ ruleName: "url_or_email", meanings: ["url", "email"] }), {
  syntax: "((url:url)|(email:email))"
})

// What a side's quoted name starts with, for `draw_side`:  `to "draw its front":`
classes.addRule(P.Sequence.specialize({ ruleName: "draw_its" }), { syntax: "draw its" })

classes.addRule(WithNestedStatements, {
  syntax: "(where|with)? :",
  tests: [
    {
      // matched only:  its statement compiles, never this
      compileAs: "with_nested_statements",
      tests: [
        ["where:", "where :"],
        ["with:", "with :"],
        [":", ":"]
      ]
    }
  ]
})

// ... and `where` with no colon (P10)
classes.addRule(WithNestedStatements, {
  syntax: "where",
  tests: [{ compileAs: "with_nested_statements", tests: [["where", "where"]] }]
})

classes.addRule(CreateType, {
  syntax: "(a|an) {type:type_words} (aka {aka:singular_type})? is (a|an) {superType:type} {with_nested_statements}?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        ["a card is a thing", "export class Card extends Thing {}"],
        ["a deck is a list", "export class Deck extends List {}"],
        ["a bank account is a thing", "export class BankAccount extends Thing {}"],
        ["a bank account aka account is a thing", "export class BankAccount extends Thing {}"],
        [
          "a card is a drawable thing",
          [
            "export class Card extends Drawable {",
            '  static elementTag = core.defineElement(this, "test_classes")',
            "}"
          ],
          [
            "export class Card extends Drawable {",
            '  static elementTag = core.defineElement(this, "test_classes")',
            "}",
            "",
            "/**",
            " * `<test-classes-card>`:  a card, drawn in its own element, e.g. by `draw the card`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its card's properties;  its methods call its card's.",
            " * - What every drawable thing's element does, e.g. drawing its card, is `SpellElement`'s.",
            " */",
            "export class CardElement extends SpellElement<Card> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-classes-card", "card", [])',
            "}",
            "core.useElement(Card, CardElement)"
          ]
        ],
        [
          "a card is a drawable",
          [
            "export class Card extends Drawable {",
            '  static elementTag = core.defineElement(this, "test_classes")',
            "}"
          ],
          [
            "export class Card extends Drawable {",
            '  static elementTag = core.defineElement(this, "test_classes")',
            "}",
            "",
            "/**",
            " * `<test-classes-card>`:  a card, drawn in its own element, e.g. by `draw the card`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its card's properties;  its methods call its card's.",
            " * - What every drawable thing's element does, e.g. drawing its card, is `SpellElement`'s.",
            " */",
            "export class CardElement extends SpellElement<Card> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-classes-card", "card", [])',
            "}",
            "core.useElement(Card, CardElement)"
          ]
        ],
        [
          "a pile is a drawable list",
          [
            "export class Pile extends DrawableList {",
            '  static elementTag = core.defineElement(this, "test_classes")',
            "}"
          ],
          [
            "export class Pile extends DrawableList {",
            '  static elementTag = core.defineElement(this, "test_classes")',
            "}",
            "",
            "/**",
            " * `<test-classes-pile>`:  a pile, drawn in its own element, e.g. by `draw the pile`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its pile's properties;  its methods call its pile's.",
            " * - What every drawable thing's element does, e.g. drawing its pile, is `SpellElement`'s.",
            " */",
            "export class PileElement extends SpellElement<Pile> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-classes-pile", "pile", [])',
            "}",
            "core.useElement(Pile, PileElement)"
          ]
        ]
      ]
    },
    {
      compileAs: "block",
      tests: [
        ["a card is a thing where:", "export class Card extends Thing {}"],
        ["a card is a thing:", "export class Card extends Thing {}"],
        [
          ["a card is a thing with:", "\t- it has a rank as a number"],
          [
            "export class Card extends Thing {",
            "  // - it has a rank as a number",
            '  static { this.declareProp("rank", { type: "number" }) }',
            '  get rank() { return this.getProp("rank") }',
            '  set rank(value) { this.setProp("rank", value) }',
            "}"
          ],
          [
            "export class Card extends Thing {",
            "  // - it has a rank as a number",
            '  @prop({ type: "number" })',
            "  accessor rank!: number",
            "}"
          ]
        ]
      ]
    }
  ]
})

classes.addRule(CreateType, {
  syntax: "(a|an) {type:quoted_type} is (a|an) {superType:type} {with_nested_statements}?",
  tests: [
    { compileAs: "statement", tests: [['a "card" is a thing', "export class Card extends Thing {}"]] },
    { compileAs: "block", tests: [['a "card" is a thing where:', "export class Card extends Thing {}"]] }
  ]
})

classes.addRule(CreateOneOfAKind, {
  syntax: "{type:type_words} is (a|an) {superType:type} {with_nested_statements}?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        ["solitaire is an app", ["export class Solitaire extends App {}", "export const solitaire = new Solitaire()"]],
        ["solitaire is a thing", undefined]
      ]
    }
  ]
})

classes.addRule(CreateListType, {
  syntax: "create a type (named|called) {type} as (a|an) list of {instanceType:type}",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [
          "create a type named hand as a list of cards",
          ["export class Hand extends List {", "  static instanceType = Card", "}"],
          ["export class Hand extends List<Card> {", "  static instanceType = Card", "}"]
        ]
      ]
    }
  ]
})

// TODO: "{plural_type} are a list of ..."
classes.addRule(CreateListType, {
  syntax:
    "(a|an) {type:type_words} (aka {aka:singular_type})? is (a|an) list of {instanceType:type} {with_nested_statements}?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [
          "a deck is a list of cards",
          ["export class Deck extends List {", "  static instanceType = Card", "}"],
          ["export class Deck extends List<Card> {", "  static instanceType = Card", "}"]
        ]
      ]
    },
    {
      compileAs: "block",
      tests: [
        [
          "a deck is a list of cards with:",
          ["export class Deck extends List {", "  static instanceType = Card", "}"],
          ["export class Deck extends List<Card> {", "  static instanceType = Card", "}"]
        ]
      ]
    }
  ]
})

classes.addRule(CreateListType, {
  syntax: "(a|an) {type:quoted_type} is (a|an) list of {instanceType:type} {with_nested_statements}?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [
          'a "deck" is a list of cards',
          ["export class Deck extends List {", "  static instanceType = Card", "}"],
          ["export class Deck extends List<Card> {", "  static instanceType = Card", "}"]
        ]
      ]
    },
    {
      compileAs: "block",
      tests: [
        [
          'a "deck" is a list of cards with:',
          ["export class Deck extends List {", "  static instanceType = Card", "}"],
          ["export class Deck extends List<Card> {", "  static instanceType = Card", "}"]
        ]
      ]
    }
  ]
})

classes.addRule(ReopenType, {
  syntax: "(a|an) {type} {with_nested_statements}"
})

classes.addRule(CreateDrawableListType, {
  syntax:
    "(a|an) {type:type_words} (aka {aka:singular_type})? is (a|an) drawable list of {instanceType:type} {with_nested_statements}?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        [
          "a pile is a drawable list of cards",
          [
            "export class Pile extends DrawableList {",
            "  static instanceType = Card",
            '  static elementTag = core.defineElement(this, "test_classes")',
            "}"
          ],
          [
            "export class Pile extends DrawableList<Card> {",
            "  static instanceType = Card",
            '  static elementTag = core.defineElement(this, "test_classes")',
            "}",
            "",
            "/**",
            " * `<test-classes-pile>`:  a pile, drawn in its own element, e.g. by `draw the pile`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its pile's properties;  its methods call its pile's.",
            " * - What every drawable thing's element does, e.g. drawing its pile, is `SpellElement`'s.",
            " */",
            "export class PileElement extends SpellElement<Pile> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-classes-pile", "pile", [])',
            "}",
            "core.useElement(Pile, PileElement)"
          ]
        ]
      ]
    },
    {
      compileAs: "block",
      tests: [
        [
          "a pile is a drawable list of cards with:",
          [
            "export class Pile extends DrawableList {",
            "  static instanceType = Card",
            '  static elementTag = core.defineElement(this, "test_classes")',
            "}"
          ],
          [
            "export class Pile extends DrawableList<Card> {",
            "  static instanceType = Card",
            '  static elementTag = core.defineElement(this, "test_classes")',
            "}",
            "",
            "/**",
            " * `<test-classes-pile>`:  a pile, drawn in its own element, e.g. by `draw the pile`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its pile's properties;  its methods call its pile's.",
            " * - What every drawable thing's element does, e.g. drawing its pile, is `SpellElement`'s.",
            " */",
            "export class PileElement extends SpellElement<Pile> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-classes-pile", "pile", [])',
            "}",
            "core.useElement(Pile, PileElement)"
          ]
        ]
      ]
    }
  ]
})

classes.addRule(CSSBlock, {
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          ["a card is a drawable thing:", "\t<css>", "\t\t.red { color: crimson }", "\t</css>"],
          [
            "export class Card extends Drawable {",
            '  static elementTag = core.defineElement(this, "test_classes")',
            "",
            "  static css = css`",
            "    .red { color: crimson }",
            "  `",
            "}"
          ],
          [
            "export class Card extends Drawable {",
            '  static elementTag = core.defineElement(this, "test_classes")',
            "",
            "  static css = css`",
            "    .red { color: crimson }",
            "  `",
            "}",
            "",
            "/**",
            " * `<test-classes-card>`:  a card, drawn in its own element, e.g. by `draw the card`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its card's properties;  its methods call its card's.",
            " * - What every drawable thing's element does, e.g. drawing its card, is `SpellElement`'s.",
            " */",
            "export class CardElement extends SpellElement<Card> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-classes-card", "card", [])',
            "  @E.protoMerged static elementSetup = {",
            '    styleSheets: { "test-classes-card": Card.css }',
            "  } satisfies Partial<E.ElementSetup>",
            "}",
            "core.useElement(Card, CardElement)"
          ]
        ]
      ]
    }
  ]
})

classes.addRule(MarkdownDescription, {
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          ["a card is a thing:", "\t<markdown>", "\t\tA playing card:  **{rank}** of *suit*.", "\t</markdown>"],
          ["export class Card extends Thing {", '  static description = "A playing card:  **{rank}** of *suit*."', "}"]
        ],
        // not in an outline:  says where it goes
        [
          ["<markdown>", "\tHello", "</markdown>"],
          "/* PARSE ERROR: A <markdown> block goes in a type's outline, as its description, or in a drawing:  return <markdown>...</markdown> */"
        ]
      ]
    }
  ]
})

classes.addRule(BelongsToOne, {
  syntax: "(a|an) {type} belongs to one {list:type}",
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.parse(["a card is a thing", "a pile is a list of cards", "a bag is a list of things"].join("\n"), "block")
      },
      tests: [
        [
          "a card belongs to one pile",
          [
            "Pile.exclusive = true",
            'Object.defineProperty(Card.prototype, "pile", {',
            "  get() {",
            "    return Pile.ownerOf(this)",
            "  },",
            "  configurable: true",
            "})"
          ],
          [
            "Pile.exclusive = true",
            "export interface Card { readonly pile: Pile }",
            'Object.defineProperty(Card.prototype, "pile", {',
            "  get(this: Card) {",
            "    return Pile.ownerOf(this)!",
            "  },",
            "  configurable: true",
            "})"
          ]
        ],
        {
          title: "a built-in item type:  no member, it'd go on a type every project shares",
          input: "a thing belongs to one bag",
          js: "Bag.exclusive = true"
        },
        {
          title: "both types MUST be declared above",
          input: "a card belongs to one hand",
          js: `/* PARSE ERROR: Can't say "a card belongs to one hand" yet:  declare "a hand is a list of cards" above it */`
        },
        {
          title: "the list type MUST be a list of the project's",
          input: ["a card belongs to one list", "a card belongs to one card"],
          js: [
            `/* PARSE ERROR: Can't say "a card belongs to one list":  every list would hold a card once */`,
            `/* PARSE ERROR: Can't say "a card belongs to one card":  a card isn't a list */`
          ]
        }
      ]
    }
  ]
})

// in an outline body:  `- it belongs to a deck` -- tests in `parserTests/outline.test.ts`
classes.addRule(BelongsToOne, { syntax: "{type:subject_it} belongs to (one|a|an) {list:type}" })

// ... and with the subject left out (P8):  `- belongs to a pile`
classes.addRule(BelongsToOne, { syntax: "{type:subject_implied} belongs to (one|a|an) {list:type}" })

classes.addRule(CanBelongToMany, {
  syntax: "(a|an) {type:known_type} can belong to many {list:known_type}",
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.parse(["a card is a thing", "a pile is a list of cards"].join("\n"), "block")
      },
      tests: [["a card can belong to many piles", ""]]
    }
  ]
})

classes.addRule(SavedInline, {
  syntax: "(a|an) {type:known_type} is saved inline",
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.parse(["a dated-event is a thing", "a card is a drawable thing"].join("\n"), "block")
      },
      tests: [
        ["a dated-event is saved inline", "DatedEvent.savedInline = true"],
        {
          title: "a drawable thing too:  saved inside, as every thing is by default",
          input: "a card is saved inline",
          js: "Card.savedInline = true"
        },
        {
          title: "not a built-in type:  every project shares it",
          input: "a thing is saved inline",
          js: `/* PARSE ERROR: Can't save thing inline:  it's built in, and every project shares it */`
        }
      ]
    }
  ]
})

// in an outline body:  `- it is saved inline` -- tests in `parserTests/outline.test.ts`
classes.addRule(SavedInline, { syntax: "{type:subject_it} is saved inline" })

classes.addRule(SavedInline, { syntax: "{type:subject_implied} is saved inline" })

classes.addRule(SavedInFile, {
  syntax: "(a|an) {type:known_type} is saved in its own file",
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.parse("a person is a thing", "block")
      },
      tests: [
        ["a person is saved in its own file", "Person.savedInFile = true"],
        {
          title: "not a built-in type:  every project shares it",
          input: "a thing is saved in its own file",
          js: `/* PARSE ERROR: Can't save thing in its own file:  it's built in, and every project shares it */`
        }
      ]
    }
  ]
})

// in an outline body:  `- it is saved in its own file` -- tests in `parserTests/outline.test.ts`
classes.addRule(SavedInFile, { syntax: "{type:subject_it} is saved in its own file" })

classes.addRule(SavedInFile, { syntax: "{type:subject_implied} is saved in its own file" })

classes.addRule(VersionStep, {
  syntax: "(a|an) {type:known_type} version {version:number} renames {from:identifier} to {to:identifier}",
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.parse("a person is a thing", "block")
      },
      tests: [
        ["a person version 2 renames name to names", 'Person.v2RenamesName = "names"'],
        ["a person version 4 renames nick-name to nickname", 'Person.v4RenamesNickName = "nickname"'],
        {
          title: "a version step starts at version 2",
          input: "a person version 1 renames name to names",
          js: "/* PARSE ERROR: A version step starts at version 2:  a file with no version is version 1 */"
        }
      ]
    }
  ]
})

classes.addRule(VersionStep, {
  syntax: "(a|an) {type:known_type} version {version:number} (drops:drops) {from:identifier}",
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.parse("a person is a thing", "block")
      },
      tests: [["a person version 3 drops nickname", "Person.v3DropsNickname = true"]]
    }
  ]
})

classes.addRule(UpgradeMethod, {
  syntax: "to upgrade \\( (a|an) {type:known_type} \\) to version {version:number} :? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.parse(["a person is a thing", "a person has a name as text"].join("\n"), "block")
      },
      tests: [
        [
          'to upgrade (a person) to version 4: set its name to "x"',
          ["Person.prototype.upgradeToVersion4 = function () {", '  this.name = "x"', "}"],
          [
            "export interface Person { upgradeToVersion4(): undefined }",
            "Person.prototype.upgradeToVersion4 = function (this: Person) {",
            '  this.name = "x"',
            "}"
          ]
        ],
        {
          title: "an upgrade starts at version 2",
          input: 'to upgrade (a person) to version 1: set its name to "x"',
          js: "/* PARSE ERROR: An upgrade starts at version 2:  a file with no version is version 1 */"
        }
      ]
    }
  ]
})

classes.addRule(ListGuard, {
  syntax: `(a|an) {type:known_type} ${CAN_MOVE}`,
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.parse(["a card is a thing", "a pile is a list of cards"].join("\n"), "block")
      },
      tests: [
        [
          "a pile can take a card if: it is empty",
          ["Pile.prototype.canTake = function (card) {", "  return this.isEmpty", "}"],
          [
            "export interface Pile { canTake(card: Card): boolean }",
            "Pile.prototype.canTake = function (this: Pile, card: Card) {",
            "  return this.isEmpty",
            "}"
          ]
        ],
        {
          title: "an indented body, `the pile` and `the card`",
          input: [
            "a pile can add a card if:",
            "\tif the pile is empty return yes",
            "\treturn the card is not the last card of the pile"
          ],
          js: [
            "Pile.prototype.canTake = function (card) {",
            "  if (this.isEmpty) return true",
            "  return card !== this.lastItem",
            "}"
          ],
          ts: [
            "export interface Pile { canTake(card: Card): boolean }",
            "Pile.prototype.canTake = function (this: Pile, card: Card) {",
            "  if (this.isEmpty) return true",
            "  return card !== this.lastItem",
            "}"
          ]
        },
        [
          "a pile can give up a card if: the card is its last card",
          ["Pile.prototype.canGiveUp = function (card) {", "  return card === this.lastItem", "}"],
          [
            "export interface Pile { canGiveUp(card: Card): boolean }",
            "Pile.prototype.canGiveUp = function (this: Pile, card: Card) {",
            "  return card === this.lastItem",
            "}"
          ]
        ],
        [
          "a pile can let go of a card if: yes",
          ["Pile.prototype.canGiveUp = function (card) {", "  return true", "}"],
          [
            "export interface Pile { canGiveUp(card: Card): boolean }",
            "Pile.prototype.canGiveUp = function (this: Pile, card: Card) {",
            "  return true",
            "}"
          ]
        ]
      ]
    }
  ]
})

classes.addRule(ListGuard, {
  syntax: `(a|an) {type:known_type} ${CAN_NEVER_MOVE}`,
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.parse(["a card is a thing", "a pile is a list of cards"].join("\n"), "block")
      },
      tests: [
        [
          "a pile can never let go of a card",
          ["Pile.prototype.canGiveUp = function (card) {", "  return false", "}"],
          [
            "export interface Pile { canGiveUp(card: Card): boolean }",
            "Pile.prototype.canGiveUp = function (this: Pile, card: Card) {",
            "  return false",
            "}"
          ]
        ],
        [
          "a pile can never take a card",
          ["Pile.prototype.canTake = function (card) {", "  return false", "}"],
          [
            "export interface Pile { canTake(card: Card): boolean }",
            "Pile.prototype.canTake = function (this: Pile, card: Card) {",
            "  return false",
            "}"
          ]
        ]
      ]
    }
  ]
})

// in a list type's outline body -- tests in `parserTests/outline.test.ts`:
// - `- it can take a card if: ...`, `- it can never let go of a card`, `- it can never take a card`
// - and with the subject left out:  `- can take a card if: ...`
for (const subject of ["subject_it", "subject_implied"]) {
  for (const guard of [CAN_MOVE, CAN_NEVER_MOVE]) {
    classes.addRule(ListGuard, { syntax: `{type:${subject}} ${guard}` })
  }
}

classes.addRule(NewThing, {
  syntax: "a new {type:known_type} ((with|where|whose) {props:object_literal_properties})?",
  tests: [
    {
      title: "creates normal types",
      compileAs: "expression",
      tests: [
        [`a new thing`, `new Thing()`],
        [`a new Thing with a = 1, b = yes`, `new Thing({ a: 1, b: true })`]
      ]
    },
    {
      title: "creates base types",
      compileAs: "expression",
      tests: [
        ["a new Object", "new Object()"],
        ["a new object with a = 1, b = yes", "new Object({ a: 1, b: true })"]
      ]
    }
  ]
})

classes.addRule(NewList, {
  syntax: "a new (list|List) of {instanceType:type}?",
  tests: [
    {
      compileAs: "expression",
      tests: [
        [`a new list`, `new List()`],
        [`a new List`, `new List()`],
        [
          `a new list of objects`,
          `new List({ instanceType: "Object" })`,
          'new List<Object>({ instanceType: "Object" })'
        ],
        [
          `a new list of numbers`,
          `new List({ instanceType: "number" })`,
          'new List<number>({ instanceType: "number" })'
        ],
        [`a new list of Todos`, `new List({ instanceType: "Todo" })`, 'new List<Todo>({ instanceType: "Todo" })']
      ]
    }
  ]
})

classes.addRule(CreateThing, {
  syntax: "create (a|an) {type:known_type} ((with|where|whose) {props:object_literal_properties})?",
  tests: [
    {
      title: "creates normal objects properly",
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.types?.add("Thing")
      },
      tests: [
        [`create a Thing`, `new Thing()`],
        [`create a Thing with a = 1, b = yes`, `new Thing({ a: 1, b: true })`]
      ]
    },
    {
      title: "creates base types",
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.types?.add("Object")
        scope.types?.add("List")
      },
      tests: [
        ["create an object", "new Object()"],
        ["create an object with a = 1, b = yes", "new Object({ a: 1, b: true })"],
        // FIXME: the following don't make sense if they have arguments...
        ["create a List", "new List()"],
        ["create a list", "new List()"]
        // FIXME: the following don't make sense in JS but are legal parse-wise

        //           ["create text", "new String()"],
        //           ["create character", "new Character()"],
        //           ["create number", "new Number()"],
        //           ["create integer", "new Integer()"],
        //           ["create decimal", "new Decimal()"],
        //           ["create boolean", "new Boolean()"],
      ]
    }
  ]
})

classes.addRule(TypeSpecifierEnum, {
  syntax: "as (either|one of) {enumeration:identifier_list}",
  tests: [
    {
      tests: [
        ["as either red or black", '["red", "black"]'],
        ["as one of clubs, diamonds, hearts, spades", '["clubs", "diamonds", "hearts", "spades"]']
      ]
    }
  ]
})

classes.addRule(TypeSpecifierDatatype, {
  syntax: "as (a|an)? {datatype:singular_type}",
  tests: [
    {
      tests: [
        ["as a number", "number"],
        ["as an automobile", "Automobile"]
      ]
    }
  ]
})

classes.addRule(TypeSpecifierInstance, {
  syntax: "as ({new_list}|{new_thing})",
  tests: [
    {
      tests: [
        ["as a new thing", "new Thing()"],
        ["as a new thing with a=1, b = true", "new Thing({ a: 1, b: true })"],
        [
          "as a new list of numbers",
          'new List({ instanceType: "number" })',
          'new List<number>({ instanceType: "number" })'
        ]
      ]
    }
  ]
})

classes.addRule(TypeSpecifierYesOrNo, {
  syntax: "as either? (yes or no|true or false)",
  tests: [{ tests: [["as yes or no", "choice"]] }]
})

classes.addRule(ClassMember, {
  syntax: "{type:known_type} {member:member_words}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(
          [
            "a card is a thing",
            "a card has a suit as one of clubs, diamonds",
            "a bank-account is a thing",
            "a bank-account has an account-type as one of savings, checking"
          ].join("\n"),
          "block"
        )
      },
      tests: [
        ["card suits", "Card.Suits"],
        ["Card Suits", "Card.Suits"],
        ["bank-account account-types", "BankAccount.AccountTypes"],
        { title: "not a class variable", input: "card ranks", js: undefined }
      ]
    }
  ]
})

classes.addRule(DefinePropertyHas, {
  syntax: `(a|an) {type:singular_type} has (a|an|a property)? {property:member_words} {specifier:type_specifier}? ${RULES}`,
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          "a player has a name as text",
          [
            "// a player has a name as text",
            'Player.declareProp("name", { type: "text" })',
            'Object.defineProperty(Player.prototype, "name", {',
            '  get() { return this.getProp("name") },',
            '  set(value) { this.setProp("name", value) },',
            "  configurable: true",
            "})"
          ],
          [
            "export interface Player { name: string }",
            "// a player has a name as text",
            'Player.declareProp("name", { type: "text" })',
            'Object.defineProperty(Player.prototype, "name", {',
            '  get(this: Player): string { return this.getProp("name") as string },',
            '  set(this: Player, value: string) { this.setProp("name", value) },',
            "  configurable: true",
            "})"
          ]
        ]
      ]
    },
    {
      title: "declares type's enumeration and property",
      beforeEach(scope: P.Scope) {
        scope.compile(
          [
            "a card is a thing",
            "a card has a suit as one of clubs, diamonds, hearts or spades",
            "card = a new card"
          ].join("\n"),
          "block"
        )
      },
      compileAs: "statement",
      tests: [
        // every way to reach an enumeration names its class variable --
        // was CODE-DEBT "Enumerated properties are reachable under inconsistent names"
        ["print Card suits", "core.console.log(Card.Suits)"],
        ["print card suits", "core.console.log(Card.Suits)"],
        ["print the suit of the card is in card suits", "core.console.log(core.includes(Card.Suits, card.suit))"],
        ["print the suit of the card", "core.console.log(card.suit)"],
        ["print the suits of the card", "core.console.log(Card.Suits)"],
        ["print the number of card suits", "core.console.log(core.itemCountOf(Card.Suits))"]
      ]
    },
    {
      title: "an enumeration through `its`, and on a dashed type",
      beforeEach(scope: P.Scope) {
        scope.compile(
          [
            "a card is a thing",
            "a card has a suit as one of clubs, diamonds, hearts or spades",
            "a bank-account is a thing",
            "a bank-account has an account-type as one of savings or checking"
          ].join("\n"),
          "block"
        )
      },
      compileAs: "block",
      tests: [
        [
          ["get a new card", "print its suits"],
          ["const it = new Card()", "core.console.log(Card.Suits)"]
        ],
        ["print bank-account account-types", "core.console.log(BankAccount.AccountTypes)"]
      ]
    },
    {
      title: "every thing has an `id`, built in:  no type declares its own (epic `people-and-orgs`, Q9)",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.compile(["a person is a thing", "a club is a list of people"].join("\n"), "block")
      },
      tests: [
        {
          input: "a person has an id as text",
          js: '/* PARSE ERROR: Can\'t add "id" to Person:  every thing has one, built in */'
        },
        { input: "a club has an id", js: '/* PARSE ERROR: Can\'t add "id" to Club:  every thing has one, built in */' },
        {
          input: ["person = a new person", "print the id of the person"],
          js: ["export const person = new Person()", "core.console.log(person.id)"]
        },
        {
          input: ["person = a new person", 'set the id of the person to "owen"'],
          js: ["export const person = new Person()", 'person.id = "owen"']
        },
        {
          input: ["club = a new club", "print the id of the club"],
          js: ["export const club = new Club()", "core.console.log(club.id)"]
        }
      ]
    },
    {
      title: "a list says what it holds, so saving knows before it holds any",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.compile("a friend-list is a thing", "block")
      },
      tests: [
        {
          input: "a friend-list has people as a new list of people",
          js: [
            "// a friend-list has people as a new list of people",
            'FriendList.declareProp("people", { itemType: "Person", init: () => new List({ instanceType: "Person" }) })',
            'Object.defineProperty(FriendList.prototype, "people", {',
            '  get() { return this.getProp("people") },',
            '  set(value) { this.setProp("people", value) },',
            "  configurable: true",
            "})"
          ],
          ts: [
            "export interface FriendList { people: List<Person> }",
            "// a friend-list has people as a new list of people",
            'FriendList.declareProp("people", { itemType: "Person", init: () => new List<Person>({ instanceType: "Person" }) })',
            'Object.defineProperty(FriendList.prototype, "people", {',
            '  get(this: FriendList): List<Person> { return this.getProp("people") as List<Person> },',
            '  set(this: FriendList, value: List<Person>) { this.setProp("people", value) },',
            "  configurable: true",
            "})"
          ]
        }
      ]
    },
    {
      title: "a name of several words, blacklisted ones too -- the article is optional",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.compile("a card is a thing", "block")
      },
      tests: [
        [
          "a card has short rank as text",
          [
            "// a card has short rank as text",
            'Card.declareProp("shortRank", { type: "text" })',
            'Object.defineProperty(Card.prototype, "shortRank", {',
            '  get() { return this.getProp("shortRank") },',
            '  set(value) { this.setProp("shortRank", value) },',
            "  configurable: true",
            "})"
          ],
          [
            "export interface Card { shortRank: string }",
            "// a card has short rank as text",
            'Card.declareProp("shortRank", { type: "text" })',
            'Object.defineProperty(Card.prototype, "shortRank", {',
            '  get(this: Card): string { return this.getProp("shortRank") as string },',
            '  set(this: Card, value: string) { this.setProp("shortRank", value) },',
            "  configurable: true",
            "})"
          ]
        ]
      ]
    }
  ]
})

classes.addRule(DefinePropertyHas, {
  syntax: `{type:plural_type} have (a|an|a property)? {property:member_words} {specifier:type_specifier}? ${RULES}`,
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          "cards have a direction as either up or down",
          [
            "// cards have a direction as either up or down",
            'Card.Directions = ["up", "down"]',
            'Card.declareProp("direction", { oneOf: Card.Directions })',
            'Object.defineProperty(Card.prototype, "direction", {',
            '  get() { return this.getProp("direction") },',
            '  set(value) { this.setProp("direction", value) },',
            "  configurable: true",
            "})"
          ],
          [
            "// cards have a direction as either up or down",
            'Card.Directions = ["up", "down"]',
            "export interface Card { direction: (typeof Card.Directions)[number] }",
            'Card.declareProp("direction", { oneOf: Card.Directions })',
            'Object.defineProperty(Card.prototype, "direction", {',
            '  get(this: Card): (typeof Card.Directions)[number] { return this.getProp("direction") as (typeof Card.Directions)[number] },',
            '  set(this: Card, value: (typeof Card.Directions)[number]) { this.setProp("direction", value) },',
            "  configurable: true",
            "})"
          ]
        ],
        [
          "todos have a title as text",
          [
            "// todos have a title as text",
            'Todo.declareProp("title", { type: "text" })',
            'Object.defineProperty(Todo.prototype, "title", {',
            '  get() { return this.getProp("title") },',
            '  set(value) { this.setProp("title", value) },',
            "  configurable: true",
            "})"
          ],
          [
            "export interface Todo { title: string }",
            "// todos have a title as text",
            'Todo.declareProp("title", { type: "text" })',
            'Object.defineProperty(Todo.prototype, "title", {',
            '  get(this: Todo): string { return this.getProp("title") as string },',
            '  set(this: Todo, value: string) { this.setProp("title", value) },',
            "  configurable: true",
            "})"
          ]
        ],
        [
          "todos have a property completed as yes or no",
          [
            "// todos have a property completed as yes or no",
            'Todo.declareProp("completed", { type: "choice" })',
            'Object.defineProperty(Todo.prototype, "completed", {',
            '  get() { return this.getProp("completed") },',
            '  set(value) { this.setProp("completed", value) },',
            "  configurable: true",
            "})"
          ],
          [
            "export interface Todo { completed: boolean }",
            "// todos have a property completed as yes or no",
            'Todo.declareProp("completed", { type: "choice" })',
            'Object.defineProperty(Todo.prototype, "completed", {',
            '  get(this: Todo): boolean { return this.getProp("completed") as boolean },',
            '  set(this: Todo, value: boolean) { this.setProp("completed", value) },',
            "  configurable: true",
            "})"
          ]
        ],
        [
          "todos have a property tags as a new list",
          [
            "// todos have a property tags as a new list",
            'Todo.declareProp("tags", { init: () => new List() })',
            'Object.defineProperty(Todo.prototype, "tags", {',
            '  get() { return this.getProp("tags") },',
            '  set(value) { this.setProp("tags", value) },',
            "  configurable: true",
            "})"
          ],
          [
            "export interface Todo { tags: any /* spell: type unknown */ }",
            "// todos have a property tags as a new list",
            'Todo.declareProp("tags", { init: () => new List() })',
            'Object.defineProperty(Todo.prototype, "tags", {',
            '  get(this: Todo): any /* spell: type unknown */ { return this.getProp("tags") },',
            '  set(this: Todo, value: any /* spell: type unknown */) { this.setProp("tags", value) },',
            "  configurable: true",
            "})"
          ]
        ]
      ]
    }
  ]
})

// a quoted name in the sentence style (epic page J3, option C) -- tests in `parserTests/outline.test.ts`:
// `a card has a "suit" as one of ...`, `cards have a "direction" as either up or down`
classes.addRule(DefinePropertyHas, {
  syntax: `(a|an) {type:singular_type} has (a|an|a property)? {property:quoted_member} {specifier:type_specifier}? ${RULES}`
})

classes.addRule(DefinePropertyHas, {
  syntax: `{type:plural_type} have (a|an|a property)? {property:quoted_member} {specifier:type_specifier}? ${RULES}`
})

// in an outline body -- tests in `parserTests/outline.test.ts`:
// - `- it has a deck`
// - `- its "suit" is one of clubs, diamonds, hearts or spades`, `- its "rank" is a number`
classes.addRule(DefinePropertyHas, {
  syntax: `{type:subject_it} has (a|an|a property)? {property:member_words} {specifier:type_specifier}? ${RULES}`
})

classes.addRule(DefinePropertyHas, {
  syntax: `{type:subject_its} {property:quoted_member} is {specifier:outline_specifier} ${RULES}`
})

// ... and with the subject left out (P8):  `- has a deck`, `- "suit" is one of clubs, diamonds, hearts or spades`
classes.addRule(DefinePropertyHas, {
  syntax: `{type:subject_implied} has (a|an|a property)? {property:member_words} {specifier:type_specifier}? ${RULES}`
})

classes.addRule(DefinePropertyHas, {
  syntax: `{type:subject_implied} {property:quoted_member} (is|are) {specifier:outline_specifier} ${RULES}`
})

// ... and a bare name (P9):  `- suit is a suit of its deck`, `- foundations are a list of piles`
classes.addRule(DefinePropertyHas, {
  syntax: `{type:subject_implied} {property:body_member_words} (is|are) {specifier:outline_specifier} ${RULES}`
})

// ... and the quotes are optional (epic page Q4):  `- its rank is a number`
classes.addRule(DefinePropertyHas, {
  syntax: `{type:subject_its} {property:member_words} is {specifier:outline_specifier} ${RULES}`
})

classes.addRule(OutlineSpecifierEnum, {
  syntax: "(either|one of) {enumeration:identifier_list}",
  tests: [
    {
      tests: [["one of clubs, diamonds, hearts, spades", '["clubs", "diamonds", "hearts", "spades"]']]
    }
  ]
})

classes.addRule(OutlineSpecifierEnum, {
  syntax: "{enumeration:identifier_list}",
  tests: [
    {
      tests: [
        ["up or down", '["up", "down"]'],
        ["up", undefined],
        ["up, down", undefined]
      ]
    }
  ]
})

classes.addRule(OutlineSpecifierDatatype, {
  syntax: "(a|an) {datatype:singular_type}",
  tests: [{ tests: [["a number", "number"]] }]
})

// `a suit of its deck`:  a value kind, saying where its list is kept -- for the reader;  the kind says it already
classes.addRule(OutlineSpecifierDatatype, {
  syntax: "(a|an) {datatype:singular_type} of its {owner:member_words}",
  tests: [{ tests: [["a suit of its deck", "Suit"]] }]
})

// without the article, only a KNOWN type:  `its "name" is text`, but `its "x" is total` stays a getter (issue I2)
classes.addRule(OutlineSpecifierDatatype, {
  syntax: "{datatype:known_type}",
  tests: [
    {
      tests: [
        ["text", "text"],
        ["total", undefined]
      ]
    }
  ]
})

classes.addRule(OutlineSpecifierYesOrNo, {
  syntax: "either? (yes or no|true or false)",
  tests: [{ tests: [["yes or no", "choice"]] }]
})

classes.addRule(OutlineSpecifierList, {
  syntax: "a new? (list|List) of {instanceType:type}",
  tests: [
    {
      tests: [
        ["a list of people", 'new List({ instanceType: "Person" })', 'new List<Person>({ instanceType: "Person" })'],
        ["a new list of people", 'new List({ instanceType: "Person" })', 'new List<Person>({ instanceType: "Person" })']
      ]
    }
  ]
})

classes.addRule(OutlineSpecifierInstance, {
  syntax: "({new_list}|{new_thing})",
  tests: [
    {
      tests: [
        ["a new thing", "new Thing()"],
        ["a new thing with a=1, b = true", "new Thing({ a: 1, b: true })"]
      ]
    }
  ]
})

// quoted only:  unquoted, `{values:member_words}` matches any words at a line's start,
// e.g. completion offered `as one of ...` after `set y`
classes.addRule(ValueKind, {
  syntax: "{values:quoted_member} {specifier:type_specifier}"
})

classes.addRule(ThePropertyOfAThing, {
  syntax: "the {property:member_words} of (a|an) {type}"
})

// a quoted name, "quotes teach a new word" (epic page J3, option C):  `the "color" of a card is red if ...`
classes.addRule(ThePropertyOfAThing, {
  syntax: "the {property:quoted_member} of (a|an) {type}"
})

classes.addRule(AThingsProperty, {
  syntax: "(a|an) {type:plural_type} {property:member_words}"
})

classes.addRule(ItsQuotedProperty, {
  syntax: "{type:subject_its} {property:quoted_member}"
})

classes.addRule(ItsQuotedProperty, {
  syntax: "{type:subject_its} {property:member_words}"
})

// ... and with the subject left out (P8):  `- "color" is red if ...`
classes.addRule(ItsQuotedProperty, {
  syntax: "{type:subject_implied} {property:quoted_member}"
})

// ... and a bare name (P9):  `- color is red if ...`
classes.addRule(ItsQuotedProperty, {
  syntax: "{type:subject_implied} {property:body_member_words}"
})

classes.addRule(PropertyValueEither, {
  syntax: "{type_property} is {inline_value_if}",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.types?.add("card")
        scope.constants?.add("diamonds", "hearts", "clubs", "spades")
      },
      tests: [
        // is one of diamonds or hearts => is_one_of_list
        [
          "the color of a card is red if its suit is either diamonds or hearts",
          [
            'Object.defineProperty(Card.prototype, "color", {',
            "  get() {",
            '    if (core.includes(["diamonds", "hearts"], this.suit)) return "red"',
            "  },",
            "  configurable: true",
            "})"
          ],
          [
            "export interface Card { readonly color: any /* spell: type unknown */ }",
            'Object.defineProperty(Card.prototype, "color", {',
            "  get(this: Card) {",
            '    if (core.includes(["diamonds", "hearts"], this.suit)) return "red"',
            "  },",
            "  configurable: true",
            "})"
          ]
        ],
        [
          "a cards color is black if its suit is either clubs or spades otherwise it is red",
          [
            'Object.defineProperty(Card.prototype, "color", {',
            "  get() {",
            '    if (core.includes(["clubs", "spades"], this.suit)) return "black"',
            '    return "red"',
            "  },",
            "  configurable: true",
            "})"
          ],
          [
            "export interface Card { readonly color: string }",
            'Object.defineProperty(Card.prototype, "color", {',
            "  get(this: Card) {",
            '    if (core.includes(["clubs", "spades"], this.suit)) return "black"',
            '    return "red"',
            "  },",
            "  configurable: true",
            "})"
          ]
        ]
      ]
    }
  ]
})

classes.addRule(PropertyValueGetter, {
  syntax: "the {property:member_words} of (a|an) {type:known_type} is :? {expression_body}?",
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.compile("a card is a thing\na pile is a list of cards")
      },
      tests: [
        {
          input: "the value of a card is:",
          js: ['Object.defineProperty(Card.prototype, "value", {', "  get() {},", "  configurable: true", "})"],
          ts: [
            "export interface Card { readonly value: any /* spell: type unknown */ }",
            'Object.defineProperty(Card.prototype, "value", {',
            "  get(this: Card) {},",
            "  configurable: true",
            "})"
          ]
        },
        {
          input: "the value of a card is its name",
          js: [
            'Object.defineProperty(Card.prototype, "value", {',
            "  get() {",
            "    return this.name",
            "  },",
            "  configurable: true",
            "})"
          ],
          ts: [
            "export interface Card { readonly value: any /* spell: type unknown */ }",
            'Object.defineProperty(Card.prototype, "value", {',
            "  get(this: Card) {",
            "    return this.name",
            "  },",
            "  configurable: true",
            "})"
          ]
        },
        {
          input: ["the short-name of a card is:", "\treturn the first word of the name of the card"],
          js: [
            'Object.defineProperty(Card.prototype, "shortName", {',
            "  get() {",
            "    return core.getItemAt(this.name, 0)",
            "  },",
            "  configurable: true",
            "})"
          ],
          ts: [
            "export interface Card { readonly shortName: any /* spell: type unknown */ }",
            'Object.defineProperty(Card.prototype, "shortName", {',
            "  get(this: Card) {",
            "    return core.getItemAt(this.name, 0)",
            "  },",
            "  configurable: true",
            "})"
          ]
        },
        {
          title: "Show error if both nestedBlock and inlineStatement",
          input: ["the short-name of a card is its name", "\treturn the first word of the name of the card"],
          js: [
            'Object.defineProperty(Card.prototype, "shortName", {',
            "  get() {",
            "    return core.getItemAt(this.name, 0)",
            "  },",
            "  configurable: true",
            "})",
            "/* PARSE ERROR: Got both inline statement and nested block */"
          ],
          ts: [
            "export interface Card { readonly shortName: any /* spell: type unknown */ }",
            'Object.defineProperty(Card.prototype, "shortName", {',
            "  get(this: Card) {",
            "    return core.getItemAt(this.name, 0)",
            "  },",
            "  configurable: true",
            "})",
            "/* PARSE ERROR: Got both inline statement and nested block */"
          ]
        }
      ]
    }
  ]
})

// in an outline body:  `- its "color" is the color of its suit` -- tests in `parserTests/outline.test.ts`
classes.addRule(PropertyValueGetter, {
  syntax: "{type:subject_its} {property:quoted_member} is :? {expression_body}?"
})

classes.addRule(PropertyValueGetter, {
  syntax: "{type:subject_its} {property:member_words} is :? {expression_body}?"
})

// ... and with the subject left out (P8):  `- "color" is the color of its suit`
classes.addRule(PropertyValueGetter, {
  syntax: "{type:subject_implied} {property:quoted_member} (is|are) :? {expression_body}?"
})

// ... and a bare name (P9):  `- state is:` + a block, `- name is: its rank + " of " + its suit`
classes.addRule(PropertyValueGetter, {
  syntax: "{type:subject_implied} {property:body_member_words} (is|are) :? {expression_body}?"
})

// a quoted name in the sentence style (epic page J3, option C):  `the "short name" of a card is: ...`
classes.addRule(PropertyValueGetter, {
  syntax: "the {property:quoted_member} of (a|an) {type:known_type} is :? {expression_body}?"
})

classes.addRule(DrawSide, {
  syntax: "to {alias:text} :? ({inline_expression}|{nested_expression})?"
})

classes.addRule(QuotedPropertyFormula, {
  syntax: "(a|an) {type} {alias:text} for [sources:(its {property:member_words}) and]",
  tests: [
    {
      beforeEach(scope: P.Scope) {
        scope.parse(
          [
            "a card is a thing",
            "a card has a rank as one of ace, 2, 3, 4, 5, 6, 7, 8, 9, 10, jack, queen, king",
            "a card has a suit as one of clubs, diamonds, hearts, spades"
          ].join("\n"),
          "block"
        )
      },
      compileAs: "block",
      tests: [
        [
          'a card "is a (rank)" for its ranks',
          ["Card.prototype.isARank = function (rank) {", "  return this.rank === rank", "}"],
          [
            "export interface Card { isARank(rank: any /* spell: type unknown */): boolean }",
            "Card.prototype.isARank = function (this: Card, rank: any /* spell: type unknown */) {",
            "  return this.rank === rank",
            "}"
          ]
        ],
        [
          'a card "is the (rank) of (suits)" for its ranks and its suits',
          [
            "Card.prototype.isTheRankOfSuits = function (rank, suit) {",
            "  return this.rank === rank && this.suit === suit",
            "}"
          ],
          [
            "export interface Card { isTheRankOfSuits(rank: any /* spell: type unknown */, suit: any /* spell: type unknown */): boolean }",
            "Card.prototype.isTheRankOfSuits = function (this: Card, rank: any /* spell: type unknown */, suit: any /* spell: type unknown */) {",
            "  return this.rank === rank && this.suit === suit",
            "}"
          ]
        ]
      ]
    },
    {
      beforeEach(scope: P.Scope) {
        scope.parse(
          [
            "a card is a thing",
            "a card has a rank as one of ace, 2, 3, 4, 5, 6, 7, 8, 9, 10, jack, queen, king",
            "a card has a suit as one of clubs, diamonds, hearts, spades",
            'a card "is a (suit)" for its suits',
            'a card "is the (rank) of (suits)" for its ranks and its suits',
            "card = a new card"
          ].join("\n"),
          "block"
        )
      },
      compileAs: "statement",
      tests: [
        ["print card is a club", 'core.console.log(card.isASuit("clubs"))'],
        ["print card is the 2 of hearts", 'core.console.log(card.isTheRankOfSuits(2, "hearts"))']
      ]
    }
  ]
})

// in an outline body:  `- it "is a (suit)" for its suits` -- tests in `parserTests/outline.test.ts`
classes.addRule(QuotedPropertyFormula, {
  syntax: "{type:subject_it} {alias:text} for [sources:(its {property:member_words}) and]"
})

// ... and with the placeholders inferred (P3):  `- it "is a suit"`, `- it "is the rank of suits"` -- see `parse()`
classes.addRule(QuotedPropertyFormula, {
  syntax: "{type:subject_it} {alias:text}"
})

// ... and with the subject left out (P8):  `- "is a (suit)"`, `- "is a (suit)" for its suits`
classes.addRule(QuotedPropertyFormula, {
  syntax: "{type:subject_implied} {alias:text} for [sources:(its {property:member_words}) and]"
})

classes.addRule(QuotedPropertyFormula, {
  syntax: "{type:subject_implied} {alias:text}"
})

classes.addRule(ThingName, {
  tests: [
    {
      tests: [
        ["T1", '"T1"'],
        ["North-Pile", '"North-Pile"'],
        { title: "lowercase:  quote it instead", input: "stock", js: undefined }
      ]
    }
  ]
})

classes.addRule(NamedThing, {
  syntax: "{type:known_type} {name:thing_name}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(["a pile is a list of things", "a tableau is a pile"].join("\n"), "block")
      },
      tests: [
        ["tableau T1", 'core.thingNamed(Tableau, "T1")'],
        ["pile T1", 'core.thingNamed(Pile, "T1")'],
        { title: "a name in lowercase is quoted", input: "tableau stock", js: undefined }
      ]
    }
  ]
})

// a name in quotes:  any text, e.g. a lowercase one
classes.addRule(NamedThing, {
  syntax: "{type:known_type} {name:text}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(["a pile is a list of things", "a foundation is a pile"].join("\n"), "block")
      },
      tests: [['foundation "clubs"', 'core.thingNamed(Foundation, "clubs")']]
    }
  ]
})

classes.addRule(ThingAtPlace, {
  syntax: "the {ordinal} {type:known_type}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(["a pile is a list of things", "a tableau is a pile"].join("\n"), "block")
      },
      tests: [
        ["the first tableau", "core.thingAtPlace(Tableau, 1)"],
        ["the second tableau", "core.thingAtPlace(Tableau, 2)"],
        ["the last tableau", "core.thingAtPlace(Tableau, -1)"]
      ]
    }
  ]
})

classes.addRule(EveryThing, {
  syntax: "every {type:known_type}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(["a pile is a list of things", "a tableau is a pile"].join("\n"), "block")
      },
      tests: [
        ["every pile", "core.everyThing(Pile)"],
        ["every tableau", "core.everyThing(Tableau)"]
      ]
    }
  ]
})

classes.addRule(TheThings, {
  syntax: "the {type:plural_type}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.compile(["a pile is a list of things", "a tableau is a pile"].join("\n"), "block")
        scope.variables?.add("cards")
      },
      tests: [
        ["the piles", "core.everyThing(Pile)"],
        ["the tableaus", "core.everyThing(Tableau)"],
        ["the tableau", undefined],
        // a variable keeps its meaning
        ["the cards", "cards"],
        ["the gizmos", undefined]
      ]
    }
  ]
})

classes.addRule(PatternText, {
  tests: [
    {
      tests: [
        ['"^\\d+$"', '"^\\\\d+$"'],
        ['"^[a-z]+$"', '"^[a-z]+$"']
      ]
    }
  ]
})

classes.addRule(RuleSuggestion, {
  syntax: ",? (with suggestion|saying) {prompt:text}",
  tests: [
    {
      tests: [
        ['with suggestion "Write it like 1.2.3"', '"Write it like 1.2.3"'],
        [', saying "Too long"', '"Too long"']
      ]
    }
  ]
})

classes.addRule(MustRule, {
  syntax: "(empty:not be empty) {suggestion:rule_suggestion}?",
  tests: [
    {
      tests: [
        ["not be empty", '{ type: "empty" }'],
        ['not be empty, with suggestion "Give it a name"', '{ type: "empty", prompt: "Give it a name" }']
      ]
    }
  ]
})

classes.addRule(MustRule, {
  syntax: "match {pattern:pattern_text} {suggestion:rule_suggestion}?",
  tests: [
    {
      tests: [
        ['match "^\\d+$"', '{ type: "regExp", value: "/^\\\\d+$/" }'],
        [
          'match "^[a-z]+$" saying "Small letters only"',
          '{ type: "regExp", value: "/^[a-z]+$/", prompt: "Small letters only" }'
        ]
      ]
    }
  ]
})

classes.addRule(MustRule, {
  syntax: "be {bound:at_least_or_at_most} {count:number} (letters|characters) long {suggestion:rule_suggestion}?",
  tests: [
    {
      tests: [
        ["be at least 3 letters long", '{ type: "minLength", value: "3" }'],
        ["be at most 140 characters long", '{ type: "maxLength", value: "140" }']
      ]
    }
  ]
})

classes.addRule(MustRule, {
  syntax: "be between {min:number} and {max:number} {suggestion:rule_suggestion}?",
  tests: [{ tests: [["be between 1 and 5", '{ type: "range", value: "1..5" }']] }]
})

classes.addRule(MustRule, {
  syntax: "be {bound:at_least_or_at_most} {limit:number} {suggestion:rule_suggestion}?",
  tests: [
    {
      tests: [
        ["be at least 18", '{ type: "minValue", value: "18" }'],
        ["be at most 120", '{ type: "maxValue", value: "120" }']
      ]
    }
  ]
})

classes.addRule(MustRule, {
  syntax: "be (a|an) {kind:url_or_email} {suggestion:rule_suggestion}?",
  tests: [
    {
      tests: [
        ["be an email", '{ type: "email" }'],
        ["be a url", '{ type: "url" }']
      ]
    }
  ]
})

classes.addRule(PropertyMust, {
  syntax: "{type:subject_its} {property:member_words} must {rule:must_rule}"
})

classes.addRule(PropertyMust, {
  syntax: "{type:subject_its} {property:quoted_member} must {rule:must_rule}"
})

classes.addRule(PropertyMust, {
  syntax: "{type:subject_implied} {property:body_member_words} must {rule:must_rule}"
})

classes.addRule(PropertyBodyMust, {
  syntax: "(it:it)? must {rule:must_rule}"
})

classes.addRule(TypeSpecifierTextKind, {
  syntax: "as (a|an) {kind:url_or_email}",
  tests: [
    {
      tests: [
        ["as a url", "text"],
        ["as an email", "text"]
      ]
    }
  ]
})

classes.addRule(OutlineSpecifierTextKind, {
  syntax: "(a|an) {kind:url_or_email}",
  tests: [{ tests: [["a url", "text"]] }]
})
