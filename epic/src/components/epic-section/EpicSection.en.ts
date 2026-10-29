/**
 * Every name `<epic-section>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type`, plus other data:
 *   - the fold pieces (`FOLD_*`), from its types file;  the `actions` slot (`ACTIONS_*`), from the folds'
 *   - the parts of the `<epic-review>`s an Overview sub-section draws (Q14)
 *   - the new-item texts of Todos and Questions
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 * - `kind`'s values are `overview-part`, `SectionIds`' keys, then `report`:  `Definitions.test.ts` checks they agree.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

import { ACTIONS_CHILD, ACTIONS_SLOT_SPEC } from "spell/epic/components/epic-item/Fold.types"
// the review controls an Overview sub-section draws, as `<epic-item>` does;  the waiting new items of Todos and Questions
import { NEW_KIND_TEXTS, NEW_LIST_TEXTS } from "spell/epic/components/epic-new-item/EpicNewItem.types"
import { REVIEW_PARTS } from "spell/epic/components/epic-review/EpicReview.types"

import { FOLD_EVENTS, FOLD_OPEN_ATTRIBUTE, FOLD_PARTS, FOLD_STATES, FOLD_TEXTS } from "./EpicSection.types"

/****************
 * ### `<epic-section>`
 * One section of an epic page:  Phases, Questions ... Log, one of the Overview's sub-sections, or a report;
 * on a saga page, its Epics too.
 ****************/
