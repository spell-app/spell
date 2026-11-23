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
  "epic-actions": "644b945ed4a3522d",
  "epic-agents": "67d8bbe0c5b4bfec",
  "epic-answer": "a6e6dccae13f8353",
  "epic-aside": "124a185d1b3a30fc",
  "epic-ask": "f2e103c7ddeb3ab4",
  "epic-away-line": "347285a7b8461831",
  "epic-cards": "487ff7d614b75ef6",
  "epic-change": "36d9db2ab5bd7c40",
  "epic-choice-rows": "263492d2a6ef1960",
  "epic-choices": "df14aa5fbd125b2b",
  "epic-choices-bar": "0362450e0f3f585a",
  "epic-clarify": "44463079ac8dd33a",
  "epic-code": "252255f454fea150",
  "epic-comment-pane": "f258ecd7f5a7603c",
  "epic-commit": "a944b4af7ce5fb62",
  "epic-event": "32781793b9dfcda9",
  "epic-feature-set": "ffcaff725620837b",
  "epic-focus": "dd665f9ad5167f23",
  "epic-item": "951ae038b41d5259",
  "epic-kickoff": "70056fb7791fab32",
  "epic-link": "012872f45a68602d",
  "epic-list": "37850becc9399278",
  "epic-mark": "450f7323c64194b9",
  "epic-net-effect": "0ac5eb193731988b",
  "epic-new-item": "7943338876a9e1b9",
  "epic-note": "be9449cb8265b755",
  "epic-option-form": "6d4c337d9468b397",
  "epic-original": "f0530d925427e64e",
  "epic-overview": "d052ce5f85613aea",
  "epic-page": "bf8a813cc748495c",
  "epic-page-note-head": "0ce3b3be6ca611fe",
  "epic-phase": "adb8b63beb662046",
  "epic-picture": "904078a06f788df8",
  "epic-pills": "d0923dadc02c1efa",
  "epic-prompt": "97aa9e5cdedf2da3",
  "epic-question": "d76e0dbd1b1c7fb2",
  "epic-review": "e1e704d780917b47",
  "epic-run": "483b86b33f75d0a8",
  "epic-run-row": "b790796ba16870da",
  "epic-section": "9526955b00e8211b",
  "epic-send": "7e06838b13d9b9ea",
  "epic-send-buttons": "c21f8192e8301ce7",
  "epic-state-filter": "6f311907df51da6f",
  "epic-status": "c076c2a4f0df6d99",
  "epic-summary": "bd0abf07bbcba143",
  "epic-text-box": "314ec5f0b159a826",
  "epic-thread": "d1e468ef86497fbe",
  "epic-update": "bcb9843d12a6286a"
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
