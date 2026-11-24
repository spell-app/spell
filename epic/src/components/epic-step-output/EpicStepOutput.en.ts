/**
 * Every name `<epic-step-output>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "spell/epic/definitions"

/****************
 * ### `<epic-step-output>`
 * The box under a manual test's command where the person pastes what it printed (epic `epic-engine` T165).
 ****************/
export const epicStepOutputVocabulary = {
  tag: "epic-step-output",
  topics: ["forms", "documentation"],
  aka: ["step output", "paste output", "command output", "test output", "what it printed"],
  noun: "step output",
  ui: false,
  description:
    "The box under a manual test's command where you paste what it printed (epic `epic-engine` T165).  The test's " +
    "Step field puts one under each step holding a command block, while the page is reviewed, never written in a " +
    "doc.  What's pasted goes in the test's mark with the step's number:  with your Approve, your Revisit note or " +
    "the x, else as a revisit of its own, so Send hands it to Claude with your answer.  It's saved as you type, and " +
    "shown again after a reload.",
  attributes: [
    { name: "item", kind: "string", required: true, description: "Its test's id:  `m3`." },
    { name: "step", kind: "number", required: true, description: "Its step's number in the Step field, from 1." }
  ],
  events: [],
  slots: [],
  parts: [
    { name: "base", description: "The box's frame, under the step's command." },
    { name: "box", description: 'The box itself:  an `<epic-text-box type="note" code>`.' }
  ],
  states: [],
  texts: [
    {
      key: "placeholder",
      text: "Paste what this command printed",
      description: "The box's placeholder (checked in the novice voice)."
    },
    { key: "label", text: "What step {step} printed", description: "The box's name for a screen reader." }
  ],
  children: []
} as const satisfies EpicVocabulary
