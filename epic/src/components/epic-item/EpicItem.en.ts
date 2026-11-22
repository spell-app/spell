/**
 * Every name `<epic-item>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type`, plus data from `epic-review`'s types file and the folds' (`Fold.types.ts`).
 *   - the review controls' parts and button names (`REVIEW_*`):
 *     it draws `<epic-review>`, and its id chip's tooltip names the chosen button
 *   - the `actions` slot every title row shares (`ACTIONS_*`)
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

import { ACTIONS_CHILD, ACTIONS_SLOT_SPEC } from "spell/epic/components/epic-item/Fold.types"
import { REVIEW_NAME_TEXTS, REVIEW_PARTS } from "spell/epic/components/epic-review/EpicReview.types"

/**
 * The BADGES, what happens next said first on an item's or phase's line (`ItemBadge`, epic `epic-engine` P81):
 * each `badge` value's words, as the tables of T144 have them.
 * - never a word glued on:  `SEE {id}` takes the todo's id
 */
export const BADGE_WORDS = {
  underway: "UNDERWAY",
  rechecking: "RECHECKING",
  notInMain: "NOT IN MAIN",
  fixed: "FIXED",
  cantReproduce: "CAN'T REPRODUCE",
  moot: "MOOT",
  duplicate: "DUPLICATE",
  wontFix: "WON'T FIX",
  queued: "QUEUED",
  yourCall: "YOUR CALL",
  willRecheck: "WILL RECHECK",
  willClose: "WILL CLOSE",
  urgent: "URGENT",
  willFix: "WILL FIX",
  againstYourAsk: "AGAINST YOUR ASK",
  decided: "DECIDED",
  done: "DONE",
  willDo: "WILL DO",
  someday: "SOMEDAY",
  wontDo: "WON'T DO",
  failed: "FAILED",
  passed: "PASSED",
  youTest: "YOU TEST",
  optional: "OPTIONAL",
  answered: "ANSWERED",
  see: "SEE {id}",
  yourTurn: "YOUR TURN",
  limit: "LIMIT",
  held: "HELD"
} as const

/** A badge, by its key:  `badge`'s value. */
export type BadgeWord = keyof typeof BADGE_WORDS

/** `BADGE_WORDS` as a vocabulary's texts. */
export const BADGE_TEXTS = Object.entries(BADGE_WORDS).map(([word, text]) => ({
  key: `badge_${word}` as `badge_${BadgeWord}`,
  text,
  description: `The badge \`${word}\`, first on its line (epic \`epic-engine\` P81).`
}))

/** What an item's line may START with on a page without badges (`TitlePrefix`, epic `epic-engine` T143). */
export const TITLE_PREFIX_WORDS = { fixed: "FIXED -" } as const

/****************
 * ### `<epic-item>`
 * One item of an epic page:  a question, judgement call, todo, issue or manual test.
 ****************/
