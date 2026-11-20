/**
 * The `methods` rules in English:  each rule's syntax and its tests, registered on the `methods` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `methods.<lang>.ts` (epic `spanish`).
 */
import { P } from "spell/parser/parser"
import { Synonyms, Wording } from "spell/parser/spell/rules/expressions"

import { methods } from "./methods.parser"
import { BareTypeArg } from "./BareTypeArg"
import { CreateAnimation } from "./CreateAnimation"
import { ActionDetail } from "./ActionDetail"
import { AfterHook } from "./AfterHook"
import { BeforeHook } from "./BeforeHook"
import { FailureHook } from "./FailureHook"
import { WhileHook } from "./WhileHook"
import { CallNative } from "./CallNative"
import { CancelThisAction } from "./CancelThisAction"
import { ActionModifier, ActionModifiers } from "./ActionModifier"
import { CreateHook } from "./CreateHook"
import { MethodKeyword } from "./MethodKeyword"
import { MethodSignature } from "./MethodSignature"
import { QuotedActionSignature } from "./QuotedActionSignature"
import { QuotedMethodSignature } from "./QuotedMethodSignature"
import { QuotedSignatureWords } from "./QuotedSignatureWords"
import { QuotedTypeExpression } from "./QuotedTypeExpression"
import { ShortcutKeys } from "./ShortcutKeys"
import { ToDoSomething } from "./ToDoSomething"
import { TypedMethodArg } from "./TypedMethodArg"
import { UseNatives } from "./UseNatives"
import { TypeMethodArg } from "./TypeMethodArg"
import { ValuedVarMethodArg } from "./ValuedVarMethodArg"
import { VarMethodArg } from "./VarMethodArg"
import { WithPropsArg } from "./WithPropsArg"

// the word before a method's receiver, where a type's outline body leaves it out:
// `deal the cards of the solitaire` -- see `MethodDefinition.takeSubject()`
methods.addRule(Synonyms.specialize({ ruleName: "receiver_of" }), { syntax: "of" })

// what runs as a thing is made, its `create()` hook:  English's words are its name, `- to create it:`;
// another language's are its own, `- para crearlo:` -- see `MethodDefinition.hookOf()`
methods.addRule(Wording.specialize({ ruleName: "create_method", meanings: ["create"] }), {
  syntax: "(create:create it|create them)"
})

// the words of what runs as a thing is made, in its type's outline:  `- when created:`;
// its verb before its type too, as before `it`:  `- when creating a deck:` -- see `CreateHook`
methods.addRule(Wording.specialize({ ruleName: "create_hook_words", meanings: ["create"] }), {
  syntax: "(create:created|creating it)"
})

methods.addRule(MethodKeyword)

methods.addRule(VarMethodArg)

methods.addRule(ValuedVarMethodArg, {
  syntax: `{identifier} (=|is|of|as|set to) {value:expression}`
})

methods.addRule(TypeMethodArg, {
  syntax: `(a|an) {type}`
})

methods.addRule(BareTypeArg, {
  syntax: `(a|an) {type:known_type}`
})

methods.addRule(TypedMethodArg, {
  syntax: `{identifier} as (a|an)? {type}`
})

methods.addRule(WithPropsArg, {
  syntax: "with [{simple_method_arg} (,|and)]"
})

methods.addRule(MethodSignature, {
  roles: { bare_type_arg: "blank", method_arg: "blank" },
  syntax: `({bare_type_arg}|{method_keyword}|\\( {method_arg} \\))+`
})

methods.addRule(QuotedSignatureWords, {
  roles: { method_arg: "blank" },
  syntax: `({method_keyword}|\\( {method_arg} \\))+`
})

methods.addRule(QuotedMethodSignature)

// an action's quoted name, its `a <kind>` words its blanks (epic `language` I97)
methods.addRule(QuotedActionSignature)

