/**
 * The `methods` rules in English:  each rule's syntax and its tests, registered on the `methods` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `methods.<lang>.ts` (epic `spanish`).
 */
import { P } from "spell-lang/parser"
import { Synonyms, Wording } from "spell-lang/spell/rules/expressions"

import { methods } from "./methods.parser"
import { BareTypeArg } from "./BareTypeArg"
import { CreateAnimation } from "./CreateAnimation"
import { CreateHook } from "./CreateHook"
import { MethodKeyword } from "./MethodKeyword"
import { MethodSignature } from "./MethodSignature"
import { QuotedMethodSignature } from "./QuotedMethodSignature"
import { QuotedSignatureWords } from "./QuotedSignatureWords"
import { QuotedTypeExpression } from "./QuotedTypeExpression"
import { ToDoSomething } from "./ToDoSomething"
import { TypedMethodArg } from "./TypedMethodArg"
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

// the words of what runs as a thing is made, in its type's outline:  `- when created:` -- see `CreateHook`
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
  syntax: `({bare_type_arg}|{method_keyword}|\\( {method_arg} \\))+`
})

methods.addRule(QuotedSignatureWords, {
  syntax: `({method_keyword}|\\( {method_arg} \\))+`
})

methods.addRule(QuotedMethodSignature)

