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
    "switch, its title, one plain sentence and its token cost, grouped by what it's for.  At the top, the Token burn " +
    "slider (Low, Medium, High) turns off for now what isn't worth its cost at that level;  a switch flipped while it's " +
    "down shows it as Custom.  Saved in the person's own epic settings, one set for every epic.  Drawn by " +
    "`<epic-page>` in its shadow root, opened from its header's gear, never written in a page.",
  attributes: [],
  events: [],
  slots: [],
  parts: [
    { name: "base", description: "The `<ui-modal>`." },
    { name: "burn", description: "The Token burn slider and its line." },
    { name: "group", description: "A group's section." },
    { name: "row", description: "A step's row:  its switch, title, sentence and cost." },
    { name: "cost", description: "A step's cost badge." }
  ],
  states: [{ name: "open", description: "Showing." }],
  texts: [
    { key: "heading", text: "Bells & Whistles", description: "The dialog's name, and the gear's row." },
    { key: "lede", text: "Steps Claude runs on its own while it works on an epic. Turn off the ones you don't want." },
    { key: "closeTip", text: "Close (Escape)", description: "The close button's tooltip." },
    { key: "cancel", text: "Cancel", description: "Closes it, keeping nothing changed." },
    { key: "save", text: "Save" },
    { key: "burn", text: "Token burn", description: "The slider's name." },
    { key: "low", text: "Low" },
    { key: "medium", text: "Medium" },
    { key: "high", text: "High" },
    { key: "custom", text: "Custom", description: "The slider's word once a switch was flipped while it's down." },
    {
      key: "lowLine",
      text: "Spends as little of your Claude allowance as it can. Only steps that save more than they cost, and a few cheap ones you need, run."
    },
    { key: "mediumLine", text: "Cheap steps run. Costly steps run only when they are very important." },
    { key: "highLine", text: "Every step you have switched on runs." },
    { key: "customLine", text: "You changed some switches yourself. Moving the slider resets them to that level." },
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
      text: "When an epic is first planned, a helper reads the project to find tools it already has, so the plan doesn't build them twice."
    },
    { key: "reuseCheckPhases", text: "Reuse check on each phase plan" },
    {
      key: "reuseCheckPhasesSentence",
      text: "When the step-by-step plans are written, a helper reads all of them against the project, looking for work that is already done somewhere."
    },
    { key: "pageEditHelper", text: "Helper for epic page edits" },
    {
      key: "pageEditHelperSentence",
      text: "Bigger edits to the epic page are done by a helper in the background, so the chat stays free to answer you."
    },
    { key: "helpersBuild", text: "Helpers do the building" },
    {
      key: "helpersBuildSentence",
      text: "Any task over a minute goes to a helper, so the chat can keep answering you while the work happens."
    },
    { key: "restartHelpers", text: "Restart cut-off helpers" },
    {
      key: "restartHelpersSentence",
      text: "If Claude restarts while helpers are working, it starts them again by itself, so their work isn't lost."
    },
    { key: "finalTidy", text: "Final tidy of new code" },
    {
      key: "finalTidySentence",
      text: "When code is finished, Claude runs the checks once more and looks for common slips, like a typo copied from another file."
    },
    { key: "designReview", text: "Design review" },
    {
      key: "designReviewSentence",
      text: "When a phase changes how a page looks, a helper takes screenshots of it and checks them against your project's design rules."
    },
    { key: "planCheck", text: "Plan check" },
    {
      key: "planCheckSentence",
      text: "Before a phase is marked done, a helper compares what was built with the plan you agreed to."
    },
    { key: "alignmentCheck", text: "Alignment check" },
    {
      key: "alignmentCheckSentence",
      text: "A helper that changed a page measures it, to make sure its rows and edges line up, before it says it's finished."
    },
    { key: "handChecksFirst", text: "Claude tries hand checks first" },
    {
      key: "handChecksFirstSentence",
      text: "Before asking you to try something by hand, Claude tries it itself, so you only get the checks it can't do."
    },
    { key: "titleCheck", text: "Title check" },
    {
      key: "titleCheckSentence",
      text: "Each new item's title is read by a second, separate Claude that knows nothing about the work, to make sure you'll understand it later."
    },
    { key: "plainWordsCheck", text: "Plain-words check" },
    {
      key: "plainWordsCheckSentence",
      text: "Text you'll see in the product, like messages and help, is read by a separate Claude that flags jargon and long sentences."
    },
    { key: "itemScoring", text: "Item scoring" },
    {
      key: "itemScoringSentence",
      text: "Each new item is scored by a separate Claude, so the page can show a small label saying how much it matters."
    },
    { key: "changesInBold", text: "Changes in bold" },
    {
      key: "changesInBoldSentence",
      text: "In replies, Claude puts in bold anything that has moved away from what you last asked for."
    },
    { key: "checksBeforeMerge", text: "Checks before work is added" },
    {
      key: "checksBeforeMergeSentence",
      text: "Before a helper's finished work goes into your project, Claude runs its tests, small programs that confirm nothing stopped working."
    },
    { key: "fullTestRun", text: "Full test run at the end" },
    {
      key: "fullTestRunSentence",
      text: "After the last helper finishes, it runs every test in the project. This takes 10 to 25 minutes."
    },
    { key: "speedTest", text: "Speed test" },
    {
      key: "speedTestSentence",
      text: "When Claude changes how Spell understands what you write, it times it before and after, so it doesn't get slower."
    },
    { key: "editorAddOns", text: "Update your editor add-ons" },
    {
      key: "editorAddOnsSentence",
      text: "Spell adds small extras to your code editor, the program where you write code. After they change, Claude remakes them so you get the newest ones."
    },
    { key: "editorWarnings", text: "Editor warning check" },
    {
      key: "editorWarningsSentence",
      text: "After new work joins the Spell editor, Claude opens the editor and looks at the warnings it shows."
    },
    { key: "stopStuckTests", text: "Stop stuck test runs" },
    {
      key: "stopStuckTestsSentence",
      text: "If the checks seem frozen and show no progress for a long time, Claude stops them instead of waiting for hours."
    },
    { key: "plainPhaseNotes", text: "Rewrite phase notes in plain words" },
    {
      key: "plainPhaseNotesSentence",
      text: "After each phase, a helper rewrites what it changed so it's easy to read cold."
    },
    { key: "epicGuide", text: "Write the epic's guide" },
    {
      key: "epicGuideSentence",
      text: "A helper writes the page that explains what the epic built, for someone using it later."
    },
    { key: "fixReadmes", text: "Fix the READMEs" },
    {
      key: "fixReadmesSentence",
      text: "Helpers update the project's intro pages (called READMEs) wherever the new work made them wrong."
    },
    { key: "checkGuides", text: "Check the guides" },
    {
      key: "checkGuidesSentence",
      text: "Claude looks for broken links and out-of-date pictures in your project's written guides, then fixes them."
    },
    { key: "changelog", text: "Keep the list of changes" },
    {
      key: "changelogSentence",
      text: "Each time work joins your project, Claude adds a line to its changelog, the running list of what changed."
    },
    { key: "mergeEachHelper", text: "Add each helper's work" },
    {
      key: "mergeEachHelperSentence",
      text: "When a helper finishes and its checks pass, its work is added to your project right away."
    },
    { key: "mergeMain", text: "Bring in other changes" },
    {
      key: "mergeMainSentence",
      text: "If your project changed while the epic was being built, Claude first folds those changes into the epic's work, so everything fits together."
    },
    { key: "remakeBuiltFiles", text: "Remake built files" },
    {
      key: "remakeBuiltFilesSentence",
      text: "Some files are made automatically from other files. After new work is added, Claude makes them again, so they are never edited by hand."
    },
    { key: "renameOldNames", text: "Update old names" },
    {
      key: "renameOldNamesSentence",
      text: "Claude renames some pieces of the new work so they match the naming in the rest of your project."
    },
    { key: "installPackages", text: "Install what new work needs" },
    {
      key: "installPackagesSentence",
      text: "When new work needs extra ready-made code from other people (called libraries), Claude installs it for you."
    },
    { key: "keepOwnEdits", text: "Keep your own edits" },
    {
      key: "keepOwnEditsSentence",
      text: "Before adding work to your project, Claude first saves any edits you made there by hand, so none are lost."
    },
    { key: "savePages", text: "Save the epic pages" },
    {
      key: "savePagesSentence",
      text: "After each reply, Claude saves a snapshot of every epic page, so you can go back to an earlier version."
    },
    { key: "clearStuckItems", text: "Clear stuck items" },
    {
      key: "clearStuckItemsSentence",
      text: 'If an item shows "in progress" but nothing is working on it, Claude moves it back to the waiting list.'
    },
    { key: "freshHint", text: "Hint to start fresh" },
    {
      key: "freshHintSentence",
      text: "When a chat gets very long, Claude suggests handing the epic to a new chat, which costs less to keep going."
    },
    { key: "itemRequests", text: "Answer your requests on an item" },
    {
      key: "itemRequestsSentence",
      text: "Each item on an epic page has Add Details and Clarify buttons. When you press one, a helper writes the answer."
    },
    { key: "promptAck", text: "Quick reply while busy" },
    {
      key: "promptAckSentence",
      text: "When you write while Claude is in the middle of something, it answers at once in one line, saying it saw your message."
    },
    { key: "autoSend", text: "Auto Send" },
    {
      key: "autoSendSentence",
      text: "Two minutes after you stop changing the epic page, your changes go to Claude on their own, so you don't need to press Send."
    },
    { key: "openChat", text: "Open a chat when no one is listening" },
    {
      key: "openChatSentence",
      text: "If you press Send and no chat is open for that epic, a new one starts to handle it."
    },
    { key: "wakeQuietChat", text: "Wake a quiet chat" },
    { key: "wakeQuietChatSentence", text: "If you press Send while that epic's chat is waiting, your Send wakes it." },
    { key: "passSendToBusy", text: "Pass a Send to a busy chat" },
    {
      key: "passSendToBusySentence",
      text: "If you press Send while that epic's chat is working, it reads your Send at its next step."
    },
    { key: "watchAgentNotes", text: "Watch for notes to helpers" },
    {
      key: "watchAgentNotesSentence",
      text: "While helpers are working, Claude keeps watching for notes you leave to change what they're doing."
    },
    { key: "watchSends", text: "Watch for your Sends" },
    {
      key: "watchSendsSentence",
      text: "Claude looks for new messages from you every 2 seconds, so it answers quickly."
    },
    { key: "refreshPages", text: "Refresh changed pages" },
    {
      key: "refreshPagesSentence",
      text: "When the code behind a page changes, Claude remakes the page, so you see the change."
    },
    { key: "closeLeftovers", text: "Close leftover programs" },
    {
      key: "closeLeftoversSentence",
      text: "Once an hour, Claude closes background programs still running after their work is finished or deleted."
    },
    { key: "startNotices", text: "Notices at start" },
    { key: "startNoticesSentence", text: "When a chat starts, it shows short notices about anything you need to know." }
  ],
  children: []
} as const satisfies EpicVocabulary