methods.addRule(ToDoSomething, {
  roles: { band: "action", asTest: "declaration", signature: "declaration" },
  syntax: `to (asTest:test)? {signature:method_signature} {modifiers:action_modifiers}? :? {statement_body}?`,
  tests: [
    {
      title: "a template's test, in its outline:  a test as any other, its `it` a new one (epic `elemental-spell` Q21)",
      compileAs: "block",
      tests: [
        {
          input: [
            "a card is a thing where:",
            "\t- it has a rank as a number",
            "\t- to test card setup:",
            "\t\tits rank should be nothing",
            "\t\tget a new card whose rank is 3",
            "\t\tits rank should be 3"
          ],
          js: [
            "export class Card extends Thing {",
            "  // - it has a rank as a number",
            '  static { this.declareProp("rank", { type: "number" }) }',
            '  get rank() { return this.getProp("rank") }',
            '  set rank(value) { this.setProp("rank", value) }',
            "}",
            "export function testCardSetup() {",
            '  return core.test("test card setup", function testCardSetup() {',
            "    const it = new Card()",
            "    core.expect(it.rank, `its rank`, undefined, `nothing`)",
            "    core.echoTestAction(`get a new card whose rank is 3`)",
            "    const it2 = new Card({ rank: 3 })",
            "    core.expect(it2.rank, `its rank`, 3, `3`)",
            "  })",
            "}"
          ],
          ts: [
            "export class Card extends Thing {",
            "  // - it has a rank as a number",
            '  @prop({ type: "number" })',
            "  accessor rank!: number",
            "}",
            "export function testCardSetup() {",
            '  return core.test("test card setup", function testCardSetup() {',
            "    const it = new Card()",
            "    core.expect(it.rank, `its rank`, undefined, `nothing`)",
            "    core.echoTestAction(`get a new card whose rank is 3`)",
            "    const it2 = new Card({ rank: 3 })",
            "    core.expect(it2.rank, `its rank`, 3, `3`)",
            "  })",
            "}"
          ]
        }
      ]
    },
    {
      title: "inline method signatures & variables",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.types?.add("card")
        scope.types?.add("pile")
        scope.types?.add("deck")
        scope.constants?.add("up")
        scope.constants?.add("down")
      },
      tests: [
        {
          title: "keyword-only signature",
          input: "to start the game",
          js: "export function startTheGame() {}"
        },
        {
          title: "keyword-only signature - `it` is not defined",
          input: "to start the game: print it",
          js: ["export function startTheGame() {}", '/* PARSE ERROR: Don\'t understand "print it" */']
        },
        {
          title: "paren-free type arg in signature:  a known type is a parameter",
          input: "to create a card",
          js: ["Card.prototype.create = function () {}"],
          ts: [
            "export interface Card { create(): any /* spell: type unknown */ }",
            "Card.prototype.create = function (this: Card) {}"
          ]
        },
        {
          title: "paren-free type arg in signature - it",
          input: "to create a card: print it",
          js: [`Card.prototype.create = function () {`, `  return core.console.log(this)`, `}`],
          ts: [
            "export interface Card { create(): any /* spell: type unknown */ }",
            "Card.prototype.create = function (this: Card) {",
            "  return core.console.log(this)",
            "}"
          ]
        },
        {
          title: "paren-free type args in signature ~== parenthesized",
          input: "to give a card to a pile: set its pile to the pile",
          js: [
            "Card.prototype.giveToPile = function (pile) {",
            "  this.pile = pile",
            "}",
            'core.describeAction(Card, "giveToPile", { title: "Give Card to Pile", undoneAs: "Give Card to Pile" })'
          ],
          ts: [
            "export interface Card { giveToPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.giveToPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}",
            'core.describeAction(Card, "giveToPile", { title: "Give Card to Pile", undoneAs: "Give Card to Pile" })'
          ]
        },
        {
          title: "paren-free:  a word that isn't a type stays words",
          input: "to make a mess",
          js: "export function makeAMess() {}"
        },
        {
          title: "paren-free:  `the` + a type stays words",
          input: "to shuffle the deck",
          js: "export function shuffleTheDeck() {}"
        },
        {
          title: "simple arg in signature - arg is defined",
          input: "to notify (message): print the message",
          js: [
            "export function notifyMessage(message) {",
            '  return core.asAction({ undoneAs: "Notify Message" }, () => core.console.log(message))',
            "}"
          ],
          ts: [
            "export function notifyMessage(message: any /* spell: type unknown */) {",
            '  return core.asAction({ undoneAs: "Notify Message" }, () => core.console.log(message))',
            "}"
          ]
        },
        {
          title: "simple arg in signature - it is not defined",
          input: "to notify (message): print it",
          js: ["export function notifyMessage(message) {}", '/* PARSE ERROR: Don\'t understand "print it" */'],
          ts: [
            "export function notifyMessage(message: any /* spell: type unknown */) {}",
            '/* PARSE ERROR: Don\'t understand "print it" */'
          ]
        },
        {
          title: "typed simple arg in signature - arg is defined",
          input: "to notify (message as text): print the message",
          js: [
            "export function notifyMessage(message) {",
            '  return core.asAction({ undoneAs: "Notify Message" }, () => core.console.log(message))',
            "}"
          ],
          ts: [
            "export function notifyMessage(message: string) {",
            '  return core.asAction({ undoneAs: "Notify Message" }, () => core.console.log(message))',
            "}"
          ]
        },
        {
          title: "typed simple arg in signature - `it` is not defined",
          input: "to notify (message as text): print it",
          js: ["export function notifyMessage(message) {}", '/* PARSE ERROR: Don\'t understand "print it" */'],
          ts: ["export function notifyMessage(message: string) {}", '/* PARSE ERROR: Don\'t understand "print it" */']
        },
        {
          title: "valued simple arg in signature - arg is defined",
          input: 'to notify (message = "Really?"): print the message',
          js: [
            'export function notifyMessage(message = "Really?") {',
            '  return core.asAction({ undoneAs: "Notify Message" }, () => core.console.log(message))',
            "}"
          ],
          ts: [
            'export function notifyMessage(message: string = "Really?") {',
            '  return core.asAction({ undoneAs: "Notify Message" }, () => core.console.log(message))',
            "}"
          ]
        },
        {
          title: "typed simple arg in signature - `it` is not defined",
          input: 'to notify (message = "Really?"): print it',
          js: [
            'export function notifyMessage(message = "Really?") {}',
            '/* PARSE ERROR: Don\'t understand "print it" */'
          ],
          ts: [
            'export function notifyMessage(message: string = "Really?") {}',
            '/* PARSE ERROR: Don\'t understand "print it" */'
          ]
        },
        {
          title: "type arg in signature - thisVar",
          input: "to create (a card): print the card",
          js: [`Card.prototype.create = function () {`, `  return core.console.log(this)`, `}`],
          ts: [
            "export interface Card { create(): any /* spell: type unknown */ }",
            "Card.prototype.create = function (this: Card) {",
            "  return core.console.log(this)",
            "}"
          ]
        },
        {
          title: "type arg in signature - it",
          input: "to create (a card): print it",
          js: [`Card.prototype.create = function () {`, `  return core.console.log(this)`, `}`],
          ts: [
            "export interface Card { create(): any /* spell: type unknown */ }",
            "Card.prototype.create = function (this: Card) {",
            "  return core.console.log(this)",
            "}"
          ]
        },
        {
          title: "type arg in signature - its",
          input: "to create (a card): set its number to 1",
          js: [`Card.prototype.create = function () {`, `  this.number = 1`, `}`],
          ts: [
            "export interface Card { create(): any /* spell: type unknown */ }",
            "Card.prototype.create = function (this: Card) {",
            "  this.number = 1",
            "}"
          ]
        },
        {
          title: "multiple type args in signature - thisVar",
          input: "to add (a card) to (a pile): set the pile of the card to the pile",
          js: [
            "Card.prototype.addToPile = function (pile) {",
            "  this.pile = pile",
            "}",
            'core.describeAction(Card, "addToPile", { title: "Add Card to Pile", undoneAs: "Add Card to Pile" })'
          ],
          ts: [
            "export interface Card { addToPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.addToPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}",
            'core.describeAction(Card, "addToPile", { title: "Add Card to Pile", undoneAs: "Add Card to Pile" })'
          ]
        },
        {
          title: "multiple type args in signature - it",
          input: "to add (a card) to (a pile): set the pile of it to the pile",
          js: [
            "Card.prototype.addToPile = function (pile) {",
            "  this.pile = pile",
            "}",
            'core.describeAction(Card, "addToPile", { title: "Add Card to Pile", undoneAs: "Add Card to Pile" })'
          ],
          ts: [
            "export interface Card { addToPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.addToPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}",
            'core.describeAction(Card, "addToPile", { title: "Add Card to Pile", undoneAs: "Add Card to Pile" })'
          ]
        },
        {
          title: "multiple type args in signature - its",
          input: "to add (a card) to (a pile): set its pile to the pile",
          js: [
            "Card.prototype.addToPile = function (pile) {",
            "  this.pile = pile",
            "}",
            'core.describeAction(Card, "addToPile", { title: "Add Card to Pile", undoneAs: "Add Card to Pile" })'
          ],
          ts: [
            "export interface Card { addToPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.addToPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}",
            'core.describeAction(Card, "addToPile", { title: "Add Card to Pile", undoneAs: "Add Card to Pile" })'
          ]
        },
        {
          title: "typed arg in signature -- arg name",
          input: "to show (thing as a card): print the thing",
          js: [
            "Card.prototype.show = function () {",
            "  return core.console.log(this)",
            "}",
            'core.describeAction(Card, "show", { title: "Show Card", undoneAs: "Show Card" })'
          ],
          ts: [
            "export interface Card { show(): any /* spell: type unknown */ }",
            "Card.prototype.show = function (this: Card) {",
            "  return core.console.log(this)",
            "}",
            'core.describeAction(Card, "show", { title: "Show Card", undoneAs: "Show Card" })'
          ]
        },
        {
          title: "typed arg in signature -- thisVar",
          input: "to show (thing as a card): print the card",
          js: [
            "Card.prototype.show = function () {",
            "  return core.console.log(this)",
            "}",
            'core.describeAction(Card, "show", { title: "Show Card", undoneAs: "Show Card" })'
          ],
          ts: [
            "export interface Card { show(): any /* spell: type unknown */ }",
            "Card.prototype.show = function (this: Card) {",
            "  return core.console.log(this)",
            "}",
            'core.describeAction(Card, "show", { title: "Show Card", undoneAs: "Show Card" })'
          ]
        },
        {
          title: "typed arg in signature -- it",
          input: "to show (thing as a card): print it",
          js: [
            "Card.prototype.show = function () {",
            "  return core.console.log(this)",
            "}",
            'core.describeAction(Card, "show", { title: "Show Card", undoneAs: "Show Card" })'
          ],
          ts: [
            "export interface Card { show(): any /* spell: type unknown */ }",
            "Card.prototype.show = function (this: Card) {",
            "  return core.console.log(this)",
            "}",
            'core.describeAction(Card, "show", { title: "Show Card", undoneAs: "Show Card" })'
          ]
        },
        {
          title: "typed arg in signature -- its",
          input: "to show (thing as a card): print its name",
          js: [
            "Card.prototype.show = function () {",
            "  return core.console.log(this.name)",
            "}",
            'core.describeAction(Card, "show", { title: "Show Card", undoneAs: "Show Card" })'
          ],
          ts: [
            "export interface Card { show(): any /* spell: type unknown */ }",
            "Card.prototype.show = function (this: Card) {",
            "  return core.console.log(this.name)",
            "}",
            'core.describeAction(Card, "show", { title: "Show Card", undoneAs: "Show Card" })'
          ]
        },
        {
          title: "typed var in signature: implicit `it` gets remapped after `get`",
          input: ["to show (thing as a card)", "\tprint it", "\tget its name", "\tprint it"],
          js: [
            "Card.prototype.show = function () {",
            "  core.console.log(this)",
            "  const it = this.name",
            "  core.console.log(it)",
            "}",
            'core.describeAction(Card, "show", { title: "Show Card", undoneAs: "Show Card" })'
          ],
          ts: [
            "export interface Card { show(): any /* spell: type unknown */ }",
            "Card.prototype.show = function (this: Card) {",
            "  core.console.log(this)",
            "  const it = this.name",
            "  core.console.log(it)",
            "}",
            'core.describeAction(Card, "show", { title: "Show Card", undoneAs: "Show Card" })'
          ]
        },
        {
          title: "mixed vars in signature",
          input: "to prompt (message as text) and (reply)",
          js: "export function promptMessageAndReply(message, reply) {}",
          ts: "export function promptMessageAndReply(message: string, reply: any /* spell: type unknown */) {}"
        }
      ]
    },
    {
      title: "calling signature arguments",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.types?.add("card")
        scope.types?.add("pile")
      },
      tests: [
        {
          title: "top level keyword-only method",
          input: ["to start the game", "\tprint 1", "start the game"],
          js: [
            "export function startTheGame() {",
            '  return core.asAction({ undoneAs: "Start the Game" }, () => {',
            "    core.console.log(1)",
            "  })",
            "}",
            "startTheGame()"
          ]
        },
        {
          title: "top level simple argument method",
          input: ["to notify (message): print the message", "notify 1"],
          js: [
            "export function notifyMessage(message) {",
            '  return core.asAction({ undoneAs: "Notify Message" }, () => core.console.log(message))',
            "}",
            "notifyMessage(1)"
          ],
          ts: [
            "export function notifyMessage(message: any /* spell: type unknown */) {",
            '  return core.asAction({ undoneAs: "Notify Message" }, () => core.console.log(message))',
            "}",
            "notifyMessage(1)"
          ]
        },
        {
          title: "top level typed simple argument method",
          input: ["to notify (message as text): print the message", 'notify "hi"'],
          js: [
            "export function notifyMessage(message) {",
            '  return core.asAction({ undoneAs: "Notify Message" }, () => core.console.log(message))',
            "}",
            'notifyMessage("hi")'
          ],
          ts: [
            "export function notifyMessage(message: string) {",
            '  return core.asAction({ undoneAs: "Notify Message" }, () => core.console.log(message))',
            "}",
            'notifyMessage("hi")'
          ]
        },
        {
          title:
            "typed call:  an argument KNOWN to be the wrong type isn't a call to it -- here, the built-in `notify`",
          input: ["to notify (message as text): print the message", "notify 1"],
          js: [
            "export function notifyMessage(message) {",
            '  return core.asAction({ undoneAs: "Notify Message" }, () => core.console.log(message))',
            "}",
            "core.notify(1)"
          ],
          ts: [
            "export function notifyMessage(message: string) {",
            '  return core.asAction({ undoneAs: "Notify Message" }, () => core.console.log(message))',
            "}",
            "core.notify(1)"
          ]
        },
        {
          title: "typed call:  a sub-type fits, an unrelated type doesn't",
          input: [
            "a joker is a card",
            "to show (a card) on (a pile): print 1",
            "show a new joker on a new pile",
            "show a new card on a new card"
          ],
          js: [
            "export class Joker extends Card {}",
            "Card.prototype.showOnPile = function (pile) {",
            "  return core.console.log(1)",
            "}",
            'core.describeAction(Card, "showOnPile", { title: "Show Card on Pile", undoneAs: "Show Card on Pile" })',
            ";(new Joker()).showOnPile(new Pile())",
            '/* PARSE ERROR: Don\'t understand "show a new card on a new card" */'
          ],
          ts: [
            "export class Joker extends Card {}",
            "export interface Card { showOnPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.showOnPile = function (this: Card, pile: Pile) {",
            "  return core.console.log(1)",
            "}",
            'core.describeAction(Card, "showOnPile", { title: "Show Card on Pile", undoneAs: "Show Card on Pile" })',
            ";(new Joker()).showOnPile(new Pile())",
            '/* PARSE ERROR: Don\'t understand "show a new card on a new card" */'
          ]
        },
        {
          title: "type arg in signature",
          input: ["to show (a card): print the card", "show a new card"],
          js: [
            "Card.prototype.show = function () {",
            "  return core.console.log(this)",
            "}",
            'core.describeAction(Card, "show", { title: "Show Card", undoneAs: "Show Card" })',
            ";(new Card()).show()"
          ],
          ts: [
            "export interface Card { show(): any /* spell: type unknown */ }",
            "Card.prototype.show = function (this: Card) {",
            "  return core.console.log(this)",
            "}",
            'core.describeAction(Card, "show", { title: "Show Card", undoneAs: "Show Card" })',
            ";(new Card()).show()"
          ]
        },
        {
          title: "multiple type args in signature",
          input: ["to play (a card) on (a pile): set its pile to the pile", "play a new card on a new pile"],
          js: [
            "Card.prototype.playOnPile = function (pile) {",
            "  this.pile = pile",
            "}",
            'core.describeAction(Card, "playOnPile", { title: "Play Card on Pile", undoneAs: "Play Card on Pile" })',
            ";(new Card()).playOnPile(new Pile())"
          ],
          ts: [
            "export interface Card { playOnPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.playOnPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}",
            'core.describeAction(Card, "playOnPile", { title: "Play Card on Pile", undoneAs: "Play Card on Pile" })',
            ";(new Card()).playOnPile(new Pile())"
          ]
        },
        {
          title: "paren-free type args in signature",
          input: ["to play a card on a pile: set its pile to the pile", "play a new card on a new pile"],
          js: [
            "Card.prototype.playOnPile = function (pile) {",
            "  this.pile = pile",
            "}",
            'core.describeAction(Card, "playOnPile", { title: "Play Card on Pile", undoneAs: "Play Card on Pile" })',
            ";(new Card()).playOnPile(new Pile())"
          ],
          ts: [
            "export interface Card { playOnPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.playOnPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}",
            'core.describeAction(Card, "playOnPile", { title: "Play Card on Pile", undoneAs: "Play Card on Pile" })',
            ";(new Card()).playOnPile(new Pile())"
          ]
        }
      ]
    },
    {
      title: "props",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.types?.add("card")
        scope.types?.add("pile")
      },
      tests: [
        {
          title: "signature with no keywords is not matched",
          input: "to (foo)",
          js: '/* PARSE ERROR: Don\'t understand "to (foo)" */'
        },
        {
          title: "with arg is optional when calling",
          input: ["to notify (with message):", "\tprint the message", "notify"],
          js: [
            "export function notify(props = {}) {",
            '  return core.asAction({ undoneAs: "Notify" }, () => {',
            "    const { message } = props",
            "    core.console.log(message)",
            "  })",
            "}",
            "notify()"
          ],
          ts: [
            "export function notify(props: Object = {}) {",
            '  return core.asAction({ undoneAs: "Notify" }, () => {',
            "    const { message } = props",
            "    core.console.log(message)",
            "  })",
            "}",
            "notify()"
          ]
        },

        {
          title: "simple variable props",
          input: ["to notify (with message):", "\tprint the message", 'notify with message = "It worked!"'],
          js: [
            "export function notify(props = {}) {",
            '  return core.asAction({ undoneAs: "Notify" }, () => {',
            "    const { message } = props",
            "    core.console.log(message)",
            "  })",
            "}",
            'notify({ message: "It worked!" })'
          ],
          ts: [
            "export function notify(props: Object = {}) {",
            '  return core.asAction({ undoneAs: "Notify" }, () => {',
            "    const { message } = props",
            "    core.console.log(message)",
            "  })",
            "}",
            'notify({ message: "It worked!" })'
          ]
        },
        {
          title: "typed variable props",
          input: [
            "to play (with a card):",
            "\tprint the card",
            "play with card = a new card",
            'play with card = a new card with suit of "hearts"'
          ],
          js: [
            "export function play(props = {}) {",
            '  return core.asAction({ undoneAs: "Play" }, () => {',
            "    const { card } = props",
            "    core.console.log(card)",
            "  })",
            "}",
            "play({ card: new Card() })",
            'play({ card: new Card({ suit: "hearts" }) })'
          ],
          ts: [
            "export function play(props: { card?: Card } = {}) {",
            '  return core.asAction({ undoneAs: "Play" }, () => {',
            "    const { card } = props",
            "    core.console.log(card)",
            "  })",
            "}",
            "play({ card: new Card() })",
            'play({ card: new Card({ suit: "hearts" }) })'
          ]
        },
        {
          title: "default value props",
          input: ['to notify (with message = "nope"):', "\tprint the message", 'notify with message = "Ship it!!"'],
          js: [
            "export function notify(props = {}) {",
            '  return core.asAction({ undoneAs: "Notify" }, () => {',
            '    const { message = "nope" } = props',
            "    core.console.log(message)",
            "  })",
            "}",
            'notify({ message: "Ship it!!" })'
          ],
          ts: [
            "export function notify(props: Object = {}) {",
            '  return core.asAction({ undoneAs: "Notify" }, () => {',
            '    const { message = "nope" } = props',
            "    core.console.log(message)",
            "  })",
            "}",
            'notify({ message: "Ship it!!" })'
          ]
        },
        {
          title: "multiple default value props",
          input: [
            'to notify (with message = "nope" and reply = "yep"):',
            "\tprint the message + the reply",
            'notify with message = "How many?"',
            'notify with message = "How many?" and reply = 2'
          ],
          js: [
            "export function notify(props = {}) {",
            '  return core.asAction({ undoneAs: "Notify" }, () => {',
            '    const { message = "nope", reply = "yep" } = props',
            "    core.console.log(message + reply)",
            "  })",
            "}",
            'notify({ message: "How many?" })',
            'notify({ message: "How many?", reply: 2 })'
          ],
          ts: [
            "export function notify(props: Object = {}) {",
            '  return core.asAction({ undoneAs: "Notify" }, () => {',
            '    const { message = "nope", reply = "yep" } = props',
            "    core.console.log(message + reply)",
            "  })",
            "}",
            'notify({ message: "How many?" })',
            'notify({ message: "How many?", reply: 2 })'
          ]
        },
        {
          title: "mixed props",
          input: [
            'to notify (with name, message as text and reply = "yep"):',
            "\tprint the name + the message + the reply",
            'notify with name = "Bob", message = "How many?" and reply = 2'
          ],
          js: [
            "export function notify(props = {}) {",
            '  return core.asAction({ undoneAs: "Notify" }, () => {',
            '    const { name, message, reply = "yep" } = props',
            "    core.console.log(name + message + reply)",
            "  })",
            "}",
            "notify({",
            '  name: "Bob",',
            '  message: "How many?",',
            "  reply: 2",
            "})"
          ],
          ts: [
            "export function notify(props: { name?: any /* spell?: type unknown */; message?: string; reply?: any /* spell?: type unknown */ } = {}) {",
            '  return core.asAction({ undoneAs: "Notify" }, () => {',
            '    const { name, message, reply = "yep" } = props',
            "    core.console.log(name + message + reply)",
            "  })",
            "}",
            "notify({",
            '  name: "Bob",',
            '  message: "How many?",',
            "  reply: 2",
            "})"
          ]
        },
        {
          title: "mixed props and signature",
          input: [
            'to notify (message) (with reply = "yep"):',
            "\tprint the message",
            "\tprint the reply",
            'notify "Really?" with reply = "yes"'
          ],
          js: [
            "export function notifyMessage(message, props = {}) {",
            '  return core.asAction({ undoneAs: "Notify Message" }, () => {',
            '    const { reply = "yep" } = props',
            "    core.console.log(message)",
            "    core.console.log(reply)",
            "  })",
            "}",
            'notifyMessage("Really?", { reply: "yes" })'
          ],
          ts: [
            "export function notifyMessage(message: any /* spell: type unknown */, props: Object = {}) {",
            '  return core.asAction({ undoneAs: "Notify Message" }, () => {',
            '    const { reply = "yep" } = props',
            "    core.console.log(message)",
            "    core.console.log(reply)",
            "  })",
            "}",
            'notifyMessage("Really?", { reply: "yes" })'
          ]
        },
        {
          title: "extra props passed in are OK",
          input: [
            "to notify (with message):",
            "\tprint the message",
            `notify with message = "It worked!" and reply = "No it didn't"`
          ],
          js: [
            "export function notify(props = {}) {",
            '  return core.asAction({ undoneAs: "Notify" }, () => {',
            "    const { message } = props",
            "    core.console.log(message)",
            "  })",
            "}",
            'notify({ message: "It worked!", reply: "No it didn\'t" })'
          ],
          ts: [
            "export function notify(props: Object = {}) {",
            '  return core.asAction({ undoneAs: "Notify" }, () => {',
            "    const { message } = props",
            "    core.console.log(message)",
            "  })",
            "}",
            'notify({ message: "It worked!", reply: "No it didn\'t" })'
          ]
        }
      ]
    },
    {
      title:
        "a hook names its type or its one of a kind as `it`:  `to draw the deck` ~== `to draw it` (epic `language` T122)",
      compileAs: "block",
      tests: [
        {
          input: ['a "deck" is a thing', "\tto draw the deck", "\t\tprint 1"],
          js: ["export class Deck extends Thing {", "  draw() {", "    core.console.log(1)", "  }", "}"],
          ts: ["export class Deck extends Thing {", "  @drawn draw() {", "    core.console.log(1)", "  }", "}"]
        },
        {
          input: ['a "deck" is a thing', "\tto draw a deck", "\t\tprint 1"],
          js: ["export class Deck extends Thing {", "  draw() {", "    core.console.log(1)", "  }", "}"],
          ts: ["export class Deck extends Thing {", "  @drawn draw() {", "    core.console.log(1)", "  }", "}"]
        },
        {
          input: ["solitaire is an app", "\tto draw solitaire", "\t\tprint 1"],
          js: [
            "export class Solitaire extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  draw() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "export const solitaire = new Solitaire()"
          ],
          ts: [
            "export class Solitaire extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  @drawn draw() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "",
            "/**",
            " * `<test-methods-app>`:  a solitaire, drawn in its own element, e.g. by `draw the solitaire`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its solitaire's properties;  its methods call its solitaire's.",
            " * - What every view's element does, e.g. drawing its solitaire, is `SpellElement`'s.",
            " */",
            "export class SolitaireElement extends SpellElement<Solitaire> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-methods-app", "solitaire", [])',
            "}",
            "core.useElement(Solitaire, SolitaireElement)",
            "export const solitaire = new Solitaire()"
          ]
        },
        {
          input: ["solitaire is an app", "\tto draw the solitaire", "\t\tprint 1"],
          js: [
            "export class Solitaire extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  draw() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "export const solitaire = new Solitaire()"
          ],
          ts: [
            "export class Solitaire extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  @drawn draw() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "",
            "/**",
            " * `<test-methods-app>`:  a solitaire, drawn in its own element, e.g. by `draw the solitaire`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its solitaire's properties;  its methods call its solitaire's.",
            " * - What every view's element does, e.g. drawing its solitaire, is `SpellElement`'s.",
            " */",
            "export class SolitaireElement extends SpellElement<Solitaire> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-methods-app", "solitaire", [])',
            "}",
            "core.useElement(Solitaire, SolitaireElement)",
            "export const solitaire = new Solitaire()"
          ]
        },
        {
          title: "the built-in kind it is, after `the`:  `to draw the app` (epic `language` T129)",
          input: ["solitaire is an app", "\tto draw the app", "\t\tprint 1"],
          js: [
            "export class Solitaire extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  draw() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "export const solitaire = new Solitaire()"
          ],
          ts: [
            "export class Solitaire extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  @drawn draw() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "",
            "/**",
            " * `<test-methods-app>`:  a solitaire, drawn in its own element, e.g. by `draw the solitaire`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its solitaire's properties;  its methods call its solitaire's.",
            " * - What every view's element does, e.g. drawing its solitaire, is `SpellElement`'s.",
            " */",
            "export class SolitaireElement extends SpellElement<Solitaire> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-methods-app", "solitaire", [])',
            "}",
            "core.useElement(Solitaire, SolitaireElement)",
            "export const solitaire = new Solitaire()"
          ]
        },
        {
          title: "not a hook:  a method of its words",
          input: ['a "deck" is a thing', "\tto shuffle the deck", "\t\tprint 1"],
          js: [
            "export class Deck extends Thing {",
            "  shuffleTheDeck() {",
            "    core.console.log(1)",
            "  }",
            "}",
            'core.describeAction(Deck, "shuffleTheDeck", { title: "Shuffle the Deck", undoneAs: "Shuffle the Deck" })'
          ]
        },
        {
          title: "unquoted, `get` is a word of its name (epic `language` T142)",
          input: ['a "deck" is a thing', "\tto get the next card", "\t\tprint 1"],
          js: [
            "export class Deck extends Thing {",
            "  getTheNextCard() {",
            "    core.console.log(1)",
            "  }",
            "}",
            'core.describeAction(Deck, "getTheNextCard", { title: "Get the Next Card", undoneAs: "Get the Next Card" })'
          ]
        }
      ]
    }
  ]
})

