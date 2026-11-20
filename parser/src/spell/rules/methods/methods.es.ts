/**
 * The `methods` rules in Spanish (epic `spanish`):
 * each rule's syntax and its tests, registered on Spanish's own `methods` parser.
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `methods.en.ts`:  a tie between two rules goes to the first.
 * - Its tests are English's, said in Spanish.
 *   - A person's own TYPE and variable names stay as English's tests have them (`card`, `pile`, `message`).
 *   - A method's words are Spanish (`para mover (una card) a (una pile)`), so its compiled name follows them:
 *     `moverAPile`, where English's is `moveToPile`.
 *   - A parse error quotes the line as written, in Spanish.
 */
import { P } from "spell/parser/parser"
import { SpellParser } from "spell/parser/spell/SpellParser"
import { Synonyms, Wording } from "spell/parser/spell/rules/expressions"

import { BareTypeArg } from "./BareTypeArg"
import { CreateAnimation } from "./CreateAnimation"
import { ActionDetail } from "./ActionDetail"
import { AfterHook } from "./AfterHook"
import { BeforeHook } from "./BeforeHook"
import { FailureHook } from "./FailureHook"
import { WhileHook } from "./WhileHook"
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
import { TypeMethodArg } from "./TypeMethodArg"
import { CallNative } from "./CallNative"
import { UseNatives } from "./UseNatives"
import { ValuedVarMethodArg } from "./ValuedVarMethodArg"
import { VarMethodArg } from "./VarMethodArg"
import { WithPropsArg } from "./WithPropsArg"

/** Spanish's `methods` rules. */
export const methodsEs = new SpellParser({ module: "methods" })

// the word before a method's receiver, where a type's outline body leaves it out:
// `repartir las cartas del solitario` -- see `MethodDefinition.takeSubject()`
methodsEs.addRule(Synonyms.specialize({ ruleName: "receiver_of" }), { syntax: "(de|del)" })

// what runs as a thing is made, its `create()` hook:  `- para crearlo:` (`crearla`, `crear eso`), or
// `para crear un mazo:` -- Spanish fuses `it` into its verb, as `dibujarlo` -- see `MethodDefinition.hookOf()`
methodsEs.addRule(Wording.specialize({ ruleName: "create_method", meanings: ["create"] }), {
  syntax: "(create:crearlo|crearla|crearlos|crearlas|crear (eso|ello))"
})

// the words of what runs as a thing is made, in its type's outline:  `- al crearla:`;
// its verb before its type too:  `- al crear una baraja:` -- see `CreateHook`
methodsEs.addRule(Wording.specialize({ ruleName: "create_hook_words", meanings: ["create"] }), {
  syntax: "(create:crearla|crearlo|crearlas|crearlos|crear (la|lo|las|los)?)"
})

methodsEs.addRule(MethodKeyword)

methodsEs.addRule(VarMethodArg)

methodsEs.addRule(ValuedVarMethodArg, {
  syntax: `{identifier} (=|es|de|como) {value:expression}`
})

methodsEs.addRule(TypeMethodArg, {
  syntax: `(un|una) {type}`
})

// a new one, its word after the type:  `una tarea nueva` is words, as English's `a new task` -- see `BareTypeArg` (T62)
methodsEs.addRule(Synonyms.specialize({ ruleName: "new_after_type" }), { syntax: "(nuevo|nueva|nuevos|nuevas)" })

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

// an action's quoted name, its `a <kind>` words its blanks (epic `language` I97)
methodsEs.addRule(QuotedActionSignature)

