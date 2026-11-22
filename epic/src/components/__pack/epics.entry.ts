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
  "epic-actions": "a12b69b559e39e8e",
  "epic-agents": "46408b8653c9bded",
  "epic-answer": "f6970f28e5e0e7c6",
  "epic-aside": "a19b5cf2978b255c",
  "epic-ask": "30cd340680035b7d",
  "epic-away-line": "ce477396f8bccd87",
  "epic-cards": "ab5837d2fec2e5a2",
  "epic-change": "197164a82c6f151c",
  "epic-choice-rows": "192dfd0dca75716d",
  "epic-choices": "d89f44c4955fd146",
  "epic-choices-bar": "b9ee97075b62c2cf",
  "epic-clarify": "590f907cec39188c",
  "epic-code": "8edc81f3af97ae2f",
  "epic-comment-pane": "4cf11187883f0df5",
  "epic-commit": "bcaac70c097e8402",
  "epic-event": "45f9e99c265c09eb",
  "epic-feature-set": "1c0e0ac4b7ba3837",
  "epic-focus": "c9d81e6e6381f7a3",
  "epic-item": "68ba5c7a0f91b27b",
  "epic-kickoff": "5a40a7f348e12e75",
  "epic-link": "12d75c9e38ca533d",
  "epic-list": "81549233b4b51119",
  "epic-mark": "3262a8023467c190",
  "epic-net-effect": "dbb41f98ec859ac9",
  "epic-new-item": "e4eaf861c358b37c",
  "epic-note": "0ee4406ecd9a2f5e",
  "epic-option-form": "249be3d9bc8620fe",
  "epic-original": "e8a497b177996410",
  "epic-overview": "7bb710ca1b32a525",
  "epic-page": "d33c3fe892af738c",
  "epic-page-note-head": "2e4b2bc7dc41404e",
  "epic-phase": "d945fd0e9d3c8090",
  "epic-picture": "2020d95a5841b50a",
  "epic-pills": "590f1db03b15b69c",
  "epic-prompt": "cdc232e3c160df40",
  "epic-question": "1253f44597bb03cd",
  "epic-review": "d85e479cfeb472c4",
  "epic-run": "be6b7d71f9d4f7ae",
  "epic-run-row": "520e87ad18d87451",
  "epic-section": "3b2936fdefe68502",
  "epic-send": "c66327a395fd6ec7",
  "epic-send-buttons": "4d1dcc8cf1ac38a6",
  "epic-state-filter": "c75501c0f21083bc",
  "epic-status": "a23b1a2b053d6e2d",
  "epic-summary": "a5c8da065f8948ef",
  "epic-text-box": "c0270afc6e20e93f",
  "epic-thread": "b964bf6a212e85fd",
  "epic-update": "c9f664caf29a2d7c"
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
