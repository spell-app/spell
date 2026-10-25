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
    "epic-agents": "db8949147a6945a0",
    "epic-answer": "be9af9e9c863ad32",
    "epic-aside": "c25db206c3a16a10",
    "epic-ask": "0834834327e7452d",
    "epic-cards": "140cc8d1dbbf3ecd",
    "epic-change": "55cbcbde5ea3173c",
    "epic-choice-rows": "a6c2cb04526c67d2",
    "epic-choices": "f994437200235b8a",
    "epic-choices-bar": "b102af8418fbaa63",
    "epic-code": "27e3bad763e3168a",
    "epic-comment-pane": "8c695349ff1865ca",
    "epic-commit": "55424a53e12c456d",
    "epic-event": "1650666c54b85026",
    "epic-item": "a4e0cb54a70c5163",
    "epic-link": "94198d0360934dc7",
    "epic-list": "2bda1906d3acb0a3",
    "epic-net-effect": "96241fc05bd3e9da",
    "epic-new-item": "2b549f7e4688e550",
    "epic-note": "0502f0c2ff96c3dd",
    "epic-original": "5ad295cc46407579",
    "epic-overview": "b2b4125f9d7d7833",
    "epic-page": "d0c98fa6df5c7413",
    "epic-page-note-head": "93ca3a73f4eafce7",
    "epic-phase": "f5087d01aa4ceac9",
    "epic-prompt": "9469b484faa2e77a",
    "epic-question": "cac19f9336220ad5",
    "epic-review": "465d5a710b197e2b",
    "epic-run": "9864c2a0dfb86c24",
    "epic-run-row": "4fe130492575d7e2",
    "epic-section": "d03853e76f59d0e9",
    "epic-send": "8e737a05d0a56312",
    "epic-send-buttons": "ae8619deebdea3a4",
    "epic-state-filter": "388d54f2e7a3087d",
    "epic-status": "39e1f450ce6ff040",
    "epic-summary": "3e0746a8fcdcc8f7",
    "epic-test-run": "e904903e9b5011ab",
    "epic-text-box": "78a3c29859a86387",
    "epic-thread": "bc6c27ec3d4587de",
    "epic-update": "766eaff5edbce1cc"
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
