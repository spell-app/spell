/**
 * The `events` rules in Spanish (epic `spanish`):
 * each rule's syntax and its tests, registered on Spanish's own `events` parser.
 * - The rule CLASSES are their own files, beside this one, shared with every language.
 * - Registered in the same order as `events.en.ts`:  a tie between two rules goes to the first.
 * - Its tests compile to the same javascript as English's:  the same program, said in Spanish.
 */
import { P } from "spell-lang/parser"
import { SpellParser } from "spell-lang/spell/SpellParser"
import { Synonyms } from "spell-lang/spell/rules/expressions"

import { EventWords } from "./EventWords"
import { On } from "./On"
import { Trigger } from "./Trigger"

/** Spanish's `events` rules. */
export const eventsEs = new SpellParser({ module: "events" })

// a word that may link two words of an event's name:  `clic en carta`, `fin del juego` (epic `spanish` I11)
eventsEs.addRule(Synonyms.specialize({ ruleName: "event_name_link" }), { syntax: "(en|de|del|sobre)" })

eventsEs.addRule(EventWords)

eventsEs.addRule(Trigger, {
  syntax: "(disparar|lanzar|enviar) (el? evento)? {eventName:keyword} (con {props:object_literal_properties})?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        //
        { input: `disparar card-click`, js: 'trigger("card-click")' },
        {
          input: `lanzar el evento card-click con card = 1`,
          js: 'trigger("card-click", { card: 1 })'
        },
        {
          input: `enviar evento card-click con card = 1`,
          js: 'trigger("card-click", { card: 1 })'
        }
      ]
    }
  ]
})

// `lanzar evento card click con card = 1`:  an event's name of several words -- see `event_words`
eventsEs.addRule(Trigger, {
  syntax: "(disparar|lanzar|enviar) (el? evento)? {eventName:event_words} (con {props:object_literal_properties})?",
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
