/**
 * Every name `<epic-test-run>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "$/epics/definitions"

/****************
 * ### `<epic-test-run>`
 * A TEST RUN (epic `epic-engine` P4):  an epic page's open tests, one at a time, each answered on the page.
 ****************/
export const epicTestRunVocabulary = {
  tag: "epic-test-run",
  topics: ["status", "forms", "navigation"],
  aka: ["test run", "testing", "walkthrough", "start testing", "to test", "hand checks"],
  skeleton: "header, 6 line paragraph",
  noun: "test run",
  ui: false,
  description:
    "A test run (epic `epic-engine` P4):  the open tests of the `<epic-page>` around it, ONE big card at a time -- " +
    "the test's title and id, its Step (with buttons for the pages it says to open), Should, an Example screenshot " +
    "(click to zoom) and If not -- answered Passed, Failed (with a pasted screenshot), Skip or Not now, a comment with any of them, " +
    'each a review mark (`{ action: "test", result }`) in the page\'s inbox.  "4 of 9" and a thin bar say how far ' +
    "along;  Back and Next, the keys P / F / S / N, the arrows and Esc;  a summary card at the end, with Send results.  " +
    "Drawn by `<epic-page>` over its blocks in test mode (the To test section's Start testing, or `?test=1` on the " +
    "page's address);  written in a doc only as an example, inside an `<epic-page>`.  Leaving it (Done testing, " +
    "Esc, the summary's next epic) sends its unsent answers, and the notice line says so.",
  attributes: [
    {
      name: "all",
      kind: "boolean",
      description:
        "The run is one epic of a run across every epic (`epic test --all`, the address's `?test=1&all=1`):  the summary " +
        'card leads on to the next epic with open tests, "Next:  <epic> (n tests)".'
    }
  ],
  events: [
    {
      name: "epic-test-done",
      detail: "{}",
      description:
        'Owen left the run:  Esc, or "Done testing".  `<epic-page>` shows its blocks again;  the run has sent its ' +
        "unsent answers (I52)."
    }
  ],
  slots: [],
  parts: [
    { name: "base", description: "The run:  its head, the progress bar, then the card." },
    { name: "head", description: 'Its head:  "Testing", "4 of 9", and Done testing.' },
    { name: "progress", description: "The thin bar under the head:  how many tests are answered (`<ui-progress>`)." },
    { name: "card", description: "The current test's card, or the summary's." },
    {
      name: "answers",
      description: "The four answers, ONE button group:  Passed (green), Failed (red), Skip (grey), Not now (yellow)."
    },
    {
      name: "comment",
      description:
        "Under the answers on every card:  the comment box (`<epic-text-box>`), saved as typed, going with whichever " +
        "answer is picked."
    },
    {
      name: "failure",
      description: "Under the comment once Failed:  the screenshot's paste and drop area."
    },
    { name: "moves", description: "Back and Next, at the card's foot." },
    {
      name: "summary",
      description: "The summary card:  the counts, the tests commented on, Send results, the next epic."
    }
  ],
  states: [{ name: "summary", description: "The summary card shows:  past the last test." }],
  texts: [
    { key: "run", text: "Test run", description: "The run's region, spoken." },
    { key: "testing", text: "Testing", description: "The head's title." },
    { key: "of", text: "{at} of {total}", description: 'Where the run is:  "4 of 9".' },
    { key: "answered", text: "{count} of {total} answered", description: "The progress bar's name and tooltip." },
    { key: "done", text: "Done testing", description: "The head's button:  leave the run (Esc)." },
    {
      key: "doneTip",
      text: "Leave the run (Esc):  your answers go to Claude",
      description: "Done testing's tooltip:  leaving sends the run's unsent answers (I52)."
    },
    {
      key: "leftSent",
      text: "{count} results sent to Claude",
      description: "The notice line, the run left (Done testing, Esc, Next epic):  its unsent answers sent."
    },
    { key: "leftSentOne", text: "1 result sent to Claude", description: "As `leftSent`, for one answer." },
    {
      key: "leftFailed",
      text: "Couldn't send your answers ({count}):  {error}.  They're kept:  Send in the header sends them",
      description: "The notice line, the run left but its send failed:  the answers wait, Send blue."
    },
    {
      key: "leftNotServed",
      text: "Not sent:  the page isn't served by the page server.  Your answers ({count}) are kept",
      description: "The notice line, the run left while not reviewed (`file://`, no token)."
    },
    {
      key: "noReason",
      text: "the page server didn't answer",
      description: "Why the send failed, when the client couldn't say."
    },
    { key: "step", text: "Step", description: "The card's Step:  what to do." },
    { key: "should", text: "Should", description: "The card's Should:  what should happen." },
    { key: "example", text: "Example", description: "The card's Example:  a screenshot Claude took, or a line." },
    { key: "ifNot", text: "If not", description: "The card's If not:  what to tell Claude." },
    {
      key: "loading",
      text: "Loading the test's details ...",
      description: "The Step while the test's part file loads."
    },
    {
      key: "noDetails",
      text: "This test has no details:  its title is the step.",
      description: "The Step of a test with neither fields nor prose."
    },
    { key: "zoom", text: "Zoom {alt}", description: "An example screenshot, its button's name and tooltip." },
    { key: "openAction", text: "Opens {href}", description: "A Step's action button, its tooltip." },
    { key: "failedBefore", text: "failed before", description: "On the card of a test a run failed before." },
    { key: "deferredOn", text: "not now {date}", description: "On the card of a test put off before." },
    { key: "answers", text: "Your answer", description: "The answers' group, spoken." },
    { key: "passed", text: "Passed", description: "Answer:  it did what it should." },
    { key: "failed", text: "Failed", description: "Answer:  it didn't;  a note and a screenshot follow." },
    { key: "skip", text: "Skip", description: "Answer:  it no longer applies;  Claude closes it." },
    { key: "notnow", text: "Not now", description: "Answer:  can't do it yet;  it stays open, last next run." },
    { key: "passedTip", text: "It did what it should (P)", description: "Passed's tooltip." },
    { key: "failedTip", text: "It didn't:  say what went wrong (F)", description: "Failed's tooltip." },
    { key: "skipTip", text: "It no longer applies:  Claude closes it (S)", description: "Skip's tooltip." },
    { key: "notnowTip", text: "Can't do it yet:  it stays open, last next run (N)", description: "Not now's tooltip." },
    { key: "unsent", text: "not sent yet", description: "A chosen answer's state, before Send." },
    { key: "sent", text: "sent", description: "A chosen answer's state, once sent." },
    {
      key: "notServed",
      text: "Not served by the page server:  answers can't be saved here.",
      description: "Over the answers, while the page isn't reviewed (`file://`, no token)."
    },
    {
      key: "note",
      text: "Comment (optional)",
      description: "Every card's comment box, under the answers:  goes with whichever answer is picked."
    },
    { key: "noteLabel", text: "Your comment on {id}", description: "The comment box, spoken." },
    {
      key: "commentedTitle",
      text: "Your comments",
      description: "The summary's list of the tests commented on, each with its answer."
    },
    { key: "unanswered", text: "not answered", description: "A commented test's answer, in the summary:  none yet." },
    {
      key: "paste",
      text: "Paste a screenshot (⌘V) or drop one here",
      description: "The failure's screenshot area, empty."
    },
    { key: "saving", text: "Saving the screenshot ...", description: "The screenshot area while it uploads." },
    { key: "tooBig", text: "That screenshot is over 8 MB:  crop it first.", description: "A notice:  too big." },
    { key: "notImage", text: "Only an image goes here.", description: "A notice:  something else was dropped." },
    { key: "removeShot", text: "Remove the screenshot", description: "The screenshot's ×." },
    { key: "back", text: "‹ Back", description: "Back to the test before (←)." },
    { key: "next", text: "Next ›", description: "On to the next test, or the summary (→)." },
    { key: "backTip", text: "The test before (←)", description: "Back's tooltip." },
    { key: "nextTip", text: "The next test (→)", description: "Next's tooltip." },
    { key: "summaryTitle", text: "{total} tests gone through", description: "The summary card's title." },
    { key: "countPassed", text: "{count} passed", description: "A summary count." },
    { key: "countFailed", text: "{count} failed", description: "A summary count." },
    { key: "countSkip", text: "{count} skipped", description: "A summary count." },
    { key: "countNotnow", text: "{count} not now", description: "A summary count." },
    { key: "countOpen", text: "{count} not answered", description: "A summary count." },
    {
      key: "summaryWhat",
      text:
        "Send results hands your answers to Claude (Done testing does too):  passed tests close, each failure becomes " +
        "an issue with your note and screenshot, skipped ones are canceled, not now stays open for the next run.",
      description: "The summary card's line on what Send does."
    },
    { key: "send", text: "Send results", description: "The summary card's Send." },
    { key: "sentAll", text: "Results sent", description: "The summary card's Send, once every answer has gone." },
    {
      key: "nextEpic",
      text: "Next:  {epic} ({count} tests)",
      description: "The summary card's link to the next epic with open tests (`epic test --all`)."
    },
    { key: "noTests", text: "No open tests:  nothing to run.", description: "The card of a run with no tests." }
  ],
  children: []
} as const satisfies EpicVocabulary
