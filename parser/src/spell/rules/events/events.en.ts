/**
 * The `events` rules in English:  each rule's syntax and its tests, registered on the `events` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `events.<lang>.ts` (epic `spanish`).
 */
import { P } from "spell-lang/parser"

import { events } from "./events.parser"
import { EventWords } from "./EventWords"
import { On } from "./On"
import { Trigger } from "./Trigger"

events.addRule(EventWords)

events.addRule(Trigger, {
  syntax: "(trigger|fire|send) event? {eventName:keyword} (with {props:object_literal_properties})?",
  tests: [
    {
      compileAs: "statement",
      tests: [
        //
        { input: `trigger card-click`, js: 'trigger("card-click")' },
        {
          input: `fire event card-click with card = 1`,
          js: 'trigger("card-click", { card: 1 })'
        }
      ]
    }
  ]
})

// `fire event card click with card = it`:  an event's name of several words -- see `event_words`
events.addRule(Trigger, {
  syntax: "(trigger|fire|send) event? {eventName:event_words} (with {props:object_literal_properties})?",
  tests: [
    { compileAs: "statement", tests: [["fire event card click with card = 1", 'trigger("card-click", { card: 1 })']] }
  ]
})

events.addRule(On, {
  syntax: "on event? {eventName:keyword} {props:with_props_arg}? :? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      beforeEach(scope: P.Scope) {
        scope.types?.add("card")
      },
      tests: [
        //
        { title: "No statements", input: `on card-click`, js: 'on("card-click")' },
        {
          title: "Inline statement",
          input: `on event card-click: print 1`,
          js: 'on("card-click", () => core.console.log(1))'
        },
        {
          title: "Nested block",
          input: [`on event card-click with a card:`, `\tprint the name of the card`],
          js: ['on("card-click", (event) => {', "  const { card } = event", "  core.console.log(card.name)", "})"],
          ts: 'on<{ card: Card }>("card-click", ({ card }) => core.console.log(card.name))'
        },
        {
          title: "Show error if nested block and inline statement",
          input: [`on event card-click with a card: print 1`, `\tprint the name of the card`],
          js: [
            'on("card-click", (event) => {',
            "  const { card } = event",
            "  core.console.log(card.name)",
            "})",
            "/* PARSE ERROR: Got both inline statement and nested block */"
          ],
          ts: [
            'on<{ card: Card }>("card-click", ({ card }) => core.console.log(card.name))',
            "/* PARSE ERROR: Got both inline statement and nested block */"
          ]
        }
      ]
    }
  ]
})

// `on card click with a card`:  an event's name of several words, the same event as `card-click` -- see `event_words`
events.addRule(On, {
  syntax: "on event? {eventName:event_words} {props:with_props_arg}? :? {statement_body}?",
  tests: [{ compileAs: "block", tests: [["on card click", 'on("card-click")']] }]
})
