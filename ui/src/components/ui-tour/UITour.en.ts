/**
 * Every name `<ui-tour>` uses:  tag, attributes (kind + allowed values), events, slots, parts, states, texts.
 * Schema:  `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - A tour draws nothing until it starts:  then one step at a time, a box beside what the step points at.
 * - Its steps are `<ui-tour-step>`s, in order (`UITourStep.en.ts`).
 */

import type { E } from "spell/ui/core"

/****************
 * ### `<ui-tour>`
 * A tour:  numbered steps that lead someone through a feature, one at a time.
 ****************/
export const tourVocabulary = {
  tag: "ui-tour",
  icon: "map signs",
  topics: ["overlays", "navigation", "modules"],
  aka: ["quick tour", "product tour", "walkthrough", "guided tour", "onboarding", "coach marks"],
  noun: "tour",
  partOfSpeech: "structure",
  description:
    "A tour leads someone through a feature one numbered step at a time, pointing at what each step is about.",
  attributes: [
    {
      name: "name",
      group: "name",
      kind: "string",
      description:
        "The tour's name:  shown at the top of each step, in the Help menu and the tours list.  " +
        'Spell starts it by this name:  `start tour "first game"`.'
    },
    {
      name: "summary",
      group: "content",
      kind: "string",
      description: "One line about the tour, under its name in the tours list and the offer to take it."
    },
    {
      name: "dim",
      group: "appearance",
      kind: "boolean",
      description:
        'Every step darkens the rest of the page, all but what it points at;  a step can say `dim="false"`.  ' +
        "Off by default."
    },
    {
      name: "remember",
      group: "behaviour",
      kind: "string",
      description:
        "Remembers that the tour was taken (finished or closed), so it isn't offered again.  `remember` alone:  in this browser.  `remember=\"on server\"`:  with the person's account, on every machine."
    },
    {
      name: "offer",
      group: "behaviour",
      kind: "enum",
      values: ["ask", "start", "dot"],
      default: "ask",
      description:
        "How it offers itself when it starts by itself (`offer()`):  `ask`, a small note asking first;  " +
        "`start`, straight away;  `dot`, a pulsing dot on the first step's target, which starts it when clicked."
    }
  ],
  events: [
    {
      name: "ui-starting",
      detail: "{ step: number }",
      cancelable: true,
      description: "About to start, at `step`;  `preventDefault()` keeps it from starting."
    },
    { name: "ui-started", detail: "{ step: number }", description: "Started:  its first step shows." },
    {
      name: "ui-stepped",
      detail: "{ from: number, to: number, name: string }",
      description: 'Moved from step `from` to step `to` (named `name`, or `""`);  `0` is no step.'
    },
    {
      name: "ui-ended",
      detail: '{ reason: "done" | "closed" | "stopped" }',
      description:
        "Ended:  `done` after its last step, `closed` by its ✕ or Escape, `stopped` by code (`stop()`, `stop tour`)."
    }
  ],
  slots: [{ name: "", description: "Its steps:  `<ui-tour-step>`s, in order." }],
  parts: [
    { name: "box", description: "The box of the step showing, beside what it points at." },
    { name: "ring", description: "The ring round what the step points at." },
    { name: "close", description: "The box's close icon." },
    { name: "offer", description: 'The note offering the tour (`offer="ask"`).' },
    { name: "dot", description: 'The pulsing dot offering the tour (`offer="dot"`).' }
  ],
  states: [
    { name: "running", description: "Started, and not ended:  a step shows." },
    { name: "seen", description: "Taken before, and remembered (`remember`)." }
  ],
  texts: [
    { key: "back", text: "Back", description: "The button that shows the step before." },
    { key: "next", text: "Next", description: "The button that shows the next step." },
    { key: "done", text: "Done", description: "The last step's button, which ends the tour." },
    { key: "close", text: "Close the tour", description: "Accessible name of the box's close icon." },
    { key: "stepOf", text: "Step {step} of {count}", description: "Where the tour is, under the step's text." },
    {
      key: "waiting",
      text: "Do this to go on.",
      description: "Under a step that waits for the person (`wait-for`), in place of Next."
    },
    { key: "offerTitle", text: "Take a quick tour?", description: 'The offer\'s title (`offer="ask"`).' },
    { key: "offerSteps", text: "{count} steps", description: "How long the tour is, in the offer and the tours list." },
    { key: "offerOneStep", text: "1 step", description: "`offerSteps` for a tour of one step." },
    { key: "offerStart", text: "Start the tour", description: "The offer's button that starts the tour." },
    {
      key: "offerNever",
      text: "No thanks",
      description: "The offer's button that closes it;  it isn't offered again."
    },
    { key: "dotLabel", text: "Take the {name} tour", description: "Accessible name of the pulsing dot." }
  ]
} as const satisfies E.ComponentVocabulary
