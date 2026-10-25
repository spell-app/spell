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
    "epic-agents": "6830caafd672c92b",
    "epic-answer": "63e91d11dde48ff8",
    "epic-aside": "6e344043c2a87e82",
    "epic-ask": "c93f3ec67ac0933e",
    "epic-cards": "d556967614def97e",
    "epic-change": "c3db0fe781f1e93b",
    "epic-choice-rows": "b2128e0296eded3a",
    "epic-choices": "120842e000250a3c",
    "epic-choices-bar": "ccec152e26ebffbd",
    "epic-code": "d3b0e11befcbdc7c",
    "epic-comment-pane": "4a172a9f7aa81102",
    "epic-commit": "6f8a63e6a68964b6",
    "epic-event": "648b81239a128412",
    "epic-item": "5ca1c2fdf86f0e0f",
    "epic-link": "bbc3cf4574d733c6",
    "epic-list": "b5310793b0cb19cb",
    "epic-net-effect": "50b1a848b6babdca",
    "epic-new-item": "14555f79898018ab",
    "epic-note": "64f952029f37f4ec",
    "epic-original": "266a8ae1ae6e6d56",
    "epic-overview": "1108f6c3165dde40",
    "epic-page": "b6e88a19336298ab",
    "epic-page-note-head": "fb2ab4451edd4d06",
    "epic-phase": "7a1fb2935482292a",
    "epic-prompt": "3ff23a45fd311008",
    "epic-question": "14042e6e8885d766",
    "epic-review": "fdf7ca4398493243",
    "epic-run": "5e51ee4064505261",
    "epic-run-row": "f58947f50da1f14a",
    "epic-section": "af0257a936726ec1",
    "epic-send": "601d9a72f8eca5dc",
    "epic-send-buttons": "f6edd3c9ee711492",
    "epic-state-filter": "024a5ef6c6a70853",
    "epic-status": "9ecdb81ec436bfc3",
    "epic-summary": "6c1c01349eeba4ba",
    "epic-test-run": "6865c7e4350b917e",
    "epic-text-box": "26dfb45b7d1ff92e",
    "epic-thread": "d49004ea2b77e749",
    "epic-update": "bb23693d1bcfa321"
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