methodsEs.addRule(ToDoSomething, {
  syntax: `para (asTest:probar)? {signature:method_signature} {modifiers:action_modifiers}? :? {statement_body}?`,
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
          js: ["export function empezarElJuego() {}", '/* PARSE ERROR: No entiendo "imprimir eso" */']
        },
        {
          title: "paren-free type arg in signature:  a known type is a parameter",
          input: "para crear una card",
          js: "Card.prototype.create = function () {}",
          ts: [
            "export interface Card { create(): any /* spell: type unknown */ }",
            "Card.prototype.create = function (this: Card) {}"
          ]
        },
        {
          title: "paren-free:  `dibujar` a type is its drawing, `draw()`, as `- para dibujarla:` is (J84)",
          input: "para dibujar una card: imprimir eso",
          js: [`Card.prototype.draw = function () {`, `  return core.console.log(this)`, `}`],
          ts: [
            "export interface Card { draw(): any /* spell: type unknown */ }",
            "Card.prototype.draw = function (this: Card) {",
            "  return core.console.log(this)",
            "}"
          ]
        },
        {
          title: "paren-free type arg in signature - `eso` (it)",
          input: "para crear una card: imprimir eso",
          js: ["Card.prototype.create = function () {", "  return core.console.log(this)", "}"],
          ts: [
            "export interface Card { create(): any /* spell: type unknown */ }",
            "Card.prototype.create = function (this: Card) {",
            "  return core.console.log(this)",
            "}"
          ]
        },
        {
          title: "paren-free type args in signature ~== parenthesized",
          input: "para dar una card a una pile: poner su pile a la pile",
          js: [
            "Card.prototype.darAPile = function (pile) {",
            "  this.pile = pile",
            "}",
            'core.describeAction(Card, "darAPile", { title: "Dar Card a Pile", undoneAs: "Dar Card a Pile" })'
          ],
          ts: [
            "export interface Card { darAPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.darAPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}",
            'core.describeAction(Card, "darAPile", { title: "Dar Card a Pile", undoneAs: "Dar Card a Pile" })'
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
          js: [
            "export function avisarMessage(message) {",
            '  return core.asAction({ undoneAs: "Avisar Message" }, () => core.console.log(message))',
            "}"
          ],
          ts: [
            "export function avisarMessage(message: any /* spell: type unknown */) {",
            '  return core.asAction({ undoneAs: "Avisar Message" }, () => core.console.log(message))',
            "}"
          ]
        },
        {
          title: "typed simple arg in signature - arg is defined",
          input: "para avisar (message como texto): imprimir el message",
          js: [
            "export function avisarMessage(message) {",
            '  return core.asAction({ undoneAs: "Avisar Message" }, () => core.console.log(message))',
            "}"
          ],
          ts: [
            "export function avisarMessage(message: string) {",
            '  return core.asAction({ undoneAs: "Avisar Message" }, () => core.console.log(message))',
            "}"
          ]
        },
        {
          title: "valued simple arg in signature - arg is defined",
          input: 'para avisar (message = "Really?"): imprimir el message',
          js: [
            'export function avisarMessage(message = "Really?") {',
            '  return core.asAction({ undoneAs: "Avisar Message" }, () => core.console.log(message))',
            "}"
          ],
          ts: [
            'export function avisarMessage(message: string = "Really?") {',
            '  return core.asAction({ undoneAs: "Avisar Message" }, () => core.console.log(message))',
            "}"
          ]
        },
        {
          title: "type arg in signature - thisVar",
          input: "para crear (una card): imprimir la card",
          js: ["Card.prototype.create = function () {", "  return core.console.log(this)", "}"],
          ts: [
            "export interface Card { create(): any /* spell: type unknown */ }",
            "Card.prototype.create = function (this: Card) {",
            "  return core.console.log(this)",
            "}"
          ]
        },
        {
          title: "type arg in signature - its",
          input: "para crear (una card): poner su number a 1",
          js: ["Card.prototype.create = function () {", "  this.number = 1", "}"],
          ts: [
            "export interface Card { create(): any /* spell: type unknown */ }",
            "Card.prototype.create = function (this: Card) {",
            "  this.number = 1",
            "}"
          ]
        },
        {
          title: "multiple type args in signature - thisVar",
          input: "para agregar (una card) a (una pile): poner la pile de la card a la pile",
          js: [
            "Card.prototype.agregarAPile = function (pile) {",
            "  this.pile = pile",
            "}",
            'core.describeAction(Card, "agregarAPile", { title: "Agregar Card a Pile", undoneAs: "Agregar Card a Pile" })'
          ],
          ts: [
            "export interface Card { agregarAPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.agregarAPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}",
            'core.describeAction(Card, "agregarAPile", { title: "Agregar Card a Pile", undoneAs: "Agregar Card a Pile" })'
          ]
        },
        {
          title: "multiple type args in signature - its",
          input: "para agregar (una card) a (una pile): poner su pile a la pile",
          js: [
            "Card.prototype.agregarAPile = function (pile) {",
            "  this.pile = pile",
            "}",
            'core.describeAction(Card, "agregarAPile", { title: "Agregar Card a Pile", undoneAs: "Agregar Card a Pile" })'
          ],
          ts: [
            "export interface Card { agregarAPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.agregarAPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}",
            'core.describeAction(Card, "agregarAPile", { title: "Agregar Card a Pile", undoneAs: "Agregar Card a Pile" })'
          ]
        },
        {
          title: "typed arg in signature -- arg name",
          input: "para mostrar (thing como una card): imprimir la thing",
          js: [
            "Card.prototype.mostrar = function () {",
            "  return core.console.log(this)",
            "}",
            'core.describeAction(Card, "mostrar", { title: "Mostrar Card", undoneAs: "Mostrar Card" })'
          ],
          ts: [
            "export interface Card { mostrar(): any /* spell: type unknown */ }",
            "Card.prototype.mostrar = function (this: Card) {",
            "  return core.console.log(this)",
            "}",
            'core.describeAction(Card, "mostrar", { title: "Mostrar Card", undoneAs: "Mostrar Card" })'
          ]
        },
        {
          title: "typed arg in signature -- thisVar",
          input: "para mostrar (thing como una card): imprimir la card",
          js: [
            "Card.prototype.mostrar = function () {",
            "  return core.console.log(this)",
            "}",
            'core.describeAction(Card, "mostrar", { title: "Mostrar Card", undoneAs: "Mostrar Card" })'
          ],
          ts: [
            "export interface Card { mostrar(): any /* spell: type unknown */ }",
            "Card.prototype.mostrar = function (this: Card) {",
            "  return core.console.log(this)",
            "}",
            'core.describeAction(Card, "mostrar", { title: "Mostrar Card", undoneAs: "Mostrar Card" })'
          ]
        },
        {
          title: "typed arg in signature -- its",
          input: "para mostrar (thing como una card): imprimir su name",
          js: [
            "Card.prototype.mostrar = function () {",
            "  return core.console.log(this.name)",
            "}",
            'core.describeAction(Card, "mostrar", { title: "Mostrar Card", undoneAs: "Mostrar Card" })'
          ],
          ts: [
            "export interface Card { mostrar(): any /* spell: type unknown */ }",
            "Card.prototype.mostrar = function (this: Card) {",
            "  return core.console.log(this.name)",
            "}",
            'core.describeAction(Card, "mostrar", { title: "Mostrar Card", undoneAs: "Mostrar Card" })'
          ]
        },
        {
          title: "typed arg in signature -- `eso` (it)",
          input: "para mostrar (thing como una card): imprimir eso",
          js: [
            "Card.prototype.mostrar = function () {",
            "  return core.console.log(this)",
            "}",
            'core.describeAction(Card, "mostrar", { title: "Mostrar Card", undoneAs: "Mostrar Card" })'
          ],
          ts: [
            "export interface Card { mostrar(): any /* spell: type unknown */ }",
            "Card.prototype.mostrar = function (this: Card) {",
            "  return core.console.log(this)",
            "}",
            'core.describeAction(Card, "mostrar", { title: "Mostrar Card", undoneAs: "Mostrar Card" })'
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
            "}",
            'core.describeAction(Card, "mostrar", { title: "Mostrar Card", undoneAs: "Mostrar Card" })'
          ],
          ts: [
            "export interface Card { mostrar(): any /* spell: type unknown */ }",
            "Card.prototype.mostrar = function (this: Card) {",
            "  core.console.log(this)",
            "  const it = this.name",
            "  core.console.log(it)",
            "}",
            'core.describeAction(Card, "mostrar", { title: "Mostrar Card", undoneAs: "Mostrar Card" })'
          ]
        },
        {
          title: "simple arg in signature - `eso` (it) is not defined",
          input: "para avisar (message): imprimir eso",
          js: ["export function avisarMessage(message) {}", '/* PARSE ERROR: No entiendo "imprimir eso" */'],
          ts: [
            "export function avisarMessage(message: any /* spell: type unknown */) {}",
            '/* PARSE ERROR: No entiendo "imprimir eso" */'
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
          js: [
            "export function empezarElJuego() {",
            '  return core.asAction({ undoneAs: "Empezar el Juego" }, () => {',
            "    core.console.log(1)",
            "  })",
            "}",
            "empezarElJuego()"
          ]
        },
        {
          title: "top level simple argument method",
          input: ["para notificar (message): imprimir el message", "notificar 1"],
          js: [
            "export function notificarMessage(message) {",
            '  return core.asAction({ undoneAs: "Notificar Message" }, () => core.console.log(message))',
            "}",
            "notificarMessage(1)"
          ],
          ts: [
            "export function notificarMessage(message: any /* spell: type unknown */) {",
            '  return core.asAction({ undoneAs: "Notificar Message" }, () => core.console.log(message))',
            "}",
            "notificarMessage(1)"
          ]
        },
        {
          title: "top level typed simple argument method",
          input: ["para notificar (message como texto): imprimir el message", 'notificar "hi"'],
          js: [
            "export function notificarMessage(message) {",
            '  return core.asAction({ undoneAs: "Notificar Message" }, () => core.console.log(message))',
            "}",
            'notificarMessage("hi")'
          ],
          ts: [
            "export function notificarMessage(message: string) {",
            '  return core.asAction({ undoneAs: "Notificar Message" }, () => core.console.log(message))',
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
            '  return core.asAction({ undoneAs: "Notificar Message" }, () => core.console.log(message))',
            "}",
            "core.notify(1)"
          ],
          ts: [
            "export function notificarMessage(message: string) {",
            '  return core.asAction({ undoneAs: "Notificar Message" }, () => core.console.log(message))',
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
            'core.describeAction(Card, "mostrarEnPile", { title: "Mostrar Card en Pile", undoneAs: "Mostrar Card en Pile" })',
            ";(new Joker()).mostrarEnPile(new Pile())",
            '/* PARSE ERROR: No entiendo "mostrar una nueva card en una nueva card" */'
          ],
          ts: [
            "export class Joker extends Card {}",
            "export interface Card { mostrarEnPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.mostrarEnPile = function (this: Card, pile: Pile) {",
            "  return core.console.log(1)",
            "}",
            'core.describeAction(Card, "mostrarEnPile", { title: "Mostrar Card en Pile", undoneAs: "Mostrar Card en Pile" })',
            ";(new Joker()).mostrarEnPile(new Pile())",
            '/* PARSE ERROR: No entiendo "mostrar una nueva card en una nueva card" */'
          ]
        },
        {
          title: "type arg in signature",
          input: ["para mostrar (una card): imprimir la card", "mostrar una nueva card"],
          js: [
            "Card.prototype.mostrar = function () {",
            "  return core.console.log(this)",
            "}",
            'core.describeAction(Card, "mostrar", { title: "Mostrar Card", undoneAs: "Mostrar Card" })',
            ";(new Card()).mostrar()"
          ],
          ts: [
            "export interface Card { mostrar(): any /* spell: type unknown */ }",
            "Card.prototype.mostrar = function (this: Card) {",
            "  return core.console.log(this)",
            "}",
            'core.describeAction(Card, "mostrar", { title: "Mostrar Card", undoneAs: "Mostrar Card" })',
            ";(new Card()).mostrar()"
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
            'core.describeAction(Card, "jugarEnPile", { title: "Jugar Card en Pile", undoneAs: "Jugar Card en Pile" })',
            ";(new Card()).jugarEnPile(new Pile())"
          ],
          ts: [
            "export interface Card { jugarEnPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.jugarEnPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}",
            'core.describeAction(Card, "jugarEnPile", { title: "Jugar Card en Pile", undoneAs: "Jugar Card en Pile" })',
            ";(new Card()).jugarEnPile(new Pile())"
          ]
        },
        {
          title: "paren-free type args in signature",
          input: ["para jugar una card en una pile: poner su pile a la pile", "jugar una nueva card en una nueva pile"],
          js: [
            "Card.prototype.jugarEnPile = function (pile) {",
            "  this.pile = pile",
            "}",
            'core.describeAction(Card, "jugarEnPile", { title: "Jugar Card en Pile", undoneAs: "Jugar Card en Pile" })',
            ";(new Card()).jugarEnPile(new Pile())"
          ],
          ts: [
            "export interface Card { jugarEnPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.jugarEnPile = function (this: Card, pile: Pile) {",
            "  this.pile = pile",
            "}",
            'core.describeAction(Card, "jugarEnPile", { title: "Jugar Card en Pile", undoneAs: "Jugar Card en Pile" })',
            ";(new Card()).jugarEnPile(new Pile())"
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
          js: '/* PARSE ERROR: No entiendo "para (foo)" */'
        },
        {
          title: "with arg is optional when calling",
          input: ["para notificar (con message):", "\timprimir el message", "notificar"],
          js: [
            "export function notificar(props = {}) {",
            '  return core.asAction({ undoneAs: "Notificar" }, () => {',
            "    const { message } = props",
            "    core.console.log(message)",
            "  })",
            "}",
            "notificar()"
          ],
          ts: [
            "export function notificar(props: Object = {}) {",
            '  return core.asAction({ undoneAs: "Notificar" }, () => {',
            "    const { message } = props",
            "    core.console.log(message)",
            "  })",
            "}",
            "notificar()"
          ]
        },
        {
          title: "simple variable props",
          input: ["para notificar (con message):", "\timprimir el message", 'notificar con message = "It worked!"'],
          js: [
            "export function notificar(props = {}) {",
            '  return core.asAction({ undoneAs: "Notificar" }, () => {',
            "    const { message } = props",
            "    core.console.log(message)",
            "  })",
            "}",
            'notificar({ message: "It worked!" })'
          ],
          ts: [
            "export function notificar(props: Object = {}) {",
            '  return core.asAction({ undoneAs: "Notificar" }, () => {',
            "    const { message } = props",
            "    core.console.log(message)",
            "  })",
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
            '  return core.asAction({ undoneAs: "Jugar" }, () => {',
            "    const { card } = props",
            "    core.console.log(card)",
            "  })",
            "}",
            "jugar({ card: new Card() })",
            'jugar({ card: new Card({ suit: "hearts" }) })'
          ],
          ts: [
            "export function jugar(props: { card?: Card } = {}) {",
            '  return core.asAction({ undoneAs: "Jugar" }, () => {',
            "    const { card } = props",
            "    core.console.log(card)",
            "  })",
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
            '  return core.asAction({ undoneAs: "Notificar" }, () => {',
            '    const { message = "nope" } = props',
            "    core.console.log(message)",
            "  })",
            "}",
            'notificar({ message: "Ship it!!" })'
          ],
          ts: [
            "export function notificar(props: Object = {}) {",
            '  return core.asAction({ undoneAs: "Notificar" }, () => {',
            '    const { message = "nope" } = props',
            "    core.console.log(message)",
            "  })",
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
            '  return core.asAction({ undoneAs: "Notificar" }, () => {',
            '    const { message = "nope", reply = "yep" } = props',
            "    core.console.log(message + reply)",
            "  })",
            "}",
            'notificar({ message: "How many?" })',
            'notificar({ message: "How many?", reply: 2 })'
          ],
          ts: [
            "export function notificar(props: Object = {}) {",
            '  return core.asAction({ undoneAs: "Notificar" }, () => {',
            '    const { message = "nope", reply = "yep" } = props',
            "    core.console.log(message + reply)",
            "  })",
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
            '  return core.asAction({ undoneAs: "Notificar" }, () => {',
            '    const { name, message, reply = "yep" } = props',
            "    core.console.log(name + message + reply)",
            "  })",
            "}",
            "notificar({",
            '  name: "Bob",',
            '  message: "How many?",',
            "  reply: 2",
            "})"
          ],
          ts: [
            "export function notificar(props: { name?: any /* spell?: type unknown */; message?: string; reply?: any /* spell?: type unknown */ } = {}) {",
            '  return core.asAction({ undoneAs: "Notificar" }, () => {',
            '    const { name, message, reply = "yep" } = props',
            "    core.console.log(name + message + reply)",
            "  })",
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
            '  return core.asAction({ undoneAs: "Notificar Message" }, () => {',
            '    const { reply = "yep" } = props',
            "    core.console.log(message)",
            "    core.console.log(reply)",
            "  })",
            "}",
            'notificarMessage("Really?", { reply: "yes" })'
          ],
          ts: [
            "export function notificarMessage(message: any /* spell: type unknown */, props: Object = {}) {",
            '  return core.asAction({ undoneAs: "Notificar Message" }, () => {',
            '    const { reply = "yep" } = props',
            "    core.console.log(message)",
            "    core.console.log(reply)",
            "  })",
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
            '  return core.asAction({ undoneAs: "Notificar" }, () => {',
            "    const { message } = props",
            "    core.console.log(message)",
            "  })",
            "}",
            'notificar({ message: "It worked!", reply: "No it didn\'t" })'
          ],
          ts: [
            "export function notificar(props: Object = {}) {",
            '  return core.asAction({ undoneAs: "Notificar" }, () => {',
            "    const { message } = props",
            "    core.console.log(message)",
            "  })",
            "}",
            'notificar({ message: "It worked!", reply: "No it didn\'t" })'
          ]
        }
      ]
    },
    {
      title:
        "un gancho nombra su tipo o su único como `eso`:  `para dibujar el mazo` ~== `para dibujarlo` (épica `language` T122)",
      compileAs: "block",
      tests: [
        {
          input: ['un "mazo" es una cosa', "\tpara dibujar el mazo", "\t\timprimir 1"],
          js: ["export class Mazo extends Thing {", "  draw() {", "    core.console.log(1)", "  }", "}"],
          ts: ["export class Mazo extends Thing {", "  @drawn draw() {", "    core.console.log(1)", "  }", "}"]
        },
        {
          input: ['un "mazo" es una cosa', "\tpara dibujar un mazo", "\t\timprimir 1"],
          js: ["export class Mazo extends Thing {", "  draw() {", "    core.console.log(1)", "  }", "}"],
          ts: ["export class Mazo extends Thing {", "  @drawn draw() {", "    core.console.log(1)", "  }", "}"]
        },
        {
          input: ["solitario es una aplicación", "\tpara dibujar el solitario", "\t\timprimir 1"],
          js: [
            "export class Solitario extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  draw() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "export const solitario = new Solitario()"
          ],
          ts: [
            "export class Solitario extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  @drawn draw() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "",
            "/**",
            " * `<test-methods-app>`:  a solitario, drawn in its own element, e.g. by `draw the solitario`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its solitario's properties;  its methods call its solitario's.",
            " * - What every view's element does, e.g. drawing its solitario, is `SpellElement`'s.",
            " */",
            "export class SolitarioElement extends SpellElement<Solitario> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-methods-app", "solitario", [])',
            "}",
            "core.useElement(Solitario, SolitarioElement)",
            "export const solitario = new Solitario()"
          ]
        },
        {
          title: "el tipo incorporado que es, tras `la`:  `para dibujar la aplicación` (épica `language` T129)",
          input: ["solitario es una aplicación", "\tpara dibujar la aplicación", "\t\timprimir 1"],
          js: [
            "export class Solitario extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  draw() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "export const solitario = new Solitario()"
          ],
          ts: [
            "export class Solitario extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  @drawn draw() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "",
            "/**",
            " * `<test-methods-app>`:  a solitario, drawn in its own element, e.g. by `draw the solitario`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its solitario's properties;  its methods call its solitario's.",
            " * - What every view's element does, e.g. drawing its solitario, is `SpellElement`'s.",
            " */",
            "export class SolitarioElement extends SpellElement<Solitario> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-methods-app", "solitario", [])',
            "}",
            "core.useElement(Solitario, SolitarioElement)",
            "export const solitario = new Solitario()"
          ]
        },
        {
          input: ["solitario es una aplicación", "\tpara dibujar solitario", "\t\timprimir 1"],
          js: [
            "export class Solitario extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  draw() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "export const solitario = new Solitario()"
          ],
          ts: [
            "export class Solitario extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  @drawn draw() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "",
            "/**",
            " * `<test-methods-app>`:  a solitario, drawn in its own element, e.g. by `draw the solitario`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its solitario's properties;  its methods call its solitario's.",
            " * - What every view's element does, e.g. drawing its solitario, is `SpellElement`'s.",
            " */",
            "export class SolitarioElement extends SpellElement<Solitario> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-methods-app", "solitario", [])',
            "}",
            "core.useElement(Solitario, SolitarioElement)",
            "export const solitario = new Solitario()"
          ]
        },
        {
          title: "no es un gancho:  un método de sus palabras",
          input: ['un "mazo" es una cosa', "\tpara barajar el mazo", "\t\timprimir 1"],
          js: [
            "export class Mazo extends Thing {",
            "  barajarElMazo() {",
            "    core.console.log(1)",
            "  }",
            "}",
            'core.describeAction(Mazo, "barajarElMazo", { title: "Barajar el Mazo", undoneAs: "Barajar el Mazo" })'
          ]
        },
        {
          title: "sin comillas, `obtener` es una palabra de su nombre (épica `language` T142)",
          input: ['un "mazo" es una cosa', "\tpara obtener la siguiente carta", "\t\timprimir 1"],
          js: [
            "export class Mazo extends Thing {",
            "  obtenerLaSiguienteCarta() {",
            "    core.console.log(1)",
            "  }",
            "}",
            'core.describeAction(Mazo, "obtenerLaSiguienteCarta", { title: "Obtener la Siguiente Carta", undoneAs: "Obtener la Siguiente Carta" })'
          ]
        }
      ]
    }
  ]
})

