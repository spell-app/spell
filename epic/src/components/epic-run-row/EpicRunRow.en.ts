/**
 * Every name `<epic-run-row>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell-epic/definitions"

/****************
 * ### `<epic-run-row>`
 * One row of a run page:  a thing a command asks Owen about, and his answer to it.
 ****************/
export const epicRunRowVocabulary = {
  tag: "epic-run-row",
  topics: ["tables", "forms"],
  aka: ["run row", "command row", "review row", "name review"],
  noun: "run row",
  ui: false,
  description:
    "One row of a run page (epic `epic-engine` P23), drawn by `<epic-run>` in its table:  the command's own " +
    "columns, then the answer.  The answer is the command's proposal, pre-filled in a box Owen types over;  a pick " +
    "of the few alternatives the command offers, when it offers any, with the proposal first;  the row's tick box, " +
    "with the command's own label (`Use for every project`);  and its details, folded under it.  Each change says " +
    "so (`epic-run-answered`), and `<epic-run>` saves it:  typing half a second after he stops, a pick or a tick at " +
    "once.  A row he answered differently from the proposal is orange, with a round button putting the proposal back.  " +
    "A row the command has taken (acted on, epic `epic-engine` P25) has a quiet `taken` mark, its time in the " +
    "tooltip;  changed after that, an orange note says so:  the command may pick the change up if it can.",
  attributes: [
    {
      name: "row",
      kind: "json",
      required: true,
      description:
        "The row, as the command wrote it (`RunRow`, the kit's `spell/server/runs/runs.types`):  `id`, `cells`, " +
        "`value` (the proposal), `alternatives`, `tick`, `details`.  A property;  JSON in markup."
    },
    {
      name: "columns",
      kind: "json",
      description:
        "The run's columns (`RunColumn[]`:  `key`, `label`), in order:  which `cells` to show, and their names."
    },
    {
      name: "answer",
      kind: "json",
      description:
        "Owen's answer so far (`RunAnswer`:  `outcome`, `value`, `ticked`), as saved;  none:  the proposal, and the " +
        "tick box as the command set it."
    },
    { name: "answer-label", kind: "string", description: "The answer column's name (`Spanish`):  the box's name." },
    {
      name: "taken",
      kind: "string",
      description:
        "When the command took the row (acted on it), ISO (`RunPage.taken`, P25);  none:  not taken yet.  An answer " +
        "saved after it is `changed-after-taken`."
    }
  ],
  events: [
    {
      name: "epic-run-answered",
      detail: "{ rowId: string, outcome: RunOutcome, value: string, ticked?: boolean, now: boolean }",
      description:
        "Owen answered the row:  typed in the box (`now: false`, saved a moment later), picked an alternative or " +
        "ticked the box (`now: true`).  `outcome` says which:  `accepted` (the proposal), `picked` (an alternative), " +
        "`typed` (anything else)."
    }
  ],
  slots: [],
  parts: [
    { name: "base", description: "Its cells, laid out on its table's columns." },
    { name: "cell", description: "One of the command's columns:  its value, as text." },
    { name: "answer", description: "The answer cell:  the box, the pick, the tick box, the details." },
    { name: "box", description: "The `<textarea>`:  one line of text that wraps and grows;  Enter adds no line." },
    { name: "reset", description: "The round button putting the proposal back, once the box holds something else." },
    {
      name: "picks",
      description:
        "The pick:  the proposal, then each alternative, as small pills;  the chosen one raised, as a segmented control's thumb."
    },
    { name: "pick", description: "One pill of the pick." },
    { name: "tick", description: "The tick box and its label." },
    { name: "details", description: "Its details, folded:  a line each." },
    {
      name: "taken",
      description: "The quiet `taken` mark beside the box:  a check and the word, its time the tooltip."
    },
    {
      name: "changed-after-taken",
      description: "The orange note under the box:  the answer changed after the command took the row."
    }
  ],
  states: [
    { name: "changed", description: "The answer isn't the proposal:  orange." },
    { name: "answered", description: "Owen answered it (anything saved, the proposal included)." },
    { name: "taken", description: "The command took the row (acted on it)." },
    {
      name: "changed-after-taken",
      description: "Owen's answer is newer than the command's taking of it:  the orange note shows."
    }
  ],
  texts: [
    { key: "boxLabel", text: "{label} for {first}", description: "The box's name, for a screen reader." },
    { key: "reset", text: "Back to the proposal", description: "The reset button's name." },
    { key: "resetTip", text: "Back to {value}", description: "The reset button's tooltip." },
    { key: "picks", text: "Pick one", description: "The pick's name, for a screen reader." },
    { key: "proposed", text: "proposed", description: "The proposal's pill's tooltip." },
    { key: "details", text: "Details · {count}", description: "The details' fold:  how many lines." },
    { key: "taken", text: "taken", description: "The taken mark's word." },
    { key: "takenTip", text: "The run took this at {time}", description: "The taken mark's tooltip." },
    {
      key: "changedAfterTaken",
      text: "changed after the run took it",
      description: "The orange note on a row changed after it was taken."
    },
    {
      key: "changedAfterTakenTip",
      text: "The command may pick the change up if it can",
      description: "The orange note's tooltip."
    }
  ],
  children: []
} as const satisfies EpicVocabulary
