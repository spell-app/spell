/**
 * Every name `<epic-cards>` uses.  Schema:  `EpicVocabulary` (Spell UI's `ComponentVocabulary` plus its children).
 * - Pure data:  `import type` only.
 * - Change it, then `spell dev pack build epics`:  the pack's catalog is read from here.
 */

import type { EpicVocabulary } from "$/epics/definitions"

/****************
 * ### `<epic-cards>`
 * A saga page's Epics:  a card for each epic serving the saga, grouped by state.
 ****************/
export const epicCardsVocabulary = {
  tag: "epic-cards",
  topics: ["documentation", "containers", "cards"],
  aka: ["epic cards", "saga epics", "epics list"],
  skeleton: "2 tall",
  noun: "cards",
  ui: false,
  description:
    "A saga page's Epics (epic `epic-workflow` P15):  a card for each epic whose page names the saga " +
    "(`<epic-page saga>`), grouped by state as on the Epics page, with its cards:  an `<epic-list>` of " +
    "`<epic-card>`s.  Drawn from the page server (`GET /api/epics/saga`), and asked again whenever an epic page " +
    "changes, so it never goes stale.",
  attributes: [
    {
      name: "saga",
      kind: "string",
      required: true,
      format: "saga id",
      description: "The saga whose epics it shows:  `drawable-spell`."
    }
  ],
  events: [],
  slots: [],
  parts: [
    { name: "base", description: "The box around the list." },
    {
      name: "list",
      description: "The cards, an `<epic-list no-favorites>` of `<epic-card>`s:  the Epics page's groups and cards."
    },
    {
      name: "note",
      description: "Instead of cards:  no epic names the saga yet, the page opened from disk, or no answer."
    }
  ],
  states: [],
  texts: [
    { key: "label", text: "The saga's epics", description: "The whole list, spoken." },
    { key: "phases", text: "{count} phases", description: "A card's meta line:  phases done of all (`6/8`)." },
    {
      key: "none",
      text: "No epic names this saga yet:  epic saga set <epic> {saga}",
      description: "No epic page names the saga."
    },
    {
      key: "file",
      text: "The epics show when the page is served:  spell dev docs open this page.",
      description: "Opened from disk:  only the page server knows the epics."
    },
    {
      key: "server",
      text: "Couldn't ask the page server for the epics.",
      description: "The page server didn't answer, or has no such route yet."
    }
  ],
  children: []
} as const satisfies EpicVocabulary
