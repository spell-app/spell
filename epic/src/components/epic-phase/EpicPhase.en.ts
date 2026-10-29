/**
 * Every name `<epic-phase>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type`, plus two types files' data:
 *   - the fold pieces (`FOLD_*`), from `epic-section`'s;  the `actions` slot (`ACTIONS_*`), from the folds'
 *   - the review controls' parts (`REVIEW_PARTS`), from `epic-review`'s:  a phase takes review notes (epic `airplane` P2)
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

import { ACTIONS_CHILD, ACTIONS_SLOT_SPEC } from "spell/epic/components/epic-item/Fold.types"
// the review controls a phase draws, as `<epic-item>` does
import { REVIEW_PARTS } from "spell/epic/components/epic-review/EpicReview.types"
// the fold pieces every folding block shares
import {
  FOLD_EVENTS,
  FOLD_OPEN_ATTRIBUTE,
  FOLD_PARTS,
  FOLD_STATES,
  FOLD_TEXTS
} from "spell/epic/components/epic-section/EpicSection.types"

/****************
 * ### `<epic-phase>`
 * One phase of the plan, in `<epic-section kind="phases">`.
 ****************/
export const epicPhaseVocabulary = {
  tag: "epic-phase",
  topics: ["documentation", "progress", "containers"],
  aka: ["phase", "milestone", "step", "stage"],
  noun: "phase",
  ui: false,
  description:
    "One phase of the plan:  its status icon and estimate (once done, what it took) in its title line;  its fields (Symptom, " +
    "Requests, Goal, Changes), Owen's kept notes, its plan changes (`<epic-update>` blocks, at the end of its " +
    "description), then Done, commits, Files, Verify and To review, as children in that order.  " +
    "While the page is reviewed, it takes review notes as an Overview sub-section does:  Make Todo, Revisit.",
  attributes: [
    {
      name: "id",
      property: "epicId",
      kind: "string",
      required: true,
      format: "phase id",
      description:
        "Stable, made from its name when it's added, and kept through renames and inserts:  `p-epic-migrate` (an " +
        "older page's `p2`, until `stable-phase-ids`).  Links and comments use it (`#p-epic-migrate`);  the number " +
        "shown, `P2 · <title>`, is its place among the whole-numbered phases, or its own `number`."
    },
    {
      name: "number",
      kind: "string",
      format: "decimal phase number",
      description:
        "A phase added on the fly (epic `epic-engine` P39):  its own number, a decimal of the phase before it " +
        "(`11.1`, drawn `P11.1`), so no other phase is renumbered.  Absent:  its number is its place among the " +
        "phases without one."
    },
    {
      name: "title",
      property: "epicTitle",
      kind: "string",
      required: "or slot",
      description: "Its short name, 2-4 words, WITHOUT its id (`Saved Replies`, drawn as `P1 · Saved Replies`)."
    },
    {
      name: "status",
      kind: "enum",
      values: ["todo", "active", "done"],
      required: true,
      description: "`todo`, `active` (one at a time, blue:  under way) or `done` (green)."
    },
    {
      name: "estimate",
      kind: "string",
      description:
        "Wall-clock time for Claude to do it, agents included, Owen's review not:  `30m`, `2h`, `1h30m`, `1-2h`."
    },
    {
      name: "took",
      kind: "string",
      description:
        "How long Claude really worked on it, written by the epic tool when it's done (`epic phase … done`, or " +
        "`… took` later;  epic `epic-engine` P41):  `21m`, `1h 30m`.  Its agents' and sessions' working time, " +
        "side by side counted once, never the time waiting on Owen.  A done phase shows it in place of its " +
        "estimate, the estimate in its tooltip (`~3-4h`)."
    },
    {
      name: "source",
      kind: "string",
      description: "Its body's part file (`parts/p2.html`), loaded into its children when it opens."
    },
    {
      name: "part-ids",
      kind: "string",
      format: "ids",
      description: "The ids inside its part file:  a link to one loads the body first, then lands."
    },
    { name: "commits", kind: "boolean", description: "Its body lists commits:  its git icon shows." },
    {
      name: "to-accept",
      kind: "string",
      format: "ids",
      description:
        "The change marks inside it still waiting for Owen's Accept (`ch3 ch5`), written by the epic tool on every " +
        "edit (epic `epic-engine` P30):  the page counts and finds them while its body, a part, isn't loaded."
    },
    {
      name: "to-see",
      kind: "string",
      description:
        "The update blocks inside it still new (`up3@2026-10-27T10:00 up5@...`:  each id and its `at`), written by the " +
        "epic tool on every edit (epic `epic-engine` I168):  not seen, not quiet as of that write.  The page counts " +
        "them (a phase's pen) and takes their Seen while its body, a part, isn't loaded."
    },
    {
      name: "choices-open",
      kind: "number",
      description:
        "How many option sets in its body are still open (neither `chosen` nor `closed`;  epic `epic-engine` P50), " +
        "written by the epic tool on every edit:  its title row says so while its body, a part, isn't loaded.  None:  " +
        "no attribute."
    },
    {
      name: "plan",
      kind: "enum",
      values: ["waiting", "accepted"],
      description:
        "Claude's build plan (its `plan` field, epic `epic-engine` P33):  `waiting` for Owen's Accept (its review " +
        "buttons Accept plan and Revisit), or `accepted` (still to do, its review group ends in a green check:  " +
        "good to go, epic `epic-engine` I140);  written by the epic tool, so the title row knows with its body not " +
        "loaded."
    },
    {
      name: "done-at",
      kind: "string",
      format: "time",
      description:
        "When it was done (ISO), written by the epic tool as it's set done, and for an older done phase from the " +
        "log's `P3 done` line (epic `epic-engine` I170):  done in the last 3 days, green;  before, or none, grey."
    },
    {
      name: "changes",
      kind: "number",
      description:
        "An OLDER page's count of its plan changes (`<epic-update>` blocks), from before epic `epic-engine` I168:  its " +
        "pen says so until the epic tool's next write puts `to-see` in its place."
    },
    FOLD_OPEN_ATTRIBUTE
  ],
  events: [...FOLD_EVENTS],
  slots: [
    { name: "", description: "Its fields, Owen's kept notes, its plan changes and commits." },
    { name: "title", description: "A title with markup, in place of `title`." },
    ACTIONS_SLOT_SPEC,
    {
      name: "changes",
      description:
        'An OLDER doc\'s plan changes (`<epic-updated slot="changes">`, 2026-10-11, P6):  drawn at the end of its ' +
        "body, unboxed, until the epic tool migrates them to `<epic-update>` blocks (`updates-as-epic-update`)."
    },
    {
      name: "status",
      description:
        "Claude's status cards on Owen's marks (`<epic-status slot=\"status\">`, P13):  at the end of its body, " +
        "above the note box."
    }
  ],
  parts: [
    ...FOLD_PARTS,
    {
      name: "git",
      description:
        "Its git icon (epic `epic-engine` P53), before its gear, while it lists commits:  shows or hides its own " +
        "commits;  pressed while they show."
    },
    {
      name: "status",
      description:
        "Its status icon, in its status's colour;  while Claude is at work on it (`:state(working)`), a blue turning " +
        "spinner instead."
    },
    {
      name: "choices-open",
      description: "In its title (P50):  `1 choice open`, red, while a set in its body waits for Owen's pick."
    },
    {
      name: "changed",
      description:
        "In its title, while it isn't done:  its new updates, an orange pen and how many (`to-see`, less the ones quiet " +
        "or marked Seen since)."
    },
    {
      name: "seen-all",
      description:
        "After the pen, while the page is reviewed:  a round ✓ `<ui-button>` marking every new update Seen at once."
    },
    {
      name: "tools",
      description:
        "At the title's end:  the page's own buttons (the `actions` slot), then its estimate (once done and timed, " +
        "what it took), then its review buttons, while the page is reviewed, then its gear."
    },
    {
      name: "estimate",
      description:
        "Its `estimate`, a small pill just before its review buttons (`2-3h`), so they line up row to row;  done and " +
        "timed, what it `took` (`21m`), the estimate its tooltip."
    },
    {
      name: "gear",
      description:
        "Its gear, last on its title row (epic `epic-engine` I166):  a `<ui-dropdown>` menu of what this phase " +
        "shows, " +
        '"Show this phase\'s files" and "Show this phase\'s checks", ticked while on;  its choice wins over the ' +
        "Phases section's gear for this phase.  Only with an `id`."
    },
    ...REVIEW_PARTS
  ],
  states: [
    ...FOLD_STATES,
    { name: "commits", description: "Its own commits show:  its git icon pressed." },
    {
      name: "movable",
      description:
        "Still to do, on a page being reviewed:  dragged by its title row to another place (epic `epic-engine` P34)."
    },
    {
      name: "working",
      description:
        "Claude is at work on it, and it isn't done:  the review inbox's `working`, keyed by its id (writing its plan, " +
        "or building it;  epic `epic-engine` I147).  Its status icon is a blue turning spinner."
    }
  ],
  texts: [
    ...FOLD_TEXTS,
    // `status*`:  the review controls' `todo` is Make Todo
    { key: "statusTodo", text: "To do", description: "The status icon's name:  `todo`." },
    { key: "statusActive", text: "Under way", description: "The status icon's name:  `active`." },
    { key: "statusDone", text: "Done", description: "The status icon's name:  `done`." },
    {
      key: "workingPlan",
      text: "Claude is writing this phase's plan",
      description: "Its spinner while Claude is at work on it and its plan isn't accepted yet:  its tooltip and name."
    },
    {
      key: "workingOn",
      text: "Claude is working on it",
      description: "Its spinner while Claude is at work on it, its plan accepted or the phase under way."
    },
    { key: "gearTip", text: "Settings for this phase", description: "Its gear's tooltip and name (I166)." },
    { key: "showCommits", text: "Show this phase's commits", description: "The git icon's tooltip (P53, J163)." },
    {
      key: "hideCommits",
      text: "Hide this phase's commits",
      description: "The git icon's tooltip, its commits shown."
    },
    {
      key: "showPhaseFiles",
      text: "Show this phase's files",
      description: "Its gear menu:  its Files field, ticked while it shows (its own choice, else every phase's)."
    },
    {
      key: "showPhaseVerify",
      text: "Show this phase's checks",
      description: "Its gear menu:  its Verify field, ticked while it shows (its own choice, else every phase's)."
    },
    {
      key: "tookTip",
      text: "~{estimate}",
      description: "A done phase's time pill:  its tooltip, the estimate it had (`~3-4h`;  Owen, M3 on P41)."
    },
    {
      key: "choiceOpen",
      text: "1 choice open",
      description: "After its title (P50):  a set in its body waits for Owen's pick."
    },
    {
      key: "choicesOpenCount",
      text: "{count} choices open",
      description: "After its title (P50):  sets in its body wait for Owen's picks."
    },
    {
      key: "changedTip",
      text:
        "{count} × Update new in this phase.  ✓ Seen on one (or the ✓ here, on all) folds it to a grey line for " +
        "everyone;  unseen, each goes quiet by itself 3 days after it was written",
      description: "The title's pen while it isn't done:  its tooltip and name;  `count` how many new updates."
    },
    {
      key: "seenAllTip",
      text: "Seen:  all {count} new updates in this phase, folded to grey lines for everyone once Claude applies it",
      description: "The pen's ✓:  what it does."
    }
  ],
  children: [
    { tag: "flow", slot: "title", max: 1, description: "A title with markup." },
    ACTIONS_CHILD,
    {
      tag: "epic-field",
      where: { attribute: "name", values: ["symptom"] },
      max: 1,
      description: "Symptom:  what's wrong today, one line."
    },
    {
      tag: "epic-updated",
      slot: "changes",
      description:
        "An OLDER doc's plan changes (2026-10-11, P6):  the epic tool's next write makes each an " +
        "`<epic-update>` block, after Goal (`updates-as-epic-update`)."
    },
    {
      tag: "epic-updated",
      description:
        "An OLDER doc's plan changes, in no slot (until 2026-10-11):  drawn among its fields until the epic " +
        "tool's next write makes each an `<epic-update>` block, after Goal."
    },
    {
      tag: "epic-field",
      where: { attribute: "name", values: ["requests"] },
      max: 1,
      description:
        "Requests:  what Owen sent this phase from other sessions (epic `epic-workflow`), one labelled block each:  " +
        "his words, the sender, his screenshots (`epic file`)."
    },
    {
      tag: "epic-reply",
      description:
        "Owen's notes on the phase from the page, kept once Claude took them (`inbox done | clear`), oldest first."
    },
    {
      tag: "epic-status",
      slot: "status",
      description: "Claude's status cards on Owen's marks, oldest first (`plan-doc status`;  a todo filed:  born done)."
    },
    {
      tag: "epic-field",
      where: { attribute: "name", values: ["goal"] },
      max: 1,
      description: "Goal:  a bullet per outcome."
    },
    {
      tag: "epic-field",
      where: { attribute: "name", values: ["changes"] },
      max: 1,
      description:
        "Changes:  what changes, two or three lines;  after Goal, next to the plan (epic `epic-engine` P45;  Owen, " +
        '2026-10-25:  "Move `changes` below `goal` so it\'s next to the plan").'
    },
    {
      tag: "epic-field",
      where: { attribute: "name", values: ["choices"] },
      max: 1,
      description:
        "Choices:  the phase's own option sets (`<epic-choices>`, epic `epic-engine` P50), a fork that belongs to this " +
        "phase alone;  picked on the page, keyed by the phase (`epic update ...#P3 --choices`)."
    },
    {
      tag: "epic-update",
      description:
        "Its plan changes, oldest first, at the end of its description (Owen, 2026-10-11):  each an " +
        "`<epic-update at summary>` block, `Update: <summary>` and its date, what changed under it;  kept once done."
    },
    {
      tag: "epic-field",
      where: { attribute: "name", values: ["plan"] },
      max: 1,
      description:
        "Claude's plan:  how Claude will build it, for Owen to accept first (epic `epic-engine` P33;  `--plan`)."
    },
    {
      tag: "epic-field",
      where: { attribute: "name", values: ["done"] },
      max: 1,
      description: "Done:  what was built, once done."
    },
    { tag: "epic-commit", description: "Its commits, oldest first." },
    {
      tag: "epic-field",
      where: { attribute: "name", values: ["files"] },
      max: 1,
      description: "Files:  what changes."
    },
    {
      tag: "epic-field",
      where: { attribute: "name", values: ["verify"] },
      max: 1,
      description: "Verify:  how we know it worked."
    },
    {
      tag: "epic-field",
      where: { attribute: "name", values: ["to-review"] },
      max: 1,
      description: "To review:  the items added during it still open and not reviewed (written by the script)."
    }
  ],
  childOrder: "listed"
} as const satisfies EpicVocabulary
