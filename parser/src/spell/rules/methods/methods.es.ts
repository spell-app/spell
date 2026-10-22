/**
 * The `methods` rules in Spanish:  each rule's syntax and its tests, registered on Spanish's own `methods` parser
 * (epic `spanish`).
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `methods.en.ts`:  a tie between two rules goes to the first.
 * - Its tests are English's, said in Spanish.
 *   - A person's own TYPE and variable names stay as English's tests have them (`card`, `pile`, `message`).
 *   - A method's words are Spanish (`para mover (una card) a (una pile)`), so its compiled name follows them:
 *     `moverAPile`, where English's is `moveToPile`.
 *   - A parse error quotes the line as written, in Spanish.
 */
import { P } from "spell-lang/parser"
import { SpellParser } from "spell-lang/spell/SpellParser"
import { Synonyms } from "spell-lang/spell/rules/expressions"

import { BareTypeArg } from "./BareTypeArg"
import { CreateAnimation } from "./CreateAnimation"
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

/** Spanish's `methods` rules. */
export const methodsEs = new SpellParser({ module: "methods" })

// the word before a method's receiver, where a type's outline body leaves it out:
// `repartir las cartas del solitario` -- see `MethodDefinition.takeSubject()`
methodsEs.addRule(Synonyms.specialize({ ruleName: "receiver_of" }), { syntax: "(de|del)" })

methodsEs.addRule(MethodKeyword)

methodsEs.addRule(VarMethodArg)

methodsEs.addRule(ValuedVarMethodArg, {
  syntax: `{identifier} (=|es|de|como) {value:expression}`
})

methodsEs.addRule(TypeMethodArg, {
  syntax: `(un|una) {type}`
})

methodsEs.addRule(BareTypeArg, {
  syntax: `(un|una) {type:known_type}`
})

methodsEs.addRule(TypedMethodArg, {
  syntax: `{identifier} como (un|una)? {type}`
})

methodsEs.addRule(WithPropsArg, {
  syntax: "con [{simple_method_arg} (,|y|e)]"
})

methodsEs.addRule(MethodSignature, {
  syntax: `({bare_type_arg}|{method_keyword}|\\( {method_arg} \\))+`
})

methodsEs.addRule(QuotedSignatureWords, {
  syntax: `({method_keyword}|\\( {method_arg} \\))+`
})

methodsEs.addRule(QuotedMethodSignature)

