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
    "epic-agents": "b85bf583c3a5a42f",
    "epic-answer": "c25ca918eaf3347b",
    "epic-aside": "25fe9c8507990c7c",
    "epic-ask": "3a6e185eb0d02ac2",
    "epic-cards": "fd27938f858aa1d4",
    "epic-change": "0192b06a7eb68a3d",
    "epic-choice-rows": "a30f66bfe7b6c5d0",
    "epic-choices": "79258b8fec994f04",
    "epic-choices-bar": "4524eee96c2c74fe",
    "epic-code": "7cf81bc12cda82db",
    "epic-comment-pane": "662778fa5ae67ae1",
    "epic-commit": "5299793d224453e9",
    "epic-event": "9530d8b60fd22301",
    "epic-item": "f1748270c9e6ee35",
    "epic-link": "4725ff84ff56d119",
    "epic-list": "c81aa5d772474bf0",
    "epic-net-effect": "45a8eda074c56740",
    "epic-new-item": "598e228b2ef73034",
    "epic-note": "b1fc9b876854178a",
    "epic-original": "fa558d221d56a6f9",
    "epic-overview": "b9c81e73eb8952b3",
    "epic-page": "5314456e11e48106",
    "epic-page-note-head": "446576bd5d916901",
    "epic-phase": "5d40f139fe6d66c1",
    "epic-prompt": "53aaa4303665fdbf",
    "epic-question": "dd51500fa3a3ba44",
    "epic-review": "b4894f14465e5ba0",
    "epic-run": "2ea784e212173429",
    "epic-run-row": "2ae02d1a44fac5be",
    "epic-section": "952a0c99f47f9a95",
    "epic-send": "f58a42ee7b6f04cc",
    "epic-send-buttons": "ff9b9f33e4e8e1e6",
    "epic-state-filter": "17c2c99bf18fe8df",
    "epic-status": "f5712e5fb60e3c9e",
    "epic-summary": "830445145199fea0",
    "epic-test-run": "6cbfe603037e4c61",
    "epic-text-box": "3c372e6066c710cb",
    "epic-thread": "0156d163280132fa",
    "epic-update": "4265c7d2a74cbdf2"
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
