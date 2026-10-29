/**
 * Every name `<epic-send-buttons>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type`, plus the Send's states (`SEND_STATES`), from its types file.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

import { SEND_ASKS, SEND_STATES } from "./EpicSendButtons.types"

/****************
 * ### `<epic-send-buttons>`
 * Send and its countdown, one group:  the paper plane, then the wand that turns countdown mode on and off.
 ****************/
export const epicSendButtonsVocabulary = {
  tag: "epic-send-buttons",
  topics: ["buttons", "forms"],
  aka: ["send", "send button", "countdown", "auto send", "paper plane", "wand"],
  skeleton: "inline 4 x 1.6",
  noun: "send-buttons",
  ui: false,
  description:
    'Send, the paper plane, ALONE since 2026-10-25 (Owen:  "remove the wand EVERYWHERE").  With `wand`, its countdown ' +
    "too (epic `epic-engine` P20):  the wand turns COUNTDOWN " +
    "MODE on and off.  With it on and something not sent, the wand is filled light blue, and a light grey ring round it turns blue, clockwise, over 2 minutes, starting " +
    "again at every key, click or scroll on the page;  at the end the owner is asked to send, as Review Now did.  " +
    "With it off and something not sent, the plane is filled blue:  it waits for a press.  The mode is on by " +
    "default, and remembered in this browser for every page.  Drawn by an epic page's header (`<epic-page>`), a " +
    "details page's Send (`<epic-send>`) and a docs page's comments Send.",
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
        "The wand stays.  Drawn by an epic page's header while the page is in a stage (`<epic-page stage>`)."
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
      name: "wand",
      kind: "boolean",
      description:
        "Draws the wand, and with it COUNTDOWN MODE.  Off by default:  the wand is gone everywhere, so only a press " +
        'sends (Owen, 2026-10-25:  "remove the wand EVERYWHERE ...  We may bring the wand back later").  ' +
        "`manual` before, the other way round, for a page a command waits on (`<epic-run>`)."
    }
  ],
  events: [
    {
      name: "epic-send-saving",
      detail: "{ auto }",
      description:
        "A send asked for:  the paper plane pressed (`auto` false), or the countdown ran out (`auto` true).  The " +
        "owner sends;  a countdown's send asks every revisit now, as Review Now did (decision Q7)."
    }
  ],
  slots: [],
  parts: [
    { name: "base", description: "The group:  one pill, the plane's end and the wand's." },
    {
      name: "send",
      description: "The paper plane, a `<button>`:  `data-state`, filled blue while it waits for a press."
    },
    {
      name: "count",
      description: "The badge on the plane:  how many things a press sends;  none on the stage button."
    },
    {
      name: "countdown",
      description: "The wand, a `<button aria-pressed>`, only with `wand`:  countdown mode on (blue) or off (grey)."
    },
    {
      name: "ring",
      description:
        "The countdown's ring round the wand, light grey turning blue as the 2 minutes run;  only while it runs."
    }
  ],
  states: [
    { name: "countdown", description: "Countdown mode is on." },
    { name: "counting", description: "The countdown is running:  something waits, and the ring turns blue." },
    { name: "waiting", description: "Countdown mode is off and something isn't sent:  the plane is filled blue." },
    { name: "stage", description: "The plane's place holds the stage button (`accept`)." }
  ],
  texts: [
    { key: "group", text: "Send", description: "The group's name, for a screen reader." },
    { key: "send", text: "Send", description: "The plane's tooltip and name, when the owner gives none (`send-tip`)." },
    {
      key: "countdownOn",
      text: "Countdown on:  {when}.  Click to send only when you press the plane",
      description: "The wand's tooltip, mode on;  `{when}` says when it sends."
    },
    {
      key: "countdownOff",
      text: "Countdown off:  press the plane to send.  Click to send by itself 2 minutes after you stop",
      description: "The wand's tooltip, mode off."
    },
    {
      key: "whenCounting",
      text: "sends by itself in {time} unless you keep typing, clicking or scrolling",
      description: "When a running countdown sends;  `{time}` like `1:42`."
    },
    {
      key: "whenIdle",
      text: "what you leave unsent goes by itself 2 minutes after you stop",
      description: "When it sends, with nothing waiting yet."
    },
    {
      key: "countdownName",
      text: "Countdown",
      description: "The wand's name, for a screen reader (its state is `aria-pressed`)."
    }
  ],
  children: []
} as const satisfies EpicVocabulary
