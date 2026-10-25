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
    "epic-agents": "edd203a1f7f3d7e8",
    "epic-answer": "434eb5e3f3589794",
    "epic-aside": "57e2f022e3c45a68",
    "epic-ask": "447b0081ab8b90e2",
    "epic-cards": "e6869431f979ab1d",
    "epic-change": "b834697e3f73a8ff",
    "epic-choice-rows": "555424ce64a06384",
    "epic-choices": "15cd53e23af15de5",
    "epic-choices-bar": "9cf8e31079fdb2db",
    "epic-code": "73e0e7104efeee33",
    "epic-comment-pane": "e8d6ce9aad537468",
    "epic-commit": "b7a98c513f80e84d",
    "epic-event": "5bddc6a53a20f670",
    "epic-item": "c7cf968845a2b7c3",
    "epic-link": "03cfb7c8914e1a0d",
    "epic-list": "1059833883243e5d",
    "epic-net-effect": "cb334017f50960ba",
    "epic-new-item": "7e338768b336251a",
    "epic-note": "fc49c6b9e9275134",
    "epic-original": "fa018f7c6eb7b4c3",
    "epic-overview": "53a40f166e74581a",
    "epic-page": "2ecd38916a407ed6",
    "epic-page-note-head": "3401df0246418ed0",
    "epic-phase": "cebecd5f445faabb",
    "epic-prompt": "27372c4bbeab4b96",
    "epic-question": "0e9cfaa1981f5958",
    "epic-review": "3ebda8c918a53731",
    "epic-run": "557d5aae41e10ed4",
    "epic-run-row": "a1967bb89da4b0f5",
    "epic-section": "ab78d6153448e079",
    "epic-send": "400c56ea016d5220",
    "epic-send-buttons": "b6c3c56bdbcf32c3",
    "epic-state-filter": "07ba6cff2017792a",
    "epic-status": "22897f1e4206d2e7",
    "epic-summary": "7e67dff230f30b70",
    "epic-test-run": "0098a700182ec14b",
    "epic-text-box": "78beda8b2d487a2e",
    "epic-thread": "06f76c312228ad43",
    "epic-update": "d4c3d65a8ecb28c1"
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