methods.addRule(ToDoSomething, {
  // TODO: add tests for `test` case
  syntax: `to (asTest:test)? {signature:method_signature} :? {statement_body}?`,
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
          js: ["Card.prototype.giveToPile = function (pile) {", "  this.pile = pile", "}"],
          ts: [
            "export interface Card { giveToPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.giveToPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}"
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
          js: ["export function notifyMessage(message) {", "  return core.console.log(message)", "}"],
          ts: [
            "export function notifyMessage(message: any /* spell: type unknown */) {",
            "  return core.console.log(message)",
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
          js: ["export function notifyMessage(message) {", "  return core.console.log(message)", "}"],
          ts: ["export function notifyMessage(message: string) {", "  return core.console.log(message)", "}"]
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
          js: ['export function notifyMessage(message = "Really?") {', "  return core.console.log(message)", "}"],
          ts: [
            'export function notifyMessage(message: string = "Really?") {',
            "  return core.console.log(message)",
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
          js: ["Card.prototype.addToPile = function (pile) {", "  this.pile = pile", "}"],
          ts: [
            "export interface Card { addToPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.addToPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}"
          ]
        },
        {
          title: "multiple type args in signature - it",
          input: "to add (a card) to (a pile): set the pile of it to the pile",
          js: ["Card.prototype.addToPile = function (pile) {", "  this.pile = pile", "}"],
          ts: [
            "export interface Card { addToPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.addToPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}"
          ]
        },
        {
          title: "multiple type args in signature - its",
          input: "to add (a card) to (a pile): set its pile to the pile",
          js: ["Card.prototype.addToPile = function (pile) {", "  this.pile = pile", "}"],
          ts: [
            "export interface Card { addToPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.addToPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}"
          ]
        },
        {
          title: "typed arg in signature -- arg name",
          input: "to show (thing as a card): print the thing",
          js: [`Card.prototype.show = function () {`, `  return core.console.log(this)`, `}`],
          ts: [
            "export interface Card { show(): any /* spell: type unknown */ }",
            "Card.prototype.show = function (this: Card) {",
            "  return core.console.log(this)",
            "}"
          ]
        },
        {
          title: "typed arg in signature -- thisVar",
          input: "to show (thing as a card): print the card",
          js: [`Card.prototype.show = function () {`, `  return core.console.log(this)`, `}`],
          ts: [
            "export interface Card { show(): any /* spell: type unknown */ }",
            "Card.prototype.show = function (this: Card) {",
            "  return core.console.log(this)",
            "}"
          ]
        },
        {
          title: "typed arg in signature -- it",
          input: "to show (thing as a card): print it",
          js: [`Card.prototype.show = function () {`, `  return core.console.log(this)`, `}`],
          ts: [
            "export interface Card { show(): any /* spell: type unknown */ }",
            "Card.prototype.show = function (this: Card) {",
            "  return core.console.log(this)",
            "}"
          ]
        },
        {
          title: "typed arg in signature -- its",
          input: "to show (thing as a card): print its name",
          js: [`Card.prototype.show = function () {`, `  return core.console.log(this.name)`, `}`],
          ts: [
            "export interface Card { show(): any /* spell: type unknown */ }",
            "Card.prototype.show = function (this: Card) {",
            "  return core.console.log(this.name)",
            "}"
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
            "}"
          ],
          ts: [
            "export interface Card { show(): any /* spell: type unknown */ }",
            "Card.prototype.show = function (this: Card) {",
            "  core.console.log(this)",
            "  const it = this.name",
            "  core.console.log(it)",
            "}"
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
          js: ["export function startTheGame() {", "  core.console.log(1)", "}", "startTheGame()"]
        },
        {
          title: "top level simple argument method",
          input: ["to notify (message): print the message", "notify 1"],
          js: [
            "export function notifyMessage(message) {",
            "  return core.console.log(message)",
            "}",
            "notifyMessage(1)"
          ],
          ts: [
            "export function notifyMessage(message: any /* spell: type unknown */) {",
            "  return core.console.log(message)",
            "}",
            "notifyMessage(1)"
          ]
        },
        {
          title: "top level typed simple argument method",
          input: ["to notify (message as text): print the message", 'notify "hi"'],
          js: [
            "export function notifyMessage(message) {",
            "  return core.console.log(message)",
            "}",
            'notifyMessage("hi")'
          ],
          ts: [
            "export function notifyMessage(message: string) {",
            "  return core.console.log(message)",
            "}",
            'notifyMessage("hi")'
          ]
        },
        {
          title:
            "typed call:  an argument KNOWN to be the wrong type isn't a call to it -- here, the built-in `notify`",
          input: ["to notify (message as text): print the message", "notify 1"],
          js: ["export function notifyMessage(message) {", "  return core.console.log(message)", "}", "core.notify(1)"],
          ts: [
            "export function notifyMessage(message: string) {",
            "  return core.console.log(message)",
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
            "(new Joker()).showOnPile(new Pile())",
            '/* PARSE ERROR: Don\'t understand "show a new card on a new card" */'
          ],
          ts: [
            "export class Joker extends Card {}",
            "export interface Card { showOnPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.showOnPile = function (this: Card, pile: Pile) {",
            "  return core.console.log(1)",
            "}",
            "(new Joker()).showOnPile(new Pile())",
            '/* PARSE ERROR: Don\'t understand "show a new card on a new card" */'
          ]
        },
        {
          title: "type arg in signature",
          input: ["to show (a card): print the card", "show a new card"],
          js: ["Card.prototype.show = function () {", "  return core.console.log(this)", "}", "(new Card()).show()"],
          ts: [
            "export interface Card { show(): any /* spell: type unknown */ }",
            "Card.prototype.show = function (this: Card) {",
            "  return core.console.log(this)",
            "}",
            "(new Card()).show()"
          ]
        },
        {
          title: "multiple type args in signature",
          input: ["to play (a card) on (a pile): set its pile to the pile", "play a new card on a new pile"],
          js: [
            "Card.prototype.playOnPile = function (pile) {",
            "  this.pile = pile",
            "}",
            "(new Card()).playOnPile(new Pile())"
          ],
          ts: [
            "export interface Card { playOnPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.playOnPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}",
            "(new Card()).playOnPile(new Pile())"
          ]
        },
        {
          title: "paren-free type args in signature",
          input: ["to play a card on a pile: set its pile to the pile", "play a new card on a new pile"],
          js: [
            "Card.prototype.playOnPile = function (pile) {",
            "  this.pile = pile",
            "}",
            "(new Card()).playOnPile(new Pile())"
          ],
          ts: [
            "export interface Card { playOnPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.playOnPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}",
            "(new Card()).playOnPile(new Pile())"
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
            "  const { message } = props",
            "  core.console.log(message)",
            "}",
            "notify()"
          ],
          ts: [
            "export function notify(props: Object = {}) {",
            "  const { message } = props",
            "  core.console.log(message)",
            "}",
            "notify()"
          ]
        },

        {
          title: "simple variable props",
          input: ["to notify (with message):", "\tprint the message", 'notify with message = "It worked!"'],
          js: [
            "export function notify(props = {}) {",
            "  const { message } = props",
            "  core.console.log(message)",
            "}",
            'notify({ message: "It worked!" })'
          ],
          ts: [
            "export function notify(props: Object = {}) {",
            "  const { message } = props",
            "  core.console.log(message)",
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
            "  const { card } = props",
            "  core.console.log(card)",
            "}",
            "play({ card: new Card() })",
            'play({ card: new Card({ suit: "hearts" }) })'
          ],
          ts: [
            "export function play(props: { card?: Card } = {}) {",
            "  const { card } = props",
            "  core.console.log(card)",
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
            '  const { message = "nope" } = props',
            "  core.console.log(message)",
            "}",
            'notify({ message: "Ship it!!" })'
          ],
          ts: [
            "export function notify(props: Object = {}) {",
            '  const { message = "nope" } = props',
            "  core.console.log(message)",
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
            '  const { message = "nope", reply = "yep" } = props',
            "  core.console.log(message + reply)",
            "}",
            'notify({ message: "How many?" })',
            'notify({ message: "How many?", reply: 2 })'
          ],
          ts: [
            "export function notify(props: Object = {}) {",
            '  const { message = "nope", reply = "yep" } = props',
            "  core.console.log(message + reply)",
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
            '  const { name, message, reply = "yep" } = props',
            "  core.console.log(name + message + reply)",
            "}",
            "notify({",
            '  name: "Bob",',
            '  message: "How many?",',
            "  reply: 2",
            "})"
          ],
          ts: [
            "export function notify(props: { name?: any /* spell?: type unknown */; message?: string; reply?: any /* spell?: type unknown */ } = {}) {",
            '  const { name, message, reply = "yep" } = props',
            "  core.console.log(name + message + reply)",
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
            '  const { reply = "yep" } = props',
            "  core.console.log(message)",
            "  core.console.log(reply)",
            "}",
            'notifyMessage("Really?", { reply: "yes" })'
          ],
          ts: [
            "export function notifyMessage(message: any /* spell: type unknown */, props: Object = {}) {",
            '  const { reply = "yep" } = props',
            "  core.console.log(message)",
            "  core.console.log(reply)",
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
            "  const { message } = props",
            "  core.console.log(message)",
            "}",
            'notify({ message: "It worked!", reply: "No it didn\'t" })'
          ],
          ts: [
            "export function notify(props: Object = {}) {",
            "  const { message } = props",
            "  core.console.log(message)",
            "}",
            'notify({ message: "It worked!", reply: "No it didn\'t" })'
          ]
        }
      ]
    }
  ]
})

