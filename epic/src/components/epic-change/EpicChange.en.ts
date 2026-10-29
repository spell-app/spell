/**
 * Every name `<epic-change>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-change>`
 * A CHANGE MARK (epic `epic-engine` P30, Q13 B):  words an answer changed, in the text itself.
 ****************/
export const epicChangeVocabulary = {
  tag: "epic-change",
  topics: ["documentation", "notifications", "status"],
  aka: ["change mark", "changed words", "highlight", "accept", "reopen", "tracked change", "Q&A chip"],
  noun: "change mark",
  ui: false,
  description:
    "Words an answer changed or added, marked where they are (epic `epic-engine` P30):  " +
    '`<epic-change item="q16">todos fold into it</epic-change>`.  They show on an orange ground, our colour for ' +
    '"changed since you looked", with a small folded chip naming the question (`Q16`);  unfolded, the question and ' +
    "its answer in a line.  A click on the words (or Enter) opens a popup:  which answer changed them and when, the " +
    "words they replaced (`was`), and, while the page is reviewed and the change new, Reopen, which opens the " +
    "question again.  Claude writes the element with `item` alone;  the epic tool gives it its id, time, answer " +
    "and the words it replaced.",
  attributes: [
    {
      name: "id",
      property: "epicId",
      kind: "string",
      format: "anchor",
      description:
        "`ch3`, given by the epic tool on its next write (`epic change <name>` stamps it):  the key its Accept and " +
        "Reopen marks go under, and a link's target (`#ch3`).  None:  just written, no buttons yet."
    },
    {
      name: "item",
      kind: "string",
      required: true,
      format: "anchor",
      description:
        "The question (or any item) whose answer made the change, by id, any case (`q16`):  the chip's name;  " +
        "its title from the page, its answer from `answer`.  `epic lint` fails one naming no item."
    },
    {
      name: "at",
      kind: "string",
      format: "time",
      description: "When the words changed:  `2026-10-24 15:10`, stamped by the tool when missing."
    },
    {
      name: "answer",
      kind: "string",
      description:
        "Its item's answer in short, as it was when the words changed:  the tool copies it from the item's " +
        "`<epic-answer title>`, so the chip still says why months later."
    },
    {
      name: "was",
      kind: "string",
      description:
        'The words it replaced, as plain text (epic `epic-engine` I160):  the popup\'s "Originally".  The epic ' +
        "tool finds them as it stamps the mark, in the page as it was before (on disk, else its last commits);  " +
        "none:  new words, or a mark from before I160."
    },
    {
      name: "accepted",
      kind: "string",
      format: "time",
      description:
        "When you accepted it (`2026-10-24 19:02`), on a page from before changes needed no approval:  quiet, no " +
        "orange;  an old Accept mark still writes it.  None:  orange while new (`at`, 3 days)."
    }
  ],
  events: [],
  slots: [{ name: "", description: "The changed or new words:  running text, links and code included." }],
  parts: [
    { name: "base", description: "The whole mark:  the words, the chip, its question and answer." },
    {
      name: "words",
      description:
        "The changed words, a `<mark>`:  orange while new (3 days);  a click, Enter or Space opens the popup."
    },
    { name: "chip", description: "The question's id (`Q16`), a `<button>`:  a click folds its question and answer." },
    {
      name: "qa",
      description: "The question's title and its answer, in a line, after the chip;  hidden while folded."
    },
    {
      name: "popup",
      description:
        "The words' popup (a `<ui-popup>`), opened by a click on them:  which answer changed them and when, " +
        '"Originally" and the words they replaced, and Reopen (an `<epic-review buttons=change>`) while the page ' +
        "is reviewed and the change is new.  A click elsewhere or Escape closes it."
    }
  ],
  states: [
    { name: "quiet", description: "No longer new (3 days), or accepted before:  no orange, the chip muted." },
    { name: "open", description: "Its chip unfolded:  the question and answer show (page state, never written)." }
  ],
  texts: [
    {
      key: "changedBy",
      text: "Changed by {item}{when}",
      description: "The popup's first line;  `when`, ` (10/24/26 15:10)`."
    },
    { key: "originally", text: "Originally:", description: "The popup's second line, before the words replaced." },
    { key: "unfoldTip", text: "{item}:  show the question and its answer", description: "The chip's tooltip, folded." },
    { key: "foldTip", text: "{item}:  hide the question and its answer", description: "The chip's tooltip, open." },
    { key: "noAnswer", text: "not answered yet", description: "The answer's place when the change has none." },
    { key: "buttonsLabel", text: "the change by {item}", description: "Reopen's group, spoken." }
  ],
  children: [{ tag: "flow", description: "The changed words." }],
  flow: true
} as const satisfies EpicVocabulary
