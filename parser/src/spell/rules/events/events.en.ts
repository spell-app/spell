/**
 * The `events` rules in English:  each rule's syntax and its tests, registered on the `events` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `events.<lang>.ts` (epic `spanish`).
 */
import { P } from "spell-parser/parser"

import { Synonyms } from "spell-parser/spell/rules/expressions"

import { events } from "./events.parser"
import { DeclareEvent } from "./DeclareEvent"
import { EventWords } from "./EventWords"
import { On } from "./On"
import { Trigger } from "./Trigger"

// a word that may link two words of an event's name -- `on` is a plain word in English already (`card click on table`)
events.addRule(Synonyms.specialize({ ruleName: "event_name_link" }), { syntax: "on" })

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
  tests: [
    { compileAs: "block", tests: [["on card click", 'on("card-click")']] },
    {
      title: "in a template's outline:  each of its things' handler, `it` the thing (epic `elemental-spell` P5)",
      compileAs: "block",
      tests: [
        {
          input: [
            "a card is a thing where:",
            "\t- it has a rank as a number",
            "\t- on mouse down:",
            "\t\tprint its rank",
            "\t- on card click with a card:",
            "\t\tprint the rank of the card"
          ],
          js: [
            "export class Card extends Thing {",
            "  // - it has a rank as a number",
            '  static { this.declareProp("rank", { type: "number" }) }',
            '  get rank() { return this.getProp("rank") }',
            '  set rank(value) { this.setProp("rank", value) }',
            "",
            "  onMouseDown(event) {",
            "    core.console.log(this.rank)",
            "  }",
            "",
            "  onCardClick(event) {",
            "    const { card } = event",
            "    core.console.log(card.rank)",
            "  }",
            "}"
          ],
          ts: [
            "export class Card extends Thing {",
            "  // - it has a rank as a number",
            '  @prop({ type: "number" })',
            "  accessor rank!: number",
            "",
            "  onMouseDown(event: any /* spell: type unknown */) {",
            "    core.console.log(this.rank)",
            "  }",
            "",
            "  onCardClick(event: { card?: Card }) {",
            "    const { card } = event",
            "    core.console.log(card.rank)",
            "  }",
            "}"
          ]
        }
      ]
    }
  ]
})

// an event a template's things send, and what comes with it (epic `elemental-spell` P5):
// `- it sends "flipped" with a side as a direction`, or `a card sends "flipped"` -- see `DeclareEvent`
events.addRule(DeclareEvent, {
  syntax: "{type:subject_it} sends {event:text} {props:with_props_arg}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          input: ["a card is a thing where:", '\t- it sends "flipped" with side as text and a card'],
          js: [
            "export class Card extends Thing {}",
            '// - it sends "flipped" with side as text and a card',
            'core.describeEvent(Card, "flipped", { params: { side: "text", card: "Card" } })'
          ]
        },
        {
          input: ["a card is a thing where:", '\t- it sends "card flipped"'],
          js: [
            "export class Card extends Thing {}",
            '// - it sends "card flipped"',
            'core.describeEvent(Card, "card-flipped", {})'
          ]
        }
      ]
    }
  ]
})
events.addRule(DeclareEvent, { syntax: "{type:subject_implied} sends {event:text} {props:with_props_arg}?" })
events.addRule(DeclareEvent, {
  syntax: "(a|an) {type} sends {event:text} {props:with_props_arg}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          input: ["a card is a thing", 'a card sends "flipped" with side as text'],
          js: [
            "export class Card extends Thing {}",
            '// a card sends "flipped" with side as text',
            'core.describeEvent(Card, "flipped", { params: { side: "text" } })'
          ]
        }
      ]
    }
  ]
})