// its name quoted, and what it says about itself on its line (epic `language` P48, Q6):
// `to "deal the cards" with title "Deal", icon "card", shortcut "meta+N"`
// a `get` before the quoted name is left out:  `to get "the points for a card"` ~== `to "the points for a card"`
// (epic `language` T142);  unquoted, `to get the next card` is an action named "get the next card"
methods.addRule(ToDoSomething, {
  syntax: `to get? {signature:quoted_action_signature} {modifiers:action_modifiers}? :? {statement_body}?`,
  tests: [
    {
      title: "its blanks as the unquoted name's:  `a / an <kind>` a blank, other words its name (epic `language` I97)",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.types?.add("card")
        scope.types?.add("pile")
      },
      tests: [
        {
          input: 'to "count the points for a card on a pile"',
          js: [
            "Card.prototype.countThePointsForCardOnPile = function (pile) {}",
            'core.describeAction(Card, "countThePointsForCardOnPile", { title: "Count the Points for Card on Pile", undoneAs: "Count the Points for Card on Pile" })'
          ],
          ts: [
            "export interface Card { countThePointsForCardOnPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.countThePointsForCardOnPile = function (this: Card, pile: Pile) {}",
            'core.describeAction(Card, "countThePointsForCardOnPile", { title: "Count the Points for Card on Pile", undoneAs: "Count the Points for Card on Pile" })'
          ]
        },
        {
          input: 'to "deal the stock to (a pile)"',
          js: [
            "Pile.prototype.dealTheStockToPile = function () {}",
            'core.describeAction(Pile, "dealTheStockToPile", { title: "Deal the Stock to Pile", undoneAs: "Deal the Stock to Pile" })'
          ],
          ts: [
            "export interface Pile { dealTheStockToPile(): any /* spell: type unknown */ }",
            "Pile.prototype.dealTheStockToPile = function (this: Pile) {}",
            'core.describeAction(Pile, "dealTheStockToPile", { title: "Deal the Stock to Pile", undoneAs: "Deal the Stock to Pile" })'
          ]
        }
      ]
    },
    {
      title: "`get` before its quoted name is left out:  the same action as without it (epic `language` T142)",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.types?.add("card")
        scope.types?.add("pile")
      },
      tests: [
        {
          input: 'to get "the points for a card on a pile"',
          js: [
            "Card.prototype.thePointsForCardOnPile = function (pile) {}",
            'core.describeAction(Card, "thePointsForCardOnPile", { title: "The Points for Card on Pile", undoneAs: "The Points for Card on Pile" })'
          ],
          ts: [
            "export interface Card { thePointsForCardOnPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.thePointsForCardOnPile = function (this: Card, pile: Pile) {}",
            'core.describeAction(Card, "thePointsForCardOnPile", { title: "The Points for Card on Pile", undoneAs: "The Points for Card on Pile" })'
          ]
        },
        {
          input: 'to "the points for a card on a pile"',
          js: [
            "Card.prototype.thePointsForCardOnPile = function (pile) {}",
            'core.describeAction(Card, "thePointsForCardOnPile", { title: "The Points for Card on Pile", undoneAs: "The Points for Card on Pile" })'
          ],
          ts: [
            "export interface Card { thePointsForCardOnPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.thePointsForCardOnPile = function (this: Card, pile: Pile) {}",
            'core.describeAction(Card, "thePointsForCardOnPile", { title: "The Points for Card on Pile", undoneAs: "The Points for Card on Pile" })'
          ]
        }
      ]
    }
  ]
})

