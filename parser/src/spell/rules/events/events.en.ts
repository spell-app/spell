/**
 * The `events` rules in English:  each rule's syntax and its tests, registered on the `events` module's parser.
 * - The rule CLASSES are their own files, beside this one:  what a rule does, whatever the language.
 * - Registered in TIE-BREAK order, the order `index.ts` once listed them:  a tie between two rules goes to the first.
 * - Another language registers the same classes with its own syntax, in `events.<lang>.ts` (epic `spanish`).
 */
import { P } from "spell/parser/parser"

import { Synonyms, Wording } from "spell/parser/spell/rules/expressions"
import { Priority } from "spell/parser/spell/rules/rules.types"

import { events } from "./events.parser"
import { DeclareEvent } from "./DeclareEvent"
import { EventWords } from "./EventWords"
import { ChangedProperty } from "./ChangedProperty"
import { On } from "./On"
import { Trigger } from "./Trigger"
import { Send } from "./Send"
import { EventPart } from "./EventPart"
import { PassEvent } from "./PassEvent"
import { CancelEvent } from "./CancelEvent"
import { InputState } from "./InputState"
import { WhileHandler } from "./WhileHandler"

/** `on`, preferred for a property's change:  `on its score change` names the property, not event `its-score-change`. */
const ON_CHANGE = On.specialize({ priority: Priority.preferred })

// a word that may link two words of an event's name -- `on` is a plain word in English already (`card click on table`)
events.addRule(Synonyms.specialize({ ruleName: "event_name_link" }), { syntax: "on" })

events.addRule(EventWords)

events.addRule(Trigger, {
  syntax: "(trigger|fire) event? {eventName:keyword} (with {props:object_literal_properties})?",
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
  syntax: "(trigger|fire) event? {eventName:event_words} (with {props:object_literal_properties})?",
  tests: [
    { compileAs: "statement", tests: [["fire event card click with card = 1", 'trigger("card-click", { card: 1 })']] }
  ]
})

// `send flipped with side = up`:  to a thing, up its chain until a handler takes it (epic `elemental-spell` P9)
events.addRule(Send, {
  syntax: "send event? {eventName:keyword} (to {target:expression})? (with {props:object_literal_properties})?",
  tests: [
    {
      compileAs: "statement",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("card")
      },
      tests: [
        ["send start", 'send(undefined, "start")'],
        ["send flipped to the card with side = 1", 'send(card, "flipped", { side: 1 })'],
        ["send closing", 'if ((await send(undefined, "closing")).canceled) return']
      ]
    }
  ]
})
events.addRule(Send, {
  syntax: "send event? {eventName:event_words} (to {target:expression})? (with {props:object_literal_properties})?",
  tests: [
    {
      compileAs: "statement",
      tests: [["send card picked with card = 1", 'send(undefined, "card-picked", { card: 1 })']]
    }
  ]
})

// a handler's own words:  `pass event`, `cancel event`, `sender`, `target`, `the original target` (Q26, Q27, C25)
events.addRule(PassEvent, { syntax: "pass (event|{eventName:keyword}|{eventName:event_words})" })
events.addRule(CancelEvent, { syntax: "cancel (event|{eventName:keyword}|{eventName:event_words})" })
events.addRule(EventPart.specialize({ reads: "originalTarget" }), { syntax: "the original target" })
events.addRule(EventPart.specialize({ reads: "sender" }), { syntax: "the? sender" })
events.addRule(EventPart.specialize({ reads: "target" }), { syntax: "the? target" })

