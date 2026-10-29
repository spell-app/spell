/**
 * Every name `<epic-state-filter>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type`, plus the state filter's texts (`FILTER_TEXTS`), from `epic-section`'s types file.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

import { FILTER_TEXTS } from "spell/epic/components/epic-section/EpicSection.types"

/****************
 * ### `<epic-state-filter>`
 * The state filter's chips:  one per item state a list has, with how many, solid while that state shows.
 ****************/
export const epicStateFilterVocabulary = {
  tag: "epic-state-filter",
  topics: ["documentation", "controls"],
  aka: ["state chips", "state filter", "chips", "filter by state"],
  skeleton: "inline 4 x 1.2",
  noun: "state-filter",
  ui: false,
  description:
    "The state filter's chips (epic `epic-engine` P3:  ONE copy, drawn wherever items, or phases, are filtered by state):  a pill " +
    "per state the items are in, in the state's colour, with how many;  solid while that state's items show, " +
    "outlined while hidden.  A click asks its owner to filter (`epic-state-changed`), which sets `shown`:  an item " +
    "section's title (`<epic-section>`), an epic page's toolbar (`<epic-page>`), and the docs runtime's lists (the " +
    "Epics page).  What a click does, by the one rule (`StateFilter.nextShown()`), is each chip's tooltip.  The items " +
    "marked in this pass (`marked`) count in a solid blue badge (Send's blue) first, whatever the filter.",
  attributes: [
    {
      name: "counts",
      kind: "string",
      description:
        "How many items are in each state, `state:count` pairs:  `attention:2 open:5 recent:3`.  A chip per state " +
        "with any, in the filter's order (`FILTER_STATES`):  progress, attention, replied, open, recent, old.  The " +
        "Phases section's, a phase's states (`PHASE_FILTER_STATES`, epic `epic-engine` I157):  undone, updated, complete."
    },
    {
      name: "marked",
      kind: "number",
      description:
        "How many of its items you marked in this pass, not applied yet (epic `epic-engine` P43):  counted in a blue " +
        "badge with a dotted outline, left of the chips, and left out of `counts`.  Drawn whatever `shown` says;  a " +
        "click does nothing.  None, or 0:  no badge."
    },
    {
      name: "shown",
      kind: "string",
      description:
        'The states showing, space-separated;  no attribute:  every state shows;  `""`, none (the owner\'s choice left none of these).'
    }
  ],
  events: [
    {
      name: "epic-state-changed",
      detail: "{ state, shown }",
      description:
        "A chip was clicked:  its `state`, and what should show next by the one rule (`shown`, the states;  " +
        "`StateFilter.nextShown()`).  The owner filters, and sets `shown`."
    }
  ],
  slots: [],
  parts: [
    { name: "base", description: "The group of chips." },
    { name: "chip", description: "Each chip, a `<button>`:  `data-state`, `data-color`, `aria-pressed`." },
    { name: "marked", description: "The blue badge of the items marked in this pass (`marked`):  not a button." }
  ],
  states: [],
  texts: [...FILTER_TEXTS],
  children: []
} as const satisfies EpicVocabulary
