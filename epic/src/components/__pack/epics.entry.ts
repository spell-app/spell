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
    "epic-agents": "ad715e53f16d8359",
    "epic-answer": "93d6bd5a78f814d8",
    "epic-aside": "96f8d0a0e2acfdb9",
    "epic-ask": "c0e21257533346e7",
    "epic-cards": "604f9064a7d3125a",
    "epic-change": "87667afb0da913a4",
    "epic-choice-rows": "586f3dbd15cc178f",
    "epic-choices": "868d07c13b967c81",
    "epic-choices-bar": "ccccd71bc5ee7c82",
    "epic-code": "6743595fab0253ba",
    "epic-comment-pane": "4bd056107bca122b",
    "epic-commit": "7d0cbde7d1d1dfe9",
    "epic-event": "3650c1a60239b4f5",
    "epic-item": "aeaedc06857f455a",
    "epic-link": "ab0f877bdfe6db63",
    "epic-list": "70989d79c923355b",
    "epic-net-effect": "084722a9de128212",
    "epic-new-item": "1c6f4d94ed8b5fbe",
    "epic-note": "a9ee6b6214036970",
    "epic-original": "7e9056e9e688b303",
    "epic-overview": "ab553a7da2667554",
    "epic-page": "16727fbd7fce7fbd",
    "epic-page-note-head": "a961136c11d9a976",
    "epic-phase": "3c7e92a56b04cc22",
    "epic-prompt": "17b7554352b604e6",
    "epic-question": "68845da4040747e3",
    "epic-review": "6737d5c753596426",
    "epic-run": "66fd00dc257b3239",
    "epic-run-row": "c62bc8ca9d34ddfa",
    "epic-section": "c1208ffe5d3b69a3",
    "epic-send": "acd0d271838f6834",
    "epic-send-buttons": "20a3e3df993e9ecc",
    "epic-state-filter": "9e0eea21fc479be2",
    "epic-status": "e01e5f743b2c9a7e",
    "epic-summary": "d51e929e5dc3ebeb",
    "epic-test-run": "ca2f521e3b47ace1",
    "epic-text-box": "6767055a9ab8e894",
    "epic-thread": "cd9d734c77a9c509",
    "epic-update": "a71ece2f79a47b66"
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
