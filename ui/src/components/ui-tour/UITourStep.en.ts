/**
 * Every name `<ui-tour-step>` uses:  one step of a `<ui-tour>` (`UITour.en.ts`).
 * Schema:  `E.ComponentVocabulary` (`spell/ui/vocabulary`).
 * - Its text is its content;  the tour shows it in its box while the step is the one showing.
 */

import type { E } from "spell/ui/core"

/****************
 * ### `<ui-tour-step>`
 * One step of a tour:  what it says, and what it points at.
 ****************/
export const tourStepVocabulary = {
  tag: "ui-tour-step",
  icon: "map marker alternate",
  topics: ["overlays", "content parts"],
  aka: ["tour stop", "coach mark", "hotspot"],
  noun: "tour step",
  partOfSpeech: "structure",
  description: "One step of a tour:  what it says, and what it points at.",
  attributes: [
    {
      name: "name",
      group: "name",
      kind: "string",
      description: 'Optional:  a step can be shown by its name as well as its number (`show step "drag"`).'
    },
    {
      name: "target",
      group: "behaviour",
      kind: "string",
      description:
        "What it points at:  the name of a part of the app (its `id`), a `data-tour` name, or a CSS selector;  " +
        "an element set by script.  None:  its box shows near the top of the screen.  " +
        "A target that isn't on the page skips the step."
    },
    {
      name: "placement",
      group: "layout",
      kind: "enum",
      values: ["bottom", "top", "left", "right"],
      default: "bottom",
      description: "Which side of its target the box goes;  it moves to the other side when there's no room."
    },
    {
      name: "dim",
      group: "appearance",
      kind: "boolean",
      description: 'Darkens the rest of the page, all but its target;  `dim="false"` turns the tour\'s `dim` off here.'
    },
    {
      name: "wait-for",
      group: "behaviour",
      kind: "string",
      description:
        "Waits for the person to do something to its target, an event's name (`click`, `input`, `ui-opened`):  " +
        "the rest of the page can't be clicked, Next is hidden, and the tour goes on when it happens."
    }
  ],
  events: [],
  slots: [{ name: "", description: "What the step says." }],
  parts: [],
  states: [],
  texts: []
} as const satisfies E.ComponentVocabulary
