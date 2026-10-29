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
    "a click shows one full size, over the page (the page's `<ui-zoom>`).",
  attributes: [
    {
      name: "name",
      kind: "enum",
      values: ["symptom", "changes", "requests", "goal", "plan", "done", "files", "verify", "to-review"],
      description:
        "A phase's field (every field in a phase has one):  `symptom` (one line), `changes` (two or three), `goal` " +
        "(a bullet per outcome), `plan` (Claude's build plan, for you to accept before the build:  epic `epic-engine` P33), `requests` (what you sent it from other sessions:  `epic file`), `done` (what was built), `files`, `verify` (both hidden until the Phases title's " +
        "toggles), `to-review` (the script's:  an `<epic-mark item link>` per item, epic `epic-engine` P45)."
    },
    {
      name: "accepted",
      kind: "string",
      format: "time",
      description:
        "A `plan` field:  when you accepted it (`YYYY-MM-DD HH:MM`), the build's go-ahead;  none:  waiting for you."
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
    { name: "toggle", description: "A request's fold button, before its label." },
    { name: "body", description: 'A request\'s prose, under its label:  folded, `hidden="until-found"`.' }
  ],
  states: [
    { name: "request", description: "One request in a Requests field:  it folds." },
    { name: "open", description: "A request, unfolded." }
  ],
  texts: [
    { key: "symptom", text: "Symptom:" },
    { key: "changes", text: "Changes:" },
    { key: "requests", text: "Requests:" },
    { key: "goal", text: "Goal:" },
    { key: "plan", text: "Claude's plan:", description: "A phase's build plan, waiting for your Accept." },
    { key: "planAccepted", text: "Claude's plan, accepted:", description: "A phase's build plan you accepted." },
    { key: "done", text: "Done:" },
    { key: "files", text: "Files:" },
    { key: "verify", text: "Verify:" },
    { key: "toReview", text: "To review:" },
    { key: "labelled", text: "{label}:", description: "A labelled block's label (`label`)." },
    { key: "foldTip", text: "Fold this request", description: "A request's fold button, while open." },
    { key: "unfoldTip", text: "Open this request", description: "A request's fold button, while folded." }
  ],
  children: [{ tag: "flow", description: "The field's prose." }],
  flow: true
} as const satisfies EpicVocabulary
