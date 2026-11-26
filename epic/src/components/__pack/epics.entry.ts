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
  "epic-actions": "3cbdf29874ae17b9",
  "epic-agents": "f19a1387707abfaa",
  "epic-answer": "32d76141437ade1d",
  "epic-aside": "9598db4a54508f66",
  "epic-ask": "060984d313e2bd79",
  "epic-away-line": "eb838bec6e78ea23",
  "epic-bells": "98fca37802a27478",
  "epic-cards": "2f954a588dbab374",
  "epic-change": "0c7896f23513cbe8",
  "epic-choice-rows": "71748cd2c3634cd1",
  "epic-choices": "e8d2be9dbb6374a9",
  "epic-choices-bar": "a339dde60bf93366",
  "epic-clarify": "93eb0fb29ee2f415",
  "epic-code": "2d9c7fc415bf18b8",
  "epic-comment-pane": "10b9e7a5929fc675",
  "epic-commit": "762df4240e5f53e8",
  "epic-event": "b977252245d6f920",
  "epic-feature-set": "f25bb0bc10aae389",
  "epic-focus": "69c600be324a187f",
  "epic-item": "3c45bee47e34ea16",
  "epic-kickoff": "2c0a4daf26a067b4",
  "epic-link": "a32cee584ffb4163",
  "epic-list": "9ab57f059f872952",
  "epic-mark": "53e046d4e076eaf3",
  "epic-net-effect": "df7908ae69bc5121",
  "epic-new-item": "92827ee2d8a35538",
  "epic-note": "df35d2b9a4511f0a",
  "epic-option-form": "00dab48b1bebe01a",
  "epic-original": "6d33320ba3d53a98",
  "epic-overview": "7a31d6abd2d97ace",
  "epic-page": "70f299d55ce06c18",
  "epic-page-note-head": "d366514c5d1799e7",
  "epic-phase": "9df0a8ce5035a8a8",
  "epic-picture": "35c7ce249337414b",
  "epic-pills": "6198911b5e8528d7",
  "epic-prompt": "260b7e4b7a1bf093",
  "epic-question": "f61c8b2f3fac9491",
  "epic-review": "dfcce2a08ea5b330",
  "epic-run": "ad361248aec72b2e",
  "epic-run-row": "0355318b85993a58",
  "epic-section": "054666e26cd28da2",
  "epic-send": "684294a0f78e61ab",
  "epic-send-buttons": "4160ebd2407c0e27",
  "epic-state-filter": "adeab7544bd05116",
  "epic-status": "f08c0ddc05e08b4f",
  "epic-step-output": "d3e52d2abc56fa6c",
  "epic-summary": "0b165d0dd088c049",
  "epic-text-box": "5238a9c2cda6b9c6",
  "epic-thread": "1cae6c92b129bd1e",
  "epic-update": "0606c116d30ffce5"
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
