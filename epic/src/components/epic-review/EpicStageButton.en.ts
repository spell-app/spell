/**
 * Every name `<epic-stage-button>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type`, plus the stages (`PageStages`, node-safe).
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"
import { PageStages } from "spell/epic/phases"

/****************
 * ### `<epic-stage-button>`
 * The STAGE BUTTON (epic `epic-engine` P29, I180):  "Accept Overview" on the Overview's title row, "Accept Phases" on
 * the Phases section's, while the page is in that stage.
 ****************/
export const epicStageButtonVocabulary = {
  tag: "epic-stage-button",
  topics: ["buttons", "status"],
  aka: ["stage button", "accept overview", "accept phases", "accept stage"],
  skeleton: "inline 8 x 1.6",
  noun: "stage button",
  ui: false,
  description:
    "The STAGE BUTTON (epic `epic-engine` P29;  on the work it accepts since I180):  a green check and its words, " +
    "`Accept Overview` on the Overview's title row while the page is in its `overview` stage, `Accept Phases` on the " +
    "Phases section's, before its gear, in the `phases` stage.  A press marks the page's `stage` in the review inbox " +
    '(`{ action: "accept", stage }`) and sends it at once, with whatever else is unsent;  the session moves the ' +
    "page on (`epic inbox apply`).  Outlined green once pressed, until then.  Its tooltip says what's still open " +
    "(`2 questions open`):  a reminder, never a lock.  Drawn by `<epic-overview>` and `<epic-section " +
    'kind="phases">` in their shadow roots while the page is reviewed, never written in a doc.',
  attributes: [
    {
      name: "stage",
      kind: "enum",
      values: PageStages.ALL,
      required: true,
      description: "The stage it ends:  `overview` (Accept Overview) or `phases` (Accept Phases)."
    },
    {
      name: "open",
      kind: "number",
      description: "How many questions are still open, for its tooltip;  none or 0:  `no questions open`."
    }
  ],
  events: [],
  slots: [],
  parts: [{ name: "base", description: "The button:  its check and its words, `data-state` `accepted` once pressed." }],
  states: [{ name: "accepted", description: "Pressed:  its mark is in the inbox, waiting for the session." }],
  texts: [
    { key: "acceptOverview", text: "Accept Overview", description: "Its words, ending the `overview` stage." },
    { key: "acceptPhases", text: "Accept Phases", description: "Its words, ending the `phases` stage." },
    {
      key: "acceptOverviewTip",
      text: "The Overview is agreed:  Claude writes the phases next",
      description: "Its tooltip, Overview stage:  what a press does."
    },
    {
      key: "acceptPhasesTip",
      text: "The phases and their build plans are agreed:  Claude starts building",
      description: "Its tooltip, Phases stage:  what a press does."
    },
    {
      key: "acceptedOverview",
      text: "Overview accepted:  waiting for Claude to write the phases",
      description: "Its tooltip once pressed, Overview stage."
    },
    {
      key: "acceptedPhases",
      text: "Phases accepted:  waiting for Claude to start building",
      description: "Its tooltip once pressed, Phases stage."
    },
    { key: "openQuestionsOne", text: "1 question open", description: "Its tooltip:  what's open." },
    {
      key: "openQuestionsMany",
      text: "{count} questions open",
      description: "Its tooltip:  what's open;  a reminder, never a lock."
    },
    { key: "nothingOpen", text: "no questions open", description: "Its tooltip:  nothing open." },
    {
      key: "acceptSends",
      text: "sends {count} unsent with it",
      description: "Its tooltip:  the marks and comments a press sends along."
    }
  ],
  children: []
} as const satisfies EpicVocabulary
