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
    "epic-agents": "abb9412b11359e42",
    "epic-answer": "7a85e669d621ccd1",
    "epic-aside": "e83dbbe14f637c04",
    "epic-ask": "6dd09654c055ad17",
    "epic-cards": "731db3c127359e7b",
    "epic-change": "01401af05c1a583c",
    "epic-choice-rows": "3bb36e492f6a62ae",
    "epic-choices": "dc86777b117ffb8b",
    "epic-choices-bar": "4941e5fb5e4c53c1",
    "epic-code": "35f9a4afcbba28dc",
    "epic-comment-pane": "98e21ada463e7a11",
    "epic-commit": "113a61c3fe6a5a44",
    "epic-event": "57eec3d825afc3aa",
    "epic-item": "8273b5d841f5b1d7",
    "epic-link": "c57975b30d8926c4",
    "epic-list": "056681d5a8a3d1f8",
    "epic-net-effect": "7d142ebac73a8975",
    "epic-new-item": "175e15c5f13fdf68",
    "epic-note": "9efc73760729f16a",
    "epic-original": "840d2afff09b5b69",
    "epic-overview": "5b658101e5b2bdbc",
    "epic-page": "124cd60f6fcd12d8",
    "epic-page-note-head": "5843525a7c27185c",
    "epic-phase": "dc1a1cab4ff4ef25",
    "epic-prompt": "5c70ab1c62979067",
    "epic-question": "db285c8f886362bb",
    "epic-review": "27d6ffa2301b5b75",
    "epic-run": "28ad598decda295e",
    "epic-run-row": "b83fd3a44b1bc8e0",
    "epic-section": "ded5cc0d2fc61ff0",
    "epic-send": "05320591979d756d",
    "epic-send-buttons": "1b943cbcc9b23319",
    "epic-state-filter": "ddcb82b46bad314d",
    "epic-status": "d58ddac64f0e426c",
    "epic-summary": "94cdb26ff1b044ce",
    "epic-test-run": "4e4a3d2d4e485f0d",
    "epic-text-box": "685c77bebdb02e9d",
    "epic-thread": "a93f77b1b037f063",
    "epic-update": "c95fc302927daf71"
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
