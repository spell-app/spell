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
      format: "letters",
      description:
        "The chosen option's `letter`, once answered;  absent while the question is open.  A `multiple` set's may name " +
        'several, a space between (`chosen="A C"`).'
    },
    {
      name: "multiple",
      kind: "boolean",
      description:
        "Pick any:  Owen may pick several of its options (epic `epic-engine` P50).  None:  pick one.  While the page is " +
        "reviewed its heading's switch flips it;  the flip goes with his Send."
    },
    {
      name: "fixed",
      kind: "boolean",
      description: "Owen may NOT add options:  no Add choice.  None:  every open set takes his (Owen's comment C4)."
    },
    {
      name: "closed",
      kind: "boolean",
      description:
        "The set is DONE (Owen's comment C11):  no more picks, and no options added, edited or removed;  drawn " +
        "answered.  `epic option close`."
    },
    {
      name: "standing",
      kind: "boolean",
      description:
        "A standing set, in the page's Choices section:  never folds away as answered.  Each round's picks are " +
        "stamped on their options (`picked-on`) and folded under Picked;  the rest stay open, and Claude adds more."
    },
    {
      name: "title",
      property: "epicTitle",
      kind: "string",
      description: "A standing set's title, drawn as its heading (`Upgrades on offer`).  Its `id` keys its marks."
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
  slots: [
    { name: "", description: "The options." },
    { name: "picked", description: "A standing set's options Owen picked (`picked-on`):  folded under Picked." },
    { name: "removed", description: "Its removed options (`removed`), never erased:  folded under Removed (n)." }
  ],
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
    },
    { name: "cards", description: "Open:  the cards' grid, Owen's added ones and Add choice's form too (P50)." },
    {
      name: "heading",
      description:
        "Open, while reviewed or pick any, or a standing set:  the line above the cards, its title and its switch."
    },
    { name: "title", description: "A standing set's title, in its heading." },
    {
      name: "switch",
      description:
        'While reviewed:  `Pick one` / `Pick any`, a `<button role="switch">`;  flipped from the set\'s own, dashed ' +
        "until sent."
    },
    { name: "add", description: "While reviewed, unless `fixed`:  the Add choice button under the cards." },
    {
      name: "added",
      description: "An option Owen added, not applied yet:  a card in the options' look, dashed until sent."
    },
    { name: "picked", description: "A standing set's folded Picked list, at its end." },
    { name: "removed", description: "The folded Removed list, at its end." }
  ],
  states: [
    { name: "answered", description: "Its question is answered (`chosen`, or `answered` on its item):  folded." },
    { name: "open", description: "Answered, and its options unfolded." },
    {
      name: "answering",
      description: "An `<epic-ask>`'s options (a page Owen answers on):  one card a row, each with a tick box."
    },
    {
      name: "reviewed",
      description:
        "The page is reviewed and the set takes changes (not `closed`, nor an Original's):  pills, the switch, " +
        "Add choice, pencils."
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
    },
    { key: "closedMark", text: "Closed", description: "After a closed set's heading, with nothing chosen." },

    // P50:  how it's answered, Add choice, Owen's added options, the folded lists
    { key: "pickOne", text: "Pick one", description: "The heading's switch, off:  one option at most." },
    { key: "pickAny", text: "Pick any", description: "The heading's switch, on (or its words):  several options." },
    {
      key: "switchToAnyTip",
      text: "Let me pick several:  sent with your next Send",
      description: "The switch's tooltip while it's pick one."
    },
    {
      key: "switchToOneTip",
      text: "Back to one pick:  the newest pick stays, the others turn off;  sent with your next Send",
      description: "The switch's tooltip while it's pick any."
    },
    { key: "addChoice", text: "Add choice", description: "The button under the cards." },
    {
      key: "addTip",
      text: "Add an option of your own:  sent with your next Send, picked",
      description: "Add choice's tooltip."
    },
    { key: "newChoice", text: "New choice", description: "Add choice's form:  its heading." },
    { key: "add", text: "Add", description: "Add choice's form:  its Save button." },
    { key: "editNew", text: "Change your choice", description: "An added option's form:  its heading." },
    { key: "newLetter", text: "New", description: "An added option's letter, until it's applied and given one." },
    { key: "choose", text: "Choose", description: "An added option's pill." },
    { key: "chosenNotSent", text: "Chosen · not sent", description: "An added option's pill, picked, not sent." },
    { key: "chosenSent", text: "Chosen · sent", description: "An added option's pill, picked, sent." },
    { key: "tipNewChoose", text: "Pick your option", description: "An added option's pill's tooltip." },
    { key: "tipNewPicked", text: "Your option is picked:  click to un-pick", description: "... once picked." },
    {
      key: "addedNotSent",
      text: "Yours · not sent",
      description: "Under an added option:  it goes with the next Send."
    },
    { key: "addedSent", text: "Yours · sent", description: "Under an added option, once sent." },
    { key: "editTip", text: "Edit {letter}", description: "A card's pencil:  its tooltip and name." },
    { key: "removeTip", text: "Remove {letter}", description: "A card's ✕:  its tooltip and name." },
    { key: "zoomTip", text: "Show it full size", description: "An option's picture:  its tooltip." },
    { key: "pickedList", text: "Picked ({count})", description: "A standing set's folded list of picked options." },
    { key: "removedList", text: "Removed ({count})", description: "The folded list of removed options." },
    { key: "foldListTip", text: "Fold the list", description: "A folded list's button, while open." },
    { key: "unfoldListTip", text: "Show the list", description: "A folded list's button, while folded." }
  ],
  children: [
    { tag: "epic-option", description: "The options, `A`, `B` ...;  a new standing set may have none yet." },
    { tag: "epic-option", slot: "picked", description: "A standing set's picked options:  each with `picked-on`." },
    { tag: "epic-option", slot: "removed", description: "Its removed options:  each with `removed`." }
  ],
  // P14:  options in any prose too -- a reply's, a judgement call's text (`Upgrader`, the old prose option grids)
  flow: true
} as const satisfies EpicVocabulary
