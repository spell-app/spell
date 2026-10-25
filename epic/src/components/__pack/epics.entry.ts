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
    "epic-agents": "f587e362f2b89f58",
    "epic-answer": "c665bb21b75496c7",
    "epic-aside": "f852baa19bb83c42",
    "epic-ask": "49c1abaaef596e45",
    "epic-cards": "4859572e9f5ea083",
    "epic-change": "7ae5adb17f16e1fe",
    "epic-choice-rows": "7d87d0b18b4f8a86",
    "epic-choices": "9b6c2cd6866ccd37",
    "epic-choices-bar": "5faa3a720b5b2b53",
    "epic-code": "b3e20ef8fd94d0b7",
    "epic-comment-pane": "1b2039515e6ff33a",
    "epic-commit": "65ebaef4ba8bdd98",
    "epic-event": "f59533b09c97c624",
    "epic-item": "4acaf8879b754fe6",
    "epic-link": "9f7c1e6f81d90eb2",
    "epic-list": "ed328a5742bcbbe7",
    "epic-net-effect": "d2caf4de16525c11",
    "epic-new-item": "b86dcdd657999aca",
    "epic-note": "24616f93f8c16556",
    "epic-original": "0842f43e6a4b3b5d",
    "epic-overview": "143b26756c73c5ba",
    "epic-page": "4ff1e195c9cb52b0",
    "epic-page-note-head": "fc31136fac2db9da",
    "epic-phase": "7b86cf3cf07dbbb6",
    "epic-prompt": "707ff4bb698916fd",
    "epic-question": "204c7c5a27271f28",
    "epic-review": "5dff3b5e4c490b58",
    "epic-run": "4fd524a093f37c9e",
    "epic-run-row": "8f0429be96a17c3e",
    "epic-section": "6892355a08b24ebc",
    "epic-send": "b1f70887c60dd170",
    "epic-send-buttons": "56d82b2e9482c46e",
    "epic-state-filter": "8ce0b86a4b379faf",
    "epic-status": "f8be7cad3dccf711",
    "epic-summary": "70b9143f4b61a89e",
    "epic-test-run": "18ccaababb4fd334",
    "epic-text-box": "e7b4ff885d96bce8",
    "epic-thread": "5acbd82fd4895700",
    "epic-update": "bf2d585881b40a4c"
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
