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
    "epic-agents": "f2d0cbc5a4edbe3a",
    "epic-answer": "61472232413cac0b",
    "epic-aside": "f5d881c1ad79f6fe",
    "epic-ask": "5ff66894e8dbe6f8",
    "epic-cards": "ebb0b44ddcfe5afd",
    "epic-change": "7816bfc0ac956c34",
    "epic-choice-rows": "d0a8e75fce595f01",
    "epic-choices": "dde46efec629c54f",
    "epic-choices-bar": "e40b2209017b35f6",
    "epic-code": "dce6e1d4eb99257a",
    "epic-comment-pane": "d21a8d3b8ce7fb60",
    "epic-commit": "a254e3deaaa22d7c",
    "epic-event": "47d42c6c48e9ec03",
    "epic-item": "1cc0e4619044b4fc",
    "epic-link": "4869cd6c90388a13",
    "epic-list": "0dacb675c1634c2f",
    "epic-net-effect": "3a5c06ce087d33da",
    "epic-new-item": "929f34b3c494ab00",
    "epic-note": "583b2eeaccbfde5a",
    "epic-original": "b32177532dae9c40",
    "epic-overview": "ef065bdaadf351c2",
    "epic-page": "88802c0d82fe5e9d",
    "epic-page-note-head": "131766d8957f9da8",
    "epic-phase": "69305607f7a6b9d2",
    "epic-prompt": "74a426de27aac8b4",
    "epic-question": "a643072d05aae270",
    "epic-review": "e87505d9f5a055c2",
    "epic-run": "c8ccbc45cd014d51",
    "epic-run-row": "5f43697a42c90bfc",
    "epic-section": "f924c27b2270ab68",
    "epic-send": "cb0996cc334560ca",
    "epic-send-buttons": "a73800a55b0d63b7",
    "epic-state-filter": "d4da7006c357151d",
    "epic-status": "40f3afacb23e5f78",
    "epic-summary": "6ce059ff2c09ebbc",
    "epic-test-run": "77dff27834d2e280",
    "epic-text-box": "a3504a981f70a022",
    "epic-thread": "72517fdbae6b013a",
    "epic-update": "8e129a9e3f9027a9"
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
