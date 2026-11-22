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
  "epic-actions": "0994a9b2a7d4a1f6",
  "epic-agents": "fb3db533d048731f",
  "epic-answer": "2d65dcc7a73ef0d9",
  "epic-aside": "18c196f70a186a30",
  "epic-ask": "bd62e9c8d435e10b",
  "epic-away-line": "d66d9576abb9ea23",
  "epic-cards": "e9ccd93b45ed08b6",
  "epic-change": "cf78de0b370b7dea",
  "epic-choice-rows": "37a2075065dc6404",
  "epic-choices": "a5d19e2b89be3d3a",
  "epic-choices-bar": "a070cc4dcf2a79c3",
  "epic-clarify": "e1f1ed960c41d8d1",
  "epic-code": "7f0fd2f7559f6d92",
  "epic-comment-pane": "75069c898c2ffb36",
  "epic-commit": "75d8f5cf130d9a1e",
  "epic-event": "fae29610214050ad",
  "epic-feature-set": "33c7365ea20640e2",
  "epic-focus": "8517e92b9b2e6222",
  "epic-item": "8077f7333b0aed08",
  "epic-kickoff": "bf8138b85a460f57",
  "epic-link": "4b222c601708205c",
  "epic-list": "29bea8a6f79bf2e0",
  "epic-mark": "cff954f24a8a64a8",
  "epic-net-effect": "99efeeba33c9d3bf",
  "epic-new-item": "ecc4bc99ea647db8",
  "epic-note": "0d4452412c86f6af",
  "epic-option-form": "93589314baa753c0",
  "epic-original": "379124c11fad7e47",
  "epic-overview": "6af14a6a80053100",
  "epic-page": "6f26364fb2927948",
  "epic-page-note-head": "4e730408fea73d4c",
  "epic-phase": "31ff65b0968af53a",
  "epic-picture": "5f5907c83f4793f8",
  "epic-pills": "1bb592b8c10c957f",
  "epic-prompt": "d4e05c37180c3773",
  "epic-question": "1d27d60e9537e867",
  "epic-review": "94b016972b8d2980",
  "epic-run": "4b0f45343e1cf69f",
  "epic-run-row": "614704ce0795d6a5",
  "epic-section": "f85768823df0a1e9",
  "epic-send": "7dc9c6a27d9ad97f",
  "epic-send-buttons": "46c2bd5ed32d6b04",
  "epic-state-filter": "a070e612cf4b5559",
  "epic-status": "598d00bf8f7bbf3d",
  "epic-summary": "018915eda8febad1",
  "epic-text-box": "9f1c62f077011c7a",
  "epic-thread": "bcd35d276159a654",
  "epic-update": "dbe6107efdf2d5a8"
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
