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
  "epic-actions": "92317c2234fda934",
  "epic-agents": "2b10494232d26e6b",
  "epic-answer": "9bbad5ce9e0dae86",
  "epic-aside": "a71527b93cc90104",
  "epic-ask": "46d1450ac292646f",
  "epic-away-line": "c3326f87be87c563",
  "epic-cards": "e06e08418614367e",
  "epic-change": "71adf2ac3d1a65ae",
  "epic-choice-rows": "8929f0260997e5de",
  "epic-choices": "09f3911dc68f5609",
  "epic-choices-bar": "89f1d9c72eec62ac",
  "epic-clarify": "55f7282e87ca1e0d",
  "epic-code": "5deaa212dfbced4f",
  "epic-comment-pane": "1a3e6c5b683db6b4",
  "epic-commit": "bc8b00f75d5d226d",
  "epic-event": "e3c9608939c72dd6",
  "epic-feature-set": "438e17146e5baaeb",
  "epic-focus": "9b17a7ab14a96418",
  "epic-item": "61c1906be6e00414",
  "epic-kickoff": "950b3c4b0f01444c",
  "epic-link": "18478d36f860f928",
  "epic-list": "0724dbbc7372a865",
  "epic-mark": "cd833b3841b69093",
  "epic-net-effect": "70e28c6a694a2e54",
  "epic-new-item": "3cf75fd358dc07ca",
  "epic-note": "825653529a325ac0",
  "epic-option-form": "a50102cfa7106dff",
  "epic-original": "9a2e900abaacf396",
  "epic-overview": "fd784b61cee792e0",
  "epic-page": "bd4d878d72e9eefa",
  "epic-page-note-head": "14be9ff46e4649f4",
  "epic-phase": "9c2a8ec4722927f3",
  "epic-picture": "a48a83ab6c7878d3",
  "epic-pills": "cbe5827a4f394a8a",
  "epic-prompt": "fa4e2f4a18404eb9",
  "epic-question": "b055fbfc99dad6a0",
  "epic-review": "7d5ee2e3934ef759",
  "epic-run": "def5a01b8c78bb15",
  "epic-run-row": "3637f277cb8cca17",
  "epic-section": "f3ab9a2b660108ee",
  "epic-send": "722b91a319afdce6",
  "epic-send-buttons": "f4f1ccefba15ba98",
  "epic-state-filter": "452d48b04d76a22a",
  "epic-status": "623a2deffdb6dc11",
  "epic-summary": "771a72337870e69c",
  "epic-text-box": "b979686f5b265672",
  "epic-thread": "c40c7cb89d5067f6",
  "epic-update": "2115e6d83469a3d4"
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
