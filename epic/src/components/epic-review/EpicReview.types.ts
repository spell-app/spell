/**
 * Loose types and constants of the `epic-review` family:  the review controls (P9), drawn by `<epic-item>`,
 * an Overview `<epic-section>`, `<epic-phase>` and `<epic-summary>`.
 * - Data only:  nothing here runs.  The vocabularies of the families that draw `<epic-review>` read it too.
 */

import type { EpicJSXAttributes } from "spell-epic/components/epic-page/EpicPage.types"

import type { epicReviewVocabulary } from "./EpicReview.en"

/** `epicReviewVocabulary`'s type. */
export type EpicReviewVocabulary = typeof epicReviewVocabulary

////////////////
// ## What it draws
////////////////

/**
 * What an `<epic-review>` draws (`shows`), where its element puts it:
 * - `buttons`:  the controls at the end of a line or title
 * - `note`:  the note box
 * - `said`:  a marked note, its box closed
 */
export const REVIEW_SHOWS = ["buttons", "note", "said"] as const

/** One of `REVIEW_SHOWS`. */
export type ReviewShows = (typeof REVIEW_SHOWS)[number]

/**
 * Whose controls (`buttons`), which picks the buttons:
 * - `item`:  an item's four (`REVIEW_BUTTONS`), the note box's two (`NOTE_BUTTONS`)
 * - `todo`:  a todo's three (`TODO_BUTTONS`), and its note box's (`TODO_NOTE_BUTTONS`)
 * - `part`:  a part of the plan -- an Overview sub-section, a phase, the summary:  no Approve (`PART_BUTTONS`)
 * - `thread`:  a comment thread's, while it's Owen's turn (`<epic-thread>`, epic `epic-engine` P3):
 *   That's good, Reply, Skip it (`THREAD_BUTTONS`);  no note box, no inbox
 * - `closed`:  a closed thread's Reopen (`CLOSED_BUTTONS`)
 * - `proposal`:  an open phase while the page's phases are agreed (`<epic-page stage="phases">`, epic `epic-engine`
 *   P29):  Looks good and Defer (`PROPOSAL_BUTTONS`);  its note box a part's
 * - `plan`:  a phase whose build plan waits for Owen (`<epic-phase plan="waiting">`, P33):  Accept plan and Revisit
 *   (`PLAN_BUTTONS`);  its note box a part's
 * - `change`:  a change mark's (`<epic-change>`, epic `epic-engine` P30):  Reopen (`CHANGE_BUTTONS`);
 *   no note box
 */
export const REVIEW_KINDS = ["item", "todo", "part", "thread", "closed", "proposal", "change", "plan"] as const

/** One of `REVIEW_KINDS`. */
export type ReviewKind = (typeof REVIEW_KINDS)[number]

////////////////
// ## Buttons
////////////////

/**
 * The colours of the review controls (decision Q20 of epic `epic-components`, Owen, 2026-10-08):
 * - green:  decided or done (Approve, Make Todo, a pick;  a todo's plane, do it in the next phase)
 * - blue:  do it now, or Claude is on it (Revisit, Do Now)
 * - grey:  no longer relevant (a todo's x, drop it;  every other note box's x, skip this:  Owen, 2026-10-09)
 */
export type ReviewColor = "green" | "blue" | "grey"

/**
 * How far a review button's mark has got:  its FILL (decision Q20).
 * The review buttons are Owen's INPUT (Owen, 2026-10-08):  the id chip carries the result.
 * - `none`:  a grey outline, available
 *   - also once Claude has handled the mark:
 *     the buttons CLEAR, and the id chip shows the result (green decided, yellow open, red needs Owen)
 * - `dashed`:  dashed in its colour:  Owen pressed it, not committed (not sent;  a Do Now not taken yet)
 * - `outline`:  outlined in its colour:  recorded (sent;  a Do Now taken), not done yet, or in progress
 * - never solid:  solid is the chips' (and the Choose pill's, once applied)
 */
export type ReviewFill = "none" | "dashed" | "outline"