// its name quoted, and what it says about itself on its line (epic `language` P48, Q6):
// `para "repartir las cartas" con título "Repartir", icono "carta", atajo "meta+N"`
// un `obtener` antes del nombre entre comillas se deja fuera (epic `language` T142):
// `para obtener "los puntos de una carta"` ~== `para "los puntos de una carta"`
methodsEs.addRule(ToDoSomething, {
  syntax: `para obtener? {signature:quoted_action_signature} {modifiers:action_modifiers}? :? {statement_body}?`,
  tests: [
    {
      title:
        "its blanks as the unquoted name's:  `un / una <kind>` a blank, other words its name (epic `language` I97)",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.types?.add("card")
        scope.types?.add("pile")
      },
      tests: [
        {
          input: 'para "contar los puntos de una card en una pile"',
          js: [
            "Card.prototype.contarLosPuntosDeCardEnPile = function (pile) {}",
            'core.describeAction(Card, "contarLosPuntosDeCardEnPile", { title: "Contar los Puntos de Card en Pile", undoneAs: "Contar los Puntos de Card en Pile" })'
          ],
          ts: [
            "export interface Card { contarLosPuntosDeCardEnPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.contarLosPuntosDeCardEnPile = function (this: Card, pile: Pile) {}",
            'core.describeAction(Card, "contarLosPuntosDeCardEnPile", { title: "Contar los Puntos de Card en Pile", undoneAs: "Contar los Puntos de Card en Pile" })'
          ]
        },
        {
          input: 'para "repartir el mazo en (una pile)"',
          js: [
            "Pile.prototype.repartirElMazoEnPile = function () {}",
            'core.describeAction(Pile, "repartirElMazoEnPile", { title: "Repartir el Mazo en Pile", undoneAs: "Repartir el Mazo en Pile" })'
          ],
          ts: [
            "export interface Pile { repartirElMazoEnPile(): any /* spell: type unknown */ }",
            "Pile.prototype.repartirElMazoEnPile = function (this: Pile) {}",
            'core.describeAction(Pile, "repartirElMazoEnPile", { title: "Repartir el Mazo en Pile", undoneAs: "Repartir el Mazo en Pile" })'
          ]
        }
      ]
    },
    {
      title:
        "`obtener` antes de su nombre entre comillas se deja fuera:  la misma acción que sin él (épica `language` T142)",
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.types?.add("card")
        scope.types?.add("pile")
      },
      tests: [
        {
          input: 'para obtener "los puntos de una card en una pile"',
          js: [
            "Card.prototype.losPuntosDeCardEnPile = function (pile) {}",
            'core.describeAction(Card, "losPuntosDeCardEnPile", { title: "Los Puntos de Card en Pile", undoneAs: "Los Puntos de Card en Pile" })'
          ],
          ts: [
            "export interface Card { losPuntosDeCardEnPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.losPuntosDeCardEnPile = function (this: Card, pile: Pile) {}",
            'core.describeAction(Card, "losPuntosDeCardEnPile", { title: "Los Puntos de Card en Pile", undoneAs: "Los Puntos de Card en Pile" })'
          ]
        },
        {
          input: 'para "los puntos de una card en una pile"',
          js: [
            "Card.prototype.losPuntosDeCardEnPile = function (pile) {}",
            'core.describeAction(Card, "losPuntosDeCardEnPile", { title: "Los Puntos de Card en Pile", undoneAs: "Los Puntos de Card en Pile" })'
          ],
          ts: [
            "export interface Card { losPuntosDeCardEnPile(pile: Pile): any /* spell: type unknown */ }",
            "Card.prototype.losPuntosDeCardEnPile = function (this: Card, pile: Pile) {}",
            'core.describeAction(Card, "losPuntosDeCardEnPile", { title: "Los Puntos de Card en Pile", undoneAs: "Los Puntos de Card en Pile" })'
          ]
        }
      ]
    }
  ]
})

