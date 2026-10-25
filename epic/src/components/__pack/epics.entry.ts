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
    "epic-agents": "de9c4fd673371688",
    "epic-answer": "151223057c29c60c",
    "epic-aside": "0fee67272c428c06",
    "epic-ask": "b17a7d02bc6fb466",
    "epic-cards": "88225221c3bc398a",
    "epic-change": "c8027a01aba1ce81",
    "epic-choice-rows": "2076523ec46ffc7e",
    "epic-choices": "75aed50ad0682d8a",
    "epic-choices-bar": "977a8076391e7e0d",
    "epic-code": "29e6bce10e28b74b",
    "epic-comment-pane": "521cd05bbf1710d4",
    "epic-commit": "8583eb2210a4a60f",
    "epic-event": "456feacd5cebcf74",
    "epic-item": "932538ee75189718",
    "epic-link": "1c4a06ef3c49cdd3",
    "epic-list": "e06107017365cb28",
    "epic-net-effect": "117abb775ba8fa78",
    "epic-new-item": "0f576220bb4fb281",
    "epic-note": "03f06967ccd15829",
    "epic-original": "01b624ff8c0acb63",
    "epic-overview": "3fd4f050eb4f211d",
    "epic-page": "ff356cab65131b4c",
    "epic-page-note-head": "4dd9755d00e0c57b",
    "epic-phase": "1e57c03ee67b6115",
    "epic-prompt": "c739e860f9e7757b",
    "epic-question": "82fec69477b5122f",
    "epic-review": "2f21432ded1f5248",
    "epic-run": "86256fab62008b0b",
    "epic-run-row": "f20271e9e824ca52",
    "epic-section": "3b28d0aa9570f88d",
    "epic-send": "5eb5177a7ce91c43",
    "epic-send-buttons": "d8c8b0251db11343",
    "epic-state-filter": "fec417f4173255f6",
    "epic-status": "99f9c2dcd475837f",
    "epic-summary": "c5d0c6dd52cda3cd",
    "epic-test-run": "da846330a1961be3",
    "epic-text-box": "85e0f19a748308d7",
    "epic-thread": "2f930aa69e588494",
    "epic-update": "a98014b1a6c1c09a"
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
