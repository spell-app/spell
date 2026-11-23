/* GENERATED -- do not edit:  `spell pack build epics` */
/**
 * The `epics` pack's script:  registers with the page's Spell UI, which adds the catalog, and loads its
 * families (`epics/<family>.js`, ES modules beside the script) on first use, or all at once (`define()`).
 * - `families`:  each family's sources' hash, so a page swapping in a rebuilt pack re-renders only what changed;
 *   and its module's query, so a rebuilt family is a new module, an unchanged one the same
 */
import { CATALOG } from "./epics.catalog"

/** The page's Spell UI (the docs bundle's, the site's):  `loading` until the docs bundle has run (`spell-ui.js`). */
const { SpellUI } = globalThis as unknown as {
  SpellUI?: { registerPack?(pack: object): void; loading?: Promise<unknown> }
}

/** This script's own address:  its families are beside it.  Read as it runs, while `currentScript` is set. */
const BASE = document.currentScript instanceof HTMLScriptElement ? document.currentScript.src : location.href

/** Each family folder => its sources' hash. */
const FAMILIES: Record<string, string> = {
  "epic-actions": "0a68fec70def19a9",
  "epic-agents": "2ab20756fc351efc",
  "epic-answer": "3de0ce554161bfff",
  "epic-aside": "bd5e16d56c60c0db",
  "epic-ask": "cc4745f4e6007b2a",
  "epic-away-line": "6135d5d6336da61b",
  "epic-cards": "f1c27154122174bc",
  "epic-change": "a9bb09e827d75b5b",
  "epic-choice-rows": "46329ed96ff1c472",
  "epic-choices": "96c73302f72a7157",
  "epic-choices-bar": "60ba4413c4145f63",
  "epic-clarify": "e88a8a48fc6d543a",
  "epic-code": "c7da76973f2ed16f",
  "epic-comment-pane": "ddfe8ecea05a6803",
  "epic-commit": "206add29a5f27c20",
  "epic-event": "2f951a8485517cd7",
  "epic-feature-set": "a83ca1d793d19cf5",
  "epic-focus": "374ae49179cf5061",
  "epic-item": "03bd8a03c93e8ab7",
  "epic-kickoff": "86c1d2d4fdbd4534",
  "epic-link": "4a5bd9078002c300",
  "epic-list": "340f522bb4985b5a",
  "epic-mark": "e210926bb30d5cb4",
  "epic-net-effect": "cc16e60c288c126e",
  "epic-new-item": "47f67c0b0ebc26ac",
  "epic-note": "6846e6aef5a0ad10",
  "epic-option-form": "7360fc7a5ed8a62f",
  "epic-original": "1f8cfa87bfa7e9ac",
  "epic-overview": "cd5230cc230275d7",
  "epic-page": "2de15cc87926697b",
  "epic-page-note-head": "598ab5e6634dde82",
  "epic-phase": "d95f2384c1376db7",
  "epic-picture": "d931df834f299894",
  "epic-pills": "5ebb2898c0fed772",
  "epic-prompt": "6b63ace27cb0a492",
  "epic-question": "3730bea9806dcbb2",
  "epic-review": "5dbcd66ad42fcd8d",
  "epic-run": "5e71f204ed2085d2",
  "epic-run-row": "7b2c43c625d0e8bd",
  "epic-section": "898b55c071b9e972",
  "epic-send": "df65669ba8ca5b1e",
  "epic-send-buttons": "7c3608026637ce3b",
  "epic-state-filter": "3d2315ce46380036",
  "epic-status": "e2451c38cb0d66fa",
  "epic-summary": "4c648d0c6057fe67",
  "epic-text-box": "7ff573b83264edfe",
  "epic-thread": "db6b988e939f7bb3",
  "epic-update": "2eb9f1ef30b73492"
}

/** Import family `folder`'s module, which defines its tags. */
function loadFamily(folder: string): Promise<unknown> {
  const url = new URL(`./epics/${folder}.js?v=${FAMILIES[folder] ?? ""}`, BASE)
  return import(/* @vite-ignore */ url.href)
}

function register() {
  SpellUI!.registerPack!({
    name: "epics",
    prefix: "epic-",
    catalog: CATALOG,
    families: FAMILIES,
    loadFamily,
    define: () => Promise.all(Object.keys(FAMILIES).map(loadFamily)).then(() => undefined)
  })
}

if (SpellUI?.registerPack) register()
else void SpellUI?.loading?.then(register)
