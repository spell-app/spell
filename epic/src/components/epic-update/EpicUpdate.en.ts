/**
 * Every name `<epic-update>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type`, plus the `actions` slot every title row shares (`Fold.types.ts`), data too.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

import { ACTIONS_CHILD, ACTIONS_PART_SPEC, ACTIONS_SLOT_SPEC } from "spell/epic/components/epic-item/Fold.types"

/****************
 * ### `<epic-update>`
 * An UPDATE:  a dated block saying what changed in the plan, or a bare orange label on a changed item.
 ****************/
export const epicUpdateVocabulary = {
  tag: "epic-update",
  topics: ["documentation", "notifications", "status"],
  aka: ["update", "updated", "plan change", "changed", "revision", "flag"],
  noun: "update",
  ui: false,
  description:
    "An UPDATE (Owen, 2026-10-11):  a block titled `Update: <summary>`, its date at the right, what changed " +
    "under it.  A phase's plan change sits at the end of its phase's description (after Goal);  an update to " +
    "prose right after the block it changed.  Empty, with no `summary` or `at`:  the orange UPDATE label on an " +
    "item changed (on any epic, a phase under way or not).",
  attributes: [
    {
      name: "id",
      property: "epicId",
      kind: "string",
      format: "anchor",
      description:
        "A block's `up3`, given by the epic tool on its next write (epic `epic-engine` I168):  the key its Seen mark goes " +
        "under, and a link's target (`#up3`).  None:  just written, no Seen yet;  a bare label never has one."
    },
    {
      name: "at",
      kind: "string",
      format: "time",
      description: "When it changed:  `2026-10-11 14:30`, drawn `10/11/26 14:30` at the title's right."
    },
    {
      name: "summary",
      kind: "string",
      description: "What changed, in one line:  the title's words after `Update:`."
    },
    {
      name: "phase",
      kind: "string",
      format: "phase number",
      description:
        "The phase active when it was written, by its number (`3`, `11.1`).  `phase 3 done` removes P3's bare labels and the updates " +
        "outside a phase;  a phase's own plan changes stay."
    },
    {
      name: "became",
      kind: "string",
      description:
        "A bare label's status change, when the change was one (epic `epic-engine` T75):  `fixed`, `done`, `canceled`, " +
        "`decided`, `reopened` or `underway` (its latest status card is Underway, I295), drawn as the word alone, `FIXED`.  Written by the epic tool;  a later status change replaces " +
        "it, a plain edit keeps it.  None:  a plain `UPDATE`."
    },
    {
      name: "unmerged",
      kind: "string",
      description:
        "A bare label's branch while its item's work isn't merged into main (the item's own `unmerged`, I273, copied " +
        "by the epic tool on every edit):  a `Not in main` pill after the label, when it has `became`."
    },
    {
      name: "seen",
      kind: "string",
      format: "time",
      description:
        "When you marked it seen (`2026-10-29 14:30`;  epic `epic-engine` I168), written by `epic inbox apply` from " +
        "its Seen mark:  folded to one grey line, out of its phase's pen, for everyone.  None:  new until " +
        "`PlanDates.QUIET_DAYS` after `at`, then quiet all the same."
    }
  ],
  events: [],
  slots: [{ name: "", description: "What changed, and why;  none for a bare label." }, ACTIONS_SLOT_SPEC],
  parts: [
    { name: "base", description: "The block, or the bare label." },
    { name: "header", description: "A block's title row:  the fold chevron, the title, `actions`, the date." },
    { name: "toggle", description: "A block's fold chevron, a `<button>`, first:  a click folds what changed." },
    { name: "title", description: "A block's `Update: <summary>`." },
    { name: "time", description: "A block's date (`at`), at the right of its title row." },
    ACTIONS_PART_SPEC,
    {
      name: "seen",
      description:
        'A new block\'s ✓ Seen, before its date, while the page is reviewed:  an `<epic-review buttons="update">`.'
    },
    { name: "body", description: "What changed, under the title row;  hidden (`until-found`) while folded." },
    {
      name: "label",
      description: "The bare orange `UPDATE` label (just `FIXED` ... with `became`;  `UNDERWAY` solid blue)."
    },
    {
      name: "unmerged",
      description: "A bare label's `Not in main` pill, after it, while its item's work is on its branch alone."
    }
  ],
  states: [
    { name: "block", description: "Drawn as a block:  it has a summary, a date or what changed." },
    {
      name: "open",
      description: "A block, unfolded:  it starts so while new, folded once seen or quiet (page state, never written)."
    },
    {
      name: "quiet",
      description:
        "A block seen (`seen`, or its Seen mark in the inbox) or older than 3 days (`PlanDates.isQuiet()`):  " +
        "grey, folded to its title row."
    }
  ],
  texts: [
    { key: "buttonsLabel", text: "this update", description: "Seen's group, spoken." },
    { key: "title", text: "Update", description: "A block's title, in bold, before `: <summary>`." },
    { key: "label", text: "UPDATE", description: "The bare label." },
    {
      key: "became",
      text: "{status}",
      description:
        "The bare label after a status change (`became`):  just the status word, `FIXED` (Owen, 2026-11-15, I295:  " +
        '"Update: Fixed could just be `Fixed`")'
    },
    { key: "fixed", text: "FIXED", description: "`became` fixed:  fixed, for your review." },
    { key: "done", text: "DONE", description: "`became` done." },
    { key: "canceled", text: "CANCELED", description: "`became` canceled." },
    { key: "decided", text: "DECIDED", description: "`became` decided:  a question answered." },
    { key: "reopened", text: "REOPENED", description: "`became` reopened." },
    { key: "underway", text: "UNDERWAY", description: "`became` underway:  Claude took it up (its card is Underway)." },
    { key: "unmerged", text: "Not in main", description: "The pill after the label while its work isn't merged." }
  ],
  children: [{ tag: "flow", description: "What changed, and why." }, ACTIONS_CHILD],
  flow: true
} as const satisfies EpicVocabulary
