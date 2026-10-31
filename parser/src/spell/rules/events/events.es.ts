/**
 * The `events` rules in Spanish (epic `spanish`):
 * each rule's syntax and its tests, registered on Spanish's own `events` parser.
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `events.en.ts`:  a tie between two rules goes to the first.
 * - Its tests compile to the same javascript as English's:  the same program, said in Spanish.
 */
import { P } from "spell/parser/parser"
import { SpellParser } from "spell/parser/spell/SpellParser"
import { Synonyms, Wording } from "spell/parser/spell/rules/expressions"
import { Priority } from "spell/parser/spell/rules/rules.types"

import { DeclareEvent } from "./DeclareEvent"
import { EventWords } from "./EventWords"
import { ChangedProperty } from "./ChangedProperty"
import { On } from "./On"
import { WhenSomeoneElseChanges, WhenThingChanges } from "./WhenChanges"
import { Trigger } from "./Trigger"
import { Send } from "./Send"
import { EventPart } from "./EventPart"
import { PassEvent } from "./PassEvent"
import { CancelEvent } from "./CancelEvent"
import { InputState } from "./InputState"
import { WhileHandler } from "./WhileHandler"

/** Spanish's `events` rules. */
export const eventsEs = new SpellParser({ module: "events" })

/** `on`, preferred for a property's change:  `on its score change` names the property, not event `its-score-change`. */
const ON_CHANGE = On.specialize({ priority: Priority.preferred })

// a word that may link two words of an event's name:  `clic en carta`, `fin del juego` (epic `spanish` I11)
eventsEs.addRule(Synonyms.specialize({ ruleName: "event_name_link" }), { syntax: "(en|de|del|sobre)" })

eventsEs.addRule(EventWords)

eventsEs.addRule(Trigger, {
  syntax: "(disparar|lanzar) (el? evento)? {eventName:keyword} (con {props:object_literal_properties})?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        //
        { input: `disparar card-click`, js: 'trigger("card-click")' },
        {
          input: `lanzar el evento card-click con card = 1`,
          js: 'trigger("card-click", { card: 1 })'
        }
      ]
    }
  ]
})

// `lanzar evento card click con card = 1`:  an event's name of several words -- see `event_words`
eventsEs.addRule(Trigger, {
  syntax: "(disparar|lanzar) (el? evento)? {eventName:event_words} (con {props:object_literal_properties})?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        ["lanzar evento card click con card = 1", 'trigger("card-click", { card: 1 })'],
        // a linking word inside the name, which ends at `con` (epic `spanish` I11)
        ["disparar evento clic en carta con carta = 1", 'trigger("clic-en-carta", { carta: 1 })'],
        ["disparar evento fin del juego", 'trigger("fin-del-juego")']
      ]
    }
  ]
})

// `enviar volteada con lado = arriba`:  a una cosa, subiendo por su cadena hasta que un manejador la tome (epic `elemental-spell` P9)
eventsEs.addRule(Send, {
  syntax: "enviar (el? evento)? {eventName:keyword} (a {target:expression})? (con {props:object_literal_properties})?",
  tests: [{ compileAs: "statement", tests: [["enviar inicio", 'send(undefined, "inicio")']] }]
})
eventsEs.addRule(Send, {
  syntax:
    "enviar (el? evento)? {eventName:event_words} (a {target:expression})? (con {props:object_literal_properties})?",
  tests: [
    {
      compileAs: "statement",
      tests: [["enviar carta elegida con carta = 1", 'send(undefined, "carta-elegida", { carta: 1 })']]
    }
  ]
})

// las palabras de un manejador:  `pasar evento`, `cancelar evento`, `el remitente`, `el destino`, `el destino original`
eventsEs.addRule(PassEvent, { syntax: "pasar (el? evento|{eventName:keyword}|{eventName:event_words})" })
eventsEs.addRule(CancelEvent, { syntax: "cancelar (el? evento|{eventName:keyword}|{eventName:event_words})" })
eventsEs.addRule(EventPart.specialize({ reads: "originalTarget" }), { syntax: "el destino original" })
eventsEs.addRule(EventPart.specialize({ reads: "sender" }), { syntax: "el? remitente" })
eventsEs.addRule(EventPart.specialize({ reads: "target" }), { syntax: "el? destino" })

