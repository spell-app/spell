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
    "epic-agents": "63bd8d3dccac319f",
    "epic-answer": "a23f844fffbda6e7",
    "epic-aside": "aa061f12bea3a676",
    "epic-ask": "f88bff451a892273",
    "epic-cards": "5ac881934876de1d",
    "epic-change": "cf236324ee12376f",
    "epic-choice-rows": "7044acca7b067cb6",
    "epic-choices": "7cc85716350a99ea",
    "epic-choices-bar": "16532c697f70f894",
    "epic-code": "e7497778542ac102",
    "epic-comment-pane": "867c864923b1efd0",
    "epic-commit": "1738c96733c0698a",
    "epic-event": "3770689030a3f6ab",
    "epic-item": "150b9c9b874d85fe",
    "epic-link": "52e292bd2093071d",
    "epic-list": "2443a40968da4f58",
    "epic-net-effect": "2c291c992f329906",
    "epic-new-item": "6482bf0336a539c6",
    "epic-note": "89b9934b81f8a538",
    "epic-original": "0cea03e13ab7cd07",
    "epic-overview": "42dba5bec849406a",
    "epic-page": "2f6b90d92f23a610",
    "epic-page-note-head": "f5c5d75cfd9bf1db",
    "epic-phase": "08e689cc534dfefc",
    "epic-prompt": "a06ce1f4aac4892a",
    "epic-question": "9f8792bc44fbbfca",
    "epic-review": "ecd1c208a05f6c9a",
    "epic-run": "ed7eae7ab74d70b8",
    "epic-run-row": "b09e328792f66ecf",
    "epic-section": "71d9a23fcc0b6085",
    "epic-send": "5f7247f1ca1ad2c3",
    "epic-send-buttons": "70f2e71a32714a7f",
    "epic-state-filter": "c86ccb792196aa6c",
    "epic-status": "c024862fa0c72bc1",
    "epic-summary": "c5850c62b3a580b1",
    "epic-test-run": "22b96f51b3f41fc9",
    "epic-text-box": "867511c3790327be",
    "epic-thread": "d156b0bb9c9ffc58",
    "epic-update": "05c48c64c9a3b04c"
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
