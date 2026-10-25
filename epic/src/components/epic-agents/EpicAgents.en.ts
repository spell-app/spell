/**
 * Every name `<epic-agents>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell-epic/definitions"

/****************
 * ### `<epic-agents>`
 * What Claude is doing, at the right of an epic page's toolbar (epic `epic-engine` P35):  the session's line, and
 * the running agents (epic `skillz` P3) in a popover, each with a note box that redirects it.
 ****************/
export const epicAgentsVocabulary = {
  tag: "epic-agents",
  topics: ["status", "lists", "forms"],
  aka: ["agents", "running agents", "agents running", "redirect", "background agents"],
  skeleton: "header, 2 line paragraph",
  noun: "agents panel",
  ui: false,
  description:
    "What Claude is doing, at the right of an epic page's toolbar (epic `epic-engine` P35), drawn by `<epic-page>` in " +
    "its shadow root, never written in a doc:  the listening session's line (`Responding`, `Building P35`, set by " +
    "`epic inbox status`), its tooltip listing what it's answering;  and while agents run, `2 agents running`, a " +
    "button whose popover holds a row per agent (name, status, age, task, the redirects so far), each with a note box " +
    "that redirects it.  Only while the page is served with a token.",
  attributes: [
    {
      name: "draws",
      kind: "enum",
      values: ["doing", "agents"],
      description:
        "Which half it draws:  `doing` (the session's line, in the toolbar) or `agents` (the agents' button, in the " +
        "header's pill:  Owen, 2026-10-25);  none:  both."
    }
  ],
  events: [],
  slots: [],
  parts: [
    { name: "base", description: "Its tools:  always there, empty while nothing runs." },
    { name: "doing", description: "The session's line:  a spinner, then what it's doing." },
    { name: "doing-tip", description: "The line's styled tooltip (`<ui-popup>`):  what it's answering." },
    { name: "agents-button", description: "`2 agents running`:  opens the agents' popover." },
    { name: "agents", description: "The agents' popover (`<ui-popup>`):  a row per agent." }
  ],
  states: [{ name: "running", description: "Agents are running:  its button shows." }],
  texts: [
    { key: "doingTip", text: "{doing}:", description: "The line's tooltip, its head:  what Claude is doing." },
    { key: "agentRunning", text: "1 agent running", description: "The agents' button, one running." },
    { key: "agentsRunning", text: "{count} agents running", description: "The agents' button, several running." },
    {
      key: "agentSendTip",
      text: "Send your note to {name}:  it changes what the agent does next",
      description: "The Send button's tooltip."
    },

    { key: "agents", text: "Agents running", description: "The agents' popover, its name." },
    { key: "agentStarted", text: "Started {time}", description: "An agent's age, its tooltip:  when it started." },
    { key: "agentYou", text: "You", description: "Who sent a redirect:  `You · 10:42 · told 10:43`." },
    { key: "agentTold", text: "told {time}", description: "A redirect a session passed on to the agent." },
    { key: "agentWaiting", text: "waiting for the session", description: "A redirect no session passed on yet." },
    { key: "agentNote", text: "Redirect {name} ...", description: "An agent's empty note box." },
    { key: "agentNoteLabel", text: "Redirect {name}:  your note", description: "An agent's note box, spoken." },
    { key: "agentSend", text: "Send", description: "An agent's Send button:  the note redirects it." }
  ],
  children: []
} as const satisfies EpicVocabulary
