/**
 * Step 1 of the custom elements guide's teaching element:  the VOCABULARY of `<ui-counter>`.
 * - Every name the tag uses lives here, and only here:  its tag, attributes, events, slots, parts, states and texts.
 *   The component never writes one as a string;  it reads them through its vocabulary.
 * - The shape is Spell UI's `E.ComponentVocabulary`;  `as const` keeps every name a literal type,
 *   so `this.count` is typed and a misspelt part name fails TypeScript.
 * - A GUIDE-ONLY element (`guides/custom-elements/experiments/`):  not part of Spell UI, its site or its bundles.
 */

import type { E } from "spell-ui/core"

/****************
 * ### `counterVocabulary`
 * The names of `<ui-counter>`:  a number, and a button that adds `step` to it.
 ****************/
export const counterVocabulary = {
  tag: "ui-counter",
  topics: ["controls", "inputs"],
  aka: ["counter", "stepper", "tally"],
  skeleton: "inline 6 x 2.5",
  noun: "counter",
  description: "A counter shows a number, and a button that adds to it.",
  attributes: [
    {
      name: "count",
      kind: "number",
      description:
        "The number shown.  Leave it out and the counter keeps its own, from 0;  set it, and the page's value wins."
    },
    { name: "step", kind: "number", default: 1, description: "How much one click adds." },
    { name: "max", kind: "number", description: "The most it counts to;  none:  no limit." },
    { name: "size", kind: "size", description: "Size, `mini` ... `massive`." }
  ],
  events: [
    {
      name: "ui-change",
      detail: "{ count: number, originalEvent: Event }",
      cancelable: true,
      description: "The person asked to add:  cancel it (`preventDefault()`) to keep the old count."
    }
  ],
  slots: [{ name: "", description: "A label before the number." }],
  parts: [
    { name: "counter", description: 'The whole box (`<div class="ui counter">`).' },
    { name: "count", description: "The number (`<output>`)." },
    { name: "button", description: "The add button." }
  ],
  states: [{ name: "at-max", description: "The count has reached `max`:  the button is disabled." }],
  texts: [{ key: "add", text: "Add {step}", description: "Accessible name of the add button." }]
} as const satisfies E.ComponentVocabulary