// el ratón y las teclas, legibles en cualquier parte:  `la tecla mayúsculas está presionada` es `core.input.shiftKey`
for (const [words, reads] of [
  ["meta", "metaKey"],
  ["(mayúsculas|mayusculas)", "shiftKey"],
  ["(opción|opcion)", "optionKey"],
  ["alt", "optionKey"],
  ["control", "controlKey"]
] as const) {
  eventsEs.addRule(InputState.specialize({ reads }), { syntax: `la tecla ${words} {operator:is_or_is_not} presionada` })
}
eventsEs.addRule(InputState.specialize({ reads: "mouseStillDown" }), {
  syntax: "el (ratón|raton) {operator:is_or_is_not} presionado (todavía|todavia)"
})
eventsEs.addRule(InputState.specialize({ reads: "button" }), {
  syntax: "el (ratón|raton|botón|boton|botón izquierdo|boton izquierdo) {operator:is_or_is_not} presionado",
  tests: [{ compileAs: "expression", tests: [["el ratón está presionado", "core.input.button"]] }]
})
eventsEs.addRule(InputState.specialize({ reads: "rightButton" }), {
  syntax: "el (botón|boton) derecho {operator:is_or_is_not} presionado"
})
eventsEs.addRule(InputState.specialize({ reads: "centerButton" }), {
  syntax: "el (botón|boton) central {operator:is_or_is_not} presionado"
})
for (const [words, key] of [
  ["espacio", " "],
  ["intro", "enter"],
  ["escape", "escape"],
  ["tabulador", "tab"],
  ["retroceso", "backspace"],
  ["suprimir", "delete"],
  ["flecha arriba", "arrowup"],
  ["flecha abajo", "arrowdown"],
  ["flecha izquierda", "arrowleft"],
  ["flecha derecha", "arrowright"]
] as const) {
  eventsEs.addRule(InputState.specialize({ reads: "isKeyDown", key }), {
    syntax: `(el|la)? (tecla)? ${words} {operator:is_or_is_not} (presionado|presionada)`
  })
}
eventsEs.addRule(InputState.specialize({ reads: "thingUnderMouse", datatype: "thing" }), {
  syntax: "la cosa bajo el (ratón|raton)"
})

eventsEs.addRule(On, {
  syntax: "al evento? {eventName:keyword} {props:with_props_arg}? :? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.types?.add("card")
      },
      tests: [
        //
        { title: "No statements", input: `al card-click`, js: 'on("card-click")' },
        {
          title: "Inline statement",
          input: `al evento card-click: imprimir 1`,
          js: 'on("card-click", () => core.console.log(1))'
        },
        {
          title: "Nested block",
          input: [`al evento card-click con una card:`, `\timprimir el name de la card`],
          js: ['on("card-click", (event) => {', "  const { card } = event", "  core.console.log(card.name)", "})"],
          ts: 'on<{ card: Card }>("card-click", ({ card }) => core.console.log(card.name))'
        },
        {
          title: "Show error if nested block and inline statement",
          input: [`al evento card-click con una card: imprimir 1`, `\timprimir el name de la card`],
          js: [
            'on("card-click", (event) => {',
            "  const { card } = event",
            "  core.console.log(card.name)",
            "})",
            "/* PARSE ERROR: Tiene a la vez una instrucción en la misma línea y un bloque con sangría debajo */"
          ],
          ts: [
            'on<{ card: Card }>("card-click", ({ card }) => core.console.log(card.name))',
            "/* PARSE ERROR: Tiene a la vez una instrucción en la misma línea y un bloque con sangría debajo */"
          ]
        }
      ]
    }
  ]
})

// `al card click con una card`:  an event's name of several words, the same event as `card-click` -- see `event_words`
eventsEs.addRule(On, {
  syntax: "al evento? {eventName:event_words} {props:with_props_arg}? :? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.types?.add("carta")
      },
      tests: [
        ["al card click", 'on("card-click")'],
        // a linking word inside the name, which ends at `con` (epic `spanish` I11)
        [
          ["al clic en carta con una carta", "\timprimir 1"],
          ['on("clic-en-carta", (event) => {', "  const { carta } = event", "  core.console.log(1)", "})"],
          'on<{ carta: Carta }>("clic-en-carta", ({ carta }) => core.console.log(1))'
        ],
        // never the last word:  `al clic en` is event `clic`, then a word it can't read
        ["al clic en", ['on("clic")', '/* PARSE ERROR: No entiendo "en" */']]
      ]
    }
  ]
})

// un `cuando` pasivo, sobre la cosa misma (épica `debut` P27, Q47):  `cuando se pulsa` es `al clic`
eventsEs.addRule(
  Wording.specialize({
    ruleName: "passive_event",
    meanings: ["click", "double_click", "right_click", "drag", "drag_cancelled"]
  }),
  {
    syntax:
      "((click:se pulsa)|(double_click:se pulsa dos veces)|(right_click:se pulsa con el botón derecho)|(drag:se arrastra)|(drag_cancelled:se cancela el arrastre|se cancela su arrastre))"
  }
)
eventsEs.addRule(On, {
  syntax: "cuando {passive:passive_event} :? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          input: ["una carta es una vista donde:", "\t- cuando se pulsa dos veces imprimir 1"],
          js: [
            "export class Carta extends View {",
            '  static elementTag = core.defineElement(this, "test_events")',
            "",
            "  onDoubleClick(event) {",
            "    return core.console.log(1)",
            "  }",
            "}"
          ],
          ts: [
            "export class Carta extends View {",
            '  static elementTag = core.defineElement(this, "test_events")',
            "",
            "  onDoubleClick(event: DoubleClickEvent) {",
            "    return core.console.log(1)",
            "  }",
            "}",
            "",
            "/**",
            " * `<test-events-carta>`:  a carta, drawn in its own element, e.g. by `draw the carta`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its carta's properties;  its methods call its carta's.",
            " * - What every view's element does, e.g. drawing its carta, is `SpellElement`'s.",
            " */",
            "export class CartaElement extends SpellElement<Carta> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-events-carta", "carta", [])',
            "",
            "  onDoubleClick(event: DoubleClickEvent) {",
            "    return this.currentThing?.onDoubleClick(event)",
            "  }",
            "}",
            "core.useElement(Carta, CartaElement)"
          ]
        }
      ]
    }
  ]
})