export const epicItemVocabulary = {
  tag: "epic-item",
  topics: ["documentation", "lists", "status"],
  aka: [
    "item",
    "question",
    "decision",
    "judgement call",
    "todo",
    "limit",
    "caveat",
    "issue",
    "test",
    "manual test",
    "ticket"
  ],
  noun: "item",
  ui: false,
  description:
    "One item:  a question, judgement call, todo, issue or manual test -- ONE element for every kind, the kind " +
    "its id's letter (Q11).  Its line (id chip in its state's colour, title, review label, review buttons) and " +
    "note box are drawn;  its details, choices, answer, replies, earlier versions and commits are its children.",
  attributes: [
    {
      name: "id",
      property: "epicId",
      kind: "string",
      required: true,
      format: "item id",
      description:
        "`q7` (question), `j3` (judgement call), `t4` (todo, or a limit), `i2` (issue), `m1` (manual test):  shown as " +
        "`Q7`;  links use it (`#q7`)."
    },
    {
      name: "title",
      property: "epicTitle",
      kind: "string",
      required: "or slot",
      description: "Its line, WITHOUT its id (`Which colour names?`);  an answered question keeps its question's."
    },
    {
      name: "status",
      kind: "enum",
      values: ["open", "decided", "done", "canceled"],
      required: true,
      description:
        "`open`;  `decided` (an answered question:  a decision in force);  `done` (closed:  fixed, passed, " +
        "accepted);  `canceled` (made moot:  struck through)."
    },
    {
      name: "state",
      kind: "enum",
      values: [
        "attention",
        "replied",
        "requested",
        "recheck",
        "progress",
        "handed",
        "open",
        "someday",
        "scheduled",
        "recent",
        "handled",
        "quiet",
        "old"
      ],
      description:
        "Its id chip's colour, written by the script on every edit:  `attention` (red:  needs you), `replied` " +
        "(orange:  your turn to pick or review;  a manual test whose phase isn't done), `requested` (light orange:  what " +
        "you asked for is finished, your turn to see it), `progress` (blue:  Claude is working on it), `handed` (blue " +
        "outlined:  you pressed Do this, Claude hasn't started), `open` (yellow:  still undecided), `scheduled` (dotted " +
        "blue:  queued work, agreed, not started), `recent` (green:  decided or done), `handled` (grey:  its answer is in " +
        "a phase's text now, `handled`;  or an issue Claude found and fixed itself), `quiet` (grey:  a limit:  " +
        "nothing to think about), `old` (grey:  no longer relevant, canceled)."
    },
    {
      name: "handled",
      kind: "string",
      description:
        "HANDLED IN A PHASE (epic `epic-engine` P31):  the phase whose text took its answer (`p-retry-logic`), set " +
        "when a change mark naming it is first stamped there;  grey and quiet, its line linking the phase.  Reopen " +
        "on the mark takes it off."
    },
    {
      name: "taken-in",
      kind: "string",
      description:
        "TAKEN UP IN A PHASE (epic `epic-engine` I128):  the phase that fixed or did it (`p-fix-open-issues`), set " +
        "when an issue or todo is closed while that phase is active, or when a done phase's text links it " +
        "(`PhaseTakes`);  its line links the phase, `in P1`, as `handled` does, but it stays green:  not a state.  " +
        "A FINISHED item (done, canceled, decided) draws no pill for it, its id chip's tooltip naming the phase " +
        "instead (epic `epic-engine` I307)."
    },
    {
      name: "changed",
      kind: "string",
      format: "time",
      description: "When a command last changed its status or review marks (ISO, with offset)."
    },
    {
      name: "phase",
      kind: "string",
      format: "phase number",
      description: "The phase active when it was added, by its number (`3`, `11.1`):  its To review line lists it."
    },
    {
      name: "answered",
      kind: "boolean",
      description: "An answered question:  its details read question, Choices, then the answer."
    },
    { name: "reviewed", kind: "string", format: "date", description: "Gone through with you, that day." },
    {
      name: "review-as",
      kind: "enum",
      values: ["approve", "todo", "revisit", "now", "next", "drop", "skip"],
      description:
        "How your review mark was handled (`now`:  a request for now, done;  `next`, `drop`:  a todo queued into " +
        "the next phase, or dropped;  `skip`:  nothing to do, an older page's note box x):  the record, not drawn on the " +
        "buttons (they clear once handled);  `approve` or `todo` on an open item make it `recent` (green)."
    },
    {
      name: "deferred",
      kind: "string",
      format: "date",
      description: "Put off, that day:  still not reviewed, offered again next review."
    },
    {
      name: "queued",
      kind: "string",
      format: "date",
      description: "A review decided on work, that day, not started yet:  the next review offers it first."
    },
    { name: "work", kind: "string", description: "The queued work, in a few words (`Skip short sections`)." },
    { name: "working", kind: "boolean", description: "Work on it is under way." },
    {
      name: "limit",
      kind: "boolean",
      description:
        "A todo that's a LIMIT to know about, not work (epic `epic-engine` P32, Q16;  a caveat until P44):  drawn " +
        "calmer, and never offered for the next phase;  a todo without it is work still to do."
    },
    {
      name: "bedtime",
      kind: "boolean",
      description: "Changed during a `/bedtime` run, until reviewed (it no longer colours the chip)."
    },
    {
      name: "overnight",
      kind: "boolean",
      description:
        "Made during a `/bedtime` run (the converter:  an old doc's `data-bedtime` item, or one its Overnight report " +
        "linked):  a small bed icon on its line, for good.  The tool sets it on every item added in bedtime mode."
    },
    {
      name: "calm",
      kind: "boolean",
      description:
        "Not urgent:  an open judgement call not reviewed yet is `quiet` (grey), an issue `open` (yellow), not " +
        "`attention` (red).  " +
        "For a call that simply follows WWOD (`plan-doc add ... --calm`);  you flip it by clicking the id chip " +
        "while the page is reviewed (the inbox's `urgency`, applied by `epic inbox apply`)."
    },
    {
      name: "care",
      kind: "number",
      description:
        "JUDGED (epic `epic-engine` P81):  care, 0-100, how likely you are to want it (an issue fixed, a todo built, " +
        "a test worth your time;  a call:  you'd have chosen differently).  With `doubt`, what its badge is worked " +
        "out from.  None:  not judged, so it's drawn as a page without badges draws it."
    },
    {
      name: "doubt",
      kind: "number",
      description:
        "JUDGED (P81):  doubt, 0-100, how likely it's transient, not real, done already or overtaken by later work."
    },
    {
      name: "severe",
      kind: "boolean",
      description:
        "JUDGED (P81):  an issue that blocks work, loses work or gives wrong answers (URGENT);  a judgement call that " +
        "changes or narrows what you said (AGAINST YOUR ASK)."
    },
    {
      name: "needs-you",
      kind: "boolean",
      description: "JUDGED (P81):  only you can decide the issue, OK the todo, or run the test."
    },
    {
      name: "judged",
      kind: "string",
      format: "time",
      description: "When it was judged, or last scored by hand (`epic badges <epic> set`)."
    },
    {
      name: "judged-why",
      kind: "string",
      description: "Why it got that care and doubt, in one line:  its badge's tooltip."
    },
    {
      name: "flagged",
      kind: "boolean",
      description: "You called it urgent from its id chip, on a page with badges:  URGENT, whatever was judged."
    },
    {
      name: "closed-as",
      kind: "enum",
      values: ["vanished", "moot", "duplicate", "declined"],
      description:
        "Why Claude closed it with no fix (`epic badges <epic> close ... --as vanished`):  CAN'T REPRODUCE, MOOT, " +
        "DUPLICATE, or WON'T FIX / WON'T DO."
    },
    {
      name: "badge-closed",
      kind: "boolean",
      description: "Closed by its badge's rule (`epic badges <epic> close`):  `epic badges <epic> off` reopens it."
    },
    {
      name: "badge",
      kind: "string",
      description:
        "Its BADGE, first on its line (P81):  a key of `BADGE_WORDS` (`willFix`, `yourCall` ...), written by the epic " +
        "tool on every edit, with `state`, its colour.  The page follows what's live (an agent on it:  UNDERWAY)."
    },
    {
      name: "badge-item",
      kind: "string",
      format: "item id",
      description: "The item its badge names:  `SEE T38`'s todo."
    },
    {
      name: "requested",
      kind: "boolean",
      description:
        "An issue or todo filed from the person's own words (`epic add ... --requested`, `epic file`, epic " +
        "`epic-engine` P63;  a todo since T88):  fixed (T143) or closed by Claude, it's `requested` (light orange) until they review it, never the grey of a thing " +
        "Claude tripped over."
    },
    {
      name: "urgent",
      kind: "boolean",
      description:
        "A todo that asks you to act (Make Todo's follow-up, epic `epic-engine` I230):  `attention` (red) until " +
        "reviewed, queued or done, as an open issue is.  `calm` (its id chip) makes it yellow.  On a judgement call " +
        "or issue, your Do this (I232):  red until handled, reviewed or not."
    },
    {
      name: "unmerged",
      kind: "string",
      description:
        "An item (done, or a judgement call) whose work is on its epic's branch, not merged into main yet (epic `epic-engine` I273):  the " +
        "branch's name, `editor`.  Written by the epic tool on every edit, from git;  gone once the work lands.  " +
        "A calm judgement call stays blue (`progress`) while its work hasn't landed, yellow once it has."
    },
    {
      name: "fixed",
      kind: "boolean",
      description:
        "A judgement call or issue Claude has fixed (`epic update ... fixed`, epic `epic-engine` I232):  `replied` " +
        "(orange), or `requested` (light orange) from your own words (T143):  your turn to review it;  Accept the fix " +
        "closes it, Revisit (with a note) sends it back."
    },
    {
      name: "self-fixed",
      kind: "boolean",
      description:
        "An issue Claude found and fixed before you got to it (epic `epic-engine` T143):  closed, `handled` (grey) at " +
        "once, its line starting `FIXED - `, nothing for you to press.  Revisit (with a note) or a comment still " +
        "reaches Claude;  your turn on a comment draws it orange.  Never with `requested`."
    },
    {
      name: "failed",
      kind: "string",
      format: "item id",
      description:
        "A test that FAILED in your test run (epic `epic-engine` P4):  the issue it was filed as (`i42`).  It " +
        "stays open;  gone once a run passes it."
    },
    {
      name: "prepared",
      kind: "string",
      format: "place",
      description:
        "A manual test Start testing wrote out for you (epic `epic-engine` P51):  its place in your order, `1` first.  " +
        "Focus mode walks the prepared tests in that order (epic `epic-engine` P57), and once every open test has " +
        "it, the Manual tests section's button is Focus on the tests."
    },
    {
      name: "source",
      kind: "string",
      description:
        "Its details' part file (`parts/q7.html`), loaded into its children the first time it opens (its children " +
        "without a `slot` are a placeholder the part replaces)."
    },
    {
      name: "part-ids",
      kind: "string",
      format: "ids",
      description: "The ids inside its part file (an old `d7` answer):  a link to one loads the body first, then lands."
    },
    { name: "commits", kind: "boolean", description: "Its details list commits (the page's git buttons)." },
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
    {
      name: "open",
      kind: "boolean",
      description:
        "Unfolded:  a click on its line, a link to it (`#q7`, or an id in `part-ids`), find-in-page.  Page state " +
        "only:  the script never writes it, so a doc opens folded."
    }
  ],
  events: [
    {
      name: "ui-opening",
      detail: "{ open: boolean, item: Element, originalEvent?: Event }",
      cancelable: true,
      description:
        "About to unfold:  its line was clicked;  after the fact (not cancelable) for a link or find-in-page.  " +
        "Cancel to stay folded."
    },
    {
      name: "ui-closing",
      detail: "{ open: boolean, item: Element, originalEvent?: Event }",
      cancelable: true,
      description: "About to fold:  its line was clicked.  Cancel to stay open."
    },
    {
      name: "ui-loading",
      detail: "{ source: string }",
      description: "Its `source` part is on its way:  the first unfold, or a live reload."
    },
    {
      name: "ui-loaded",
      detail: "{ source: string, content: string }",
      description: "Its `source` part arrived and is in its children (`content` is the file's text)."
    },
    {
      name: "ui-error",
      detail: "{ kind: 'load' | 'cross-origin' | 'file-protocol' | 'render', source: string, error: unknown }",
      cancelable: true,
      description:
        "Its `source` part couldn't be loaded;  `kind` says why.  A note shows in its details unless cancelled;  " +
        "opening it again tries again."
    }
  ],
  slots: [
    { name: "", description: "Its details." },
    { name: "title", description: "A title with markup, in place of `title`." },
    ACTIONS_SLOT_SPEC,
    {
      name: "status",
      description:
        'Claude\'s status cards (`<epic-status slot="status">`, P13):  drawn last in its details, under your ' +
        "marked note, above the note box."
    }
  ],
  parts: [
    { name: "base", description: "The item." },
    { name: "line", description: "Its line:  fold button, id chip, title, review label, actions;  sticky while open." },
    { name: "toggle", description: "The fold `<button>` (the chevron), on an item with details." },
    {
      name: "id",
      description:
        "The id chip (`Q7`), a link to the item, in its state's colour.  While the page is reviewed, an open " +
        "judgement call's or issue's chip is a button instead:  urgent (red) <-> not urgent (yellow)."
    },
    { name: "title", description: "The title." },
    { name: "title-prefix", description: "The word before the title:  `FIXED -`, on a fix (epic `epic-engine` T143)." },
    { name: "badge", description: "The badge before the title, in the item's colour:  `WILL FIX` (P81)." },
    {
      name: "review",
      description:
        "The review label:  `reviewed 10/6/26`, `deferred`, `to do`.  Not while the page is reviewed:  the review " +
        "buttons' tooltips say it then."
    },
    { name: "overnight", description: "With `overnight`:  the bed icon at the line's end, `made overnight`." },
    {
      name: "failed",
      description:
        'With `failed`:  a red "failed → I42" at its line\'s end, linking the issue the failure was filed as (epic ' +
        "`epic-engine` P4)."
    },
    {
      name: "handled",
      description:
        "With `handled`:  a grey `in P4` under its line's buttons (I348), linking the phase whose text took its answer (epic " +
        "`epic-engine` P31);  with `taken-in` (epic `epic-engine` I128), the same `in P1`, linking the phase that " +
        "has it, while the item is still to finish (I307)."
    },
    {
      name: "done-in",
      description:
        "With `taken-in` on a finished item (done, canceled, decided):  a grey `in P20` under its line's buttons, " +
        "linking the phase it was done in (epic `epic-engine` J231;  `done in P20` beside the buttons until I348)."
    },
    {
      name: "git",
      description:
        "With commits (`commits`, or `<epic-commit>` children):  a git icon at the line's end that shows or hides " +
        "this item's own commits, whatever the page's git toggle says (T17);  pressed while they show.  Its phase " +
        "known (`handled`, `taken-in`, or an open issue or todo's active phase), it's that phase's `in P21` pill " +
        "instead, from the commit on, so Accept the fix changes nothing on the line (epic `epic-engine` I380)."
    },
    {
      name: "actions",
      description:
        "The box at the end of the line:  the `actions` slot (the page's own buttons, the bullhorn), then the git " +
        "icon, the review label and the review buttons."
    },
    { name: "details", description: "Its details:  hidden while folded." },
    {
      name: "clarify",
      description:
        "While reviewed:  the `<epic-clarify icon>`, the (i) last on its line on every kind, which asks Claude to " +
        "clarify it now (T76, T95)."
    },
    { name: "label", description: "`Original question` over an answered question's own text." },
    { name: "error", description: "With `source`:  the line saying the part couldn't be loaded." },
    ...REVIEW_PARTS
  ],
  states: [
    { name: "open", description: "Unfolded." },
    { name: "loaded", description: "With `source`:  the part is in its children." },
    { name: "error", description: "With `source`:  the part couldn't be loaded." },
    { name: "commits", description: "Its own commits show:  its git icon pressed." }
  ],
  texts: [
    { key: "fold", text: "Fold {id}", description: "Accessible name of the fold button while open." },
    { key: "unfold", text: "Unfold {id}", description: "Accessible name of the fold button while folded." },
    {
      key: "showCommits",
      text: "Show this item's commits",
      description: "The git icon's tooltip, its commits hidden."
    },
    { key: "hideCommits", text: "Hide this item's commits", description: "The git icon's tooltip, its commits shown." },
    { key: "originalQuestion", text: "Original question", description: "Over an answered question's own text." },
    { key: "reviewTodo", text: "to do", description: "Review label:  a review decided on work (`queued`)." },
    { key: "reviewDeferred", text: "deferred", description: "Review label:  put off (`deferred`)." },
    { key: "reviewed", text: "reviewed {date}", description: "Review label:  `reviewed 10/6/26`." },
    { key: "stateAttention", text: "Urgent", description: "Id chip tooltip, `state=attention`." },
    {
      key: "stateReplied",
      text: "Answered:  your pick",
      description: "Id chip tooltip, `state=replied`."
    },
    { key: "stateFixed", text: "Fixed:  your review", description: "Id chip tooltip, `fixed`." },
    {
      key: "stateSelfFixed",
      text: "Claude found this and fixed it.\nNothing for you to do.",
      description: "Id chip tooltip, `self-fixed` (epic `epic-engine` T143)."
    },
    { key: "fixed", text: TITLE_PREFIX_WORDS.fixed, description: "A fix's line starts with it (T143)." },
    ...BADGE_TEXTS,
    {
      key: "stateRecheck",
      text: "Claude will check if this is still needed.\nYou don't need to do anything while it checks.",
      description: "Id chip tooltip, `state=recheck` (light orange, epic `epic-engine` P81)."
    },
    {
      key: "stateSomeday",
      text: "Not done yet, and it can wait.\nNothing for you to do now.",
      description: "Id chip tooltip, `state=someday` (light yellow, epic `epic-engine` P81)."
    },
    {
      key: "stateCommentReplied",
      text: "Your comment answered:  ✓ closes it",
      description: "Id chip tooltip, orange for a comment in it Claude answered last (epic `epic-engine` I284)."
    },
    {
      key: "stateRequested",
      text: "Finished as you asked:  take a look",
      description: "Id chip tooltip, `state=requested` (light orange)."
    },
    {
      key: "stateTestWaiting",
      text: "Your test, once its phase is done",
      description: "Id chip tooltip, a manual test while its phase isn't done (orange)."
    },
    {
      key: "stateHanded",
      text: "Waiting for Claude to start",
      description: "Id chip tooltip, `state=handed` (blue outline)."
    },
    {
      key: "stateScheduled",
      text: "Agreed, not started",
      description: "Id chip tooltip, `state=scheduled` (blue dotted)."
    },
    {
      key: "stateQuiet",
      text: "Open, nothing to decide",
      description: "Id chip tooltip, `state=quiet` (grey):  a limit."
    },
    { key: "stateProgress", text: "Claude is working on it", description: "Id chip tooltip, `state=progress`." },
    { key: "stateOpen", text: "Undecided", description: "Id chip tooltip, `state=open`." },
    { key: "stateRecent", text: "Decided or done", description: "Id chip tooltip, `state=recent`." },
    { key: "stateOld", text: "No longer relevant", description: "Id chip tooltip, `state=old`." },
    {
      key: "stateHandled",
      text: "Handled in a phase",
      description: "Id chip tooltip, `state=handled` (epic `epic-engine` P31)."
    },
    {
      key: "handledIn",
      text: "in {phase}",
      description: "Its link to the phase that handled it, took it, or finished it, under its buttons:  `in P4` (I348)."
    },
    {
      key: "donePillTip",
      text: "Go to {phase}",
      description: "A finished item's `in P20` pill's tooltip's second line (epic `epic-engine` J231)."
    },
    {
      key: "handledTip",
      text: "Rewritten into {phase}",
      description: "The phase link's tooltip:  the phase's number and name (`P4 · Retry Logic`)."
    },
    {
      key: "phasePillTip",
      text: "Go to {phase} · ⌥-click:  start it",
      description: "The phase link's tooltip's second line:  what a click and an ⌥-click do (epic `epic-engine` I271)."
    },
    {
      key: "workedTip",
      text: "Worked on in {phase}",
      description:
        "The git icon's `in P21` pill's tooltip on an item still open:  the phase its work is being done in (epic " +
        "`epic-engine` I380)."
    },
    {
      key: "startTip",
      text: "⌥-click:  start {phase}",
      description: "The git icon's `in P21` pill's tooltip's last line, its phase still to finish (I271, I380)."
    },
    {
      key: "takenTip",
      text: "Done in {phase}",
      description: "The phase link's tooltip with `taken-in`:  the phase's number and name (epic `epic-engine` I128)."
    },
    { key: "tipTodo", text: "to do:  {work}", description: "Id chip tooltip:  the queued work." },
    { key: "tipReviewed", text: "reviewed {date}", description: "Id chip tooltip:  reviewed." },
    { key: "tipDeferred", text: "deferred {date}", description: "Id chip tooltip:  deferred." },
    { key: "tipNotReviewed", text: "not reviewed", description: "Id chip tooltip:  open, never reviewed." },
    {
      key: "tipMakeCalm",
      text: "Mark not urgent",
      description: "Id chip tooltip while reviewed, an urgent judgement call or issue:  what a click does."
    },
    {
      key: "tipMakeUrgent",
      text: "Mark urgent",
      description: "Id chip tooltip while reviewed, a judgement call or issue that isn't urgent:  what a click does."
    },
    {
      key: "tipUrgencyUnsent",
      text: "not sent yet",
      description: "Id chip tooltip:  You changed its urgency, not sent yet."
    },
    {
      key: "tipMarkUnsent",
      text: "you chose {chosen} · not sent yet",
      description: "Id chip tooltip:  Your mark (the chosen button, `{chosen}`), not sent:  the chip dashed."
    },
    {
      key: "tipMarkSent",
      text: "you chose {chosen} · sent",
      description: "Id chip tooltip:  Your mark (the chosen button, `{chosen}`), sent:  the chip outlined."
    },
    { key: "tipPick", text: "pick {letter}", description: "Id chip tooltip:  Your pick, as `{chosen}`." },
    {
      key: "failedMark",
      text: "failed → {id}",
      description: "A test that failed in a test run (`failed`):  its line's red mark, linking the issue."
    },
    { key: "failedMarkNone", text: "failed", description: "The same, with no issue named." },
    { key: "madeOvernight", text: "made overnight", description: "The bed icon's tooltip (`overnight`)." },
    { key: "sourceLoadError", text: "Couldn't load {source}.", description: "The part's fetch failed." },
    {
      key: "sourceCrossOrigin",
      text: "Can't load {source}:  only files from this site load.",
      description: "`source` is on another origin."
    },
    {
      key: "sourceFileProtocol",
      text: "Loads from {source} when opened (needs the page server).",
      description: "The page was opened from disk (`file://`):  parts need the page server, as today's docs say."
    },
    {
      key: "sourceRenderError",
      text: "Couldn't show {source}.",
      description: "The part arrived, but couldn't be shown."
    },
    ...REVIEW_NAME_TEXTS
  ],
  children: [
    { tag: "flow", slot: "title", max: 1, description: "A title with markup." },
    ACTIONS_CHILD,
    { tag: "epic-question", max: 1, description: "A question's text as first asked, before the rest of its text." },
    {
      tag: "flow",
      description:
        "Its text:  the question as asked, the call and why, the details;  with the prose elements (`flow`) " +
        "among it:  option cards (`<epic-choices>`, a question's own last, on any kind:  P14), labelled blocks " +
        '(`<epic-field label="Where">`), Net effect, code, asides, notes.'
    },
    { tag: "epic-answer", max: 1, description: "An answered question's answer." },
    {
      tag: "epic-reply",
      description:
        "Your note asking for More Details, kept right before the card that answers it (epic `epic-engine` P27):  " +
        "drawn folded."
    },
    { tag: "epic-more", max: 1, description: "More Details, added after its text." },
    { tag: "epic-reply", description: "Replies, oldest first." },
    {
      tag: "epic-status",
      slot: "status",
      description: "Claude's status cards, oldest first:  one per review mark Claude took (`plan-doc status`)."
    },
    { tag: "epic-original", max: 1, description: "Its earlier text, folded." },
    { tag: "epic-commit", description: "Commits that fixed or built it, oldest first." }
  ],
  childOrder: "listed"
} as const satisfies EpicVocabulary
