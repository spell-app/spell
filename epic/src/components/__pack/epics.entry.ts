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
    "epic-agents": "0067b067138ca4c8",
    "epic-answer": "c866062efef1760a",
    "epic-aside": "94753e3f7bc270a1",
    "epic-ask": "c86e9a873ebf7d04",
    "epic-cards": "2bb2aa02b7502fcf",
    "epic-change": "e1cc6fcbada989a5",
    "epic-choice-rows": "83f043b76c42582e",
    "epic-choices": "b41d908f0d21eea4",
    "epic-choices-bar": "8cb217b5edab5332",
    "epic-code": "7de9d22c507db231",
    "epic-comment-pane": "8cbcd8dc961aaf97",
    "epic-commit": "4897b69a5e848f63",
    "epic-event": "807b2bbd3a18b6c2",
    "epic-item": "d7406efb7e1743fe",
    "epic-link": "e20558af070b94d8",
    "epic-list": "424c50ac69f7b0b3",
    "epic-net-effect": "61b893676313cfd8",
    "epic-new-item": "15791e5327cba29a",
    "epic-note": "c978e5f2947cb630",
    "epic-original": "584ee38236ad90cf",
    "epic-overview": "540867c444f82a7d",
    "epic-page": "d16446aff690a426",
    "epic-page-note-head": "32d5ddad331c2de6",
    "epic-phase": "17d271869902ed30",
    "epic-prompt": "97d0f004ea4cb0a8",
    "epic-question": "9b823b3879006a0b",
    "epic-review": "d7b54260c78b9003",
    "epic-run": "eefef3ecc8c137aa",
    "epic-run-row": "7eedc8af958586f3",
    "epic-section": "1e0adcb8fab09f90",
    "epic-send": "68b459eb0ee3a1d3",
    "epic-send-buttons": "1f7492632aa7e697",
    "epic-state-filter": "5021eea91f32ee77",
    "epic-status": "4e6f6a60922e7b77",
    "epic-summary": "e0c92f32310db0c3",
    "epic-test-run": "e558ef131ff71cbb",
    "epic-text-box": "c89bbeecf50eecc9",
    "epic-thread": "b518dda09604d5ee",
    "epic-update": "1eebdde4d8ca83f5"
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