// the mouse and the keys, readable anywhere (Q31, Q32):  `the shift key is down` is `core.input.shiftKey`
for (const [words, reads] of [
  ["meta", "metaKey"],
  ["shift", "shiftKey"],
  ["option", "optionKey"],
  ["alt", "optionKey"],
  ["control", "controlKey"]
] as const) {
  events.addRule(InputState.specialize({ reads }), { syntax: `the ${words} key {operator:is_or_is_not} down` })
}
events.addRule(InputState.specialize({ reads: "mouseStillDown" }), {
  syntax: "the mouse {operator:is_or_is_not} still down"
})
events.addRule(InputState.specialize({ reads: "button" }), {
  syntax: "the (mouse|button|left button) {operator:is_or_is_not} down",
  tests: [
    {
      compileAs: "expression",
      tests: [
        ["the mouse is down", "core.input.button"],
        ["the mouse isn't down", "!core.input.button"]
      ]
    }
  ]
})
events.addRule(InputState.specialize({ reads: "rightButton" }), {
  syntax: "the right button {operator:is_or_is_not} down"
})
events.addRule(InputState.specialize({ reads: "centerButton" }), {
  syntax: "the (center|middle) button {operator:is_or_is_not} down"
})
for (const [words, key] of [
  ["space", " "],
  ["enter", "enter"],
  ["return", "enter"],
  ["escape", "escape"],
  ["tab", "tab"],
  ["backspace", "backspace"],
  ["delete", "delete"],
  ["up arrow", "arrowup"],
  ["down arrow", "arrowdown"],
  ["left arrow", "arrowleft"],
  ["right arrow", "arrowright"]
] as const) {
  events.addRule(InputState.specialize({ reads: "isKeyDown", key }), {
    syntax: `the? ${words} (key)? {operator:is_or_is_not} down`
  })
}
events.addRule(InputState.specialize({ reads: "thingUnderMouse", datatype: "thing" }), {
  syntax: "the thing under the mouse"
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
            "  onMouseDown(event: MouseDownEvent) {",
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

// A passive `when`, about the thing itself (epic `debut` P27, Q47):  `when clicked` is `on click` -- see `On`
events.addRule(
  Wording.specialize({
    ruleName: "passive_event",
    meanings: ["click", "double_click", "right_click", "drag", "drag_cancelled"]
  }),
  {
    syntax:
      "((click:clicked)|(double_click:double clicked)|(right_click:right clicked)|(drag:dragged)|(drag_cancelled:drag is cancelled|the drag is cancelled|drag cancelled))"
  }
)
events.addRule(On, {
  syntax: "when {passive:passive_event} :? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          input: [
            "a card is a view where:",
            "\t- when double clicked print 1",
            "\t- when the drag is cancelled print 2"
          ],
          js: [
            "export class Card extends View {",
            '  static elementTag = core.defineElement(this, "test_events")',
            "",
            "  onDoubleClick(event) {",
            "    return core.console.log(1)",
            "  }",
            "",
            "  onDragCancelled(event) {",
            "    return core.console.log(2)",
            "  }",
            "}"
          ],
          ts: [
            "export class Card extends View {",
            '  static elementTag = core.defineElement(this, "test_events")',
            "",
            "  onDoubleClick(event: DoubleClickEvent) {",
            "    return core.console.log(1)",
            "  }",
            "",
            "  onDragCancelled(event: DragCancelledEvent) {",
            "    return core.console.log(2)",
            "  }",
            "}",
            "",
            "/**",
            " * `<test-events-card>`:  a card, drawn in its own element, e.g. by `draw the card`.",
            " * - The page defines its tag with this class:  `core.useElement()`, below.",
            " * - Its attributes are its card's properties;  its methods call its card's.",
            " * - What every view's element does, e.g. drawing its card, is `SpellElement`'s.",
            " */",
            "export class CardElement extends SpellElement<Card> {",
            '  @E.proto static vocabulary = SpellElement.vocabularyFor("test-events-card", "card", [])',
            "",
            "  onDoubleClick(event: DoubleClickEvent) {",
            "    return this.currentThing?.onDoubleClick(event)",
            "  }",
            "",
            "  onDragCancelled(event: DragCancelledEvent) {",
            "    return this.currentThing?.onDragCancelled(event)",
            "  }",
            "}",
            "core.useElement(Card, CardElement)"
          ]
        }
      ]
    }
  ]
})

// a property's change (epic `debut` P30, Q47):  `- when its score changes:` is `- on score change:`, the event
// `score-change` -- before `when {eventName:event_words}`, which would read `score-changes`
events.addRule(ChangedProperty)
events.addRule(ON_CHANGE, {
  syntax:
    "(when|on) (its|the)? {changed:changed_property} (changes|change|changed|has changed|is changed) :? {statement_body}?",
  tests: [
    {
      compileAs: "block",
      tests: [
        {
          input: [
            "a game is a thing where:",
            '\t- its "high score" is a number',
            '\t- its "hint" is text',
            "\t- when its high score changes:",
            '\t\tset its hint to "Best yet!"',
            "\t- on hint change print its hint"
          ],
          js: [
            "export class Game extends Thing {",
            '  // - its "high score" is a number',
            '  static { this.declareProp("highScore", { type: "number" }) }',
            '  get highScore() { return this.getProp("highScore") }',
            '  set highScore(value) { this.setProp("highScore", value) }',
            "",
            '  // - its "hint" is text',
            '  static { this.declareProp("hint", { type: "text" }) }',
            '  get hint() { return this.getProp("hint") }',
            '  set hint(value) { this.setProp("hint", value) }',
            "",
            "  onHighScoreChange(event) {",
            '    this.hint = "Best yet!"',
            "  }",
            "",
            "  onHintChange(event) {",
            "    return core.console.log(this.hint)",
            "  }",
            "}"
          ],
          ts: [
            "export class Game extends Thing {",
            '  // - its "high score" is a number',
            '  @prop({ type: "number" })',
            "  accessor highScore!: number",
            "",
            '  // - its "hint" is text',
            '  @prop({ type: "text" })',
            "  accessor hint!: string",
            "",
            "  onHighScoreChange(event: HighScoreChangeEvent) {",
            '    this.hint = "Best yet!"',
            "  }",
            "",
            "  onHintChange(event: HintChangeEvent) {",
            "    return core.console.log(this.hint)",
            "  }",
            "}"
          ]
        }
      ]
    }
  ]
})

// `when flipped:`, the same as `on flipped:` (Q42:  `on` or `when`, either, for an event);
// `when created` stays the creation hook, which wins on the same words (`priority`)
events.addRule(On, { syntax: "when {eventName:keyword} {props:with_props_arg}? :? {statement_body}?" })
events.addRule(On, { syntax: "when {eventName:event_words} {props:with_props_arg}? :? {statement_body}?" })

// `- while the mouse is down:`:  steps that hold while it's pressed on the thing, put back after (Q51, Q52 A)
events.addRule(WhileHandler.specialize({ handler: "while_mouse_down" }), {
  syntax: "while the mouse is down (on it)? :? {statement_body}?"
})
events.addRule(WhileHandler.specialize({ handler: "while_mouse_over" }), {
  syntax: "while the mouse is over it :? {statement_body}?"
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
