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
    "epic-agents": "3e8571b381a5a9c4",
    "epic-answer": "9a8c9a44e9a9b032",
    "epic-aside": "59ea543308a85e80",
    "epic-ask": "1e2bba22178eb2e7",
    "epic-cards": "42c0da3cc2987dd9",
    "epic-change": "998612accb688bc8",
    "epic-choice-rows": "ac253343eccaaf74",
    "epic-choices": "b4819414b8ec240d",
    "epic-choices-bar": "1de69f981633ee8c",
    "epic-code": "184a52a64b82f534",
    "epic-comment-pane": "e58803f2c6015bd7",
    "epic-commit": "209a0c0d024ed27b",
    "epic-event": "be243294d89ffa1d",
    "epic-item": "2269cde31375e671",
    "epic-link": "95dfe0ce3de1aa6b",
    "epic-list": "085787addc7d6a21",
    "epic-net-effect": "bf5748821f85e670",
    "epic-new-item": "e84c1dafafc16e55",
    "epic-note": "eab9eb8579945504",
    "epic-original": "577c8f1e8ca6c130",
    "epic-overview": "63cb0e320b547e0d",
    "epic-page": "ca6716e353433420",
    "epic-page-note-head": "bc3b25be44b71210",
    "epic-phase": "329e72915fd287f3",
    "epic-prompt": "1e5fedc845e31833",
    "epic-question": "9f81777d41d3f72f",
    "epic-review": "772e36f20772ac2f",
    "epic-run": "58eea71e3f9b17c9",
    "epic-run-row": "e8a361df84a57de3",
    "epic-section": "a0dc9396687aed37",
    "epic-send": "8f09480ab37a3cab",
    "epic-send-buttons": "13c8aa0629213a32",
    "epic-state-filter": "b85a23e65ef20db1",
    "epic-status": "283e82ae107a3d62",
    "epic-summary": "32c3446ff97215f2",
    "epic-test-run": "aea50777976c90b1",
    "epic-text-box": "9f798e0abf901f52",
    "epic-thread": "b5fb407ce3ee3558",
    "epic-update": "c63f549d5745f6a9"
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
