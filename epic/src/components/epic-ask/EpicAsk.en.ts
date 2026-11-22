/**
 * Every name `<epic-ask>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-ask>`
 * A question you answer ON the page:  a details page's, in a section of its own.
 ****************/
export const epicAskVocabulary = {
  tag: "epic-ask",
  topics: ["forms", "selection"],
  aka: ["question", "ask", "poll", "multiple choice", "form question", "picker"],
  skeleton: "6 tall",
  noun: "ask",
  ui: false,
  description:
    "A question you answer ON the page (a details page's;  epic `epic-workflow` P12):  its text an " +
    "`<epic-question>`, its options an `<epic-choices>` of `<epic-option>`s, each with a tick box, then an Other " +
    "box.  Its line shows a chip in the epic page's state colours (red:  nothing yet;  green:  picked;  blue:  " +
    "Claude has more to do).  Its answer goes under its section's id.",
  attributes: [
    {
      name: "name",
      kind: "string",
      description:
        "The key its answer goes under (`q1`);  none:  its `<ui-section>`'s id.  Its options' comments are " +
        "`<key>-<letter>` (`q1-B`)."
    },
    {
      name: "multiple",
      kind: "boolean",
      description: "Pick several (tick boxes);  without it, pick one (round ones)."
    },
    {
      name: "select-all",
      kind: "boolean",
      description: "With `multiple`:  a Select all / Select none button on its line, for the options shown."
    },
    {
      name: "filter",
      kind: "boolean",
      description: "An Open | All toggle on its line:  Open (the default) hides the options marked `done`."
    },
    {
      name: "more-details",
      kind: "boolean",
      description:
        'A (?) on each option, "Provide more details":  pressed, the option is ticked too, and the answer carries ' +
        "its letter under `<key>-more`, so Claude explains it in full before asking again."
    },
    {
      name: "compact",
      kind: "boolean",
      description:
        "Its options as ONE Spell UI select, with a comment box beside it, instead of a card each (epic " +
        "`epic-engine` T121):  for a page of many short picks (Yes / No / Modify / Revisit).  Its options stay " +
        "written as cards (their titles are the select's entries);  the comment is its Other, sent the same way."
    },
    {
      name: "chip",
      kind: "string",
      description:
        "Its chip's text, as written (`12`, `Q12`).  None:  its key's id (`q3`, `q3-priority` -> `Q3`), " +
        "else its section's number (`12 · Rename it` -> `Q12`), else its section's place;  two questions in one " +
        "section share it, a letter each (`Q12 · a`, `Q12 · b`)."
    },
    {
      name: "no-chip",
      kind: "boolean",
      description:
        "No chip:  its id stays internal (a Feature Set's Your pick, epic `epic-engine` P80);  its state still " +
        "shows as its `:state()`."
    },
    {
      name: "label",
      kind: "string",
      description:
        "Its name for people, when it shares its section with others (a row of a table:  `S1F2 · Share a link`):  " +
        "the answer, a screen reader and kept text say it.  It then leaves its section's state alone."
    },
    {
      name: "off-for",
      kind: "string",
      description:
        "A follow-up's (`slot=\"then\"`):  the letters of the question's picks that grey it out, comma-separated " +
        "(`N`).  What was picked in it stays."
    }
  ],
  events: [],
  slots: [
    { name: "", description: "The question:  an `<epic-question>`, then an `<epic-choices>`;  prose too." },
    {
      name: "then",
      description:
        "`compact`:  a follow-up question, an `<epic-ask compact>` drawn between the select and the one comment " +
        "box (a Priority).  No chip, no box of its own;  not counted by itself."
    }
  ],
  parts: [
    { name: "base", description: "The question's box." },
    { name: "line", description: "Its line:  the chip, how to answer, its tools." },
    {
      name: "chip",
      description: "Its id chip (`Q1`), in the epic page's state colours:  red needs you, green picked, blue Claude's."
    },
    {
      name: "how",
      description: '`Pick one` / `Pick any`:  a switch you flip (`role="switch"`, epic `epic-engine` P50).'
    },
    { name: "tools", description: "Its buttons:  Select all, Open | All." },
    { name: "row", description: "`compact`:  its one row, under its text:  the chip, the select, the comment box." },
    { name: "select", description: "`compact`:  its options as one `<ui-select>`." },
    {
      name: "other",
      description: 'The Other box, an `<epic-text-box type="other">`, after the options;  `compact`:  its comment box.'
    }
  ],
  states: [
    { name: "attention", description: "Nothing picked or written yet:  red." },
    { name: "done", description: "An option picked:  green." },
    { name: "working", description: '"Provide more details" asked, or only Other written:  blue, Claude\'s to do.' },
    { name: "off", description: "A follow-up greyed by the question's pick (`off-for`)." }
  ],
  texts: [
    { key: "pickOne", text: "Pick one", description: "Its line's switch, off:  without `multiple` (or flipped)." },
    { key: "pickSeveral", text: "Pick any", description: "Its line's switch, on:  `multiple` (or flipped)." },
    { key: "selectAll", text: "Select all", description: "Ticks every option shown." },
    { key: "selectNone", text: "Select none", description: "Once every option shown is ticked:  unticks them." },
    { key: "open", text: "Open", description: "The filter's first half:  only the options not marked `done`." },
    { key: "all", text: "All", description: "The filter's second half:  every option." },
    { key: "otherOne", text: "Other:  your own answer", description: "The Other box's placeholder, pick one." },
    { key: "otherSeveral", text: "Other:  add your own", description: "The Other box's placeholder, pick several." },
    { key: "comment", text: "Comment (optional)", description: "`compact`:  the comment box's placeholder." },
    { key: "commentOn", text: "Comment on {question}", description: "With `label`:  the comment box's name." },
    {
      key: "offTip",
      text: "{label} isn't needed when you pick {pick}.\nPick something else to turn it back on.",
      description: "A greyed follow-up's tooltip."
    },
    {
      key: "recommended",
      text: "{title} (recommended)",
      description: "`compact`:  the select's entry for the option marked `recommended`."
    },
    { key: "attentionTip", text: "{id}:  needs your answer", description: "The chip's tooltip:  nothing yet." },
    { key: "doneTip", text: "{id}:  decided", description: "The chip's tooltip:  an option picked." },
    {
      key: "workingTip",
      text: "{id}:  Claude is still on it",
      description: "The chip's tooltip:  more details asked, or only Other written."
    }
  ],
  children: [
    { tag: "epic-question", max: 1, description: "The question, in full." },
    { tag: "epic-choices", max: 1, description: "Its options, each with a tick box." },
    { tag: "epic-ask", max: 1, slot: "then", description: "`compact`:  its follow-up question (a Priority)." },
    { tag: "flow", description: "Anything else it needs:  a table, a picture." }
  ]
} as const satisfies EpicVocabulary