// el cambio de una propiedad (épica `debut` P30, Q47):  `- cuando (su) puntuación cambia:` es
// `- al cambiar (su) puntuación:`, el evento `puntuación-change`
eventsEs.addRule(ChangedProperty)
eventsEs.addRule(ON_CHANGE, {
  syntax: "cuando (su|sus|el|la)? {changed:changed_property} (cambia|ha cambiado) :? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          input: [
            "un juego es una cosa donde:",
            '\t- su "puntuación" es un número',
            "\t- cuando su puntuación cambia imprimir su puntuación"
          ],
          js: [
            "export class Juego extends Thing {",
            '  // su "puntuación" es un número',
            '  static { this.declareProp("puntuación", { type: "number" }) }',
            '  get puntuación() { return this.getProp("puntuación") }',
            '  set puntuación(value) { this.setProp("puntuación", value) }',
            "",
            "  onPuntuaciónChange(event) {",
            "    return core.console.log(this.puntuación)",
            "  }",
            "}"
          ],
          ts: [
            "export class Juego extends Thing {",
            '  // su "puntuación" es un número',
            '  @prop({ type: "number" })',
            "  accessor puntuación!: number",
            "",
            "  onPuntuaciónChange(event: PuntuaciónChangeEvent) {",
            "    return core.console.log(this.puntuación)",
            "  }",
            "}"
          ]
        }
      ]
    }
  ]
})
eventsEs.addRule(ON_CHANGE, {
  syntax: "al cambiar (su|sus|el|la)? {changed:changed_property} :? {statement_body}?"
})

// una cosa guardada cambia (épica `data` P13):  por encima de un evento de las mismas palabras, que nadie enviaría
eventsEs.addRule(WhenThingChanges, {
  syntax: "cuando cambia (un|una) {type:known_type} :? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.types?.add("receta")
      },
      tests: [
        {
          input: ["cuando cambia una receta:", "\timprimir el título de la receta"],
          js: ['on("a-receta-change", (event) => {', "  const { receta } = event", "  core.console.log(receta.título)", "})"],
          ts: 'on<{ receta: Receta }>("a-receta-change", ({ receta }) => core.console.log(receta.título))'
        }
      ]
    }
  ]
})
eventsEs.addRule(WhenSomeoneElseChanges, { syntax: "cuando otra persona (lo|la) cambia :? {statement_body}?" })

// `cuando volteada:`, lo mismo que `al volteada:` (Q42)
eventsEs.addRule(On, { syntax: "cuando {eventName:keyword} {props:with_props_arg}? :? {statement_body}?" })
eventsEs.addRule(On, { syntax: "cuando {eventName:event_words} {props:with_props_arg}? :? {statement_body}?" })

// `- mientras el ratón está presionado:` (Q51, Q52 A)
eventsEs.addRule(WhileHandler.specialize({ handler: "while_mouse_down" }), {
  syntax: "mientras el (ratón|raton) (está|esta) presionado (sobre (ella|él|el))? :? {statement_body}?"
})
eventsEs.addRule(WhileHandler.specialize({ handler: "while_mouse_over" }), {
  syntax: "mientras el (ratón|raton) (está|esta) sobre (ella|él|el) :? {statement_body}?"
})

// an event a template's things send, and what comes with it (epic `elemental-spell` P5):
// `- envía "volteada" con un lado como una dirección`, or `una carta envía "volteada"` -- see `DeclareEvent`
eventsEs.addRule(DeclareEvent, {
  syntax: "{type:subject_it} (envía|envia) {event:text} {props:with_props_arg}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          input: ["una carta es una cosa donde:", '\t- envía "volteada" con lado como texto'],
          js: [
            "export class Carta extends Thing {}",
            '// envía "volteada" con lado como texto',
            'core.describeEvent(Carta, "volteada", { params: { lado: "text" } })'
          ]
        }
      ]
    }
  ]
})
eventsEs.addRule(DeclareEvent, { syntax: "{type:subject_implied} (envía|envia) {event:text} {props:with_props_arg}?" })
eventsEs.addRule(DeclareEvent, {
  syntax: "(un|una) {type} (envía|envia) {event:text} {props:with_props_arg}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          input: ["una carta es una cosa", 'una carta envía "volteada"'],
          js: [
            "export class Carta extends Thing {}",
            '// una carta envía "volteada"',
            'core.describeEvent(Carta, "volteada", {})'
          ]
        }
      ]
    }
  ]
})
