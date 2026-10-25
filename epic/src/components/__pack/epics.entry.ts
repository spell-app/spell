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
    "epic-agents": "907f4571c8468737",
    "epic-answer": "db106b4ebbd96763",
    "epic-aside": "9744c153b1b481fc",
    "epic-ask": "c1971832a5d04878",
    "epic-cards": "d76ea8abf2f6e0d4",
    "epic-change": "37ad5cd6c263a32b",
    "epic-choice-rows": "b593aad385cf8495",
    "epic-choices": "e38e342bd819b1e9",
    "epic-choices-bar": "2bd22cafdf8df304",
    "epic-code": "32313d1d527417ff",
    "epic-comment-pane": "589a4008c763616d",
    "epic-commit": "0dceb0a6c52b9182",
    "epic-event": "cb7592fecd18f8bc",
    "epic-item": "a5fc4d670c765d49",
    "epic-link": "805c9f7d7312198f",
    "epic-list": "8bf1ee779bd60aad",
    "epic-net-effect": "8238ce74d1db6f90",
    "epic-new-item": "b205c4709c4728f0",
    "epic-note": "af42dee45a3489a4",
    "epic-original": "08ae9c83c985d34c",
    "epic-overview": "d86d5c73ffbc07ca",
    "epic-page": "5c7c9e3e7cf783cb",
    "epic-page-note-head": "c3e8e9b3b8989b68",
    "epic-phase": "e48575d4315e0b9c",
    "epic-prompt": "46efbf40b83795eb",
    "epic-question": "440ea6bf5741b2af",
    "epic-review": "a379ee9d756d1d07",
    "epic-run": "86ad1a9aef836ea9",
    "epic-run-row": "7ab0455c6b7ddd70",
    "epic-section": "898899ebc4e837e0",
    "epic-send": "76b73559811e5b72",
    "epic-send-buttons": "80e70e13d48a3064",
    "epic-state-filter": "c71fe460a51ccc74",
    "epic-status": "769c324ef907eef8",
    "epic-summary": "eaf2d576dd20b6ae",
    "epic-test-run": "3ac59844c7464683",
    "epic-text-box": "bac102de95e77ba9",
    "epic-thread": "5a2034ba4021f537",
    "epic-update": "b40cb2a31a682800"
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
