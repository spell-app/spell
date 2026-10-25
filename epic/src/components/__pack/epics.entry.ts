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
    "epic-agents": "dbb95d862f52de19",
    "epic-answer": "891e0362e5cb8f63",
    "epic-aside": "f8023895e629cae5",
    "epic-ask": "fc882af1b4aae370",
    "epic-cards": "2e929687f310302d",
    "epic-change": "47fe1896bdc7d02f",
    "epic-choice-rows": "8872d674fcec6920",
    "epic-choices": "c1d7de51755264dd",
    "epic-choices-bar": "b8e6c4b9a8382808",
    "epic-code": "9d81dbdd22996482",
    "epic-comment-pane": "de7fe4b7867826c4",
    "epic-commit": "627aecb16cc19f71",
    "epic-event": "d27997e7ff1dcc17",
    "epic-item": "4829cbf62b1a185c",
    "epic-link": "065ed559241caf1f",
    "epic-list": "b051a0418edbd174",
    "epic-net-effect": "9a2cb466e373fc83",
    "epic-new-item": "a0cbc5e2b7495a41",
    "epic-note": "dd42c02e5096a33e",
    "epic-original": "dbbf1e7fa1fcc0eb",
    "epic-overview": "039f2e6ef017216f",
    "epic-page": "78abf2f0cce56441",
    "epic-page-note-head": "f155d8ecb13c7dda",
    "epic-phase": "c122fc040968c484",
    "epic-prompt": "585237795342b06f",
    "epic-question": "cd5600f496e35add",
    "epic-review": "97cab9f01277ed6e",
    "epic-run": "f43b0a540f30af2a",
    "epic-run-row": "0131e0c32d5f3ba6",
    "epic-section": "08cb90e3fc4399f1",
    "epic-send": "f0e0cca7f8ba27d4",
    "epic-send-buttons": "d6a8b9fcc909d36f",
    "epic-state-filter": "3cbabc8d836ef6c4",
    "epic-status": "780e75a6775f946a",
    "epic-summary": "3e33d7d4c4f9f717",
    "epic-test-run": "5a66afdb4b04e292",
    "epic-text-box": "cd1b1c247a291833",
    "epic-thread": "f4cc9823368ba682",
    "epic-update": "4189a1713daa82e0"
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
