/**
 * Every name `<epic-pills>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-pills>`
 * The docs home page's Active epics:  a pill for each epic worked on this week, live.
 ****************/
export const epicPillsVocabulary = {
  tag: "epic-pills",
  topics: ["documentation", "lists", "status"],
  aka: ["active epics", "epic pills", "home page epics"],
  skeleton: "2 tall",
  noun: "pills",
  ui: false,
  description:
    "The docs home page's Active epics (epic `epic-engine` T99):  a pill for each open epic worked on in the last " +
    "week, in two columns, linking its epic page.  Each pill shows the epic's name, what waits on it in the epic " +
    "page's badge colours (red, orange, blue), its phase under way (`P12`) or `Done`, and its running agents " +
    "(`🤖 2`).  Drawn from the page server (`GET /api/epics/running?every`), and asked again whenever an epic page or its " +
    "agents change, so it never goes stale.",
  attributes: [],
  events: [],
  slots: [],
  parts: [
    { name: "base", description: "The box around the heading and the pills." },
    { name: "heading", description: "The heading:  Active epics." },
    { name: "pills", description: "The pills, in two columns." },
    { name: "note", description: "Instead of pills:  none this week, the page opened from disk, or no answer." }
  ],
  states: [],
  texts: [
    { key: "heading", text: "Active epics", description: "The heading over the pills." },
    { key: "done", text: "Done", description: "A pill's phase, when every phase is done." },
    { key: "urgent", text: "{count} urgent", description: "A pill's tooltip:  its red items." },
    {
      key: "replied",
      text: "{count} for your pick or review",
      description: "A pill's tooltip:  its orange items (light orange with them)."
    },
    { key: "running", text: "{count} running now", description: "A pill's tooltip:  its phases under way." },
    { key: "agentOne", text: "1 agent running", description: "A pill's tooltip, and its robot's name:  one agent." },
    {
      key: "agentMany",
      text: "{count} agents running",
      description: "A pill's tooltip, and its robot's name:  several agents."
    },
    { key: "allDone", text: "every phase done", description: "A pill's tooltip, when every phase is done." },
    {
      key: "none",
      text: "No epic has been worked on this week.",
      description: "No open epic was worked on in the last week."
    },
    {
      key: "file",
      text: "The active epics show when the page is served.",
      description: "Opened from disk:  only the page server knows the epics."
    },
    {
      key: "server",
      text: "Couldn't ask the page server for the active epics.",
      description: "The page server didn't answer, or has no such route yet."
    }
  ],
  children: []
} as const satisfies EpicVocabulary
