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
    "epic-agents": "849759016a040037",
    "epic-answer": "9dade70349d7b118",
    "epic-aside": "76b87d894c69df91",
    "epic-ask": "1e2cf4b8e7c03998",
    "epic-cards": "00bef97b6386d907",
    "epic-change": "8fdaa41b449a4b53",
    "epic-choice-rows": "1040e928db5f0c59",
    "epic-choices": "86bd2915f1617a26",
    "epic-choices-bar": "c2b458e6104b9004",
    "epic-code": "0043655bc7d702b3",
    "epic-comment-pane": "57e865e74b448bbd",
    "epic-commit": "df6d5aa6065f23b8",
    "epic-event": "000a141a41708a3d",
    "epic-item": "220b928e6ef8778f",
    "epic-link": "c91654497539ec9a",
    "epic-list": "1289bfb6afbb6398",
    "epic-net-effect": "8e8e41050341ed79",
    "epic-new-item": "4457b6497199f692",
    "epic-note": "791b7178d8c0feca",
    "epic-original": "cd1c03a105becdc6",
    "epic-overview": "a3f0e4a3ac4869eb",
    "epic-page": "3580cbde865e85b3",
    "epic-page-note-head": "dae0b3dc787d20f0",
    "epic-phase": "9df329d55960a2a0",
    "epic-prompt": "68adb3be365af723",
    "epic-question": "767852f6df8c8dd7",
    "epic-review": "a812349e51918355",
    "epic-run": "a9036aef5d7dd2c2",
    "epic-run-row": "3fe12baedeeb9f85",
    "epic-section": "75248cb8fe5e55b1",
    "epic-send": "c07148391835c2c7",
    "epic-send-buttons": "8c89c65f9c3574b7",
    "epic-state-filter": "4138f3a8b9602197",
    "epic-status": "0dbefdd6749b7a88",
    "epic-summary": "5e9a535779e53efe",
    "epic-test-run": "a7d34d3b13267958",
    "epic-text-box": "1b7139c41ccc22bc",
    "epic-thread": "af3019fef4b66488",
    "epic-update": "997c4a46e40ece7d"
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
