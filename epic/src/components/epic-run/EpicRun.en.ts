/**
 * Every name `<epic-run>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell-epic/definitions"

/****************
 * ### `<epic-run>`
 * A run page's body:  a command asks Owen, he answers each row, Send, and the command carries on.
 ****************/
export const epicRunVocabulary = {
  tag: "epic-run",
  topics: ["forms", "tables"],
  aka: ["run page", "command review", "command run", "review page for a command"],
  skeleton: "4 tall",
  noun: "run",
  ui: false,
  description:
    "A run page's body (epic `epic-engine` P23):  a COMMAND stopped to ask Owen (the kit's `SRV.CommandRun`), and " +
    "waits for his answers.  It reads the run from the page server (`GET /api/runs/<id>`) and draws who is waiting " +
    "(`spell translate todos --to es` is waiting, with a green dot;  nobody, once the run stopped, finished or " +
    "its heartbeat went stale), the command's progress lines, updated live, then a table:  the command's columns " +
    "and a row per thing to answer (`<epic-run-row>`).  Each answer is saved as he gives it;  Send, at the bottom, " +
    "says the answers are done, and the waiting command carries on with them.  Send again whenever he likes:  the " +
    "page never locks.  Steering (P25):  a STATUS CARD of the run's passes when the command writes them (a line " +
    "each:  its name, a small bar and `212 of 380`, its calls, its time;  the running one live, done ones quiet), " +
    "and an EFFORT picker when it offers one (`fast | balanced | best`, saved at once, taking effect at the next " +
    "pass).  How the run ended shows in the waiting line:  finished, stopped, or its wait ran out.  Once a page, " +
    "from the run page's template.",
  attributes: [
    {
      name: "run",
      kind: "string",
      required: true,
      description:
        "The run's id:  its folder's name in the content folder's `pages/runs/` (`spell-translate-20261023-1912`)."
    }
  ],
  events: [],
  slots: [],
  parts: [
    { name: "base", description: "Its box:  who is waiting, the progress, the table, Send." },
    {
      name: "who",
      description:
        "Who is waiting:  the command, with a green dot, while its heartbeat is fresh;  else why nobody is (it " +
        "finished, it stopped, its wait ran out, it isn't running)."
    },
    { name: "description", description: "The command's line or two about what it asks, and what Send does." },
    {
      name: "status",
      description: "The status card (P25):  the effort picker, then a line per pass;  only with passes or an effort."
    },
    {
      name: "effort",
      description: "The effort picker:  its label, the choices as a segmented control, and when a change takes effect."
    },
    { name: "effort-note", description: "When a new effort takes effect:  `takes effect at the next pass`, muted." },
    {
      name: "passes",
      description: "The passes, a line each, in order:  name, a small bar and how far, calls, time."
    },
    { name: "pass", description: "One pass's line;  the running one in full ink, the done ones muted." },
    { name: "progress", description: "The command's progress:  its latest line, then every line, folded." },
    { name: "table", description: "The table:  its heads, then a row per thing to answer (`<epic-run-row>`)." },
    { name: "head", description: "The table's heads:  the command's columns, then the answer's." },
    { name: "bar", description: "The Send bar, stuck to the window's bottom:  where the answers stand, then Send." },
    { name: "state", description: "Where the answers stand:  `3 of 5 answered · not sent`, `... sent 19:12`." },
    { name: "saved", description: "The last save, muted:  `saved 19:04`." },
    { name: "send", description: "Send and its countdown (`<epic-send-buttons>`), blue by the fill rule." },
    { name: "error", description: "Why the run couldn't be read, an answer saved or Send sent:  red, under the bar." }
  ],
  states: [
    { name: "waiting", description: "A command waits on the run now." },
    { name: "sent", description: "Sent, with nothing given since." },
    { name: "ended", description: "The run is over:  finished, stopped, or its wait ran out." }
  ],
  texts: [
    {
      key: "isWaiting",
      text: "is waiting",
      description: "After the command, while it waits:  `<command> is waiting`."
    },
    {
      key: "waitingTip",
      text: "Send hands it your answers, and it carries on",
      description: "The waiting line's tooltip."
    },
    {
      key: "finished",
      text: "The command finished:  nobody is waiting",
      description: "The run is `done`:  the command read the answers."
    },
    {
      key: "stopped",
      text: "The command stopped:  nobody is waiting",
      description: "The run is `stopped`:  the command gave up."
    },
    {
      key: "timedOut",
      text: "The command's wait ran out:  nobody is waiting",
      description: "The run is `timed-out`:  its time limit came before a Send."
    },
    {
      key: "notRunning",
      text: "Nobody is waiting:  the command isn't running",
      description: "The run is open, but no command's heartbeat is fresh."
    },
    {
      key: "notRunningTip",
      text: "Your answers are saved as you give them;  the command reads them when it next waits",
      description: "The not-running line's tooltip."
    },
    { key: "progress", text: "Progress · {count}", description: "The progress lines' fold:  how many." },
    { key: "status", text: "How the run is going", description: "The status card's name, for a screen reader." },
    { key: "effort", text: "Effort", description: "The effort picker's label, when the command names none." },
    {
      key: "effortNote",
      text: "takes effect at the next pass",
      description: "Beside the effort picker, while the run is open."
    },
    { key: "count", text: "{done} of {total}", description: "How far a pass is, with a total:  `212 of 380`." },
    { key: "oneCall", text: "1 call", description: "A pass's calls, one." },
    { key: "calls", text: "{count} calls", description: "A pass's calls:  `14 calls`." },
    { key: "seconds", text: "{seconds} s", description: "A pass's time, under a minute:  `6 s`." },
    { key: "minutes", text: "{minutes} min {seconds} s", description: "A pass's time, a minute or more." },
    { key: "passDone", text: "done", description: "A done pass's tooltip on its check." },
    { key: "passRunning", text: "running", description: "The running pass's tooltip on its dot." },
    { key: "passEffort", text: "at {effort}", description: "The effort a pass ran at, after its time:  `at best`." },
    { key: "saved", text: "saved {time}", description: "The last save, beside Send." },
    {
      key: "sendTip",
      text: "Send your answers:  the waiting command carries on with them;  send again any time",
      description: "The plane's tooltip and name (`<epic-send-buttons send-tip>`)."
    },
    { key: "loading", text: "Reading the run…", description: "Before the run is read." }
  ],
  children: []
} as const satisfies EpicVocabulary