export const epicSectionVocabulary = {
  tag: "epic-section",
  topics: ["documentation", "containers", "layout"],
  aka: ["section", "chapter", "panel"],
  noun: "section",
  ui: false,
  description:
    "One section of an epic page, by `kind`:  its phases, its items or its log;  or, inside `<epic-overview>`, one " +
    "of the Overview's sub-sections (`overview-part`), which gets review notes as items do;  or a report a run " +
    "wrote (`report`:  an overnight `/bedtime` report), after the Overview, unnumbered;  or a saga page's Epics " +
    "(`epics`:  the cards of the epics serving it, an `<epic-cards>`).",
  attributes: [
    {
      name: "id",
      property: "epicId",
      kind: "string",
      required: true,
      format: "anchor",
      description:
        "Its id, which links use:  FIXED per kind (`phases`, `decisions` for Questions ...);  `o1`, `o2` ... for " +
        "an Overview sub-section;  a report's own (`overnight`)."
    },
    {
      name: "kind",
      kind: "enum",
      values: [
        "overview-part",
        "epics",
        "choices",
        "phases",
        "questions",
        "judgements",
        "todos",
        "issues",
        "tests",
        "log",
        "report"
      ],
      required: true,
      description:
        "What it holds:  `phases` its `<epic-phase>`s;  `questions` ... `tests` its `<epic-item>`s;  `log` its " +
        "`<epic-commit>`s (drawn, newest first) and `<epic-event>`s (written, not drawn);  `overview-part` and " +
        "`report` prose;  `epics` (a saga page's) its `<epic-cards>`."
    },
    {
      name: "title",
      property: "epicTitle",
      kind: "string",
      description:
        "An Overview sub-section's title, WITHOUT its number (`Structure`, drawn as `1.1 Structure`), or a " +
        'report\'s (`Overnight · 2026-10-04`):  required there (or a `slot="title"` child, for a title with markup).  ' +
        "The page's sections draw their own."
    },
    {
      name: "source",
      kind: "string",
      description: "Its body's part file (`parts/o3.html`, `parts/log.html`), loaded into its children when it opens."
    },
    {
      name: "part-ids",
      kind: "string",
      format: "ids",
      description: "The ids inside its part file:  a link to one loads the body first, then lands."
    },
    {
      name: "to-accept",
      kind: "string",
      format: "ids",
      description:
        "The change marks inside it still waiting for your Accept (`ch3 ch5`), written by the epic tool on every " +
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
    FOLD_OPEN_ATTRIBUTE
  ],
  events: [
    ...FOLD_EVENTS,
    {
      name: "epic-filter-changed",
      detail: "{ states: string[] | undefined }",
      description:
        "Its state filter changed:  its chips, `show all`, or the page's toolbar (`showStates()`).  `states` the ones " +
        "showing;  none:  every state."
    },
    {
      name: "epic-count-changed",
      detail: "{}",
      description:
        "Its live count changed with no change to its markup (epic `epic-engine` I147):  an item or phase being worked " +
        "on, an urgency not applied yet.  The docs runtime draws the toolbar's badges again."
    }
  ],
  slots: [
    { name: "", description: "Its phases, items, log events or prose." },
    { name: "title", description: "A title with markup, in place of `title`." },
    ACTIONS_SLOT_SPEC,
    {
      name: "changes",
      description:
        "An OLDER doc's Plan changes copies in the Phases section (T14, until 2026-10-11).  NOT drawn:  no slot of " +
        "the shadow root takes them, since each phase draws its own;  the epic tool removes them on its next write."
    },
    {
      name: "status",
      description:
        'An Overview sub-section\'s status cards from Claude (`<epic-status slot="status">`, P13):  at the end of ' +
        "its body, above the note box."
    }
  ],
  parts: [
    ...FOLD_PARTS,
    {
      name: "tools",
      description:
        "At the title's end:  the page's own buttons (the `actions` slot), then the Phases section's state filter, " +
        "its Accept Phases while the phases are agreed, and its gear;  an item section's state filter;  an Overview sub-section's review buttons."
    },
    {
      name: "gear",
      description:
        "The Phases section's gear, last on its title row (epic `epic-engine` I166;  the Files / Verify toggles " +
        'before):  a `<ui-dropdown>` menu, "Show each phase\'s files" and "Show each phase\'s checks", ticked ' +
        "while on.  A pick shows or hides that field in every phase, forgetting each phase's own choice of it."
    },
    {
      name: "stage-button",
      description:
        'Its "Accept Phases" (an `<epic-stage-button>`, epic `epic-engine` I180), the Phases section only, before its gear:  ' +
        'only while the page is reviewed and agrees its phases (`<epic-page stage="phases">`).  A press accepts the ' +
        "phases and every build plan waiting, and sends;  outlined green until the session moves the page on."
    },
    {
      name: "filter",
      description:
        "An item section's state filter:  one chip per state its items are in, with how many, solid while that " +
        "state's items show, outlined while hidden.  The Phases section's the same, by a phase's state, the first " +
        "that holds (epic `epic-engine` I157, I170):  red needs you (a plan to accept, a choice open), orange " +
        "changed since you looked, blue under way (in the blue badge), dotted blue scheduled, green done in the last " +
        "3 days, grey done before."
    },
    {
      name: "hidden-note",
      description: 'Under a filtered list (items or phases):  "3 hidden · show all", an `<epic-hidden-note>`.'
    },
    { name: "empty", description: 'An item section with no items:  "None yet".' },
    ...REVIEW_PARTS,
    {
      name: "new-item",
      description:
        "A Todo, Questions, Issues or Manual tests section's New todo / question / issue / test (an `<epic-new-item>`, epic " +
        "`airplane` P2), at its end:  the button, or the form in its place.  Only while the page is reviewed."
    },
    {
      name: "new-button",
      description:
        "The same sections' comment-dots button, on the title:  opens the section, then that form.  Only while reviewed."
    },
    {
      name: "new-list",
      description: "A Todo or Questions section's new items waiting to be made:  dashed until sent, then outlined."
    },
    {
      name: "start-testing",
      description:
        "The Manual tests section's button on its title (epic `epic-engine` P51), only while the page is reviewed and " +
        'a test is open:  "Start testing · 9" asks Claude to prepare the tests (a request for now:  it checks what it ' +
        'can, writes out the rest), "Preparing tests" while it does, then "Next test · 3 left", which opens the next ' +
        "test you haven't answered.  The address's `?test=1` presses it as the page loads."
    },
    {
      name: "next-epic",
      description:
        "The Manual tests section's link to the next epic with open tests, at its end once every test is answered:  " +
        "only in a run across every epic (`epic test --all`, `?test=1&all=1`)."
    }
  ],
  states: [
    ...FOLD_STATES,
    { name: "tools", description: "Its title has tools:  the Phases gear, or a state filter (items in it)." }
  ],
  texts: [
    ...FOLD_TEXTS,
    { key: "epicsTitle", text: "Epics" },
    { key: "choicesTitle", text: "Choices", description: "The standing option sets' section (P50)." },
    { key: "phasesTitle", text: "Phases" },
    { key: "questionsTitle", text: "Questions" },
    { key: "judgementsTitle", text: "Judgement calls" },
    { key: "todosTitle", text: "Todo" },
    { key: "issuesTitle", text: "Issues" },
    { key: "testsTitle", text: "Manual tests" },
    { key: "logTitle", text: "Log" },
    { key: "noneYet", text: "None yet", description: "An item section with no items." },
    { key: "gearTip", text: "Settings for every phase", description: "The Phases gear's tooltip and name (I166)." },
    {
      key: "showFiles",
      text: "Show each phase's files",
      description: "The Phases gear menu:  every phase's Files field, ticked while shown."
    },
    {
      key: "showVerify",
      text: "Show each phase's checks",
      description: "The Phases gear menu:  every phase's Verify field, ticked while shown."
    },
    {
      key: "addNew",
      text: "New {kind}",
      description: "An item section's comment-dots button on its title:  its name and tooltip."
    },
    {
      key: "startTesting",
      text: "Start testing · {count}",
      description: "The Manual tests section's button on its title (epic `epic-engine` P4):  how many tests are open."
    },
    {
      key: "startTestingTip",
      text:
        "Claude checks the tests it can check itself, writes out exactly what to do for the rest, with a screenshot, " +
        "then the first test opens:  Approve one that passed, write what you saw in its note, the x if it no longer applies",
      description: "Start testing's tooltip (epic `epic-engine` P51)."
    },
    {
      key: "preparingTests",
      text: "Preparing tests",
      description: "The Manual tests section's button while Claude prepares the tests (P51)."
    },
    {
      key: "preparingTip",
      text: "Claude is checking what it can and writing out the rest;  the first test opens when it's done · click to call it off",
      description: "Preparing tests' tooltip."
    },
    {
      key: "waitingTip",
      text: "Asked:  {why} · click to call it off",
      description: "Preparing tests' tooltip while nobody has taken it yet."
    },
    {
      key: "nextTest",
      text: "Next test · {count} left",
      description:
        "The Manual tests section's button once every open test is prepared (P51):  how many he hasn't answered."
    },
    {
      key: "firstTest",
      text: "Go through the tests · {count}",
      description: "The same, every open test answered already:  it opens the first again."
    },
    {
      key: "nextTestTip",
      text: "Open the next test you haven't answered:  Approve if it passed, your note (and a screenshot) if not, the x if it no longer applies",
      description: "Next test's tooltip."
    },
    {
      key: "testsReady",
      text: "Tests ready:  Next test opens the first",
      description: "The notice when the tests are prepared while you type:  the first test doesn't open under you."
    },
    {
      key: "nextEpic",
      text: "Next epic with open tests:  {epic} · {count}",
      description: "The Manual tests section's last line in a run across every epic, once every test is answered."
    },
    {
      key: "noEpicLeft",
      text: "Every epic's tests are answered:  Send hands them to Claude",
      description: "The same, with no other epic left to test."
    },
    ...NEW_KIND_TEXTS,
    ...NEW_LIST_TEXTS
  ],
  children: [
    { tag: "flow", slot: "title", max: 1, description: "A title with markup." },
    ACTIONS_CHILD,
    {
      tag: "epic-updated",
      slot: "changes",
      when: { attribute: "kind", values: ["phases"] },
      description:
        "An OLDER doc's Plan changes (T14, until 2026-10-11):  a copy of each `<epic-updated>` of a phase still to " +
        "do, its phase in `of`.  Never drawn:  each phase draws its own now;  the tool removes them on its next write."
    },
    {
      tag: "flow",
      when: { attribute: "kind", values: ["overview-part", "report"] },
      description: "An Overview sub-section's prose, or a report's."
    },
    {
      tag: "epic-status",
      slot: "status",
      when: { attribute: "kind", values: ["overview-part"] },
      description: "An Overview sub-section's status cards from Claude, oldest first (`plan-doc status`)."
    },
    {
      tag: "epic-choices",
      when: { attribute: "kind", values: ["choices"] },
      description:
        'The Choices section\'s standing sets (epic `epic-engine` P50):  `<epic-choices id="s-<slug>" title standing>`.'
    },
    {
      tag: "flow",
      when: { attribute: "kind", values: ["choices"] },
      description: "The Choices section's notes:  a set's lead, before it (`epic add <epic>#choices --note`)."
    },
    { tag: "epic-phase", when: { attribute: "kind", values: ["phases"] }, description: "The phases, in order." },
    {
      tag: "epic-item",
      when: { attribute: "kind", values: ["questions", "judgements", "todos", "issues", "tests"] },
      description: "The items, their id's letter the section's (`q` in Questions)."
    },
    {
      tag: "epic-event",
      when: { attribute: "kind", values: ["log"] },
      description:
        "The log's review lines (answered, reviewed, active ...), oldest first:  written, never drawn (epic " +
        "`epic-engine` P52, Q56 C);  Actual Time and `epic log` read them."
    },
    {
      tag: "epic-commit",
      when: { attribute: "kind", values: ["log"] },
      description:
        "The Log's entries, one per commit of the epic (`<epic-commit at refs>`), in the file by time, oldest first:  " +
        "drawn newest first."
    },
    {
      tag: "epic-cards",
      when: { attribute: "kind", values: ["epics"] },
      max: 1,
      description: "A saga page's Epics:  the cards of the epics serving the saga, drawn from the page server."
    },
    {
      tag: "flow",
      when: { attribute: "kind", values: ["epics"] },
      description: "A saga page's Epics:  a line or two before the cards, if any."
    }
  ]
} as const satisfies EpicVocabulary
