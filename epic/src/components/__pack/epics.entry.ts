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
    "epic-agents": "edd850909aeca8fb",
    "epic-answer": "0b206c2cbb14fee5",
    "epic-aside": "65a4d1bca3d8f7b9",
    "epic-ask": "4011d87fdb166800",
    "epic-cards": "61b2d2f8acb10f10",
    "epic-change": "dc8bb78e3f991b0c",
    "epic-choice-rows": "1076e93eecf28408",
    "epic-choices": "6a517aeaf4747b5a",
    "epic-choices-bar": "9334144097b4fa3b",
    "epic-code": "c67672717e90ea01",
    "epic-comment-pane": "0f980b1129058913",
    "epic-commit": "1ea632067f9c9246",
    "epic-event": "1cbc323d56cadcbb",
    "epic-item": "1935ceeba5f5084e",
    "epic-link": "140a91c94f579e85",
    "epic-list": "b9aa6f23d8a92d05",
    "epic-net-effect": "33e5893cec5da45e",
    "epic-new-item": "ed4f25ffcc81ec66",
    "epic-note": "376d10e7cc78bdd0",
    "epic-original": "79e8596b785ea76e",
    "epic-overview": "f3c2864cfc2bb9d6",
    "epic-page": "94071ea1acde6d3e",
    "epic-page-note-head": "90bdf2c93b7145a2",
    "epic-phase": "5cca4779c153c7c7",
    "epic-prompt": "a8a71c12649125f0",
    "epic-question": "03b3bf0f76d05065",
    "epic-review": "acebb0dc713413a1",
    "epic-run": "4734f8a195180a6f",
    "epic-run-row": "7771498c58a83bff",
    "epic-section": "f58aedaaf37ab697",
    "epic-send": "8bc41a9334c88e26",
    "epic-send-buttons": "3221f1b399033fb2",
    "epic-state-filter": "cadf163c97eed30b",
    "epic-status": "cd74571495a12199",
    "epic-summary": "33b64000688515a6",
    "epic-test-run": "84e221c96346493a",
    "epic-text-box": "376e4aa2af585ae0",
    "epic-thread": "b47fd7bb673679b7",
    "epic-update": "27905632e8d64f07"
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