methods.addRule(CreateAnimation, {
  syntax: `create? animation {signature:method_signature} :? {statement_body}?`,
  tests: [
    {
      title: "inline method signatures & variables",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.types?.add("card")
        scope.types?.add("pile")
        scope.types?.add("deck")
        scope.constants?.add("up")
        scope.constants?.add("down")
      },
      tests: [
        {
          input: "animation deal the cards",
          js: "export function dealTheCards() {}"
        },
        {
          input: ["animation deal the cards", "\tpause for 10 seconds"],
          js: ["export async function dealTheCards() {", '  await core.pauseFor(10, "seconds")', "}"]
        }
      ]
    }
  ]
})

methods.addRule(QuotedTypeExpression, {
  roles: { band: "property", signature: "declaration" },
  syntax: "(a|an) {type:singular_type} {signature:quoted_method_signature} (if|is)? :? {expression_body}?",
  tests: [
    {
      title: "fails if",
      compileAs: "block",
      tests: [
        {
          title: "signature is empty",
          input: `a thing "" if`,
          js: `/* PARSE ERROR: Don't understand "a thing "" if" */`
        },
        {
          title: "signature doesn't start with a keyword",
          input: `a thing "(thing)" if`,
          js: `/* PARSE ERROR: Don't understand "a thing "(thing)" if" */`
        },
        {
          title: "more than one arg specified",
          input: `a thing "(thing) but (thing)" if`,
          js: `/* PARSE ERROR: Don't understand "a thing "(thing) but (thing)" if" */`
        }
      ]
    },
    {
      title: "no args, no negatables",
      compileAs: "block",
      tests: [
        {
          title: "no body",
          input: [`a thing "nerds out" if`, `if a new thing nerds out`],
          js: [
            'Object.defineProperty(Thing.prototype, "nerdsOut", {',
            "  get() {},",
            "  configurable: true",
            "})",
            "if ((new Thing()).nerdsOut) {}"
          ],
          ts: [
            "export interface Thing { readonly nerdsOut: any /* spell: type unknown */ }",
            'Object.defineProperty(Thing.prototype, "nerdsOut", {',
            "  get(this: Thing) {},",
            "  configurable: true",
            "})",
            "if ((new Thing()).nerdsOut) {}"
          ]
        },
        {
          title: "no if",
          input: [`a thing "nerds out": never`, `if a new thing nerds out`],
          js: [
            'Object.defineProperty(Thing.prototype, "nerdsOut", {',
            "  get() {",
            "    return false",
            "  },",
            "  configurable: true",
            "})",
            "if ((new Thing()).nerdsOut) {}"
          ],
          ts: [
            "export interface Thing { readonly nerdsOut: boolean }",
            'Object.defineProperty(Thing.prototype, "nerdsOut", {',
            "  get(this: Thing) {",
            "    return false",
            "  },",
            "  configurable: true",
            "})",
            "if ((new Thing()).nerdsOut) {}"
          ]
        },
        {
          title: "inline expression",
          input: [`a thing "nerds out" if yes`, `if a new thing nerds out`],
          js: [
            'Object.defineProperty(Thing.prototype, "nerdsOut", {',
            "  get() {",
            "    return true",
            "  },",
            "  configurable: true",
            "})",
            "if ((new Thing()).nerdsOut) {}"
          ],
          ts: [
            "export interface Thing { readonly nerdsOut: boolean }",
            'Object.defineProperty(Thing.prototype, "nerdsOut", {',
            "  get(this: Thing) {",
            "    return true",
            "  },",
            "  configurable: true",
            "})",
            "if ((new Thing()).nerdsOut) {}"
          ]
        },
        {
          title: "indented method body",
          input: [`a thing "nerds out" if`, `\treturn yes`, `if a new thing nerds out`],
          js: [
            'Object.defineProperty(Thing.prototype, "nerdsOut", {',
            "  get() {",
            "    return true",
            "  },",
            "  configurable: true",
            "})",
            "if ((new Thing()).nerdsOut) {}"
          ],
          ts: [
            "export interface Thing { readonly nerdsOut: boolean }",
            'Object.defineProperty(Thing.prototype, "nerdsOut", {',
            "  get(this: Thing) {",
            "    return true",
            "  },",
            "  configurable: true",
            "})",
            "if ((new Thing()).nerdsOut) {}"
          ]
        }
      ]
    },
    {
      title: "one arg",
      compileAs: "block",
      tests: [
        {
          title: "no body",
          input: [`a thing "nerds out with (another as a thing)" if`, `if a new thing nerds out with a new thing`],
          js: [
            "Thing.prototype.nerdsOutWithAnother = function (another) {}",
            "if ((new Thing()).nerdsOutWithAnother(new Thing())) {}"
          ],
          ts: [
            "export interface Thing { nerdsOutWithAnother(another: Thing): any /* spell: type unknown */ }",
            "Thing.prototype.nerdsOutWithAnother = function (this: Thing, another: Thing) {}",
            "if ((new Thing()).nerdsOutWithAnother(new Thing())) {}"
          ]
        },
        {
          title: "inline expression",
          input: [`a thing "nerds out with (another as a thing)" if yes`, `if a new thing nerds out with a new thing`],
          js: [
            "Thing.prototype.nerdsOutWithAnother = function (another) {",
            "  return true",
            "}",
            "if ((new Thing()).nerdsOutWithAnother(new Thing())) {}"
          ],
          ts: [
            "export interface Thing { nerdsOutWithAnother(another: Thing): boolean }",
            "Thing.prototype.nerdsOutWithAnother = function (this: Thing, another: Thing) {",
            "  return true",
            "}",
            "if ((new Thing()).nerdsOutWithAnother(new Thing())) {}"
          ]
        },
        {
          title: "indented method body",
          input: [
            `a thing "nerds out with (another as a thing)" if`,
            `\treturn yes`,
            `if a new thing nerds out with a new thing`
          ],
          js: [
            "Thing.prototype.nerdsOutWithAnother = function (another) {",
            "  return true",
            "}",
            "if ((new Thing()).nerdsOutWithAnother(new Thing())) {}"
          ],
          ts: [
            "export interface Thing { nerdsOutWithAnother(another: Thing): boolean }",
            "Thing.prototype.nerdsOutWithAnother = function (this: Thing, another: Thing) {",
            "  return true",
            "}",
            "if ((new Thing()).nerdsOutWithAnother(new Thing())) {}"
          ]
        }
      ]
    },
    {
      title: "negatables",
      compileAs: "block",
      tests: [
        {
          title: "is",
          input: [
            `a thing "is a bug" if`,
            `if a new thing is a bug`,
            `if a new thing is not a bug`,
            `if a new thing isnt a bug`,
            `if a new thing isn't a bug`
          ],
          js: [
            'Object.defineProperty(Thing.prototype, "isABug", {',
            "  get() {},",
            "  configurable: true",
            "})",
            "if ((new Thing()).isABug) {}",
            "if (!(new Thing()).isABug) {}",
            "if (!(new Thing()).isABug) {}",
            "if (!(new Thing()).isABug) {}"
          ],
          ts: [
            "export interface Thing { readonly isABug: any /* spell: type unknown */ }",
            'Object.defineProperty(Thing.prototype, "isABug", {',
            "  get(this: Thing) {},",
            "  configurable: true",
            "})",
            "if ((new Thing()).isABug) {}",
            "if (!(new Thing()).isABug) {}",
            "if (!(new Thing()).isABug) {}",
            "if (!(new Thing()).isABug) {}"
          ]
        },
        {
          title: "can",
          input: [
            `a thing "can play" if`,
            `if a new thing can play`,
            `if a new thing cannot play`,
            `if a new thing can not play`,
            `if a new thing cant play`,
            `if a new thing can't play`
          ],
          js: [
            'Object.defineProperty(Thing.prototype, "canPlay", {',
            "  get() {},",
            "  configurable: true",
            "})",
            "if ((new Thing()).canPlay) {}",
            "if (!(new Thing()).canPlay) {}",
            "if (!(new Thing()).canPlay) {}",
            "if (!(new Thing()).canPlay) {}",
            "if (!(new Thing()).canPlay) {}"
          ],
          ts: [
            "export interface Thing { readonly canPlay: any /* spell: type unknown */ }",
            'Object.defineProperty(Thing.prototype, "canPlay", {',
            "  get(this: Thing) {},",
            "  configurable: true",
            "})",
            "if ((new Thing()).canPlay) {}",
            "if (!(new Thing()).canPlay) {}",
            "if (!(new Thing()).canPlay) {}",
            "if (!(new Thing()).canPlay) {}",
            "if (!(new Thing()).canPlay) {}"
          ]
        },
        {
          title: "will",
          input: [
            `a thing "will blow up" if`,
            `if a new thing will blow up`,
            `if a new thing will not blow up`,
            `if a new thing wont blow up`,
            `if a new thing won't blow up`
          ],
          js: [
            'Object.defineProperty(Thing.prototype, "willBlowUp", {',
            "  get() {},",
            "  configurable: true",
            "})",
            "if ((new Thing()).willBlowUp) {}",
            "if (!(new Thing()).willBlowUp) {}",
            "if (!(new Thing()).willBlowUp) {}",
            "if (!(new Thing()).willBlowUp) {}"
          ],
          ts: [
            "export interface Thing { readonly willBlowUp: any /* spell: type unknown */ }",
            'Object.defineProperty(Thing.prototype, "willBlowUp", {',
            "  get(this: Thing) {},",
            "  configurable: true",
            "})",
            "if ((new Thing()).willBlowUp) {}",
            "if (!(new Thing()).willBlowUp) {}",
            "if (!(new Thing()).willBlowUp) {}",
            "if (!(new Thing()).willBlowUp) {}"
          ]
        },
        {
          title: "has",
          input: [
            `a thing "has a friend" if`,
            `if a new thing has a friend`,
            `if a new thing does not have a friend`,
            `if a new thing doesnt have a friend`,
            `if a new thing doesn't have a friend`
          ],
          js: [
            'Object.defineProperty(Thing.prototype, "hasAFriend", {',
            "  get() {},",
            "  configurable: true",
            "})",
            "if ((new Thing()).hasAFriend) {}",
            "if (!(new Thing()).hasAFriend) {}",
            "if (!(new Thing()).hasAFriend) {}",
            "if (!(new Thing()).hasAFriend) {}"
          ],
          ts: [
            "export interface Thing { readonly hasAFriend: any /* spell: type unknown */ }",
            'Object.defineProperty(Thing.prototype, "hasAFriend", {',
            "  get(this: Thing) {},",
            "  configurable: true",
            "})",
            "if ((new Thing()).hasAFriend) {}",
            "if (!(new Thing()).hasAFriend) {}",
            "if (!(new Thing()).hasAFriend) {}",
            "if (!(new Thing()).hasAFriend) {}"
          ]
        }
      ]
    }
  ]
})