/** One review button:  its action, colour, icon, and its name and tooltip texts. */
export type ReviewButtonSpec = {
  /**
   * what it does (`ReviewClient.press()`;  `details` is Do Now, the inbox's name for an immediate request;
   * `next` and `drop` a todo's plane and x)
   */
  action: "approve" | "todo" | "revisit" | "details" | "next" | "drop" | "defer" | "accept" | "reopen"
  /** its colour once pressed:  green decided, blue an ask of Claude (Q20), grey no longer relevant */
  color: ReviewColor
  /** its `ui-icon` */
  icon: string
  /** its name:  the plain tooltip */
  label:
    | "approve"
    | "todo"
    | "revisit"
    | "doNow"
    | "next"
    | "revisitNote"
    | "drop"
    | "looksGood"
    | "defer"
    | "reopenChange"
    | "acceptPlan"
    | "deferPhase"
  /** what it does, for a screen reader */
  tip:
    | "approveTip"
    | "todoTip"
    | "revisitTip"
    | "doNowTip"
    | "nextTip"
    | "revisitNoteTip"
    | "dropTip"
    | "looksGoodTip"
    | "deferTip"
    | "reopenChangeTip"
    | "acceptPlanTip"
}

/**
 * The line's four review buttons, in their order (decision Q20):
 * - Approve, Revisit, Make Todo (the GROUP:  what Owen makes of it)
 * - then Do Now apart, with the magic wand (the page header's Review Now had it too, until epic `epic-engine` P20)
 *   - Owen, 2026-10-09:  it was a paper plane, which a todo's "next phase" button wears now
 *   - an action, not a state:  it replaces Add Details Now and the note box's Do Now
 * - Every one shows at every step:  a mark done can still be followed by another.
 */
export const REVIEW_BUTTONS: readonly ReviewButtonSpec[] = [
  { action: "approve", color: "green", icon: "check", label: "approve", tip: "approveTip" },
  { action: "revisit", color: "blue", icon: "history", label: "revisit", tip: "revisitTip" },
  { action: "todo", color: "green", icon: "list check", label: "todo", tip: "todoTip" },
  { action: "details", color: "blue", icon: "wand magic sparkles", label: "doNow", tip: "doNowTip" }
]

/**
 * A TODO's review buttons (Owen, 2026-10-09), one group, in this order:
 * - the plane (`next`, green:  decided):  do it in the next phase;
 *   `inbox apply` queues it into the first phase still to do
 * - Revisit (blue):  Owen is adding a note for Claude, in the box
 * - the x (`drop`, grey:  no longer relevant):  drop it;  `inbox apply` cancels it
 * - no Approve, Make Todo or Do Now:  a todo is already the follow-up
 */
export const TODO_BUTTONS: readonly ReviewButtonSpec[] = [
  { action: "next", color: "green", icon: "paper plane", label: "next", tip: "nextTip" },
  { action: "revisit", color: "blue", icon: "history", label: "revisitNote", tip: "revisitNoteTip" },
  { action: "drop", color: "grey", icon: "xmark", label: "drop", tip: "dropTip" }
]

/**
 * A part of the plan's review buttons -- an Overview sub-section's (decision Q14), a phase's, the summary's:
 * Revisit, Make Todo, Do Now -- notes on the plan's parts, not sign-off, so no Approve.
 */
export const PART_BUTTONS: readonly ReviewButtonSpec[] = REVIEW_BUTTONS.filter((spec) => spec.action !== "approve")

/**
 * An open phase's review buttons while the page's phases are agreed (`<epic-page stage="phases">`, epic `epic-engine`
 * P29;  Owen, 2026-10-24:  "when in 'approval' mode like this, these buttons were 'looks good' and 'defer'"):
 * - Looks good (`approve`, green:  decided):  the phase stands as written;  `inbox apply` notes it
 * - Defer (`defer`, grey:  not now):  the phase after the others, still to do;  `inbox apply` moves it
 * - the usual part buttons (`PART_BUTTONS`) come back once building starts
 */
export const PROPOSAL_BUTTONS: readonly ReviewButtonSpec[] = [
  { action: "approve", color: "green", icon: "thumbs up", label: "looksGood", tip: "looksGoodTip" },
  { action: "defer", color: "grey", icon: "clock", label: "defer", tip: "deferTip" }
]

