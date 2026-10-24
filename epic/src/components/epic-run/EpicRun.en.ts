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
    "page never locks.  Once a page, from the run page's template.",
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
        "finished, it stopped, it isn't running)."
    },
    { name: "description", description: "The command's line or two about what it asks, and what Send does." },
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
    { name: "sent", description: "Sent, with nothing given since." }
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
