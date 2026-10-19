/**
 * Every name `<epic-thread-message>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its
 * children).
 * - Pure data:  `import type`, plus its value lists from its types file, data too.
 * - Change it, then `spell dev pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "$/epics/definitions"

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
    "doc):  Owen's words plain on the thread's ivory, Claude's in a light violet box, the green Done line, or " +
    'Claude\'s "thinking…" stub;  a bold "You:" / "Claude:" starts its first line, its time in its top right ' +
    "corner.  Every message but the last a step smaller and quieter.",
  attributes: [
    {
      name: "by",
      kind: "enum",
      values: MESSAGE_BY,
      required: true,
      description:
        "Who said it, which its colour says:  `owen`, `claude`, `done` (the Done line, a check where a name would " +
        "be), `thinking` (Claude at work on it)."
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
      description: "Claude's latest reply on a thread that's orange (`<epic-thread unseen>`):  a stronger orange."
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
    { key: "owen", text: "You:", description: "Who, before Owen's words." },
    { key: "claude", text: "Claude:", description: "Who, before Claude's words, and his thinking stub." }
  ],
  children: []
} as const satisfies EpicVocabulary
