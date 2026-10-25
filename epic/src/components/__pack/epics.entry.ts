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
    "epic-agents": "71e8eb01385ee37f",
    "epic-answer": "bc241dfc9c778e7d",
    "epic-aside": "fdbd569c8eabecc9",
    "epic-ask": "64f79b9da73e740d",
    "epic-cards": "9cdd13617e142f38",
    "epic-change": "4411a474e2cc9776",
    "epic-choice-rows": "24eb26ad4bfb6145",
    "epic-choices": "50e6033525cb3636",
    "epic-choices-bar": "0b1df5587ad954f3",
    "epic-code": "ef9c99ad1d242105",
    "epic-comment-pane": "74ef9ae52ffb1789",
    "epic-commit": "3616d7a3f105d826",
    "epic-event": "4ba57bf8406575a8",
    "epic-item": "42e73ffa6bfb7714",
    "epic-link": "4fddd2aaffff34df",
    "epic-list": "70373e1437997343",
    "epic-net-effect": "c779ee2c7d006cbf",
    "epic-new-item": "fdd9dbe89cbd299f",
    "epic-note": "26a8be9d11af47a0",
    "epic-original": "c7d453a6ebdd06a7",
    "epic-overview": "519b722deb7025d0",
    "epic-page": "bb0b0227b96802cb",
    "epic-page-note-head": "cfe37b3b4751f40b",
    "epic-phase": "712a29f16ce143da",
    "epic-prompt": "0c52162c2ac47187",
    "epic-question": "f41afef43aecdadf",
    "epic-review": "87c80a932a97f3d8",
    "epic-run": "c9a6fb2976d64499",
    "epic-run-row": "cc5d3a7f4602e0b9",
    "epic-section": "202cf405c90077f8",
    "epic-send": "a99e1d0eb162bcf8",
    "epic-send-buttons": "9c0358c52251b56b",
    "epic-state-filter": "0c9d0b2b54d70227",
    "epic-status": "41ce64f4524e6acf",
    "epic-summary": "528ce481604062d5",
    "epic-test-run": "0d8952b124bae04e",
    "epic-text-box": "c8eefb67582fb40f",
    "epic-thread": "ebc3443631930ef0",
    "epic-update": "0543e86e3fd2c979"
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