// in an outline body:  `- it "is face up" if its direction is up` -- tests in `parserTests/outline.test.ts`
methods.addRule(QuotedTypeExpression, {
  syntax: "{type:subject_it} {signature:quoted_method_signature} (if|is)? :? {expression_body}?"
})

// ... and with the subject left out (P8):  `- "is face up" if its direction is up`
// - NOT `is`:  `- "suit" is ...` is a property, as `its "suit" is ...` -- see `isPropertyWithoutSubject()`
methods.addRule(QuotedTypeExpression, {
  syntax: "{type:subject_implied} {signature:quoted_method_signature} if? :? {expression_body}?"
})

// what runs as a thing is made, in its type's outline:  `- when creating a task (with ...):` (epic `language`),
// also `- when created:` and `- when creating it:` (epic `spanish` P28)
methods.addRule(CreateHook, {
  roles: { band: "action", signature: "declaration" },
  syntax: "when {signature:method_signature} (:|,)? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          [
            "a task is a thing where:",
            "\t- when created (with title as text, done as a choice):",
            "\t\tprint the title"
          ],
          [
            "export class Task extends Thing {",
            "  create(props = {}) {",
            "    const { title, done } = props",
            "    core.console.log(title)",
            "  }",
            "}"
          ],
          [
            "@thing",
            "export class Task extends Thing {",
            "  create(props: { title?: string; done?: boolean } = {}) {",
            "    const { title, done } = props",
            "    core.console.log(title)",
            "  }",
            "}"
          ]
        ],
        [
          ["a task is a thing where:", "\t- when creating a task:", "\t\tprint 1"],
          ["export class Task extends Thing {", "  create() {", "    core.console.log(1)", "  }", "}"],
          ["@thing", "export class Task extends Thing {", "  create() {", "    core.console.log(1)", "  }", "}"]
        ],
        [
          ["a task is a thing where:", "\t- when creating it:", "\t\tprint 1"],
          ["export class Task extends Thing {", "  create() {", "    core.console.log(1)", "  }", "}"],
          ["@thing", "export class Task extends Thing {", "  create() {", "    core.console.log(1)", "  }", "}"]
        ],
        // its type's own words, after `the` (epic `language` T129)
        [
          ["a task is a thing where:", "\t- when creating the task:", "\t\tprint 1"],
          ["export class Task extends Thing {", "  create() {", "    core.console.log(1)", "  }", "}"],
          ["@thing", "export class Task extends Thing {", "  create() {", "    core.console.log(1)", "  }", "}"]
        ],
        {
          title: "a one of a kind's names itself, `the` or not (Owen, 2026-11-13)",
          input: ["solitaire is an app", "\twhen creating solitaire", "\t\tprint 1"],
          js: [
            "export class Solitaire extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  create() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "export const solitaire = new Solitaire()"
          ],
          ts: [
            "@thing",
            "export class Solitaire extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  create() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "",
            "/**",
            " * `<test-methods-app>`:  a solitaire, drawn in its own element, e.g. by `draw the solitaire`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its solitaire's properties;  its methods call its solitaire's.",
            " * - What every view's element does, e.g. drawing its solitaire, is `SpellElement`'s.",
            " */",
            "export class SolitaireElement extends SpellElement<Solitaire> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-methods-app", "solitaire", [])',
            "",
            "  create() {",
            "    return this.currentThing?.create()",
            "  }",
            "}",
            "core.useElement(Solitaire, SolitaireElement)",
            "export const solitaire = new Solitaire()"
          ]
        },
        {
          title: "the built-in kind it is, after `the`:  `when creating the app` (epic `language` T129)",
          input: ["solitaire is an app", "\twhen creating the app", "\t\tprint 1"],
          js: [
            "export class Solitaire extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  create() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "export const solitaire = new Solitaire()"
          ],
          ts: [
            "@thing",
            "export class Solitaire extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  create() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "",
            "/**",
            " * `<test-methods-app>`:  a solitaire, drawn in its own element, e.g. by `draw the solitaire`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its solitaire's properties;  its methods call its solitaire's.",
            " * - What every view's element does, e.g. drawing its solitaire, is `SpellElement`'s.",
            " */",
            "export class SolitaireElement extends SpellElement<Solitaire> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-methods-app", "solitaire", [])',
            "",
            "  create() {",
            "    return this.currentThing?.create()",
            "  }",
            "}",
            "core.useElement(Solitaire, SolitaireElement)",
            "export const solitaire = new Solitaire()"
          ]
        },
        {
          input: ["solitaire is an app", "\twhen creating the solitaire", "\t\tprint 1"],
          js: [
            "export class Solitaire extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  create() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "export const solitaire = new Solitaire()"
          ],
          ts: [
            "@thing",
            "export class Solitaire extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  create() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "",
            "/**",
            " * `<test-methods-app>`:  a solitaire, drawn in its own element, e.g. by `draw the solitaire`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its solitaire's properties;  its methods call its solitaire's.",
            " * - What every view's element does, e.g. drawing its solitaire, is `SpellElement`'s.",
            " */",
            "export class SolitaireElement extends SpellElement<Solitaire> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-methods-app", "solitaire", [])',
            "",
            "  create() {",
            "    return this.currentThing?.create()",
            "  }",
            "}",
            "core.useElement(Solitaire, SolitaireElement)",
            "export const solitaire = new Solitaire()"
          ]
        }
      ]
    }
  ]
})

