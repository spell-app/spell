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
    "epic-agents": "1daabd159c961f49",
    "epic-answer": "c1469f115742a0ec",
    "epic-aside": "ebc294cdbc8792e1",
    "epic-ask": "07cc9f19c35933eb",
    "epic-cards": "0007f062ff923a70",
    "epic-change": "492a65d0a0a2748b",
    "epic-choice-rows": "0f7faba32501be6a",
    "epic-choices": "7937fff3f32a074a",
    "epic-choices-bar": "77dcc8b9f89a4a4c",
    "epic-code": "414c31ad3f4eaf3b",
    "epic-comment-pane": "4eb82c7dd4becacd",
    "epic-commit": "bf3ffc0e91f78417",
    "epic-event": "ffb326f9b656de4a",
    "epic-item": "788e5c9f7810bbbb",
    "epic-link": "27bfc91850171d7b",
    "epic-list": "891ca6ff7d59cdd8",
    "epic-net-effect": "eb3fdeb3f4f74e1e",
    "epic-new-item": "8d6e071b0fbe61e6",
    "epic-note": "e2143f29b4a1f9be",
    "epic-original": "9f93476a51f3ea73",
    "epic-overview": "abc51e4e0bac7011",
    "epic-page": "569eb6a1a9fad7b2",
    "epic-page-note-head": "1e03b015940f528f",
    "epic-phase": "0c2c35ad54743c99",
    "epic-prompt": "a9a3a2d5d5a7701e",
    "epic-question": "76605b75ebbaa75e",
    "epic-review": "b55b3b648deda4d2",
    "epic-run": "326077973a6ed1ef",
    "epic-run-row": "d9f7a6ff714dbe93",
    "epic-section": "794d56e882820151",
    "epic-send": "c9b02069774c8427",
    "epic-send-buttons": "6109b25b60e71510",
    "epic-state-filter": "60ca08461639892a",
    "epic-status": "156844c061b6c2ea",
    "epic-summary": "e8e3c2e2dccb58fe",
    "epic-test-run": "b1894b6d3a5bf6e6",
    "epic-text-box": "ac75e69f07ad124c",
    "epic-thread": "0898acd2ce4e69b1",
    "epic-update": "c3e6f56b7308972b"
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
