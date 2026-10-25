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
    "epic-agents": "adeaf2611fb5d135",
    "epic-answer": "656e9e4170fd5a0b",
    "epic-aside": "019fc7e1f8d86d67",
    "epic-ask": "f13972f27a277714",
    "epic-cards": "4e0070a0da4525f3",
    "epic-change": "0e700f4f80deeea5",
    "epic-choice-rows": "46d681fd95e168bd",
    "epic-choices": "e88eab213dfa4ea3",
    "epic-choices-bar": "5bd46be472401106",
    "epic-code": "2ad4cefd5bc58ba7",
    "epic-comment-pane": "1acfdd6de7242814",
    "epic-commit": "8621c33db8c20bfc",
    "epic-event": "9a2bf0ea9c60d1a4",
    "epic-item": "ca3e0d8bdaaf1d9e",
    "epic-link": "5377846e80d9b17c",
    "epic-list": "9a5881c677a2098a",
    "epic-net-effect": "a3f6da2ccfa6b251",
    "epic-new-item": "fb81742e14925f9c",
    "epic-note": "019a09817cbf55f8",
    "epic-original": "9c85d34fd1a4bf42",
    "epic-overview": "fa7dbf00bceb386d",
    "epic-page": "4c17fe242029be16",
    "epic-page-note-head": "8298375123d0397f",
    "epic-phase": "5e4770efd73bc53a",
    "epic-prompt": "55ceefa63d44edbb",
    "epic-question": "6867d84c18345fd3",
    "epic-review": "79fefa6e4b72b2f2",
    "epic-run": "ebfba2f85ccef418",
    "epic-run-row": "0fbbfc4c8e65e1c4",
    "epic-section": "751b5f903a7617e5",
    "epic-send": "d50e014aa4a2aaa7",
    "epic-send-buttons": "c92069d48a369c9a",
    "epic-state-filter": "ad65b8ef948b9f72",
    "epic-status": "3a597b00696a58c7",
    "epic-summary": "3ed99d9c8c2216a1",
    "epic-test-run": "adad868602deb68e",
    "epic-text-box": "de4d2e92fc8a15e8",
    "epic-thread": "bcd58fb1a16a065f",
    "epic-update": "f795c3a43f06e63e"
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
