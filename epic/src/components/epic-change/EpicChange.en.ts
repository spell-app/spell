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
    "its answer in a line.  While the page is reviewed, Accept and Reopen show on hover or focus.  Accept clears " +
    "the orange and the chip stays for good (Q13, B);  Reopen opens the question again, and the words stay orange.  " +
    "Claude writes the element with `item` alone;  the epic tool gives it its id, time and answer.",
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
      name: "accepted",
      kind: "string",
      format: "time",
      description:
        "When Owen accepted it (`2026-10-24 19:02`), on a page from before changes needed no approval:  quiet, no " +
        "orange;  an old Accept mark still writes it.  None:  orange while new (`at`, 3 days)."
    }
  ],
  events: [],
  slots: [{ name: "", description: "The changed or new words:  running text, links and code included." }],
  parts: [
    { name: "base", description: "The whole mark:  the words, the chip, its question and answer." },
    { name: "words", description: "The changed words, a `<mark>`:  orange while new (3 days)." },
    { name: "chip", description: "The question's id (`Q16`), a `<button>`:  a click folds its question and answer." },
    {
      name: "qa",
      description: "The question's title and its answer, in a line, after the chip;  hidden while folded."
    },
    {
      name: "buttons",
      description:
        "Accept and Reopen (an `<epic-review buttons=change>`), under the chip on hover or focus, while the page is " +
        "reviewed and the change waits."
    }
  ],
  states: [
    { name: "quiet", description: "No longer new (3 days), or accepted before:  no orange, the chip muted." },
    { name: "open", description: "Its chip unfolded:  the question and answer show (page state, never written)." }
  ],
  texts: [
    {
      key: "newTip",
      text: "Changed by {item}'s answer{when}:  Reopen to talk it over again",
      description: "The words' tooltip while the change is new and the page reviewed;  `when`, ` on 10/24/26 15:10`."
    },
    {
      key: "changedTip",
      text: "Changed by {item}'s answer{when}",
      description: "The words' tooltip otherwise."
    },
    { key: "unfoldTip", text: "{item}:  show the question and its answer", description: "The chip's tooltip, folded." },
    { key: "foldTip", text: "{item}:  hide the question and its answer", description: "The chip's tooltip, open." },
    { key: "noAnswer", text: "not answered yet", description: "The answer's place when the change has none." },
    { key: "buttonsLabel", text: "the change by {item}", description: "Reopen's group, spoken." }
  ],
  children: [{ tag: "flow", description: "The changed words." }],
  flow: true
} as const satisfies EpicVocabulary
