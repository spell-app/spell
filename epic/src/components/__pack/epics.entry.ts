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
    "epic-agents": "d5d03fbfc7af8ba7",
    "epic-answer": "8d257d4e167d89fc",
    "epic-aside": "db9307bbde948051",
    "epic-ask": "c965ab2fb9073995",
    "epic-cards": "cacb563c01932e43",
    "epic-change": "249429bb69b78eab",
    "epic-choice-rows": "774d4b13cebf3046",
    "epic-choices": "c6eb91982984e8a8",
    "epic-choices-bar": "2faa38ce82fe6d6a",
    "epic-code": "5ee409fcaba064ee",
    "epic-comment-pane": "e253cfb6314f6d92",
    "epic-commit": "1001f2fefa6ac02c",
    "epic-event": "c0be3bd3f168715d",
    "epic-item": "93649da960c0db3d",
    "epic-link": "be0ae4c123933e9a",
    "epic-list": "0b0be5227c483b67",
    "epic-net-effect": "6442875d7f05542e",
    "epic-new-item": "ec87f710fbbc2535",
    "epic-note": "b0183c081f37f08d",
    "epic-original": "17f1233fe4d8dcbe",
    "epic-overview": "d84abd10e21d4b42",
    "epic-page": "84f7969c15c1885b",
    "epic-page-note-head": "227afbf6001397ac",
    "epic-phase": "652ab9f662b6b072",
    "epic-prompt": "bf67dd38a8146f75",
    "epic-question": "12f5ab873bca114a",
    "epic-review": "80b261eb794ffdf5",
    "epic-run": "5e813854a4198a46",
    "epic-run-row": "7b351765413838ed",
    "epic-section": "04b63c62adf96598",
    "epic-send": "43e4fd485db3580a",
    "epic-send-buttons": "1c2df9e16e40baaf",
    "epic-state-filter": "4d61715546d671ac",
    "epic-status": "9366f23092471cc7",
    "epic-summary": "45ff27b8850b40a4",
    "epic-test-run": "584bb61529739d09",
    "epic-text-box": "25b28fe11feab542",
    "epic-thread": "597557160435450c",
    "epic-update": "7e6cdfbebd44abe7"
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
