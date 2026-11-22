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
  "epic-agents": "a8dc4ac810077e9a",
  "epic-answer": "f6970f28e5e0e7c6",
  "epic-aside": "a19b5cf2978b255c",
  "epic-ask": "ef28ed6dab0b2bf3",
  "epic-away-line": "ec86ccda654b5189",
  "epic-cards": "ab5837d2fec2e5a2",
  "epic-change": "c8b271767fc6c3ad",
  "epic-choice-rows": "6137a65c7c456456",
  "epic-choices": "2392741f1a2a97f7",
  "epic-choices-bar": "6bd7773a973a4723",
  "epic-clarify": "590f907cec39188c",
  "epic-code": "8edc81f3af97ae2f",
  "epic-comment-pane": "4cf11187883f0df5",
  "epic-commit": "bcaac70c097e8402",
  "epic-event": "45f9e99c265c09eb",
  "epic-feature-set": "66e72f816e3923a1",
  "epic-focus": "ddcb0b975874405d",
  "epic-item": "af9207394c502132",
  "epic-kickoff": "c22f34c617a5eb41",
  "epic-link": "12d75c9e38ca533d",
  "epic-list": "81549233b4b51119",
  "epic-mark": "3262a8023467c190",
  "epic-net-effect": "dbb41f98ec859ac9",
  "epic-new-item": "0fa860632a936b20",
  "epic-note": "0ee4406ecd9a2f5e",
  "epic-option-form": "da213c107141029e",
  "epic-original": "e8a497b177996410",
  "epic-overview": "8d0df53412a0d756",
  "epic-page": "96ebc0f61779f858",
  "epic-page-note-head": "2e4b2bc7dc41404e",
  "epic-phase": "17ecca791a16597f",
  "epic-picture": "2020d95a5841b50a",
  "epic-pills": "590f1db03b15b69c",
  "epic-prompt": "cdc232e3c160df40",
  "epic-question": "1253f44597bb03cd",
  "epic-review": "441a13a94d5e216a",
  "epic-run": "44c23ce408959dac",
  "epic-run-row": "4907ac3ce279249b",
  "epic-section": "e1f2845b5f98195f",
  "epic-send": "1f58f5b3e7dbbc8a",
  "epic-send-buttons": "4d1dcc8cf1ac38a6",
  "epic-state-filter": "c75501c0f21083bc",
  "epic-status": "a23b1a2b053d6e2d",
  "epic-summary": "a5c8da065f8948ef",
  "epic-text-box": "64876d133bfd144d",
  "epic-thread": "8e9b830a54df14e5",
  "epic-update": "21dee101e66c2d9e"
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