methodsEs.addRule(ToDoSomething, {
  syntax: `para (asTest:probar)? {signature:method_signature} :? {statement_body}?`,
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
          input: "para empezar el juego",
          js: "export function empezarElJuego() {}"
        },
        {
          title: "keyword-only signature - `eso` (it) is not defined",
          input: "para empezar el juego: imprimir eso",
          js: ["export function empezarElJuego() {}", '/* PARSE ERROR: Don\'t understand "imprimir eso" */']
        },
        {
          title: "paren-free type arg in signature:  a known type is a parameter",
          input: "para crear una card",
          js: ["Card.prototype.crear = function () {}"],
          ts: [
            "export interface Card { crear(): any /* spell: type unknown */ }",
            "Card.prototype.crear = function (this: Card) {}"
          ]
        },
        {
          title: "paren-free type arg in signature - `eso` (it)",
          input: "para crear una card: imprimir eso",
          js: [`Card.prototype.crear = function () {`, `  return core.console.log(this)`, `}`],
          ts: [
            "export interface Card { crear(): any /* spell: type unknown */ }",
            "Card.prototype.crear = function (this: Card) {",
            "  return core.console.log(this)",
            "}"
          ]
        },
        {
          title: "paren-free type args in signature ~== parenthesized",
          input: "para dar una card a una pile: poner su pile a la pile",
          js: ["Card.prototype.darAPile = function (pile) {", "  this.pile = pile", "}"],
          ts: [
            "export interface Card { darAPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.darAPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}"
          ]
        },
        {
          title: "paren-free:  a word that isn't a type stays words",
          input: "para hacer un lío",
          js: "export function hacerUnLío() {}"
        },
        {
          title: "paren-free:  `el` + a type stays words",
          input: "para barajar el deck",
          js: "export function barajarElDeck() {}"
        },
        {
          title: "simple arg in signature - arg is defined",
          input: "para avisar (message): imprimir el message",
          js: ["export function avisarMessage(message) {", "  return core.console.log(message)", "}"],
          ts: [
            "export function avisarMessage(message: any /* spell: type unknown */) {",
            "  return core.console.log(message)",
            "}"
          ]
        },
        {
          title: "typed simple arg in signature - arg is defined",
          input: "para avisar (message como texto): imprimir el message",
          js: ["export function avisarMessage(message) {", "  return core.console.log(message)", "}"],
          ts: ["export function avisarMessage(message: string) {", "  return core.console.log(message)", "}"]
        },
        {
          title: "valued simple arg in signature - arg is defined",
          input: 'para avisar (message = "Really?"): imprimir el message',
          js: ['export function avisarMessage(message = "Really?") {', "  return core.console.log(message)", "}"],
          ts: [
            'export function avisarMessage(message: string = "Really?") {',
            "  return core.console.log(message)",
            "}"
          ]
        },
        {
          title: "type arg in signature - thisVar",
          input: "para crear (una card): imprimir la card",
          js: [`Card.prototype.crear = function () {`, `  return core.console.log(this)`, `}`],
          ts: [
            "export interface Card { crear(): any /* spell: type unknown */ }",
            "Card.prototype.crear = function (this: Card) {",
            "  return core.console.log(this)",
            "}"
          ]
        },
        {
          title: "type arg in signature - its",
          input: "para crear (una card): poner su number a 1",
          js: [`Card.prototype.crear = function () {`, `  this.number = 1`, `}`],
          ts: [
            "export interface Card { crear(): any /* spell: type unknown */ }",
            "Card.prototype.crear = function (this: Card) {",
            "  this.number = 1",
            "}"
          ]
        },
        {
          title: "multiple type args in signature - thisVar",
          input: "para agregar (una card) a (una pile): poner la pile de la card a la pile",
          js: ["Card.prototype.agregarAPile = function (pile) {", "  this.pile = pile", "}"],
          ts: [
            "export interface Card { agregarAPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.agregarAPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}"
          ]
        },
        {
          title: "multiple type args in signature - its",
          input: "para agregar (una card) a (una pile): poner su pile a la pile",
          js: ["Card.prototype.agregarAPile = function (pile) {", "  this.pile = pile", "}"],
          ts: [
            "export interface Card { agregarAPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.agregarAPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}"
          ]
        },
        {
          title: "typed arg in signature -- arg name",
          input: "para mostrar (thing como una card): imprimir la thing",
          js: [`Card.prototype.mostrar = function () {`, `  return core.console.log(this)`, `}`],
          ts: [
            "export interface Card { mostrar(): any /* spell: type unknown */ }",
            "Card.prototype.mostrar = function (this: Card) {",
            "  return core.console.log(this)",
            "}"
          ]
        },
        {
          title: "typed arg in signature -- thisVar",
          input: "para mostrar (thing como una card): imprimir la card",
          js: [`Card.prototype.mostrar = function () {`, `  return core.console.log(this)`, `}`],
          ts: [
            "export interface Card { mostrar(): any /* spell: type unknown */ }",
            "Card.prototype.mostrar = function (this: Card) {",
            "  return core.console.log(this)",
            "}"
          ]
        },
        {
          title: "typed arg in signature -- its",
          input: "para mostrar (thing como una card): imprimir su name",
          js: [`Card.prototype.mostrar = function () {`, `  return core.console.log(this.name)`, `}`],
          ts: [
            "export interface Card { mostrar(): any /* spell: type unknown */ }",
            "Card.prototype.mostrar = function (this: Card) {",
            "  return core.console.log(this.name)",
            "}"
          ]
        },
        {
          title: "typed arg in signature -- `eso` (it)",
          input: "para mostrar (thing como una card): imprimir eso",
          js: [`Card.prototype.mostrar = function () {`, `  return core.console.log(this)`, `}`],
          ts: [
            "export interface Card { mostrar(): any /* spell: type unknown */ }",
            "Card.prototype.mostrar = function (this: Card) {",
            "  return core.console.log(this)",
            "}"
          ]
        },
        {
          title: "typed var in signature: implicit `it` (`eso`, `ello`) gets remapped after `obtener`",
          input: ["para mostrar (thing como una card)", "\timprimir eso", "\tobtener su name", "\timprimir ello"],
          js: [
            "Card.prototype.mostrar = function () {",
            "  core.console.log(this)",
            "  const it = this.name",
            "  core.console.log(it)",
            "}"
          ],
          ts: [
            "export interface Card { mostrar(): any /* spell: type unknown */ }",
            "Card.prototype.mostrar = function (this: Card) {",
            "  core.console.log(this)",
            "  const it = this.name",
            "  core.console.log(it)",
            "}"
          ]
        },
        {
          title: "simple arg in signature - `eso` (it) is not defined",
          input: "para avisar (message): imprimir eso",
          js: ["export function avisarMessage(message) {}", '/* PARSE ERROR: Don\'t understand "imprimir eso" */'],
          ts: [
            "export function avisarMessage(message: any /* spell: type unknown */) {}",
            '/* PARSE ERROR: Don\'t understand "imprimir eso" */'
          ]
        },
        {
          title: "mixed vars in signature",
          input: "para preguntar (message como texto) y (reply)",
          js: "export function preguntarMessageYReply(message, reply) {}",
          ts: "export function preguntarMessageYReply(message: string, reply: any /* spell: type unknown */) {}"
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
          input: ["para empezar el juego", "\timprimir 1", "empezar el juego"],
          js: ["export function empezarElJuego() {", "  core.console.log(1)", "}", "empezarElJuego()"]
        },
        {
          title: "top level simple argument method",
          input: ["para notificar (message): imprimir el message", "notificar 1"],
          js: [
            "export function notificarMessage(message) {",
            "  return core.console.log(message)",
            "}",
            "notificarMessage(1)"
          ],
          ts: [
            "export function notificarMessage(message: any /* spell: type unknown */) {",
            "  return core.console.log(message)",
            "}",
            "notificarMessage(1)"
          ]
        },
        {
          title: "top level typed simple argument method",
          input: ["para notificar (message como texto): imprimir el message", 'notificar "hi"'],
          js: [
            "export function notificarMessage(message) {",
            "  return core.console.log(message)",
            "}",
            'notificarMessage("hi")'
          ],
          ts: [
            "export function notificarMessage(message: string) {",
            "  return core.console.log(message)",
            "}",
            'notificarMessage("hi")'
          ]
        },
        {
          title:
            "typed call:  an argument KNOWN to be the wrong type isn't a call to it -- here, the built-in `notificar`",
          input: ["para notificar (message como texto): imprimir el message", "notificar 1"],
          js: [
            "export function notificarMessage(message) {",
            "  return core.console.log(message)",
            "}",
            "core.notify(1)"
          ],
          ts: [
            "export function notificarMessage(message: string) {",
            "  return core.console.log(message)",
            "}",
            "core.notify(1)"
          ]
        },
        {
          title: "typed call:  a sub-type fits, an unrelated type doesn't",
          input: [
            "un joker es una card",
            "para mostrar (una card) en (una pile): imprimir 1",
            "mostrar un nuevo joker en una nueva pile",
            "mostrar una nueva card en una nueva card"
          ],
          js: [
            "export class Joker extends Card {}",
            "Card.prototype.mostrarEnPile = function (pile) {",
            "  return core.console.log(1)",
            "}",
            "(new Joker()).mostrarEnPile(new Pile())",
            '/* PARSE ERROR: Don\'t understand "mostrar una nueva card en una nueva card" */'
          ],
          ts: [
            "export class Joker extends Card {}",
            "export interface Card { mostrarEnPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.mostrarEnPile = function (this: Card, pile: Pile) {",
            "  return core.console.log(1)",
            "}",
            "(new Joker()).mostrarEnPile(new Pile())",
            '/* PARSE ERROR: Don\'t understand "mostrar una nueva card en una nueva card" */'
          ]
        },
        {
          title: "type arg in signature",
          input: ["para mostrar (una card): imprimir la card", "mostrar una nueva card"],
          js: [
            "Card.prototype.mostrar = function () {",
            "  return core.console.log(this)",
            "}",
            "(new Card()).mostrar()"
          ],
          ts: [
            "export interface Card { mostrar(): any /* spell: type unknown */ }",
            "Card.prototype.mostrar = function (this: Card) {",
            "  return core.console.log(this)",
            "}",
            "(new Card()).mostrar()"
          ]
        },
        {
          title: "multiple type args in signature",
          input: [
            "para jugar (una card) en (una pile): poner su pile a la pile",
            "jugar una nueva card en una nueva pile"
          ],
          js: [
            "Card.prototype.jugarEnPile = function (pile) {",
            "  this.pile = pile",
            "}",
            "(new Card()).jugarEnPile(new Pile())"
          ],
          ts: [
            "export interface Card { jugarEnPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.jugarEnPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}",
            "(new Card()).jugarEnPile(new Pile())"
          ]
        },
        {
          title: "paren-free type args in signature",
          input: ["para jugar una card en una pile: poner su pile a la pile", "jugar una nueva card en una nueva pile"],
          js: [
            "Card.prototype.jugarEnPile = function (pile) {",
            "  this.pile = pile",
            "}",
            "(new Card()).jugarEnPile(new Pile())"
          ],
          ts: [
            "export interface Card { jugarEnPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.jugarEnPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}",
            "(new Card()).jugarEnPile(new Pile())"
          ]
        },
        {
          title: "a test method:  its call says `probar`",
          input: ["para probar el juego", "\timprimir 1", "probar el juego"],
          js: [
            "export function testElJuego() {",
            '  return core.test("test el juego", function testElJuego() {',
            "    core.console.log(1)",
            "  })",
            "}",
            "testElJuego()"
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
          input: "para (foo)",
          js: '/* PARSE ERROR: Don\'t understand "para (foo)" */'
        },
        {
          title: "with arg is optional when calling",
          input: ["para notificar (con message):", "\timprimir el message", "notificar"],
          js: [
            "export function notificar(props = {}) {",
            "  const { message } = props",
            "  core.console.log(message)",
            "}",
            "notificar()"
          ],
          ts: [
            "export function notificar(props: Object = {}) {",
            "  const { message } = props",
            "  core.console.log(message)",
            "}",
            "notificar()"
          ]
        },
        {
          title: "simple variable props",
          input: ["para notificar (con message):", "\timprimir el message", 'notificar con message = "It worked!"'],
          js: [
            "export function notificar(props = {}) {",
            "  const { message } = props",
            "  core.console.log(message)",
            "}",
            'notificar({ message: "It worked!" })'
          ],
          ts: [
            "export function notificar(props: Object = {}) {",
            "  const { message } = props",
            "  core.console.log(message)",
            "}",
            'notificar({ message: "It worked!" })'
          ]
        },
        {
          title: "typed variable props",
          input: [
            "para jugar (con una card):",
            "\timprimir la card",
            "jugar con card = una nueva card",
            'jugar con card = una nueva card con suit de "hearts"'
          ],
          js: [
            "export function jugar(props = {}) {",
            "  const { card } = props",
            "  core.console.log(card)",
            "}",
            "jugar({ card: new Card() })",
            'jugar({ card: new Card({ suit: "hearts" }) })'
          ],
          ts: [
            "export function jugar(props: { card?: Card } = {}) {",
            "  const { card } = props",
            "  core.console.log(card)",
            "}",
            "jugar({ card: new Card() })",
            'jugar({ card: new Card({ suit: "hearts" }) })'
          ]
        },
        {
          title: "default value props",
          input: [
            'para notificar (con message = "nope"):',
            "\timprimir el message",
            'notificar con message = "Ship it!!"'
          ],
          js: [
            "export function notificar(props = {}) {",
            '  const { message = "nope" } = props',
            "  core.console.log(message)",
            "}",
            'notificar({ message: "Ship it!!" })'
          ],
          ts: [
            "export function notificar(props: Object = {}) {",
            '  const { message = "nope" } = props',
            "  core.console.log(message)",
            "}",
            'notificar({ message: "Ship it!!" })'
          ]
        },
        {
          title: "multiple default value props",
          input: [
            'para notificar (con message = "nope" y reply = "yep"):',
            "\timprimir el message + el reply",
            'notificar con message = "How many?"',
            'notificar con message = "How many?" y reply = 2'
          ],
          js: [
            "export function notificar(props = {}) {",
            '  const { message = "nope", reply = "yep" } = props',
            "  core.console.log(message + reply)",
            "}",
            'notificar({ message: "How many?" })',
            'notificar({ message: "How many?", reply: 2 })'
          ],
          ts: [
            "export function notificar(props: Object = {}) {",
            '  const { message = "nope", reply = "yep" } = props',
            "  core.console.log(message + reply)",
            "}",
            'notificar({ message: "How many?" })',
            'notificar({ message: "How many?", reply: 2 })'
          ]
        },
        {
          title: "mixed props",
          input: [
            'para notificar (con name, message como texto y reply = "yep"):',
            "\timprimir el name + el message + el reply",
            'notificar con name = "Bob", message = "How many?" y reply = 2'
          ],
          js: [
            "export function notificar(props = {}) {",
            '  const { name, message, reply = "yep" } = props',
            "  core.console.log(name + message + reply)",
            "}",
            "notificar({",
            '  name: "Bob",',
            '  message: "How many?",',
            "  reply: 2",
            "})"
          ],
          ts: [
            "export function notificar(props: { name?: any /* spell?: type unknown */; message?: string; reply?: any /* spell?: type unknown */ } = {}) {",
            '  const { name, message, reply = "yep" } = props',
            "  core.console.log(name + message + reply)",
            "}",
            "notificar({",
            '  name: "Bob",',
            '  message: "How many?",',
            "  reply: 2",
            "})"
          ]
        },
        {
          title: "mixed props and signature",
          input: [
            'para notificar (message) (con reply = "yep"):',
            "\timprimir el message",
            "\timprimir el reply",
            'notificar "Really?" con reply = "yes"'
          ],
          js: [
            "export function notificarMessage(message, props = {}) {",
            '  const { reply = "yep" } = props',
            "  core.console.log(message)",
            "  core.console.log(reply)",
            "}",
            'notificarMessage("Really?", { reply: "yes" })'
          ],
          ts: [
            "export function notificarMessage(message: any /* spell: type unknown */, props: Object = {}) {",
            '  const { reply = "yep" } = props',
            "  core.console.log(message)",
            "  core.console.log(reply)",
            "}",
            'notificarMessage("Really?", { reply: "yes" })'
          ]
        },
        {
          title: "extra props passed in are OK",
          input: [
            "para notificar (con message):",
            "\timprimir el message",
            `notificar con message = "It worked!" y reply = "No it didn't"`
          ],
          js: [
            "export function notificar(props = {}) {",
            "  const { message } = props",
            "  core.console.log(message)",
            "}",
            'notificar({ message: "It worked!", reply: "No it didn\'t" })'
          ],
          ts: [
            "export function notificar(props: Object = {}) {",
            "  const { message } = props",
            "  core.console.log(message)",
            "}",
            'notificar({ message: "It worked!", reply: "No it didn\'t" })'
          ]
        }
      ]
    }
  ]
})

