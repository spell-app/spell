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
    "epic-agents": "134a601ec362dd92",
    "epic-answer": "f967b11a211c1955",
    "epic-aside": "dfeaf5451f87d468",
    "epic-ask": "c9fbc05bcb0e31dc",
    "epic-cards": "b795dd9078e6700f",
    "epic-change": "e25f67b73d73caa1",
    "epic-choice-rows": "c93f55a59d19cb28",
    "epic-choices": "5181fe54d0bd7f0b",
    "epic-choices-bar": "65601269b7e984c0",
    "epic-code": "6d360b5b051d77ee",
    "epic-comment-pane": "71a1538b2a8a261b",
    "epic-commit": "0ec5d5fbf7116318",
    "epic-event": "9bf790bbad5317c9",
    "epic-item": "b26771630608e469",
    "epic-link": "64be7b1f2b9fbca0",
    "epic-list": "0c290c47cdaf6289",
    "epic-net-effect": "ff0ae6015b411102",
    "epic-new-item": "dbc20993c9fc4258",
    "epic-note": "139573106f938253",
    "epic-original": "872b79bf1e6c7d88",
    "epic-overview": "5492bf94ff22c81c",
    "epic-page": "12bf77f91777b722",
    "epic-page-note-head": "95fc1d727bd6854f",
    "epic-phase": "93b618ab08201848",
    "epic-prompt": "c060062bfc26a43f",
    "epic-question": "68019e41faa78795",
    "epic-review": "83c148e6d8508404",
    "epic-run": "240c023be2a331d8",
    "epic-run-row": "a1c0ac449d869ced",
    "epic-section": "a18764854629645a",
    "epic-send": "02be0ffbd1422325",
    "epic-send-buttons": "007de33ac8756df0",
    "epic-state-filter": "f56b48a54ad1536b",
    "epic-status": "6a1775f92a3161f1",
    "epic-summary": "926accec72e29a96",
    "epic-test-run": "38d3d55387e56e86",
    "epic-text-box": "67f6f49e1716896b",
    "epic-thread": "3ace575e6a19b6ca",
    "epic-update": "336570df42da8c65"
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