/**
 * A phase's buttons while Claude's build plan for it waits (`<epic-phase plan="waiting">`, epic `epic-engine` P33):
 * - Accept plan (`approve`, green):  the build may start;  `inbox apply` marks the plan accepted, and Claude builds
 * - Revisit (`revisit`, blue):  notes on the plan, for Claude to rewrite it
 */
export const PLAN_BUTTONS: readonly ReviewButtonSpec[] = [
  { action: "approve", color: "green", icon: "circle check", label: "acceptPlan", tip: "acceptPlanTip" },
  // Owen, 2026-10-25:  "Add a 'Defer Phase' button next to 'Accept Phase'":  after the other phases, still to do
  { action: "defer", color: "grey", icon: "clock", label: "deferPhase", tip: "deferTip" },
  { action: "revisit", color: "blue", icon: "history", label: "revisit", tip: "revisitTip" }
]

/**
 * A change mark's button (`<epic-change>`, epic `epic-engine` P30;  Q13, B), in a tooltip on its words while it's new:
 * - Reopen (`reopen`, blue:  an ask of Claude):  its question opens again;  `inbox apply` reopens it
 * - no Accept (Owen, 2026-10-25:  "i shouldn't have to approve those -- I already answered the question")
 */
export const CHANGE_BUTTONS: readonly ReviewButtonSpec[] = [
  { action: "reopen", color: "blue", icon: "history", label: "reopenChange", tip: "reopenChangeTip" }
]

/** The line's buttons of each `buttons`:  none of the review inbox's for a thread's (`THREAD_BUTTONS_OF`). */
export const BUTTONS_OF: Readonly<Record<ReviewKind, readonly ReviewButtonSpec[]>> = {
  item: REVIEW_BUTTONS,
  todo: TODO_BUTTONS,
  part: PART_BUTTONS,
  thread: [],
  closed: [],
  proposal: PROPOSAL_BUTTONS,
  change: CHANGE_BUTTONS,
  plan: PLAN_BUTTONS
}

/**
 * A comment THREAD's answer buttons (`buttons="thread"` or `"closed"`;  epic `epic-engine` P3):
 * the line's group, same look, same colours, but no inbox behind them.
 * - Owen, 2026-10-10:  "Make top buttons same semantics/look as pills in item header"
 * - a press only says which (`THREAD_ANSWER`):  the comments' code (`spell-doc-comments.js`) acts on it
 * - always a grey outline on the page's ground, each in its colour under the pointer
 * - a press acts at once:  the thread closes, or the cursor goes into its reply box
 */
export type ThreadButtonSpec = {
  /** what Owen answers:  `good` / `skip` close the thread, `reply` goes to its reply box, `reopen` opens it again */
  act: ThreadAct
  color: ReviewColor
  /** its `ui-icon` */
  icon: string
  /** its name, then its tooltip (`title`) */
  label: "threadGood" | "threadReply" | "threadSkip" | "threadReopen"
  title: "threadGoodTitle" | "threadReplyTitle" | "threadSkipTitle" | "threadReopenTitle"
  /** what it does, for a screen reader */
  tip: "threadGoodTip" | "threadReplyTip" | "threadSkipTip" | "threadReopenTip"
}

/** What a thread's answer button answers (`ThreadButtonSpec.act`). */
export type ThreadAct = "good" | "reply" | "skip" | "reopen"

/**
 * While it's Owen's turn:
 * - Approve's check (green, decided):  "that's good" -- done, it folds
 * - Revisit's history (blue, an ask of Claude):  reply -- the cursor into the box under the messages
 * - the note box's x (grey, no longer relevant):  "skip it" -- done, nothing more to do
 */
export const THREAD_BUTTONS: readonly ThreadButtonSpec[] = [
  { act: "good", color: "green", icon: "check", label: "threadGood", title: "threadGoodTitle", tip: "threadGoodTip" },
  {
    act: "reply",
    color: "blue",
    icon: "history",
    label: "threadReply",
    title: "threadReplyTitle",
    tip: "threadReplyTip"
  },
  { act: "skip", color: "grey", icon: "xmark", label: "threadSkip", title: "threadSkipTitle", tip: "threadSkipTip" }
]

