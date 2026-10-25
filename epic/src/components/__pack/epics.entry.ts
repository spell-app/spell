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
    "epic-agents": "d6d027f801f2f657",
    "epic-answer": "fca2c80207ce4504",
    "epic-aside": "3c391947c9c6d0b8",
    "epic-ask": "cb718c2bb3108224",
    "epic-cards": "00582120e552ab7b",
    "epic-change": "8045eb5f716c13ae",
    "epic-choice-rows": "f35e022c71b2c852",
    "epic-choices": "954b3ca5a25bb122",
    "epic-choices-bar": "e3f4b4524479d034",
    "epic-code": "3c8204f497166669",
    "epic-comment-pane": "d6277f47020edaf4",
    "epic-commit": "4e8cb0d273dcb88c",
    "epic-event": "af0515a587613bc0",
    "epic-item": "1f2f178192f63d9c",
    "epic-link": "731a1e5d14bf5911",
    "epic-list": "623f0f9610151690",
    "epic-net-effect": "c7888553ac077070",
    "epic-new-item": "0bef9092a712b65f",
    "epic-note": "b35cac3fe054bbd9",
    "epic-original": "cc9e0b065b2915a4",
    "epic-overview": "81d456e44a91d4d5",
    "epic-page": "9fc2176179afbf95",
    "epic-page-note-head": "52a2886a1c6b6477",
    "epic-phase": "1cdf9e6fd74d8b00",
    "epic-prompt": "2232b60b6e37798e",
    "epic-question": "072751326ee9d973",
    "epic-review": "b5cbc006a5c0cb2c",
    "epic-run": "a97434e11538e2ea",
    "epic-run-row": "a022d5b2636b0111",
    "epic-section": "0ea211bbd14b462a",
    "epic-send": "9fb698b17eed663a",
    "epic-send-buttons": "bdd3415a31cb858c",
    "epic-state-filter": "5de2e592d6f3993d",
    "epic-status": "c730706194c85e13",
    "epic-summary": "60120f98b76e6d4a",
    "epic-test-run": "df12920137131628",
    "epic-text-box": "09fa5f383a05aad5",
    "epic-thread": "a87dbd9e5b772f4a",
    "epic-update": "2660a5cc54797e4f"
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