methods.addRule(CreateAnimation, {
  syntax: `(asAnimation:create? animation) {signature:method_signature} :? {statement_body}?`,
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
          js: [
            "export async function dealTheCards() {",
            '  if (core.processIsRunning("deal_the_cards")) return',
            '  core.startProcess("deal_the_cards", "EXCLUSIVE")',
            "  try {}",
            "  finally {",
            '    core.stopProcess("deal_the_cards")',
            "  }",
            "}"
          ]
        },
        {
          input: ["animation deal the cards", "\tpause for 10 seconds"],
          js: [
            "export async function dealTheCards() {",
            '  if (core.processIsRunning("deal_the_cards")) return',
            '  core.startProcess("deal_the_cards", "EXCLUSIVE")',
            "  try {",
            '    await core.pauseFor(10, "seconds")',
            "  }",
            "  finally {",
            '    core.stopProcess("deal_the_cards")',
            "  }",
            "}"
          ]
        }
      ]
    }
  ]
})

methods.addRule(QuotedTypeExpression, {
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

// what runs as a thing is made, in its type's outline:  `- when created (with ...):`, also `- when creating it:` (epic `spanish` P28)
methods.addRule(CreateHook, {
  syntax: "when {signature:method_signature} :? {statement_body}?",
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
          ["a task is a thing where:", "\t- when creating it:", "\t\tprint 1"],
          ["export class Task extends Thing {", "  create() {", "    core.console.log(1)", "  }", "}"],
          ["@thing", "export class Task extends Thing {", "  create() {", "    core.console.log(1)", "  }", "}"]
        ]
      ]
    }
  ]
})
