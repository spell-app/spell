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
    "epic-agents": "d710de9c86d38dad",
    "epic-answer": "34e301461a85f6c3",
    "epic-aside": "67eb4718fb03e0d4",
    "epic-ask": "37859320114f323a",
    "epic-cards": "9c92d6fb9e801e1e",
    "epic-change": "6837952328b71c01",
    "epic-choice-rows": "855e8d4375dc9fb8",
    "epic-choices": "6cb36ef6458e0ae2",
    "epic-choices-bar": "bcabe6489c49637c",
    "epic-code": "f086b657a3bb6e62",
    "epic-comment-pane": "5cacc8933b33520e",
    "epic-commit": "157b15d291fec2ff",
    "epic-event": "bad50f61426b171b",
    "epic-item": "e5524a0f48499e0c",
    "epic-link": "297873d47070cf12",
    "epic-list": "aa4bfb203a09d378",
    "epic-net-effect": "4a66cb90f57bda03",
    "epic-new-item": "d6264ec498af3168",
    "epic-note": "7874a13e260bbab3",
    "epic-original": "8e1db84354209165",
    "epic-overview": "bef42f6ddc58b321",
    "epic-page": "999532d869868b3f",
    "epic-page-note-head": "bd11d0c263429b7f",
    "epic-phase": "4257fbb04258aa7d",
    "epic-prompt": "bb8dc78f2c58ac3c",
    "epic-question": "7b1c32879d13e375",
    "epic-review": "a19fc2f85503acea",
    "epic-run": "add691112f3c4625",
    "epic-run-row": "33f3a1a126c2cf85",
    "epic-section": "843ca4fda63869a5",
    "epic-send": "e8cf1b93935650b2",
    "epic-send-buttons": "2384f302f1f0e695",
    "epic-state-filter": "8d03a21b559ce238",
    "epic-status": "6dc6ecc262c418bd",
    "epic-summary": "8987e4d91549f6ac",
    "epic-test-run": "08f6866509e7f631",
    "epic-text-box": "2b7e09df8f033a43",
    "epic-thread": "f836c06ac6e5729c",
    "epic-update": "9aab572c81342c47"
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
