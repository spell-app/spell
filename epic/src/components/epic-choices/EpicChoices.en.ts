/**
 * Every name `<epic-choices>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-choices>`
 * Option cards:  a question's, or the options any item's prose weighs (a call's, a reply's).
 ****************/
export const epicChoicesVocabulary = {
  tag: "epic-choices",
  topics: ["documentation", "selection", "cards"],
  aka: ["choices", "options", "pros and cons", "alternatives"],
  noun: "choices",
  ui: false,
  description:
    "Option cards, `<epic-option>`s:  side by side while open, each with a Choose pill while the page is reviewed;  " +
    "folded under Choices once answered, the chosen one marked.  Wherever prose goes (`flow`, P14):  a question's " +
    "own, after its text, or the options any item weighs -- a judgement call's, a reply's, More Details'.",
  attributes: [
    {
      name: "chosen",
      kind: "string",
      format: "letter",
      description: "The chosen option's `letter`, once answered;  absent while the question is open."
    },
    {
      name: "chosen-on",
      kind: "string",
      format: "date",
      description:
        "The day Owen's pick was recorded (`epic inbox apply`, `epic choose`, a revisit's pick kept);  shown " +
        "inside the unfolded Choices, with `chosen-note`."
    },
    {
      name: "chosen-note",
      kind: "string",
      description:
        "What recording the pick did, and what happens next:  `recorded as the answer;  waiting for a phase to take it " +
        "up`.  Shown inside the unfolded Choices, so a pick needs no Noted card of its own (I153)."
    }
  ],
  events: [],
  slots: [{ name: "", description: "The options." }],
  parts: [
    { name: "base", description: "The cards side by side;  answered, the folded Choices aside." },
    { name: "toggle", description: "Answered:  the `Choices` `<button>` that folds the options." },
    {
      name: "chosen",
      description: "Answered with an option chosen:  `✓ Chosen:  B · Bananas` in the toggle, green, folded or not."
    },
    { name: "panels", description: "Answered:  the box of option panels, hidden while folded." },
    {
      name: "note",
      description:
        "Answered, with `chosen-on` or `chosen-note`:  the pick's line atop the panels, `Chosen 10/29/26:  ...`."
    }
  ],
  states: [
    { name: "answered", description: "Its question is answered (`chosen`, or `answered` on its item):  folded." },
    { name: "open", description: "Answered, and its options unfolded." },
    {
      name: "answering",
      description: "An `<epic-ask>`'s options (a page you answer on):  one card a row, each with a tick box."
    }
  ],
  texts: [
    { key: "foldTip", text: "Fold the choices", description: "Tooltip of its fold button while open." },
    { key: "unfoldTip", text: "Unfold the choices", description: "Tooltip of its fold button while folded." },

    { key: "choices", text: "Choices", description: "The answered question's options' heading." },
    {
      key: "chosen",
      text: "Chosen:  {name}",
      description: "After the heading:  the chosen option, `{name}` its letter and title (`B · Bananas`)."
    },
    {
      key: "chosenNote",
      text: "Chosen {date}:  {note}",
      description: "Atop the unfolded panels:  when the pick was recorded, `{date}`, and what happens next, `{note}`."
    },
    { key: "chosenOn", text: "Chosen {date}", description: "Atop the unfolded panels:  a pick with a day, no note." },
    {
      key: "chosenNoteOnly",
      text: "Chosen:  {note}",
      description: "Atop the unfolded panels:  a pick with a note, no day."
    }
  ],
  children: [{ tag: "epic-option", min: 1, description: "The options, `A`, `B` ..." }],
  // P14:  options in any prose too -- a reply's, a judgement call's text (`Upgrader`, the old prose option grids)
  flow: true
} as const satisfies EpicVocabulary
