/**
 * Every name `<epic-event>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-event>`
 * One review line of the plan's log:  written, not drawn on an epic page (epic `epic-engine` P52, Q56 C).
 ****************/
export const epicEventVocabulary = {
  tag: "epic-event",
  topics: ["documentation", "lists", "date & time"],
  aka: ["log line", "event", "history", "changelog entry"],
  noun: "event",
  ui: false,
  description:
    'One review line of the log (`<epic-section kind="log">`):  "Q53 answered", "P49 active" ...;  its time and icon ' +
    "are drawn, its text is its children.  The Log hides them (epic `epic-engine` P52):  it shows the epic's " +
    "commits (`<epic-commit>`);  Actual Time reads them, and `epic log <epic>` prints them.",
  attributes: [
    {
      name: "at",
      kind: "string",
      required: true,
      format: "time",
      description: "When, local time with offset (`2026-10-06T08:12-04:00`):  shown as `2026-10-06 08:12`."
    },
    { name: "icon", kind: "string", description: "Its icon, a Spell UI icon name;  default `pen to square`." }
  ],
  events: [],
  slots: [{ name: "", description: "What happened, one line." }],
  parts: [
    { name: "base", description: "The line:  icon, time, text." },
    { name: "icon", description: "Its icon, centred on its first line." },
    { name: "time", description: "Its time, to the minute." }
  ],
  states: [],
  texts: [],
  children: [{ tag: "flow", description: "What happened, one line." }]
} as const satisfies EpicVocabulary
