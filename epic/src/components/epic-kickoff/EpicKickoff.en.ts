/**
 * Every name `<epic-kickoff>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 * - Its texts are in the novice voice, checked with `spell voice check` (WWOD §6):  "epic" kept, the page's own name.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-kickoff>`
 * The kickoff box at the top of a new epic's Overview (epic `epic-engine` P75):  what the epic should do, typed on its
 * page, pictures and all;  the page's Send makes it the Kickoff prompt.
 ****************/
export const epicKickoffVocabulary = {
  tag: "epic-kickoff",
  topics: ["forms", "text"],
  aka: ["kickoff", "kickoff box", "start an epic", "what to do", "prompt box", "new epic"],
  skeleton: "4 tall",
  noun: "kickoff box",
  ui: false,
  description:
    'The kickoff box (epic `epic-engine` P75;  Owen, 2026-11-17:  "start with an empty-ish epic doc and a field ' +
    'where I can type in what i want to do, rather than typing it in chat"):  drawn by `<epic-overview>` at its top ' +
    "while the epic has no kickoff prompt and no phases, the page is in its Overview stage and reviewed, and never on a " +
    "saga page (epic `epic-engine` I349);  never written in a doc.  A lead " +
    "line, then ONE box that grows as it's typed (`<epic-text-box>`), taking several pictures pasted, dropped or " +
    "chosen, each written into the words labelled (`![IMG2](<path>)`) and shown in a strip under the box, with its x.  " +
    "What's typed is saved as typed, a `kickoff` mark in the review inbox;  the header's Send hands it over, and " +
    "`epic inbox apply` writes it as the Kickoff prompt, its pictures labelled.",
  attributes: [],
  events: [],
  slots: [],
  parts: [
    { name: "base", description: "The box around it:  your violet card." },
    { name: "lead", description: "Its first line:  What should this epic do?" },
    {
      name: "words",
      description: "Its one box, an `<epic-text-box>` that grows as it's typed, up to a third of the window."
    },
    { name: "hint", description: "Under it:  how pictures are named, and that Send hands it to Claude." },
    { name: "choose", description: "The picture button, a small round one:  picture files into the words." },
    { name: "saved", description: "When it was last saved, or why not, after the hint." }
  ],
  states: [{ name: "saving", description: "A picture is being saved." }],
  texts: [
    { key: "lead", text: "What should this epic do?", description: "Its first line." },
    {
      key: "placeholder",
      text: "Describe what you want this epic to do. Write as much as you like, and paste or drop pictures in too.",
      description: "The box's grey hint while it's empty."
    },
    { key: "label", text: "What this epic should do", description: "The box's name for a screen reader." },
    {
      key: "hint",
      text:
        "Each picture gets a name, like IMG1. Type that name to talk about it, for example: make it look like IMG2.\n" +
        "Press Send at the top of the page when you're done. Claude reads it and writes a plan for you to look over. " +
        "Nothing is built until you say go.",
      description: "Under the box:  how pictures are named, and what Send does.  A new line splits it."
    },
    { key: "choose", text: "Add pictures", description: "The picture button's tooltip and name." },
    { key: "saved", text: "Saved {time}", description: "After the hint, once saved:  `{time}`, when." },
    { key: "notSaved", text: "Not saved:  {why}", description: "After the hint, when a save failed:  `{why}`." },
    {
      key: "notImage",
      text: "That file isn't a picture. Choose a PNG or JPG instead.",
      description: "A notice:  a file pasted, dropped or chosen isn't a picture."
    },
    {
      key: "tooBig",
      text: "That picture is too big. Choose one smaller than 8 MB.",
      description: "A notice:  a picture over 8 MB."
    }
  ],
  children: []
} as const satisfies EpicVocabulary
