/* GENERATED -- do not edit:  `spell pack build epics` */
/**
 * The `epics` pack's script:  registers with the page's Spell UI, which adds the catalog and calls `define()`.
 * - `define()` imports every family barrel, which defines its tags:  inlined in the script, run only when called.
 * - `families`:  each family's sources' hash, so a page swapping in a rebuilt pack re-renders only what changed.
 */
import { CATALOG } from "./epics.catalog"

/** The docs bundle's global (`spell-ui.entry.js`). */
const { SpellUI } = globalThis as unknown as { SpellUI: { registerPack(pack: object): void } }

SpellUI.registerPack({
  name: "epics",
  prefix: "epic-",
  catalog: CATALOG,
  families: {
    "epic-agents": "7e74a7e82bce87fe",
    "epic-answer": "9e2a541cded1d636",
    "epic-aside": "4699417c4fbc8559",
    "epic-ask": "3558f21114ed9b94",
    "epic-cards": "13112f0c19ca0fbe",
    "epic-change": "339e40158a8b5702",
    "epic-choice-rows": "31b85506d69cae2f",
    "epic-choices": "76d61fb3a7f157f2",
    "epic-choices-bar": "c39b6e048b04c251",
    "epic-code": "6cff4b2a73218184",
    "epic-comment-pane": "ae62a6d692ca3071",
    "epic-commit": "9c0eeafec2400a68",
    "epic-event": "1bfcb4816fbfb30b",
    "epic-item": "1d4de946c81e0a28",
    "epic-link": "ba1a4f24d88bdadb",
    "epic-list": "5f0221cca49d2d4f",
    "epic-net-effect": "bfd2a615c7d04dec",
    "epic-new-item": "5bb5d3968b521728",
    "epic-note": "4fd43fa2335f0975",
    "epic-original": "44a7aa8e4e6424e8",
    "epic-overview": "79057f1dc036b176",
    "epic-page": "d74a92b1a1cdc7f8",
    "epic-page-note-head": "dde87929c136db83",
    "epic-phase": "7539fea820e27634",
    "epic-prompt": "6e140534f722f60e",
    "epic-question": "a90ad02381e8b6da",
    "epic-review": "dc55d729f64710cc",
    "epic-run": "ea64ba5e6162b99b",
    "epic-run-row": "6a9d7269f2ecedd3",
    "epic-section": "69c920614f701d47",
    "epic-send": "ed47419917fcb5b1",
    "epic-send-buttons": "39be012255a17278",
    "epic-state-filter": "baa706fab35c5b0f",
    "epic-status": "cf99b4a50ce525d7",
    "epic-summary": "6ab863d5faf25fc3",
    "epic-test-run": "6afe291f26b995d0",
    "epic-text-box": "40065cbdff8f1dc2",
    "epic-thread": "fc18803b52b98a98",
    "epic-update": "c53db58ef7455105"
  },
  define: () =>
    Promise.all([
      import("../epic-agents"),
      import("../epic-answer"),
      import("../epic-aside"),
      import("../epic-ask"),
      import("../epic-cards"),
      import("../epic-change"),
      import("../epic-choice-rows"),
      import("../epic-choices"),
      import("../epic-choices-bar"),
      import("../epic-code"),
      import("../epic-comment-pane"),
      import("../epic-commit"),
      import("../epic-event"),
      import("../epic-item"),
      import("../epic-link"),
      import("../epic-list"),
      import("../epic-net-effect"),
      import("../epic-new-item"),
      import("../epic-note"),
      import("../epic-original"),
      import("../epic-overview"),
      import("../epic-page"),
      import("../epic-page-note-head"),
      import("../epic-phase"),
      import("../epic-prompt"),
      import("../epic-question"),
      import("../epic-review"),
      import("../epic-run"),
      import("../epic-run-row"),
      import("../epic-section"),
      import("../epic-send"),
      import("../epic-send-buttons"),
      import("../epic-state-filter"),
      import("../epic-status"),
      import("../epic-summary"),
      import("../epic-test-run"),
      import("../epic-text-box"),
      import("../epic-thread"),
      import("../epic-update")
    ]).then(() => undefined)
})
