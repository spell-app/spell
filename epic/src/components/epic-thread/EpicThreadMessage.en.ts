/**
 * Every name `<epic-thread-message>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its
 * children).
 * - Pure data:  `import type`, plus its value lists from its types file, data too.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

import { MESSAGE_BY } from "./EpicThread.types"

/****************
 * ### `<epic-thread-message>`
 * One message of a comment's thread:  the colour says who, a bold "You:" / "Claude:" starts it, its time in its top
 * right corner.
 ****************/
export const epicThreadMessageVocabulary = {
  tag: "epic-thread-message",
  topics: ["messages", "text"],
  aka: ["thread message", "comment message", "reply", "answer"],
  noun: "message",
  ui: false,
  description:
    "One message of a comment's thread (`<epic-thread>`, which draws it in its shadow root, never written in a " +
    "doc):  a person's words plain on the thread's ivory, an agent's in a light box of the agent's colour, the green " +
    'Done line, or an agent\'s "thinking…" stub in the page\'s blue (at work on it);  a bold "You:" / "Ana:" / ' +
    '"Claude:" / "Codex (Ana):" starts its first line, its time in its top right ' +
    "corner.  Every message but the last a step smaller and quieter.",
  attributes: [
    {
      name: "by",
      kind: "enum",
      values: MESSAGE_BY,
      required: true,
      description:
        "Who said it, which its colour says:  `person`, `agent` (`claude` before epic `epic-friend` P10), `done` " +
        "(the Done line, a check where a name would be), `thinking` (an agent at work on it)."
    },
    {
      name: "person",
      kind: "string",
      description:
        "Whose words (`by=person`), or whose session's agent (`by=agent`):  a person's name (epic `epic-friend` " +
        "P2).  None:  the reader's own words, or an old reply of Claude's."
    },
    {
      name: "agent",
      kind: "string",
      description:
        "Which agent (`by=agent`, `by=thinking`;  epic `epic-friend` P10):  its id, `codex`, drawn by its name, " +
        "`Codex:`.  None:  Claude."
    },
    {
      name: "mine",
      kind: "boolean",
      description: "`person` is whoever is reading:  `You:`, or plain `Codex:` for their own session's."
    },
    { name: "at", kind: "string", description: "When, ISO:  its tooltip says the full local date and time." },
    {
      name: "stamp",
      kind: "string",
      description:
        "Its time as shown in its corner:  `10/10 09:12` on the first and when the day changed, else `09:12`."
    },
    {
      name: "older",
      kind: "boolean",
      description: "Not the last:  a step smaller and quieter (the thinking stub or the Done line count as the last)."
    },
    {
      name: "latest",
      kind: "boolean",
      description: "An agent's latest reply on a thread that's orange (`<epic-thread unseen>`):  a stronger orange."
    }
  ],
  events: [],
  slots: [{ name: "", description: "What was said." }],
  parts: [
    { name: "base", description: "The message:  its time, then who and what was said." },
    { name: "words", description: "Who, in bold, then what was said." },
    { name: "time", description: "Its time, over its top right corner;  the full date and time its tooltip." }
  ],
  states: [],
  texts: [
    { key: "you", text: "You:", description: "Who, before the reader's own words." },
    { key: "person", text: "{person}:", description: "Who, before another person's words." },
    {
      key: "agent",
      text: "{agent}:",
      description:
        "Who, before an agent's words and its thinking stub, by its name (`Claude:`, `Codex:`):  the reader's own " +
        "session's, or an old reply."
    },
    {
      key: "agentOf",
      text: "{agent} ({person}):",
      description: "Who, before the words of another person's session's agent:  `Codex (Ana):`."
    }
  ],
  children: []
} as const satisfies EpicVocabulary