/** A closed thread's one button:  open it again (the toast's Undo does the same). */
export const CLOSED_BUTTONS: readonly ThreadButtonSpec[] = [
  {
    act: "reopen",
    color: "blue",
    icon: "rotate left",
    label: "threadReopen",
    title: "threadReopenTitle",
    tip: "threadReopenTip"
  }
]

/** A thread's answer buttons, by `buttons`;  none for the review kinds. */
export const THREAD_BUTTONS_OF: Readonly<Partial<Record<ReviewKind, readonly ThreadButtonSpec[]>>> = {
  thread: THREAD_BUTTONS,
  closed: CLOSED_BUTTONS
}

/** One note box button:  what it makes of the note (`how`), its colour, icon, name and tooltip. */
export type NoteButtonSpec = {
  /** the mark it makes of the note (`ReviewClient.useNote()`) */
  how: "soon" | "next" | "drop" | "skip"
  color: ReviewColor
  icon: string
  label: "boxSoon" | "boxNext" | "boxDrop" | "boxSkip"
  tip: "boxSoonTip" | "boxNextTip" | "boxDropTip" | "boxSkipTip"
}

/**
 * The note box's buttons:  Revisit Later (queued for the next send), then the x, Skip This
 * (Owen, 2026-10-09, in place of Make Todo, which he never used there:  the line keeps its Make Todo).
 * - Revisit Later wears the line's Revisit icon:  both end in the same mark, a revisit
 * - the x (`skip`, grey:  no longer relevant):  nothing to do here;
 *   `inbox apply` marks it reviewed and keeps a typed note as Owen's reply
 * - every box but a todo's (below):  an item's, an Overview section's, a phase's, the summary's
 * - no Do Now here any more (Q20):  the line's Do Now takes the note in the box with it
 */
export const NOTE_BUTTONS: readonly NoteButtonSpec[] = [
  { how: "soon", color: "blue", icon: "history", label: "boxSoon", tip: "boxSoonTip" },
  { how: "skip", color: "grey", icon: "xmark", label: "boxSkip", tip: "boxSkipTip" }
]

/**
 * A TODO's note box buttons, in its line's order
 * (Owen, 2026-10-09:  "the icons next to the field", the plane and the x, to match the line):
 * - the plane:  do it in the next phase, with this note
 * - Revisit Later:  just the note, for Claude (the line's Revisit:  "I'm adding text for you")
 * - the x:  drop it, the note saying why
 *   (every other box's x is Skip This:  on a todo, skipping it IS dropping it)
 */
export const TODO_NOTE_BUTTONS: readonly NoteButtonSpec[] = [
  { how: "next", color: "green", icon: "paper plane", label: "boxNext", tip: "boxNextTip" },
  { how: "soon", color: "blue", icon: "history", label: "boxSoon", tip: "boxSoonTip" },
  { how: "drop", color: "grey", icon: "xmark", label: "boxDrop", tip: "boxDropTip" }
]

/** A note box button's `how`. */
export type NoteHow = NoteButtonSpec["how"]

/** The note box's buttons of each `buttons`:  a todo's, else every other box's. */
export const NOTE_BUTTONS_OF: Readonly<Record<ReviewKind, readonly NoteButtonSpec[]>> = {
  item: NOTE_BUTTONS,
  todo: TODO_NOTE_BUTTONS,
  part: NOTE_BUTTONS,
  thread: [],
  closed: [],
  proposal: NOTE_BUTTONS,
  change: [],
  plan: NOTE_BUTTONS
}

////////////////
// ## "do it"
////////////////

/**
 * What Revisit puts in an EMPTY note box on a judgement call or a todo (`DO_IT_ID`), as if Owen had typed it
 * (Owen, 2026-10-19:  "When I press the 'review' button in a Judgement call or todo, I generally want you to just do
 * it ... I'll update the text if I mean something else").
 * - selected, so his first key replaces it;  saved as the draft at once, as typed words are
 * - Claude's side (the epic skill, 7.3):  a revisit note "do it" means do it, no question back
 * - never translated:  it's Owen's words to Claude, which Claude reads
 */
