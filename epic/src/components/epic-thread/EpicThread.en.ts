/**
 * Every name `<epic-thread>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type`, plus its value lists from its types file, data too.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell-epic/definitions"

import { THREAD_BOXED } from "./EpicThread.types"

/****************
 * ### `<epic-thread>`
 * One comment's whole THREAD on a page:  its header, Owen's answer, the messages, then his reply box.
 ****************/
export const epicThreadVocabulary = {
  tag: "epic-thread",
  topics: ["messages", "feedback", "forms"],
  aka: ["comment", "comment thread", "bullhorn comment", "thread", "conversation", "reply"],
  noun: "thread",
  ui: false,
  description:
    "One comment's whole thread (epic `airplane` P11;  an element since epic `epic-engine` P3), drawn by the docs " +
    "runtime's comments under the paragraph, list item or cell holding its quote, else under its block, on a guide, " +
    "an epic page or an Epic UI page:  one ivory pane that folds.  Its header:  a chevron, the bullhorn (a green " +
    "check circle once done), its id (`M3`), the first words it's on;  while it's Owen's turn, his answer (an " +
    "item's review pills:  That's good, Reply, Skip it), Reopen once done, the pen while Claude hasn't had his " +
    "words, the trash.  Then the messages in order (`<epic-thread-message>`), and his reply box, slotted.  Orange " +
    "while Claude spoke last and Owen hasn't answered (`unseen`).  It draws what it's given and says what Owen " +
    "did:  the comments' code saves and redraws.",
  attributes: [
    {
      name: "comment",
      kind: "json",
      required: true,
      description:
        "The comment, as the comments route answers it (`GET /api/docs/comments`):  `id`, `text`, `at`, `status`, " +
        "`turn`, `replies`, `working`, `done`, `taken`, and where it is (`kind`, `label`, `excerpt`, `quote`).  A " +
        "property;  JSON in markup."
    },
    {
      name: "open",
      kind: "boolean",
      description:
        "Unfolded:  the messages and the reply box show.  A click on its header flips it, and says so " +
        "(`epic-thread-fold`)."
    },
    {
      name: "unseen",
      kind: "boolean",
      description:
        "ORANGE:  Claude spoke last and Owen hasn't answered yet (✓, a reply, ×).  The whole thread's ground, " +
        'Claude\'s latest reply stronger.  Orange is our colour for "changed since you looked".'
    },
    {
      name: "moved",
      kind: "boolean",
      description: "Its block changed or moved since:  it says what it was on (the comment's `excerpt`)."
    },
    {
      name: "boxed",
      kind: "enum",
      values: THREAD_BOXED,
      description:
        "Owen's words now in the box under it, so the thread leaves them out:  `first` (his first words, in the " +
        "pen's box), `pending` (his pending reply, in the reply box).  The pen hides while `first`."
    },
    {
      name: "saved",
      kind: "string",
      description:
        "The box's floppy, in its corner, and its tooltip:  `Saved 14:02 · waiting for Claude`;  none:  no floppy."
    },
    {
      name: "failed",
      kind: "boolean",
      description: "The box's last save failed:  the floppy red, `saved` saying why."
    }
  ],
  events: [
    {
      name: "epic-thread-fold",
      detail: "{ open: boolean }",
      description: "Owen clicked its header (not one of its buttons):  it unfolded or folded, as `open` now says."
    },
    {
      name: "epic-thread-edit",
      detail: "{}",
      description: "The pen:  Owen will change his first words, while Claude hasn't had them."
    },
    {
      name: "epic-thread-delete",
      detail: "{}",
      description: "The trash:  Owen deletes the comment, at once (Undo in the toast that follows)."
    },
    {
      name: "epic-thread-answer",
      detail: '{ act: "good" | "reply" | "skip" | "reopen" }',
      description:
        "Owen's answer, from its review pills (an `<epic-review buttons=thread>` in its shadow root):  That's " +
        "good, Reply, Skip it;  Reopen once done."
    }
  ],
  slots: [
    {
      name: "",
      description:
        "Owen's box, last in its body while open:  the reply box, or the pen's box over his first words (a " +
        "`<ui-textarea>`, which the comments' code keeps across redraws)."
    }
  ],
  parts: [
    { name: "base", description: "The thread:  its header, then its body while open." },
    { name: "header", description: "Its header:  the fold, Owen's answer, the pen, the trash;  a click folds it." },
    {
      name: "fold",
      description: "The fold:  the chevron, the bullhorn (a check circle once done), its id, the first words it's on."
    },
    { name: "id", description: "Its id, `M3`:  small and muted, an outline and no fill." },
    { name: "headline", description: "The first words it's on, in quotes;  its tooltip says the block in full." },
    { name: "answer", description: "Owen's answer while it's his turn (the review pills), or Reopen once done." },
    { name: "body", description: "The messages and the box:  shown while open." },
    { name: "reply", description: "Owen's box, its floppy in the corner." }
  ],
  states: [],
  texts: [
    { key: "foldTip", text: "Fold this thread", description: "After the fold's tooltip while open." },
    { key: "unfoldTip", text: "Unfold this thread", description: "After the fold's tooltip while folded." },
    { key: "editTitle", text: "Edit your last words", description: "The pen's tooltip." },
    {
      key: "editLabel",
      text: "Edit your last words:  Claude hasn't taken them yet",
      description: "The pen, for a screen reader."
    },
    { key: "deleteTitle", text: "Delete this comment", description: "The trash's tooltip." },
    {
      key: "deleteNew",
      text: "Delete this comment (Undo in the toast that follows)",
      description: "The trash, for a screen reader, while Claude hasn't had it."
    },
    {
      key: "deleteHad",
      text: "Delete this comment:  gone from the page, whatever Claude did with it (Undo in the toast that follows)",
      description: "The trash, for a screen reader, once Claude has had it."
    },
    {
      key: "moved",
      text: "The block changed since:  it was “{excerpt}”.",
      description: "Above the messages, when its block changed or moved since (`moved`)."
    },
    {
      key: "answeredInDoc",
      text: "Answered on the epic page.",
      description: "Claude's answer with no words on the thread:  an epic page's comment, answered in the doc."
    },
    { key: "takenInto", text: "Taken into", description: "Claude took it into an epic's phase:  before the link." },
    {
      key: "takenWhy",
      text: ", to work into the page there.",
      description: "Claude took it into an epic's phase:  after the link."
    },
    { key: "good", text: "That's good.", description: "The Done line:  Owen said that's good." },
    { key: "skip", text: "Skipped:  nothing more to do.", description: "The Done line:  Owen skipped it." },
    { key: "builtIn", text: "Built in", description: "The Done line:  before the commit Claude named." },
    { key: "thinking", text: "thinking…", description: "Claude's stub while he thinks about it (`working`)." }
  ],
  children: []
} as const satisfies EpicVocabulary
