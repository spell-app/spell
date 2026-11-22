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
  "epic-actions": "926a116bb0c8314e",
  "epic-agents": "bfc11b2331df503b",
  "epic-answer": "7331ce51a3ac57ee",
  "epic-aside": "fa2ca0ebead54bcb",
  "epic-ask": "a9bec7ad9b90acd4",
  "epic-away-line": "9e39410e8b6d1888",
  "epic-cards": "e8edda48767f8ad9",
  "epic-change": "e9590f65b519f679",
  "epic-choice-rows": "66a4694cbf827f87",
  "epic-choices": "62de13be793c2e03",
  "epic-choices-bar": "eff35bb894318370",
  "epic-clarify": "e102e8079e5e7e1c",
  "epic-code": "30cfc339b687929c",
  "epic-comment-pane": "5d21e69727613eb5",
  "epic-commit": "f7b5d89ddf8f2c3b",
  "epic-event": "14cbc25c36ebe6d5",
  "epic-feature-set": "b3acddd5948cb049",
  "epic-focus": "7248f99b01e9375c",
  "epic-item": "2fce841937f4840e",
  "epic-kickoff": "cca9cf81f4dbd6d4",
  "epic-link": "20b4a2625b7c0fe5",
  "epic-list": "83e87f19a74176a5",
  "epic-mark": "e26d1070ca769a56",
  "epic-net-effect": "bd02f1513f394cd6",
  "epic-new-item": "edae172b618ee92a",
  "epic-note": "bdfea9b59059e43c",
  "epic-option-form": "863355c40beaab88",
  "epic-original": "f1f1cfca9b242256",
  "epic-overview": "4367b1eed145bd7e",
  "epic-page": "37a272ddd7855405",
  "epic-page-note-head": "a49d317c2590f307",
  "epic-phase": "77f65305d060cd95",
  "epic-picture": "8cd4b2ce42ec39f6",
  "epic-pills": "cc89d30f84eadcee",
  "epic-prompt": "f817867117949018",
  "epic-question": "03b3779adcacdb1b",
  "epic-review": "63281610bda32459",
  "epic-run": "408651a96c25e77f",
  "epic-run-row": "f855cb983f41a41c",
  "epic-section": "44e03953a14926d4",
  "epic-send": "7caa904ff6fc4f7a",
  "epic-send-buttons": "0f9b2905e9357d31",
  "epic-state-filter": "6f459b6b5b536c76",
  "epic-status": "21b3be6e1a17dccb",
  "epic-summary": "832649c48acc50bf",
  "epic-text-box": "0010107d0c73e4c4",
  "epic-thread": "ca13d638c787abe5",
  "epic-update": "3c1e211d1d7c2428"
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
