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
    "epic-agents": "6d991b189ca3d151",
    "epic-answer": "707e8ee44bca92f7",
    "epic-aside": "2e1844e10590145e",
    "epic-ask": "724a6aa433098b07",
    "epic-cards": "182793d39ae205bd",
    "epic-change": "df792c1c94c72d7d",
    "epic-choice-rows": "f738566d2e89fc14",
    "epic-choices": "58fbe926de00a568",
    "epic-choices-bar": "f4deac13622953da",
    "epic-code": "9dae7869ee40b293",
    "epic-comment-pane": "3aca63a22784c4ae",
    "epic-commit": "a1f46d849fefb817",
    "epic-event": "f64157764a4f230f",
    "epic-item": "58967295e007c0fa",
    "epic-link": "cc0f02ee0f8309ad",
    "epic-list": "13694c0918e2579c",
    "epic-net-effect": "8e9bc7303b4772c8",
    "epic-new-item": "fb6a31be5b7815ac",
    "epic-note": "99fce6aa11a5c140",
    "epic-original": "5c03e34b29d56e65",
    "epic-overview": "1f1e67c54b9b7dd2",
    "epic-page": "d4e0c6352fa14d11",
    "epic-page-note-head": "ee2145d27d776157",
    "epic-phase": "5d80bc0406256ba7",
    "epic-prompt": "b64c49fb54802257",
    "epic-question": "0f6dbbbd574fc005",
    "epic-review": "cb2cb80dc20684b1",
    "epic-run": "8a4ec91c2c9eae2b",
    "epic-run-row": "fa7f18fec24c651e",
    "epic-section": "07363c2f583ff31b",
    "epic-send": "8d119cfe8b4b37fd",
    "epic-send-buttons": "6ca34ff6eaac2d1e",
    "epic-state-filter": "09a0a1acde45a524",
    "epic-status": "85cdbcd352dc65d5",
    "epic-summary": "7762460127b6b3d8",
    "epic-test-run": "ec288578d398e281",
    "epic-text-box": "9986c0f2aa56bde6",
    "epic-thread": "2ca7b7e62f9e5e1f",
    "epic-update": "e57d62582037abf8"
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