export const DO_IT_NOTE = "do it"

/**
 * The items whose empty note box Revisit fills with `DO_IT_NOTE`:  judgement calls and caveats (`j3`, `c5`);
 * a caveat only when it's work, not a `limit` (epic `epic-engine` P32:  todos were `t5`).
 */
export const DO_IT_ID = /^[jc]\d+$/i

////////////////
// ## Shadow markup
////////////////

/** Class names inside the shadow root (`EpicReview.css`). */
export const REVIEW_CONTROLS = "review-controls"
export const REVIEW_GROUP = "review-group"
export const REVIEW_DO_NOW = "review-do-now"
/** A waiting plan's Accept plan:  a worded pill of its own (epic `epic-engine` I118). */
export const REVIEW_ACCEPT = "review-accept"
/** ... and Defer Phase beside it:  the same pill, quiet. */
export const REVIEW_DEFER = "review-defer"
export const REVIEW_NOTED = "review-noted"
export const REVIEW_PICK = "review-pick"
export const NOTE_BOX = "note-box"
export const NOTE_TEXT = "note-text"
export const NOTE_INPUT = "note-input"
export const NOTE_SAVED = "note-saved"
export const NOTE_ACTIONS = "note-actions"
export const SAID = "said"
export const SAID_WHAT = "said-what"
export const SAID_EDIT = "said-edit"
export const SAID_NOTE = "said-note"

/** The tag of the page the review controls mark as being reviewed (its `reviewing` attribute). */
export const PAGE_TAG = "epic-page"

/** `<epic-page>`'s attribute while the page is being reviewed:  `body.plan-reviewing`'s heir. */
export const REVIEWING = "reviewing"

/**
 * The event an `<epic-review>` sends to take the reader to its note box (Revisit, Edit):
 * the family that draws it unfolds to show the box (`EpicReview.takeToNote()`).
 */
export const SHOW_NOTE = "epic-show-note"

/**
 * The event an `<epic-review>` sends once Owen chose an action with it:
 * `<epic-item>` folds, so Owen moves on to the next (Owen, 2026-10-10).
 * - sent by a note box button
 * - and by a review button that chose one (`ReviewClient.press()` answering `"chosen"`),
 *   not one that cleared a mark or called a request off
 */
export const CHOSEN = "epic-chosen"

/**
 * The event a thread's answer button sends (`buttons="thread"` / `"closed"`):  `{ act }`, which one (`ThreadAct`).
 * - It crosses shadow roots:  the comments' code hears it on the `<epic-thread>` that draws it.
 */
export const THREAD_ANSWER = "epic-thread-answer"

////////////////
// ## In the vocabularies
////////////////

/**
 * The parts a family gives the `<epic-review>` elements it draws (`part="review-buttons"` ...):
 * in every vocabulary that draws them.
 */
export const REVIEW_PARTS = [
  {
    name: "review-buttons",
    description:
      "The review buttons (P9, an `<epic-review>`):  the note bubble, a pick's letter, Approve / Revisit / Make " +
      "Todo, then Do Now (the wand);  a todo's:  the plane (next phase), Revisit, the x (drop).  " +
      "Only while the page is reviewed (served by the page server, its inbox answering)."
  },
  {
    name: "note-box",
    description:
      "The note box (an `<epic-review>`):  the note, then Revisit Later and the x (skip this);  a todo's:  the plane, " +
      "Revisit Later, the x (drop it)."
  },
  {
    name: "said",
    description: "A note marked and closed (an `<epic-review>`):  `You · revisit soon · sent 10:42`, the note, Edit."
  }
] as const

/**
 * The buttons' names:  `<epic-review>`'s, and `<epic-item>`'s too, whose id chip's tooltip names the chosen one
 * (`you chose Approve · sent`).
 */