methodsEs.addRule(CreateAnimation, {
  syntax: `crear? (animación|animacion) {signature:method_signature} :? {statement_body}?`,
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
          js: "export function repartirLasCartas() {}"
        },
        {
          input: "crear animacion repartir las cartas",
          js: "export function repartirLasCartas() {}"
        },
        {
          input: ["animación repartir las cartas", "\tpausar 10 segundos"],
          js: ["export async function repartirLasCartas() {", '  await core.pauseFor(10, "seconds")', "}"]
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
          js: '/* PARSE ERROR: No entiendo "una cosa "" si" */'
        },
        {
          title: "signature doesn't start with a keyword",
          input: `una cosa "(thing)" si`,
          js: '/* PARSE ERROR: No entiendo "una cosa "(thing)" si" */'
        },
        {
          title: "more than one arg specified",
          input: `una cosa "(thing) pero (thing)" si`,
          js: '/* PARSE ERROR: No entiendo "una cosa "(thing) pero (thing)" si" */'
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

// in an outline body, as English's `- it "is face up" if ...`:  Spanish's `subject_it` has no word,
// as it leaves the subject out (below), so this matches nothing until it gets one -- registered to keep English's order
methodsEs.addRule(QuotedTypeExpression, {
  syntax: "{type:subject_it} {signature:quoted_method_signature} (si|es)? :? {expression_body}?"
})

// ... with the subject left out (P8):  `- "está boca arriba" si su direction es up`
// - NOT `es`:  `- "suit" es ...` is a property, as `su "suit" es ...` -- see `isPropertyWithoutSubject()`
methodsEs.addRule(QuotedTypeExpression, {
  syntax: "{type:subject_implied} {signature:quoted_method_signature} si? :? {expression_body}?"
})

// what runs as a thing is made, in its type's outline:  `- al crear una tarea (con ...):` (epic `language`),
// also `- al crearla:`, `- al crear:` and `- al crear la:` (epic `spanish` P28)
methodsEs.addRule(CreateHook, {
  syntax: "al {signature:method_signature} (:|,)? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        [
          [
            "una tarea es una cosa donde:",
            "\t- al crearla (con título como texto, hecha como una opción):",
            "\t\timprimir el título"
          ],
          [
            "export class Tarea extends Thing {",
            "  create(props = {}) {",
            "    const { título, hecha } = props",
            "    core.console.log(título)",
            "  }",
            "}"
          ],
          [
            "@thing",
            "export class Tarea extends Thing {",
            "  create(props: { título?: string; hecha?: boolean } = {}) {",
            "    const { título, hecha } = props",
            "    core.console.log(título)",
            "  }",
            "}"
          ]
        ],
        [
          ["una tarea es una cosa donde:", "\t- al crear una tarea:", "\t\timprimir 1"],
          ["export class Tarea extends Thing {", "  create() {", "    core.console.log(1)", "  }", "}"],
          ["@thing", "export class Tarea extends Thing {", "  create() {", "    core.console.log(1)", "  }", "}"]
        ],
        [
          ["una tarea es una cosa donde:", "\t- al crear:", "\t\timprimir 1"],
          ["export class Tarea extends Thing {", "  create() {", "    core.console.log(1)", "  }", "}"],
          ["@thing", "export class Tarea extends Thing {", "  create() {", "    core.console.log(1)", "  }", "}"]
        ],
        [
          ["una tarea es una cosa donde:", "\t- al crear la:", "\t\timprimir 1"],
          ["export class Tarea extends Thing {", "  create() {", "    core.console.log(1)", "  }", "}"],
          ["@thing", "export class Tarea extends Thing {", "  create() {", "    core.console.log(1)", "  }", "}"]
        ],
        {
          title: "a one of a kind's names itself, with its article or not",
          input: ["solitario es una aplicación", "\tal crear el solitario", "\t\timprimir 1"],
          js: [
            "export class Solitario extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  create() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "export const solitario = new Solitario()"
          ],
          ts: [
            "@thing",
            "export class Solitario extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  create() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "",
            "/**",
            " * `<test-methods-app>`:  a solitario, drawn in its own element, e.g. by `draw the solitario`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its solitario's properties;  its methods call its solitario's.",
            " * - What every view's element does, e.g. drawing its solitario, is `SpellElement`'s.",
            " */",
            "export class SolitarioElement extends SpellElement<Solitario> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-methods-app", "solitario", [])',
            "",
            "  create() {",
            "    return this.currentThing?.create()",
            "  }",
            "}",
            "core.useElement(Solitario, SolitarioElement)",
            "export const solitario = new Solitario()"
          ]
        },
        {
          title: "el tipo incorporado que es, tras `la`:  `al crear la aplicación` (épica `language` T129)",
          input: ["solitario es una aplicación", "\tal crear la aplicación", "\t\timprimir 1"],
          js: [
            "export class Solitario extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  create() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "export const solitario = new Solitario()"
          ],
          ts: [
            "@thing",
            "export class Solitario extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  create() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "",
            "/**",
            " * `<test-methods-app>`:  a solitario, drawn in its own element, e.g. by `draw the solitario`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its solitario's properties;  its methods call its solitario's.",
            " * - What every view's element does, e.g. drawing its solitario, is `SpellElement`'s.",
            " */",
            "export class SolitarioElement extends SpellElement<Solitario> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-methods-app", "solitario", [])',
            "",
            "  create() {",
            "    return this.currentThing?.create()",
            "  }",
            "}",
            "core.useElement(Solitario, SolitarioElement)",
            "export const solitario = new Solitario()"
          ]
        },
        {
          input: ["solitario es una aplicación", "\tal crear solitario", "\t\timprimir 1"],
          js: [
            "export class Solitario extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  create() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "export const solitario = new Solitario()"
          ],
          ts: [
            "@thing",
            "export class Solitario extends App {",
            '  static elementTag = core.defineElement(this, "test_methods", "App")',
            "",
            "  create() {",
            "    core.console.log(1)",
            "  }",
            "}",
            "",
            "/**",
            " * `<test-methods-app>`:  a solitario, drawn in its own element, e.g. by `draw the solitario`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its solitario's properties;  its methods call its solitario's.",
            " * - What every view's element does, e.g. drawing its solitario, is `SpellElement`'s.",
            " */",
            "export class SolitarioElement extends SpellElement<Solitario> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-methods-app", "solitario", [])',
            "",
            "  create() {",
            "    return this.currentThing?.create()",
            "  }",
            "}",
            "core.useElement(Solitario, SolitarioElement)",
            "export const solitario = new Solitario()"
          ]
        }
      ]
    }
  ]
})

