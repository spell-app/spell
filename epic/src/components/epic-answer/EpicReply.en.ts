/**
 * Every name `<epic-reply>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-reply>`
 * A reply card on an item.
 ****************/
export const epicReplyVocabulary = {
  tag: "epic-reply",
  topics: ["documentation", "cards", "social"],
  aka: ["reply", "comment", "response", "note"],
  noun: "reply",
  ui: false,
  description:
    "A reply on an item, after its answer:  `<from> · re: <re>` is drawn, the date at the right;  the reply is its " +
    "children.  In an item, one of its thread's brown block;  Claude's newest wears an orange edge and NEW until " +
    "Owen has seen it.",
  attributes: [
    {
      name: "from",
      kind: "string",
      description:
        "Who wrote it, a person's name (`Ana`);  on an agent's reply, whose session wrote it.  Drawn `You` when " +
        "it's the reader's own;  before epic `epic-friend` P2, Claude's said `Claude`."
    },
    {
      name: "agent",
      kind: "string",
      description:
        "The agent that wrote it (`claude`), else none:  the person in `from` did.  Drawn `Claude (Ana)`, or `Claude` " +
        "for the reader's own session.  An old reply without it is Claude's when `from` says `Claude` " +
        "(`ThreadFacts.agentOf()`);  the migration `agents-marked` adds it."
    },
    {
      name: "at",
      kind: "string",
      format: "time",
      description: "When:  `2026-10-06 23:55`, drawn `10/6/26 23:55` (`PlanDates`)."
    },
    { name: "re", kind: "string", description: "What it's about (`as built (Doc Review)`, `revisit soon`)." }
  ],
  events: [],
  slots: [{ name: "", description: "The reply." }],
  parts: [
    { name: "base", description: "The card:  an agent's look, or every person's (`agent`)." },
    {
      name: "header",
      description: "Its heading band, a flex row:  the fold chevron, `who` left, `date` right;  a click folds it."
    },
    { name: "toggle", description: "The fold chevron, a `<button>`, first in the band;  only with a body." },
    {
      name: "who",
      description:
        "The heading's left:  who (`You`, a name, `Claude`, `Claude (Ana)`) and `re: <re>`, after a round mark of " +
        "its initial;  wraps within itself."
    },
    {
      name: "new",
      description: "`NEW`, after `who`, on Claude's newest reply in an item until Owen has seen it (orange)."
    },
    { name: "date", description: "The heading's right:  `at`, `10/6/26 23:55`, on the top line;  never wraps." },
    { name: "body", description: "The reply;  not drawn when empty;  hidden (`until-found`) while folded." }
  ],
  states: [
    { name: "open", description: "Unfolded:  it starts so (page state, never written)." },
    { name: "in-thread", description: "In its item's thread:  one of its brown block (`AnswerThread`)." },
    { name: "thread-start", description: "First in the thread's block:  its top corners rounded." },
    { name: "thread-end", description: "Last in the thread's block:  its bottom corners rounded." },
    {
      name: "new",
      description:
        "Claude's newest reply in its item (none of Owen's after it), not seen yet in this browser:  an orange " +
        "edge and `NEW`.  Seen once on screen for 1.2s."
    }
  ],
  texts: [
    { key: "foldTip", text: "Close this reply", description: "Tooltip of its fold button while open." },
    { key: "unfoldTip", text: "Open this reply", description: "Tooltip of its fold button while folded." },
    { key: "re", text: "re: {re}", description: "What the reply is about, in its heading." },
    { key: "you", text: "You", description: "Who wrote it, in its heading:  the reader (`from` is their name)." },
    {
      key: "claude",
      text: "Claude",
      description: "Who wrote it, in its heading:  Claude, the reader's own session's, or a reply from before `agent`."
    },
    {
      key: "claudeOf",
      text: "Claude ({person})",
      description: "Who wrote it, in its heading:  another person's session's Claude (`agent`, `from`)."
    },
    { key: "new", text: "NEW", description: "The tag on Claude's newest reply, until Owen has seen it." },
    {
      key: "newTip",
      text: "Claude's newest reply:  new since you looked",
      description: "The NEW tag's tooltip."
    }
  ],
  children: [{ tag: "flow", description: "The reply." }]
} as const satisfies EpicVocabulary
