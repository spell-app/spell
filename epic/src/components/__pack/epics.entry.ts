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
    "epic-agents": "85fdb1a13f59a7de",
    "epic-answer": "a5de1068df67298a",
    "epic-aside": "e90a6694f4b10278",
    "epic-ask": "10c56089da9b269b",
    "epic-cards": "19ba712abafee3af",
    "epic-change": "2f7e2b4036b79edb",
    "epic-choice-rows": "a781f5fd31f2662f",
    "epic-choices": "6de62651be9df926",
    "epic-choices-bar": "4a90471a60158beb",
    "epic-code": "063e77f0e76bdae8",
    "epic-comment-pane": "81f0d7047d855cb5",
    "epic-commit": "2812a58823e28034",
    "epic-event": "17d05e425cf5cf0a",
    "epic-item": "f8a01bcb76277535",
    "epic-link": "c8d3c73dda94a7dd",
    "epic-list": "2e911cbc17da64f6",
    "epic-net-effect": "549f8060b899caf1",
    "epic-new-item": "7dfb6b8b75da875f",
    "epic-note": "d58392cda9209ab5",
    "epic-original": "8f452c9180bd084e",
    "epic-overview": "08b14406a1f04aa1",
    "epic-page": "396a012e7a089f4e",
    "epic-page-note-head": "8ba2dcafa9623fe7",
    "epic-phase": "fe9ab32283a2e11d",
    "epic-prompt": "e3e0a3bda3d880aa",
    "epic-question": "4ba18d64d8392a8f",
    "epic-review": "5ba32722f7f35430",
    "epic-run": "8401dafe04ea146d",
    "epic-run-row": "5ed5994ab2e3b9dd",
    "epic-section": "f6ffcc0144d7e99d",
    "epic-send": "d5cce4d4d9f940a1",
    "epic-send-buttons": "e49307d9a48de605",
    "epic-state-filter": "6ffb92d4570690ee",
    "epic-status": "4f1810dd3e70ef95",
    "epic-summary": "2c4d80412a81fd03",
    "epic-test-run": "de246cc5140e897c",
    "epic-text-box": "47c25a341aa04c4c",
    "epic-thread": "946986e84b2e6b80",
    "epic-update": "26aa09e5b7b8e0ad"
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
