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
  "epic-agents": "d6d5dc0708cc3082",
  "epic-answer": "2d65dcc7a73ef0d9",
  "epic-aside": "18c196f70a186a30",
  "epic-ask": "74ebc3a110e883e2",
  "epic-away-line": "68f2c802ea9d4e80",
  "epic-cards": "e9ccd93b45ed08b6",
  "epic-change": "a1ef3f710389f998",
  "epic-choice-rows": "04750730ac266e3c",
  "epic-choices": "9a04c8a91a4eda25",
  "epic-choices-bar": "3cc80ee7159bcc9d",
  "epic-clarify": "e1f1ed960c41d8d1",
  "epic-code": "7f0fd2f7559f6d92",
  "epic-comment-pane": "75069c898c2ffb36",
  "epic-commit": "75d8f5cf130d9a1e",
  "epic-event": "fae29610214050ad",
  "epic-feature-set": "838c6bfa9690e878",
  "epic-focus": "b2da304e2aa4ebee",
  "epic-item": "78415b66729d4d12",
  "epic-kickoff": "a1754ba6248a6666",
  "epic-link": "4b222c601708205c",
  "epic-list": "29bea8a6f79bf2e0",
  "epic-mark": "cff954f24a8a64a8",
  "epic-net-effect": "99efeeba33c9d3bf",
  "epic-new-item": "7ef218a1afce867a",
  "epic-note": "0d4452412c86f6af",
  "epic-option-form": "3197afd4bc81c1b7",
  "epic-original": "379124c11fad7e47",
  "epic-overview": "e7770141915d501c",
  "epic-page": "6e9e415a0523eebc",
  "epic-page-note-head": "4e730408fea73d4c",
  "epic-phase": "0b8ec062c6cc85b9",
  "epic-picture": "5f5907c83f4793f8",
  "epic-pills": "1bb592b8c10c957f",
  "epic-prompt": "d4e05c37180c3773",
  "epic-question": "1d27d60e9537e867",
  "epic-review": "8d4c6f3ad658a448",
  "epic-run": "b41f54fdf0f8b494",
  "epic-run-row": "1a2331ca5cfa9859",
  "epic-section": "15690ed317034a13",
  "epic-send": "87ccc7aba858fd4e",
  "epic-send-buttons": "46c2bd5ed32d6b04",
  "epic-state-filter": "a070e612cf4b5559",
  "epic-status": "598d00bf8f7bbf3d",
  "epic-summary": "018915eda8febad1",
  "epic-text-box": "82734e28e1bd5640",
  "epic-thread": "45bb183c9e629718",
  "epic-update": "e88646c10b48986c"
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