// what an action's head line says about it (epic `language` P48, Q6):  `with title "Deal", icon "card", shortcut "meta+N"`
methods.addRule(ActionModifier, { syntax: "title {title:text}" })
methods.addRule(ActionModifier, { syntax: "icon {icon:text}" })
methods.addRule(ActionModifier, { syntax: "shortcut {keys:text}" })
methods.addRule(ActionModifier, { syntax: "(undoable:undoable)" })
methods.addRule(ActionModifier, { syntax: "(cantBeUndone:can't be undone|cannot be undone|can not be undone)" })
methods.addRule(ActionModifier, { syntax: "undoable as {undoneAs:text}" })
methods.addRule(ActionModifiers, { syntax: "with [{action_modifier} (,|and)]" })
// ... or after a comma, its name quoted or not (Owen):  `to put a card on a pile, undoable as "Move Card"`
methods.addRule(ActionModifiers, { syntax: ", [{action_modifier} (,|and)]" })

// one keyboard shortcut, its keys joined by `+`, no spaces:  `meta+T` -- what `action_detail` reads after `shortcut`
methods.addRule(ShortcutKeys)

// an ACTION's description, indented under it (epic `elemental-spell` P5):  `- to turn it over:`, then each line
methods.addRule(ActionDetail, {
  syntax: "shortcut {keys:shortcut_keys}",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "every line an action's description may have:  a getter for each condition, then the description",
          input: [
            "a card is a thing where:",
            "\t- its direction is one of up or down",
            "\t- to turn it over:",
            "\t\t- shortcut meta+T",
            "\t\t- shortcut F2",
            "\t\t- enabled when its direction is down",
            "\t\t- selected when its direction is up",
            '\t\t- undoable as "Turn Card"',
            '\t\t- icon "rotate"',
            "\t\tset its direction to up"
          ],
          js: [
            "export class Card extends Thing {",
            "  // - its direction is one of up or down",
            '  static Directions = ["up", "down"]',
            '  static { this.declareProp("direction", { oneOf: Card.Directions }) }',
            '  get direction() { return this.getProp("direction") }',
            '  set direction(value) { this.setProp("direction", value) }',
            "",
            "  turnOver() {",
            '    this.direction = "up"',
            "  }",
            "  get turnOverIsEnabled() {",
            '    return this.direction === "down"',
            "  }",
            "  get turnOverIsSelected() {",
            '    return this.direction === "up"',
            "  }",
            "}",
            'core.describeAction(Card, "turnOver", { title: "Turn It Over", shortcuts: ["meta+T", "F2"], icon: "rotate", enabledWhen: "turnOverIsEnabled", selectedWhen: "turnOverIsSelected", undoneAs: "Turn Card" })'
          ],
          ts: [
            "export type Direction = (typeof Card.Directions)[number]",
            "",
            "export class Card extends Thing {",
            "  // - its direction is one of up or down",
            '  static Directions = ["up", "down"] as const',
            "  @prop({ oneOf: () => Card.Directions })",
            "  accessor direction!: Direction",
            "",
            "  turnOver() {",
            '    this.direction = "up"',
            "  }",
            "  get turnOverIsEnabled() {",
            '    return this.direction === "down"',
            "  }",
            "  get turnOverIsSelected() {",
            '    return this.direction === "up"',
            "  }",
            "}",
            'core.describeAction(Card, "turnOver", { title: "Turn It Over", shortcuts: ["meta+T", "F2"], icon: "rotate", enabledWhen: "turnOverIsEnabled", selectedWhen: "turnOverIsSelected", undoneAs: "Turn Card" })'
          ]
        },
        {
          title: "only in a template's action:  a loose function has no description",
          input: ["to start the game:", "\tshortcut meta+N"],
          js: ["export function startTheGame() {", '  /* PARSE ERROR: Don\'t understand "shortcut meta+N" */', "}"]
        }
      ]
    }
  ]
})
methods.addRule(ActionDetail, { syntax: "enabled when {enabled:expression}" })
// ... turned round (epic `language` T132):  the same getter, `not` of it;  an action says one or the other
methods.addRule(ActionDetail, {
  syntax: "disabled when {disabled:expression}",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "`disabled when` is `enabled when` turned round:  the same getter, giving back `not` of its condition",
          input: [
            "a card is a thing where:",
            "\t- its direction is one of up or down",
            "\t- to turn it over:",
            "\t\t- disabled when its direction is up",
            "\t\tset its direction to up"
          ],
          js: [
            "export class Card extends Thing {",
            "  // - its direction is one of up or down",
            '  static Directions = ["up", "down"]',
            '  static { this.declareProp("direction", { oneOf: Card.Directions }) }',
            '  get direction() { return this.getProp("direction") }',
            '  set direction(value) { this.setProp("direction", value) }',
            "",
            "  turnOver() {",
            '    this.direction = "up"',
            "  }",
            "  get turnOverIsEnabled() {",
            '    return !(this.direction === "up")',
            "  }",
            "}",
            'core.describeAction(Card, "turnOver", { title: "Turn It Over", enabledWhen: "turnOverIsEnabled", undoneAs: "Turn It Over" })'
          ],
          ts: [
            "export type Direction = (typeof Card.Directions)[number]",
            "",
            "export class Card extends Thing {",
            "  // - its direction is one of up or down",
            '  static Directions = ["up", "down"] as const',
            "  @prop({ oneOf: () => Card.Directions })",
            "  accessor direction!: Direction",
            "",
            "  turnOver() {",
            '    this.direction = "up"',
            "  }",
            "  get turnOverIsEnabled() {",
            '    return !(this.direction === "up")',
            "  }",
            "}",
            'core.describeAction(Card, "turnOver", { title: "Turn It Over", enabledWhen: "turnOverIsEnabled", undoneAs: "Turn It Over" })'
          ]
        }
      ]
    }
  ]
})
methods.addRule(ActionDetail, { syntax: "selected when {selected:expression}" })
methods.addRule(ActionDetail, { syntax: "(undoable:undoable)" })
methods.addRule(ActionDetail, {
  syntax: "(cantBeUndone:can't be undone|cannot be undone|can not be undone)",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title:
            "every action is one undo step by itself, named by its title;  `can't be undone` says it isn't (epic `language` P55, Q60)",
          input: [
            "a card is a thing where:",
            "\t- to turn it over:",
            "\t\tprint 1",
            "\t- to peek:",
            "\t\t- can't be undone",
            "\t\tprint 2"
          ],
          js: [
            "export class Card extends Thing {",
            "  turnOver() {",
            "    core.console.log(1)",
            "  }",
            "",
            "  peek() {",
            "    core.console.log(2)",
            "  }",
            "}",
            'core.describeAction(Card, "turnOver", { title: "Turn It Over", undoneAs: "Turn It Over" })',
            'core.describeAction(Card, "peek", { title: "Peek", cantBeUndone: "keeps history" })'
          ]
        },
        {
          input: ["a card is a thing where:", "\t- to peek, can't be undone:", "\t\tprint 2"],
          js: [
            "export class Card extends Thing {",
            "  peek() {",
            "    core.console.log(2)",
            "  }",
            "}",
            'core.describeAction(Card, "peek", { title: "Peek", cantBeUndone: "keeps history" })'
          ]
        }
      ]
    }
  ]
})
methods.addRule(ActionDetail, { syntax: "undoable as {undoneAs:text}" })
methods.addRule(ActionDetail, { syntax: "icon {icon:text}" })
methods.addRule(ActionDetail, { syntax: "(replacesLast:a new one replaces the last one)" })
methods.addRule(ActionDetail, {
  syntax: "titled {title:text}",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "a title of its own:  menus, key tooltips and the Inspector show it",
          input: [
            "a game is a thing where:",
            "\t- to compile and run:",
            '\t\t- titled "Compile and Run"',
            "\t\tprint 1"
          ],
          js: [
            "export class Game extends Thing {",
            "  compileAndRun() {",
            "    core.console.log(1)",
            "  }",
            "}",
            'core.describeAction(Game, "compileAndRun", { title: "Compile and Run", undoneAs: "Compile and Run" })'
          ]
        },
        {
          title: "a fill-in:  a getter, which the title follows",
          input: [
            "a game is a thing where:",
            '\t- its "name" is text',
            "\t- to duplicate it:",
            '\t\t- titled "Duplicate [its name]…"',
            "\t\tprint 1"
          ],
          js: [
            "export class Game extends Thing {",
            '  // - its "name" is text',
            '  static { this.declareProp("name", { type: "text" }) }',
            '  get name() { return this.getProp("name") }',
            '  set name(value) { this.setProp("name", value) }',
            "",
            "  duplicate() {",
            "    core.console.log(1)",
            "  }",
            "  get duplicateTitle() {",
            "    return `Duplicate ${this.name}…`",
            "  }",
            "}",
            'core.describeAction(Game, "duplicate", { title: "Duplicate It", titleFrom: "duplicateTitle", undoneAs: "Duplicate It" })'
          ],
          ts: [
            "export class Game extends Thing {",
            '  // - its "name" is text',
            '  @prop({ type: "text" })',
            "  accessor name!: string",
            "",
            "  duplicate() {",
            "    core.console.log(1)",
            "  }",
            "  get duplicateTitle() {",
            "    return `Duplicate ${this.name}…`",
            "  }",
            "}",
            'core.describeAction(Game, "duplicate", { title: "Duplicate It", titleFrom: "duplicateTitle", undoneAs: "Duplicate It" })'
          ]
        }
      ]
    }
  ]
})