methodsEs.addRule(CreateAnimation, {
  syntax: `(asAnimation:crear? (animación|animacion)) {signature:method_signature} :? {statement_body}?`,
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
          input: "animación repartir las cartas",
          js: [
            "export async function repartirLasCartas() {",
            '  if (core.processIsRunning("repartir_las_cartas")) return',
            '  core.startProcess("repartir_las_cartas", "EXCLUSIVE")',
            "  try {}",
            "  finally {",
            '    core.stopProcess("repartir_las_cartas")',
            "  }",
            "}"
          ]
        },
        {
          input: "crear animacion repartir las cartas",
          js: [
            "export async function repartirLasCartas() {",
            '  if (core.processIsRunning("repartir_las_cartas")) return',
            '  core.startProcess("repartir_las_cartas", "EXCLUSIVE")',
            "  try {}",
            "  finally {",
            '    core.stopProcess("repartir_las_cartas")',
            "  }",
            "}"
          ]
        },
        {
          input: ["animación repartir las cartas", "\tpausar 10 segundos"],
          js: [
            "export async function repartirLasCartas() {",
            '  if (core.processIsRunning("repartir_las_cartas")) return',
            '  core.startProcess("repartir_las_cartas", "EXCLUSIVE")',
            "  try {",
            '    await core.pauseFor(10, "seconds")',
            "  }",
            "  finally {",
            '    core.stopProcess("repartir_las_cartas")',
            "  }",
            "}"
          ]
        }
      ]
    }
  ]
})

