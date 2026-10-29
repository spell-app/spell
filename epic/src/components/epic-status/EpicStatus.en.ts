/**
 * Every name `<epic-status>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-status>`
 * Claude's status card on an item:  what Claude took Owen's review mark to mean,
 * then that it's done (work was done) or noted (Owen's choice recorded).
 ****************/
export const epicStatusVocabulary = {
  tag: "epic-status",
  topics: ["documentation", "cards", "status"],
  aka: ["status", "underway", "done", "noted", "progress", "task", "work"],
  noun: "status",
  ui: false,
  description:
    "Claude's status card on an item or an Overview sub-section (P13):  `Claude • Underway` (blue) with Claude's " +
    "reading of the task, then the same card `Claude • Done` (green) when work was done, the reading kept, a " +
    "summary added when there's something worth saying.  `Claude • Noted` (a calm outline) when Claude only " +
    "recorded what Owen chose (a pick, a todo made or queued):  what was recorded and what happens next.  The " +
    "heading and the date at its right are drawn;  the reading and the summary are its children.  In an item, a " +
    "LINE instead (epic `epic-engine` P27):  a run of cards about one task is one line, `✓ Noted 10/24/26 15:21 " +
    "→ Done 15:25 · what Claude did`, last in the item's thread;  a drive-by's (taken before Owen's first reply) " +
    "first in the item's details, above the Choices.",
  attributes: [
    {
      name: "state",
      kind: "enum",
      values: ["underway", "done", "noted"],
      // NOT `required`:  `<epic-item state>` is optional, and a key required on one tag and optional on another
      // makes `Markup.set()`'s untyped data `never`.  The tool always writes it
      description:
        "`underway` (blue:  Claude is on it;  absent too), `done` (green:  work was done), `noted` (a calm " +
        "outline:  Claude recorded what Owen chose, nothing built yet;  Owen, 2026-10-10)."
    },
    {
      name: "at",
      kind: "string",
      format: "time",
      required: true,
      description: "When Claude took the mark:  `2026-10-08 14:34`, drawn `10/8/26 14:34` (`PlanDates`)."
    },
    {
      name: "done-at",
      kind: "string",
      format: "time",
      description:
        "When it was done or noted (a card that was underway first);  drawn in its place once there.  A card born " +
        "noted (a pick or a todo `inbox apply` recorded) has `at` alone."
    }
  ],
  events: [],
  slots: [
    {
      name: "",
      description:
        "The reading:  what Claude understood the task to be, in a sentence or two;  a card born noted:  what was " +
        "recorded and what happens next, in one line."
    },
    { name: "summary", description: "Once done, and only when worth saying:  what Owen should know about it." }
  ],
  parts: [
    { name: "base", description: "The card:  blue underway, green done, a calm outline noted." },
    {
      name: "header",
      description: "Its heading band, a flex row:  the fold chevron, `who` left, `date` right;  a click folds it."
    },
    { name: "toggle", description: "The fold chevron, a `<button>`, first in the band:  folds reading and summary." },
    { name: "who", description: "The heading's left:  `Claude • Underway` / `Claude • Done` / `Claude • Noted`." },
    { name: "date", description: "The heading's right:  `done-at`, else `at`, as `10/8/26 14:34`;  never wraps." },
    { name: "body", description: "The reading." },
    { name: "summary", description: "The summary, under the reading;  not drawn without one.  A line's text." },
    { name: "steps", description: "A line's steps:  `Noted 10/24/26 15:21 → Done 15:25`, each its state and when." },
    { name: "earlier", description: "A drive-by's line:  `your earlier comment`, after its steps." }
  ],
  states: [
    { name: "underway", description: "`state=underway`." },
    { name: "done", description: "`state=done`." },
    { name: "noted", description: "`state=noted`." },
    { name: "open", description: "Unfolded:  it starts so (page state, never written)." },
    { name: "line", description: "In an item:  drawn as a line, not a card." },
    { name: "merged", description: "A line's earlier card, drawn in by the run's last one:  hidden." },
    { name: "drive-by", description: "Taken before Owen's first reply on the item:  its line above the Choices." },
    { name: "in-thread", description: "Its line in the item's thread, after the replies:  inside the thread's one frame." },
    { name: "thread-end", description: "Last in the thread:  the frame's bottom edge and corners." },
    { name: "thread-hidden", description: "The thread's head is folded:  hidden with the rest of the thread." }
  ],
  texts: [
    { key: "foldTip", text: "Close this status card", description: "Tooltip of its fold button while open." },
    { key: "unfoldTip", text: "Open this status card", description: "Tooltip of its fold button while folded." },

    { key: "underway", text: "Claude • Underway", description: "The heading while Claude is on it." },
    { key: "done", text: "Claude • Done", description: "The heading once work was done." },
    { key: "noted", text: "Claude • Noted", description: "The heading once Claude recorded what Owen chose." },
    { key: "stepUnderway", text: "Underway", description: "A line's step while Claude is on it." },
    { key: "stepDone", text: "Done", description: "A line's step once work was done." },
    { key: "stepNoted", text: "Noted", description: "A line's step once Claude recorded what Owen chose." },
    {
      key: "earlier",
      text: "your earlier comment",
      description: "After a drive-by's steps:  it's about a comment Owen made before answering."
    },
    {
      key: "started",
      text: "taken {date}",
      description: "The date's tooltip once done or noted:  when Claude took the mark (`at`)."
    }
  ],
  children: [
    { tag: "flow", description: "The reading:  one or two sentences, no file names." },
    { tag: "flow", slot: "summary", description: 'The summary, once done:  `<p slot="summary">`, one or more.' }
  ]
} as const satisfies EpicVocabulary
