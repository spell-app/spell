/**
 * Every name `<epic-field>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-field>`
 * One named field of a phase (Symptom, Changes, Goal ...), or a labelled block in prose (`Where:`).
 * - A REQUEST (a labelled field in a Requests field) folds, and its screenshots zoom (epic `epic-engine`, r31).
 * - A named field folds by its label row, open to start with, a taste of its text while folded (epic `epic-engine`
 *   I167).
 ****************/
export const epicFieldVocabulary = {
  tag: "epic-field",
  topics: ["documentation", "content parts"],
  aka: ["field", "goal", "symptom", "verify", "labelled block", "where", "step"],
  noun: "field",
  ui: false,
  description:
    "One field of a phase, by `name`:  its icon and label are drawn;  its prose is its children.  In an item's " +
    'prose (anywhere prose goes), a labelled block by `label` instead:  `<epic-field label="Where">` draws `Where:` ' +
    "before its prose, no icon (epic `epic-components` P14).  A labelled field in a phase's Requests field is ONE " +
    "REQUEST (`epic file`):  it folds, its label the title, folded to start with;  its screenshots are thumbnails, " +
    "a click shows one full size, over the page (the page's `<ui-zoom>`).  A NAMED field folds too (epic `epic-engine` " +
    "I167):  a chevron before its icon, a click on it, the icon or the label folds or opens it;  folded, its label row " +
    "stays with one line of its text (a list's count);  open to start with, the reader's folds remembered per page;  " +
    "⌥-click and the page's expand-all and collapse-all reach it, and a link or comment landing inside opens it.",
  attributes: [
    {
      name: "name",
      kind: "enum",
      values: ["symptom", "changes", "requests", "goal", "plan", "done", "files", "verify", "to-review"],
      description:
        "A phase's field (every field in a phase has one):  `symptom` (one line), `changes` (two or three), `goal` " +
        "(a bullet per outcome), `plan` (Claude's build plan, for Owen to accept before the build:  epic `epic-engine` P33), `requests` (what Owen sent it from other sessions:  `epic file`), `done` (what was built), `files`, `verify` (both hidden until the Phases title's " +
        "toggles), `to-review` (the script's:  an `<epic-mark item link>` per item, epic `epic-engine` P45)."
    },
    {
      name: "accepted",
      kind: "string",
      format: "time",
      description:
        "A `plan` field:  when Owen accepted it (`YYYY-MM-DD HH:MM`), the build's go-ahead;  none:  waiting for him."
    },
    {
      name: "label",
      kind: "string",
      description:
        "A labelled block's label, WITHOUT its colon (drawn):  `Where`, `What should happen`, `Step`.  For a field " +
        "in prose, never in a phase:  a field has `name` or `label`.  In a Requests field:  the request's title, " +
        "`r31 · 🚧 debut (ad62dff0)`, drawn without a colon."
    },
    {
      name: "open",
      kind: "boolean",
      description:
        "A request (a labelled field in a Requests field):  unfolded.  Page state only:  the tool never writes it, " +
        "so a page opens with every request folded, and the live patch keeps it."
    }
  ],
  events: [],
  slots: [{ name: "", description: "The field's prose." }],
  parts: [
    { name: "base", description: "The field:  its icon column, then its label and prose." },
    { name: "icon", description: "Its icon, centred on its first line:  none on a labelled block." },
    { name: "label", description: "Its label:  `Symptom:`, `Where:` ..." },
    {
      name: "toggle",
      description: "The fold button:  a request's, before its label;  a named field's, before its icon."
    },
    {
      name: "body",
      description: "A request's or a named field's prose:  folded, `hidden=\"until-found\"`."
    },
    {
      name: "taste",
      description:
        "A folded named field's line after its label:  its text, cut off at the line's end, or a list's count."
    }
  ],
  states: [
    { name: "request", description: "One request in a Requests field:  it folds." },
    { name: "open", description: "A request, or a named field, unfolded." }
  ],
  texts: [
    { key: "symptom", text: "Symptom:" },
    { key: "changes", text: "Changes:" },
    { key: "requests", text: "Requests:" },
    { key: "goal", text: "Goal:" },
    { key: "plan", text: "Claude's plan:", description: "A phase's build plan, waiting for Owen's Accept." },
    { key: "planAccepted", text: "Claude's plan, accepted:", description: "A phase's build plan Owen accepted." },
    { key: "done", text: "Done:" },
    { key: "files", text: "Files:" },
    { key: "verify", text: "Verify:" },
    { key: "toReview", text: "To review:" },
    { key: "labelled", text: "{label}:", description: "A labelled block's label (`label`)." },
    { key: "foldTip", text: "Fold this request", description: "A request's fold button, while open." },
    { key: "unfoldTip", text: "Open this request", description: "A request's fold button, while folded." },
    { key: "foldFieldTip", text: "Fold this field", description: "A named field's fold button, while open." },
    { key: "unfoldFieldTip", text: "Open this field", description: "A named field's fold button, while folded." },
    { key: "tasteItem", text: "1 item", description: "A folded field that's a list of one." },
    { key: "tasteItems", text: "{count} items", description: "A folded field that's a list:  how many." },
    { key: "tasteRequest", text: "1 request", description: "A folded Requests field holding one." },
    { key: "tasteRequests", text: "{count} requests", description: "A folded Requests field:  how many it holds." }
  ],
  children: [{ tag: "flow", description: "The field's prose." }],
  flow: true
} as const satisfies EpicVocabulary