// what an action's head line says about it (epic `language` P48, Q6):  `con título "Repartir", icono "carta", atajo "meta+N"`
methodsEs.addRule(ActionModifier, { syntax: "título {title:text}" })
methodsEs.addRule(ActionModifier, { syntax: "icono {icon:text}" })
methodsEs.addRule(ActionModifier, { syntax: "atajo {keys:text}" })
methodsEs.addRule(ActionModifier, { syntax: "(undoable:deshacible)" })
methodsEs.addRule(ActionModifier, { syntax: "(cantBeUndone:no se puede deshacer|no deshacible)" })
methodsEs.addRule(ActionModifier, { syntax: "deshacible como {undoneAs:text}" })
methodsEs.addRule(ActionModifiers, { syntax: "con [{action_modifier} (,|y)]" })
// ... o tras una coma:  `para poner una carta en una pila, deshacible como "Mover carta"`
methodsEs.addRule(ActionModifiers, { syntax: ", [{action_modifier} (,|y)]" })

// one keyboard shortcut, its keys joined by `+`, no spaces:  `meta+T` -- what `action_detail` reads after `atajo`
methodsEs.addRule(ShortcutKeys)

// an ACTION's description, indented under it (epic `elemental-spell` P5):  `- para voltearla:`, then each line
methodsEs.addRule(ActionDetail, {
  syntax: "atajo {keys:shortcut_keys}",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          input: [
            "una carta es una cosa donde:",
            "\t- su dirección es una de arriba o abajo",
            "\t- para voltearla:",
            "\t\t- atajo meta+T",
            "\t\t- activa cuando su dirección es abajo",
            '\t\t- deshacible como "Voltear carta"',
            "\t\tponer su dirección en arriba"
          ],
          js: [
            "export class Carta extends Thing {",
            "  // su dirección es una de arriba o abajo",
            '  static Direcciones = ["arriba", "abajo"]',
            '  static { this.declareProp("dirección", { oneOf: Carta.Direcciones }) }',
            '  get dirección() { return this.getProp("dirección") }',
            '  set dirección(value) { this.setProp("dirección", value) }',
            "",
            "  voltear() {",
            '    this.dirección = "arriba"',
            "  }",
            "  get voltearIsEnabled() {",
            '    return this.dirección === "abajo"',
            "  }",
            "}",
            'core.describeAction(Carta, "voltear", { title: "Voltearla", shortcuts: ["meta+T"], enabledWhen: "voltearIsEnabled", undoneAs: "Voltear carta" })'
          ],
          ts: [
            "export type Dirección = (typeof Carta.Direcciones)[number]",
            "",
            "export class Carta extends Thing {",
            "  // su dirección es una de arriba o abajo",
            '  static Direcciones = ["arriba", "abajo"] as const',
            "  @prop({ oneOf: () => Carta.Direcciones })",
            "  accessor dirección!: Dirección",
            "",
            "  voltear() {",
            '    this.dirección = "arriba"',
            "  }",
            "  get voltearIsEnabled() {",
            '    return this.dirección === "abajo"',
            "  }",
            "}",
            'core.describeAction(Carta, "voltear", { title: "Voltearla", shortcuts: ["meta+T"], enabledWhen: "voltearIsEnabled", undoneAs: "Voltear carta" })'
          ]
        }
      ]
    }
  ]
})
methodsEs.addRule(ActionDetail, { syntax: "activa cuando {enabled:expression}" })
methodsEs.addRule(ActionDetail, {
  syntax: "inactiva cuando {disabled:expression}",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "`inactiva cuando` es `activa cuando` al revés:  el mismo getter, que devuelve lo contrario",
          input: [
            "una carta es una cosa donde:",
            "\t- su dirección es una de arriba o abajo",
            "\t- para voltearla:",
            "\t\t- inactiva cuando su dirección es arriba",
            "\t\tponer su dirección en arriba"
          ],
          js: [
            "export class Carta extends Thing {",
            "  // su dirección es una de arriba o abajo",
            '  static Direcciones = ["arriba", "abajo"]',
            '  static { this.declareProp("dirección", { oneOf: Carta.Direcciones }) }',
            '  get dirección() { return this.getProp("dirección") }',
            '  set dirección(value) { this.setProp("dirección", value) }',
            "",
            "  voltear() {",
            '    this.dirección = "arriba"',
            "  }",
            "  get voltearIsEnabled() {",
            '    return !(this.dirección === "arriba")',
            "  }",
            "}",
            'core.describeAction(Carta, "voltear", { title: "Voltearla", enabledWhen: "voltearIsEnabled", undoneAs: "Voltearla" })'
          ],
          ts: [
            "export type Dirección = (typeof Carta.Direcciones)[number]",
            "",
            "export class Carta extends Thing {",
            "  // su dirección es una de arriba o abajo",
            '  static Direcciones = ["arriba", "abajo"] as const',
            "  @prop({ oneOf: () => Carta.Direcciones })",
            "  accessor dirección!: Dirección",
            "",
            "  voltear() {",
            '    this.dirección = "arriba"',
            "  }",
            "  get voltearIsEnabled() {",
            '    return !(this.dirección === "arriba")',
            "  }",
            "}",
            'core.describeAction(Carta, "voltear", { title: "Voltearla", enabledWhen: "voltearIsEnabled", undoneAs: "Voltearla" })'
          ]
        }
      ]
    }
  ]
})
methodsEs.addRule(ActionDetail, { syntax: "seleccionada cuando {selected:expression}" })
methodsEs.addRule(ActionDetail, { syntax: "(undoable:deshacible)" })
methodsEs.addRule(ActionDetail, {
  syntax: "(cantBeUndone:no se puede deshacer|no deshacible)",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          input: [
            "una carta es una cosa donde:",
            "\t- para voltearla:",
            "\t\timprimir 1",
            "\t- para mirar:",
            "\t\t- no se puede deshacer",
            "\t\timprimir 2"
          ],
          js: [
            "export class Carta extends Thing {",
            "  voltear() {",
            "    core.console.log(1)",
            "  }",
            "",
            "  mirar() {",
            "    core.console.log(2)",
            "  }",
            "}",
            'core.describeAction(Carta, "voltear", { title: "Voltearla", undoneAs: "Voltearla" })',
            'core.describeAction(Carta, "mirar", { title: "Mirar", cantBeUndone: "keeps history" })'
          ]
        }
      ]
    }
  ]
})
methodsEs.addRule(ActionDetail, { syntax: "deshacible como {undoneAs:text}" })
methodsEs.addRule(ActionDetail, { syntax: "(replacesLast:uno nuevo reemplaza al anterior)" })
methodsEs.addRule(ActionDetail, { syntax: "icono {icon:text}" })
methodsEs.addRule(ActionDetail, {
  syntax: "titulada {title:text}",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "un título propio:  los menús, los atajos y el Inspector lo muestran",
          input: ["un juego es una cosa donde:", "\t- para compilar:", '\t\t- titulada "Código"', "\t\timprimir 1"],
          js: [
            "export class Juego extends Thing {",
            "  compilar() {",
            "    core.console.log(1)",
            "  }",
            "}",
            'core.describeAction(Juego, "compilar", { title: "Código", undoneAs: "Código" })'
          ]
        },
        {
          title: "un hueco:  un getter, al que sigue el título",
          input: [
            "un juego es una cosa donde:",
            '\t- su "nombre" es texto',
            "\t- para duplicarlo:",
            '\t\t- titulada "Duplicar [su nombre]…"',
            "\t\timprimir 1"
          ],
          js: [
            "export class Juego extends Thing {",
            '  // su "nombre" es texto',
            '  static { this.declareProp("nombre", { type: "text" }) }',
            '  get nombre() { return this.getProp("nombre") }',
            '  set nombre(value) { this.setProp("nombre", value) }',
            "",
            "  duplicar() {",
            "    core.console.log(1)",
            "  }",
            "  get duplicarTitle() {",
            "    return `Duplicar ${this.nombre}…`",
            "  }",
            "}",
            'core.describeAction(Juego, "duplicar", { title: "Duplicarlo", titleFrom: "duplicarTitle", undoneAs: "Duplicarlo" })'
          ],
          ts: [
            "export class Juego extends Thing {",
            '  // su "nombre" es texto',
            '  @prop({ type: "text" })',
            "  accessor nombre!: string",
            "",
            "  duplicar() {",
            "    core.console.log(1)",
            "  }",
            "  get duplicarTitle() {",
            "    return `Duplicar ${this.nombre}…`",
            "  }",
            "}",
            'core.describeAction(Juego, "duplicar", { title: "Duplicarlo", titleFrom: "duplicarTitle", undoneAs: "Duplicarlo" })'
          ]
        }
      ]
    }
  ]
})

