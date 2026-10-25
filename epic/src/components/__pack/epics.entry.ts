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
    "epic-agents": "6fb7e62313b667b0",
    "epic-answer": "1df82f9294a466e5",
    "epic-aside": "5c30c4fdfdba42ac",
    "epic-ask": "1d608b6144e0acb6",
    "epic-cards": "2fdeeb33561285f3",
    "epic-change": "4f27d63c2d5bef25",
    "epic-choice-rows": "8cc6221d10ed2922",
    "epic-choices": "655255b9c1628345",
    "epic-choices-bar": "daf835c9f98e2871",
    "epic-code": "7c30b6b265c820a7",
    "epic-comment-pane": "9a69a82bfc56fe6e",
    "epic-commit": "21190648c04eb639",
    "epic-event": "90224b82a6fb27b1",
    "epic-item": "7e3295cabade7f2e",
    "epic-link": "5969da0b1bcecdcb",
    "epic-list": "168d7302bb056edc",
    "epic-net-effect": "ddb68d3bb8ed0415",
    "epic-new-item": "2df2eda8c8188b93",
    "epic-note": "c133cc41327684d7",
    "epic-original": "54f1873e825b50f0",
    "epic-overview": "3565db7d011d37c7",
    "epic-page": "b398c659dbb981d6",
    "epic-page-note-head": "825ee9c6b0e286ef",
    "epic-phase": "231436200a28e093",
    "epic-prompt": "2d7b1e0e0e619215",
    "epic-question": "0e2f6809a84ef252",
    "epic-review": "1255a0851fa69fb7",
    "epic-run": "c3d95fa40a108729",
    "epic-run-row": "37c3be56c538b500",
    "epic-section": "76f1498a0452da07",
    "epic-send": "a728ddbc0af27c2c",
    "epic-send-buttons": "856badc772394452",
    "epic-state-filter": "513d0af6912f3345",
    "epic-status": "e929b209de41f15b",
    "epic-summary": "cf15b1a321c784c2",
    "epic-test-run": "f6dc1c91b3942d48",
    "epic-text-box": "ed0c7b3aab640043",
    "epic-thread": "67cf3d74f34dfa3f",
    "epic-update": "c84f9b4bee61b6aa"
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