// an action called off:  `cancel`, `cancel if ...`, `cancel unless ...` -- its condition's word, then the rule (epic `language` P56)
methods.addRule(Wording.specialize({ ruleName: "cancel_when", meanings: ["if", "unless"] }), {
  syntax: "((if:if)|(unless:unless))"
})

methods.addRule(CancelThisAction, {
  syntax: "cancel ({when:cancel_when} {condition:expression})?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "an action's step:  it calls the action off, and the action answers yes or no",
          input: [
            "a card is a thing",
            '\tits "rank" is a number',
            "\tto play it",
            "\t\tcancel if its rank is 0",
            "\t\tprint its rank"
          ],
          js: [
            "export class Card extends Thing {",
            '  // - its "rank" is a number',
            '  static { this.declareProp("rank", { type: "number" }) }',
            '  get rank() { return this.getProp("rank") }',
            '  set rank(value) { this.setProp("rank", value) }',
            "",
            "  play() {",
            "    if (this.rank === 0) core.cancel()",
            "    core.console.log(this.rank)",
            "  }",
            "}",
            'core.describeAction(Card, "play", { title: "Play It", cancels: true, undoneAs: "Play It" })'
          ],
          ts: [
            "export class Card extends Thing {",
            '  // - its "rank" is a number',
            '  @prop({ type: "number" })',
            "  accessor rank!: number",
            "",
            "  play() {",
            "    if (this.rank === 0) core.cancel()",
            "    core.console.log(this.rank)",
            "  }",
            "}",
            'core.describeAction(Card, "play", { title: "Play It", cancels: true, undoneAs: "Play It" })'
          ]
        },
        {
          title: "`unless`:  its condition turned round",
          input: ["a card is a thing", '\tits "rank" is a number', "\tto play it", "\t\tcancel unless its rank is 0"],
          js: [
            "export class Card extends Thing {",
            '  // - its "rank" is a number',
            '  static { this.declareProp("rank", { type: "number" }) }',
            '  get rank() { return this.getProp("rank") }',
            '  set rank(value) { this.setProp("rank", value) }',
            "",
            "  play() {",
            "    if (!(this.rank === 0)) core.cancel()",
            "  }",
            "}",
            'core.describeAction(Card, "play", { title: "Play It", cancels: true, undoneAs: "Play It" })'
          ],
          ts: [
            "export class Card extends Thing {",
            '  // - its "rank" is a number',
            '  @prop({ type: "number" })',
            "  accessor rank!: number",
            "",
            "  play() {",
            "    if (!(this.rank === 0)) core.cancel()",
            "  }",
            "}",
            'core.describeAction(Card, "play", { title: "Play It", cancels: true, undoneAs: "Play It" })'
          ]
        },
        {
          title: "on its own, in a top-level action",
          input: ["to deal the cards", "\tcancel"],
          js: [
            "export function dealTheCards() {",
            '  return core.asAction({ undoneAs: "Deal the Cards", cancels: true }, () => {',
            "    core.cancel()",
            "  })",
            "}"
          ]
        },
        {
          title: "a condition going on over a line starting `or`",
          input: [
            "a card is a thing",
            '\tits "rank" is a number',
            "\tto play it",
            "\t\tcancel if its rank is 0",
            "\t\t\tor its rank is 1"
          ],
          js: [
            "export class Card extends Thing {",
            '  // - its "rank" is a number',
            '  static { this.declareProp("rank", { type: "number" }) }',
            '  get rank() { return this.getProp("rank") }',
            '  set rank(value) { this.setProp("rank", value) }',
            "",
            "  play() {",
            "    if (this.rank === 0 || this.rank === 1) core.cancel()",
            "  }",
            "}",
            'core.describeAction(Card, "play", { title: "Play It", cancels: true, undoneAs: "Play It" })'
          ],
          ts: [
            "export class Card extends Thing {",
            '  // - its "rank" is a number',
            '  @prop({ type: "number" })',
            "  accessor rank!: number",
            "",
            "  play() {",
            "    if (this.rank === 0 || this.rank === 1) core.cancel()",
            "  }",
            "}",
            'core.describeAction(Card, "play", { title: "Play It", cancels: true, undoneAs: "Play It" })'
          ]
        },
        {
          title: "refused outside an action's steps",
          input: ["cancel"],
          js: '/* PARSE ERROR: "cancel" calls off an action:  it goes in one\'s steps, under "to ..." or "after ..." */'
        }
      ]
    }
  ]
})

methods.addRule(AfterHook, {
  roles: { band: "action", signature: "declaration" },
  syntax: "after {signature:method_signature} (:|,)? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "steps at the end of an action:  a method, added to the action's hooks",
          input: [
            "a card is a thing",
            "a pile is a list of cards",
            "to put a card on a pile",
            "\tadd the card to the pile",
            "after putting a card on a pile",
            "\tprint the card",
            "after putting a card on a pile",
            "\tprint the pile"
          ],
          js: [
            "export class Card extends Thing {",
            "  putOnPile(pile) {",
            "    pile.append(this)",
            "  }",
            "",
            "  afterPutOnPile(pile) {",
            "    core.console.log(this)",
            "  }",
            "",
            "  afterPutOnPile2(pile) {",
            "    core.console.log(pile)",
            "  }",
            "}",
            'core.describeAction(Card, "putOnPile", { title: "Put Card on Pile", undoneAs: "Put Card on Pile" })',
            'core.addAfterHook(Card, "putOnPile", { hook: "afterPutOnPile" })',
            'core.addAfterHook(Card, "putOnPile", { hook: "afterPutOnPile2" })',
            "export class Pile extends List {",
            "  static instanceType = Card",
            "}"
          ],
          ts: [
            "export class Card extends Thing {",
            "  putOnPile(pile: Pile) {",
            "    pile.append(this)",
            "  }",
            "",
            "  afterPutOnPile(pile: Pile) {",
            "    core.console.log(this)",
            "  }",
            "",
            "  afterPutOnPile2(pile: Pile) {",
            "    core.console.log(pile)",
            "  }",
            "}",
            'core.describeAction(Card, "putOnPile", { title: "Put Card on Pile", undoneAs: "Put Card on Pile" })',
            'core.addAfterHook(Card, "putOnPile", { hook: "afterPutOnPile" })',
            'core.addAfterHook(Card, "putOnPile", { hook: "afterPutOnPile2" })',
            "export class Pile extends List<Card> {",
            "  static instanceType = Card",
            "}"
          ]
        },
        {
          title: "refused when no action above it reads that way",
          input: [
            "a card is a thing",
            "a pile is a list of cards",
            "after putting a card on a pile",
            "\tprint the card"
          ],
          js: [
            "export class Card extends Thing {}",
            "export class Pile extends List {",
            "  static instanceType = Card",
            "}",
            '/* PARSE ERROR: "after putting a card on a pile" runs after an action, but no action above it reads that way:  as in "after putting a card on a pile", for "to put a card on a pile" */',
            '/* PARSE ERROR: Don\'t understand "print the card" */'
          ],
          ts: [
            "export class Card extends Thing {}",
            "export class Pile extends List<Card> {",
            "  static instanceType = Card",
            "}",
            '/* PARSE ERROR: "after putting a card on a pile" runs after an action, but no action above it reads that way:  as in "after putting a card on a pile", for "to put a card on a pile" */',
            '/* PARSE ERROR: Don\'t understand "print the card" */'
          ]
        }
      ]
    }
  ]
})