// una acción cancelada:  `cancelar`, `cancelar si ...`, `cancelar a menos que ...` (epic `language` P56)
methodsEs.addRule(Wording.specialize({ ruleName: "cancel_when", meanings: ["if", "unless"] }), {
  syntax: "((if:si)|(unless:a menos que|salvo que))"
})

methodsEs.addRule(CancelThisAction, {
  syntax: "cancelar ({when:cancel_when} {condition:expression})?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "un paso de una acción:  la cancela",
          input: [
            "una carta es una cosa",
            '\tsu "rango" es un número',
            "\tpara jugarla",
            "\t\tcancelar si su rango es 0"
          ],
          js: [
            "export class Carta extends Thing {",
            '  // su "rango" es un número',
            '  static { this.declareProp("rango", { type: "number" }) }',
            '  get rango() { return this.getProp("rango") }',
            '  set rango(value) { this.setProp("rango", value) }',
            "",
            "  jugar() {",
            "    if (this.rango === 0) core.cancel()",
            "  }",
            "}",
            'core.describeAction(Carta, "jugar", { title: "Jugarla", cancels: true, undoneAs: "Jugarla" })'
          ],
          ts: [
            "export class Carta extends Thing {",
            '  // su "rango" es un número',
            '  @prop({ type: "number" })',
            "  accessor rango!: number",
            "",
            "  jugar() {",
            "    if (this.rango === 0) core.cancel()",
            "  }",
            "}",
            'core.describeAction(Carta, "jugar", { title: "Jugarla", cancels: true, undoneAs: "Jugarla" })'
          ]
        },
        {
          title: "`a menos que`:  su condición al revés",
          input: [
            "una carta es una cosa",
            '\tsu "rango" es un número',
            "\tpara jugarla",
            "\t\tcancelar a menos que su rango es 0"
          ],
          js: [
            "export class Carta extends Thing {",
            '  // su "rango" es un número',
            '  static { this.declareProp("rango", { type: "number" }) }',
            '  get rango() { return this.getProp("rango") }',
            '  set rango(value) { this.setProp("rango", value) }',
            "",
            "  jugar() {",
            "    if (!(this.rango === 0)) core.cancel()",
            "  }",
            "}",
            'core.describeAction(Carta, "jugar", { title: "Jugarla", cancels: true, undoneAs: "Jugarla" })'
          ],
          ts: [
            "export class Carta extends Thing {",
            '  // su "rango" es un número',
            '  @prop({ type: "number" })',
            "  accessor rango!: number",
            "",
            "  jugar() {",
            "    if (!(this.rango === 0)) core.cancel()",
            "  }",
            "}",
            'core.describeAction(Carta, "jugar", { title: "Jugarla", cancels: true, undoneAs: "Jugarla" })'
          ]
        }
      ]
    }
  ]
})