methodsEs.addRule(QuotedTypeExpression, {
  syntax: "(un|una) {type:singular_type} {signature:quoted_method_signature} (si|es)? :? {expression_body}?",
  tests: [
    {
      title: "fails if",
      compileAs: "block",
      tests: [
        {
          title: "signature is empty",
          input: `una cosa "" si`,
          js: `/* PARSE ERROR: Don't understand "una cosa "" si" */`
        },
        {
          title: "signature doesn't start with a keyword",
          input: `una cosa "(thing)" si`,
          js: `/* PARSE ERROR: Don't understand "una cosa "(thing)" si" */`
        },
        {
          title: "more than one arg specified",
          input: `una cosa "(thing) pero (thing)" si`,
          js: `/* PARSE ERROR: Don't understand "una cosa "(thing) pero (thing)" si" */`
        }
      ]
    },
    {
      title: "no args, no negatables",
      compileAs: "block",
      tests: [
        {
          title: "no body",
          input: [`una cosa "se luce" si`, `si una nueva cosa se luce`],
          js: [
            'Object.defineProperty(Thing.prototype, "seLuce", {',
            "  get() {},",
            "  configurable: true",
            "})",
            "if ((new Thing()).seLuce) {}"
          ],
          ts: [
            "export interface Thing { readonly seLuce: any /* spell: type unknown */ }",
            'Object.defineProperty(Thing.prototype, "seLuce", {',
            "  get(this: Thing) {},",
            "  configurable: true",
            "})",
            "if ((new Thing()).seLuce) {}"
          ]
        },
        {
          title: "no if",
          input: [`una cosa "se luce": nunca`, `si una nueva cosa se luce`],
          js: [
            'Object.defineProperty(Thing.prototype, "seLuce", {',
            "  get() {",
            "    return false",
            "  },",
            "  configurable: true",
            "})",
            "if ((new Thing()).seLuce) {}"
          ],
          ts: [
            "export interface Thing { readonly seLuce: boolean }",
            'Object.defineProperty(Thing.prototype, "seLuce", {',
            "  get(this: Thing) {",
            "    return false",
            "  },",
            "  configurable: true",
            "})",
            "if ((new Thing()).seLuce) {}"
          ]
        },
        {
          title: "inline expression",
          input: [`una cosa "se luce" si sí`, `si una nueva cosa se luce`],
          js: [
            'Object.defineProperty(Thing.prototype, "seLuce", {',
            "  get() {",
            "    return true",
            "  },",
            "  configurable: true",
            "})",
            "if ((new Thing()).seLuce) {}"
          ],
          ts: [
            "export interface Thing { readonly seLuce: boolean }",
            'Object.defineProperty(Thing.prototype, "seLuce", {',
            "  get(this: Thing) {",
            "    return true",
            "  },",
            "  configurable: true",
            "})",
            "if ((new Thing()).seLuce) {}"
          ]
        },
        {
          title: "indented method body",
          input: [`una cosa "se luce" si`, `\tdevolver sí`, `si una nueva cosa se luce`],
          js: [
            'Object.defineProperty(Thing.prototype, "seLuce", {',
            "  get() {",
            "    return true",
            "  },",
            "  configurable: true",
            "})",
            "if ((new Thing()).seLuce) {}"
          ],
          ts: [
            "export interface Thing { readonly seLuce: boolean }",
            'Object.defineProperty(Thing.prototype, "seLuce", {',
            "  get(this: Thing) {",
            "    return true",
            "  },",
            "  configurable: true",
            "})",
            "if ((new Thing()).seLuce) {}"
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
          input: [`una cosa "se luce con (another como una cosa)" si`, `si una nueva cosa se luce con una nueva cosa`],
          js: [
            "Thing.prototype.seLuceConAnother = function (another) {}",
            "if ((new Thing()).seLuceConAnother(new Thing())) {}"
          ],
          ts: [
            "export interface Thing { seLuceConAnother(another: Thing): any /* spell: type unknown */ }",
            "Thing.prototype.seLuceConAnother = function (this: Thing, another: Thing) {}",
            "if ((new Thing()).seLuceConAnother(new Thing())) {}"
          ]
        },
        {
          title: "inline expression",
          input: [
            `una cosa "se luce con (another como una cosa)" si sí`,
            `si una nueva cosa se luce con una nueva cosa`
          ],
          js: [
            "Thing.prototype.seLuceConAnother = function (another) {",
            "  return true",
            "}",
            "if ((new Thing()).seLuceConAnother(new Thing())) {}"
          ],
          ts: [
            "export interface Thing { seLuceConAnother(another: Thing): boolean }",
            "Thing.prototype.seLuceConAnother = function (this: Thing, another: Thing) {",
            "  return true",
            "}",
            "if ((new Thing()).seLuceConAnother(new Thing())) {}"
          ]
        },
        {
          title: "indented method body",
          input: [
            `una cosa "se luce con (another como una cosa)" si`,
            `\tdevolver sí`,
            `si una nueva cosa se luce con una nueva cosa`
          ],
          js: [
            "Thing.prototype.seLuceConAnother = function (another) {",
            "  return true",
            "}",
            "if ((new Thing()).seLuceConAnother(new Thing())) {}"
          ],
          ts: [
            "export interface Thing { seLuceConAnother(another: Thing): boolean }",
            "Thing.prototype.seLuceConAnother = function (this: Thing, another: Thing) {",
            "  return true",
            "}",
            "if ((new Thing()).seLuceConAnother(new Thing())) {}"
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
          input: [`una cosa "es un bicho" si`, `si una nueva cosa es un bicho`, `si una nueva cosa no es un bicho`],
          js: [
            'Object.defineProperty(Thing.prototype, "esUnBicho", {',
            "  get() {},",
            "  configurable: true",
            "})",
            "if ((new Thing()).esUnBicho) {}",
            "if (!(new Thing()).esUnBicho) {}"
          ],
          ts: [
            "export interface Thing { readonly esUnBicho: any /* spell: type unknown */ }",
            'Object.defineProperty(Thing.prototype, "esUnBicho", {',
            "  get(this: Thing) {},",
            "  configurable: true",
            "})",
            "if ((new Thing()).esUnBicho) {}",
            "if (!(new Thing()).esUnBicho) {}"
          ]
        },
        {
          title: "can",
          input: [`una cosa "puede jugar" si`, `si una nueva cosa puede jugar`, `si una nueva cosa no puede jugar`],
          js: [
            'Object.defineProperty(Thing.prototype, "puedeJugar", {',
            "  get() {},",
            "  configurable: true",
            "})",
            "if ((new Thing()).puedeJugar) {}",
            "if (!(new Thing()).puedeJugar) {}"
          ],
          ts: [
            "export interface Thing { readonly puedeJugar: any /* spell: type unknown */ }",
            'Object.defineProperty(Thing.prototype, "puedeJugar", {',
            "  get(this: Thing) {},",
            "  configurable: true",
            "})",
            "if ((new Thing()).puedeJugar) {}",
            "if (!(new Thing()).puedeJugar) {}"
          ]
        },
        {
          title: "will",
          input: [
            `una cosa "va a explotar" si`,
            `si una nueva cosa va a explotar`,
            `si una nueva cosa no va a explotar`
          ],
          js: [
            'Object.defineProperty(Thing.prototype, "vaAExplotar", {',
            "  get() {},",
            "  configurable: true",
            "})",
            "if ((new Thing()).vaAExplotar) {}",
            "if (!(new Thing()).vaAExplotar) {}"
          ],
          ts: [
            "export interface Thing { readonly vaAExplotar: any /* spell: type unknown */ }",
            'Object.defineProperty(Thing.prototype, "vaAExplotar", {',
            "  get(this: Thing) {},",
            "  configurable: true",
            "})",
            "if ((new Thing()).vaAExplotar) {}",
            "if (!(new Thing()).vaAExplotar) {}"
          ]
        },
        {
          title: "has",
          input: [
            `una cosa "tiene un amigo" si`,
            `si una nueva cosa tiene un amigo`,
            `si una nueva cosa no tiene un amigo`
          ],
          js: [
            'Object.defineProperty(Thing.prototype, "tieneUnAmigo", {',
            "  get() {},",
            "  configurable: true",
            "})",
            "if ((new Thing()).tieneUnAmigo) {}",
            "if (!(new Thing()).tieneUnAmigo) {}"
          ],
          ts: [
            "export interface Thing { readonly tieneUnAmigo: any /* spell: type unknown */ }",
            'Object.defineProperty(Thing.prototype, "tieneUnAmigo", {',
            "  get(this: Thing) {},",
            "  configurable: true",
            "})",
            "if ((new Thing()).tieneUnAmigo) {}",
            "if (!(new Thing()).tieneUnAmigo) {}"
          ]
        }
      ]
    }
  ]
})

// in an outline body, as English's `- it "is face up" if ...`:  Spanish's `subject_it` has no word (it leaves the
// subject out, below), so this matches nothing until it gets one -- registered to keep English's order
methodsEs.addRule(QuotedTypeExpression, {
  syntax: "{type:subject_it} {signature:quoted_method_signature} (si|es)? :? {expression_body}?"
})

// ... with the subject left out (P8):  `- "está boca arriba" si su direction es up`
// - NOT `es`:  `- "suit" es ...` is a property, as `su "suit" es ...` -- see `isPropertyWithoutSubject()`
methodsEs.addRule(QuotedTypeExpression, {
  syntax: "{type:subject_implied} {signature:quoted_method_signature} si? :? {expression_body}?"
})
