/**
 * Every name `<epic-send-buttons>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type`, plus the Send's states (`SEND_STATES`), from its types file.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

import { SEND_ASKS, SEND_STATES } from "./EpicSendButtons.types"

/****************
 * ### `<epic-send-buttons>`
 * Send, the paper plane, with its countdown's ring round it when asked for (`countdown`).
 ****************/
export const epicSendButtonsVocabulary = {
  tag: "epic-send-buttons",
  topics: ["buttons", "forms"],
  aka: ["send", "send button", "countdown", "auto send", "paper plane", "ring"],
  skeleton: "inline 4 x 1.6",
  noun: "send-buttons",
  ui: false,
  description:
    "Send, the paper plane.  With `countdown` (an epic page's header;  epic `epic-engine` P53), Auto Send too:  with " +
    "something not sent, a ring round the plane, set apart from it with rounded ends, drains clockwise over the wait " +
    "the page header's gear chose (2 minutes by default, or 5), starting again at every key, click or scroll on the " +
    "page and held full while a note box is typed in;  at the end the owner is asked to send, as a press would.  " +
    "Immediately:  no ring, each change goes as it's finished.  Off, or without `countdown`, with something not sent:  " +
    "the plane is filled blue, waiting for a press.  Drawn by an epic page's header (`<epic-page>`), a details page's " +
    "Send (`<epic-send>`) and a docs page's comments Send.",
  attributes: [
    {
      name: "state",
      kind: "enum",
      values: SEND_STATES,
      description:
        "Where what the owner sends stands, by the fill rule:  `idle` (nothing to send:  a grey outline), `unsent` " +
        "(something not sent:  the plane blue, the countdown runs), `sent` (a blue outline).  Default:  `idle`."
    },
    {
      name: "send-tip",
      kind: "string",
      description:
        "The paper plane's tooltip and name:  what a press sends (`Send 2 marks, 1 comment to Claude`).  Default:  " +
        "`Send`."
    },
    {
      name: "count",
      kind: "number",
      description: "How many things a press would send, a small badge on the plane;  0 or none:  no badge."
    },
    { name: "busy", kind: "boolean", description: "A send on its way:  the plane spins, and a press does nothing." },
    {
      name: "accept",
      kind: "string",
      description:
        "A STAGE BUTTON in the paper plane's place (epic `epic-engine` P29):  a check and these words (`Accept " +
        "Overview`), green;  a press asks the owner to send, as the plane's does, and the owner accepts the stage.  " +
        "The countdown's ring goes round its check, and its end only sends marks, never accepts.  Drawn by an epic page's header while the page is in a stage (`<epic-page stage>`)."
    },
    {
      name: "accepted",
      kind: "boolean",
      description:
        "The stage button pressed:  outlined green, waiting for the session to move the page on.  Only with `accept`."
    },
    {
      name: "asks",
      kind: "enum",
      values: SEND_ASKS,
      description:
        "The pill WAITS ON YOU (Owen, 2026-10-25):  `waiting`, the pill's own border 2px #666, darker than its hairline, solid;  `taken`, " +
        "dotted once you've pressed what it waits for;  none:  no ring.  An epic page's header sets it while " +
        "Claude's build plans wait for your Accept, on their phases;  the pill stays Send, never green.  " +
        "The same ring as a waiting plan's own buttons on its phase."
    },
    {
      name: "countdown",
      kind: "boolean",
      description:
        "Counts down to Send by itself, on the page's Auto Send (`SendCountdown`, chosen in an epic page header's " +
        "gear):  the ring round the plane.  Off by default:  only an epic page's header sets it, as only it has the " +
        "gear (J142);  a details page or a guide sends when you press."
    }
  ],
  events: [
    {
      name: "epic-send-saving",
      detail: "{ auto }",
      description:
        "A send asked for:  the paper plane pressed (`auto` false), or the countdown ran out (`auto` true).  The " +
        "owner sends, waking the epic when nobody listens (Q59, B);  a countdown's send asks every revisit now, as " +
        "Review Now did (decision Q7)."
    }
  ],
  slots: [],
  parts: [
    { name: "base", description: "The group:  one pill round the plane." },
    {
      name: "send",
      description: "The paper plane, a `<button>`:  `data-state`, filled blue while it waits for a press."
    },
    {
      name: "count",
      description: "The badge on the plane:  how many things a press sends;  none on the stage button."
    },
    {
      name: "ring",
      description:
        "The countdown's ring round the plane (the stage button's check), its ends round, draining clockwise;  only " +
        "while it counts."
    }
  ],
  states: [
    { name: "countdown", description: "Auto Send is on, and this Send counts down (`countdown`)." },
    { name: "counting", description: "The countdown is running:  something waits, and the ring drains." },
    { name: "waiting", description: "Auto Send is off and something isn't sent:  the plane is filled blue." },
    { name: "stage", description: "The plane's place holds the stage button (`accept`)." }
  ],
  texts: [
    { key: "group", text: "Send", description: "The group's name, for a screen reader." },
    { key: "send", text: "Send", description: "The plane's tooltip and name, when the owner gives none (`send-tip`)." },
    {
      key: "counting",
      text: "sends by itself in {time};  click to send now",
      description: "After the plane's words while the ring counts;  `{time}` like `1:42`."
    },
    {
      key: "held",
      text: "sends by itself once you leave the note box;  click to send now",
      description: "After the plane's words while a note box with words has the focus:  the ring stays full."
    }
  ],
  children: []
} as const satisfies EpicVocabulary