methodsEs.addRule(AfterHook, {
  syntax: "(después|despues) de {signature:method_signature} (:|,)? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "pasos al final de una acción",
          input: [
            "una carta es una cosa",
            "una pila es una lista de cartas",
            "para poner una carta en una pila",
            "\tagregar la carta a la pila",
            "después de poner una carta en una pila",
            "\timprimir la carta"
          ],
          js: [
            "export class Carta extends Thing {",
            "  ponerEnPila(pila) {",
            "    pila.append(this)",
            "  }",
            "",
            "  afterPonerEnPila(pila) {",
            "    core.console.log(this)",
            "  }",
            "}",
            'core.describeAction(Carta, "ponerEnPila", { title: "Poner Carta en Pila", undoneAs: "Poner Carta en Pila" })',
            'core.addAfterHook(Carta, "ponerEnPila", { hook: "afterPonerEnPila" })',
            "export class Pila extends List {",
            "  static instanceType = Carta",
            "}"
          ],
          ts: [
            "export class Carta extends Thing {",
            "  ponerEnPila(pila: Pila) {",
            "    pila.append(this)",
            "  }",
            "",
            "  afterPonerEnPila(pila: Pila) {",
            "    core.console.log(this)",
            "  }",
            "}",
            'core.describeAction(Carta, "ponerEnPila", { title: "Poner Carta en Pila", undoneAs: "Poner Carta en Pila" })',
            'core.addAfterHook(Carta, "ponerEnPila", { hook: "afterPonerEnPila" })',
            "export class Pila extends List<Carta> {",
            "  static instanceType = Carta",
            "}"
          ]
        }
      ]
    }
  ]
})