export const REVIEW_NAME_TEXTS = [
  { key: "approve", text: "Approve", description: "Review button:  its name." },
  {
    key: "todo",
    text: "Make Caveat",
    description: "Review button:  its name (a todo, before epic `epic-engine` P32)."
  },
  { key: "revisit", text: "Revisit", description: "Review button:  its name." },
  { key: "doNow", text: "Do Now", description: "Review button:  its name." },
  { key: "next", text: "Do it in the next phase", description: "A todo's review button (the plane):  its name." },
  {
    key: "revisitNote",
    text: "Revisit:  I'm adding a note for you",
    description: "A todo's review button:  Revisit's name."
  },
  { key: "drop", text: "Drop it", description: "A todo's review button (the x):  its name." },
  { key: "looksGood", text: "Looks good", description: "A phase's review button while the phases are agreed." },
  {
    key: "acceptPlan",
    text: "Accept Phase",
    description:
      "A phase's review button while Claude's build plan waits (Owen, 2026-10-25:  \"In the phase, the button should be Accept Phase\";  the header's says Accept plan)."
  },
  {
    key: "acceptPlanTip",
    text: "Claude's plan for this phase is good:  build it",
    description: "What Accept plan does."
  },
  {
    key: "deferPhase",
    text: "Defer Phase",
    description: "A phase's worded button while its build plan waits, beside Accept Phase:  build it after the others."
  },
  { key: "defer", text: "Defer", description: "A phase's review button while the phases are agreed:  its name." },
  { key: "reopenChange", text: "Reopen", description: "A change mark's button (the history):  its name." },
  { key: "boxSkip", text: "Skip this", description: "Note box button (the x):  its name." }
] as const

