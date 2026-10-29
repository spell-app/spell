/**
 * Every name `<epic-option>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-option>`
 * One option card of a question.
 ****************/
export const epicOptionVocabulary = {
  tag: "epic-option",
  topics: ["documentation", "selection", "cards"],
  aka: ["option", "choice", "alternative", "card"],
  noun: "option",
  ui: false,
  description: "One option of a question:  its letter and title are drawn;  its pros and cons are its children.",
  attributes: [
    {
      name: "letter",
      kind: "string",
      required: true,
      format: "letter",
      description: "`A`, `B` ...:  what `<epic-choices chosen>` and Owen's pick name."
    },
    {
      name: "title",
      property: "epicTitle",
      kind: "string",
      required: "or slot",
      description: "The option in a few words, WITHOUT its letter (`A named palette`)."
    },
    { name: "recommended", kind: "boolean", description: "The one Claude recommends." },
    {
      name: "by",
      kind: "string",
      description: "Who added it, when not Claude:  `owen`, an option he added from the page (Add choice, P50)."
    },
    {
      name: "edited",
      kind: "string",
      format: "date",
      description:
        "The day it was last edited in place (P50):  its earlier title and text are kept in its `was` slot, folded."
    },
    {
      name: "removed",
      kind: "string",
      format: "date",
      description:
        "The day it was removed (P50), never erased:  it sits in its set's `removed` slot, folded under " +
        "`Removed (1)`;  no pill, no pencil."
    },
    {
      name: "picked-on",
      kind: "string",
      format: "date",
      description:
        "A STANDING set's option Owen picked, and the day it was recorded (P50):  it sits in its set's `picked` slot, " +
        "folded under `Picked`."
    },

    // an option of an `<epic-ask>`, on a page Owen answers on (epic `epic-workflow` P12)
    {
      name: "selected",
      kind: "boolean",
      description:
        "In an `<epic-ask>`:  ticked to start with, until Owen picks (the review's item picker ticks what isn't " +
        "reviewed yet).  The tick itself is page state, its question's."
    },
    {
      name: "done",
      kind: "boolean",
      description: "In an `<epic-ask filter>`:  hidden while the filter shows Open."
    },
    { name: "badge", kind: "string", description: "In an `<epic-ask>`:  a small label after its title (`deferred`)." },
    {
      name: "badge-color",
      kind: "enum",
      values: "hues",
      description: "Its badge's colour, a Spell UI hue (`blue`, `orange` ...);  none:  grey."
    },
    {
      name: "state-icon",
      kind: "string",
      description:
        "In an `<epic-ask>`:  an icon at the end of its header saying where it stands (the item picker's " +
        "`circle check`:  reviewed), from the page's icons."
    },
    { name: "state-color", kind: "string", description: "Its state icon's colour, a Spell UI hue;  none:  grey." },
    { name: "state-label", kind: "string", description: "Its state icon's words:  its tooltip, and its name." }
  ],
  events: [
    {
      name: "ui-selected",
      detail: "{ letter: string, selected: true, more: boolean }",
      description:
        "In an `<epic-ask>`:  Owen ticked it, or pressed its (?) (`more`).  Its question takes it, and draws the result."
    },
    {
      name: "ui-deselected",
      detail: "{ letter: string, selected: false, more: boolean }",
      description: "In an `<epic-ask>`:  Owen unticked it.  Its question takes it, and draws the result."
    }
  ],
  slots: [
    { name: "", description: "Its pros and cons." },
    { name: "title", description: "A title with markup, in place of `title`." },
    { name: "was", description: "Its earlier titles and text, one `<div data-title>` per edit, oldest first (P50)." }
  ],
  parts: [
    { name: "base", description: "The card;  answered, a panel." },
    { name: "header", description: "Its header:  letter, title, the recommended thumbs-up, the Choose pill." },
    {
      name: "toggle",
      description:
        "The `<button>` that folds the card or panel (its header's text, the chevron first);  a card with no pros " +
        "and cons:  a plain span."
    },
    { name: "check", description: "Answered and chosen:  the check before its letter." },
    { name: "title", description: "`A · A named palette`." },
    {
      name: "recommended",
      description: "The recommended one's violet thumbs-up, after its title, labelled `Recommended`."
    },
    { name: "actions", description: "While the page is reviewed:  the box at the header's end holding the pill." },
    {
      name: "choose",
      description:
        "The Choose pill (`<button aria-pressed>`):  marks its letter as the item's pick in the page's review inbox;  " +
        "on the chosen option, solid and `aria-disabled`:  the pick applied."
    },
    { name: "body", description: "Its pros and cons;  hidden (`until-found`) while folded." },
    {
      name: "tick",
      description:
        'In an `<epic-ask>`:  its Choose pill, the epic page\'s (P50, Q55), a `<button role="radio">` (pick one) or ' +
        '`role="checkbox"`, labelled by its title.'
    },
    { name: "comment-link", description: "In an `<epic-ask>`:  the Comment link its comment box folds under." },
    { name: "badge", description: "In an `<epic-ask>`:  its `badge`, a small `<ui-label>`." },
    { name: "more", description: "In an `<epic-ask more-details>`:  the (?) `<button aria-pressed>`." },
    { name: "state", description: "In an `<epic-ask>`:  its state icon, `state-label` its tooltip." },
    {
      name: "comment",
      description: "In an `<epic-ask>`:  the comment box under it, an `<epic-text-box>` for `<key>-<letter>`."
    },
    { name: "was", description: "With earlier text (its `was` slot, P50):  the folded `Was` line at its body's end." },
    {
      name: "change",
      description: "An edit or removal not applied yet (P50):  `Edited · not sent` and Undo, under the card."
    }
  ],
  states: [
    { name: "answered", description: "Its question is answered:  a panel under Choices." },
    { name: "chosen", description: "Its `letter` is its `<epic-choices chosen>`." },
    {
      name: "open",
      description: "Unfolded:  a card starts so;  an answered panel only when it's the chosen one (page state)."
    },
    {
      name: "picked",
      description:
        "Its letter is the item's pick in the review inbox, in its card set, not applied yet:  framed green:  " +
        "dashed until sent, then outlined."
    },
    { name: "answering", description: "An option of an `<epic-ask>`:  a tick box, a comment box." },
    { name: "ticked", description: "In an `<epic-ask>`:  ticked, framed green (a pick is a decision)." },
    { name: "filtered", description: "In an `<epic-ask filter>`:  `done`, and hidden while it shows Open." },
    {
      name: "retired",
      description: "Removed (`removed`), or a standing set's picked one (`picked-on`):  a small panel in a folded list."
    },
    { name: "removing", description: "Removed in its set's mark, not applied yet:  faded, with Undo." }
  ],
  texts: [
    { key: "foldTip", text: "Fold option {letter}", description: "Tooltip of its fold button while open." },
    { key: "unfoldTip", text: "Unfold option {letter}", description: "Tooltip of its fold button while folded." },

    {
      key: "recommended",
      text: "Recommended",
      description: "The thumbs-up after the recommended option's title:  its label and tooltip."
    },
    { key: "choose", text: "Choose", description: "The Choose pill." },
    { key: "chosen", text: "Chosen", description: "The Choose pill on its set's chosen option:  the pick applied." },
    { key: "chosenNotSent", text: "Chosen · not sent", description: "The Choose pill, its letter picked, not sent." },
    {
      key: "chosenSent",
      text: "Chosen · sent",
      description: "The Choose pill, its letter picked and sent:  Claude has it, the doc doesn't yet."
    },
    { key: "tipChoose", text: "Pick {letter}", description: "The pill's tooltip." },
    {
      key: "tipTicked",
      text: "{letter} is picked:  click to un-pick",
      description: "In an `<epic-ask>`:  a picked option's pill's tooltip."
    },
    {
      key: "commentLink",
      text: "Comment",
      description: "In an `<epic-ask>`:  the link its comment box folds under (P50, Q55)."
    },
    { key: "tipChosen", text: "{letter} is picked:  click to un-pick", description: "The picked pill's tooltip." },
    { key: "tipSent", text: "sent", description: "The picked pill's tooltip, once its mark went to Claude." },
    { key: "tipNotSent", text: "not sent yet", description: "The picked pill's tooltip, before Send." },
    {
      key: "tipApplied",
      text: "{letter} is the chosen option",
      description: "The chosen option's pill's tooltip:  the pick applied."
    },
    { key: "moreTip", text: "Provide more details", description: "In an `<epic-ask>`:  the (?)'s tooltip." },
    { key: "commentOn", text: "Comment on {letter}", description: "In an `<epic-ask>`:  its comment box's hint." },
    {
      key: "commentLabel",
      text: "Comment on {letter} · {title}",
      description: "In an `<epic-ask>`:  its comment box's name, for a screen reader."
    },
    { key: "editHeading", text: "Edit {letter}", description: "The pencil's form:  its heading." },
    { key: "pickedOn", text: "Picked {date}", description: "A standing set's picked option:  when." },
    { key: "was", text: "Was", description: "The folded line of its earlier text." },
    { key: "foldWasTip", text: "Fold its earlier text", description: "The `Was` line's button, while open." },
    { key: "unfoldWasTip", text: "Show its earlier text", description: "The `Was` line's button, while folded." },
    { key: "editedNotSent", text: "Edited · not sent", description: "Under a card edited, not sent yet." },
    { key: "editedSent", text: "Edited · sent", description: "Under a card edited, sent, not applied yet." },
    { key: "removedNotSent", text: "Removed · not sent", description: "Under a card removed, not sent yet." },
    { key: "removedSent", text: "Removed · sent", description: "Under a card removed, sent, not applied yet." },
    { key: "undo", text: "Undo", description: "After a change's line:  takes it back out of the mark." },
    { key: "undoTip", text: "Take this change back", description: "Undo's tooltip." }
  ],
  children: [
    { tag: "flow", slot: "title", max: 1, description: "A title with markup." },
    { tag: "flow", description: "Its pros and cons." },
    {
      tag: "flow",
      slot: "was",
      description:
        'Its earlier text, one `<div slot="was" data-title="<old title>">` per edit, oldest first (P50):  folded.'
    }
  ]
} as const satisfies EpicVocabulary