// los pasos alrededor de una acción (epic `data` P50):  antes, mientras se hace, y cuando falla
methodsEs.addRule(BeforeHook, {
  syntax: "antes de {signature:method_signature} (:|,)? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          input: [
            "un trabajo es una cosa",
            '\tsu "estado" es texto',
            "para completar un trabajo",
            '\tponer el estado del trabajo a "hecho"',
            "antes de completar un trabajo",
            '\tcancelar si el estado del trabajo es "hecho"'
          ],
          js: [
            "export class Trabajo extends Thing {",
            '  // su "estado" es texto',
            '  static { this.declareProp("estado", { type: "text" }) }',
            '  get estado() { return this.getProp("estado") }',
            '  set estado(value) { this.setProp("estado", value) }',
            "",
            "  completar() {",
            '    this.estado = "hecho"',
            "  }",
            "",
            "  beforeCompletar() {",
            '    if (this.estado === "hecho") core.cancel()',
            "  }",
            "}",
            'core.describeAction(Trabajo, "completar", { title: "Completar Trabajo", undoneAs: "Completar Trabajo" })',
            'core.addActionHook(Trabajo, "completar", { moment: "before", hook: "beforeCompletar", level: "app" })'
          ],
          ts: [
            "export class Trabajo extends Thing {",
            '  // su "estado" es texto',
            '  @prop({ type: "text" })',
            "  accessor estado!: string",
            "",
            "  completar() {",
            '    this.estado = "hecho"',
            "  }",
            "",
            "  beforeCompletar() {",
            '    if (this.estado === "hecho") core.cancel()',
            "  }",
            "}",
            'core.describeAction(Trabajo, "completar", { title: "Completar Trabajo", undoneAs: "Completar Trabajo" })',
            'core.addActionHook(Trabajo, "completar", { moment: "before", hook: "beforeCompletar", level: "app" })'
          ]
        }
      ]
    }
  ]
})
methodsEs.addRule(WhileHook, {
  syntax: "mientras se {signature:method_signature} (:|,)? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          input: [
            "un trabajo es una cosa",
            '\tsu "estado" es texto',
            "para completar un trabajo",
            '\tponer el estado del trabajo a "hecho"',
            "mientras se completa un trabajo",
            '\tponer el estado del trabajo a "ocupado"'
          ],
          js: [
            "export class Trabajo extends Thing {",
            '  // su "estado" es texto',
            '  static { this.declareProp("estado", { type: "text" }) }',
            '  get estado() { return this.getProp("estado") }',
            '  set estado(value) { this.setProp("estado", value) }',
            "",
            "  completar() {",
            '    this.estado = "hecho"',
            "  }",
            "",
            "  whileCompletar() {",
            '    this.estado = "ocupado"',
            "  }",
            "}",
            'core.describeAction(Trabajo, "completar", { title: "Completar Trabajo", undoneAs: "Completar Trabajo" })',
            'core.addActionHook(Trabajo, "completar", { moment: "while", hook: "whileCompletar", level: "app" })'
          ],
          ts: [
            "export class Trabajo extends Thing {",
            '  // su "estado" es texto',
            '  @prop({ type: "text" })',
            "  accessor estado!: string",
            "",
            "  completar() {",
            '    this.estado = "hecho"',
            "  }",
            "",
            "  whileCompletar() {",
            '    this.estado = "ocupado"',
            "  }",
            "}",
            'core.describeAction(Trabajo, "completar", { title: "Completar Trabajo", undoneAs: "Completar Trabajo" })',
            'core.addActionHook(Trabajo, "completar", { moment: "while", hook: "whileCompletar", level: "app" })'
          ]
        }
      ]
    }
  ]
})
methodsEs.addRule(FailureHook, {
  syntax: "(si|cuando) falla al {signature:method_signature} (:|,)? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          input: [
            "un trabajo es una cosa",
            '\tsu "estado" es texto',
            "para completar un trabajo",
            '\tponer el estado del trabajo a "hecho"',
            "si falla al completar un trabajo",
            '\tsi el error es "no encontrado"',
            "\t\tno importa",
            '\tsi no si el error es "sin conexión"',
            "\t\tpasar el error"
          ],
          js: [
            "export class Trabajo extends Thing {",
            '  // su "estado" es texto',
            '  static { this.declareProp("estado", { type: "text" }) }',
            '  get estado() { return this.getProp("estado") }',
            '  set estado(value) { this.setProp("estado", value) }',
            "",
            "  completar() {",
            '    this.estado = "hecho"',
            "  }",
            "",
            "  failedCompletar(error) {",
            '    if (core.errorIs(error, "not found")) return',
            '    else if (core.errorIs(error, "offline")) return core.passTheError()',
            "    return core.passTheError()",
            "  }",
            "}",
            'core.describeAction(Trabajo, "completar", { title: "Completar Trabajo", undoneAs: "Completar Trabajo" })',
            'core.addActionHook(Trabajo, "completar", { moment: "failed", hook: "failedCompletar", level: "app" })'
          ],
          ts: [
            "export class Trabajo extends Thing {",
            '  // su "estado" es texto',
            '  @prop({ type: "text" })',
            "  accessor estado!: string",
            "",
            "  completar() {",
            '    this.estado = "hecho"',
            "  }",
            "",
            "  failedCompletar(error: any /* spell: type unknown */) {",
            '    if (core.errorIs(error, "not found")) return',
            '    else if (core.errorIs(error, "offline")) return core.passTheError()',
            "    return core.passTheError()",
            "  }",
            "}",
            'core.describeAction(Trabajo, "completar", { title: "Completar Trabajo", undoneAs: "Completar Trabajo" })',
            'core.addActionHook(Trabajo, "completar", { moment: "failed", hook: "failedCompletar", level: "app" })'
          ]
        }
      ]
    }
  ]
})

// `llamar al código nativo copyText con texto`:  English's `call native ...`
methodsEs.addRule(CallNative, {
  syntax: "llamar al código nativo {name:identifier} (con [{args:expression} ,])?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "rechazado fuera de los pasos de una acción",
          input: ["llamar al código nativo copyText con 1"],
          js: '/* PARSE ERROR: "llamar al código nativo copyText con 1" llama a una función del código del proyecto:  va en los pasos de una acción, bajo "para ..." */'
        }
      ]
    }
  ]
})

// `usar copyText de clipboard.ts`, `usar todo de clipboard.ts`:  English's `use ... from ...`
methodsEs.addRule(UseNatives, {
  syntax: "usar ((all:todo)|[{names:identifier} ,]) de {file:identifier} \\. {ending:identifier}",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          title: "un proyecto sin ese archivo de código:  dice que lo añadas",
          input: ["usar copyText de clipboard.ts"],
          js: '/* PARSE ERROR: "clipboard.ts" no es uno de los archivos de código del proyecto:  añádelo primero al archivo del proyecto */'
        }
      ]
    }
  ]
})