/** The rest of `<epic-review>`'s texts. */
export const REVIEW_TEXTS = [
  { key: "reviewControls", text: "Review {id}", description: "The review buttons' group, for a screen reader." },
  { key: "approveTip", text: "Fine as it is", description: "Review button:  what Approve does." },
  {
    key: "todoTip",
    text: "Follow it up later, as a caveat:  work still to do",
    description: "Review button:  what Make Caveat does."
  },
  { key: "revisitTip", text: "Talk it over:  write in the box at its end", description: "Review button:  Revisit." },
  {
    key: "doNowTip",
    text: "Claude takes it at once:  answers the note in its box, or adds details",
    description: "Review button:  what Do Now does."
  },
  {
    key: "nextTip",
    text: "Queued into the next phase still to do, once Claude applies it",
    description: "A todo's review button:  what the plane does."
  },
  {
    key: "revisitNoteTip",
    text: "Write a note for Claude in the box at its end",
    description: "A todo's review button:  what Revisit does."
  },
  {
    key: "dropTip",
    text: "Canceled, struck through, once Claude applies it",
    description: "A todo's review button:  what the x does."
  },
  {
    key: "looksGoodTip",
    text: "The phase stands as written",
    description: "A phase's review button while the phases are agreed:  what Looks good does."
  },
  {
    key: "deferTip",
    text: "Later:  after the other phases, still to do, once Claude applies it",
    description: "A phase's review button while the phases are agreed:  what Defer does."
  },
  {
    key: "reopenChangeTip",
    text: "Talk the question over again:  it opens for you to answer",
    description: "A change mark's button:  what Reopen does."
  },
  {
    key: "waiting",
    text: "waiting for a session:  {why}",
    description: "A request queued with nobody listening;  `why`:  what the wake did, or that nobody is reviewing."
  },
  { key: "asked", text: "asked · waiting for Claude to take it", description: "A Do Now not taken yet." },
  { key: "working", text: "Claude is on it · click to call it off", description: "A button whose work is under way." },
  { key: "callOff", text: "{label}:  click to call it off", description: "A spinning button's tooltip." },
  { key: "buttonTip", text: "{label}:  {what}", description: "A review button's tooltip:  its name, what it does." },
  { key: "chosenSent", text: "sent · click to clear", description: "A chosen button, its mark sent." },
  { key: "chosenUnsent", text: "not sent yet · click to clear", description: "A chosen button, its mark not sent." },
  { key: "pickedSent", text: "Picked {letter} · sent", description: "The pick's letter, sent." },
  { key: "pickedUnsent", text: "Picked {letter} · not sent yet", description: "The pick's letter, not sent." },
  { key: "noteDraft", text: "Your note, not sent yet (saved):  {note}", description: "The note bubble:  a draft." },
  { key: "noteSent", text: "Your note, sent:  {note}", description: "The note bubble:  a mark's note, sent." },
  { key: "noteUnsent", text: "Your note, not sent yet:  {note}", description: "The note bubble:  a mark's note." },
  { key: "notePlaceholder", text: "Your note:  a question, instructions, why", description: "The empty note box." },
  { key: "noteLabel", text: "{id}:  your note", description: "The note box, for a screen reader." },
  { key: "boxSoon", text: "Revisit Later", description: "Note box button:  its name." },
  { key: "boxSoonTip", text: "Revisit Later:  talk it over in the next batch", description: "Note box:  Later." },
  { key: "boxNext", text: "Do it in the next phase", description: "A todo's note box button (the plane):  its name." },
  {
    key: "boxNextTip",
    text: "Do it in the next phase, with this note",
    description: "A todo's note box:  the plane."
  },
  { key: "boxDrop", text: "Drop it", description: "A todo's note box button (the x):  its name." },
  { key: "boxDropTip", text: "Drop it:  this note says why", description: "A todo's note box:  the x." },
  {
    key: "boxSkipTip",
    text: "Skip this:  nothing to do, marked reviewed once Claude applies it;  a note here says why",
    description: "Note box:  the x."
  },
  { key: "saved", text: "Saved {time}", description: "The note box's floppy:  its draft is saved." },
  { key: "notSaved", text: "Not saved:  {why} (kept in this browser)", description: "The floppy, red:  not saved." },
  { key: "you", text: "You", description: "Who wrote a marked note." },
  { key: "howSoon", text: "revisit soon", description: "A marked note's kind." },
  { key: "howNow", text: "revisit now", description: "A marked note's kind." },
  { key: "howTodo", text: "caveat", description: "A marked note's kind." },
  { key: "howNext", text: "next phase", description: "A marked note's kind:  a todo's plane." },
  { key: "howDrop", text: "drop", description: "A marked note's kind:  a todo's x." },
  { key: "howSkip", text: "skip", description: "A marked note's kind:  the note box's x." },
  { key: "saidSent", text: "{how} · sent {time}", description: "A marked note:  sent." },
  { key: "saidUnsent", text: "{how} · not sent yet", description: "A marked note:  not sent." },
  { key: "edit", text: "Edit", description: "A marked note's button:  back into the note box." },
  { key: "threadAnswer", text: "Your answer", description: "A thread's answer buttons, for a screen reader." },
  { key: "threadGood", text: "That's good", description: "A thread's check:  its name." },
  { key: "threadGoodTitle", text: "That's good:  done", description: "A thread's check:  its tooltip." },
  { key: "threadGoodTip", text: "done:  the thread folds, green", description: "A thread's check:  what it does." },
  { key: "threadReply", text: "Reply", description: "A thread's Reply:  its name." },
  { key: "threadReplyTitle", text: "Reply", description: "A thread's Reply:  its tooltip." },
  {
    key: "threadReplyTip",
    text: "the cursor into the box under the thread, saved as you type;  Claude takes it up",
    description: "A thread's Reply:  what it does."
  },
  { key: "threadSkip", text: "Skip it", description: "A thread's x:  its name." },
  { key: "threadSkipTitle", text: "Skip it:  done, nothing more to do", description: "A thread's x:  its tooltip." },
  { key: "threadSkipTip", text: "done, nothing more to do", description: "A thread's x:  what it does." },
  { key: "threadReopen", text: "Reopen", description: "A closed thread's button:  its name." },
  {
    key: "threadReopenTitle",
    text: "Reopen:  your turn on it again",
    description: "A closed thread's button:  its tooltip."
  },
  { key: "threadReopenTip", text: "your turn on it again", description: "A closed thread's button:  what it does." },
  { key: "editTip", text: "Edit:  put your note back in the box", description: "A marked note's button:  tooltip." }
] as const

// the tags the review controls draw, and its own (drawn by the families it belongs to)
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      "epic-review": EpicJSXAttributes
    }
  }
}
