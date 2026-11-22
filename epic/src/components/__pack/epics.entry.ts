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
  "epic-agents": "a72402cabf7fbee9",
  "epic-answer": "f6970f28e5e0e7c6",
  "epic-aside": "a19b5cf2978b255c",
  "epic-ask": "a1fe50f234d2fbd6",
  "epic-away-line": "91c21263de51cd44",
  "epic-cards": "ab5837d2fec2e5a2",
  "epic-change": "31c837deedc2713c",
  "epic-choice-rows": "15309652e7d5daf5",
  "epic-choices": "ed7fa673fb3c8853",
  "epic-choices-bar": "d26206917ad4d3a6",
  "epic-clarify": "590f907cec39188c",
  "epic-code": "8edc81f3af97ae2f",
  "epic-comment-pane": "4cf11187883f0df5",
  "epic-commit": "bcaac70c097e8402",
  "epic-event": "45f9e99c265c09eb",
  "epic-feature-set": "ab4e0d9caa2a8831",
  "epic-focus": "fc37c46026b04c18",
  "epic-item": "913614724210819d",
  "epic-kickoff": "18be8d4b516441a6",
  "epic-link": "12d75c9e38ca533d",
  "epic-list": "81549233b4b51119",
  "epic-mark": "3262a8023467c190",
  "epic-net-effect": "dbb41f98ec859ac9",
  "epic-new-item": "339db8ded1cd5380",
  "epic-note": "0ee4406ecd9a2f5e",
  "epic-option-form": "8e515c32f55db8dc",
  "epic-original": "e8a497b177996410",
  "epic-overview": "9529a86f98c908a8",
  "epic-page": "302c3a922b7713f6",
  "epic-page-note-head": "2e4b2bc7dc41404e",
  "epic-phase": "c4dcb40dcd9997af",
  "epic-picture": "2020d95a5841b50a",
  "epic-pills": "590f1db03b15b69c",
  "epic-prompt": "cdc232e3c160df40",
  "epic-question": "1253f44597bb03cd",
  "epic-review": "3430090fdd22c908",
  "epic-run": "40b663abaa60e759",
  "epic-run-row": "136eeebfbe0b5ebe",
  "epic-section": "6fa37bbcea10553c",
  "epic-send": "98a7c21118382cb6",
  "epic-send-buttons": "4d1dcc8cf1ac38a6",
  "epic-state-filter": "c75501c0f21083bc",
  "epic-status": "a23b1a2b053d6e2d",
  "epic-summary": "a5c8da065f8948ef",
  "epic-text-box": "16ef935ce7785347",
  "epic-thread": "8cf2d249eccba71e",
  "epic-update": "1dd150edbd540bea"
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