// the steps around an action (epic `data` P50):  before it, while it runs, and when it fails
methods.addRule(BeforeHook, {
  roles: { band: "action", signature: "declaration" },
  syntax: "before {signature:method_signature} (:|,)? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "steps before an action's own:  cancel stops it",
          input: [
            "a job is a thing",
            '\tits "status" is text',
            "to complete a job",
            '\tset the job\'s status to "done"',
            "before completing a job",
            '\tcancel if the job\'s status is "done"'
          ],
          js: [
            "export class Job extends Thing {",
            '  // - its "status" is text',
            '  static { this.declareProp("status", { type: "text" }) }',
            '  get status() { return this.getProp("status") }',
            '  set status(value) { this.setProp("status", value) }',
            "",
            "  complete() {",
            '    this.status = "done"',
            "  }",
            "",
            "  beforeComplete() {",
            '    if (this.status === "done") core.cancel()',
            "  }",
            "}",
            'core.describeAction(Job, "complete", { title: "Complete Job", undoneAs: "Complete Job" })',
            'core.addActionHook(Job, "complete", { moment: "before", hook: "beforeComplete", level: "app" })'
          ],
          ts: [
            "export class Job extends Thing {",
            '  // - its "status" is text',
            '  @prop({ type: "text" })',
            "  accessor status!: string",
            "",
            "  complete() {",
            '    this.status = "done"',
            "  }",
            "",
            "  beforeComplete() {",
            '    if (this.status === "done") core.cancel()',
            "  }",
            "}",
            'core.describeAction(Job, "complete", { title: "Complete Job", undoneAs: "Complete Job" })',
            'core.addActionHook(Job, "complete", { moment: "before", hook: "beforeComplete", level: "app" })'
          ]
        }
      ]
    }
  ]
})
methods.addRule(WhileHook, {
  roles: { band: "action", signature: "declaration" },
  syntax: "while {signature:method_signature} (:|,)? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "steps as an action starts, put back when it ends",
          input: [
            "a job is a thing",
            '\tits "status" is text',
            "to complete a job",
            '\tset the job\'s status to "done"',
            "while completing a job",
            '\tset the job\'s status to "busy"'
          ],
          js: [
            "export class Job extends Thing {",
            '  // - its "status" is text',
            '  static { this.declareProp("status", { type: "text" }) }',
            '  get status() { return this.getProp("status") }',
            '  set status(value) { this.setProp("status", value) }',
            "",
            "  complete() {",
            '    this.status = "done"',
            "  }",
            "",
            "  whileComplete() {",
            '    this.status = "busy"',
            "  }",
            "}",
            'core.describeAction(Job, "complete", { title: "Complete Job", undoneAs: "Complete Job" })',
            'core.addActionHook(Job, "complete", { moment: "while", hook: "whileComplete", level: "app" })'
          ],
          ts: [
            "export class Job extends Thing {",
            '  // - its "status" is text',
            '  @prop({ type: "text" })',
            "  accessor status!: string",
            "",
            "  complete() {",
            '    this.status = "done"',
            "  }",
            "",
            "  whileComplete() {",
            '    this.status = "busy"',
            "  }",
            "}",
            'core.describeAction(Job, "complete", { title: "Complete Job", undoneAs: "Complete Job" })',
            'core.addActionHook(Job, "complete", { moment: "while", hook: "whileComplete", level: "app" })'
          ]
        }
      ]
    }
  ]
})
methods.addRule(FailureHook, {
  syntax: "(if|when) {signature:method_signature} fails (:|,)? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "steps when an action fails:  its last if passes on what no branch caught",
          input: [
            "a job is a thing",
            '\tits "status" is text',
            "to complete a job",
            '\tset the job\'s status to "done"',
            "if completing a job fails",
            '\tif the error is "not found"',
            "\t\tnevermind",
            '\totherwise if the error is "offline"',
            "\t\tpass the error"
          ],
          js: [
            "export class Job extends Thing {",
            '  // - its "status" is text',
            '  static { this.declareProp("status", { type: "text" }) }',
            '  get status() { return this.getProp("status") }',
            '  set status(value) { this.setProp("status", value) }',
            "",
            "  complete() {",
            '    this.status = "done"',
            "  }",
            "",
            "  failedComplete(error) {",
            '    if (core.errorIs(error, "not found")) return',
            '    else if (core.errorIs(error, "offline")) return core.passTheError()',
            "    return core.passTheError()",
            "  }",
            "}",
            'core.describeAction(Job, "complete", { title: "Complete Job", undoneAs: "Complete Job" })',
            'core.addActionHook(Job, "complete", { moment: "failed", hook: "failedComplete", level: "app" })'
          ],
          ts: [
            "export class Job extends Thing {",
            '  // - its "status" is text',
            '  @prop({ type: "text" })',
            "  accessor status!: string",
            "",
            "  complete() {",
            '    this.status = "done"',
            "  }",
            "",
            "  failedComplete(error: any /* spell: type unknown */) {",
            '    if (core.errorIs(error, "not found")) return',
            '    else if (core.errorIs(error, "offline")) return core.passTheError()',
            "    return core.passTheError()",
            "  }",
            "}",
            'core.describeAction(Job, "complete", { title: "Complete Job", undoneAs: "Complete Job" })',
            'core.addActionHook(Job, "complete", { moment: "failed", hook: "failedComplete", level: "app" })'
          ]
        },
        {
          title: "when ... fails reads the same",
          input: [
            "a job is a thing",
            '\tits "status" is text',
            "to complete a job",
            '\tset the job\'s status to "done"',
            "when completing a job fails",
            "\tprint the error"
          ],
          js: [
            "export class Job extends Thing {",
            '  // - its "status" is text',
            '  static { this.declareProp("status", { type: "text" }) }',
            '  get status() { return this.getProp("status") }',
            '  set status(value) { this.setProp("status", value) }',
            "",
            "  complete() {",
            '    this.status = "done"',
            "  }",
            "",
            "  failedComplete(error) {",
            "    core.console.log(error)",
            "  }",
            "}",
            'core.describeAction(Job, "complete", { title: "Complete Job", undoneAs: "Complete Job" })',
            'core.addActionHook(Job, "complete", { moment: "failed", hook: "failedComplete", level: "app" })'
          ],
          ts: [
            "export class Job extends Thing {",
            '  // - its "status" is text',
            '  @prop({ type: "text" })',
            "  accessor status!: string",
            "",
            "  complete() {",
            '    this.status = "done"',
            "  }",
            "",
            "  failedComplete(error: any /* spell: type unknown */) {",
            "    core.console.log(error)",
            "  }",
            "}",
            'core.describeAction(Job, "complete", { title: "Complete Job", undoneAs: "Complete Job" })',
            'core.addActionHook(Job, "complete", { moment: "failed", hook: "failedComplete", level: "app" })'
          ]
        }
      ]
    }
  ]
})

// a function from one of the project's code files, in an action's steps:
// `call native copyText with text` -- see `SP.NativeCode`
methods.addRule(CallNative, {
  syntax: "call native {name:identifier} (with [{args:expression} ,])?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "refused outside an action's steps",
          input: ["call native copyText with 1"],
          js: '/* PARSE ERROR: "call native copyText with 1" calls a function from the project\'s code:  it goes in an action\'s steps, under "to ..." */'
        },
        {
          title: "a project with no code files:  it says to list one",
          input: ["to copy (text as text) to the clipboard", "\tcall native copyText with text"],
          js: [
            "export function copyTextToTheClipboard(text) {",
            '  /* PARSE ERROR: "copyText" isn\'t in any code file:  list one in the project file first, e.g. "/clipboard.ts" */',
            "}"
          ],
          ts: [
            "export function copyTextToTheClipboard(text: string) {",
            '  /* PARSE ERROR: "copyText" isn\'t in any code file:  list one in the project file first, e.g. "/clipboard.ts" */',
            "}"
          ]
        }
      ]
    }
  ]
})

// which code file a Spell file's natives come from, at its top:
// `use copyText from clipboard.ts`, `use a, b from clipboard.ts`, `use all from clipboard.ts`
methods.addRule(UseNatives, {
  syntax: "use ((all:all)|[{names:identifier} ,]) from {file:identifier} \\. {ending:identifier}",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "a project with no such code file:  it says to list it",
          input: ["use copyText from clipboard.ts"],
          js: "/* PARSE ERROR: \"clipboard.ts\" isn't one of the project's code files:  list it in the project file first */"
        }
      ]
    }
  ]
})
