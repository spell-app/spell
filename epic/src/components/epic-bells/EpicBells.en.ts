/**
 * Every name `<epic-bells>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.  Plain `node` reads it too (`Bells.offLine()`:  a step's title).
 * - Each step's words are under its key in `BellSteps.STEPS`:  `<key>` its title, `<key>Sentence` what it does.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-bells>`
 * Bells & Whistles:  a dialog over an epic page that turns on and off the steps epic work runs by itself.
 ****************/
export const epicBellsVocabulary = {
  tag: "epic-bells",
  topics: ["documentation", "overlays", "dialogs"],
  aka: ["bells and whistles", "token burn", "costly steps", "automatic steps", "switches"],
  noun: "bells",
  ui: false,
  description:
    "Bells & Whistles (epic `epic-engine` P86):  a dialog over an epic page listing the steps epic work runs by " +
    "itself -- reviews by helpers, quick reads, test runs, doc rewrites, merges, waking a chat -- each with an on / off " +
    "switch and its token cost under it, its title and one short line, grouped by what it's for, the costliest first.  In its footer, the Token burn " +
    "slider (Low, Medium, High) turns off for now what isn't worth its cost at that level (a step that uses no tokens always runs);  a switch flipped while it's " +
    "down shows it as Custom.  Saved in the person's own epic settings, one set for every epic.  Drawn by " +
    "`<epic-page>` in its shadow root, opened from its header's gear, never written in a page.",
  attributes: [],
  events: [],
  slots: [],
  parts: [
    { name: "base", description: "The `<ui-modal>`." },
    { name: "burn", description: "The Token burn slider and its line." },
    { name: "group", description: "A group's section." },
    { name: "row", description: "A step's row:  its switch with its cost under it, its title and sentence." },
    { name: "cost", description: "A step's cost badge." }
  ],
  states: [{ name: "open", description: "Showing." }],
  texts: [
    { key: "heading", text: "Bells & Whistles", description: "The dialog's name, and the gear's row." },
    { key: "lede", text: "Steps Claude runs on its own while it works on an epic." },
    { key: "closeTip", text: "Close (Escape)", description: "The close button's tooltip." },
    { key: "cancel", text: "Cancel", description: "Closes it, keeping nothing changed." },
    { key: "save", text: "Save" },
    { key: "burn", text: "Token burn", description: "The slider's name." },
    { key: "low", text: "Low" },
    { key: "medium", text: "Medium" },
    { key: "high", text: "High" },
    { key: "custom", text: "Custom", description: "The slider's word once a switch was flipped while it's down." },
    {
      key: "customLine",
      text: "You changed some switches yourself. Moving the slider resets them to that level.",
      description: "The Custom chip's tooltip."
    },
    {
      key: "heldOff",
      text: "Turned off by the Token burn slider. Move the slider up to turn it back on.",
      description: "A switch's tooltip."
    },
    {
      key: "flipped",
      text: "Changed by you while the slider is down. Moving the slider resets it.",
      description: "A switch's tooltip."
    },
    { key: "costHigh", text: "high" },
    { key: "costMedium", text: "medium" },
    { key: "costLow", text: "low" },
    { key: "costNone", text: "none", description: "A step that uses no Claude tokens, only a little computer time." },
    { key: "costTimesaver", text: "timesaver" },
    {
      key: "costTip",
      text: "Token cost:  about how much of your Claude allowance this step uses",
      description: "The cost badge's tooltip."
    },
    { key: "autoSendNote", text: "Saved only in this browser. The Token burn slider never changes it." },
    {
      key: "servers",
      text: "To turn off the steps that keep your pages running, use the Hands off switch in the Servers tab."
    },
    { key: "loading", text: "Loading your switches…" },
    { key: "unsaved", text: "Not saved:  {why}", description: "A write the page server refused." },
    { key: "planning", text: "Planning" },
    { key: "building", text: "Building" },
    { key: "reviewing", text: "Reviewing" },
    { key: "words", text: "Checking the words" },
    { key: "testing", text: "Testing" },
    { key: "docs", text: "Docs" },
    { key: "adding", text: "Adding work to your project" },
    { key: "tidying", text: "Tidying" },
    { key: "listening", text: "Listening and waking" },
    { key: "background", text: "Background programs" },
    { key: "reuseCheckPlan", text: "Reuse check on the plan" },
    {
      key: "reuseCheckPlanSentence",
      text: "A helper looks for tools the project already has, so the first plan doesn't build them twice."
    },
    { key: "reuseCheckPhases", text: "Reuse check on each phase plan" },
    {
      key: "reuseCheckPhasesSentence",
      text: "A helper checks each step-by-step plan for work the project already has."
    },
    { key: "pageEditHelper", text: "Helper for epic page edits" },
    {
      key: "pageEditHelperSentence",
      text: "A helper makes bigger epic page edits, so the chat stays free to answer you."
    },
    { key: "helpersBuild", text: "Helpers do the building" },
    { key: "helpersBuildSentence", text: "Tasks over a minute go to helpers, so the chat keeps answering you." },
    { key: "restartHelpers", text: "Restart cut-off helpers" },
    {
      key: "restartHelpersSentence",
      text: "If Claude restarts mid-job, it starts the unfinished helpers again, so no work is lost."
    },
    { key: "finalTidy", text: "Final tidy of new code" },
    { key: "finalTidySentence", text: "A helper reads finished code once more, to catch small mistakes." },
    { key: "designReview", text: "Design review" },
    {
      key: "designReviewSentence",
      text: "A helper takes screenshots of changed pages and checks them against your design rules."
    },
    { key: "planCheck", text: "Plan check" },
    {
      key: "planCheckSentence",
      text: "Before a phase is marked done, a helper compares what was built with the plan."
    },
    { key: "alignmentCheck", text: "Alignment check" },
    {
      key: "alignmentCheckSentence",
      text: "After a helper changes a page, it checks that the page's rows and edges line up."
    },
    { key: "handChecksFirst", text: "Claude tries hand checks first" },
    {
      key: "handChecksFirstSentence",
      text: "Claude tries hand checks itself first, so you only get the ones it can't do."
    },
    { key: "titleCheck", text: "Title check" },
    {
      key: "titleCheckSentence",
      text: "A fresh Claude with no background reads each new item's title, and flags one that's unclear."
    },
    { key: "plainWordsCheck", text: "Plain-words check" },
    {
      key: "plainWordsCheckSentence",
      text: "Another Claude flags hard words and long sentences in the messages your product shows."
    },
    { key: "itemScoring", text: "Item scoring" },
    {
      key: "itemScoringSentence",
      text: "Another Claude gives each new item a small label saying how much it matters."
    },
    { key: "changesInBold", text: "Changes in bold" },
    {
      key: "changesInBoldSentence",
      text: "Replies put in bold anything that has moved away from what you last asked for."
    },
    { key: "checksBeforeMerge", text: "Checks before work is added" },
    {
      key: "checksBeforeMergeSentence",
      text: "Before a helper's work is added to your project, its tests run to confirm nothing broke."
    },
    { key: "fullTestRun", text: "Full test run at the end" },
    {
      key: "fullTestRunSentence",
      text: "After the last helper finishes, every test in the project runs (10 to 25 minutes)."
    },
    { key: "speedTest", text: "Speed test" },
    {
      key: "speedTestSentence",
      text: "When Claude changes how Spell understands your writing, it checks it didn't get slower."
    },
    { key: "editorAddOns", text: "Update your editor add-ons" },
    {
      key: "editorAddOnsSentence",
      text: "When Spell's add-ons for your code editor change, Claude rebuilds them for you."
    },
    { key: "editorWarnings", text: "Editor warning check" },
    {
      key: "editorWarningsSentence",
      text: "After new work is added, Claude opens the Spell editor and looks at its warnings."
    },
    { key: "stopStuckTests", text: "Stop stuck test runs" },
    {
      key: "stopStuckTestsSentence",
      text: "Claude stops checks that show no progress for a long time, instead of waiting hours."
    },
    { key: "plainPhaseNotes", text: "Rewrite phase notes in plain words" },
    {
      key: "plainPhaseNotesSentence",
      text: "After each phase, a helper rewrites what changed so it's easy to read later."
    },
    { key: "epicGuide", text: "Write the epic's guide" },
    {
      key: "epicGuideSentence",
      text: "A helper writes a page explaining what the epic built, for people using it later."
    },
    { key: "fixReadmes", text: "Fix the READMEs" },
    {
      key: "fixReadmesSentence",
      text: "Helpers update your project's welcome pages (called READMEs) when new work makes them wrong."
    },
    { key: "checkGuides", text: "Check the guides" },
    {
      key: "checkGuidesSentence",
      text: "Claude finds and fixes broken links and out-of-date pictures in your guides."
    },
    { key: "changelog", text: "Keep the list of changes" },
    {
      key: "changelogSentence",
      text: "Each time work is added, Claude writes a line in the changelog, the list of what changed."
    },
    { key: "mergeEachHelper", text: "Add each helper's work" },
    { key: "mergeEachHelperSentence", text: "A helper's work is added to your project as soon as its checks pass." },
    { key: "mergeMain", text: "Bring in other changes" },
    {
      key: "mergeMainSentence",
      text: "If your project changed meanwhile, Claude combines those changes with the epic's work."
    },
    { key: "remakeBuiltFiles", text: "Remake built files" },
    {
      key: "remakeBuiltFilesSentence",
      text: "Files made from other files are remade after new work is added, never changed by hand."
    },
    { key: "renameOldNames", text: "Update old names" },
    {
      key: "renameOldNamesSentence",
      text: "Claude renames parts of the new work to match the names in the rest of your project."
    },
    { key: "installPackages", text: "Install what new work needs" },
    {
      key: "installPackagesSentence",
      text: "When new work needs libraries (ready-made code from others), Claude installs them."
    },
    { key: "keepOwnEdits", text: "Keep your own edits" },
    {
      key: "keepOwnEditsSentence",
      text: "Before adding work, Claude saves any edits you made by hand, so none are lost."
    },
    { key: "savePages", text: "Save the epic pages" },
    {
      key: "savePagesSentence",
      text: "After each reply, every epic page is saved, so you can go back to an earlier version."
    },
    { key: "clearStuckItems", text: "Clear stuck items" },
    {
      key: "clearStuckItemsSentence",
      text: 'If an item says "in progress" but nothing works on it, Claude moves it back to waiting.'
    },
    { key: "freshHint", text: "Hint to start fresh" },
    {
      key: "freshHintSentence",
      text: "When a chat gets very long, Claude suggests moving to a new one, which costs less."
    },
    { key: "itemRequests", text: "Answer your requests on an item" },
    {
      key: "itemRequestsSentence",
      text: "When you press an item's Add Details or Clarify button, a helper writes the answer."
    },
    { key: "promptAck", text: "Quick reply while busy" },
    {
      key: "promptAckSentence",
      text: "If you write while Claude is busy, it says at once, in one line, that it saw it."
    },
    { key: "autoSend", text: "Auto Send" },
    {
      key: "autoSendSentence",
      text: "Two minutes after you stop editing the page, your changes are sent to Claude, no Send needed."
    },
    { key: "openChat", text: "Open a chat when no one is listening" },
    { key: "openChatSentence", text: "If you press Send and no chat is open for that epic, a new one starts." },
    { key: "wakeQuietChat", text: "Wake a quiet chat" },
    {
      key: "wakeQuietChatSentence",
      text: "If you press Send while that epic's chat is idle, your Send starts it answering."
    },
    { key: "passSendToBusy", text: "Pass a Send to a busy chat" },
    {
      key: "passSendToBusySentence",
      text: "If you press Send while that epic's chat is working, it reads it at its next step."
    },
    { key: "watchAgentNotes", text: "Watch for notes to helpers" },
    {
      key: "watchAgentNotesSentence",
      text: "While helpers work, Claude watches for notes you leave to change what they do."
    },
    { key: "watchSends", text: "Watch for your Sends" },
    { key: "watchSendsSentence", text: "Claude looks for your new messages every 2 seconds, so it answers quickly." },
    { key: "refreshPages", text: "Refresh changed pages" },
    {
      key: "refreshPagesSentence",
      text: "When the code behind a page changes, the page is remade, so you see the change."
    },
    { key: "closeLeftovers", text: "Close leftover programs" },
    {
      key: "closeLeftoversSentence",
      text: "Once an hour, Claude closes programs still running after their work has finished."
    },
    { key: "startNotices", text: "Notices at start" },
    { key: "startNoticesSentence", text: "When a chat starts, it shows short notices about anything you need to know." }
  ],
  children: []
} as const satisfies EpicVocabulary
